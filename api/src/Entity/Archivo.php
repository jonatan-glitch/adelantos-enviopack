<?php

namespace App\Entity;

use App\Repository\ArchivoRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ArchivoRepository::class)]
#[ORM\Table(name: 'archivo')]
class Archivo
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private string $nombre;

    #[ORM\Column(length: 100)]
    private string $mime_type;

    #[ORM\Column(type: 'blob')]
    private $contenido;

    #[ORM\Column]
    private \DateTimeImmutable $created_at;

    public function __construct()
    {
        $this->created_at = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getNombre(): string { return $this->nombre; }
    public function setNombre(string $nombre): static { $this->nombre = $nombre; return $this; }
    public function getMimeType(): string { return $this->mime_type; }
    public function setMimeType(string $mime_type): static { $this->mime_type = $mime_type; return $this; }
    public function getContenido() { return $this->contenido; }
    public function setContenido($contenido): static { $this->contenido = $contenido; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->created_at; }
}
