<?php

class MatchEvent
{
    public static function add($db, $playerInfo)
    {
        if (!$playerInfo || !MatchEvent::validate($db, $playerInfo))
            throw new ApiException('invalid event given');

        $cmd = $db->prepare('INSERT INTO matchevents '.
            '(`match`,player,goals,owngoals,assists) '.
            'VALUES (:m,:p,:g,:og,:a);');

        $cmd->execute(array(':m' => $playerInfo->match,
            ':p' => $playerInfo->id,
            ':g' => $playerInfo->goals,
            ':og' => $playerInfo->owngoals,
            ':a' => $playerInfo->assists));

        return $db->lastInsertId();
    }

    private static function validate($db, $playerInfo)
    {
        if ($playerInfo->getActions() < 1)
            throw new ApiException('event contains no actions at all');

        if (!Match::exists($db, $playerInfo->match))
            throw new ApiException('specified match does not exist');

        if (!Player::exists($db, $playerInfo->id))
            throw new ApiException('specified player does not exist');

        return true;
    }

    public static function deleteMatch($db, $id)
    {
        $cmd = $db->prepare('DELETE FROM matchevents WHERE `match`=:id;');
        $cmd->execute(array(':id' => $id));

        return $cmd->rowCount() > 0;
    }
}

?>
