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
 * Server class that encapsulates the basic REST
 * behavior.
 */
class RestServer
{
    public $url;
    public $method;
    public $params;
    public $format;
    public $cacheDir = '.';
    public $realm;
    public $root;
    public $mode;
    public $inProduction;

    protected $map = array();
    protected $errorClasses = array();
    protected $cached;

    private $errors;

    /**
     * The constructor.
     *
     * @param string $mode  The mode, either debug or production
     * @param string $realm The server's realm
     */
    public function  __construct($mode = 'debug', $realm = 'REST')
    {
        $this->mode = $mode;
        $this->inProduction = $mode == 'production';
        $this->realm = $realm;
        $dir = dirname(str_replace($_SERVER['DOCUMENT_ROOT'], '', $_SERVER['SCRIPT_FILENAME']));
        $this->root = ($dir == '.' ? '' : $dir . '/');

        # strip leading slash
        $len = strlen($this->root);
        if ($len > 0 && $this->root[0] == '/')
            $this->root = substr($this->root, 1);

        # set custom error handler
        set_error_handler(array($this, 'errorHandler'));
    }

    public function errorHandler($errNo, $errStr)
    {
        # collect errors in debug mode only
        if (!$this->inProduction)
        {
            if ($this->errors)
                $this->errors .= "\n".$errNo.': '.$errStr;
            else
                $this->errors = $errNo.': '.$errStr;
        }

        # stop default error handling
        return true;
    }

    public function  __destruct()
    {
        if ($this->inProduction && !$this->cached) {
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

        list($obj, $method, $params, $this->params, $noAuth, $noDb) = $this->findUrl();

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

                $doAuth = !$noAuth && method_exists($obj, 'authorize');

                # method uses database
                # authorization implicitely requires database access
                if (!$noDb || $doAuth)
                {
                    try
                    {
                        # create new database instance
                        $obj->database = SafePDO::create();
                    }
                    catch (Exception $e)
                    {
                        return $this->sendError($e->getCode(),
                            'failed to initialize database connection');
                    }
                }

                # method uses authorization
                if ($doAuth)
                {
                    if (!$obj->authorize())
                    {
                        $this->sendData($this->unauthorized(true));
                        exit;
                    }
                }

                $result = call_user_func_array(array($obj, $method), $params);

                # close database connection (if existing)
                $obj->database = null;
            }
            catch (RestException $e)
            {
                return $this->handleError($e->getCode(), $e->getMessage());
            }
            catch (ApiException $e)
            {
                return $this->sendError($e->getCode(), $e->getMessage());
            }
            catch (Exception $e)
            {
                return $this->sendError(0, $e->getMessage());
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

            if ($basePath != '/' && substr($basePath, 0, 1) == '/')
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
            ($errorMessage && !$this->inProduction ? ': ' . $errorMessage : '');

        $this->setStatus($statusCode);
        $this->sendError($statusCode, $message);
    }

    protected function loadCache()
    {
        if ($this->cached !== null) return;

        $this->cached = false;

        if ($this->inProduction)
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

            if (strpos($url, '$') === false)
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
            $noDatabase = strpos($doc, '@noDb') !== false;

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
                    $call[] = $noDatabase;  # database call?

                    $this->map[$httpMethod][$url] = $call;
                }
            }
        }
    }

    public function getPath()
    {
        $path = substr(preg_replace('/\?.*$/', '', $_SERVER['REQUEST_URI']), 1);

        # remove root from path
        if ($this->root)
            $path = str_replace($this->root, '', $path);

        if ($path && $path[strlen($path) - 1] == '/')
            $path = substr($path, 0, -1);

        return $path;
    }

    public function getMethod()
    {
        $method = $_SERVER['REQUEST_METHOD'];
        $override = isset($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'])
            ? $_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE']
            : (isset($_GET['method']) ? $_GET['method'] : '');

        # PUT may override POST
        if ($method == 'POST' && strtoupper($override) == 'PUT')
            $method = 'PUT';
        # DELETE may override POST as well
        elseif ($method == 'POST' && strtoupper($override) == 'DELETE')
            $method = 'DELETE';

        return $method;
    }

    public function getFormat()
    {
        # JSON is the default format
        $format = RestFormat::JSON;

        # format may be overwritten by GET parameter
        $override = isset($_GET['format']) ? $_GET['format'] : '';

        if (isset(RestFormat::$formats[$override]))
            $format = RestFormat::$formats[$override];

        return $format;
    }

    public function getData()
    {
        $data = file_get_contents('php://input');

        return json_decode($data);
    }

    public function sendError($code, $message)
    {
        # set some default headers
        header('Cache-Control: no-cache, must-revalidate');
        header('Expires: 0');
        header('Content-Type: ' . $this->format);

        if ($this->errors)
            $message .= "\n".$this->errors;

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
        # set some default headers
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

?>
