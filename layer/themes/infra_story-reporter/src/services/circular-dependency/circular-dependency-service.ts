/**
 * Circular Dependency Detection Service
 * Main service for detecting circular dependencies in codebases
 */

import { TypeScriptAnalyzer } from './typescript-analyzer';
import { DependencyGraph } from './dependency-graph';
import { AnalysisResult, AnalysisOptions, CircularDependency } from './types';
import * as fs from 'fs';
import * as path from 'path';

export interface CircularDependencyReport {
  projectPath: string;
  timestamp: string;
  summary: {
    totalFiles: number;
    totalDependencies: number;
    circularDependenciesFound: number;
    criticalIssues: number;
    warnings: number;
  };
  circularDependencies: CircularDependency[];
  recommendations: string[];
  visualizationDot?: string;
}

export class CircularDependencyService {
  private analyzer: TypeScriptAnalyzer;

  constructor() {
    this.analyzer = new TypeScriptAnalyzer();
  }

  /**
   * Analyze a project for circular dependencies
   */
  async analyzeProject(projectPath: string, options?: AnalysisOptions): Promise<CircularDependencyReport> {
    const timestamp = new Date().toISOString();
    
    // Perform analysis
    const result = await this.analyzer.analyze(projectPath, options);
    
    // Count critical issues and warnings
    const criticalIssues = result.circular_dependencies.filter(cd => cd.severity === 'error').length;
    const warnings = result.circular_dependencies.filter(cd => cd.severity === 'warning').length;
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(result);
    
    // Generate visualization if requested
    let visualizationDot: string | undefined;
    if (options?.visualization) {
      const graph = new DependencyGraph();
      // Rebuild graph for visualization
      for (const dep of result.circular_dependencies) {
        for (const nodeId of dep.cycle) {
          graph.addNode({
            id: nodeId,
            path: nodeId,
            type: 'file',
            language: 'typescript'
          });
        }
        for (let i = 0; i < dep.cycle.length; i++) {
          const from = dep.cycle[i];
          const to = dep.cycle[(i + 1) % dep.cycle.length];
          try {
            graph.addEdge({
              from,
              to,
              type: 'import'
            });
          } catch (error) {
            // Node might not exist, skip
          }
        }
      }
      visualizationDot = graph.toDot(true);
    }
    
    return {
      projectPath,
      timestamp,
      summary: {
        totalFiles: result.total_files,
        totalDependencies: result.total_dependencies,
        circularDependenciesFound: result.circular_dependencies.length,
        criticalIssues,
        warnings
      },
      circularDependencies: result.circular_dependencies,
      recommendations,
      visualizationDot
    };
  }

  /**
   * Check if a specific file is part of any circular dependency
   */
  async checkFile(filePath: string, projectPath: string): Promise<CircularDependency[]> {
    const result = await this.analyzer.analyze(projectPath);
    const relativePath = path.relative(projectPath, filePath);
    
    return result.circular_dependencies.filter(cd => 
      cd.affected_files.includes(relativePath) || cd.cycle.includes(relativePath)
    );
  }

  /**
   * Generate a report file
   */
  async generateReportFile(report: CircularDependencyReport, outputPath: string): Promise<void> {
    const reportContent = this.formatReport(report);
    
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write report
    fs.writeFileSync(outputPath, reportContent, 'utf-8');
  }

  /**
   * Format report as markdown
   */
  formatReport(report: CircularDependencyReport): string {
    let content = `# Circular Dependency Detection Report\n\n`;
    content += `**Project:** ${report.projectPath}\n`;
    content += `**Timestamp:** ${report.timestamp}\n\n`;
    
    content += `## Summary\n\n`;
    content += `- **Total Files Analyzed:** ${report.summary.totalFiles}\n`;
    content += `- **Total Dependencies:** ${report.summary.totalDependencies}\n`;
    content += `- **Circular Dependencies Found:** ${report.summary.circularDependenciesFound}\n`;
    content += `- **Critical Issues:** ${report.summary.criticalIssues}\n`;
    content += `- **Warnings:** ${report.summary.warnings}\n\n`;
    
    if (report.circularDependencies.length > 0) {
      content += `## Circular Dependencies\n\n`;
      
      for (let i = 0; i < report.circularDependencies.length; i++) {
        const cd = report.circularDependencies[i];
        content += `### ${i + 1}. ${cd.severity.toUpperCase()}: ${cd.type} cycle\n\n`;
        content += `**Description:** ${cd.description}\n\n`;
        content += `**Cycle Path:**\n`;
        content += '```\n';
        content += cd.cycle.join(' → ') + ' → ' + cd.cycle[0] + '\n';
        content += '```\n\n';
        
        if (cd.suggestions && cd.suggestions.length > 0) {
          content += `**Suggestions:**\n`;
          for (const suggestion of cd.suggestions) {
            content += `- ${suggestion}\n`;
          }
          content += '\n';
        }
        
        content += `**Affected Files:**\n`;
        for (const file of cd.affected_files) {
          content += `- ${file}\n`;
        }
        content += '\n';
      }
    } else {
      content += `## ✅ No Circular Dependencies Found\n\n`;
      content += `The project has no circular dependencies. Good job!\n\n`;
    }
    
    if (report.recommendations.length > 0) {
      content += `## Recommendations\n\n`;
      for (const recommendation of report.recommendations) {
        content += `- ${recommendation}\n`;
      }
      content += '\n';
    }
    
    if (report.visualizationDot) {
      content += `## Visualization (DOT Format)\n\n`;
      content += '```dot\n';
      content += report.visualizationDot;
      content += '```\n\n';
      content += `To visualize this graph, save the DOT content to a file and use Graphviz:\n`;
      content += '```bash\n';
      content += 'dot -Tsvg dependencies.dot -o dependencies.svg\n';
      content += '```\n';
    }
    
    return content;
  }

  /**
   * Generate recommendations based on analysis results
   */
  private generateRecommendations(result: AnalysisResult): string[] {
    const recommendations: string[] = [];
    
    if (result.circular_dependencies.length === 0) {
      recommendations.push('Continue maintaining clean dependency structure');
      recommendations.push('Consider adding automated circular dependency checks to CI/CD pipeline');
    } else {
      const criticalCount = result.circular_dependencies.filter(cd => cd.severity === 'error').length;
      
      if (criticalCount > 0) {
        recommendations.push(`Address ${criticalCount} critical circular dependencies immediately`);
        recommendations.push('Consider refactoring critical modules to use dependency injection');
      }
      
      if (result.circular_dependencies.length > 5) {
        recommendations.push('High number of circular dependencies detected - consider architectural review');
        recommendations.push('Implement layer-based architecture to prevent cross-layer dependencies');
      }
      
      recommendations.push('Use interfaces and abstract classes to break direct dependencies');
      recommendations.push('Consider using event-driven architecture for loosely coupled components');
      recommendations.push('Add pre-commit hooks to detect new circular dependencies');
    }
    
    return recommendations;
  }
}