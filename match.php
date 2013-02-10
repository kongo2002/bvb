<?php

class Match
{
    public static function get($db, $id)
    {
        $cmd = $db->prepare('SELECT date,teams.name,count(goals.goals) as goals,'.
            'opponent_goals,homegame '.
            'FROM matches INNER JOIN teams ON teams.id=opponent INNER JOIN goals ON '.
            'goals.match=matches.id WHERE matches.id = :id;');
        $cmd->execute(array(':id' => $id));

        return $cmd->fetchAll(PDO::FETCH_ASSOC);
    }
}

class MatchController
{
    /**
     * Get a short match information
     *
     * @url GET /match/$id
     */
    public function getMatch($id)
    {
        $db = SafePDO::create();

        $match = Match::get($db, $id);

        $db = null;

        return $match;
    }
}

?>
