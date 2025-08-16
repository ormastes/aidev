/**
 * Security Detector
 * Detects potential security vulnerabilities and malicious patterns
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

export class SecurityDetector implements FraudDetector {
  name = "SecurityDetector";

  private readonly sqlInjectionPatterns = [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b.*\b(from|where|table|database)\b)/gi,
    /('|")\s*;\s*(drop|delete|update|insert)/gi,
    /\b(or|and)\b\s+\d+\s*=\s*\d+/gi,
    /('\s*or\s*'1'\s*=\s*'1)/gi,
    /(--|\#|\/\*)/g, // SQL comments
  ];

  private readonly xssPatterns = [
    /<script[^>]*>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=\s*["'][^"']*["']/gi, // Event handlers
    /<iframe[^>]*>/gi,
    /<object[^>]*>/gi,
    /<embed[^>]*>/gi,
    /document\.(cookie|write|location)/gi,
    /window\.(location|open)/gi,
  ];

  private readonly pathTraversalPatterns = [
    /\.\.[\/\\]/g,
    /\.\.%2[fF]/g,
    /\.\.%5[cC]/g,
    /%2e%2e[\/\\]/gi,
    /\/etc\/(passwd|shadow|hosts)/gi,
    /[cC]:\\[wW]indows\\[sS]ystem32/g,
  ];

  private readonly commandInjectionPatterns = [
    /(\||;|`|>|<|&|\$\(|\$\{)/g,
    /\b(cat|ls|rm|cp|mv|chmod|chown|kill|ps|grep|find|wget|curl)\b/g,
    /\b(cmd|powershell|bash|sh|zsh)\b.*\b(\/c|\/k|-c|-Command)\b/gi,
  ];

  private readonly sensitiveDataPatterns = [
    /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12})\b/, // Credit cards
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Emails
    /\b(?:password|passwd|pwd|secret|token|api[_-]?key|private[_-]?key)\s*[:=]\s*["']?[^\s"']+/gi,
    /-----BEGIN\s+(RSA|DSA|EC|OPENSSH|PGP)\s+PRIVATE\s+KEY-----/gi,
  ];

  async detect(input: any, _context?: FraudContext): Promise<FraudCheckResult> {
    const violations: FraudViolation[] = [];
    let content = '';

    // Extract content
    if (typeof input === 'string') {
      content = input;
    } else if (input && typeof input === 'object') {
      content = JSON.stringify(input);
    }

    // Check for SQL injection
    violations.push(...this.checkPatterns(
      content,
      this.sqlInjectionPatterns,
      ViolationType.SQL_INJECTION,
      FraudSeverity.CRITICAL,
      'Potential SQL injection detected'
    ));

    // Check for XSS
    violations.push(...this.checkPatterns(
      content,
      this.xssPatterns,
      ViolationType.XSS_ATTEMPT,
      FraudSeverity.HIGH,
      'Potential XSS attack detected'
    ));

    // Check for path traversal
    violations.push(...this.checkPatterns(
      content,
      this.pathTraversalPatterns,
      ViolationType.PATH_TRAVERSAL,
      FraudSeverity.HIGH,
      'Path traversal attempt detected'
    ));

    // Check for command injection
    violations.push(...this.checkPatterns(
      content,
      this.commandInjectionPatterns,
      ViolationType.COMMAND_INJECTION,
      FraudSeverity.CRITICAL,
      'Potential command injection detected'
    ));

    // Check for sensitive data exposure
    const sensitiveViolations = this.checkPatterns(
      content,
      this.sensitiveDataPatterns,
      ViolationType.UNAUTHORIZED_ACCESS,
      FraudSeverity.HIGH,
      'Sensitive data exposure detected'
    );
    
    // Filter out false positives for emails in test data
    const filteredSensitive = sensitiveViolations.filter(v => {
      if (v.evidence && v.evidence.includes('@')) {
        return !v.evidence.includes('example.com') && !v.evidence.includes('test.com');
      }
      return true;
    });
    
    violations.push(...filteredSensitive);

    const score = this.calculateScore(violations);

    return {
      passed: violations.length === 0,
      score,
      violations,
      timestamp: new Date(),
      checkType: FraudCheckType.SECURITY_VALIDATION,
      metadata: {
        checksPerformed: [
          'sql_injection',
          'xss',
          'path_traversal',
          'command_injection',
          'sensitive_data'
        ],
      }
    };
  }

  private checkPatterns(
    content: string,
    patterns: RegExp[],
    violationType: ViolationType,
    severity: FraudSeverity,
    message: string
  ): FraudViolation[] {
    const violations: FraudViolation[] = [];

    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          violations.push({
            type: violationType,
            severity,
            message: `${message}: "${match.substring(0, 50)}${match.length > 50 ? '...' : ''}"`,
            evidence: match,
          });
        });
      }
    });

    return violations;
  }

  private calculateScore(violations: FraudViolation[]): number {
    let score = 0;

    violations.forEach(violation => {
      switch (violation.severity) {
        case FraudSeverity.LOW:
          score += 15;
          break;
        case FraudSeverity.MEDIUM:
          score += 30;
          break;
        case FraudSeverity.HIGH:
          score += 50;
          break;
        case FraudSeverity.CRITICAL:
          score += 80;
          break;
      }
    });

    return Math.min(100, score);
  }
}