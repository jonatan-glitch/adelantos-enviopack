<?php

namespace App\Service;

use App\Entity\Chofer;
use App\Entity\DisponibilidadDiaria;
use App\Repository\ChoferRepository;
use App\Repository\DisponibilidadDiariaRepository;
use Doctrine\ORM\EntityManagerInterface;

class DisponibilidadService
{
    private const DESTINATARIOS = [
        'jonatan@enviopack.com',
    ];

    public function __construct(
        private EntityManagerInterface $em,
        private DisponibilidadDiariaRepository $repo,
        private ChoferRepository $choferRepo,
        private EmailService $emailService,
    ) {}

    public function obtenerPorFecha(string $fecha): ?DisponibilidadDiaria
    {
        return $this->repo->findOneBy(['fecha' => new \DateTime($fecha)]);
    }

    public function guardar(string $fecha, array $choferesIds, array $choferesManuales): DisponibilidadDiaria
    {
        $dateObj = new \DateTime($fecha);
        $disp = $this->repo->findOneBy(['fecha' => $dateObj]);

        if (!$disp) {
            $disp = new DisponibilidadDiaria();
            $disp->setFecha($dateObj);
            $this->em->persist($disp);
        }

        $disp->setChoferesIds(array_map('intval', $choferesIds));
        $disp->setChoferesManuales(array_values(array_filter(array_map('trim', $choferesManuales))));
        $disp->setUpdatedAt(new \DateTimeImmutable());

        $this->em->flush();

        return $disp;
    }

    public function enviarEmail(DisponibilidadDiaria $disp): bool
    {
        $depositos = $this->resolverDepositos($disp);

        if (empty($depositos)) {
            error_log('[DisponibilidadService] No hay choferes disponibles para enviar');
            return false;
        }

        $fechaLabel = $disp->getFecha()->format('d/m/Y');
        $ok = $this->emailService->sendDisponibilidadChoferes(self::DESTINATARIOS, $fechaLabel, $depositos);

        if ($ok) {
            $disp->setEnviado(true);
            $disp->setEnviadoAt(new \DateTimeImmutable());
            $disp->setUpdatedAt(new \DateTimeImmutable());
            $this->em->flush();
        }

        return $ok;
    }

    /**
     * @return array<string, string[]> deposito => patentes/nombres
     */
    private function resolverDepositos(DisponibilidadDiaria $disp): array
    {
        $depositos = [];
        $manuales = $disp->getChoferesManuales();

        // If choferes_manuales is associative (deposito => patentes[]), use directly
        if (!empty($manuales) && !array_is_list($manuales)) {
            return $manuales;
        }

        // If choferes from system
        if (!empty($disp->getChoferesIds())) {
            $choferes = $this->em->createQueryBuilder()
                ->select('c')
                ->from(Chofer::class, 'c')
                ->join('c.usuario', 'u')
                ->where('c.id IN (:ids)')
                ->andWhere('c.eliminado = false')
                ->setParameter('ids', $disp->getChoferesIds())
                ->orderBy('LOWER(u.nombre)', 'ASC')
                ->getQuery()
                ->getResult();

            $general = [];
            foreach ($choferes as $c) {
                $general[] = $c->getNombre() . ' ' . $c->getApellido();
            }
            if (!empty($general)) {
                $depositos['Choferes del sistema'] = $general;
            }
        }

        // Flat list of manual names (legacy format)
        if (!empty($manuales) && array_is_list($manuales)) {
            $depositos['Choferes adicionales'] = $manuales;
        }

        return $depositos;
    }
}
