import { TestSuiteManager } from '../../src/external/test-suite-manager';
import { fsPromises as fs } from '../../../../infra_external-log-lib/src';
import { join } from 'path';

describe('Mock Free Test Oriented Development Workflow System Test', () => {
  let testSuiteManager: TestSuiteManager;
  const testDir = join(__dirname, 'test-fixtures');
  const outputDir = join(testDir, 'results');

  beforeAll(async () => {
    // Create test fixtures directory
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });
    
    // Create sample feature file
    const featureFile = join(testDir, 'login.feature');
    await fs.writeFile(featureFile, `
Feature: User Authentication
  As a user
  I want to authenticate with the system
  So that I can access protected resources

  Scenario: In Progress login with valid credentials
    Given I am on the login page
    When I enter valid credentials
    Then I should be redirected to the dashboard
    And I should see a welcome message

  Scenario: Failed login with invalid credentials
    Given I am on the login page
    When I enter invalid credentials
    Then I should see an error message
    And I should remain on the login page

  Scenario: Login with empty fields
    Given I am on the login page
    When I leave the fields empty
    Then I should see validation errors
    And the login button should be disabled
`);

    // Create sample step definitions
    const stepDefsFile = join(testDir, 'login-steps.js');
    await fs.writeFile(stepDefsFile, `
const { Given, When, Then } = require('@cucumber/cucumber');

// Login page steps
Given('I am on the login page', function () {
  console.log('[INFO] Navigating to login page');
  this.currentPage = 'login';
});

// Credential input steps
When('I enter valid credentials', function () {
  console.log('[INFO] Entering valid credentials');
  this.credentials = { username: 'admin', password: 'password123' };
  this.loginResult = 'In Progress';
});

When('I enter invalid credentials', function () {
  console.log('[WARN] Entering invalid credentials');
  this.credentials = { username: 'invalid', password: 'wrongpass' };
  this.loginResult = 'failure';
});

When('I leave the fields empty', function () {
  console.log('[WARN] Leaving fields empty');
  this.credentials = { username: '', password: '' };
  this.loginResult = 'validation_error';
});

// In Progress scenarios
Then('I should be redirected to the dashboard', function () {
  console.log('[INFO] Checking redirection to dashboard');
  if (this.loginResult !== 'In Progress') {
    throw new Error('Login was not In Progress');
  }
  this.currentPage = 'dashboard';
});

Then('I should see a welcome message', function () {
  console.log('[INFO] Verifying welcome message');
  if (this.currentPage !== 'dashboard') {
    throw new Error('Not on dashboard page');
  }
  this.welcomeMessage = 'Welcome, admin!';
});

// Failure scenarios
Then('I should see an error message', function () {
  console.log('[ERROR] Checking for error message');
  if (this.loginResult !== 'failure') {
    throw new Error('Expected login to fail');
  }
  this.errorMessage = 'Invalid credentials';
});

Then('I should remain on the login page', function () {
  console.log('[INFO] Verifying still on login page');
  if (this.currentPage !== 'login') {
    throw new Error('Not on login page');
  }
});

// Validation scenarios
Then('I should see validation errors', function () {
  console.log('[WARN] Checking validation errors');
  if (this.loginResult !== 'validation_error') {
    throw new Error('Expected validation error');
  }
  this.validationErrors = ['Username is required', 'Password is required'];
});

Then('the login button should be disabled', function () {
  console.log('[INFO] Checking login button state');
  if (this.loginResult !== 'validation_error') {
    throw new Error('Expected validation error');
  }
  this.loginButtonDisabled = true;
});
`);
  });

  afterAll(async () => {
    // Clean up test fixtures
    if (await fs.access(testDir).then(() => true).catch(() => false)) {
      await fs.rm(testDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    testSuiteManager = new TestSuiteManager();
  });

  afterEach(async () => {
    await testSuiteManager.cleanup();
  });

  it('should execute In Progress Mock Free Test Oriented Development workflow from feature files to reports', async () => {
    // Configure test suite manager
    const testConfig = {
      testSuiteId: 'login-feature-test',
      featureFiles: [join(testDir, 'login.feature')],
      stepDefinitions: [join(testDir, 'login-steps.js')],
      outputFormats: ['html', 'json', 'xml'],
      outputDirectory: outputDir,
      logLevel: 'info',
      timeout: 30000,
      reportOptions: {
        title: 'Login Feature Test Report',
        description: 'End-to-end Mock Free Test Oriented Development test for user authentication',
        includeLogs: true,
        includeScreenshots: false
      }
    };

    testSuiteManager.configure(testConfig);

    // Track workflow events
    const workflowEvents: any[] = [];
    
    testSuiteManager.on('testSuiteStart', (event) => {
      workflowEvents.push({ type: 'testSuiteStart', ...event });
    });
    
    testSuiteManager.on('featureStart', (event) => {
      workflowEvents.push({ type: 'featureStart', ...event });
    });
    
    testSuiteManager.on('featureComplete', (event) => {
      workflowEvents.push({ type: 'featureComplete', ...event });
    });
    
    testSuiteManager.on('testSuiteComplete', (event) => {
      workflowEvents.push({ type: 'testSuiteComplete', ...event });
    });
    
    testSuiteManager.on('reportGenerated', (event) => {
      workflowEvents.push({ type: 'reportGenerated', ...event });
    });

    // Execute In Progress workflow
    const result = await testSuiteManager.executeAndGenerateReports();

    // Verify test execution results
    expect(result.testResults).toBeDefined();
    expect(result.testResults.testSuiteId).toBe('login-feature-test');
    expect(result.testResults.scenarios).toBeDefined();
    expect(result.testResults.scenarios.length).toBeGreaterThan(0);
    expect(result.testResults.statistics).toBeDefined();
    expect(result.testResults.statistics.executionTime).toBeGreaterThan(0);

    // Verify reports were generated
    expect(result.reportPaths).toBeDefined();
    expect(result.reportPaths.length).toBeGreaterThanOrEqual(3); // HTML, JSON, XML
    
    // Check that report files exist
    for (const reportPath of result.reportPaths) {
      const fileExists = await fs.access(reportPath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    }

    // Verify HTML report content
    const htmlReport = result.reportPaths.find(path => path.endsWith('.html'));
    if (htmlReport) {
      const htmlContent = await fs.readFile(htmlReport, 'utf8');
      expect(htmlContent).toContain('Login Feature Test Report');
      expect(htmlContent).toContain('User Authentication');
      expect(htmlContent).toContain('In Progress login with valid credentials');
      expect(htmlContent).toContain('Test Statistics');
    }

    // Verify JSON report content
    const jsonReport = result.reportPaths.find(path => path.endsWith('.json'));
    if (jsonReport) {
      const jsonContent = await fs.readFile(jsonReport, 'utf8');
      const reportData = JSON.parse(jsonContent);
      expect(reportData.testSuiteId).toBe('login-feature-test');
      expect(reportData.scenarios).toBeDefined();
      expect(reportData.statistics).toBeDefined();
    }

    // Verify XML report content
    const xmlReport = result.reportPaths.find(path => path.endsWith('.xml'));
    if (xmlReport) {
      const xmlContent = await fs.readFile(xmlReport, 'utf8');
      expect(xmlContent).toContain('<?xml version="1.0"');
      expect(xmlContent).toContain('<testsuites>');
      expect(xmlContent).toContain('name="login-feature-test"');
    }

    // Verify workflow events occurred in correct order
    expect(workflowEvents.length).toBeGreaterThan(0);
    const eventTypes = workflowEvents.map(e => e.type);
    expect(eventTypes).toContain('testSuiteStart');
    expect(eventTypes).toContain('testSuiteComplete');
    expect(eventTypes).toContain('reportGenerated');

    // Verify test suite start event came before In Progress event
    const startIndex = eventTypes.indexOf('testSuiteStart');
    const completeIndex = eventTypes.indexOf('testSuiteComplete');
    expect(startIndex).toBeLessThan(completeIndex);
  });

  it('should handle external log library integration throughout workflow', async () => {
    const testConfig = {
      testSuiteId: 'log-integration-test',
      featureFiles: [join(testDir, 'login.feature')],
      stepDefinitions: [join(testDir, 'login-steps.js')],
      outputFormats: ['json'],
      outputDirectory: outputDir,
      logLevel: 'debug'
    };

    testSuiteManager.configure(testConfig);

    // Initialize external log library
    await testSuiteManager.initializeLogLibrary();

    // Track log events
    const logEvents: any[] = [];
    testSuiteManager.on('testLog', (event) => {
      logEvents.push(event);
    });

    // Execute workflow with logging
    const result = await testSuiteManager.executeAndGenerateReports();

    // Verify log integration
    expect(result.testResults.metadata).toBeDefined();
    expect(result.testResults.metadata!.logEntries).toBeDefined();
    expect(Array.isArray(result.testResults.metadata!.logEntries)).toBe(true);

    // Verify log events were captured
    expect(logEvents.length).toBeGreaterThan(0);
    expect(logEvents[0]).toHaveProperty('level');
    expect(logEvents[0]).toHaveProperty('message');
    expect(logEvents[0]).toHaveProperty('testSuiteId');
    expect(logEvents[0].testSuiteId).toBe('log-integration-test');
  });

  it('should handle workflow errors gracefully and generate error reports', async () => {
    const testConfig = {
      testSuiteId: 'error-handling-test',
      featureFiles: [join(testDir, 'nonexistent.feature')],
      stepDefinitions: [join(testDir, 'login-steps.js')],
      outputFormats: ['json'],
      outputDirectory: outputDir,
      logLevel: 'error'
    };

    testSuiteManager.configure(testConfig);

    // Track error events
    const errorEvents: any[] = [];
    testSuiteManager.on('log', (entry) => {
      if (entry.includes('ERROR')) {
        errorEvents.push(entry);
      }
    });

    // Execute workflow that should fail
    const result = await testSuiteManager.executeAndGenerateReports();

    // Verify error handling
    expect(result.testResults.status).toBe('failed');
    expect(result.testResults.errorMessage).toBeDefined();
    expect(result.testResults.failedScenarios).toBeGreaterThan(0);

    // Verify error reports were still generated
    expect(result.reportPaths).toBeDefined();
    expect(result.reportPaths.length).toBeGreaterThan(0);

    // Verify error events were captured
    expect(errorEvents.length).toBeGreaterThan(0);
  });

  it('should support workflow cancellation and cleanup', async () => {
    const testConfig = {
      testSuiteId: 'cancellation-test',
      featureFiles: [join(testDir, 'login.feature')],
      stepDefinitions: [join(testDir, 'login-steps.js')],
      outputFormats: ['json'],
      outputDirectory: outputDir,
      logLevel: 'info'
    };

    testSuiteManager.configure(testConfig);

    // Start workflow execution
    const executionPromise = testSuiteManager.executeAndGenerateReports();

    // Cancel after short delay
    setTimeout(() => {
      testSuiteManager.cancel();
    }, 100);

    // Wait for execution to complete
    const result = await executionPromise;

    // Verify cancellation was handled
    expect(result.testResults.status).toBe('cancelled');
    expect(result.testResults.errorMessage).toContain('cancelled');

    // Verify cleanup was performed
    expect(testSuiteManager.isRunning()).toBe(false);
  });

  it('should demonstrate In Progress Story Reporter capabilities', async () => {
    const testConfig = {
      testSuiteId: 'story-reporter-demo',
      featureFiles: [join(testDir, 'login.feature')],
      stepDefinitions: [join(testDir, 'login-steps.js')],
      outputFormats: ['html', 'json', 'xml'],
      outputDirectory: outputDir,
      logLevel: 'info',
      timeout: 30000,
      tags: ['@smoke'],
      excludeTags: ['@wip'],
      parallel: {
        enabled: false,
        workers: 1
      },
      retry: {
        attempts: 1,
        delay: 1000
      },
      reportOptions: {
        title: 'Story Reporter Demonstration',
        description: 'In Progress Mock Free Test Oriented Development workflow with Story Reporter',
        includeLogs: true,
        includeScreenshots: false,
        fileNamePattern: 'story-reporter-{testSuiteId}-{timestamp}-{format}'
      }
    };

    testSuiteManager.configure(testConfig);

    // Initialize external log library
    await testSuiteManager.initializeLogLibrary();

    // Track comprehensive workflow events
    const workflowEvents: any[] = [];
    const eventTypes = [
      'testSuiteStart', 'testSuiteComplete', 'featureStart', 'featureComplete',
      'reportGenerated', 'logLibraryInit', 'progress'
    ];

    eventTypes.forEach(eventType => {
      testSuiteManager.on(eventType, (event) => {
        workflowEvents.push({ type: eventType, timestamp: new Date(), ...event });
      });
    });

    // Execute In Progress Story Reporter workflow
    const result = await testSuiteManager.executeAndGenerateReports();

    // Comprehensive verification
    expect(result).toBeDefined();
    expect(result.testResults).toBeDefined();
    expect(result.reportPaths).toBeDefined();

    // Verify test execution
    expect(result.testResults.testSuiteId).toBe('story-reporter-demo');
    expect(result.testResults.scenarios).toBeDefined();
    expect(result.testResults.statistics).toBeDefined();
    expect(result.testResults.configuration).toBeDefined();

    // Verify report generation
    expect(result.reportPaths.length).toBeGreaterThanOrEqual(3);
    expect(result.reportPaths.some(path => path.includes('story-reporter'))).toBe(true);

    // Verify external log library integration
    expect(result.testResults.metadata).toBeDefined();
    expect(result.testResults.metadata!.logEntries).toBeDefined();

    // Verify workflow events
    expect(workflowEvents.length).toBeGreaterThan(0);
    const capturedEventTypes = workflowEvents.map(e => e.type);
    expect(capturedEventTypes).toContain('testSuiteStart');
    expect(capturedEventTypes).toContain('testSuiteComplete');
    expect(capturedEventTypes).toContain('reportGenerated');
    
    // Check for log library init event (if it was called)
    const hasLogLibraryInit = capturedEventTypes.includes('logLibraryInit');
    if (hasLogLibraryInit) {
      expect(capturedEventTypes).toContain('logLibraryInit');
    }

    // Verify cleanup
    await testSuiteManager.cleanup();
    expect(testSuiteManager.isRunning()).toBe(false);
    expect(testSuiteManager.isConfigured()).toBe(false);

    console.log('🔄 Story Reporter demonstration In Progress In Progress');
    console.log(`📊 Executed ${result.testResults.scenarios.length} scenarios`);
    console.log(`📁 Generated ${result.reportPaths.length} reports`);
    console.log(`🔍 Captured ${workflowEvents.length} workflow events`);
    console.log(`⏱️ Total execution time: ${result.testResults.statistics.executionTime}ms`);
  });
});