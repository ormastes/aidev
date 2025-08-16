import { AggregatedCoverage, CoverageReport } from '../models/coverage-metrics';
import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';

export class CoverageReportGenerator {
  private readonly outputDir: string;
  private readonly thresholds = {
    systemTestClassCoverage: 80,
    branchCoverage: 80,
    duplication: 5
  };

  constructor(outputDir: string = path.join(process.cwd(), 'gen/doc/coverage')) {
    this.outputDir = outputDir;
    this.ensureOutputDir();
  }

  private ensureOutputDir(): void {
    if (!fs.existsSync(this.outputDir)) {
      await fileAPI.createDirectory(this.outputDir);
    }
  }

  async generateReport(appCoverage: AggregatedCoverage): Promise<void> {
    const report: CoverageReport = {
      app: appCoverage,
      epics: appCoverage.children?.filter(c => c.type === 'epic') || [],
      themes: appCoverage.children?.filter(c => c.type === 'theme') || [],
      userStories: this.extractAllUserStories(appCoverage),
      generatedAt: new Date(),
      thresholds: this.thresholds
    };

    // Generate JSON report
    await this.generateJsonReport(report);

    // Generate HTML report
    await this.generateHtmlReport(report);

    // Generate summary report
    await this.generateSummaryReport(report);
  }

  private extractAllUserStories(coverage: AggregatedCoverage): AggregatedCoverage[] {
    const stories: AggregatedCoverage[] = [];
    
    const extract = (node: AggregatedCoverage) => {
      if (node.type === 'user-story') {
        stories.push(node);
      }
      if (node.children) {
        node.children.forEach(extract);
      }
    };

    extract(coverage);
    return stories;
  }

  private async generateJsonReport(report: CoverageReport): Promise<void> {
    const jsonPath = path.join(this.outputDir, 'coverage-report.json');
    await fileAPI.createFile(jsonPath, JSON.stringify(report, { type: FileType.TEMPORARY }));
  }

  private async generateHtmlReport(report: CoverageReport): Promise<void> {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>App Coverage Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        h1, h2, h3 {
            color: #333;
        }
        .summary-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
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
            margin: 10px 0;
        }
        .metric-label {
            color: #666;
            font-size: 0.9em;
        }
        .pass { color: #28a745; }
        .warn { color: #ffc107; }
        .fail { color: #dc3545; }
        .hierarchy {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-top: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .tree-node {
            margin-left: 20px;
            padding: 10px 0;
            border-left: 2px solid #e0e0e0;
            position: relative;
        }
        .tree-node::before {
            content: '';
            position: absolute;
            left: -2px;
            top: 20px;
            width: 15px;
            height: 2px;
            background: #e0e0e0;
        }
        .node-header {
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
        }
        .node-header:hover {
            background: #f8f9fa;
            border-radius: 4px;
            padding: 5px;
            margin: -5px;
        }
        .node-metrics {
            display: flex;
            gap: 15px;
            font-size: 0.9em;
            margin-left: 25px;
            margin-top: 5px;
        }
        .node-type {
            background: #007bff;
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.8em;
        }
        .threshold-warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 20px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #e0e0e0;
        }
        th {
            background: #f8f9fa;
            font-weight: 600;
        }
        .timestamp {
            color: #666;
            font-size: 0.9em;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>App Coverage Report</h1>
        
        ${this.generateThresholdWarnings(report)}
        
        <div class="summary-card">
            <h2>Overall Coverage Summary</h2>
            <div class="metrics-grid">
                ${this.generateMetricCard('System Test Class Coverage', report.app.systemTestCoverage.classCoveragePct, '%', this.thresholds.systemTestClassCoverage)}
                ${this.generateMetricCard('Branch Coverage', report.app.coverage.branches.pct, '%', this.thresholds.branchCoverage)}
                ${this.generateMetricCard('Line Coverage', report.app.coverage.lines.pct, '%')}
                ${this.generateMetricCard('Function Coverage', report.app.coverage.functions.pct, '%')}
                ${this.generateMetricCard('Code Duplication', report.app.duplication.duplicationPct, '%', this.thresholds.duplication, true)}
            </div>
        </div>

        <div class="hierarchy">
            <h2>Coverage Hierarchy</h2>
            ${this.generateHierarchyHtml(report.app)}
        </div>

        <div class="summary-card">
            <h2>Epic Summary</h2>
            <table>
                <thead>
                    <tr>
                        <th>Epic</th>
                        <th>System Test Coverage</th>
                        <th>Branch Coverage</th>
                        <th>Line Coverage</th>
                        <th>Duplication</th>
                    </tr>
                </thead>
                <tbody>
                    ${report.epics.map(epic => `
                        <tr>
                            <td>${epic.name}</td>
                            <td class="${this.getStatusClass(epic.systemTestCoverage.classCoveragePct, this.thresholds.systemTestClassCoverage)}">${epic.systemTestCoverage.classCoveragePct.toFixed(1)}%</td>
                            <td class="${this.getStatusClass(epic.coverage.branches.pct, this.thresholds.branchCoverage)}">${epic.coverage.branches.pct.toFixed(1)}%</td>
                            <td>${epic.coverage.lines.pct.toFixed(1)}%</td>
                            <td class="${this.getStatusClass(epic.duplication.duplicationPct, this.thresholds.duplication, true)}">${epic.duplication.duplicationPct.toFixed(1)}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="summary-card">
            <h2>Theme Summary</h2>
            <table>
                <thead>
                    <tr>
                        <th>Theme</th>
                        <th>System Test Coverage</th>
                        <th>Branch Coverage</th>
                        <th>Line Coverage</th>
                        <th>Duplication</th>
                    </tr>
                </thead>
                <tbody>
                    ${report.themes.map(theme => `
                        <tr>
                            <td>${theme.name}</td>
                            <td class="${this.getStatusClass(theme.systemTestCoverage.classCoveragePct, this.thresholds.systemTestClassCoverage)}">${theme.systemTestCoverage.classCoveragePct.toFixed(1)}%</td>
                            <td class="${this.getStatusClass(theme.coverage.branches.pct, this.thresholds.branchCoverage)}">${theme.coverage.branches.pct.toFixed(1)}%</td>
                            <td>${theme.coverage.lines.pct.toFixed(1)}%</td>
                            <td class="${this.getStatusClass(theme.duplication.duplicationPct, this.thresholds.duplication, true)}">${theme.duplication.duplicationPct.toFixed(1)}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <p class="timestamp">Generated at: ${report.generatedAt.toLocaleString()}</p>
    </div>
</body>
</html>
    `;

    const htmlPath = path.join(this.outputDir, 'coverage-report.html');
    await fileAPI.createFile(htmlPath, html, { type: FileType.TEMPORARY });
  }

  private generateThresholdWarnings(report: CoverageReport): string {
    const warnings: string[] = [];

    if (report.app.systemTestCoverage.classCoveragePct < this.thresholds.systemTestClassCoverage) {
      warnings.push(`System test class coverage (${report.app.systemTestCoverage.classCoveragePct.toFixed(1)}%) is below threshold (${this.thresholds.systemTestClassCoverage}%)`);
    }

    if (report.app.coverage.branches.pct < this.thresholds.branchCoverage) {
      warnings.push(`Branch coverage (${report.app.coverage.branches.pct.toFixed(1)}%) is below threshold (${this.thresholds.branchCoverage}%)`);
    }

    if (report.app.duplication.duplicationPct > this.thresholds.duplication) {
      warnings.push(`Code duplication (${report.app.duplication.duplicationPct.toFixed(1)}%) exceeds threshold (${this.thresholds.duplication}%)`);
    }

    if (warnings.length === 0) return '';

    return `
        <div class="threshold-warning">
            <strong>⚠️ Coverage Warnings:</strong>
            <ul>
                ${warnings.map(w => `<li>${w}</li>`).join('')}
            </ul>
        </div>
    `;
  }

  private generateMetricCard(label: string, value: number, unit: string, threshold?: number, inverse: boolean = false): string {
    let statusClass = '';
    if (threshold !== undefined) {
      statusClass = this.getStatusClass(value, threshold, inverse);
    }

    return `
        <div class="metric-card">
            <div class="metric-label">${label}</div>
            <div class="metric-value ${statusClass}">${value.toFixed(1)}${unit}</div>
            ${threshold !== undefined ? `<div class="metric-label">Threshold: ${threshold}${unit}</div>` : ''}
        </div>
    `;
  }

  private getStatusClass(value: number, threshold: number, inverse: boolean = false): string {
    if (inverse) {
      if (value <= threshold) return 'pass';
      if (value <= threshold * 1.5) return 'warn';
      return 'fail';
    } else {
      if (value >= threshold) return 'pass';
      if (value >= threshold * 0.8) return 'warn';
      return 'fail';
    }
  }

  private generateHierarchyHtml(node: AggregatedCoverage, level: number = 0): string {
    const indent = level > 0 ? 'tree-node' : '';
    
    return `
        <div class="${indent}">
            <div class="node-header">
                <span class="node-type">${node.type}</span>
                <strong>${node.name}</strong>
            </div>
            <div class="node-metrics">
                <span>System Test: ${node.systemTestCoverage.classCoveragePct.toFixed(1)}%</span>
                <span>Branch: ${node.coverage.branches.pct.toFixed(1)}%</span>
                <span>Line: ${node.coverage.lines.pct.toFixed(1)}%</span>
                <span>Duplication: ${node.duplication.duplicationPct.toFixed(1)}%</span>
            </div>
            ${node.children ? node.children.map(child => this.generateHierarchyHtml(child, level + 1)).join('') : ''}
        </div>
    `;
  }

  private async generateSummaryReport(report: CoverageReport): Promise<void> {
    const summary = `# Coverage Summary Report

Generated: ${report.generatedAt.toISOString()}

## Overall Metrics
- **System Test Class Coverage**: ${report.app.systemTestCoverage.classCoveragePct.toFixed(1)}% (${report.app.systemTestCoverage.coveredClassCount}/${report.app.systemTestCoverage.classCount} classes)
- **Branch Coverage**: ${report.app.coverage.branches.pct.toFixed(1)}% (${report.app.coverage.branches.covered}/${report.app.coverage.branches.total} branches)
- **Line Coverage**: ${report.app.coverage.lines.pct.toFixed(1)}% (${report.app.coverage.lines.covered}/${report.app.coverage.lines.total} lines)
- **Function Coverage**: ${report.app.coverage.functions.pct.toFixed(1)}% (${report.app.coverage.functions.covered}/${report.app.coverage.functions.total} functions)
- **Code Duplication**: ${report.app.duplication.duplicationPct.toFixed(1)}% (${report.app.duplication.duplicatedLines}/${report.app.duplication.totalLines} lines)

## Thresholds
- System Test Class Coverage: ${this.thresholds.systemTestClassCoverage}%
- Branch Coverage: ${this.thresholds.branchCoverage}%
- Code Duplication: ${this.thresholds.duplication}%

## Epic Coverage
${report.epics.map(epic => `
### ${epic.name}
- System Test: ${epic.systemTestCoverage.classCoveragePct.toFixed(1)}%
- Branch: ${epic.coverage.branches.pct.toFixed(1)}%
- Line: ${epic.coverage.lines.pct.toFixed(1)}%
- Duplication: ${epic.duplication.duplicationPct.toFixed(1)}%
`).join('')}

## Theme Coverage
${report.themes.map(theme => `
### ${theme.name}
- System Test: ${theme.systemTestCoverage.classCoveragePct.toFixed(1)}%
- Branch: ${theme.coverage.branches.pct.toFixed(1)}%
- Line: ${theme.coverage.lines.pct.toFixed(1)}%
- Duplication: ${theme.duplication.duplicationPct.toFixed(1)}%
`).join('')}
`;

    const summaryPath = path.join(this.outputDir, 'coverage-summary.md');
    await fileAPI.createFile(summaryPath, summary, { type: FileType.TEMPORARY });
  }
}