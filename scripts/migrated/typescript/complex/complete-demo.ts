#!/usr/bin/env bun
/**
 * Migrated from: complete-demo.sh
 * Auto-generated TypeScript - 2025-08-16T04:57:27.679Z
 */

import { readFile, writeFile, mkdir, rm, copyFile, rename, access } from 'fs/promises';
import { join, dirname, basename, resolve } from 'path';
import { existsSync } from 'fs';
import { $ } from 'bun';

async function main() {
  // Complete demo script for Mate Dealer with GUI Selector integration
  await $`set -e`;
  console.log("=== Mate Dealer + GUI Selector Complete Demo ===");
  console.log("");
  // Colors for output
  await $`GREEN='\033[0;32m'`;
  await $`BLUE='\033[0;34m'`;
  await $`YELLOW='\033[1;33m'`;
  await $`NC='\033[0m' # No Color`;
  // Paths
  await $`SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"`;
  await $`PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"`;
  await $`GUI_SELECTOR_DIR="$PROJECT_ROOT/layer/themes/gui-selector/user-stories/023-gui-selector-server"`;
  await $`MATE_DEALER_DIR="$PROJECT_ROOT/scripts/setup/demo/mate-dealer"`;
  // Step 1: Start GUI Selector Server
  console.log("-e ");${BLUE}Step 1: Starting GUI Selector Server${NC}"
  await $`if ! curl -s http://localhost:3456/api/health > /dev/null 2>&1; then`;
  console.log("Starting GUI Selector on port 3456...");
  process.chdir(""$GUI_SELECTOR_DIR"");
  await $`NODE_ENV=release PORT=3456 npm start > /tmp/gui-selector.log 2>&1 &`;
  await $`GUI_PID=$!`;
  await Bun.sleep(5 * 1000);
  } else {
  console.log("GUI Selector already running on port 3456");
  }
  // Step 2: Check Mate Dealer Demo
  console.log("-e ");${BLUE}Step 2: Checking Mate Dealer Demo${NC}"
  process.chdir(""$MATE_DEALER_DIR"");
  // Install Playwright browsers if not already installed
  console.log("Installing Playwright browsers...");
  await $`bunx playwright install chromium`;
  // Step 3: Create a simple mate dealer app
  console.log("-e ");${BLUE}Step 3: Creating Mate Dealer Application${NC}"
  // Create basic HTML file
  await $`cat > public/index.html << 'EOF'`;
  await $`<!DOCTYPE html>`;
  await $`<html lang="en">`;
  await $`<head>`;
  await $`<meta charset="UTF-8">`;
  await $`<meta name="viewport" content="width=device-width, initial-scale=1.0">`;
  await $`<title>Mate Dealer - Marketplace</title>`;
  await $`<link rel="stylesheet" href="/css/theme.css">`;
  await $`<style>`;
  await $`body {`;
  await $`font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;`;
  await $`margin: 0;`;
  await $`padding: 20px;`;
  await $`background-color: #f5f5f5;`;
  await $`}`;
  await $`.container {`;
  await $`max-width: 1200px;`;
  await $`margin: 0 auto;`;
  await $`}`;
  await $`.login-form {`;
  await $`max-width: 400px;`;
  await $`margin: 50px auto;`;
  await $`padding: 30px;`;
  await $`background: white;`;
  await $`border-radius: 10px;`;
  await $`box-shadow: 0 2px 10px rgba(0,0,0,0.1);`;
  await $`}`;
  await $`.role-selector {`;
  await $`display: flex;`;
  await $`gap: 20px;`;
  await $`margin-bottom: 20px;`;
  await $`}`;
  await $`input[type="email"], input[type="password"] {`;
  await $`width: 100%;`;
  await $`padding: 10px;`;
  await $`margin: 10px 0;`;
  await $`border: 1px solid #ddd;`;
  await $`border-radius: 5px;`;
  await $`}`;
  await $`button {`;
  await $`width: 100%;`;
  await $`padding: 12px;`;
  await $`background: #2563eb;`;
  await $`color: white;`;
  await $`border: none;`;
  await $`border-radius: 5px;`;
  await $`cursor: pointer;`;
  await $`font-size: 16px;`;
  await $`}`;
  await $`button:hover {`;
  await $`background: #1d4ed8;`;
  await $`}`;
  await $`.dealer-card {`;
  await $`background: white;`;
  await $`padding: 20px;`;
  await $`margin: 10px 0;`;
  await $`border-radius: 8px;`;
  await $`box-shadow: 0 2px 5px rgba(0,0,0,0.1);`;
  await $`cursor: pointer;`;
  await $`}`;
  await $`.dealer-card:hover {`;
  await $`box-shadow: 0 4px 10px rgba(0,0,0,0.15);`;
  await $`}`;
  await $`.dashboard {`;
  await $`display: none;`;
  await $`}`;
  await $`.dashboard.active {`;
  await $`display: block;`;
  await $`}`;
  await $`</style>`;
  await $`</head>`;
  await $`<body>`;
  await $`<div class="container">`;
  await $`<!-- Login Form -->`;
  await $`<div id="loginForm" class="login-form">`;
  await $`<h1>Mate Dealer Login</h1>`;
  await $`<div class="role-selector">`;
  await $`<label>`;
  await $`<input type="radio" name="role" value="customer" checked> Customer`;
  await $`</label>`;
  await $`<label>`;
  await $`<input type="radio" name="role" value="dealer"> Dealer`;
  await $`</label>`;
  await $`</div>`;
  await $`<input type="email" name="email" placeholder="Email" value="demo@example.com">`;
  await $`<input type="password" name="password" placeholder="Password" value="demo123">`;
  await $`<button type="submit" onclick="login()">Login</button>`;
  await $`</div>`;
  await $`<!-- Customer Dashboard -->`;
  await $`<div id="customerDashboard" class="dashboard">`;
  await $`<h1>Find Your Perfect Mate Dealer</h1>`;
  await $`<div id="dealerList">`;
  await $`<div class="dealer-card" onclick="viewDealer('Juan\'s Mate Shop')">`;
  await $`<h3>Juan's Mate Shop</h3>`;
  await $`<p>Distance: 2.3 km | Rating: ⭐⭐⭐⭐⭐</p>`;
  await $`<p>Specialties: Traditional Argentine Mate, Organic Options</p>`;
  await $`</div>`;
  await $`<div class="dealer-card" onclick="viewDealer('Maria\'s Traditional Mate')">`;
  await $`<h3>Maria's Traditional Mate</h3>`;
  await $`<p>Distance: 3.1 km | Rating: ⭐⭐⭐⭐</p>`;
  await $`<p>Specialties: Flavored Mate, Accessories</p>`;
  await $`</div>`;
  await $`</div>`;
  await $`<button onclick="logout()">Logout</button>`;
  await $`</div>`;
  await $`<!-- Dealer Dashboard -->`;
  await $`<div id="dealerDashboard" class="dashboard">`;
  await $`<h1>Dealer Dashboard</h1>`;
  await $`<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">`;
  await $`<div class="dealer-card">`;
  await $`<h3>Total Customers</h3>`;
  await $`<p style="font-size: 2em; margin: 0;">24</p>`;
  await $`</div>`;
  await $`<div class="dealer-card">`;
  await $`<h3>Active Orders</h3>`;
  await $`<p style="font-size: 2em; margin: 0;">5</p>`;
  await $`</div>`;
  await $`<div class="dealer-card">`;
  await $`<h3>Revenue This Month</h3>`;
  await $`<p style="font-size: 2em; margin: 0;">$3,450</p>`;
  await $`</div>`;
  await $`</div>`;
  await $`<button onclick="logout()">Logout</button>`;
  await $`</div>`;
  await $`</div>`;
  await $`<script>`;
  await $`function login() {`;
  await $`const role = document.querySelector('input[name="role"]:checked').value;`;
  await $`document.getElementById('loginForm').style.display = 'none';`;
  await $`if (role === 'customer') {`;
  await $`document.getElementById('customerDashboard').classList.add('active');`;
  await $`} else {`;
  await $`document.getElementById('dealerDashboard').classList.add('active');`;
  await $`}`;
  await $`}`;
  await $`function logout() {`;
  await $`document.querySelectorAll('.dashboard').forEach(d => d.classList.remove('active'));`;
  await $`document.getElementById('loginForm').style.display = 'block';`;
  await $`}`;
  await $`function viewDealer(name) {`;
  await $`alert('Viewing details for: ' + name);`;
  await $`}`;
  await $`</script>`;
  await $`</body>`;
  await $`</html>`;
  await $`EOF`;
  // Step 4: GUI Selector Integration Demo
  console.log("-e ");${BLUE}Step 4: GUI Selector Integration${NC}"
  console.log("-e ");${YELLOW}Manual Steps:${NC}"
  console.log("1. Open GUI Selector: http://localhost:3456");
  console.log("2. Login with: admin / admin123");
  console.log("3. Browse the 4 template options:");
  console.log("   - Modern Dashboard (Clean, minimalist)");
  console.log("   - Corporate Portal (Professional, business)");
  console.log("   - Artistic Showcase (Creative, bold)");
  console.log("   - Universal Access (Accessible, WCAG compliant)");
  console.log("4. Click on a template to preview");
  console.log("5. Click 'Select This Template'");
  console.log("6. Enter project name: 'Mate Dealer App'");
  console.log("");
  // Step 5: Start Mate Dealer Server
  console.log("-e ");${BLUE}Step 5: Starting Mate Dealer Demo Server${NC}"
  process.chdir(""$MATE_DEALER_DIR"");
  // Create simple server
  await $`cat > src/demo-server.ts << 'EOF'`;
  await $`import express from 'express';`;
  await $`import path from 'path';`;
  await $`const app = express();`;
  await $`const PORT = 3303;`;
  await $`app.use(express.static(path.join(__dirname, '../public')));`;
  await $`app.get('/api/health', (req, res) => {`;
  await $`res.json({ status: 'healthy', service: 'mate-dealer' });`;
  await $`});`;
  await $`app.listen(PORT, () => {`;
  await $`console.log(`Mate Dealer running on http://localhost:${PORT}`);`;
  await $`});`;
  await $`EOF`;
  // Start the server
  console.log("Starting Mate Dealer on port 3303...");
  await $`bunx ts-node src/demo-server.ts > /tmp/mate-dealer.log 2>&1 &`;
  await $`MATE_PID=$!`;
  await Bun.sleep(3 * 1000);
  // Step 6: Run E2E Tests
  console.log("-e ");${BLUE}Step 6: Running E2E Tests${NC}"
  console.log("Running click-based E2E tests...");
  // Create a simple test runner
  await $`cat > run-e2e-demo.js << 'EOF'`;
  await $`const { chromium } = require('playwright');`;
  await $`async function runDemo() {`;
  await $`const browser = await chromium.launch({ headless: false, slowMo: 500 });`;
  await $`const context = await browser.newContext();`;
  await $`const page = await context.newPage();`;
  await $`console.log('📱 Testing Mate Dealer App...');`;
  // Go to app
  await $`await page.goto('http://localhost:3303');`;
  await $`console.log('✓ Loaded Mate Dealer');`;
  // Test customer flow
  await $`await page.click('input[value="customer"]');`;
  await $`await page.fill('input[name="email"]', 'test@example.com');`;
  await $`await page.fill('input[name="password"]', 'demo123');`;
  await $`await page.click('button[type="submit"]');`;
  await $`console.log('✓ Logged in as customer');`;
  // Click on dealer
  await $`await page.waitForTimeout(1000);`;
  await $`await page.click('.dealer-card:first-child');`;
  await $`console.log('✓ Clicked on dealer');`;
  // Logout
  await $`await page.click('button:has-text("Logout")');`;
  await $`console.log('✓ Logged out');`;
  // Test dealer flow
  await $`await page.click('input[value="dealer"]');`;
  await $`await page.click('button[type="submit"]');`;
  await $`console.log('✓ Logged in as dealer');`;
  await $`await page.waitForTimeout(2000);`;
  await $`console.log('✅ E2E Demo completed!');`;
  await $`await browser.close();`;
  await $`}`;
  await $`runDemo().catch(console.error);`;
  await $`EOF`;
  await $`node run-e2e-demo.js`;
  // Summary
  console.log("");
  console.log("-e ");${GREEN}=== Demo Complete! ===${NC}"
  console.log("");
  console.log("Summary:");
  console.log("✓ GUI Selector Server running on http://localhost:3456");
  console.log("✓ Mate Dealer Demo running on http://localhost:3303");
  console.log("✓ E2E tests demonstrate click-based interactions");
  console.log("✓ Template selection available via GUI Selector");
  console.log("");
  console.log("Key Features Demonstrated:");
  console.log("- User role selection (Customer/Dealer)");
  console.log("- Login functionality");
  console.log("- Customer dashboard with dealer listings");
  console.log("- Dealer dashboard with business metrics");
  console.log("- GUI template selection integration");
  console.log("- Click-based E2E testing");
  console.log("");
  console.log("To stop servers:");
  console.log("kill $GUI_PID $MATE_PID");
  // Cleanup function
  await $`cleanup() {`;
  console.log("Cleaning up...");
  await $`kill $GUI_PID $MATE_PID 2>/dev/null || true`;
  await $`}`;
  await $`trap cleanup EXIT`;
  console.log("");
  console.log("Press Ctrl+C to stop the demo...");
  await $`wait`;
}

// Run main
if (import.meta.main) {
  main().catch(console.error);
}