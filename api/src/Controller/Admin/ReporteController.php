<?php

namespace App\Controller\Admin;

use App\Controller\AbstractApiController;
use App\Entity\Chofer;
use App\Entity\SolicitudAdelanto;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/admin/reportes')]
class ReporteController extends AbstractApiController
{
    public function __construct(private EntityManagerInterface $em) {}

    #[Route('', name: 'admin_reportes', methods: ['GET'])]
    public function index(): JsonResponse
    {
        $em = $this->em;

        $totalChoferes = (int)$em->createQueryBuilder()->select('COUNT(c.id)')->from(Chofer::class, 'c')->where('c.eliminado = false')->getQuery()->getSingleScalarResult();

        $conAdelanto = (int)$em->createQueryBuilder()->select('COUNT(DISTINCT s.chofer)')->from(SolicitudAdelanto::class, 's')->where('s.estado IN (:estados)')->setParameter('estados', [SolicitudAdelanto::ESTADO_APROBADA, SolicitudAdelanto::ESTADO_PAGADA])->getQuery()->getSingleScalarResult();

        $montoTotal = (float)($em->createQueryBuilder()->select('SUM(s.monto_bruto)')->from(SolicitudAdelanto::class, 's')->where('s.estado = :estado')->setParameter('estado', SolicitudAdelanto::ESTADO_PAGADA)->getQuery()->getSingleScalarResult() ?? 0);

        $descuentos = (float)($em->createQueryBuilder()->select('SUM(s.monto_descontado)')->from(SolicitudAdelanto::class, 's')->where('s.estado = :estado')->setParameter('estado', SolicitudAdelanto::ESTADO_PAGADA)->getQuery()->getSingleScalarResult() ?? 0);

        $pendientes = (int)$em->createQueryBuilder()->select('COUNT(s.id)')->from(SolicitudAdelanto::class, 's')->where('s.estado = :estado')->setParameter('estado', SolicitudAdelanto::ESTADO_EN_REVISION)->getQuery()->getSingleScalarResult();

        $tasaPromedio = (float)($em->createQueryBuilder()->select('AVG(s.tasa_aplicada)')->from(SolicitudAdelanto::class, 's')->getQuery()->getSingleScalarResult() ?? 0);

        return $this->ok([
            'monto_total_facturado'           => $montoTotal,
            'descuentos_obtenidos'            => $descuentos,
            'choferes_total'                  => $totalChoferes,
            'choferes_con_adelanto'           => $conAdelanto,
            'tasa_promedio'                   => round($tasaPromedio, 2),
            'solicitudes_pendientes'          => $pendientes,
            'tiempo_promedio_aprobacion_horas' => 0,
        ]);
    }
}
