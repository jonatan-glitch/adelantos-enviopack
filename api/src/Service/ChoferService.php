<?php

namespace App\Service;

use App\Constant\RolConstant;
use App\Entity\Chofer;
use App\Entity\InvitacionChofer;
use App\Entity\Usuario;
use App\Exception\DomainException;
use App\Repository\ChoferRepository;
use App\Repository\InvitacionChoferRepository;
use App\Repository\UsuarioRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class ChoferService
{
    public function __construct(
        private EntityManagerInterface      $em,
        private ChoferRepository            $choferRepo,
        private UsuarioRepository           $usuarioRepo,
        private InvitacionChoferRepository  $invitacionRepo,
        private UserPasswordHasherInterface $hasher,
        private EmailService                $emailService,
    ) {}

    public function invitar(string $email): array
    {
        // Verificar que no exista ya un usuario con ese email
        if ($this->usuarioRepo->findOneBy(['email' => $email, 'eliminado' => false])) {
            throw new DomainException('Ya existe un usuario registrado con ese email.');
        }

        // Invalidar invitaciones previas no usadas
        $previas = $this->invitacionRepo->findBy(['email' => $email, 'usado' => false]);
        foreach ($previas as $previa) {
            $previa->setUsado(true);
        }

        $invitacion = new InvitacionChofer();
        $invitacion->setEmail($email);
        $this->em->persist($invitacion);
        $this->em->flush();

        $emailSent = $this->emailService->sendInvitacion($email, $invitacion->getToken());

        return ['invitacion' => $invitacion, 'email_sent' => $emailSent];
    }

    public function importar(array $choferes): int
    {
        $creados = 0;
        foreach ($choferes as $data) {
            $email = strtolower(trim($data['email']));
            if ($this->usuarioRepo->findOneBy(['email' => $email])) {
                continue; // Skip duplicados
            }
            $this->crearChoferDesdeData($data);
            $creados++;
        }
        $this->em->flush();
        return $creados;
    }

    public function completarRegistro(InvitacionChofer $invitacion, array $data): Chofer
    {
        if (!$invitacion->isVigente()) {
            throw new DomainException('La invitación expiró o ya fue utilizada.');
        }

        $usuario = new Usuario();
        $usuario->setEmail($invitacion->getEmail());
        $usuario->setNombre($data['nombre']);
        $usuario->setApellido($data['apellido']);
        $usuario->setRoles([RolConstant::ROLE_CONDUCTOR]);
        $usuario->setContrasena($this->hasher->hashPassword($usuario, $data['contrasena']));

        $chofer = new Chofer();
        $chofer->setUsuario($usuario);
        $chofer->setDni($data['dni']);
        $chofer->setCuil($data['cuil']);
        $chofer->setTelefono($data['telefono'] ?? null);

        $invitacion->setUsado(true);

        $this->em->persist($usuario);
        $this->em->persist($chofer);
        $this->em->flush();

        return $chofer;
    }

    private function crearChoferDesdeData(array $data): Chofer
    {
        $usuario = new Usuario();
        $usuario->setEmail(strtolower(trim($data['email'])));
        $usuario->setNombre(trim($data['nombre']));
        $usuario->setApellido(trim($data['apellido']));
        $usuario->setRoles([RolConstant::ROLE_CONDUCTOR]);
        // Contraseña temporal — el chofer la cambiará
        $usuario->setContrasena($this->hasher->hashPassword($usuario, bin2hex(random_bytes(8))));

        $chofer = new Chofer();
        $chofer->setUsuario($usuario);
        $chofer->setDni(trim($data['dni']));
        $chofer->setCuil(trim($data['cuil']));
        $chofer->setTelefono(!empty($data['telefono']) ? trim($data['telefono']) : null);
        if (!empty($data['tasa_personal'])) {
            $chofer->setTasaPersonal((float)$data['tasa_personal']);
        }

        $this->em->persist($usuario);
        $this->em->persist($chofer);
        return $chofer;
    }

    public function listar(int $page, int $limit): array
    {
        $offset = ($page - 1) * $limit;
        $qb = $this->em->createQueryBuilder()
            ->select('c')
            ->from(Chofer::class, 'c')
            ->join('c.usuario', 'u')
            ->where('c.eliminado = false')
            ->andWhere('u.eliminado = false')
            ->orderBy('u.apellido', 'ASC')
            ->setMaxResults($limit)
            ->setFirstResult($offset);

        $items = $qb->getQuery()->getResult();

        $total = (int) $this->em->createQueryBuilder()
            ->select('COUNT(c.id)')
            ->from(Chofer::class, 'c')
            ->join('c.usuario', 'u')
            ->where('c.eliminado = false')
            ->andWhere('u.eliminado = false')
            ->getQuery()->getSingleScalarResult();

        return ['items' => $items, 'total' => $total];
    }
}
