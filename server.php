<?php

require_once('database.inc.php');

/**
 * Format constants
 */
class RestFormat
{
    const PLAIN = 'text/plain';
    const HTML = 'text/html';
    const JSON = 'application/json';

    static public $formats = array(
        'plain' => RestFormat::PLAIN,
        'txt' => RestFormat::PLAIN,
        'html' => RestFormat::HTML,
        'json' => RestFormat::JSON,
    );
}

/**
 * Description of RestServer
 */
class RestServer
{
    public $url;
    public $method;
    public $params;
    public $format;
    public $cacheDir = '.';
    public $realm;
    public $mode;
    public $root;

    protected $map = array();
    protected $errorClasses = array();
    protected $cached;

    /**
     * The constructor.
     *
     * @param string $mode  The mode, either debug or production
     * @param string $realm The server's realm
     */
    public function  __construct($mode = 'debug', $realm = 'Rest Server')
    {
        $this->mode = $mode;
        $this->realm = $realm;
        $dir = dirname(str_replace($_SERVER['DOCUMENT_ROOT'], '', $_SERVER['SCRIPT_FILENAME']));
        $this->root = ($dir == '.' ? '' : $dir . '/');
    }

    public function  __destruct()
    {
        if ($this->mode == 'production' && !$this->cached) {
            if (function_exists('apc_store')) {
                apc_store('urlMap', $this->map);
            } else {
                file_put_contents($this->cacheDir . '/urlMap.cache', serialize($this->map));
            }
        }
    }

    public function refreshCache()
    {
        $this->map = array();
        $this->cached = false;
    }

    public function unauthorized($ask = false)
    {
        if ($ask)
            header("WWW-Authenticate: Basic realm=\"$this->realm\"");

        throw new RestException(401, 'You are not authorized to access this resource.');
    }


    public function handle()
    {
        $this->url = $this->getPath();
        $this->method = $this->getMethod();
        $this->format = $this->getFormat();

        if ($this->method == 'PUT' || $this->method == 'POST')
            $this->data = $this->getData();

        list($obj, $method, $params, $this->params, $noAuth, $useDb) = $this->findUrl();

        if ($obj)
        {
            if (is_string($obj))
            {
                if (class_exists($obj))
                    $obj = new $obj();
                else
                    throw new Exception("Class '$obj' does not exist");
            }

            $obj->server = $this;

            try
            {
                # optional initialization routine
                if (method_exists($obj, 'init'))
                    $obj->init();

                # method uses authorization
                if (!$noAuth && method_exists($obj, 'authorize'))
                {
                    if (!$obj->authorize())
                    {
                        $this->sendData($this->unauthorized(true));
                        exit;
                    }
                }

                # method uses database
                if ($useDb)
                {
                    try
                    {
                        # create new database instance
                        $db = SafePDO::create();

                        # append database instance to parameter array
                        $params[] = $db;
                    }
                    catch (Exception $e)
                    {
                        return $this->sendError($e->getCode(),
                            'failed to initialize database connection');
                    }
                }

                $result = call_user_func_array(array($obj, $method), $params);

                # close database connection (if existing)
                $db = null;
            }
            catch (RestException $e)
            {
                return $this->handleError($e->getCode(), $e->getMessage());
            }
            catch (ApiException $e)
            {
                return $this->sendError($e->getCode(), $e->getMessage());
            }

            if ($result !== null)
                $this->sendData($result);
        }
        else
            $this->handleError(404);
    }

    public function addClass($class, $basePath = '')
    {
        $this->loadCache();

        if (!$this->cached)
        {
            if (is_string($class) && !class_exists($class))
                throw new Exception('Invalid method or class');
            elseif (!is_string($class) && !is_object($class))
                throw new Exception('Invalid method or class; must be a classname or object');

            if (substr($basePath, 0, 1) == '/')
                $basePath = substr($basePath, 1);

            if ($basePath && substr($basePath, -1) != '/')
                $basePath .= '/';

            $this->generateMap($class, $basePath);
        }
    }

    public function addErrorClass($class)
    {
        $this->errorClasses[] = $class;
    }

    public function handleError($statusCode, $errorMessage = null)
    {
        $method = "handle$statusCode";

        foreach ($this->errorClasses as $class)
        {
            if (is_object($class))
                $reflection = new ReflectionObject($class);
            elseif (class_exists($class))
                $reflection = new ReflectionClass($class);

            if ($reflection->hasMethod($method))
            {
                $obj = is_string($class) ? new $class() : $class;
                $obj->$method();
                return;
            }
        }

        $message = $this->codes[$statusCode] .
            ($errorMessage && $this->mode == 'debug' ? ': ' . $errorMessage : '');

        $this->setStatus($statusCode);
        $this->sendError($statusCode, $message);
    }

    protected function loadCache()
    {
        if ($this->cached !== null) return;

        $this->cached = false;

        if ($this->mode == 'production')
        {
            if (function_exists('apc_fetch'))
                $map = apc_fetch('urlMap');
            elseif (file_exists($this->cacheDir . '/urlMap.cache'))
                $map = unserialize(file_get_contents($this->cacheDir . '/urlMap.cache'));

            if ($map && is_array($map))
            {
                $this->map = $map;
                $this->cached = true;
            }
        }
        else
        {
            if (function_exists('apc_delete'))
                apc_delete('urlMap');
            else
                @unlink($this->cacheDir . '/urlMap.cache');
        }
    }

    protected function findUrl()
    {
        $urls = $this->map[$this->method];

        # there is no call of the current HTTP method defined
        if (!$urls) return null;

        foreach ($urls as $url => $call)
        {
            $args = $call[2];

            if (!strstr($url, '$'))
            {
                if ($url == $this->url)
                {
                    if (isset($args['data']))
                    {
                        $params = array_fill(0, $args['data'] + 1, null);
                        $params[$args['data']] = $this->data;
                        $call[2] = $params;
                    }
                    return $call;
                }
            }
            else
            {
                $regex = preg_replace('/\\\\\$([\w\d]+)\.\.\./', '(?P<$1>.+)', str_replace('\.\.\.', '...', preg_quote($url)));
                $regex = preg_replace('/\\\\\$([\w\d]+)/', '(?P<$1>[^\/]+)', $regex);

                if (preg_match(":^$regex$:", urldecode($this->url), $matches))
                {
                    $params = array();
                    $paramMap = array();

                    if (isset($args['data']))
                        $params[$args['data']] = $this->data;

                    foreach ($matches as $arg => $match)
                    {
                        if (is_numeric($arg))
                            continue;

                        $paramMap[$arg] = $match;

                        if (isset($args[$arg]))
                            $params[$args[$arg]] = $match;
                    }

                    ksort($params);
                    # make sure we have all the params we need
                    end($params);
                    $max = key($params);

                    for ($i = 0; $i < $max; $i++)
                    {
                        if (!key_exists($i, $params))
                            $params[$i] = null;
                    }

                    ksort($params);
                    $call[2] = $params;
                    $call[3] = $paramMap;
                    return $call;
                }
            }
        }
    }

    protected function generateMap($class, $basePath)
    {
        if (is_object($class))
            $reflection = new ReflectionObject($class);
        elseif (class_exists($class))
            $reflection = new ReflectionClass($class);

        $methods = $reflection->getMethods(ReflectionMethod::IS_PUBLIC);

        foreach ($methods as $method)
        {
            $doc = $method->getDocComment();
            $noAuth = strpos($doc, '@noAuth') !== false;
            $useDatabase = strpos($doc, '@useDb') !== false;

            if (preg_match_all('/@url[ \t]+(GET|POST|PUT|DELETE|HEAD|OPTIONS)[ \t]+\/?(\S*)/s', $doc, $matches, PREG_SET_ORDER))
            {
                $params = $method->getParameters();

                foreach ($matches as $match)
                {
                    $httpMethod = $match[1];
                    $url = $basePath . $match[2];

                    if ($url && $url[strlen($url) - 1] == '/')
                        $url = substr($url, 0, -1);

                    $call = array($class, $method->getName());
                    $args = array();

                    foreach ($params as $param)
                        $args[$param->getName()] = $param->getPosition();

                    $call[] = $args;        # function arguments map
                    $call[] = null;         # separator
                    $call[] = $noAuth;      # no authorization call?
                    $call[] = $useDatabase; # database call?

                    $this->map[$httpMethod][$url] = $call;
                }
            }
        }
    }

    public function getPath()
    {
        $path = substr(preg_replace('/\?.*$/', '', $_SERVER['REQUEST_URI']), 1);

        if ($path[strlen($path) - 1] == '/')
            $path = substr($path, 0, -1);

        # remove root from path
        if ($this->root)
            $path = str_replace($this->root, '', $path);

        return $path;
    }

    public function getMethod()
    {
        $method = $_SERVER['REQUEST_METHOD'];
        $override = isset($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'])
            ? $_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE']
            : (isset($_GET['method']) ? $_GET['method'] : '');

        if ($method == 'POST' && strtoupper($override) == 'PUT')
            $method = 'PUT';
        elseif ($method == 'POST' && strtoupper($override) == 'DELETE')
            $method = 'DELETE';

        return $method;
    }

    public function getFormat()
    {
        $format = RestFormat::PLAIN;

        # ensures that exploding the HTTP_ACCEPT string does not get confused by whitespaces
        $accept_mod = preg_replace('/\s+/i', '', $_SERVER['HTTP_ACCEPT']);
        $accept = explode(',', $accept_mod);
        $override = '';

        if (isset($_REQUEST['format']) || isset($_SERVER['HTTP_FORMAT']))
        {
            # give GET/POST precedence over HTTP request headers
            $override = isset($_SERVER['HTTP_FORMAT']) ? $_SERVER['HTTP_FORMAT'] : '';
            $override = isset($_REQUEST['format']) ? $_REQUEST['format'] : $override;
            $override = trim($override);
        }

        # Give GET parameters precedence before all other options to alter the format
        $override = isset($_GET['format']) ? $_GET['format'] : $override;

        if (isset(RestFormat::$formats[$override]))
            $format = RestFormat::$formats[$override];
        elseif (in_array(RestFormat::JSON, $accept))
            $format = RestFormat::JSON;

        return $format;
    }

    public function getData()
    {
        $data = file_get_contents('php://input');

        return json_decode($data);
    }

    public function sendError($code, $message)
    {
        header('Cache-Control: no-cache, must-revalidate');
        header('Expires: 0');
        header('Content-Type: ' . $this->format);

        if ($this->format == RestFormat::JSON)
        {
            $data = $code > 0
                ? array('message' => $message, 'errorCode' => $code, 'success' => false)
                : array('message' => $message, 'success' => false);

            echo json_encode($data);
        }
        else
            echo $message;
    }

    public function sendData($data)
    {
        header("Cache-Control: no-cache, must-revalidate");
        header("Expires: 0");
        header('Content-Type: ' . $this->format);

        if (is_object($data) && method_exists($data, '__keepOut'))
        {
            $data = clone $data;
            foreach ($data->__keepOut() as $prop)
                unset($data->$prop);
        }

        if ($this->format == RestFormat::JSON)
        {
            $data = array('data' => $data, 'success' => true);
            $data = json_encode($data);
        }

        echo $data;
    }

    public function setStatus($code)
    {
        $code .= ' ' . $this->codes[strval($code)];
        header("{$_SERVER['SERVER_PROTOCOL']} $code");
    }

    private $codes = array(
        '100' => 'Continue',
        '200' => 'OK',
        '201' => 'Created',
        '202' => 'Accepted',
        '203' => 'Non-Authoritative Information',
        '204' => 'No Content',
        '205' => 'Reset Content',
        '206' => 'Partial Content',
        '300' => 'Multiple Choices',
        '301' => 'Moved Permanently',
        '302' => 'Found',
        '303' => 'See Other',
        '304' => 'Not Modified',
        '305' => 'Use Proxy',
        '307' => 'Temporary Redirect',
        '400' => 'Bad Request',
        '401' => 'Unauthorized',
        '402' => 'Payment Required',
        '403' => 'Forbidden',
        '404' => 'Not Found',
        '405' => 'Method Not Allowed',
        '406' => 'Not Acceptable',
        '409' => 'Conflict',
        '410' => 'Gone',
        '411' => 'Length Required',
        '412' => 'Precondition Failed',
        '413' => 'Request Entity Too Large',
        '414' => 'Request-URI Too Long',
        '415' => 'Unsupported Media Type',
        '416' => 'Requested Range Not Satisfiable',
        '417' => 'Expectation Failed',
        '500' => 'Internal Server Error',
        '501' => 'Not Implemented',
        '503' => 'Service Unavailable'
    );
}

class RestException extends Exception
{
    public function __construct($code, $message = null)
    {
        parent::__construct($message, $code);
    }

}

class ApiException extends Exception
{
    public function __construct($message, $errorCode = 0)
    {
        parent::__construct($message, $errorCode);
    }
}
