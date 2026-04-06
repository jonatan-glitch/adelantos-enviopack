<?php

namespace App\Entity;

use App\Repository\InvitacionUsuarioRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: InvitacionUsuarioRepository::class)]
#[ORM\Table(name: 'invitacion_usuario')]
class InvitacionUsuario
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 180)]
    private string $email;

    #[ORM\Column(length: 64, unique: true)]
    private string $token;

    #[ORM\Column(length: 40)]
    private string $rol;

    #[ORM\Column]
    private \DateTimeImmutable $expira_en;

    #[ORM\Column]
    private bool $usado = false;

    #[ORM\Column(length: 200, nullable: true)]
    private ?string $invitado_por = null;

    #[ORM\Column]
    private \DateTimeImmutable $created_at;

    public function __construct()
    {
        $this->created_at = new \DateTimeImmutable();
        $this->expira_en  = new \DateTimeImmutable('+48 hours');
        $this->token      = bin2hex(random_bytes(32));
    }

    public function getId(): ?int { return $this->id; }
    public function getEmail(): string { return $this->email; }
    public function setEmail(string $email): static { $this->email = $email; return $this; }
    public function getToken(): string { return $this->token; }
    public function getRol(): string { return $this->rol; }
    public function setRol(string $rol): static { $this->rol = $rol; return $this; }
    public function getExpiraEn(): \DateTimeImmutable { return $this->expira_en; }
    public function isUsado(): bool { return $this->usado; }
    public function setUsado(bool $usado): static { $this->usado = $usado; return $this; }
    public function getInvitadoPor(): ?string { return $this->invitado_por; }
    public function setInvitadoPor(?string $invitado_por): static { $this->invitado_por = $invitado_por; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->created_at; }
    public function isVigente(): bool { return !$this->usado && $this->expira_en > new \DateTimeImmutable(); }
}
