#!/usr/bin/env bun
/**
 * Migrated from: full-demo.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.714Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Complete Mate Dealer Demo Script
  await $`set -e`;
  console.log("🧉 Mate Dealer - Full Demo Experience");
  console.log("=====================================");
  console.log("");
  // Colors
  await $`GREEN='\033[0;32m'`;
  await $`BLUE='\033[0;34m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`RED='\033[0;31m'`;
  await $`CYAN='\033[0;36m'`;
  await $`NC='\033[0m' # No Color`;
  await $`DEMO_DIR="/home/ormastes/dev/aidev/scripts/setup/demo/mate-dealer"`;
  // Function to wait for user
  await $`wait_for_user() {`;
  console.log("");
  console.log("-e ");${YELLOW}Press Enter to continue...${NC}"
  await $`read -r`;
  await $`}`;
  // Function to show section
  await $`show_section() {`;
  console.log("");
  console.log("-e ");${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  console.log("-e ");${CYAN}$1${NC}"
  console.log("-e ");${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  console.log("");
  await $`}`;
  // Introduction
  await $`show_section "🎯 Demo Overview"`;
  console.log("This demo showcases the Mate Dealer marketplace application with:");
  console.log("");
  console.log("✨ Features Demonstrated:");
  console.log("  • Secure authentication with JWT and bcrypt");
  console.log("  • Role-based navigation (Customer/Dealer)");
  console.log("  • Enhanced search and filtering");
  console.log("  • External logging system with debug panel");
  console.log("  • Responsive design with mobile support");
  console.log("  • Click-based E2E testing");
  console.log("  • GUI selector integration");
  console.log("");
  console.log("🛡️ Security Features:");
  console.log("  • Password hashing");
  console.log("  • Rate limiting");
  console.log("  • Security headers (Helmet)");
  console.log("  • Input validation");
  await $`wait_for_user`;
  // Check dependencies
  await $`show_section "📋 Checking Dependencies"`;
  process.chdir(""$DEMO_DIR"");
  if (! -d "node_modules" ) {; then
  console.log("-e ");${YELLOW}Dependencies not installed. Running setup...${NC}"
  await $`./setup.sh`;
  } else {
  console.log("-e ");${GREEN}✓ Dependencies already installed${NC}"
  }
  // Start servers
  await $`show_section "🚀 Starting Servers"`;
  // Check if servers are already running
  await $`SERVER_PID=""`;
  await $`if ! curl -s http://localhost:3303/api/health > /dev/null 2>&1; then`;
  console.log("Starting Mate Dealer server on port 3303...");
  await $`npm run build > /dev/null 2>&1`;
  await $`NODE_ENV=demo npm start > /tmp/mate-dealer-demo.log 2>&1 &`;
  await $`SERVER_PID=$!`;
  await Bun.sleep(5 * 1000);
  console.log("-e ");${GREEN}✓ Server started${NC}"
  } else {
  console.log("-e ");${GREEN}✓ Server already running on port 3303${NC}"
  }
  // Demo walkthrough
  await $`show_section "🎭 Interactive Demo - Customer Journey"`;
  console.log("1. Open your browser to: http://localhost:3303");
  console.log("2. You'll see the login page with role selection");
  console.log("");
  console.log("Customer Login:");
  console.log("  • Email: demo@example.com");
  console.log("  • Password: demo123");
  console.log("");
  console.log("Try these actions:");
  console.log("  • Search for 'Traditional' mate");
  console.log("  • Click the filter button and adjust distance/rating");
  console.log("  • Click on dealer cards to view details");
  console.log("  • Navigate through sidebar menu items");
  console.log("  • Try the mobile view (resize browser)");
  await $`wait_for_user`;
  await $`show_section "💼 Interactive Demo - Dealer Journey"`;
  console.log("1. Logout and switch to Dealer role");
  console.log("2. Login with same credentials");
  console.log("");
  console.log("Dealer Features:");
  console.log("  • View business metrics dashboard");
  console.log("  • Click through different tabs (Products, Customers, Analytics)");
  console.log("  • Navigate using the sidebar");
  console.log("  • Try the quick action buttons");
  await $`wait_for_user`;
  await $`show_section "🐛 Debug Panel Demo"`;
  console.log("Press Ctrl+Shift+D (Cmd+Shift+D on Mac) to toggle the debug panel");
  console.log("");
  console.log("Debug Panel Features:");
  console.log("  • View real-time logs");
  console.log("  • Monitor performance metrics");
  console.log("  • Track API requests");
  console.log("  • Clear logs and toggle auto-refresh");
  await $`wait_for_user`;
  await $`show_section "🧪 Running E2E Tests"`;
  console.log("Now let's run the comprehensive click-based E2E tests...");
  console.log("");
  // Run E2E tests
  await $`if command -v bunx &> /dev/null; then`;
  console.log("-e ");${BLUE}Running E2E tests...${NC}"
  await $`./run-e2e-tests.sh complete`;
  } else {
  console.log("-e ");${RED}Playwright not installed. Skipping E2E tests.${NC}"
  }
  await $`wait_for_user`;
  await $`show_section "🎨 GUI Selector Integration"`;
  console.log("The Mate Dealer demo integrates with the GUI Selector:");
  console.log("");
  console.log("1. Ensure GUI Selector is running on port 3456");
  console.log("2. Login to GUI Selector (admin/admin123)");
  console.log("3. Select a template for the Mate Dealer app");
  console.log("4. The selected theme will be applied to the app");
  await $`wait_for_user`;
  await $`show_section "📊 Performance & Logging"`;
  console.log("Check the application logs:");
  console.log("");
  console.log("Server logs: tail -f /tmp/mate-dealer-demo.log");
  console.log("");
  console.log("The External Logger tracks:");
  console.log("  • User actions and navigation");
  console.log("  • API request performance");
  console.log("  • Search and filter usage");
  console.log("  • Error tracking");
  console.log("  • Performance metrics");
  await $`wait_for_user`;
  await $`show_section "🔒 Security Features Demo"`;
  console.log("Security features implemented:");
  console.log("");
  console.log("1. Try logging in with wrong credentials");
  console.log("2. Make rapid login attempts (rate limiting)");
  console.log("3. Check network tab for security headers");
  console.log("4. JWT tokens expire after 15 minutes");
  console.log("5. Passwords are hashed with bcrypt");
  await $`wait_for_user`;
  await $`show_section "📱 Mobile Responsive Demo"`;
  console.log("Test mobile responsiveness:");
  console.log("");
  console.log("1. Resize browser to mobile width (< 768px)");
  console.log("2. Click hamburger menu to open navigation");
  console.log("3. Navigate between pages");
  console.log("4. Test search and filters on mobile");
  console.log("5. Verify touch-friendly interface");
  await $`wait_for_user`;
  // Cleanup
  await $`show_section "🧹 Demo Complete"`;
  console.log("Thank you for exploring the Mate Dealer demo!");
  console.log("");
  console.log("Key Achievements:");
  console.log("  ✅ Full-stack implementation with React & Express");
  console.log("  ✅ Secure authentication and authorization");
  console.log("  ✅ Role-based navigation system");
  console.log("  ✅ Enhanced search and filtering");
  console.log("  ✅ Comprehensive E2E testing");
  console.log("  ✅ Production-ready security features");
  console.log("  ✅ External logging and monitoring");
  console.log("  ✅ Responsive design");
  console.log("");
  if (! -z "$SERVER_PID" ) {; then
  console.log("-e ");${YELLOW}Stopping demo server...${NC}"
  await $`kill $SERVER_PID 2>/dev/null || true`;
  }
  console.log("-e ");${GREEN}Demo completed successfully!${NC}"
  console.log("");
  console.log("To run again:");
  console.log("  cd $DEMO_DIR && npm run dev");
  console.log("");
  console.log("To run tests:");
  console.log("  cd $DEMO_DIR && npm run test:e2e");
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}