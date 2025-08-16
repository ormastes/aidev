/**
 * Code Enhancement Service
 * Provides comprehensive code quality improvements
 */

import { CodeFormatter } from './CodeFormatter';
import { CodeAnalyzer } from './CodeAnalyzer';
import { CodeOptimizer } from './CodeOptimizer';
import { CodeRefactorer } from './CodeRefactorer';
import { CodeDocumenter } from './CodeDocumenter';

export interface EnhancementOptions {
  format?: boolean;
  optimize?: boolean;
  refactor?: boolean;
  document?: boolean;
  analyze?: boolean;
  fixIssues?: boolean;
  language?: string;
  style?: CodeStyle;
  complexity?: ComplexityThresholds;
}

export interface CodeStyle {
  indentSize: number;
  useSpaces: boolean;
  lineWidth: number;
  quoteMark: 'single' | 'double';
  semicolons: boolean;
  trailingComma: 'none' | 'es5' | 'all';
  bracketSpacing: boolean;
}

export interface ComplexityThresholds {
  maxCyclomatic: number;
  maxNesting: number;
  maxLines: number;
  maxParams: number;
  maxStatements: number;
}

export interface EnhancementResult {
  original: string;
  enhanced: string;
  changes: Change[];
  metrics: CodeMetrics;
  issues: Issue[];
  suggestions: string[];
}

export interface Change {
  type: 'format' | 'optimize' | 'refactor' | 'document' | 'fix';
  description: string;
  before: string;
  after: string;
  line?: number;
  column?: number;
}

export interface CodeMetrics {
  lines: number;
  statements: number;
  functions: number;
  classes: number;
  complexity: number;
  maintainability: number;
  duplicates: number;
  coverage?: number;
}

export interface Issue {
  severity: 'error' | 'warning' | 'info';
  type: string;
  message: string;
  line?: number;
  column?: number;
  rule?: string;
}

export class CodeEnhancer {
  private formatter: CodeFormatter;
  private analyzer: CodeAnalyzer;
  private optimizer: CodeOptimizer;
  private refactorer: CodeRefactorer;
  private documenter: CodeDocumenter;
  
  constructor() {
    this.formatter = new CodeFormatter();
    this.analyzer = new CodeAnalyzer();
    this.optimizer = new CodeOptimizer();
    this.refactorer = new CodeRefactorer();
    this.documenter = new CodeDocumenter();
  }
  
  /**
   * Enhance code with all available improvements
   */
  async enhance(code: string, options: EnhancementOptions = {}): Promise<EnhancementResult> {
    const defaultOptions: EnhancementOptions = {
      format: true,
      optimize: true,
      refactor: true,
      document: true,
      analyze: true,
      fixIssues: true,
      language: 'typescript',
      style: {
        indentSize: 2,
        useSpaces: true,
        lineWidth: 100,
        quoteMark: 'single',
        semicolons: true,
        trailingComma: 'es5',
        bracketSpacing: true
      },
      complexity: {
        maxCyclomatic: 10,
        maxNesting: 4,
        maxLines: 300,
        maxParams: 4,
        maxStatements: 20
      }
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    const changes: Change[] = [];
    let enhancedCode = code;
    
    // Step 1: Analyze code
    const analysis = finalOptions.analyze 
      ? await this.analyzer.analyze(enhancedCode, finalOptions.language!)
      : { issues: [], metrics: this.getDefaultMetrics() };
    
    // Step 2: Fix issues
    if (finalOptions.fixIssues && analysis.issues.length > 0) {
      const fixResult = await this.fixIssues(enhancedCode, analysis.issues);
      enhancedCode = fixResult.code;
      changes.push(...fixResult.changes);
    }
    
    // Step 3: Optimize code
    if (finalOptions.optimize) {
      const optimizeResult = await this.optimizer.optimize(enhancedCode, finalOptions.language!);
      enhancedCode = optimizeResult.code;
      changes.push(...optimizeResult.changes);
    }
    
    // Step 4: Refactor complex code
    if (finalOptions.refactor) {
      const refactorResult = await this.refactorer.refactor(
        enhancedCode,
        finalOptions.complexity!
      );
      enhancedCode = refactorResult.code;
      changes.push(...refactorResult.changes);
    }
    
    // Step 5: Add documentation
    if (finalOptions.document) {
      const documentResult = await this.documenter.document(
        enhancedCode,
        finalOptions.language!
      );
      enhancedCode = documentResult.code;
      changes.push(...documentResult.changes);
    }
    
    // Step 6: Format code
    if (finalOptions.format) {
      const formatResult = this.formatCode(enhancedCode, finalOptions.style!);
      enhancedCode = formatResult.code;
      changes.push(...formatResult.changes);
    }
    
    // Generate final metrics
    const finalMetrics = await this.analyzer.getMetrics(enhancedCode);
    
    // Generate suggestions
    const suggestions = this.generateSuggestions(finalMetrics, analysis.issues);
    
    return {
      original: code,
      enhanced: enhancedCode,
      changes,
      metrics: finalMetrics,
      issues: analysis.issues,
      suggestions
    };
  }
  
  /**
   * Fix identified issues in code
   */
  private async fixIssues(code: string, issues: Issue[]): Promise<{ code: string; changes: Change[] }> {
    let fixedCode = code;
    const changes: Change[] = [];
    
    for (const issue of issues) {
      if (issue.severity === 'error') {
        const fix = this.generateFix(issue, fixedCode);
        if (fix) {
          changes.push({
            type: 'fix',
            description: `Fixed ${issue.type}: ${issue.message}`,
            before: fix.before,
            after: fix.after,
            line: issue.line,
            column: issue.column
          });
          fixedCode = fix.code;
        }
      }
    }
    
    return { code: fixedCode, changes };
  }
  
  /**
   * Generate fix for specific issue
   */
  private generateFix(issue: Issue, code: string): { code: string; before: string; after: string } | null {
    // Implementation would depend on issue type
    // This is a simplified example
    switch (issue.type) {
      case 'missing-semicolon':
        return this.fixMissingSemicolon(code, issue.line!);
      case 'unused-variable':
        return this.removeUnusedVariable(code, issue.line!);
      case 'no-explicit-any':
        return this.replaceAnyType(code, issue.line!);
      default:
        return null;
    }
  }
  
  private fixMissingSemicolon(code: string, line: number): { code: string; before: string; after: string } {
    const lines = code.split('\n');
    const before = lines[line - 1];
    const after = before + ';';
    lines[line - 1] = after;
    return { code: lines.join('\n'), before, after };
  }
  
  private removeUnusedVariable(code: string, line: number): { code: string; before: string; after: string } {
    const lines = code.split('\n');
    const before = lines[line - 1];
    const after = '';
    lines.splice(line - 1, 1);
    return { code: lines.join('\n'), before, after };
  }
  
  private replaceAnyType(code: string, line: number): { code: string; before: string; after: string } {
    const lines = code.split('\n');
    const before = lines[line - 1];
    const after = before.replace(/: any/g, ': unknown');
    lines[line - 1] = after;
    return { code: lines.join('\n'), before, after };
  }
  
  /**
   * Format code with style options
   */
  private formatCode(code: string, style: CodeStyle): { code: string; changes: Change[] } {
    const formatter = new CodeFormatter(style.indentSize, style.useSpaces);
    let formattedCode = formatter.format(code);
    
    // Apply additional formatting
    formattedCode = formatter.removeTrailingWhitespace(formattedCode);
    
    if (style.semicolons) {
      formattedCode = formatter.addSemicolons(formattedCode);
    }
    
    // Quote style
    if (style.quoteMark === 'single') {
      formattedCode = formattedCode.replace(/"/g, "'");
    } else {
      formattedCode = formattedCode.replace(/'/g, '"');
    }
    
    return {
      code: formattedCode,
      changes: [{
        type: 'format',
        description: 'Applied code formatting',
        before: code.substring(0, 100) + '...',
        after: formattedCode.substring(0, 100) + '...'
      }]
    };
  }
  
  /**
   * Generate improvement suggestions
   */
  private generateSuggestions(metrics: CodeMetrics, issues: Issue[]): string[] {
    const suggestions: string[] = [];
    
    if (metrics.complexity > 10) {
      suggestions.push('Consider breaking down complex functions into smaller, more manageable pieces');
    }
    
    if (metrics.duplicates > 0) {
      suggestions.push(`Found ${metrics.duplicates} duplicate code blocks. Consider extracting common functionality`);
    }
    
    if (metrics.maintainability < 70) {
      suggestions.push('Code maintainability is below recommended threshold. Consider refactoring');
    }
    
    const errorCount = issues.filter(i => i.severity === 'error').length;
    if (errorCount > 0) {
      suggestions.push(`${errorCount} critical issues need immediate attention`);
    }
    
    if (metrics.lines > 500) {
      suggestions.push('File is quite large. Consider splitting into smaller modules');
    }
    
    if (!metrics.coverage || metrics.coverage < 80) {
      suggestions.push('Test coverage is below 80%. Add more unit tests');
    }
    
    return suggestions;
  }
  
  private getDefaultMetrics(): CodeMetrics {
    return {
      lines: 0,
      statements: 0,
      functions: 0,
      classes: 0,
      complexity: 0,
      maintainability: 100,
      duplicates: 0
    };
  }
  
  /**
   * Batch enhance multiple files
   */
  async enhanceFiles(files: Map<string, string>, options: EnhancementOptions = {}): Promise<Map<string, EnhancementResult>> {
    const results = new Map<string, EnhancementResult>();
    
    for (const [path, content] of files) {
      const result = await this.enhance(content, {
        ...options,
        language: this.detectLanguage(path)
      });
      results.set(path, result);
    }
    
    return results;
  }
  
  /**
   * Detect language from file extension
   */
  private detectLanguage(filepath: string): string {
    const ext = filepath.split('.').pop()?.toLowerCase();
    
    switch (ext) {
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'cpp':
      case 'cc':
      case 'cxx':
        return 'cpp';
      case 'c':
        return 'c';
      case 'py':
        return 'python';
      case 'java':
        return 'java';
      case 'cs':
        return 'csharp';
      case 'go':
        return 'go';
      case 'rs':
        return 'rust';
      default:
        return 'unknown';
    }
  }
  
  /**
   * Generate enhancement report
   */
  generateReport(result: EnhancementResult): string {
    const improved = result.metrics.complexity < 10 && 
                    result.metrics.maintainability > 70 &&
                    result.issues.filter(i => i.severity === 'error').length === 0;
    
    return `# Code Enhancement Report

## Summary
- Status: ${improved ? '✅ Enhanced' : '⚠️ Needs Review'}
- Changes Applied: ${result.changes.length}
- Issues Found: ${result.issues.length}
- Suggestions: ${result.suggestions.length}

## Metrics
| Metric | Value |
|--------|-------|
| Lines | ${result.metrics.lines} |
| Complexity | ${result.metrics.complexity} |
| Maintainability | ${result.metrics.maintainability} |
| Duplicates | ${result.metrics.duplicates} |

## Changes
${result.changes.map(c => `- ${c.type}: ${c.description}`).join('\n')}

## Issues
${result.issues.map(i => `- [${i.severity}] ${i.message} (line ${i.line})`).join('\n')}

## Suggestions
${result.suggestions.map(s => `- ${s}`).join('\n')}
`;
  }
}