.PHONY: help build build-prod up down logs shell clean test

# Default target
help:
	@echo "Available commands:"
	@echo "  make build       - Build development Docker image"
	@echo "  make build-prod  - Build production Docker image"
	@echo "  make up          - Start development containers"
	@echo "  make up-prod     - Start production containers"
	@echo "  make down        - Stop and remove containers"
	@echo "  make logs        - View container logs"
	@echo "  make shell       - Open shell in backend container"
	@echo "  make db-shell    - Open PostgreSQL shell"
	@echo "  make clean       - Remove all containers and volumes"
	@echo "  make test        - Run tests in container"

# Build development image
build:
	docker-compose -f docker-compose.dev.yml build

# Build production image
build-prod:
	docker build -f Dockerfile.production -t owui-feedback-backend:production .

# Start development containers
up:
	docker-compose -f docker-compose.dev.yml up -d

# Start production containers
up-prod:
	docker-compose up -d

# Stop containers
down:
	docker-compose -f docker-compose.dev.yml down
	docker-compose down

# View logs
logs:
	docker-compose -f docker-compose.dev.yml logs -f backend-dev

# Open shell in backend container
shell:
	docker-compose -f docker-compose.dev.yml exec backend-dev sh

# Open PostgreSQL shell
db-shell:
	docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d feedback_db

# Clean everything
clean:
	docker-compose -f docker-compose.dev.yml down -v
	docker-compose down -v
	docker system prune -f

# Run tests
test:
	docker-compose -f docker-compose.dev.yml exec backend-dev npm test