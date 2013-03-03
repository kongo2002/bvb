<?php

class User
{
    public static function load($id)
    {
        if ($id < 1)
            throw new ApiException("there is no user with ID '$id'");

        return array(
            'id' => $id,
            'firstName' => 'some',
            'lastName' => 'one',
            'addresses' => array(
                array(
                    'street' => 'some',
                    'city' => 'where',
                    'isPrimary' => true)));
    }

    public static function save($user)
    {
        // TODO

        throw new ApiException("not implemented yet", 99);
    }
}

class UserController
{
    /**
     * Gets the user by id or current user
     *
     * @url GET /user/current
     * @url GET /user/$id
     */
    public function getUser($id = null)
    {
        if ($id) {
            $user = User::load($id);
        } else if (isset($_SESSION)) {
            $user = $_SESSION['user'];
        }
        else {
            throw new ApiException('there is no such user');
        }

        return $user;
    }

    /**
     * Saves a user to the database
     *
     * @url POST /user
     * @url PUT /user/$id
     */
    public function saveUser($id = null, $data)
    {
        // TODO: validate input data

        if ($data === null)
            throw new ApiException('no or invalid user object given');

        $data->id = $id;
        $user = User::save($data);

        // return the created user object
        return $user;
    }
}

?>
