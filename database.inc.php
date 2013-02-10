<?php

require_once('config.inc.php');

class SafePDO extends PDO
{
    # custom exception handler
    public static function ex_handler($exception)
    {
        die('Unhandled exception: ' . $exception->getMessage());
    }

    public function __construct($conn, $user='', $pw='', $options=array())
    {
        # set custom exception handler for the class construction
        # and connection time
        #
        # this way we won't print a full stack trace on connection
        # failure
        set_exception_handler(array(__CLASS__, 'ex_handler'));

        # call PDO constructor
        parent::__construct($conn, $user, $pw, $options);

        $this->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
        $this->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        # restore default exception handler
        restore_exception_handler();
    }
}

?>