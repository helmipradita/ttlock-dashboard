.DEFAULT_GOAL := help

# Colors for terminal output
CYAN  := \033[36m
GREEN := \033[32m
RESET := \033[0m

.PHONY: help setup up down restart build rebuild rebuild-web rebuild-backend logs logs-backend logs-web ps test lint clean

help: ## Show this help menu
	@printf "\n$(CYAN)TTLOCK Fleet Telemetry & Operations Dashboard$(RESET)\n"
	@printf "Available make commands:\n\n"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(GREEN)%-18s$(RESET) %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@printf "\n"

setup: ## Initialize backend/.env from template if missing
	@if [ ! -f backend/.env ]; then \
		cp backend/.env.example backend/.env; \
		printf "$(GREEN)Created backend/.env from template.$(RESET) Please update credentials in backend/.env\n"; \
	else \
		printf "$(CYAN)backend/.env already exists.$(RESET)\n"; \
	fi

up: setup ## Launch all containers in detached background mode
	docker compose up -d

down: ## Stop and remove all containers and networks (data preserved)
	docker compose down

restart: ## Restart both backend and frontend containers
	docker compose restart

build: ## Build docker images without cache
	docker compose build --no-cache

rebuild: ## Rebuild images and start containers
	docker compose up -d --build

rebuild-web: ## Rebuild only web-nginx container (frontend UI changes)
	docker compose up -d --build web-nginx

rebuild-backend: ## Rebuild only backend container (Express API changes)
	docker compose up -d --build backend

logs: ## Stream live logs from all containers
	docker compose logs -f

logs-backend: ## Stream live logs from backend container
	docker compose logs -f backend

logs-web: ## Stream live logs from web-nginx container
	docker compose logs -f web-nginx

ps: ## Check running containers and port status
	docker compose ps

test: ## Execute all unit test suites (backend & web)
	(cd backend && npm test) && (cd web && npm test)

lint: ## Execute linter across web frontend
	cd web && npm run lint

clean: ## Stop containers and remove orphan networks/containers
	docker compose down --remove-orphans
