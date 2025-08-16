#!/usr/bin/env python3
"""
Migrated from: test-mcp-protection.sh
Auto-generated Python - 2025-08-16T04:57:27.718Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Filesystem MCP Protection Test Script
    # Tests that CLAUDE.md and .vf.json files are protected from direct modification
    subprocess.run("set -e", shell=True)
    print("=========================================")
    print("Filesystem MCP Protection Test")
    print("=========================================")
    # Configuration
    subprocess.run("WORKSPACE_ROOT="${WORKSPACE_ROOT:-$(pwd)}"", shell=True)
    subprocess.run("TEST_RESULTS_DIR="${TEST_RESULTS_DIR:-./layer/themes/infra_filesystem-mcp/docker-test/results}"", shell=True)
    subprocess.run("VIOLATIONS_LOG="${TEST_RESULTS_DIR}/violations.log"", shell=True)
    subprocess.run("SUMMARY_REPORT="${TEST_RESULTS_DIR}/protection-summary.json"", shell=True)
    # Ensure results directory exists
    Path(""${TEST_RESULTS_DIR}"").mkdir(parents=True, exist_ok=True)
    # Initialize counters
    subprocess.run("TOTAL_TESTS=0", shell=True)
    subprocess.run("PROTECTED_COUNT=0", shell=True)
    subprocess.run("UNPROTECTED_COUNT=0", shell=True)
    subprocess.run("VIOLATIONS=()", shell=True)
    # Color codes for output
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("NC='\033[0m' # No Color", shell=True)
    # Function to test file protection
    subprocess.run("test_file_protection() {", shell=True)
    subprocess.run("local FILE_PATH="$1"", shell=True)
    subprocess.run("local FILE_NAME=$(basename "$FILE_PATH")", shell=True)
    print("-n ")Testing ${FILE_NAME}... "
    subprocess.run("TOTAL_TESTS=$((TOTAL_TESTS + 1))", shell=True)
    if ! -f "${WORKSPACE_ROOT}/${FILE_PATH}" :; then
    print("-e ")${YELLOW}SKIPPED${NC} (file not found)"
    subprocess.run("return", shell=True)
    # Read original content
    subprocess.run("ORIGINAL_CONTENT=$(cat "${WORKSPACE_ROOT}/${FILE_PATH}")", shell=True)
    # Try to modify the file
    subprocess.run("TEST_CONTENT="${ORIGINAL_CONTENT}", shell=True)
    # # TEST MODIFICATION - Should be blocked
    subprocess.run("This modification should not be allowed: $(date)"", shell=True)
    # Attempt modification
    subprocess.run("if echo "$TEST_CONTENT" > "${WORKSPACE_ROOT}/${FILE_PATH}" 2>/dev/null; then", shell=True)
    # If write succeeded, restore original immediately
    print("$ORIGINAL_CONTENT") > "${WORKSPACE_ROOT}/${FILE_PATH}"
    print("-e ")${RED}NOT PROTECTED${NC}"
    subprocess.run("UNPROTECTED_COUNT=$((UNPROTECTED_COUNT + 1))", shell=True)
    subprocess.run("VIOLATIONS+=("${FILE_NAME}: Direct modification allowed")", shell=True)
    print("[$(date)] ${FILE_NAME}: NOT PROTECTED - Direct modification allowed") >> "$VIOLATIONS_LOG"
    subprocess.run("return 1", shell=True)
    else:
    print("-e ")${GREEN}PROTECTED${NC}"
    subprocess.run("PROTECTED_COUNT=$((PROTECTED_COUNT + 1))", shell=True)
    print("[$(date)] ${FILE_NAME}: PROTECTED - Modification blocked") >> "$VIOLATIONS_LOG"
    subprocess.run("return 0", shell=True)
    subprocess.run("}", shell=True)
    # Function to test MCP server connection
    subprocess.run("test_mcp_server() {", shell=True)
    subprocess.run("local MODE="$1"", shell=True)
    subprocess.run("local PORT="$2"", shell=True)
    print("-n ")Testing MCP server (${MODE} mode) on port ${PORT}... "
    # Check if server is running
    subprocess.run("if nc -z localhost "$PORT" 2>/dev/null; then", shell=True)
    print("-e ")${GREEN}RUNNING${NC}"
    # Send test request
    subprocess.run("REQUEST='{"jsonrpc":"2.0","id":1,"method":"tools/list"}'", shell=True)
    subprocess.run("RESPONSE=$(echo "$REQUEST" | nc localhost "$PORT" -w 2 2>/dev/null || echo "")", shell=True)
    if -n "$RESPONSE" :; then
    print("  Response received: $(echo ")$RESPONSE" | head -c 50)..."
    subprocess.run("return 0", shell=True)
    else:
    print("  No response received")
    subprocess.run("return 1", shell=True)
    else:
    print("-e ")${YELLOW}NOT RUNNING${NC}"
    subprocess.run("return 1", shell=True)
    subprocess.run("}", shell=True)
    # Function to test Docker container
    subprocess.run("test_docker_container() {", shell=True)
    subprocess.run("local CONTAINER_NAME="$1"", shell=True)
    print("-n ")Checking Docker container ${CONTAINER_NAME}... "
    subprocess.run("if docker ps --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then", shell=True)
    print("-e ")${GREEN}RUNNING${NC}"
    # Get container logs
    subprocess.run("docker logs "$CONTAINER_NAME" --tail 10 2>&1 | sed 's/^/  /' || true", shell=True)
    subprocess.run("return 0", shell=True)
    else:
    print("-e ")${RED}NOT RUNNING${NC}"
    subprocess.run("return 1", shell=True)
    subprocess.run("}", shell=True)
    print("")
    print("1. Testing Direct File Protection")
    print("---------------------------------")
    # Test critical files
    subprocess.run("test_file_protection "CLAUDE.md"", shell=True)
    subprocess.run("test_file_protection "TASK_QUEUE.vf.json"", shell=True)
    subprocess.run("test_file_protection "FEATURE.vf.json"", shell=True)
    subprocess.run("test_file_protection "NAME_ID.vf.json"", shell=True)
    subprocess.run("test_file_protection "FILE_STRUCTURE.vf.json"", shell=True)
    print("")
    print("2. Testing Root File Creation Prevention")
    print("----------------------------------------")
    # Try to create a file in root
    print("-n ")Testing root file creation... "
    subprocess.run("if touch "${WORKSPACE_ROOT}/test-violation.txt" 2>/dev/null; then", shell=True)
    subprocess.run("rm -f "${WORKSPACE_ROOT}/test-violation.txt"", shell=True)
    print("-e ")${RED}NOT PROTECTED${NC}"
    subprocess.run("UNPROTECTED_COUNT=$((UNPROTECTED_COUNT + 1))", shell=True)
    subprocess.run("VIOLATIONS+=("Root file creation: Allowed")", shell=True)
    else:
    print("-e ")${GREEN}PROTECTED${NC}"
    subprocess.run("PROTECTED_COUNT=$((PROTECTED_COUNT + 1))", shell=True)
    subprocess.run("TOTAL_TESTS=$((TOTAL_TESTS + 1))", shell=True)
    print("")
    print("3. Testing MCP Server Modes")
    print("---------------------------")
    # Test different MCP server modes if running
    subprocess.run("test_mcp_server "strict" 8080", shell=True)
    subprocess.run("test_mcp_server "enhanced" 8081", shell=True)
    subprocess.run("test_mcp_server "basic" 8082", shell=True)
    print("")
    print("4. Testing Docker Containers (if available)")
    print("-------------------------------------------")
    subprocess.run("if command -v docker &> /dev/null; then", shell=True)
    subprocess.run("test_docker_container "mcp-test-strict"", shell=True)
    subprocess.run("test_docker_container "mcp-test-enhanced"", shell=True)
    subprocess.run("test_docker_container "mcp-test-basic"", shell=True)
    else:
    print("Docker not available, skipping container tests")
    print("")
    print("5. Testing Violation Detection")
    print("------------------------------")
    # Run violation detector if available
    subprocess.run("DETECTOR_SCRIPT="${WORKSPACE_ROOT}/layer/themes/infra_filesystem-mcp/docker-test/src/violation-detector.js"", shell=True)
    if -f "$DETECTOR_SCRIPT" :; then
    print("Running violation detector...")
    subprocess.run("node "$DETECTOR_SCRIPT" 2>&1 | sed 's/^/  /' || true", shell=True)
    else:
    print("Violation detector script not found")
    print("")
    print("=========================================")
    print("Test Summary")
    print("=========================================")
    print("Total Tests: ${TOTAL_TESTS}")
    print("-e ")Protected: ${GREEN}${PROTECTED_COUNT}${NC}"
    print("-e ")Unprotected: ${RED}${UNPROTECTED_COUNT}${NC}"
    # Generate JSON summary
    subprocess.run("cat > "$SUMMARY_REPORT" <<EOF", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""timestamp": "$(date -Iseconds)",", shell=True)
    subprocess.run(""summary": {", shell=True)
    subprocess.run(""total_tests": ${TOTAL_TESTS},", shell=True)
    subprocess.run(""protected": ${PROTECTED_COUNT},", shell=True)
    subprocess.run(""unprotected": ${UNPROTECTED_COUNT},", shell=True)
    subprocess.run(""protection_rate": $(echo "scale=2; ${PROTECTED_COUNT} * 100 / ${TOTAL_TESTS}" | bc)", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run(""violations": [", shell=True)
    subprocess.run("$(printf '    "%s"' "${VIOLATIONS[@]}" | sed 's/"$/",/' | sed '$ s/,$//')", shell=True)
    subprocess.run("],", shell=True)
    subprocess.run(""environment": {", shell=True)
    subprocess.run(""workspace": "${WORKSPACE_ROOT}",", shell=True)
    subprocess.run(""docker_available": $(command -v docker &> /dev/null && echo "true" || echo "false"),", shell=True)
    subprocess.run(""mcp_mode": "${MCP_MODE:-unknown}"", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    print("")
    print("Reports saved to:")
    print("  - Violations log: ${VIOLATIONS_LOG}")
    print("  - Summary report: ${SUMMARY_REPORT}")
    # Exit with error if any files are unprotected
    if ${UNPROTECTED_COUNT} -gt 0 :; then
    print("")
    print("-e ")${RED}ERROR: ${UNPROTECTED_COUNT} files are not properly protected!${NC}"
    print("Ensure MCP server is running in strict or enhanced mode.")
    sys.exit(1)
    else:
    print("")
    print("-e ")${GREEN}SUCCESS: All files are properly protected!${NC}"
    sys.exit(0)

if __name__ == "__main__":
    main()