#!/usr/bin/env bun
/**
 * Migrated from: build-docker.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.750Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Docker Build Script for AI Development Platform
  await $`set -e`;
  // Colors for output
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`NC='\033[0m' # No Color`;
  // Configuration
  await $`DOCKER_REGISTRY="${DOCKER_REGISTRY:-aidev}"`;
  await $`IMAGE_NAME="${IMAGE_NAME:-development}"`;
  await $`IMAGE_TAG="${IMAGE_TAG:-latest}"`;
  await $`PLATFORMS="${PLATFORMS:-linux/amd64,linux/arm64}"`;
  await $`DOCKERFILE="${DOCKERFILE:-dockerfiles/Dockerfile.development}"`;
  // Parse arguments
  while ([[ $# -gt 0 ]]; do) {
  await $`case $1 in`;
  await $`--name)`;
  await $`IMAGE_NAME="$2"`;
  await $`shift 2`;
  await $`;;`;
  await $`--tag)`;
  await $`IMAGE_TAG="$2"`;
  await $`shift 2`;
  await $`;;`;
  await $`--platform)`;
  await $`PLATFORMS="$2"`;
  await $`shift 2`;
  await $`;;`;
  await $`--dockerfile)`;
  await $`DOCKERFILE="$2"`;
  await $`shift 2`;
  await $`;;`;
  await $`--push)`;
  await $`PUSH_IMAGE=true`;
  await $`shift`;
  await $`;;`;
  await $`--no-cache)`;
  await $`NO_CACHE="--no-cache"`;
  await $`shift`;
  await $`;;`;
  await $`--help)`;
  console.log("Usage: $0 [options]");
  console.log("");
  console.log("Options:");
  console.log("  --name NAME        Image name (default: development)");
  console.log("  --tag TAG          Image tag (default: latest)");
  console.log("  --platform PLATFORM Platform(s) to build for (default: linux/amd64,linux/arm64)");
  console.log("  --dockerfile FILE  Dockerfile to use (default: dockerfiles/Dockerfile.development)");
  console.log("  --push             Push image to registry");
  console.log("  --no-cache         Build without cache");
  console.log("  --help             Show this help message");
  process.exit(0);
  await $`;;`;
  await $`*)`;
  console.log("-e ");${RED}Unknown option: $1${NC}"
  process.exit(1);
  await $`;;`;
  await $`esac`;
  }
  console.log("-e ");${GREEN}=== Docker Build Configuration ===${NC}"
  console.log("Registry: $DOCKER_REGISTRY");
  console.log("Image: $IMAGE_NAME:$IMAGE_TAG");
  console.log("Platforms: $PLATFORMS");
  console.log("Dockerfile: $DOCKERFILE");
  console.log("");
  // Check if Docker is installed
  await $`if ! command -v docker &> /dev/null; then`;
  console.log("-e ");${RED}Error: Docker is not installed${NC}"
  process.exit(1);
  }
  // Check if buildx is available
  await $`if ! docker buildx version &> /dev/null; then`;
  console.log("-e ");${YELLOW}Installing Docker buildx...${NC}"
  await $`docker buildx create --use --name multiarch-builder`;
  }
  // Build the image
  console.log("-e ");${GREEN}Building Docker image...${NC}"
  // Multi-platform build
  if ([ "$PLATFORMS" == *","* ]) {; then
  console.log("Building for multiple platforms...");
  // Create builder if not exists
  await $`if ! docker buildx ls | grep -q multiarch-builder; then`;
  await $`docker buildx create --use --name multiarch-builder`;
  }
  // Build command
  await $`BUILD_CMD="docker buildx build \`;
  await $`--platform $PLATFORMS \`;
  await $`--tag $DOCKER_REGISTRY/$IMAGE_NAME:$IMAGE_TAG \`;
  await $`--file $DOCKERFILE \`;
  await $`$NO_CACHE"`;
  if ("$PUSH_IMAGE" = true ) {; then
  await $`BUILD_CMD="$BUILD_CMD --push"`;
  } else {
  await $`BUILD_CMD="$BUILD_CMD --load"`;
  }
  await $`BUILD_CMD="$BUILD_CMD ."`;
  } else {
  // Single platform build
  console.log("Building for single platform...");
  await $`BUILD_CMD="docker build \`;
  await $`--platform $PLATFORMS \`;
  await $`--tag $DOCKER_REGISTRY/$IMAGE_NAME:$IMAGE_TAG \`;
  await $`--file $DOCKERFILE \`;
  await $`$NO_CACHE \`;
  await $`."`;
  }
  // Execute build
  await $`eval $BUILD_CMD`;
  if ($? -eq 0 ) {; then
  console.log("-e ");${GREEN}✅ Docker image built successfully!${NC}"
  console.log("");
  // Show image info
  await $`docker images | grep "$DOCKER_REGISTRY/$IMAGE_NAME"`;
  // Push to registry if requested
  if ("$PUSH_IMAGE" = true ] && [[ "$PLATFORMS" != *","* ]) {; then
  console.log("-e ");${GREEN}Pushing image to registry...${NC}"
  await $`docker push $DOCKER_REGISTRY/$IMAGE_NAME:$IMAGE_TAG`;
  }
  console.log("");
  console.log("-e ");${GREEN}To run the container:${NC}"
  console.log("  docker run -it --rm $DOCKER_REGISTRY/$IMAGE_NAME:$IMAGE_TAG");
  console.log("");
  console.log("-e ");${GREEN}To run with docker-compose:${NC}"
  console.log("  docker-compose up -d");
  } else {
  console.log("-e ");${RED}❌ Docker build failed!${NC}"
  process.exit(1);
  }
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}