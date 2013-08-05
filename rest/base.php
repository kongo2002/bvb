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
        $this->db = $database;

        $this->userId = 0;
        $this->loggedIn = false;
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
            $id = $match['id'];

            $this->userId = $id;
            $this->loggedIn = true;

            return new User($id, $match['user']);
        }

        return null;
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
        if (!$data || !$data->user || !$data->password)
            throw new ApiException('invalid username/password given');

        $login = new Login($this->database);
        $user = $login->login($data->user, $data->password);

        if ($user)
            return $user;

        throw new ApiException('there is no valid match for the given user/password');
    }
}

?>
