#!/bin/bash
# Docker Build Script for AI Development Platform

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOCKER_REGISTRY="${DOCKER_REGISTRY:-aidev}"
IMAGE_NAME="${IMAGE_NAME:-development}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
PLATFORMS="${PLATFORMS:-linux/amd64,linux/arm64}"
DOCKERFILE="${DOCKERFILE:-dockerfiles/Dockerfile.development}"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --name)
      IMAGE_NAME="$2"
      shift 2
      ;;
    --tag)
      IMAGE_TAG="$2"
      shift 2
      ;;
    --platform)
      PLATFORMS="$2"
      shift 2
      ;;
    --dockerfile)
      DOCKERFILE="$2"
      shift 2
      ;;
    --push)
      PUSH_IMAGE=true
      shift
      ;;
    --no-cache)
      NO_CACHE="--no-cache"
      shift
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --name NAME        Image name (default: development)"
      echo "  --tag TAG          Image tag (default: latest)"
      echo "  --platform PLATFORM Platform(s) to build for (default: linux/amd64,linux/arm64)"
      echo "  --dockerfile FILE  Dockerfile to use (default: dockerfiles/Dockerfile.development)"
      echo "  --push             Push image to registry"
      echo "  --no-cache         Build without cache"
      echo "  --help             Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${GREEN}=== Docker Build Configuration ===${NC}"
echo "Registry: $DOCKER_REGISTRY"
echo "Image: $IMAGE_NAME:$IMAGE_TAG"
echo "Platforms: $PLATFORMS"
echo "Dockerfile: $DOCKERFILE"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

# Check if buildx is available
if ! docker buildx version &> /dev/null; then
    echo -e "${YELLOW}Installing Docker buildx...${NC}"
    docker buildx create --use --name multiarch-builder
fi

# Build the image
echo -e "${GREEN}Building Docker image...${NC}"

# Multi-platform build
if [[ "$PLATFORMS" == *","* ]]; then
    echo "Building for multiple platforms..."
    
    # Create builder if not exists
    if ! docker buildx ls | grep -q multiarch-builder; then
        docker buildx create --use --name multiarch-builder
    fi
    
    # Build command
    BUILD_CMD="docker buildx build \
        --platform $PLATFORMS \
        --tag $DOCKER_REGISTRY/$IMAGE_NAME:$IMAGE_TAG \
        --file $DOCKERFILE \
        $NO_CACHE"
    
    if [ "$PUSH_IMAGE" = true ]; then
        BUILD_CMD="$BUILD_CMD --push"
    else
        BUILD_CMD="$BUILD_CMD --load"
    fi
    
    BUILD_CMD="$BUILD_CMD ."
    
else
    # Single platform build
    echo "Building for single platform..."
    BUILD_CMD="docker build \
        --platform $PLATFORMS \
        --tag $DOCKER_REGISTRY/$IMAGE_NAME:$IMAGE_TAG \
        --file $DOCKERFILE \
        $NO_CACHE \
        ."
fi

# Execute build
eval $BUILD_CMD

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Docker image built successfully!${NC}"
    echo ""
    
    # Show image info
    docker images | grep "$DOCKER_REGISTRY/$IMAGE_NAME"
    
    # Push to registry if requested
    if [ "$PUSH_IMAGE" = true ] && [[ "$PLATFORMS" != *","* ]]; then
        echo -e "${GREEN}Pushing image to registry...${NC}"
        docker push $DOCKER_REGISTRY/$IMAGE_NAME:$IMAGE_TAG
    fi
    
    echo ""
    echo -e "${GREEN}To run the container:${NC}"
    echo "  docker run -it --rm $DOCKER_REGISTRY/$IMAGE_NAME:$IMAGE_TAG"
    echo ""
    echo -e "${GREEN}To run with docker-compose:${NC}"
    echo "  docker-compose up -d"
    
else
    echo -e "${RED}❌ Docker build failed!${NC}"
    exit 1
fi