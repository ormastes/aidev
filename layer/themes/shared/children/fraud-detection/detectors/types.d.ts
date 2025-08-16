/**
 * Fraud Detection Types
 */
export interface FraudCheckResult {
    passed: boolean;
    score: number;
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
export declare enum FraudCheckType {
    MOCK_DETECTION = "mock_detection",
    SECURITY_VALIDATION = "security_validation",
    INPUT_VALIDATION = "input_validation",
    ANOMALY_DETECTION = "anomaly_detection",
    PATTERN_MATCHING = "pattern_matching",
    BEHAVIORAL_ANALYSIS = "behavioral_analysis"
}
export declare enum ViolationType {
    MOCK_USAGE = "mock_usage",
    STUB_USAGE = "stub_usage",
    SPY_USAGE = "spy_usage",
    FAKE_USAGE = "fake_usage",
    SQL_INJECTION = "sql_injection",
    XSS_ATTEMPT = "xss_attempt",
    PATH_TRAVERSAL = "path_traversal",
    COMMAND_INJECTION = "command_injection",
    UNAUTHORIZED_ACCESS = "unauthorized_access",
    INVALID_FORMAT = "invalid_format",
    SUSPICIOUS_PATTERN = "suspicious_pattern",
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded",
    UNUSUAL_BEHAVIOR = "unusual_behavior",
    STATISTICAL_ANOMALY = "statistical_anomaly",
    PATTERN_DEVIATION = "pattern_deviation"
}
export declare enum FraudSeverity {
    LOW = "low",// Score impact: 1-20
    MEDIUM = "medium",// Score impact: 21-50
    HIGH = "high",// Score impact: 51-80
    CRITICAL = "critical"
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
    scoreThreshold: number;
    strictMode: boolean;
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
