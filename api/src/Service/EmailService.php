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
        $this->apiKey      = $this->env('BREVO_API_KEY', '');
        $this->fromEmail   = $this->env('EMAIL_FROM', 'enviopackadelantos@gmail.com');
        $this->fromName    = $this->env('EMAIL_FROM_NAME', 'Enviopack Adelantos');
        $this->frontendUrl = rtrim($this->env('FRONTEND_URL', $this->env('APP_FRONTEND_URL', 'https://adelantos-app.vercel.app')), '/');
    }

    private function env(string $key, string $default): string
    {
        return $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key) ?: $default;
    }

    public function sendInvitacion(string $toEmail, string $token): bool
    {
        $link = "{$this->frontendUrl}/registro/{$token}";

        $html = <<<HTML
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#111">
          <h2 style="margin-top:0">Te invitamos a Enviopack Adelantos</h2>
          <p>Fuiste dado de alta en la plataforma de adelanto de facturas de Enviopack.</p>
          <p>Hacé clic en el botón para completar tu registro y elegir tu contraseña:</p>
          <a href="{$link}"
             style="display:inline-block;margin:16px 0;padding:12px 24px;background:#2563EB;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
            Completar registro
          </a>
          <p style="font-size:13px;color:#555">Este enlace es válido por 48 horas.</p>
          <p style="font-size:13px;color:#555">Si no esperabas este email, podés ignorarlo.</p>
        </div>
        HTML;

        return $this->send($toEmail, 'Completá tu registro en Enviopack Adelantos', $html);
    }

    public function sendRecuperarContrasena(string $toEmail, string $token): bool
    {
        $link = "{$this->frontendUrl}/recuperar-contrasena?token={$token}";

        $html = <<<HTML
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#111">
          <h2 style="margin-top:0">Recuperá tu contraseña</h2>
          <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
          <a href="{$link}"
             style="display:inline-block;margin:16px 0;padding:12px 24px;background:#2563EB;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
            Restablecer contraseña
          </a>
          <p style="font-size:13px;color:#555">Este enlace es válido por 1 hora.</p>
          <p style="font-size:13px;color:#555">Si no solicitaste esto, podés ignorarlo.</p>
        </div>
        HTML;

        return $this->send($toEmail, 'Recuperá tu contraseña — Enviopack Adelantos', $html);
    }

    public function sendProformaNotificacion(string $toEmail, string $nombre, \App\Entity\Proforma $proforma): bool
    {
        $monto  = number_format($proforma->getMonto(), 2, ',', '.');
        $periodo = $proforma->getPeriodo();
        $vencimiento = $proforma->getFechaVencimiento()->format('d/m/Y');
        $link = "{$this->frontendUrl}/facturas";

        $html = <<<HTML
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#111">
          <h2 style="margin-top:0">Nueva proforma disponible</h2>
          <p>Hola {$nombre},</p>
          <p>Se generó una nueva proforma para vos:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#555">Período</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">{$periodo}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#555">Monto</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">\${$monto}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#555">Vencimiento</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">{$vencimiento}</td></tr>
          </table>
          <a href="{$link}"
             style="display:inline-block;margin:16px 0;padding:12px 24px;background:#2563EB;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
            Ver mis proformas
          </a>
          <p style="font-size:13px;color:#555">Si tenés alguna duda, contactá al administrador.</p>
        </div>
        HTML;

        return $this->send($toEmail, "Nueva proforma — {$periodo}", $html);
    }

    public function sendNotificacionPago(string $toEmail, string $nombreChofer, string $numeroFactura, float $montoNeto, string $tipoCobro, string $comprobanteUrl): bool
    {
        $monto = number_format($montoNeto, 2, ',', '.');
        $tipoLabel = $tipoCobro === 'adelanto' ? 'Adelanto 48hs' : 'Cobro normal';
        $link = "{$this->frontendUrl}/facturas";
        $comprobanteLink = str_starts_with($comprobanteUrl, 'http') ? $comprobanteUrl : "{$this->frontendUrl}{$comprobanteUrl}";

        $html = <<<HTML
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#111">
          <h2 style="margin-top:0;color:#16a34a">Pago efectuado</h2>
          <p>Hola {$nombreChofer},</p>
          <p>Te informamos que se registró el pago de tu factura:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#555">N° Factura</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">#{$numeroFactura}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#555">Tipo de cobro</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">{$tipoLabel}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#555">Monto abonado</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;color:#16a34a">\${$monto}</td></tr>
          </table>
          <a href="{$comprobanteLink}"
             style="display:inline-block;margin:16px 0 8px;padding:12px 24px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
            Ver comprobante de pago
          </a>
          <br/>
          <a href="{$link}"
             style="display:inline-block;margin:8px 0;padding:12px 24px;background:#2563EB;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
            Ver mis facturas
          </a>
          <p style="font-size:13px;color:#555;margin-top:16px">Si tenés alguna duda, contactá al administrador.</p>
        </div>
        HTML;

        return $this->send($toEmail, "Pago efectuado — Factura #{$numeroFactura}", $html);
    }

    public function sendNotificacionRechazoFactura(string $toEmail, string $nombreChofer, string $numeroFactura, string $motivo): bool
    {
        $link = "{$this->frontendUrl}/facturas";
        $motivoHtml = nl2br(htmlspecialchars($motivo));

        $html = <<<HTML
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#111">
          <h2 style="margin-top:0;color:#dc2626">Factura rechazada</h2>
          <p>Hola {$nombreChofer},</p>
          <p>Te informamos que tu factura <strong>#{$numeroFactura}</strong> fue rechazada por el equipo de administración.</p>
          <div style="margin:16px 0;padding:14px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px">
            <p style="margin:0 0 6px;font-size:13px;color:#991b1b;font-weight:600">Motivo del rechazo:</p>
            <p style="margin:0;font-size:14px;color:#7f1d1d">{$motivoHtml}</p>
          </div>
          <p>Podés corregir lo necesario y volver a cargar la factura desde la plataforma.</p>
          <a href="{$link}"
             style="display:inline-block;margin:16px 0;padding:12px 24px;background:#2563EB;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
            Ir a Mis Facturas
          </a>
          <p style="font-size:13px;color:#555;margin-top:16px">Si tenés alguna duda, contactá al administrador.</p>
        </div>
        HTML;

        return $this->send($toEmail, "Factura rechazada — #{$numeroFactura}", $html);
    }

    public function sendInvitacionUsuario(string $toEmail, string $token, string $rolLabel): bool
    {
        $link = "{$this->frontendUrl}/registro-admin/{$token}";

        $html = <<<HTML
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#111">
          <h2 style="margin-top:0">Te invitamos a Enviopack Adelantos</h2>
          <p>Fuiste invitado como <strong>{$rolLabel}</strong> en la plataforma de adelanto de facturas de Enviopack.</p>
          <p>Hacé clic en el botón para completar tu registro y elegir tu contraseña:</p>
          <a href="{$link}"
             style="display:inline-block;margin:16px 0;padding:12px 24px;background:#2563EB;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
            Completar registro
          </a>
          <p style="font-size:13px;color:#555">Este enlace es válido por 48 horas.</p>
          <p style="font-size:13px;color:#555">Si no esperabas este email, podés ignorarlo.</p>
        </div>
        HTML;

        return $this->send($toEmail, 'Completá tu registro en Enviopack Adelantos', $html);
    }

    /**
     * @param array $toEmails
     * @param string $fechaLabel  e.g. "13/04/2026"
     * @param array $depositos    e.g. ['V.Lynch' => ['AA136TL','AB914OH'], 'El Jaguel' => ['AA398FV']]
     */
    public function sendDisponibilidadChoferes(array $toEmails, string $fechaLabel, array $depositos): bool
    {
        $total = 0;
        $sectionsHtml = '';

        foreach ($depositos as $deposito => $patentes) {
            $count = count($patentes);
            $total += $count;

            $rowsHtml = '';
            foreach ($patentes as $i => $patente) {
                $rowsHtml .= '<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;color:#555;width:30px;font-size:13px">' . ($i + 1) . '</td><td style="padding:6px 12px;border-bottom:1px solid #eee;font-weight:500;font-size:14px">' . htmlspecialchars($patente) . '</td></tr>';
            }

            $sectionsHtml .= <<<HTML
            <div style="margin-bottom:20px">
              <h3 style="margin:0 0 8px;font-size:15px;color:#1f2937;border-bottom:2px solid #2563EB;padding-bottom:6px">{$deposito} ({$count})</h3>
              <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:8px;overflow:hidden">
                <tr style="background:#e5e7eb"><th style="padding:6px 12px;text-align:left;font-size:12px;color:#374151">#</th><th style="padding:6px 12px;text-align:left;font-size:12px;color:#374151">Patente</th></tr>
                {$rowsHtml}
              </table>
            </div>
            HTML;
        }

        $html = <<<HTML
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#111">
          <h2 style="margin-top:0">Proveedores disponibles para el {$fechaLabel}</h2>
          <p>Se registraron <strong>{$total} proveedor(es)</strong> disponibles para tomar carga:</p>
          {$sectionsHtml}
          <p style="font-size:13px;color:#555;margin-top:16px">Email generado automáticamente desde Enviopack Adelantos.</p>
        </div>
        HTML;

        $subject = "Proveedores disponibles — {$fechaLabel}";
        $ok = true;
        foreach ($toEmails as $email) {
            if (!$this->send(trim($email), $subject, $html)) {
                $ok = false;
            }
        }
        return $ok;
    }

    private function send(string $to, string $subject, string $html): bool
    {
        if (!$this->apiKey) {
            error_log("[EmailService] No BREVO_API_KEY configured — skipping email to {$to}");
            return false;
        }

        $payload = json_encode([
            'sender'      => ['name' => $this->fromName, 'email' => $this->fromEmail],
            'to'          => [['email' => $to]],
            'subject'     => $subject,
            'htmlContent' => $html,
        ]);

        error_log("[EmailService] Sending to={$to} from={$this->fromEmail} subject={$subject}");

        $ch = curl_init('https://api.brevo.com/v3/smtp/email');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_HTTPHEADER     => [
                'api-key: ' . $this->apiKey,
                'Content-Type: application/json',
            ],
            CURLOPT_TIMEOUT        => 10,
        ]);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            error_log("[EmailService] cURL error: {$curlError}");
            return false;
        }

        if ($httpCode >= 400) {
            error_log("[EmailService] Brevo error {$httpCode}: {$response}");
            return false;
        }

        error_log("[EmailService] OK ({$httpCode}): {$response}");
        return true;
    }
}
