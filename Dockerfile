FROM php:8.2-fpm

#  System Dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    unzip \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    zip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

#  PHP Extensions
# pdo_mysql   → database
# mbstring    → Laravel string helpers
# exif        → image handling
# pcntl       → required by Laravel Reverb (WebSockets)
# zip         → composer packages
# bcmath      → Laravel encryption / math
RUN docker-php-ext-install \
    pdo_mysql \
    mbstring \
    exif \
    pcntl \
    zip \
    bcmath

# Redis extension (for Laravel cache & queues via predis/redis)
RUN pecl install redis \
    && docker-php-ext-enable redis

# Node.js 20 (for npm run build inside container)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

#  Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Working Directory
WORKDIR /var/www

# Copy Project Files
COPY . .

#Set Permissions
RUN chown -R www-data:www-data /var/www \
    && chmod -R 755 /var/www/storage \
    && chmod -R 755 /var/www/bootstrap/cache

EXPOSE 9000

CMD ["php-fpm"]
