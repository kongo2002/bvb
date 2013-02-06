<?php

require_once('server.php');
require_once('user.php');

// don't load our classes unless we use them
spl_autoload_register();

// 'debug' or 'production'
$mode = 'debug';
$server = new RestServer($mode);

// uncomment momentarily to clear the cache if classes change in production mode
$server->refreshCache();

$server->addClass('UserController', '/rest');

$server->handle();

?>
