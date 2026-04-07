<?php

namespace App\Service;

use App\Constant\RolConstant;
use App\Entity\InvitacionUsuario;
use App\Entity\Usuario;
use App\Exception\DomainException;
use App\Repository\InvitacionUsuarioRepository;
use App\Repository\UsuarioRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class UsuarioAdminService
{
    public function __construct(
        private EntityManagerInterface       $em,
        private UsuarioRepository            $usuarioRepo,
        private InvitacionUsuarioRepository  $invitacionRepo,
        private UserPasswordHasherInterface  $hasher,
        private EmailService                 $emailService,
    ) {}

    public function invitar(string $email, string $rol, string $invitadoPor): array
    {
        if (!array_key_exists($rol, RolConstant::ROLES_INVITABLES)) {
            throw new DomainException('El rol seleccionado no es válido.');
        }

        $existente = $this->usuarioRepo->findOneBy(['email' => $email, 'eliminado' => false]);
        if ($existente) {
            // Si es un conductor, lo eliminamos (soft-delete) para permitir re-invitación con otro rol
            if (in_array('ROLE_CONDUCTOR', $existente->getRoles(), true)
                && !array_intersect($existente->getRoles(), RolConstant::ROLES_ADMIN_PANEL)) {
                $existente->setEliminado(true);
                $this->em->flush();
            } else {
                throw new DomainException('Ya existe un usuario registrado con ese email.');
            }
        }

        // Invalidar invitaciones previas no usadas
        $previas = $this->invitacionRepo->findBy(['email' => $email, 'usado' => false]);
        foreach ($previas as $previa) {
            $previa->setUsado(true);
        }

        $invitacion = new InvitacionUsuario();
        $invitacion->setEmail($email);
        $invitacion->setRol($rol);
        $invitacion->setInvitadoPor($invitadoPor);
        $this->em->persist($invitacion);
        $this->em->flush();

        $rolLabel = RolConstant::ROLES_INVITABLES[$rol] ?? $rol;
        $emailSent = $this->emailService->sendInvitacionUsuario($email, $invitacion->getToken(), $rolLabel);

        return ['invitacion' => $invitacion, 'email_sent' => $emailSent];
    }

    public function completarRegistro(InvitacionUsuario $invitacion, array $data): Usuario
    {
        if (!$invitacion->isVigente()) {
            throw new DomainException('La invitación expiró o ya fue utilizada.');
        }

        $usuario = new Usuario();
        $usuario->setEmail($invitacion->getEmail());
        $usuario->setNombre($data['nombre']);
        $usuario->setApellido($data['apellido']);
        $usuario->setRoles([$invitacion->getRol()]);
        $usuario->setContrasena($this->hasher->hashPassword($usuario, $data['contrasena']));

        $invitacion->setUsado(true);

        $this->em->persist($usuario);
        $this->em->flush();

        return $usuario;
    }

    public function cambiarRol(int $id, string $nuevoRol): Usuario
    {
        if (!array_key_exists($nuevoRol, RolConstant::ROLES_INVITABLES)) {
            throw new DomainException('El rol seleccionado no es válido.');
        }

        $usuario = $this->usuarioRepo->find($id);
        if (!$usuario || $usuario->isEliminado()) {
            throw new DomainException('Usuario no encontrado.');
        }

        // No permitir cambiar el rol del super admin
        if (in_array(RolConstant::ROLE_ENVIOPACK_ADMIN, $usuario->getRoles(), true)) {
            throw new DomainException('No se puede modificar el rol del Super Admin.');
        }

        // No permitir cambiar a un conductor
        if (in_array(RolConstant::ROLE_CONDUCTOR, $usuario->getRoles(), true)) {
            throw new DomainException('No se puede cambiar el rol de un conductor desde aquí.');
        }

        $usuario->setRoles([$nuevoRol]);
        $this->em->flush();

        return $usuario;
    }

    public function listarUsuariosAdmin(): array
    {
        $qb = $this->em->createQueryBuilder()
            ->select('u')
            ->from(Usuario::class, 'u')
            ->where('u.eliminado = false')
            ->orderBy('u.apellido', 'ASC');

        $all = $qb->getQuery()->getResult();

        // Filter only users with admin-panel roles (not conductors)
        return array_values(array_filter($all, function (Usuario $u) {
            foreach ($u->getRoles() as $role) {
                if (in_array($role, RolConstant::ROLES_ADMIN_PANEL, true)) {
                    return true;
                }
            }
            return false;
        }));
    }
}
