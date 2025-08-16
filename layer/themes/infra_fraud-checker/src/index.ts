/**
 * Fraud Checker Theme - Mock Detection for Test Suites
 * 
 * Detects and reports mock usage in system, external, and environment tests
 * to ensure true Mock-Free Test Oriented Development.
 */

export * from './domain/mock-detection';
export * from './detectors/base-detector';
export * from './detectors/system-test-detector';
export * from './detectors/external-test-detector';
export * from './detectors/environment-test-detector';
export * from './reporters/fraud-report-generator';
export * from './services/mock-fraud-checker-integration';

// Main fraud checker class for easy usage
import { SystemTestDetector } from './detectors/system-test-detector';
import { ExternalTestDetector } from './detectors/external-test-detector';
import { EnvironmentTestDetector } from './detectors/environment-test-detector';
import { FraudReportGenerator } from './reporters/fraud-report-generator';
import {
  FraudReport,
  MockDetectionConfig,
  DEFAULT_TEST_PATTERNS,
  calculateFraudScore
} from './domain/mock-detection';

export class MockFraudChecker {
  private config: MockDetectionConfig;
  private reportGenerator: FraudReportGenerator;

  constructor(config: Partial<MockDetectionConfig> = {}) {
    this.config = {
      projectPath: config.projectPath || process.cwd(),
      testPatterns: config.testPatterns || DEFAULT_TEST_PATTERNS,
      excludePatterns: config.excludePatterns || ['**/node_modules/**', '**/dist/**'],
      customRules: config.customRules || [],
      severityThresholds: config.severityThresholds || {
        critical: 0,
        high: 5,
        fraudScore: 50
      }
    };
    
    this.reportGenerator = new FraudReportGenerator();
  }

  /**
   * Run comprehensive mock fraud detection
   */
  async analyze(): Promise<FraudReport> {
    const systemDetector = new SystemTestDetector(
      this.config.projectPath,
      this.config.testPatterns.system
    );
    
    const externalDetector = new ExternalTestDetector(
      this.config.projectPath,
      this.config.testPatterns.external
    );
    
    const environmentDetector = new EnvironmentTestDetector(
      this.config.projectPath,
      this.config.testPatterns.environment
    );

    // Run all detectors in parallel
    const [systemAnalyses, externalAnalyses, environmentAnalyses] = await Promise.all([
      systemDetector.analyze(),
      externalDetector.analyze(),
      environmentDetector.analyze()
    ]);

    // Combine results
    const allAnalyses = [...systemAnalyses, ...externalAnalyses, ...environmentAnalyses];
    const allViolations = allAnalyses.flatMap(a => a.mocksDetected);

    // Calculate summary
    const summary = {
      totalFiles: allAnalyses.length,
      filesWithMocks: allAnalyses.filter(a => a.mocksDetected.length > 0).length,
      criticalViolations: allViolations.filter(v => v.severity === 'critical').length,
      highViolations: allViolations.filter(v => v.severity === 'high').length,
      mediumViolations: allViolations.filter(v => v.severity === 'medium').length,
      overallFraudScore: calculateFraudScore(allViolations)
    };

    // Calculate mock-free percentage
    const totalTests = allAnalyses.reduce((sum, a) => sum + a.totalTests, 0);
    const mockFreeTests = allAnalyses.reduce((sum, a) => sum + a.mockFreeSections, 0);
    const mockFreeTestPercentage = totalTests > 0 ? (mockFreeTests / totalTests) * 100 : 0;

    // Generate recommendations
    const recommendations = this.generateRecommendations(summary, allAnalyses);

    const report: FraudReport = {
      id: `fraud_${Date.now()}`,
      projectPath: this.config.projectPath,
      timestamp: new Date(),
      summary,
      fileAnalyses: allAnalyses,
      violations: allViolations,
      recommendations,
      mockFreeTestPercentage
    };

    return report;
  }

  /**
   * Generate and save HTML report
   */
  async generateReport(outputDir?: string): Promise<string> {
    const report = await this.analyze();
    
    if (outputDir) {
      this.reportGenerator = new FraudReportGenerator(outputDir);
    }
    
    const reportPath = await this.reportGenerator.generateHtmlReport(report);
    return reportPath;
  }

  /**
   * Check if project passes fraud detection
   */
  async check(): Promise<{ passed: boolean; report: FraudReport }> {
    const report = await this.analyze();
    
    const passed = 
      report.summary.criticalViolations <= this.config.severityThresholds.critical &&
      report.summary.highViolations <= this.config.severityThresholds.high &&
      report.summary.overallFraudScore <= this.config.severityThresholds.fraudScore;
    
    return { passed, report };
  }

  private generateRecommendations(summary: any, analyses: any[]): string[] {
    const recommendations: string[] = [];

    if (summary.criticalViolations > 0) {
      recommendations.push(
        '🚨 Critical: Remove all mocks from system and environment tests immediately'
      );
    }

    if (summary.highViolations > 0) {
      recommendations.push(
        '⚠️  High Priority: Replace mocks in external tests with real service instances'
      );
    }

    if (summary.overallFraudScore > 75) {
      recommendations.push(
        '🏗️  Consider a In Progress test infrastructure overhaul using Docker Compose'
      );
    } else if (summary.overallFraudScore > 50) {
      recommendations.push(
        '📈 Gradually migrate from mocks to real implementations'
      );
    }

    const goodPractices = analyses.filter(a => 
      a.mocksDetected.length === 0 && a.totalTests > 0
    ).length;

    if (goodPractices > 0) {
      recommendations.push(
        `🔄 Excellent: ${goodPractices} test files are completely mock-free!`
      );
    }

    recommendations.push(
      '📚 Read more about Mock-Free Test Oriented Development',
      '🐳 Use TestContainers or Docker for isolated test environments'
    );

    return recommendations;
  }
}