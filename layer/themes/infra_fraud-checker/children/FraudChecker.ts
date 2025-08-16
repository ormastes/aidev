import { FileSystemWrapper } from '../external/FileSystemWrapper';
import { ASTParserWrapper, TestPattern } from '../external/ASTParserWrapper';
import { path } from '../../infra_external-log-lib/src';

export interface FraudViolation {
  type: 'test-manipulation' | 'coverage-bypass' | 'fake-assertions' | 'disabled-tests';
  severity: "critical" | 'high' | 'medium' | 'low';
  message: string;
  location: string;
  pattern?: TestPattern;
}

export interface FraudCheckResult {
  passed: boolean;
  score: number;
  violations: FraudViolation[];
  metrics: {
    filesChecked: number;
    totalTests: number;
    skippedTests: number;
    emptyTests: number;
    suspiciousPatterns: number;
  };
}

export interface TestFile {
  path: string;
  content?: string;
}

/**
 * Main fraud checker that coordinates file reading and AST analysis
 */
export class FraudChecker {
  private fileSystem: FileSystemWrapper;
  private astParser: ASTParserWrapper;

  constructor(basePath: string = process.cwd()) {
    this.fileSystem = new FileSystemWrapper(basePath);
    this.astParser = new ASTParserWrapper();
  }

  async checkTestFiles(testFiles: TestFile[]): Promise<FraudCheckResult> {
    const violations: FraudViolation[] = [];
    const metrics = {
      filesChecked: 0,
      totalTests: 0,
      skippedTests: 0,
      emptyTests: 0,
      suspiciousPatterns: 0
    };

    for (const testFile of testFiles) {
      try {
        // Read file content if not provided
        const content = testFile.content || await this.fileSystem.readFile(testFile.path);
        
        // Parse the file
        const ast = await this.astParser.parseTestFile(content, testFile.path);
        
        // Find suspicious patterns
        const patterns = this.astParser.findTestPatterns(ast, testFile.path);
        
        // Check if file has any assertions
        const hasAssertions = this.astParser.hasAssertions(ast);
        
        metrics.filesChecked++;
        
        // Process patterns
        for (const pattern of patterns) {
          metrics.suspiciousPatterns++;
          
          switch (pattern.type) {
            case 'skip':
              metrics.skippedTests++;
              violations.push({
                type: 'disabled-tests',
                severity: 'medium',
                message: `Skipped test found: ${pattern.code}`,
                location: `${pattern.location.file}:${pattern.location.line}:${pattern.location.column}`,
                pattern
              });
              break;
              
            case 'only':
              violations.push({
                type: 'test-manipulation',
                severity: 'high',
                message: `Test isolation with .only: ${pattern.code}`,
                location: `${pattern.location.file}:${pattern.location.line}:${pattern.location.column}`,
                pattern
              });
              break;
              
            case 'empty':
              metrics.emptyTests++;
              violations.push({
                type: 'fake-assertions',
                severity: 'high',
                message: 'Empty test with no assertions',
                location: `${pattern.location.file}:${pattern.location.line}:${pattern.location.column}`,
                pattern
              });
              break;
              
            case 'always-true':
              violations.push({
                type: 'fake-assertions',
                severity: "critical",
                message: `Always-true assertion: ${pattern.code}`,
                location: `${pattern.location.file}:${pattern.location.line}:${pattern.location.column}`,
                pattern
              });
              break;
          }
        }
        
        // Check for no assertions in entire file
        if (!hasAssertions && patterns.length === 0) {
          violations.push({
            type: 'fake-assertions',
            severity: 'high',
            message: 'Test file contains no assertions',
            location: testFile.path
          });
        }
        
      } catch (error) {
        violations.push({
          type: 'test-manipulation',
          severity: 'low',
          message: `Failed to analyze test file: ${(error as Error).message}`,
          location: testFile.path
        });
      }
    }

    // Calculate score
    const score = this.calculateScore(violations, metrics);

    return {
      passed: violations.length === 0,
      score,
      violations,
      metrics
    };
  }

  async checkDirectory(directory: string, pattern: RegExp = /\.(test|spec)\.(ts|js)$/): Promise<FraudCheckResult> {
    const testFiles = await this.findTestFiles(directory, pattern);
    return this.checkTestFiles(testFiles);
  }

  private async findTestFiles(dir: string, pattern: RegExp): Promise<TestFile[]> {
    const testFiles: TestFile[] = [];
    
    try {
      const files = await this.fileSystem.readdir(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = await this.fileSystem.stat(filePath);
        
        if (stat.isDirectory()) {
          // Recursively search subdirectories
          const subFiles = await this.findTestFiles(filePath, pattern);
          testFiles.push(...subFiles);
        } else if (pattern.test(file)) {
          testFiles.push({ path: filePath });
        }
      }
    } catch (error) {
      // Log error but continue
      console.error(`Error reading directory ${dir}:`, error);
    }
    
    return testFiles;
  }

  private calculateScore(violations: FraudViolation[], metrics: any): number {
    let score = 100;
    
    const severityPenalties = {
      critical: 25,
      high: 15,
      medium: 10,
      low: 5
    };
    
    // Apply penalties for violations
    for (const violation of violations) {
      score -= severityPenalties[violation.severity];
    }
    
    // Additional penalties for high ratios
    if (metrics.filesChecked > 0) {
      const skipRatio = metrics.skippedTests / metrics.filesChecked;
      const emptyRatio = metrics.emptyTests / metrics.filesChecked;
      
      if (skipRatio > 0.2) {
        score -= 15; // High skip ratio penalty
      }
      
      if (emptyRatio > 0.1) {
        score -= 10; // Too many empty tests
      }
    }
    
    return Math.max(0, Math.min(100, score));
  }

  // Get metrics from wrapped dependencies
  getFileSystemMetrics() {
    return this.fileSystem.getMetrics();
  }

  getParserMetrics() {
    return this.astParser.getMetrics();
  }

  // Log access
  onLog(callback: (entry: any) => void) {
    this.fileSystem.onLog(callback);
    this.astParser.onLog(callback);
  }

  getLogEntries() {
    return {
      fileSystem: this.fileSystem.getLogEntries(),
      parser: this.astParser.getLogEntries()
    };
  }
}