#!/bin/bash
# Enhanced Docker run script for test-basic
# Features: SSH, VS Code Server, Remote Debugging

set -e

CONTAINER_NAME="test-basic"
IMAGE="ubuntu:22.04"

# Stop existing container if running
docker stop ${CONTAINER_NAME} 2>/dev/null || true
docker rm ${CONTAINER_NAME} 2>/dev/null || true

echo "Starting Docker container: ${CONTAINER_NAME}"
echo ""

# Run container
docker run \
  --name \
  test-basic \
  --hostname \
  test-basic \
  --platform \
  linux/amd64 \
  -m \
  2G \
  --cpus \
  2 \
  -p \
  2222:22 \
  -p \
  8080:8080 \
  -p \
  1234:1234 \
  -p \
  3000:3000 \
  -p \
  5000:5000 \
  -p \
  8000:8000 \
  -p \
  9229:9229 \
  -e \
  ENABLE_SSH=true \
  -e \
  ENABLE_VSCODE=true \
  -v \
  /home/ormastes/dev/aidev/layer/themes/init_setup-folder/.setup/workspace:/workspace \
  -v \
  /home/ormastes/.ssh:/root/.ssh:ro \
  -v \
  /home/ormastes/.gitconfig:/root/.gitconfig:ro \
  -it \
  ${IMAGE}

echo ""
echo "=== Access Information ==="
echo "SSH: ssh -p 2222 root@localhost (password: docker)"
echo "VS Code: http://localhost:8080 (password: changeme)"

echo ""
echo "Container: docker exec -it ${CONTAINER_NAME} bash"
