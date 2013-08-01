<?php

class MatchUp
{
    public static function addPlayer($db, $player, $match, $substituted = false)
    {
        if ($player < 1)
            throw new ApiException('invalid player ID given');

        if ($match < 1)
            throw new ApiException('invalid match ID given');

        $query = $substituted
            ? 'INSERT INTO matchup (player,`match`) VALUES (:p,:m);'
            : 'INSERT INTO matchup (player,`match`,substitution) VALUES (:p,:m,1);';

        $cmd = $db->prepare($query);
        $cmd->execute(array(':p' => $player, ':m' => $match));

        return $db->lastInsertId();
    }

    public static function addStarter($db, $player, $match)
    {
        return MatchUp::addPlayer($db, $player, $match, false);
    }

    public static function addSubstitution($db, $player, $match)
    {
        return MatchUp::addPlayer($db, $player, $match, true);
    }
}

?>
