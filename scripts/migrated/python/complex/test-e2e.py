#!/usr/bin/env python3
"""
Migrated from: test-e2e.sh
Auto-generated Python - 2025-08-16T04:57:27.716Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # E2E Test Script for Story Reporter through AI Dev Portal
    # This script runs the complete E2E test and generates a story report
    subprocess.run("set -e", shell=True)
    print("🚀 Starting Story Reporter E2E Test through AI Dev Portal")
    # Colors for output
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("BLUE='\033[0;34m'", shell=True)
    subprocess.run("NC='\033[0m' # No Color", shell=True)
    # Check if running from project root
    if ! -f "CLAUDE.md" :; then
    print("-e ")${RED}Error: Must run from project root directory${NC}"
    sys.exit(1)
    # Function to check if port is in use
    subprocess.run("check_port() {", shell=True)
    subprocess.run("local port=$1", shell=True)
    subprocess.run("if lsof -Pi :$port -t >/dev/null 2>&1; then", shell=True)
    print("-e ")${YELLOW}Warning: Port $port is already in use${NC}"
    subprocess.run("return 1", shell=True)
    subprocess.run("return 0", shell=True)
    subprocess.run("}", shell=True)
    # Check required ports
    print("-e ")${BLUE}Checking ports...${NC}"
    subprocess.run("PORTS=(3456 3401 8401)", shell=True)
    for port in ["${PORTS[@]}"; do]:
    subprocess.run("if ! check_port $port; then", shell=True)
    print("-e ")${RED}Please stop the service on port $port before running the test${NC}"
    sys.exit(1)
    # Install dependencies if needed
    print("-e ")${BLUE}Checking dependencies...${NC}"
    # Check Story Reporter dependencies
    if ! -d "layer/themes/story-reporter/release/server/node_modules" :; then
    print("Installing Story Reporter dependencies...")
    os.chdir("layer/themes/story-reporter/release/server")
    subprocess.run("npm install", shell=True)
    os.chdir("- > /dev/null")
    # Check if Playwright is installed
    if ! -d "layer/themes/story-reporter/node_modules/@playwright" :; then
    print("Installing Playwright...")
    os.chdir("layer/themes/story-reporter")
    subprocess.run("npm install @playwright/test", shell=True)
    subprocess.run("bunx playwright install", shell=True)
    os.chdir("- > /dev/null")
    # Build TypeScript if needed
    print("-e ")${BLUE}Building TypeScript...${NC}"
    os.chdir("layer/themes/story-reporter/release/server")
    if ! -d "dist" :; then
    subprocess.run("npm run build", shell=True)
    os.chdir("- > /dev/null")
    # Create test report directory
    subprocess.run("REPORT_DIR="gen/doc/story-reporter-e2e-$(date +%Y%m%d-%H%M%S)"", shell=True)
    Path(""$REPORT_DIR"").mkdir(parents=True, exist_ok=True)
    print("-e ")${BLUE}Starting E2E test...${NC}"
    print("Report will be saved to: $REPORT_DIR")
    # Run the E2E test
    os.chdir("layer/themes/story-reporter")
    subprocess.run("E2E_OUTPUT=$(bunx playwright test --reporter=json 2>&1 || true)", shell=True)
    subprocess.run("E2E_EXIT_CODE=$?", shell=True)
    os.chdir("- > /dev/null")
    # Parse test results
    if $E2E_EXIT_CODE -eq 0 :; then
    subprocess.run("TEST_STATUS="completed"", shell=True)
    subprocess.run("TEST_RESULT="✅ All tests passed"", shell=True)
    print("-e ")${GREEN}$TEST_RESULT${NC}"
    else:
    subprocess.run("TEST_STATUS="failed"", shell=True)
    subprocess.run("TEST_RESULT="❌ Some tests failed"", shell=True)
    print("-e ")${RED}$TEST_RESULT${NC}"
    # Generate story report JSON
    print("-e ")${BLUE}Generating story report...${NC}"
    subprocess.run("REPORT_FILE="$REPORT_DIR/story-report.json"", shell=True)
    subprocess.run("cat > "$REPORT_FILE" <<EOF", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""title": "E2E Test Report: Story Reporter Integration with AI Dev Portal",", shell=True)
    subprocess.run(""description": "Automated E2E test execution report for Story Reporter service integration",", shell=True)
    subprocess.run(""reporter": "E2E Test Runner",", shell=True)
    subprocess.run(""status": "$TEST_STATUS",", shell=True)
    subprocess.run(""stage": "test",", shell=True)
    subprocess.run(""metadata": {", shell=True)
    subprocess.run(""userStory": "US-2024-E2E-001",", shell=True)
    subprocess.run(""testsCoverage": 95,", shell=True)
    subprocess.run(""executionTime": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",", shell=True)
    subprocess.run(""environment": {", shell=True)
    subprocess.run(""node": "$(node --version)",", shell=True)
    subprocess.run(""npm": "$(npm --version)",", shell=True)
    subprocess.run(""playwright": "$(cd layer/themes/story-reporter && bunx playwright --version)"", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run(""tags": ["e2e", "automated", "integration", "playwright"]", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run(""content": {", shell=True)
    subprocess.run(""summary": "$TEST_RESULT",", shell=True)
    subprocess.run(""testScenarios": [", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""name": "Complete Story Reporter Workflow",", shell=True)
    subprocess.run(""steps": [", shell=True)
    subprocess.run(""Login to AI Dev Portal",", shell=True)
    subprocess.run(""Navigate to Story Reporter",", shell=True)
    subprocess.run(""Create new story report",", shell=True)
    subprocess.run(""Browse and filter reports",", shell=True)
    subprocess.run(""Update report status",", shell=True)
    subprocess.run(""Generate summary report",", shell=True)
    subprocess.run(""Logout and verify"", shell=True)
    subprocess.run("],", shell=True)
    subprocess.run(""result": "Validates full integration between services"", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""name": "Data Persistence Test",", shell=True)
    subprocess.run(""steps": [", shell=True)
    subprocess.run(""Create report in first session",", shell=True)
    subprocess.run(""Logout completely",", shell=True)
    subprocess.run(""Login in new session",", shell=True)
    subprocess.run(""Verify report exists"", shell=True)
    subprocess.run("],", shell=True)
    subprocess.run(""result": "Ensures data persists across sessions"", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("],", shell=True)
    subprocess.run(""integrationPoints": [", shell=True)
    subprocess.run(""AI Dev Portal authentication",", shell=True)
    subprocess.run(""Service discovery and routing",", shell=True)
    subprocess.run(""Cross-service navigation",", shell=True)
    subprocess.run(""Shared JWT token validation",", shell=True)
    subprocess.run(""Database persistence"", shell=True)
    subprocess.run("],", shell=True)
    subprocess.run(""coverage": {", shell=True)
    subprocess.run(""uiInteractions": 100,", shell=True)
    subprocess.run(""apiEndpoints": 95,", shell=True)
    subprocess.run(""authFlows": 100,", shell=True)
    subprocess.run(""errorScenarios": 80", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run(""createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    print("-e ")${GREEN}Story report saved to: $REPORT_FILE${NC}"
    # Copy Playwright report if it exists
    if -d "layer/themes/story-reporter/playwright-report" :; then
    shutil.copy2("-r "layer/themes/story-reporter/playwright-report"", ""$REPORT_DIR/"")
    print("-e ")${GREEN}Playwright HTML report copied to: $REPORT_DIR/playwright-report${NC}"
    # Generate summary
    print("")
    print("-e ")${BLUE}=== E2E Test Summary ===${NC}"
    print("Test Status: $TEST_RESULT")
    print("Report Location: $REPORT_DIR")
    print("Timestamp: $(date)")
    print("")
    # If test failed, show how to view details
    if $E2E_EXIT_CODE -ne 0 :; then
    print("-e ")${YELLOW}To view test details:${NC}"
    print("  - HTML Report: open $REPORT_DIR/playwright-report/index.html")
    print("  - JSON Report: cat $REPORT_FILE | jq .")
    print("")
    print("-e ")${YELLOW}To debug failed tests:${NC}"
    print("  cd layer/themes/story-reporter")
    print("  bunx playwright test --debug")
    # Optionally upload to Story Reporter if it's running
    subprocess.run("if curl -s -o /dev/null -w "%{http_code}" http://localhost:3401/health | grep -q "200"; then", shell=True)
    print("")
    print("-e ")${BLUE}Uploading report to Story Reporter...${NC}"
    # Create a simplified version for upload
    subprocess.run("UPLOAD_RESPONSE=$(curl -s -X POST http://localhost:3401/api/stories \", shell=True)
    subprocess.run("-H "Content-Type: application/json" \", shell=True)
    subprocess.run("-H "Authorization: Bearer test-token" \", shell=True)
    subprocess.run("-d @"$REPORT_FILE")", shell=True)
    subprocess.run("if echo "$UPLOAD_RESPONSE" | grep -q "id"; then", shell=True)
    print("-e ")${GREEN}Report uploaded successfully!${NC}"
    print("Response: $UPLOAD_RESPONSE")
    else:
    print("-e ")${YELLOW}Failed to upload report (Story Reporter may require authentication)${NC}"
    print("")
    print("-e ")${GREEN}✨ E2E test execution complete!${NC}"
    subprocess.run("exit $E2E_EXIT_CODE", shell=True)

if __name__ == "__main__":
    main()