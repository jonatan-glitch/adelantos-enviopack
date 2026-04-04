FROM php:8.2-fpm-alpine

# System deps + PHP extensions in one stage (avoids multi-stage extension copy issues on Alpine)
RUN apk add --no-cache \
    nginx supervisor bash gettext \
    libpq-dev icu-dev libzip-dev \
 && docker-php-ext-install -j$(nproc) pdo pdo_pgsql intl zip opcache \
 && apk add --no-cache libpq icu-libs libzip \
 && apk del libpq-dev icu-dev libzip-dev

# Opcache tuning
RUN echo "opcache.enable=1\nopcache.memory_consumption=128\nopcache.validate_timestamps=0\nopcache.max_accelerated_files=10000" \
    > /usr/local/etc/php/conf.d/opcache-tuning.ini

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Dependencies (cached layer)
COPY api/composer.json api/composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

# Source code
COPY api/ .

# Finalize autoloader + dump env
RUN composer dump-autoload --optimize --no-dev

# Config files
COPY api/docker/nginx.conf /etc/nginx/nginx.conf.template
COPY api/docker/php-fpm.conf /usr/local/etc/php-fpm.d/zz-www.conf
COPY api/docker/supervisord.conf /etc/supervisord.conf
COPY api/docker/start.sh /start.sh

RUN chmod +x /start.sh \
 && mkdir -p /var/log/nginx /run/nginx /var/log/supervisor \
 && mkdir -p var/cache var/log \
 && chmod -R 777 var/

EXPOSE 8080

CMD ["/start.sh"]
