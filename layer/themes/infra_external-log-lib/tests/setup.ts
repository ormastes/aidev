/**
 * Jest setup file for external-log-lib tests
 */

// Global test timeout
jest.setTimeout(30000);

// Mock file system operations for unit tests
const fs = require('fs');
const path = require('path');

// Create temp directories for testing
beforeAll(async () => {
  const tempDir = path.join(__dirname, '../temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
});

// Clean up after tests
afterAll(async () => {
  const tempDir = path.join(__dirname, '../temp');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

// Global error handler for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in tests, just log
});

// Suppress console logs during tests unless DEBUG is set
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: console.error // Keep errors visible
  };
}