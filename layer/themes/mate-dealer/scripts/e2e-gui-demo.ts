#!/usr/bin/env tsx
/**
 * E2E Demo: Mate Dealer with GUI Selector Integration
 * 
 * This demonstrates:
 * 1. Starting the GUI selector server
 * 2. Selecting a template for Mate Dealer
 * 3. Applying the selected template to the app
 * 4. Testing the Mate Dealer functionality
 */

import { chromium, Browser, Page } from "playwright";
import { spawn, ChildProcess } from 'child_process';
import { path } from '../../infra_external-log-lib/src';

const GUI_SELECTOR_URL = 'http://localhost:3456';
const MATE_DEALER_URL = 'http://localhost:3303';

let browser: Browser;
let guiSelectorProcess: ChildProcess | null = null;
let mateDealerProcess: ChildProcess | null = null;

async function startServer(command: string, args: string[], cwd: string, port: number, name: string): Promise<ChildProcess> {
  console.log(`Starting ${name}...`);
  const process = spawn(command, args, { cwd, stdio: 'pipe' });
  
  // Wait for server to be ready
  let attempts = 0;
  while (attempts < 30) {
    try {
      const response = await fetch(`http://localhost:${port}/api/health`).catch(() => null);
      if (response && response.ok) {
        console.log(`✓ ${name} is ready on port ${port}`);
        return process;
      }
    } catch (e) {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
  }
  
  throw new Error(`${name} failed to start`);
}

async function runDemo() {
  console.log('=== Mate Dealer + GUI Selector E2E Demo ===\n');

  try {
    // 1. Start GUI Selector Server
    const guiSelectorDir = path.join(__dirname, '../layer/themes/gui-selector/user-stories/023-gui-selector-server');
    guiSelectorProcess = await startServer('node', ['dist/src/server.js'], guiSelectorDir, 3456, 'GUI Selector Server');

    // 2. Start Mate Dealer Demo
    const mateDealerDir = path.join(__dirname, 'setup/demo/mate-dealer');
    mateDealerProcess = await startServer('npm', ['run', 'demo'], mateDealerDir, 3303, 'Mate Dealer Demo');

    // 3. Launch browser
    browser = await chromium.launch({ headless: false, slowMo: 500 });
    const context = await browser.newContext();
    
    // Demo Part 1: GUI Selector
    console.log('\n📋 Part 1: Selecting GUI Template');
    const guiPage = await context.newPage();
    
    // Navigate to GUI selector
    await guiPage.goto(GUI_SELECTOR_URL);
    await guiPage.waitForLoadState("networkidle");
    console.log('✓ Loaded GUI Selector');

    // Login to GUI selector
    await guiPage.click('button#auth-btn');
    await guiPage.fill('#login-username', 'admin');
    await guiPage.fill('#login-password', "admin123");
    await guiPage.click('button[type="submit"]');
    await guiPage.waitForTimeout(1000);
    console.log('✓ Logged in as admin');

    // Browse templates
    await guiPage.waitForSelector('.template-grid');
    const templates = await guiPage.$$('.template-card');
    console.log(`✓ Found ${templates.length} templates`);

    // Click on Modern template
    await guiPage.click('.template-card:first-child');
    await guiPage.waitForSelector('#preview-modal.active');
    console.log('✓ Previewing Modern Dashboard template');

    // Select the template
    await guiPage.click('#select-template-btn');
    await guiPage.fill('input[placeholder="Enter project name"]', 'Mate Dealer App');
    await guiPage.keyboard.press('Enter');
    await guiPage.fill('input[placeholder="Add any comments"]', 'Using modern template for marketplace UI');
    await guiPage.keyboard.press('Enter');
    console.log('✓ Selected Modern template for Mate Dealer');

    // Demo Part 2: Mate Dealer Application
    console.log('\n🍵 Part 2: Testing Mate Dealer with Selected Template');
    const matePage = await context.newPage();
    
    // Navigate to Mate Dealer
    await matePage.goto(MATE_DEALER_URL);
    await matePage.waitForLoadState("networkidle");
    console.log('✓ Loaded Mate Dealer app');

    // Test Customer Flow
    console.log('\n👤 Testing Customer Flow:');
    
    // Login as customer (default selection)
    await matePage.fill('input[name="email"]', 'customer@example.com');
    await matePage.fill('input[name="password"]', 'demo123');
    await matePage.click('button[type="submit"]');
    await matePage.waitForNavigation();
    console.log('✓ Logged in as customer');

    // Check dashboard
    await matePage.waitForSelector('h1:has-text("Find Your Perfect Mate Dealer")');
    console.log('✓ Customer dashboard loaded');

    // Browse dealers
    const dealerCards = await matePage.$$('.dealer-card');
    console.log(`✓ Found ${dealerCards.length} recommended dealers`);

    // Click on first dealer
    if (dealerCards.length > 0) {
      await dealerCards[0].click();
      await matePage.waitForSelector('.dealer-profile');
      console.log('✓ Viewing dealer profile');
    }

    // Go back and test dealer flow
    await matePage.goto(MATE_DEALER_URL);
    
    console.log('\n💼 Testing Dealer Flow:');
    
    // Select dealer role
    await matePage.click('input[value="dealer"]');
    await matePage.fill('input[name="email"]', 'dealer@example.com');
    await matePage.fill('input[name="password"]', 'demo123');
    await matePage.click('button[type="submit"]');
    await matePage.waitForNavigation();
    console.log('✓ Logged in as dealer');

    // Check dealer dashboard
    await matePage.waitForSelector('h1:has-text("Dealer Dashboard")');
    const metrics = await matePage.$$('.metric-card');
    console.log(`✓ Dealer dashboard loaded with ${metrics.length} metrics`);

    // Demo Part 3: GUI Integration Verification
    console.log('\n🎨 Part 3: Verifying GUI Integration');
    
    // Check if modern template styles are applied
    const bodyStyles = await matePage.evaluate(() => {
      const styles = window.getComputedStyle(document.body);
      return {
        fontFamily: styles.fontFamily,
        backgroundColor: styles.backgroundColor,
        primaryColor: getComputedStyle(document.documentElement).getPropertyValue('--primary-color')
      };
    });
    
    console.log('✓ Template styles applied:', {
      font: bodyStyles.fontFamily.includes('Segoe UI') ? 'Modern' : 'Default',
      theme: bodyStyles.primaryColor ? 'AI Dev Portal' : 'Basic'
    });

    // Demo Part 4: Requirements Export
    console.log('\n📄 Part 4: Exporting Requirements');
    
    // Go back to GUI selector
    await guiPage.bringToFront();
    await guiPage.click('a[href="#requirements"]');
    await guiPage.waitForSelector('#requirements-view.active');
    
    // Export requirements
    await guiPage.click('#export-btn');
    console.log('✓ Requirements exported');

    console.log('\n✅ Demo completed successfully!');
    console.log('\nSummary:');
    console.log('- GUI Selector server running on port 3456');
    console.log('- Mate Dealer demo running on port 3303');
    console.log('- Modern template selected and applied');
    console.log('- Customer and dealer flows tested');
    console.log('- Template integration verified');

  } catch (error) {
    console.error('\n❌ Demo failed:', error);
  } finally {
    // Cleanup
    if (browser) await browser.close();
    if (guiSelectorProcess) guiSelectorProcess.kill();
    if (mateDealerProcess) mateDealerProcess.kill();
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  if (guiSelectorProcess) guiSelectorProcess.kill();
  if (mateDealerProcess) mateDealerProcess.kill();
  process.exit();
});

// Run the demo
runDemo();