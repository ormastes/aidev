// Global test setup for AI Development Platform
import { beforeAll, afterAll } from 'bun:test';
import path from 'path';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.TEST_RUNNER = 'bun';
process.env.PROJECT_ROOT = path.resolve(__dirname, '../..');

beforeAll(() => {
  console.log('🧪 AI Development Platform Test Suite');
  console.log(`📁 Project root: ${process.env.PROJECT_ROOT}`);
  console.log(`🚀 Runner: Bun ${Bun.version}\n`);
});

afterAll(() => {
  console.log('\n✨ Test run completed');
});

export const testPaths = {
  root: process.env.PROJECT_ROOT,
  layer: path.join(process.env.PROJECT_ROOT!, 'layer'),
  themes: path.join(process.env.PROJECT_ROOT!, 'layer/themes'),
  setup: path.join(process.env.PROJECT_ROOT!, 'setup')
};