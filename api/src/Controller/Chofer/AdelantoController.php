<?php

namespace App\Controller\Chofer;

use App\Controller\AbstractApiController;
use App\Entity\Factura;
use App\Entity\SolicitudAdelanto;
use App\Entity\ConfiguracionSistema;
use App\Exception\DomainException;
use App\Repository\ChoferRepository;
use App\Repository\ConfiguracionSistemaRepository;
use App\Repository\FacturaRepository;
use App\Repository\SolicitudAdelantoRepository;
use App\Response\SolicitudAdelantoResponse;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/adelantos')]
class AdelantoController extends AbstractApiController
{
    public function __construct(
        private EntityManagerInterface         $em,
        private ChoferRepository               $choferRepo,
        private FacturaRepository              $facturaRepo,
        private SolicitudAdelantoRepository    $solicitudRepo,
        private ConfiguracionSistemaRepository $configRepo,
    ) {}

    #[Route('', name: 'chofer_adelantos_listar', methods: ['GET'])]
    public function listar(Request $request): JsonResponse
    {
        $usuario = $this->getUsuario();
        $chofer  = $this->choferRepo->findOneBy(['usuario' => $usuario, 'eliminado' => false]);
        if (!$chofer) { return $this->paginated([], 0, 1, 50); }

        $page   = max(1, (int)$request->query->get('page', 1));
        $limit  = min(200, max(1, (int)$request->query->get('limit', 50)));
        $offset = ($page - 1) * $limit;

        $items = $this->em->createQueryBuilder()->select('s')->from(SolicitudAdelanto::class, 's')
            ->where('s.chofer = :chofer')->setParameter('chofer', $chofer)
            ->orderBy('s.created_at', 'DESC')
            ->setMaxResults($limit)->setFirstResult($offset)
            ->getQuery()->getResult();

        $total = (int)$this->em->createQueryBuilder()->select('COUNT(s.id)')->from(SolicitudAdelanto::class, 's')
            ->where('s.chofer = :chofer')->setParameter('chofer', $chofer)
            ->getQuery()->getSingleScalarResult();

        return $this->paginated(array_map(fn($s) => SolicitudAdelantoResponse::fromEntity($s), $items), $total, $page, $limit);
    }

    #[Route('', name: 'chofer_adelantos_solicitar', methods: ['POST'])]
    public function solicitar(Request $request): JsonResponse
    {
        $usuario = $this->getUsuario();
        $chofer  = $this->choferRepo->findOneBy(['usuario' => $usuario, 'eliminado' => false]);
        if (!$chofer) { throw new DomainException('Perfil de chofer no encontrado.'); }
        if ($chofer->isTieneDeuda()) { throw new DomainException('No podés solicitar adelantos con deuda pendiente.'); }

        $data     = json_decode($request->getContent(), true) ?? [];
        $facturaId = (int)($data['factura_id'] ?? 0);
        $factura  = $this->facturaRepo->findOneBy(['id' => $facturaId, 'chofer' => $chofer, 'eliminado' => false]);

        if (!$factura) { throw new DomainException('Factura no encontrada.'); }
        if ($factura->getEstado() !== Factura::ESTADO_PENDIENTE_COBRO) {
            throw new DomainException('Esta factura no está disponible para adelanto.');
        }

        $config = $this->configRepo->find(1) ?? new ConfiguracionSistema();
        $tasa   = $chofer->getTasaPersonal() ?? $config->getTasaGlobal();
        $monto  = $factura->getMontoNeto();
        $descuento = $monto * ($tasa / 100);
        $neto   = $monto - $descuento;

        $solicitud = new SolicitudAdelanto();
        $solicitud->setFactura($factura);
        $solicitud->setChofer($chofer);
        $solicitud->setTasaAplicada($tasa);
        $solicitud->setMontoBruto($monto);
        $solicitud->setMontoDescontado($descuento);
        $solicitud->setMontoNeto($neto);
        $solicitud->setConsentimientoIp($request->getClientIp() ?? '');

        $factura->setEstado(Factura::ESTADO_CON_ADELANTO_SOLICITADO);
        $factura->setOpcionCobro('adelanto');

        $this->em->persist($solicitud);
        $this->em->flush();

        return $this->created(SolicitudAdelantoResponse::fromEntity($solicitud));
    }
}
