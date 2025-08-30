module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '../..',
  roots: ['<rootDir>'],
  testMatch: [
    '**/tests/unit/**/*.test.ts',
    '**/tests/integration/**/*.itest.ts',
    '**/tests/external/**/*.etest.ts', 
    '**/tests/env/**/*.envtest.ts',
    '**/*.test.ts',
    '**/*.test.js',
    '!**/*.stest.ts',
    '!**/tests/system/**'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/system/',
    '\\.stest\\.ts$',
    'playwright\\.config'
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/config/typescript/tsconfig.json'
    }],
    '^.+\\.jsx?$': 'babel-jest'
  },
  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
    '!**/tests/**',
    '!**/gen/**',
    '!**/temp/**',
    '!**/release/**'
  ],
  coverageDirectory: '<rootDir>/gen/coverage',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  watchPathIgnorePatterns: [
    '<rootDir>/demo/'
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/demo/'
  ]
};