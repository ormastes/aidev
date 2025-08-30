import { test, expect } from '@playwright/test';
import * as fs from 'fs/promises';
import * as path from 'path';

interface MockFreeTestCase {
  name: string;
  description: string;
  givenSteps: string[];
  whenSteps: string[];
  thenSteps: string[];
  metadata?: {
    priority?: 'high' | 'medium' | 'low';
    tags?: string[];
    estimatedDuration?: number;
  };
}

interface ManualTestStep {
  stepNumber: number;
  action: string;
  expectedResult: string;
  notes?: string;
  category: 'setup' | 'execution' | 'verification' | 'teardown';
}

interface ManualTestDocument {
  title: string;
  testId: string;
  description: string;
  prerequisites: string[];
  testSteps: ManualTestStep[];
  expectedResults: string[];
  notes: string[];
  metadata: {
    priority: 'high' | 'medium' | 'low';
    estimatedDuration: number;
    tags: string[];
    author: string;
    createdDate: string;
  };
}

class MockFreeTestOrientedConverter {
  convertToManual(testCase: MockFreeTestCase): ManualTestDocument {
    const testSteps: ManualTestStep[] = [];
    let stepNumber = 1;

    // Convert Given steps to setup steps
    testCase.givenSteps.forEach(given => {
      testSteps.push({
        stepNumber: stepNumber++,
        action: `Setup: ${given}`,
        expectedResult: 'System is in the required state',
        category: 'setup'
      });
    });

    // Convert When steps to execution steps
    testCase.whenSteps.forEach(when => {
      testSteps.push({
        stepNumber: stepNumber++,
        action: when,
        expectedResult: 'Action is performed successfully',
        category: 'execution'
      });
    });

    // Convert Then steps to verification steps
    testCase.thenSteps.forEach(then => {
      testSteps.push({
        stepNumber: stepNumber++,
        action: `Verify: ${then}`,
        expectedResult: then,
        category: 'verification'
      });
    });

    // Add teardown step if needed
    if (testCase.givenSteps.some(step => step.includes('database') || step.includes('server'))) {
      testSteps.push({
        stepNumber: stepNumber++,
        action: 'Clean up test data and restore system state',
        expectedResult: 'System is restored to original state',
        category: 'teardown'
      });
    }

    return {
      title: testCase.name,
      testId: `MT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      description: testCase.description,
      prerequisites: this.extractPrerequisites(testCase.givenSteps),
      testSteps,
      expectedResults: testCase.thenSteps,
      notes: this.generateNotes(testCase),
      metadata: {
        priority: testCase.metadata?.priority || 'medium',
        estimatedDuration: this.calculateDuration(testSteps),
        tags: testCase.metadata?.tags || [],
        author: 'MFTOD Converter',
        createdDate: new Date().toISOString()
      }
    };
  }

  private extractPrerequisites(givenSteps: string[]): string[] {
    return givenSteps.map(step => {
      if (step.includes('user is logged in')) return 'Valid user account with appropriate permissions';
      if (step.includes('database')) return 'Database is accessible and contains test data';
      if (step.includes('server')) return 'Application server is running and accessible';
      if (step.includes('API')) return 'API endpoints are available and functional';
      return step.replace(/^(given|assuming|provided)\s*/i, '');
    });
  }

  private calculateDuration(steps: ManualTestStep[]): number {
    const baseDuration = 5; // 5 minutes base
    const setupSteps = steps.filter(s => s.category === 'setup').length;
    const executionSteps = steps.filter(s => s.category === 'execution').length;
    const verificationSteps = steps.filter(s => s.category === 'verification').length;
    
    return baseDuration + (setupSteps * 2) + (executionSteps * 3) + (verificationSteps * 2);
  }

  private generateNotes(testCase: MockFreeTestCase): string[] {
    const notes: string[] = [];
    
    if (testCase.givenSteps.some(step => step.includes('database'))) {
      notes.push('Note: Ensure database backup is available before test execution');
    }
    
    if (testCase.whenSteps.some(step => step.includes('delete') || step.includes('remove'))) {
      notes.push('Warning: This test performs destructive operations. Use test data only');
    }
    
    if (testCase.thenSteps.some(step => step.includes('email') || step.includes('notification'))) {
      notes.push('Note: Check email/notification systems after test completion');
    }
    
    return notes;
  }

  generateHtml(manualTest: ManualTestDocument): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${manualTest.title} - Manual Test</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .metadata { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 15px 0; }
        .metadata-item { background: white; padding: 10px; border: 1px solid #ddd; border-radius: 3px; }
        .section { margin: 20px 0; }
        .step { margin: 10px 0; padding: 10px; border: 1px solid #eee; border-radius: 3px; }
        .step-number { font-weight: bold; color: #007acc; }
        .setup { border-left: 4px solid #28a745; }
        .execution { border-left: 4px solid #007bff; }
        .verification { border-left: 4px solid #ffc107; }
        .teardown { border-left: 4px solid #dc3545; }
        .notes { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 3px; }
        .checkbox { margin-right: 10px; }
        @media print {
            body { font-size: 12px; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${manualTest.title}</h1>
        <p><strong>Test ID:</strong> ${manualTest.testId}</p>
        <p><strong>Description:</strong> ${manualTest.description}</p>
    </div>

    <div class="metadata">
        <div class="metadata-item">
            <strong>Priority:</strong> ${manualTest.metadata.priority.toUpperCase()}
        </div>
        <div class="metadata-item">
            <strong>Estimated Duration:</strong> ${manualTest.metadata.estimatedDuration} minutes
        </div>
        <div class="metadata-item">
            <strong>Tags:</strong> ${manualTest.metadata.tags.join(', ') || 'None'}
        </div>
        <div class="metadata-item">
            <strong>Created:</strong> ${new Date(manualTest.metadata.createdDate).toLocaleDateString()}
        </div>
    </div>

    <div class="section">
        <h2>Prerequisites</h2>
        <ul>
            ${manualTest.prerequisites.map(prereq => `<li>${prereq}</li>`).join('')}
        </ul>
    </div>

    <div class="section">
        <h2>Test Steps</h2>
        ${manualTest.testSteps.map(step => `
            <div class="step ${step.category}">
                <input type="checkbox" class="checkbox"> 
                <span class="step-number">Step ${step.stepNumber}:</span>
                <div><strong>Action:</strong> ${step.action}</div>
                <div><strong>Expected Result:</strong> ${step.expectedResult}</div>
                ${step.notes ? `<div><em>Notes: ${step.notes}</em></div>` : ''}
            </div>
        `).join('')}
    </div>

    <div class="section">
        <h2>Overall Expected Results</h2>
        <ul>
            ${manualTest.expectedResults.map(result => `<li>${result}</li>`).join('')}
        </ul>
    </div>

    ${manualTest.notes.length > 0 ? `
    <div class="section">
        <h2>Notes & Warnings</h2>
        <div class="notes">
            ${manualTest.notes.map(note => `<p>${note}</p>`).join('')}
        </div>
    </div>
    ` : ''}

    <div class="section no-print">
        <h2>Test Execution Log</h2>
        <p><strong>Executed by:</strong> _____________________</p>
        <p><strong>Date:</strong> _____________________</p>
        <p><strong>Environment:</strong> _____________________</p>
        <p><strong>Result:</strong> ☐ PASS ☐ FAIL ☐ BLOCKED</p>
        <p><strong>Comments:</strong></p>
        <textarea style="width: 100%; height: 100px; margin-top: 10px;"></textarea>
    </div>
</body>
</html>`;
  }
}

test.describe('Mock-Free Test Oriented to Manual Converter System Tests', () => {
  let tempDir: string;
  let converter: MockFreeTestOrientedConverter;

  test.beforeEach(async () => {
    tempDir = path.join(__dirname, '..', '..', 'temp', `converter-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    converter = new MockFreeTestOrientedConverter();
  });

  test.afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Cleanup failed: ${error}`);
    }
  });

  test('should convert simple MFTOD test to manual test format', async () => {
    const mftodTest: MockFreeTestCase = {
      name: 'User Login Validation',
      description: 'Verify that users can log in with valid credentials',
      givenSteps: [
        'user has a valid account with username "testuser" and password "password123"',
        'login page is accessible'
      ],
      whenSteps: [
        'user enters username "testuser"',
        'user enters password "password123"',
        'user clicks login button'
      ],
      thenSteps: [
        'user is redirected to dashboard',
        'welcome message displays user name',
        'navigation menu is visible'
      ],
      metadata: {
        priority: 'high',
        tags: ['authentication', 'smoke'],
        estimatedDuration: 10
      }
    };

    const manualTest = converter.convertToManual(mftodTest);

    expect(manualTest.title).toBe('User Login Validation');
    expect(manualTest.description).toBe('Verify that users can log in with valid credentials');
    expect(manualTest.testId).toMatch(/^MT-\d+-[A-Z0-9]{6}$/);
    
    // Verify prerequisites extraction
    expect(manualTest.prerequisites).toContain('Valid user account with appropriate permissions');
    expect(manualTest.prerequisites.length).toBe(2);
    
    // Verify test steps structure
    expect(manualTest.testSteps).toHaveLength(7); // 2 given + 3 when + 3 then + 1 teardown
    
    const setupSteps = manualTest.testSteps.filter(s => s.category === 'setup');
    const executionSteps = manualTest.testSteps.filter(s => s.category === 'execution');
    const verificationSteps = manualTest.testSteps.filter(s => s.category === 'verification');
    
    expect(setupSteps).toHaveLength(2);
    expect(executionSteps).toHaveLength(3);
    expect(verificationSteps).toHaveLength(3);
    
    // Verify step content
    expect(setupSteps[0].action).toContain('user has a valid account');
    expect(executionSteps[0].action).toBe('user enters username "testuser"');
    expect(verificationSteps[0].expectedResult).toBe('user is redirected to dashboard');
    
    // Verify metadata
    expect(manualTest.metadata.priority).toBe('high');
    expect(manualTest.metadata.tags).toEqual(['authentication', 'smoke']);
    expect(manualTest.metadata.estimatedDuration).toBeGreaterThan(0);
  });

  test('should handle complex test scenarios with database operations', async () => {
    const complexTest: MockFreeTestCase = {
      name: 'User Profile Update with Email Verification',
      description: 'Test updating user profile information and email verification process',
      givenSteps: [
        'user is logged in as "john.doe@example.com"',
        'database contains user profile data',
        'email server is configured and accessible'
      ],
      whenSteps: [
        'user navigates to profile settings',
        'user updates email to "john.doe.new@example.com"',
        'user updates phone number to "+1234567890"',
        'user clicks save changes button',
        'user checks email for verification link',
        'user clicks verification link'
      ],
      thenSteps: [
        'profile is updated in database',
        'verification email is sent to new email address',
        'user email is marked as verified',
        'notification shows profile updated successfully'
      ],
      metadata: {
        priority: 'medium',
        tags: ['profile', 'email', 'database', 'integration']
      }
    };

    const manualTest = converter.convertToManual(complexTest);

    expect(manualTest.testSteps).toHaveLength(14); // Including teardown
    
    // Verify teardown step is added for database operations
    const teardownSteps = manualTest.testSteps.filter(s => s.category === 'teardown');
    expect(teardownSteps).toHaveLength(1);
    expect(teardownSteps[0].action).toContain('Clean up test data');
    
    // Verify notes are generated for email and database operations
    expect(manualTest.notes.length).toBeGreaterThan(0);
    expect(manualTest.notes.some(note => note.includes('database backup'))).toBe(true);
    expect(manualTest.notes.some(note => note.includes('email'))).toBe(true);
    
    // Verify prerequisites include database access
    expect(manualTest.prerequisites.some(prereq => 
      prereq.includes('Database') || prereq.includes('database')
    )).toBe(true);
  });

  test('should generate HTML manual test documents', async () => {
    const testCase: MockFreeTestCase = {
      name: 'File Upload Functionality',
      description: 'Test file upload with various file types and sizes',
      givenSteps: [
        'user is logged in',
        'file upload page is accessible',
        'test files are prepared (PDF, PNG, TXT)'
      ],
      whenSteps: [
        'user clicks upload button',
        'user selects PDF file (2MB)',
        'user confirms upload'
      ],
      thenSteps: [
        'file is uploaded successfully',
        'progress bar shows completion',
        'success message is displayed'
      ],
      metadata: {
        priority: 'high',
        tags: ['upload', 'files']
      }
    };

    const manualTest = converter.convertToManual(testCase);
    const htmlContent = converter.generateHtml(manualTest);

    // Save HTML to file for verification
    const htmlFile = path.join(tempDir, 'manual_test.html');
    await fs.writeFile(htmlFile, htmlContent);

    // Verify HTML structure
    expect(htmlContent).toContain('<!DOCTYPE html>');
    expect(htmlContent).toContain('<title>File Upload Functionality - Manual Test</title>');
    expect(htmlContent).toContain(manualTest.testId);
    expect(htmlContent).toContain('Test file upload with various file types and sizes');
    
    // Verify CSS styling
    expect(htmlContent).toContain('.setup { border-left: 4px solid #28a745; }');
    expect(htmlContent).toContain('.execution { border-left: 4px solid #007bff; }');
    expect(htmlContent).toContain('.verification { border-left: 4px solid #ffc107; }');
    
    // Verify test steps are rendered
    expect(htmlContent).toContain('Step 1:');
    expect(htmlContent).toContain('user clicks upload button');
    expect(htmlContent).toContain('file is uploaded successfully');
    
    // Verify interactive elements
    expect(htmlContent).toContain('<input type="checkbox"');
    expect(htmlContent).toContain('Test Execution Log');
    expect(htmlContent).toContain('☐ PASS ☐ FAIL ☐ BLOCKED');
    
    // Verify HTML file was created correctly
    const savedHtml = await fs.readFile(htmlFile, 'utf-8');
    expect(savedHtml).toBe(htmlContent);
  });

  test('should handle batch conversion of multiple test cases', async () => {
    const testCases: MockFreeTestCase[] = [
      {
        name: 'Basic Login Test',
        description: 'Simple login verification',
        givenSteps: ['login page is available'],
        whenSteps: ['user enters credentials'],
        thenSteps: ['user is logged in'],
        metadata: { priority: 'high', tags: ['auth'] }
      },
      {
        name: 'Password Reset Test',
        description: 'Password reset flow verification',
        givenSteps: ['user forgot password'],
        whenSteps: ['user requests password reset'],
        thenSteps: ['reset email is sent'],
        metadata: { priority: 'medium', tags: ['auth', 'email'] }
      },
      {
        name: 'Data Export Test',
        description: 'Test data export functionality',
        givenSteps: ['user has data to export'],
        whenSteps: ['user initiates export'],
        thenSteps: ['export file is generated'],
        metadata: { priority: 'low', tags: ['export', 'data'] }
      }
    ];

    const convertedTests = testCases.map(testCase => converter.convertToManual(testCase));
    
    expect(convertedTests).toHaveLength(3);
    
    // Verify each test has unique ID
    const testIds = convertedTests.map(t => t.testId);
    expect(new Set(testIds).size).toBe(3);
    
    // Verify priority ordering works
    const priorities = convertedTests.map(t => t.metadata.priority);
    expect(priorities).toEqual(['high', 'medium', 'low']);
    
    // Generate batch HTML report
    const batchHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Manual Test Suite</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .test-summary { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; }
        .high { border-left: 5px solid #dc3545; }
        .medium { border-left: 5px solid #ffc107; }
        .low { border-left: 5px solid #28a745; }
    </style>
</head>
<body>
    <h1>Manual Test Suite - Batch Conversion Results</h1>
    <p>Total Tests Converted: ${convertedTests.length}</p>
    
    ${convertedTests.map(test => `
        <div class="test-summary ${test.metadata.priority}">
            <h3>${test.title}</h3>
            <p><strong>ID:</strong> ${test.testId}</p>
            <p><strong>Priority:</strong> ${test.metadata.priority.toUpperCase()}</p>
            <p><strong>Duration:</strong> ${test.metadata.estimatedDuration} minutes</p>
            <p><strong>Steps:</strong> ${test.testSteps.length}</p>
            <p><strong>Tags:</strong> ${test.metadata.tags.join(', ')}</p>
        </div>
    `).join('')}
</body>
</html>`;

    const batchFile = path.join(tempDir, 'batch_report.html');
    await fs.writeFile(batchFile, batchHtml);
    
    const batchContent = await fs.readFile(batchFile, 'utf-8');
    expect(batchContent).toContain('Manual Test Suite - Batch Conversion Results');
    expect(batchContent).toContain('Total Tests Converted: 3');
  });

  test('should handle edge cases and validation', async () => {
    // Test with minimal input
    const minimalTest: MockFreeTestCase = {
      name: 'Minimal Test',
      description: '',
      givenSteps: [],
      whenSteps: ['perform action'],
      thenSteps: ['verify result']
    };

    const converted = converter.convertToManual(minimalTest);
    
    expect(converted.title).toBe('Minimal Test');
    expect(converted.testSteps.length).toBe(2); // Only when and then steps
    expect(converted.prerequisites).toHaveLength(0);
    expect(converted.metadata.priority).toBe('medium'); // Default priority
    
    // Test with empty steps
    const emptyStepsTest: MockFreeTestCase = {
      name: 'Empty Steps Test',
      description: 'Test with no steps',
      givenSteps: [],
      whenSteps: [],
      thenSteps: []
    };

    const emptyConverted = converter.convertToManual(emptyStepsTest);
    expect(emptyConverted.testSteps).toHaveLength(0);
    
    // Test with very long content
    const longContentTest: MockFreeTestCase = {
      name: 'Long Content Test with Very Long Name That Exceeds Normal Length Expectations',
      description: 'This is a very long description that contains multiple sentences and detailed information about what this test is supposed to accomplish in the system under test.',
      givenSteps: [
        'This is a very long given step that describes in great detail all the preconditions that must be met before executing this particular test case'
      ],
      whenSteps: [
        'This is a very long when step that describes in minute detail every single action that the user or system must perform'
      ],
      thenSteps: [
        'This is a very long then step that describes in comprehensive detail all the expected outcomes and verification points'
      ]
    };

    const longConverted = converter.convertToManual(longContentTest);
    expect(longConverted.title.length).toBeGreaterThan(50);
    expect(longConverted.testSteps[0].action.length).toBeGreaterThan(100);
    
    // Verify HTML generation handles long content
    const longHtml = converter.generateHtml(longConverted);
    expect(longHtml.length).toBeGreaterThan(5000);
    expect(longHtml).toContain('Long Content Test with Very Long Name');
  });

  test('should preserve test metadata and traceability', async () => {
    const traceabilityTest: MockFreeTestCase = {
      name: 'User Story US-123 - Account Registration',
      description: 'Verify user can register new account as per requirements REQ-456',
      givenSteps: [
        'registration page is accessible',
        'email validation service is available'
      ],
      whenSteps: [
        'user fills registration form',
        'user submits form'
      ],
      thenSteps: [
        'account is created',
        'confirmation email is sent'
      ],
      metadata: {
        priority: 'high',
        tags: ['registration', 'US-123', 'REQ-456', 'email'],
        estimatedDuration: 15
      }
    };

    const manualTest = converter.convertToManual(traceabilityTest);

    // Verify traceability information is preserved
    expect(manualTest.title).toContain('US-123');
    expect(manualTest.description).toContain('REQ-456');
    expect(manualTest.metadata.tags).toContain('US-123');
    expect(manualTest.metadata.tags).toContain('REQ-456');

    const htmlDoc = converter.generateHtml(manualTest);
    
    // Verify traceability appears in HTML
    expect(htmlDoc).toContain('US-123');
    expect(htmlDoc).toContain('REQ-456');
    expect(htmlDoc).toContain('registration');
    
    // Verify test ID format allows for traceability
    expect(manualTest.testId).toMatch(/^MT-/);
    
    // Verify creation metadata
    expect(manualTest.metadata.author).toBe('MFTOD Converter');
    expect(new Date(manualTest.metadata.createdDate)).toBeInstanceOf(Date);
  });
});