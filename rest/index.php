<?php

// load server logic
require_once('server.php');

// load controllers
require_once('base.php');
require_once('user.php');
require_once('player.php');
require_once('match.php');
require_once('team.php');

// don't load our classes unless we use them
spl_autoload_register();

// 'debug' or 'production'
$mode = 'debug';
$server = new RestServer($mode);

// uncomment to clear the cache in production mode
$server->refreshCache();

$server->addClass('BaseController', '/bvb_new/rest');
$server->addClass('UserController', '/bvb_new/rest/users');
$server->addClass('PlayerController', '/bvb_new/rest/players');
$server->addClass('MatchController', '/bvb_new/rest/matches');
$server->addClass('TeamController', '/bvb_new/rest/teams');

$server->handle();

?>
