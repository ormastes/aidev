/**
 * Circular Dependency Detector for Fraud Checker
 * Uses the circular dependency detection from story-reporter theme
 */

import {
  CircularDependencyService,
  CircularDependencyReport,
  CircularDependency,
  AnalysisOptions
} from '../../infra_story-reporter/pipe';

export interface CircularDependencyFraudIssue {
  type: 'circular-dependency';
  severity: 'error' | 'warning' | 'info';
  file: string;
  description: string;
  cycle: string[];
  suggestions: string[];
}

export class CircularDependencyDetector {
  private service: CircularDependencyService;

  constructor() {
    this.service = new CircularDependencyService();
  }

  /**
   * Detect circular dependency fraud in a project
   */
  async detectFraud(projectPath: string): Promise<CircularDependencyFraudIssue[]> {
    const options: AnalysisOptions = {
      exclude_patterns: ['node_modules', 'dist', 'build', '.git', "coverage"],
      cache_enabled: true
    };

    const report = await this.service.analyzeProject(projectPath, options);
    return this.convertToFraudIssues(report);
  }

  /**
   * Check a specific file for circular dependency issues
   */
  async checkFile(filePath: string, projectPath: string): Promise<CircularDependencyFraudIssue[]> {
    const circularDeps = await this.service.checkFile(filePath, projectPath);
    return this.convertCircularDepsToFraudIssues(circularDeps, filePath);
  }

  /**
   * Generate a detailed fraud report for circular dependencies
   */
  async generateDetailedReport(projectPath: string): Promise<string> {
    const options: AnalysisOptions = {
      exclude_patterns: ['node_modules', 'dist', 'build', '.git', "coverage"],
      cache_enabled: true,
      visualization: {
        format: 'svg',
        highlight_cycles: true
      }
    };

    const report = await this.service.analyzeProject(projectPath, options);
    
    let fraudReport = '## Circular Dependency Fraud Detection Report\n\n';
    
    if (report.circularDependencies.length === 0) {
      fraudReport += '✅ **No circular dependency fraud detected**\n\n';
      fraudReport += 'The codebase is free from circular dependencies.\n';
    } else {
      fraudReport += `⚠️ **${report.circularDependencies.length} circular dependency fraud issues detected**\n\n`;
      
      // Group by severity
      const errors = report.circularDependencies.filter(cd => cd.severity === 'error');
      const warnings = report.circularDependencies.filter(cd => cd.severity === 'warning');
      const info = report.circularDependencies.filter(cd => cd.severity === 'info');
      
      if (errors.length > 0) {
        fraudReport += `### 🔴 Critical Issues (${errors.length})\n\n`;
        for (const error of errors) {
          fraudReport += this.formatCircularDependency(error);
        }
      }
      
      if (warnings.length > 0) {
        fraudReport += `### 🟡 Warnings (${warnings.length})\n\n`;
        for (const warning of warnings) {
          fraudReport += this.formatCircularDependency(warning);
        }
      }
      
      if (info.length > 0) {
        fraudReport += `### 🔵 Information (${info.length})\n\n`;
        for (const item of info) {
          fraudReport += this.formatCircularDependency(item);
        }
      }
      
      fraudReport += '\n### Fraud Prevention Recommendations\n\n';
      fraudReport += '1. **Immediate Actions:**\n';
      fraudReport += '   - Fix all critical circular dependencies\n';
      fraudReport += '   - Add pre-commit hooks to prevent new circular dependencies\n';
      fraudReport += '   - Review architecture to prevent future occurrences\n\n';
      fraudReport += '2. **Long-term Solutions:**\n';
      fraudReport += '   - Implement dependency inversion principle\n';
      fraudReport += '   - Use interfaces to break direct dependencies\n';
      fraudReport += '   - Consider layer-based architecture\n';
    }
    
    return fraudReport;
  }

  /**
   * Check if a circular dependency is considered fraudulent
   */
  private isFraudulentDependency(circularDep: CircularDependency): boolean {
    // Consider a circular dependency fraudulent if:
    // 1. It's an error severity
    // 2. It involves more than 3 files (complex cycle)
    // 3. It's in production code (not tests)
    
    if (circularDep.severity === 'error') return true;
    if (circularDep.cycle.length > 3) return true;
    
    const isTestFile = circularDep.affected_files.some(file =>
      file.includes('.test.') || file.includes('.spec.') || file.includes('/tests/')
    );
    
    return !isTestFile && circularDep.severity === 'warning';
  }

  /**
   * Convert circular dependency report to fraud issues
   */
  private convertToFraudIssues(report: CircularDependencyReport): CircularDependencyFraudIssue[] {
    const issues: CircularDependencyFraudIssue[] = [];
    
    for (const circularDep of report.circularDependencies) {
      if (this.isFraudulentDependency(circularDep)) {
        for (const file of circularDep.affected_files) {
          issues.push({
            type: 'circular-dependency',
            severity: circularDep.severity,
            file,
            description: circularDep.description,
            cycle: circularDep.cycle,
            suggestions: circularDep.suggestions || []
          });
        }
      }
    }
    
    return issues;
  }

  /**
   * Convert circular dependencies to fraud issues
   */
  private convertCircularDepsToFraudIssues(
    circularDeps: CircularDependency[],
    filePath: string
  ): CircularDependencyFraudIssue[] {
    const issues: CircularDependencyFraudIssue[] = [];
    
    for (const circularDep of circularDeps) {
      if (this.isFraudulentDependency(circularDep)) {
        issues.push({
          type: 'circular-dependency',
          severity: circularDep.severity,
          file: filePath,
          description: circularDep.description,
          cycle: circularDep.cycle,
          suggestions: circularDep.suggestions || []
        });
      }
    }
    
    return issues;
  }

  /**
   * Format a circular dependency for the report
   */
  private formatCircularDependency(circularDep: CircularDependency): string {
    let formatted = `**Cycle:** ${circularDep.cycle.join(' → ')} → ${circularDep.cycle[0]}\n\n`;
    formatted += `**Type:** ${circularDep.type}\n`;
    formatted += `**Files involved:** ${circularDep.affected_files.length}\n`;
    
    if (circularDep.suggestions && circularDep.suggestions.length > 0) {
      formatted += '**Suggestions:**\n';
      for (const suggestion of circularDep.suggestions) {
        formatted += `- ${suggestion}\n`;
      }
    }
    
    formatted += '\n---\n\n';
    return formatted;
  }
}