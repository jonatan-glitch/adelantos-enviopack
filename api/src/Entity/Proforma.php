<?php

namespace App\Entity;

use App\Repository\ProformaRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ProformaRepository::class)]
#[ORM\Table(name: 'proforma')]
class Proforma
{
    public const ESTADO_PENDIENTE = 'pendiente';
    public const ESTADO_FACTURADA = 'facturada';
    public const ESTADO_VENCIDA   = 'vencida';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Chofer::class)]
    #[ORM\JoinColumn(nullable: false)]
    private Chofer $chofer;

    #[ORM\Column(length: 20)]
    private string $periodo;

    #[ORM\Column(type: 'decimal', precision: 12, scale: 2)]
    private float $monto;

    #[ORM\Column(type: 'decimal', precision: 5, scale: 2)]
    private float $tasa_aplicada;

    #[ORM\Column(type: 'date_immutable')]
    private \DateTimeImmutable $fecha_vencimiento;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $descripcion = null;

    #[ORM\Column(length: 20)]
    private string $estado = self::ESTADO_PENDIENTE;

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
    public function getPeriodo(): string { return $this->periodo; }
    public function setPeriodo(string $periodo): static { $this->periodo = $periodo; return $this; }
    public function getMonto(): float { return (float)$this->monto; }
    public function setMonto(float $monto): static { $this->monto = $monto; return $this; }
    public function getTasaAplicada(): float { return (float)$this->tasa_aplicada; }
    public function setTasaAplicada(float $tasa): static { $this->tasa_aplicada = $tasa; return $this; }
    public function getFechaVencimiento(): \DateTimeImmutable { return $this->fecha_vencimiento; }
    public function setFechaVencimiento(\DateTimeImmutable $fecha): static { $this->fecha_vencimiento = $fecha; return $this; }
    public function getDescripcion(): ?string { return $this->descripcion; }
    public function setDescripcion(?string $descripcion): static { $this->descripcion = $descripcion; return $this; }
    public function getEstado(): string { return $this->estado; }
    public function setEstado(string $estado): static { $this->estado = $estado; return $this; }
    public function isEliminado(): bool { return $this->eliminado; }
    public function setEliminado(bool $eliminado): static { $this->eliminado = $eliminado; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->created_at; }
}
