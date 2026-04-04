<?php

namespace App\EventListener;

use App\Entity\Usuario;
use App\Security\JwtSessionContext;
use Lexik\Bundle\JWTAuthenticationBundle\Event\JWTCreatedEvent;

class JWTCreatedListener
{
    public function __construct(private readonly JwtSessionContext $sessionContext) {}

    public function onJwtCreated(JWTCreatedEvent $event): void
    {
        $user    = $event->getUser();
        $payload = $event->getData();

        // Add `id` and `email` to the payload (frontend needs them decoded)
        if ($user instanceof Usuario) {
            $payload['id']    = $user->getId();
            $payload['email'] = $user->getEmail();
        }

        // Embed the current session ID (set by AuthenticationSuccessHandler)
        $payload['id_sesion'] = $this->sessionContext->get();

        $event->setData($payload);
    }
}
