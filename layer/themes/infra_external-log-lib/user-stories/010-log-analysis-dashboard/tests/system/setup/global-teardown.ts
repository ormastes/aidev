import { FullConfig } from '@playwright/test';
import { TestDataManager } from '../fixtures/test-data-manager';
import { TestReportGenerator } from '../helpers/test-report-generator';

/**
 * Global teardown for system tests
 * Cleans up test data and generates reports
 */
async function globalTeardown(config: FullConfig): Promise<void> {
  console.log('🧹 Starting system test cleanup...');
  
  try {
    // Clean up test data
    const testDataManager = new TestDataManager();
    await testDataManager.cleanupTestData();
    
    // Generate comprehensive test report
    const reportGenerator = new TestReportGenerator();
    await reportGenerator.generateSystemTestReport();
    
    console.log('✅ System test cleanup complete');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    // Don't throw - tests have already run
  }
}

export default globalTeardown;
