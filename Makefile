.PHONY: help up down restart logs backend-logs frontend-logs clean build ingest-faq test check-env-sync deploy-infra deployed-logs

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

up: ## Start all services
	docker compose up -d

up-build: ## Build and start all services
	docker compose up -d --build

down: ## Stop all services
	docker compose down

restart: ## Restart all services
	docker compose restart

logs: ## View logs for all services
	docker compose logs -f

backend-logs: ## View backend logs
	docker compose logs -f backend

frontend-logs: ## View frontend logs
	docker compose logs -f frontend

clean: ## Stop services and remove volumes
	docker compose down -v

build: ## Build all services
	docker compose build

ingest-faq: ## Run FAQ ingestion (requires API keys in .env)
	INGEST_FAQ=true docker compose up backend --build

test-backend: ## Test backend API
	docker compose exec backend python test_api.py

shell-backend: ## Open shell in backend container
	docker compose exec backend /bin/bash

shell-mongodb: ## Open MongoDB shell
	docker compose exec mongodb mongosh eloquent_chatbot

ps: ## Show running containers
	docker compose ps

setup: ## Initial setup - copy .env.example and show instructions
	@if [ ! -f backend/.env ]; then \
		cp .env.example backend/.env; \
		echo "✅ Created backend/.env from .env.example"; \
		echo ""; \
		echo "⚠️  IMPORTANT: Edit backend/.env and add your API keys:"; \
		echo "   - OPENAI_API_KEY"; \
		echo "   - PINECONE_API_KEY"; \
		echo "   - PINECONE_ENVIRONMENT"; \
		echo ""; \
		echo "Then run: make up-build"; \
	else \
		echo "backend/.env already exists"; \
	fi

# AWS Deployment targets
check-env-sync: ## Check if .env.dev is in sync with deployed ECS configuration
	@cd scripts && ./check-env-sync.sh

deploy-infra: ## Deploy infrastructure changes to AWS
	@cd infrastructure && \
	export CDK_DEFAULT_ACCOUNT=$${AWS_ACCOUNT_ID:-$$(aws sts get-caller-identity --query Account --output text)} && \
	export CDK_DEFAULT_REGION=$${AWS_REGION:-us-east-1} && \
	export ENVIRONMENT=dev && \
	export ENABLE_DNS=true && \
	export DOMAIN_NAME=tadeutupinamba.com && \
	export SUBDOMAIN_NAME=api && \
	cdk deploy EloquentEcsStack --require-approval never

deployed-logs: ## View logs from deployed backend in AWS CloudWatch
	@echo "📋 Tailing logs from deployed backend (last 10 minutes)..."
	@echo "Press Ctrl+C to stop"
	@aws logs tail /ecs/eloquent-backend-dev --follow --format short --since 10m

deployed-logs-errors: ## View only ERROR logs from deployed backend
	@aws logs tail /ecs/eloquent-backend-dev --follow --format short --filter-pattern "ERROR"
