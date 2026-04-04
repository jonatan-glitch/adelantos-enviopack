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
COPY api/composer.json api/composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

# Copy API source
COPY api/ .

# Finalize autoloader
RUN composer dump-autoload --optimize --no-dev

# ────────────────────────────────────────────────────────────
FROM php:8.2-fpm-alpine AS runtime

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

WORKDIR /app

# Copy built app
COPY --from=builder /app /app

# Nginx config template (PORT injected at runtime by Railway)
COPY api/docker/nginx.conf.template /etc/nginx/nginx.conf.template

# PHP-FPM
COPY api/docker/php-fpm.conf /usr/local/etc/php-fpm.d/www.conf

# Supervisord
COPY api/docker/supervisord.conf /etc/supervisord.conf

# Startup script
COPY api/docker/start.sh /start.sh
RUN chmod +x /start.sh

RUN mkdir -p /var/log/nginx /run/nginx /var/log/supervisor

# Symfony dirs
RUN mkdir -p var/cache var/log \
 && chmod -R 777 var/

EXPOSE 8080

CMD ["/start.sh"]
