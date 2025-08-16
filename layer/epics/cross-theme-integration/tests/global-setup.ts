/**
 * Global setup for cross-theme integration tests
 * Runs once before all test suites
 */

import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export default async () => {
  console.log('\n🚀 Setting up cross-theme integration test environment...\n');
  
  // Create necessary directories
  const testDirs = [
    'temp',
    'test-output',
    'test-logs'
  ];
  
  for (const dir of testDirs) {
    const dirPath = join(process.cwd(), dir);
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
  }
  
  // Set environment variables for testing
  process.env.NODE_ENV = 'test';
  process.env.CROSS_THEME_TESTING = 'true';
  process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';
  
  // Initialize any global test resources
  console.log('🔄 Test environment ready\n');
};