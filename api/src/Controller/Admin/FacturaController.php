<?php

namespace App\Controller\Admin;

use App\Controller\AbstractApiController;
use App\Entity\Factura;
use App\Exception\DomainException;
use App\Repository\FacturaRepository;
use App\Response\FacturaResponse;
use App\Service\FileStorageService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/admin/facturas')]
class FacturaController extends AbstractApiController
{
    private const GRUPO_MAP = [
        'recibidas'  => [Factura::ESTADO_COBRO_NORMAL, Factura::ESTADO_PENDIENTE_COBRO],
        'en_proceso' => [Factura::ESTADO_CON_ADELANTO_SOLICITADO, Factura::ESTADO_ADELANTO_APROBADO],
        'pagas'      => [Factura::ESTADO_PAGADA_COBRO_NORMAL, Factura::ESTADO_ADELANTO_PAGADO],
        'rechazadas' => [Factura::ESTADO_ADELANTO_RECHAZADO],
    ];

    public function __construct(
        private EntityManagerInterface $em,
        private FacturaRepository      $facturaRepo,
        private FileStorageService     $fileStorage,
    ) {}

    #[Route('', name: 'admin_facturas_listar', methods: ['GET'])]
    public function listar(Request $request): JsonResponse
    {
        $page      = max(1, (int)$request->query->get('page', 1));
        $limit     = min(200, max(1, (int)$request->query->get('limit', 50)));
        $grupo     = $request->query->get('grupo');
        $chofer_id = $request->query->get('chofer_id') ? (int)$request->query->get('chofer_id') : null;
        $offset    = ($page - 1) * $limit;

        $qb = $this->em->createQueryBuilder()->select('f')->from(Factura::class, 'f')
            ->where('f.eliminado = false')
            ->orderBy('f.created_at', 'DESC')
            ->setMaxResults($limit)->setFirstResult($offset);

        if ($grupo && isset(self::GRUPO_MAP[$grupo])) {
            $qb->andWhere('f.estado IN (:estados)')->setParameter('estados', self::GRUPO_MAP[$grupo]);
        }
        if ($chofer_id) {
            $qb->andWhere('f.chofer = :chofer_id')->setParameter('chofer_id', $chofer_id);
        }

        $items = array_map(fn($f) => FacturaResponse::fromEntity($f), $qb->getQuery()->getResult());

        $cqb = $this->em->createQueryBuilder()->select('COUNT(f.id)')->from(Factura::class, 'f')
            ->where('f.eliminado = false');
        if ($grupo && isset(self::GRUPO_MAP[$grupo])) {
            $cqb->andWhere('f.estado IN (:estados)')->setParameter('estados', self::GRUPO_MAP[$grupo]);
        }
        if ($chofer_id) {
            $cqb->andWhere('f.chofer = :chofer_id')->setParameter('chofer_id', $chofer_id);
        }
        $total = (int)$cqb->getQuery()->getSingleScalarResult();

        return $this->paginated($items, $total, $page, $limit);
    }

    #[Route('/{id}/abonar', name: 'admin_facturas_abonar', methods: ['PUT'])]
    public function abonar(int $id, Request $request): JsonResponse
    {
        $factura = $this->facturaRepo->find($id);
        if (!$factura || $factura->isEliminado()) {
            throw new DomainException('Factura no encontrada.');
        }

        if ($factura->getEstado() !== Factura::ESTADO_COBRO_NORMAL) {
            return new JsonResponse([
                'code'    => 422,
                'message' => 'Solo se pueden abonar facturas con cobro normal pendiente.',
            ], 422);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        if (!empty($data['comprobante_url'])) {
            $factura->setComprobantePagoUrl($data['comprobante_url']);
        }

        $factura->setEstado(Factura::ESTADO_PAGADA_COBRO_NORMAL);
        $factura->setFechaPago(new \DateTimeImmutable());
        $this->em->flush();

        return $this->ok(FacturaResponse::fromEntity($factura));
    }

    #[Route('/{id}/comprobante', name: 'admin_facturas_comprobante', methods: ['POST'])]
    public function subirComprobante(int $id, Request $request): JsonResponse
    {
        $factura = $this->facturaRepo->find($id);
        if (!$factura || $factura->isEliminado()) {
            throw new DomainException('Factura no encontrada.');
        }

        $file = $request->files->get('comprobante');
        if (!$file) {
            return new JsonResponse(['code' => 400, 'message' => 'No se envió un archivo.'], 400);
        }

        $url = $this->fileStorage->store($file);

        $factura->setComprobantePagoUrl($url);
        $this->em->flush();

        return $this->ok(['comprobante_url' => $url]);
    }
}
