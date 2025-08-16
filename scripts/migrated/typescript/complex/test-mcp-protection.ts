#!/usr/bin/env bun
/**
 * Migrated from: test-mcp-protection.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.717Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Filesystem MCP Protection Test Script
  // Tests that CLAUDE.md and .vf.json files are protected from direct modification
  await $`set -e`;
  console.log("=========================================");
  console.log("Filesystem MCP Protection Test");
  console.log("=========================================");
  // Configuration
  await $`WORKSPACE_ROOT="${WORKSPACE_ROOT:-$(pwd)}"`;
  await $`TEST_RESULTS_DIR="${TEST_RESULTS_DIR:-./layer/themes/infra_filesystem-mcp/docker-test/results}"`;
  await $`VIOLATIONS_LOG="${TEST_RESULTS_DIR}/violations.log"`;
  await $`SUMMARY_REPORT="${TEST_RESULTS_DIR}/protection-summary.json"`;
  // Ensure results directory exists
  await mkdir(""${TEST_RESULTS_DIR}"", { recursive: true });
  // Initialize counters
  await $`TOTAL_TESTS=0`;
  await $`PROTECTED_COUNT=0`;
  await $`UNPROTECTED_COUNT=0`;
  await $`VIOLATIONS=()`;
  // Color codes for output
  await $`RED='\033[0;31m'`;
  await $`GREEN='\033[0;32m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`NC='\033[0m' # No Color`;
  // Function to test file protection
  await $`test_file_protection() {`;
  await $`local FILE_PATH="$1"`;
  await $`local FILE_NAME=$(basename "$FILE_PATH")`;
  console.log("-n ");Testing ${FILE_NAME}... "
  await $`TOTAL_TESTS=$((TOTAL_TESTS + 1))`;
  if (! -f "${WORKSPACE_ROOT}/${FILE_PATH}" ) {; then
  console.log("-e ");${YELLOW}SKIPPED${NC} (file not found)"
  await $`return`;
  }
  // Read original content
  await $`ORIGINAL_CONTENT=$(cat "${WORKSPACE_ROOT}/${FILE_PATH}")`;
  // Try to modify the file
  await $`TEST_CONTENT="${ORIGINAL_CONTENT}`;
  // # TEST MODIFICATION - Should be blocked
  await $`This modification should not be allowed: $(date)"`;
  // Attempt modification
  await $`if echo "$TEST_CONTENT" > "${WORKSPACE_ROOT}/${FILE_PATH}" 2>/dev/null; then`;
  // If write succeeded, restore original immediately
  console.log("$ORIGINAL_CONTENT"); > "${WORKSPACE_ROOT}/${FILE_PATH}"
  console.log("-e ");${RED}NOT PROTECTED${NC}"
  await $`UNPROTECTED_COUNT=$((UNPROTECTED_COUNT + 1))`;
  await $`VIOLATIONS+=("${FILE_NAME}: Direct modification allowed")`;
  console.log("[$(date)] ${FILE_NAME}: NOT PROTECTED - Direct modification allowed"); >> "$VIOLATIONS_LOG"
  await $`return 1`;
  } else {
  console.log("-e ");${GREEN}PROTECTED${NC}"
  await $`PROTECTED_COUNT=$((PROTECTED_COUNT + 1))`;
  console.log("[$(date)] ${FILE_NAME}: PROTECTED - Modification blocked"); >> "$VIOLATIONS_LOG"
  await $`return 0`;
  }
  await $`}`;
  // Function to test MCP server connection
  await $`test_mcp_server() {`;
  await $`local MODE="$1"`;
  await $`local PORT="$2"`;
  console.log("-n ");Testing MCP server (${MODE} mode) on port ${PORT}... "
  // Check if server is running
  await $`if nc -z localhost "$PORT" 2>/dev/null; then`;
  console.log("-e ");${GREEN}RUNNING${NC}"
  // Send test request
  await $`REQUEST='{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`;
  await $`RESPONSE=$(echo "$REQUEST" | nc localhost "$PORT" -w 2 2>/dev/null || echo "")`;
  if (-n "$RESPONSE" ) {; then
  console.log("  Response received: $(echo ");$RESPONSE" | head -c 50)..."
  await $`return 0`;
  } else {
  console.log("  No response received");
  await $`return 1`;
  }
  } else {
  console.log("-e ");${YELLOW}NOT RUNNING${NC}"
  await $`return 1`;
  }
  await $`}`;
  // Function to test Docker container
  await $`test_docker_container() {`;
  await $`local CONTAINER_NAME="$1"`;
  console.log("-n ");Checking Docker container ${CONTAINER_NAME}... "
  await $`if docker ps --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then`;
  console.log("-e ");${GREEN}RUNNING${NC}"
  // Get container logs
  await $`docker logs "$CONTAINER_NAME" --tail 10 2>&1 | sed 's/^/  /' || true`;
  await $`return 0`;
  } else {
  console.log("-e ");${RED}NOT RUNNING${NC}"
  await $`return 1`;
  }
  await $`}`;
  console.log("");
  console.log("1. Testing Direct File Protection");
  console.log("---------------------------------");
  // Test critical files
  await $`test_file_protection "CLAUDE.md"`;
  await $`test_file_protection "TASK_QUEUE.vf.json"`;
  await $`test_file_protection "FEATURE.vf.json"`;
  await $`test_file_protection "NAME_ID.vf.json"`;
  await $`test_file_protection "FILE_STRUCTURE.vf.json"`;
  console.log("");
  console.log("2. Testing Root File Creation Prevention");
  console.log("----------------------------------------");
  // Try to create a file in root
  console.log("-n ");Testing root file creation... "
  await $`if touch "${WORKSPACE_ROOT}/test-violation.txt" 2>/dev/null; then`;
  await $`rm -f "${WORKSPACE_ROOT}/test-violation.txt"`;
  console.log("-e ");${RED}NOT PROTECTED${NC}"
  await $`UNPROTECTED_COUNT=$((UNPROTECTED_COUNT + 1))`;
  await $`VIOLATIONS+=("Root file creation: Allowed")`;
  } else {
  console.log("-e ");${GREEN}PROTECTED${NC}"
  await $`PROTECTED_COUNT=$((PROTECTED_COUNT + 1))`;
  }
  await $`TOTAL_TESTS=$((TOTAL_TESTS + 1))`;
  console.log("");
  console.log("3. Testing MCP Server Modes");
  console.log("---------------------------");
  // Test different MCP server modes if running
  await $`test_mcp_server "strict" 8080`;
  await $`test_mcp_server "enhanced" 8081`;
  await $`test_mcp_server "basic" 8082`;
  console.log("");
  console.log("4. Testing Docker Containers (if available)");
  console.log("-------------------------------------------");
  await $`if command -v docker &> /dev/null; then`;
  await $`test_docker_container "mcp-test-strict"`;
  await $`test_docker_container "mcp-test-enhanced"`;
  await $`test_docker_container "mcp-test-basic"`;
  } else {
  console.log("Docker not available, skipping container tests");
  }
  console.log("");
  console.log("5. Testing Violation Detection");
  console.log("------------------------------");
  // Run violation detector if available
  await $`DETECTOR_SCRIPT="${WORKSPACE_ROOT}/layer/themes/infra_filesystem-mcp/docker-test/src/violation-detector.js"`;
  if (-f "$DETECTOR_SCRIPT" ) {; then
  console.log("Running violation detector...");
  await $`node "$DETECTOR_SCRIPT" 2>&1 | sed 's/^/  /' || true`;
  } else {
  console.log("Violation detector script not found");
  }
  console.log("");
  console.log("=========================================");
  console.log("Test Summary");
  console.log("=========================================");
  console.log("Total Tests: ${TOTAL_TESTS}");
  console.log("-e ");Protected: ${GREEN}${PROTECTED_COUNT}${NC}"
  console.log("-e ");Unprotected: ${RED}${UNPROTECTED_COUNT}${NC}"
  // Generate JSON summary
  await $`cat > "$SUMMARY_REPORT" <<EOF`;
  await $`{`;
  await $`"timestamp": "$(date -Iseconds)",`;
  await $`"summary": {`;
  await $`"total_tests": ${TOTAL_TESTS},`;
  await $`"protected": ${PROTECTED_COUNT},`;
  await $`"unprotected": ${UNPROTECTED_COUNT},`;
  await $`"protection_rate": $(echo "scale=2; ${PROTECTED_COUNT} * 100 / ${TOTAL_TESTS}" | bc)`;
  await $`},`;
  await $`"violations": [`;
  await $`$(printf '    "%s"' "${VIOLATIONS[@]}" | sed 's/"$/",/' | sed '$ s/,$//')`;
  await $`],`;
  await $`"environment": {`;
  await $`"workspace": "${WORKSPACE_ROOT}",`;
  await $`"docker_available": $(command -v docker &> /dev/null && echo "true" || echo "false"),`;
  await $`"mcp_mode": "${MCP_MODE:-unknown}"`;
  await $`}`;
  await $`}`;
  await $`EOF`;
  console.log("");
  console.log("Reports saved to:");
  console.log("  - Violations log: ${VIOLATIONS_LOG}");
  console.log("  - Summary report: ${SUMMARY_REPORT}");
  // Exit with error if any files are unprotected
  if (${UNPROTECTED_COUNT} -gt 0 ) {; then
  console.log("");
  console.log("-e ");${RED}ERROR: ${UNPROTECTED_COUNT} files are not properly protected!${NC}"
  console.log("Ensure MCP server is running in strict or enhanced mode.");
  process.exit(1);
  } else {
  console.log("");
  console.log("-e ");${GREEN}SUCCESS: All files are properly protected!${NC}"
  process.exit(0);
  }
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}