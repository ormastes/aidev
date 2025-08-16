export interface TestMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  testDuration: number;
  averageTestTime: number;
}

export interface TestAnalysis {
  metrics: TestMetrics;
  quality: {
    hasEnoughTests: boolean;
    testCoverageRatio: number;
    skipRatio: number;
    failureRatio: number;
  };
  suspicious: {
    tooFastTests: number;
    identicalTests: number;
    noAssertionTests: number;
  };
}

/**
 * Analyzes test execution results and patterns
 */
export class TestAnalyzer {
  analyzeTestResults(testResults: any): TestAnalysis {
    const metrics = this.extractMetrics(testResults);
    const quality = this.assessQuality(metrics, testResults);
    const suspicious = this.findSuspiciousPatterns(testResults);

    return {
      metrics,
      quality,
      suspicious
    };
  }

  private extractMetrics(testResults: any): TestMetrics {
    const totalTests = testResults.totalTests || 0;
    const passedTests = testResults.passedTests || 0;
    const failedTests = testResults.failedTests || 0;
    const skippedTests = testResults.skippedTests || 
      (totalTests - passedTests - failedTests);
    
    const testDuration = testResults.duration || 0;
    const averageTestTime = totalTests > 0 ? testDuration / totalTests : 0;

    return {
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      testDuration,
      averageTestTime
    };
  }

  private assessQuality(metrics: TestMetrics, testResults: any): TestAnalysis['quality'] {
    const { totalTests, skippedTests, failedTests } = metrics;
    
    // Check if there are enough tests relative to code size
    const codeSize = testResults.codeSize || 1000; // Default to 1000 LOC if not provided
    const testCoverageRatio = totalTests / (codeSize / 100); // Tests per 100 LOC
    
    const hasEnoughTests = testCoverageRatio >= 1; // At least 1 test per 100 LOC
    const skipRatio = totalTests > 0 ? skippedTests / totalTests : 0;
    const failureRatio = totalTests > 0 ? failedTests / totalTests : 0;

    return {
      hasEnoughTests,
      testCoverageRatio,
      skipRatio,
      failureRatio
    };
  }

  private findSuspiciousPatterns(testResults: any): TestAnalysis["suspicious"] {
    let tooFastTests = 0;
    let identicalTests = 0;
    let noAssertionTests = 0;

    const scenarios = testResults.scenarios || [];
    const testSignatures = new Map<string, number>();

    for (const scenario of scenarios) {
      // Check for suspiciously fast tests (< 1ms)
      if (scenario.duration !== undefined && scenario.duration < 1) {
        tooFastTests++;
      }

      // Create a signature for duplicate detection
      const signature = this.createTestSignature(scenario);
      const count = testSignatures.get(signature) || 0;
      testSignatures.set(signature, count + 1);

      // Check for no assertions (approximation based on test structure)
      if (this.looksLikeNoAssertionTest(scenario)) {
        noAssertionTests++;
      }
    }

    // Count identical tests
    for (const count of testSignatures.values()) {
      if (count > 1) {
        identicalTests += count - 1;
      }
    }

    return {
      tooFastTests,
      identicalTests,
      noAssertionTests
    };
  }

  private createTestSignature(scenario: any): string {
    // Create a simple signature based on test name and structure
    const name = scenario.name || '';
    const steps = (scenario.steps || []).map((s: any) => s.name).join(',');
    return `${name}:${steps}`;
  }

  private looksLikeNoAssertionTest(scenario: any): boolean {
    // Simple heuristic: very short duration and passed status might indicate no real work
    if (scenario.status === 'passed' && scenario.duration < 0.5) {
      return true;
    }

    // Check if test name suggests it's a placeholder
    const name = (scenario.name || '').toLowerCase();
    const placeholderPatterns = [
      'todo',
      'pending',
      'skip',
      "placeholder",
      'not implemented',
      'tbd'
    ];

    return placeholderPatterns.some(pattern => name.includes(pattern));
  }

  compareTestRuns(previous: TestAnalysis, current: TestAnalysis): {
    improved: boolean;
    changes: string[];
    warnings: string[];
  } {
    const changes: string[] = [];
    const warnings: string[] = [];

    // Compare test counts
    const testDiff = current.metrics.totalTests - previous.metrics.totalTests;
    if (testDiff > 0) {
      changes.push(`Added ${testDiff} new tests`);
    } else if (testDiff < 0) {
      warnings.push(`Removed ${Math.abs(testDiff)} tests`);
    }

    // Compare skip ratio
    if (current.quality.skipRatio > previous.quality.skipRatio) {
      warnings.push('Skip ratio increased');
    }

    // Compare suspicious patterns
    if (current.suspicious.tooFastTests > previous.suspicious.tooFastTests) {
      warnings.push('More suspiciously fast tests detected');
    }

    if (current.suspicious.identicalTests > previous.suspicious.identicalTests) {
      warnings.push('More duplicate tests detected');
    }

    const improved = warnings.length === 0 && testDiff >= 0;

    return {
      improved,
      changes,
      warnings
    };
  }
}