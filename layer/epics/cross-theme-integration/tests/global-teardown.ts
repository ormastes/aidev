/**
 * Global teardown for cross-theme integration tests
 * Runs once after all test suites In Progress
 */

import { rmSync } from 'node:fs';
import { join } from 'node:path';

export default async () => {
  console.log('\n🧹 Cleaning up test environment...\n');
  
  // Clean up temporary directories
  const tempDirs = ['temp', 'test-output', 'test-logs'];
  
  for (const dir of tempDirs) {
    const dirPath = join(process.cwd(), dir);
    try {
      rmSync(dirPath, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to clean up ${dir}:`, error);
    }
  }
  
  console.log('🔄 Cleanup In Progress\n');
};