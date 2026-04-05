<?php

namespace App\Controller\Admin;

use App\Controller\AbstractApiController;
use App\Response\ProformaResponse;
use App\Service\ProformaService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/admin/proformas')]
class ProformaController extends AbstractApiController
{
    public function __construct(private ProformaService $proformaService) {}

    #[Route('', name: 'admin_proformas_listar', methods: ['GET'])]
    public function listar(Request $request): JsonResponse
    {
        $page      = max(1, (int)$request->query->get('page', 1));
        $limit     = min(200, max(1, (int)$request->query->get('limit', 50)));
        $chofer_id = $request->query->get('chofer_id') ? (int)$request->query->get('chofer_id') : null;
        $result    = $this->proformaService->listar($page, $limit, $chofer_id);
        $items     = array_map(fn($p) => ProformaResponse::fromEntity($p), $result['items']);
        return $this->paginated($items, $result['total'], $page, $limit);
    }

    #[Route('', name: 'admin_proformas_crear', methods: ['POST'])]
    public function crear(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $result = $this->proformaService->crear($data);
        $response = ProformaResponse::fromEntity($result['proforma']);
        return $this->created(['proforma' => $response, 'email_sent' => $result['email_sent']]);
    }

    #[Route('/{id}/documento', name: 'admin_proformas_documento', methods: ['POST'])]
    public function subirDocumento(int $id, Request $request): JsonResponse
    {
        $file = $request->files->get('documento');
        if (!$file) {
            return new JsonResponse(['code' => 400, 'message' => 'No se envió un archivo.'], 400);
        }
        $url = $this->proformaService->subirDocumento($id, $file);
        return $this->ok(['documento_url' => $url]);
    }
}
