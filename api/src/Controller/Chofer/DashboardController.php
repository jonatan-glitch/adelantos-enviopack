<?php

namespace App\Controller\Chofer;

use App\Controller\AbstractApiController;
use App\Entity\Factura;
use App\Entity\SolicitudAdelanto;
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
        $chofer  = $this->choferRepo->findOneBy(['usuario' => $usuario, 'eliminado' => false]);

        if (!$chofer) {
            return $this->ok(['facturas_disponibles' => 0, 'adelantos_pendientes' => 0, 'total_facturado' => 0, 'total_adelantado' => 0]);
        }

        $em = $this->em;

        $facturasDisponibles = (int)$em->createQueryBuilder()
            ->select('COUNT(f.id)')->from(Factura::class, 'f')
            ->where('f.chofer = :chofer')->andWhere('f.estado = :estado')->andWhere('f.eliminado = false')
            ->setParameter('chofer', $chofer)->setParameter('estado', Factura::ESTADO_PENDIENTE_COBRO)
            ->getQuery()->getSingleScalarResult();

        $adelantosPendientes = (int)$em->createQueryBuilder()
            ->select('COUNT(s.id)')->from(SolicitudAdelanto::class, 's')
            ->where('s.chofer = :chofer')->andWhere('s.estado = :estado')
            ->setParameter('chofer', $chofer)->setParameter('estado', SolicitudAdelanto::ESTADO_EN_REVISION)
            ->getQuery()->getSingleScalarResult();

        $totalFacturado = (float)($em->createQueryBuilder()
            ->select('SUM(f.monto_bruto)')->from(Factura::class, 'f')
            ->where('f.chofer = :chofer')->andWhere('f.eliminado = false')
            ->setParameter('chofer', $chofer)
            ->getQuery()->getSingleScalarResult() ?? 0);

        $totalAdelantado = (float)($em->createQueryBuilder()
            ->select('SUM(s.monto_neto)')->from(SolicitudAdelanto::class, 's')
            ->where('s.chofer = :chofer')->andWhere('s.estado = :estado')
            ->setParameter('chofer', $chofer)->setParameter('estado', SolicitudAdelanto::ESTADO_PAGADA)
            ->getQuery()->getSingleScalarResult() ?? 0);

        return $this->ok([
            'facturas_disponibles' => $facturasDisponibles,
            'adelantos_pendientes' => $adelantosPendientes,
            'total_facturado'      => $totalFacturado,
            'total_adelantado'     => $totalAdelantado,
        ]);
    }
}
