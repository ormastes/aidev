#!/bin/bash

# Docker Setup Script for Compiler-Specific Libraries and Development
# Configures Docker environments for different languages and compilers

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DOCKER_DIR="docker_environments"
DOCKERFILES_DIR="$DOCKER_DIR/dockerfiles"
COMPOSE_DIR="$DOCKER_DIR/compose"
SCRIPTS_DIR="$DOCKER_DIR/scripts"

# Log function
log() {
    case $1 in
        INFO) echo -e "${BLUE}[INFO]${NC} $2" ;;
        SUCCESS) echo -e "${GREEN}[SUCCESS]${NC} $2" ;;
        WARNING) echo -e "${YELLOW}[WARNING]${NC} $2" ;;
        ERROR) echo -e "${RED}[ERROR]${NC} $2" ;;
    esac
}

# Create directory structure
setup_directories() {
    log INFO "Creating Docker directory structure..."
    mkdir -p "$DOCKERFILES_DIR"/{typescript,python,cpp,clang}
    mkdir -p "$COMPOSE_DIR"
    mkdir -p "$SCRIPTS_DIR"
    log SUCCESS "Directories created"
}

# Check Docker installation
check_docker() {
    log INFO "Checking Docker installation..."
    
    if command -v docker &> /dev/null; then
        log SUCCESS "Docker $(docker --version) found"
    else
        log ERROR "Docker not found. Please install Docker first."
        log INFO "Visit: https://docs.docker.com/get-docker/"
        return 1
    fi
    
    if command -v docker-compose &> /dev/null; then
        log SUCCESS "Docker Compose found"
    else
        log WARNING "Docker Compose not found. Some features may be limited."
    fi
    
    # Check if Docker daemon is running
    if docker info &> /dev/null; then
        log SUCCESS "Docker daemon is running"
    else
        log ERROR "Docker daemon is not running. Please start Docker."
        return 1
    fi
}

# Create TypeScript/Node.js Docker configuration
create_typescript_docker() {
    log INFO "Creating TypeScript/Node.js Docker configuration..."
    
    # Development Dockerfile
    cat > "$DOCKERFILES_DIR/typescript/Dockerfile.dev" << 'EOF'
# TypeScript/Node.js Development Environment
FROM node:18-alpine AS development

# Install additional tools
RUN apk add --no-cache git bash curl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Expose common ports
EXPOSE 3000 3001 4200 8080

# Development command
CMD ["bun", "run", "dev"]
EOF
    
    # Production Dockerfile
    cat > "$DOCKERFILES_DIR/typescript/Dockerfile.prod" << 'EOF'
# TypeScript/Node.js Production Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN bun install --frozen-lockfile

# Copy source and build
COPY . .
RUN bun run build

# Production stage
FROM node:18-alpine AS production

RUN apk add --no-cache dumb-init

WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install production dependencies only
RUN bun install --frozen-lockfile --production

# Use non-root user
USER node

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/index.js"]
EOF
    
    # Hello World example
    cat > "$DOCKERFILES_DIR/typescript/hello.ts" << 'EOF'
console.log("Hello from TypeScript Docker!");

const server = require('http').createServer((req: any, res: any) => {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Hello from TypeScript Docker Server!\n');
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
EOF
    
    log SUCCESS "TypeScript Docker configuration created"
}

# Create Python Docker configuration
create_python_docker() {
    log INFO "Creating Python Docker configuration..."
    
    # Development Dockerfile
    cat > "$DOCKERFILES_DIR/python/Dockerfile.dev" << 'EOF'
# Python Development Environment
FROM python:3.11-slim AS development

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements
COPY requirements*.txt ./

# Install Python dependencies
RUN uv pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Expose common ports
EXPOSE 5000 8000 8080

# Development command
CMD ["python", "-m", "flask", "run", "--host=0.0.0.0", "--reload"]
EOF
    
    # Production Dockerfile with UV
    cat > "$DOCKERFILES_DIR/python/Dockerfile.uv" << 'EOF'
# Python with UV Package Manager
FROM python:3.11-slim AS builder

# Install UV
RUN uv pip install uv

WORKDIR /app

# Copy project files
COPY pyproject.toml uv.lock ./

# Install dependencies with UV
RUN uv sync

# Copy source code
COPY . .

# Production stage
FROM python:3.11-slim AS production

WORKDIR /app

# Copy virtual environment and app
COPY --from=builder /app/.venv ./.venv
COPY --from=builder /app .

# Use virtual environment
ENV PATH="/app/.venv/bin:$PATH"

# Run as non-root
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

CMD ["python", "main.py"]
EOF
    
    # Hello World example
    cat > "$DOCKERFILES_DIR/python/hello.py" << 'EOF'
#!/usr/bin/env python3
print("Hello from Python Docker!")

from flask import Flask
app = Flask(__name__)

@app.route('/')
def hello():
    return "Hello from Python Docker Server!\n"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
EOF
    
    # Requirements file
    cat > "$DOCKERFILES_DIR/python/requirements.txt" << 'EOF'
flask>=2.0.0
pytest>=7.0.0
black>=22.0.0
pylint>=2.0.0
EOF
    
    log SUCCESS "Python Docker configuration created"
}

# Create C++ Docker configuration
create_cpp_docker() {
    log INFO "Creating C++ Docker configuration..."
    
    # GCC Dockerfile
    cat > "$DOCKERFILES_DIR/cpp/Dockerfile.gcc" << 'EOF'
# C++ Development with GCC
FROM gcc:11 AS builder

# Install build tools
RUN apt-get update && apt-get install -y \
    cmake \
    make \
    ninja-build \
    gdb \
    valgrind \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy source code
COPY . .

# Build application
RUN mkdir build && cd build && \
    cmake .. && \
    make -j$(nproc)

# Runtime stage
FROM debian:bullseye-slim AS runtime

RUN apt-get update && apt-get install -y \
    libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built binary
COPY --from=builder /app/build/hello /app/hello

CMD ["./hello"]
EOF
    
    # Clang Dockerfile
    cat > "$DOCKERFILES_DIR/clang/Dockerfile.clang" << 'EOF'
# C++ Development with Clang/LLVM
FROM silkeh/clang:15 AS builder

# Install additional tools
RUN apt-get update && apt-get install -y \
    cmake \
    ninja-build \
    lldb \
    clang-tidy \
    clang-format \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy source code
COPY . .

# Build with Clang
RUN mkdir build && cd build && \
    CC=clang CXX=clang++ cmake -G Ninja .. && \
    ninja

# Runtime stage
FROM debian:bullseye-slim AS runtime

RUN apt-get update && apt-get install -y \
    libstdc++6 \
    libc++1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy built binary
COPY --from=builder /app/build/hello /app/hello

CMD ["./hello"]
EOF
    
    # Clang Plugin Dockerfile
    cat > "$DOCKERFILES_DIR/clang/Dockerfile.plugin" << 'EOF'
# Clang Plugin Development Environment
FROM llvm:15 AS development

# Install development tools
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install LLVM development packages
RUN apt-get update && apt-get install -y \
    llvm-15-dev \
    libclang-15-dev \
    clang-15 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /plugin

# Copy plugin source
COPY . .

# Build Clang plugin
RUN mkdir build && cd build && \
    cmake -DLLVM_DIR=/usr/lib/llvm-15/cmake .. && \
    make

# Test the plugin
CMD ["clang", "-fplugin=./build/HelloPlugin.so", "-c", "test.cpp"]
EOF
    
    # Hello World C++ example
    cat > "$DOCKERFILES_DIR/cpp/hello.cpp" << 'EOF'
#include <iostream>
#include <string>

int main() {
    std::cout << "Hello from C++ Docker!" << std::endl;
    
    // Simple server simulation
    std::cout << "C++ Server running... (press Ctrl+C to stop)" << std::endl;
    
    while (true) {
        // Simulate server running
        std::this_thread::sleep_for(std::chrono::seconds(1));
    }
    
    return 0;
}
EOF
    
    # CMakeLists.txt
    cat > "$DOCKERFILES_DIR/cpp/CMakeLists.txt" << 'EOF'
cmake_minimum_required(VERSION 3.10)
project(HelloDocker)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable(hello hello.cpp)

# Enable all warnings
if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
    target_compile_options(hello PRIVATE -Wall -Wextra -Wpedantic)
endif()

# Install target
install(TARGETS hello DESTINATION bin)
EOF
    
    log SUCCESS "C++ Docker configuration created"
}

# Create multi-language docker-compose
create_compose_files() {
    log INFO "Creating Docker Compose configurations..."
    
    # Multi-service compose file
    cat > "$COMPOSE_DIR/docker-compose.yml" << 'EOF'
version: '3.8'

services:
  # TypeScript/Node.js Service
  typescript-app:
    build:
      context: ./typescript
      dockerfile: Dockerfile.dev
    container_name: ts-hello
    ports:
      - "3000:3000"
    volumes:
      - ./typescript:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - PORT=3000
    networks:
      - dev-network

  # Python Service
  python-app:
    build:
      context: ./python
      dockerfile: Dockerfile.dev
    container_name: py-hello
    ports:
      - "5000:5000"
    volumes:
      - ./python:/app
    environment:
      - FLASK_ENV=development
      - FLASK_APP=hello.py
    networks:
      - dev-network

  # C++ Service with GCC
  cpp-gcc-app:
    build:
      context: ./cpp
      dockerfile: Dockerfile.gcc
      target: builder
    container_name: cpp-gcc-hello
    volumes:
      - ./cpp:/app
    command: /bin/bash -c "cd build && ./hello"
    networks:
      - dev-network

  # C++ Service with Clang
  cpp-clang-app:
    build:
      context: ./clang
      dockerfile: Dockerfile.clang
      target: builder
    container_name: cpp-clang-hello
    volumes:
      - ./clang:/app
    command: /bin/bash -c "cd build && ./hello"
    networks:
      - dev-network

networks:
  dev-network:
    driver: bridge

volumes:
  node_modules:
  python_cache:
EOF
    
    # Library development compose
    cat > "$COMPOSE_DIR/docker-compose.library.yml" << 'EOF'
version: '3.8'

services:
  # C++ Library Development
  cpp-library:
    build:
      context: .
      dockerfile: Dockerfile.library
    container_name: cpp-library-dev
    volumes:
      - ./src:/workspace/src
      - ./include:/workspace/include
      - ./tests:/workspace/tests
      - build-cache:/workspace/build
    command: |
      bash -c "
        mkdir -p build &&
        cd build &&
        cmake .. &&
        make &&
        ctest --verbose
      "

  # Python Library Development
  python-library:
    build:
      context: .
      dockerfile: Dockerfile.py-library
    container_name: py-library-dev
    volumes:
      - ./src:/workspace/src
      - ./tests:/workspace/tests
    command: |
      bash -c "
        uv pip install -e . &&
        pytest tests/ -v
      "

volumes:
  build-cache:
EOF
    
    log SUCCESS "Docker Compose configurations created"
}

# Create build and run scripts
create_scripts() {
    log INFO "Creating Docker scripts..."
    
    # Build all images script
    cat > "$SCRIPTS_DIR/build_all.sh" << 'EOF'
#!/bin/bash
# Build all Docker images

set -e

echo "Building all Docker images..."

# Build TypeScript images
echo "Building TypeScript images..."
docker build -f ../dockerfiles/typescript/Dockerfile.dev -t hello-ts:dev ../dockerfiles/typescript
docker build -f ../dockerfiles/typescript/Dockerfile.prod -t hello-ts:prod ../dockerfiles/typescript

# Build Python images
echo "Building Python images..."
docker build -f ../dockerfiles/python/Dockerfile.dev -t hello-py:dev ../dockerfiles/python
docker build -f ../dockerfiles/python/Dockerfile.uv -t hello-py:uv ../dockerfiles/python

# Build C++ images
echo "Building C++ images..."
docker build -f ../dockerfiles/cpp/Dockerfile.gcc -t hello-cpp:gcc ../dockerfiles/cpp
docker build -f ../dockerfiles/clang/Dockerfile.clang -t hello-cpp:clang ../dockerfiles/clang

echo "All images built successfully!"
docker images | grep hello-
EOF
    chmod +x "$SCRIPTS_DIR/build_all.sh"
    
    # Test all containers script
    cat > "$SCRIPTS_DIR/test_all.sh" << 'EOF'
#!/bin/bash
# Test all Docker containers

set -e

echo "Testing all Docker configurations..."

# Test TypeScript
echo "Testing TypeScript container..."
docker run --rm hello-ts:dev node -e "console.log('Hello from TypeScript Docker test!')"

# Test Python
echo "Testing Python container..."
docker run --rm hello-py:dev python -c "print('Hello from Python Docker test!')"

# Test C++ GCC
echo "Testing C++ GCC container..."
docker run --rm hello-cpp:gcc echo "C++ GCC container works!"

# Test C++ Clang
echo "Testing C++ Clang container..."
docker run --rm hello-cpp:clang echo "C++ Clang container works!"

echo "All container tests passed!"
EOF
    chmod +x "$SCRIPTS_DIR/test_all.sh"
    
    # Cross-platform build script
    cat > "$SCRIPTS_DIR/build_multiarch.sh" << 'EOF'
#!/bin/bash
# Build multi-architecture Docker images

set -e

PLATFORMS="linux/amd64,linux/arm64,linux/arm/v7"
IMAGE_PREFIX="hello"

echo "Building multi-architecture images for platforms: $PLATFORMS"

# Enable Docker buildx
docker buildx create --use --name multiarch-builder || true
docker buildx inspect --bootstrap

# Build TypeScript multi-arch
echo "Building TypeScript multi-arch image..."
docker buildx build \
    --platform $PLATFORMS \
    -f ../dockerfiles/typescript/Dockerfile.prod \
    -t $IMAGE_PREFIX-ts:multiarch \
    --push \
    ../dockerfiles/typescript

# Build Python multi-arch
echo "Building Python multi-arch image..."
docker buildx build \
    --platform $PLATFORMS \
    -f ../dockerfiles/python/Dockerfile.dev \
    -t $IMAGE_PREFIX-py:multiarch \
    --push \
    ../dockerfiles/python

echo "Multi-architecture builds complete!"
EOF
    chmod +x "$SCRIPTS_DIR/build_multiarch.sh"
    
    log SUCCESS "Docker scripts created"
}

# Create documentation
create_documentation() {
    log INFO "Creating Docker documentation..."
    
    cat > "$DOCKER_DIR/README.md" << 'EOF'
# Docker Environments for Multi-Language Development

This directory contains Docker configurations for TypeScript, Python, and C++ development with various compilers and tools.

## Directory Structure

```
docker_environments/
├── dockerfiles/
│   ├── typescript/   # Node.js/TypeScript Dockerfiles
│   ├── python/       # Python Dockerfiles (including UV)
│   ├── cpp/          # C++ with GCC Dockerfiles
│   └── clang/        # C++ with Clang/LLVM Dockerfiles
├── compose/          # Docker Compose configurations
└── scripts/          # Build and test scripts
```

## Quick Start

### Build All Images

```bash
cd scripts
./build_all.sh
```

### Test All Configurations

```bash
cd scripts
./test_all.sh
```

### Run with Docker Compose

```bash
cd compose
docker-compose up
```

## Language-Specific Configurations

### TypeScript/Node.js

**Development:**
```bash
docker build -f dockerfiles/typescript/Dockerfile.dev -t myapp:dev .
docker run -p 3000:3000 -v $(pwd):/app myapp:dev
```

**Production:**
```bash
docker build -f dockerfiles/typescript/Dockerfile.prod -t myapp:prod .
docker run -p 3000:3000 myapp:prod
```

### Python

**With pip:**
```bash
docker build -f dockerfiles/python/Dockerfile.dev -t myapp:dev .
docker run -p 5000:5000 -v $(pwd):/app myapp:dev
```

**With UV package manager:**
```bash
docker build -f dockerfiles/python/Dockerfile.uv -t myapp:uv .
docker run -p 5000:5000 myapp:uv
```

### C++

**With GCC:**
```bash
docker build -f dockerfiles/cpp/Dockerfile.gcc -t myapp:gcc .
docker run myapp:gcc
```

**With Clang:**
```bash
docker build -f dockerfiles/clang/Dockerfile.clang -t myapp:clang .
docker run myapp:clang
```

**Clang Plugin Development:**
```bash
docker build -f dockerfiles/clang/Dockerfile.plugin -t myplugin:dev .
docker run -v $(pwd):/plugin myplugin:dev
```

## Multi-Architecture Support

Build for multiple architectures:
```bash
cd scripts
./build_multiarch.sh
```

Supported platforms:
- linux/amd64 (x86_64)
- linux/arm64 (ARM 64-bit)
- linux/arm/v7 (ARM 32-bit)

## Library Development

For C++ or Python library development:
```bash
cd compose
docker-compose -f docker-compose.library.yml up
```

## Hello World Examples

Each configuration includes a hello world implementation:

- **TypeScript**: HTTP server on port 3000
- **Python**: Flask server on port 5000
- **C++**: Console application

Test hello world:
```bash
# TypeScript
docker run --rm -p 3000:3000 hello-ts:dev

# Python
docker run --rm -p 5000:5000 hello-py:dev

# C++
docker run --rm hello-cpp:gcc
```

## Best Practices

1. **Multi-stage builds**: Use for smaller production images
2. **Non-root user**: Run containers as non-root in production
3. **Layer caching**: Order Dockerfile commands for optimal caching
4. **Health checks**: Add HEALTHCHECK instructions for production
5. **Security scanning**: Use `docker scan` to check for vulnerabilities

## Troubleshooting

- **Permission issues**: Check file ownership and use proper user in Dockerfile
- **Build failures**: Clear Docker cache with `docker builder prune`
- **Network issues**: Check Docker network configuration
- **Platform issues**: Ensure buildx is enabled for multi-arch builds

## Requirements

- Docker 20.10+
- Docker Compose 2.0+ (optional)
- Docker Buildx (for multi-arch)
EOF
    
    log SUCCESS "Docker documentation created"
}

# Main setup function
main() {
    log INFO "Docker Environment Setup"
    log INFO "========================"
    
    # Check Docker installation
    if ! check_docker; then
        log ERROR "Docker setup cannot continue without Docker"
        exit 1
    fi
    
    # Create directory structure
    setup_directories
    
    # Create Docker configurations
    create_typescript_docker
    create_python_docker
    create_cpp_docker
    create_compose_files
    create_scripts
    create_documentation
    
    log SUCCESS "Docker environment setup complete!"
    log INFO "Created in: $DOCKER_DIR/"
    log INFO ""
    log INFO "Quick start:"
    log INFO "  1. cd $DOCKER_DIR/scripts"
    log INFO "  2. ./build_all.sh"
    log INFO "  3. ./test_all.sh"
    log INFO ""
    log INFO "See $DOCKER_DIR/README.md for detailed documentation"
}

# Run main function
main "$@"