#!/usr/bin/env bun
/**
 * Migrated from: setup_docker.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.643Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Docker Setup Script for Compiler-Specific Libraries and Development
  // Configures Docker environments for different languages and compilers
  await $`set -e`;
  // Colors
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`RED='\033[0;31m'`;
  await $`BLUE='\033[0;34m'`;
  await $`NC='\033[0m'`;
  // Configuration
  await $`DOCKER_DIR="docker_environments"`;
  await $`DOCKERFILES_DIR="$DOCKER_DIR/dockerfiles"`;
  await $`COMPOSE_DIR="$DOCKER_DIR/compose"`;
  await $`SCRIPTS_DIR="$DOCKER_DIR/scripts"`;
  // Log function
  await $`log() {`;
  await $`case $1 in`;
  await $`INFO) echo -e "${BLUE}[INFO]${NC} $2" ;;`;
  await $`SUCCESS) echo -e "${GREEN}[SUCCESS]${NC} $2" ;;`;
  await $`WARNING) echo -e "${YELLOW}[WARNING]${NC} $2" ;;`;
  await $`ERROR) echo -e "${RED}[ERROR]${NC} $2" ;;`;
  await $`esac`;
  await $`}`;
  // Create directory structure
  await $`setup_directories() {`;
  await $`log INFO "Creating Docker directory structure..."`;
  await mkdir(""$DOCKERFILES_DIR"/{typescript,python,cpp,clang}", { recursive: true });
  await mkdir(""$COMPOSE_DIR"", { recursive: true });
  await mkdir(""$SCRIPTS_DIR"", { recursive: true });
  await $`log SUCCESS "Directories created"`;
  await $`}`;
  // Check Docker installation
  await $`check_docker() {`;
  await $`log INFO "Checking Docker installation..."`;
  await $`if command -v docker &> /dev/null; then`;
  await $`log SUCCESS "Docker $(docker --version) found"`;
  } else {
  await $`log ERROR "Docker not found. Please install Docker first."`;
  await $`log INFO "Visit: https://docs.docker.com/get-docker/"`;
  await $`return 1`;
  }
  await $`if command -v docker-compose &> /dev/null; then`;
  await $`log SUCCESS "Docker Compose found"`;
  } else {
  await $`log WARNING "Docker Compose not found. Some features may be limited."`;
  }
  // Check if Docker daemon is running
  await $`if docker info &> /dev/null; then`;
  await $`log SUCCESS "Docker daemon is running"`;
  } else {
  await $`log ERROR "Docker daemon is not running. Please start Docker."`;
  await $`return 1`;
  }
  await $`}`;
  // Create TypeScript/Node.js Docker configuration
  await $`create_typescript_docker() {`;
  await $`log INFO "Creating TypeScript/Node.js Docker configuration..."`;
  // Development Dockerfile
  await $`cat > "$DOCKERFILES_DIR/typescript/Dockerfile.dev" << 'EOF'`;
  // TypeScript/Node.js Development Environment
  await $`FROM node:18-alpine AS development`;
  // Install additional tools
  await $`RUN apk add --no-cache git bash curl`;
  await $`WORKDIR /app`;
  // Copy package files
  await $`COPY package*.json ./`;
  // Install dependencies
  await $`RUN bun install --frozen-lockfile`;
  // Copy source code
  await $`COPY . .`;
  // Expose common ports
  await $`EXPOSE 3000 3001 4200 8080`;
  // Development command
  await $`CMD ["bun", "run", "dev"]`;
  await $`EOF`;
  // Production Dockerfile
  await $`cat > "$DOCKERFILES_DIR/typescript/Dockerfile.prod" << 'EOF'`;
  // TypeScript/Node.js Production Build
  await $`FROM node:18-alpine AS builder`;
  await $`WORKDIR /app`;
  // Copy package files
  await $`COPY package*.json ./`;
  await $`RUN bun install --frozen-lockfile`;
  // Copy source and build
  await $`COPY . .`;
  await $`RUN bun run build`;
  // Production stage
  await $`FROM node:18-alpine AS production`;
  await $`RUN apk add --no-cache dumb-init`;
  await $`WORKDIR /app`;
  // Copy built application
  await $`COPY --from=builder /app/dist ./dist`;
  await $`COPY --from=builder /app/package*.json ./`;
  // Install production dependencies only
  await $`RUN bun install --frozen-lockfile --production`;
  // Use non-root user
  await $`USER node`;
  // Use dumb-init to handle signals properly
  await $`ENTRYPOINT ["dumb-init", "--"]`;
  await $`CMD ["node", "dist/index.js"]`;
  await $`EOF`;
  // Hello World example
  await $`cat > "$DOCKERFILES_DIR/typescript/hello.ts" << 'EOF'`;
  await $`console.log("Hello from TypeScript Docker!");`;
  await $`const server = require('http').createServer((req: any, res: any) => {`;
  await $`res.writeHead(200, {'Content-Type': 'text/plain'});`;
  await $`res.end('Hello from TypeScript Docker Server!\n');`;
  await $`});`;
  await $`const port = process.env.PORT || 3000;`;
  await $`server.listen(port, () => {`;
  await $`console.log(`Server running on port ${port}`);`;
  await $`});`;
  await $`EOF`;
  await $`log SUCCESS "TypeScript Docker configuration created"`;
  await $`}`;
  // Create Python Docker configuration
  await $`create_python_docker() {`;
  await $`log INFO "Creating Python Docker configuration..."`;
  // Development Dockerfile
  await $`cat > "$DOCKERFILES_DIR/python/Dockerfile.dev" << 'EOF'`;
  // Python Development Environment
  await $`FROM python:3.11-slim AS development`;
  // Install system dependencies
  await $`RUN apt-get update && apt-get install -y \`;
  await $`git \`;
  await $`curl \`;
  await $`build-essential \`;
  await $`&& rm -rf /var/lib/apt/lists/*`;
  await $`WORKDIR /app`;
  // Copy requirements
  await $`COPY requirements*.txt ./`;
  // Install Python dependencies
  await $`RUN uv pip install --no-cache-dir -r requirements.txt`;
  // Copy source code
  await $`COPY . .`;
  // Expose common ports
  await $`EXPOSE 5000 8000 8080`;
  // Development command
  await $`CMD ["python", "-m", "flask", "run", "--host=0.0.0.0", "--reload"]`;
  await $`EOF`;
  // Production Dockerfile with UV
  await $`cat > "$DOCKERFILES_DIR/python/Dockerfile.uv" << 'EOF'`;
  // Python with UV Package Manager
  await $`FROM python:3.11-slim AS builder`;
  // Install UV
  await $`RUN uv pip install uv`;
  await $`WORKDIR /app`;
  // Copy project files
  await $`COPY pyproject.toml uv.lock ./`;
  // Install dependencies with UV
  await $`RUN uv sync`;
  // Copy source code
  await $`COPY . .`;
  // Production stage
  await $`FROM python:3.11-slim AS production`;
  await $`WORKDIR /app`;
  // Copy virtual environment and app
  await $`COPY --from=builder /app/.venv ./.venv`;
  await $`COPY --from=builder /app .`;
  // Use virtual environment
  await $`ENV PATH="/app/.venv/bin:$PATH"`;
  // Run as non-root
  await $`RUN useradd -m appuser && chown -R appuser:appuser /app`;
  await $`USER appuser`;
  await $`CMD ["python", "main.py"]`;
  await $`EOF`;
  // Hello World example
  await $`cat > "$DOCKERFILES_DIR/python/hello.py" << 'EOF'`;
  await $`print("Hello from Python Docker!")`;
  await $`from flask import Flask`;
  await $`app = Flask(__name__)`;
  await $`@app.route('/')`;
  await $`def hello():`;
  await $`return "Hello from Python Docker Server!\n"`;
  await $`if __name__ == '__main__':`;
  await $`app.run(host='0.0.0.0', port=5000)`;
  await $`EOF`;
  // Requirements file
  await $`cat > "$DOCKERFILES_DIR/python/requirements.txt" << 'EOF'`;
  await $`flask>=2.0.0`;
  await $`pytest>=7.0.0`;
  await $`black>=22.0.0`;
  await $`pylint>=2.0.0`;
  await $`EOF`;
  await $`log SUCCESS "Python Docker configuration created"`;
  await $`}`;
  // Create C++ Docker configuration
  await $`create_cpp_docker() {`;
  await $`log INFO "Creating C++ Docker configuration..."`;
  // GCC Dockerfile
  await $`cat > "$DOCKERFILES_DIR/cpp/Dockerfile.gcc" << 'EOF'`;
  // C++ Development with GCC
  await $`FROM gcc:11 AS builder`;
  // Install build tools
  await $`RUN apt-get update && apt-get install -y \`;
  await $`cmake \`;
  await $`make \`;
  await $`ninja-build \`;
  await $`gdb \`;
  await $`valgrind \`;
  await $`&& rm -rf /var/lib/apt/lists/*`;
  await $`WORKDIR /app`;
  // Copy source code
  await $`COPY . .`;
  // Build application
  await $`RUN mkdir build && cd build && \`;
  await $`cmake .. && \`;
  await $`make -j$(nproc)`;
  // Runtime stage
  await $`FROM debian:bullseye-slim AS runtime`;
  await $`RUN apt-get update && apt-get install -y \`;
  await $`libstdc++6 \`;
  await $`&& rm -rf /var/lib/apt/lists/*`;
  await $`WORKDIR /app`;
  // Copy built binary
  await $`COPY --from=builder /app/build/hello /app/hello`;
  await $`CMD ["./hello"]`;
  await $`EOF`;
  // Clang Dockerfile
  await $`cat > "$DOCKERFILES_DIR/clang/Dockerfile.clang" << 'EOF'`;
  // C++ Development with Clang/LLVM
  await $`FROM silkeh/clang:15 AS builder`;
  // Install additional tools
  await $`RUN apt-get update && apt-get install -y \`;
  await $`cmake \`;
  await $`ninja-build \`;
  await $`lldb \`;
  await $`clang-tidy \`;
  await $`clang-format \`;
  await $`&& rm -rf /var/lib/apt/lists/*`;
  await $`WORKDIR /app`;
  // Copy source code
  await $`COPY . .`;
  // Build with Clang
  await $`RUN mkdir build && cd build && \`;
  await $`CC=clang CXX=clang++ cmake -G Ninja .. && \`;
  await $`ninja`;
  // Runtime stage
  await $`FROM debian:bullseye-slim AS runtime`;
  await $`RUN apt-get update && apt-get install -y \`;
  await $`libstdc++6 \`;
  await $`libc++1 \`;
  await $`&& rm -rf /var/lib/apt/lists/*`;
  await $`WORKDIR /app`;
  // Copy built binary
  await $`COPY --from=builder /app/build/hello /app/hello`;
  await $`CMD ["./hello"]`;
  await $`EOF`;
  // Clang Plugin Dockerfile
  await $`cat > "$DOCKERFILES_DIR/clang/Dockerfile.plugin" << 'EOF'`;
  // Clang Plugin Development Environment
  await $`FROM llvm:15 AS development`;
  // Install development tools
  await $`RUN apt-get update && apt-get install -y \`;
  await $`build-essential \`;
  await $`cmake \`;
  await $`git \`;
  await $`python3 \`;
  await $`python3-pip \`;
  await $`&& rm -rf /var/lib/apt/lists/*`;
  // Install LLVM development packages
  await $`RUN apt-get update && apt-get install -y \`;
  await $`llvm-15-dev \`;
  await $`libclang-15-dev \`;
  await $`clang-15 \`;
  await $`&& rm -rf /var/lib/apt/lists/*`;
  await $`WORKDIR /plugin`;
  // Copy plugin source
  await $`COPY . .`;
  // Build Clang plugin
  await $`RUN mkdir build && cd build && \`;
  await $`cmake -DLLVM_DIR=/usr/lib/llvm-15/cmake .. && \`;
  await $`make`;
  // Test the plugin
  await $`CMD ["clang", "-fplugin=./build/HelloPlugin.so", "-c", "test.cpp"]`;
  await $`EOF`;
  // Hello World C++ example
  await $`cat > "$DOCKERFILES_DIR/cpp/hello.cpp" << 'EOF'`;
  // include <iostream>
  // include <string>
  await $`int main() {`;
  await $`std::cout << "Hello from C++ Docker!" << std::endl;`;
  // Simple server simulation
  await $`std::cout << "C++ Server running... (press Ctrl+C to stop)" << std::endl;`;
  while ((true) {) {
  // Simulate server running
  await $`std::this_thread::sleep_for(std::chrono::seconds(1));`;
  await $`}`;
  await $`return 0;`;
  await $`}`;
  await $`EOF`;
  // CMakeLists.txt
  await $`cat > "$DOCKERFILES_DIR/cpp/CMakeLists.txt" << 'EOF'`;
  await $`cmake_minimum_required(VERSION 3.10)`;
  await $`project(HelloDocker)`;
  await $`set(CMAKE_CXX_STANDARD 17)`;
  await $`set(CMAKE_CXX_STANDARD_REQUIRED ON)`;
  await $`add_executable(hello hello.cpp)`;
  // Enable all warnings
  await $`if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")`;
  await $`target_compile_options(hello PRIVATE -Wall -Wextra -Wpedantic)`;
  await $`endif()`;
  // Install target
  await $`install(TARGETS hello DESTINATION bin)`;
  await $`EOF`;
  await $`log SUCCESS "C++ Docker configuration created"`;
  await $`}`;
  // Create multi-language docker-compose
  await $`create_compose_files() {`;
  await $`log INFO "Creating Docker Compose configurations..."`;
  // Multi-service compose file
  await $`cat > "$COMPOSE_DIR/docker-compose.yml" << 'EOF'`;
  await $`version: '3.8'`;
  await $`services:`;
  // TypeScript/Node.js Service
  await $`typescript-app:`;
  await $`build:`;
  await $`context: ./typescript`;
  await $`dockerfile: Dockerfile.dev`;
  await $`container_name: ts-hello`;
  await $`ports:`;
  await $`- "3000:3000"`;
  await $`volumes:`;
  await $`- ./typescript:/app`;
  await $`- /app/node_modules`;
  await $`environment:`;
  await $`- NODE_ENV=development`;
  await $`- PORT=3000`;
  await $`networks:`;
  await $`- dev-network`;
  // Python Service
  await $`python-app:`;
  await $`build:`;
  await $`context: ./python`;
  await $`dockerfile: Dockerfile.dev`;
  await $`container_name: py-hello`;
  await $`ports:`;
  await $`- "5000:5000"`;
  await $`volumes:`;
  await $`- ./python:/app`;
  await $`environment:`;
  await $`- FLASK_ENV=development`;
  await $`- FLASK_APP=hello.py`;
  await $`networks:`;
  await $`- dev-network`;
  // C++ Service with GCC
  await $`cpp-gcc-app:`;
  await $`build:`;
  await $`context: ./cpp`;
  await $`dockerfile: Dockerfile.gcc`;
  await $`target: builder`;
  await $`container_name: cpp-gcc-hello`;
  await $`volumes:`;
  await $`- ./cpp:/app`;
  await $`command: /bin/bash -c "cd build && ./hello"`;
  await $`networks:`;
  await $`- dev-network`;
  // C++ Service with Clang
  await $`cpp-clang-app:`;
  await $`build:`;
  await $`context: ./clang`;
  await $`dockerfile: Dockerfile.clang`;
  await $`target: builder`;
  await $`container_name: cpp-clang-hello`;
  await $`volumes:`;
  await $`- ./clang:/app`;
  await $`command: /bin/bash -c "cd build && ./hello"`;
  await $`networks:`;
  await $`- dev-network`;
  await $`networks:`;
  await $`dev-network:`;
  await $`driver: bridge`;
  await $`volumes:`;
  await $`node_modules:`;
  await $`python_cache:`;
  await $`EOF`;
  // Library development compose
  await $`cat > "$COMPOSE_DIR/docker-compose.library.yml" << 'EOF'`;
  await $`version: '3.8'`;
  await $`services:`;
  // C++ Library Development
  await $`cpp-library:`;
  await $`build:`;
  await $`context: .`;
  await $`dockerfile: Dockerfile.library`;
  await $`container_name: cpp-library-dev`;
  await $`volumes:`;
  await $`- ./src:/workspace/src`;
  await $`- ./include:/workspace/include`;
  await $`- ./tests:/workspace/tests`;
  await $`- build-cache:/workspace/build`;
  await $`command: |`;
  await $`bash -c "`;
  await mkdir("build &&", { recursive: true });
  process.chdir("build &&");
  await $`cmake .. &&`;
  await $`make &&`;
  await $`ctest --verbose`;
  await $`"`;
  // Python Library Development
  await $`python-library:`;
  await $`build:`;
  await $`context: .`;
  await $`dockerfile: Dockerfile.py-library`;
  await $`container_name: py-library-dev`;
  await $`volumes:`;
  await $`- ./src:/workspace/src`;
  await $`- ./tests:/workspace/tests`;
  await $`command: |`;
  await $`bash -c "`;
  await $`uv pip install -e . &&`;
  await $`pytest tests/ -v`;
  await $`"`;
  await $`volumes:`;
  await $`build-cache:`;
  await $`EOF`;
  await $`log SUCCESS "Docker Compose configurations created"`;
  await $`}`;
  // Create build and run scripts
  await $`create_scripts() {`;
  await $`log INFO "Creating Docker scripts..."`;
  // Build all images script
  await $`cat > "$SCRIPTS_DIR/build_all.sh" << 'EOF'`;
  // Build all Docker images
  await $`set -e`;
  console.log("Building all Docker images...");
  // Build TypeScript images
  console.log("Building TypeScript images...");
  await $`docker build -f ../dockerfiles/typescript/Dockerfile.dev -t hello-ts:dev ../dockerfiles/typescript`;
  await $`docker build -f ../dockerfiles/typescript/Dockerfile.prod -t hello-ts:prod ../dockerfiles/typescript`;
  // Build Python images
  console.log("Building Python images...");
  await $`docker build -f ../dockerfiles/python/Dockerfile.dev -t hello-py:dev ../dockerfiles/python`;
  await $`docker build -f ../dockerfiles/python/Dockerfile.uv -t hello-py:uv ../dockerfiles/python`;
  // Build C++ images
  console.log("Building C++ images...");
  await $`docker build -f ../dockerfiles/cpp/Dockerfile.gcc -t hello-cpp:gcc ../dockerfiles/cpp`;
  await $`docker build -f ../dockerfiles/clang/Dockerfile.clang -t hello-cpp:clang ../dockerfiles/clang`;
  console.log("All images built successfully!");
  await $`docker images | grep hello-`;
  await $`EOF`;
  await $`chmod +x "$SCRIPTS_DIR/build_all.sh"`;
  // Test all containers script
  await $`cat > "$SCRIPTS_DIR/test_all.sh" << 'EOF'`;
  // Test all Docker containers
  await $`set -e`;
  console.log("Testing all Docker configurations...");
  // Test TypeScript
  console.log("Testing TypeScript container...");
  await $`docker run --rm hello-ts:dev node -e "console.log('Hello from TypeScript Docker test!')"`;
  // Test Python
  console.log("Testing Python container...");
  await $`docker run --rm hello-py:dev python -c "print('Hello from Python Docker test!')"`;
  // Test C++ GCC
  console.log("Testing C++ GCC container...");
  await $`docker run --rm hello-cpp:gcc echo "C++ GCC container works!"`;
  // Test C++ Clang
  console.log("Testing C++ Clang container...");
  await $`docker run --rm hello-cpp:clang echo "C++ Clang container works!"`;
  console.log("All container tests passed!");
  await $`EOF`;
  await $`chmod +x "$SCRIPTS_DIR/test_all.sh"`;
  // Cross-platform build script
  await $`cat > "$SCRIPTS_DIR/build_multiarch.sh" << 'EOF'`;
  // Build multi-architecture Docker images
  await $`set -e`;
  await $`PLATFORMS="linux/amd64,linux/arm64,linux/arm/v7"`;
  await $`IMAGE_PREFIX="hello"`;
  console.log("Building multi-architecture images for platforms: $PLATFORMS");
  // Enable Docker buildx
  await $`docker buildx create --use --name multiarch-builder || true`;
  await $`docker buildx inspect --bootstrap`;
  // Build TypeScript multi-arch
  console.log("Building TypeScript multi-arch image...");
  await $`docker buildx build \`;
  await $`--platform $PLATFORMS \`;
  await $`-f ../dockerfiles/typescript/Dockerfile.prod \`;
  await $`-t $IMAGE_PREFIX-ts:multiarch \`;
  await $`--push \`;
  await $`../dockerfiles/typescript`;
  // Build Python multi-arch
  console.log("Building Python multi-arch image...");
  await $`docker buildx build \`;
  await $`--platform $PLATFORMS \`;
  await $`-f ../dockerfiles/python/Dockerfile.dev \`;
  await $`-t $IMAGE_PREFIX-py:multiarch \`;
  await $`--push \`;
  await $`../dockerfiles/python`;
  console.log("Multi-architecture builds complete!");
  await $`EOF`;
  await $`chmod +x "$SCRIPTS_DIR/build_multiarch.sh"`;
  await $`log SUCCESS "Docker scripts created"`;
  await $`}`;
  // Create documentation
  await $`create_documentation() {`;
  await $`log INFO "Creating Docker documentation..."`;
  await $`cat > "$DOCKER_DIR/README.md" << 'EOF'`;
  // Docker Environments for Multi-Language Development
  await $`This directory contains Docker configurations for TypeScript, Python, and C++ development with various compilers and tools.`;
  // # Directory Structure
  await $`````;
  await $`docker_environments/`;
  await $`├── dockerfiles/`;
  await $`│   ├── typescript/   # Node.js/TypeScript Dockerfiles`;
  await $`│   ├── python/       # Python Dockerfiles (including UV)`;
  await $`│   ├── cpp/          # C++ with GCC Dockerfiles`;
  await $`│   └── clang/        # C++ with Clang/LLVM Dockerfiles`;
  await $`├── compose/          # Docker Compose configurations`;
  await $`└── scripts/          # Build and test scripts`;
  await $`````;
  // # Quick Start
  // ## Build All Images
  await $````bash`;
  process.chdir("scripts");
  await $`./build_all.sh`;
  await $`````;
  // ## Test All Configurations
  await $````bash`;
  process.chdir("scripts");
  await $`./test_all.sh`;
  await $`````;
  // ## Run with Docker Compose
  await $````bash`;
  process.chdir("compose");
  await $`docker-compose up`;
  await $`````;
  // # Language-Specific Configurations
  // ## TypeScript/Node.js
  await $`**Development:**`;
  await $````bash`;
  await $`docker build -f dockerfiles/typescript/Dockerfile.dev -t myapp:dev .`;
  await $`docker run -p 3000:3000 -v $(pwd):/app myapp:dev`;
  await $`````;
  await $`**Production:**`;
  await $````bash`;
  await $`docker build -f dockerfiles/typescript/Dockerfile.prod -t myapp:prod .`;
  await $`docker run -p 3000:3000 myapp:prod`;
  await $`````;
  // ## Python
  await $`**With pip:**`;
  await $````bash`;
  await $`docker build -f dockerfiles/python/Dockerfile.dev -t myapp:dev .`;
  await $`docker run -p 5000:5000 -v $(pwd):/app myapp:dev`;
  await $`````;
  await $`**With UV package manager:**`;
  await $````bash`;
  await $`docker build -f dockerfiles/python/Dockerfile.uv -t myapp:uv .`;
  await $`docker run -p 5000:5000 myapp:uv`;
  await $`````;
  // ## C++
  await $`**With GCC:**`;
  await $````bash`;
  await $`docker build -f dockerfiles/cpp/Dockerfile.gcc -t myapp:gcc .`;
  await $`docker run myapp:gcc`;
  await $`````;
  await $`**With Clang:**`;
  await $````bash`;
  await $`docker build -f dockerfiles/clang/Dockerfile.clang -t myapp:clang .`;
  await $`docker run myapp:clang`;
  await $`````;
  await $`**Clang Plugin Development:**`;
  await $````bash`;
  await $`docker build -f dockerfiles/clang/Dockerfile.plugin -t myplugin:dev .`;
  await $`docker run -v $(pwd):/plugin myplugin:dev`;
  await $`````;
  // # Multi-Architecture Support
  await $`Build for multiple architectures:`;
  await $````bash`;
  process.chdir("scripts");
  await $`./build_multiarch.sh`;
  await $`````;
  await $`Supported platforms:`;
  await $`- linux/amd64 (x86_64)`;
  await $`- linux/arm64 (ARM 64-bit)`;
  await $`- linux/arm/v7 (ARM 32-bit)`;
  // # Library Development
  await $`For C++ or Python library development:`;
  await $````bash`;
  process.chdir("compose");
  await $`docker-compose -f docker-compose.library.yml up`;
  await $`````;
  // # Hello World Examples
  await $`Each configuration includes a hello world implementation:`;
  await $`- **TypeScript**: HTTP server on port 3000`;
  await $`- **Python**: Flask server on port 5000`;
  await $`- **C++**: Console application`;
  await $`Test hello world:`;
  await $````bash`;
  // TypeScript
  await $`docker run --rm -p 3000:3000 hello-ts:dev`;
  // Python
  await $`docker run --rm -p 5000:5000 hello-py:dev`;
  // C++
  await $`docker run --rm hello-cpp:gcc`;
  await $`````;
  // # Best Practices
  await $`1. **Multi-stage builds**: Use for smaller production images`;
  await $`2. **Non-root user**: Run containers as non-root in production`;
  await $`3. **Layer caching**: Order Dockerfile commands for optimal caching`;
  await $`4. **Health checks**: Add HEALTHCHECK instructions for production`;
  await $`5. **Security scanning**: Use `docker scan` to check for vulnerabilities`;
  // # Troubleshooting
  await $`- **Permission issues**: Check file ownership and use proper user in Dockerfile`;
  await $`- **Build failures**: Clear Docker cache with `docker builder prune``;
  await $`- **Network issues**: Check Docker network configuration`;
  await $`- **Platform issues**: Ensure buildx is enabled for multi-arch builds`;
  // # Requirements
  await $`- Docker 20.10+`;
  await $`- Docker Compose 2.0+ (optional)`;
  await $`- Docker Buildx (for multi-arch)`;
  await $`EOF`;
  await $`log SUCCESS "Docker documentation created"`;
  await $`}`;
  // Main setup function
  await $`main() {`;
  await $`log INFO "Docker Environment Setup"`;
  await $`log INFO "========================"`;
  // Check Docker installation
  await $`if ! check_docker; then`;
  await $`log ERROR "Docker setup cannot continue without Docker"`;
  process.exit(1);
  }
  // Create directory structure
  await $`setup_directories`;
  // Create Docker configurations
  await $`create_typescript_docker`;
  await $`create_python_docker`;
  await $`create_cpp_docker`;
  await $`create_compose_files`;
  await $`create_scripts`;
  await $`create_documentation`;
  await $`log SUCCESS "Docker environment setup complete!"`;
  await $`log INFO "Created in: $DOCKER_DIR/"`;
  await $`log INFO ""`;
  await $`log INFO "Quick start:"`;
  await $`log INFO "  1. cd $DOCKER_DIR/scripts"`;
  await $`log INFO "  2. ./build_all.sh"`;
  await $`log INFO "  3. ./test_all.sh"`;
  await $`log INFO ""`;
  await $`log INFO "See $DOCKER_DIR/README.md for detailed documentation"`;
  await $`}`;
  // Run main function
  await $`main "$@"`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}