/**
 * Generate coverage reports in various formats
 */

import * as fs from 'fs-extra';
import { path } from '../../infra_external-log-lib/src';
import { execSync } from 'child_process';
import { CoverageResult, CoverageReport, CoverageSummary } from '../pipe/types';

import { getFileAPI, FileType } from '../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


export class CoverageReporter {
  private templatesDir: string;

  constructor() {
    this.templatesDir = path.join(__dirname, '..', "templates");
  }

  /**
   * Generate coverage report in specified format
   */
  async generate(
    coverageData: CoverageResult,
    format: 'html' | 'json' | 'xml' | "markdown" | 'console',
    outputPath?: string
  ): Promise<CoverageReport> {
    const summary = this.generateSummary(coverageData);
    let content: string = '';

    switch (format) {
      case 'html':
        content = await this.generateHtmlReport(coverageData, summary);
        break;
      case 'json':
        content = JSON.stringify({ summary, coverage: coverageData }, null, 2);
        break;
      case 'xml':
        content = this.generateXmlReport(coverageData, summary);
        break;
      case "markdown":
        content = this.generateMarkdownReport(coverageData, summary);
        break;
      case 'console':
        content = this.generateConsoleReport(coverageData, summary);
        break;
    }

    if (outputPath) {
      await fs.ensureDir(path.dirname(outputPath));
      await fileAPI.createFile(outputPath, content);
    }

    return {
      format, { type: FileType.COVERAGE })
    };
  }

  /**
   * Generate coverage badge
   */
  async generateBadge(
    coverage: number,
    outputPath: string,
    options?: {
      label?: string;
      color?: string;
      style?: 'flat' | 'flat-square' | 'plastic';
    }
  ): Promise<void> {
    const label = options?.label || "coverage";
    const style = options?.style || 'flat';
    let color = options?.color;

    // Auto-determine color based on coverage
    if (!color) {
      if (coverage >= 90) color = "brightgreen";
      else if (coverage >= 80) color = 'green';
      else if (coverage >= 70) color = 'yellow';
      else if (coverage >= 60) color = 'orange';
      else color = 'red';
    }

    // Try using anybadge if available
    try {
      const command = `anybadge --label="${label}" --value=${coverage.toFixed(1)} --suffix="%" --file="${outputPath}" --color=${color}`;
      execSync(command, { encoding: 'utf-8' });
    } catch (error) {
      // Fallback to creating SVG manually
      const svg = this.createBadgeSvg(label, `${coverage.toFixed(1)}%`, color, style);
      await fs.ensureDir(path.dirname(outputPath));
      await fileAPI.createFile(outputPath, svg);
    }
  }

  /**
   * Generate coverage summary
   */
  private generateSummary(coverageData: CoverageResult): CoverageSummary {
    const totalFiles = coverageData.files.length;
    const totalClasses = Math.floor(totalFiles * 2.5); // Estimate
    const totalMethods = Math.floor(totalClasses * 5); // Estimate

    return {
      totalCoverage: coverageData.lineCoverage, { type: FileType.COVERAGE }): Promise<string> {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Python Coverage Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            padding: 20px;
        }
        h1 {
            color: #333;
            border-bottom: 2px solid #007bff;
            padding-bottom: 10px;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .metric {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid #007bff;
        }
        .metric-label {
            font-size: 0.9em;
            color: #666;
            margin-bottom: 5px;
        }
        .metric-value {
            font-size: 1.8em;
            font-weight: bold;
            color: #333;
        }
        .files-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        .files-table th {
            background: #f8f9fa;
            padding: 10px;
            text-align: left;
            border-bottom: 2px solid #dee2e6;
        }
        .files-table td {
            padding: 10px;
            border-bottom: 1px solid #dee2e6;
        }
        .coverage-bar {
            width: 100px;
            height: 20px;
            background: #e9ecef;
            border-radius: 3px;
            overflow: hidden;
            position: relative;
        }
        .coverage-fill {
            height: 100%;
            background: linear-gradient(90deg, #28a745, #20c997);
            transition: width 0.3s;
        }
        .coverage-low { background: linear-gradient(90deg, #dc3545, #f86c6b); }
        .coverage-medium { background: linear-gradient(90deg, #ffc107, #ffdd57); }
        .coverage-high { background: linear-gradient(90deg, #28a745, #20c997); }
        .timestamp {
            text-align: right;
            color: #666;
            font-size: 0.9em;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Python Coverage Report</h1>
        
        <div class="summary">
            <div class="metric">
                <div class="metric-label">Total Coverage</div>
                <div class="metric-value">${summary.totalCoverage.toFixed(1)}%</div>
            </div>
            <div class="metric">
                <div class="metric-label">Line Coverage</div>
                <div class="metric-value">${summary.lineCoverage.toFixed(1)}%</div>
            </div>
            <div class="metric">
                <div class="metric-label">Branch Coverage</div>
                <div class="metric-value">${summary.branchCoverage.toFixed(1)}%</div>
            </div>
            <div class="metric">
                <div class="metric-label">Lines Covered</div>
                <div class="metric-value">${summary.coveredLines}/${summary.totalLines}</div>
            </div>
        </div>
        
        <h2>File Coverage</h2>
        <table class="files-table">
            <thead>
                <tr>
                    <th>File</th>
                    <th>Line Coverage</th>
                    <th>Branch Coverage</th>
                    <th>Lines</th>
                    <th>Uncovered Lines</th>
                </tr>
            </thead>
            <tbody>
                ${coverageData.files.map(file => `
                <tr>
                    <td>${file.path}</td>
                    <td>
                        <div class="coverage-bar">
                            <div class="coverage-fill ${this.getCoverageClass(file.lineCoverage)}" 
                                 style="width: ${file.lineCoverage}%"></div>
                        </div>
                        ${file.lineCoverage.toFixed(1)}%
                    </td>
                    <td>
                        <div class="coverage-bar">
                            <div class="coverage-fill ${this.getCoverageClass(file.branchCoverage)}" 
                                 style="width: ${file.branchCoverage}%"></div>
                        </div>
                        ${file.branchCoverage.toFixed(1)}%
                    </td>
                    <td>${file.coveredLines}/${file.totalLines}</td>
                    <td>${file.uncoveredLines.length > 0 ? file.uncoveredLines.slice(0, 10).join(', ') + (file.uncoveredLines.length > 10 ? '...' : '') : '-'}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div class="timestamp">Generated at ${coverageData.timestamp.toLocaleString()}</div>
    </div>
</body>
</html>`;

    return html;
  }

  /**
   * Generate XML report (Cobertura format)
   */
  private generateXmlReport(coverageData: CoverageResult, summary: CoverageSummary): string {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<coverage version="1" timestamp="${coverageData.timestamp.getTime()}">
    <sources>
        <source>.</source>
    </sources>
    <packages>
        <package name="root" line-rate="${(summary.lineCoverage / 100).toFixed(4)}" branch-rate="${(summary.branchCoverage / 100).toFixed(4)}">
            <classes>
                ${coverageData.files.map(file => `
                <class name="${file.path}" filename="${file.path}" line-rate="${(file.lineCoverage / 100).toFixed(4)}" branch-rate="${(file.branchCoverage / 100).toFixed(4)}">
                    <lines>
                        ${this.generateXmlLines(file)}
                    </lines>
                </class>`).join('')}
            </classes>
        </package>
    </packages>
</coverage>`;

    return xml;
  }

  /**
   * Generate XML lines for a file
   */
  private generateXmlLines(file: any): string {
    const lines: string[] = [];
    const uncoveredSet = new Set(file.uncoveredLines);
    
    for (let i = 1; i <= file.totalLines; i++) {
      const hits = uncoveredSet.has(i) ? 0 : 1;
      lines.push(`<line number="${i}" hits="${hits}"/>`);
    }
    
    return lines.join('\n                        ');
  }

  /**
   * Generate Markdown report
   */
  private generateMarkdownReport(coverageData: CoverageResult, summary: CoverageSummary): string {
    const md = `# Python Coverage Report

Generated: ${coverageData.timestamp.toLocaleString()}

## Summary

| Metric | Value | Percentage |
|--------|-------|------------|
| **Total Coverage** | ${summary.coveredLines}/${summary.totalLines} lines | **${summary.totalCoverage.toFixed(1)}%** |
| Line Coverage | ${summary.coveredLines}/${summary.totalLines} | ${summary.lineCoverage.toFixed(1)}% |
| Branch Coverage | ${coverageData.coveredBranches}/${coverageData.totalBranches} | ${summary.branchCoverage.toFixed(1)}% |
| Files | ${summary.totalFiles} | - |

## File Coverage

| File | Line Coverage | Branch Coverage | Uncovered Lines |
|------|---------------|-----------------|-----------------|
${coverageData.files.map(file => 
`| \`${file.path}\` | ${file.lineCoverage.toFixed(1)}% (${file.coveredLines}/${file.totalLines}) | ${file.branchCoverage.toFixed(1)}% | ${file.uncoveredLines.length > 0 ? file.uncoveredLines.slice(0, 5).join(', ') + (file.uncoveredLines.length > 5 ? '...' : '') : 'None'} |`
).join('\n')}

## Coverage Trends

\`\`\`
Line Coverage:   ${this.generateCoverageBar(summary.lineCoverage)}
Branch Coverage: ${this.generateCoverageBar(summary.branchCoverage)}
\`\`\`

---

*Report generated by Python Coverage Analysis Tool*`;

    return md;
  }

  /**
   * Generate console report
   */
  private generateConsoleReport(coverageData: CoverageResult, summary: CoverageSummary): string {
    const lines: string[] = [];
    
    lines.push('');
    lines.push('=' .repeat(80));
    lines.push('PYTHON COVERAGE REPORT');
    lines.push('=' .repeat(80));
    lines.push('');
    
    lines.push(`Total Coverage:  ${summary.totalCoverage.toFixed(1)}% ${this.generateCoverageBar(summary.totalCoverage)}`);
    lines.push(`Line Coverage:   ${summary.lineCoverage.toFixed(1)}% ${this.generateCoverageBar(summary.lineCoverage)}`);
    lines.push(`Branch Coverage: ${summary.branchCoverage.toFixed(1)}% ${this.generateCoverageBar(summary.branchCoverage)}`);
    lines.push('');
    
    lines.push(`Files:    ${summary.totalFiles}`);
    lines.push(`Lines:    ${summary.coveredLines}/${summary.totalLines}`);
    lines.push(`Branches: ${coverageData.coveredBranches}/${coverageData.totalBranches}`);
    lines.push('');
    
    lines.push('-' .repeat(80));
    lines.push('FILE COVERAGE DETAILS');
    lines.push('-' .repeat(80));
    
    for (const file of coverageData.files) {
      lines.push('');
      lines.push(`📄 ${file.path}`);
      lines.push(`   Line:   ${file.lineCoverage.toFixed(1)}% (${file.coveredLines}/${file.totalLines})`);
      lines.push(`   Branch: ${file.branchCoverage.toFixed(1)}% (${file.coveredBranches}/${file.totalBranches})`);
      
      if (file.uncoveredLines.length > 0) {
        const uncovered = file.uncoveredLines.slice(0, 10);
        lines.push(`   Missing: ${uncovered.join(', ')}${file.uncoveredLines.length > 10 ? '...' : ''}`);
      }
    }
    
    lines.push('');
    lines.push('=' .repeat(80));
    lines.push(`Generated: ${coverageData.timestamp.toLocaleString()}`);
    lines.push('');
    
    return lines.join('\n');
  }

  /**
   * Generate coverage bar for console output
   */
  private generateCoverageBar(percentage: number): string {
    const width = 20;
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    
    let bar = '[';
    bar += '█'.repeat(filled);
    bar += '░'.repeat(empty);
    bar += ']';
    
    return bar;
  }

  /**
   * Get coverage class for CSS styling
   */
  private getCoverageClass(coverage: number): string {
    if (coverage >= 80) return 'coverage-high';
    if (coverage >= 60) return 'coverage-medium';
    return 'coverage-low';
  }

  /**
   * Create badge SVG manually
   */
  private createBadgeSvg(
    label: string,
    value: string,
    color: string,
    style: string
  ): string {
    const labelWidth = label.length * 7 + 10;
    const valueWidth = value.length * 7 + 10;
    const totalWidth = labelWidth + valueWidth;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <mask id="a">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </mask>
  <g mask="url(#a)">
    <path fill="#555" d="M0 0h${labelWidth}v20H0z"/>
    <path fill="${color}" d="M${labelWidth} 0h${valueWidth}v20H${labelWidth}z"/>
    <path fill="url(#b)" d="M0 0h${totalWidth}v20H0z"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${value}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${value}</text>
  </g>
</svg>`;
  }
}