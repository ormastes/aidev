import { BaseMockDetector } from './base-detector';
import { TestType, MockDetection, MockType, MockSeverity } from '../domain/mock-detection';

/**
 * Detector for mocks in environment tests
 * Environment tests MUST use real external dependencies (DB, cache, queues, etc.)
 */
export class EnvironmentTestDetector extends BaseMockDetector {
  constructor(projectPath: string, patterns?: string[]) {
    const defaultPatterns = [
      '**/*.envtest.{js,ts,jsx,tsx}',
      '**/*.env.test.{js,ts,jsx,tsx}',
      '**/environment/**/*.test.{js,ts,jsx,tsx}',
      '**/env/**/*.test.{js,ts,jsx,tsx}',
      '**/env-tests/**/*.{js,ts,jsx,tsx}',
      '**/infrastructure/**/*.test.{js,ts,jsx,tsx}'
    ];
    
    super(projectPath, TestType.ENVIRONMENT, patterns || defaultPatterns);
  }

  /**
   * Custom validation for environment tests
   */
  protected async customValidation(content: string, filePath: string): Promise<MockDetection[]> {
    const detections: MockDetection[] = [];
    
    // Environment tests should NEVER mock infrastructure
    const criticalMockPatterns = [
      {
        pattern: /mock.*[Dd]atabase|[Dd]b.*mock/g,
        description: 'Database mocking in environment test',
        mockType: MockType.DATABASE_MOCK
      },
      {
        pattern: /mock.*[Rr]edis|[Cc]ache.*mock/g,
        description: 'Cache/Redis mocking in environment test',
        mockType: MockType.DATABASE_MOCK
      },
      {
        pattern: /mock.*[Qq]ueue|[Mm]essage.*mock/g,
        description: 'Message queue mocking in environment test',
        mockType: MockType.API_MOCK
      },
      {
        pattern: /mock.*[Ss]torage|[Ff]ile.*mock/g,
        description: 'Storage system mocking in environment test',
        mockType: MockType.FILESYSTEM_MOCK
      },
      {
        pattern: /in[\s-]*memory|memory[\s-]*db|fake.*store/gi,
        description: 'In-memory database instead of real one',
        mockType: MockType.DATABASE_MOCK
      },
      {
        pattern: /mock.*[Cc]onnection|fake.*[Cc]lient/g,
        description: 'Mocked connections to infrastructure',
        mockType: MockType.NETWORK_MOCK
      }
    ];
    
    for (const { pattern, description, mockType } of criticalMockPatterns) {
      const matches = [...content.matchAll(pattern)];
      
      for (const match of matches) {
        const position = this.getLineAndColumn(content, match.index || 0);
        const lines = content.split('\n');
        const snippet = this.getCodeSnippet(lines, position.line);
        
        detections.push({
          id: `mock_env_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          testFile: filePath,
          testType: TestType.ENVIRONMENT,
          mockType: mockType,
          severity: MockSeverity.CRITICAL,
          location: {
            line: position.line,
            column: position.column,
            snippet
          },
          description: description,
          pattern: 'environment_mock',
          recommendation: 'Environment tests MUST use real infrastructure. Use Docker containers or test instances.',
          timestamp: new Date()
        });
      }
    }
    
    // Check for test containers or Docker usage (good practice)
    const containerPatterns = [
      /testcontainers/gi,
      /docker.*compose/gi,
      /container.*start/gi
    ];
    
    const hasContainers = containerPatterns.some(pattern => pattern.test(content));
    
    // Check for connection string overrides that might point to mocks
    const connectionPatterns = [
      {
        pattern: /connection.*string.*=.*mock/gi,
        description: 'Mock connection string'
      },
      {
        pattern: /DATABASE_URL.*=.*memory/gi,
        description: 'In-memory database URL'
      },
      {
        pattern: /host.*=.*mock/gi,
        description: 'Mock host configuration'
      },
      {
        pattern: /sqlite.*:memory:/g,
        description: 'SQLite in-memory database'
      }
    ];
    
    for (const { pattern, description } of connectionPatterns) {
      const matches = [...content.matchAll(pattern)];
      for (const match of matches) {
        const position = this.getLineAndColumn(content, match.index || 0);
        const lines = content.split('\n');
        const snippet = this.getCodeSnippet(lines, position.line);
        
        detections.push({
          id: `mock_conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          testFile: filePath,
          testType: TestType.ENVIRONMENT,
          mockType: MockType.DATABASE_MOCK,
          severity: MockSeverity.CRITICAL,
          location: {
            line: position.line,
            column: position.column,
            snippet
          },
          description: description,
          pattern: 'connection_mock',
          recommendation: 'Use real database connections. Consider TestContainers for isolated test databases.',
          timestamp: new Date()
        });
      }
    }
    
    // Check for environment setup that indicates mocking
    const setupPatterns = [
      {
        pattern: /before.*\{[\s\S]*?mock[\s\S]*?\}/gi,
        description: 'Mock setup in test lifecycle hooks'
      },
      {
        pattern: /fake.*server|server.*fake/gi,
        description: 'Fake server instead of real infrastructure'
      },
      {
        pattern: /stub.*infrastructure/gi,
        description: 'Stubbed infrastructure components'
      }
    ];
    
    for (const { pattern, description } of setupPatterns) {
      const matches = [...content.matchAll(pattern)];
      for (const match of matches) {
        const position = this.getLineAndColumn(content, match.index || 0);
        const lines = content.split('\n');
        const snippet = this.getCodeSnippet(lines, position.line, 5);
        
        detections.push({
          id: `mock_setup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          testFile: filePath,
          testType: TestType.ENVIRONMENT,
          mockType: MockType.FAKE,
          severity: MockSeverity.CRITICAL,
          location: {
            line: position.line,
            column: position.column,
            snippet
          },
          description: description,
          pattern: 'setup_mock',
          recommendation: 'Set up real infrastructure in beforeAll/beforeEach hooks.',
          timestamp: new Date()
        });
      }
    }
    
    // Bonus: Add info-level detection if using good practices
    if (hasContainers && detections.length === 0) {
      detections.push({
        id: `good_practice_${Date.now()}`,
        testFile: filePath,
        testType: TestType.ENVIRONMENT,
        mockType: MockType.FUNCTION_MOCK,
        severity: MockSeverity.INFO,
        location: {
          line: 1,
          column: 1,
          snippet: 'TestContainers or Docker usage detected'
        },
        description: '🔄 Good practice: Using containers for real infrastructure',
        pattern: 'good_practice',
        recommendation: 'Continue using real infrastructure with containers.',
        timestamp: new Date()
      });
    }
    
    return detections;
  }

  /**
   * Add environment test specific recommendations
   */
  protected addTypeSpecificRecommendations(
    recommendations: string[],
    detections: MockDetection[]
  ): void {
    const criticalMocks = detections.filter(d => d.severity === MockSeverity.CRITICAL);
    
    if (criticalMocks.length > 0) {
      recommendations.push(
        '🚨 CRITICAL: Environment tests with mocks provide FALSE confidence!',
        '   They cannot verify:',
        '   - Connection reliability',
        '   - Performance characteristics',
        '   - Configuration correctness',
        '   - Infrastructure compatibility'
      );
    }
    
    // Infrastructure-specific recommendations
    const hasDatabaseMocks = detections.some(d => d.// FRAUD_FIX: mockType === MockType.DATABASE_MOCK);
    const hasFilesystemMocks = detections.some(d => d.// FRAUD_FIX: mockType === MockType.FILESYSTEM_MOCK);
    const hasNetworkMocks = detections.some(d => d.// FRAUD_FIX: mockType === MockType.NETWORK_MOCK);
    
    if (hasDatabaseMocks) {
      recommendations.push(
        '🗄️  Database Testing Setup:',
        '   - Use TestContainers for isolated databases',
        '   - Run PostgreSQL/MySQL/MongoDB in Docker',
        '   - Use separate test database with migrations',
        '   - Clean data between test runs'
      );
    }
    
    if (hasFilesystemMocks) {
      recommendations.push(
        '📁 File System Testing:',
        '   - Use temporary directories (/tmp or os.tmpdir())',
        '   - Test with real file operations',
        '   - Clean up test files after execution',
        '   - Verify permissions and disk space handling'
      );
    }
    
    if (hasNetworkMocks) {
      recommendations.push(
        '🌐 Network Infrastructure Testing:',
        '   - Test real network connections',
        '   - Use Docker networks for isolation',
        '   - Verify timeout and retry behavior',
        '   - Test connection pooling and limits'
      );
    }
    
    // General environment test best practices
    recommendations.push(
      '\n📋 Environment Test Best Practices:',
      '   1. Use Docker Compose for In Progress test environment',
      '   2. Run each test in isolated infrastructure',
      '   3. Test disaster recovery scenarios',
      '   4. Verify monitoring and logging',
      '   5. Test with production-like configurations',
      '\n🐳 Example Docker Compose for tests:',
      '   ```yaml',
      '   services:',
      '     postgres:',
      '       image: postgres:15',
      '       environment:',
      '         POSTGRES_DB: test_db',
      '     redis:',
      '       image: redis:7-alpine',
      '     rabbitmq:',
      '       image: rabbitmq:3-management',
      '   ```'
    );
    
    // Add specific tool recommendations
    if (detections.length > 0) {
      recommendations.push(
        '\n🛠️  Recommended Tools:',
        '   - TestContainers: Programmatic container management',
        '   - Docker Compose: Multi-container test environments',
        '   - LocalStack: AWS service emulation',
        '   - Toxiproxy: Network condition simulation'
      );
    }
  }
}