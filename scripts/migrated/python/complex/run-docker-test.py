#!/usr/bin/env python3
"""
Migrated from: run-docker-test.sh
Auto-generated Python - 2025-08-16T04:57:27.738Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Filesystem MCP Docker Test Runner
    print("========================================")
    print("Filesystem MCP Docker Test")
    print("========================================")
    subprocess.run("SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"", shell=True)
    subprocess.run("PROJECT_ROOT="$( cd "$SCRIPT_DIR/../../.." && pwd )"", shell=True)
    subprocess.run("RESULTS_DIR="$SCRIPT_DIR/results"", shell=True)
    # Create results directory
    Path(""$RESULTS_DIR"").mkdir(parents=True, exist_ok=True)
    # Check Docker availability
    subprocess.run("if ! command -v docker &> /dev/null; then", shell=True)
    print("❌ Docker is not installed or not accessible")
    sys.exit(1)
    print("✅ Docker is available")
    print("")
    # Check if we can run Docker commands (might need sudo)
    subprocess.run("if ! docker ps &> /dev/null; then", shell=True)
    print("⚠️  Docker requires elevated permissions")
    print("Running with sudo...")
    subprocess.run("DOCKER_CMD="sudo docker"", shell=True)
    subprocess.run("DOCKER_COMPOSE_CMD="sudo docker-compose"", shell=True)
    else:
    subprocess.run("DOCKER_CMD="docker"", shell=True)
    subprocess.run("DOCKER_COMPOSE_CMD="docker-compose"", shell=True)
    # Clean up previous containers
    print("Cleaning up previous test containers...")
    subprocess.run("$DOCKER_COMPOSE_CMD -f "$SCRIPT_DIR/docker-compose.yml" down 2>/dev/null || true", shell=True)
    # Test 1: Run protection test in Docker container
    print("")
    print("Test 1: Running Protection Test in Docker")
    print("------------------------------------------")
    # Create a simple Dockerfile for testing
    subprocess.run("cat > "$SCRIPT_DIR/Dockerfile.test" << 'EOF'", shell=True)
    subprocess.run("FROM node:20-alpine", shell=True)
    subprocess.run("WORKDIR /app", shell=True)
    subprocess.run("RUN apk add --no-cache bash", shell=True)
    subprocess.run("COPY test-protection.js /app/", shell=True)
    subprocess.run("COPY ../../../CLAUDE.md /workspace/CLAUDE.md", shell=True)
    subprocess.run("COPY ../../../*.vf.json /workspace/", shell=True)
    subprocess.run("CMD ["node", "/app/test-protection.js"]", shell=True)
    subprocess.run("EOF", shell=True)
    # Build test image
    print("Building test image...")
    subprocess.run("$DOCKER_CMD build -f "$SCRIPT_DIR/Dockerfile.test" -t mcp-protection-test "$PROJECT_ROOT" || {", shell=True)
    print("❌ Failed to build Docker image")
    sys.exit(1)
    subprocess.run("}", shell=True)
    # Run protection test in container
    print("Running protection test in container...")
    subprocess.run("$DOCKER_CMD run --rm \", shell=True)
    subprocess.run("-v "$PROJECT_ROOT:/workspace:ro" \", shell=True)
    subprocess.run("-v "$RESULTS_DIR:/results:rw" \", shell=True)
    subprocess.run("-e VF_BASE_PATH=/workspace \", shell=True)
    subprocess.run("mcp-protection-test || {", shell=True)
    print("⚠️  Protection test completed with violations detected")
    subprocess.run("}", shell=True)
    # Test 2: Check if MCP server can run in Docker
    print("")
    print("Test 2: MCP Server in Docker")
    print("-----------------------------")
    # Create MCP server test Dockerfile
    subprocess.run("cat > "$SCRIPT_DIR/Dockerfile.mcp" << 'EOF'", shell=True)
    subprocess.run("FROM node:20-alpine", shell=True)
    subprocess.run("WORKDIR /app", shell=True)
    subprocess.run("RUN apk add --no-cache bash", shell=True)
    subprocess.run("RUN npm install ws @modelcontextprotocol/sdk", shell=True)
    subprocess.run("COPY ../mcp-server-strict.js /app/", shell=True)
    subprocess.run("CMD ["node", "/app/mcp-server-strict.js"]", shell=True)
    subprocess.run("EOF", shell=True)
    # Build MCP server image
    print("Building MCP server image...")
    subprocess.run("$DOCKER_CMD build -f "$SCRIPT_DIR/Dockerfile.mcp" -t mcp-server-test "$SCRIPT_DIR" || {", shell=True)
    print("❌ Failed to build MCP server image")
    sys.exit(1)
    subprocess.run("}", shell=True)
    # Run MCP server in background
    print("Starting MCP server in Docker...")
    subprocess.run("$DOCKER_CMD run -d \", shell=True)
    subprocess.run("--name mcp-server-test \", shell=True)
    subprocess.run("-p 8080:8080 \", shell=True)
    subprocess.run("-v "$PROJECT_ROOT:/workspace:ro" \", shell=True)
    subprocess.run("-e VF_BASE_PATH=/workspace \", shell=True)
    subprocess.run("-e MCP_MODE=strict \", shell=True)
    subprocess.run("mcp-server-test || {", shell=True)
    print("❌ Failed to start MCP server")
    sys.exit(1)
    subprocess.run("}", shell=True)
    # Wait for server to start
    time.sleep(3)
    # Check if server is running
    subprocess.run("if $DOCKER_CMD ps | grep -q mcp-server-test; then", shell=True)
    print("✅ MCP server is running in Docker")
    # Test WebSocket connection
    print("Testing WebSocket connection...")
    subprocess.run("node -e "", shell=True)
    subprocess.run("const WebSocket = require('ws');", shell=True)
    subprocess.run("const ws = new WebSocket('ws://localhost:8080');", shell=True)
    subprocess.run("ws.on('open', () => {", shell=True)
    subprocess.run("console.log('✅ WebSocket connection successful');", shell=True)
    subprocess.run("ws.close();", shell=True)
    subprocess.run("process.exit(0);", shell=True)
    subprocess.run("});", shell=True)
    subprocess.run("ws.on('error', (err) => {", shell=True)
    subprocess.run("console.log('❌ WebSocket connection failed:', err.message);", shell=True)
    subprocess.run("process.exit(1);", shell=True)
    subprocess.run("});", shell=True)
    subprocess.run("setTimeout(() => {", shell=True)
    subprocess.run("console.log('❌ WebSocket connection timeout');", shell=True)
    subprocess.run("process.exit(1);", shell=True)
    subprocess.run("}, 5000);", shell=True)
    subprocess.run("" 2>/dev/null || {", shell=True)
    print("⚠️  Could not connect to MCP server")
    subprocess.run("}", shell=True)
    else:
    print("❌ MCP server failed to start")
    # Clean up
    print("")
    print("Cleaning up...")
    subprocess.run("$DOCKER_CMD stop mcp-server-test 2>/dev/null || true", shell=True)
    subprocess.run("$DOCKER_CMD rm mcp-server-test 2>/dev/null || true", shell=True)
    subprocess.run("rm -f "$SCRIPT_DIR/Dockerfile.test" "$SCRIPT_DIR/Dockerfile.mcp"", shell=True)
    # Generate summary report
    subprocess.run("TIMESTAMP=$(date +"%Y%m%d_%H%M%S")", shell=True)
    subprocess.run("REPORT_FILE="$RESULTS_DIR/docker-test-$TIMESTAMP.md"", shell=True)
    subprocess.run("cat > "$REPORT_FILE" << EOF", shell=True)
    # Filesystem MCP Docker Test Report
    subprocess.run("Generated: $(date)", shell=True)
    # # Test Environment
    subprocess.run("- Docker Version: $($DOCKER_CMD --version)", shell=True)
    subprocess.run("- Project Root: $PROJECT_ROOT", shell=True)
    subprocess.run("- Test Directory: $SCRIPT_DIR", shell=True)
    # # Test Results
    # ## Protection Test
    subprocess.run("- Status: Completed", shell=True)
    subprocess.run("- Files tested for protection in Docker container", shell=True)
    subprocess.run("- Results saved to: $RESULTS_DIR", shell=True)
    # ## MCP Server Test
    subprocess.run("- Docker image build: Success", shell=True)
    subprocess.run("- Container startup: Success", shell=True)
    subprocess.run("- WebSocket connection: Tested", shell=True)
    # # Recommendations
    subprocess.run("1. Ensure MCP server is configured for strict mode in production", shell=True)
    subprocess.run("2. Use Docker containers for isolation and security", shell=True)
    subprocess.run("3. Implement proper file system permissions", shell=True)
    subprocess.run("4. Monitor violation logs regularly", shell=True)
    subprocess.run("EOF", shell=True)
    print("")
    print("========================================")
    print("Test Summary")
    print("========================================")
    print("✅ Docker tests completed")
    print("📄 Report saved to: $REPORT_FILE")
    print("")

if __name__ == "__main__":
    main()