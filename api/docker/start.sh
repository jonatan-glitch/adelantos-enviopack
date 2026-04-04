#!/bin/bash
set -e

export PORT=${PORT:-8080}

echo "==> [1] Decodificando claves JWT..."
mkdir -p /app/config/jwt

if [ -n "$JWT_PRIVATE_KEY_BASE64" ]; then
    echo "$JWT_PRIVATE_KEY_BASE64" | base64 -d > /app/config/jwt/private.pem
    chown root:www-data /app/config/jwt/private.pem
    chmod 640 /app/config/jwt/private.pem
    echo "    private.pem OK"
fi

if [ -n "$JWT_PUBLIC_KEY_BASE64" ]; then
    echo "$JWT_PUBLIC_KEY_BASE64" | base64 -d > /app/config/jwt/public.pem
    echo "    public.pem OK"
fi

echo "==> [2] Generando nginx.conf (PORT=${PORT})..."
envsubst '${PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

echo "--- nginx.conf generado ---"
cat /etc/nginx/nginx.conf
echo "---------------------------"

nginx -t 2>&1 && echo "nginx config OK" || { echo "ERROR nginx config"; exit 1; }

echo "==> [3] PHP-FPM config test..."
php-fpm -t 2>&1 && echo "php-fpm config OK" || { echo "ERROR php-fpm config"; exit 1; }
echo "php-fpm.d contents:"
ls -la /usr/local/etc/php-fpm.d/
echo "zz-docker.conf content (if exists):"
cat /usr/local/etc/php-fpm.d/zz-docker.conf 2>/dev/null || echo "(no existe)"

echo "==> [4] Cache Symfony..."
php bin/console cache:clear --env=prod --no-debug 2>&1 || true
php bin/console cache:warmup --env=prod --no-debug 2>&1 || true
chmod -R 777 var/

echo "==> [5] Migraciones..."
php bin/console doctrine:migrations:migrate --no-interaction --env=prod 2>&1 || \
    echo "    (DB no disponible aún, se reintentará)"

echo "==> [6] Seeds..."
if [ "${SEED_DB:-0}" = "1" ]; then
    php bin/console app:create-admin --env=prod --no-debug 2>&1 || \
        echo "    (seed falló)"
fi

echo "==> [7] Iniciando supervisord (PORT=${PORT}, socket=/run/php-fpm.sock)..."
exec /usr/bin/supervisord -c /etc/supervisord.conf
