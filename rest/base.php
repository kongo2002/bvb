<?php

class User
{
    public function __construct($id, $user)
    {
        $this->id = $id;
        $this->user = $user;
    }
}

class Login
{
    public function __construct($database)
    {
        /* create/open session */
        session_start();

        $this->db = $database;

        if (!empty($_SESSION['user']) &&
            !empty($_SESSION['userId']) &&
            !empty($_SESSION['loggedIn']))
        {
            $this->loggedIn = true;
            $this->user = new User($_SESSION['userId'], $_SESSION['user']);
        }
        else
        {
            $this->loggedIn = false;
            $this->user = null;
        }
    }

    public function login($user, $password)
    {
        if (empty($user) || empty($password))
            return null;

        $cmd = $this->db->prepare('SELECT id,user FROM users '.
            'WHERE user=:u AND password_hash=:p;');

        $cmd->execute(array(
            ':u' => trim($user),
            ':p' => md5($password)));

        # fetch first result
        $match = $cmd->fetch(PDO::FETCH_ASSOC);

        # the login succeeded
        if ($match)
        {
            $user = new User($match['id'], $match['user']);

            $this->loggedIn = true;
            $this->user = $user;

            /* fill session */
            $_SESSION['user'] = $user->user;
            $_SESSION['userId'] = $user->id;
            $_SESSION['loggedIn'] = true;

            return $user;
        }

        return null;
    }

    public function logout()
    {
        $_SESSION = array();
        session_destroy();

        $this->loggedIn = false;
        $this->user = null;
    }

    public function isLoggedIn()
    {
        return $this->loggedIn;
    }
}

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
    public function login($data)
    {
        $login = new Login($this->database);

        # if the user is already logged in
        # just return the user information
        if ($login->isLoggedIn())
            return $login->user;

        if (!$data || !$data->user || !$data->password)
            throw new ApiException('invalid username/password given');

        $user = $login->login($data->user, $data->password);

        if ($user)
            return $user;

        throw new ApiException('there is no valid match for the given user/password');
    }

    /**
     * Perform a session logout.
     *
     * @url POST /logout
     */
    public function logout()
    {
        $login = new Login($this->database);
        $login->logout();

        return true;
    }
}

?>
