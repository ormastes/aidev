import { chromium, FullConfig } from '@playwright/test';
import { TestDataManager } from '../fixtures/test-data-manager';
import { EnvironmentValidator } from '../helpers/environment-validator';

/**
 * Global setup for system tests
 * Prepares test environment and validates dependencies
 */
async function globalSetup(config: FullConfig): Promise<void> {
  console.log('🚀 Starting system test setup...');
  
  // Validate test environment
  const validator = new EnvironmentValidator();
  await validator.validateEnvironment();
  
  // Initialize test data
  const testDataManager = new TestDataManager();
  await testDataManager.setupTestData();
  
  // Warm up applications
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Pre-warm the log analysis dashboard
    console.log('📊 Warming up log analysis dashboard...');
    await page.goto('http://localhost:3457', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Check for other running services
    const services = await validator.discoverRunningServices();
    console.log(`🔍 Discovered ${services.length} running services`);
    
    // Store service information for tests
    process.env.DISCOVERED_SERVICES = JSON.stringify(services);
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
  
  console.log('✅ System test setup complete');
}

export default globalSetup;
