<?php

class Match
{
    private static $teamName = 'Borussia Dortmund';

    public static function get($db, $id)
    {
        # get match information
        $cmd = $db->prepare('SELECT date,teams.name,sum(matchevents.goals) as goals,'.
            'teams.id as opponent,'.
            'opponent_goals as opponentGoals,homegame FROM matches '.
            'INNER JOIN teams ON teams.id=opponent '.
            'INNER JOIN matchevents ON matchevents.match=matches.id '.
            'WHERE matches.id = :id;');

        $cmd->execute(array(':id' => $id));

        # fetch first result
        $match = $cmd->fetch(PDO::FETCH_ASSOC);

        if ($match == null || $match['date'] == null)
            throw new ApiException("there is no match with ID '$id'");

        $match['id'] = $id;

        # correct goals/homegame data types
        $match['goals'] = intval($match['goals']);
        $match['homegame'] = $match['homegame'] > 0 ? true : false;

        return $match;
    }

    public static function getList($db)
    {
        # TODO: paging
        $cmd = $db->query('SELECT matches.id,name,date,homegame,opponent_goals,sum(matchevents.goals) '.
            'FROM matches '.
            'INNER JOIN teams ON teams.id=matches.opponent '.
            'LEFT OUTER JOIN matchevents ON matchevents.match=matches.id '.
            'GROUP BY matches.id '.
            'ORDER BY date ASC;');

        $func = function($m)
        {
            list($id, $opponent, $date, $hg, $og, $goals) = $m;

            $homegame = $hg > 0 ? true : false;
            $goals = $goals === null ? 0 : $goals;
            $result = $homegame ? ($goals.':'.$og) : ($og.':'.$goals);

            return array('id' => $id,
                'opponent' => $opponent,
                'date' => $date,
                'homegame' => $homegame,
                'result' => $result);
        };

        return array_map($func, $cmd->fetchAll(PDO::FETCH_NUM));
    }

    public static function getMatchEvents($db, $id)
    {
        # get match events
        $cmd = $db->prepare('SELECT sum(goals) as goals,'.
            'sum(owngoals) as owngoals,'.
            'sum(assists) as assists,player,firstname,lastname '.
            'FROM matchevents '.
            'INNER JOIN players ON players.id=player '.
            'WHERE matchevents.match=:id '.
            'GROUP BY player;');

        $cmd->execute(array(':id' => $id));

        $goals = array();
        $assists = array();
        $owngoals = array();

        foreach ($cmd->fetchAll(PDO::FETCH_ASSOC) as $event)
        {
            $elem = array('id' => $event['player'],
                'name' => $event['firstname'].' '.$event['lastname']);

            if ($event['goals'] > 0)
                $goals[] = $elem;

            if ($event['assists'] > 0)
                $assists[] = $elem;

            if ($event['owngoals'] > 0)
                $owngoals[] = $elem;
        }

        return array($goals, $assists, $owngoals);
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

    public static function exists($db, $id)
    {
        $cmd = $db->prepare('SELECT COUNT(id) FROM matches WHERE id=:id;');
        $cmd->execute(array(':id' => $id));

        return $cmd->fetchColumn() > 0;
    }

    private static function opponentExists($db, $opponentId)
    {
        $cmd = $db->prepare('SELECT COUNT(id) FROM teams WHERE id=:id;');
        $cmd->execute(array(':id' => $opponentId));

        return $cmd->fetchColumn() > 0;
    }

    private static function validate($db, $match)
    {
        /* check date */
        if (!isset($match->date))
            throw new ApiException('no date given');

        /* check opponent */
        if (!isset($match->opponent) || $match->opponent < 1)
            throw new ApiException('no or invalid opponent given');

        if (!Match::opponentExists($db, $match->opponent))
            throw new ApiException('there is no opponent '.$match->opponent);

        $starters = count($match->starters);
        if ($starters != 11)
            throw new ApiException('invalid number of starting players given: '.$starters);

        $substitutes = count($match->substitutes);
        if ($substitutes < 0 || $substitutes > 3)
            throw new ApiException('invalid number of substituted players given: '.$substitutes);

        /* check players in sub element arrays */
        if (!playersExist($match->goals) ||
            !playersExist($match->owngoals) ||
            !playersExist($match->starters) ||
            !playersExist($match->substitutes))
        {
            throw new ApiException('invalid player given');
        }
    }

    private static function playersExist($elements)
    {
        foreach ($elements as $elem)
        {
            $exists = isset($elem->id) && $elem->id > 0 &&
                Player::exists($elem->id);

            if (!$exists)
                return false;
        }

        return true;
    }

    private static function setDefaultValues($match)
    {
        $match->tournament = isset($match->tournament)
            ? $match->tournament : 1;

        $match->homegame = isset($match->homegame)
            ? $match->homegame : true;

        $match->opponentGoals = isset($match->opponentGoals)
            ? $match->opponentGoals : 0;

        $match->assists = isset($match->assists)
            ? $match->assists : array();

        $match->goals = isset($match->goals)
            ? $match->goals : array();

        $match->owngoals = isset($match->owngoals)
            ? $match->owngoals : array();

        $match->starters = isset($match->starters)
            ? $match->starters : array();

        $match->substitutes = isset($match->substitutes)
            ? $match->substitutes : array();
    }

    public static function add($db, $match)
    {
        Match::setDefaultValues($match);
        Match::validate($db, $match);

        /* insert match into the database */
        $cmd = $db->prepare('INSERT INTO matches '.
            '(opponent,tournament,homegame,date,opponent_goals) '.
            'VALUES (:op,:tour,:hg,:d,:og);');

        $cmd->execute(array(':op' => $match->opponent,
            ':tour' => $match->tournament,
            ':hg' => $match->homegame,
            ':d' => $match->date,
            ':og' => $match->opponentGoals));

        /* TODO: insert match events (if specified) */

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
        list($goals, $assists) = Match::getMatchEvents($db, $id);

        $match['starters'] = $starters;
        $match['substitutes'] = $subs;

        $match['goals'] = $goals;
        $match['assists'] = $assists;

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
