<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;

class HealthController extends AbstractController
{
    #[Route('/api/health', name: 'health_check', methods: ['GET'])]
    public function check(): JsonResponse
    {
        return new JsonResponse([
            'status'    => 'ok',
            'version'   => 'v23b',
            'timestamp' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
        ]);
    }

    #[Route('/api/maintenance/purge-data', name: 'maintenance_purge', methods: ['DELETE'])]
    public function purgeData(\Doctrine\ORM\EntityManagerInterface $em): JsonResponse
    {
        $secret = $_SERVER['HTTP_X_MAINTENANCE_KEY'] ?? '';
        if ($secret !== 'enviopack-purge-2026') {
            return new JsonResponse(['code' => 403, 'message' => 'Forbidden'], 403);
        }

        $conn = $em->getConnection();
        $delSolicitudes = $conn->executeStatement('DELETE FROM solicitud_adelanto');
        $delFacturas = $conn->executeStatement('DELETE FROM factura');
        $delProformas = $conn->executeStatement('DELETE FROM proforma');

        return new JsonResponse([
            'status' => 'purged',
            'deleted' => [
                'solicitudes' => $delSolicitudes,
                'facturas' => $delFacturas,
                'proformas' => $delProformas,
            ],
        ]);
    }
}
