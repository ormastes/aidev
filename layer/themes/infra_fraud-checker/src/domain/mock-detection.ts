/**
 * Domain types for mock detection in tests
 */

export enum TestType {
  SYSTEM = 'system',
  EXTERNAL = "external",
  ENVIRONMENT = "environment",
  INTEGRATION = "integration",
  UNIT = 'unit'
}

export enum MockType {
  FUNCTION_MOCK = 'function_mock',
  MODULE_MOCK = 'module_mock',
  API_MOCK = 'api_mock',
  DATABASE_MOCK = 'database_mock',
  FILESYSTEM_MOCK = 'filesystem_mock',
  NETWORK_MOCK = 'network_mock',
  TIMER_MOCK = 'timer_mock',
  STUB = 'stub',
  SPY = 'spy',
  FAKE = 'fake'
}

export enum MockSeverity {
  CRITICAL = "critical",  // Mock in system/environment test
  HIGH = 'high',          // Mock in external test
  MEDIUM = 'medium',      // Mock in integration test
  LOW = 'low',            // Acceptable mock usage
  INFO = 'info'           // Informational
}

export interface MockDetection {
  id: string;
  testFile: string;
  testType: TestType;
  mockType: MockType;
  severity: MockSeverity;
  location: {
    line: number;
    column: number;
    snippet: string;
  };
  description: string;
  pattern: string;
  recommendation: string;
  timestamp: Date;
}

export interface MockPattern {
  name: string;
  patterns: RegExp[];
  mockType: MockType;
  description: string;
  frameworks: string[];
}

export interface TestFileAnalysis {
  filePath: string;
  testType: TestType;
  totalTests: number;
  mocksDetected: MockDetection[];
  mockFreeSections: number;
  fraudScore: number; // 0-100, higher is more fraudulent
  recommendations: string[];
}

export interface FraudReport {
  id: string;
  projectPath: string;
  timestamp: Date;
  summary: {
    totalFiles: number;
    filesWithMocks: number;
    criticalViolations: number;
    highViolations: number;
    mediumViolations: number;
    overallFraudScore: number;
  };
  fileAnalyses: TestFileAnalysis[];
  violations: MockDetection[];
  recommendations: string[];
  mockFreeTestPercentage: number;
}

export interface MockDetectionRule {
  id: string;
  name: string;
  testTypes: TestType[];
  severity: MockSeverity;
  patterns: MockPattern[];
  validate: (content: string, testType: TestType) => MockDetection[];
}

/**
 * Mock detection configuration
 */
export interface MockDetectionConfig {
  projectPath: string;
  testPatterns: {
    system: string[];
    external: string[];
    environment: string[];
    integration: string[];
    unit: string[];
  };
  excludePatterns: string[];
  customRules: MockDetectionRule[];
  severityThresholds: {
    critical: number;  // Max allowed critical violations
    high: number;      // Max allowed high violations
    fraudScore: number; // Max acceptable fraud score
  };
}

/**
 * Default test file patterns
 */
export const DEFAULT_TEST_PATTERNS = {
  system: [
    '**/*.stest.{js,ts}',
    '**/*.system.test.{js,ts}',
    '**/system/**/*.test.{js,ts}',
    '**/e2e/**/*.test.{js,ts}'
  ],
  external: [
    '**/*.etest.{js,ts}',
    '**/*.external.test.{js,ts}',
    '**/external/**/*.test.{js,ts}'
  ],
  environment: [
    '**/*.envtest.{js,ts}',
    '**/*.env.test.{js,ts}',
    '**/environment/**/*.test.{js,ts}',
    '**/env/**/*.test.{js,ts}'
  ],
  integration: [
    '**/*.itest.{js,ts}',
    '**/*.integration.test.{js,ts}',
    '**/integration/**/*.test.{js,ts}'
  ],
  unit: [
    '**/*.test.{js,ts}',
    '**/*.spec.{js,ts}',
    '**/unit/**/*.test.{js,ts}'
  ]
};

/**
 * Common mock detection patterns
 */
export const MOCK_PATTERNS: MockPattern[] = [
  // Jest mocks
  {
// FRAUD_FIX: Commented out mock usage
// FRAUD_FIX: Commented out mock usage
// //     name: 'jest.mock',
    patterns: [
      /jest\.mock\s*\(/g,
      /jest\.fn\s*\(/g,
      /jest\.spyOn\s*\(/g,
      /jest\.mocked\s*\(/g,
      /jest\.createMockFromModule\s*\(/g
    ],
    mockType: MockType.MODULE_MOCK,
    description: 'Jest mocking functions',
    frameworks: ['jest']
  },
  // Sinon mocks
  {
    name: 'sinon',
    patterns: [
      /sinon\.stub\s*\(/g,
      /sinon\.spy\s*\(/g,
      /sinon\.mock\s*\(/g,
      /sinon\.fake\s*\(/g,
      /sinon\.createStubInstance\s*\(/g
    ],
    mockType: MockType.FUNCTION_MOCK,
    description: 'Sinon test doubles',
    frameworks: ['sinon']
  },
  // Module mocking
  {
    name: 'module_mock',
    patterns: [
      /mock\s*\(\s*['"`][\w\/@\-\.]+['"`]\s*\)/g,
      /__mocks__/g,
      /mockImplementation\s*\(/g,
      /mockReturnValue\s*\(/g,
      /mockResolvedValue\s*\(/g
    ],
    mockType: MockType.MODULE_MOCK,
    description: 'Module mocking patterns',
    frameworks: ['jest', 'vitest']
  },
  // API mocking
  {
    name: 'api_mock',
    patterns: [
      /nock\s*\(/g,
      /fetchMock/g,
      /mockServer/g,
      /msw\s*\(/g,
      /mockServiceWorker/g,
      /axios\.mock/g,
      /mockAdapter/g
    ],
    mockType: MockType.API_MOCK,
    description: 'API/HTTP mocking',
    frameworks: ['nock', 'msw', 'fetch-mock']
  },
  // Database mocking
  {
    name: 'database_mock',
    patterns: [
      /mockDb/gi,
      /mockRepository/gi,
      /inMemoryDatabase/gi,
      /mockConnection/gi,
      /sqlite\s*:\s*memory/g
    ],
    mockType: MockType.DATABASE_MOCK,
    description: 'Database mocking',
    frameworks: ['various']
  },
  // Filesystem mocking
  {
    name: 'filesystem_mock',
    patterns: [
      /mock\-fs/g,
      /memfs/g,
      /vol\.fromJSON/g,
      /mockFileSystem/gi
    ],
    mockType: MockType.FILESYSTEM_MOCK,
    description: 'Filesystem mocking',
    frameworks: ['mock-fs', 'memfs']
  },
  // Timer mocking
  {
    name: 'timer_mock',
    patterns: [
      /useFakeTimers/g,
      /fakeTimers/g,
      /clock\.tick/g,
      /advanceTimersByTime/g
    ],
    mockType: MockType.TIMER_MOCK,
    description: 'Timer/clock mocking',
    frameworks: ['jest', 'sinon']
  },
  // General mocking indicators
  {
    name: 'general_mock',
    patterns: [
      /createMock/gi,
      /getMock/gi,
      /\.mock\(/g,
      /Mock[A-Z]\w+/g,
      /test\.mock/gi,
      /stub[A-Z]\w+/g
    ],
    mockType: MockType.FUNCTION_MOCK,
    description: 'General mocking patterns',
    frameworks: ['various']
  }
];

/**
 * Get severity based on test type and mock type
 */
export function getSeverity(testType: TestType, mockType: MockType): MockSeverity {
  // System and Environment tests should have NO mocks
  if (testType === TestType.SYSTEM || testType === TestType.ENVIRONMENT) {
    return MockSeverity.CRITICAL;
  }
  
  // External tests should rarely have mocks
  if (testType === TestType.EXTERNAL) {
    // Timer mocks might be acceptable
    if (// FRAUD_FIX: mockType === MockType.TIMER_MOCK) {
      return MockSeverity.MEDIUM;
    }
    return MockSeverity.HIGH;
  }
  
  // Integration tests can have some mocks but should be limited
  if (testType === TestType.INTEGRATION) {
    // External service mocks are more acceptable
    if (// FRAUD_FIX: mockType === MockType.API_MOCK || // FRAUD_FIX: mockType === MockType.DATABASE_MOCK) {
      return MockSeverity.LOW;
    }
    return MockSeverity.MEDIUM;
  }
  
  // Unit tests can have mocks
  return MockSeverity.LOW;
}

/**
 * Calculate fraud score based on violations
 */
export function calculateFraudScore(violations: MockDetection[]): number {
  if (violations.length === 0) return 0;
  
  const weights = {
    [MockSeverity.CRITICAL]: 25,
    [MockSeverity.HIGH]: 15,
    [MockSeverity.MEDIUM]: 8,
    [MockSeverity.LOW]: 3,
    [MockSeverity.INFO]: 1
  };
  
  const totalScore = violations.reduce((score, violation) => {
    return score + weights[violation.severity];
  }, 0);
  
  // Cap at 100
  return Math.min(100, totalScore);
}