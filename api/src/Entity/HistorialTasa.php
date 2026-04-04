<?php

namespace App\Entity;

use App\Repository\HistorialTasaRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: HistorialTasaRepository::class)]
#[ORM\Table(name: 'historial_tasa')]
class HistorialTasa
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Chofer::class)]
    #[ORM\JoinColumn(nullable: true)]
    private ?Chofer $chofer = null;

    #[ORM\Column(type: 'decimal', precision: 5, scale: 2)]
    private float $tasa;

    #[ORM\Column(length: 20)]
    private string $tipo;

    #[ORM\Column]
    private \DateTimeImmutable $fecha_vigencia;

    #[ORM\Column(length: 200)]
    private string $usuario_responsable;

    #[ORM\Column]
    private \DateTimeImmutable $created_at;

    public function __construct()
    {
        $this->created_at    = new \DateTimeImmutable();
        $this->fecha_vigencia = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getChofer(): ?Chofer { return $this->chofer; }
    public function setChofer(?Chofer $chofer): static { $this->chofer = $chofer; return $this; }
    public function getTasa(): float { return (float)$this->tasa; }
    public function setTasa(float $tasa): static { $this->tasa = $tasa; return $this; }
    public function getTipo(): string { return $this->tipo; }
    public function setTipo(string $tipo): static { $this->tipo = $tipo; return $this; }
    public function getFechaVigencia(): \DateTimeImmutable { return $this->fecha_vigencia; }
    public function setFechaVigencia(\DateTimeImmutable $f): static { $this->fecha_vigencia = $f; return $this; }
    public function getUsuarioResponsable(): string { return $this->usuario_responsable; }
    public function setUsuarioResponsable(string $u): static { $this->usuario_responsable = $u; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->created_at; }
}
