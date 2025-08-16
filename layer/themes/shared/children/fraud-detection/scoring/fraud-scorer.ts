/**
 * Fraud Scorer
 * Aggregates and scores fraud detection results from multiple detectors
 */

import {
  FraudCheckResult,
  FraudViolation,
  FraudSeverity,
  FraudCheckType,
  FraudDetector,
  FraudContext,
  FraudConfig
} from '../types';

export interface FraudScoreResult {
  overallScore: number; // 0-100
  detectorScores: Map<string, number>;
  aggregatedViolations: FraudViolation[];
  passed: boolean;
  riskLevel: RiskLevel;
  recommendations: string[];
  timestamp: Date;
}

export enum RiskLevel {
  NONE = 'none',      // Score: 0-10
  LOW = 'low',        // Score: 11-30
  MEDIUM = 'medium',  // Score: 31-60
  HIGH = 'high',      // Score: 61-85
  CRITICAL = 'critical' // Score: 86-100
}

export class FraudScorer {
  private detectors: Map<string, FraudDetector> = new Map();
  private config: FraudConfig;

  constructor(config: FraudConfig) {
    this.config = config;
  }

  /**
   * Register a fraud detector
   */
  registerDetector(detector: FraudDetector): void {
    this.detectors.set(detector.name, detector);
  }

  /**
   * Run all registered detectors and aggregate results
   */
  async score(input: any, context?: FraudContext): Promise<FraudScoreResult> {
    const detectorScores = new Map<string, number>();
    const allViolations: FraudViolation[] = [];
    const results: FraudCheckResult[] = [];

    // Run enabled detectors
    for (const [name, detector] of this.detectors) {
      if (this.isDetectorEnabled(detector)) {
        try {
          const result = await detector.detect(input, context);
          results.push(result);
          detectorScores.set(name, result.score);
          allViolations.push(...result.violations);
        } catch (error) {
          // Log error but continue with other detectors
          if (this.config.logging) {
            console.error(`Fraud detector ${name} failed:`, error);
          }
          detectorScores.set(name, 0);
        }
      }
    }

    // Calculate overall score
    const overallScore = this.calculateOverallScore(results, detectorScores);
    
    // Determine risk level
    const riskLevel = this.determineRiskLevel(overallScore);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(allViolations, riskLevel);
    
    // Determine if check passed
    const passed = this.config.strictMode ? 
      allViolations.length === 0 : 
      overallScore < this.config.scoreThreshold;

    return {
      overallScore,
      detectorScores,
      aggregatedViolations: this.aggregateViolations(allViolations),
      passed,
      riskLevel,
      recommendations,
      timestamp: new Date()
    };
  }

  /**
   * Calculate weighted overall score
   */
  private calculateOverallScore(
    results: FraudCheckResult[], 
    detectorScores: Map<string, number>
  ): number {
    if (results.length === 0) return 0;

    // Weight scores based on check type importance
    const weights: Record<FraudCheckType, number> = {
      [FraudCheckType.SECURITY_VALIDATION]: 1.5,
      [FraudCheckType.COMMAND_INJECTION]: 1.5,
      [FraudCheckType.MOCK_DETECTION]: 1.2,
      [FraudCheckType.ANOMALY_DETECTION]: 1.0,
      [FraudCheckType.INPUT_VALIDATION]: 0.8,
      [FraudCheckType.PATTERN_MATCHING]: 0.7,
      [FraudCheckType.BEHAVIORAL_ANALYSIS]: 0.9,
    };

    let weightedSum = 0;
    let totalWeight = 0;

    results.forEach(result => {
      const weight = weights[result.checkType] || 1.0;
      weightedSum += result.score * weight;
      totalWeight += weight;
    });

    // Apply severity multiplier for critical violations
    const criticalViolations = results.flatMap(r => r.violations)
      .filter(v => v.severity === FraudSeverity.CRITICAL);
    
    let score = totalWeight > 0 ? weightedSum / totalWeight : 0;
    
    // Boost score if critical violations exist
    if (criticalViolations.length > 0) {
      score = Math.min(100, score * 1.5);
    }

    return Math.round(score);
  }

  /**
   * Aggregate similar violations
   */
  private aggregateViolations(violations: FraudViolation[]): FraudViolation[] {
    const aggregated = new Map<string, FraudViolation>();

    violations.forEach(violation => {
      const key = `${violation.type}_${violation.severity}`;
      const existing = aggregated.get(key);

      if (existing) {
        // Merge similar violations
        existing.message = `${existing.message} (${this.getViolationCount(key, violations)} occurrences)`;
        if (violation.evidence && existing.evidence) {
          existing.evidence = Array.isArray(existing.evidence) ?
            [...existing.evidence, violation.evidence] :
            [existing.evidence, violation.evidence];
        }
      } else {
        aggregated.set(key, { ...violation });
      }
    });

    return Array.from(aggregated.values());
  }

  /**
   * Count violations of a specific type
   */
  private getViolationCount(key: string, violations: FraudViolation[]): number {
    return violations.filter(v => `${v.type}_${v.severity}` === key).length;
  }

  /**
   * Determine risk level based on score
   */
  private determineRiskLevel(score: number): RiskLevel {
    if (score <= 10) return RiskLevel.NONE;
    if (score <= 30) return RiskLevel.LOW;
    if (score <= 60) return RiskLevel.MEDIUM;
    if (score <= 85) return RiskLevel.HIGH;
    return RiskLevel.CRITICAL;
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    violations: FraudViolation[], 
    riskLevel: RiskLevel
  ): string[] {
    const recommendations: string[] = [];

    // General recommendations based on risk level
    switch (riskLevel) {
      case RiskLevel.CRITICAL:
        recommendations.push('IMMEDIATE ACTION REQUIRED: Block this request/user');
        recommendations.push('Initiate security incident response procedure');
        recommendations.push('Review all recent activity from this source');
        break;
      case RiskLevel.HIGH:
        recommendations.push('Flag for manual review');
        recommendations.push('Implement additional verification steps');
        recommendations.push('Monitor future activity closely');
        break;
      case RiskLevel.MEDIUM:
        recommendations.push('Apply rate limiting');
        recommendations.push('Request additional authentication');
        break;
      case RiskLevel.LOW:
        recommendations.push('Log for audit trail');
        recommendations.push('Continue monitoring');
        break;
      case RiskLevel.NONE:
        recommendations.push('No action required');
        break;
    }

    // Specific recommendations based on violations
    const violationTypes = new Set(violations.map(v => v.type));
    
    if (violationTypes.has('sql_injection') || violationTypes.has('command_injection')) {
      recommendations.push('Sanitize all user inputs');
      recommendations.push('Use parameterized queries');
    }

    if (violationTypes.has('mock_usage')) {
      recommendations.push('Ensure production code does not contain test mocks');
      recommendations.push('Review deployment pipeline for mock removal');
    }

    if (violationTypes.has('rate_limit_exceeded')) {
      recommendations.push('Implement exponential backoff');
      recommendations.push('Consider temporary IP ban');
    }

    if (violationTypes.has('unusual_behavior')) {
      recommendations.push('Compare against historical baseline');
      recommendations.push('Check for account compromise');
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Check if a detector is enabled
   */
  private isDetectorEnabled(detector: FraudDetector): boolean {
    // Map detector names to check types
    const detectorTypeMap: Record<string, FraudCheckType> = {
      'MockDetector': FraudCheckType.MOCK_DETECTION,
      'SecurityDetector': FraudCheckType.SECURITY_VALIDATION,
      'InputValidator': FraudCheckType.INPUT_VALIDATION,
      'AnomalyDetector': FraudCheckType.ANOMALY_DETECTION,
    };

    const checkType = detectorTypeMap[detector.name];
    return checkType ? this.config.enabledDetectors.includes(checkType) : false;
  }

  /**
   * Get all registered detectors
   */
  getDetectors(): string[] {
    return Array.from(this.detectors.keys());
  }

  /**
   * Clear all registered detectors
   */
  clearDetectors(): void {
    this.detectors.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<FraudConfig>): void {
    this.config = { ...this.config, ...config };
  }
}