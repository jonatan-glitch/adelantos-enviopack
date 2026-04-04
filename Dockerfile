FROM php:8.2-fpm-alpine

# Install system deps and PHP extensions
RUN apk add --no-cache nginx supervisor bash gettext libpq-dev icu-dev libzip-dev \
 && docker-php-ext-install -j$(nproc) pdo pdo_pgsql intl zip \
 && apk del libpq-dev icu-dev libzip-dev \
 && apk add --no-cache libpq icu-libs libzip

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Dependencies (cached layer)
COPY api/composer.json api/composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

# Source code
COPY api/ .
RUN composer dump-autoload --optimize --no-dev

# Remove ALL default pool configs to avoid conflicts
RUN rm -f /usr/local/etc/php-fpm.d/www.conf \
          /usr/local/etc/php-fpm.d/www.conf.default \
          /usr/local/etc/php-fpm.d/docker.conf \
          /usr/local/etc/php-fpm.d/zz-docker.conf

# Our clean configs
COPY api/docker/php-fpm.conf   /usr/local/etc/php-fpm.d/www.conf
COPY api/docker/nginx.conf     /etc/nginx/nginx.conf.template
COPY api/docker/supervisord.conf /etc/supervisord.conf
COPY api/docker/start.sh       /start.sh

RUN adduser -D -u 1000 www-data 2>/dev/null || true \
 && chmod +x /start.sh \
 && mkdir -p /var/log/nginx /run/nginx /var/log/supervisor \
 && mkdir -p var/cache var/log \
 && chmod -R 777 var/

EXPOSE 8080
CMD ["/start.sh"]
