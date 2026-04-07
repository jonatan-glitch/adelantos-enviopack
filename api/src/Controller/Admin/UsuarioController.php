<?php

namespace App\Controller\Admin;

use App\Constant\RolConstant;
use App\Controller\AbstractApiController;
use App\Service\UsuarioAdminService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/admin/usuarios')]
class UsuarioController extends AbstractApiController
{
    public function __construct(private UsuarioAdminService $usuarioService) {}

    #[Route('', name: 'admin_usuarios_listar', methods: ['GET'])]
    public function listar(): JsonResponse
    {
        $usuarios = $this->usuarioService->listarUsuariosAdmin();
        $items = array_map(fn($u) => [
            'id'         => $u->getId(),
            'nombre'     => $u->getNombre(),
            'apellido'   => $u->getApellido(),
            'email'      => $u->getEmail(),
            'roles'      => $u->getRoles(),
            'habilitado' => $u->isHabilitado(),
            'created_at' => $u->getCreatedAt()->format('c'),
        ], $usuarios);
        return $this->ok(['items' => $items]);
    }

    #[Route('/invitar', name: 'admin_usuarios_invitar', methods: ['POST'])]
    public function invitar(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMINISTRADOR');

        $data  = json_decode($request->getContent(), true) ?? [];
        $email = strtolower(trim($data['email'] ?? ''));
        $rol   = $data['rol'] ?? '';

        $errors = [];
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'El email no es válido.';
        }
        if (!array_key_exists($rol, RolConstant::ROLES_INVITABLES)) {
            $errors['rol'] = 'Seleccioná un rol válido.';
        }
        if (!empty($errors)) {
            return new JsonResponse(['code' => 422, 'message' => 'Error de validación.', 'errors' => $errors], 422);
        }

        $usuario = $this->getUsuario();
        $invitadoPor = $usuario->getNombre() . ' ' . $usuario->getApellido();
        $result = $this->usuarioService->invitar($email, $rol, $invitadoPor);

        $msg = $result['email_sent']
            ? 'Invitación enviada correctamente.'
            : 'Invitación creada pero el email no pudo enviarse.';
        return $this->ok(['message' => $msg, 'email_sent' => $result['email_sent']]);
    }

    #[Route('/roles', name: 'admin_usuarios_roles', methods: ['GET'])]
    public function roles(): JsonResponse
    {
        $roles = [];
        foreach (RolConstant::ROLES_INVITABLES as $key => $label) {
            $roles[] = ['value' => $key, 'label' => $label];
        }
        return $this->ok(['roles' => $roles]);
    }

    #[Route('/{id}/cambiar-rol', name: 'admin_usuarios_cambiar_rol', methods: ['PUT'])]
    public function cambiarRol(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ENVIOPACK_ADMIN');

        $data = json_decode($request->getContent(), true) ?? [];
        $rol  = $data['rol'] ?? '';

        if (!array_key_exists($rol, RolConstant::ROLES_INVITABLES)) {
            return new JsonResponse(['code' => 422, 'message' => 'Seleccioná un rol válido.'], 422);
        }

        $this->usuarioService->cambiarRol($id, $rol);

        $rolLabel = RolConstant::ROLES_INVITABLES[$rol] ?? $rol;
        return $this->ok(['message' => "Rol actualizado a {$rolLabel}."]);
    }
}
