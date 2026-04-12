<?php

namespace App\Entity;

use App\Repository\DisponibilidadDiariaRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: DisponibilidadDiariaRepository::class)]
#[ORM\Table(name: 'disponibilidad_diaria')]
#[ORM\UniqueConstraint(name: 'uq_disponibilidad_fecha', columns: ['fecha'])]
class DisponibilidadDiaria
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(type: 'date')]
    private \DateTimeInterface $fecha;

    #[ORM\Column(type: 'json')]
    private array $choferes_ids = [];

    #[ORM\Column(type: 'json')]
    private array $choferes_manuales = [];

    #[ORM\Column]
    private bool $enviado = false;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $enviado_at = null;

    #[ORM\Column]
    private \DateTimeImmutable $created_at;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $updated_at;

    public function __construct()
    {
        $this->created_at = new \DateTimeImmutable();
        $this->updated_at = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getFecha(): \DateTimeInterface { return $this->fecha; }
    public function setFecha(\DateTimeInterface $fecha): static { $this->fecha = $fecha; return $this; }
    public function getChoferesIds(): array { return $this->choferes_ids; }
    public function setChoferesIds(array $ids): static { $this->choferes_ids = $ids; return $this; }
    public function getChoferesManuales(): array { return $this->choferes_manuales; }
    public function setChoferesManuales(array $nombres): static { $this->choferes_manuales = $nombres; return $this; }
    public function isEnviado(): bool { return $this->enviado; }
    public function setEnviado(bool $enviado): static { $this->enviado = $enviado; return $this; }
    public function getEnviadoAt(): ?\DateTimeImmutable { return $this->enviado_at; }
    public function setEnviadoAt(?\DateTimeImmutable $at): static { $this->enviado_at = $at; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->created_at; }
    public function getUpdatedAt(): \DateTimeImmutable { return $this->updated_at; }
    public function setUpdatedAt(\DateTimeImmutable $at): static { $this->updated_at = $at; return $this; }
}
