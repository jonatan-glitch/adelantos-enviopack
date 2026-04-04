<?php

namespace App\Entity;

use App\Repository\RefreshTokenRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: RefreshTokenRepository::class)]
#[ORM\Table(name: 'refresh_token')]
class RefreshToken
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private int $id;

    /** 64-char random hex string */
    #[ORM\Column(length: 128, unique: true)]
    private string $token;

    /** Mirrors the id_sesion embedded in the JWT so we can correlate sessions */
    #[ORM\Column]
    private int $sessionId;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Usuario $usuario;

    #[ORM\Column]
    private \DateTimeImmutable $expiresAt;

    #[ORM\Column]
    private bool $used = false;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function getId(): int { return $this->id; }

    public function getToken(): string { return $this->token; }
    public function setToken(string $token): static { $this->token = $token; return $this; }

    public function getSessionId(): int { return $this->sessionId; }
    public function setSessionId(int $sessionId): static { $this->sessionId = $sessionId; return $this; }

    public function getUsuario(): Usuario { return $this->usuario; }
    public function setUsuario(Usuario $usuario): static { $this->usuario = $usuario; return $this; }

    public function getExpiresAt(): \DateTimeImmutable { return $this->expiresAt; }
    public function setExpiresAt(\DateTimeImmutable $expiresAt): static { $this->expiresAt = $expiresAt; return $this; }

    public function isUsed(): bool { return $this->used; }
    public function setUsed(bool $used): static { $this->used = $used; return $this; }

    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
    public function setCreatedAt(\DateTimeImmutable $createdAt): static { $this->createdAt = $createdAt; return $this; }

    public function isValid(): bool
    {
        return !$this->used && $this->expiresAt > new \DateTimeImmutable();
    }
}
