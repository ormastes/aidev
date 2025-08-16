# Makefile for QEMU Manager - init_qemu theme

.PHONY: help setup start stop restart status build test debug vscode ssh clean

# Default configuration
QEMU_CONFIG ?= config/qemu-config.json
PROJECT_ROOT ?= $(shell pwd)/../../../
IMAGE ?= ubuntu-22.04.qcow2
MEMORY ?= 4G
CPUS ?= 4

# Python interpreter
PYTHON := python3

# Manager script
MANAGER := scripts/qemu_manager.py

help: ## Show this help message
	@echo "QEMU Manager for init_qemu theme"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'
	@echo ""
	@echo "Environment Variables:"
	@echo "  QEMU_CONFIG    - Configuration file (default: config/qemu-config.json)"
	@echo "  PROJECT_ROOT   - Project root directory (default: ../../../)"
	@echo "  IMAGE          - QEMU image file (default: ubuntu-22.04.qcow2)"
	@echo "  MEMORY         - Memory size (default: 4G)"
	@echo "  CPUS           - Number of CPUs (default: 4)"

setup: ## Setup QEMU image and environment
	@echo "Setting up QEMU environment..."
	@chmod +x scripts/setup_qemu_image.sh
	@cd scripts && ./setup_qemu_image.sh $(IMAGE)

start: ## Start QEMU VM (use MODE=ssh-build|remote-debug|vscode-server)
	@echo "Starting QEMU VM..."
	$(PYTHON) $(MANAGER) start \
		--config $(QEMU_CONFIG) \
		--project-root $(PROJECT_ROOT) \
		--image $(IMAGE) \
		--memory $(MEMORY) \
		--cpus $(CPUS) \
		--mode $(or $(MODE),ssh-build)

stop: ## Stop QEMU VM
	@echo "Stopping QEMU VM..."
	$(PYTHON) $(MANAGER) stop --config $(QEMU_CONFIG)

restart: ## Restart QEMU VM
	@echo "Restarting QEMU VM..."
	$(PYTHON) $(MANAGER) restart \
		--config $(QEMU_CONFIG) \
		--project-root $(PROJECT_ROOT) \
		$(if $(MODE),--mode $(MODE))

status: ## Check QEMU VM status
	@$(PYTHON) $(MANAGER) status --config $(QEMU_CONFIG)

build: ## Build project in VM
	@echo "Building project in VM..."
	$(PYTHON) $(MANAGER) build \
		--config $(QEMU_CONFIG) \
		--project-root $(PROJECT_ROOT)

test: ## Run tests in VM
	@echo "Running tests in VM..."
	$(PYTHON) $(MANAGER) test \
		--config $(QEMU_CONFIG) \
		--project-root $(PROJECT_ROOT)

debug: ## Start remote debugging (use PROGRAM=/path/to/program)
	@if [ -z "$(PROGRAM)" ]; then \
		echo "Error: PROGRAM not specified"; \
		echo "Usage: make debug PROGRAM=/path/to/program"; \
		exit 1; \
	fi
	@echo "Starting remote debugging for $(PROGRAM)..."
	$(PYTHON) $(MANAGER) debug $(PROGRAM) \
		--config $(QEMU_CONFIG) \
		--project-root $(PROJECT_ROOT)

vscode: ## Start VSCode server in VM
	@echo "Starting VSCode server..."
	$(PYTHON) $(MANAGER) vscode \
		--config $(QEMU_CONFIG) \
		--project-root $(PROJECT_ROOT)

vscode-install: ## Install VSCode server in VM
	@echo "Installing VSCode server..."
	$(PYTHON) $(MANAGER) vscode --install \
		--config $(QEMU_CONFIG) \
		--project-root $(PROJECT_ROOT)

ssh: ## SSH into VM (use CMD="command" to run command)
	@$(PYTHON) $(MANAGER) ssh $(CMD) \
		--config $(QEMU_CONFIG) \
		--project-root $(PROJECT_ROOT)

ssh-interactive: ## Open interactive SSH session
	@ssh -p 2222 \
		-o StrictHostKeyChecking=no \
		-o UserKnownHostsFile=/dev/null \
		ubuntu@localhost

vnc: ## Connect to VM via VNC
	@echo "Connecting to VNC display :1 (port 5901)..."
	@if command -v vncviewer >/dev/null 2>&1; then \
		vncviewer localhost:5901; \
	elif command -v vinagre >/dev/null 2>&1; then \
		vinagre localhost:5901; \
	else \
		echo "No VNC viewer found. Install with: sudo apt-get install tigervnc-viewer"; \
		echo "Then connect to localhost:5901"; \
	fi

monitor: ## Connect to QEMU monitor
	@echo "Connecting to QEMU monitor..."
	@echo "Commands: info status, system_powerdown, quit"
	@socat - UNIX-CONNECT:/tmp/aidev-qemu.sock

logs: ## Show VM console output
	@echo "Showing VM console output (if available)..."
	@if [ -f /tmp/aidev-qemu.log ]; then \
		tail -f /tmp/aidev-qemu.log; \
	else \
		echo "No log file found"; \
	fi

clean: ## Clean up temporary files and state
	@echo "Cleaning up..."
	@rm -f /tmp/aidev-qemu.pid
	@rm -f /tmp/aidev-qemu.sock
	@rm -f /tmp/aidev-qemu.state
	@rm -f cloud-init.iso
	@echo "Clean complete"

clean-all: clean ## Remove all including images
	@echo "Removing QEMU images..."
	@rm -f *.qcow2
	@rm -f *.iso
	@echo "All cleaned"

# Development shortcuts
dev-start: ## Start in development mode with VSCode
	@$(MAKE) start MODE=vscode-server

dev-debug: ## Start in debug mode
	@$(MAKE) start MODE=remote-debug

dev-build: start build ## Start VM and build

dev-test: start test ## Start VM and run tests

# Quick access commands
qs: start ## Quick start
	@echo "VM started"

qss: ssh-interactive ## Quick SSH

qst: stop ## Quick stop

# Status check
check: ## Check all dependencies
	@echo "Checking dependencies..."
	@command -v qemu-system-x86_64 >/dev/null 2>&1 && echo "✓ QEMU installed" || echo "✗ QEMU not installed"
	@command -v qemu-img >/dev/null 2>&1 && echo "✓ qemu-img installed" || echo "✗ qemu-img not installed"
	@command -v python3 >/dev/null 2>&1 && echo "✓ Python3 installed" || echo "✗ Python3 not installed"
	@command -v ssh >/dev/null 2>&1 && echo "✓ SSH installed" || echo "✗ SSH not installed"
	@command -v socat >/dev/null 2>&1 && echo "✓ socat installed" || echo "✗ socat not installed"
	@[ -f $(IMAGE) ] && echo "✓ Image $(IMAGE) exists" || echo "✗ Image $(IMAGE) not found"
	@[ -f $(QEMU_CONFIG) ] && echo "✓ Config $(QEMU_CONFIG) exists" || echo "✗ Config $(QEMU_CONFIG) not found"

# Installation helpers
install-deps: ## Install required dependencies
	@echo "Installing dependencies..."
	sudo apt-get update
	sudo apt-get install -y qemu-system-x86 qemu-utils \
		python3 python3-pip ssh socat \
		tigervnc-viewer genisoimage

install-python-deps: ## Install Python dependencies
	@echo "Installing Python dependencies..."
	uv pip install --user dataclasses typing