<?php

class Match
{
    public static function get($db, $id)
    {
        # get match information
        $cmd = $db->prepare('SELECT date,teams.name,sum(matchevents.goals) as goals,'.
            'opponent_goals as opponentGoals,homegame FROM matches '.
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

    private static function opponentExists($db, $opponentId)
    {
        $cmd = $db->prepare('SELECT COUNT(id) FROM teams WHERE id=:id;');
        $cmd->execute(array(':id' => $opponentId));

        return $cmd->fetchColumn() > 0;
    }

    private static function validate($db, $match)
    {
        if (!isset($match->opponent) || $match->opponent < 1)
            throw new ApiException('no or invalid opponent given');

        if (!isset($match->date))
            throw new ApiException('no date given');

        if (!Match::opponentExists($db, $match->opponent))
            throw new ApiException('there is no opponent '.$match->opponent);
    }

    private static function setDefaultValues($match)
    {
        $match->tournament = isset($match->tournament)
            ? $match->tournament : 1;

        $match->homegame = isset($match->homegame)
            ? $match->homegame : true;

        $match->opponentGoals = isset($match->opponentGoals)
            ? $match->opponentGoals : 0;
    }

    public static function add($db, $match)
    {
        Match::validate($db, $match);

        Match::setDefaultValues($match);

        $cmd = $db->prepare('INSERT INTO matches '.
            '(opponent,tournament,homegame,date,opponent_goals) '.
            'VALUES (:op,:tour,:hg,:d,:og);');

        $cmd->execute(array(':op' => $match->opponent,
            ':tour' => $match->tournament,
            ':hg' => $match->homegame,
            ':d' => $match->date,
            ':og' => $match->opponentGoals));

        return $db->lastInsertId();
    }

    public static function update($db, $match)
    {
        Match::validate($db, $match);

        if (!isset($match->id) || $match->id < 1)
            throw new ApiException('no or invalid match ID given');

        Match::setDefaultValues($match);

        $cmd = $db->prepare('UPDATE matches SET '.
            'opponent=:op,'.
            'tournament=:tour,'.
            'homegame=:hg,'.
            'date=:d,'.
            'opponent_goals=:og '.
            'WHERE id=:id;');

        $cmd->execute(array(':op' => $match->opponent,
            ':tour' => $match->tournament,
            ':hg' => $match->homegame,
            ':d' => $match->date,
            ':og' => $match->opponentGoals,
            ':id' => $match->id));

        return $cmd->rowCount() > 0;
    }

    public static function delete($db, $id)
    {
        if ($id < 1)
            throw new ApiException('no or invalid ID given');

        $cmd = $db->prepare('DELETE FROM matches WHERE id=:id;');
        $cmd->execute(array(':id' => $id));

        return $cmd->rowCount() > 0;
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

    /**
     * Add a new match to the database
     *
     * @url POST /match
     */
    public function addMatch($data)
    {
        if ($data === null)
            throw new ApiException('no or invalid match object given');

        $id = Match::add($this->database, $data);
        $data->id = $id;

        return $data;
    }

    /**
     * Update an existing match
     *
     * @url PUT /match
     */
    public function updateMatch($data)
    {
        if ($data === null)
            throw new ApiException('no or invalid match object given');

        $success = Match::update($this->database, $data);

        return $success;
    }

    /**
     * Delete an existing match
     *
     * @url DELETE /match/$id
     */
    public function deleteMatch($id)
    {
        $success = Match::delete($this->database, $id);

        return $success;
    }
}

?>
