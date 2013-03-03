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

        return array_map($func, $cmd->fetchAll(PDO::FETCH_NUM));
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
     */
    public function playerList($db)
    {
        return Player::getList($this->database);
    }

    /**
     * Get a player's detail information
     *
     * @url GET /player/$id
     */
    public function playerInfo($id)
    {
        return Player::get($this->database, $id);
    }

    /**
     * Get all possible positions
     *
     * @url GET /positions
     */
    public function positions()
    {
        return Position::getAll($this->database);
    }
}

?>
