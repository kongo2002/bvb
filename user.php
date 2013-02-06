<?php

class User
{
    public static function load($id)
    {
        return "Got user " . $id;
    }
}

class UserController
{
    /**
     * Returns a JSON string object to the browser when hitting the root of the domain
     *
     * @url GET /
     */
    public function test()
    {
        return "Hello World";
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
        // validate input and log the user in
    }

    /**
     * Gets the user by id or current user
     *
     * @url GET /users/current
     * @url GET /users/$id
     */
    public function getUser($id = null)
    {
        if ($id) {
            $user = User::load($id); // possible user loading method
        } else if (isset($_SESSION)) {
            $user = $_SESSION['user'];
        }
        else {
            throw new ApiException('there is no such user');
        }

        return $user; // serializes object into JSON
    }

    /**
     * Saves a user to the database
     *
     * @url POST /users
     * @url PUT /users/$id
     */
    public function saveUser($id = null, $data)
    {
        // ... validate $data properties such as $data->username, $data->firstName, etc.
        $data->id = $id;
        $user = User::saveUser($data); // saving the user to the database
        return $user; // returning the updated or newly created user object
    }
}

?>
