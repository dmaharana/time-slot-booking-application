# Time Slot Booking Server Makefile

# Variables
APP_NAME := time-slot-booking
BIN_DIR := bin
SRC_DIR := .
BUILD_DIR := $(BIN_DIR)
CMD_DIR := cmd/server
MAIN_FILE := $(CMD_DIR)/main.go
LDFLAGS := -ldflags "-w -s -extldflags '-static'" # Compression flags for smaller binary

# Go specific variables
GOCMD := go
GOBUILD := $(GOCMD) build $(LDFLAGS)
GOCLEAN := $(GOCMD) clean
GOTEST := $(GOCMD) test
GOGET := $(GOCMD) get
GOMOD := $(GOCMD) mod
GOFMT := gofmt -s
GOLINT := golangci-lint

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[1;33m
BLUE := \033[0;34m
NC := \033[0m # No Color

.PHONY: all build clean test coverage lint fmt vet run dev help setup

# Default target
all: clean lint test build

## build: Build the application with compression
build: $(BUILD_DIR)/$(APP_NAME)

$(BUILD_DIR)/$(APP_NAME): $(MAIN_FILE) go.mod go.sum
	@echo "$(BLUE)Building application with compression flags...$(NC)"
	@mkdir -p $(BUILD_DIR)
	$(GOBUILD) -o $(BUILD_DIR)/$(APP_NAME) $(MAIN_FILE)
	@echo "$(GREEN)✓ Build completed successfully$(NC)"
	@ls -lh $(BUILD_DIR)/$(APP_NAME)

## dev: Build and run in development mode
dev: $(BUILD_DIR)/$(APP_NAME)
	@echo "$(BLUE)Starting development server...$(NC)"
	@$(BUILD_DIR)/$(APP_NAME)

## run: Run the application without building
run:
	@echo "$(BLUE)Running application...$(NC)"
	$(GOCMD) run $(MAIN_FILE)

## test: Run all tests
test:
	@echo "$(BLUE)Running tests...$(NC)"
	$(GOTEST) -v ./...
	@echo "$(GREEN)✓ All tests passed$(NC)"

## test-coverage: Run tests with coverage report
test-coverage:
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	$(GOTEST) -v -coverprofile=coverage.out ./...
	$(GOCMD) tool cover -html=coverage.out -o coverage.html
	@echo "$(GREEN)✓ Coverage report generated: coverage.html$(NC)"

## benchmark: Run benchmarks
benchmark:
	@echo "$(BLUE)Running benchmarks...$(NC)"
	$(GOTEST) -bench=. -benchmem ./...

## lint: Lint the code
lint:
	@echo "$(BLUE)Running linter...$(NC)"
	@if command -v $(GOLINT) >/dev/null 2>&1; then \
		$(GOLINT) run ./...; \
		echo "$(GREEN)✓ Linting completed$(NC)"; \
	else \
		echo "$(YELLOW)⚠ golangci-lint not found. Install with: go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest$(NC)"; \
	fi

## fmt: Format Go code
fmt:
	@echo "$(BLUE)Formatting code...$(NC)"
	$(GOFMT) -s -w .
	@echo "$(GREEN)✓ Code formatted$(NC)"

## vet: Run go vet
vet:
	@echo "$(BLUE)Running go vet...$(NC)"
	$(GOCMD) vet ./...
	@echo "$(GREEN)✓ Vet completed$(NC)"

## clean: Clean build artifacts
clean:
	@echo "$(BLUE)Cleaning build artifacts...$(NC)"
	$(GOCLEAN)
	rm -rf $(BUILD_DIR)
	rm -f coverage.out coverage.html
	@echo "$(GREEN)✓ Clean completed$(NC)"

## setup: Setup development environment
setup:
	@echo "$(BLUE)Setting up development environment...$(NC)"
	@echo "$(YELLOW)1. Installing dependencies...$(NC)"
	$(GOMOD) tidy
	@echo "$(YELLOW)2. Setting up pre-commit hooks...$(NC)"
	@if command -v pre-commit >/dev/null 2>&1; then \
		pre-commit install; \
	else \
		echo "$(YELLOW)⚠ pre-commit not found. Install with: pip install pre-commit$(NC)"; \
	fi
	@echo "$(GREEN)✓ Setup completed$(NC)"

## deps: Download dependencies
deps:
	@echo "$(BLUE)Downloading dependencies...$(NC)"
	$(GOMOD) download
	$(GOMOD) verify
	@echo "$(GREEN)✓ Dependencies ready$(NC)"

## tools: Install development tools
tools:
	@echo "$(BLUE)Installing development tools...$(NC)"
	@echo "$(YELLOW)Installing golangci-lint...$(NC)"
	@go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	@echo "$(YELLOW)Installing goimports...$(NC)"
	@go install golang.org/x/tools/cmd/goimports@latest
	@echo "$(YELLOW)Installing mockgen...$(NC)"
	@go install github.com/golang/mock/mockgen@latest
	@echo "$(GREEN)✓ Development tools installed$(NC)"

## docker-build: Build Docker image
docker-build:
	@echo "$(BLUE)Building Docker image...$(NC)"
	docker build -t $(APP_NAME):latest .
	@echo "$(GREEN)✓ Docker image built$(NC)"

## docker-run: Run application in Docker
docker-run: docker-build
	@echo "$(BLUE)Running application in Docker...$(NC)"
	docker run --rm -p 8080:8080 $(APP_NAME):latest

## migrate-up: Run database migrations
migrate-up:
	@echo "$(BLUE)Running database migrations...$(NC)"
	@echo "$(YELLOW)Note: This requires a running PostgreSQL database$(NC)"
	@$(GOCMD) run $(MAIN_FILE) --migrate

## migrate-down: Rollback database migrations
migrate-down:
	@echo "$(BLUE)Rolling back database migrations...$(NC)"
	@echo "$(YELLOW)Note: This requires a running PostgreSQL database$(NC)"
	@$(GOCMD) run $(MAIN_FILE) --migrate-down

## db-setup: Setup local database
db-setup:
	@echo "$(BLUE)Setting up local database...$(NC)"
	@echo "$(YELLOW)Starting PostgreSQL with Docker...$(NC)"
	@docker run --name $(APP_NAME)-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=timeslot_booking -p 5432:5432 -d postgres:15
	@echo "$(YELLOW)Waiting for database to be ready...$(NC)"
	@sleep 5
	@echo "$(GREEN)✓ Database setup completed$(NC)"
	@echo "$(YELLOW)Connection: postgresql://postgres:password@localhost:5432/timeslot_booking$(NC)"

## db-stop: Stop local database
db-stop:
	@echo "$(BLUE)Stopping local database...$(NC)"
	@docker stop $(APP_NAME)-db || true
	@docker rm $(APP_NAME)-db || true
	@echo "$(GREEN)✓ Database stopped$(NC)"

## db-reset: Reset local database
db-reset: db-stop db-setup

## security-scan: Run security vulnerability scan
security-scan:
	@echo "$(BLUE)Running security scan...$(NC)"
	@if command -v gosec >/dev/null 2>&1; then \
		gosec ./...; \
	else \
		echo "$(YELLOW)⚠ gosec not found. Install with: go install github.com/securecodewarrior/gosec/v2/cmd/gosec@latest$(NC)"; \
	fi

## profile: Build with profiling enabled
profile: $(BUILD_DIR)/$(APP_NAME)-profile
	@echo "$(BLUE)Starting application with profiling...$(NC)"
	@$(BUILD_DIR)/$(APP_NAME)-profile

$(BUILD_DIR)/$(APP_NAME)-profile: $(MAIN_FILE) go.mod go.sum
	@echo "$(BLUE)Building application with profiling...$(NC)"
	@mkdir -p $(BUILD_DIR)
	$(GOCMD) build -o $(BUILD_DIR)/$(APP_NAME)-profile $(MAIN_FILE)
	@echo "$(GREEN)✓ Profile build completed$(NC)"

## help: Show this help message
help:
	@echo "$(BLUE)Available commands:$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Build flags used:$(NC)"
	@echo "  -w: Strip symbol table"
	@echo "  -s: Strip debug information"
	@echo "  Result: Smaller binary size with minimal functionality impact"
	@echo ""
	@echo "$(YELLOW)Environment variables:$(NC)"
	@echo "  PORT: Server port (default: :8080)"
	@echo "  DATABASE_URL: PostgreSQL connection string"
	@echo "  ENVIRONMENT: Environment (development/production)"
	@echo "  LOG_LEVEL: Logging level (debug/info/warn/error)"