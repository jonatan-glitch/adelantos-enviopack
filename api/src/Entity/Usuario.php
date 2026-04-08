<?php

namespace App\Entity;

use App\Repository\UsuarioRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;

#[ORM\Entity(repositoryClass: UsuarioRepository::class)]
#[ORM\Table(name: 'usuario')]
class Usuario implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 180, unique: true)]
    private string $email;

    #[ORM\Column(length: 100)]
    private string $nombre;

    #[ORM\Column(length: 100)]
    private string $apellido;

    #[ORM\Column(type: 'json')]
    private array $roles = [];

    #[ORM\Column]
    private string $contrasena;

    #[ORM\Column]
    private bool $habilitado = true;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $ultima_conexion = null;

    #[ORM\Column]
    private bool $eliminado = false;

    #[ORM\Column]
    private \DateTimeImmutable $created_at;

    public function __construct()
    {
        $this->created_at = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getEmail(): string { return $this->email; }
    public function setEmail(string $email): static { $this->email = $email; return $this; }
    public function getNombre(): string { return $this->nombre; }
    public function setNombre(string $nombre): static { $this->nombre = self::capitalizeName(trim($nombre)); return $this; }
    public function getApellido(): string { return $this->apellido; }
    public function setApellido(string $apellido): static { $this->apellido = self::capitalizeName(trim($apellido)); return $this; }

    private static function capitalizeName(string $value): string
    {
        return mb_convert_case(mb_strtolower($value, 'UTF-8'), MB_CASE_TITLE, 'UTF-8');
    }

    private static function looksLikeEmail(string $value): bool
    {
        return (bool) filter_var($value, FILTER_VALIDATE_EMAIL);
    }
    public function getRoles(): array { $roles = $this->roles; $roles[] = 'ROLE_USER'; return array_unique($roles); }
    public function setRoles(array $roles): static { $this->roles = $roles; return $this; }
    public function getPassword(): string { return $this->contrasena; }
    public function getContrasena(): string { return $this->contrasena; }
    public function setContrasena(string $contrasena): static { $this->contrasena = $contrasena; return $this; }
    public function isHabilitado(): bool { return $this->habilitado; }
    public function setHabilitado(bool $habilitado): static { $this->habilitado = $habilitado; return $this; }
    public function getUltimaConexion(): ?\DateTimeImmutable { return $this->ultima_conexion; }
    public function setUltimaConexion(?\DateTimeImmutable $dt): static { $this->ultima_conexion = $dt; return $this; }
    public function isEliminado(): bool { return $this->eliminado; }
    public function setEliminado(bool $eliminado): static { $this->eliminado = $eliminado; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->created_at; }
    public function getUserIdentifier(): string { return $this->email; }
    public function eraseCredentials(): void {}
}
