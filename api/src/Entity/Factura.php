<?php

namespace App\Entity;

use App\Repository\FacturaRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: FacturaRepository::class)]
#[ORM\Table(name: 'factura')]
class Factura
{
    public const ESTADO_PENDIENTE_COBRO            = 'pendiente_cobro';
    public const ESTADO_CON_ADELANTO_SOLICITADO    = 'con_adelanto_solicitado';
    public const ESTADO_ADELANTO_APROBADO          = 'adelanto_aprobado';
    public const ESTADO_ADELANTO_PAGADO            = 'adelanto_pagado';
    public const ESTADO_ADELANTO_RECHAZADO         = 'adelanto_rechazado';
    public const ESTADO_COBRO_NORMAL               = 'cobro_normal';
    public const ESTADO_PAGADA_COBRO_NORMAL        = 'pagada_cobro_normal';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Chofer::class)]
    #[ORM\JoinColumn(nullable: false)]
    private Chofer $chofer;

    #[ORM\ManyToOne(targetEntity: Proforma::class)]
    #[ORM\JoinColumn(nullable: true)]
    private ?Proforma $proforma = null;

    #[ORM\Column(length: 30)]
    private string $numero_factura;

    #[ORM\Column(type: 'decimal', precision: 12, scale: 2)]
    private float $monto_bruto;

    #[ORM\Column(type: 'decimal', precision: 12, scale: 2, nullable: true)]
    private ?float $monto_nota_credito = null;

    #[ORM\Column(type: 'decimal', precision: 12, scale: 2)]
    private float $monto_neto;

    #[ORM\Column(type: 'date_immutable')]
    private \DateTimeImmutable $fecha_emision;

    #[ORM\Column(type: 'date_immutable')]
    private \DateTimeImmutable $fecha_cobro_estimada;

    #[ORM\Column(length: 40)]
    private string $estado = self::ESTADO_PENDIENTE_COBRO;

    #[ORM\Column(length: 10)]
    private string $opcion_cobro = 'normal';

    #[ORM\Column(length: 500, nullable: true)]
    private ?string $archivo_factura_url = null;

    #[ORM\Column(length: 500, nullable: true)]
    private ?string $archivo_nota_credito_url = null;

    #[ORM\Column(length: 500, nullable: true)]
    private ?string $comprobante_pago_url = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $fecha_pago = null;

    #[ORM\Column]
    private bool $eliminado = false;

    #[ORM\Column]
    private \DateTimeImmutable $created_at;

    public function __construct()
    {
        $this->created_at = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getChofer(): Chofer { return $this->chofer; }
    public function setChofer(Chofer $chofer): static { $this->chofer = $chofer; return $this; }
    public function getProforma(): ?Proforma { return $this->proforma; }
    public function setProforma(?Proforma $proforma): static { $this->proforma = $proforma; return $this; }
    public function getNumeroFactura(): string { return $this->numero_factura; }
    public function setNumeroFactura(string $n): static { $this->numero_factura = $n; return $this; }
    public function getMontoBruto(): float { return (float)$this->monto_bruto; }
    public function setMontoBruto(float $m): static { $this->monto_bruto = $m; return $this; }
    public function getMontoNotaCredito(): ?float { return $this->monto_nota_credito !== null ? (float)$this->monto_nota_credito : null; }
    public function setMontoNotaCredito(?float $m): static { $this->monto_nota_credito = $m; return $this; }
    public function getMontoNeto(): float { return (float)$this->monto_neto; }
    public function setMontoNeto(float $m): static { $this->monto_neto = $m; return $this; }
    public function getFechaEmision(): \DateTimeImmutable { return $this->fecha_emision; }
    public function setFechaEmision(\DateTimeImmutable $f): static { $this->fecha_emision = $f; return $this; }
    public function getFechaCobroEstimada(): \DateTimeImmutable { return $this->fecha_cobro_estimada; }
    public function setFechaCobroEstimada(\DateTimeImmutable $f): static { $this->fecha_cobro_estimada = $f; return $this; }
    public function getEstado(): string { return $this->estado; }
    public function setEstado(string $estado): static { $this->estado = $estado; return $this; }
    public function getOpcionCobro(): string { return $this->opcion_cobro; }
    public function setOpcionCobro(string $opcion): static { $this->opcion_cobro = $opcion; return $this; }
    public function getArchivoFacturaUrl(): ?string { return $this->archivo_factura_url; }
    public function setArchivoFacturaUrl(?string $url): static { $this->archivo_factura_url = $url; return $this; }
    public function getArchivoNotaCreditoUrl(): ?string { return $this->archivo_nota_credito_url; }
    public function setArchivoNotaCreditoUrl(?string $url): static { $this->archivo_nota_credito_url = $url; return $this; }
    public function getComprobantePagoUrl(): ?string { return $this->comprobante_pago_url; }
    public function setComprobantePagoUrl(?string $url): static { $this->comprobante_pago_url = $url; return $this; }
    public function getFechaPago(): ?\DateTimeImmutable { return $this->fecha_pago; }
    public function setFechaPago(?\DateTimeImmutable $f): static { $this->fecha_pago = $f; return $this; }
    public function isEliminado(): bool { return $this->eliminado; }
    public function setEliminado(bool $eliminado): static { $this->eliminado = $eliminado; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->created_at; }
}
