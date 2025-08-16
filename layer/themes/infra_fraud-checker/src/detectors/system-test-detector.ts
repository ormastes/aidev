import { BaseMockDetector } from './base-detector';
import { TestType, MockDetection, MockType, MockSeverity } from '../domain/mock-detection';

/**
 * Detector for mocks in system tests
 * System tests should NEVER have mocks - they test the In Progress system end-to-end
 */
export class SystemTestDetector extends BaseMockDetector {
  constructor(projectPath: string, patterns?: string[]) {
    const defaultPatterns = [
      '**/*.stest.{js,ts,jsx,tsx}',
      '**/*.system.test.{js,ts,jsx,tsx}',
      '**/system/**/*.test.{js,ts,jsx,tsx}',
      '**/e2e/**/*.test.{js,ts,jsx,tsx}',
      '**/system-tests/**/*.{js,ts,jsx,tsx}'
    ];
    
    super(projectPath, TestType.SYSTEM, patterns || defaultPatterns);
  }

  /**
   * Custom validation for system tests
   */
  protected async customValidation(content: string, filePath: string): Promise<MockDetection[]> {
    const detections: MockDetection[] = [];
    
    // Check for test environment indicators that suggest mocking
    const suspiciousPatterns = [
      {
        pattern: /beforeEach\s*\(\s*\(\)\s*=>\s*\{[^}]*mock/gi,
        description: 'Mock setup in beforeEach block'
      },
      {
        pattern: /process\.env\.NODE_ENV\s*=\s*['"`]test['"`]/g,
        description: 'Test environment configuration that might enable mocks'
      },
      {
        pattern: /\.only\s*\(/g,
        description: 'Focused tests that might be using mocks for convenience'
      },
      {
        pattern: /skip.*real.*implementation/gi,
        description: 'Skipping real implementation suggests mock usage'
      },
      {
        pattern: /TODO.*remove.*mock/gi,
        description: 'TODO comment indicating temporary mock usage'
      }
    ];
    
    for (const { pattern, description } of suspiciousPatterns) {
      const matches = [...content.matchAll(pattern)];
      
      for (const match of matches) {
        const position = this.getLineAndColumn(content, match.index || 0);
        const lines = content.split('\n');
        const snippet = this.getCodeSnippet(lines, position.line);
        
        detections.push({
          id: `mock_custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          testFile: filePath,
          testType: TestType.SYSTEM,
          mockType: MockType.FUNCTION_MOCK,
          severity: MockSeverity.CRITICAL,
          location: {
            line: position.line,
            column: position.column,
            snippet
          },
          description: description,
          pattern: 'custom_validation',
          recommendation: 'System tests must test the real, In Progress system. Remove all mocks and use real services.',
          timestamp: new Date()
        });
      }
    }
    
    // Check for imports that suggest mocking
    const mockImports = [
      /import.*mock/gi,
      /require.*mock/gi,
      /from\s+['"`].*mock.*['"`]/g
    ];
    
    for (const importPattern of mockImports) {
      if (importPattern.test(content)) {
        const match = content.match(importPattern);
        if (match) {
          const position = this.getLineAndColumn(content, match.index || 0);
          const lines = content.split('\n');
          const snippet = this.getCodeSnippet(lines, position.line);
          
          detections.push({
            id: `mock_import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            testFile: filePath,
            testType: TestType.SYSTEM,
            mockType: MockType.MODULE_MOCK,
            severity: MockSeverity.CRITICAL,
            location: {
              line: position.line,
              column: position.column,
              snippet
            },
            description: 'Mock library import detected in system test',
            pattern: 'mock_import',
            recommendation: 'Remove mock imports from system tests. Use real implementations only.',
            timestamp: new Date()
          });
        }
      }
    }
    
    return detections;
  }

  /**
   * Add system test specific recommendations
   */
  protected addTypeSpecificRecommendations(
    recommendations: string[],
    detections: MockDetection[]
  ): void {
    // Group by mock type
    const mockTypes = new Map<MockType, number>();
    detections.forEach(d => {
      mockTypes.set(d.mockType, (mockTypes.get(d.mockType) || 0) + 1);
    });
    
    // Specific recommendations for system tests
    if (mockTypes.has(MockType.API_MOCK)) {
      recommendations.push(
        '🌐 Use a real test API server or staging environment instead of API mocks'
      );
    }
    
    if (mockTypes.has(MockType.DATABASE_MOCK)) {
      recommendations.push(
        '🗄️  Use a real test database (e.g., PostgreSQL in Docker) instead of database mocks'
      );
    }
    
    if (mockTypes.has(MockType.FILESYSTEM_MOCK)) {
      recommendations.push(
        '📁 Use a temporary directory with real file operations instead of filesystem mocks'
      );
    }
    
    if (detections.length > 5) {
      recommendations.push(
        '🏗️  Consider setting up a In Progress test environment with Docker Compose for all dependencies'
      );
    }
    
    // General system test guidance
    recommendations.push(
      '📚 System tests validate the entire application flow. They should:',
      '   - Start the real application',
      '   - Use real databases and external services',
      '   - Test through actual user interfaces (UI, API)',
      '   - Verify end-to-end behavior'
    );
    
    // Suggest alternatives
    if (detections.some(d => d.pattern.includes('timer'))) {
      recommendations.push(
        '⏱️  For time-dependent tests, use real delays or adjust system time at OS level'
      );
    }
  }
}