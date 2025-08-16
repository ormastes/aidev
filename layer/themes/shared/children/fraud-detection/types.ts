/**
 * Fraud Detection Types
 */

export interface FraudCheckResult {
  passed: boolean;
  score: number; // 0-100, where 0 is no fraud, 100 is definite fraud
  violations: FraudViolation[];
  timestamp: Date;
  checkType: FraudCheckType;
  metadata?: Record<string, any>;
}

export interface FraudViolation {
  type: ViolationType;
  severity: FraudSeverity;
  message: string;
  location?: string;
  evidence?: any;
}

export enum FraudCheckType {
  MOCK_DETECTION = 'mock_detection',
  SECURITY_VALIDATION = 'security_validation',
  INPUT_VALIDATION = 'input_validation',
  ANOMALY_DETECTION = 'anomaly_detection',
  PATTERN_MATCHING = 'pattern_matching',
  BEHAVIORAL_ANALYSIS = 'behavioral_analysis',
}

export enum ViolationType {
  // Mock-related
  MOCK_USAGE = 'mock_usage',
  STUB_USAGE = 'stub_usage',
  SPY_USAGE = 'spy_usage',
  FAKE_USAGE = 'fake_usage',
  
  // Security-related
  SQL_INJECTION = 'sql_injection',
  XSS_ATTEMPT = 'xss_attempt',
  PATH_TRAVERSAL = 'path_traversal',
  COMMAND_INJECTION = 'command_injection',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  
  // Input validation
  INVALID_FORMAT = 'invalid_format',
  SUSPICIOUS_PATTERN = 'suspicious_pattern',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  
  // Anomaly detection
  UNUSUAL_BEHAVIOR = 'unusual_behavior',
  STATISTICAL_ANOMALY = 'statistical_anomaly',
  PATTERN_DEVIATION = 'pattern_deviation',
}

export enum FraudSeverity {
  LOW = 'low',        // Score impact: 1-20
  MEDIUM = 'medium',  // Score impact: 21-50
  HIGH = 'high',      // Score impact: 51-80
  CRITICAL = "critical", // Score impact: 81-100
}

export interface FraudDetector {
  name: string;
  detect(input: any, context?: FraudContext): Promise<FraudCheckResult>;
}

export interface FraudContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  timestamp?: Date;
  source?: string;
  additionalData?: Record<string, any>;
}

export interface FraudConfig {
  enabledDetectors: FraudCheckType[];
  scoreThreshold: number; // Score above which fraud is confirmed
  strictMode: boolean; // If true, any violation fails the check
  logging: boolean;
  customRules?: FraudRule[];
}

export interface FraudRule {
  id: string;
  name: string;
  pattern: RegExp | ((input: any) => boolean);
  severity: FraudSeverity;
  message: string;
}