<?php

namespace App\Command;

use App\Constant\RolConstant;
use App\Entity\ConfiguracionSistema;
use App\Entity\Usuario;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[AsCommand(name: 'app:create-admin', description: 'Seed admin user and default config')]
class CreateAdminCommand extends Command
{
    public function __construct(
        private EntityManagerInterface $em,
        private UserPasswordHasherInterface $hasher,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $repo = $this->em->getRepository(Usuario::class);

        if ($repo->findOneBy(['email' => 'admin@enviopack.com'])) {
            $output->writeln('Admin already exists, skipping.');
            return Command::SUCCESS;
        }

        $admin = new Usuario();
        $admin->setEmail('admin@enviopack.com');
        $admin->setNombre('Admin');
        $admin->setApellido('Enviopack');
        $admin->setRoles([RolConstant::ROLE_ENVIOPACK_ADMIN]);
        $admin->setContrasena($this->hasher->hashPassword($admin, 'adelantos2024'));
        $this->em->persist($admin);

        $configRepo = $this->em->getRepository(ConfiguracionSistema::class);
        if (!$configRepo->findOneBy([])) {
            $config = new ConfiguracionSistema();
            $config->setTasaGlobal(3.0);
            $config->setDiasCobroNormal(30);
            $config->setPlazoAcreditacionHoras(48);
            $config->setEmailsNotificacionAdmin(['admin@enviopack.com']);
            $this->em->persist($config);
        }

        $this->em->flush();
        $output->writeln('Admin created: admin@enviopack.com / adelantos2024');

        return Command::SUCCESS;
    }
}
