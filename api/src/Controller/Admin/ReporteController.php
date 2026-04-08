<?php

namespace App\Controller\Admin;

use App\Controller\AbstractApiController;
use App\Entity\Chofer;
use App\Entity\Factura;
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

        // Total choferes activos
        $totalChoferes = (int)$em->createQueryBuilder()
            ->select('COUNT(c.id)')
            ->from(Chofer::class, 'c')
            ->where('c.eliminado = false')
            ->getQuery()
            ->getSingleScalarResult();

        // Monto total facturado (all facturas in period)
        $montoTotal = (float)($em->createQueryBuilder()
            ->select('SUM(f.monto_bruto)')
            ->from(Factura::class, 'f')
            ->where('f.created_at >= :desde')
            ->andWhere('f.created_at <= :hasta')
            ->andWhere('f.eliminado = false')
            ->setParameter('desde', $desde)
            ->setParameter('hasta', $hasta)
            ->getQuery()
            ->getSingleScalarResult() ?? 0);

        // Descuentos obtenidos = SUM(monto_bruto - monto_neto) for adelanto facturas pagadas
        $descuentos = (float)($em->createQueryBuilder()
            ->select('SUM(f.monto_bruto - f.monto_neto)')
            ->from(Factura::class, 'f')
            ->where('f.opcion_cobro = :adelanto')
            ->andWhere('f.estado IN (:pagadas)')
            ->andWhere('f.created_at >= :desde')
            ->andWhere('f.created_at <= :hasta')
            ->andWhere('f.eliminado = false')
            ->setParameter('adelanto', 'adelanto')
            ->setParameter('pagadas', [
                Factura::ESTADO_ADELANTO_PAGADO,
                Factura::ESTADO_PAGADA_COBRO_NORMAL,
            ])
            ->setParameter('desde', $desde)
            ->setParameter('hasta', $hasta)
            ->getQuery()
            ->getSingleScalarResult() ?? 0);

        // Choferes con adelanto (distinct choferes that chose adelanto in period)
        $conAdelanto = (int)$em->createQueryBuilder()
            ->select('COUNT(DISTINCT f.chofer)')
            ->from(Factura::class, 'f')
            ->where('f.opcion_cobro = :adelanto')
            ->andWhere('f.created_at >= :desde')
            ->andWhere('f.created_at <= :hasta')
            ->andWhere('f.eliminado = false')
            ->setParameter('adelanto', 'adelanto')
            ->setParameter('desde', $desde)
            ->setParameter('hasta', $hasta)
            ->getQuery()
            ->getSingleScalarResult();

        // Tasa promedio from proformas linked to facturas in period
        $tasaPromedio = (float)($em->createQueryBuilder()
            ->select('AVG(p.tasa_aplicada)')
            ->from(Factura::class, 'f')
            ->join('f.proforma', 'p')
            ->where('f.opcion_cobro = :adelanto')
            ->andWhere('f.created_at >= :desde')
            ->andWhere('f.created_at <= :hasta')
            ->andWhere('f.eliminado = false')
            ->setParameter('adelanto', 'adelanto')
            ->setParameter('desde', $desde)
            ->setParameter('hasta', $hasta)
            ->getQuery()
            ->getSingleScalarResult() ?? 0);

        // Tiempo promedio de pago (horas entre created_at y fecha_pago)
        $tiempoPromedio = $this->calcularTiempoPromedioPago($desde, $hasta);

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

    private function calcularTiempoPromedioPago(\DateTimeImmutable $desde, \DateTimeImmutable $hasta): float
    {
        $conn = $this->em->getConnection();
        $sql = "
            SELECT AVG(EXTRACT(EPOCH FROM (fecha_pago - created_at)) / 3600) as promedio_horas
            FROM factura
            WHERE fecha_pago IS NOT NULL
            AND eliminado = false
            AND created_at >= :desde
            AND created_at <= :hasta
        ";
        $result = $conn->fetchOne($sql, [
            'desde' => $desde->format('Y-m-d H:i:s'),
            'hasta' => $hasta->format('Y-m-d H:i:s'),
        ]);

        return $result ? (float)$result : 0;
    }
}
