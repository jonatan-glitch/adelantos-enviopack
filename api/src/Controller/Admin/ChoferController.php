<?php

namespace App\Controller\Admin;

use App\Controller\AbstractApiController;
use App\Repository\InvitacionChoferRepository;
use App\Response\ChoferResponse;
use App\Service\ChoferService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/admin/choferes')]
class ChoferController extends AbstractApiController
{
    public function __construct(
        private ChoferService              $choferService,
        private InvitacionChoferRepository $invitacionRepo,
    ) {}

    #[Route('', name: 'admin_choferes_listar', methods: ['GET'])]
    public function listar(Request $request): JsonResponse
    {
        $page  = max(1, (int)$request->query->get('page', 1));
        $limit = min(200, max(1, (int)$request->query->get('limit', 50)));
        $result = $this->choferService->listar($page, $limit);
        $items  = array_map(fn($c) => ChoferResponse::fromEntity($c), $result['items']);
        return $this->paginated($items, $result['total'], $page, $limit);
    }

    #[Route('/invitar', name: 'admin_choferes_invitar', methods: ['POST'])]
    public function invitar(Request $request): JsonResponse
    {
        $data  = json_decode($request->getContent(), true) ?? [];
        $email = trim($data['email'] ?? '');

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return new JsonResponse(['code' => 422, 'message' => 'Error de validación', 'errors' => ['email' => 'El email no es válido']], 422);
        }

        $result = $this->choferService->invitar($email);
        $msg = $result['email_sent']
            ? 'Invitación enviada correctamente.'
            : 'Invitación creada pero el email no pudo enviarse. Verificá la configuración de correo.';
        return $this->ok(['message' => $msg, 'email_sent' => $result['email_sent']]);
    }

    #[Route('/importar', name: 'admin_choferes_importar', methods: ['POST'])]
    public function importar(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMINISTRADOR');
        $data    = json_decode($request->getContent(), true) ?? [];
        $choferes = $data['choferes'] ?? [];

        if (empty($choferes) || !is_array($choferes)) {
            return new JsonResponse(['code' => 400, 'message' => 'No se enviaron choferes para importar.'], 400);
        }

        $creados = $this->choferService->importar($choferes);
        return $this->ok(['creados' => $creados]);
    }
}
