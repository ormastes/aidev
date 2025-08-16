#!/usr/bin/env python3
"""
Migrated from: run-tests.sh
Auto-generated Python - 2025-08-16T04:57:27.616Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # MCP Docker Test Runner Script
    # Runs all MCP tests in Docker containers
    subprocess.run("set -e", shell=True)
    subprocess.run("SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"", shell=True)
    subprocess.run("PROJECT_DIR="$(dirname "$SCRIPT_DIR")"", shell=True)
    print("🚀 MCP Docker Test Suite")
    print("========================")
    print("")
    # Build Docker images
    print("📦 Building Docker images...")
    subprocess.run("docker-compose -f "$PROJECT_DIR/docker-compose.yml" build", shell=True)
    # Create results directory
    Path(""$PROJECT_DIR/results"").mkdir(parents=True, exist_ok=True)
    # Run tests for each mode
    print("")
    print("🧪 Running tests...")
    print("")
    # Test strict mode
    print("Testing STRICT mode...")
    subprocess.run("docker-compose -f "$PROJECT_DIR/docker-compose.yml" run --rm mcp-test-strict", shell=True)
    # Test enhanced mode
    print("")
    print("Testing ENHANCED mode...")
    subprocess.run("docker-compose -f "$PROJECT_DIR/docker-compose.yml" run --rm mcp-test-enhanced", shell=True)
    # Test basic mode
    print("")
    print("Testing BASIC mode...")
    subprocess.run("docker-compose -f "$PROJECT_DIR/docker-compose.yml" run --rm mcp-test-basic", shell=True)
    # Collect results
    print("")
    print("📊 Collecting results...")
    subprocess.run(""$SCRIPT_DIR/collect-results.sh"", shell=True)
    # Generate final report
    print("")
    print("📄 Generating final report...")
    subprocess.run(""$SCRIPT_DIR/generate-report.sh"", shell=True)
    # Cleanup
    print("")
    print("🧹 Cleaning up...")
    subprocess.run("docker-compose -f "$PROJECT_DIR/docker-compose.yml" down", shell=True)
    print("")
    print("✅ Test suite complete!")
    print("Results available in: $PROJECT_DIR/results/")

if __name__ == "__main__":
    main()