#!/usr/bin/env python3
"""
Migrated from: refactor-hardcoded-values.sh
Auto-generated Python - 2025-08-16T04:57:27.770Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    print("🔧 Refactoring Hardcoded Values")
    print("================================")
    print("")
    # Colors for output
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("NC='\033[0m' # No Color", shell=True)
    # Counter for changes
    subprocess.run("CHANGES=0", shell=True)
    print("📋 This script will help identify and update hardcoded values.")
    print("   It will NOT automatically modify files, but show what needs updating.")
    print("")
    # Function to check file for hardcoded values
    subprocess.run("check_file() {", shell=True)
    subprocess.run("local file=$1", shell=True)
    subprocess.run("local found=false", shell=True)
    # Check for hardcoded ports
    subprocess.run("if grep -q "3456\|3457\|3410\|3400\|3401" "$file" 2>/dev/null; then", shell=True)
    subprocess.run("found=true", shell=True)
    # Check for hardcoded localhost
    subprocess.run("if grep -q "localhost:[0-9]\+" "$file" 2>/dev/null; then", shell=True)
    subprocess.run("found=true", shell=True)
    if "$found" = true :; then
    print("-e ")${YELLOW}⚠️  $file${NC}"
    subprocess.run("CHANGES=$((CHANGES + 1))", shell=True)
    # Show the lines with issues
    subprocess.run("grep -n "3456\|3457\|3410\|3400\|3401\|localhost:[0-9]\+" "$file" 2>/dev/null | head -3", shell=True)
    print("")
    subprocess.run("}", shell=True)
    print("🔍 Checking TypeScript files...")
    print("-------------------------------")
    for file in [$(find . -name "*.ts" -not -path "./node_modules/*" -not -path "./dist/*" 2>/dev/null); do]:
    subprocess.run("check_file "$file"", shell=True)
    print("🔍 Checking JavaScript files...")
    print("-------------------------------")
    for file in [$(find . -name "*.js" -not -path "./node_modules/*" -not -path "./dist/*" 2>/dev/null); do]:
    subprocess.run("check_file "$file"", shell=True)
    print("🔍 Checking Shell scripts...")
    print("----------------------------")
    for file in [$(find . -name "*.sh" -not -path "./node_modules/*" 2>/dev/null); do]:
    subprocess.run("check_file "$file"", shell=True)
    print("")
    print("================================")
    print("📊 Summary")
    print("================================")
    print("-e ")Found ${YELLOW}$CHANGES${NC} files with hardcoded values"
    print("")
    if $CHANGES -gt 0 :; then
    print("📝 Recommended Actions:")
    print("------------------------")
    print("1. Update server files to use config/app.config.ts")
    print("2. Update test files to use test/helpers/test-config.ts")
    print("3. Use environment variables from .env file")
    print("4. Replace hardcoded URLs with dynamic values")
    print("")
    print("Example replacements:")
    print("  Before: const PORT = 3456;")
    print("  After:  const PORT = AppConfig.APP_PORT;")
    print("")
    print("  Before: const BASE_URL = 'http://localhost:3456';")
    print("  After:  const BASE_URL = getBaseUrl();")
    print("")
    print("📄 Configuration files created:")
    print("  - config/app.config.ts (central configuration)")
    print("  - test/helpers/test-config.ts (test configuration)")
    print("  - .env.example (environment variables template)")
    else:
    print("-e ")${GREEN}✅ No hardcoded values found!${NC}"
    print("")
    print("🔒 Security Note:")
    print("-----------------")
    print("Hardcoded values can expose your application to security risks:")
    print("- Makes port scanning easier for attackers")
    print("- Prevents proper environment separation")
    print("- Can leak internal architecture details")
    print("")
    print("Always use configuration files and environment variables!")

if __name__ == "__main__":
    main()