<?php

namespace App\Controller\Chofer;

use App\Controller\AbstractApiController;
use App\Repository\ChoferRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/chofer')]
class PerfilController extends AbstractApiController
{
    public function __construct(
        private ChoferRepository       $choferRepo,
        private EntityManagerInterface $em,
    ) {}

    // ── GET /api/chofer/perfil ────────────────────────────────────────────────

    #[Route('/perfil', name: 'chofer_perfil_get', methods: ['GET'])]
    public function getPerfil(): JsonResponse
    {
        $usuario = $this->getUsuario();
        $chofer  = $this->choferRepo->findOneBy(['usuario' => $usuario, 'eliminado' => false]);

        if (!$chofer) {
            return new JsonResponse(['code' => 404, 'message' => 'Perfil no encontrado.'], 404);
        }

        return $this->ok([
            'id'       => $chofer->getId(),
            'nombre'   => $chofer->getNombre(),
            'apellido' => $chofer->getApellido(),
            'email'    => $chofer->getEmail(),
            'dni'      => $chofer->getDni(),
            'cuil'     => $chofer->getCuil(),
            'telefono' => $chofer->getTelefono(),
            'cbu'      => $chofer->getCbu(),
            'banco'    => $chofer->getBanco(),
        ]);
    }

    // ── PUT /api/chofer/perfil ────────────────────────────────────────────────

    #[Route('/perfil', name: 'chofer_perfil_put', methods: ['PUT'])]
    public function updatePerfil(Request $request): JsonResponse
    {
        $usuario = $this->getUsuario();
        $chofer  = $this->choferRepo->findOneBy(['usuario' => $usuario, 'eliminado' => false]);

        if (!$chofer) {
            return new JsonResponse(['code' => 404, 'message' => 'Perfil no encontrado.'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        if (array_key_exists('telefono', $data)) {
            $tel = trim($data['telefono'] ?? '');
            if ($tel !== '' && !preg_match('/^[0-9+\-\s()]{6,20}$/', $tel)) {
                return new JsonResponse(['code' => 422, 'message' => 'Número de teléfono inválido.'], 422);
            }
            $chofer->setTelefono($tel !== '' ? $tel : null);
        }

        $this->em->flush();

        return $this->ok([
            'id'       => $chofer->getId(),
            'nombre'   => $chofer->getNombre(),
            'apellido' => $chofer->getApellido(),
            'email'    => $chofer->getEmail(),
            'dni'      => $chofer->getDni(),
            'cuil'     => $chofer->getCuil(),
            'telefono' => $chofer->getTelefono(),
            'cbu'      => $chofer->getCbu(),
            'banco'    => $chofer->getBanco(),
        ]);
    }

    // ── POST /api/chofer/cambiar-contrasena ───────────────────────────────────

    #[Route('/cambiar-contrasena', name: 'chofer_cambiar_contrasena', methods: ['POST'])]
    public function cambiarContrasena(
        Request $request,
        UserPasswordHasherInterface $hasher,
    ): JsonResponse {
        $usuario = $this->getUsuario();
        $data    = json_decode($request->getContent(), true) ?? [];

        $actual  = $data['contrasena_actual'] ?? '';
        $nueva   = $data['nueva_contrasena']  ?? '';

        if (!$actual || !$nueva) {
            return new JsonResponse(['code' => 422, 'message' => 'Contraseña actual y nueva son obligatorias.'], 422);
        }

        if (!$hasher->isPasswordValid($usuario, $actual)) {
            return new JsonResponse(['code' => 422, 'message' => 'La contraseña actual es incorrecta.'], 422);
        }

        if (strlen($nueva) < 8) {
            return new JsonResponse(['code' => 422, 'message' => 'La nueva contraseña debe tener al menos 8 caracteres.'], 422);
        }

        $usuario->setContrasena($hasher->hashPassword($usuario, $nueva));
        $this->em->flush();

        return $this->ok(['message' => 'Contraseña actualizada correctamente.']);
    }
}
