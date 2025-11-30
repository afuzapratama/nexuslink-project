# NexusLink Production Makefile
# Simplified commands for common operations

.PHONY: help build test deploy clean backup restore

# Default target
help:
	@echo "NexusLink Production Operations"
	@echo "================================"
	@echo ""
	@echo "Build & Development:"
	@echo "  make build-api          Build API binary"
	@echo "  make build-agent        Build Agent binary"
	@echo "  make build-all          Build both binaries"
	@echo "  make docker-build       Build Docker images"
	@echo "  make docker-up          Start Docker Compose (production)"
	@echo "  make docker-down        Stop Docker Compose"
	@echo ""
	@echo "Deployment:"
	@echo "  make deploy-api         Deploy API to production"
	@echo "  make deploy-agent       Deploy Agent to production"
	@echo "  make deploy-all         Deploy everything"
	@echo "  make setup-ssl          Setup SSL certificates"
	@echo ""
	@echo "Operations:"
	@echo "  make backup             Backup DynamoDB tables"
	@echo "  make restore            Restore from backup"
	@echo "  make logs-api           View API logs"
	@echo "  make logs-agent         View Agent logs"
	@echo "  make restart-api        Restart API service"
	@echo "  make restart-agent      Restart Agent service"
	@echo "  make status             Check all services status"
	@echo ""
	@echo "Testing:"
	@echo "  make test               Run tests"
	@echo "  make test-integration   Run integration tests"
	@echo "  make health-check       Check all health endpoints"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean              Clean build artifacts"
	@echo "  make clean-logs         Clean old logs"
	@echo "  make update             Pull latest code and rebuild"
	@echo ""

# Build targets
build-api:
	@echo "Building API binary..."
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
		-ldflags='-w -s -extldflags "-static"' \
		-o nexus-api \
		./cmd/api/main.go
	@echo "✅ API binary built: nexus-api"

build-agent:
	@echo "Building Agent binary..."
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
		-ldflags='-w -s -extldflags "-static"' \
		-o nexus-agent \
		./cmd/agent/main.go
	@echo "✅ Agent binary built: nexus-agent"

build-all: build-api build-agent
	@echo "✅ All binaries built"

# Docker targets
docker-build:
	@echo "Building Docker images..."
	docker build -f Dockerfile.api -t nexuslink-api:latest .
	docker build -f Dockerfile.agent -t nexuslink-agent:latest .
	@echo "✅ Docker images built"

docker-up:
	@echo "Starting Docker Compose (production)..."
	docker-compose -f docker-compose.prod.yml up -d
	@echo "✅ Services started"
	@echo "Run 'make docker-logs' to view logs"

docker-down:
	@echo "Stopping Docker Compose..."
	docker-compose -f docker-compose.prod.yml down
	@echo "✅ Services stopped"

docker-logs:
	docker-compose -f docker-compose.prod.yml logs -f

# Deployment targets
deploy-api:
	@echo "Deploying API..."
	sudo bash deployment/scripts/deploy.sh api
	@echo "✅ API deployed"

deploy-agent:
	@echo "Deploying Agent..."
	sudo bash deployment/scripts/deploy.sh agent
	@echo "✅ Agent deployed"

deploy-all:
	@echo "Deploying all components..."
	sudo bash deployment/scripts/deploy.sh all
	@echo "✅ All components deployed"

setup-ssl:
	@echo "Setting up SSL certificates..."
	@read -p "Enter API domain (e.g., api.yourdomain.com): " domain; \
	sudo bash deployment/scripts/setup-ssl.sh $$domain api
	@read -p "Enter Agent domain (e.g., short.yourdomain.com): " domain; \
	sudo bash deployment/scripts/setup-ssl.sh $$domain agent

# Operations targets
backup:
	@echo "Backing up DynamoDB tables..."
	bash deployment/scripts/backup-dynamodb.sh
	@echo "✅ Backup complete"

restore:
	@echo "Restore from backup"
	@read -p "Enter backup ARN: " arn; \
	read -p "Enter target table name: " table; \
	bash deployment/scripts/restore-dynamodb.sh $$arn $$table

logs-api:
	@echo "Viewing API logs (Ctrl+C to exit)..."
	sudo journalctl -u nexuslink-api -f

logs-agent:
	@echo "Viewing Agent logs (Ctrl+C to exit)..."
	sudo journalctl -u nexuslink-agent -f

restart-api:
	@echo "Restarting API service..."
	sudo systemctl restart nexuslink-api
	@echo "✅ API restarted"
	@make health-check-api

restart-agent:
	@echo "Restarting Agent service..."
	sudo systemctl restart nexuslink-agent
	@echo "✅ Agent restarted"
	@make health-check-agent

status:
	@echo "Checking service status..."
	@echo ""
	@echo "API Service:"
	@sudo systemctl status nexuslink-api --no-pager || true
	@echo ""
	@echo "Agent Service:"
	@sudo systemctl status nexuslink-agent --no-pager || true
	@echo ""
	@echo "Redis Service:"
	@sudo systemctl status redis-server --no-pager || true
	@echo ""
	@echo "Nginx Service:"
	@sudo systemctl status nginx --no-pager || true

# Testing targets
test:
	@echo "Running tests..."
	go test -v ./...

test-integration:
	@echo "Running integration tests..."
	bash test-features.sh

health-check:
	@make health-check-api
	@make health-check-agent

health-check-api:
	@echo "Checking API health..."
	@curl -s http://localhost:8080/health && echo "✅ API is healthy" || echo "❌ API is down"

health-check-agent:
	@echo "Checking Agent health..."
	@curl -s http://localhost:9090/health && echo "✅ Agent is healthy" || echo "❌ Agent is down"

# Maintenance targets
clean:
	@echo "Cleaning build artifacts..."
	rm -f nexus-api nexus-agent api main
	@echo "✅ Clean complete"

clean-logs:
	@echo "Cleaning old logs..."
	sudo find /var/log/nexuslink -name "*.log" -mtime +30 -delete
	@echo "✅ Old logs cleaned"

update:
	@echo "Pulling latest code..."
	git pull origin main
	@echo "Rebuilding binaries..."
	@make build-all
	@echo "Restarting services..."
	@make restart-api
	@make restart-agent
	@echo "✅ Update complete"

# Development targets (local)
dev-api:
	@echo "Starting API in development mode..."
	go run ./cmd/api/main.go

dev-agent:
	@echo "Starting Agent in development mode..."
	go run ./cmd/agent/main.go

dev-docker:
	@echo "Starting development environment with Docker..."
	docker-compose up -d
	@echo "✅ Development environment started"
	@echo "DynamoDB: http://localhost:8000"
	@echo "DynamoDB Admin: http://localhost:8001"
	@echo "Redis: localhost:6379"
