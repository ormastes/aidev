import { fileAPI } from '../utils/file-api';
import * as fs from 'fs/promises';
import { path } from '../../infra_external-log-lib/src';
import Ajv from 'ajv';
import { FraudChecker as createFraudChecker, TestAnalyzer as createTestAnalyzer, FraudCheckResult, TestAnalysis } from '../../infra_fraud-checker/pipe/index';

export interface ValidationCriteria {
  systemTestClassCoverage: number;
  branchCoverage: number;
  duplication: number;
  fraudCheckMinScore: number;
  validateConnectedFiles?: boolean;
  strictFileValidation?: boolean;
}

export interface ValidationResult {
  passed: boolean;
  criteria: {
    systemTestClassCoverage: { passed: boolean; actual: number; expected: number };
    branchCoverage: { passed: boolean; actual: number; expected: number };
    duplication: { passed: boolean; actual: number; expected: number };
    fraudCheck: { passed: boolean; actual: number; expected: number };
    connectedFiles?: { passed: boolean; actual: number; expected: number; details?: FileValidationDetails };
  };
  errors: string[];
  suggestions: string[];
  retrospectStep?: {
    required: boolean;
    message: string;
  };
}

export interface FileValidationDetails {
  totalFiles: number;
  existingFiles: number;
  missingFiles: string[];
  emptyFiles: string[];
  validFiles: string[];
}

export class StoryReportValidator {
  private ajv: Ajv;
  private fraudChecker: ReturnType<typeof createFraudChecker>;
  private testAnalyzer: ReturnType<typeof createTestAnalyzer>;

  constructor() {
    this.ajv = new Ajv({ allErrors: true });
    this.fraudChecker = createFraudChecker();
    this.testAnalyzer = createTestAnalyzer();
  }

  async validate(
    reportPath: string,
    criteria: ValidationCriteria
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const suggestions: string[] = [];

    try {
      // Read and parse the story report
      const reportContent = await fileAPI.readFile(reportPath, 'utf8');
      const report = JSON.parse(reportContent);

      // Validate against schema
      const schemaPath = path.join(process.cwd(), 'setup/schemas/story-report.schema.json');
      const schema = JSON.parse(await fileAPI.readFile(schemaPath, 'utf8'));
      const validate = this.ajv.compile(schema);
      
      if (!validate(report)) {
        errors.push(`Invalid story report format: ${JSON.stringify(validate.errors)}`);
        return this.createFailedResult(errors);
      }

      // Extract coverage metrics
      const systemTestClassCoverage = report.coverage?.systemTest?.class?.percentage || 0;
      const branchCoverage = report.coverage?.systemTest?.branch?.percentage || 0;
      const duplicationPercentage = report.duplication?.percentage || 0;

      // Run fraud check on test files
      const fraudCheckResult = await this.runFraudCheck(report);
      const fraudScore = fraudCheckResult.score;

      // Validate connected files if requested
      let fileValidation: FileValidationDetails | undefined;
      if (criteria.validateConnectedFiles && report.connectedFiles) {
        fileValidation = await this.validateConnectedFiles(report.connectedFiles, criteria.strictFileValidation);
      }

      // Validate criteria
      const result: ValidationResult = {
        passed: true,
        criteria: {
          systemTestClassCoverage: {
            passed: systemTestClassCoverage >= criteria.systemTestClassCoverage,
            actual: systemTestClassCoverage,
            expected: criteria.systemTestClassCoverage
          },
          branchCoverage: {
            passed: branchCoverage >= criteria.branchCoverage,
            actual: branchCoverage,
            expected: criteria.branchCoverage
          },
          duplication: {
            passed: duplicationPercentage <= criteria.duplication,
            actual: duplicationPercentage,
            expected: criteria.duplication
          },
          fraudCheck: {
            passed: fraudScore >= criteria.fraudCheckMinScore,
            actual: fraudScore,
            expected: criteria.fraudCheckMinScore
          }
        },
        errors,
        suggestions
      };

      // Add file validation results if available
      if (fileValidation) {
        result.criteria.connectedFiles = {
          passed: fileValidation.missingFiles.length === 0 && 
                 (!criteria.strictFileValidation || fileValidation.emptyFiles.length === 0),
          actual: fileValidation.existingFiles,
          expected: fileValidation.totalFiles,
          details: fileValidation
        };
      }

      // Check if all criteria passed
      result.passed = Object.values(result.criteria).every(c => c.passed);

      // Add specific errors and suggestions
      if (!result.criteria.systemTestClassCoverage.passed) {
        errors.push(
          `System test class coverage (${systemTestClassCoverage}%) is below required ${criteria.systemTestClassCoverage}%`
        );
        suggestions.push('Add more system tests to cover untested classes');
      }

      if (!result.criteria.branchCoverage.passed) {
        errors.push(
          `Branch coverage (${branchCoverage}%) is below required ${criteria.branchCoverage}%`
        );
        suggestions.push('Add tests for uncovered conditional branches');
      }

      if (!result.criteria.duplication.passed) {
        errors.push(
          `Code duplication (${duplicationPercentage}%) exceeds maximum allowed ${criteria.duplication}%`
        );
        suggestions.push('Refactor duplicated code blocks into shared utilities');
      }

      if (!result.criteria.fraudCheck.passed) {
        errors.push(
          `Fraud check score (${fraudScore}) is below required ${criteria.fraudCheckMinScore}`
        );
        if (fraudCheckResult.violations.length > 0) {
          suggestions.push('Fix the following test quality issues:');
          fraudCheckResult.violations.forEach(v => {
            suggestions.push(`  - [${v.severity}] ${v.type}: ${v.message} at ${v.location}`);
          });
        }
      }

      // Add file validation errors if present
      if (result.criteria.connectedFiles && !result.criteria.connectedFiles.passed) {
        const details = result.criteria.connectedFiles.details;
        if (details?.missingFiles.length > 0) {
          errors.push(`Missing connected files: ${details.missingFiles.join(', ')}`);
          suggestions.push('Ensure all referenced files are created and committed');
        }
        if (details?.emptyFiles.length > 0) {
          if (criteria.strictFileValidation) {
            errors.push(`Empty connected files: ${details.emptyFiles.join(', ')}`);
          } else {
            suggestions.push(`Warning: Empty files detected: ${details.emptyFiles.join(', ')}`);
          }
          suggestions.push('Add implementation to empty files');
        }
      }

      // Add retrospect step if validation failed
      if (!result.passed) {
        result.retrospectStep = {
          required: true,
          message: 'Retrospect required: Coverage or quality criteria not met. Review and improve test implementation.'
        };
      }

      return result;

    } catch (error) {
      errors.push(`Failed to validate story report: ${error.message}`);
      return this.createFailedResult(errors);
    }
  }

  private async runFraudCheck(report: any): Promise<FraudCheckResult> {
    // Use the fraud checker theme to analyze test files
    const testFiles = [];
    
    // Extract test file information from scenarios
    const scenarios = report.testResults?.scenarios || [];
    const fileMap = new Map<string, string>();
    
    scenarios.forEach((scenario: any) => {
      if (scenario.file) {
        fileMap.set(scenario.file, scenario.file);
      }
    });
    
    // If no file info in scenarios, create synthetic test data
    if (fileMap.size === 0 && scenarios.length > 0) {
      // Create synthetic test file data for analysis
      const syntheticContent = this.createSyntheticTestContent(scenarios);
      testFiles.push({
        path: 'synthetic-test.js',
        content: syntheticContent
      });
    } else {
      // Use actual file paths
      for (const filePath of fileMap.keys()) {
        testFiles.push({ path: filePath });
      }
    }
    
    // Run fraud check
    let fraudResult: FraudCheckResult;
    
    if (testFiles.length > 0) {
      fraudResult = await this.fraudChecker.checkTestFiles(testFiles);
    } else {
      // No test files to check, return clean result
      fraudResult = {
        passed: true,
        score: 100,
        violations: [],
        metrics: {
          filesChecked: 0,
          totalTests: 0,
          skippedTests: 0,
          emptyTests: 0,
          suspiciousPatterns: 0
        }
      };
    }
    
    // Analyze test metrics for additional fraud patterns
    const testAnalysis = this.testAnalyzer.analyzeTestResults(report.testResults);
    
    // Adjust score based on test analysis
    if (testAnalysis.suspicious.tooFastTests > 0) {
      fraudResult.score -= 10;
      fraudResult.violations.push({
        type: 'test-manipulation',
        severity: 'medium',
        message: `${testAnalysis.suspicious.tooFastTests} suspiciously fast tests detected`,
        location: 'test execution'
      });
    }
    
    if (testAnalysis.quality.skipRatio > 0.2) {
      fraudResult.score -= 15;
      fraudResult.violations.push({
        type: 'disabled-tests',
        severity: 'high',
        message: `High skip ratio: ${(testAnalysis.quality.skipRatio * 100).toFixed(1)}%`,
        location: 'test suite'
      });
    }
    
    // Check for suspiciously high coverage with few tests
    if (report.testResults?.totalTests < 5 && report.coverage?.systemTest?.class?.percentage > 90) {
      fraudResult.score -= 20;
      fraudResult.violations.push({
        type: 'coverage-bypass',
        severity: 'high',
        message: 'Suspiciously high coverage with very few tests',
        location: 'coverage report'
      });
    }
    
    fraudResult.score = Math.max(0, fraudResult.score);
    fraudResult.passed = fraudResult.score >= 90; // 90 is the default threshold
    
    return fraudResult;
  }
  
  private createSyntheticTestContent(scenarios: any[]): string {
    // Create synthetic JavaScript test content for analysis
    let content = '// Synthetic test file generated from story report\n\n';
    
    scenarios.forEach((scenario: any) => {
      const status = scenario.status || 'passed';
      
      if (status === 'skipped') {
        content += `it.skip('${scenario.name}', () => {\n`;
      } else {
        content += `it('${scenario.name}', () => {\n`;
      }
      
      const steps = scenario.steps || [];
      if (steps.length === 0 && status === 'passed') {
        // Empty test
        content += '  // No steps\n';
      } else {
        steps.forEach((step: any) => {
          if (step.status === 'skipped') {
            content += `  // SKIPPED: ${step.name}\n`;
          } else {
            content += `  // ${step.name}\n`;
            content += `  expect(true).toBe(true); // placeholder\n`;
          }
        });
      }
      
      content += '});\n\n';
    });
    
    return content;
  }

  private async validateConnectedFiles(
    connectedFiles: string[],
    strict: boolean = false
  ): Promise<FileValidationDetails> {
    const details: FileValidationDetails = {
      totalFiles: connectedFiles.length,
      existingFiles: 0,
      missingFiles: [],
      emptyFiles: [],
      validFiles: []
    };

    for (const file of connectedFiles) {
      // Support both absolute and relative paths
      const filePath = path.isAbsolute(file) 
        ? file 
        : path.join(process.cwd(), file);
      
      try {
        const stats = await /* FRAUD_FIX: fs.stat(filePath) */;
        
        if (stats.isFile()) {
          details.existingFiles++;
          
          if (stats.size === 0) {
            details.emptyFiles.push(file);
          } else {
            details.validFiles.push(file);
          }
        } else if (stats.isDirectory()) {
          // If it's a directory, check if it has content
          const dirContents = await fs.readdir(filePath);
          if (dirContents.length === 0) {
            details.emptyFiles.push(file);
          } else {
            details.validFiles.push(file);
          }
          details.existingFiles++;
        }
      } catch (error) {
        details.missingFiles.push(file);
      }
    }

    return details;
  }

  private createFailedResult(errors: string[]): ValidationResult {
    return {
      passed: false,
      criteria: {
        systemTestClassCoverage: { passed: false, actual: 0, expected: 0 },
        branchCoverage: { passed: false, actual: 0, expected: 0 },
        duplication: { passed: false, actual: 0, expected: 0 },
        fraudCheck: { passed: false, actual: 0, expected: 0 }
      },
      errors,
      suggestions: [],
      retrospectStep: {
        required: true,
        message: 'Retrospect required: Failed to validate story report.'
      }
    };
  }

  /**
   * Create a runnable comment for story report validation
   */
  createRunnableComment(
    reportPath: string,
    criteria: ValidationCriteria
  ): string {
    const params = [
      reportPath,
      criteria.systemTestClassCoverage,
      criteria.branchCoverage,
      criteria.duplication,
      criteria.fraudCheckMinScore
    ].join(',');

    return `<!-- runnable:validate-story-report:${params} -->`;
  }

  /**
   * Parse runnable comment parameters
   */
  static parseRunnableComment(comment: string): {
    reportPath: string;
    criteria: ValidationCriteria;
  } | null {
    const match = comment.match(/<!-- runnable:validate-story-report:(.+) -->/);
    if (!match) return null;

    const params = match[1].split(',');
    if (params.length !== 5) return null;

    return {
      reportPath: params[0],
      criteria: {
        systemTestClassCoverage: parseFloat(params[1]),
        branchCoverage: parseFloat(params[2]),
        duplication: parseFloat(params[3]),
        fraudCheckMinScore: parseFloat(params[4])
      }
    };
  }
}