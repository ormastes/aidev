import { FraudCheckMetrics, FraudViolation } from './index';
import * as fs from 'fs/promises';
import { path } from '../../../../infra_external-log-lib/src';

export class FraudChecker {
  private patterns = {
    emptyTest: /it\(['"`].*['"`],\s*\(\)\s*=>\s*{\s*}\)/g,
    skipTest: /it\.skip|test\.skip|describe\.skip/g,
    onlyTest: /it\.only|test\.only|describe\.only/g,
    alwaysTrueAssertion: /expect\(true\)\.toBe\(true\)|assert\.isTrue\(true\)/g,
    noAssertion: /it\(['"`].*['"`],\s*async?\s*\(\)\s*=>\s*{[^}]*}(?!.*expect|assert)/g,
    mockedCoverage: /__coverage__|global\.__coverage__/g,
    disabledTest: /\/\/\s*(it|test|describe)\(/g,
    todoTest: /it\.todo|test\.todo/g,
    fakeDelay: /setTimeout\(\s*\(\)\s*=>\s*{\s*},\s*0\s*\)/g,
    coverageIgnore: /istanbul\s+ignore|c8\s+ignore/g
  };

  async check(testResults: any): Promise<FraudCheckMetrics> {
    const violations: FraudViolation[] = [];
    const testFiles = await this.collectTestFiles();
    
    for (const file of testFiles) {
      const content = await fs.readFile(file, 'utf8');
      violations.push(...await this.analyzeFile(file, content));
    }
    
    const score = this.calculateScore(violations);
    
    return {
      passed: violations.length === 0,
      score,
      violations
    };
  }

  private async collectTestFiles(): Promise<string[]> {
    const testFiles: string[] = [];
    const testDirs = ['__tests__', 'test', 'tests', 'spec'];
    
    async function walk(dir: string) {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (testDirs.includes(entry.name) || dir.includes('test')) {
              await walk(fullPath);
            }
          } else if (
            entry.name.endsWith('.test.ts') ||
            entry.name.endsWith('.test.js') ||
            entry.name.endsWith('.spec.ts') ||
            entry.name.endsWith('.spec.js')
          ) {
            testFiles.push(fullPath);
          }
        }
      } catch (error) {
        // Directory doesn't exist
      }
    }
    
    await walk(process.cwd());
    return testFiles;
  }

  private async analyzeFile(file: string, content: string): Promise<FraudViolation[]> {
    const violations: FraudViolation[] = [];
    const lines = content.split('\n');
    
    // Check for empty tests
    const emptyTests = content.match(this.patterns.emptyTest);
    if (emptyTests) {
      emptyTests.forEach(match => {
        violations.push({
          type: 'fake-assertions',
          severity: 'high',
          message: 'Empty test found - no assertions',
          location: `${file}:${this.getLineNumber(content, match)}`
        });
      });
    }
    
    // Check for skipped tests
    const skippedTests = content.match(this.patterns.skipTest);
    if (skippedTests) {
      skippedTests.forEach(match => {
        violations.push({
          type: 'disabled-tests',
          severity: 'medium',
          message: 'Skipped test found',
          location: `${file}:${this.getLineNumber(content, match)}`
        });
      });
    }
    
    // Check for .only tests
    const onlyTests = content.match(this.patterns.onlyTest);
    if (onlyTests) {
      onlyTests.forEach(match => {
        violations.push({
          type: 'test-manipulation',
          severity: 'high',
          message: '.only test found - other tests are being ignored',
          location: `${file}:${this.getLineNumber(content, match)}`
        });
      });
    }
    
    // Check for always-true assertions
    const alwaysTrue = content.match(this.patterns.alwaysTrueAssertion);
    if (alwaysTrue) {
      alwaysTrue.forEach(match => {
        violations.push({
          type: 'fake-assertions',
          severity: 'critical',
          message: 'Always-true assertion found',
          location: `${file}:${this.getLineNumber(content, match)}`
        });
      });
    }
    
    // Check for coverage manipulation
    const coverageManipulation = content.match(this.patterns.mockedCoverage);
    if (coverageManipulation) {
      coverageManipulation.forEach(match => {
        violations.push({
          type: 'coverage-bypass',
          severity: 'critical',
          message: 'Direct coverage manipulation detected',
          location: `${file}:${this.getLineNumber(content, match)}`
        });
      });
    }
    
    // Check for commented tests
    const commentedTests = content.match(this.patterns.disabledTest);
    if (commentedTests) {
      commentedTests.forEach(match => {
        violations.push({
          type: 'disabled-tests',
          severity: 'low',
          message: 'Commented out test found',
          location: `${file}:${this.getLineNumber(content, match)}`
        });
      });
    }
    
    // Check for coverage ignore comments
    const coverageIgnores = content.match(this.patterns.coverageIgnore);
    if (coverageIgnores) {
      coverageIgnores.forEach(match => {
        violations.push({
          type: 'coverage-bypass',
          severity: 'medium',
          message: 'Coverage ignore comment found',
          location: `${file}:${this.getLineNumber(content, match)}`
        });
      });
    }
    
    return violations;
  }

  private getLineNumber(content: string, match: string): number {
    const index = content.indexOf(match);
    const lines = content.substring(0, index).split('\n');
    return lines.length;
  }

  private calculateScore(violations: FraudViolation[]): number {
    if (violations.length === 0) return 100;
    
    const severityWeights = {
      critical: 25,
      high: 15,
      medium: 10,
      low: 5
    };
    
    let totalPenalty = 0;
    violations.forEach(violation => {
      totalPenalty += severityWeights[violation.severity];
    });
    
    return Math.max(0, 100 - totalPenalty);
  }
}