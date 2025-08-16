#!/usr/bin/env bun
/**
 * Migrated from: run-docker-test.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.737Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Filesystem MCP Docker Test Runner
  console.log("========================================");
  console.log("Filesystem MCP Docker Test");
  console.log("========================================");
  await $`SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"`;
  await $`PROJECT_ROOT="$( cd "$SCRIPT_DIR/../../.." && pwd )"`;
  await $`RESULTS_DIR="$SCRIPT_DIR/results"`;
  // Create results directory
  await mkdir(""$RESULTS_DIR"", { recursive: true });
  // Check Docker availability
  await $`if ! command -v docker &> /dev/null; then`;
  console.log("❌ Docker is not installed or not accessible");
  process.exit(1);
  }
  console.log("✅ Docker is available");
  console.log("");
  // Check if we can run Docker commands (might need sudo)
  await $`if ! docker ps &> /dev/null; then`;
  console.log("⚠️  Docker requires elevated permissions");
  console.log("Running with sudo...");
  await $`DOCKER_CMD="sudo docker"`;
  await $`DOCKER_COMPOSE_CMD="sudo docker-compose"`;
  } else {
  await $`DOCKER_CMD="docker"`;
  await $`DOCKER_COMPOSE_CMD="docker-compose"`;
  }
  // Clean up previous containers
  console.log("Cleaning up previous test containers...");
  await $`$DOCKER_COMPOSE_CMD -f "$SCRIPT_DIR/docker-compose.yml" down 2>/dev/null || true`;
  // Test 1: Run protection test in Docker container
  console.log("");
  console.log("Test 1: Running Protection Test in Docker");
  console.log("------------------------------------------");
  // Create a simple Dockerfile for testing
  await $`cat > "$SCRIPT_DIR/Dockerfile.test" << 'EOF'`;
  await $`FROM node:20-alpine`;
  await $`WORKDIR /app`;
  await $`RUN apk add --no-cache bash`;
  await $`COPY test-protection.js /app/`;
  await $`COPY ../../../CLAUDE.md /workspace/CLAUDE.md`;
  await $`COPY ../../../*.vf.json /workspace/`;
  await $`CMD ["node", "/app/test-protection.js"]`;
  await $`EOF`;
  // Build test image
  console.log("Building test image...");
  await $`$DOCKER_CMD build -f "$SCRIPT_DIR/Dockerfile.test" -t mcp-protection-test "$PROJECT_ROOT" || {`;
  console.log("❌ Failed to build Docker image");
  process.exit(1);
  await $`}`;
  // Run protection test in container
  console.log("Running protection test in container...");
  await $`$DOCKER_CMD run --rm \`;
  await $`-v "$PROJECT_ROOT:/workspace:ro" \`;
  await $`-v "$RESULTS_DIR:/results:rw" \`;
  await $`-e VF_BASE_PATH=/workspace \`;
  await $`mcp-protection-test || {`;
  console.log("⚠️  Protection test completed with violations detected");
  await $`}`;
  // Test 2: Check if MCP server can run in Docker
  console.log("");
  console.log("Test 2: MCP Server in Docker");
  console.log("-----------------------------");
  // Create MCP server test Dockerfile
  await $`cat > "$SCRIPT_DIR/Dockerfile.mcp" << 'EOF'`;
  await $`FROM node:20-alpine`;
  await $`WORKDIR /app`;
  await $`RUN apk add --no-cache bash`;
  await $`RUN npm install ws @modelcontextprotocol/sdk`;
  await $`COPY ../mcp-server-strict.js /app/`;
  await $`CMD ["node", "/app/mcp-server-strict.js"]`;
  await $`EOF`;
  // Build MCP server image
  console.log("Building MCP server image...");
  await $`$DOCKER_CMD build -f "$SCRIPT_DIR/Dockerfile.mcp" -t mcp-server-test "$SCRIPT_DIR" || {`;
  console.log("❌ Failed to build MCP server image");
  process.exit(1);
  await $`}`;
  // Run MCP server in background
  console.log("Starting MCP server in Docker...");
  await $`$DOCKER_CMD run -d \`;
  await $`--name mcp-server-test \`;
  await $`-p 8080:8080 \`;
  await $`-v "$PROJECT_ROOT:/workspace:ro" \`;
  await $`-e VF_BASE_PATH=/workspace \`;
  await $`-e MCP_MODE=strict \`;
  await $`mcp-server-test || {`;
  console.log("❌ Failed to start MCP server");
  process.exit(1);
  await $`}`;
  // Wait for server to start
  await Bun.sleep(3 * 1000);
  // Check if server is running
  await $`if $DOCKER_CMD ps | grep -q mcp-server-test; then`;
  console.log("✅ MCP server is running in Docker");
  // Test WebSocket connection
  console.log("Testing WebSocket connection...");
  await $`node -e "`;
  await $`const WebSocket = require('ws');`;
  await $`const ws = new WebSocket('ws://localhost:8080');`;
  await $`ws.on('open', () => {`;
  await $`console.log('✅ WebSocket connection successful');`;
  await $`ws.close();`;
  await $`process.exit(0);`;
  await $`});`;
  await $`ws.on('error', (err) => {`;
  await $`console.log('❌ WebSocket connection failed:', err.message);`;
  await $`process.exit(1);`;
  await $`});`;
  await $`setTimeout(() => {`;
  await $`console.log('❌ WebSocket connection timeout');`;
  await $`process.exit(1);`;
  await $`}, 5000);`;
  await $`" 2>/dev/null || {`;
  console.log("⚠️  Could not connect to MCP server");
  await $`}`;
  } else {
  console.log("❌ MCP server failed to start");
  }
  // Clean up
  console.log("");
  console.log("Cleaning up...");
  await $`$DOCKER_CMD stop mcp-server-test 2>/dev/null || true`;
  await $`$DOCKER_CMD rm mcp-server-test 2>/dev/null || true`;
  await $`rm -f "$SCRIPT_DIR/Dockerfile.test" "$SCRIPT_DIR/Dockerfile.mcp"`;
  // Generate summary report
  await $`TIMESTAMP=$(date +"%Y%m%d_%H%M%S")`;
  await $`REPORT_FILE="$RESULTS_DIR/docker-test-$TIMESTAMP.md"`;
  await $`cat > "$REPORT_FILE" << EOF`;
  // Filesystem MCP Docker Test Report
  await $`Generated: $(date)`;
  // # Test Environment
  await $`- Docker Version: $($DOCKER_CMD --version)`;
  await $`- Project Root: $PROJECT_ROOT`;
  await $`- Test Directory: $SCRIPT_DIR`;
  // # Test Results
  // ## Protection Test
  await $`- Status: Completed`;
  await $`- Files tested for protection in Docker container`;
  await $`- Results saved to: $RESULTS_DIR`;
  // ## MCP Server Test
  await $`- Docker image build: Success`;
  await $`- Container startup: Success`;
  await $`- WebSocket connection: Tested`;
  // # Recommendations
  await $`1. Ensure MCP server is configured for strict mode in production`;
  await $`2. Use Docker containers for isolation and security`;
  await $`3. Implement proper file system permissions`;
  await $`4. Monitor violation logs regularly`;
  await $`EOF`;
  console.log("");
  console.log("========================================");
  console.log("Test Summary");
  console.log("========================================");
  console.log("✅ Docker tests completed");
  console.log("📄 Report saved to: $REPORT_FILE");
  console.log("");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}