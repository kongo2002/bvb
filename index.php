<?php

// load server logic
require_once('server.php');

// load controllers
require_once('base.php');
require_once('user.php');
require_once('player.php');

// don't load our classes unless we use them
spl_autoload_register();

// 'debug' or 'production'
$mode = 'debug';
$server = new RestServer($mode);

// uncomment to clear the cache in production mode
$server->refreshCache();

$server->addClass('BaseController', '/rest');
$server->addClass('UserController', '/rest/users');
$server->addClass('PlayerController', '/rest/players');

$server->handle();

?>
