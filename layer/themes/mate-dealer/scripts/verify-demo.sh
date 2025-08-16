#!/bin/bash

# Mate Dealer Demo Verification Script
set -e

echo "🔍 Verifying Mate Dealer Demo Implementation..."
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

DEMO_DIR="/home/ormastes/dev/aidev/scripts/setup/demo/mate-dealer"
ERRORS=0

# Function to check file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        return 0
    else
        echo -e "${RED}✗${NC} $2 - Missing: $1"
        ((ERRORS++))
        return 1
    fi
}

# Function to check directory exists
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        return 0
    else
        echo -e "${RED}✗${NC} $2 - Missing: $1"
        ((ERRORS++))
        return 1
    fi
}

# Function to check npm package
check_package() {
    if grep -q "\"$1\"" "$DEMO_DIR/package.json"; then
        echo -e "${GREEN}✓${NC} Package: $1"
        return 0
    else
        echo -e "${RED}✗${NC} Package: $1 - Not found in package.json"
        ((ERRORS++))
        return 1
    fi
}

echo -e "${BLUE}1. Checking Project Structure${NC}"
echo "------------------------------"
check_dir "$DEMO_DIR" "Demo directory"
check_dir "$DEMO_DIR/src" "Source directory"
check_dir "$DEMO_DIR/public" "Public directory"
check_dir "$DEMO_DIR/tests" "Tests directory"
check_dir "$DEMO_DIR/tests/e2e" "E2E tests directory"

echo ""
echo -e "${BLUE}2. Checking Core Files${NC}"
echo "----------------------"
check_file "$DEMO_DIR/package.json" "Package configuration"
check_file "$DEMO_DIR/tsconfig.json" "TypeScript configuration"
check_file "$DEMO_DIR/webpack.config.js" "Webpack configuration"
check_file "$DEMO_DIR/.env.example" "Environment example"
check_file "$DEMO_DIR/setup.sh" "Setup script"

echo ""
echo -e "${BLUE}3. Checking Server Implementation${NC}"
echo "---------------------------------"
check_file "$DEMO_DIR/src/server.ts" "Express server"
check_file "$DEMO_DIR/src/services/ExternalLogger.ts" "External logger service"
check_file "$DEMO_DIR/src/services/api.ts" "API service"

echo ""
echo -e "${BLUE}4. Checking React Components${NC}"
echo "----------------------------"
check_file "$DEMO_DIR/src/index.tsx" "React entry point"
check_file "$DEMO_DIR/src/App.tsx" "Main App component"
check_file "$DEMO_DIR/public/index.html" "HTML template"

echo ""
echo -e "${BLUE}5. Checking Components${NC}"
echo "---------------------"
check_file "$DEMO_DIR/src/components/Navigation.tsx" "Navigation component"
check_file "$DEMO_DIR/src/components/AppLayout.tsx" "App layout component"
check_file "$DEMO_DIR/src/components/SearchFilter.tsx" "Search filter component"
check_file "$DEMO_DIR/src/components/DebugPanel.tsx" "Debug panel component"

echo ""
echo -e "${BLUE}6. Checking Screens${NC}"
echo "------------------"
check_file "$DEMO_DIR/src/screens/Login.tsx" "Login screen"
check_file "$DEMO_DIR/src/screens/CustomerDashboard.tsx" "Customer dashboard"
check_file "$DEMO_DIR/src/screens/DealerDashboard.tsx" "Dealer dashboard"

echo ""
echo -e "${BLUE}7. Checking Hooks and Styles${NC}"
echo "----------------------------"
check_file "$DEMO_DIR/src/hooks/useLogger.ts" "Logger hook"
check_file "$DEMO_DIR/src/styles/theme.css" "Theme styles"

echo ""
echo -e "${BLUE}8. Checking E2E Tests${NC}"
echo "--------------------"
check_file "$DEMO_DIR/tests/e2e/mate-dealer-click.spec.ts" "Original E2E tests"
check_file "$DEMO_DIR/tests/e2e/mate-dealer-complete.spec.ts" "Complete E2E tests"
check_file "$DEMO_DIR/playwright.config.ts" "Playwright configuration"
check_file "$DEMO_DIR/run-e2e-tests.sh" "Test runner script"

echo ""
echo -e "${BLUE}9. Checking Key Dependencies${NC}"
echo "----------------------------"
check_package "express"
check_package "react"
check_package "react-dom"
check_package "react-router-dom"
check_package "bcrypt"
check_package "jsonwebtoken"
check_package "helmet"
check_package "cors"
check_package "@playwright/test"
check_package "webpack"
check_package "typescript"

echo ""
echo -e "${BLUE}10. Checking Security Features${NC}"
echo "------------------------------"
if grep -q "bcrypt" "$DEMO_DIR/src/server.ts"; then
    echo -e "${GREEN}✓${NC} Password hashing with bcrypt"
else
    echo -e "${RED}✗${NC} Password hashing not implemented"
    ((ERRORS++))
fi

if grep -q "helmet" "$DEMO_DIR/src/server.ts"; then
    echo -e "${GREEN}✓${NC} Security headers with helmet"
else
    echo -e "${RED}✗${NC} Security headers not implemented"
    ((ERRORS++))
fi

if grep -q "rate-limit" "$DEMO_DIR/src/server.ts"; then
    echo -e "${GREEN}✓${NC} Rate limiting implemented"
else
    echo -e "${RED}✗${NC} Rate limiting not implemented"
    ((ERRORS++))
fi

if grep -q "jwt" "$DEMO_DIR/src/server.ts"; then
    echo -e "${GREEN}✓${NC} JWT authentication"
else
    echo -e "${RED}✗${NC} JWT authentication not implemented"
    ((ERRORS++))
fi

echo ""
echo -e "${BLUE}11. Checking Feature Implementation${NC}"
echo "-----------------------------------"
if grep -q "ExternalLogger" "$DEMO_DIR/src/App.tsx"; then
    echo -e "${GREEN}✓${NC} External logging system"
else
    echo -e "${RED}✗${NC} External logging not integrated"
    ((ERRORS++))
fi

if grep -q "Navigation" "$DEMO_DIR/src/App.tsx"; then
    echo -e "${GREEN}✓${NC} Role-based navigation"
else
    echo -e "${RED}✗${NC} Role-based navigation not implemented"
    ((ERRORS++))
fi

if grep -q "SearchFilter" "$DEMO_DIR/src/screens/CustomerDashboard.tsx"; then
    echo -e "${GREEN}✓${NC} Enhanced search and filtering"
else
    echo -e "${RED}✗${NC} Enhanced search not implemented"
    ((ERRORS++))
fi

if grep -q "DebugPanel" "$DEMO_DIR/src/App.tsx"; then
    echo -e "${GREEN}✓${NC} Debug panel integration"
else
    echo -e "${RED}✗${NC} Debug panel not integrated"
    ((ERRORS++))
fi

echo ""
echo -e "${BLUE}12. Checking Click-Based Testing${NC}"
echo "--------------------------------"
if grep -q "await page.click" "$DEMO_DIR/tests/e2e/mate-dealer-complete.spec.ts"; then
    CLICK_COUNT=$(grep -c "await page.click" "$DEMO_DIR/tests/e2e/mate-dealer-complete.spec.ts")
    echo -e "${GREEN}✓${NC} Click-based tests implemented ($CLICK_COUNT click actions)"
else
    echo -e "${RED}✗${NC} Click-based tests not found"
    ((ERRORS++))
fi

echo ""
echo "=============================================="
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! The Mate Dealer demo is fully implemented.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run setup: cd $DEMO_DIR && ./setup.sh"
    echo "2. Start dev: npm run dev"
    echo "3. Run tests: ./run-e2e-tests.sh complete"
else
    echo -e "${RED}❌ Found $ERRORS issues that need to be fixed.${NC}"
    echo ""
    echo "Please review the errors above and fix them before running the demo."
fi

exit $ERRORS