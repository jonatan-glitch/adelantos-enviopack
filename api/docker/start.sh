#!/bin/bash
set -e

export PORT=${PORT:-8080}

echo "==> Decodificando claves JWT..."
mkdir -p /app/config/jwt

if [ -n "$JWT_PRIVATE_KEY_BASE64" ]; then
    echo "$JWT_PRIVATE_KEY_BASE64" | base64 -d > /app/config/jwt/private.pem
    chmod 600 /app/config/jwt/private.pem
    echo "    private.pem OK"
fi

if [ -n "$JWT_PUBLIC_KEY_BASE64" ]; then
    echo "$JWT_PUBLIC_KEY_BASE64" | base64 -d > /app/config/jwt/public.pem
    echo "    public.pem OK"
fi

echo "==> Generando nginx.conf (PORT=${PORT})..."
envsubst '${PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

echo "==> Cache Symfony..."
php bin/console cache:clear --env=prod --no-debug 2>&1 || true
php bin/console cache:warmup --env=prod --no-debug 2>&1 || true
# Los archivos de cache se crean como root; www-data (php-fpm) los necesita escribibles
chmod -R 777 var/

echo "==> Migraciones..."
php bin/console doctrine:migrations:migrate --no-interaction --env=prod 2>&1 || \
    echo "    (DB no disponible aún, se reintentará)"

echo "==> Iniciando php-fpm + nginx (PORT=${PORT})..."
exec /usr/bin/supervisord -c /etc/supervisord.conf
