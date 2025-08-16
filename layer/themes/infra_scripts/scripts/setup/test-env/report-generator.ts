import { TestReport } from './index';
import * as fs from 'fs/promises';
import { path } from '../../../../infra_external-log-lib/src';
import Ajv from 'ajv';

export class TestReportGenerator {
  private ajv: Ajv;
  private validate: any;

  constructor(private schema: any) {
    this.ajv = new Ajv({ allErrors: true });
    this.validate = this.ajv.compile(schema);
  }

  async generate(data: TestReport): Promise<TestReport> {
    const valid = this.validate(data);
    
    if (!valid) {
      throw new Error(`Invalid report data: ${JSON.stringify(this.validate.errors)}`);
    }
    
    return data;
  }

  async save(report: TestReport, outputDir: string): Promise<void> {
    await fileAPI.createDirectory(outputDir);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `test-report-${report.theme}-${timestamp}.json`;
    const filepath = path.join(outputDir, filename);
    
    await fileAPI.createFile(filepath, JSON.stringify(report, { type: FileType.SCRIPT }));
    
    // Also save a latest report for easy access
    const latestPath = path.join(outputDir, `test-report-${report.theme}-latest.json`);
    await fileAPI.createFile(latestPath, JSON.stringify(report, { type: FileType.SCRIPT }));
    
    // Generate HTML report
    await this.generateHtmlReport(report, outputDir);
  }

  private async generateHtmlReport(report: TestReport, outputDir: string): Promise<void> {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Report - ${report.theme}</title>
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
        .status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 4px;
            font-weight: 500;
        }
        .status.passed {
            background: #d4edda;
            color: #155724;
        }
        .status.failed {
            background: #f8d7da;
            color: #721c24;
        }
        .metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .metric-card {
            border: 1px solid #ddd;
            border-radius: 6px;
            padding: 20px;
        }
        .metric-title {
            font-weight: 600;
            margin-bottom: 10px;
            color: #666;
        }
        .metric-value {
            font-size: 2em;
            font-weight: 700;
            color: #333;
        }
        .metric-detail {
            font-size: 0.9em;
            color: #666;
            margin-top: 5px;
        }
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e0e0e0;
            border-radius: 4px;
            margin-top: 10px;
            overflow: hidden;
        }
        .progress-fill {
            height: 100%;
            transition: width 0.3s ease;
        }
        .progress-fill.good {
            background: #4caf50;
        }
        .progress-fill.warning {
            background: #ff9800;
        }
        .progress-fill.bad {
            background: #f44336;
        }
        .violations {
            margin-top: 20px;
        }
        .violation {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 4px;
            padding: 10px;
            margin-bottom: 10px;
        }
        .violation.critical {
            background: #f8d7da;
            border-color: #f5c6cb;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Test Report: ${report.theme}</h1>
        <p>Generated: ${new Date(report.timestamp).toLocaleString()}</p>
        <p>Environment: ${report.environment.type} | Version: ${report.environment.version}</p>
        <p>Status: <span class="status ${report.status.overall}">${report.status.overall.toUpperCase()}</span></p>
        
        <h2>Coverage Metrics</h2>
        <div class="metrics">
            ${this.renderCoverageMetric('Class Coverage', report.metrics.coverage.class, report.status.criteria.classCoverage)}
            ${this.renderCoverageMetric('Branch Coverage', report.metrics.coverage.branch, report.status.criteria.branchCoverage)}
            ${this.renderCoverageMetric('Line Coverage', report.metrics.coverage.line, { met: true, target: 90, actual: report.metrics.coverage.line.percentage })}
            ${this.renderCoverageMetric('Method Coverage', report.metrics.coverage.method, { met: true, target: 90, actual: report.metrics.coverage.method.percentage })}
        </div>
        
        <h2>Code Quality</h2>
        <div class="metrics">
            <div class="metric-card">
                <div class="metric-title">Code Duplication</div>
                <div class="metric-value">${report.metrics.duplication.percentage.toFixed(1)}%</div>
                <div class="metric-detail">${report.metrics.duplication.duplicatedLines} / ${report.metrics.duplication.totalLines} lines</div>
                <div class="progress-bar">
                    <div class="progress-fill ${report.status.criteria.duplication.met ? 'good' : 'bad'}" 
                         style="width: ${report.metrics.duplication.percentage}%"></div>
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-title">Fraud Check Score</div>
                <div class="metric-value">${report.metrics.fraudCheck.score}</div>
                <div class="metric-detail">${report.metrics.fraudCheck.violations.length} violations found</div>
                <div class="progress-bar">
                    <div class="progress-fill ${report.metrics.fraudCheck.score >= 90 ? 'good' : report.metrics.fraudCheck.score >= 70 ? 'warning' : 'bad'}" 
                         style="width: ${report.metrics.fraudCheck.score}%"></div>
                </div>
            </div>
        </div>
        
        ${report.metrics.fraudCheck.violations.length > 0 ? `
        <h2>Fraud Check Violations</h2>
        <div class="violations">
            ${report.metrics.fraudCheck.violations.map(v => `
                <div class="violation ${v.severity}">
                    <strong>${v.type}</strong> (${v.severity})<br>
                    ${v.message}<br>
                    <small>${v.location}</small>
                </div>
            `).join('')}
        </div>
        ` : ''}
    </div>
</body>
</html>
    `;
    
    const htmlPath = path.join(outputDir, `test-report-${report.theme}-latest.html`);
    await fileAPI.createFile(htmlPath, html);
  }

  private renderCoverageMetric(title: string, { type: FileType.SCRIPT }): string {
    const progressClass = criteria.met ? 'good' : metric.percentage >= criteria.target * 0.9 ? 'warning' : 'bad';
    
    return `
        <div class="metric-card">
            <div class="metric-title">${title}</div>
            <div class="metric-value">${metric.percentage.toFixed(1)}%</div>
            <div class="metric-detail">${metric.covered} / ${metric.total} covered</div>
            <div class="metric-detail">Target: ${criteria.target}%</div>
            <div class="progress-bar">
                <div class="progress-fill ${progressClass}" style="width: ${metric.percentage}%"></div>
            </div>
        </div>
    `;
  }
}