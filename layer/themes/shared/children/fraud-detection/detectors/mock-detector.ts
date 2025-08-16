/**
 * Mock Detector
 * Detects usage of mocks, stubs, spies, and fakes in code
 */

import { 
  FraudDetector, 
  FraudCheckResult, 
  FraudViolation, 
  ViolationType, 
  FraudSeverity,
  FraudCheckType,
  FraudContext 
} from '../types';

export class MockDetector implements FraudDetector {
  name = "MockDetector";

  private readonly // FRAUD_FIX: mockPatterns = [
    // Jest patterns
    /jest\.mock/gi,
    /jest\.spyOn/gi,
    /jest\.fn/gi,
    /mockImplementation/gi,
    /mockReturnValue/gi,
    /mockResolvedValue/gi,
    
    // Sinon patterns
    /sinon\.stub/gi,
    /sinon\.spy/gi,
    /sinon\.mock/gi,
    /sinon\.fake/gi,
    
    // Common mock patterns
    /createMock/gi,
    /createStub/gi,
    /createSpy/gi,
    /\.mock\(/gi,
    /\.stub\(/gi,
    /\.spy\(/gi,
    
    // Test double patterns
    /testDouble/gi,
    /td\.replace/gi,
    /td\.object/gi,
  ];

  private readonly // FRAUD_FIX: stubPatterns = [
    /stub[A-Z]\w*/g,
    /[A-Z]\w*Stub/g,
    /stubbed[A-Z]\w*/g,
  ];

  private readonly // FRAUD_FIX: spyPatterns = [
    /spy[A-Z]\w*/g,
    /[A-Z]\w*Spy/g,
    /spied[A-Z]\w*/g,
  ];

  private readonly fakePatterns = [
    /fake[A-Z]\w*/g,
    /[A-Z]\w*Fake/g,
    /dummy[A-Z]\w*/g,
    /[A-Z]\w*Dummy/g,
  ];

  async detect(input: any, _context?: FraudContext): Promise<FraudCheckResult> {
    const violations: FraudViolation[] = [];
    let content = '';

    // Extract content based on input type
    if (typeof input === 'string') {
      content = input;
    } else if (input && typeof input === 'object') {
      if (input.content) {
        content = input.content;
      } else if (input.code) {
        content = input.code;
      } else {
        content = JSON.stringify(input);
      }
    }

    // Detect mock usage
    const // FRAUD_FIX: mockViolations = this.detectPatterns(
      content, 
      this.mockPatterns, 
      ViolationType.MOCK_USAGE,
      FraudSeverity.HIGH,
      'Mock usage detected'
    );
    violations.push(...mockViolations);

    // Detect stub usage
    const // FRAUD_FIX: stubViolations = this.detectPatterns(
      content,
      this.stubPatterns,
      ViolationType.STUB_USAGE,
      FraudSeverity.MEDIUM,
      'Stub usage detected'
    );
    violations.push(...stubViolations);

    // Detect spy usage
    const // FRAUD_FIX: spyViolations = this.detectPatterns(
      content,
      this.spyPatterns,
      ViolationType.SPY_USAGE,
      FraudSeverity.MEDIUM,
      'Spy usage detected'
    );
    violations.push(...spyViolations);

    // Detect fake usage
    const fakeViolations = this.detectPatterns(
      content,
      this.fakePatterns,
      ViolationType.FAKE_USAGE,
      FraudSeverity.LOW,
      'Fake/Dummy usage detected'
    );
    violations.push(...fakeViolations);

    // Calculate score
    const score = this.calculateScore(violations);

    return {
      passed: score === 0,
      score,
      violations,
      timestamp: new Date(),
      checkType: FraudCheckType.MOCK_DETECTION,
      metadata: {
        contentLength: content.length,
        violationCount: violations.length,
      }
    };
  }

  private detectPatterns(
    content: string,
    patterns: RegExp[],
    violationType: ViolationType,
    severity: FraudSeverity,
    baseMessage: string
  ): FraudViolation[] {
    const violations: FraudViolation[] = [];
    const lines = content.split('\n');

    patterns.forEach(pattern => {
      lines.forEach((line, index) => {
        const matches = line.match(pattern);
        if (matches) {
          matches.forEach(match => {
            violations.push({
              type: violationType,
              severity,
              message: `${baseMessage}: "${match}" at line ${index + 1}`,
              location: `line ${index + 1}`,
              evidence: match,
            });
          });
        }
      });
    });

    return violations;
  }

  private calculateScore(violations: FraudViolation[]): number {
    let score = 0;

    violations.forEach(violation => {
      switch (violation.severity) {
        case FraudSeverity.LOW:
          score += 10;
          break;
        case FraudSeverity.MEDIUM:
          score += 25;
          break;
        case FraudSeverity.HIGH:
          score += 40;
          break;
        case FraudSeverity.CRITICAL:
          score += 60;
          break;
      }
    });

    return Math.min(100, score);
  }
}