/**
 * Fraud Reporter
 * Generates comprehensive fraud detection reports
 */

import { FraudScoreResult, RiskLevel } from '../scoring/fraud-scorer';
import { FraudViolation, FraudSeverity, ViolationType } from '../types';

export interface FraudReport {
  summary: FraudReportSummary;
  details: FraudReportDetails;
  visualizations: FraudVisualization[];
  exportFormats: ExportFormat[];
  timestamp: Date;
}

export interface FraudReportSummary {
  overallScore: number;
  riskLevel: RiskLevel;
  totalViolations: number;
  criticalViolations: number;
  passed: boolean;
  topRisks: string[];
}

export interface FraudReportDetails {
  violationsByType: Map<ViolationType, FraudViolation[]>;
  violationsBySeverity: Map<FraudSeverity, FraudViolation[]>;
  detectorResults: Map<string, number>;
  timeline: TimelineEntry[];
  recommendations: string[];
}

export interface FraudVisualization {
  type: 'bar' | 'pie' | 'line' | 'heatmap';
  title: string;
  data: any;
  description: string;
}

export interface TimelineEntry {
  timestamp: Date;
  event: string;
  severity: FraudSeverity;
  details?: string;
}

export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  PDF = 'pdf',
  HTML = 'html',
  MARKDOWN = "markdown"
}

export class FraudReporter {
  /**
   * Generate comprehensive fraud report
   */
  generateReport(scoreResult: FraudScoreResult): FraudReport {
    const summary = this.generateSummary(scoreResult);
    const details = this.generateDetails(scoreResult);
    const visualizations = this.generateVisualizations(scoreResult);

    return {
      summary,
      details,
      visualizations,
      exportFormats: [
        ExportFormat.JSON,
        ExportFormat.CSV,
        ExportFormat.HTML,
        ExportFormat.MARKDOWN
      ],
      timestamp: new Date()
    };
  }

  /**
   * Export report in specified format
   */
  exportReport(report: FraudReport, format: ExportFormat): string {
    switch (format) {
      case ExportFormat.JSON:
        return this.exportAsJSON(report);
      case ExportFormat.CSV:
        return this.exportAsCSV(report);
      case ExportFormat.HTML:
        return this.exportAsHTML(report);
      case ExportFormat.MARKDOWN:
        return this.exportAsMarkdown(report);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private generateSummary(scoreResult: FraudScoreResult): FraudReportSummary {
    const criticalViolations = scoreResult.aggregatedViolations
      .filter(v => v.severity === FraudSeverity.CRITICAL).length;

    const topRisks = this.identifyTopRisks(scoreResult.aggregatedViolations);

    return {
      overallScore: scoreResult.overallScore,
      riskLevel: scoreResult.riskLevel,
      totalViolations: scoreResult.aggregatedViolations.length,
      criticalViolations,
      passed: scoreResult.passed,
      topRisks
    };
  }

  private generateDetails(scoreResult: FraudScoreResult): FraudReportDetails {
    const violationsByType = new Map<ViolationType, FraudViolation[]>();
    const violationsBySeverity = new Map<FraudSeverity, FraudViolation[]>();

    // Group violations
    scoreResult.aggregatedViolations.forEach(violation => {
      // By type
      const typeViolations = violationsByType.get(violation.type) || [];
      typeViolations.push(violation);
      violationsByType.set(violation.type, typeViolations);

      // By severity
      const severityViolations = violationsBySeverity.get(violation.severity) || [];
      severityViolations.push(violation);
      violationsBySeverity.set(violation.severity, severityViolations);
    });

    // Generate timeline
    const timeline = this.generateTimeline(scoreResult);

    return {
      violationsByType,
      violationsBySeverity,
      detectorResults: scoreResult.detectorScores,
      timeline,
      recommendations: scoreResult.recommendations
    };
  }

  private generateVisualizations(scoreResult: FraudScoreResult): FraudVisualization[] {
    const visualizations: FraudVisualization[] = [];

    // Score distribution by detector
    visualizations.push({
      type: 'bar',
      title: 'Fraud Scores by Detector',
      data: {
        labels: Array.from(scoreResult.detectorScores.keys()),
        values: Array.from(scoreResult.detectorScores.values())
      },
      description: 'Individual scores from each fraud detection component'
    });

    // Violation severity distribution
    const severityCounts = this.countBySeverity(scoreResult.aggregatedViolations);
    visualizations.push({
      type: 'pie',
      title: 'Violations by Severity',
      data: {
        labels: Array.from(severityCounts.keys()),
        values: Array.from(severityCounts.values())
      },
      description: 'Distribution of violations across severity levels'
    });

    // Risk score gauge
    visualizations.push({
      type: 'gauge',
      title: 'Overall Risk Score',
      data: {
        value: scoreResult.overallScore,
        max: 100,
        zones: [
          { min: 0, max: 10, color: 'green', label: 'None' },
          { min: 11, max: 30, color: 'yellow', label: 'Low' },
          { min: 31, max: 60, color: 'orange', label: 'Medium' },
          { min: 61, max: 85, color: 'red', label: 'High' },
          { min: 86, max: 100, color: 'darkred', label: "Critical" }
        ]
      },
      description: 'Aggregated risk score from all detectors'
    });

    return visualizations;
  }

  private generateTimeline(scoreResult: FraudScoreResult): TimelineEntry[] {
    const timeline: TimelineEntry[] = [];
    const now = scoreResult.timestamp;

    // Add detection start
    timeline.push({
      timestamp: new Date(now.getTime() - 1000),
      event: 'Fraud detection initiated',
      severity: FraudSeverity.LOW
    });

    // Add key violations as timeline entries
    scoreResult.aggregatedViolations
      .filter(v => v.severity === FraudSeverity.HIGH || v.severity === FraudSeverity.CRITICAL)
      .forEach((violation, index) => {
        timeline.push({
          timestamp: new Date(now.getTime() - 500 + index * 100),
          event: `${violation.type} detected`,
          severity: violation.severity,
          details: violation.message
        });
      });

    // Add completion
    timeline.push({
      timestamp: now,
      event: 'Fraud detection completed',
      severity: FraudSeverity.LOW,
      details: `Risk level: ${scoreResult.riskLevel}`
    });

    return timeline;
  }

  private identifyTopRisks(violations: FraudViolation[]): string[] {
    const riskPriority: Record<ViolationType, number> = {
      [ViolationType.COMMAND_INJECTION]: 10,
      [ViolationType.SQL_INJECTION]: 9,
      [ViolationType.PATH_TRAVERSAL]: 8,
      [ViolationType.XSS_ATTEMPT]: 7,
      [ViolationType.UNAUTHORIZED_ACCESS]: 6,
      [ViolationType.MOCK_USAGE]: 5,
      [ViolationType.RATE_LIMIT_EXCEEDED]: 4,
      [ViolationType.UNUSUAL_BEHAVIOR]: 3,
      [ViolationType.STATISTICAL_ANOMALY]: 2,
      [ViolationType.SUSPICIOUS_PATTERN]: 2,
      [ViolationType.INVALID_FORMAT]: 1,
      [ViolationType.STUB_USAGE]: 1,
      [ViolationType.SPY_USAGE]: 1,
      [ViolationType.FAKE_USAGE]: 1,
      [ViolationType.PATTERN_DEVIATION]: 1,
    };

    const risks = violations
      .map(v => ({
        type: v.type,
        priority: riskPriority[v.type] || 0,
        message: v.message
      }))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5)
      .map(r => r.message);

    return [...new Set(risks)];
  }

  private countBySeverity(violations: FraudViolation[]): Map<string, number> {
    const counts = new Map<string, number>();
    
    Object.values(FraudSeverity).forEach(severity => {
      counts.set(severity, 0);
    });

    violations.forEach(violation => {
      counts.set(violation.severity, (counts.get(violation.severity) || 0) + 1);
    });

    return counts;
  }

  private exportAsJSON(report: FraudReport): string {
    return JSON.stringify(report, (key, value) => {
      if (value instanceof Map) {
        return Object.fromEntries(value);
      }
      return value;
    }, 2);
  }

  private exportAsCSV(report: FraudReport): string {
    const rows: string[][] = [];
    
    // Header
    rows.push(['Fraud Detection Report']);
    rows.push(["Generated", report.timestamp.toISOString()]);
    rows.push([]);
    
    // Summary
    rows.push(['Summary']);
    rows.push(['Overall Score', report.summary.overallScore.toString()]);
    rows.push(['Risk Level', report.summary.riskLevel]);
    rows.push(['Total Violations', report.summary.totalViolations.toString()]);
    rows.push(['Critical Violations', report.summary.criticalViolations.toString()]);
    rows.push(['Passed', report.summary.passed.toString()]);
    rows.push([]);
    
    // Violations
    rows.push(["Violations"]);
    rows.push(['Type', "Severity", 'Message', "Evidence"]);
    
    report.details.violationsByType.forEach((violations, type) => {
      violations.forEach(v => {
        rows.push([
          type,
          v.severity,
          v.message,
          v.evidence ? JSON.stringify(v.evidence) : ''
        ]);
      });
    });
    
    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }

  private exportAsHTML(report: FraudReport): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Fraud Detection Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 10px; }
        .summary { margin: 20px 0; }
        .risk-${RiskLevel.NONE} { color: green; }
        .risk-${RiskLevel.LOW} { color: #DAA520; }
        .risk-${RiskLevel.MEDIUM} { color: orange; }
        .risk-${RiskLevel.HIGH} { color: red; }
        .risk-${RiskLevel.CRITICAL} { color: darkred; font-weight: bold; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f5f5f5; }
        .severity-${FraudSeverity.LOW} { background: #ffffcc; }
        .severity-${FraudSeverity.MEDIUM} { background: #ffe6cc; }
        .severity-${FraudSeverity.HIGH} { background: #ffcccc; }
        .severity-${FraudSeverity.CRITICAL} { background: #ff9999; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Fraud Detection Report</h1>
        <p>Generated: ${report.timestamp.toLocaleString()}</p>
    </div>
    
    <div class="summary">
        <h2>Summary</h2>
        <p>Overall Score: <strong>${report.summary.overallScore}</strong></p>
        <p>Risk Level: <span class="risk-${report.summary.riskLevel}">${report.summary.riskLevel.toUpperCase()}</span></p>
        <p>Total Violations: ${report.summary.totalViolations}</p>
        <p>Critical Violations: ${report.summary.criticalViolations}</p>
        <p>Status: ${report.summary.passed ? '✅ PASSED' : '❌ FAILED'}</p>
    </div>
    
    <h2>Top Risks</h2>
    <ul>
        ${report.summary.topRisks.map(risk => `<li>${risk}</li>`).join('')}
    </ul>
    
    <h2>Violations</h2>
    <table>
        <tr>
            <th>Type</th>
            <th>Severity</th>
            <th>Message</th>
        </tr>
        ${Array.from(report.details.violationsByType.entries())
          .flatMap(([type, violations]) => 
            violations.map(v => `
                <tr class="severity-${v.severity}">
                    <td>${type}</td>
                    <td>${v.severity}</td>
                    <td>${v.message}</td>
                </tr>
            `)
          ).join('')}
    </table>
    
    <h2>Recommendations</h2>
    <ul>
        ${report.details.recommendations.map(rec => `<li>${rec}</li>`).join('')}
    </ul>
</body>
</html>`;
  }

  private exportAsMarkdown(report: FraudReport): string {
    const riskEmoji = {
      [RiskLevel.NONE]: '✅',
      [RiskLevel.LOW]: '⚠️',
      [RiskLevel.MEDIUM]: '🟠',
      [RiskLevel.HIGH]: '🔴',
      [RiskLevel.CRITICAL]: '🚨'
    };

    return `# Fraud Detection Report

Generated: ${report.timestamp.toLocaleString()}

## Summary

- **Overall Score**: ${report.summary.overallScore}/100
- **Risk Level**: ${riskEmoji[report.summary.riskLevel]} ${report.summary.riskLevel.toUpperCase()}
- **Total Violations**: ${report.summary.totalViolations}
- **Critical Violations**: ${report.summary.criticalViolations}
- **Status**: ${report.summary.passed ? '✅ PASSED' : '❌ FAILED'}

## Top Risks

${report.summary.topRisks.map(risk => `- ${risk}`).join('\n')}

## Detector Results

| Detector | Score |
|----------|-------|
${Array.from(report.details.detectorResults.entries())
  .map(([detector, score]) => `| ${detector} | ${score} |`)
  .join('\n')}

## Violations by Severity

${Array.from(report.details.violationsBySeverity.entries())
  .map(([severity, violations]) => `### ${severity.toUpperCase()} (${violations.length})

${violations.map(v => `- **${v.type}**: ${v.message}`).join('\n')}`)
  .join('\n\n')}

## Recommendations

${report.details.recommendations.map(rec => `- ${rec}`).join('\n')}

## Timeline

${report.details.timeline.map(entry => 
  `- **${entry.timestamp.toLocaleTimeString()}**: ${entry.event}${entry.details ? ` - ${entry.details}` : ''}`
).join('\n')}
`;
  }
}