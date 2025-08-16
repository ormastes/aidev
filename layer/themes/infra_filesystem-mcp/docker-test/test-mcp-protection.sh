#!/bin/bash

# Filesystem MCP Protection Test Script
# Tests that CLAUDE.md and .vf.json files are protected from direct modification

set -e

echo "========================================="
echo "Filesystem MCP Protection Test"
echo "========================================="

# Configuration
WORKSPACE_ROOT="${WORKSPACE_ROOT:-$(pwd)}"
TEST_RESULTS_DIR="${TEST_RESULTS_DIR:-./layer/themes/infra_filesystem-mcp/docker-test/results}"
VIOLATIONS_LOG="${TEST_RESULTS_DIR}/violations.log"
SUMMARY_REPORT="${TEST_RESULTS_DIR}/protection-summary.json"

# Ensure results directory exists
mkdir -p "${TEST_RESULTS_DIR}"

# Initialize counters
TOTAL_TESTS=0
PROTECTED_COUNT=0
UNPROTECTED_COUNT=0
VIOLATIONS=()

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test file protection
test_file_protection() {
    local FILE_PATH="$1"
    local FILE_NAME=$(basename "$FILE_PATH")
    
    echo -n "Testing ${FILE_NAME}... "
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ ! -f "${WORKSPACE_ROOT}/${FILE_PATH}" ]; then
        echo -e "${YELLOW}SKIPPED${NC} (file not found)"
        return
    fi
    
    # Read original content
    ORIGINAL_CONTENT=$(cat "${WORKSPACE_ROOT}/${FILE_PATH}")
    
    # Try to modify the file
    TEST_CONTENT="${ORIGINAL_CONTENT}

## TEST MODIFICATION - Should be blocked
This modification should not be allowed: $(date)"
    
    # Attempt modification
    if echo "$TEST_CONTENT" > "${WORKSPACE_ROOT}/${FILE_PATH}" 2>/dev/null; then
        # If write succeeded, restore original immediately
        echo "$ORIGINAL_CONTENT" > "${WORKSPACE_ROOT}/${FILE_PATH}"
        echo -e "${RED}NOT PROTECTED${NC}"
        UNPROTECTED_COUNT=$((UNPROTECTED_COUNT + 1))
        VIOLATIONS+=("${FILE_NAME}: Direct modification allowed")
        echo "[$(date)] ${FILE_NAME}: NOT PROTECTED - Direct modification allowed" >> "$VIOLATIONS_LOG"
        return 1
    else
        echo -e "${GREEN}PROTECTED${NC}"
        PROTECTED_COUNT=$((PROTECTED_COUNT + 1))
        echo "[$(date)] ${FILE_NAME}: PROTECTED - Modification blocked" >> "$VIOLATIONS_LOG"
        return 0
    fi
}

# Function to test MCP server connection
test_mcp_server() {
    local MODE="$1"
    local PORT="$2"
    
    echo -n "Testing MCP server (${MODE} mode) on port ${PORT}... "
    
    # Check if server is running
    if nc -z localhost "$PORT" 2>/dev/null; then
        echo -e "${GREEN}RUNNING${NC}"
        
        # Send test request
        REQUEST='{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
        RESPONSE=$(echo "$REQUEST" | nc localhost "$PORT" -w 2 2>/dev/null || echo "")
        
        if [ -n "$RESPONSE" ]; then
            echo "  Response received: $(echo "$RESPONSE" | head -c 50)..."
            return 0
        else
            echo "  No response received"
            return 1
        fi
    else
        echo -e "${YELLOW}NOT RUNNING${NC}"
        return 1
    fi
}

# Function to test Docker container
test_docker_container() {
    local CONTAINER_NAME="$1"
    
    echo -n "Checking Docker container ${CONTAINER_NAME}... "
    
    if docker ps --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
        echo -e "${GREEN}RUNNING${NC}"
        
        # Get container logs
        docker logs "$CONTAINER_NAME" --tail 10 2>&1 | sed 's/^/  /' || true
        return 0
    else
        echo -e "${RED}NOT RUNNING${NC}"
        return 1
    fi
}

echo ""
echo "1. Testing Direct File Protection"
echo "---------------------------------"

# Test critical files
test_file_protection "CLAUDE.md"
test_file_protection "TASK_QUEUE.vf.json"
test_file_protection "FEATURE.vf.json"
test_file_protection "NAME_ID.vf.json"
test_file_protection "FILE_STRUCTURE.vf.json"

echo ""
echo "2. Testing Root File Creation Prevention"
echo "----------------------------------------"

# Try to create a file in root
echo -n "Testing root file creation... "
if touch "${WORKSPACE_ROOT}/test-violation.txt" 2>/dev/null; then
    rm -f "${WORKSPACE_ROOT}/test-violation.txt"
    echo -e "${RED}NOT PROTECTED${NC}"
    UNPROTECTED_COUNT=$((UNPROTECTED_COUNT + 1))
    VIOLATIONS+=("Root file creation: Allowed")
else
    echo -e "${GREEN}PROTECTED${NC}"
    PROTECTED_COUNT=$((PROTECTED_COUNT + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

echo ""
echo "3. Testing MCP Server Modes"
echo "---------------------------"

# Test different MCP server modes if running
test_mcp_server "strict" 8080
test_mcp_server "enhanced" 8081
test_mcp_server "basic" 8082

echo ""
echo "4. Testing Docker Containers (if available)"
echo "-------------------------------------------"

if command -v docker &> /dev/null; then
    test_docker_container "mcp-test-strict"
    test_docker_container "mcp-test-enhanced"
    test_docker_container "mcp-test-basic"
else
    echo "Docker not available, skipping container tests"
fi

echo ""
echo "5. Testing Violation Detection"
echo "------------------------------"

# Run violation detector if available
DETECTOR_SCRIPT="${WORKSPACE_ROOT}/layer/themes/infra_filesystem-mcp/docker-test/src/violation-detector.js"
if [ -f "$DETECTOR_SCRIPT" ]; then
    echo "Running violation detector..."
    node "$DETECTOR_SCRIPT" 2>&1 | sed 's/^/  /' || true
else
    echo "Violation detector script not found"
fi

echo ""
echo "========================================="
echo "Test Summary"
echo "========================================="
echo "Total Tests: ${TOTAL_TESTS}"
echo -e "Protected: ${GREEN}${PROTECTED_COUNT}${NC}"
echo -e "Unprotected: ${RED}${UNPROTECTED_COUNT}${NC}"

# Generate JSON summary
cat > "$SUMMARY_REPORT" <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "summary": {
    "total_tests": ${TOTAL_TESTS},
    "protected": ${PROTECTED_COUNT},
    "unprotected": ${UNPROTECTED_COUNT},
    "protection_rate": $(echo "scale=2; ${PROTECTED_COUNT} * 100 / ${TOTAL_TESTS}" | bc)
  },
  "violations": [
$(printf '    "%s"' "${VIOLATIONS[@]}" | sed 's/"$/",/' | sed '$ s/,$//')
  ],
  "environment": {
    "workspace": "${WORKSPACE_ROOT}",
    "docker_available": $(command -v docker &> /dev/null && echo "true" || echo "false"),
    "mcp_mode": "${MCP_MODE:-unknown}"
  }
}
EOF

echo ""
echo "Reports saved to:"
echo "  - Violations log: ${VIOLATIONS_LOG}"
echo "  - Summary report: ${SUMMARY_REPORT}"

# Exit with error if any files are unprotected
if [ ${UNPROTECTED_COUNT} -gt 0 ]; then
    echo ""
    echo -e "${RED}ERROR: ${UNPROTECTED_COUNT} files are not properly protected!${NC}"
    echo "Ensure MCP server is running in strict or enhanced mode."
    exit 1
else
    echo ""
    echo -e "${GREEN}SUCCESS: All files are properly protected!${NC}"
    exit 0
fi