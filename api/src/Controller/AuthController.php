<?php

namespace App\Controller;

use App\Entity\PasswordResetToken;
use App\Repository\InvitacionChoferRepository;
use App\Repository\PasswordResetTokenRepository;
use App\Repository\UsuarioRepository;
use App\Service\ChoferService;
use App\Service\EmailService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
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
    public function recuperarSolicitar(
        Request $request,
        UsuarioRepository $usuarioRepo,
        PasswordResetTokenRepository $tokenRepo,
        EntityManagerInterface $em,
        EmailService $emailService,
    ): JsonResponse {
        $data  = json_decode($request->getContent(), true) ?? [];
        $email = trim($data['email'] ?? '');

        // Always return same message to avoid user enumeration
        $response = $this->ok(['message' => 'Si el email existe recibirás instrucciones en breve.']);

        if (!$email) {
            return $response;
        }

        $usuario = $usuarioRepo->findOneBy(['email' => $email]);
        if (!$usuario) {
            return $response;
        }

        // Invalidate existing tokens for this user
        $existing = $tokenRepo->findBy(['usuario' => $usuario, 'used' => false]);
        foreach ($existing as $t) {
            $t->setUsed(true);
        }

        $token = (new PasswordResetToken())
            ->setToken(bin2hex(random_bytes(32)))
            ->setUsuario($usuario)
            ->setExpiresAt(new \DateTimeImmutable('+1 hour'))
            ->setUsed(false);

        $em->persist($token);
        $em->flush();

        $emailService->sendRecuperarContrasena($usuario->getEmail(), $token->getToken());

        return $response;
    }

    #[Route('/recuperar-contrasena', name: 'api_recuperar_confirmar', methods: ['PUT'])]
    public function recuperarConfirmar(
        Request $request,
        PasswordResetTokenRepository $tokenRepo,
        EntityManagerInterface $em,
        UserPasswordHasherInterface $hasher,
    ): JsonResponse {
        $data     = json_decode($request->getContent(), true) ?? [];
        $tokenStr = trim($data['token'] ?? '');
        $password = trim($data['contrasena'] ?? '');

        if (!$tokenStr || !$password) {
            return new JsonResponse(['code' => 422, 'message' => 'Token y contraseña son obligatorios.'], 422);
        }

        if (strlen($password) < 8) {
            return new JsonResponse(['code' => 422, 'message' => 'La contraseña debe tener al menos 8 caracteres.'], 422);
        }

        $token = $tokenRepo->findOneBy(['token' => $tokenStr]);
        if (!$token || !$token->isValid()) {
            return new JsonResponse(['code' => 400, 'message' => 'Token inválido o expirado.'], 400);
        }

        $usuario = $token->getUsuario();
        $usuario->setContrasena($hasher->hashPassword($usuario, $password));

        $token->setUsed(true);
        $em->flush();

        return $this->ok(['message' => 'Contraseña actualizada correctamente. Ya podés iniciar sesión.']);
    }
}
