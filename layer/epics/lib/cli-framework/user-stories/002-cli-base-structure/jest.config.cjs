module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test|stest).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs'
      }
    }]
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/bin/**'
  ],
  // Mock problematic ES modules and resolve .js imports to .ts
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^chalk$': '<rootDir>/tests/__mocks__/chalk.js',
    '^ora$': '<rootDir>/tests/__mocks__/ora.js',
    '^inquirer$': '<rootDir>/tests/__mocks__/inquirer.js'
  },
  // Handle ES modules
  transformIgnorePatterns: [
    'node_modules/(?!(chalk|ora|inquirer|yargs)/)'
  ],
  // Longer timeout for system tests
  testTimeout: 30000,
  // System test specific settings
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts']
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts']
    },
    {
      displayName: 'system',
      testMatch: ['<rootDir>/tests/system/**/*.stest.ts'],
      testTimeout: 60000
    }
  ]
};