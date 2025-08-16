/**
 * File Access Fraud Detector
 * 
 * Detects fraudulent file access patterns by integrating with
 * external-log-lib's file access auditor
 */

import { BaseDetector } from './base-detector';
import { path } from '../../../infra_external-log-lib/src';

// Import from external-log-lib
import type { 
  FileAccessAuditor, 
  FileAccessEvent, 
  AuditStats,
  SuspiciousPattern 
} from '../../../infra_external-log-lib/pipe';

export interface FileAccessFraud {
  type: FileAccessFraudType;
  severity: 'low' | 'medium' | 'high' | "critical";
  description: string;
  evidence: FileAccessEvent[];
  recommendations: string[];
}

export type FileAccessFraudType = 
  | 'unauthorized_access'
  | 'rapid_file_access'
  | 'suspicious_pattern'
  | 'privilege_escalation'
  | 'data_exfiltration'
  | 'malicious_write'
  | 'directory_traversal'
  | 'hidden_file_access'
  | 'system_file_modification';

export interface FileAccessAnalysis {
  frauds: FileAccessFraud[];
  stats: AuditStats;
  score: number; // 0-100, higher is worse
  recommendations: string[];
  blocked: number;
  allowed: number;
}

export class FileAccessFraudDetector extends BaseDetector {
  private auditor: FileAccessAuditor | null = null;
  private knownMaliciousPatterns: RegExp[] = [
    /\.\.\//, // Directory traversal
    /\/etc\/(passwd|shadow|sudoers)/, // System file access
    /\.(ssh|gnupg|aws|docker)\//, // Sensitive directories
    /node_modules\/\.bin/, // Binary execution attempts
    /\.(env|key|pem|crt|p12)$/, // Sensitive files
    /\/proc\/\d+\//, // Process manipulation
    /\/dev\/(mem|kmem|port)/, // Device access
    /\x00/, // Null byte injection
  ];
  
  private suspiciousExtensions = [
    '.bak', '.backup', '.old', '.orig', // Backup files
    '.tmp', '.temp', '.swp', '.swo', // Temporary files
    '.log', '.audit', // Log files that shouldn't be written to
  ];
  
  constructor() {
    super('file-access-fraud');
  }
  
  /**
   * Initialize connection to external-log-lib auditor
   */
  async initialize(): Promise<void> {
    try {
      const { fileAccessAuditor } = await import('../../../infra_external-log-lib/pipe');
      this.auditor = fileAccessAuditor;
      
      // Set up real-time monitoring
      this.auditor.on("violation", (event: FileAccessEvent) => {
        this.handleViolation(event);
      });
      
      this.auditor.on('suspicious-pattern', (pattern: SuspiciousPattern) => {
        this.handleSuspiciousPattern(pattern);
      });
    } catch (error) {
      console.warn('Could not initialize file access auditor:', error);
    }
  }
  
  /**
   * Analyze file access patterns for fraud
   */
  async analyze(timeWindow?: { start: Date; end: Date }): Promise<FileAccessAnalysis> {
    if (!this.auditor) {
      await this.initialize();
    }
    
    if (!this.auditor) {
      return {
        frauds: [],
        stats: this.getEmptyStats(),
        score: 0,
        recommendations: ['File access auditor not available'],
        blocked: 0,
        allowed: 0
      };
    }
    
    // Get audit log and stats
    const auditLog = this.auditor.getAuditLog();
    const stats = this.auditor.getStats();
    
    // Filter by time window if provided
    const events = timeWindow 
      ? auditLog.filter(e => e.timestamp >= timeWindow.start && e.timestamp <= timeWindow.end)
      : auditLog;
    
    // Detect frauds
    const frauds: FileAccessFraud[] = [];
    
    // Check for unauthorized access
    const unauthorizedEvents = events.filter(e => e.validation && !e.validation.authorized);
    if (unauthorizedEvents.length > 0) {
      frauds.push({
        type: 'unauthorized_access',
        severity: "critical",
        description: `${unauthorizedEvents.length} unauthorized file access attempts detected`,
        evidence: unauthorizedEvents.slice(0, 10),
        recommendations: [
          'Review and update file access permissions',
          'Ensure proper validation is in place',
          'Check for compromised credentials'
        ]
      });
    }
    
    // Check for malicious patterns
    const maliciousAccess = this.detectMaliciousPatterns(events);
    frauds.push(...maliciousAccess);
    
    // Check for rapid access patterns
    const rapidAccess = this.detectRapidAccess(events);
    if (rapidAccess) {
      frauds.push(rapidAccess);
    }
    
    // Check for data exfiltration patterns
    const exfiltration = this.detectDataExfiltration(events);
    if (exfiltration) {
      frauds.push(exfiltration);
    }
    
    // Check for privilege escalation
    const privEscalation = this.detectPrivilegeEscalation(events);
    if (privEscalation) {
      frauds.push(privEscalation);
    }
    
    // Calculate fraud score
    const score = this.calculateFraudScore(frauds, stats);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(frauds, stats);
    
    // Count blocked vs allowed
    const blocked = events.filter(e => !e.result.success).length;
    const allowed = events.filter(e => e.result.success).length;
    
    return {
      frauds,
      stats,
      score,
      recommendations,
      blocked,
      allowed
    };
  }
  
  /**
   * Detect malicious file access patterns
   */
  private detectMaliciousPatterns(events: FileAccessEvent[]): FileAccessFraud[] {
    const frauds: FileAccessFraud[] = [];
    const maliciousEvents: FileAccessEvent[] = [];
    
    for (const event of events) {
      // Check against known malicious patterns
      for (const pattern of this.knownMaliciousPatterns) {
        if (pattern.test(event.path)) {
          maliciousEvents.push(event);
          break;
        }
      }
      
      // Check for directory traversal
      if (event.path.includes('../') || event.path.includes('..\\')) {
        frauds.push({
          type: 'directory_traversal',
          severity: "critical",
          description: `Directory traversal attempt detected: ${event.path}`,
          evidence: [event],
          recommendations: [
            'Sanitize file paths before access',
            'Use path.resolve() to normalize paths',
            'Implement path validation'
          ]
        });
      }
      
      // Check for hidden file access
      if (path.basename(event.path).startsWith('.') && event.operation !== 'read') {
        maliciousEvents.push(event);
      }
      
      // Check for suspicious extensions
      const ext = path.extname(event.path);
      if (this.suspiciousExtensions.includes(ext) && event.operation === 'write') {
        maliciousEvents.push(event);
      }
    }
    
    if (maliciousEvents.length > 0) {
      frauds.push({
        type: 'malicious_write',
        severity: 'high',
        description: `${maliciousEvents.length} suspicious file operations detected`,
        evidence: maliciousEvents.slice(0, 10),
        recommendations: [
          'Review file access patterns',
          'Implement stricter file path validation',
          'Monitor for unusual file extensions'
        ]
      });
    }
    
    return frauds;
  }
  
  /**
   * Detect rapid file access patterns
   */
  private detectRapidAccess(events: FileAccessEvent[]): FileAccessFraud | null {
    // Group events by time window (1 minute)
    const timeWindows = new Map<number, FileAccessEvent[]>();
    
    for (const event of events) {
      const minute = Math.floor(event.timestamp.getTime() / 60000);
      if (!timeWindows.has(minute)) {
        timeWindows.set(minute, []);
      }
      timeWindows.get(minute)!.push(event);
    }
    
    // Find windows with excessive access
    let maxAccess = 0;
    let suspiciousWindow: FileAccessEvent[] = [];
    
    for (const [, windowEvents] of timeWindows) {
      if (windowEvents.length > maxAccess) {
        maxAccess = windowEvents.length;
        suspiciousWindow = windowEvents;
      }
    }
    
    // Threshold: more than 100 operations per minute
    if (maxAccess > 100) {
      return {
        type: 'rapid_file_access',
        severity: 'high',
        description: `Abnormally high file access rate: ${maxAccess} operations/minute`,
        evidence: suspiciousWindow.slice(0, 10),
        recommendations: [
          'Implement rate limiting for file operations',
          'Check for runaway processes or loops',
          'Monitor for potential DoS attacks'
        ]
      };
    }
    
    return null;
  }
  
  /**
   * Detect data exfiltration patterns
   */
  private detectDataExfiltration(events: FileAccessEvent[]): FileAccessFraud | null {
    // Look for patterns indicating data theft
    const readEvents = events.filter(e => e.operation === 'read');
    const largeReads: FileAccessEvent[] = [];
    const sensitiveReads: FileAccessEvent[] = [];
    
    for (const event of readEvents) {
      // Check for large file reads
      if (event.metadata?.size && event.metadata.size > 10 * 1024 * 1024) { // 10MB
        largeReads.push(event);
      }
      
      // Check for sensitive file reads
      const sensitivePatterns = [
        /database/, /backup/, /export/, /dump/,
        /credentials/, /secrets/, /keys/, /tokens/,
        /users/, /customers/, /accounts/
      ];
      
      if (sensitivePatterns.some(p => p.test(event.path.toLowerCase()))) {
        sensitiveReads.push(event);
      }
    }
    
    if (largeReads.length > 10 || sensitiveReads.length > 5) {
      return {
        type: 'data_exfiltration',
        severity: "critical",
        description: `Potential data exfiltration detected: ${largeReads.length} large reads, ${sensitiveReads.length} sensitive reads`,
        evidence: [...largeReads.slice(0, 5), ...sensitiveReads.slice(0, 5)],
        recommendations: [
          'Monitor large file transfers',
          'Implement DLP (Data Loss Prevention) policies',
          'Audit access to sensitive data',
          'Check for unauthorized data exports'
        ]
      };
    }
    
    return null;
  }
  
  /**
   * Detect privilege escalation attempts
   */
  private detectPrivilegeEscalation(events: FileAccessEvent[]): FileAccessFraud | null {
    const privilegedPaths = [
      /\/root\//, /\/etc\//, /\/usr\/bin\//, /\/usr\/sbin\//,
      /\/sys\//, /\/proc\//, /\.ssh\//, /\.gnupg\//
    ];
    
    const privilegedEvents = events.filter(e => {
      return privilegedPaths.some(p => p.test(e.path)) && 
             ['write', 'chmod', 'rename'].includes(e.operation);
    });
    
    if (privilegedEvents.length > 0) {
      return {
        type: 'privilege_escalation',
        severity: "critical",
        description: `${privilegedEvents.length} attempts to modify privileged files/directories`,
        evidence: privilegedEvents.slice(0, 10),
        recommendations: [
          'Review user permissions and access controls',
          'Implement principle of least privilege',
          'Monitor for unauthorized privilege changes',
          'Check for compromised accounts'
        ]
      };
    }
    
    return null;
  }
  
  /**
   * Calculate overall fraud score
   */
  private calculateFraudScore(frauds: FileAccessFraud[], stats: AuditStats): number {
    let score = 0;
    
    // Add points based on fraud severity
    for (const fraud of frauds) {
      switch (fraud.severity) {
        case "critical": score += 25; break;
        case 'high': score += 15; break;
        case 'medium': score += 8; break;
        case 'low': score += 3; break;
      }
    }
    
    // Add points for violations
    score += Math.min(stats.violations * 2, 20);
    
    // Add points for errors
    score += Math.min(stats.errors, 10);
    
    // Add points for suspicious patterns
    score += Math.min(stats.suspiciousPatterns.length * 5, 25);
    
    return Math.min(score, 100);
  }
  
  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(frauds: FileAccessFraud[], stats: AuditStats): string[] {
    const recommendations: string[] = [];
    
    if (frauds.length === 0 && stats.violations === 0) {
      recommendations.push('File access patterns appear normal');
      recommendations.push('Continue monitoring for anomalies');
    } else {
      // High-level recommendations
      if (frauds.some(f => f.severity === "critical")) {
        recommendations.push('URGENT: Critical security issues detected - immediate action required');
      }
      
      if (stats.violations > 10) {
        recommendations.push('Implement stricter file access validation');
        recommendations.push('Review and update access control policies');
      }
      
      if (stats.suspiciousPatterns.length > 0) {
        recommendations.push('Investigate suspicious access patterns');
        recommendations.push('Consider implementing anomaly detection');
      }
      
      // Specific recommendations based on fraud types
      const fraudTypes = new Set(frauds.map(f => f.type));
      
      if (fraudTypes.has('unauthorized_access')) {
        recommendations.push('Audit and fix permission configurations');
      }
      
      if (fraudTypes.has('data_exfiltration')) {
        recommendations.push('Implement data loss prevention measures');
      }
      
      if (fraudTypes.has('privilege_escalation')) {
        recommendations.push('Review and restrict privileged access');
      }
    }
    
    return recommendations;
  }
  
  /**
   * Handle real-time violation events
   */
  private handleViolation(event: FileAccessEvent): void {
    console.warn(`File access violation detected: ${event.operation} on ${event.path}`);
    
    // Could trigger alerts, notifications, or automated responses here
    if (event.validation?.severity === "critical") {
      // Critical violations could trigger immediate action
      this.blockAccess(event);
    }
  }
  
  /**
   * Handle suspicious pattern detection
   */
  private handleSuspiciousPattern(pattern: SuspiciousPattern): void {
    console.warn(`Suspicious pattern detected: ${pattern.type} - ${pattern.description}`);
    
    // Could trigger security alerts or automated investigation
    if (pattern.severity === "critical") {
      this.triggerSecurityAlert(pattern);
    }
  }
  
  /**
   * Block access (placeholder for actual implementation)
   */
  private blockAccess(event: FileAccessEvent): void {
    // In a real implementation, this could:
    // - Kill the offending process
    // - Revoke user permissions
    // - Add to blocklist
    console.error(`BLOCKING ACCESS: ${event.caller.module} attempting ${event.operation} on ${event.path}`);
  }
  
  /**
   * Trigger security alert (placeholder)
   */
  private triggerSecurityAlert(pattern: SuspiciousPattern): void {
    // In a real implementation, this could:
    // - Send notifications to security team
    // - Create incident ticket
    // - Trigger automated response
    console.error(`SECURITY ALERT: ${pattern.type} - ${pattern.description}`);
  }
  
  /**
   * Get empty stats object
   */
  private getEmptyStats(): AuditStats {
    return {
      totalOperations: 0,
      operationCounts: {} as any,
      violations: 0,
      errors: 0,
      topAccessedPaths: [],
      suspiciousPatterns: []
    };
  }
  
  /**
   * Generate fraud report
   */
  async generateReport(analysis: FileAccessAnalysis): Promise<string> {
    let report = '# File Access Fraud Analysis Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    report += '## Summary\n\n';
    report += `- Fraud Score: ${analysis.score}/100\n`;
    report += `- Total Frauds Detected: ${analysis.frauds.length}\n`;
    report += `- Blocked Operations: ${analysis.blocked}\n`;
    report += `- Allowed Operations: ${analysis.allowed}\n`;
    report += `- Violations: ${analysis.stats.violations}\n\n`;
    
    if (analysis.frauds.length > 0) {
      report += '## Detected Frauds\n\n';
      
      for (const fraud of analysis.frauds) {
        report += `### ${fraud.type.replace(/_/g, ' ').toUpperCase()}\n\n`;
        report += `- **Severity:** ${fraud.severity}\n`;
        report += `- **Description:** ${fraud.description}\n`;
        report += `- **Evidence:** ${fraud.evidence.length} events captured\n`;
        
        if (fraud.recommendations.length > 0) {
          report += `- **Recommendations:**\n`;
          for (const rec of fraud.recommendations) {
            report += `  - ${rec}\n`;
          }
        }
        report += '\n';
      }
    }
    
    if (analysis.stats.suspiciousPatterns.length > 0) {
      report += '## Suspicious Patterns\n\n';
      for (const pattern of analysis.stats.suspiciousPatterns) {
        report += `- ${pattern.type}: ${pattern.description} (${pattern.severity})\n`;
      }
      report += '\n';
    }
    
    report += '## Recommendations\n\n';
    for (const rec of analysis.recommendations) {
      report += `- ${rec}\n`;
    }
    
    return report;
  }
}

export default FileAccessFraudDetector;