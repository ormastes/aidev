import { auditedFS } from '../../../infra_external-log-lib/pipe';
import { path } from '../../../infra_external-log-lib/src';
import { glob } from 'glob';

interface MockDetectionResult {
  totalMocks: number;
  violations: MockViolation[];
}

interface MockViolation {
  file: string;
  line: number;
  type: string;
  reason: string;
  severity: 'high' | 'medium' | 'low';
  code?: string;
}

export class MockDetectionService {
  async analyze(targetPath: string, mode: string): Promise<MockDetectionResult> {
    const sourceFiles = await this.findSourceFiles(targetPath, mode);
    const violations: MockViolation[] = [];
    let totalMocks = 0;

    for (const file of sourceFiles) {
      const fileViolations = await this.analyzeFile(file, targetPath);
      violations.push(...fileViolations);
      totalMocks += fileViolations.length;
    }

    return {
      totalMocks,
      violations: violations.sort((a, b) => {
        // Sort by severity first, then by file
        const severityOrder = { high: 0, medium: 1, low: 2 };
        if (a.severity !== b.severity) {
          return severityOrder[a.severity] - severityOrder[b.severity];
        }
        return a.file.localeCompare(b.file);
      })
    };
  }

  private async findSourceFiles(targetPath: string, mode: string): Promise<string[]> {
    const patterns = this.getFilePatterns(targetPath, mode);
    const files: string[] = [];

    for (const pattern of patterns) {
      const matches = await glob(pattern, { 
        ignore: ['**/node_modules/**', '**/dist/**', '**/coverage/**'] 
      });
      files.push(...matches);
    }

    return files;
  }

  private getFilePatterns(targetPath: string, mode: string): string[] {
    switch (mode) {
      case 'app':
        return [
          path.join(targetPath, '**/*.ts'),
          path.join(targetPath, '**/*.js'),
          path.join(targetPath, '**/*.tsx'),
          path.join(targetPath, '**/*.jsx')
        ];
      case 'epic':
        return [
          path.join(targetPath, 'common/**/*.ts'),
          path.join(targetPath, 'orchestrator/**/*.ts')
        ];
      case 'theme':
        return [
          path.join(targetPath, 'src/**/*.ts'),
          path.join(targetPath, 'user-stories/**/src/**/*.ts')
        ];
      case 'user_story':
        return [
          path.join(targetPath, 'src/**/*.ts'),
          path.join(targetPath, 'tests/**/*.ts')
        ];
      case 'type':
        return [targetPath]; // Single file
      default:
        return [];
    }
  }

  private async analyzeFile(filePath: string, basePath: string): Promise<MockViolation[]> {
    const content = await auditedFS.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    const violations: MockViolation[] = [];
    const relativePath = path.relative(basePath, filePath);

    // Check if this is a test file
    const isTestFile = /\.(test|spec|stest|itest|etest)\.(ts|js)$/.test(filePath);

    lines.forEach((line, index) => {
      const lineNum = index + 1;

      // Check for mock usage in production code
      if (!isTestFile) {
        if (this.containsMock(line)) {
          violations.push({
            file: relativePath,
            line: lineNum,
            type: 'mock-in-production',
            reason: 'Mock found in production code',
            severity: 'high',
            code: line.trim()
          });
        }

        if (this.containsJestMock(line)) {
          violations.push({
            file: relativePath,
            line: lineNum,
            type: 'jest-mock-in-production',
            reason: 'Jest mock found in production code',
            severity: 'high',
            code: line.trim()
          });
        }
      }

      // Check for excessive mocking in tests
      if (isTestFile) {
        if (this.isExcessiveMocking(line)) {
          violations.push({
            file: relativePath,
            line: lineNum,
            type: 'excessive-mocking',
            reason: 'Excessive mocking detected - consider mock-free testing',
            severity: 'medium',
            code: line.trim()
          });
        }

        // Check for mocking external services without proper abstraction
        if (this.isMockingExternalDirectly(line)) {
          violations.push({
            file: relativePath,
            line: lineNum,
            type: 'direct-external-mock',
            reason: 'Mocking external service directly - use abstraction layer',
            severity: 'medium',
            code: line.trim()
          });
        }
      }

      // Check for hardcoded test data that should be mocked
      if (this.containsHardcodedTestData(line)) {
        violations.push({
          file: relativePath,
          line: lineNum,
          type: 'hardcoded-test-data',
          reason: 'Hardcoded test data detected',
          severity: 'low',
          code: line.trim()
        });
      }
    });

    // Check for entire file issues
    if (!isTestFile && this.isEntireFileMock(content)) {
      violations.push({
        file: relativePath,
        line: 0,
        type: 'entire-file-mock',
        reason: 'Entire file appears to be mock implementation',
        severity: 'high'
      });
    }

    return violations;
  }

  private containsMock(line: string): boolean {
    const mockPatterns = [
      /\bmock\s*[=:]/i,
      /\bcreateMock\s*\(/,
      /\bMock[A-Z]\w*\s*[=:({]/,
      /\b__mock\w*\b/,
      /\bfakeFn\s*\(/,
      /\bstub\s*\(/
    ];

    return mockPatterns.some(pattern => pattern.test(line));
  }

  private containsJestMock(line: string): boolean {
    const jestPatterns = [
      /\bjest\.mock\s*\(/,
      /\bjest\.fn\s*\(/,
      /\bjest\.spyOn\s*\(/,
      /\bmockImplementation\s*\(/,
      /\bmockReturnValue\s*\(/
    ];

    return jestPatterns.some(pattern => pattern.test(line));
  }

  private isExcessiveMocking(line: string): boolean {
    // Multiple mocks in one line
    const mockCount = (line.match(/\bmock/gi) || []).length;
    return mockCount > 2;
  }

  private isMockingExternalDirectly(line: string): boolean {
    const externalPatterns = [
      /mock.*axios/i,
      /mock.*fetch/i,
      /mock.*database/i,
      /mock.*redis/i,
      /mock.*mongodb/i,
      /mock.*postgres/i,
      /mock.*mysql/i,
      /mock.*aws/i,
      /mock.*s3/i
    ];

    return externalPatterns.some(pattern => pattern.test(line));
  }

  private containsHardcodedTestData(line: string): boolean {
    const hardcodedPatterns = [
      /password\s*[:=]\s*["'](?!test|password|123456)/i,
      /apiKey\s*[:=]\s*["'][a-zA-Z0-9]{20,}/,
      /token\s*[:=]\s*["'][a-zA-Z0-9]{30,}/,
      /localhost:\d{4}/,
      /127\.0\.0\.1:\d{4}/
    ];

    return hardcodedPatterns.some(pattern => pattern.test(line));
  }

  private isEntireFileMock(content: string): boolean {
    const mockIndicators = [
      /export\s+class\s+Mock/,
      /export\s+const\s+mock/i,
      /\/\*\*[\s\S]*@mock[\s\S]*\*\//,
      /^\/\/\s*Mock\s+implementation/im
    ];

    const hasMockIndicator = mockIndicators.some(pattern => pattern.test(content));
    const lineCount = content.split('\n').length;
    const mockLineCount = (content.match(/mock/gi) || []).length;

    // If file has mock indicators and high mock density
    return hasMockIndicator && (mockLineCount / lineCount) > 0.1;
  }
}