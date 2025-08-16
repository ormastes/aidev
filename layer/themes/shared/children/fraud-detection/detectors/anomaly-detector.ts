/**
 * Anomaly Detector
 * Detects unusual patterns and statistical anomalies in data
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

export class AnomalyDetector implements FraudDetector {
  name = "AnomalyDetector";

  private historicalData: Map<string, number[]> = new Map();
  private readonly maxHistorySize = 100;

  async detect(input: any, context?: FraudContext): Promise<FraudCheckResult> {
    const violations: FraudViolation[] = [];
    
    // Detect various types of anomalies
    if (typeof input === 'object' && input !== null) {
      violations.push(...this.detectStructuralAnomalies(input));
      violations.push(...this.detectValueAnomalies(input));
      violations.push(...this.detectPatternAnomalies(input));
      
      if (context?.userId) {
        violations.push(...this.detectBehavioralAnomalies(input, context.userId));
      }
    }

    const score = this.calculateScore(violations);

    return {
      passed: violations.length === 0,
      score,
      violations,
      timestamp: new Date(),
      checkType: FraudCheckType.ANOMALY_DETECTION,
      metadata: {
        anomalyTypes: violations.map(v => v.type),
      }
    };
  }

  private detectStructuralAnomalies(obj: any): FraudViolation[] {
    const violations: FraudViolation[] = [];
    const depth = this.getObjectDepth(obj);
    const size = this.getObjectSize(obj);

    // Check for unusually deep nesting
    if (depth > 10) {
      violations.push({
        type: ViolationType.UNUSUAL_BEHAVIOR,
        severity: FraudSeverity.MEDIUM,
        message: `Unusually deep object nesting detected: ${depth} levels`,
        evidence: { depth }
      });
    }

    // Check for unusually large objects
    if (size > 1000) {
      violations.push({
        type: ViolationType.UNUSUAL_BEHAVIOR,
        severity: FraudSeverity.MEDIUM,
        message: `Unusually large object detected: ${size} properties`,
        evidence: { size }
      });
    }

    // Check for circular references
    if (this.hasCircularReference(obj)) {
      violations.push({
        type: ViolationType.PATTERN_DEVIATION,
        severity: FraudSeverity.HIGH,
        message: 'Circular reference detected in object structure',
      });
    }

    return violations;
  }

  private detectValueAnomalies(obj: any): FraudViolation[] {
    const violations: FraudViolation[] = [];
    const values = this.extractNumericValues(obj);

    if (values.length > 0) {
      const stats = this.calculateStatistics(values);
      
      // Check for extreme outliers
      values.forEach(value => {
        const zScore = Math.abs((value - stats.mean) / stats.stdDev);
        if (zScore > 3) {
          violations.push({
            type: ViolationType.STATISTICAL_ANOMALY,
            severity: FraudSeverity.MEDIUM,
            message: `Statistical outlier detected: value ${value} with z-score ${zScore.toFixed(2)}`,
            evidence: { value, zScore, mean: stats.mean, stdDev: stats.stdDev }
          });
        }
      });

      // Check for suspicious patterns in numeric sequences
      if (this.hasRepeatingPattern(values)) {
        violations.push({
          type: ViolationType.PATTERN_DEVIATION,
          severity: FraudSeverity.LOW,
          message: 'Repeating pattern detected in numeric values',
          evidence: { sample: values.slice(0, 10) }
        });
      }
    }

    return violations;
  }

  private detectPatternAnomalies(obj: any): FraudViolation[] {
    const violations: FraudViolation[] = [];
    const jsonStr = JSON.stringify(obj);

    // Check for suspicious patterns
    const suspiciousPatterns = [
      { pattern: /(.)\1{10,}/g, name: 'Repeated characters' },
      { pattern: /[0-9a-f]{32,}/gi, name: 'Long hex strings' },
      { pattern: /data:.*;base64,/gi, name: 'Embedded base64 data' },
    ];

    suspiciousPatterns.forEach(({ pattern, name }) => {
      const matches = jsonStr.match(pattern);
      if (matches) {
        violations.push({
          type: ViolationType.SUSPICIOUS_PATTERN,
          severity: FraudSeverity.LOW,
          message: `${name} detected`,
          evidence: matches[0].substring(0, 50)
        });
      }
    });

    return violations;
  }

  private detectBehavioralAnomalies(input: any, userId: string): FraudViolation[] {
    const violations: FraudViolation[] = [];
    const key = `user_${userId}_request_size`;
    
    // Track request sizes for the user
    const requestSize = JSON.stringify(input).length;
    const history = this.historicalData.get(key) || [];
    
    if (history.length >= 10) {
      const stats = this.calculateStatistics(history);
      const zScore = Math.abs((requestSize - stats.mean) / stats.stdDev);
      
      if (zScore > 2.5) {
        violations.push({
          type: ViolationType.UNUSUAL_BEHAVIOR,
          severity: FraudSeverity.MEDIUM,
          message: `Unusual request size for user: ${requestSize} bytes (typical: ${stats.mean.toFixed(0)} ± ${stats.stdDev.toFixed(0)})`,
          evidence: { requestSize, historicalMean: stats.mean, zScore }
        });
      }
    }
    
    // Update history
    history.push(requestSize);
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
    this.historicalData.set(key, history);

    return violations;
  }

  private getObjectDepth(obj: any, currentDepth = 0): number {
    if (typeof obj !== 'object' || obj === null) {
      return currentDepth;
    }

    let maxDepth = currentDepth;
    const visited = new WeakSet();

    const traverse = (o: any, depth: number) => {
      if (visited.has(o)) return;
      visited.add(o);

      for (const key in o) {
        if (o.hasOwnProperty(key) && typeof o[key] === 'object' && o[key] !== null) {
          maxDepth = Math.max(maxDepth, depth + 1);
          traverse(o[key], depth + 1);
        }
      }
    };

    traverse(obj, currentDepth);
    return maxDepth;
  }

  private getObjectSize(obj: any): number {
    let count = 0;
    const visited = new WeakSet();

    const countProperties = (o: any) => {
      if (visited.has(o)) return;
      visited.add(o);

      for (const key in o) {
        if (o.hasOwnProperty(key)) {
          count++;
          if (typeof o[key] === 'object' && o[key] !== null) {
            countProperties(o[key]);
          }
        }
      }
    };

    countProperties(obj);
    return count;
  }

  private hasCircularReference(obj: any): boolean {
    const visited = new WeakSet();

    const detect = (o: any): boolean => {
      if (typeof o !== 'object' || o === null) return false;
      if (visited.has(o)) return true;
      
      visited.add(o);

      for (const key in o) {
        if (o.hasOwnProperty(key) && detect(o[key])) {
          return true;
        }
      }

      return false;
    };

    return detect(obj);
  }

  private extractNumericValues(obj: any): number[] {
    const values: number[] = [];

    const extract = (o: any) => {
      if (typeof o === 'number' && isFinite(o)) {
        values.push(o);
      } else if (Array.isArray(o)) {
        o.forEach(extract);
      } else if (typeof o === 'object' && o !== null) {
        Object.values(o).forEach(extract);
      }
    };

    extract(obj);
    return values;
  }

  private calculateStatistics(values: number[]): { mean: number; stdDev: number } {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return { mean, stdDev: stdDev || 1 }; // Avoid division by zero
  }

  private hasRepeatingPattern(values: number[]): boolean {
    if (values.length < 4) return false;

    // Check for simple repeating patterns
    for (let patternLength = 2; patternLength <= values.length / 2; patternLength++) {
      let isRepeating = true;
      
      for (let i = patternLength; i < values.length; i++) {
        if (values[i] !== values[i % patternLength]) {
          isRepeating = false;
          break;
        }
      }
      
      if (isRepeating) return true;
    }

    return false;
  }

  private calculateScore(violations: FraudViolation[]): number {
    let score = 0;

    violations.forEach(violation => {
      switch (violation.severity) {
        case FraudSeverity.LOW:
          score += 20;
          break;
        case FraudSeverity.MEDIUM:
          score += 40;
          break;
        case FraudSeverity.HIGH:
          score += 60;
          break;
        case FraudSeverity.CRITICAL:
          score += 90;
          break;
      }
    });

    return Math.min(100, score);
  }
}