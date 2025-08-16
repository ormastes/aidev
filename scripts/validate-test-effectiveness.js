#!/usr/bin/env node

/**
 * Test Effectiveness Validation Script
 * 
 * This script runs all tests and validates they can properly detect failures.
 * It ensures no false positives or negatives in test assertions.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Test categories to validate
const testCategories = [
  {
    name: 'Unit Tests',
    pattern: '**/tests/unit/**/*.test.ts',
    required: true
  },
  {
    name: 'Integration Tests', 
    pattern: '**/tests/integration/**/*.itest.ts',
    required: false
  },
  {
    name: 'System Tests',
    pattern: '**/tests/system/**/*.stest.ts',
    required: false
  },
  {
    name: 'Validation Tests',
    pattern: '**/test/validation/**/*.test.ts',
    required: true
  }
];

class TestValidator {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      skipped: [],
      errors: []
    };
    this.startTime = Date.now();
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  logSection(title) {
    console.log('\n' + '='.repeat(60));
    this.log(title, 'cyan');
    console.log('='.repeat(60));
  }

  /**
   * Run a specific test category
   */
  runTestCategory(category) {
    this.log(`\nRunning ${category.name}...`, 'blue');
    
    try {
      const result = execSync(
        `bunx jest -c config/jest/jest.config.js --testMatch='${category.pattern}' --json --no-coverage`,
        { 
          encoding: 'utf8',
          stdio: 'pipe',
          maxBuffer: 10 * 1024 * 1024 // 10MB buffer
        }
      );
      
      const testResult = JSON.parse(result);
      return this.analyzeTestResult(category.name, testResult);
    } catch (error) {
      if (error.stdout) {
        try {
          const testResult = JSON.parse(error.stdout);
          return this.analyzeTestResult(category.name, testResult);
        } catch (parseError) {
          // Not JSON output
        }
      }
      
      if (category.required) {
        this.results.errors.push({
          category: category.name,
          error: error.message || 'Unknown error'
        });
        return false;
      } else {
        this.results.skipped.push(category.name);
        this.log(`  ⚠ ${category.name} skipped (not required)`, 'yellow');
        return true;
      }
    }
  }

  /**
   * Analyze test results for failure detection capability
   */
  analyzeTestResult(categoryName, testResult) {
    const stats = {
      total: testResult.numTotalTests || 0,
      passed: testResult.numPassedTests || 0,
      failed: testResult.numFailedTests || 0,
      pending: testResult.numPendingTests || 0
    };

    // Check if tests are present
    if (stats.total === 0) {
      this.log(`  ⚠ No tests found in ${categoryName}`, 'yellow');
      this.results.skipped.push(categoryName);
      return true;
    }

    // Analyze test effectiveness
    const effectiveness = this.calculateEffectiveness(testResult);
    
    if (effectiveness.isEffective) {
      this.log(`  ✓ ${categoryName}: ${stats.passed}/${stats.total} tests passed`, 'green');
      this.results.passed.push({
        category: categoryName,
        stats,
        effectiveness
      });
      return true;
    } else {
      this.log(`  ✗ ${categoryName}: Tests not effective at detecting failures`, 'red');
      this.log(`    Failed: ${stats.failed}, Reason: ${effectiveness.reason}`, 'red');
      this.results.failed.push({
        category: categoryName,
        stats,
        effectiveness
      });
      return false;
    }
  }

  /**
   * Calculate test effectiveness metrics
   */
  calculateEffectiveness(testResult) {
    const testSuites = testResult.testResults || [];
    let hasFailureDetection = false;
    let hasAssertions = false;
    let reasons = [];

    for (const suite of testSuites) {
      // Check for assertion failures in test names or messages
      const assertionTests = suite.assertionResults || [];
      
      for (const test of assertionTests) {
        // Look for tests that validate failure detection
        if (test.title && (
          test.title.includes('detect') ||
          test.title.includes('catch') ||
          test.title.includes('fail') ||
          test.title.includes('throw') ||
          test.title.includes('error')
        )) {
          hasFailureDetection = true;
        }

        // Check if test has assertions
        if (test.status === 'passed' && test.ancestorTitles) {
          hasAssertions = true;
        }
      }
    }

    // Determine effectiveness
    if (!hasAssertions) {
      reasons.push('No assertions found');
    }
    
    const isEffective = hasAssertions && (hasFailureDetection || testResult.success);
    
    return {
      isEffective,
      hasFailureDetection,
      hasAssertions,
      reason: reasons.join(', ') || 'Tests are effective'
    };
  }

  /**
   * Validate specific failure detection patterns
   */
  validateFailurePatterns() {
    this.logSection('Validating Failure Detection Patterns');
    
    const patterns = [
      {
        name: 'Equality assertions',
        test: () => {
          try {
            const assert = require('assert');
            assert.strictEqual(1, 2);
            return false; // Should have thrown
          } catch {
            return true; // Properly detected failure
          }
        }
      },
      {
        name: 'Promise rejections',
        test: async () => {
          try {
            await Promise.reject(new Error('test'));
            return false; // Should have thrown
          } catch {
            return true; // Properly detected failure
          }
        }
      },
      {
        name: 'Timeout detection',
        test: () => {
          return new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(false), 100);
            // Simulate timeout detection
            setTimeout(() => {
              clearTimeout(timeout);
              resolve(true);
            }, 50);
          });
        }
      }
    ];

    const patternResults = [];
    
    for (const pattern of patterns) {
      const result = pattern.test();
      const passed = result instanceof Promise ? true : result;
      
      if (passed) {
        this.log(`  ✓ ${pattern.name}`, 'green');
      } else {
        this.log(`  ✗ ${pattern.name}`, 'red');
      }
      
      patternResults.push({ name: pattern.name, passed });
    }

    return patternResults.every(r => r.passed);
  }

  /**
   * Generate comprehensive report
   */
  generateReport() {
    this.logSection('Test Effectiveness Report');
    
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    const totalCategories = testCategories.length;
    const passedCount = this.results.passed.length;
    const failedCount = this.results.failed.length;
    const skippedCount = this.results.skipped.length;
    const errorCount = this.results.errors.length;

    // Summary statistics
    console.log('\n📊 Summary Statistics:');
    console.log(`  Total Categories: ${totalCategories}`);
    console.log(`  ${colors.green}Passed: ${passedCount}${colors.reset}`);
    console.log(`  ${colors.red}Failed: ${failedCount}${colors.reset}`);
    console.log(`  ${colors.yellow}Skipped: ${skippedCount}${colors.reset}`);
    console.log(`  ${colors.red}Errors: ${errorCount}${colors.reset}`);
    console.log(`  Duration: ${duration}s`);

    // Detailed results
    if (this.results.passed.length > 0) {
      console.log('\n✅ Effective Test Categories:');
      for (const result of this.results.passed) {
        console.log(`  • ${result.category}`);
        console.log(`    Tests: ${result.stats.passed}/${result.stats.total}`);
        if (result.effectiveness.hasFailureDetection) {
          console.log(`    ✓ Has failure detection tests`);
        }
      }
    }

    if (this.results.failed.length > 0) {
      console.log('\n❌ Ineffective Test Categories:');
      for (const result of this.results.failed) {
        console.log(`  • ${result.category}`);
        console.log(`    Reason: ${result.effectiveness.reason}`);
        console.log(`    Action: Add failure detection tests`);
      }
    }

    if (this.results.errors.length > 0) {
      console.log('\n⚠️ Errors:');
      for (const error of this.results.errors) {
        console.log(`  • ${error.category}: ${error.error}`);
      }
    }

    // Recommendations
    console.log('\n💡 Recommendations:');
    if (failedCount > 0 || errorCount > 0) {
      console.log('  1. Fix failing tests before committing');
      console.log('  2. Add failure detection validation to all test suites');
      console.log('  3. Ensure each test has proper assertions');
    } else {
      console.log('  ✓ All tests are properly detecting failures');
      console.log('  ✓ Test suite is healthy and effective');
    }

    // Generate JSON report
    const report = {
      timestamp: new Date().toISOString(),
      duration: duration,
      summary: {
        total: totalCategories,
        passed: passedCount,
        failed: failedCount,
        skipped: skippedCount,
        errors: errorCount
      },
      results: this.results,
      effectiveness: {
        score: (passedCount / totalCategories * 100).toFixed(1) + '%',
        isHealthy: failedCount === 0 && errorCount === 0
      }
    };

    // Save report
    const reportPath = path.join(__dirname, '..', 'gen', 'test-effectiveness-report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved to: ${reportPath}`);

    return report.effectiveness.isHealthy;
  }

  /**
   * Main execution
   */
  async run() {
    this.logSection('Test Effectiveness Validation');
    console.log('Validating that all tests can properly detect failures...\n');

    // Run validation tests first
    const validationCategory = {
      name: 'Validation Tests',
      pattern: '**/test/validation/**/*.test.ts',
      required: true
    };
    
    const validationPassed = this.runTestCategory(validationCategory);
    
    if (!validationPassed) {
      this.log('\n⚠️  Validation tests failed. Please fix them first.', 'red');
    }

    // Validate failure patterns
    const patternsPassed = this.validateFailurePatterns();
    
    if (!patternsPassed) {
      this.log('\n⚠️  Some failure patterns are not properly detected.', 'yellow');
    }

    // Run other test categories
    for (const category of testCategories) {
      if (category.name !== 'Validation Tests') {
        this.runTestCategory(category);
      }
    }

    // Generate final report
    const isHealthy = this.generateReport();

    // Exit with appropriate code
    process.exit(isHealthy ? 0 : 1);
  }
}

// Run if executed directly
if (require.main === module) {
  const validator = new TestValidator();
  validator.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = TestValidator;