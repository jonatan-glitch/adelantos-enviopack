<?php

namespace App\Response;

use App\Entity\SolicitudAdelanto;

class SolicitudAdelantoResponse
{
    public int $id;
    public array $factura;
    public array $chofer;
    public float $tasa_aplicada;
    public float $monto_bruto;
    public float $monto_descontado;
    public float $monto_neto;
    public string $estado;
    public ?string $tipo_aprobacion;
    public string $fecha_solicitud;
    public ?string $fecha_aprobacion;
    public ?string $fecha_pago;
    public ?string $motivo_rechazo;
    public ?string $aprobado_por;
    public ?string $comprobante_pago_url;
    public string $consentimiento_ip;
    public string $consentimiento_fecha;

    public static function fromEntity(SolicitudAdelanto $s): self
    {
        $dto = new self();
        $dto->id                  = $s->getId();
        $dto->factura             = ['id' => $s->getFactura()->getId(), 'numero_factura' => $s->getFactura()->getNumeroFactura(), 'monto_bruto' => $s->getFactura()->getMontoBruto()];
        $dto->chofer              = ['id' => $s->getChofer()->getId(), 'nombre' => $s->getChofer()->getNombre(), 'apellido' => $s->getChofer()->getApellido(), 'dni' => $s->getChofer()->getDni()];
        $dto->tasa_aplicada       = $s->getTasaAplicada();
        $dto->monto_bruto         = $s->getMontoBruto();
        $dto->monto_descontado    = $s->getMontoDescontado();
        $dto->monto_neto          = $s->getMontoNeto();
        $dto->estado              = $s->getEstado();
        $dto->tipo_aprobacion     = $s->getTipoAprobacion();
        $dto->fecha_solicitud     = $s->getFechaSolicitud()->format('Y-m-d\TH:i:s\Z');
        $dto->fecha_aprobacion    = $s->getFechaAprobacion()?->format('Y-m-d\TH:i:s\Z');
        $dto->fecha_pago          = $s->getFechaPago()?->format('Y-m-d\TH:i:s\Z');
        $dto->motivo_rechazo      = $s->getMotivoRechazo();
        $dto->aprobado_por        = $s->getAprobadoPor();
        $dto->comprobante_pago_url = $s->getComprobantePagoUrl();
        $dto->consentimiento_ip   = $s->getConsentimientoIp();
        $dto->consentimiento_fecha = $s->getConsentimientoFecha()->format('Y-m-d\TH:i:s\Z');
        return $dto;
    }
}
