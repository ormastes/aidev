/**
 * Type definitions for Python Coverage Analysis
 */

export interface CoverageConfig {
  configFile?: string;
  pythonPath?: string;
  uvPath?: string;
  thresholds?: CoverageThresholds;
  omitPatterns?: string[];
  includePatterns?: string[];
  parallel?: boolean;
  branch?: boolean;
}

export interface CoverageThresholds {
  line?: number;
  branch?: number;
  class?: number;
  method?: number;
  function?: number;
}

export interface CoverageResult {
  lineCoverage: number;
  branchCoverage: number;
  classCoverage: number;
  methodCoverage: number;
  totalLines: number;
  coveredLines: number;
  totalBranches: number;
  coveredBranches: number;
  uncoveredLines: Map<string, number[]>;
  files: FileCoverage[];
  timestamp: Date;
  testDuration: number;
}

export interface FileCoverage {
  path: string;
  lineCoverage: number;
  branchCoverage: number;
  totalLines: number;
  coveredLines: number;
  totalBranches: number;
  coveredBranches: number;
  uncoveredLines: number[];
  classes?: ClassMetrics[];
}

export interface ClassMetrics {
  name: string;
  file: string;
  lineCoverage: number;
  methodCoverage: number;
  totalMethods: number;
  coveredMethods: number;
  totalLines: number;
  coveredLines: number;
  uncoveredMethods: string[];
  complexity?: number;
}

export interface MethodMetrics {
  name: string;
  className?: string;
  coverage: number;
  complexity: number;
  lines: number;
  coveredLines: number;
  branches: number;
  coveredBranches: number;
}

export interface EnforcementResult {
  passed: boolean;
  violations: ThresholdViolation[];
  actualCoverage: CoverageThresholds;
  requiredCoverage: CoverageThresholds;
  message: string;
}

export interface ThresholdViolation {
  type: 'line' | 'branch' | 'class' | 'method' | "function";
  required: number;
  actual: number;
  difference: number;
  files?: string[];
}

export interface CoverageReport {
  format: 'html' | 'json' | 'xml' | "markdown" | 'console';
  content?: string;
  outputPath?: string;
  summary: CoverageSummary;
  generatedAt: Date;
}

export interface CoverageSummary {
  totalCoverage: number;
  lineCoverage: number;
  branchCoverage: number;
  classCoverage: number;
  methodCoverage: number;
  totalFiles: number;
  totalClasses: number;
  totalMethods: number;
  totalLines: number;
  coveredLines: number;
}

export interface CoverageTrend {
  date: Date;
  coverage: number;
  lineCoverage: number;
  branchCoverage: number;
  classCoverage?: number;
  testCount?: number;
}

export interface CoverageDiff {
  change: number;
  lineChange: number;
  branchChange: number;
  newUncovered: FileChange[];
  newlyCovered: FileChange[];
  modifiedFiles: string[];
}

export interface FileChange {
  file: string;
  lines: number[];
  type: 'added' | 'removed' | "modified";
}

export interface TestRunOptions {
  testPath: string;
  sourcePath: string;
  branch?: boolean;
  parallel?: boolean;
  format?: 'json' | 'xml' | 'html';
  outputDir?: string;
  markers?: string[];
  verbose?: boolean;
}

export interface PythonEnvironment {
  pythonVersion: string;
  pipVersion?: string;
  uvVersion?: string;
  coverageVersion: string;
  pytestVersion?: string;
  installedPackages: string[];
}

export interface CoverageSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | "completed" | 'failed';
  result?: CoverageResult;
  error?: string;
  command: string;
  environment: PythonEnvironment;
}