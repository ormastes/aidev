// Test setup for LSP-MCP theme
import { TextEncoder, TextDecoder } from 'util';

// Polyfill for Node.js < 20
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock console methods for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Increase timeout for LSP server startup
jest.setTimeout(30000);

// Mock child_process spawn for tests
jest.mock('child_process', () => ({
  ...jest.requireActual('child_process'),
  spawn: jest.fn()
}));

// Mock fs promises for tests
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  readdir: jest.fn(),
  stat: jest.fn(),
  mkdir: jest.fn(),
  rm: jest.fn()
}));