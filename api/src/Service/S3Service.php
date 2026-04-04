<?php

namespace App\Service;

/**
 * S3-compatible upload service (works with AWS S3 and Cloudflare R2).
 *
 * Required env vars:
 *   S3_ENDPOINT   — e.g. https://<account_id>.r2.cloudflarestorage.com
 *   S3_BUCKET     — bucket name
 *   S3_ACCESS_KEY — access key id
 *   S3_SECRET_KEY — secret access key
 *   S3_REGION     — "auto" for R2, "us-east-1" etc for AWS
 *   S3_PUBLIC_URL — public base URL for returned file URLs (e.g. https://files.example.com)
 */
class S3Service
{
    private string $endpoint;
    private string $bucket;
    private string $accessKey;
    private string $secretKey;
    private string $region;
    private string $publicUrl;
    private bool   $configured;

    public function __construct()
    {
        $this->endpoint  = rtrim($_ENV['S3_ENDPOINT']   ?? '', '/');
        $this->bucket    = $_ENV['S3_BUCKET']            ?? '';
        $this->accessKey = $_ENV['S3_ACCESS_KEY']        ?? '';
        $this->secretKey = $_ENV['S3_SECRET_KEY']        ?? '';
        $this->region    = $_ENV['S3_REGION']            ?? 'auto';
        $this->publicUrl = rtrim($_ENV['S3_PUBLIC_URL']  ?? '', '/');

        $this->configured = $this->endpoint && $this->bucket
            && $this->accessKey && $this->secretKey;
    }

    public function isConfigured(): bool
    {
        return $this->configured;
    }

    /**
     * Upload a file to S3/R2.
     *
     * @param string $localPath  Absolute path to the local file
     * @param string $remoteKey  Object key in the bucket (e.g. "facturas/2024/file.pdf")
     * @param string $mimeType   MIME type of the file
     * @return string            Public URL of the uploaded file
     * @throws \RuntimeException on upload failure
     */
    public function upload(string $localPath, string $remoteKey, string $mimeType): string
    {
        if (!$this->configured) {
            throw new \RuntimeException('S3 service not configured.');
        }

        $body     = file_get_contents($localPath);
        $bodyHash = hash('sha256', $body);
        $now      = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
        $amzDate  = $now->format('Ymd\THis\Z');
        $dateStamp = $now->format('Ymd');

        $host = parse_url($this->endpoint, PHP_URL_HOST);
        $uri  = "/{$this->bucket}/{$remoteKey}";
        $url  = "{$this->endpoint}{$uri}";

        $canonicalHeaders = "content-type:{$mimeType}\n"
            . "host:{$host}\n"
            . "x-amz-content-sha256:{$bodyHash}\n"
            . "x-amz-date:{$amzDate}\n";
        $signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

        $canonicalRequest = implode("\n", [
            'PUT',
            $uri,
            '',
            $canonicalHeaders,
            $signedHeaders,
            $bodyHash,
        ]);

        $credentialScope = "{$dateStamp}/{$this->region}/s3/aws4_request";
        $stringToSign = implode("\n", [
            'AWS4-HMAC-SHA256',
            $amzDate,
            $credentialScope,
            hash('sha256', $canonicalRequest),
        ]);

        $signingKey = $this->deriveSigningKey($dateStamp);
        $signature  = bin2hex(hash_hmac('sha256', $stringToSign, $signingKey, true));

        $authHeader = "AWS4-HMAC-SHA256 Credential={$this->accessKey}/{$credentialScope},"
            . " SignedHeaders={$signedHeaders},"
            . " Signature={$signature}";

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST  => 'PUT',
            CURLOPT_POSTFIELDS     => $body,
            CURLOPT_HTTPHEADER     => [
                "Authorization: {$authHeader}",
                "Content-Type: {$mimeType}",
                "x-amz-content-sha256: {$bodyHash}",
                "x-amz-date: {$amzDate}",
                'Content-Length: ' . strlen($body),
            ],
            CURLOPT_TIMEOUT => 30,
        ]);

        $response   = curl_exec($ch);
        $httpCode   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError  = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            throw new \RuntimeException("S3 upload curl error: {$curlError}");
        }
        if ($httpCode < 200 || $httpCode >= 300) {
            throw new \RuntimeException("S3 upload failed. HTTP {$httpCode}: {$response}");
        }

        // Return public URL
        $base = $this->publicUrl ?: "{$this->endpoint}/{$this->bucket}";
        return "{$base}/{$remoteKey}";
    }

    private function deriveSigningKey(string $dateStamp): string
    {
        $kDate    = hash_hmac('sha256', $dateStamp,      "AWS4{$this->secretKey}", true);
        $kRegion  = hash_hmac('sha256', $this->region,   $kDate,    true);
        $kService = hash_hmac('sha256', 's3',            $kRegion,  true);
        return      hash_hmac('sha256', 'aws4_request',  $kService, true);
    }
}
