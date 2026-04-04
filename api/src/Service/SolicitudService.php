<?php

namespace App\Service;

use App\Entity\Factura;
use App\Entity\SolicitudAdelanto;
use App\Entity\ConfiguracionSistema;
use App\Exception\DomainException;
use App\Repository\ConfiguracionSistemaRepository;
use App\Repository\FacturaRepository;
use App\Repository\SolicitudAdelantoRepository;
use Doctrine\ORM\EntityManagerInterface;

class SolicitudService
{
    public function __construct(
        private EntityManagerInterface         $em,
        private SolicitudAdelantoRepository    $solicitudRepo,
        private FacturaRepository              $facturaRepo,
        private ConfiguracionSistemaRepository $configRepo,
    ) {}

    public function listar(int $page, int $limit, ?string $estado = null, ?int $chofer_id = null): array
    {
        $offset = ($page - 1) * $limit;
        $qb = $this->em->createQueryBuilder()
            ->select('s')->from(SolicitudAdelanto::class, 's')
            ->orderBy('s.fecha_solicitud', 'DESC')
            ->setMaxResults($limit)->setFirstResult($offset);

        if ($estado) { $qb->andWhere('s.estado = :estado')->setParameter('estado', $estado); }
        if ($chofer_id) { $qb->andWhere('s.chofer = :chofer')->setParameter('chofer', $chofer_id); }

        $items = $qb->getQuery()->getResult();
        $cqb = $this->em->createQueryBuilder()->select('COUNT(s.id)')->from(SolicitudAdelanto::class, 's');
        if ($estado) { $cqb->andWhere('s.estado = :estado')->setParameter('estado', $estado); }
        if ($chofer_id) { $cqb->andWhere('s.chofer = :chofer')->setParameter('chofer', $chofer_id); }
        $total = (int)$cqb->getQuery()->getSingleScalarResult();

        return ['items' => $items, 'total' => $total];
    }

    public function aprobar(SolicitudAdelanto $s, string $aprobadoPor): SolicitudAdelanto
    {
        if ($s->getEstado() !== SolicitudAdelanto::ESTADO_EN_REVISION) {
            throw new DomainException('Solo se pueden aprobar solicitudes en revisión.');
        }
        $s->setEstado(SolicitudAdelanto::ESTADO_APROBADA);
        $s->setFechaAprobacion(new \DateTimeImmutable());
        $s->setAprobadoPor($aprobadoPor);
        $s->setTipoAprobacion('manual');
        $s->getFactura()->setEstado(Factura::ESTADO_ADELANTO_APROBADO);
        $this->em->flush();
        return $s;
    }

    public function rechazar(SolicitudAdelanto $s, string $motivo): SolicitudAdelanto
    {
        if ($s->getEstado() !== SolicitudAdelanto::ESTADO_EN_REVISION) {
            throw new DomainException('Solo se pueden rechazar solicitudes en revisión.');
        }
        $s->setEstado(SolicitudAdelanto::ESTADO_RECHAZADA);
        $s->setMotivoRechazo($motivo);
        $s->getFactura()->setEstado(Factura::ESTADO_ADELANTO_RECHAZADO);
        $this->em->flush();
        return $s;
    }

    public function registrarPago(SolicitudAdelanto $s, ?string $comprobanteUrl): SolicitudAdelanto
    {
        if ($s->getEstado() !== SolicitudAdelanto::ESTADO_APROBADA) {
            throw new DomainException('Solo se puede registrar pago de solicitudes aprobadas.');
        }
        $s->setEstado(SolicitudAdelanto::ESTADO_PAGADA);
        $s->setFechaPago(new \DateTimeImmutable());
        if ($comprobanteUrl) { $s->setComprobantePagoUrl($comprobanteUrl); }
        $s->getFactura()->setEstado(Factura::ESTADO_ADELANTO_PAGADO);
        $this->em->flush();
        return $s;
    }
}
