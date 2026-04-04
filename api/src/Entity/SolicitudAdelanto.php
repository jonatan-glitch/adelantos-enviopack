<?php

namespace App\Entity;

use App\Repository\SolicitudAdelantoRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: SolicitudAdelantoRepository::class)]
#[ORM\Table(name: 'solicitud_adelanto')]
class SolicitudAdelanto
{
    public const ESTADO_EN_REVISION = 'en_revision';
    public const ESTADO_APROBADA    = 'aprobada';
    public const ESTADO_RECHAZADA   = 'rechazada';
    public const ESTADO_PAGADA      = 'pagada';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\OneToOne(targetEntity: Factura::class)]
    #[ORM\JoinColumn(nullable: false)]
    private Factura $factura;

    #[ORM\ManyToOne(targetEntity: Chofer::class)]
    #[ORM\JoinColumn(nullable: false)]
    private Chofer $chofer;

    #[ORM\Column(type: 'decimal', precision: 5, scale: 2)]
    private float $tasa_aplicada;

    #[ORM\Column(type: 'decimal', precision: 12, scale: 2)]
    private float $monto_bruto;

    #[ORM\Column(type: 'decimal', precision: 12, scale: 2)]
    private float $monto_descontado;

    #[ORM\Column(type: 'decimal', precision: 12, scale: 2)]
    private float $monto_neto;

    #[ORM\Column(length: 20)]
    private string $estado = self::ESTADO_EN_REVISION;

    #[ORM\Column(length: 20, nullable: true)]
    private ?string $tipo_aprobacion = null;

    #[ORM\Column]
    private \DateTimeImmutable $fecha_solicitud;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $fecha_aprobacion = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $fecha_pago = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $motivo_rechazo = null;

    #[ORM\Column(length: 200, nullable: true)]
    private ?string $aprobado_por = null;

    #[ORM\Column(length: 500, nullable: true)]
    private ?string $comprobante_pago_url = null;

    #[ORM\Column(length: 50)]
    private string $consentimiento_ip;

    #[ORM\Column]
    private \DateTimeImmutable $consentimiento_fecha;

    #[ORM\Column]
    private \DateTimeImmutable $created_at;

    public function __construct()
    {
        $this->created_at          = new \DateTimeImmutable();
        $this->fecha_solicitud     = new \DateTimeImmutable();
        $this->consentimiento_fecha = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getFactura(): Factura { return $this->factura; }
    public function setFactura(Factura $factura): static { $this->factura = $factura; return $this; }
    public function getChofer(): Chofer { return $this->chofer; }
    public function setChofer(Chofer $chofer): static { $this->chofer = $chofer; return $this; }
    public function getTasaAplicada(): float { return (float)$this->tasa_aplicada; }
    public function setTasaAplicada(float $t): static { $this->tasa_aplicada = $t; return $this; }
    public function getMontoBruto(): float { return (float)$this->monto_bruto; }
    public function setMontoBruto(float $m): static { $this->monto_bruto = $m; return $this; }
    public function getMontoDescontado(): float { return (float)$this->monto_descontado; }
    public function setMontoDescontado(float $m): static { $this->monto_descontado = $m; return $this; }
    public function getMontoNeto(): float { return (float)$this->monto_neto; }
    public function setMontoNeto(float $m): static { $this->monto_neto = $m; return $this; }
    public function getEstado(): string { return $this->estado; }
    public function setEstado(string $estado): static { $this->estado = $estado; return $this; }
    public function getTipoAprobacion(): ?string { return $this->tipo_aprobacion; }
    public function setTipoAprobacion(?string $tipo): static { $this->tipo_aprobacion = $tipo; return $this; }
    public function getFechaSolicitud(): \DateTimeImmutable { return $this->fecha_solicitud; }
    public function getFechaAprobacion(): ?\DateTimeImmutable { return $this->fecha_aprobacion; }
    public function setFechaAprobacion(?\DateTimeImmutable $f): static { $this->fecha_aprobacion = $f; return $this; }
    public function getFechaPago(): ?\DateTimeImmutable { return $this->fecha_pago; }
    public function setFechaPago(?\DateTimeImmutable $f): static { $this->fecha_pago = $f; return $this; }
    public function getMotivoRechazo(): ?string { return $this->motivo_rechazo; }
    public function setMotivoRechazo(?string $motivo): static { $this->motivo_rechazo = $motivo; return $this; }
    public function getAprobadoPor(): ?string { return $this->aprobado_por; }
    public function setAprobadoPor(?string $ap): static { $this->aprobado_por = $ap; return $this; }
    public function getComprobantePagoUrl(): ?string { return $this->comprobante_pago_url; }
    public function setComprobantePagoUrl(?string $url): static { $this->comprobante_pago_url = $url; return $this; }
    public function getConsentimientoIp(): string { return $this->consentimiento_ip; }
    public function setConsentimientoIp(string $ip): static { $this->consentimiento_ip = $ip; return $this; }
    public function getConsentimientoFecha(): \DateTimeImmutable { return $this->consentimiento_fecha; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->created_at; }
}
