/**
 * Environment Validator - Part of Fraud Checker Theme
 * Validates that environment is properly setup by test-as-manual
 */

export interface EnvironmentValidation {
  isValid: boolean;
  testThemeActive: boolean;
  securityModuleActive: boolean;
  environmentSource: 'test-as-manual' | 'manual' | 'unknown';
  issues: string[];
}

export class EnvironmentValidator {
  /**
   * Validate that environment is properly configured by test-as-manual
   */
  validateEnvironment(): EnvironmentValidation {
    const validation: EnvironmentValidation = {
      isValid: true,
      testThemeActive: false,
      securityModuleActive: false,
      environmentSource: 'unknown',
      issues: []
    };

    // Check if test-as-manual theme is active
    if (process.env.TEST_THEME === 'infra_test-as-manual') {
      validation.testThemeActive = true;
      validation.environmentSource = 'test-as-manual';
    } else if (process.env.TEST_THEME) {
      validation.issues.push(`Wrong test theme: ${process.env.TEST_THEME}`);
      validation.isValid = false;
    } else {
      validation.issues.push('TEST_THEME not set - test-as-manual not initialized');
      validation.isValid = false;
    }

    // Check if security module is referenced
    if (process.env.SECURITY_MODULE === 'portal_security') {
      validation.securityModuleActive = true;
    } else {
      validation.issues.push('SECURITY_MODULE not properly configured');
      validation.isValid = false;
    }

    // Check test domain
    if (!process.env.TEST_DOMAIN) {
      validation.issues.push('TEST_DOMAIN not set by test-as-manual');
      validation.isValid = false;
    } else if (process.env.TEST_DOMAIN !== 'localhost') {
      validation.issues.push(`Unexpected TEST_DOMAIN: ${process.env.TEST_DOMAIN}`);
    }

    // Check for manual overrides (suspicious)
    if (process.env.MANUAL_PORT_OVERRIDE) {
      validation.issues.push('MANUAL_PORT_OVERRIDE detected - security bypassed!');
      validation.isValid = false;
      validation.environmentSource = 'manual';
    }

    return validation;
  }

  /**
   * Check if a specific test file will have proper environment
   */
  checkTestFileCompliance(filePath: string): boolean {
    const fs = require('fs');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Check if file imports test-as-manual BEFORE any test execution
    const lines = content.split('\n');
    let importsTestTheme = false;
    let firstTestLine = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for test-as-manual import
      if (line.includes('infra_test-as-manual/pipe')) {
        importsTestTheme = true;
      }

      // Check for first test
      if (line.includes('test(') || line.includes('describe(') || 
          line.includes('it(') || line.includes('test.')) {
        firstTestLine = i;
        break;
      }
    }

    // Test-as-manual must be imported before any tests
    return importsTestTheme && (firstTestLine === -1 || importsTestTheme);
  }

  /**
   * Generate environment report
   */
  generateEnvironmentReport(): string {
    const validation = this.validateEnvironment();
    
    let report = '# Environment Validation Report\n\n';
    
    if (validation.isValid) {
      report += '## ✅ Environment Properly Configured\n\n';
      report += '- Test Theme: Active (infra_test-as-manual)\n';
      report += '- Security Module: Active (portal_security)\n';
      report += `- Environment Source: ${validation.environmentSource}\n`;
      report += `- Test Domain: ${process.env.TEST_DOMAIN}\n`;
    } else {
      report += '## ❌ Environment Configuration Issues\n\n';
      report += '### Problems Detected:\n';
      for (const issue of validation.issues) {
        report += `- ${issue}\n`;
      }
      report += '\n### Required Actions:\n';
      report += '1. Ensure test files import from `infra_test-as-manual/pipe`\n';
      report += '2. Import must happen before any test code\n';
      report += '3. Do not manually set PORT or TEST_PORT environment variables\n';
    }

    return report;
  }
}

export const environmentValidator = new EnvironmentValidator();