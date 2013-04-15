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
