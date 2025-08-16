module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverage: false,
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  detectOpenHandles: true
};