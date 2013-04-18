<?php

class Team
{
    public static function get($db, $id)
    {
        # get team information
        $cmd = $db->prepare('SELECT id,name FROM teams WHERE id = :id;');

        $cmd->execute(array(':id' => $id));

        $team = $cmd->fetch(PDO::FETCH_ASSOC);

        if ($team == null)
            throw new ApiException("there is no team with ID '$id'");

        return $team;
    }

    public static function exists($db, $teamName)
    {
        if (!$teamName)
            throw new ApiException('invalid team name given');

        $cmd = $db->prepare('SELECT count(id) FROM teams WHERE name = :name;');
        $cmd->execute(array(':name' => $teamName));

        return $cmd->fetchColumn() > 0;
    }

    public static function add($db, $team)
    {
        if (!$teamName)
            throw new ApiException('invalid team name given');

        $cmd = $db->prepare('INSERT INTO teams (name) VALUES (:name);');
        $cmd->execute(array(':name' => $team));

        return $db->lastInsertId();
    }

    public static function getList($db)
    {
        $cmd = $db->query('SELECT id,name FROM teams ORDER BY name ASC;');

        return $cmd->fetchAll(PDO::FETCH_ASSOC);
    }
}

class TeamController
{
    /**
     * Get a specific team by ID
     *
     * @url GET /team/$id
     */
    public function getTeam($id)
    {
        $db = $this->database;

        return Team::get($db, $id);
    }

    /**
     * Get a list of all defined teams
     *
     * @url GET /
     */
    public function getTeamList()
    {
        $db = $this->database;

        return Team::getList($db);
    }
}

?>
