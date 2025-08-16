/**
 * Test setup configuration
 */

import * as fs from 'fs-extra';
import { path } from '../../layer/themes/infra_external-log-lib/src';

// Global test timeout
jest.setTimeout(30000);

// Setup temporary directory for tests
const TEST_TEMP_DIR = path.join(__dirname, '..', 'temp-test-files');

beforeAll(async () => {
  // Ensure temp directory exists
  await fs.ensureDir(TEST_TEMP_DIR);
});

afterAll(async () => {
  // Clean up temp directory after all tests
  try {
    await fs.remove(TEST_TEMP_DIR);
  } catch (error) {
    // Ignore cleanup errors
  }
});

// Make TEST_TEMP_DIR available globally
declare global {
  var TEST_TEMP_DIR: string;
}

global.TEST_TEMP_DIR = TEST_TEMP_DIR;