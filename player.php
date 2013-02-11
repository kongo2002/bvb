<?php

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

    public static function get($db, $id)
    {
        $cmd = $db->prepare('SELECT players.id,firstname,lastname,positions.name '.
            'FROM players INNER JOIN positions ON position=positions.id WHERE '.
            'players.id=:id;');

        $cmd->execute(array(':id' => $id));

        $player = $cmd->fetch(PDO::FETCH_NUM);

        if ($player == null)
            throw new ApiException("there is no player with ID '$id'");

        return array('id' => $player[0],
            'name' => $player[1].' '.$player[2],
            'position' => $player[3]);
    }
}

class Position
{
    public static function getAll($db)
    {
        $cmd = $db->query('SELECT id,name FROM positions;');

        return $cmd->fetchAll(PDO::FETCH_ASSOC);
    }
}

class PlayerController
{
    /**
     * Get a list of players
     *
     * @url GET /
     *
     * @useDb
     */
    public function playerList($db)
    {
        return Player::getList($db);
    }

    /**
     * Get a player's detail information
     *
     * @url GET /player/$id
     *
     * @useDb
     */
    public function playerInfo($id, $db)
    {
        return Player::get($db, $id);
    }

    /**
     * Get all possible positions
     *
     * @url GET /positions
     *
     * @useDb
     */
    public function positions($db)
    {
        return Position::getAll($db);
    }
}

?>
