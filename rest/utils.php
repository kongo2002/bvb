<?php

class Utils
{
    public static function isValidDate($input)
    {
        $date = date_parse($input);

        return $date &&
            $date['day'] > 0 &&
            $date['month'] > 0 &&
            $date['year'] > 0 &&
            count($date['errors']) < 1;
    }
}

?>
