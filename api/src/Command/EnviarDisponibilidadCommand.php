<?php

namespace App\Command;

use App\Service\DisponibilidadService;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(name: 'app:enviar-disponibilidad', description: 'Envía email con choferes disponibles para mañana (L-V 16hs)')]
class EnviarDisponibilidadCommand extends Command
{
    public function __construct(
        private DisponibilidadService $service,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $manana = (new \DateTime('tomorrow'))->format('Y-m-d');
        $output->writeln("Buscando disponibilidad para {$manana}...");

        $disp = $this->service->obtenerPorFecha($manana);

        if (!$disp) {
            $output->writeln('<comment>No hay disponibilidad cargada para mañana. No se envía email.</comment>');
            return Command::SUCCESS;
        }

        if ($disp->isEnviado()) {
            $output->writeln('<comment>El email ya fue enviado para esta fecha. Reenviando...</comment>');
        }

        $ok = $this->service->enviarEmail($disp);

        if ($ok) {
            $output->writeln('<info>Email enviado correctamente.</info>');
            return Command::SUCCESS;
        }

        $output->writeln('<error>Error al enviar el email.</error>');
        return Command::FAILURE;
    }
}
