<?php

namespace App\Controller\Chofer;

use App\Constant\RolConstant;
use App\Controller\AbstractApiController;
use App\Entity\Chofer;
use App\Entity\Factura;
use App\Repository\ChoferRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api')]
class DashboardController extends AbstractApiController
{
    public function __construct(
        private EntityManagerInterface $em,
        private ChoferRepository       $choferRepo,
    ) {}

    #[Route('/dashboard', name: 'chofer_dashboard', methods: ['GET'])]
    public function index(): JsonResponse
    {
        $usuario = $this->getUsuario();

        // If admin, return global stats
        if (array_intersect($usuario->getRoles(), RolConstant::ROLES_ADMIN_PANEL)) {
            return $this->ok($this->adminStats());
        }

        // Chofer stats
        $chofer = $this->choferRepo->findOneBy(['usuario' => $usuario, 'eliminado' => false]);
        if (!$chofer) {
            return $this->ok(['facturas_disponibles' => 0, 'adelantos_pendientes' => 0, 'total_facturado' => 0, 'total_adelantado' => 0]);
        }

        return $this->ok($this->choferStats($chofer));
    }

    private function choferStats(Chofer $chofer): array
    {
        $em = $this->em;

        $facturasDisponibles = (int)$em->createQueryBuilder()
            ->select('COUNT(f.id)')->from(Factura::class, 'f')
            ->where('f.chofer = :chofer')
            ->andWhere('f.estado IN (:estados)')
            ->andWhere('f.eliminado = false')
            ->setParameter('chofer', $chofer)
            ->setParameter('estados', [Factura::ESTADO_PENDIENTE_COBRO, Factura::ESTADO_COBRO_NORMAL])
            ->getQuery()->getSingleScalarResult();

        $adelantosPendientes = (int)$em->createQueryBuilder()
            ->select('COUNT(f.id)')->from(Factura::class, 'f')
            ->where('f.chofer = :chofer')
            ->andWhere('f.opcion_cobro = :adelanto')
            ->andWhere('f.estado IN (:estados)')
            ->andWhere('f.eliminado = false')
            ->setParameter('chofer', $chofer)
            ->setParameter('adelanto', 'adelanto')
            ->setParameter('estados', [
                Factura::ESTADO_CON_ADELANTO_SOLICITADO,
                Factura::ESTADO_ADELANTO_APROBADO,
            ])
            ->getQuery()->getSingleScalarResult();

        $totalFacturado = (float)($em->createQueryBuilder()
            ->select('SUM(f.monto_bruto)')->from(Factura::class, 'f')
            ->where('f.chofer = :chofer')->andWhere('f.eliminado = false')
            ->setParameter('chofer', $chofer)
            ->getQuery()->getSingleScalarResult() ?? 0);

        $totalAdelantado = (float)($em->createQueryBuilder()
            ->select('SUM(f.monto_neto)')->from(Factura::class, 'f')
            ->where('f.chofer = :chofer')
            ->andWhere('f.opcion_cobro = :adelanto')
            ->andWhere('f.estado IN (:estados)')
            ->andWhere('f.eliminado = false')
            ->setParameter('chofer', $chofer)
            ->setParameter('adelanto', 'adelanto')
            ->setParameter('estados', [Factura::ESTADO_ADELANTO_PAGADO, Factura::ESTADO_PAGADA_COBRO_NORMAL])
            ->getQuery()->getSingleScalarResult() ?? 0);

        return [
            'facturas_disponibles' => $facturasDisponibles,
            'adelantos_pendientes' => $adelantosPendientes,
            'total_facturado'      => $totalFacturado,
            'total_adelantado'     => $totalAdelantado,
        ];
    }

    private function adminStats(): array
    {
        $em = $this->em;

        // Facturas pending action (recibidas + en proceso)
        $facturasDisponibles = (int)$em->createQueryBuilder()
            ->select('COUNT(f.id)')->from(Factura::class, 'f')
            ->where('f.estado IN (:estados)')
            ->andWhere('f.eliminado = false')
            ->setParameter('estados', [
                Factura::ESTADO_PENDIENTE_COBRO,
                Factura::ESTADO_COBRO_NORMAL,
                Factura::ESTADO_CON_ADELANTO_SOLICITADO,
                Factura::ESTADO_ADELANTO_APROBADO,
            ])
            ->getQuery()->getSingleScalarResult();

        // Adelantos awaiting approval or payment
        $adelantosPendientes = (int)$em->createQueryBuilder()
            ->select('COUNT(f.id)')->from(Factura::class, 'f')
            ->where('f.opcion_cobro = :adelanto')
            ->andWhere('f.estado IN (:estados)')
            ->andWhere('f.eliminado = false')
            ->setParameter('adelanto', 'adelanto')
            ->setParameter('estados', [
                Factura::ESTADO_CON_ADELANTO_SOLICITADO,
                Factura::ESTADO_ADELANTO_APROBADO,
            ])
            ->getQuery()->getSingleScalarResult();

        // Total billed (all facturas)
        $totalFacturado = (float)($em->createQueryBuilder()
            ->select('SUM(f.monto_bruto)')->from(Factura::class, 'f')
            ->where('f.eliminado = false')
            ->getQuery()->getSingleScalarResult() ?? 0);

        // Total paid as adelanto
        $totalAdelantado = (float)($em->createQueryBuilder()
            ->select('SUM(f.monto_neto)')->from(Factura::class, 'f')
            ->where('f.opcion_cobro = :adelanto')
            ->andWhere('f.estado IN (:estados)')
            ->andWhere('f.eliminado = false')
            ->setParameter('adelanto', 'adelanto')
            ->setParameter('estados', [Factura::ESTADO_ADELANTO_PAGADO, Factura::ESTADO_PAGADA_COBRO_NORMAL])
            ->getQuery()->getSingleScalarResult() ?? 0);

        return [
            'facturas_disponibles' => $facturasDisponibles,
            'adelantos_pendientes' => $adelantosPendientes,
            'total_facturado'      => $totalFacturado,
            'total_adelantado'     => $totalAdelantado,
        ];
    }
}
