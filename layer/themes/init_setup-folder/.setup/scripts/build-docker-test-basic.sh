#!/bin/bash
# Build Docker image for test-basic

docker build \
  --platform linux/amd64 \
  -t test-basic:latest \
  -f /home/ormastes/dev/aidev/layer/themes/init_setup-folder/.setup/dockerfiles/Dockerfile.test-basic \
  .

echo "Docker image 'test-basic' built successfully"
