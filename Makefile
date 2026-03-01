#   ────────
# SecureChat Docker Makefile
# Usage: make <command>
#   ────────

.PHONY: help build up down restart logs shell migrate fresh seed setup

# Default: show help
help:
	@echo ""
	@echo "  SecureChat Docker Commands"
	@echo "  ─────────────────────────────────────────"
	@echo "  make setup     → Full first-time setup"
	@echo "  make build     → Build Docker images"
	@echo "  make up        → Start all containers"
	@echo "  make down      → Stop all containers"
	@echo "  make restart   → Restart all containers"
	@echo "  make logs      → Tail all container logs"
	@echo "  make shell     → Open shell in app container"
	@echo "  make migrate   → Run database migrations"
	@echo "  make fresh     → Fresh migrate + seed"
	@echo "  make npm-build → Build React/Vite frontend"
	@echo ""

# ─── First-Time Setup   ─
setup:
	@echo "→ Copying .env file..."
	cp -n .env.docker.example .env || true
	@echo "→ Building Docker images..."
	docker-compose build
	@echo "→ Starting containers..."
	docker-compose up -d
	@echo "→ Installing PHP dependencies..."
	docker-compose exec app composer install
	@echo "→ Generating app key..."
	docker-compose exec app php artisan key:generate
	@echo "→ Installing Node dependencies..."
	docker-compose exec app npm install
	@echo "→ Building React frontend..."
	docker-compose exec app npm run build
	@echo "→ Running migrations..."
	docker-compose exec app php artisan migrate
	@echo "→ Linking storage..."
	docker-compose exec app php artisan storage:link
	@echo ""
	@echo "✅ Setup complete! Visit http://localhost"

# ─── Docker Lifecycle   ─
build:
	docker-compose build

up:
	docker-compose up -d

down:
	docker-compose down

restart:
	docker-compose restart

# ─── Logs
logs:
	docker-compose logs -f

logs-app:
	docker-compose logs -f app

logs-reverb:
	docker-compose logs -f reverb

logs-worker:
	docker-compose logs -f worker

# ─── Shell Access   ─
shell:
	docker-compose exec app bash

shell-mysql:
	docker-compose exec mysql mysql -u securechat -psecret securechat

# ─── Laravel Commands   ─
migrate:
	docker-compose exec app php artisan migrate

fresh:
	docker-compose exec app php artisan migrate:fresh --seed

seed:
	docker-compose exec app php artisan db:seed

cache-clear:
	docker-compose exec app php artisan config:clear
	docker-compose exec app php artisan cache:clear
	docker-compose exec app php artisan route:clear
	docker-compose exec app php artisan view:clear

# ─── Frontend   ─────
npm-build:
	docker-compose exec app npm run build

npm-install:
	docker-compose exec app npm install
