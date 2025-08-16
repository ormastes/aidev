/**
 * Input Validator
 * Validates input data for suspicious patterns and format violations
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

export class InputValidator implements FraudDetector {
  name = 'InputValidator';

  private readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private readonly phoneRegex = /^[\d\s\-\+\(\)]+$/;
  private readonly urlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
  
  private readonly suspiciousFileExtensions = [
    '.exe', '.dll', '.bat', '.cmd', '.scr', '.vbs', '.js', '.jar',
    '.com', '.pif', '.msi', '.reg', '.ps1', '.sh', '.app'
  ];

  private readonly maxStringLength = 10000;
  private readonly maxArrayLength = 1000;
  private readonly maxObjectDepth = 20;

  async detect(input: any, context?: FraudContext): Promise<FraudCheckResult> {
    const violations: FraudViolation[] = [];
    
    // Validate based on input type
    if (typeof input === 'string') {
      violations.push(...this.validateString(input));
    } else if (Array.isArray(input)) {
      violations.push(...this.validateArray(input));
    } else if (typeof input === 'object' && input !== null) {
      violations.push(...this.validateObject(input));
    }

    // Check for rate limiting if context provided
    if (context?.userId) {
      violations.push(...this.checkRateLimit(context));
    }

    const score = this.calculateScore(violations);

    return {
      passed: violations.length === 0,
      score,
      violations,
      timestamp: new Date(),
      checkType: FraudCheckType.INPUT_VALIDATION,
      metadata: {
        inputType: Array.isArray(input) ? 'array' : typeof input,
        validationChecks: this.getPerformedChecks(input)
      }
    };
  }

  private validateString(str: string): FraudViolation[] {
    const violations: FraudViolation[] = [];

    // Check string length
    if (str.length > this.maxStringLength) {
      violations.push({
        type: ViolationType.INVALID_FORMAT,
        severity: FraudSeverity.MEDIUM,
        message: `String exceeds maximum length: ${str.length} > ${this.maxStringLength}`,
        evidence: { length: str.length }
      });
    }

    // Check for null bytes
    if (str.includes('\0')) {
      violations.push({
        type: ViolationType.SUSPICIOUS_PATTERN,
        severity: FraudSeverity.HIGH,
        message: 'Null byte detected in string',
      });
    }

    // Check for suspicious file paths
    this.suspiciousFileExtensions.forEach(ext => {
      if (str.toLowerCase().includes(ext)) {
        violations.push({
          type: ViolationType.SUSPICIOUS_PATTERN,
          severity: FraudSeverity.MEDIUM,
          message: `Suspicious file extension detected: ${ext}`,
          evidence: ext
        });
      }
    });

    // Validate specific formats if they look like structured data
    if (str.includes('@') && !this.emailRegex.test(str.trim())) {
      // Only flag if it looks like an email attempt but is malformed
      if (str.match(/^[^\s]+@[^\s]+$/)) {
        violations.push({
          type: ViolationType.INVALID_FORMAT,
          severity: FraudSeverity.LOW,
          message: 'Invalid email format detected',
          evidence: str.substring(0, 50)
        });
      }
    }

    // Check for encoded payloads
    if (this.hasEncodedPayload(str)) {
      violations.push({
        type: ViolationType.SUSPICIOUS_PATTERN,
        severity: FraudSeverity.MEDIUM,
        message: 'Encoded payload detected',
      });
    }

    return violations;
  }

  private validateArray(arr: any[]): FraudViolation[] {
    const violations: FraudViolation[] = [];

    // Check array size
    if (arr.length > this.maxArrayLength) {
      violations.push({
        type: ViolationType.INVALID_FORMAT,
        severity: FraudSeverity.MEDIUM,
        message: `Array exceeds maximum length: ${arr.length} > ${this.maxArrayLength}`,
        evidence: { length: arr.length }
      });
    }

    // Check for suspicious patterns in array elements
    const allSameType = arr.every(item => typeof item === typeof arr[0]);
    if (!allSameType && arr.length > 10) {
      violations.push({
        type: ViolationType.SUSPICIOUS_PATTERN,
        severity: FraudSeverity.LOW,
        message: 'Array contains mixed types',
      });
    }

    // Recursively validate array elements
    arr.forEach((item, index) => {
      if (index < 100) { // Limit deep validation to first 100 items
        const itemViolations = this.validateValue(item);
        violations.push(...itemViolations);
      }
    });

    return violations;
  }

  private validateObject(obj: any): FraudViolation[] {
    const violations: FraudViolation[] = [];
    const depth = this.getObjectDepth(obj);

    // Check object depth
    if (depth > this.maxObjectDepth) {
      violations.push({
        type: ViolationType.INVALID_FORMAT,
        severity: FraudSeverity.MEDIUM,
        message: `Object depth exceeds maximum: ${depth} > ${this.maxObjectDepth}`,
        evidence: { depth }
      });
    }

    // Check for prototype pollution attempts
    if ('__proto__' in obj || 'constructor' in obj || 'prototype' in obj) {
      violations.push({
        type: ViolationType.SUSPICIOUS_PATTERN,
        severity: FraudSeverity.HIGH,
        message: 'Potential prototype pollution attempt',
        evidence: Object.keys(obj).filter(k => k.includes('proto') || k === 'constructor')
      });
    }

    // Validate nested values
    const visited = new WeakSet();
    const validateNested = (o: any, currentDepth: number) => {
      if (visited.has(o) || currentDepth > 5) return;
      visited.add(o);

      Object.values(o).forEach(value => {
        if (value && typeof value === 'object') {
          validateNested(value, currentDepth + 1);
        } else {
          const valueViolations = this.validateValue(value);
          violations.push(...valueViolations);
        }
      });
    };

    validateNested(obj, 0);
    return violations;
  }

  private validateValue(value: any): FraudViolation[] {
    if (typeof value === 'string') {
      return this.validateString(value);
    } else if (Array.isArray(value)) {
      return this.validateArray(value);
    } else if (value && typeof value === 'object') {
      return this.validateObject(value);
    }
    return [];
  }

  private checkRateLimit(context: FraudContext): FraudViolation[] {
    // This is a placeholder - in real implementation, this would check against
    // a rate limiting service or database
    const violations: FraudViolation[] = [];
    
    // Simulate rate limit check
    if (context.additionalData?.requestCount && context.additionalData.requestCount > 100) {
      violations.push({
        type: ViolationType.RATE_LIMIT_EXCEEDED,
        severity: FraudSeverity.HIGH,
        message: `Rate limit exceeded for user ${context.userId}`,
        evidence: { requestCount: context.additionalData.requestCount }
      });
    }

    return violations;
  }

  private hasEncodedPayload(str: string): boolean {
    // Check for base64 encoded strings that might contain payloads
    const base64Pattern = /^[A-Za-z0-9+/]{20,}={0,2}$/;
    const segments = str.split(/\s+/);
    
    return segments.some(segment => {
      if (base64Pattern.test(segment) && segment.length > 100) {
        try {
          const decoded = Buffer.from(segment, 'base64').toString();
          // Check if decoded contains suspicious patterns
          return decoded.includes('<script') || 
                 decoded.includes('eval(') ||
                 decoded.includes('exec(');
        } catch {
          return false;
        }
      }
      return false;
    });
  }

  private getObjectDepth(obj: any): number {
    let maxDepth = 0;
    const visited = new WeakSet();

    const calculateDepth = (o: any, currentDepth: number) => {
      if (!o || typeof o !== 'object' || visited.has(o)) {
        return currentDepth;
      }
      
      visited.add(o);
      maxDepth = Math.max(maxDepth, currentDepth);

      Object.values(o).forEach(value => {
        if (value && typeof value === 'object') {
          calculateDepth(value, currentDepth + 1);
        }
      });
    };

    calculateDepth(obj, 1);
    return maxDepth;
  }

  private getPerformedChecks(input: any): string[] {
    const checks: string[] = [];
    
    if (typeof input === 'string') {
      checks.push('string_length', 'null_bytes', 'file_extensions', 'encoded_payloads');
    } else if (Array.isArray(input)) {
      checks.push('array_length', 'type_consistency', 'element_validation');
    } else if (typeof input === 'object' && input !== null) {
      checks.push('object_depth', 'prototype_pollution', 'nested_validation');
    }
    
    return checks;
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
          score += 45;
          break;
        case FraudSeverity.CRITICAL:
          score += 70;
          break;
      }
    });

    return Math.min(100, score);
  }
}