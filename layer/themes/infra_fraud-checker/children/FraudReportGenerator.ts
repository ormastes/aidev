import { FraudCheckResult, FraudViolation } from './FraudChecker';
import { TestAnalysis } from './TestAnalyzer';
import { FileSystemWrapper } from '../external/FileSystemWrapper';

export interface FraudReport {
  timestamp: string;
  summary: {
    overallScore: number;
    passed: boolean;
    totalViolations: number;
    criticalViolations: number;
    recommendation: string;
  };
  details: {
    fraudCheck: FraudCheckResult;
    testAnalysis?: TestAnalysis;
  };
  violations: {
    bySeverity: Record<string, FraudViolation[]>;
    byType: Record<string, FraudViolation[]>;
  };
}

/**
 * Generates comprehensive fraud detection reports
 */
export class FraudReportGenerator {
  private fileSystem: FileSystemWrapper;

  constructor(basePath: string = process.cwd()) {
    this.fileSystem = new FileSystemWrapper(basePath);
  }

  async generateReport(
    fraudCheckResult: FraudCheckResult,
    testAnalysis?: TestAnalysis
  ): Promise<FraudReport> {
    const violations = this.categorizeViolations(fraudCheckResult.violations);
    const summary = this.generateSummary(fraudCheckResult, violations);

    const report: FraudReport = {
      timestamp: new Date().toISOString(),
      summary,
      details: {
        fraudCheck: fraudCheckResult,
        testAnalysis
      },
      violations
    };

    return report;
  }

  async saveReport(report: FraudReport, outputPath: string): Promise<void> {
    const jsonContent = JSON.stringify(report, null, 2);
    await this.fileSystem.writeFile(outputPath, jsonContent);
    
    // Also generate HTML report
    const htmlContent = this.generateHtmlReport(report);
    const htmlPath = outputPath.replace('.json', '.html');
    await this.fileSystem.writeFile(htmlPath, htmlContent);
  }

  private categorizeViolations(violations: FraudViolation[]): FraudReport['violations'] {
    const bySeverity: Record<string, FraudViolation[]> = {
      critical: [],
      high: [],
      medium: [],
      low: []
    };

    const byType: Record<string, FraudViolation[]> = {
      'test-manipulation': [],
      'coverage-bypass': [],
      'fake-assertions': [],
      'disabled-tests': []
    };

    for (const violation of violations) {
      bySeverity[violation.severity].push(violation);
      byType[violation.type].push(violation);
    }

    return { bySeverity, byType };
  }

  private generateSummary(
    fraudCheckResult: FraudCheckResult,
    categorizedViolations: FraudReport['violations']
  ): FraudReport['summary'] {
    const criticalViolations = categorizedViolations.bySeverity.critical.length;
    const totalViolations = fraudCheckResult.violations.length;

    let recommendation = 'Tests appear to be genuine and well-written.';
    
    if (criticalViolations > 0) {
      recommendation = 'Critical issues detected. Immediate review and fixes required.';
    } else if (fraudCheckResult.score < 70) {
      recommendation = 'Significant quality issues found. Major refactoring recommended.';
    } else if (fraudCheckResult.score < 90) {
      recommendation = 'Some issues detected. Review and improve test quality.';
    }

    return {
      overallScore: fraudCheckResult.score,
      passed: fraudCheckResult.passed,
      totalViolations,
      criticalViolations,
      recommendation
    };
  }

  private generateHtmlReport(report: FraudReport): string {
    const severityColors = {
      critical: '#dc3545',
      high: '#fd7e14',
      medium: '#ffc107',
      low: '#6c757d'
    };

    const statusColor = report.summary.passed ? '#28a745' : '#dc3545';
    const statusText = report.summary.passed ? 'PASSED' : 'FAILED';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fraud Detection Report - ${new Date(report.timestamp).toLocaleString()}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1, h2, h3 {
            color: #333;
        }
        .summary {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            margin-bottom: 30px;
        }
        .score {
            font-size: 3em;
            font-weight: bold;
            color: ${statusColor};
        }
        .status {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 4px;
            font-weight: bold;
            color: white;
            background: ${statusColor};
        }
        .metric-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .metric-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            text-align: center;
        }
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            color: #333;
        }
        .metric-label {
            color: #666;
            font-size: 0.9em;
            margin-top: 5px;
        }
        .violation {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 10px;
        }
        .violation.critical {
            background: #f8d7da;
            border-color: #f5c6cb;
        }
        .violation.high {
            background: #fff3cd;
            border-color: #ffeaa7;
        }
        .severity-badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 3px;
            font-size: 0.8em;
            font-weight: bold;
            color: white;
            margin-right: 10px;
        }
        .recommendation {
            background: #d1ecf1;
            border: 1px solid #bee5eb;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
            color: #0c5460;
        }
        pre {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Test Fraud Detection Report</h1>
        <p>Generated: ${new Date(report.timestamp).toLocaleString()}</p>
        
        <div class="summary">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div class="score">${report.summary.overallScore}/100</div>
                    <div>Overall Quality Score</div>
                </div>
                <div class="status">${statusText}</div>
            </div>
        </div>

        <div class="recommendation">
            <strong>Recommendation:</strong> ${report.summary.recommendation}
        </div>

        <h2>Metrics Overview</h2>
        <div class="metric-grid">
            <div class="metric-card">
                <div class="metric-value">${report.summary.totalViolations}</div>
                <div class="metric-label">Total Violations</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.summary.criticalViolations}</div>
                <div class="metric-label">Critical Issues</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.details.fraudCheck.metrics.filesChecked}</div>
                <div class="metric-label">Files Checked</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.details.fraudCheck.metrics.suspiciousPatterns}</div>
                <div class="metric-label">Suspicious Patterns</div>
            </div>
        </div>

        <h2>Violations by Severity</h2>
        ${Object.entries(report.violations.bySeverity)
          .filter(([_, violations]) => violations.length > 0)
          .map(([severity, violations]) => `
            <h3>${severity.charAt(0).toUpperCase() + severity.slice(1)} (${violations.length})</h3>
            ${violations.map(v => `
                <div class="violation ${v.severity}">
                    <span class="severity-badge" style="background: ${severityColors[v.severity]}">${v.severity.toUpperCase()}</span>
                    <strong>${v.type}</strong>: ${v.message}
                    <br><small>${v.location}</small>
                </div>
            `).join('')}
          `).join('')}

        ${report.details.testAnalysis ? `
        <h2>Test Analysis</h2>
        <div class="metric-grid">
            <div class="metric-card">
                <div class="metric-value">${report.details.testAnalysis.metrics.totalTests}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${(report.details.testAnalysis.quality.skipRatio * 100).toFixed(1)}%</div>
                <div class="metric-label">Skip Ratio</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.details.testAnalysis.suspicious.tooFastTests}</div>
                <div class="metric-label">Suspiciously Fast Tests</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${report.details.testAnalysis.suspicious.identicalTests}</div>
                <div class="metric-label">Duplicate Tests</div>
            </div>
        </div>
        ` : ''}
    </div>
</body>
</html>
    `;
  }

  generateMarkdownReport(report: FraudReport): string {
    const status = report.summary.passed ? '✅ PASSED' : '❌ FAILED';
    
    let markdown = `# Test Fraud Detection Report

Generated: ${new Date(report.timestamp).toLocaleString()}

## Summary

- **Status**: ${status}
- **Overall Score**: ${report.summary.overallScore}/100
- **Total Violations**: ${report.summary.totalViolations}
- **Critical Violations**: ${report.summary.criticalViolations}

### Recommendation
${report.summary.recommendation}

## Metrics

- Files Checked: ${report.details.fraudCheck.metrics.filesChecked}
- Suspicious Patterns: ${report.details.fraudCheck.metrics.suspiciousPatterns}
- Skipped Tests: ${report.details.fraudCheck.metrics.skippedTests}
- Empty Tests: ${report.details.fraudCheck.metrics.emptyTests}

## Violations

`;

    // Add violations by severity
    for (const [severity, violations] of Object.entries(report.violations.bySeverity)) {
      if (violations.length === 0) continue;
      
      markdown += `### ${severity.charAt(0).toUpperCase() + severity.slice(1)} (${violations.length})\n\n`;
      
      for (const violation of violations) {
        markdown += `- **${violation.type}**: ${violation.message}\n`;
        markdown += `  - Location: \`${violation.location}\`\n`;
      }
      
      markdown += '\n';
    }

    return markdown;
  }
}