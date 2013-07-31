<?php

class MatchEvent
{
    public static function add($db, $event)
    {
        MatchEvent::setDefaultValues($event);

        if (!$event || !MatchEvent::validate($event))
            throw new ApiException('invalid event given');

        $cmd = $db->prepare('INSERT INTO teams (match,player,goals,owngoals,assists) '.
            'VALUES (:m,:p,:g,:og,:a);');
        $cmd->execute(array(':m' => $event->match,
            ':p' => $event->player,
            ':g' => $event->goals,
            ':og' => $event->owngoals,
            ':a' => $event->assists));

        return $db->lastInsertId();
    }

    private static function validate($db, $event)
    {
        $sumActions = $event->goals + $event->owngoals + $event->assists;

        if ($sumActions < 1)
            throw new ApiException('event contains no actions at all');

        if (!isset($event->match) || !Match::exists($event->match))
            throw new ApiException('specified match does not exist');

        if (!isset($event->player) || !Player::exists($event->player))
            throw new ApiException('specified player does not exist');

        return true;
    }

    private static function setDefaultValues($event)
    {
        if (!isset($event->goals))
            $event->goals = 0;

        if (!isset($event->owngoals))
            $event->owngoals = 0;

        if (!isset($event->assists))
            $event->assists = 0;
    }
}
