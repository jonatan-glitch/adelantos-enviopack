<?php

namespace App\Entity;

use App\Repository\ConfiguracionSistemaRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ConfiguracionSistemaRepository::class)]
#[ORM\Table(name: 'configuracion_sistema')]
class ConfiguracionSistema
{
    #[ORM\Id]
    #[ORM\Column]
    private int $id = 1;

    #[ORM\Column(type: 'decimal', precision: 5, scale: 2)]
    private float $tasa_global = 3.0;

    #[ORM\Column]
    private int $dias_cobro_normal = 30;

    #[ORM\Column]
    private int $plazo_acreditacion_horas = 48;

    #[ORM\Column(type: 'json')]
    private array $emails_notificacion_admin = [];

    public function getId(): int { return $this->id; }
    public function getTasaGlobal(): float { return (float)$this->tasa_global; }
    public function setTasaGlobal(float $tasa): static { $this->tasa_global = $tasa; return $this; }
    public function getDiasCobroNormal(): int { return $this->dias_cobro_normal; }
    public function setDiasCobroNormal(int $dias): static { $this->dias_cobro_normal = $dias; return $this; }
    public function getPlazoAcreditacionHoras(): int { return $this->plazo_acreditacion_horas; }
    public function setPlazoAcreditacionHoras(int $horas): static { $this->plazo_acreditacion_horas = $horas; return $this; }
    public function getEmailsNotificacionAdmin(): array { return $this->emails_notificacion_admin; }
    public function setEmailsNotificacionAdmin(array $emails): static { $this->emails_notificacion_admin = $emails; return $this; }
}
