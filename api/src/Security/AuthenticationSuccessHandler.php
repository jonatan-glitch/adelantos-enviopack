<?php

namespace App\Security;

use App\Entity\RefreshToken;
use App\Entity\Usuario;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Http\Authentication\AuthenticationSuccessHandlerInterface;

class AuthenticationSuccessHandler implements AuthenticationSuccessHandlerInterface
{
    public function __construct(
        private readonly JWTTokenManagerInterface $jwtManager,
        private readonly EntityManagerInterface   $em,
        private readonly JwtSessionContext        $sessionContext,
    ) {}

    public function onAuthenticationSuccess(Request $request, TokenInterface $token): Response
    {
        /** @var Usuario $user */
        $user = $token->getUser();

        // 1 — Generate a unique session ID and a refresh token string
        $sessionId   = random_int(1, 2_147_483_647);
        $tokenString = bin2hex(random_bytes(32)); // 64-char hex

        // 2 — Persist the refresh token
        $refreshToken = (new RefreshToken())
            ->setToken($tokenString)
            ->setSessionId($sessionId)
            ->setUsuario($user)
            ->setExpiresAt(new \DateTimeImmutable('+30 days'))
            ->setCreatedAt(new \DateTimeImmutable())
            ->setUsed(false);

        $this->em->persist($refreshToken);
        $this->em->flush();

        // 3 — Put session ID in context so JWTCreatedListener can embed it
        $this->sessionContext->set($sessionId);

        // 4 — Create JWT (fires lexik_jwt_authentication.on_jwt_created)
        $jwt = $this->jwtManager->create($user);

        // 5 — Return wrapped response (no need for ApiResponseListener, we bypass it)
        return new JsonResponse([
            'data' => [
                'token'         => $jwt,
                'refresh_token' => $tokenString,
            ],
        ]);
    }
}
