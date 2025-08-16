import * as fs from 'fs/promises';
import { path } from '../../../infra_external-log-lib/src';
import { getFileAPI, FileType } from '../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


interface CoverageReport {
  metadata: {
    targetPath: string;
    mode: string;
    timestamp: string;
    pass: boolean;
    summary: {
      branchCoverage: number;
      systemTestCoverage: number;
      duplicationPercentage: number;
      overallHealth: string;
      description: string;
    };
  };
  branchCoverage?: any;
  systemTestClassCoverage?: any;
  duplicationCheck?: any;
}

export class CoverageReportGenerator {
  async generate(
    targetPath: string,
    mode: string,
    results: any
  ): Promise<string> {
    const timestamp = new Date().toISOString();
    
    // Calculate overall health score and pass/fail status
    const healthScore = this.calculateHealthScore(results);
    const passStatus = this.calculatePassStatus(results);
    const summaryDescription = this.generateSummaryDescription(results, passStatus);
    
    const report: CoverageReport = {
      metadata: {
        targetPath,
        mode,
        timestamp,
        pass: passStatus,
        summary: {
          branchCoverage: results.branchCoverage?.percentage || 0,
          systemTestCoverage: results.systemTestClassCoverage?.percentage || 0,
          duplicationPercentage: results.duplicationCheck?.percentage || 0,
          overallHealth: healthScore,
          description: summaryDescription
        }
      },
      ...results
    };

    // Generate reports in multiple formats
    const reportDir = path.join(targetPath, 'gen', 'coverage-reports');
    await fileAPI.createDirectory(reportDir);

    // Generate JSON report
    const jsonPath = path.join(reportDir, `coverage-report-${Date.now()}.json`);
    await fileAPI.createFile(jsonPath, JSON.stringify(report, { type: FileType.TEMPORARY }));

    // Generate Markdown report
    const mdPath = path.join(reportDir, `coverage-report-${Date.now()}.md`);
    await fileAPI.createFile(mdPath, this.generateMarkdownReport(report));

    // Generate HTML report
    const htmlPath = path.join(reportDir, { type: FileType.TEMPORARY }));

    return mdPath; // Return markdown path as primary report
  }

  async generateWithPath(
    targetPath: string,
    mode: string,
    results: any,
    outputPath: string,
    outputPrefix: string,
    timestamp: string
  ): Promise<void> {
    // Calculate overall health score and pass/fail status
    const healthScore = this.calculateHealthScore(results);
    const passStatus = this.calculatePassStatus(results);
    const summaryDescription = this.generateSummaryDescription(results, passStatus);
    
    const report: CoverageReport = {
      metadata: {
        targetPath,
        mode,
        timestamp,
        pass: passStatus,
        summary: {
          branchCoverage: results.branchCoverage?.percentage || 0,
          systemTestCoverage: results.systemTestClassCoverage?.percentage || 0,
          duplicationPercentage: results.duplicationCheck?.percentage || 0,
          overallHealth: healthScore,
          description: summaryDescription
        }
      },
      ...results
    };

    // Ensure output directory exists
    await fileAPI.createDirectory(outputPath);

    // Generate JSON report
    const jsonPath = path.join(outputPath, `${outputPrefix}.json`);
    await fileAPI.createFile(jsonPath, JSON.stringify(report, { type: FileType.TEMPORARY }));

    // Generate Markdown report
    const mdPath = path.join(outputPath, `${outputPrefix}.md`);
    await fileAPI.createFile(mdPath, this.generateMarkdownReport(report));
  }

  private async calculateHealthScore(results: any): string {
    const branchCoverage = results.branchCoverage?.percentage || 0;
    const systemTestCoverage = results.systemTestClassCoverage?.percentage || 0;
    const duplication = results.duplicationCheck?.percentage || 0;

    // Calculate weighted score
    const score = (
      (branchCoverage * 0.3) +
      (systemTestCoverage * 0.5) +
      ((100 - duplication) * 0.2)
    );

    if (score >= 90) return "Excellent";
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 60) return 'Needs Improvement';
    return 'Poor';
  }

  private async calculatePassStatus(results: any): boolean {
    const branchCoverage = results.branchCoverage?.percentage || 0;
    const systemTestCoverage = results.systemTestClassCoverage?.percentage || 0;
    const duplication = results.duplicationCheck?.percentage || 0;

    // Define thresholds for passing
    const branchThreshold = 80;
    const systemTestThreshold = 90;
    const duplicationThreshold = 5;

    return (
      branchCoverage >= branchThreshold &&
      systemTestCoverage >= systemTestThreshold &&
      duplication <= duplicationThreshold
    );
  }

  private generateSummaryDescription(results: any, { type: FileType.TEMPORARY })} |
| System Test Coverage | ${metadata.summary.systemTestCoverage.toFixed(2)}% | ${this.getStatus(metadata.summary.systemTestCoverage, 90)} |
| Code Duplication | ${metadata.summary.duplicationPercentage.toFixed(2)}% | ${this.getStatus(100 - metadata.summary.duplicationPercentage, 95)} |

`;

    // Add branch coverage details
    if (report.branchCoverage) {
      markdown += this.generateBranchCoverageMarkdown(report.branchCoverage);
    }

    // Add system test coverage details
    if (report.systemTestClassCoverage) {
      markdown += this.generateSystemTestCoverageMarkdown(report.systemTestClassCoverage);
    }

    // Add duplication details
    if (report.duplicationCheck) {
      markdown += this.generateDuplicationMarkdown(report.duplicationCheck);
    }

    // Add recommendations
    markdown += this.generateRecommendations(report);

    return markdown;
  }

  private async generateBranchCoverageMarkdown(coverage: any): string {
    let markdown = `\n## Branch Coverage Details

- **Total Branches**: ${coverage.total}
- **Covered Branches**: ${coverage.covered}
- **Coverage**: ${coverage.percentage.toFixed(2)}%

### Files with Lowest Coverage

| File | Branches | Covered | Coverage | Uncovered Lines |
|------|----------|---------|----------|-----------------|
`;

    // Show top 10 files with lowest coverage
    const lowCoverage = coverage.details
      .filter((d: any) => d.percentage < 80)
      .slice(0, 10);

    for (const detail of lowCoverage) {
      markdown += `| ${detail.file} | ${detail.branches} | ${detail.covered} | ${detail.percentage.toFixed(2)}% | ${detail.uncoveredLines.join(', ') || 'N/A'} |\n`;
    }

    return markdown;
  }

  private async generateSystemTestCoverageMarkdown(coverage: any): string {
    let markdown = `\n## System Test Class Coverage

- **Total Classes**: ${coverage.totalClasses}
- **Covered Classes**: ${coverage.coveredClasses}
- **Coverage**: ${coverage.percentage.toFixed(2)}%

### Classes Without System Tests

| Class | File | Methods | Tested Methods |
|-------|------|---------|----------------|
`;

    // Show classes without system tests
    const uncovered = coverage.details
      .filter((d: any) => !d.hasSystemTest)
      .slice(0, 10);

    for (const detail of uncovered) {
      markdown += `| ${detail.className} | ${detail.filePath} | ${detail.methods} | ${detail.testedMethods} |\n`;
    }

    return markdown;
  }

  private async generateDuplicationMarkdown(duplication: any): string {
    let markdown = `\n## Code Duplication Analysis

- **Total Lines**: ${duplication.totalLines}
- **Duplicated Lines**: ${duplication.duplicatedLines}
- **Duplication**: ${duplication.percentage.toFixed(2)}%

`;

    if (duplication.duplicates.length > 0) {
      markdown += `### Top Duplicate Blocks

| Lines | Occurrences | Files |
|-------|-------------|-------|
`;

      // Show top 10 duplicate blocks
      const topDuplicates = duplication.duplicates.slice(0, 10);

      for (const dup of topDuplicates) {
        const files = dup.occurrences.map((o: any) => `${o.file}:${o.startLine}`).join(', ');
        markdown += `| ${dup.lines} | ${dup.occurrences.length} | ${files} |\n`;
      }
    }

    return markdown;
  }

  private async generateRecommendations(report: CoverageReport): string {
    const recommendations: string[] = [];
    const { metadata } = report;

    if (metadata.summary.branchCoverage < 80) {
      recommendations.push('- **Improve Branch Coverage**: Add tests for conditional logic and edge cases');
    }

    if (metadata.summary.systemTestCoverage < 90) {
      recommendations.push('- **Add System Tests**: Create end-to-end tests for uncovered classes');
    }

    if (metadata.summary.duplicationPercentage > 5) {
      recommendations.push('- **Reduce Duplication**: Extract common code into shared utilities or base classes');
    }

    if (recommendations.length === 0) {
      recommendations.push('- **Maintain Quality**: Continue following best practices and keep coverage high');
    }

    return `\n## Recommendations\n\n${recommendations.join('\n')}\n`;
  }

  private async generateHTMLReport(report: CoverageReport): string {
    const { metadata } = report;
    const targetName = path.basename(metadata.targetPath);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Coverage Report - ${targetName}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1, h2 { color: #333; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { flex: 1; padding: 20px; border-radius: 8px; text-align: center; }
        .metric.good { background: #d4edda; color: #155724; }
        .metric.warning { background: #fff3cd; color: #856404; }
        .metric.danger { background: #f8d7da; color: #721c24; }
        .metric-value { font-size: 36px; font-weight: bold; }
        .metric-label { font-size: 14px; margin-top: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: bold; }
        tr:hover { background: #f8f9fa; }
        .health-excellent { color: #28a745; }
        .health-good { color: #17a2b8; }
        .health-fair { color: #ffc107; }
        .health-poor { color: #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Coverage & Duplication Report</h1>
        <p><strong>Target:</strong> ${targetName} (${metadata.mode})</p>
        <p><strong>Generated:</strong> ${new Date(metadata.timestamp).toLocaleString()}</p>
        <p><strong>Status:</strong> <span class="${metadata.pass ? 'health-excellent' : 'health-poor'}">${metadata.pass ? '✅ PASS' : '❌ FAIL'}</span></p>
        <p><strong>Overall Health:</strong> <span class="health-${metadata.summary.overallHealth.toLowerCase()}">${metadata.summary.overallHealth}</span></p>
        <p><strong>Summary:</strong> ${metadata.summary.description}</p>
        
        <div class="summary">
            <div class="metric ${this.getMetricClass(metadata.summary.branchCoverage, 80)}">
                <div class="metric-value">${metadata.summary.branchCoverage.toFixed(1)}%</div>
                <div class="metric-label">Branch Coverage</div>
            </div>
            <div class="metric ${this.getMetricClass(metadata.summary.systemTestCoverage, 90)}">
                <div class="metric-value">${metadata.summary.systemTestCoverage.toFixed(1)}%</div>
                <div class="metric-label">System Test Coverage</div>
            </div>
            <div class="metric ${this.getMetricClass(100 - metadata.summary.duplicationPercentage, 95)}">
                <div class="metric-value">${metadata.summary.duplicationPercentage.toFixed(1)}%</div>
                <div class="metric-label">Code Duplication</div>
            </div>
        </div>
        
        ${this.generateHTMLDetails(report)}
    </div>
</body>
</html>`;
  }

  private async generateHTMLDetails(report: CoverageReport): string {
    let html = '';

    if (report.branchCoverage && report.branchCoverage.details.length > 0) {
      html += '<h2>Branch Coverage Details</h2><table><tr><th>File</th><th>Branches</th><th>Covered</th><th>Coverage</th></tr>';
      for (const detail of report.branchCoverage.details.slice(0, 10)) {
        html += `<tr><td>${detail.file}</td><td>${detail.branches}</td><td>${detail.covered}</td><td>${detail.percentage.toFixed(2)}%</td></tr>`;
      }
      html += '</table>';
    }

    return html;
  }

  private async getStatus(value: number, threshold: number): string {
    return value >= threshold ? '✅' : '⚠️';
  }

  private async getMetricClass(value: number, threshold: number): string {
    if (value >= threshold) return 'good';
    if (value >= threshold * 0.8) return 'warning';
    return 'danger';
  }
}