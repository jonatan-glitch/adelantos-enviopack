<?php

namespace App\Controller\Admin;

use App\Controller\AbstractApiController;
use App\Exception\DomainException;
use App\Repository\SolicitudAdelantoRepository;
use App\Response\SolicitudAdelantoResponse;
use App\Service\SolicitudService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/admin/solicitudes')]
class SolicitudController extends AbstractApiController
{
    public function __construct(
        private SolicitudService            $solicitudService,
        private SolicitudAdelantoRepository $solicitudRepo,
    ) {}

    #[Route('', name: 'admin_solicitudes_listar', methods: ['GET'])]
    public function listar(Request $request): JsonResponse
    {
        $page      = max(1, (int)$request->query->get('page', 1));
        $limit     = min(200, max(1, (int)$request->query->get('limit', 50)));
        $estado    = $request->query->get('estado');
        $chofer_id = $request->query->get('chofer_id') ? (int)$request->query->get('chofer_id') : null;
        $result    = $this->solicitudService->listar($page, $limit, $estado, $chofer_id);
        $items     = array_map(fn($s) => SolicitudAdelantoResponse::fromEntity($s), $result['items']);
        return $this->paginated($items, $result['total'], $page, $limit);
    }

    #[Route('/{id}/aprobar', name: 'admin_solicitudes_aprobar', methods: ['PUT'])]
    public function aprobar(int $id): JsonResponse
    {
        $s = $this->solicitudRepo->find($id);
        if (!$s) { throw new DomainException('Solicitud no encontrada.'); }
        $usuario = $this->getUsuario();
        $s = $this->solicitudService->aprobar($s, $usuario->getNombre() . ' ' . $usuario->getApellido());
        return $this->ok(SolicitudAdelantoResponse::fromEntity($s));
    }

    #[Route('/{id}/rechazar', name: 'admin_solicitudes_rechazar', methods: ['PUT'])]
    public function rechazar(int $id, Request $request): JsonResponse
    {
        $s = $this->solicitudRepo->find($id);
        if (!$s) { throw new DomainException('Solicitud no encontrada.'); }
        $data   = json_decode($request->getContent(), true) ?? [];
        $motivo = trim($data['motivo'] ?? '');
        if (!$motivo) { return new JsonResponse(['code' => 422, 'message' => 'El motivo de rechazo es obligatorio.', 'errors' => ['motivo' => 'Requerido']], 422); }
        $s = $this->solicitudService->rechazar($s, $motivo);
        return $this->ok(SolicitudAdelantoResponse::fromEntity($s));
    }

    #[Route('/{id}/registrar-pago', name: 'admin_solicitudes_pago', methods: ['PUT'])]
    public function registrarPago(int $id, Request $request): JsonResponse
    {
        $s = $this->solicitudRepo->find($id);
        if (!$s) { throw new DomainException('Solicitud no encontrada.'); }
        $data = json_decode($request->getContent(), true) ?? [];
        $s = $this->solicitudService->registrarPago($s, $data['comprobante_url'] ?? null);
        return $this->ok(SolicitudAdelantoResponse::fromEntity($s));
    }
}
