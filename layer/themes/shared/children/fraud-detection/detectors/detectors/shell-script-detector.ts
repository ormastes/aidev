/**
 * Shell Script Detector
 *
 * Detects shell scripts with excessive logic and adds warnings.
 * Scripts with more than 10 lines are flagged as potentially problematic.
 *
 * WARNING: Do not put logic in shell scripts - use proper programming languages instead.
 */

import { ViolationType, FraudSeverity, FraudCheckType } from '../types';

interface DetectionInput {
  content?: string;
}

interface DetectionContext {
  source?: string;
}

interface DetectionResult {
  passed: boolean;
  score: number;
  violations: Array<{
    type: ViolationType;
    severity: FraudSeverity;
    message: string;
    location: string;
    evidence: any;
  }>;
  timestamp: Date;
  checkType: FraudCheckType;
  metadata: {
    detector: string;
    shellScriptDetected: boolean;
  };
}

export class ShellScriptDetector {
  public readonly name = 'ShellScriptDetector';
  private readonly MAX_ALLOWED_LINES = 10;
  private readonly SHELL_EXTENSIONS = ['.sh', '.bat', '.ps1', '.bash', '.zsh', '.fish', '.cmd'];

  async detect(input: string | DetectionInput, context?: DetectionContext): Promise<DetectionResult> {
    const violations: DetectionResult['violations'] = [];
    let score = 0;

    // Check if input is a file path or content
    const isShellScript = this.isShellScript(input, context);
    
    if (isShellScript) {
      const content = typeof input === 'string' ? input : input.content || '';
      const lines = this.countNonEmptyLines(content);
      
      if (lines > this.MAX_ALLOWED_LINES) {
        const severity = this.calculateSeverity(lines);
        const scoreImpact = this.calculateScoreImpact(severity);
        score += scoreImpact;
        
        violations.push({
          type: ViolationType.SUSPICIOUS_PATTERN,
          severity,
          message: `Shell script contains ${lines} lines of code (max recommended: ${this.MAX_ALLOWED_LINES}). WARNING: Do not put logic in shell scripts - use proper programming languages for complex logic.`,
          location: context?.source || 'unknown',
          evidence: {
            lineCount: lines,
            maxAllowed: this.MAX_ALLOWED_LINES,
            recommendation: 'Refactor complex shell script logic into a proper programming language (Python, Node.js, etc.)'
          }
        });
      }
      
      // Check for complex patterns that shouldn't be in shell scripts
      const complexPatterns = this.detectComplexPatterns(content);
      if (complexPatterns.length > 0) {
        score += 15; // Additional penalty for complex patterns
        
        violations.push({
          type: ViolationType.SUSPICIOUS_PATTERN,
          severity: FraudSeverity.MEDIUM,
          message: `Shell script contains complex patterns: ${complexPatterns.join(', ')}. These should be implemented in a proper programming language.`,
          location: context?.source || 'unknown',
          evidence: {
            patterns: complexPatterns
          }
        });
      }
    }
    
    return {
      passed: violations.length === 0,
      score: Math.min(score, 100),
      violations,
      timestamp: new Date(),
      checkType: FraudCheckType.PATTERN_MATCHING,
      metadata: {
        detector: this.name,
        shellScriptDetected: isShellScript
      }
    };
  }

  private isShellScript(input: string | DetectionInput, context?: DetectionContext): boolean {
    // Check by file extension if available
    const source = context?.source || '';
    if (source && this.SHELL_EXTENSIONS.some(ext => source.toLowerCase().endsWith(ext))) {
      return true;
    }
    
    // Check by content patterns (shebang)
    const content = typeof input === 'string' ? input : input.content || '';
    const shebangPatterns = [
      /^#!\/bin\/bash/,
      /^#!\/bin\/sh/,
      /^#!\/usr\/bin\/env bash/,
      /^#!\/usr\/bin\/env sh/,
      /^#!\/bin\/zsh/,
      /^#!\/usr\/bin\/env zsh/,
      /^#!\/usr\/bin\/env fish/,
      /^#!\/usr\/bin\/env powershell/
    ];
    
    return shebangPatterns.some(pattern => pattern.test(content.trim()));
  }

  private countNonEmptyLines(content: string): number {
    return content
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        // Ignore empty lines and pure comment lines
        return trimmed.length > 0 && !trimmed.startsWith('#') && !trimmed.startsWith('::') && !trimmed.startsWith('REM');
      })
      .length;
  }

  private calculateSeverity(lines: number): FraudSeverity {
    if (lines <= 15) return FraudSeverity.LOW;
    if (lines <= 30) return FraudSeverity.MEDIUM;
    if (lines <= 50) return FraudSeverity.HIGH;
    return FraudSeverity.CRITICAL;
  }

  private calculateScoreImpact(severity: FraudSeverity): number {
    switch (severity) {
      case FraudSeverity.LOW: return 15;
      case FraudSeverity.MEDIUM: return 35;
      case FraudSeverity.HIGH: return 60;
      case FraudSeverity.CRITICAL: return 85;
      default: return 0;
    }
  }

  private detectComplexPatterns(content: string): string[] {
    const complexPatterns: string[] = [];
    
    // Patterns that indicate complex logic
    const patterns: Record<string, RegExp> = {
      'nested loops': /for.*\n.*for|while.*\n.*while/gi,
      'functions': /function\s+\w+\s*\(|^\w+\s*\(\)\s*{/gm,
      'case statements': /case\s+.*\s+in/gi,
      'array operations': /\${.*\[@\]}/g,
      'complex conditionals': /if.*&&.*\|\|.*then/gi,
      'recursive calls': /\$0|\$\{0\}/g,
      'eval usage': /eval\s+/gi,
      'complex regex': /sed\s+.*[{}]|awk\s+.*[{}]/gi
    };
    
    for (const [name, pattern] of Object.entries(patterns)) {
      if (pattern.test(content)) {
        complexPatterns.push(name);
      }
    }
    
    return complexPatterns;
  }
}

export const shellScriptDetector = new ShellScriptDetector();