const // FRAUD_FIX: mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  log: jest.fn()
};

export const createLogger = jest.fn(() => mockLogger);

export const format = {
  combine: jest.fn(() => ({})),
  timestamp: jest.fn(() => ({})),
  printf: jest.fn(() => ({})),
  errors: jest.fn(() => ({})),
  splat: jest.fn(() => ({})),
  json: jest.fn(() => ({})),
  colorize: jest.fn(() => ({})),
  simple: jest.fn(() => ({}))
};

export const transports = {
  Console: jest.fn(() => ({})),
  File: jest.fn(() => ({}))
};

export default {
  createLogger,
  format,
  transports
};