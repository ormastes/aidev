/**
 * Code Analysis Service
 * Analyzes code for quality metrics and issues
 */

import { Issue, CodeMetrics } from './CodeEnhancer';

export interface AnalysisResult {
  issues: Issue[];
  metrics: CodeMetrics;
  patterns: CodePattern[];
  dependencies: string[];
}

export interface CodePattern {
  type: 'anti-pattern' | 'code-smell' | 'best-practice';
  name: string;
  description: string;
  occurrences: number;
  locations: Location[];
}

export interface Location {
  line: number;
  column: number;
  length: number;
}

export class CodeAnalyzer {
  /**
   * Analyze code for issues and metrics
   */
  async analyze(code: string, language: string): Promise<AnalysisResult> {
    const issues = this.findIssues(code, language);
    const metrics = await this.getMetrics(code);
    const patterns = this.detectPatterns(code, language);
    const dependencies = this.extractDependencies(code, language);
    
    return { issues, metrics, patterns, dependencies };
  }
  
  /**
   * Find code issues
   */
  private findIssues(code: string, language: string): Issue[] {
    const issues: Issue[] = [];
    const lines = code.split('\n');
    
    lines.forEach((line, index) => {
      // Check for common issues
      if (language === 'typescript' || language === 'javascript') {
        // Check for any type
        if (line.includes(': any')) {
          issues.push({
            severity: 'warning',
            type: 'no-explicit-any',
            message: 'Avoid using "any" type',
            line: index + 1,
            column: line.indexOf(': any'),
            rule: 'no-explicit-any'
          });
        }
        
        // Check for console.log
        if (line.includes('console.log')) {
          issues.push({
            severity: 'warning',
            type: 'no-console',
            message: 'Remove console.log statements',
            line: index + 1,
            column: line.indexOf('console.log'),
            rule: 'no-console'
          });
        }
        
        // Check for TODO comments
        if (line.includes('TODO') || line.includes('FIXME')) {
          issues.push({
            severity: 'info',
            type: 'todo-comment',
            message: 'TODO comment found',
            line: index + 1,
            column: line.indexOf('TODO') || line.indexOf('FIXME'),
            rule: 'no-todo'
          });
        }
        
        // Check for long lines
        if (line.length > 120) {
          issues.push({
            severity: 'warning',
            type: 'max-line-length',
            message: `Line too long (${line.length} > 120)`,
            line: index + 1,
            column: 120,
            rule: 'max-line-length'
          });
        }
      }
      
      // Language-agnostic checks
      // Check for trailing whitespace
      if (line !== line.trimEnd()) {
        issues.push({
          severity: 'info',
          type: 'trailing-whitespace',
          message: 'Trailing whitespace',
          line: index + 1,
            column: line.trimEnd().length,
          rule: 'no-trailing-whitespace'
        });
      }
      
      // Check for tabs (if spaces are preferred)
      if (line.includes('\t')) {
        issues.push({
          severity: 'info',
          type: 'no-tabs',
          message: 'Tab character found (use spaces)',
          line: index + 1,
          column: line.indexOf('\t'),
          rule: 'no-tabs'
        });
      }
    });
    
    return issues;
  }
  
  /**
   * Calculate code metrics
   */
  async getMetrics(code: string): Promise<CodeMetrics> {
    const lines = code.split('\n');
    const nonEmptyLines = lines.filter(l => l.trim().length > 0);
    const codeLines = nonEmptyLines.filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*'));
    
    // Count functions
    const functionMatches = code.match(/function\s+\w+|=>\s*{|\w+\s*\([^)]*\)\s*{/g) || [];
    const functions = functionMatches.length;
    
    // Count classes
    const classMatches = code.match(/class\s+\w+/g) || [];
    const classes = classMatches.length;
    
    // Calculate cyclomatic complexity (simplified)
    const complexity = this.calculateComplexity(code);
    
    // Calculate maintainability index (simplified)
    const maintainability = this.calculateMaintainability(lines.length, complexity);
    
    // Detect duplicates (simplified)
    const duplicates = this.detectDuplicates(lines);
    
    return {
      lines: lines.length,
      statements: codeLines.length,
      functions,
      classes,
      complexity,
      maintainability,
      duplicates
    };
  }
  
  /**
   * Calculate cyclomatic complexity
   */
  private calculateComplexity(code: string): number {
    let complexity = 1;
    
    // Count decision points
    const decisionPatterns = [
      /if\s*\(/g,
      /else\s+if\s*\(/g,
      /while\s*\(/g,
      /for\s*\(/g,
      /case\s+/g,
      /catch\s*\(/g,
      /\?\s*[^:]+:/g, // ternary operators
      /&&/g,
      /\|\|/g
    ];
    
    for (const pattern of decisionPatterns) {
      const matches = code.match(pattern) || [];
      complexity += matches.length;
    }
    
    return complexity;
  }
  
  /**
   * Calculate maintainability index
   */
  private calculateMaintainability(lines: number, complexity: number): number {
    // Simplified maintainability index calculation
    // MI = 171 - 5.2 * ln(V) - 0.23 * CC - 16.2 * ln(LOC)
    const volume = lines * Math.log2(lines + 1); // Simplified Halstead volume
    const mi = Math.max(0, Math.min(100, 
      171 - 5.2 * Math.log(volume) - 0.23 * complexity - 16.2 * Math.log(lines)
    ));
    
    return Math.round(mi);
  }
  
  /**
   * Detect duplicate code blocks
   */
  private detectDuplicates(lines: string[]): number {
    const blockSize = 5;
    const blocks = new Map<string, number>();
    let duplicates = 0;
    
    for (let i = 0; i <= lines.length - blockSize; i++) {
      const block = lines.slice(i, i + blockSize)
        .map(l => l.trim())
        .filter(l => l.length > 0)
        .join('\n');
      
      if (block.length > 50) { // Only consider substantial blocks
        const count = blocks.get(block) || 0;
        if (count > 0) {
          duplicates++;
        }
        blocks.set(block, count + 1);
      }
    }
    
    return duplicates;
  }
  
  /**
   * Detect code patterns
   */
  private detectPatterns(code: string, language: string): CodePattern[] {
    const patterns: CodePattern[] = [];
    
    // Detect anti-patterns
    const nestedCallbacks = this.detectNestedCallbacks(code);
    if (nestedCallbacks.locations.length > 0) {
      patterns.push({
        type: 'anti-pattern',
        name: 'Callback Hell',
        description: 'Deeply nested callbacks detected',
        occurrences: nestedCallbacks.locations.length,
        locations: nestedCallbacks.locations
      });
    }
    
    // Detect code smells
    const longFunctions = this.detectLongFunctions(code);
    if (longFunctions.locations.length > 0) {
      patterns.push({
        type: 'code-smell',
        name: 'Long Function',
        description: 'Functions with too many lines',
        occurrences: longFunctions.locations.length,
        locations: longFunctions.locations
      });
    }
    
    const magicNumbers = this.detectMagicNumbers(code);
    if (magicNumbers.locations.length > 0) {
      patterns.push({
        type: 'code-smell',
        name: 'Magic Numbers',
        description: 'Hard-coded numeric values',
        occurrences: magicNumbers.locations.length,
        locations: magicNumbers.locations
      });
    }
    
    return patterns;
  }
  
  private detectNestedCallbacks(code: string): { locations: Location[] } {
    const locations: Location[] = [];
    const lines = code.split('\n');
    let nestLevel = 0;
    
    lines.forEach((line, index) => {
      if (line.includes('function(') || line.includes('=>')) {
        nestLevel++;
        if (nestLevel > 3) {
          locations.push({
            line: index + 1,
            column: line.indexOf('function') || line.indexOf('=>'),
            length: 8
          });
        }
      }
      if (line.includes('}')) {
        nestLevel = Math.max(0, nestLevel - 1);
      }
    });
    
    return { locations };
  }
  
  private detectLongFunctions(code: string): { locations: Location[] } {
    const locations: Location[] = [];
    const functionPattern = /function\s+(\w+)|(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g;
    let match;
    
    while ((match = functionPattern.exec(code)) !== null) {
      const startIndex = match.index;
      const endIndex = this.findFunctionEnd(code, startIndex);
      const functionLines = code.substring(startIndex, endIndex).split('\n').length;
      
      if (functionLines > 50) {
        const lines = code.substring(0, startIndex).split('\n');
        locations.push({
          line: lines.length,
          column: 0,
          length: endIndex - startIndex
        });
      }
    }
    
    return { locations };
  }
  
  private findFunctionEnd(code: string, start: number): number {
    let braceCount = 0;
    let inFunction = false;
    
    for (let i = start; i < code.length; i++) {
      if (code[i] === '{') {
        braceCount++;
        inFunction = true;
      } else if (code[i] === '}') {
        braceCount--;
        if (inFunction && braceCount === 0) {
          return i + 1;
        }
      }
    }
    
    return code.length;
  }
  
  private detectMagicNumbers(code: string): { locations: Location[] } {
    const locations: Location[] = [];
    const lines = code.split('\n');
    const magicNumberPattern = /(?<![\w.])([2-9]\d+|[1-9]\d{2,})(?![\w.])/g;
    
    lines.forEach((line, index) => {
      let match;
      while ((match = magicNumberPattern.exec(line)) !== null) {
        // Exclude common acceptable numbers (ports, HTTP codes, etc.)
        const num = parseInt(match[1]);
        if (![80, 443, 8080, 3000, 200, 404, 500].includes(num)) {
          locations.push({
            line: index + 1,
            column: match.index,
            length: match[1].length
          });
        }
      }
    });
    
    return { locations };
  }
  
  /**
   * Extract dependencies
   */
  private extractDependencies(code: string, language: string): string[] {
    const dependencies: string[] = [];
    
    if (language === 'typescript' || language === 'javascript') {
      // Extract import statements
      const importPattern = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
      let match;
      
      while ((match = importPattern.exec(code)) !== null) {
        dependencies.push(match[1]);
      }
      
      // Extract require statements
      const requirePattern = /require\s*\(['"]([^'"]+)['"]\)/g;
      while ((match = requirePattern.exec(code)) !== null) {
        dependencies.push(match[1]);
      }
    }
    
    return [...new Set(dependencies)]; // Remove duplicates
  }
}