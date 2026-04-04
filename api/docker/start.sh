#!/bin/bash
set -e

# Default PORT for Railway
export PORT=${PORT:-8080}

echo "==> Decodificando claves JWT..."
mkdir -p /app/config/jwt

if [ -n "$JWT_PRIVATE_KEY_BASE64" ]; then
    echo "$JWT_PRIVATE_KEY_BASE64" | base64 -d > /app/config/jwt/private.pem
    chmod 600 /app/config/jwt/private.pem
    echo "    private.pem OK"
else
    echo "    ADVERTENCIA: JWT_PRIVATE_KEY_BASE64 no definida"
fi

if [ -n "$JWT_PUBLIC_KEY_BASE64" ]; then
    echo "$JWT_PUBLIC_KEY_BASE64" | base64 -d > /app/config/jwt/public.pem
    echo "    public.pem OK"
else
    echo "    ADVERTENCIA: JWT_PUBLIC_KEY_BASE64 no definida"
fi

echo "==> Generando nginx.conf (PORT=${PORT})..."
envsubst '${PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

echo "==> Limpiando cache de Symfony..."
php bin/console cache:clear --env=prod --no-debug 2>/dev/null || true
php bin/console cache:warmup --env=prod --no-debug 2>/dev/null || true

echo "==> Ejecutando migraciones..."
php bin/console doctrine:migrations:migrate --no-interaction --env=prod 2>&1 || \
    echo "    ADVERTENCIA: migraciones fallaron (DB puede no estar disponible aún)"

echo "==> Iniciando servicios (PORT=${PORT})..."
exec /usr/bin/supervisord -c /etc/supervisord.conf
