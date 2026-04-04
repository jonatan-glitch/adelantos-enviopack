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

echo "    --- nginx config test ---"
nginx -t 2>&1 || { echo "ERROR: nginx config invalido"; cat /etc/nginx/nginx.conf; exit 1; }
echo "    nginx config OK"

echo "==> [3] PHP-FPM config test..."
php-fpm -t 2>&1 || { echo "ERROR: php-fpm config invalido"; exit 1; }
echo "    php-fpm config OK"

echo "==> [4] PHP info..."
php -r "echo 'PHP version: ' . PHP_VERSION . PHP_EOL; echo 'Extensions: ' . implode(', ', get_loaded_extensions()) . PHP_EOL;"

echo "==> [5] Cache Symfony..."
php bin/console cache:clear --env=prod --no-debug 2>&1 || true
php bin/console cache:warmup --env=prod --no-debug 2>&1 || true
chmod -R 777 var/

echo "==> [6] Migraciones..."
php bin/console doctrine:migrations:migrate --no-interaction --env=prod 2>&1 || \
    echo "    (DB no disponible aún, se reintentará)"

echo "==> [7] Seeds..."
if [ "${SEED_DB:-0}" = "1" ]; then
    php bin/console app:create-admin --env=prod --no-debug 2>&1 || \
        echo "    (seed falló)"
fi

echo "==> [8] Verificando archivos críticos..."
ls -la /app/public/index.php
ls -la /etc/nginx/nginx.conf
ls -la /usr/local/etc/php-fpm.d/
php -r "require '/app/vendor/autoload.php'; echo 'Autoloader OK' . PHP_EOL;"

echo "==> [9] Iniciando supervisord (PORT=${PORT})..."
exec /usr/bin/supervisord -c /etc/supervisord.conf
