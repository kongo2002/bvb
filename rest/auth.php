<?php

class AuthController
{
    public function authorize()
    {
        $login = new Login($this->database);

        return $login->isLoggedIn();
    }
}

?>
