<?php

namespace App\Entity;

use App\Repository\ChoferRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ChoferRepository::class)]
#[ORM\Table(name: 'chofer')]
class Chofer
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\OneToOne(targetEntity: Usuario::class, cascade: ['persist'])]
    #[ORM\JoinColumn(nullable: false)]
    private Usuario $usuario;

    #[ORM\Column(length: 20)]
    private string $dni;

    #[ORM\Column(length: 25)]
    private string $cuil;

    #[ORM\Column(length: 30, nullable: true)]
    private ?string $telefono = null;

    #[ORM\Column(type: 'decimal', precision: 5, scale: 2, nullable: true)]
    private ?float $tasa_personal = null;

    #[ORM\Column]
    private bool $tiene_deuda = false;

    #[ORM\Column]
    private bool $eliminado = false;

    #[ORM\Column]
    private \DateTimeImmutable $created_at;

    public function __construct()
    {
        $this->created_at = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getUsuario(): Usuario { return $this->usuario; }
    public function setUsuario(Usuario $usuario): static { $this->usuario = $usuario; return $this; }
    public function getDni(): string { return $this->dni; }
    public function setDni(string $dni): static { $this->dni = $dni; return $this; }
    public function getCuil(): string { return $this->cuil; }
    public function setCuil(string $cuil): static { $this->cuil = $cuil; return $this; }
    public function getTelefono(): ?string { return $this->telefono; }
    public function setTelefono(?string $telefono): static { $this->telefono = $telefono; return $this; }
    public function getTasaPersonal(): ?float { return $this->tasa_personal !== null ? (float)$this->tasa_personal : null; }
    public function setTasaPersonal(?float $tasa): static { $this->tasa_personal = $tasa; return $this; }
    public function isTieneDeuda(): bool { return $this->tiene_deuda; }
    public function setTieneDeuda(bool $tiene_deuda): static { $this->tiene_deuda = $tiene_deuda; return $this; }
    public function isEliminado(): bool { return $this->eliminado; }
    public function setEliminado(bool $eliminado): static { $this->eliminado = $eliminado; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->created_at; }

    // Shortcuts a Usuario
    public function getNombre(): string { return $this->usuario->getNombre(); }
    public function getApellido(): string { return $this->usuario->getApellido(); }
    public function getEmail(): string { return $this->usuario->getEmail(); }
    public function isHabilitado(): bool { return $this->usuario->isHabilitado(); }
}
