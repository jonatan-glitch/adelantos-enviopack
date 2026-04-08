<?php

namespace App\Controller\Admin;

use App\Controller\AbstractApiController;
use App\Entity\Chofer;
use App\Entity\Factura;
use App\Entity\SolicitudAdelanto;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/admin/reportes')]
class ReporteController extends AbstractApiController
{
    public function __construct(private EntityManagerInterface $em) {}

    #[Route('', name: 'admin_reportes', methods: ['GET'])]
    public function index(Request $request): JsonResponse
    {
        $periodo = $request->query->get('periodo', 'mes_actual');
        [$desde, $hasta] = $this->resolverPeriodo($periodo);
        $em = $this->em;

        // Total choferes (no date filter — it's a current count)
        $totalChoferes = (int)$em->createQueryBuilder()
            ->select('COUNT(c.id)')
            ->from(Chofer::class, 'c')
            ->where('c.eliminado = false')
            ->getQuery()
            ->getSingleScalarResult();

        // Monto total facturado (all facturas in period, not just adelantos)
        $qbMonto = $em->createQueryBuilder()
            ->select('SUM(f.monto_bruto)')
            ->from(Factura::class, 'f')
            ->where('f.created_at >= :desde')
            ->andWhere('f.created_at <= :hasta')
            ->setParameter('desde', $desde)
            ->setParameter('hasta', $hasta);
        $montoTotal = (float)($qbMonto->getQuery()->getSingleScalarResult() ?? 0);

        // Descuentos obtenidos (from paid adelantos in period)
        $qbDesc = $em->createQueryBuilder()
            ->select('SUM(s.monto_descontado)')
            ->from(SolicitudAdelanto::class, 's')
            ->where('s.estado = :estado')
            ->andWhere('s.fecha_solicitud >= :desde')
            ->andWhere('s.fecha_solicitud <= :hasta')
            ->setParameter('estado', SolicitudAdelanto::ESTADO_PAGADA)
            ->setParameter('desde', $desde)
            ->setParameter('hasta', $hasta);
        $descuentos = (float)($qbDesc->getQuery()->getSingleScalarResult() ?? 0);

        // Choferes con adelanto (in period)
        $qbConAdelanto = $em->createQueryBuilder()
            ->select('COUNT(DISTINCT s.chofer)')
            ->from(SolicitudAdelanto::class, 's')
            ->where('s.estado IN (:estados)')
            ->andWhere('s.fecha_solicitud >= :desde')
            ->andWhere('s.fecha_solicitud <= :hasta')
            ->setParameter('estados', [SolicitudAdelanto::ESTADO_APROBADA, SolicitudAdelanto::ESTADO_PAGADA])
            ->setParameter('desde', $desde)
            ->setParameter('hasta', $hasta);
        $conAdelanto = (int)$qbConAdelanto->getQuery()->getSingleScalarResult();

        // Tasa promedio (in period)
        $qbTasa = $em->createQueryBuilder()
            ->select('AVG(s.tasa_aplicada)')
            ->from(SolicitudAdelanto::class, 's')
            ->where('s.fecha_solicitud >= :desde')
            ->andWhere('s.fecha_solicitud <= :hasta')
            ->setParameter('desde', $desde)
            ->setParameter('hasta', $hasta);
        $tasaPromedio = (float)($qbTasa->getQuery()->getSingleScalarResult() ?? 0);

        // Tiempo promedio de aprobación (horas)
        $tiempoPromedio = $this->calcularTiempoPromedioAprobacion($desde, $hasta);

        return $this->ok([
            'monto_total_facturado'            => $montoTotal,
            'descuentos_obtenidos'             => $descuentos,
            'choferes_total'                   => $totalChoferes,
            'choferes_con_adelanto'            => $conAdelanto,
            'tasa_promedio'                    => round($tasaPromedio, 2),
            'tiempo_promedio_aprobacion_horas'  => round($tiempoPromedio, 1),
        ]);
    }

    private function resolverPeriodo(string $periodo): array
    {
        $now = new \DateTimeImmutable();

        return match ($periodo) {
            'mes_actual' => [
                $now->modify('first day of this month')->setTime(0, 0),
                $now->setTime(23, 59, 59),
            ],
            'mes_anterior' => [
                $now->modify('first day of last month')->setTime(0, 0),
                $now->modify('last day of last month')->setTime(23, 59, 59),
            ],
            'trimestre' => [
                $now->modify('-3 months')->modify('first day of this month')->setTime(0, 0),
                $now->setTime(23, 59, 59),
            ],
            'anio' => [
                new \DateTimeImmutable($now->format('Y') . '-01-01 00:00:00'),
                $now->setTime(23, 59, 59),
            ],
            default => [
                $now->modify('first day of this month')->setTime(0, 0),
                $now->setTime(23, 59, 59),
            ],
        };
    }

    private function calcularTiempoPromedioAprobacion(\DateTimeImmutable $desde, \DateTimeImmutable $hasta): float
    {
        $conn = $this->em->getConnection();
        $sql = "
            SELECT AVG(EXTRACT(EPOCH FROM (fecha_aprobacion - fecha_solicitud)) / 3600) as promedio_horas
            FROM solicitud_adelanto
            WHERE fecha_aprobacion IS NOT NULL
            AND fecha_solicitud >= :desde
            AND fecha_solicitud <= :hasta
        ";
        $result = $conn->fetchOne($sql, [
            'desde' => $desde->format('Y-m-d H:i:s'),
            'hasta' => $hasta->format('Y-m-d H:i:s'),
        ]);

        return $result ? (float)$result : 0;
    }
}
