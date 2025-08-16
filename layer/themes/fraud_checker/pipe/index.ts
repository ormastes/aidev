/**
 * Fraud Checker Theme - Pipe Gateway
 * This theme audits test compliance but is NOT imported by tests
 * It ensures all tests properly use test-as-manual theme
 */

export { 
  TestComplianceChecker,
  fraudChecker,
  ComplianceViolation,
  ComplianceReport
} from '../children/TestComplianceChecker';

// Additional fraud detection utilities
export { PortSecurityAuditor } from '../children/PortSecurityAuditor';
export { EnvironmentValidator } from '../children/EnvironmentValidator';