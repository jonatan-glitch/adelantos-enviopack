FROM php:8.2-fpm-alpine AS builder

# System deps
RUN apk add --no-cache \
    libpq-dev \
    icu-dev \
    libzip-dev \
    oniguruma-dev \
    autoconf \
    g++ \
    make

# PHP extensions
RUN docker-php-ext-install \
    pdo \
    pdo_pgsql \
    intl \
    zip \
    opcache

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Cache bust — increment to force full rebuild
ARG CACHE_BUST=48

# Set Symfony env vars BEFORE composer install so scripts don't fail
ENV APP_ENV=prod
ENV DATABASE_URL=postgresql://app:app@localhost/app?serverVersion=15
ENV APP_SECRET=build-time-placeholder
ENV COMPOSER_ALLOW_SUPERUSER=1

# Copy source
COPY . .

# Single composer install with all post-install steps
# (generates autoload.php, autoload_runtime.php, runs symfony scripts)
RUN composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader \
 && ls -la vendor/autoload_runtime.php

# ────────────────────────────────────────────────────────────
FROM php:8.2-fpm-alpine AS runtime

# Remove conflicting php-fpm pool files from base image immediately (before any cache kicks in)
RUN rm -f /usr/local/etc/php-fpm.d/zz-docker.conf \
       /usr/local/etc/php-fpm.d/www.conf.default \
       /usr/local/etc/php-fpm.d/www.conf

RUN apk add --no-cache \
    nginx \
    supervisor \
    libpq \
    icu-libs \
    libzip \
    gettext \
    bash

# PHP extensions (copy from builder)
COPY --from=builder /usr/local/lib/php/extensions /usr/local/lib/php/extensions
COPY --from=builder /usr/local/etc/php/conf.d /usr/local/etc/php/conf.d

# Opcache tuning
RUN echo "opcache.enable=1" >> /usr/local/etc/php/conf.d/opcache.ini \
 && echo "opcache.memory_consumption=128" >> /usr/local/etc/php/conf.d/opcache.ini \
 && echo "opcache.validate_timestamps=0" >> /usr/local/etc/php/conf.d/opcache.ini

# PHP upload limits
RUN echo "upload_max_filesize=20M" >> /usr/local/etc/php/conf.d/uploads.ini \
 && echo "post_max_size=25M" >> /usr/local/etc/php/conf.d/uploads.ini \
 && echo "memory_limit=256M" >> /usr/local/etc/php/conf.d/uploads.ini

WORKDIR /app

# Copy built app
COPY --from=builder /app /app

# Nginx config template (PORT is injected at runtime by Railway)
COPY docker/nginx.conf.template /etc/nginx/nginx.conf.template

# PHP-FPM pool config
COPY docker/php-fpm.conf /usr/local/etc/php-fpm.d/www.conf
# Override zz-docker.conf (loads after it alphabetically: zzz > zz)
COPY docker/zzz-override.conf /usr/local/etc/php-fpm.d/zzz-override.conf

# Supervisord config
COPY docker/supervisord.conf /etc/supervisord.conf

# Startup script
COPY docker/start.sh /start.sh
RUN chmod +x /start.sh

# Cron job — disponibilidad de choferes L-V 16hs AR (19 UTC)
COPY docker/crontab /etc/crontabs/root

RUN mkdir -p /var/log/nginx /run/nginx /var/log/supervisor /run/php-fpm /app/public/uploads \
 && chmod -R 777 /app/public/uploads

# Symfony cache/logs dirs
RUN mkdir -p var/cache var/log \
 && chmod -R 777 var/

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=3 \
    CMD wget -qO- http://127.0.0.1:${PORT:-8080}/ping | grep -q pong || exit 1

CMD ["/start.sh"]
