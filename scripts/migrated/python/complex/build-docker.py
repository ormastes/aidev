#!/usr/bin/env python3
"""
Migrated from: build-docker.sh
Auto-generated Python - 2025-08-16T04:57:27.750Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Docker Build Script for AI Development Platform
    subprocess.run("set -e", shell=True)
    # Colors for output
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("NC='\033[0m' # No Color", shell=True)
    # Configuration
    subprocess.run("DOCKER_REGISTRY="${DOCKER_REGISTRY:-aidev}"", shell=True)
    subprocess.run("IMAGE_NAME="${IMAGE_NAME:-development}"", shell=True)
    subprocess.run("IMAGE_TAG="${IMAGE_TAG:-latest}"", shell=True)
    subprocess.run("PLATFORMS="${PLATFORMS:-linux/amd64,linux/arm64}"", shell=True)
    subprocess.run("DOCKERFILE="${DOCKERFILE:-dockerfiles/Dockerfile.development}"", shell=True)
    # Parse arguments
    while [[ $# -gt 0 ]]; do:
    subprocess.run("case $1 in", shell=True)
    subprocess.run("--name)", shell=True)
    subprocess.run("IMAGE_NAME="$2"", shell=True)
    subprocess.run("shift 2", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("--tag)", shell=True)
    subprocess.run("IMAGE_TAG="$2"", shell=True)
    subprocess.run("shift 2", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("--platform)", shell=True)
    subprocess.run("PLATFORMS="$2"", shell=True)
    subprocess.run("shift 2", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("--dockerfile)", shell=True)
    subprocess.run("DOCKERFILE="$2"", shell=True)
    subprocess.run("shift 2", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("--push)", shell=True)
    subprocess.run("PUSH_IMAGE=true", shell=True)
    subprocess.run("shift", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("--no-cache)", shell=True)
    subprocess.run("NO_CACHE="--no-cache"", shell=True)
    subprocess.run("shift", shell=True)
    subprocess.run(";;", shell=True)
    subprocess.run("--help)", shell=True)
    print("Usage: $0 [options]")
    print("")
    print("Options:")
    print("  --name NAME        Image name (default: development)")
    print("  --tag TAG          Image tag (default: latest)")
    print("  --platform PLATFORM Platform(s) to build for (default: linux/amd64,linux/arm64)")
    print("  --dockerfile FILE  Dockerfile to use (default: dockerfiles/Dockerfile.development)")
    print("  --push             Push image to registry")
    print("  --no-cache         Build without cache")
    print("  --help             Show this help message")
    sys.exit(0)
    subprocess.run(";;", shell=True)
    subprocess.run("*)", shell=True)
    print("-e ")${RED}Unknown option: $1${NC}"
    sys.exit(1)
    subprocess.run(";;", shell=True)
    subprocess.run("esac", shell=True)
    print("-e ")${GREEN}=== Docker Build Configuration ===${NC}"
    print("Registry: $DOCKER_REGISTRY")
    print("Image: $IMAGE_NAME:$IMAGE_TAG")
    print("Platforms: $PLATFORMS")
    print("Dockerfile: $DOCKERFILE")
    print("")
    # Check if Docker is installed
    subprocess.run("if ! command -v docker &> /dev/null; then", shell=True)
    print("-e ")${RED}Error: Docker is not installed${NC}"
    sys.exit(1)
    # Check if buildx is available
    subprocess.run("if ! docker buildx version &> /dev/null; then", shell=True)
    print("-e ")${YELLOW}Installing Docker buildx...${NC}"
    subprocess.run("docker buildx create --use --name multiarch-builder", shell=True)
    # Build the image
    print("-e ")${GREEN}Building Docker image...${NC}"
    # Multi-platform build
    if [ "$PLATFORMS" == *","* ]:; then
    print("Building for multiple platforms...")
    # Create builder if not exists
    subprocess.run("if ! docker buildx ls | grep -q multiarch-builder; then", shell=True)
    subprocess.run("docker buildx create --use --name multiarch-builder", shell=True)
    # Build command
    subprocess.run("BUILD_CMD="docker buildx build \", shell=True)
    subprocess.run("--platform $PLATFORMS \", shell=True)
    subprocess.run("--tag $DOCKER_REGISTRY/$IMAGE_NAME:$IMAGE_TAG \", shell=True)
    subprocess.run("--file $DOCKERFILE \", shell=True)
    subprocess.run("$NO_CACHE"", shell=True)
    if "$PUSH_IMAGE" = true :; then
    subprocess.run("BUILD_CMD="$BUILD_CMD --push"", shell=True)
    else:
    subprocess.run("BUILD_CMD="$BUILD_CMD --load"", shell=True)
    subprocess.run("BUILD_CMD="$BUILD_CMD ."", shell=True)
    else:
    # Single platform build
    print("Building for single platform...")
    subprocess.run("BUILD_CMD="docker build \", shell=True)
    subprocess.run("--platform $PLATFORMS \", shell=True)
    subprocess.run("--tag $DOCKER_REGISTRY/$IMAGE_NAME:$IMAGE_TAG \", shell=True)
    subprocess.run("--file $DOCKERFILE \", shell=True)
    subprocess.run("$NO_CACHE \", shell=True)
    subprocess.run("."", shell=True)
    # Execute build
    subprocess.run("eval $BUILD_CMD", shell=True)
    if $? -eq 0 :; then
    print("-e ")${GREEN}✅ Docker image built successfully!${NC}"
    print("")
    # Show image info
    subprocess.run("docker images | grep "$DOCKER_REGISTRY/$IMAGE_NAME"", shell=True)
    # Push to registry if requested
    if "$PUSH_IMAGE" = true ] && [[ "$PLATFORMS" != *","* ]:; then
    print("-e ")${GREEN}Pushing image to registry...${NC}"
    subprocess.run("docker push $DOCKER_REGISTRY/$IMAGE_NAME:$IMAGE_TAG", shell=True)
    print("")
    print("-e ")${GREEN}To run the container:${NC}"
    print("  docker run -it --rm $DOCKER_REGISTRY/$IMAGE_NAME:$IMAGE_TAG")
    print("")
    print("-e ")${GREEN}To run with docker-compose:${NC}"
    print("  docker-compose up -d")
    else:
    print("-e ")${RED}❌ Docker build failed!${NC}"
    sys.exit(1)

if __name__ == "__main__":
    main()