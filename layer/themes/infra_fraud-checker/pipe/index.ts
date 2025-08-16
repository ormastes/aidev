/**
 * Fraud Checker Theme - Public API Gateway
 * 
 * This module exports the public interface for the fraud_checker theme,
 * providing test fraud detection capabilities with external dependency tracking.
 */

// Export existing children
export { FraudChecker, FraudCheckResult, FraudViolation } from '../children/FraudChecker';
export { FraudPatternDetector, FraudPattern } from '../children/FraudPatternDetector';
export { TestAnalyzer, TestAnalysis } from '../children/TestAnalyzer';
export { FraudReportGenerator } from '../children/FraudReportGenerator';

// Export new services
export { FraudAnalyzerService } from '../src/services/fraud-analyzer-service';
export { MockDetectionService } from '../src/services/mock-detection-service';
export { TestCoverageFraudDetector } from '../src/services/test-coverage-fraud-detector';
export { DependencyFraudDetector } from '../src/services/dependency-fraud-detector';
export { CodeSmellDetector } from '../src/services/code-smell-detector';
export { SecurityVulnerabilityDetector } from '../src/services/security-vulnerability-detector';
export { RuleSuggestionAnalyzer } from '../src/services/rule-suggestion-analyzer';
export { FraudReportGenerator as FraudReportGeneratorNew } from '../src/reporters/fraud-report-generator';

// Export external library detector
export { ExternalLibraryDetector } from '../children/ExternalLibraryDetector';
export type { ExternalLibraryViolation } from '../children/ExternalLibraryDetector';

// Export test compliance and security auditing
export { 
  TestComplianceChecker,
  fraudChecker,
  ComplianceViolation,
  ComplianceReport
} from '../children/TestComplianceChecker';
export { PortSecurityAuditor, PortAuditResult } from '../children/PortSecurityAuditor';
export { EnvironmentValidator, EnvironmentValidation } from '../children/EnvironmentValidator';

// Export unauthorized file detector
export { UnauthorizedFileDetector } from '../src/detectors/unauthorized-file-detector';
export type { UnauthorizedFileViolation, ValidationResult } from '../src/detectors/unauthorized-file-detector';

// Export file structure validator
export { FileStructureValidator } from '../src/validators/FileStructureValidator';
export type { ValidationReport, Violation } from '../src/validators/FileStructureValidator';

// Export file access fraud detector
export { FileAccessFraudDetector } from '../src/detectors/file-access-fraud-detector';
export type { 
  FileAccessFraud, 
  FileAccessFraudType, 
  FileAccessAnalysis 
} from '../src/detectors/file-access-fraud-detector';

// Export enhanced fraud detector
export { EnhancedFraudChecker } from '../src/detectors/enhanced-fraud-detector';
export type {
  EnhancedViolation,
  EnhancedFraudCheckResult,
  EnhancedFraudRule,
  FraudScore,
  ViolationContext
} from '../src/detectors/enhanced-fraud-detector';

// Export circular dependency detection
export { CircularDependencyDetector } from '../src/detectors/circular-dependency-detector';
export type { CircularDependencyFraudIssue } from '../src/detectors/circular-dependency-detector';

// Export comprehensive fraud analyzer
export { ComprehensiveFraudAnalyzer } from '../src/services/comprehensive-fraud-analyzer';
export type { ComprehensiveFraudReport } from '../src/services/comprehensive-fraud-analyzer';

// Re-export wrapper classes for convenience
import { FraudChecker } from '../children/FraudChecker';
import { FraudPatternDetector } from '../children/FraudPatternDetector';
import { TestAnalyzer } from '../children/TestAnalyzer';
import { FraudReportGenerator } from '../children/FraudReportGenerator';
import { UnauthorizedFileDetector } from '../src/detectors/unauthorized-file-detector';

/**
 * Factory functions for creating wrapper instances
 */
export const createFraudChecker = (): FraudChecker => {
  return new FraudChecker();
};

export const createFraudPatternDetector = (): FraudPatternDetector => {
  return new FraudPatternDetector();
};

export const createTestAnalyzer = (): TestAnalyzer => {
  return new TestAnalyzer();
};

export const createFraudReportGenerator = (basePath?: string): FraudReportGenerator => {
  return new FraudReportGenerator(basePath);
};

export const createUnauthorizedFileDetector = (rootPath?: string): UnauthorizedFileDetector => {
  return new UnauthorizedFileDetector(rootPath);
};

/**
 * Default export with all classes
 */
export default {
  FraudChecker,
  FraudPatternDetector,
  TestAnalyzer,
  FraudReportGenerator,
  UnauthorizedFileDetector,
  createFraudChecker,
  createFraudPatternDetector,
  createTestAnalyzer,
  createFraudReportGenerator,
  createUnauthorizedFileDetector
};