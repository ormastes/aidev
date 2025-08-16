import { TestReportGenerator } from './report-generator';
import { CoverageAnalyzer } from './coverage-analyzer';
import { DuplicationDetector } from './duplication-detector';
import { FraudChecker } from './fraud-checker';
import { ThemeManager } from './theme-manager';
import * as testReportSchema from '../schemas/test-report.schema.json';
import * as testCriteriaSchema from '../schemas/test-criteria.schema.json';

export interface TestEnvironmentConfig {
  theme: string;
  environment: 'unit' | 'integration' | 'system' | 'e2e';
  mode: 'production' | 'demo';
  outputDir: string;
}

export class TestEnvironmentSetup {
  private reportGenerator: TestReportGenerator;
  private coverageAnalyzer: CoverageAnalyzer;
  private duplicationDetector: DuplicationDetector;
  private fraudChecker: FraudChecker;
  private themeManager: ThemeManager;

  constructor(private config: TestEnvironmentConfig) {
    this.reportGenerator = new TestReportGenerator(testReportSchema);
    this.coverageAnalyzer = new CoverageAnalyzer();
    this.duplicationDetector = new DuplicationDetector();
    this.fraudChecker = new FraudChecker();
    this.themeManager = new ThemeManager(testCriteriaSchema);
  }

  async runAnalysis(testResults: any): Promise<TestReport> {
    const criteria = await this.themeManager.getCriteria(
      this.config.theme,
      this.config.mode
    );

    const coverage = await this.coverageAnalyzer.analyze(testResults);
    const duplication = await this.duplicationDetector.detect();
    const fraudCheck = await this.fraudChecker.check(testResults);

    const status = this.evaluateStatus(coverage, duplication, fraudCheck, criteria);

    const report = await this.reportGenerator.generate({
      theme: this.config.theme,
      timestamp: new Date().toISOString(),
      environment: {
        type: this.config.environment,
        version: process.env.npm_package_version || '0.0.0',
        platform: process.platform
      },
      metrics: {
        coverage,
        duplication,
        fraudCheck
      },
      status,
      epic: await this.themeManager.getEpicInfo(this.config.theme)
    });

    await this.reportGenerator.save(report, this.config.outputDir);
    return report;
  }

  private evaluateStatus(
    coverage: CoverageMetrics,
    duplication: DuplicationMetrics,
    fraudCheck: FraudCheckMetrics,
    criteria: TestCriteria
  ): StatusReport {
    const classCoverageMet = coverage.class.percentage >= criteria.coverage.class.minimum;
    const branchCoverageMet = coverage.branch.percentage >= criteria.coverage.branch.minimum;
    const duplicationMet = duplication.percentage <= criteria.duplication.maxPercentage;
    const fraudCheckMet = fraudCheck.score >= criteria.fraudCheck.minScore;

    const overall = classCoverageMet && branchCoverageMet && duplicationMet && fraudCheckMet
      ? 'passed'
      : 'failed';

    return {
      overall,
      criteria: {
        classCoverage: {
          met: classCoverageMet,
          target: criteria.coverage.class.target,
          actual: coverage.class.percentage
        },
        branchCoverage: {
          met: branchCoverageMet,
          target: criteria.coverage.branch.target,
          actual: coverage.branch.percentage
        },
        duplication: {
          met: duplicationMet,
          target: criteria.duplication.maxPercentage,
          actual: duplication.percentage
        },
        fraudCheck: {
          met: fraudCheckMet,
          target: criteria.fraudCheck.minScore,
          actual: fraudCheck.score
        }
      }
    };
  }
}

export interface TestReport {
  theme: string;
  timestamp: string;
  environment: {
    type: string;
    version: string;
    platform: string;
  };
  metrics: {
    coverage: CoverageMetrics;
    duplication: DuplicationMetrics;
    fraudCheck: FraudCheckMetrics;
  };
  status: StatusReport;
  epic?: any;
}

export interface CoverageMetrics {
  class: MetricDetail;
  branch: MetricDetail;
  line: MetricDetail;
  method: MetricDetail;
}

export interface MetricDetail {
  percentage: number;
  covered: number;
  total: number;
}

export interface DuplicationMetrics {
  percentage: number;
  duplicatedLines: number;
  totalLines: number;
  duplicatedBlocks: DuplicatedBlock[];
}

export interface DuplicatedBlock {
  files: string[];
  lines: number;
  tokens: number;
}

export interface FraudCheckMetrics {
  passed: boolean;
  score: number;
  violations: FraudViolation[];
}

export interface FraudViolation {
  type: 'test-manipulation' | 'coverage-bypass' | 'fake-assertions' | 'disabled-tests';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  location: string;
}

export interface TestCriteria {
  coverage: {
    class: { minimum: number; target: number };
    branch: { minimum: number; target: number };
    line: { minimum: number; target: number };
    method: { minimum: number; target: number };
  };
  duplication: {
    maxPercentage: number;
  };
  fraudCheck: {
    enabled: boolean;
    minScore: number;
  };
}

export interface StatusReport {
  overall: 'passed' | 'failed' | 'warning';
  criteria: {
    classCoverage: CriteriaStatus;
    branchCoverage: CriteriaStatus;
    duplication: CriteriaStatus;
    fraudCheck: CriteriaStatus;
  };
}

export interface CriteriaStatus {
  met: boolean;
  target: number;
  actual: number;
}