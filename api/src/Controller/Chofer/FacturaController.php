<?php

namespace App\Controller\Chofer;

use App\Controller\AbstractApiController;
use App\Entity\Factura;
use App\Repository\ChoferRepository;
use App\Repository\FacturaRepository;
use App\Response\FacturaResponse;
use App\Service\S3Service;
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
        private S3Service              $s3,
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
            if ($proforma && $proforma->getChofer()->getId() === $chofer->getId()) {
                $factura->setProforma($proforma);
            }
        }

        $this->em->persist($factura);
        $this->em->flush();

        return $this->created(FacturaResponse::fromEntity($factura));
    }

    // ── POST /api/facturas/{id}/archivo ─────────────────────────────────────────

    #[Route('/{id}/archivo', name: 'chofer_facturas_archivo', methods: ['POST'])]
    public function subirArchivo(int $id, Request $request): JsonResponse
    {
        $factura = $this->getFacturaChofer($id);
        if ($factura instanceof JsonResponse) return $factura;

        $file = $request->files->get('archivo');
        if (!$file) {
            return new JsonResponse(['code' => 422, 'message' => 'No se envió un archivo. Verificá que el campo se llame "archivo".'], 422);
        }

        try {
            $url = $this->uploadFile($file, $factura, 'factura');
        } catch (\Throwable $e) {
            error_log("[subirArchivo] Upload failed: {$e->getMessage()} in {$e->getFile()}:{$e->getLine()}");
            return new JsonResponse(['code' => 500, 'message' => 'Error al guardar archivo: ' . $e->getMessage()], 500);
        }

        $factura->setArchivoFacturaUrl($url);
        $this->em->flush();

        return $this->ok(['archivo_factura_url' => $url]);
    }

    // ── POST /api/facturas/{id}/nota-credito ─────────────────────────────────────

    #[Route('/{id}/nota-credito', name: 'chofer_facturas_nota_credito', methods: ['POST'])]
    public function subirNotaCredito(int $id, Request $request): JsonResponse
    {
        $factura = $this->getFacturaChofer($id);
        if ($factura instanceof JsonResponse) return $factura;

        $file = $request->files->get('archivo');
        if (!$file) {
            return new JsonResponse(['code' => 422, 'message' => 'No se envió un archivo. Verificá que el campo se llame "archivo".'], 422);
        }

        try {
            $url = $this->uploadFile($file, $factura, 'nota-credito');
        } catch (\Throwable $e) {
            error_log("[subirNotaCredito] Upload failed: {$e->getMessage()} in {$e->getFile()}:{$e->getLine()}");
            return new JsonResponse(['code' => 500, 'message' => 'Error al guardar archivo: ' . $e->getMessage()], 500);
        }

        $factura->setArchivoNotaCreditoUrl($url);
        $this->em->flush();

        return $this->ok(['archivo_nota_credito_url' => $url]);
    }

    // ── PUT /api/facturas/{id}/confirmar ─────────────────────────────────────────

    #[Route('/{id}/confirmar', name: 'chofer_facturas_confirmar', methods: ['PUT'])]
    public function confirmar(int $id, Request $request): JsonResponse
    {
        $factura = $this->getFacturaChofer($id);
        if ($factura instanceof JsonResponse) return $factura;

        if ($factura->getEstado() !== Factura::ESTADO_PENDIENTE_COBRO) {
            return new JsonResponse(['code' => 422, 'message' => 'Esta factura ya fue procesada.'], 422);
        }

        $data   = json_decode($request->getContent(), true) ?? [];
        $opcion = $data['opcion_cobro'] ?? 'normal';

        if (!in_array($opcion, ['normal', 'adelanto'])) {
            return new JsonResponse(['code' => 422, 'message' => 'Opción de cobro inválida.'], 422);
        }

        if (!$factura->getArchivoFacturaUrl()) {
            return new JsonResponse(['code' => 422, 'message' => 'Debés subir el archivo de factura primero.'], 422);
        }
        if ($opcion === 'adelanto' && !$factura->getArchivoNotaCreditoUrl()) {
            return new JsonResponse(['code' => 422, 'message' => 'Debés subir la nota de crédito para cobro adelantado.'], 422);
        }

        $montoNC = isset($data['monto_nota_credito']) && is_numeric($data['monto_nota_credito'])
            ? (float)$data['monto_nota_credito'] : null;

        $factura->setOpcionCobro($opcion);
        if ($opcion === 'adelanto' && $montoNC !== null) {
            $factura->setMontoNotaCredito($montoNC);
            $factura->setMontoNeto($factura->getMontoBruto() - $montoNC);
        }

        // Transition estado
        if ($opcion === 'normal') {
            $factura->setEstado(Factura::ESTADO_COBRO_NORMAL);
        }
        // For 'adelanto', estado stays pendiente_cobro until SolicitarAdelanto

        // Mark linked proforma as facturada
        $proforma = $factura->getProforma();
        if ($proforma && $proforma->getEstado() === \App\Entity\Proforma::ESTADO_PENDIENTE) {
            $proforma->setEstado(\App\Entity\Proforma::ESTADO_FACTURADA);
        }

        $this->em->flush();

        return $this->ok(FacturaResponse::fromEntity($factura));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    private function uploadFile(\Symfony\Component\HttpFoundation\File\UploadedFile $file, Factura $factura, string $type): string
    {
        $slug = date('Ymd') . '-' . $factura->getChofer()->getId() . '-' . $factura->getId();
        $ext  = strtolower($file->getClientOriginalExtension() ?: 'pdf');
        $key  = "facturas/{$slug}/{$type}.{$ext}";

        // Try S3 first
        if ($this->s3->isConfigured()) {
            try {
                return $this->s3->upload($file->getPathname(), $key, $file->getMimeType() ?: 'application/pdf');
            } catch (\Throwable $e) {
                error_log("[FacturaController] S3 upload failed: {$e->getMessage()}");
                // Fall through to local storage
            }
        }

        // Fallback: store locally in public/uploads/
        $uploadsDir = '/app/public/uploads/facturas/' . $slug;
        if (!is_dir($uploadsDir)) {
            mkdir($uploadsDir, 0777, true);
        }
        $localName = "{$type}.{$ext}";
        $file->move($uploadsDir, $localName);

        return "/uploads/facturas/{$slug}/{$localName}";
    }

    private function getFacturaChofer(int $id): Factura|JsonResponse
    {
        $usuario = $this->getUsuario();
        $chofer  = $this->choferRepo->findOneBy(['usuario' => $usuario, 'eliminado' => false]);
        if (!$chofer) {
            return new JsonResponse(['code' => 403, 'message' => 'Perfil de chofer no encontrado.'], 403);
        }
        $factura = $this->facturaRepo->findOneBy(['id' => $id, 'chofer' => $chofer, 'eliminado' => false]);
        if (!$factura) {
            return new JsonResponse(['code' => 404, 'message' => 'Factura no encontrada.'], 404);
        }
        return $factura;
    }
}
