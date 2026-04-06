<?php

namespace App\Response;

use App\Entity\Factura;

class FacturaResponse
{
    public int $id;
    public array $chofer;
    public ?array $proforma;
    public string $numero_factura;
    public float $monto_bruto;
    public ?float $monto_nota_credito;
    public float $monto_neto;
    public string $fecha_emision;
    public string $fecha_cobro_estimada;
    public string $estado;
    public string $opcion_cobro;
    public ?string $archivo_factura_url;
    public ?string $archivo_nota_credito_url;
    public ?string $comprobante_pago_url;
    public ?string $fecha_pago;
    public ?string $motivo_rechazo;
    public string $created_at;

    public static function fromEntity(Factura $f): self
    {
        $dto = new self();
        $dto->id                     = $f->getId();
        $dto->chofer                 = ['id' => $f->getChofer()->getId(), 'nombre' => $f->getChofer()->getNombre(), 'apellido' => $f->getChofer()->getApellido(), 'dni' => $f->getChofer()->getDni()];
        $dto->proforma               = $f->getProforma() ? ['id' => $f->getProforma()->getId(), 'monto' => $f->getProforma()->getMonto(), 'periodo' => $f->getProforma()->getPeriodo()] : null;
        $dto->numero_factura         = $f->getNumeroFactura();
        $dto->monto_bruto            = $f->getMontoBruto();
        $dto->monto_nota_credito     = $f->getMontoNotaCredito();
        $dto->monto_neto             = $f->getMontoNeto();
        $dto->fecha_emision          = $f->getFechaEmision()->format('Y-m-d');
        $dto->fecha_cobro_estimada   = $f->getFechaCobroEstimada()->format('Y-m-d');
        $dto->estado                 = $f->getEstado();
        $dto->opcion_cobro           = $f->getOpcionCobro();
        $dto->archivo_factura_url    = $f->getArchivoFacturaUrl();
        $dto->archivo_nota_credito_url = $f->getArchivoNotaCreditoUrl();
        $dto->comprobante_pago_url   = $f->getComprobantePagoUrl();
        $dto->fecha_pago             = $f->getFechaPago()?->format('Y-m-d\TH:i:s\Z');
        $dto->motivo_rechazo         = $f->getMotivoRechazo();
        $dto->created_at             = $f->getCreatedAt()->format('Y-m-d\TH:i:s\Z');
        return $dto;
    }
}
