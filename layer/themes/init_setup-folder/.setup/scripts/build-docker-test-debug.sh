#!/bin/bash
# Build Docker image for test-debug

docker build \
  --platform linux/amd64 \
  -t test-debug:latest \
  -f /home/ormastes/dev/aidev/layer/themes/init_setup-folder/.setup/dockerfiles/Dockerfile.test-debug \
  .

echo "Docker image 'test-debug' built successfully"
