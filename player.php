<?php

require_once('database.inc.php');

class Player
{
    public static function getList($db)
    {
        $func = function($player)
        {
            return array('id' => $player[0],
                'name' => $player[1].' '.$player[2]);
        };

        $cmd = $db->query('SELECT id,firstname,lastname FROM players;');

        return array_map($func, $cmd->fetchAll());
    }
}

class PlayerController
{
    /**
     * Get a list of players
     *
     * @url GET /
     */
    public function playerList()
    {
        $db = SafePDO::create();

        $players = Player::getList($db);

        $db = null;

        return $players;
    }
}

?>
