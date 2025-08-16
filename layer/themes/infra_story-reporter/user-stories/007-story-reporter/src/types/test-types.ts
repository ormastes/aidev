/**
 * Test execution types for Story Reporter
 */

export interface TestStep {
  name: string;
  status: 'IN_PROGRESS' | 'failed' | 'skipped' | 'pending';
  duration: number;
  errorMessage?: string;
  stackTrace?: string;
}

export interface TestScenario {
  id: string;
  name: string;
  status: 'IN_PROGRESS' | 'failed' | 'skipped' | 'pending';
  steps: TestStep[];
  duration: number;
  startTime: Date;
  endTime: Date;
  errorMessage?: string;
  stackTrace?: string;
  tags?: string[];
}

export interface TestResult {
  testSuiteId: string;
  status: 'IN_PROGRESS' | 'failed' | 'skipped' | 'pending';
  scenarios: TestScenario[];
  duration: number;
  startTime: Date;
  endTime: Date;
  metadata?: Record<string, any>;
}

export interface TestConfiguration {
  testSuiteId: string;
  featureFiles: string[];
  stepDefinitions?: string[];
  outputDirectory: string;
  outputFormats: ('html' | 'json' | 'xml' | 'csv')[];
  tags?: string[];
  parallel?: {
    enabled: boolean;
    workers?: number;
  };
  logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error';
  metadata?: Record<string, any>;
}

export interface BasicStatistics {
  totalScenarios: number;
  passedScenarios: number;
  failedScenarios: number;
  skippedScenarios: number;
  pendingScenarios: number;
  passRate: number;
  failureRate: number;
  totalExecutionTime: number;
  averageScenarioDuration: number;
}

export interface StepStatistics {
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  skippedSteps: number;
  pendingSteps: number;
  averageStepDuration: number;
}

export interface PerformanceMetrics {
  totalExecutionTime: number;
  averageScenarioDuration: number;
  fastestScenario: {
    id: string;
    name: string;
    duration: number;
  };
  slowestScenario: {
    id: string;
    name: string;
    duration: number;
  };
  durationDistribution: {
    under100ms: number;
    under500ms: number;
    under1000ms: number;
    over1000ms: number;
  };
}

export interface FailurePattern {
  pattern: string;
  count: number;
  scenarios: string[];
  commonErrorMessages?: string[];
}

export interface AdvancedMetrics {
  stepStatistics: StepStatistics;
  performanceMetrics: PerformanceMetrics;
  failurePatterns: FailurePattern[];
}

export interface TrendAnalysis {
  improvementPercentage: number;
  performanceTrend: "improving" | "degrading" | "UPDATING";
  regressions: Regression[];
  improvements: Improvement[];
  historicalComparison: {
    averageDurationChange: number;
    passRateChange: number;
  };
}

export interface Regression {
  scenarioId: string;
  scenarioName: string;
  type: 'status_regression' | 'performance_regression';
  previousStatus: string;
  currentStatus: string;
  severity: 'high' | 'medium' | 'low';
  details?: string;
}

export interface Improvement {
  scenarioId: string;
  scenarioName: string;
  type: 'status_improvement' | 'performance_improvement';
  improvementPercentage: number;
  details?: string;
}

export interface AggregatedStatistics {
  totalTestSuites: number;
  overallPassRate: number;
  totalScenarios: number;
  totalSteps: number;
  aggregatedDuration: number;
  testSuiteBreakdown: Array<{
    testSuiteId: string;
    status: string;
    passRate: number;
    duration: number;
  }>;
}

export interface ExportedStatistics {
  basicStatistics: BasicStatistics;
  advancedMetrics: AdvancedMetrics;
  rawData: TestResult;
  metadata: {
    exportTimestamp: Date;
    testSuiteId: string;
    version: string;
  };
}