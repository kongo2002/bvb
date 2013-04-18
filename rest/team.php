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
        if (!$team)
            throw new ApiException('invalid team name given');

        $cmd = $db->prepare('INSERT INTO teams (name) VALUES (:name);');
        $cmd->execute(array(':name' => $team));

        return $db->lastInsertId();
    }

    public static function remove($db, $teamId)
    {
        $cmd = $db->prepare('DELETE FROM teams WHERE id = :id;');
        $cmd->execute(array(':id' => $teamId));

        return $cmd->rowCount() == 1;
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

    /**
     * Add a new team
     *
     * @url POST /team
     */
    public function addTeam($data)
    {
        $db = $this->database;

        if (!$data || !isset($data->name))
            throw new ApiException('no or invalid team name given');

        $team = $data->name;

        if (!Team::exists($db, $team))
        {
            $id = Team::add($db, $team);
            return array('id' => $id);
        }

        throw new ApiException("team '$team' already exists");
    }

    /**
     * Delete the team with the specified ID
     *
     * @url DELETE /team/$id
     */
    public function deleteTeam($id)
    {
        $db = $this->database;

        if (!Team::remove($db, $id))
            throw new ApiException('there is no team with ID ' . $id);

        return true;
    }
}

?>
