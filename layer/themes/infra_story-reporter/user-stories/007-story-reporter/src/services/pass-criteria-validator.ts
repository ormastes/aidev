import { TestResult } from '../domain/test-result';
import { SetupAggregator, AggregatedMetrics, SetupConfig } from './setup-aggregator';

/**
 * Pass Criteria Validator
 * 
 * Validates test results against pass criteria defined in setup folder test settings
 */
export class PassCriteriaValidator {
  private setupAggregator: SetupAggregator;

  constructor(setupAggregator?: SetupAggregator) {
    this.setupAggregator = setupAggregator || new SetupAggregator();
  }

  /**
   * Validate test results against setup folder pass criteria
   * @param testResult Test results to validate
   * @returns Validation result with detailed pass/fail information
   */
  async validate(testResult: TestResult): Promise<ValidationResult> {
    const aggregatedMetrics = await this.setupAggregator.aggregateMetrics();
    const setupConfig = await this.setupAggregator.getSetupConfig();
    
    const result: ValidationResult = {
      passed: true,
      timestamp: new Date().toISOString(),
      criteria: [],
      summary: {
        totalCriteria: 0,
        passedCriteria: 0,
        failedCriteria: 0
      }
    };
    
    // System Test Class Coverage Criterion
    const systemTestClassCriterion = this.validateSystemTestClassCoverage(
      aggregatedMetrics,
      setupConfig
    );
    result.criteria.push(systemTestClassCriterion);
    
    // Branch Coverage Criterion
    const branchCoverageCriterion = this.validateBranchCoverage(
      aggregatedMetrics,
      setupConfig
    );
    result.criteria.push(branchCoverageCriterion);
    
    // Code Duplication Criterion
    const duplicationCriterion = this.validateCodeDuplication(
      aggregatedMetrics,
      setupConfig
    );
    result.criteria.push(duplicationCriterion);
    
    // Test Execution Success Criterion
    const testExecutionCriterion = this.validateTestExecution(testResult);
    result.criteria.push(testExecutionCriterion);
    
    // Line Coverage Criterion (from setup config)
    const lineCoverageCriterion = this.validateLineCoverage(
      aggregatedMetrics,
      setupConfig
    );
    result.criteria.push(lineCoverageCriterion);
    
    // Function Coverage Criterion (from setup config)
    const functionCoverageCriterion = this.validateFunctionCoverage(
      aggregatedMetrics,
      setupConfig
    );
    result.criteria.push(functionCoverageCriterion);
    
    // Calculate summary
    result.summary.totalCriteria = result.criteria.length;
    result.summary.passedCriteria = result.criteria.filter(c => c.passed).length;
    result.summary.failedCriteria = result.criteria.filter(c => !c.passed).length;
    result.passed = result.summary.failedCriteria === 0;
    
    return result;
  }

  /**
   * Validate system test class coverage
   */
  private validateSystemTestClassCoverage(
    metrics: AggregatedMetrics,
    config: SetupConfig
  ): CriterionResult {
    const threshold = config.coverageThreshold.statements || 80;
    const actual = metrics.aggregatedMetrics.systemTest.class.percentage;
    
    return {
      name: 'System Test Class Coverage',
      description: `System test class coverage must be at least ${threshold}%`,
      passed: actual >= threshold,
      threshold,
      actual,
      message: actual >= threshold 
        ? `System test class coverage (${actual.toFixed(2)}%) meets the threshold`
        : `System test class coverage (${actual.toFixed(2)}%) is below the threshold of ${threshold}%`
    };
  }

  /**
   * Validate branch coverage
   */
  private validateBranchCoverage(
    metrics: AggregatedMetrics,
    config: SetupConfig
  ): CriterionResult {
    const threshold = config.coverageThreshold.branches || 80;
    const actual = metrics.aggregatedMetrics.overall.branch.percentage;
    
    return {
      name: 'Branch Coverage',
      description: `Branch coverage must be at least ${threshold}%`,
      passed: actual >= threshold,
      threshold,
      actual,
      message: actual >= threshold 
        ? `Branch coverage (${actual.toFixed(2)}%) meets the threshold`
        : `Branch coverage (${actual.toFixed(2)}%) is below the threshold of ${threshold}%`
    };
  }

  /**
   * Validate code duplication
   */
  private validateCodeDuplication(
    metrics: AggregatedMetrics,
    config: SetupConfig
  ): CriterionResult {
    const threshold = 5; // Max 5% duplication allowed
    const actual = metrics.passCriteria.duplicationThreshold.actual;
    
    return {
      name: 'Code Duplication',
      description: `Code duplication must be below ${threshold}%`,
      passed: actual <= threshold,
      threshold,
      actual,
      message: actual <= threshold 
        ? `Code duplication (${actual.toFixed(2)}%) is within acceptable limits`
        : `Code duplication (${actual.toFixed(2)}%) exceeds the threshold of ${threshold}%`
    };
  }

  /**
   * Validate test execution success
   */
  private validateTestExecution(testResult: TestResult): CriterionResult {
    const totalTests = testResult.totalScenarios;
    const passedTests = testResult.passedScenarios;
    const successRate = testResult.statistics.successRate;
    const threshold = 100; // All tests must pass
    
    return {
      name: 'Test Execution Success',
      description: 'All test scenarios must pass',
      passed: successRate === 100,
      threshold,
      actual: successRate,
      message: successRate === 100 
        ? `All ${totalTests} test scenarios passed`
        : `${passedTests} of ${totalTests} test scenarios passed (${successRate.toFixed(2)}%)`
    };
  }

  /**
   * Validate line coverage
   */
  private validateLineCoverage(
    metrics: AggregatedMetrics,
    config: SetupConfig
  ): CriterionResult {
    const threshold = config.coverageThreshold.lines || 80;
    const actual = metrics.aggregatedMetrics.overall.line.percentage;
    
    return {
      name: 'Line Coverage',
      description: `Line coverage must be at least ${threshold}%`,
      passed: actual >= threshold,
      threshold,
      actual,
      message: actual >= threshold 
        ? `Line coverage (${actual.toFixed(2)}%) meets the threshold`
        : `Line coverage (${actual.toFixed(2)}%) is below the threshold of ${threshold}%`
    };
  }

  /**
   * Validate function coverage
   */
  private validateFunctionCoverage(
    metrics: AggregatedMetrics,
    config: SetupConfig
  ): CriterionResult {
    const threshold = config.coverageThreshold.functions || 80;
    const actual = metrics.aggregatedMetrics.overall.method.percentage;
    
    return {
      name: 'Function Coverage',
      description: `Function coverage must be at least ${threshold}%`,
      passed: actual >= threshold,
      threshold,
      actual,
      message: actual >= threshold 
        ? `Function coverage (${actual.toFixed(2)}%) meets the threshold`
        : `Function coverage (${actual.toFixed(2)}%) is below the threshold of ${threshold}%`
    };
  }

  /**
   * Get validation report as markdown
   */
  generateMarkdownReport(validation: ValidationResult): string {
    const sections: string[] = [];
    
    sections.push(`# Pass Criteria Validation Report`);
    sections.push(`\n**Generated:** ${validation.timestamp}`);
    sections.push(`**Overall Status:** ${validation.passed ? '✅ PASSED' : '❌ FAILED'}`);
    
    sections.push(`\n## Summary`);
    sections.push(`- Total Criteria: ${validation.summary.totalCriteria}`);
    sections.push(`- Passed: ${validation.summary.passedCriteria}`);
    sections.push(`- Failed: ${validation.summary.failedCriteria}`);
    
    sections.push(`\n## Detailed Results`);
    
    validation.criteria.forEach((criterion, idx) => {
      const icon = criterion.passed ? '✅' : '❌';
      sections.push(`\n### ${idx + 1}. ${criterion.name} ${icon}`);
      sections.push(`**Description:** ${criterion.description}`);
      sections.push(`**Threshold:** ${criterion.threshold}%`);
      sections.push(`**Actual:** ${criterion.actual.toFixed(2)}%`);
      sections.push(`**Result:** ${criterion.message}`);
    });
    
    return sections.join('\n');
  }
}

// Type definitions
interface CriterionResult {
  name: string;
  description: string;
  passed: boolean;
  threshold: number;
  actual: number;
  message: string;
}

interface ValidationResult {
  passed: boolean;
  timestamp: string;
  criteria: CriterionResult[];
  summary: {
    totalCriteria: number;
    passedCriteria: number;
    failedCriteria: number;
  };
}

export type { ValidationResult, CriterionResult };