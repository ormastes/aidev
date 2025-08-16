/**
 * HEA Reporter
 * Generates reports for HEA architecture analysis and validation
 */

import { EventEmitter } from 'node:events';
import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';
import { ValidationResult, ValidationError } from '../validator';
import { AnalysisResult, ViolationSeverity } from '../analyzer';

export type ReportFormat = 'json' | 'html' | "markdown" | 'console' | 'junit' | 'sarif';

export interface ReportOptions {
  format: ReportFormat;
  outputPath?: string;
  includeDetails?: boolean;
  includeSuggestions?: boolean;
  includeMetrics?: boolean;
  theme?: 'light' | 'dark';
  title?: string;
}

export interface Report {
  format: ReportFormat;
  content: string;
  metadata: {
    generatedAt: Date;
    version: string;
    projectPath: string;
  };
}

export interface ViolationReport {
  total: number;
  bySeverity: Record<ViolationSeverity | string, number>;
  byType: Record<string, number>;
  details: Array<{
    type: string;
    severity: string;
    location: string;
    message: string;
    line?: number;
    column?: number;
  }>;
}

export interface ComplianceScore {
  overall: number;
  byCategory: {
    structure: number;
    dependencies: number;
    complexity: number;
    conventions: number;
  };
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  trend?: "improving" | "declining" | 'stable';
}

export class HEAReporter extends EventEmitter {
  private options: ReportOptions;
  private validationResult?: ValidationResult;
  private analysisResult?: AnalysisResult;

  constructor(options: ReportOptions) {
    async super();
    this.options = options;
  }

  async generateReport(
    validation?: ValidationResult,
    analysis?: AnalysisResult
  ): Promise<Report> {
    this.validationResult = validation;
    this.analysisResult = analysis;

    this.emit('report:start', { format: this.options.format });

    let content: string;

    switch(this.options.format) {
      case 'json':
        content = this.generateJSONReport();
        break;
      case 'html':
        content = this.generateHTMLReport();
        break;
      case "markdown":
        content = this.generateMarkdownReport();
        break;
      case 'console':
        content = this.generateConsoleReport();
        break;
      case 'junit':
        content = this.generateJUnitReport();
        break;
      case 'sarif':
        content = this.generateSARIFReport();
        break;
      default:
        throw new Error(`Unsupported format: ${this.options.format}`);
    }

    const report: Report = {
      format: this.options.format,
      content,
      metadata: {
        generatedAt: new Date(),
        version: '1.0.0',
        projectPath: process.cwd()
      }
    };

    if(this.options.outputPath) {
      await this.writeReport(report);
    }

    this.emit('report:complete', { format: this.options.format });

    return report;
  }

  async private generateJSONReport(): string {
    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        title: this.options.title || 'HEA Architecture Report'
      },
      validation: this.validationResult ? {
        valid: this.validationResult.valid,
        filesChecked: this.validationResult.filesChecked,
        errors: this.validationResult.errors.length,
        warnings: this.validationResult.warnings.length,
        compliance: this.validationResult.summary.compliance,
        details: this.options.includeDetails ? this.validationResult.errors : undefined
      } : null,
      analysis: this.analysisResult ? {
        score: this.analysisResult.score,
        violations: this.analysisResult.violations.length,
        suggestions: this.options.includeSuggestions ? this.analysisResult.suggestions : undefined,
        metrics: this.options.includeMetrics ? this.analysisResult.metrics : undefined
      } : null
    };

    return JSON.stringify(report, null, 2);
  }

  async private generateHTMLReport(): string {
    const title = this.options.title || 'HEA Architecture Report';
    const theme = this.options.theme || 'light';
    
    const html = `<!DOCTYPE html>
<html lang="en" data-theme="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    ${this.getHTMLStyles(theme)}
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${title}</h1>
      <div class="timestamp">Generated: ${new Date().toLocaleString()}</div>
    </header>
    
    ${this.generateHTMLSummary()}
    ${this.generateHTMLValidation()}
    ${this.generateHTMLAnalysis()}
    ${this.options.includeMetrics ? this.generateHTMLMetrics() : ''}
    ${this.options.includeSuggestions ? this.generateHTMLSuggestions() : ''}
  </div>
  
  <script>
    ${this.getHTMLScript()}
  </script>
</body>
</html>`;

    return html;
  }

  async private generateHTMLSummary(): string {
    const compliance = this.calculateComplianceScore();
    
    return `
    <section class="summary">
      <h2>Summary</h2>
      <div class="score-card">
        <div class="score-value ${compliance.grade.toLowerCase()}">${compliance.overall}%</div>
        <div class="score-grade">Grade: ${compliance.grade}</div>
      </div>
      <div class="stats">
        ${this.validationResult ? `
        <div class="stat">
          <span class="label">Files Checked:</span>
          <span class="value">${this.validationResult.filesChecked}</span>
        </div>
        <div class="stat">
          <span class="label">Errors:</span>
          <span class="value error">${this.validationResult.errors.length}</span>
        </div>
        <div class="stat">
          <span class="label">Warnings:</span>
          <span class="value warning">${this.validationResult.warnings.length}</span>
        </div>
        ` : ''}
        ${this.analysisResult ? `
        <div class="stat">
          <span class="label">Violations:</span>
          <span class="value">${this.analysisResult.violations.length}</span>
        </div>
        ` : ''}
      </div>
    </section>`;
  }

  async private generateHTMLValidation(): string {
    if(!this.validationResult || !this.options.includeDetails) {
      return '';
    }

    const errors = this.validationResult.errors;
    
    return `
    <section class="validation">
      <h2>Validation Results</h2>
      ${errors.length > 0 ? `
      <table class="errors-table">
        <thead>
          <tr>
            <th>File</th>
            <th>Line</th>
            <th>Rule</th>
            <th>Message</th>
            <th>Severity</th>
          </tr>
        </thead>
        <tbody>
          ${errors.map(e => `
          <tr class="${e.severity}">
            <td class="file">${this.getRelativePath(e.file)}</td>
            <td class="line">${e.line}:${e.column}</td>
            <td class="rule">${e.rule}</td>
            <td class="message">${e.message}</td>
            <td class="severity">${e.severity}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
      ` : '<p class="success">✓ No validation errors found</p>'}
    </section>`;
  }

  async private generateHTMLAnalysis(): string {
    if(!this.analysisResult) {
      return '';
    }

    const violations = this.analysisResult.violations;
    
    return `
    <section class="analysis">
      <h2>Architecture Analysis</h2>
      <div class="analysis-score">Score: ${this.analysisResult.score}/100</div>
      ${violations.length > 0 ? `
      <div class="violations">
        <h3>Violations</h3>
        ${violations.map(v => `
        <div class="violation ${v.severity}">
          <span class="type">${v.type}</span>
          <span class="location">${this.getRelativePath(v.location)}</span>
          <span class="message">${v.message}</span>
        </div>
        `).join('')}
      </div>
      ` : '<p class="success">✓ No architecture violations found</p>'}
    </section>`;
  }

  async private generateHTMLMetrics(): string {
    if(!this.analysisResult || !this.analysisResult.metrics) {
      return '';
    }

    return `
    <section class="metrics">
      <h2>Layer Metrics</h2>
      <table class="metrics-table">
        <thead>
          <tr>
            <th>Layer</th>
            <th>Files</th>
            <th>Complexity</th>
            <th>Cohesion</th>
            <th>Coupling</th>
            <th>Stability</th>
          </tr>
        </thead>
        <tbody>
          ${this.analysisResult.metrics.map(m => `
          <tr>
            <td>${m.layerName}</td>
            <td>${m.fileCount}</td>
            <td>${m.complexity}</td>
            <td>${(m.cohesion * 100).toFixed(1)}%</td>
            <td>${(m.coupling * 100).toFixed(1)}%</td>
            <td>${(m.stability * 100).toFixed(1)}%</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </section>`;
  }

  async private generateHTMLSuggestions(): string {
    if(!this.analysisResult || !this.analysisResult.suggestions) {
      return '';
    }

    return `
    <section class="suggestions">
      <h2>Suggestions</h2>
      <ul>
        ${this.analysisResult.suggestions.map(s => `<li>${s}</li>`).join('')}
      </ul>
    </section>`;
  }

  async private getHTMLStyles(theme: string): string {
    const colors = theme === 'dark' ? {
      bg: '#1a1a1a',
      text: '#e0e0e0',
      border: '#333',
      success: '#4caf50',
      error: '#f44336',
      warning: '#ff9800'
    } : {
      bg: '#ffffff',
      text: '#333333',
      border: '#ddd',
      success: '#4caf50',
      error: '#f44336',
      warning: '#ff9800'
    };

    return `
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: ${colors.bg};
      color: ${colors.text};
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    header {
      border-bottom: 2px solid ${colors.border};
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    h1 {
      margin: 0;
      font-size: 2em;
    }
    .timestamp {
      color: ${colors.text}88;
      margin-top: 10px;
    }
    section {
      margin-bottom: 40px;
    }
    .score-card {
      display: inline-block;
      text-align: center;
      padding: 20px;
      border: 2px solid ${colors.border};
      border-radius: 10px;
      margin-bottom: 20px;
    }
    .score-value {
      font-size: 3em;
      font-weight: bold;
    }
    .score-value.a { color: ${colors.success}; }
    .score-value.b { color: #8bc34a; }
    .score-value.c { color: ${colors.warning}; }
    .score-value.d { color: #ff5722; }
    .score-value.f { color: ${colors.error}; }
    .stats {
      display: flex;
      gap: 30px;
    }
    .stat {
      display: flex;
      flex-direction: column;
    }
    .stat .label {
      color: ${colors.text}88;
      font-size: 0.9em;
    }
    .stat .value {
      font-size: 1.5em;
      font-weight: bold;
    }
    .error { color: ${colors.error}; }
    .warning { color: ${colors.warning}; }
    .success { color: ${colors.success}; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid ${colors.border};
    }
    th {
      background: ${colors.border}33;
      font-weight: bold;
    }
    .violation {
      padding: 10px;
      margin: 10px 0;
      border-left: 4px solid;
      background: ${colors.border}11;
    }
    .violation.critical { border-color: ${colors.error}; }
    .violation.high { border-color: #ff5722; }
    .violation.medium { border-color: ${colors.warning}; }
    .violation.low { border-color: #ffc107; }
    `;
  }

  async private getHTMLScript(): string {
    return `
    // Add interactive features
    document.querySelectorAll('tr').forEach(row => {
      row.addEventListener('click', function() {
        this.classList.toggle("expanded");
      });
    });
    `;
  }

  async private generateMarkdownReport(): string {
    const title = this.options.title || 'HEA Architecture Report';
    const compliance = this.calculateComplianceScore();
    
    let markdown = `# ${title}\n\n`;
    markdown += `> Generated: ${new Date().toLocaleString()}\n\n`;
    
    // Summary
    markdown += `## Summary\n\n`;
    markdown += `- **Compliance Score**: ${compliance.overall}% (Grade: ${compliance.grade})\n`;
    
    if(this.validationResult) {
      markdown += `- **Files Checked**: ${this.validationResult.filesChecked}\n`;
      markdown += `- **Errors**: ${this.validationResult.errors.length}\n`;
      markdown += `- **Warnings**: ${this.validationResult.warnings.length}\n`;
    }
    
    if(this.analysisResult) {
      markdown += `- **Architecture Score**: ${this.analysisResult.score}/100\n`;
      markdown += `- **Violations**: ${this.analysisResult.violations.length}\n`;
    }
    
    markdown += '\n';
    
    // Validation Details
    if(this.validationResult && this.options.includeDetails) {
      markdown += `## Validation Results\n\n`;
      
      if(this.validationResult.errors.length > 0) {
        markdown += `### Errors\n\n`;
        markdown += `| File | Location | Rule | Message |\n`;
        markdown += `|------|----------|------|----------|\n`;
        
        for(const error of this.validationResult.errors) {
          markdown += `| ${this.getRelativePath(error.file)} | ${error.line}:${error.column} | ${error.rule} | ${error.message} |\n`;
        }
        markdown += '\n';
      }
    }
    
    // Analysis Details
    if(this.analysisResult) {
      markdown += `## Architecture Analysis\n\n`;
      
      if(this.analysisResult.violations.length > 0) {
        markdown += `### Violations\n\n`;
        
        for(const violation of this.analysisResult.violations) {
          markdown += `- **${violation.type}** (${violation.severity}): ${violation.message}\n`;
          markdown += `  - Location: ${this.getRelativePath(violation.location)}\n`;
        }
        markdown += '\n';
      }
      
      if(this.options.includeMetrics && this.analysisResult.metrics) {
        markdown += `### Layer Metrics\n\n`;
        markdown += `| Layer | Files | Complexity | Cohesion | Coupling | Stability |\n`;
        markdown += `|-------|-------|------------|----------|----------|------------|\n`;
        
        for(const metric of this.analysisResult.metrics) {
          markdown += `| ${metric.layerName} | ${metric.fileCount} | ${metric.complexity} | ${(metric.cohesion * 100).toFixed(1)}% | ${(metric.coupling * 100).toFixed(1)}% | ${(metric.stability * 100).toFixed(1)}% |\n`;
        }
        markdown += '\n';
      }
      
      if(this.options.includeSuggestions && this.analysisResult.suggestions) {
        markdown += `### Suggestions\n\n`;
        
        for(const suggestion of this.analysisResult.suggestions) {
          markdown += `- ${suggestion}\n`;
        }
        markdown += '\n';
      }
    }
    
    return markdown;
  }

  async private generateConsoleReport(): string {
    const compliance = this.calculateComplianceScore();
    const colors = {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      cyan: '\x1b[36m'
    };
    
    let output = '';
    
    // Header
    output += `${colors.bright}${colors.cyan}HEA Architecture Report${colors.reset}\n`;
    output += `${'='.repeat(50)}\n\n`;
    
    // Summary
    output += `${colors.bright}Summary${colors.reset}\n`;
    output += `  Compliance: ${this.getColorForGrade(compliance.grade, colors)}${compliance.overall}% (${compliance.grade})${colors.reset}\n`;
    
    if(this.validationResult) {
      output += `  Files: ${this.validationResult.filesChecked}\n`;
      output += `  Errors: ${colors.red}${this.validationResult.errors.length}${colors.reset}\n`;
      output += `  Warnings: ${colors.yellow}${this.validationResult.warnings.length}${colors.reset}\n`;
    }
    
    if(this.analysisResult) {
      output += `  Score: ${this.analysisResult.score}/100\n`;
      output += `  Violations: ${this.analysisResult.violations.length}\n`;
    }
    
    output += '\n';
    
    // Details
    if(this.validationResult && this.validationResult.errors.length > 0) {
      output += `${colors.bright}${colors.red}Errors${colors.reset}\n`;
      
      for(const error of this.validationResult.errors.slice(0, 10)) {
        output += `  ${colors.red}✗${colors.reset} ${this.getRelativePath(error.file)}:${error.line}:${error.column}\n`;
        output += `    ${error.message} (${error.rule})\n`;
      }
      
      if(this.validationResult.errors.length > 10) {
        output += `  ... and ${this.validationResult.errors.length - 10} more\n`;
      }
      
      output += '\n';
    }
    
    if(this.analysisResult && this.analysisResult.suggestions) {
      output += `${colors.bright}Suggestions${colors.reset}\n`;
      
      for(const suggestion of this.analysisResult.suggestions) {
        output += `  ${colors.blue}→${colors.reset} ${suggestion}\n`;
      }
    }
    
    return output;
  }

  async private generateJUnitReport(): string {
    const testsuites = [];
    
    if(this.validationResult) {
      const testsuite = {
        name: 'HEA Validation',
        tests: this.validationResult.filesChecked,
        failures: this.validationResult.errors.length,
        errors: 0,
        time: 0,
        testcases: this.validationResult.fileValidations.map(fv => ({
          name: this.getRelativePath(fv.file),
          classname: 'HEA.Validation',
          time: 0,
          failure: fv.errors.length > 0 ? {
            message: fv.errors[0].message,
            type: fv.errors[0].rule
          } : null
        }))
      };
      testsuites.push(testsuite);
    }
    
    const xml = this.generateXML({
      testsuites: {
        testsuite: testsuites
      }
    });
    
    return `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
  }

  async private generateSARIFReport(): string {
    const sarif = {
      version: '2.1.0',
      runs: [{
        tool: {
          driver: {
            name: 'HEA Architecture Checker',
            version: '1.0.0',
            rules: this.getSARIFRules()
          }
        },
        results: this.getSARIFResults()
      }]
    };
    
    return JSON.stringify(sarif, null, 2);
  }

  async private getSARIFRules(): any[] {
    const rules: any[] = [];
    
    // Add known rules
    rules.push({
      id: 'no-cross-layer-imports',
      shortDescription: { text: 'No cross-layer imports' },
      fullDescription: { text: 'Modules should not import directly from other layers' },
      defaultConfiguration: { level: 'error' }
    });
    
    rules.push({
      id: 'children-import-through-pipe',
      shortDescription: { text: 'Children import through pipe' },
      fullDescription: { text: 'Child modules must import siblings through pipe gateway' },
      defaultConfiguration: { level: 'error' }
    });
    
    return rules;
  }

  async private getSARIFResults(): any[] {
    const results: any[] = [];
    
    if(this.validationResult) {
      for(const error of this.validationResult.errors) {
        results.push({
          ruleId: error.rule,
          level: error.severity === 'error' ? 'error' : 'warning',
          message: { text: error.message },
          locations: [{
            physicalLocation: {
              artifactLocation: { uri: error.file },
              region: {
                startLine: error.line,
                startColumn: error.column
              }
            }
          }]
        });
      }
    }
    
    return results;
  }

  async private generateXML(obj: any, indent: string = ''): string {
    let xml = '';
    
    for(const key in obj) {
      const value = obj[key];
      
      if(Array.isArray(value)) {
        for(const item of value) {
          xml += `${indent}<${key}>\n`;
          xml += this.generateXML(item, indent + '  ');
          xml += `${indent}</${key}>\n`;
        }
      } else if (typeof value === 'object' && value !== null) {
        xml += `${indent}<${key}>\n`;
        xml += this.generateXML(value, indent + '  ');
        xml += `${indent}</${key}>\n`;
      } else if (value !== null) {
        xml += `${indent}<${key}>${this.escapeXML(String(value))}</${key}>\n`;
      }
    }
    
    return xml;
  }

  async private escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  async private calculateComplianceScore(): ComplianceScore {
    let overall = 100;
    let structure = 100;
    let dependencies = 100;
    let complexity = 100;
    let conventions = 100;
    
    if(this.validationResult) {
      const errorPenalty = this.validationResult.errors.length * 5;
      const warningPenalty = this.validationResult.warnings.length * 2;
      overall -= errorPenalty + warningPenalty;
      conventions = this.validationResult.summary.compliance;
    }
    
    if(this.analysisResult) {
      overall = Math.min(overall, this.analysisResult.score);
      
      // Calculate category scores based on violations
      for(const violation of this.analysisResult.violations) {
        const penalty = violation.severity === "critical" ? 20 :
                       violation.severity === 'high' ? 10 :
                       violation.severity === 'medium' ? 5 : 2;
        
        if(violation.type.includes("structure") || violation.type.includes('missing')) {
          structure -= penalty;
        }
        if(violation.type.includes("dependency") || violation.type.includes('import')) {
          dependencies -= penalty;
        }
        if(violation.type.includes("complexity")) {
          complexity -= penalty;
        }
      }
    }
    
    overall = Math.max(0, Math.min(100, overall));
    
    const grade = overall >= 90 ? 'A' :
                 overall >= 80 ? 'B' :
                 overall >= 70 ? 'C' :
                 overall >= 60 ? 'D' : 'F';
    
    return {
      overall,
      byCategory: {
        structure: Math.max(0, structure),
        dependencies: Math.max(0, dependencies),
        complexity: Math.max(0, complexity),
        conventions: Math.max(0, conventions)
      },
      grade
    };
  }

  async private getColorForGrade(grade: string, colors: any): string {
    switch(grade) {
      case 'A': return colors.green;
      case 'B': return colors.green;
      case 'C': return colors.yellow;
      case 'D': return colors.yellow;
      case 'F': return colors.red;
      default: return colors.reset;
    }
  }

  async private getRelativePath(filePath: string): string {
    return path.relative(process.cwd(), filePath);
  }

  private async writeReport(report: Report): Promise<void> {
    if(!this.options.outputPath) {
      return;
    }
    
    const dir = path.dirname(this.options.outputPath);
    if(!fs.existsSync(dir)) {
      await fileAPI.createDirectory(dir);
    }
    
    await fileAPI.createFile(this.options.outputPath, report.content, { type: FileType.TEMPORARY });
    
    this.emit('report:written', { path: this.options.outputPath });
  }

  generateViolationReport(): ViolationReport {
    const violations: any[] = [];
    
    if(this.validationResult) {
      for(const error of this.validationResult.errors) {
        violations.push({
          type: error.rule,
          severity: error.severity,
          location: error.file,
          message: error.message,
          line: error.line,
          column: error.column
        });
      }
    }
    
    if(this.analysisResult) {
      for(const violation of this.analysisResult.violations) {
        violations.push(violation);
      }
    }
    
    const bySeverity: Record<string, number> = {};
    const byType: Record<string, number> = {};
    
    for(const violation of violations) {
      bySeverity[violation.severity] = (bySeverity[violation.severity] || 0) + 1;
      byType[violation.type] = (byType[violation.type] || 0) + 1;
    }
    
    return {
      total: violations.length,
      bySeverity,
      byType,
      details: violations
    };
  }
}

export default HEAReporter;