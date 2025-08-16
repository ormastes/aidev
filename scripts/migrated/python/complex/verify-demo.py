#!/usr/bin/env python3
"""
Migrated from: verify-demo.sh
Auto-generated Python - 2025-08-16T04:57:27.703Z
"""

import os
import sys
import subprocess
import shutil
import glob
from pathlib import Path

def main():
    # Mate Dealer Demo Verification Script
    subprocess.run("set -e", shell=True)
    print("🔍 Verifying Mate Dealer Demo Implementation...")
    print("==============================================")
    print("")
    # Colors
    subprocess.run("GREEN='\033[0;32m'", shell=True)
    subprocess.run("BLUE='\033[0;34m'", shell=True)
    subprocess.run("YELLOW='\033[1;33m'", shell=True)
    subprocess.run("RED='\033[0;31m'", shell=True)
    subprocess.run("NC='\033[0m' # No Color", shell=True)
    subprocess.run("DEMO_DIR="/home/ormastes/dev/aidev/scripts/setup/demo/mate-dealer"", shell=True)
    subprocess.run("ERRORS=0", shell=True)
    # Function to check file exists
    subprocess.run("check_file() {", shell=True)
    if -f "$1" :; then
    print("-e ")${GREEN}✓${NC} $2"
    subprocess.run("return 0", shell=True)
    else:
    print("-e ")${RED}✗${NC} $2 - Missing: $1"
    subprocess.run("((ERRORS++))", shell=True)
    subprocess.run("return 1", shell=True)
    subprocess.run("}", shell=True)
    # Function to check directory exists
    subprocess.run("check_dir() {", shell=True)
    if -d "$1" :; then
    print("-e ")${GREEN}✓${NC} $2"
    subprocess.run("return 0", shell=True)
    else:
    print("-e ")${RED}✗${NC} $2 - Missing: $1"
    subprocess.run("((ERRORS++))", shell=True)
    subprocess.run("return 1", shell=True)
    subprocess.run("}", shell=True)
    # Function to check npm package
    subprocess.run("check_package() {", shell=True)
    subprocess.run("if grep -q "\"$1\"" "$DEMO_DIR/package.json"; then", shell=True)
    print("-e ")${GREEN}✓${NC} Package: $1"
    subprocess.run("return 0", shell=True)
    else:
    print("-e ")${RED}✗${NC} Package: $1 - Not found in package.json"
    subprocess.run("((ERRORS++))", shell=True)
    subprocess.run("return 1", shell=True)
    subprocess.run("}", shell=True)
    print("-e ")${BLUE}1. Checking Project Structure${NC}"
    print("------------------------------")
    subprocess.run("check_dir "$DEMO_DIR" "Demo directory"", shell=True)
    subprocess.run("check_dir "$DEMO_DIR/src" "Source directory"", shell=True)
    subprocess.run("check_dir "$DEMO_DIR/public" "Public directory"", shell=True)
    subprocess.run("check_dir "$DEMO_DIR/tests" "Tests directory"", shell=True)
    subprocess.run("check_dir "$DEMO_DIR/tests/e2e" "E2E tests directory"", shell=True)
    print("")
    print("-e ")${BLUE}2. Checking Core Files${NC}"
    print("----------------------")
    subprocess.run("check_file "$DEMO_DIR/package.json" "Package configuration"", shell=True)
    subprocess.run("check_file "$DEMO_DIR/tsconfig.json" "TypeScript configuration"", shell=True)
    subprocess.run("check_file "$DEMO_DIR/webpack.config.js" "Webpack configuration"", shell=True)
    subprocess.run("check_file "$DEMO_DIR/.env.example" "Environment example"", shell=True)
    subprocess.run("check_file "$DEMO_DIR/setup.sh" "Setup script"", shell=True)
    print("")
    print("-e ")${BLUE}3. Checking Server Implementation${NC}"
    print("---------------------------------")
    subprocess.run("check_file "$DEMO_DIR/src/server.ts" "Express server"", shell=True)
    subprocess.run("check_file "$DEMO_DIR/src/services/ExternalLogger.ts" "External logger service"", shell=True)
    subprocess.run("check_file "$DEMO_DIR/src/services/api.ts" "API service"", shell=True)
    print("")
    print("-e ")${BLUE}4. Checking React Components${NC}"
    print("----------------------------")
    subprocess.run("check_file "$DEMO_DIR/src/index.tsx" "React entry point"", shell=True)
    subprocess.run("check_file "$DEMO_DIR/src/App.tsx" "Main App component"", shell=True)
    subprocess.run("check_file "$DEMO_DIR/public/index.html" "HTML template"", shell=True)
    print("")
    print("-e ")${BLUE}5. Checking Components${NC}"
    print("---------------------")
    subprocess.run("check_file "$DEMO_DIR/src/components/Navigation.tsx" "Navigation component"", shell=True)
    subprocess.run("check_file "$DEMO_DIR/src/components/AppLayout.tsx" "App layout component"", shell=True)
    subprocess.run("check_file "$DEMO_DIR/src/components/SearchFilter.tsx" "Search filter component"", shell=True)
    subprocess.run("check_file "$DEMO_DIR/src/components/DebugPanel.tsx" "Debug panel component"", shell=True)
    print("")
    print("-e ")${BLUE}6. Checking Screens${NC}"
    print("------------------")
    subprocess.run("check_file "$DEMO_DIR/src/screens/Login.tsx" "Login screen"", shell=True)
    subprocess.run("check_file "$DEMO_DIR/src/screens/CustomerDashboard.tsx" "Customer dashboard"", shell=True)
    subprocess.run("check_file "$DEMO_DIR/src/screens/DealerDashboard.tsx" "Dealer dashboard"", shell=True)
    print("")
    print("-e ")${BLUE}7. Checking Hooks and Styles${NC}"
    print("----------------------------")
    subprocess.run("check_file "$DEMO_DIR/src/hooks/useLogger.ts" "Logger hook"", shell=True)
    subprocess.run("check_file "$DEMO_DIR/src/styles/theme.css" "Theme styles"", shell=True)
    print("")
    print("-e ")${BLUE}8. Checking E2E Tests${NC}"
    print("--------------------")
    subprocess.run("check_file "$DEMO_DIR/tests/e2e/mate-dealer-click.spec.ts" "Original E2E tests"", shell=True)
    subprocess.run("check_file "$DEMO_DIR/tests/e2e/mate-dealer-complete.spec.ts" "Complete E2E tests"", shell=True)
    subprocess.run("check_file "$DEMO_DIR/playwright.config.ts" "Playwright configuration"", shell=True)
    subprocess.run("check_file "$DEMO_DIR/run-e2e-tests.sh" "Test runner script"", shell=True)
    print("")
    print("-e ")${BLUE}9. Checking Key Dependencies${NC}"
    print("----------------------------")
    subprocess.run("check_package "express"", shell=True)
    subprocess.run("check_package "react"", shell=True)
    subprocess.run("check_package "react-dom"", shell=True)
    subprocess.run("check_package "react-router-dom"", shell=True)
    subprocess.run("check_package "bcrypt"", shell=True)
    subprocess.run("check_package "jsonwebtoken"", shell=True)
    subprocess.run("check_package "helmet"", shell=True)
    subprocess.run("check_package "cors"", shell=True)
    subprocess.run("check_package "@playwright/test"", shell=True)
    subprocess.run("check_package "webpack"", shell=True)
    subprocess.run("check_package "typescript"", shell=True)
    print("")
    print("-e ")${BLUE}10. Checking Security Features${NC}"
    print("------------------------------")
    subprocess.run("if grep -q "bcrypt" "$DEMO_DIR/src/server.ts"; then", shell=True)
    print("-e ")${GREEN}✓${NC} Password hashing with bcrypt"
    else:
    print("-e ")${RED}✗${NC} Password hashing not implemented"
    subprocess.run("((ERRORS++))", shell=True)
    subprocess.run("if grep -q "helmet" "$DEMO_DIR/src/server.ts"; then", shell=True)
    print("-e ")${GREEN}✓${NC} Security headers with helmet"
    else:
    print("-e ")${RED}✗${NC} Security headers not implemented"
    subprocess.run("((ERRORS++))", shell=True)
    subprocess.run("if grep -q "rate-limit" "$DEMO_DIR/src/server.ts"; then", shell=True)
    print("-e ")${GREEN}✓${NC} Rate limiting implemented"
    else:
    print("-e ")${RED}✗${NC} Rate limiting not implemented"
    subprocess.run("((ERRORS++))", shell=True)
    subprocess.run("if grep -q "jwt" "$DEMO_DIR/src/server.ts"; then", shell=True)
    print("-e ")${GREEN}✓${NC} JWT authentication"
    else:
    print("-e ")${RED}✗${NC} JWT authentication not implemented"
    subprocess.run("((ERRORS++))", shell=True)
    print("")
    print("-e ")${BLUE}11. Checking Feature Implementation${NC}"
    print("-----------------------------------")
    subprocess.run("if grep -q "ExternalLogger" "$DEMO_DIR/src/App.tsx"; then", shell=True)
    print("-e ")${GREEN}✓${NC} External logging system"
    else:
    print("-e ")${RED}✗${NC} External logging not integrated"
    subprocess.run("((ERRORS++))", shell=True)
    subprocess.run("if grep -q "Navigation" "$DEMO_DIR/src/App.tsx"; then", shell=True)
    print("-e ")${GREEN}✓${NC} Role-based navigation"
    else:
    print("-e ")${RED}✗${NC} Role-based navigation not implemented"
    subprocess.run("((ERRORS++))", shell=True)
    subprocess.run("if grep -q "SearchFilter" "$DEMO_DIR/src/screens/CustomerDashboard.tsx"; then", shell=True)
    print("-e ")${GREEN}✓${NC} Enhanced search and filtering"
    else:
    print("-e ")${RED}✗${NC} Enhanced search not implemented"
    subprocess.run("((ERRORS++))", shell=True)
    subprocess.run("if grep -q "DebugPanel" "$DEMO_DIR/src/App.tsx"; then", shell=True)
    print("-e ")${GREEN}✓${NC} Debug panel integration"
    else:
    print("-e ")${RED}✗${NC} Debug panel not integrated"
    subprocess.run("((ERRORS++))", shell=True)
    print("")
    print("-e ")${BLUE}12. Checking Click-Based Testing${NC}"
    print("--------------------------------")
    subprocess.run("if grep -q "await page.click" "$DEMO_DIR/tests/e2e/mate-dealer-complete.spec.ts"; then", shell=True)
    subprocess.run("CLICK_COUNT=$(grep -c "await page.click" "$DEMO_DIR/tests/e2e/mate-dealer-complete.spec.ts")", shell=True)
    print("-e ")${GREEN}✓${NC} Click-based tests implemented ($CLICK_COUNT click actions)"
    else:
    print("-e ")${RED}✗${NC} Click-based tests not found"
    subprocess.run("((ERRORS++))", shell=True)
    print("")
    print("==============================================")
    print("")
    if $ERRORS -eq 0 :; then
    print("-e ")${GREEN}✅ All checks passed! The Mate Dealer demo is fully implemented.${NC}"
    print("")
    print("Next steps:")
    print("1. Run setup: cd $DEMO_DIR && ./setup.sh")
    print("2. Start dev: npm run dev")
    print("3. Run tests: ./run-e2e-tests.sh complete")
    else:
    print("-e ")${RED}❌ Found $ERRORS issues that need to be fixed.${NC}"
    print("")
    print("Please review the errors above and fix them before running the demo.")
    subprocess.run("exit $ERRORS", shell=True)

if __name__ == "__main__":
    main()