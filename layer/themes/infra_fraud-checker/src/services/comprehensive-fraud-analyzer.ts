/**
 * Comprehensive Fraud Analyzer Service
 * Integrates all fraud detection capabilities including circular dependencies
 */

import { CircularDependencyDetector, CircularDependencyFraudIssue } from '../detectors/circular-dependency-detector';
import { EnhancedFraudDetector } from '../detectors/enhanced-fraud-detector';
import * as fs from '../../layer/themes/infra_external-log-lib/src';
import * as path from 'node:path';

export interface ComprehensiveFraudReport {
  projectPath: string;
  timestamp: string;
  summary: {
    totalIssues: number;
    criticalIssues: number;
    warnings: number;
    circularDependencies: number;
    directImports: number;
    unauthorizedFiles: number;
  };
  issues: {
    circularDependencies: CircularDependencyFraudIssue[];
    directImports: any[];
    unauthorizedFiles: any[];
    otherViolations: any[];
  };
  recommendations: string[];
}

export class ComprehensiveFraudAnalyzer {
  private circularDepDetector: CircularDependencyDetector;
  private enhancedDetector: EnhancedFraudDetector;

  constructor() {
    this.circularDepDetector = new CircularDependencyDetector();
    this.enhancedDetector = new EnhancedFraudDetector({
      enableMLDetection: true,
      enableRateLimiting: true,
      enableBehavioralAnalysis: true
    });
  }

  /**
   * Perform comprehensive fraud analysis on a project
   */
  async analyzeProject(projectPath: string): Promise<ComprehensiveFraudReport> {
    const timestamp = new Date().toISOString();
    
    // Detect circular dependencies
    const circularDeps = await this.circularDepDetector.detectFraud(projectPath);
    
    // Detect other fraud patterns
    const directImports = await this.detectDirectImports(projectPath);
    const unauthorizedFiles = await this.detectUnauthorizedFiles(projectPath);
    
    // Count issues by severity
    const criticalIssues = circularDeps.filter(cd => cd.severity === 'error').length +
                          directImports.filter((di: any) => di.severity === 'error').length;
    
    const warnings = circularDeps.filter(cd => cd.severity === 'warning').length +
                    directImports.filter((di: any) => di.severity === 'warning').length;
    
    // Generate recommendations
    const recommendations = this.generateRecommendations({
      circularDeps,
      directImports,
      unauthorizedFiles
    });
    
    return {
      projectPath,
      timestamp,
      summary: {
        totalIssues: circularDeps.length + directImports.length + unauthorizedFiles.length,
        criticalIssues,
        warnings,
        circularDependencies: circularDeps.length,
        directImports: directImports.length,
        unauthorizedFiles: unauthorizedFiles.length
      },
      issues: {
        circularDependencies: circularDeps,
        directImports,
        unauthorizedFiles,
        otherViolations: []
      },
      recommendations
    };
  }

  /**
   * Generate a detailed fraud report
   */
  async generateReport(projectPath: string, outputPath?: string): Promise<string> {
    const analysis = await this.analyzeProject(projectPath);
    const report = this.formatReport(analysis);
    
    if (outputPath) {
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        await fileAPI.createDirectory(dir);
      }
      await fileAPI.createFile(outputPath, report, { type: FileType.TEMPORARY });
    }
    
    return report;
  }

  /**
   * Check a specific file for fraud
   */
  async checkFile(filePath: string, projectPath: string): Promise<any[]> {
    const issues: any[] = [];
    
    // Check for circular dependencies
    const circularDeps = await this.circularDepDetector.checkFile(filePath, projectPath);
    issues.push(...circularDeps);
    
    // Check for direct imports
    if (fs.existsSync(filePath)) {
      const content = fileAPI.readFileSync(filePath, 'utf-8');
      const directImportIssues = this.checkForDirectImports(content, filePath);
      issues.push(...directImportIssues);
    }
    
    return issues;
  }

  /**
   * Detect direct imports that bypass the pipe pattern
   */
  private async detectDirectImports(projectPath: string): Promise<any[]> {
    const issues: any[] = [];
    const files = this.findTypeScriptFiles(projectPath);
    
    for (const file of files) {
      try {
        const content = fileAPI.readFileSync(file, 'utf-8');
        const fileIssues = this.checkForDirectImports(content, file);
        issues.push(...fileIssues);
      } catch (error) {
        // Skip files that can't be read
      }
    }
    
    return issues;
  }

  /**
   * Check content for direct imports
   */
  private checkForDirectImports(content: string, filePath: string): any[] {
    const issues: any[] = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Check for imports that bypass pipe pattern
      const importPattern = /import\s+.+\s+from\s+['"]([^'"]+)['"]/;
      const match = line.match(importPattern);
      
      if (match) {
        const importPath = match[1];
        
        // Check if it's importing from children or internal directories
        if (importPath.includes('/children/') && !filePath.includes('/pipe/')) {
          issues.push({
            type: 'direct-import',
            severity: 'error',
            file: filePath,
            line: index + 1,
            description: `Direct import from children directory: ${importPath}`,
            suggestion: 'Import through the pipe/index.ts gateway instead'
          });
        }
        
        // Check for cross-layer imports
        if (importPath.includes('../') && importPath.includes('/layer/')) {
          const layerMatch = importPath.match(/layer\/themes\/([^/]+)/);
          if (layerMatch && !importPath.includes('/pipe')) {
            issues.push({
              type: 'cross-layer-import',
              severity: 'warning',
              file: filePath,
              line: index + 1,
              description: `Cross-layer import bypassing pipe: ${importPath}`,
              suggestion: `Import from '../../${layerMatch[1]}/pipe' instead`
            });
          }
        }
      }
    });
    
    return issues;
  }

  /**
   * Detect unauthorized files in the project
   */
  private async detectUnauthorizedFiles(projectPath: string): Promise<any[]> {
    const issues: any[] = [];
    const unauthorizedPatterns = [
      /\.bak$/,
      /\.backup$/,
      /\.old$/,
      /~$/,
      /\.swp$/,
      /\.DS_Store$/,
      /Thumbs\.db$/
    ];
    
    const checkDir = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          // Skip node_modules and .git
          if (entry.name === 'node_modules' || entry.name === '.git') {
            continue;
          }
          
          // Check for unauthorized file patterns
          for (const pattern of unauthorizedPatterns) {
            if (pattern.test(entry.name)) {
              issues.push({
                type: 'unauthorized-file',
                severity: 'warning',
                file: fullPath,
                description: `Unauthorized file type: ${entry.name}`,
                suggestion: 'Remove backup/temporary files and use version control instead'
              });
            }
          }
          
          if (entry.isDirectory()) {
            checkDir(fullPath);
          }
        }
      } catch (error) {
        // Skip directories that can't be read
      }
    };
    
    checkDir(projectPath);
    return issues;
  }

  /**
   * Find all TypeScript files in the project
   */
  private findTypeScriptFiles(projectPath: string): string[] {
    const files: string[] = [];
    const excludePatterns = ['node_modules', 'dist', 'build', '.git'];
    
    const walkDir = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (excludePatterns.some(pattern => entry.name.includes(pattern))) {
            continue;
          }
          
          if (entry.isDirectory()) {
            walkDir(fullPath);
          } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Skip directories that can't be read
      }
    };
    
    walkDir(projectPath);
    return files;
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(issues: any): string[] {
    const recommendations: string[] = [];
    
    if (issues.circularDeps.length > 0) {
      recommendations.push('Fix circular dependencies to improve code maintainability');
      recommendations.push('Use dependency injection or interfaces to break cycles');
    }
    
    if (issues.directImports.length > 0) {
      recommendations.push('Enforce pipe pattern for all cross-layer imports');
      recommendations.push('Add ESLint rules to prevent direct imports');
    }
    
    if (issues.unauthorizedFiles.length > 0) {
      recommendations.push('Clean up backup and temporary files');
      recommendations.push('Add .gitignore patterns for common temporary files');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Continue following best practices');
      recommendations.push('Add automated fraud checks to CI/CD pipeline');
    }
    
    return recommendations;
  }

  /**
   * Format the fraud report
   */
  private formatReport(analysis: ComprehensiveFraudReport): string {
    let report = `# Comprehensive Fraud Analysis Report\n\n`;
    report += `**Project:** ${analysis.projectPath}\n`;
    report += `**Timestamp:** ${analysis.timestamp}\n\n`;
    
    report += `## Summary\n\n`;
    report += `- **Total Issues:** ${analysis.summary.totalIssues}\n`;
    report += `- **Critical Issues:** ${analysis.summary.criticalIssues}\n`;
    report += `- **Warnings:** ${analysis.summary.warnings}\n`;
    report += `- **Circular Dependencies:** ${analysis.summary.circularDependencies}\n`;
    report += `- **Direct Imports:** ${analysis.summary.directImports}\n`;
    report += `- **Unauthorized Files:** ${analysis.summary.unauthorizedFiles}\n\n`;
    
    if (analysis.issues.circularDependencies.length > 0) {
      report += `## Circular Dependencies\n\n`;
      for (const issue of analysis.issues.circularDependencies) {
        report += `### ${issue.severity.toUpperCase()}: ${issue.file}\n`;
        report += `**Description:** ${issue.description}\n`;
        report += `**Cycle:** ${issue.cycle.join(' → ')}\n`;
        if (issue.suggestions.length > 0) {
          report += `**Suggestions:**\n`;
          for (const suggestion of issue.suggestions) {
            report += `- ${suggestion}\n`;
          }
        }
        report += '\n';
      }
    }
    
    if (analysis.issues.directImports.length > 0) {
      report += `## Direct Import Violations\n\n`;
      for (const issue of analysis.issues.directImports) {
        report += `- **${issue.file}:${issue.line}** - ${issue.description}\n`;
        report += `  Suggestion: ${issue.suggestion}\n\n`;
      }
    }
    
    if (analysis.issues.unauthorizedFiles.length > 0) {
      report += `## Unauthorized Files\n\n`;
      for (const issue of analysis.issues.unauthorizedFiles) {
        report += `- **${issue.file}** - ${issue.description}\n`;
      }
      report += '\n';
    }
    
    if (analysis.recommendations.length > 0) {
      report += `## Recommendations\n\n`;
      for (const recommendation of analysis.recommendations) {
        report += `- ${recommendation}\n`;
      }
    }
    
    return report;
  }
}