import { BaseMockDetector } from './base-detector';
import { TestType, MockDetection, MockType, MockSeverity } from '../domain/mock-detection';

/**
 * Detector for mocks in external tests
 * External tests should test real external interfaces with minimal mocking
 */
export class ExternalTestDetector extends BaseMockDetector {
  constructor(projectPath: string, patterns?: string[]) {
    const defaultPatterns = [
      '**/*.etest.{js,ts,jsx,tsx}',
      '**/*.external.test.{js,ts,jsx,tsx}',
      '**/external/**/*.test.{js,ts,jsx,tsx}',
      '**/external-tests/**/*.{js,ts,jsx,tsx}',
      '**/api-tests/**/*.{js,ts,jsx,tsx}'
    ];
    
    super(projectPath, TestType.EXTERNAL, patterns || defaultPatterns);
  }

  /**
   * Custom validation for external tests
   */
  protected async customValidation(content: string, filePath: string): Promise<MockDetection[]> {
    const detections: MockDetection[] = [];
    
    // Check for patterns that indicate mocking of external services
    const externalMockPatterns = [
      {
        pattern: /mock.*[Aa]pi/g,
        description: 'Mocking external API',
        mockType: MockType.API_MOCK
      },
      {
        pattern: /stub.*[Ss]ervice/g,
        description: 'Stubbing external service',
        mockType: MockType.API_MOCK
      },
      {
        pattern: /fake.*[Cc]lient/g,
        description: 'Using fake client instead of real one',
        mockType: MockType.API_MOCK
      },
      {
        pattern: /mock.*[Hh]ttp/g,
        description: 'Mocking HTTP calls',
        mockType: MockType.NETWORK_MOCK
      },
      {
        pattern: /interceptor.*mock/gi,
        description: 'Using mock interceptors',
        mockType: MockType.NETWORK_MOCK
      }
    ];
    
    for (const { pattern, description, mockType } of externalMockPatterns) {
      const matches = [...content.matchAll(pattern)];
      
      for (const match of matches) {
        const position = this.getLineAndColumn(content, match.index || 0);
        const lines = content.split('\n');
        const snippet = this.getCodeSnippet(lines, position.line);
        
        detections.push({
          id: `mock_external_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          testFile: filePath,
          testType: TestType.EXTERNAL,
          mockType: mockType,
          severity: MockSeverity.HIGH,
          location: {
            line: position.line,
            column: position.column,
            snippet
          },
          description: description,
          pattern: 'external_mock_pattern',
          recommendation: 'External tests should use real external services. Set up test instances or sandboxes.',
          timestamp: new Date()
        });
      }
    }
    
    // Check for configuration that might bypass real services
    const bypassPatterns = [
      {
        pattern: /USE_MOCK_SERVICE|MOCK_ENABLED|BYPASS_EXTERNAL/g,
        description: 'Environment variable suggesting mock usage'
      },
      {
        pattern: /localhost.*mock|mock.*server/gi,
        description: 'Mock server configuration'
      },
      {
        pattern: /offline\s*:\s*true/g,
        description: 'Offline mode that might use mocks'
      }
    ];
    
    for (const { pattern, description } of bypassPatterns) {
      if (pattern.test(content)) {
        const match = content.match(pattern);
        if (match) {
          const position = this.getLineAndColumn(content, match.index || 0);
          const lines = content.split('\n');
          const snippet = this.getCodeSnippet(lines, position.line);
          
          detections.push({
            id: `mock_bypass_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            testFile: filePath,
            testType: TestType.EXTERNAL,
            mockType: MockType.API_MOCK,
            severity: MockSeverity.HIGH,
            location: {
              line: position.line,
              column: position.column,
              snippet
            },
            description: description,
            pattern: 'bypass_pattern',
            recommendation: 'Configure tests to use real external services, not mock servers.',
            timestamp: new Date()
          });
        }
      }
    }
    
    // Check if external service URLs are being overridden
    const urlOverridePatterns = [
      /baseURL\s*[:=]\s*['"`].*mock/gi,
      /endpoint\s*[:=]\s*['"`].*stub/gi,
      /url.*override/gi
    ];
    
    for (const pattern of urlOverridePatterns) {
      const matches = [...content.matchAll(pattern)];
      for (const match of matches) {
        const position = this.getLineAndColumn(content, match.index || 0);
        const lines = content.split('\n');
        const snippet = this.getCodeSnippet(lines, position.line);
        
        detections.push({
          id: `mock_url_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          testFile: filePath,
          testType: TestType.EXTERNAL,
          mockType: MockType.API_MOCK,
          severity: MockSeverity.MEDIUM,
          location: {
            line: position.line,
            column: position.column,
            snippet
          },
          description: 'URL override detected - might be pointing to mock service',
          pattern: 'url_override',
          recommendation: 'Use real service URLs, possibly test/sandbox instances.',
          timestamp: new Date()
        });
      }
    }
    
    return detections;
  }

  /**
   * Add external test specific recommendations
   */
  protected addTypeSpecificRecommendations(
    recommendations: string[],
    detections: MockDetection[]
  ): void {
    const hasApiMocks = detections.some(d => d.mockType === MockType.API_MOCK);
    const hasNetworkMocks = detections.some(d => d.mockType === MockType.NETWORK_MOCK);
    
    if (hasApiMocks) {
      recommendations.push(
        '🔌 External API Testing Best Practices:',
        '   - Use sandbox/test instances of external services',
        '   - Request test API keys from service providers',
        '   - Set up dedicated test accounts',
        '   - Use rate-limited test endpoints'
      );
    }
    
    if (hasNetworkMocks) {
      recommendations.push(
        '🌐 Network Testing Recommendations:',
        '   - Test against real network conditions',
        '   - Use network throttling tools instead of mocks',
        '   - Set up local instances of external services if needed'
      );
    }
    
    // Check for specific service mocks
    const serviceTypes = this.detectServiceTypes(detections);
    
    if (serviceTypes.has('payment')) {
      recommendations.push(
        '💳 Payment Service Testing:',
        '   - Use payment provider test mode (e.g., Stripe test keys)',
        '   - Test with sandbox accounts',
        '   - Verify webhook handling with real callbacks'
      );
    }
    
    if (serviceTypes.has('email')) {
      recommendations.push(
        '📧 Email Service Testing:',
        '   - Use services like Mailtrap or MailHog',
        '   - Test with real SMTP but captured emails',
        '   - Verify actual email formatting and delivery'
      );
    }
    
    if (serviceTypes.has('storage')) {
      recommendations.push(
        '☁️  Storage Service Testing:',
        '   - Use test buckets/containers',
        '   - Test with real cloud storage APIs',
        '   - Clean up test data after runs'
      );
    }
    
    // General external test guidance
    if (detections.length > 0) {
      recommendations.push(
        '\n📋 External Test Guidelines:',
        '   - External tests validate integration with third-party services',
        '   - They should use real APIs with test credentials',
        '   - Only mock if service has no test environment',
        '   - Document any required mock usage with justification'
      );
    }
  }

  /**
   * Detect types of services being mocked
   */
  private detectServiceTypes(detections: MockDetection[]): Set<string> {
    const types = new Set<string>();
    
    const patterns = {
      payment: /payment|stripe|paypal|billing|checkout/i,
      email: /email|mail|smtp|sendgrid|mailgun/i,
      storage: /s3|storage|bucket|blob|cloudinary/i,
      auth: /auth|oauth|jwt|token|login/i,
      analytics: /analytics|tracking|segment|mixpanel/i
    };
    
    for (const detection of detections) {
      const content = detection.location.snippet.toLowerCase();
      for (const [type, pattern] of Object.entries(patterns)) {
        if (pattern.test(content)) {
          types.add(type);
        }
      }
    }
    
    return types;
  }
}