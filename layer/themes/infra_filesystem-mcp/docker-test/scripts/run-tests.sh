#!/bin/bash

# MCP Docker Test Runner Script
# Runs all MCP tests in Docker containers

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🚀 MCP Docker Test Suite"
echo "========================"
echo ""

# Build Docker images
echo "📦 Building Docker images..."
docker-compose -f "$PROJECT_DIR/docker-compose.yml" build

# Create results directory
mkdir -p "$PROJECT_DIR/results"

# Run tests for each mode
echo ""
echo "🧪 Running tests..."
echo ""

# Test strict mode
echo "Testing STRICT mode..."
docker-compose -f "$PROJECT_DIR/docker-compose.yml" run --rm mcp-test-strict

# Test enhanced mode
echo ""
echo "Testing ENHANCED mode..."
docker-compose -f "$PROJECT_DIR/docker-compose.yml" run --rm mcp-test-enhanced

# Test basic mode
echo ""
echo "Testing BASIC mode..."
docker-compose -f "$PROJECT_DIR/docker-compose.yml" run --rm mcp-test-basic

# Collect results
echo ""
echo "📊 Collecting results..."
"$SCRIPT_DIR/collect-results.sh"

# Generate final report
echo ""
echo "📄 Generating final report..."
"$SCRIPT_DIR/generate-report.sh"

# Cleanup
echo ""
echo "🧹 Cleaning up..."
docker-compose -f "$PROJECT_DIR/docker-compose.yml" down

echo ""
echo "✅ Test suite complete!"
echo "Results available in: $PROJECT_DIR/results/"