import * as glob from 'glob';
import { auditedFS } from '../../../infra_external-log-lib/pipe';
import {
  TestType,
  MockDetection,
  MockPattern,
  MOCK_PATTERNS,
  getSeverity,
  TestFileAnalysis,
  calculateFraudScore
} from '../domain/mock-detection';

/**
 * Base class for mock detection in test files
 */
export abstract class BaseMockDetector {
  protected projectPath: string;
  protected testType: TestType;
  protected patterns: string[];
  protected mockPatterns: MockPattern[];

  constructor(
    projectPath: string,
    testType: TestType,
    patterns: string[],
    customMockPatterns?: MockPattern[]
  ) {
    this.projectPath = projectPath;
    this.testType = testType;
    this.patterns = patterns;
    this.mockPatterns = customMockPatterns || MOCK_PATTERNS;
  }

  /**
   * Find all test files matching patterns
   */
  async findTestFiles(): Promise<string[]> {
    const files: string[] = [];
    
    for (const pattern of this.patterns) {
      const matches = glob.sync(pattern, {
        cwd: this.projectPath,
        absolute: true,
        ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
      });
      files.push(...matches);
    }
    
    return [...new Set(files)]; // Remove duplicates
  }

  /**
   * Analyze a single test file for mocks
   */
  async analyzeFile(filePath: string): Promise<TestFileAnalysis> {
    const content = await auditedFS.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const detections: MockDetection[] = [];
    
    // Check each mock pattern
    for (const mockPattern of this.mockPatterns) {
      for (const pattern of mockPattern.patterns) {
        const matches = [...content.matchAll(pattern)];
        
        for (const match of matches) {
          const position = this.getLineAndColumn(content, match.index || 0);
          const snippet = this.getCodeSnippet(lines, position.line);
          
          const detection: MockDetection = {
            id: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            testFile: filePath,
            testType: this.testType,
            mockType: mockPattern.mockType,
            severity: getSeverity(this.testType, mockPattern.mockType),
            location: {
              line: position.line,
              column: position.column,
              snippet
            },
            description: `${mockPattern.description} detected in ${this.testType} test`,
            pattern: mockPattern.name,
            recommendation: this.getRecommendation(mockPattern, this.testType),
            timestamp: new Date()
          };
          
          detections.push(detection);
        }
      }
    }
    
    // Additional custom validation
    const customDetections = await this.customValidation(content, filePath);
    detections.push(...customDetections);
    
    // Count test blocks
    const totalTests = this.countTests(content);
    const mockFreeSections = this.countMockFreeSections(content, detections);
    
    const analysis: TestFileAnalysis = {
      filePath,
      testType: this.testType,
      totalTests,
      mocksDetected: detections,
      mockFreeSections,
      fraudScore: calculateFraudScore(detections),
      recommendations: this.generateFileRecommendations(detections)
    };
    
    return analysis;
  }

  /**
   * Analyze all test files
   */
  async analyze(): Promise<TestFileAnalysis[]> {
    const files = await this.findTestFiles();
    const analyses: TestFileAnalysis[] = [];
    
    for (const file of files) {
      try {
        const analysis = await this.analyzeFile(file);
        analyses.push(analysis);
      } catch (error) {
        console.error(`Error analyzing ${file}:`, error);
      }
    }
    
    return analyses;
  }

  /**
   * Get line and column from character index
   */
  protected getLineAndColumn(content: string, index: number): { line: number; column: number } {
    const lines = content.substring(0, index).split('\n');
    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1
    };
  }

  /**
   * Get code snippet around a line
   */
  protected getCodeSnippet(lines: string[], lineNumber: number, context: number = 2): string {
    const start = Math.max(0, lineNumber - context - 1);
    const end = Math.min(lines.length, lineNumber + context);
    
    return lines
      .slice(start, end)
      .map((line, idx) => {
        const currentLine = start + idx + 1;
        const marker = currentLine === lineNumber ? '>' : ' ';
        return `${marker} ${currentLine.toString().padStart(4)}: ${line}`;
      })
      .join('\n');
  }

  /**
   * Count test blocks in content
   */
  protected countTests(content: string): number {
    const testPatterns = [
      /\bit\s*\(/g,
      /\btest\s*\(/g,
      /\bdescribe\s*\(/g,
      /\bscenario\s*\(/g,
      /\bfeature\s*\(/g
    ];
    
    let count = 0;
    for (const pattern of testPatterns) {
      const matches = content.match(pattern);
      count += matches ? matches.length : 0;
    }
    
    return count;
  }

  /**
   * Count sections without mocks
   */
  protected countMockFreeSections(content: string, detections: MockDetection[]): number {
    if (detections.length === 0) return this.countTests(content);
    
    // Simple heuristic: count test blocks that don't have mocks within 10 lines
    const mockLines = new Set(detections.map(d => d.location.line));
    const testLines = this.findTestStartLines(content);
    
    let mockFreeCount = 0;
    for (const testLine of testLines) {
      let hasMockNearby = false;
      for (let i = testLine - 5; i <= testLine + 15; i++) {
        if (mockLines.has(i)) {
          hasMockNearby = true;
          break;
        }
      }
      if (!hasMockNearby) mockFreeCount++;
    }
    
    return mockFreeCount;
  }

  /**
   * Find lines where tests start
   */
  protected findTestStartLines(content: string): number[] {
    const lines = content.split('\n');
    const testLines: number[] = [];
    
    const testPatterns = [
      /^\s*(it|test|describe|scenario|feature)\s*\(/
    ];
    
    lines.forEach((line, idx) => {
      for (const pattern of testPatterns) {
        if (pattern.test(line)) {
          testLines.push(idx + 1);
          break;
        }
      }
    });
    
    return testLines;
  }

  /**
   * Get recommendation based on mock type and test type
   */
  protected getRecommendation(_mockPattern: MockPattern, testType: TestType): string {
    const recommendations: Record<TestType, string> = {
      [TestType.SYSTEM]: 'System tests must use real implementations. Set up actual services or use Docker containers.',
      [TestType.ENVIRONMENT]: 'Environment tests must verify real external dependencies. Use actual databases, APIs, and services.',
      [TestType.EXTERNAL]: 'External tests should use real external interfaces. Consider using test instances of external services.',
      [TestType.INTEGRATION]: 'Integration tests should minimize mocks. Only mock external services that are expensive or unreliable.',
      [TestType.UNIT]: 'Unit tests can use mocks for dependencies, but prefer real implementations when possible.'
    };
    
    return recommendations[testType];
  }

  /**
   * Generate recommendations for a file
   */
  protected generateFileRecommendations(detections: MockDetection[]): string[] {
    const recommendations: string[] = [];
    
    if (detections.length === 0) {
      recommendations.push('🔄 No mocks detected - excellent mock-free testing!');
      return recommendations;
    }
    
    const criticalCount = detections.filter(d => d.severity === 'critical').length;
    const highCount = detections.filter(d => d.severity === 'high').length;
    
    if (criticalCount > 0) {
      recommendations.push(`🚨 Remove all ${criticalCount} mocks from this ${this.testType} test immediately`);
    }
    
    if (highCount > 0) {
      recommendations.push(`⚠️  Replace ${highCount} high-severity mocks with real implementations`);
    }
    
    // Type-specific recommendations
    this.addTypeSpecificRecommendations(recommendations, detections);
    
    return recommendations;
  }

  /**
   * Custom validation to be In Progress by subclasses
   */
  protected abstract customValidation(content: string, filePath: string): Promise<MockDetection[]>;

  /**
   * Add type-specific recommendations
   */
  protected abstract addTypeSpecificRecommendations(
    recommendations: string[],
    detections: MockDetection[]
  ): void;
}