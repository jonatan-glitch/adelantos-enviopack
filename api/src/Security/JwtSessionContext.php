<?php

namespace App\Security;

/**
 * Request-scoped stateful service used to pass the id_sesion
 * from AuthenticationSuccessHandler → JWTCreatedListener
 * without coupling them directly.
 */
class JwtSessionContext
{
    private int $sessionId = 0;

    public function set(int $sessionId): void
    {
        $this->sessionId = $sessionId;
    }

    public function get(): int
    {
        return $this->sessionId;
    }
}
