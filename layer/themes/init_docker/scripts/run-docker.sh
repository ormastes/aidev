#!/bin/bash
# Docker Run Script with SSH and VS Code Server

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
CONTAINER_NAME="${CONTAINER_NAME:-aidev-main}"
IMAGE_NAME="${IMAGE_NAME:-aidev/development:latest}"
SSH_PORT="${SSH_PORT:-2222}"
VSCODE_PORT="${VSCODE_PORT:-8080}"
GDB_PORT="${GDB_PORT:-1234}"
WORKSPACE="${WORKSPACE:-./workspace}"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --name)
      CONTAINER_NAME="$2"
      shift 2
      ;;
    --image)
      IMAGE_NAME="$2"
      shift 2
      ;;
    --ssh-port)
      SSH_PORT="$2"
      shift 2
      ;;
    --vscode-port)
      VSCODE_PORT="$2"
      shift 2
      ;;
    --workspace)
      WORKSPACE="$2"
      shift 2
      ;;
    --debug)
      DEBUG_MODE=true
      shift
      ;;
    --detach)
      DETACH="-d"
      shift
      ;;
    *)
      shift
      ;;
  esac
done

echo -e "${GREEN}=== Starting Docker Development Environment ===${NC}"
echo "Container: $CONTAINER_NAME"
echo "Image: $IMAGE_NAME"
echo ""

# Create workspace if it doesn't exist
mkdir -p "$WORKSPACE"

# Stop existing container if running
if docker ps -a | grep -q "$CONTAINER_NAME"; then
    echo -e "${YELLOW}Stopping existing container...${NC}"
    docker stop "$CONTAINER_NAME" 2>/dev/null || true
    docker rm "$CONTAINER_NAME" 2>/dev/null || true
fi

# Run container
echo -e "${GREEN}Starting container...${NC}"

DOCKER_RUN_CMD="docker run $DETACH \
    --name $CONTAINER_NAME \
    --hostname $CONTAINER_NAME \
    -p $SSH_PORT:22 \
    -p $VSCODE_PORT:8080 \
    -p $GDB_PORT:1234 \
    -p 3000:3000 \
    -p 5000:5000 \
    -p 8000:8000 \
    -p 9229:9229 \
    -p 9000-9010:9000-9010 \
    -v $(pwd)/$WORKSPACE:/workspace \
    -v ~/.ssh:/root/.ssh:ro \
    -v ~/.gitconfig:/root/.gitconfig:ro \
    -e ENABLE_SSH=true \
    -e ENABLE_VSCODE=true"

if [ "$DEBUG_MODE" = true ]; then
    DOCKER_RUN_CMD="$DOCKER_RUN_CMD \
        -e ENABLE_GDB_SERVER=true \
        --cap-add=SYS_PTRACE \
        --security-opt seccomp=unconfined"
fi

DOCKER_RUN_CMD="$DOCKER_RUN_CMD \
    -it \
    $IMAGE_NAME"

eval $DOCKER_RUN_CMD

if [ "$DETACH" = "-d" ]; then
    echo ""
    echo -e "${GREEN}✅ Container started in background${NC}"
    echo ""
    echo -e "${BLUE}=== Access Information ===${NC}"
    echo -e "${GREEN}SSH:${NC} ssh -p $SSH_PORT root@localhost (password: docker)"
    echo -e "${GREEN}VS Code:${NC} http://localhost:$VSCODE_PORT (password: changeme)"
    echo -e "${GREEN}GDB Debug:${NC} gdb -ex 'target remote :$GDB_PORT'"
    echo ""
    echo -e "${BLUE}=== Container Management ===${NC}"
    echo "Attach to container: docker attach $CONTAINER_NAME"
    echo "View logs: docker logs -f $CONTAINER_NAME"
    echo "Execute command: docker exec -it $CONTAINER_NAME bash"
    echo "Stop container: docker stop $CONTAINER_NAME"
    echo ""
    
    # Wait for services to start
    echo -e "${YELLOW}Waiting for services to start...${NC}"
    sleep 3
    
    # Check if SSH is accessible
    if nc -z localhost $SSH_PORT 2>/dev/null; then
        echo -e "${GREEN}✅ SSH server is running${NC}"
    fi
    
    # Check if VS Code is accessible
    if nc -z localhost $VSCODE_PORT 2>/dev/null; then
        echo -e "${GREEN}✅ VS Code Server is running${NC}"
        echo -e "${GREEN}   Open: http://localhost:$VSCODE_PORT${NC}"
    fi
fi