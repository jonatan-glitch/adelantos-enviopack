<?php

namespace App\Controller;

use App\Entity\RefreshToken;
use App\Repository\RefreshTokenRepository;
use App\Security\JwtSessionContext;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

class RefreshController extends AbstractController
{
    public function __construct(
        private readonly RefreshTokenRepository  $refreshTokenRepository,
        private readonly JWTTokenManagerInterface $jwtManager,
        private readonly EntityManagerInterface   $em,
        private readonly JwtSessionContext        $sessionContext,
    ) {}

    #[Route('/api/token/refresh', name: 'api_token_refresh', methods: ['POST'])]
    public function refresh(Request $request): JsonResponse
    {
        $body        = json_decode($request->getContent(), true) ?? [];
        $tokenString = $body['refresh_token'] ?? null;

        if (!$tokenString) {
            return new JsonResponse(['code' => 400, 'message' => 'refresh_token requerido'], 400);
        }

        $refreshToken = $this->refreshTokenRepository->findValid($tokenString);

        if (!$refreshToken) {
            return new JsonResponse(['code' => 401, 'message' => 'Token inválido o expirado'], 401);
        }

        $usuario = $refreshToken->getUsuario();

        if (!$usuario->isHabilitado()) {
            return new JsonResponse(['code' => 403, 'message' => 'Usuario deshabilitado'], 403);
        }

        // Invalidate old token (rotate)
        $refreshToken->setUsed(true);

        // Create new refresh token
        $sessionId   = random_int(1, 2_147_483_647);
        $newTokenStr = bin2hex(random_bytes(32));

        $newRefreshToken = (new RefreshToken())
            ->setToken($newTokenStr)
            ->setSessionId($sessionId)
            ->setUsuario($usuario)
            ->setExpiresAt(new \DateTimeImmutable('+30 days'))
            ->setCreatedAt(new \DateTimeImmutable())
            ->setUsed(false);

        $this->em->persist($newRefreshToken);
        $this->em->flush();

        // Set context so JWTCreatedListener embeds id_sesion
        $this->sessionContext->set($sessionId);

        $jwt = $this->jwtManager->create($usuario);

        return new JsonResponse([
            'data' => [
                'token'         => $jwt,
                'refresh_token' => $newTokenStr,
            ],
        ]);
    }
}
