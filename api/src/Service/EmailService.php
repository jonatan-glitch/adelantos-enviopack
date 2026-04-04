<?php

namespace App\Service;

class EmailService
{
    private string $apiKey;
    private string $fromEmail;
    private string $fromName;
    private string $frontendUrl;

    public function __construct()
    {
        $this->apiKey      = $_ENV['RESEND_API_KEY'] ?? '';
        $this->fromEmail   = $_ENV['EMAIL_FROM']      ?? 'adelantos@enviopack.com';
        $this->fromName    = $_ENV['EMAIL_FROM_NAME'] ?? 'Enviopack Adelantos';
        $this->frontendUrl = rtrim($_ENV['FRONTEND_URL'] ?? 'https://adelantos-app.vercel.app', '/');
    }

    public function sendInvitacion(string $toEmail, string $token): void
    {
        $link = "{$this->frontendUrl}/registro/{$token}";

        $html = <<<HTML
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#111">
          <h2 style="margin-top:0">Te invitamos a Enviopack Adelantos</h2>
          <p>Fuiste dado de alta en la plataforma de adelanto de facturas de Enviopack.</p>
          <p>Hacé clic en el botón para completar tu registro y elegir tu contraseña:</p>
          <a href="{$link}"
             style="display:inline-block;margin:16px 0;padding:12px 24px;background:#1C6CF9;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
            Completar registro
          </a>
          <p style="font-size:13px;color:#555">Este enlace es válido por 48 horas.</p>
          <p style="font-size:13px;color:#555">Si no esperabas este email, podés ignorarlo.</p>
        </div>
        HTML;

        $this->send($toEmail, 'Completá tu registro en Enviopack Adelantos', $html);
    }

    public function sendRecuperarContrasena(string $toEmail, string $token): void
    {
        $link = "{$this->frontendUrl}/recuperar-contrasena?token={$token}";

        $html = <<<HTML
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#111">
          <h2 style="margin-top:0">Recuperá tu contraseña</h2>
          <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
          <a href="{$link}"
             style="display:inline-block;margin:16px 0;padding:12px 24px;background:#1C6CF9;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
            Restablecer contraseña
          </a>
          <p style="font-size:13px;color:#555">Este enlace es válido por 1 hora.</p>
          <p style="font-size:13px;color:#555">Si no solicitaste esto, podés ignorarlo.</p>
        </div>
        HTML;

        $this->send($toEmail, 'Recuperá tu contraseña — Enviopack Adelantos', $html);
    }

    private function send(string $to, string $subject, string $html): void
    {
        if (!$this->apiKey) {
            return; // Silently skip if not configured
        }

        $payload = json_encode([
            'from'    => "{$this->fromName} <{$this->fromEmail}>",
            'to'      => [$to],
            'subject' => $subject,
            'html'    => $html,
        ]);

        $ch = curl_init('https://api.resend.com/emails');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_HTTPHEADER     => [
                'Authorization: Bearer ' . $this->apiKey,
                'Content-Type: application/json',
            ],
            CURLOPT_TIMEOUT        => 10,
        ]);
        curl_exec($ch);
        curl_close($ch);
    }
}
