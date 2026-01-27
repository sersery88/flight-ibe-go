.PHONY: build run test clean docker

# Build the application
build:
	go build -o bin/flight-ibe-go ./cmd/server

# Run locally
run:
	go run ./cmd/server

# Run with hot reload (requires air)
dev:
	air

# Run tests
test:
	go test -v ./...

# Clean build artifacts
clean:
	rm -rf bin/

# Download dependencies
deps:
	go mod download
	go mod tidy

# Build Docker image
docker:
	docker build -t flight-ibe-go .

# Run Docker container
docker-run:
	docker run -p 8080:8080 --env-file .env flight-ibe-go

# Format code
fmt:
	go fmt ./...

# Lint (requires golangci-lint)
lint:
	golangci-lint run
