<?php

namespace App\Response;

use App\Entity\Chofer;

class ChoferResponse
{
    public int $id;
    public string $nombre;
    public string $apellido;
    public string $dni;
    public string $cuil;
    public string $email;
    public ?string $telefono;
    public bool $habilitado;
    public ?float $tasa_personal;
    public bool $tiene_deuda;
    public string $created_at;

    public static function fromEntity(Chofer $c): self
    {
        $dto = new self();
        $dto->id            = $c->getId();
        $dto->nombre        = $c->getNombre();
        $dto->apellido      = $c->getApellido();
        $dto->dni           = $c->getDni();
        $dto->cuil          = $c->getCuil();
        $dto->email         = $c->getEmail();
        $dto->telefono      = $c->getTelefono();
        $dto->habilitado    = $c->isHabilitado();
        $dto->tasa_personal = $c->getTasaPersonal();
        $dto->tiene_deuda   = $c->isTieneDeuda();
        $dto->created_at    = $c->getCreatedAt()->format('Y-m-d\TH:i:s\Z');
        return $dto;
    }
}
