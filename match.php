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

        $match = $cmd->fetch(PDO::FETCH_ASSOC);

        if ($match == null || $match['date'] == null)
            throw new ApiException("there is no match with ID '$id'");

        return $match;
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
        return Match::get($this->database, $id);
    }
}

?>
