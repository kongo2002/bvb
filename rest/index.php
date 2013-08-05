<?php

# load server logic
require_once('server.php');

# load controllers
require_once('base.php');
require_once('user.php');
require_once('player.php');
require_once('match.php');
require_once('team.php');

# don't load our classes unless we use them
spl_autoload_register();

# 'debug' or 'production'
$mode = 'debug';
$server = new RestServer($mode, 'BVB_REST');

# uncomment to clear the cache in production mode
$server->refreshCache();

# register controllers and its routes
$server->addClass('BaseController', '');
$server->addClass('UserController', 'users');
$server->addClass('PlayerController', 'players');
$server->addClass('MatchController', 'matches');
$server->addClass('TeamController', 'teams');

$server->handle();

?>
