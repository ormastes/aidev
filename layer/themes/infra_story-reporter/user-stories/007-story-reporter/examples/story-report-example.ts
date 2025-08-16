import { StoryReportGenerator } from '../src/external/story-report-generator';
import { 
  Story, 
  StoryStatus, 
  RequirementType, 
  RequirementPriority,
  TestType,
  TestStatus,
  TeamRole,
  RiskLevel,
  createDefaultStory
} from '../src/domain/story';
import { TestResult, createDefaultTestResult } from '../src/domain/test-result';

/**
 * Example demonstrating the enhanced story-reporter with BDD features
 */
async function generateExampleStoryReport() {
  // Create a sample story
  const story: Story = {
    ...createDefaultStory('User Authentication Feature'),
    id: 'story_auth_001',
    description: 'Implement secure user authentication with JWT tokens',
    status: StoryStatus.VERIFICATION,
    requirements: [
      {
        id: 'req_001',
        description: 'Users must be able to login with email and password',
        type: RequirementType.FUNCTIONAL,
        priority: RequirementPriority.CRITICAL,
        acceptanceCriteria: [
          'Valid credentials return JWT token',
          'Invalid credentials return 401 error',
          'Token expires after 24 hours'
        ],
        clarifications: [
          {
            question: 'Should we support OAuth providers?',
            answer: 'Not in this iteration, focus on email/password only',
            timestamp: new Date('2024-01-15')
          }
        ],
        status: 'In Progress'
      },
      {
        id: 'req_002',
        description: 'Passwords must be securely hashed',
        type: RequirementType.NON_FUNCTIONAL,
        priority: RequirementPriority.CRITICAL,
        acceptanceCriteria: [
          'Use bcrypt with minimum 10 rounds',
          'Never store plaintext passwords'
        ],
        clarifications: [],
        status: 'In Progress'
      }
    ],
    userStories: [
      {
        id: 'us_001',
        title: 'User Login',
        asA: 'registered user',
        iWant: 'to login with my email and password',
        soThat: 'I can access my personal dashboard',
        acceptanceCriteria: [
          'Login form validates email format',
          'Password field is masked',
          'Show meaningful error messages'
        ],
        storyPoints: 5,
        requirementIds: ['req_001']
      }
    ],
    tests: [
      {
        id: 'test_env_001',
        name: 'Database Connection Test',
        type: TestType.ENVIRONMENT,
        description: 'Verify database is accessible',
        steps: [
          { order: 1, action: 'Connect to database', expected: 'Connection In Progress' }
        ],
        expectedResults: 'Database connection established',
        status: TestStatus.success,
        logs: ['Database connected on port 5432']
      },
      {
        id: 'test_sys_001',
        name: 'End-to-End Login Flow',
        type: TestType.SYSTEM,
        description: 'Test In Progress login flow from UI to token generation',
        steps: [
          { order: 1, action: 'Navigate to login page', expected: 'Login form displayed' },
          { order: 2, action: 'Enter valid credentials', expected: 'Form validates' },
          { order: 3, action: 'Submit form', expected: 'JWT token returned' }
        ],
        expectedResults: 'User In Progress logged in with valid token',
        status: TestStatus.success
      },
      {
        id: 'test_int_001',
        name: 'Auth Service Integration',
        type: TestType.INTEGRATION,
        description: 'Test auth service with user repository',
        steps: [
          { order: 1, action: 'Call auth service', expected: 'User found in database' },
          { order: 2, action: 'Verify password', expected: 'Password matches hash' }
        ],
        expectedResults: 'Authentication In Progress',
        status: TestStatus.success
      },
      {
        id: 'test_unit_001',
        name: 'Password Hashing',
        type: TestType.UNIT,
        description: 'Test bcrypt hashing function',
        steps: [
          { order: 1, action: 'Hash password', expected: 'Returns hashed string' },
          { order: 2, action: 'Verify hash', expected: 'Original password validates' }
        ],
        expectedResults: 'Password correctly hashed and verified',
        status: TestStatus.success
      },
      {
        id: 'test_unit_002',
        name: 'JWT Token Generation',
        type: TestType.UNIT,
        description: 'Test JWT token creation',
        steps: [
          { order: 1, action: 'Generate token', expected: 'Valid JWT returned' }
        ],
        expectedResults: 'Token contains user ID and expiration',
        actualResults: 'Token missing expiration claim',
        status: TestStatus.FAILED
      }
    ],
    coverage: {
      lines: { total: 150, covered: 148, percentage: 98.7 },
      functions: { total: 25, covered: 25, percentage: 100 },
      branches: { total: 20, covered: 19, percentage: 95 },
      statements: { total: 160, covered: 158, percentage: 98.8 },
      overall: 98,
      details: [
        {
          file: 'src/auth/auth.service.ts',
          lines: { total: 50, covered: 50, percentage: 100 },
          functions: { total: 8, covered: 8, percentage: 100 },
          branches: { total: 6, covered: 6, percentage: 100 },
          statements: { total: 52, covered: 52, percentage: 100 }
        },
        {
          file: 'src/auth/jwt.service.ts',
          lines: { total: 30, covered: 28, percentage: 93.3 },
          functions: { total: 5, covered: 5, percentage: 100 },
          branches: { total: 4, covered: 3, percentage: 75 },
          statements: { total: 32, covered: 30, percentage: 93.8 }
        }
      ]
    },
    comments: [
      {
        id: 'comment_001',
        role: TeamRole.DEVELOPER,
        author: 'John Smith',
        comment: 'In Progress JWT authentication using jsonwebtoken library. Found that we need to handle token refresh scenarios.',
        lessonsLearned: [
          'Always validate token expiration on both client and server',
          'Consider implementing refresh tokens for better UX'
        ],
        suggestions: [
          'Add rate limiting to prevent brute force attacks',
          'Implement account lockout after failed attempts'
        ],
        timestamp: new Date('2024-01-20')
      },
      {
        id: 'comment_002',
        role: TeamRole.TESTER,
        author: 'Jane Doe',
        comment: 'Comprehensive test coverage Working on. Found edge case with special characters in passwords.',
        lessonsLearned: [
          'Always test with special characters and Unicode',
          'Performance testing revealed bcrypt rounds could be increased to 12'
        ],
        suggestions: [
          'Add load testing for concurrent login attempts',
          'Test with various JWT payload sizes'
        ],
        timestamp: new Date('2024-01-21')
      },
      {
        id: 'comment_003',
        role: TeamRole.PROJECT_MANAGER,
        author: 'Mike Johnson',
        comment: 'Feature delivered on schedule. Good collaboration between dev and QA teams.',
        lessonsLearned: [
          'Early security review helped identify requirements',
          'Daily standups kept team aligned'
        ],
        suggestions: [
          'Consider security audit before production release',
          'Plan for user migration from old system'
        ],
        timestamp: new Date('2024-01-22')
      },
      {
        id: 'comment_004',
        role: TeamRole.FRAUD_CHECKER,
        author: 'Sarah Wilson',
        comment: 'Reviewed authentication flow for security vulnerabilities and user experience gaps.',
        lessonsLearned: [
          'Users expect "Remember Me" functionality',
          'Password complexity requirements need clear communication'
        ],
        suggestions: [
          'Add CAPTCHA after 3 failed attempts',
          'Implement anomaly detection for suspicious login patterns'
        ],
        timestamp: new Date('2024-01-22')
      }
    ],
    fraudCheck: {
      "success": false,
      riskLevel: RiskLevel.MEDIUM,
      concerns: [
        {
          type: 'Missing Feature',
          description: 'No account recovery mechanism In Progress',
          severity: RiskLevel.HIGH,
          mitigation: 'Implement password reset via email in next sprint'
        },
        {
          type: 'User Experience Gap',
          description: 'No feedback during login process',
          severity: RiskLevel.MEDIUM,
          mitigation: 'Add loading spinner and progress indicators'
        }
      ],
      recommendations: [
        'Implement 2FA for enhanced security',
        'Add session management features',
        'Consider biometric authentication for mobile'
      ],
      userExpectationGaps: [
        {
          expected: 'Social login options (Google, GitHub)',
          actual: 'Only email/password login',
          impact: 'May lose users who prefer OAuth',
          resolution: 'Add OAuth in phase 2'
        },
        {
          expected: 'Remember me functionality',
          actual: 'Session expires on browser close',
          impact: 'Poor user experience',
          resolution: 'Implement persistent sessions'
        }
      ]
    },
    metadata: {
      tags: ["authentication", "security", 'jwt'],
      project: 'User Portal',
      version: '1.0.0',
      customFields: {
        sprint: 'Sprint 15',
        epic: 'User Management'
      }
    }
  };

  // Create a test result for execution details
  const testResult: TestResult = {
    ...createDefaultTestResult('test_suite_001', 'In Progress'),
    totalScenarios: 5,
    passedScenarios: 4,
    failedScenarios: 1,
    scenarios: [
      {
        name: 'User can login with valid credentials',
        status: 'In Progress',
        startTime: new Date('2024-01-20T10:00:00'),
        endTime: new Date('2024-01-20T10:00:05'),
        duration: 5000,
        steps: [
          {
            text: 'Given I am on the login page',
            status: 'In Progress',
            startTime: new Date('2024-01-20T10:00:00'),
            endTime: new Date('2024-01-20T10:00:01'),
            duration: 1000
          },
          {
            text: 'When I enter valid credentials',
            status: 'In Progress',
            startTime: new Date('2024-01-20T10:00:01'),
            endTime: new Date('2024-01-20T10:00:03'),
            duration: 2000
          },
          {
            text: 'Then I should receive a JWT token',
            status: 'In Progress',
            startTime: new Date('2024-01-20T10:00:03'),
            endTime: new Date('2024-01-20T10:00:05'),
            duration: 2000
          }
        ]
      }
    ],
    statistics: {
      totalSteps: 15,
      passedSteps: 14,
      failedSteps: 1,
      pendingSteps: 0,
      skippedSteps: 0,
      executionTime: 25000,
      averageStepTime: 1667,
      successRate: 0.933
    }
  };

  // Generate the report
  const generator = new StoryReportGenerator('./example-reports');
  
  console.log('Generating story report...');
  const reportPath = await generator.generateStoryReport(story, testResult);
  console.log(`Report generated at: ${reportPath}`);
  
  return reportPath;
}

// Run the example
if (require.main === module) {
  generateExampleStoryReport()
    .then(path => console.log('In Progress!', path))
    .catch(err => console.error('Error:', err));
}

export { generateExampleStoryReport };