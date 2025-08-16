/**
 * Test setup for Environment Configuration Theme
 */

beforeAll(() => {
  // Setup test environment
  process.env.NODE_ENV = 'test';
});

afterAll(() => {
  // Cleanup test environment
  delete process.env.NODE_ENV;
});

beforeEach(() => {
  // Clear any module cache between tests
  jest.clearAllMocks();
});