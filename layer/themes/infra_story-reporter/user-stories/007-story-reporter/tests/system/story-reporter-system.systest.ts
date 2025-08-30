import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

interface TestSuite {
  name: string;
  tests: TestCase[];
  metadata?: Record<string, any>;
}

interface TestCase {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  metadata?: Record<string, any>;
}

interface StoryReport {
  storyId: string;
  title: string;
  testSuites: TestSuite[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
  timestamp: string;
}

class StoryReporter {
  private reports: StoryReport[] = [];

  addReport(report: StoryReport): void {
    this.reports.push(report);
  }

  getAllReports(): StoryReport[] {
    return [...this.reports];
  }

  getReportById(storyId: string): StoryReport | undefined {
    return this.reports.find(report => report.storyId === storyId);
  }

  generateAggregatedReport(): {
    totalStories: number;
    totalTests: number;
    overallPassed: number;
    overallFailed: number;
    overallSkipped: number;
    averageSuccessRate: number;
    reportsByStatus: Record<string, number>;
  } {
    const totalStories = this.reports.length;
    let totalTests = 0;
    let overallPassed = 0;
    let overallFailed = 0;
    let overallSkipped = 0;
    const reportsByStatus: Record<string, number> = {
      allPassed: 0,
      hasFailed: 0,
      allSkipped: 0
    };

    this.reports.forEach(report => {
      totalTests += report.summary.totalTests;
      overallPassed += report.summary.passed;
      overallFailed += report.summary.failed;
      overallSkipped += report.summary.skipped;

      if (report.summary.failed === 0 && report.summary.passed > 0) {
        reportsByStatus.allPassed++;
      } else if (report.summary.failed > 0) {
        reportsByStatus.hasFailed++;
      } else if (report.summary.skipped === report.summary.totalTests) {
        reportsByStatus.allSkipped++;
      }
    });

    const averageSuccessRate = totalTests > 0 ? (overallPassed / totalTests) * 100 : 0;

    return {
      totalStories,
      totalTests,
      overallPassed,
      overallFailed,
      overallSkipped,
      averageSuccessRate,
      reportsByStatus
    };
  }

  exportToJson(filePath: string): Promise<void> {
    const exportData = {
      timestamp: new Date().toISOString(),
      reports: this.reports,
      aggregated: this.generateAggregatedReport()
    };
    return fs.writeFile(filePath, JSON.stringify(exportData, null, 2));
  }

  exportToHtml(filePath: string): Promise<void> {
    const aggregated = this.generateAggregatedReport();
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Story Reporter - Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .story { border: 1px solid #ddd; margin-bottom: 15px; border-radius: 5px; }
        .story-header { background: #e9e9e9; padding: 10px; font-weight: bold; }
        .test-suite { margin: 10px; }
        .test-case { margin-left: 20px; padding: 5px; }
        .passed { color: green; }
        .failed { color: red; }
        .skipped { color: orange; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
        .metric { background: white; padding: 10px; border: 1px solid #ddd; border-radius: 3px; text-align: center; }
    </style>
</head>
<body>
    <h1>Story Reporter - Test Results</h1>
    
    <div class="summary">
        <h2>Overall Summary</h2>
        <div class="metrics">
            <div class="metric">
                <div><strong>${aggregated.totalStories}</strong></div>
                <div>Stories</div>
            </div>
            <div class="metric">
                <div><strong>${aggregated.totalTests}</strong></div>
                <div>Total Tests</div>
            </div>
            <div class="metric">
                <div><strong class="passed">${aggregated.overallPassed}</strong></div>
                <div>Passed</div>
            </div>
            <div class="metric">
                <div><strong class="failed">${aggregated.overallFailed}</strong></div>
                <div>Failed</div>
            </div>
            <div class="metric">
                <div><strong>${aggregated.averageSuccessRate.toFixed(1)}%</strong></div>
                <div>Success Rate</div>
            </div>
        </div>
    </div>

    <div class="stories">
        ${this.reports.map(report => `
            <div class="story">
                <div class="story-header">
                    ${report.title} (${report.storyId})
                    <span style="float: right;">
                        ${report.summary.passed}/${report.summary.totalTests} passed
                    </span>
                </div>
                ${report.testSuites.map(suite => `
                    <div class="test-suite">
                        <h4>${suite.name}</h4>
                        ${suite.tests.map(test => `
                            <div class="test-case ${test.status}">
                                ${test.status.toUpperCase()}: ${test.name} (${test.duration}ms)
                                ${test.error ? `<div style="margin-left: 20px; font-size: 12px;">${test.error}</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                `).join('')}
            </div>
        `).join('')}
    </div>

    <p><em>Generated on ${new Date().toISOString()}</em></p>
</body>
</html>`;

    return fs.writeFile(filePath, htmlContent);
  }
}

test.describe('Story Reporter System Tests', () => {
  let tempDir: string;
  let reporter: StoryReporter;

  test.beforeEach(async () => {
    tempDir = path.join(__dirname, '..', '..', 'temp', `reporter-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    reporter = new StoryReporter();
  });

  test.afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Cleanup failed: ${error}`);
    }
  });

  test('should collect and aggregate test results from multiple stories', async () => {
    const stories: StoryReport[] = [
      {
        storyId: 'STORY-001',
        title: 'User Authentication',
        testSuites: [
          {
            name: 'Login Tests',
            tests: [
              { name: 'should login with valid credentials', status: 'passed', duration: 150 },
              { name: 'should reject invalid credentials', status: 'passed', duration: 120 },
              { name: 'should handle rate limiting', status: 'failed', duration: 200, error: 'Timeout exceeded' }
            ]
          },
          {
            name: 'Registration Tests',
            tests: [
              { name: 'should register new user', status: 'passed', duration: 300 },
              { name: 'should validate email format', status: 'passed', duration: 50 }
            ]
          }
        ],
        summary: { totalTests: 5, passed: 4, failed: 1, skipped: 0, duration: 820 },
        timestamp: '2025-08-28T10:00:00Z'
      },
      {
        storyId: 'STORY-002',
        title: 'Data Processing',
        testSuites: [
          {
            name: 'Import Tests',
            tests: [
              { name: 'should import CSV data', status: 'passed', duration: 500 },
              { name: 'should validate data format', status: 'skipped', duration: 0 },
              { name: 'should handle large files', status: 'failed', duration: 1000, error: 'Memory limit exceeded' }
            ]
          }
        ],
        summary: { totalTests: 3, passed: 1, failed: 1, skipped: 1, duration: 1500 },
        timestamp: '2025-08-28T10:05:00Z'
      }
    ];

    stories.forEach(story => reporter.addReport(story));

    const aggregated = reporter.generateAggregatedReport();

    expect(aggregated.totalStories).toBe(2);
    expect(aggregated.totalTests).toBe(8);
    expect(aggregated.overallPassed).toBe(5);
    expect(aggregated.overallFailed).toBe(2);
    expect(aggregated.overallSkipped).toBe(1);
    expect(aggregated.averageSuccessRate).toBeCloseTo(62.5, 1);
    expect(aggregated.reportsByStatus.hasFailed).toBe(2); // Both stories have failed tests
  });

  test('should execute Jest test suites and collect results', async ({ timeout }) => {
    timeout(30000); // 30 second timeout for Jest execution

    // Create a sample Jest test file
    const testFile = path.join(tempDir, 'sample.test.js');
    const testContent = `
describe('Sample Test Suite', () => {
  test('should pass basic assertion', () => {
    expect(2 + 2).toBe(4);
  });
  
  test('should handle string operations', () => {
    expect('hello world').toContain('world');
  });
  
  test('should fail intentionally', () => {
    expect(true).toBe(false);
  });
  
  test.skip('should skip this test', () => {
    expect(1).toBe(1);
  });
});

describe('Math Operations', () => {
  test('should multiply correctly', () => {
    expect(3 * 4).toBe(12);
  });
  
  test('should divide correctly', () => {
    expect(10 / 2).toBe(5);
  });
});
`;

    await fs.writeFile(testFile, testContent);

    // Create Jest config
    const jestConfig = path.join(tempDir, 'jest.config.js');
    const configContent = `
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js'],
  verbose: true,
  collectCoverage: false,
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: '${tempDir}', outputName: 'test-results.xml' }]
  ]
};
`;

    await fs.writeFile(jestConfig, configContent);

    // Create package.json for Jest dependencies
    const packageJson = path.join(tempDir, 'package.json');
    const packageContent = JSON.stringify({
      name: 'story-reporter-test',
      version: '1.0.0',
      scripts: {
        test: 'jest'
      },
      devDependencies: {
        jest: '^29.0.0',
        'jest-junit': '^16.0.0'
      }
    }, null, 2);

    await fs.writeFile(packageJson, packageContent);

    // Run Jest and capture results
    const testResults = await new Promise<any>((resolve, reject) => {
      const jest = spawn('npx', ['jest', '--json'], {
        cwd: tempDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      jest.stdout?.on('data', (data) => {
        output += data.toString();
      });

      jest.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      jest.on('close', (code) => {
        try {
          // Jest outputs JSON results even on failure
          const results = JSON.parse(output);
          resolve(results);
        } catch (error) {
          // If JSON parsing fails, try to extract from stderr
          console.log('Jest stdout:', output);
          console.log('Jest stderr:', errorOutput);
          reject(new Error(`Jest execution failed: ${error}`));
        }
      });

      setTimeout(() => {
        jest.kill();
        reject(new Error('Jest execution timeout'));
      }, 25000);
    });

    // Convert Jest results to Story Report format
    const storyReport: StoryReport = {
      storyId: 'JEST-001',
      title: 'Jest Integration Test',
      testSuites: testResults.testResults.map((testFile: any) => ({
        name: path.basename(testFile.name),
        tests: testFile.assertionResults.map((test: any) => ({
          name: test.title,
          status: test.status,
          duration: test.duration || 0,
          error: test.failureMessages.length > 0 ? test.failureMessages[0] : undefined
        }))
      })),
      summary: {
        totalTests: testResults.numTotalTests,
        passed: testResults.numPassedTests,
        failed: testResults.numFailedTests,
        skipped: testResults.numPendingTests,
        duration: testResults.testResults.reduce((sum: number, tr: any) => sum + (tr.endTime - tr.startTime), 0)
      },
      timestamp: new Date().toISOString()
    };

    reporter.addReport(storyReport);

    // Verify Jest results are properly captured
    expect(storyReport.summary.totalTests).toBe(6);
    expect(storyReport.summary.passed).toBe(4);
    expect(storyReport.summary.failed).toBe(1);
    expect(storyReport.summary.skipped).toBe(1);
    expect(storyReport.testSuites).toHaveLength(2); // Two describe blocks
  });

  test('should generate comprehensive HTML reports', async () => {
    // Add sample stories with various test scenarios
    const complexStories: StoryReport[] = [
      {
        storyId: 'STORY-UI-001',
        title: 'User Interface Components',
        testSuites: [
          {
            name: 'Button Component',
            tests: [
              { name: 'should render correctly', status: 'passed', duration: 45 },
              { name: 'should handle click events', status: 'passed', duration: 30 },
              { name: 'should display loading state', status: 'failed', duration: 60, error: 'Loading spinner not found' }
            ]
          },
          {
            name: 'Form Component',
            tests: [
              { name: 'should validate required fields', status: 'passed', duration: 80 },
              { name: 'should submit form data', status: 'passed', duration: 120 },
              { name: 'should handle validation errors', status: 'passed', duration: 90 }
            ]
          }
        ],
        summary: { totalTests: 6, passed: 5, failed: 1, skipped: 0, duration: 425 },
        timestamp: '2025-08-28T11:00:00Z'
      },
      {
        storyId: 'STORY-API-001',
        title: 'API Endpoints',
        testSuites: [
          {
            name: 'User Endpoints',
            tests: [
              { name: 'GET /api/users should return user list', status: 'passed', duration: 200 },
              { name: 'POST /api/users should create user', status: 'passed', duration: 150 },
              { name: 'PUT /api/users/:id should update user', status: 'skipped', duration: 0 },
              { name: 'DELETE /api/users/:id should delete user', status: 'failed', duration: 180, error: '404 Not Found' }
            ]
          }
        ],
        summary: { totalTests: 4, passed: 2, failed: 1, skipped: 1, duration: 530 },
        timestamp: '2025-08-28T11:05:00Z'
      }
    ];

    complexStories.forEach(story => reporter.addReport(story));

    const htmlFile = path.join(tempDir, 'test-report.html');
    await reporter.exportToHtml(htmlFile);

    // Verify HTML file was created
    const htmlExists = await fs.access(htmlFile).then(() => true).catch(() => false);
    expect(htmlExists).toBe(true);

    // Verify HTML content
    const htmlContent = await fs.readFile(htmlFile, 'utf-8');
    
    // Check for key elements
    expect(htmlContent).toContain('<title>Story Reporter - Test Results</title>');
    expect(htmlContent).toContain('Overall Summary');
    expect(htmlContent).toContain('User Interface Components');
    expect(htmlContent).toContain('API Endpoints');
    expect(htmlContent).toContain('should render correctly');
    expect(htmlContent).toContain('GET /api/users should return user list');
    
    // Check metrics
    expect(htmlContent).toContain('10'); // Total tests
    expect(htmlContent).toContain('7');  // Passed tests
    expect(htmlContent).toContain('2');  // Failed tests
    expect(htmlContent).toContain('70.0%'); // Success rate
  });

  test('should export JSON reports with proper structure', async () => {
    const testStory: StoryReport = {
      storyId: 'EXPORT-001',
      title: 'Export Test Story',
      testSuites: [
        {
          name: 'Export Suite',
          tests: [
            { name: 'should export correctly', status: 'passed', duration: 100 }
          ]
        }
      ],
      summary: { totalTests: 1, passed: 1, failed: 0, skipped: 0, duration: 100 },
      timestamp: '2025-08-28T12:00:00Z'
    };

    reporter.addReport(testStory);

    const jsonFile = path.join(tempDir, 'test-report.json');
    await reporter.exportToJson(jsonFile);

    // Verify JSON file was created
    const jsonExists = await fs.access(jsonFile).then(() => true).catch(() => false);
    expect(jsonExists).toBe(true);

    // Parse and verify JSON content
    const jsonContent = JSON.parse(await fs.readFile(jsonFile, 'utf-8'));
    
    expect(jsonContent).toHaveProperty('timestamp');
    expect(jsonContent).toHaveProperty('reports');
    expect(jsonContent).toHaveProperty('aggregated');
    
    expect(jsonContent.reports).toHaveLength(1);
    expect(jsonContent.reports[0].storyId).toBe('EXPORT-001');
    expect(jsonContent.reports[0].title).toBe('Export Test Story');
    
    expect(jsonContent.aggregated.totalStories).toBe(1);
    expect(jsonContent.aggregated.totalTests).toBe(1);
    expect(jsonContent.aggregated.overallPassed).toBe(1);
    expect(jsonContent.aggregated.averageSuccessRate).toBe(100);
  });

  test('should handle parallel test execution reporting', async () => {
    const parallelStories = Array.from({ length: 5 }, (_, index) => ({
      storyId: `PARALLEL-${index + 1}`,
      title: `Parallel Test Story ${index + 1}`,
      testSuites: [
        {
          name: `Suite ${index + 1}`,
          tests: Array.from({ length: 10 }, (_, testIndex) => ({
            name: `Test ${testIndex + 1}`,
            status: Math.random() > 0.2 ? 'passed' : 'failed' as 'passed' | 'failed',
            duration: Math.floor(Math.random() * 200) + 50,
            error: Math.random() > 0.8 ? 'Random test failure' : undefined
          }))
        }
      ],
      summary: {
        totalTests: 10,
        passed: 0, // Will be calculated
        failed: 0, // Will be calculated
        skipped: 0,
        duration: 0 // Will be calculated
      },
      timestamp: new Date(Date.now() + index * 1000).toISOString()
    }));

    // Calculate summary for each story
    parallelStories.forEach(story => {
      const suite = story.testSuites[0];
      story.summary.passed = suite.tests.filter(t => t.status === 'passed').length;
      story.summary.failed = suite.tests.filter(t => t.status === 'failed').length;
      story.summary.duration = suite.tests.reduce((sum, t) => sum + t.duration, 0);
    });

    // Simulate parallel addition to reporter
    const promises = parallelStories.map(async (story, index) => {
      // Add some delay to simulate real parallel execution
      await new Promise(resolve => setTimeout(resolve, index * 10));
      reporter.addReport(story);
    });

    await Promise.all(promises);

    const aggregated = reporter.generateAggregatedReport();

    expect(aggregated.totalStories).toBe(5);
    expect(aggregated.totalTests).toBe(50);
    expect(aggregated.overallPassed + aggregated.overallFailed).toBe(50);
    expect(aggregated.averageSuccessRate).toBeGreaterThan(0);
    expect(aggregated.averageSuccessRate).toBeLessThanOrEqual(100);

    // Verify all stories were captured
    const allReports = reporter.getAllReports();
    expect(allReports).toHaveLength(5);
    
    // Verify story IDs are unique and present
    const storyIds = allReports.map(r => r.storyId);
    expect(new Set(storyIds).size).toBe(5);
    expect(storyIds).toContain('PARALLEL-1');
    expect(storyIds).toContain('PARALLEL-5');
  });

  test('should integrate with external test frameworks', async () => {
    // Simulate integration with Cypress test results
    const cypressResults = {
      stats: {
        suites: 2,
        tests: 8,
        passes: 6,
        pending: 1,
        failures: 1,
        duration: 12000
      },
      tests: [
        {
          title: ['Login Flow', 'should display login form'],
          state: 'passed',
          duration: 1500
        },
        {
          title: ['Login Flow', 'should authenticate user'],
          state: 'passed',
          duration: 2000
        },
        {
          title: ['Dashboard', 'should load user dashboard'],
          state: 'failed',
          duration: 3000,
          err: { message: 'Element not found: [data-testid="dashboard"]' }
        },
        {
          title: ['Dashboard', 'should display user stats'],
          state: 'passed',
          duration: 1200
        }
      ]
    };

    // Convert Cypress results to Story Report format
    const cypressStoryReport: StoryReport = {
      storyId: 'CYPRESS-E2E-001',
      title: 'End-to-End User Flows',
      testSuites: [
        {
          name: 'Login Flow',
          tests: cypressResults.tests
            .filter(test => test.title[0] === 'Login Flow')
            .map(test => ({
              name: test.title[1],
              status: test.state as 'passed' | 'failed',
              duration: test.duration,
              error: test.err?.message
            }))
        },
        {
          name: 'Dashboard',
          tests: cypressResults.tests
            .filter(test => test.title[0] === 'Dashboard')
            .map(test => ({
              name: test.title[1],
              status: test.state as 'passed' | 'failed',
              duration: test.duration,
              error: test.err?.message
            }))
        }
      ],
      summary: {
        totalTests: cypressResults.stats.tests,
        passed: cypressResults.stats.passes,
        failed: cypressResults.stats.failures,
        skipped: cypressResults.stats.pending,
        duration: cypressResults.stats.duration
      },
      timestamp: new Date().toISOString()
    };

    reporter.addReport(cypressStoryReport);

    const report = reporter.getReportById('CYPRESS-E2E-001');
    expect(report).toBeDefined();
    expect(report!.summary.totalTests).toBe(8);
    expect(report!.summary.passed).toBe(6);
    expect(report!.summary.failed).toBe(1);
    expect(report!.testSuites).toHaveLength(2);
    expect(report!.testSuites[0].name).toBe('Login Flow');
    expect(report!.testSuites[1].name).toBe('Dashboard');
  });
});