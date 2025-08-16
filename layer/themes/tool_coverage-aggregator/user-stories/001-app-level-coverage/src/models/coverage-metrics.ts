export interface CoverageMetrics {
  lines: {
    total: number;
    covered: number;
    pct: number;
  };
  statements: {
    total: number;
    covered: number;
    pct: number;
  };
  functions: {
    total: number;
    covered: number;
    pct: number;
  };
  branches: {
    total: number;
    covered: number;
    pct: number;
  };
}

export interface SystemTestCoverage {
  classCount: number;
  coveredClassCount: number;
  classCoveragePct: number;
}

export interface DuplicationMetrics {
  duplicatedLines: number;
  totalLines: number;
  duplicationPct: number;
}

export interface AggregatedCoverage {
  name: string;
  type: 'user-story' | 'theme' | 'epic' | 'app';
  path: string;
  coverage: CoverageMetrics;
  systemTestCoverage: SystemTestCoverage;
  duplication: DuplicationMetrics;
  children?: AggregatedCoverage[];
  timestamp: Date;
}

export interface CoverageReport {
  app: AggregatedCoverage;
  epics: AggregatedCoverage[];
  themes: AggregatedCoverage[];
  userStories: AggregatedCoverage[];
  generatedAt: Date;
  thresholds: {
    systemTestClassCoverage: number;
    branchCoverage: number;
    duplication: number;
  };
}