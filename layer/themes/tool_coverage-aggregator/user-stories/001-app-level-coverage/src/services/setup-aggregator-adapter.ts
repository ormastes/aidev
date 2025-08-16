import { AggregatedCoverage, CoverageMetrics, SystemTestCoverage, DuplicationMetrics } from '../models/coverage-metrics';
import { path } from '../../../../../infra_external-log-lib/src';

interface SetupCoverageMetric {
  percentage: number;
  covered: number;
  total: number;
}

interface SetupCoverageDetails {
  class: SetupCoverageMetric;
  branch: SetupCoverageMetric;
  line: SetupCoverageMetric;
  method: SetupCoverageMetric;
}

interface SetupThemeMetrics {
  name: string;
  path: string;
  coverage: {
    systemTest: SetupCoverageDetails;
    overall: SetupCoverageDetails;
  };
  duplication: {
    percentage: number;
    duplicatedLines: number;
    totalLines: number;
  };
}

export class SetupAggregatorAdapter {
  /**
   * Converts SetupAggregator theme metrics to our hierarchical coverage format
   */
  static convertThemeMetrics(setupMetrics: SetupThemeMetrics): AggregatedCoverage {
    return {
      name: setupMetrics.name,
      type: 'theme',
      path: setupMetrics.path,
      coverage: this.convertCoverageMetrics(setupMetrics.coverage.overall),
      systemTestCoverage: this.convertSystemTestCoverage(setupMetrics.coverage.systemTest),
      duplication: this.convertDuplicationMetrics(setupMetrics.duplication),
      timestamp: new Date()
    };
  }

  /**
   * Converts multiple theme metrics from SetupAggregator format
   */
  static convertMultipleThemes(setupThemes: SetupThemeMetrics[]): AggregatedCoverage[] {
    return setupThemes.map(theme => this.convertThemeMetrics(theme));
  }

  /**
   * Converts SetupAggregator coverage details to our coverage metrics format
   */
  private static convertCoverageMetrics(details: SetupCoverageDetails): CoverageMetrics {
    return {
      lines: {
        total: details.line.total,
        covered: details.line.covered,
        pct: details.line.percentage
      },
      statements: {
        // SetupAggregator doesn't track statements separately, use lines as proxy
        total: details.line.total,
        covered: details.line.covered,
        pct: details.line.percentage
      },
      functions: {
        total: details.method.total,
        covered: details.method.covered,
        pct: details.method.percentage
      },
      branches: {
        total: details.branch.total,
        covered: details.branch.covered,
        pct: details.branch.percentage
      }
    };
  }

  /**
   * Converts system test coverage from SetupAggregator format
   */
  private static convertSystemTestCoverage(systemTest: SetupCoverageDetails): SystemTestCoverage {
    return {
      classCount: systemTest.class.total,
      coveredClassCount: systemTest.class.covered,
      classCoveragePct: systemTest.class.percentage
    };
  }

  /**
   * Converts duplication metrics from SetupAggregator format
   */
  private static convertDuplicationMetrics(duplication: {
    percentage: number;
    duplicatedLines: number;
    totalLines: number;
  }): DuplicationMetrics {
    return {
      duplicatedLines: duplication.duplicatedLines,
      totalLines: duplication.totalLines,
      duplicationPct: duplication.percentage
    };
  }

  /**
   * Creates an aggregated app-level coverage from SetupAggregator data
   */
  static createAppCoverageFromSetup(setupThemes: SetupThemeMetrics[]): AggregatedCoverage {
    const themes = this.convertMultipleThemes(setupThemes);
    
    // Calculate aggregated metrics
    const totals = {
      lines: { total: 0, covered: 0 },
      statements: { total: 0, covered: 0 },
      functions: { total: 0, covered: 0 },
      branches: { total: 0, covered: 0 },
      classes: { total: 0, covered: 0 },
      duplication: { duplicated: 0, total: 0 }
    };

    for (const theme of themes) {
      totals.lines.total += theme.coverage.lines.total;
      totals.lines.covered += theme.coverage.lines.covered;
      totals.statements.total += theme.coverage.statements.total;
      totals.statements.covered += theme.coverage.statements.covered;
      totals.functions.total += theme.coverage.functions.total;
      totals.functions.covered += theme.coverage.functions.covered;
      totals.branches.total += theme.coverage.branches.total;
      totals.branches.covered += theme.coverage.branches.covered;
      totals.classes.total += theme.systemTestCoverage.classCount;
      totals.classes.covered += theme.systemTestCoverage.coveredClassCount;
      totals.duplication.duplicated += theme.duplication.duplicatedLines;
      totals.duplication.total += theme.duplication.totalLines;
    }

    return {
      name: 'AI Development Platform (Setup)',
      type: 'app',
      path: process.cwd(),
      coverage: {
        lines: {
          total: totals.lines.total,
          covered: totals.lines.covered,
          pct: totals.lines.total > 0 ? (totals.lines.covered / totals.lines.total) * 100 : 0
        },
        statements: {
          total: totals.statements.total,
          covered: totals.statements.covered,
          pct: totals.statements.total > 0 ? (totals.statements.covered / totals.statements.total) * 100 : 0
        },
        functions: {
          total: totals.functions.total,
          covered: totals.functions.covered,
          pct: totals.functions.total > 0 ? (totals.functions.covered / totals.functions.total) * 100 : 0
        },
        branches: {
          total: totals.branches.total,
          covered: totals.branches.covered,
          pct: totals.branches.total > 0 ? (totals.branches.covered / totals.branches.total) * 100 : 0
        }
      },
      systemTestCoverage: {
        classCount: totals.classes.total,
        coveredClassCount: totals.classes.covered,
        classCoveragePct: totals.classes.total > 0 ? (totals.classes.covered / totals.classes.total) * 100 : 0
      },
      duplication: {
        duplicatedLines: totals.duplication.duplicated,
        totalLines: totals.duplication.total,
        duplicationPct: totals.duplication.total > 0 ? (totals.duplication.duplicated / totals.duplication.total) * 100 : 0
      },
      children: themes,
      timestamp: new Date()
    };
  }
}