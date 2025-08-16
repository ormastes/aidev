/**
 * Type definitions for the fraud-checker theme
 */

export enum Severity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}

export interface DetectionResult {
  file: string;
  line: number;
  column?: number;
  severity: Severity;
  category: string;
  message: string;
  code?: string;
  suggestion?: string;
  autoFixable?: boolean;
}

export interface FraudCheckReport {
  timestamp: string;
  projectPath: string;
  summary: {
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
    fixedIssues?: number;
  };
  categories: {
    [key: string]: DetectionResult[];
  };
  recommendations: string[];
}

export interface FileViolation {
  file: string;
  line: number;
  pattern: string;
  severity: string;
  code: string;
}

export interface ScanResults {
  totalViolations: number;
  filesAffected: number;
  violationsByFile: Map<string, FileViolation[]>;
  patternCounts: Map<string, number>;
}

export interface CheckerOptions {
  projectPath: string;
  excludePatterns?: string[];
  autoFix?: boolean;
  verbose?: boolean;
}