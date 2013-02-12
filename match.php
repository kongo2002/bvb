<?php

class Match
{
    public static function get($db, $id)
    {
        # get match information
        $cmd = $db->prepare('SELECT date,teams.name,sum(matchevents.goals) as goals,'.
            'opponent_goals,homegame FROM matches '.
            'INNER JOIN teams ON teams.id=opponent '.
            'INNER JOIN matchevents ON matchevents.match=matches.id '.
            'WHERE matches.id = :id;');

        $cmd->execute(array(':id' => $id));

        # fetch first result
        $match = $cmd->fetch(PDO::FETCH_ASSOC);

        if ($match == null || $match['date'] == null)
            throw new ApiException("there is no match with ID '$id'");

        # correct goals/homegame data types
        $match['goals'] = intval($match['goals']);
        $match['homegame'] = $match['homegame'] > 0 ? true : false;

        return $match;
    }

    public static function getList($db)
    {
        $cmd = $db->query('SELECT matches.id,name,date,homegame FROM matches '.
            'INNER JOIN teams ON teams.id=matches.opponent '.
            'ORDER BY date ASC;');

        $func = function($m)
        {
            return array('id' => $m[0],
                'opponent' => $m[1],
                'date' => $m[2],
                'homegame' => $m[3] > 0 ? true : false);
        };

        return array_map($func, $cmd->fetchAll(PDO::FETCH_NUM));
    }

    public static function getMatchPlayers($db, $id)
    {
        # get participating players
        $cmd = $db->prepare('SELECT player,concat(firstname," ",lastname) as name,'.
            'substitution FROM matchup '.
            'INNER JOIN players ON players.id=matchup.player '.
            'WHERE matchup.match=:id;');

        $cmd->execute(array(':id' => $id));

        $starters = array();
        $subs = array();

        # fetch all players
        foreach ($cmd->fetchAll(PDO::FETCH_NUM) as $player)
        {
            $sub = $player[2];

            $p = array('id' => $player[0], 'name' => $player[1]);

            if ($sub != null && $sub > 0)
                $subs[] = $p;
            else
                $starters[] = $p;
        }

        return array($starters, $subs);
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
        $db = $this->database;

        $match = Match::get($db, $id);

        list($starters, $subs) = Match::getMatchPlayers($db, $id);

        $match['starters'] = $starters;
        $match['substitutes'] = $subs;

        return $match;
    }

    /**
     * Get a list of all matches
     *
     * @url GET /
     */
    public function getMatchList()
    {
        return Match::getList($this->database);
    }
}

?>
