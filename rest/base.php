<?php

class BaseController
{
    /**
     * Return the current API status
     *
     * @url GET /
     */
    public function status()
    {
        return 'REST service running';
    }

    /**
     * Logs in a user with the given username and password POSTed. Though true
     * REST doesn't believe in sessions, it is often desirable for an AJAX server.
     *
     * @url POST /login
     */
    public function login()
    {
        $username = $_POST['username'];
        $password = $_POST['password'];

        // TODO: validate input and log the user in
    }
}

?>
