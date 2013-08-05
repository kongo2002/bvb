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
    public function login($data)
    {
        if (!$data || !$data->user || !$data->password)
            throw new ApiException('invalid username/password given');

        // TODO: validate input and log the user in

        $result = array();
        $result['user'] = $data->user;

        return $result;
    }
}

?>
