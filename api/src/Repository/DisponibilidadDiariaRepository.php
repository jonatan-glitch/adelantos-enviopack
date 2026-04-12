<?php

namespace App\Repository;

use App\Entity\DisponibilidadDiaria;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class DisponibilidadDiariaRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, DisponibilidadDiaria::class);
    }
}
