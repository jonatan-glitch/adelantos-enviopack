<?php

namespace App\Response;

use App\Entity\Proforma;

class ProformaResponse
{
    public int $id;
    public array $chofer;
    public string $periodo;
    public float $monto;
    public float $tasa_aplicada;
    public string $fecha_vencimiento;
    public ?string $descripcion;
    public ?string $documento_url;
    public string $estado;
    public string $created_at;

    public static function fromEntity(Proforma $p): self
    {
        $dto = new self();
        $dto->id                = $p->getId();
        $dto->chofer            = ['id' => $p->getChofer()->getId(), 'nombre' => $p->getChofer()->getNombre(), 'apellido' => $p->getChofer()->getApellido(), 'dni' => $p->getChofer()->getDni()];
        $dto->periodo           = $p->getPeriodo();
        $dto->monto             = $p->getMonto();
        $dto->tasa_aplicada     = $p->getTasaAplicada();
        $dto->fecha_vencimiento = $p->getFechaVencimiento()->format('Y-m-d');
        $dto->descripcion       = $p->getDescripcion();
        $dto->documento_url     = $p->getDocumentoUrl();
        $dto->estado            = $p->getEstado();
        $dto->created_at        = $p->getCreatedAt()->format('Y-m-d\TH:i:s\Z');
        return $dto;
    }
}
