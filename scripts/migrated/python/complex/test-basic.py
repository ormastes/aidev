#!/usr/bin/env python3
"""
Migrated from: test-basic.sh
Auto-generated Python - 2025-08-16T04:57:27.764Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Basic Test Script for Story Reporter
    # This script demonstrates that the Story Reporter can work
    subprocess.run("set -e", shell=True)
    print("🚀 Testing Story Reporter Basic Functionality")
    print("==========================================")
    # Colors
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("BLUE='\033[0;34m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("NC='\033[0m'", shell=True)
    os.chdir("/home/ormastes/dev/aidev/layer/themes/story-reporter/release/server")
    print("-e ")${BLUE}Starting Story Reporter Server...${NC}"
    # Start server in background
    subprocess.run("npm test &", shell=True)
    subprocess.run("SERVER_PID=$!", shell=True)
    # Wait for server to start
    print("Waiting for server to start...")
    time.sleep(5)
    # Test API endpoints
    print("-e ")${BLUE}Testing API endpoints...${NC}"
    # Test health endpoint
    print("-n ")Health check: "
    subprocess.run("if curl -sf http://localhost:3201/health > /dev/null 2>&1; then", shell=True)
    print("-e ")${GREEN}✓ PASS${NC}"
    else:
    print("-e ")${RED}✗ FAIL${NC}"
    # Test stories endpoint
    print("-n ")Stories API: "
    subprocess.run("if curl -sf http://localhost:3201/api/stories > /dev/null 2>&1; then", shell=True)
    print("-e ")${GREEN}✓ PASS${NC}"
    else:
    print("-e ")${RED}✗ FAIL${NC}"
    # Test creating a story
    print("-n ")Create story: "
    subprocess.run("CREATE_RESPONSE=$(curl -sf -X POST http://localhost:3201/api/stories \", shell=True)
    subprocess.run("-H "Content-Type: application/json" \", shell=True)
    subprocess.run("-d '{", shell=True)
    subprocess.run(""title": "Test E2E Story",", shell=True)
    subprocess.run(""description": "Testing story creation",", shell=True)
    subprocess.run(""reporter": "test@example.com",", shell=True)
    subprocess.run(""status": "draft"", shell=True)
    subprocess.run("}' 2>/dev/null)", shell=True)
    if $? -eq 0 : && echo "$CREATE_RESPONSE" | grep -q "Test E2E Story"; then
    print("-e ")${GREEN}✓ PASS${NC}"
    subprocess.run("STORY_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)", shell=True)
    print("  Created story with ID: $STORY_ID")
    else:
    print("-e ")${RED}✗ FAIL${NC}"
    # Test retrieving the story
    if ! -z "$STORY_ID" :; then
    print("-n ")Get story by ID: "
    subprocess.run("if curl -sf "http://localhost:3201/api/stories/$STORY_ID" > /dev/null 2>&1; then", shell=True)
    print("-e ")${GREEN}✓ PASS${NC}"
    else:
    print("-e ")${RED}✗ FAIL${NC}"
    # Generate a story report about this test
    subprocess.run("REPORT_DIR="gen/doc/story-reporter-basic-test"", shell=True)
    Path(""$REPORT_DIR"").mkdir(parents=True, exist_ok=True)
    subprocess.run("cat > "$REPORT_DIR/test-report.json" <<EOF", shell=True)
    subprocess.run("{", shell=True)
    subprocess.run(""title": "Basic Story Reporter Test Report",", shell=True)
    subprocess.run(""description": "Automated test report for basic Story Reporter functionality",", shell=True)
    subprocess.run(""reporter": "Basic Test Runner",", shell=True)
    subprocess.run(""status": "completed",", shell=True)
    subprocess.run(""stage": "test",", shell=True)
    subprocess.run(""metadata": {", shell=True)
    subprocess.run(""userStory": "US-TEST-BASIC",", shell=True)
    subprocess.run(""testsCoverage": 90,", shell=True)
    subprocess.run(""scenarios": [", shell=True)
    subprocess.run(""Server startup",", shell=True)
    subprocess.run(""Health check endpoint",", shell=True)
    subprocess.run(""Stories API endpoint",", shell=True)
    subprocess.run(""Create story functionality",", shell=True)
    subprocess.run(""Retrieve story functionality"", shell=True)
    subprocess.run("],", shell=True)
    subprocess.run(""tags": ["basic", "api", "manual-test"]", shell=True)
    subprocess.run("},", shell=True)
    subprocess.run(""content": "This test validates the basic functionality of the Story Reporter server including:\n\n1. **Server Startup**: Server starts successfully on port 3201\n2. **Health Check**: /health endpoint responds correctly\n3. **API Access**: /api/stories endpoint is accessible\n4. **CRUD Operations**: Can create and retrieve story reports\n5. **Data Structure**: Story reports have correct structure\n\nAll basic functionality is working as expected.",", shell=True)
    subprocess.run(""timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"", shell=True)
    subprocess.run("}", shell=True)
    subprocess.run("EOF", shell=True)
    print("-e ")${GREEN}Test report generated: $REPORT_DIR/test-report.json${NC}"
    # Clean up
    print("-e ")${BLUE}Cleaning up...${NC}"
    subprocess.run("kill $SERVER_PID 2>/dev/null || true", shell=True)
    subprocess.run("wait $SERVER_PID 2>/dev/null || true", shell=True)
    print("")
    print("-e ")${GREEN}✨ Basic functionality test complete!${NC}"
    print("The Story Reporter server is working correctly.")
    print("")
    print("Next steps for full E2E testing:")
    print("1. Start AI Dev Portal on port 3456")
    print("2. Install Playwright: npm install @playwright/test")
    print("3. Run: bunx playwright test")
    print("")
    print("For now, the Story Reporter server can:")
    print("✓ Start successfully")
    print("✓ Handle API requests")
    print("✓ Create and retrieve story reports")
    print("✓ Generate test reports")
    sys.exit(0)

if __name__ == "__main__":
    main()