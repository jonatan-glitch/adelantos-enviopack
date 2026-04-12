<?php

namespace App\Controller\Admin;

use App\Controller\AbstractApiController;
use App\Service\DisponibilidadService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/admin/disponibilidad')]
class DisponibilidadController extends AbstractApiController
{
    public function __construct(
        private DisponibilidadService $service,
    ) {}

    #[Route('', name: 'admin_disponibilidad_obtener', methods: ['GET'])]
    public function obtener(Request $request): JsonResponse
    {
        $fecha = $request->query->get('fecha', (new \DateTime('tomorrow'))->format('Y-m-d'));
        $disp = $this->service->obtenerPorFecha($fecha);

        if (!$disp) {
            return $this->ok([
                'fecha' => $fecha,
                'choferes_ids' => [],
                'choferes_manuales' => [],
                'enviado' => false,
                'enviado_at' => null,
            ]);
        }

        return $this->ok([
            'fecha' => $disp->getFecha()->format('Y-m-d'),
            'choferes_ids' => $disp->getChoferesIds(),
            'choferes_manuales' => $disp->getChoferesManuales(),
            'enviado' => $disp->isEnviado(),
            'enviado_at' => $disp->getEnviadoAt()?->format('Y-m-d\TH:i:s\Z'),
        ]);
    }

    #[Route('', name: 'admin_disponibilidad_guardar', methods: ['POST'])]
    public function guardar(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $fecha = $data['fecha'] ?? null;
        $choferesIds = $data['choferes_ids'] ?? [];
        $choferesManuales = $data['choferes_manuales'] ?? [];

        if (!$fecha) {
            return new JsonResponse(['code' => 422, 'message' => 'La fecha es obligatoria'], 422);
        }

        $disp = $this->service->guardar($fecha, $choferesIds, $choferesManuales);

        return $this->ok([
            'message' => 'Disponibilidad guardada correctamente',
            'fecha' => $disp->getFecha()->format('Y-m-d'),
            'choferes_ids' => $disp->getChoferesIds(),
            'choferes_manuales' => $disp->getChoferesManuales(),
            'enviado' => $disp->isEnviado(),
            'enviado_at' => $disp->getEnviadoAt()?->format('Y-m-d\TH:i:s\Z'),
        ]);
    }

    #[Route('/enviar', name: 'admin_disponibilidad_enviar', methods: ['POST'])]
    public function enviar(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $fecha = $data['fecha'] ?? (new \DateTime('tomorrow'))->format('Y-m-d');

        $disp = $this->service->obtenerPorFecha($fecha);
        if (!$disp) {
            return new JsonResponse(['code' => 404, 'message' => 'No hay disponibilidad cargada para esa fecha'], 404);
        }

        $ok = $this->service->enviarEmail($disp);

        if (!$ok) {
            return new JsonResponse(['code' => 500, 'message' => 'Error al enviar el email'], 500);
        }

        return $this->ok([
            'message' => 'Email enviado correctamente',
            'enviado_at' => $disp->getEnviadoAt()?->format('Y-m-d\TH:i:s\Z'),
        ]);
    }
}
