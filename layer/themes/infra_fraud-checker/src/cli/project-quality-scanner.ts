#!/usr/bin/env ts-node

/**
 * Comprehensive Project Quality Scanner
 * Combines fraud detection, security analysis, and quality improvement
 * Merged from: project-quality-improver.ts, run-enhanced-fraud-check.*, run-project-fraud-check.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { EnhancedFraudChecker, EnhancedFraudCheckResult } from '../detectors/enhanced-fraud-detector';

interface QualityIssue {
  file: string;
  issue: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  fixed: boolean;
  action: string;
}

interface ProjectScanResult {
  totalFiles: number;
  scannedFiles: number;
  skippedFiles: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  overallHealth: 'critical' | 'poor' | 'fair' | 'good' | 'excellent';
  improvements: string[];
  recommendations: string[];
}

export class ProjectQualityScanner {
  private fraudChecker: EnhancedFraudChecker;
  private issues: QualityIssue[] = [];
  private improvements: string[] = [];
  private filesScanned = 0;
  private totalLines = 0;
  
  private excludePatterns = [
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    '.next',
    'target',
    'vendor',
    '.vscode',
    '.idea',
    '*.min.js',
    '*.min.css',
    '*.map',
    '*.lock',
    'package-lock.json',
    'yarn.lock',
    'bun.lockb',
    'pnpm-lock.yaml'
  ];

  constructor() {
    this.fraudChecker = new EnhancedFraudChecker({
      enableML: true,
      enableBehaviorAnalysis: true,
      enableThreatIntel: true,
      cacheTimeout: 60000,
      logLevel: 'info'
    });
    this.addProjectSpecificRules();
  }

  /**
   * Add project-specific detection rules
   */
  private addProjectSpecificRules(): void {
    // Console.log detection in production code
    this.fraudChecker.addRule({
      id: 'proj_console',
      name: 'Console Statements in Production',
      description: 'Detects console.log statements that should be removed',
      category: 'quality',
      severity: 'low',
      enabled: true,
      weight: 2,
      check: async (context) => {
        if (context.code && !context.file?.includes('.test.') && !context.file?.includes('.spec.')) {
          const match = context.code.match(/console\.(log|error|warn|info|debug)/g);
          if (match && match.length > 3) {
            return {
              id: `violation_${Date.now()}_proj_console`,
              type: 'warning',
              severity: 'low',
              category: 'quality',
              rule: 'proj_console',
              confidence: 100,
              message: `Found ${match.length} console statements in production code`,
              location: {
                file: context.file,
                context: match[0]
              },
              suggestion: 'Remove console statements or use proper logging library',
              timestamp: new Date(),
              metadata: { count: match.length }
            };
          }
        }
        return null;
      }
    });

    // TODO/FIXME detection
    this.fraudChecker.addRule({
      id: 'proj_todo',
      name: 'Unresolved TODOs',
      description: 'Detects TODO and FIXME comments',
      category: 'quality',
      severity: 'low',
      enabled: true,
      weight: 1,
      check: async (context) => {
        if (context.code) {
          const todoMatch = context.code.match(/\/\/\s*(TODO|FIXME|HACK|XXX|BUG):/gi);
          if (todoMatch && todoMatch.length > 0) {
            return {
              id: `violation_${Date.now()}_proj_todo`,
              type: 'info',
              severity: 'low',
              category: 'quality',
              rule: 'proj_todo',
              confidence: 100,
              message: `Found ${todoMatch.length} unresolved TODO/FIXME comments`,
              location: {
                file: context.file,
                context: todoMatch[0]
              },
              suggestion: 'Address TODO items or track them in issue tracker',
              timestamp: new Date(),
              metadata: { todos: todoMatch }
            };
          }
        }
        return null;
      }
    });

    // Direct file system access detection
    this.fraudChecker.addRule({
      id: 'proj_direct_fs',
      name: 'Direct File System Access',
      description: 'Detects direct fs/path imports instead of using FileAPI',
      category: 'architecture',
      severity: 'medium',
      enabled: true,
      weight: 5,
      check: async (context) => {
        if (context.code && context.file?.endsWith('.ts')) {
          const directImports = context.code.match(/import.*from\s+['"](?:fs|path|child_process)['"];?/g);
          if (directImports) {
            return {
              id: `violation_${Date.now()}_proj_direct_fs`,
              type: 'error',
              severity: 'medium',
              category: 'architecture',
              rule: 'proj_direct_fs',
              confidence: 90,
              message: 'Direct file system imports detected - should use FileAPI',
              location: {
                file: context.file,
                context: directImports[0]
              },
              suggestion: 'Use FileAPI from layer/themes/infra_external-log-lib instead',
              remediation: {
                automatic: false,
                steps: [
                  'Import FileAPI from layer/themes/infra_external-log-lib',
                  'Replace fs operations with FileAPI methods',
                  'Update imports'
                ],
                estimatedTime: '15 minutes'
              },
              timestamp: new Date(),
              metadata: { imports: directImports }
            };
          }
        }
        return null;
      }
    });

    // Unused dependencies detection
    this.fraudChecker.addRule({
      id: 'proj_unused_deps',
      name: 'Unused Dependencies',
      description: 'Detects potentially unused dependencies',
      category: 'performance',
      severity: 'low',
      enabled: true,
      weight: 2,
      check: async (context) => {
        if (context.file === 'package.json' && context.code) {
          try {
            const pkg = JSON.parse(context.code);
            const deps = Object.keys(pkg.dependencies || {});
            const devDeps = Object.keys(pkg.devDependencies || {});
            
            // Check for commonly unused packages
            const suspiciousDeps = deps.filter(dep => 
              dep.includes('jquery') || 
              dep.includes('moment') || 
              dep.includes('lodash') ||
              dep.includes('underscore')
            );
            
            if (suspiciousDeps.length > 0) {
              return {
                id: `violation_${Date.now()}_proj_unused_deps`,
                type: 'warning',
                severity: 'low',
                category: 'performance',
                rule: 'proj_unused_deps',
                confidence: 60,
                message: `Potentially unused or replaceable dependencies detected`,
                location: {
                  file: context.file
                },
                suggestion: 'Review and remove unused dependencies or use modern alternatives',
                timestamp: new Date(),
                metadata: { suspiciousDeps }
              };
            }
          } catch (e) {
            // Invalid JSON
          }
        }
        return null;
      }
    });
  }

  /**
   * Check if path should be excluded
   */
  private shouldExclude(filePath: string): boolean {
    return this.excludePatterns.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(filePath);
      }
      return filePath.includes(pattern);
    });
  }

  /**
   * Scan a single file
   */
  private async scanFile(filePath: string): Promise<EnhancedFraudCheckResult | null> {
    if (this.shouldExclude(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      this.totalLines += lines.length;
      this.filesScanned++;

      // Run fraud checks
      const result = await this.fraudChecker.runChecks({
        code: content,
        file: filePath,
        fileSize: fs.statSync(filePath).size,
        lines: lines.length
      });

      return result;
    } catch (error) {
      console.error(`Error scanning ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Scan directory recursively
   */
  private async scanDirectory(dir: string, results: EnhancedFraudCheckResult[] = []): Promise<EnhancedFraudCheckResult[]> {
    if (this.shouldExclude(dir)) {
      return results;
    }

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath, results);
        } else if (entry.isFile()) {
          const result = await this.scanFile(fullPath);
          if (result) {
            results.push(result);
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dir}:`, error);
    }

    return results;
  }

  /**
   * Add quality improvement configurations
   */
  private async addQualityConfigurations(): Promise<void> {
    // Add ESLint config if missing
    if (!fs.existsSync('.eslintrc.json')) {
      const eslintConfig = {
        env: {
          browser: true,
          es2021: true,
          node: true
        },
        extends: [
          'eslint:recommended',
          'plugin:@typescript-eslint/recommended',
          'plugin:security/recommended'
        ],
        parser: '@typescript-eslint/parser',
        parserOptions: {
          ecmaVersion: 12,
          sourceType: 'module'
        },
        plugins: ['@typescript-eslint', 'security'],
        rules: {
          'no-console': 'warn',
          'no-unused-vars': 'error',
          'security/detect-eval-with-expression': 'error',
          '@typescript-eslint/explicit-function-return-type': 'warn'
        }
      };
      
      fs.writeFileSync('.eslintrc.json', JSON.stringify(eslintConfig, null, 2));
      this.improvements.push('✅ Added ESLint configuration');
    }

    // Add .env.example if missing
    if (!fs.existsSync('.env.example')) {
      const envExample = `# Environment Configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/myapp

# Authentication
JWT_SECRET=your-secret-key-change-this
JWT_EXPIRES_IN=7d

# API Keys
API_KEY=your-api-key`;
      
      fs.writeFileSync('.env.example', envExample);
      this.improvements.push('✅ Added .env.example template');
    }
  }

  /**
   * Generate comprehensive report
   */
  private generateReport(results: EnhancedFraudCheckResult[]): ProjectScanResult {
    let criticalIssues = 0;
    let highIssues = 0;
    let mediumIssues = 0;
    let lowIssues = 0;

    for (const result of results) {
      criticalIssues += result.violations.filter(v => v.severity === 'critical').length;
      highIssues += result.violations.filter(v => v.severity === 'high').length;
      mediumIssues += result.violations.filter(v => v.severity === 'medium').length;
      lowIssues += result.violations.filter(v => v.severity === 'low').length;
    }

    const totalIssues = criticalIssues + highIssues + mediumIssues + lowIssues;
    
    let overallHealth: ProjectScanResult['overallHealth'];
    if (criticalIssues > 0) {
      overallHealth = 'critical';
    } else if (highIssues > 5) {
      overallHealth = 'poor';
    } else if (highIssues > 0 || mediumIssues > 10) {
      overallHealth = 'fair';
    } else if (totalIssues < 20) {
      overallHealth = 'excellent';
    } else {
      overallHealth = 'good';
    }

    const recommendations = [
      '📋 Set up CI/CD pipeline with automated testing',
      '🔒 Implement regular security audits',
      '📊 Add code coverage reporting (aim for >80%)',
      '📝 Maintain up-to-date documentation',
      '🚀 Use feature flags for safe deployments',
      '📈 Monitor application performance',
      '🔍 Implement centralized logging',
      '🛡️ Set up Web Application Firewall (WAF)',
      '🔐 Use secrets management service',
      '📱 Implement proper authentication (OAuth2/JWT)'
    ];

    return {
      totalFiles: this.filesScanned,
      scannedFiles: this.filesScanned,
      skippedFiles: 0,
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues,
      overallHealth,
      improvements: this.improvements,
      recommendations
    };
  }

  /**
   * Run the complete scan
   */
  public async scan(targetPath: string = '.'): Promise<void> {
    console.log('🚀 Starting Comprehensive Project Quality Scan...\n');
    const startTime = Date.now();

    // Add quality configurations
    await this.addQualityConfigurations();

    // Scan project
    const results = await this.scanDirectory(targetPath);
    
    // Generate report
    const report = this.generateReport(results);
    
    // Display results
    console.log('='.repeat(80));
    console.log('PROJECT QUALITY SCAN REPORT');
    console.log('='.repeat(80));
    console.log();
    
    console.log('SCAN SUMMARY:');
    console.log('-'.repeat(40));
    console.log(`Files Scanned: ${report.scannedFiles}`);
    console.log(`Total Lines: ${this.totalLines.toLocaleString()}`);
    console.log(`Scan Duration: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
    console.log();
    
    console.log('ISSUES FOUND:');
    console.log('-'.repeat(40));
    console.log(`🔴 Critical: ${report.criticalIssues}`);
    console.log(`🟠 High: ${report.highIssues}`);
    console.log(`🟡 Medium: ${report.mediumIssues}`);
    console.log(`🟢 Low: ${report.lowIssues}`);
    console.log();
    
    console.log(`OVERALL HEALTH: ${this.getHealthEmoji(report.overallHealth)} ${report.overallHealth.toUpperCase()}`);
    console.log();
    
    if (report.improvements.length > 0) {
      console.log('IMPROVEMENTS MADE:');
      console.log('-'.repeat(40));
      for (const improvement of report.improvements) {
        console.log(improvement);
      }
      console.log();
    }
    
    console.log('TOP RECOMMENDATIONS:');
    console.log('-'.repeat(40));
    for (const rec of report.recommendations.slice(0, 5)) {
      console.log(rec);
    }
    console.log();
    
    // Save detailed report
    const detailedReport = {
      timestamp: new Date().toISOString(),
      summary: report,
      results: results.map(r => ({
        passed: r.passed,
        score: r.score,
        violationsCount: r.violations.length,
        warningsCount: r.warnings.length
      }))
    };
    
    const reportPath = path.join('gen', 'doc', 'project-quality-scan-report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(detailedReport, null, 2));
    
    console.log(`📄 Detailed report saved to: ${reportPath}`);
    console.log('\n✅ Project quality scan completed!');
    
    // Exit with appropriate code
    if (report.criticalIssues > 0) {
      process.exit(1);
    }
  }

  /**
   * Get health emoji
   */
  private getHealthEmoji(health: ProjectScanResult['overallHealth']): string {
    switch (health) {
      case 'excellent': return '🌟';
      case 'good': return '✅';
      case 'fair': return '⚠️';
      case 'poor': return '⛔';
      case 'critical': return '🚨';
    }
  }
}

// CLI execution
if (require.main === module) {
  const scanner = new ProjectQualityScanner();
  const targetPath = process.argv[2] || '.';
  
  scanner.scan(targetPath).catch(error => {
    console.error('Error during scan:', error);
    process.exit(1);
  });
}

export default ProjectQualityScanner;