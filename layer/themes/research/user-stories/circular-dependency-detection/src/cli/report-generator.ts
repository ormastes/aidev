/**
 * Report generator for analysis results
 */

import * as fs from 'fs-extra';
import { path } from '../../../../../infra_external-log-lib/src';
import { AnalysisResult } from '../core/types';

export class ReportGenerator {
  
  /**
   * Generate a report in the specified format
   */
  async generateReport(results: AnalysisResult[], format: string, outputPath: string): Promise<void> {
    switch(format.toLowerCase()) {
      case 'json':
        await this.generateJsonReport(results, outputPath);
        break;
      case 'text':
        await this.generateTextReport(results, outputPath);
        break;
      case 'html':
        await this.generateHtmlReport(results, outputPath);
        break;
      default:
        throw new Error(`Unsupported report format: ${format}`);
    }
  }

  private async generateJsonReport(results: AnalysisResult[], outputPath: string): Promise<void> {
    const report = {
      generated_at: new Date().toISOString(),
      summary: this.generateSummary(results),
      results,
      recommendations: this.generateRecommendations(results)
    };

    await fileAPI.createFile(outputPath, JSON.stringify(report, null, 2), { type: FileType.TEMPORARY });
  }

  private async generateTextReport(results: AnalysisResult[], outputPath: string): Promise<void> {
    let report = 'CIRCULAR DEPENDENCY ANALYSIS REPORT\n';
    report += '='.repeat(50) + '\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    // Summary
    const summary = this.generateSummary(results);
    report += 'SUMMARY\n';
    report += '-'.repeat(20) + '\n';
    report += `Total Languages Analyzed: ${summary.languages_analyzed}\n`;
    report += `Total Files: ${summary.total_files}\n`;
    report += `Total Dependencies: ${summary.total_dependencies}\n`;
    report += `Total Circular Dependencies: ${summary.total_circular_dependencies}\n`;
    report += `Total Analysis Time: ${summary.total_analysis_time_ms}ms\n\n`;

    // Language-specific results
    for(const result of results) {
      report += `${result.language.toUpperCase()} ANALYSIS\n`;
      report += '-'.repeat(30) + '\n';
      report += `Status: ${result.success ? 'SUCCESS' : 'FAILED'}\n`;
      report += `Files: ${result.total_files}\n`;
      report += `Dependencies: ${result.total_dependencies}\n`;
      report += `Circular Dependencies: ${result.circular_dependencies.length}\n`;
      report += `Analysis Time: ${result.analysis_time_ms}ms\n`;

      if(result.errors.length > 0) {
        report += `\nErrors:\n`;
        for(const error of result.errors) {
          report += `  - ${error}\n`;
        }
      }

      if(result.warnings.length > 0) {
        report += `\nWarnings:\n`;
        for(const warning of result.warnings) {
          report += `  - ${warning}\n`;
        }
      }

      // Circular dependencies details
      if(result.circular_dependencies.length > 0) {
        report += `\nCircular Dependencies:\n`;
        for(let i = 0; i < result.circular_dependencies.length; i++) {
          const cycle = result.circular_dependencies[i];
          report += `\n  ${i + 1}. ${cycle.description}\n`;
          report += `     Severity: ${cycle.severity.toUpperCase()}\n`;
          report += `     Type: ${cycle.type}\n`;
          report += `     Cycle: ${cycle.cycle.join(' → ')}\n`;
          
          if(cycle.suggestions && cycle.suggestions.length > 0) {
            report += `     Suggestions:\n`;
            for(const suggestion of cycle.suggestions) {
              report += `       - ${suggestion}\n`;
            }
          }
        }
      }

      report += '\n' + '='.repeat(50) + '\n\n';
    }

    // Recommendations
    const recommendations = this.generateRecommendations(results);
    if(recommendations.length > 0) {
      report += 'RECOMMENDATIONS\n';
      report += '-'.repeat(20) + '\n';
      for(let i = 0; i < recommendations.length; i++) {
        report += `${i + 1}. ${recommendations[i]}\n`;
      }
    }

    await fileAPI.createFile(outputPath, report);
  }

  private async generateHtmlReport(results: AnalysisResult[], outputPath: string): Promise<void> {
    const summary = this.generateSummary(results);
    const recommendations = this.generateRecommendations(results);

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Circular Dependency Analysis Report</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1, h2, h3 { color: #2c3e50; }
        .summary {
            background: #ecf0f1;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .language-section {
            border-left: 4px solid #3498db;
            padding-left: 20px;
            margin: 30px 0;
        }
        .success { border-left-color: #27ae60; }
        .error { border-left-color: #e74c3c; }
        .warning { color: #f39c12; }
        .cycle {
            background: #ffeaa7;
            padding: 15px;
            margin: 10px 0;
            border-radius: 4px;
            border-left: 4px solid #fdcb6e;
        }
        .cycle.error { 
            background: #ffecec; 
            border-left-color: #e17055; 
        }
        .cycle-path {
            font-family: monospace;
            background: #2d3436;
            color: #ddd;
            padding: 8px;
            border-radius: 3px;
            margin: 10px 0;
        }
        .suggestions {
            background: #e8f8f5;
            padding: 15px;
            border-radius: 4px;
            margin: 10px 0;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .stat-card {
            background: #74b9ff;
            color: white;
            padding: 20px;
            border-radius: 5px;
            text-align: center;
        }
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            display: block;
        }
        .recommendations {
            background: #d1ecf1;
            padding: 20px;
            border-radius: 5px;
            border-left: 4px solid #17a2b8;
        }
        .timestamp {
            color: #7f8c8d;
            font-size: 0.9em;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th { background: #f8f9fa; }
        .no-cycles {
            background: #d4edda;
            color: #155724;
            padding: 15px;
            border-radius: 4px;
            text-align: center;
            font-size: 1.1em;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 Circular Dependency Analysis Report</h1>
        <p class="timestamp">Generated: ${new Date().toISOString()}</p>
        
        <div class="summary">
            <h2>📊 Summary</h2>
            <div class="stats">
                <div class="stat-card">
                    <span class="stat-number">${summary.languages_analyzed}</span>
                    Languages
                </div>
                <div class="stat-card">
                    <span class="stat-number">${summary.total_files}</span>
                    Files
                </div>
                <div class="stat-card">
                    <span class="stat-number">${summary.total_dependencies}</span>
                    Dependencies
                </div>
                <div class="stat-card" style="background: ${summary.total_circular_dependencies > 0 ? '#e17055' : '#00b894'}">
                    <span class="stat-number">${summary.total_circular_dependencies}</span>
                    Circular Dependencies
                </div>
            </div>
        </div>

        ${results.map(result => `
        <div class="language-section ${result.success ? 'success' : 'error'}">
            <h2>🛠️ ${result.language.toUpperCase()} Analysis</h2>
            
            <table>
                <tr>
                    <th>Metric</th>
                    <th>Value</th>
                </tr>
                <tr>
                    <td>Status</td>
                    <td>${result.success ? '✅ Success' : '❌ Failed'}</td>
                </tr>
                <tr>
                    <td>Files Analyzed</td>
                    <td>${result.total_files}</td>
                </tr>
                <tr>
                    <td>Dependencies Found</td>
                    <td>${result.total_dependencies}</td>
                </tr>
                <tr>
                    <td>Circular Dependencies</td>
                    <td>${result.circular_dependencies.length}</td>
                </tr>
                <tr>
                    <td>Analysis Time</td>
                    <td>${result.analysis_time_ms}ms</td>
                </tr>
            </table>

            ${result.errors.length > 0 ? `
            <h3>❌ Errors</h3>
            <ul>
                ${result.errors.map(error => `<li class="error">${error}</li>`).join('')}
            </ul>
            ` : ''}

            ${result.warnings.length > 0 ? `
            <h3>⚠️ Warnings</h3>
            <ul>
                ${result.warnings.map(warning => `<li class="warning">${warning}</li>`).join('')}
            </ul>
            ` : ''}

            ${result.circular_dependencies.length > 0 ? `
            <h3>🔄 Circular Dependencies</h3>
            ${result.circular_dependencies.map((cycle, index) => `
            <div class="cycle ${cycle.severity}">
                <h4>Cycle #${index + 1} - ${cycle.severity.toUpperCase()}</h4>
                <p><strong>Description:</strong> ${cycle.description}</p>
                <p><strong>Type:</strong> ${cycle.type}</p>
                <div class="cycle-path">
                    ${cycle.cycle.join(' → ')} → ${cycle.cycle[0]}
                </div>
                ${cycle.suggestions && cycle.suggestions.length > 0 ? `
                <div class="suggestions">
                    <strong>💡 Suggestions:</strong>
                    <ul>
                        ${cycle.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                    </ul>
                </div>
                ` : ''}
            </div>
            `).join('')}
            ` : `
            <div class="no-cycles">
                🎉 No circular dependencies found in ${result.language}!
            </div>
            `}
        </div>
        `).join('')}

        ${recommendations.length > 0 ? `
        <div class="recommendations">
            <h2>💡 Recommendations</h2>
            <ol>
                ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ol>
        </div>
        ` : ''}

        <hr>
        <p class="timestamp">
            Report generated by <strong>Circular Dependency Detection Tool</strong> v1.0.0
        </p>
    </div>
</body>
</html>
    `;

    await fileAPI.createFile(outputPath, html.trim());
  }

  private generateSummary(results: AnalysisResult[]) {
    return {
      total_files: results.reduce((sum, r) => sum + r.total_files, 0),
      total_dependencies: results.reduce((sum, r) => sum + r.total_dependencies, 0),
      total_circular_dependencies: results.reduce((sum, r) => sum + r.circular_dependencies.length, 0),
      total_analysis_time_ms: results.reduce((sum, r) => sum + r.analysis_time_ms, 0),
      successful_analyses: results.filter(r => r.success).length,
      failed_analyses: results.filter(r => !r.success).length
    };
  }

  private generateRecommendations(results: AnalysisResult[]): string[] {
    const recommendations: string[] = [];
    const totalCycles = results.reduce((sum, r) => sum + r.circular_dependencies.length, 0);

    if(totalCycles === 0) {
      recommendations.push('Excellent! No circular dependencies found. Continue following good architectural practices.');
      return recommendations;
    }

    // General recommendations based on findings
    if(totalCycles > 10) {
      recommendations.push('Consider refactoring your codebase architecture to reduce the high number of circular dependencies.');
    }

    // Language-specific recommendations
    const tsResult = results.find(r => r.language === "typescript");
    if(tsResult && tsResult.circular_dependencies.length > 0) {
      recommendations.push('For TypeScript: Use barrel exports, dependency injection, or lazy loading to break import cycles.');
    }

    const cppResult = results.find(r => r.language === 'cpp');
    if(cppResult && cppResult.circular_dependencies.length > 0) {
      recommendations.push('For C++: Use forward declarations, move implementations to source files, or apply the PIMPL pattern.');
    }

    const pyResult = results.find(r => r.language === 'python');
    if(pyResult && pyResult.circular_dependencies.length > 0) {
      recommendations.push('For Python: Use local imports, restructure modules, or implement factory patterns.');
    }

    // General architecture recommendations
    recommendations.push('Implement a layered architecture where dependencies flow in one direction.');
    recommendations.push('Consider using interfaces or abstract base classes to decouple modules.');
    recommendations.push('Use dependency injection containers to manage complex dependencies.');
    recommendations.push('Regular analysis should be integrated into your CI/CD pipeline to prevent future cycles.');

    return recommendations;
  }
}