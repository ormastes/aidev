import { auditedFS } from '../../../infra_external-log-lib/pipe';
import { path } from '../../../infra_external-log-lib/src';
import { glob } from 'glob';

interface CodeSmellResult {
  totalSmells: number;
  criticalSmells: number;
  violations: CodeSmellViolation[];
}

interface CodeSmellViolation {
  file: string;
  line: number;
  type: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export class CodeSmellDetector {
  async analyze(targetPath: string, mode: string): Promise<CodeSmellResult> {
    const sourceFiles = await this.findSourceFiles(targetPath, mode);
    const violations: CodeSmellViolation[] = [];
    let totalSmells = 0;
    let criticalSmells = 0;

    for (const file of sourceFiles) {
      const fileViolations = await this.analyzeFile(file, targetPath);
      violations.push(...fileViolations);
      totalSmells += fileViolations.length;
      criticalSmells += fileViolations.filter(v => v.severity === 'critical').length;
    }

    return { totalSmells, criticalSmells, violations };
  }

  private async findSourceFiles(targetPath: string, mode: string): Promise<string[]> {
    const patterns = [
      path.join(targetPath, '**/*.ts'),
      path.join(targetPath, '**/*.js'),
      path.join(targetPath, '**/*.tsx'),
      path.join(targetPath, '**/*.jsx')
    ];

    const files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, { 
        ignore: ['**/node_modules/**', '**/dist/**', '**/coverage/**'] 
      });
      files.push(...matches);
    }
    return files;
  }

  private async analyzeFile(filePath: string, basePath: string): Promise<CodeSmellViolation[]> {
    const content = await auditedFS.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    const violations: CodeSmellViolation[] = [];
    const relativePath = path.relative(basePath, filePath);

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Long method detection
      if (this.isLongMethod(lines, index)) {
        violations.push({
          file: relativePath,
          line: lineNum,
          type: 'long-method',
          description: 'Method exceeds 50 lines',
          severity: 'medium'
        });
      }

      // God class detection (simplified)
      if (line.includes('class') && this.isGodClass(content)) {
        violations.push({
          file: relativePath,
          line: lineNum,
          type: 'god-class',
          description: 'Class has too many responsibilities',
          severity: 'high'
        });
      }

      // TODO comments
      if (/\/\/\s*TODO/i.test(line)) {
        violations.push({
          file: relativePath,
          line: lineNum,
          type: 'todo-comment',
          description: 'TODO comment found',
          severity: 'low'
        });
      }

      // Console.log in production
      if (!filePath.includes('test') && line.includes('console.log')) {
        violations.push({
          file: relativePath,
          line: lineNum,
          type: 'console-log',
          description: 'console.log in production code',
          severity: 'medium'
        });
      }

      // Magic numbers
      if (this.hasMagicNumber(line)) {
        violations.push({
          file: relativePath,
          line: lineNum,
          type: 'magic-number',
          description: 'Magic number detected',
          severity: 'low'
        });
      }
    });

    return violations;
  }

  private isLongMethod(lines: string[], startIndex: number): boolean {
    if (!lines[startIndex].includes('function') && !lines[startIndex].includes('=>')) {
      return false;
    }

    let braceCount = 0;
    let lineCount = 0;

    for (let i = startIndex; i < lines.length && i < startIndex + 100; i++) {
      braceCount += (lines[i].match(/\{/g) || []).length;
      braceCount -= (lines[i].match(/\}/g) || []).length;
      lineCount++;

      if (braceCount === 0 && lineCount > 1) {
        return lineCount > 50;
      }
    }

    return false;
  }

  private isGodClass(content: string): boolean {
    const methodCount = (content.match(/\b(function|=>)\s*\(/g) || []).length;
    const propertyCount = (content.match(/\b(public|private|protected)\s+\w+\s*[:;]/g) || []).length;
    
    return methodCount > 20 || propertyCount > 15;
  }

  private hasMagicNumber(line: string): boolean {
    // Skip common acceptable numbers
    const acceptable = [0, 1, 2, 10, 100, 1000];
    const numberPattern = /\b\d+\b/g;
    const matches = line.match(numberPattern) || [];

    return matches.some(match => {
      const num = parseInt(match);
      return !acceptable.includes(num) && num > 2;
    });
  }
}