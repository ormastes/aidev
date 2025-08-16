#!/usr/bin/env python3
"""
Migrated from: verify-release.sh
Auto-generated Python - 2025-08-16T04:57:27.763Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Verify Mate Dealer Release
    subprocess.run("set -e", shell=True)
    print("🔍 Verifying Mate Dealer Release Setup")
    print("=====================================")
    print("")
    # Colors
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("BLUE='\033[0;34m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("NC='\033[0m' # No Color", shell=True)
    # Check current directory
    print("-e ")${BLUE}Current Location:${NC} $(pwd)"
    print("")
    # Check environment file
    if -f ".env" :; then
    print("-e ")${GREEN}✓${NC} Environment file exists"
    subprocess.run("if grep -q "NODE_ENV=release" .env; then", shell=True)
    print("-e ")${GREEN}✓${NC} NODE_ENV set to release"
    else:
    print("-e ")${RED}✗${NC} NODE_ENV not set to release"
    else:
    print("-e ")${RED}✗${NC} Environment file missing"
    # Check dependencies
    print("")
    print("-e ")${BLUE}Checking dependencies...${NC}"
    if -d "node_modules" :; then
    print("-e ")${GREEN}✓${NC} Dependencies installed"
    else:
    print("-e ")${YELLOW}⚠${NC} Dependencies not installed - run: npm install"
    # Check build
    print("")
    print("-e ")${BLUE}Checking build...${NC}"
    if -d "dist" :; then
    print("-e ")${GREEN}✓${NC} Build directory exists"
    if -f "dist/server.js" :; then
    print("-e ")${GREEN}✓${NC} Server compiled"
    else:
    print("-e ")${RED}✗${NC} Server not compiled"
    else:
    print("-e ")${YELLOW}⚠${NC} Not built - run: npm run build"
    # Check data directory
    print("")
    print("-e ")${BLUE}Checking data directory...${NC}"
    if -d "data" :; then
    print("-e ")${GREEN}✓${NC} Data directory exists"
    else:
    print("-e ")${YELLOW}⚠${NC} Data directory will be created on first run"
    # Check logs directory
    if -d "logs" :; then
    print("-e ")${GREEN}✓${NC} Logs directory exists"
    else:
    print("-e ")${YELLOW}⚠${NC} Logs directory will be created on first run"
    # Check release scripts
    print("")
    print("-e ")${BLUE}Checking release scripts...${NC}"
    if -x "start-release.sh" :; then
    print("-e ")${GREEN}✓${NC} start-release.sh is executable"
    else:
    print("-e ")${RED}✗${NC} start-release.sh not executable"
    if -f "ecosystem.config.js" :; then
    print("-e ")${GREEN}✓${NC} PM2 configuration exists"
    else:
    print("-e ")${RED}✗${NC} PM2 configuration missing"
    # Test build process
    print("")
    print("-e ")${BLUE}Testing build process...${NC}"
    subprocess.run("if npm run build > /dev/null 2>&1; then", shell=True)
    print("-e ")${GREEN}✓${NC} Build successful"
    else:
    print("-e ")${RED}✗${NC} Build failed"
    # Check server health
    print("")
    print("-e ")${BLUE}Quick server test...${NC}"
    subprocess.run("if lsof -Pi :3303 -sTCP:LISTEN -t >/dev/null ; then", shell=True)
    print("-e ")${YELLOW}⚠${NC} Port 3303 already in use"
    # Try health check
    subprocess.run("if curl -s http://localhost:3303/api/health > /dev/null; then", shell=True)
    print("-e ")${GREEN}✓${NC} Health check passed"
    subprocess.run("HEALTH=$(curl -s http://localhost:3303/api/health)", shell=True)
    print("  Response: $HEALTH")
    else:
    print("-e ")${GREEN}✓${NC} Port 3303 is available"
    # Quick start test
    print("-e ")${BLUE}Starting server for quick test...${NC}"
    subprocess.run("NODE_ENV=release timeout 5 node dist/server.js > /tmp/mate-test.log 2>&1 &", shell=True)
    subprocess.run("TEST_PID=$!", shell=True)
    time.sleep(3)
    subprocess.run("if curl -s http://localhost:3303/api/health > /dev/null; then", shell=True)
    print("-e ")${GREEN}✓${NC} Server starts successfully"
    else:
    print("-e ")${RED}✗${NC} Server failed to start"
    subprocess.run("cat /tmp/mate-test.log", shell=True)
    subprocess.run("kill $TEST_PID 2>/dev/null || true", shell=True)
    print("")
    print("=====================================")
    print("-e ")${GREEN}Verification complete!${NC}"
    print("")
    print("To start the release server:")
    print("  ./start-release.sh")
    print("")
    print("Or with PM2:")
    print("  pm2 start ecosystem.config.js")

if __name__ == "__main__":
    main()