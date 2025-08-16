import { auditedFS } from '../../../infra_external-log-lib/pipe';
import { path } from '../../../infra_external-log-lib/src';
import { glob } from 'glob';

interface TestCoverageFraudResult {
  fakeTests: number;
  emptyTests: number;
  violations: TestViolation[];
}

interface TestViolation {
  file: string;
  testName: string;
  reason: string;
  type: 'fake' | 'empty' | 'no-assertions' | 'commented-out';
}

export class TestCoverageFraudDetector {
  async analyze(targetPath: string, mode: string): Promise<TestCoverageFraudResult> {
    const testFiles = await this.findTestFiles(targetPath, mode);
    let fakeTests = 0;
    let emptyTests = 0;
    const violations: TestViolation[] = [];

    for (const file of testFiles) {
      const fileViolations = await this.analyzeTestFile(file, targetPath);
      for (const violation of fileViolations) {
        if (violation.type === 'fake') fakeTests++;
        if (violation.type === 'empty') emptyTests++;
        violations.push(violation);
      }
    }

    return { fakeTests, emptyTests, violations };
  }

  private async findTestFiles(targetPath: string, mode: string): Promise<string[]> {
    const patterns = [
      path.join(targetPath, '**/*.test.ts'),
      path.join(targetPath, '**/*.test.js'),
      path.join(targetPath, '**/*.spec.ts'),
      path.join(targetPath, '**/*.spec.js'),
      path.join(targetPath, '**/*.stest.ts'),
      path.join(targetPath, '**/*.itest.ts'),
      path.join(targetPath, '**/*.etest.ts')
    ];

    const files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, { ignore: ['**/node_modules/**'] });
      files.push(...matches);
    }
    return files;
  }

  private async analyzeTestFile(filePath: string, basePath: string): Promise<TestViolation[]> {
    const content = await auditedFS.readFile(filePath, 'utf8');
    const violations: TestViolation[] = [];
    const relativePath = path.relative(basePath, filePath);

    // Check for empty test blocks
    const emptyTestPattern = /(?:it|test|describe)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(?:async\s*)?\(\s*\)\s*=>\s*\{\s*\}\s*\)/g;
    let match;
    while ((match = emptyTestPattern.exec(content)) !== null) {
      violations.push({
        file: relativePath,
        testName: match[1],
        reason: 'Empty test block',
        type: 'empty'
      });
    }

    // Check for tests without assertions
    const testBlocks = content.match(/(?:it|test)\s*\(\s*['"`]([^'"`]+)['"`]\s*,[\s\S]*?\}\s*\)/g) || [];
    for (const block of testBlocks) {
      if (!this.hasAssertion(block)) {
        const nameMatch = block.match(/['"`]([^'"`]+)['"`]/);
        violations.push({
          file: relativePath,
          testName: nameMatch ? nameMatch[1] : 'Unknown',
          reason: 'Test has no assertions',
          type: 'no-assertions'
        });
      }
    }

    // Check for commented out tests
    const commentedTestPattern = /\/\/\s*(?:it|test|describe)\s*\(/g;
    if (commentedTestPattern.test(content)) {
      violations.push({
        file: relativePath,
        testName: 'Multiple tests',
        reason: 'Commented out tests found',
        type: 'commented-out'
      });
    }

    return violations;
  }

  private hasAssertion(testBlock: string): boolean {
    const assertionPatterns = [
      /expect\s*\(/,
      /assert\s*\(/,
      /should\s*\./,
      /\.to\s*\./,
      /\.toEqual\s*\(/,
      /\.toBe\s*\(/,
      /\.toMatch\s*\(/,
      /\.toThrow\s*\(/
    ];

    return assertionPatterns.some(pattern => pattern.test(testBlock));
  }
}