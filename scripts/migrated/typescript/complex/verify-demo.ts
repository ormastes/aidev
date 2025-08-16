#!/usr/bin/env bun
/**
 * Migrated from: verify-demo.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.702Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Mate Dealer Demo Verification Script
  await $`set -e`;
  console.log("🔍 Verifying Mate Dealer Demo Implementation...");
  console.log("==============================================");
  console.log("");
  // Colors
  await $`GREEN='\033[0;32m'`;
  await $`BLUE='\033[0;34m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`RED='\033[0;31m'`;
  await $`NC='\033[0m' # No Color`;
  await $`DEMO_DIR="/home/ormastes/dev/aidev/scripts/setup/demo/mate-dealer"`;
  await $`ERRORS=0`;
  // Function to check file exists
  await $`check_file() {`;
  if (-f "$1" ) {; then
  console.log("-e ");${GREEN}✓${NC} $2"
  await $`return 0`;
  } else {
  console.log("-e ");${RED}✗${NC} $2 - Missing: $1"
  await $`((ERRORS++))`;
  await $`return 1`;
  }
  await $`}`;
  // Function to check directory exists
  await $`check_dir() {`;
  if (-d "$1" ) {; then
  console.log("-e ");${GREEN}✓${NC} $2"
  await $`return 0`;
  } else {
  console.log("-e ");${RED}✗${NC} $2 - Missing: $1"
  await $`((ERRORS++))`;
  await $`return 1`;
  }
  await $`}`;
  // Function to check npm package
  await $`check_package() {`;
  await $`if grep -q "\"$1\"" "$DEMO_DIR/package.json"; then`;
  console.log("-e ");${GREEN}✓${NC} Package: $1"
  await $`return 0`;
  } else {
  console.log("-e ");${RED}✗${NC} Package: $1 - Not found in package.json"
  await $`((ERRORS++))`;
  await $`return 1`;
  }
  await $`}`;
  console.log("-e ");${BLUE}1. Checking Project Structure${NC}"
  console.log("------------------------------");
  await $`check_dir "$DEMO_DIR" "Demo directory"`;
  await $`check_dir "$DEMO_DIR/src" "Source directory"`;
  await $`check_dir "$DEMO_DIR/public" "Public directory"`;
  await $`check_dir "$DEMO_DIR/tests" "Tests directory"`;
  await $`check_dir "$DEMO_DIR/tests/e2e" "E2E tests directory"`;
  console.log("");
  console.log("-e ");${BLUE}2. Checking Core Files${NC}"
  console.log("----------------------");
  await $`check_file "$DEMO_DIR/package.json" "Package configuration"`;
  await $`check_file "$DEMO_DIR/tsconfig.json" "TypeScript configuration"`;
  await $`check_file "$DEMO_DIR/webpack.config.js" "Webpack configuration"`;
  await $`check_file "$DEMO_DIR/.env.example" "Environment example"`;
  await $`check_file "$DEMO_DIR/setup.sh" "Setup script"`;
  console.log("");
  console.log("-e ");${BLUE}3. Checking Server Implementation${NC}"
  console.log("---------------------------------");
  await $`check_file "$DEMO_DIR/src/server.ts" "Express server"`;
  await $`check_file "$DEMO_DIR/src/services/ExternalLogger.ts" "External logger service"`;
  await $`check_file "$DEMO_DIR/src/services/api.ts" "API service"`;
  console.log("");
  console.log("-e ");${BLUE}4. Checking React Components${NC}"
  console.log("----------------------------");
  await $`check_file "$DEMO_DIR/src/index.tsx" "React entry point"`;
  await $`check_file "$DEMO_DIR/src/App.tsx" "Main App component"`;
  await $`check_file "$DEMO_DIR/public/index.html" "HTML template"`;
  console.log("");
  console.log("-e ");${BLUE}5. Checking Components${NC}"
  console.log("---------------------");
  await $`check_file "$DEMO_DIR/src/components/Navigation.tsx" "Navigation component"`;
  await $`check_file "$DEMO_DIR/src/components/AppLayout.tsx" "App layout component"`;
  await $`check_file "$DEMO_DIR/src/components/SearchFilter.tsx" "Search filter component"`;
  await $`check_file "$DEMO_DIR/src/components/DebugPanel.tsx" "Debug panel component"`;
  console.log("");
  console.log("-e ");${BLUE}6. Checking Screens${NC}"
  console.log("------------------");
  await $`check_file "$DEMO_DIR/src/screens/Login.tsx" "Login screen"`;
  await $`check_file "$DEMO_DIR/src/screens/CustomerDashboard.tsx" "Customer dashboard"`;
  await $`check_file "$DEMO_DIR/src/screens/DealerDashboard.tsx" "Dealer dashboard"`;
  console.log("");
  console.log("-e ");${BLUE}7. Checking Hooks and Styles${NC}"
  console.log("----------------------------");
  await $`check_file "$DEMO_DIR/src/hooks/useLogger.ts" "Logger hook"`;
  await $`check_file "$DEMO_DIR/src/styles/theme.css" "Theme styles"`;
  console.log("");
  console.log("-e ");${BLUE}8. Checking E2E Tests${NC}"
  console.log("--------------------");
  await $`check_file "$DEMO_DIR/tests/e2e/mate-dealer-click.spec.ts" "Original E2E tests"`;
  await $`check_file "$DEMO_DIR/tests/e2e/mate-dealer-complete.spec.ts" "Complete E2E tests"`;
  await $`check_file "$DEMO_DIR/playwright.config.ts" "Playwright configuration"`;
  await $`check_file "$DEMO_DIR/run-e2e-tests.sh" "Test runner script"`;
  console.log("");
  console.log("-e ");${BLUE}9. Checking Key Dependencies${NC}"
  console.log("----------------------------");
  await $`check_package "express"`;
  await $`check_package "react"`;
  await $`check_package "react-dom"`;
  await $`check_package "react-router-dom"`;
  await $`check_package "bcrypt"`;
  await $`check_package "jsonwebtoken"`;
  await $`check_package "helmet"`;
  await $`check_package "cors"`;
  await $`check_package "@playwright/test"`;
  await $`check_package "webpack"`;
  await $`check_package "typescript"`;
  console.log("");
  console.log("-e ");${BLUE}10. Checking Security Features${NC}"
  console.log("------------------------------");
  await $`if grep -q "bcrypt" "$DEMO_DIR/src/server.ts"; then`;
  console.log("-e ");${GREEN}✓${NC} Password hashing with bcrypt"
  } else {
  console.log("-e ");${RED}✗${NC} Password hashing not implemented"
  await $`((ERRORS++))`;
  }
  await $`if grep -q "helmet" "$DEMO_DIR/src/server.ts"; then`;
  console.log("-e ");${GREEN}✓${NC} Security headers with helmet"
  } else {
  console.log("-e ");${RED}✗${NC} Security headers not implemented"
  await $`((ERRORS++))`;
  }
  await $`if grep -q "rate-limit" "$DEMO_DIR/src/server.ts"; then`;
  console.log("-e ");${GREEN}✓${NC} Rate limiting implemented"
  } else {
  console.log("-e ");${RED}✗${NC} Rate limiting not implemented"
  await $`((ERRORS++))`;
  }
  await $`if grep -q "jwt" "$DEMO_DIR/src/server.ts"; then`;
  console.log("-e ");${GREEN}✓${NC} JWT authentication"
  } else {
  console.log("-e ");${RED}✗${NC} JWT authentication not implemented"
  await $`((ERRORS++))`;
  }
  console.log("");
  console.log("-e ");${BLUE}11. Checking Feature Implementation${NC}"
  console.log("-----------------------------------");
  await $`if grep -q "ExternalLogger" "$DEMO_DIR/src/App.tsx"; then`;
  console.log("-e ");${GREEN}✓${NC} External logging system"
  } else {
  console.log("-e ");${RED}✗${NC} External logging not integrated"
  await $`((ERRORS++))`;
  }
  await $`if grep -q "Navigation" "$DEMO_DIR/src/App.tsx"; then`;
  console.log("-e ");${GREEN}✓${NC} Role-based navigation"
  } else {
  console.log("-e ");${RED}✗${NC} Role-based navigation not implemented"
  await $`((ERRORS++))`;
  }
  await $`if grep -q "SearchFilter" "$DEMO_DIR/src/screens/CustomerDashboard.tsx"; then`;
  console.log("-e ");${GREEN}✓${NC} Enhanced search and filtering"
  } else {
  console.log("-e ");${RED}✗${NC} Enhanced search not implemented"
  await $`((ERRORS++))`;
  }
  await $`if grep -q "DebugPanel" "$DEMO_DIR/src/App.tsx"; then`;
  console.log("-e ");${GREEN}✓${NC} Debug panel integration"
  } else {
  console.log("-e ");${RED}✗${NC} Debug panel not integrated"
  await $`((ERRORS++))`;
  }
  console.log("");
  console.log("-e ");${BLUE}12. Checking Click-Based Testing${NC}"
  console.log("--------------------------------");
  await $`if grep -q "await page.click" "$DEMO_DIR/tests/e2e/mate-dealer-complete.spec.ts"; then`;
  await $`CLICK_COUNT=$(grep -c "await page.click" "$DEMO_DIR/tests/e2e/mate-dealer-complete.spec.ts")`;
  console.log("-e ");${GREEN}✓${NC} Click-based tests implemented ($CLICK_COUNT click actions)"
  } else {
  console.log("-e ");${RED}✗${NC} Click-based tests not found"
  await $`((ERRORS++))`;
  }
  console.log("");
  console.log("==============================================");
  console.log("");
  if ($ERRORS -eq 0 ) {; then
  console.log("-e ");${GREEN}✅ All checks passed! The Mate Dealer demo is fully implemented.${NC}"
  console.log("");
  console.log("Next steps:");
  console.log("1. Run setup: cd $DEMO_DIR && ./setup.sh");
  console.log("2. Start dev: npm run dev");
  console.log("3. Run tests: ./run-e2e-tests.sh complete");
  } else {
  console.log("-e ");${RED}❌ Found $ERRORS issues that need to be fixed.${NC}"
  console.log("");
  console.log("Please review the errors above and fix them before running the demo.");
  }
  await $`exit $ERRORS`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}