<?php

namespace App\DataFixtures;

use App\Constant\RolConstant;
use App\Entity\ConfiguracionSistema;
use App\Entity\Usuario;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class AppFixtures extends Fixture
{
    public function __construct(private UserPasswordHasherInterface $hasher) {}

    public function load(ObjectManager $manager): void
    {
        // Admin principal
        $admin = new Usuario();
        $admin->setEmail('admin@enviopack.com');
        $admin->setNombre('Admin');
        $admin->setApellido('Enviopack');
        $admin->setRoles([RolConstant::ROLE_ENVIOPACK_ADMIN]);
        $admin->setContrasena($this->hasher->hashPassword($admin, 'adelantos2024'));
        $manager->persist($admin);

        // Configuración por defecto
        $config = new ConfiguracionSistema();
        $config->setTasaGlobal(3.0);
        $config->setDiasCobroNormal(30);
        $config->setPlazoAcreditacionHoras(48);
        $config->setEmailsNotificacionAdmin(['admin@enviopack.com']);
        $manager->persist($config);

        $manager->flush();
    }
}
