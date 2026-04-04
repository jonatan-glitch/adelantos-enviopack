<?php

namespace App\Controller;

// Este controller nunca se ejecuta — Symfony Security intercepta /api/login
// antes de llegar al controller. Solo existe para satisfacer el router.
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;

class LoginController extends AbstractController
{
    #[Route('/api/login', name: 'api_login', methods: ['POST'])]
    public function login(): JsonResponse
    {
        return new JsonResponse(['message' => 'Use JWT credentials'], 400);
    }
}
