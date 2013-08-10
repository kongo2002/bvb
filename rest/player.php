<?php

class PlayerScoreInfo
{
    public function __construct($id, $goal, $assist)
    {
        $this->id = $id;
        $this->goal = $goal;
        $this->assist = $assist;
    }

    public static function get($db, $id)
    {
        $cmd = $db->prepare('SELECT goal,assist FROM players '.
            'INNER JOIN positions ON players.position=positions.id '.
            'WHERE players.id=:id;');

        $cmd->execute(array(':id' => $id));

        $info = $cmd->fetch(PDO::FETCH_ASSOC);

        return new PlayerScoreInfo($id,
            $info['goal'],
            $info['assist']);
    }
}

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

    public static function exists($db, $id)
    {
        $cmd = $db->prepare('SELECT COUNT(id) FROM players WHERE id=:id;');
        $cmd->execute(array(':id' => $id));

        return $cmd->fetchColumn() > 0;
    }

    public static function existAll($db, $ids)
    {
        $len = count($ids);
        $idList = implode(',', $ids);
        $query = 'SELECT COUNT(id) FROM players WHERE id IN ('.$idList.');';

        $cmd = $db->query($query);

        return $cmd->fetchColumn() == $len;
    }

    private static function calculateRow($row, $info)
    {
        $goalScore = $row['goalCount'] * $info->goal;
        $assistScore = $row['assistCount'] * $info->assist;

        return $goalScore + $assistScore;
    }

    public static function calculateMatch($db, $player, $match, $scoreInfo = null)
    {
        $info = ($scoreInfo) ? $scoreInfo : PlayerScoreInfo::get($db, $player);

        $query = 'SELECT count(goals) AS goalCount, count(assists) AS assistCount '.
            'FROM matches INNER JOIN matchevents ON matches.id=`match` '.
            'WHERE matches.id=:id AND player=:p GROUP BY goals,assists;';

        $cmd = $db->prepare($query);
        $cmd->execute(array(':id' => $match, ':p' => $player));

        $score = $cmd->fetch(PDO::FETCH_ASSOC);

        return Player::calculateRow($score, $info);
    }

    public static function calculateMatches($db, $player, $matches, $scoreInfo = null)
    {
        $info = ($scoreInfo) ? $scoreInfo : PlayerScoreInfo::get($db, $player);

        $ids = implode(',', $matches);
        $query = 'SELECT matches.id AS id, count(goals) AS goalCount, count(assists) AS assistCount '.
            'FROM matches LEFT OUTER JOIN matchevents ON matches.id=`match` '.
            'WHERE matches.id IN ('.$ids.') AND (player IS NULL OR player=:p) '.
            'GROUP BY goals,assists '.
            'ORDER BY date ASC;';

        $cmd = $db->prepare($query);
        $cmd->execute(array(':p' => $player));

        $matches = array();

        foreach ($cmd->fetchAll(PDO::FETCH_ASSOC) as $score)
        {
            $hasPlayed = $score['goalCount'] != null && $score['assistCount'] != null;

            $match = array();

            $match['id'] = $score['id'];
            $match['score'] = $hasPlayed
                ? Player::calculateRow($score, $info)
                : 0;
            $match['played'] = $hasPlayed;

            $matches[] = $match;
        }

        return $matches;
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
    public function playerList()
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

    /**
     * Get match information for a specific match
     *
     * @url GET /player/$id/matches/match/$mid
     */
    public function playerMatch($id, $mid)
    {
        return Player::calculateMatch($this->database, $id, $mid);
    }

    /**
     * Get match information for a specific match
     *
     * @url GET /player/$id/matches
     */
    public function playerMatches($id)
    {
        $db = $this->database;
        $matches = Match::getIds($db);

        return Player::calculateMatches($db, $id, $matches);
    }
}

?>
