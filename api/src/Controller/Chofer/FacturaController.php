<?php

namespace App\Controller\Chofer;

use App\Controller\AbstractApiController;
use App\Entity\Factura;
use App\Repository\ChoferRepository;
use App\Repository\FacturaRepository;
use App\Response\FacturaResponse;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/facturas')]
class FacturaController extends AbstractApiController
{
    public function __construct(
        private EntityManagerInterface $em,
        private ChoferRepository       $choferRepo,
        private FacturaRepository      $facturaRepo,
    ) {}

    // ── GET /api/facturas ─────────────────────────────────────────────────────

    #[Route('', name: 'chofer_facturas_listar', methods: ['GET'])]
    public function listar(Request $request): JsonResponse
    {
        $usuario = $this->getUsuario();
        $chofer  = $this->choferRepo->findOneBy(['usuario' => $usuario, 'eliminado' => false]);
        if (!$chofer) { return $this->paginated([], 0, 1, 50); }

        $page   = max(1, (int)$request->query->get('page', 1));
        $limit  = min(200, max(1, (int)$request->query->get('limit', 50)));
        $estado = $request->query->get('estado');
        $offset = ($page - 1) * $limit;

        $qb = $this->em->createQueryBuilder()->select('f')->from(Factura::class, 'f')
            ->where('f.chofer = :chofer')->andWhere('f.eliminado = false')
            ->setParameter('chofer', $chofer)
            ->orderBy('f.created_at', 'DESC')
            ->setMaxResults($limit)->setFirstResult($offset);
        if ($estado) { $qb->andWhere('f.estado = :estado')->setParameter('estado', $estado); }

        $items = array_map(fn($f) => FacturaResponse::fromEntity($f), $qb->getQuery()->getResult());

        $cqb = $this->em->createQueryBuilder()->select('COUNT(f.id)')->from(Factura::class, 'f')
            ->where('f.chofer = :chofer')->andWhere('f.eliminado = false')->setParameter('chofer', $chofer);
        if ($estado) { $cqb->andWhere('f.estado = :estado')->setParameter('estado', $estado); }
        $total = (int)$cqb->getQuery()->getSingleScalarResult();

        return $this->paginated($items, $total, $page, $limit);
    }

    // ── POST /api/facturas ────────────────────────────────────────────────────

    #[Route('', name: 'chofer_facturas_crear', methods: ['POST'])]
    public function crear(Request $request): JsonResponse
    {
        $usuario = $this->getUsuario();
        $chofer  = $this->choferRepo->findOneBy(['usuario' => $usuario, 'eliminado' => false]);

        if (!$chofer) {
            return new JsonResponse(['code' => 403, 'message' => 'Perfil de chofer no encontrado.'], 403);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        // Validate
        $errors = [];
        if (empty($data['numero_factura'])) { $errors['numero_factura'] = 'Requerido.'; }
        if (empty($data['monto_bruto']) || !is_numeric($data['monto_bruto'])) { $errors['monto_bruto'] = 'Debe ser un número positivo.'; }
        if (empty($data['fecha_emision'])) { $errors['fecha_emision'] = 'Requerido.'; }

        if (!empty($errors)) {
            return new JsonResponse(['code' => 422, 'message' => 'Error de validación.', 'errors' => $errors], 422);
        }

        $montoBruto      = (float)$data['monto_bruto'];
        $montoNotaCredito = isset($data['monto_nota_credito']) && is_numeric($data['monto_nota_credito'])
            ? (float)$data['monto_nota_credito']
            : null;
        $montoNeto = $montoBruto - ($montoNotaCredito ?? 0);

        try {
            $fechaEmision = new \DateTimeImmutable($data['fecha_emision']);
        } catch (\Exception) {
            return new JsonResponse(['code' => 422, 'message' => 'Fecha de emisión inválida.'], 422);
        }

        // Calculate estimated collection date
        $diasCobro = 30; // default
        $fechaCobroEstimada = $fechaEmision->modify("+{$diasCobro} days");

        $factura = new Factura();
        $factura->setChofer($chofer);
        $factura->setNumeroFactura(trim($data['numero_factura']));
        $factura->setMontoBruto($montoBruto);
        $factura->setMontoNotaCredito($montoNotaCredito);
        $factura->setMontoNeto($montoNeto);
        $factura->setFechaEmision($fechaEmision);
        $factura->setFechaCobroEstimada($fechaCobroEstimada);
        $factura->setArchivoFacturaUrl($data['archivo_factura_url'] ?? null);
        $factura->setArchivoNotaCreditoUrl($data['archivo_nota_credito_url'] ?? null);

        if (!empty($data['proforma_id'])) {
            // Optionally link to proforma
            $proforma = $this->em->find(\App\Entity\Proforma::class, (int)$data['proforma_id']);
            if ($proforma && $proforma->getChofer() === $chofer) {
                $factura->setProforma($proforma);
            }
        }

        $this->em->persist($factura);
        $this->em->flush();

        return $this->created(FacturaResponse::fromEntity($factura));
    }
}
