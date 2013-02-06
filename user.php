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
     * @url POST /user
     * @url PUT /user/$id
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
