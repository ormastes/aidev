#!/usr/bin/env python3
"""
Migrated from: setup_docker.sh
Auto-generated Python - 2025-08-16T04:57:27.645Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Docker Setup Script for Compiler-Specific Libraries and Development
    # Configures Docker environments for different languages and compilers
    subprocess.run("set -e", shell=True)
    # Colors
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("BLUE='\033[0;34m'", shell=True)
    subprocess.run("NC='\033[0m'", shell=True)
    # Configuration
    subprocess.run("DOCKER_DIR="docker_environments"", shell=True)
    subprocess.run("DOCKERFILES_DIR="$DOCKER_DIR/dockerfiles"", shell=True)
    subprocess.run("COMPOSE_DIR="$DOCKER_DIR/compose"", shell=True)
    subprocess.run("SCRIPTS_DIR="$DOCKER_DIR/scripts"", shell=True)
    # Log function
    subprocess.run("log() {", shell=True)
    subprocess.run("case $1 in", shell=True)
    subprocess.run("INFO) echo -e "${BLUE}[INFO]${NC} $2" ;;", shell=True)
    subprocess.run("SUCCESS) echo -e "${GREEN}[SUCCESS]${NC} $2" ;;", shell=True)
    subprocess.run("WARNING) echo -e "${YELLOW}[WARNING]${NC} $2" ;;", shell=True)
    subprocess.run("ERROR) echo -e "${RED}[ERROR]${NC} $2" ;;", shell=True)
    subprocess.run("esac", shell=True)
    subprocess.run("}", shell=True)
    # Create directory structure
    subprocess.run("setup_directories() {", shell=True)
    subprocess.run("log INFO "Creating Docker directory structure..."", shell=True)
    Path(""$DOCKERFILES_DIR"/{typescript,python,cpp,clang}").mkdir(parents=True, exist_ok=True)
    Path(""$COMPOSE_DIR"").mkdir(parents=True, exist_ok=True)
    Path(""$SCRIPTS_DIR"").mkdir(parents=True, exist_ok=True)
    subprocess.run("log SUCCESS "Directories created"", shell=True)
    subprocess.run("}", shell=True)
    # Check Docker installation
    subprocess.run("check_docker() {", shell=True)
    subprocess.run("log INFO "Checking Docker installation..."", shell=True)
    subprocess.run("if command -v docker &> /dev/null; then", shell=True)
    subprocess.run("log SUCCESS "Docker $(docker --version) found"", shell=True)
    else:
    subprocess.run("log ERROR "Docker not found. Please install Docker first."", shell=True)
    subprocess.run("log INFO "Visit: https://docs.docker.com/get-docker/"", shell=True)
    subprocess.run("return 1", shell=True)
    subprocess.run("if command -v docker-compose &> /dev/null; then", shell=True)
    subprocess.run("log SUCCESS "Docker Compose found"", shell=True)
    else:
    subprocess.run("log WARNING "Docker Compose not found. Some features may be limited."", shell=True)
    # Check if Docker daemon is running
    subprocess.run("if docker info &> /dev/null; then", shell=True)
    subprocess.run("log SUCCESS "Docker daemon is running"", shell=True)
    else:
    subprocess.run("log ERROR "Docker daemon is not running. Please start Docker."", shell=True)
    subprocess.run("return 1", shell=True)
    subprocess.run("}", shell=True)
    # Create TypeScript/Node.js Docker configuration
    subprocess.run("create_typescript_docker() {", shell=True)
    subprocess.run("log INFO "Creating TypeScript/Node.js Docker configuration..."", shell=True)
    # Development Dockerfile
    subprocess.run("cat > "$DOCKERFILES_DIR/typescript/Dockerfile.dev" << 'EOF'", shell=True)
    # TypeScript/Node.js Development Environment
    subprocess.run("FROM node:18-alpine AS development", shell=True)
    # Install additional tools
    subprocess.run("RUN apk add --no-cache git bash curl", shell=True)
    subprocess.run("WORKDIR /app", shell=True)
    # Copy package files
    subprocess.run("COPY package*.json ./", shell=True)
    # Install dependencies
    subprocess.run("RUN bun install --frozen-lockfile", shell=True)
    # Copy source code
    subprocess.run("COPY . .", shell=True)
    # Expose common ports
    subprocess.run("EXPOSE 3000 3001 4200 8080", shell=True)
    # Development command
    subprocess.run("CMD ["bun", "run", "dev"]", shell=True)
    subprocess.run("EOF", shell=True)
    # Production Dockerfile
    subprocess.run("cat > "$DOCKERFILES_DIR/typescript/Dockerfile.prod" << 'EOF'", shell=True)
    # TypeScript/Node.js Production Build
    subprocess.run("FROM node:18-alpine AS builder", shell=True)
    subprocess.run("WORKDIR /app", shell=True)
    # Copy package files
    subprocess.run("COPY package*.json ./", shell=True)
    subprocess.run("RUN bun install --frozen-lockfile", shell=True)
    # Copy source and build
    subprocess.run("COPY . .", shell=True)
    subprocess.run("RUN bun run build", shell=True)
    # Production stage
    subprocess.run("FROM node:18-alpine AS production", shell=True)
    subprocess.run("RUN apk add --no-cache dumb-init", shell=True)
    subprocess.run("WORKDIR /app", shell=True)
    # Copy built application
    subprocess.run("COPY --from=builder /app/dist ./dist", shell=True)
    subprocess.run("COPY --from=builder /app/package*.json ./", shell=True)
    # Install production dependencies only
    subprocess.run("RUN bun install --frozen-lockfile --production", shell=True)
    # Use non-root user
    subprocess.run("USER node", shell=True)
    # Use dumb-init to handle signals properly
    subprocess.run("ENTRYPOINT ["dumb-init", "--"]", shell=True)
    subprocess.run("CMD ["node", "dist/index.js"]", shell=True)
    subprocess.run("EOF", shell=True)
    # Hello World example
    subprocess.run("cat > "$DOCKERFILES_DIR/typescript/hello.ts" << 'EOF'", shell=True)
    subprocess.run("console.log("Hello from TypeScript Docker!");", shell=True)
    subprocess.run("const server = require('http').createServer((req: any, res: any) => {", shell=True)
    subprocess.run("res.writeHead(200, {'Content-Type': 'text/plain'});", shell=True)
    subprocess.run("res.end('Hello from TypeScript Docker Server!\n');", shell=True)
    subprocess.run("});", shell=True)
    subprocess.run("const port = process.env.PORT || 3000;", shell=True)
    subprocess.run("server.listen(port, () => {", shell=True)
    subprocess.run("console.log(`Server running on port ${port}`);", shell=True)
    subprocess.run("});", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("log SUCCESS "TypeScript Docker configuration created"", shell=True)
    subprocess.run("}", shell=True)
    # Create Python Docker configuration
    subprocess.run("create_python_docker() {", shell=True)
    subprocess.run("log INFO "Creating Python Docker configuration..."", shell=True)
    # Development Dockerfile
    subprocess.run("cat > "$DOCKERFILES_DIR/python/Dockerfile.dev" << 'EOF'", shell=True)
    # Python Development Environment
    subprocess.run("FROM python:3.11-slim AS development", shell=True)
    # Install system dependencies
    subprocess.run("RUN apt-get update && apt-get install -y \", shell=True)
    subprocess.run("git \", shell=True)
    subprocess.run("curl \", shell=True)
    subprocess.run("build-essential \", shell=True)
    subprocess.run("&& rm -rf /var/lib/apt/lists/*", shell=True)
    subprocess.run("WORKDIR /app", shell=True)
    # Copy requirements
    subprocess.run("COPY requirements*.txt ./", shell=True)
    # Install Python dependencies
    subprocess.run("RUN uv pip install --no-cache-dir -r requirements.txt", shell=True)
    # Copy source code
    subprocess.run("COPY . .", shell=True)
    # Expose common ports
    subprocess.run("EXPOSE 5000 8000 8080", shell=True)
    # Development command
    subprocess.run("CMD ["python", "-m", "flask", "run", "--host=0.0.0.0", "--reload"]", shell=True)
    subprocess.run("EOF", shell=True)
    # Production Dockerfile with UV
    subprocess.run("cat > "$DOCKERFILES_DIR/python/Dockerfile.uv" << 'EOF'", shell=True)
    # Python with UV Package Manager
    subprocess.run("FROM python:3.11-slim AS builder", shell=True)
    # Install UV
    subprocess.run("RUN uv pip install uv", shell=True)
    subprocess.run("WORKDIR /app", shell=True)
    # Copy project files
    subprocess.run("COPY pyproject.toml uv.lock ./", shell=True)
    # Install dependencies with UV
    subprocess.run("RUN uv sync", shell=True)
    # Copy source code
    subprocess.run("COPY . .", shell=True)
    # Production stage
    subprocess.run("FROM python:3.11-slim AS production", shell=True)
    subprocess.run("WORKDIR /app", shell=True)
    # Copy virtual environment and app
    subprocess.run("COPY --from=builder /app/.venv ./.venv", shell=True)
    subprocess.run("COPY --from=builder /app .", shell=True)
    # Use virtual environment
    subprocess.run("ENV PATH="/app/.venv/bin:$PATH"", shell=True)
    # Run as non-root
    subprocess.run("RUN useradd -m appuser && chown -R appuser:appuser /app", shell=True)
    subprocess.run("USER appuser", shell=True)
    subprocess.run("CMD ["python", "main.py"]", shell=True)
    subprocess.run("EOF", shell=True)
    # Hello World example
    subprocess.run("cat > "$DOCKERFILES_DIR/python/hello.py" << 'EOF'", shell=True)
    subprocess.run("print("Hello from Python Docker!")", shell=True)
    subprocess.run("from flask import Flask", shell=True)
    subprocess.run("app = Flask(__name__)", shell=True)
    subprocess.run("@app.route('/')", shell=True)
    subprocess.run("def hello():", shell=True)
    subprocess.run("return "Hello from Python Docker Server!\n"", shell=True)
    subprocess.run("if __name__ == '__main__':", shell=True)
    subprocess.run("app.run(host='0.0.0.0', port=5000)", shell=True)
    subprocess.run("EOF", shell=True)
    # Requirements file
    subprocess.run("cat > "$DOCKERFILES_DIR/python/requirements.txt" << 'EOF'", shell=True)
    subprocess.run("flask>=2.0.0", shell=True)
    subprocess.run("pytest>=7.0.0", shell=True)
    subprocess.run("black>=22.0.0", shell=True)
    subprocess.run("pylint>=2.0.0", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("log SUCCESS "Python Docker configuration created"", shell=True)
    subprocess.run("}", shell=True)
    # Create C++ Docker configuration
    subprocess.run("create_cpp_docker() {", shell=True)
    subprocess.run("log INFO "Creating C++ Docker configuration..."", shell=True)
    # GCC Dockerfile
    subprocess.run("cat > "$DOCKERFILES_DIR/cpp/Dockerfile.gcc" << 'EOF'", shell=True)
    # C++ Development with GCC
    subprocess.run("FROM gcc:11 AS builder", shell=True)
    # Install build tools
    subprocess.run("RUN apt-get update && apt-get install -y \", shell=True)
    subprocess.run("cmake \", shell=True)
    subprocess.run("make \", shell=True)
    subprocess.run("ninja-build \", shell=True)
    subprocess.run("gdb \", shell=True)
    subprocess.run("valgrind \", shell=True)
    subprocess.run("&& rm -rf /var/lib/apt/lists/*", shell=True)
    subprocess.run("WORKDIR /app", shell=True)
    # Copy source code
    subprocess.run("COPY . .", shell=True)
    # Build application
    subprocess.run("RUN mkdir build && cd build && \", shell=True)
    subprocess.run("cmake .. && \", shell=True)
    subprocess.run("make -j$(nproc)", shell=True)
    # Runtime stage
    subprocess.run("FROM debian:bullseye-slim AS runtime", shell=True)
    subprocess.run("RUN apt-get update && apt-get install -y \", shell=True)
    subprocess.run("libstdc++6 \", shell=True)
    subprocess.run("&& rm -rf /var/lib/apt/lists/*", shell=True)
    subprocess.run("WORKDIR /app", shell=True)
    # Copy built binary
    subprocess.run("COPY --from=builder /app/build/hello /app/hello", shell=True)
    subprocess.run("CMD ["./hello"]", shell=True)
    subprocess.run("EOF", shell=True)
    # Clang Dockerfile
    subprocess.run("cat > "$DOCKERFILES_DIR/clang/Dockerfile.clang" << 'EOF'", shell=True)
    # C++ Development with Clang/LLVM
    subprocess.run("FROM silkeh/clang:15 AS builder", shell=True)
    # Install additional tools
    subprocess.run("RUN apt-get update && apt-get install -y \", shell=True)
    subprocess.run("cmake \", shell=True)
    subprocess.run("ninja-build \", shell=True)
    subprocess.run("lldb \", shell=True)
    subprocess.run("clang-tidy \", shell=True)
    subprocess.run("clang-format \", shell=True)
    subprocess.run("&& rm -rf /var/lib/apt/lists/*", shell=True)
    subprocess.run("WORKDIR /app", shell=True)
    # Copy source code
    subprocess.run("COPY . .", shell=True)
    # Build with Clang
    subprocess.run("RUN mkdir build && cd build && \", shell=True)
    subprocess.run("CC=clang CXX=clang++ cmake -G Ninja .. && \", shell=True)
    subprocess.run("ninja", shell=True)
    # Runtime stage
    subprocess.run("FROM debian:bullseye-slim AS runtime", shell=True)
    subprocess.run("RUN apt-get update && apt-get install -y \", shell=True)
    subprocess.run("libstdc++6 \", shell=True)
    subprocess.run("libc++1 \", shell=True)
    subprocess.run("&& rm -rf /var/lib/apt/lists/*", shell=True)
    subprocess.run("WORKDIR /app", shell=True)
    # Copy built binary
    subprocess.run("COPY --from=builder /app/build/hello /app/hello", shell=True)
    subprocess.run("CMD ["./hello"]", shell=True)
    subprocess.run("EOF", shell=True)
    # Clang Plugin Dockerfile
    subprocess.run("cat > "$DOCKERFILES_DIR/clang/Dockerfile.plugin" << 'EOF'", shell=True)
    # Clang Plugin Development Environment
    subprocess.run("FROM llvm:15 AS development", shell=True)
    # Install development tools
    subprocess.run("RUN apt-get update && apt-get install -y \", shell=True)
    subprocess.run("build-essential \", shell=True)
    subprocess.run("cmake \", shell=True)
    subprocess.run("git \", shell=True)
    subprocess.run("python3 \", shell=True)
    subprocess.run("python3-pip \", shell=True)
    subprocess.run("&& rm -rf /var/lib/apt/lists/*", shell=True)
    # Install LLVM development packages
    subprocess.run("RUN apt-get update && apt-get install -y \", shell=True)
    subprocess.run("llvm-15-dev \", shell=True)
    subprocess.run("libclang-15-dev \", shell=True)
    subprocess.run("clang-15 \", shell=True)
    subprocess.run("&& rm -rf /var/lib/apt/lists/*", shell=True)
    subprocess.run("WORKDIR /plugin", shell=True)
    # Copy plugin source
    subprocess.run("COPY . .", shell=True)
    # Build Clang plugin
    subprocess.run("RUN mkdir build && cd build && \", shell=True)
    subprocess.run("cmake -DLLVM_DIR=/usr/lib/llvm-15/cmake .. && \", shell=True)
    subprocess.run("make", shell=True)
    # Test the plugin
    subprocess.run("CMD ["clang", "-fplugin=./build/HelloPlugin.so", "-c", "test.cpp"]", shell=True)
    subprocess.run("EOF", shell=True)
    # Hello World C++ example
    subprocess.run("cat > "$DOCKERFILES_DIR/cpp/hello.cpp" << 'EOF'", shell=True)
    # include <iostream>
    # include <string>
    subprocess.run("int main() {", shell=True)
    subprocess.run("std::cout << "Hello from C++ Docker!" << std::endl;", shell=True)
    subprocess.run("// Simple server simulation", shell=True)
    subprocess.run("std::cout << "C++ Server running... (press Ctrl+C to stop)" << std::endl;", shell=True)
    while (true) {:
    subprocess.run("// Simulate server running", shell=True)
    subprocess.run("std::this_thread::sleep_for(std::chrono::seconds(1));", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("return 0;", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    # CMakeLists.txt
    subprocess.run("cat > "$DOCKERFILES_DIR/cpp/CMakeLists.txt" << 'EOF'", shell=True)
    subprocess.run("cmake_minimum_required(VERSION 3.10)", shell=True)
    subprocess.run("project(HelloDocker)", shell=True)
    subprocess.run("set(CMAKE_CXX_STANDARD 17)", shell=True)
    subprocess.run("set(CMAKE_CXX_STANDARD_REQUIRED ON)", shell=True)
    subprocess.run("add_executable(hello hello.cpp)", shell=True)
    # Enable all warnings
    subprocess.run("if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")", shell=True)
    subprocess.run("target_compile_options(hello PRIVATE -Wall -Wextra -Wpedantic)", shell=True)
    subprocess.run("endif()", shell=True)
    # Install target
    subprocess.run("install(TARGETS hello DESTINATION bin)", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("log SUCCESS "C++ Docker configuration created"", shell=True)
    subprocess.run("}", shell=True)
    # Create multi-language docker-compose
    subprocess.run("create_compose_files() {", shell=True)
    subprocess.run("log INFO "Creating Docker Compose configurations..."", shell=True)
    # Multi-service compose file
    subprocess.run("cat > "$COMPOSE_DIR/docker-compose.yml" << 'EOF'", shell=True)
    subprocess.run("version: '3.8'", shell=True)
    subprocess.run("services:", shell=True)
    # TypeScript/Node.js Service
    subprocess.run("typescript-app:", shell=True)
    subprocess.run("build:", shell=True)
    subprocess.run("context: ./typescript", shell=True)
    subprocess.run("dockerfile: Dockerfile.dev", shell=True)
    subprocess.run("container_name: ts-hello", shell=True)
    subprocess.run("ports:", shell=True)
    subprocess.run("- "3000:3000"", shell=True)
    subprocess.run("volumes:", shell=True)
    subprocess.run("- ./typescript:/app", shell=True)
    subprocess.run("- /app/node_modules", shell=True)
    subprocess.run("environment:", shell=True)
    subprocess.run("- NODE_ENV=development", shell=True)
    subprocess.run("- PORT=3000", shell=True)
    subprocess.run("networks:", shell=True)
    subprocess.run("- dev-network", shell=True)
    # Python Service
    subprocess.run("python-app:", shell=True)
    subprocess.run("build:", shell=True)
    subprocess.run("context: ./python", shell=True)
    subprocess.run("dockerfile: Dockerfile.dev", shell=True)
    subprocess.run("container_name: py-hello", shell=True)
    subprocess.run("ports:", shell=True)
    subprocess.run("- "5000:5000"", shell=True)
    subprocess.run("volumes:", shell=True)
    subprocess.run("- ./python:/app", shell=True)
    subprocess.run("environment:", shell=True)
    subprocess.run("- FLASK_ENV=development", shell=True)
    subprocess.run("- FLASK_APP=hello.py", shell=True)
    subprocess.run("networks:", shell=True)
    subprocess.run("- dev-network", shell=True)
    # C++ Service with GCC
    subprocess.run("cpp-gcc-app:", shell=True)
    subprocess.run("build:", shell=True)
    subprocess.run("context: ./cpp", shell=True)
    subprocess.run("dockerfile: Dockerfile.gcc", shell=True)
    subprocess.run("target: builder", shell=True)
    subprocess.run("container_name: cpp-gcc-hello", shell=True)
    subprocess.run("volumes:", shell=True)
    subprocess.run("- ./cpp:/app", shell=True)
    subprocess.run("command: /bin/bash -c "cd build && ./hello"", shell=True)
    subprocess.run("networks:", shell=True)
    subprocess.run("- dev-network", shell=True)
    # C++ Service with Clang
    subprocess.run("cpp-clang-app:", shell=True)
    subprocess.run("build:", shell=True)
    subprocess.run("context: ./clang", shell=True)
    subprocess.run("dockerfile: Dockerfile.clang", shell=True)
    subprocess.run("target: builder", shell=True)
    subprocess.run("container_name: cpp-clang-hello", shell=True)
    subprocess.run("volumes:", shell=True)
    subprocess.run("- ./clang:/app", shell=True)
    subprocess.run("command: /bin/bash -c "cd build && ./hello"", shell=True)
    subprocess.run("networks:", shell=True)
    subprocess.run("- dev-network", shell=True)
    subprocess.run("networks:", shell=True)
    subprocess.run("dev-network:", shell=True)
    subprocess.run("driver: bridge", shell=True)
    subprocess.run("volumes:", shell=True)
    subprocess.run("node_modules:", shell=True)
    subprocess.run("python_cache:", shell=True)
    subprocess.run("EOF", shell=True)
    # Library development compose
    subprocess.run("cat > "$COMPOSE_DIR/docker-compose.library.yml" << 'EOF'", shell=True)
    subprocess.run("version: '3.8'", shell=True)
    subprocess.run("services:", shell=True)
    # C++ Library Development
    subprocess.run("cpp-library:", shell=True)
    subprocess.run("build:", shell=True)
    subprocess.run("context: .", shell=True)
    subprocess.run("dockerfile: Dockerfile.library", shell=True)
    subprocess.run("container_name: cpp-library-dev", shell=True)
    subprocess.run("volumes:", shell=True)
    subprocess.run("- ./src:/workspace/src", shell=True)
    subprocess.run("- ./include:/workspace/include", shell=True)
    subprocess.run("- ./tests:/workspace/tests", shell=True)
    subprocess.run("- build-cache:/workspace/build", shell=True)
    subprocess.run("command: |", shell=True)
    subprocess.run("bash -c "", shell=True)
    Path("build &&").mkdir(parents=True, exist_ok=True)
    os.chdir("build &&")
    subprocess.run("cmake .. &&", shell=True)
    subprocess.run("make &&", shell=True)
    subprocess.run("ctest --verbose", shell=True)
    subprocess.run(""", shell=True)
    # Python Library Development
    subprocess.run("python-library:", shell=True)
    subprocess.run("build:", shell=True)
    subprocess.run("context: .", shell=True)
    subprocess.run("dockerfile: Dockerfile.py-library", shell=True)
    subprocess.run("container_name: py-library-dev", shell=True)
    subprocess.run("volumes:", shell=True)
    subprocess.run("- ./src:/workspace/src", shell=True)
    subprocess.run("- ./tests:/workspace/tests", shell=True)
    subprocess.run("command: |", shell=True)
    subprocess.run("bash -c "", shell=True)
    subprocess.run("uv pip install -e . &&", shell=True)
    subprocess.run("pytest tests/ -v", shell=True)
    subprocess.run(""", shell=True)
    subprocess.run("volumes:", shell=True)
    subprocess.run("build-cache:", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("log SUCCESS "Docker Compose configurations created"", shell=True)
    subprocess.run("}", shell=True)
    # Create build and run scripts
    subprocess.run("create_scripts() {", shell=True)
    subprocess.run("log INFO "Creating Docker scripts..."", shell=True)
    # Build all images script
    subprocess.run("cat > "$SCRIPTS_DIR/build_all.sh" << 'EOF'", shell=True)
    # Build all Docker images
    subprocess.run("set -e", shell=True)
    print("Building all Docker images...")
    # Build TypeScript images
    print("Building TypeScript images...")
    subprocess.run("docker build -f ../dockerfiles/typescript/Dockerfile.dev -t hello-ts:dev ../dockerfiles/typescript", shell=True)
    subprocess.run("docker build -f ../dockerfiles/typescript/Dockerfile.prod -t hello-ts:prod ../dockerfiles/typescript", shell=True)
    # Build Python images
    print("Building Python images...")
    subprocess.run("docker build -f ../dockerfiles/python/Dockerfile.dev -t hello-py:dev ../dockerfiles/python", shell=True)
    subprocess.run("docker build -f ../dockerfiles/python/Dockerfile.uv -t hello-py:uv ../dockerfiles/python", shell=True)
    # Build C++ images
    print("Building C++ images...")
    subprocess.run("docker build -f ../dockerfiles/cpp/Dockerfile.gcc -t hello-cpp:gcc ../dockerfiles/cpp", shell=True)
    subprocess.run("docker build -f ../dockerfiles/clang/Dockerfile.clang -t hello-cpp:clang ../dockerfiles/clang", shell=True)
    print("All images built successfully!")
    subprocess.run("docker images | grep hello-", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("chmod +x "$SCRIPTS_DIR/build_all.sh"", shell=True)
    # Test all containers script
    subprocess.run("cat > "$SCRIPTS_DIR/test_all.sh" << 'EOF'", shell=True)
    # Test all Docker containers
    subprocess.run("set -e", shell=True)
    print("Testing all Docker configurations...")
    # Test TypeScript
    print("Testing TypeScript container...")
    subprocess.run("docker run --rm hello-ts:dev node -e "console.log('Hello from TypeScript Docker test!')"", shell=True)
    # Test Python
    print("Testing Python container...")
    subprocess.run("docker run --rm hello-py:dev python -c "print('Hello from Python Docker test!')"", shell=True)
    # Test C++ GCC
    print("Testing C++ GCC container...")
    subprocess.run("docker run --rm hello-cpp:gcc echo "C++ GCC container works!"", shell=True)
    # Test C++ Clang
    print("Testing C++ Clang container...")
    subprocess.run("docker run --rm hello-cpp:clang echo "C++ Clang container works!"", shell=True)
    print("All container tests passed!")
    subprocess.run("EOF", shell=True)
    subprocess.run("chmod +x "$SCRIPTS_DIR/test_all.sh"", shell=True)
    # Cross-platform build script
    subprocess.run("cat > "$SCRIPTS_DIR/build_multiarch.sh" << 'EOF'", shell=True)
    # Build multi-architecture Docker images
    subprocess.run("set -e", shell=True)
    subprocess.run("PLATFORMS="linux/amd64,linux/arm64,linux/arm/v7"", shell=True)
    subprocess.run("IMAGE_PREFIX="hello"", shell=True)
    print("Building multi-architecture images for platforms: $PLATFORMS")
    # Enable Docker buildx
    subprocess.run("docker buildx create --use --name multiarch-builder || true", shell=True)
    subprocess.run("docker buildx inspect --bootstrap", shell=True)
    # Build TypeScript multi-arch
    print("Building TypeScript multi-arch image...")
    subprocess.run("docker buildx build \", shell=True)
    subprocess.run("--platform $PLATFORMS \", shell=True)
    subprocess.run("-f ../dockerfiles/typescript/Dockerfile.prod \", shell=True)
    subprocess.run("-t $IMAGE_PREFIX-ts:multiarch \", shell=True)
    subprocess.run("--push \", shell=True)
    subprocess.run("../dockerfiles/typescript", shell=True)
    # Build Python multi-arch
    print("Building Python multi-arch image...")
    subprocess.run("docker buildx build \", shell=True)
    subprocess.run("--platform $PLATFORMS \", shell=True)
    subprocess.run("-f ../dockerfiles/python/Dockerfile.dev \", shell=True)
    subprocess.run("-t $IMAGE_PREFIX-py:multiarch \", shell=True)
    subprocess.run("--push \", shell=True)
    subprocess.run("../dockerfiles/python", shell=True)
    print("Multi-architecture builds complete!")
    subprocess.run("EOF", shell=True)
    subprocess.run("chmod +x "$SCRIPTS_DIR/build_multiarch.sh"", shell=True)
    subprocess.run("log SUCCESS "Docker scripts created"", shell=True)
    subprocess.run("}", shell=True)
    # Create documentation
    subprocess.run("create_documentation() {", shell=True)
    subprocess.run("log INFO "Creating Docker documentation..."", shell=True)
    subprocess.run("cat > "$DOCKER_DIR/README.md" << 'EOF'", shell=True)
    # Docker Environments for Multi-Language Development
    subprocess.run("This directory contains Docker configurations for TypeScript, Python, and C++ development with various compilers and tools.", shell=True)
    # # Directory Structure
    subprocess.run("```", shell=True)
    subprocess.run("docker_environments/", shell=True)
    subprocess.run("├── dockerfiles/", shell=True)
    subprocess.run("│   ├── typescript/   # Node.js/TypeScript Dockerfiles", shell=True)
    subprocess.run("│   ├── python/       # Python Dockerfiles (including UV)", shell=True)
    subprocess.run("│   ├── cpp/          # C++ with GCC Dockerfiles", shell=True)
    subprocess.run("│   └── clang/        # C++ with Clang/LLVM Dockerfiles", shell=True)
    subprocess.run("├── compose/          # Docker Compose configurations", shell=True)
    subprocess.run("└── scripts/          # Build and test scripts", shell=True)
    subprocess.run("```", shell=True)
    # # Quick Start
    # ## Build All Images
    subprocess.run("```bash", shell=True)
    os.chdir("scripts")
    subprocess.run("./build_all.sh", shell=True)
    subprocess.run("```", shell=True)
    # ## Test All Configurations
    subprocess.run("```bash", shell=True)
    os.chdir("scripts")
    subprocess.run("./test_all.sh", shell=True)
    subprocess.run("```", shell=True)
    # ## Run with Docker Compose
    subprocess.run("```bash", shell=True)
    os.chdir("compose")
    subprocess.run("docker-compose up", shell=True)
    subprocess.run("```", shell=True)
    # # Language-Specific Configurations
    # ## TypeScript/Node.js
    subprocess.run("**Development:**", shell=True)
    subprocess.run("```bash", shell=True)
    subprocess.run("docker build -f dockerfiles/typescript/Dockerfile.dev -t myapp:dev .", shell=True)
    subprocess.run("docker run -p 3000:3000 -v $(pwd):/app myapp:dev", shell=True)
    subprocess.run("```", shell=True)
    subprocess.run("**Production:**", shell=True)
    subprocess.run("```bash", shell=True)
    subprocess.run("docker build -f dockerfiles/typescript/Dockerfile.prod -t myapp:prod .", shell=True)
    subprocess.run("docker run -p 3000:3000 myapp:prod", shell=True)
    subprocess.run("```", shell=True)
    # ## Python
    subprocess.run("**With pip:**", shell=True)
    subprocess.run("```bash", shell=True)
    subprocess.run("docker build -f dockerfiles/python/Dockerfile.dev -t myapp:dev .", shell=True)
    subprocess.run("docker run -p 5000:5000 -v $(pwd):/app myapp:dev", shell=True)
    subprocess.run("```", shell=True)
    subprocess.run("**With UV package manager:**", shell=True)
    subprocess.run("```bash", shell=True)
    subprocess.run("docker build -f dockerfiles/python/Dockerfile.uv -t myapp:uv .", shell=True)
    subprocess.run("docker run -p 5000:5000 myapp:uv", shell=True)
    subprocess.run("```", shell=True)
    # ## C++
    subprocess.run("**With GCC:**", shell=True)
    subprocess.run("```bash", shell=True)
    subprocess.run("docker build -f dockerfiles/cpp/Dockerfile.gcc -t myapp:gcc .", shell=True)
    subprocess.run("docker run myapp:gcc", shell=True)
    subprocess.run("```", shell=True)
    subprocess.run("**With Clang:**", shell=True)
    subprocess.run("```bash", shell=True)
    subprocess.run("docker build -f dockerfiles/clang/Dockerfile.clang -t myapp:clang .", shell=True)
    subprocess.run("docker run myapp:clang", shell=True)
    subprocess.run("```", shell=True)
    subprocess.run("**Clang Plugin Development:**", shell=True)
    subprocess.run("```bash", shell=True)
    subprocess.run("docker build -f dockerfiles/clang/Dockerfile.plugin -t myplugin:dev .", shell=True)
    subprocess.run("docker run -v $(pwd):/plugin myplugin:dev", shell=True)
    subprocess.run("```", shell=True)
    # # Multi-Architecture Support
    subprocess.run("Build for multiple architectures:", shell=True)
    subprocess.run("```bash", shell=True)
    os.chdir("scripts")
    subprocess.run("./build_multiarch.sh", shell=True)
    subprocess.run("```", shell=True)
    subprocess.run("Supported platforms:", shell=True)
    subprocess.run("- linux/amd64 (x86_64)", shell=True)
    subprocess.run("- linux/arm64 (ARM 64-bit)", shell=True)
    subprocess.run("- linux/arm/v7 (ARM 32-bit)", shell=True)
    # # Library Development
    subprocess.run("For C++ or Python library development:", shell=True)
    subprocess.run("```bash", shell=True)
    os.chdir("compose")
    subprocess.run("docker-compose -f docker-compose.library.yml up", shell=True)
    subprocess.run("```", shell=True)
    # # Hello World Examples
    subprocess.run("Each configuration includes a hello world implementation:", shell=True)
    subprocess.run("- **TypeScript**: HTTP server on port 3000", shell=True)
    subprocess.run("- **Python**: Flask server on port 5000", shell=True)
    subprocess.run("- **C++**: Console application", shell=True)
    subprocess.run("Test hello world:", shell=True)
    subprocess.run("```bash", shell=True)
    # TypeScript
    subprocess.run("docker run --rm -p 3000:3000 hello-ts:dev", shell=True)
    # Python
    subprocess.run("docker run --rm -p 5000:5000 hello-py:dev", shell=True)
    # C++
    subprocess.run("docker run --rm hello-cpp:gcc", shell=True)
    subprocess.run("```", shell=True)
    # # Best Practices
    subprocess.run("1. **Multi-stage builds**: Use for smaller production images", shell=True)
    subprocess.run("2. **Non-root user**: Run containers as non-root in production", shell=True)
    subprocess.run("3. **Layer caching**: Order Dockerfile commands for optimal caching", shell=True)
    subprocess.run("4. **Health checks**: Add HEALTHCHECK instructions for production", shell=True)
    subprocess.run("5. **Security scanning**: Use `docker scan` to check for vulnerabilities", shell=True)
    # # Troubleshooting
    subprocess.run("- **Permission issues**: Check file ownership and use proper user in Dockerfile", shell=True)
    subprocess.run("- **Build failures**: Clear Docker cache with `docker builder prune`", shell=True)
    subprocess.run("- **Network issues**: Check Docker network configuration", shell=True)
    subprocess.run("- **Platform issues**: Ensure buildx is enabled for multi-arch builds", shell=True)
    # # Requirements
    subprocess.run("- Docker 20.10+", shell=True)
    subprocess.run("- Docker Compose 2.0+ (optional)", shell=True)
    subprocess.run("- Docker Buildx (for multi-arch)", shell=True)
    subprocess.run("EOF", shell=True)
    subprocess.run("log SUCCESS "Docker documentation created"", shell=True)
    subprocess.run("}", shell=True)
    # Main setup function
    subprocess.run("main() {", shell=True)
    subprocess.run("log INFO "Docker Environment Setup"", shell=True)
    subprocess.run("log INFO "========================"", shell=True)
    # Check Docker installation
    subprocess.run("if ! check_docker; then", shell=True)
    subprocess.run("log ERROR "Docker setup cannot continue without Docker"", shell=True)
    sys.exit(1)
    # Create directory structure
    subprocess.run("setup_directories", shell=True)
    # Create Docker configurations
    subprocess.run("create_typescript_docker", shell=True)
    subprocess.run("create_python_docker", shell=True)
    subprocess.run("create_cpp_docker", shell=True)
    subprocess.run("create_compose_files", shell=True)
    subprocess.run("create_scripts", shell=True)
    subprocess.run("create_documentation", shell=True)
    subprocess.run("log SUCCESS "Docker environment setup complete!"", shell=True)
    subprocess.run("log INFO "Created in: $DOCKER_DIR/"", shell=True)
    subprocess.run("log INFO """, shell=True)
    subprocess.run("log INFO "Quick start:"", shell=True)
    subprocess.run("log INFO "  1. cd $DOCKER_DIR/scripts"", shell=True)
    subprocess.run("log INFO "  2. ./build_all.sh"", shell=True)
    subprocess.run("log INFO "  3. ./test_all.sh"", shell=True)
    subprocess.run("log INFO """, shell=True)
    subprocess.run("log INFO "See $DOCKER_DIR/README.md for detailed documentation"", shell=True)
    subprocess.run("}", shell=True)
    # Run main function
    subprocess.run("main "$@"", shell=True)

if __name__ == "__main__":
    main()