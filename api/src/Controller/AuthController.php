<?php

namespace App\Controller;

use App\Entity\SolicitudAdelanto;
use App\Entity\Factura;
use App\Repository\InvitacionChoferRepository;
use App\Service\ChoferService;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api')]
class AuthController extends AbstractApiController
{
    // ── Perfil ────────────────────────────────────────────────────────────────

    #[Route('/perfil', name: 'api_perfil', methods: ['GET'])]
    public function perfil(): JsonResponse
    {
        $usuario = $this->getUsuario();
        return $this->ok([
            'id'        => $usuario->getId(),
            'nombre'    => $usuario->getNombre(),
            'apellido'  => $usuario->getApellido(),
            'email'     => $usuario->getEmail(),
            'roles'     => $usuario->getRoles(),
            'habilitado' => $usuario->isHabilitado(),
        ]);
    }

    // ── Registro por invitación ───────────────────────────────────────────────

    #[Route('/registro/{token}', name: 'api_registro_info', methods: ['GET'])]
    public function registroInfo(string $token, InvitacionChoferRepository $repo): JsonResponse
    {
        $invitacion = $repo->findOneBy(['token' => $token]);

        if (!$invitacion || !$invitacion->isVigente()) {
            return new JsonResponse(['code' => 404, 'message' => 'Invitación no encontrada o expirada.'], 404);
        }

        return $this->ok([
            'email'     => $invitacion->getEmail(),
            'expira_en' => $invitacion->getExpiraEn()->format('c'),
        ]);
    }

    #[Route('/registro/{token}', name: 'api_registro_completar', methods: ['POST'])]
    public function registroCompletar(
        string $token,
        Request $request,
        InvitacionChoferRepository $repo,
        ChoferService $choferService,
    ): JsonResponse {
        $invitacion = $repo->findOneBy(['token' => $token]);

        if (!$invitacion || !$invitacion->isVigente()) {
            return new JsonResponse(['code' => 404, 'message' => 'Invitación no encontrada o expirada.'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        $errors = [];
        if (empty($data['nombre']))    { $errors['nombre']    = 'El nombre es obligatorio.'; }
        if (empty($data['apellido']))  { $errors['apellido']  = 'El apellido es obligatorio.'; }
        if (empty($data['dni']))       { $errors['dni']       = 'El DNI es obligatorio.'; }
        if (empty($data['cuil']))      { $errors['cuil']      = 'El CUIL es obligatorio.'; }
        if (empty($data['contrasena'])) { $errors['contrasena'] = 'La contraseña es obligatoria.'; }

        if (!empty($errors)) {
            return new JsonResponse(['code' => 422, 'message' => 'Error de validación.', 'errors' => $errors], 422);
        }

        $chofer = $choferService->completarRegistro($invitacion, $data);

        return $this->created([
            'message' => 'Registro completado. Ya podés iniciar sesión.',
            'chofer_id' => $chofer->getId(),
        ]);
    }

    // ── Recuperar contraseña ──────────────────────────────────────────────────

    #[Route('/recuperar-contrasena', name: 'api_recuperar_solicitar', methods: ['POST'])]
    public function recuperarSolicitar(Request $request): JsonResponse
    {
        // TODO: implementar flujo de recuperación de contraseña por email
        return $this->ok(['message' => 'Si el email existe recibirás instrucciones en breve.']);
    }

    #[Route('/recuperar-contrasena', name: 'api_recuperar_confirmar', methods: ['PUT'])]
    public function recuperarConfirmar(Request $request): JsonResponse
    {
        // TODO: implementar confirmación de reset de contraseña
        return new JsonResponse(['code' => 501, 'message' => 'No implementado aún.'], 501);
    }
}
