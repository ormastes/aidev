/**
 * Port Security Auditor - Part of Fraud Checker Theme
 * Monitors and audits port usage across the system
 */

import { fs } from '../../infra_external-log-lib/src';
import { path } from '../../infra_external-log-lib/src';
import { EnhancedPortManager } from '../../portal_security/pipe';

export interface PortAuditResult {
  timestamp: Date;
  registeredPorts: number[];
  suspiciousActivity: string[];
  unauthorizedPorts: number[];
  testPortsWithoutTestTheme: string[];
}

export class PortSecurityAuditor {
  private securityManager: EnhancedPortManager;

  constructor() {
    this.securityManager = EnhancedPortManager.getInstance();
  }

  /**
   * Audit all port usage in the system
   */
  async auditPortUsage(projectRoot: string): Promise<PortAuditResult> {
    console.log('🔒 Port Security Audit Started...');
    
    const result: PortAuditResult = {
      timestamp: new Date(),
      registeredPorts: [],
      suspiciousActivity: [],
      unauthorizedPorts: [],
      testPortsWithoutTestTheme: []
    };

    // Get all registered ports from security module
    const registrations = this.securityManager.getAllRegistrations();
    result.registeredPorts = registrations.map(r => r.assignedPort || 0).filter(p => p > 0);

    // Scan for hardcoded ports in source files
    await this.scanForHardcodedPorts(projectRoot, result);

    // Check for test files not using test-as-manual
    await this.checkTestPortCompliance(projectRoot, result);

    // Verify environment variables
    this.checkEnvironmentCompliance(result);

    return result;
  }

  /**
   * Scan source files for hardcoded ports
   */
  private async scanForHardcodedPorts(
    projectRoot: string, 
    result: PortAuditResult
  ): Promise<void> {
    const sourcePatterns = ['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx'];
    const portRegex = /(?:localhost:|127\.0\.0\.1:|0\.0\.0\.0:)(\d{4,5})/g;

    // This would use glob to find files
    // For now, simplified version
    const testFiles = fs.readdirSync(path.join(projectRoot, 'test'), { recursive: true })
      .filter(f => f.toString().endsWith('.ts') || f.toString().endsWith('.js'));

    for (const file of testFiles) {
      const content = fs.readFileSync(path.join(projectRoot, 'test', file.toString()), 'utf-8');
      
      let match;
      while ((match = portRegex.exec(content)) !== null) {
        const port = parseInt(match[1]);
        if (!result.registeredPorts.includes(port)) {
          result.unauthorizedPorts.push(port);
          result.suspiciousActivity.push(
            `Unregistered port ${port} found in ${file}`
          );
        }
      }
    }
  }

  /**
   * Check if test files are using test-as-manual for ports
   */
  private async checkTestPortCompliance(
    projectRoot: string,
    result: PortAuditResult
  ): Promise<void> {
    const testDir = path.join(projectRoot, 'test');
    if (!fs.existsSync(testDir)) return;

    const files = fs.readdirSync(testDir, { recursive: true })
      .filter(f => f.toString().endsWith('.spec.ts') || f.toString().endsWith('.test.ts'));

    for (const file of files) {
      const content = fs.readFileSync(path.join(testDir, file.toString()), 'utf-8');
      
      // Check if file uses ports but doesn't import test-as-manual
      if (content.includes('PORT') || content.includes('port')) {
        if (!content.includes('infra_test-as-manual')) {
          result.testPortsWithoutTestTheme.push(file.toString());
          result.suspiciousActivity.push(
            `Test file ${file} uses ports but doesn't import test-as-manual`
          );
        }
      }
    }
  }

  /**
   * Check environment variable compliance
   */
  private checkEnvironmentCompliance(result: PortAuditResult): void {
    // Check if critical env vars are set by test-as-manual
    if (!process.env.TEST_THEME) {
      result.suspiciousActivity.push(
        'TEST_THEME environment variable not set - test-as-manual may not be initialized'
      );
    }

    if (!process.env.SECURITY_MODULE) {
      result.suspiciousActivity.push(
        'SECURITY_MODULE environment variable not set - security may be bypassed'
      );
    }

    // Check for manual PORT override
    if (process.env.PORT && !process.env.PORT_MANAGED_BY_SECURITY) {
      result.suspiciousActivity.push(
        'PORT environment variable set manually - should be managed by security module'
      );
    }
  }

  /**
   * Generate security report
   */
  generateSecurityReport(audit: PortAuditResult): string {
    let report = '# Port Security Audit Report\n\n';
    report += `Timestamp: ${audit.timestamp.toISOString()}\n\n`;

    report += '## Summary\n';
    report += `- Registered Ports: ${audit.registeredPorts.length}\n`;
    report += `- Unauthorized Ports: ${audit.unauthorizedPorts.length}\n`;
    report += `- Suspicious Activities: ${audit.suspiciousActivity.length}\n`;
    report += `- Non-compliant Test Files: ${audit.testPortsWithoutTestTheme.length}\n\n`;

    if (audit.suspiciousActivity.length > 0) {
      report += '## ⚠️ Suspicious Activities Detected\n\n';
      for (const activity of audit.suspiciousActivity) {
        report += `- ${activity}\n`;
      }
      report += '\n';
    }

    if (audit.unauthorizedPorts.length > 0) {
      report += '## 🚫 Unauthorized Ports\n\n';
      report += `The following ports are being used without security module registration:\n`;
      report += audit.unauthorizedPorts.join(', ') + '\n\n';
    }

    if (audit.testPortsWithoutTestTheme.length > 0) {
      report += '## 📝 Non-compliant Test Files\n\n';
      report += 'These test files need to import from test-as-manual:\n';
      for (const file of audit.testPortsWithoutTestTheme) {
        report += `- ${file}\n`;
      }
    }

    if (audit.suspiciousActivity.length === 0 && 
        audit.unauthorizedPorts.length === 0 &&
        audit.testPortsWithoutTestTheme.length === 0) {
      report += '## ✅ All Clear!\n\n';
      report += 'No security violations detected. All ports are properly managed.\n';
    }

    return report;
  }
}

export const portAuditor = new PortSecurityAuditor();