.PHONY: all build run test lint clean docker docker-up docker-down deps tidy fmt vet

# Variables
BINARY_NAME=flight-ibe
MAIN_PATH=./cmd/server
GO=go
DOCKER_COMPOSE=docker compose

# Build
all: deps lint test build

build:
	$(GO) build -o $(BINARY_NAME) $(MAIN_PATH)

build-linux:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 $(GO) build -o $(BINARY_NAME)-linux $(MAIN_PATH)

# Run
run:
	$(GO) run $(MAIN_PATH)

run-dev:
	LOG_LEVEL=debug $(GO) run $(MAIN_PATH)

# Test
test:
	$(GO) test -v -race -cover ./...

test-coverage:
	$(GO) test -v -race -coverprofile=coverage.out ./...
	$(GO) tool cover -html=coverage.out -o coverage.html

benchmark:
	$(GO) test -bench=. -benchmem ./...

# Dependencies
deps:
	$(GO) mod download

tidy:
	$(GO) mod tidy

# Lint & Format
fmt:
	$(GO) fmt ./...
	gofmt -s -w .

vet:
	$(GO) vet ./...

lint: fmt vet
	@if command -v golangci-lint > /dev/null; then \
		golangci-lint run ./...; \
	else \
		echo "golangci-lint not installed, skipping"; \
	fi

# Clean
clean:
	rm -f $(BINARY_NAME) $(BINARY_NAME)-linux
	rm -f coverage.out coverage.html

# Docker
docker:
	docker build -t $(BINARY_NAME):latest .

docker-up:
	$(DOCKER_COMPOSE) up -d

docker-down:
	$(DOCKER_COMPOSE) down

docker-logs:
	$(DOCKER_COMPOSE) logs -f

docker-ps:
	$(DOCKER_COMPOSE) ps

# Development helpers
install-tools:
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	go install github.com/swaggo/swag/cmd/swag@latest

swagger:
	swag init -g cmd/server/main.go -o docs

# Generate
generate:
	$(GO) generate ./...

# Help
help:
	@echo "Flight IBE Go - Enterprise Flight Booking API"
	@echo ""
	@echo "Usage:"
	@echo "  make build          Build the binary"
	@echo "  make run            Run the application"
	@echo "  make run-dev        Run with debug logging"
	@echo "  make test           Run tests"
	@echo "  make test-coverage  Run tests with coverage"
	@echo "  make benchmark      Run benchmarks"
	@echo "  make lint           Run linters"
	@echo "  make fmt            Format code"
	@echo "  make docker         Build Docker image"
	@echo "  make docker-up      Start Docker Compose stack"
	@echo "  make docker-down    Stop Docker Compose stack"
	@echo "  make clean          Clean build artifacts"
	@echo "  make deps           Download dependencies"
	@echo "  make help           Show this help"
