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

# Install deps (cached layer)
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

# Cache bust — increment to force full rebuild
ARG CACHE_BUST=5

# Copy source
COPY . .

# Finalize autoloader
RUN composer dump-autoload --optimize --no-dev

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

# PHP-FPM pool config (zz-docker.conf already removed above)
COPY docker/php-fpm.conf /usr/local/etc/php-fpm.d/www.conf

# Supervisord config
COPY docker/supervisord.conf /etc/supervisord.conf

# Startup script
COPY docker/start.sh /start.sh
RUN chmod +x /start.sh

RUN mkdir -p /var/log/nginx /run/nginx /var/log/supervisor /run/php-fpm

# Symfony cache/logs dirs
RUN mkdir -p var/cache var/log \
 && chmod -R 777 var/

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=3 \
    CMD wget -qO- http://127.0.0.1:${PORT:-8080}/ping | grep -q pong || exit 1

CMD ["/start.sh"]
