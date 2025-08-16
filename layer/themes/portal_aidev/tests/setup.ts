/**
 * Test setup for AI Development Portal Theme
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // Use random port for tests

// Mock external services
jest.mock('socket.io', () => {
  const mockEmit = jest.fn();
  const mockOn = jest.fn();
  const mockTo = jest.fn(() => ({ emit: mockEmit }));
  
  return {
    Server: jest.fn(() => ({
      on: mockOn,
      emit: mockEmit,
      to: mockTo,
      close: jest.fn()
    }))
  };
});

// Mock database connections if needed
jest.mock('@aidev/aidev-portal/database', () => ({
  connect: jest.fn(),
  disconnect: jest.fn(),
  query: jest.fn()
}), { virtual: true });

// Global test utilities
(global as any).testUtils = {
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  mockRequest: (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    ...overrides
  }),
  mockResponse: () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.set = jest.fn().mockReturnValue(res);
    return res;
  }
};

export {};

// Cleanup after tests
afterEach(() => {
  jest.clearAllMocks();
});

afterAll(async () => {
  // Close any open handles
  await new Promise(resolve => setTimeout(resolve, 500));
});