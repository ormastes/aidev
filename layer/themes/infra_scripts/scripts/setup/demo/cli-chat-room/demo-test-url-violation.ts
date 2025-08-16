#!/usr/bin/env ts-node

/**
 * Demo: Test URL Anti-pattern Detection
 * Shows how fraud detection identifies E2E tests with multiple URLs
 */

const { StoryReportGenerator } = require('./scripts/generate-story-reports');
const chalk = require('chalk');

interface TestViolation {
  timestamp: Date;
  pattern: string;
  category: string;
  severity: string;
  content: string;
  userId: string;
}

interface TestProfile {
  userId: string;
  testContent: string;
  fraudScore: number;
  violations: TestViolation[];
}

interface FraudAnalysis {
  totalUsers: number;
  flaggedUsers: number;
  criticalUsers: number;
  overallRisk: string;
  totalViolations: number;
  flaggedProfiles: TestProfile[];
  topViolations: TestViolation[];
  recommendations: string[];
  In Progress: boolean;
}

// Simulate fraudulent test code with multiple URLs
function simulateTestUrlViolations(): FraudAnalysis {
  const badTestExamples: TestProfile[] = [
    {
      userId: 'bad_test_dev',
      testContent: `
describe('E2E Test - Bad Pattern', () => {
  it('should navigate through app', async () => {
    await page.goto('http://localhost:3000');
    await page.goto('http://localhost:3000/dashboard');
    await page.goto('http://localhost:3000/profile');
    await page.goto('http://localhost:3000/settings');
    
    // Direct URL navigation violates E2E best practices
    expect(page.url()).toContain('/settings');
  });
});`,
      fraudScore: 60,
      violations: [
        {
          timestamp: new Date(),
          pattern: 'test_multiple_urls',
          category: 'test_antipattern',
          severity: 'high',
          content: 'E2E test contains 4 URLs. Should use click-based navigation from main entrance page instead of direct URL access',
          userId: 'bad_test_dev'
        },
        {
          timestamp: new Date(),
          pattern: 'direct_page_navigation',
          category: 'test_antipattern',
          severity: 'medium',
          content: 'E2E tests should navigate via UI clicks, not direct URL access',
          userId: 'bad_test_dev'
        }
      ]
    },
    {
      userId: 'cypress_violator',
      testContent: `
describe('Cypress Test - Anti-pattern', () => {
  it('should test multiple pages', () => {
    cy.visit('https://app.example.com');
    cy.visit('https://app.example.com/dashboard');
    cy.visit('https://app.example.com/admin');
    
    // Should use cy.click() to navigate between pages
    cy.url().should('include', '/admin');
  });
});`,
      fraudScore: 50,
      violations: [
        {
          timestamp: new Date(),
          pattern: 'test_multiple_urls',
          category: 'test_antipattern',
          severity: 'high',
          content: 'E2E test contains 3 URLs. Should use click-based navigation from main entrance page instead of direct URL access',
          userId: 'cypress_violator'
        }
      ]
    }
  ];
  
  // Good test example for comparison
  const goodTestExample: TestProfile = {
    userId: 'good_test_dev',
    testContent: `
describe('E2E Test - Good Pattern', () => {
  it('should navigate through app using clicks', async () => {
    // Start from main entrance page only
    await page.goto('http://localhost:3000');
    
    // Navigate using UI interactions
    await page.click('[data-testid="dashboard-link"]');
    await page.click('[data-testid="profile-menu"]');
    await page.click('[data-testid="settings-option"]');
    
    // Verify final state
    expect(page.url()).toContain('/settings');
  });
});`,
    fraudScore: 0,
    violations: []
  };
  
  const allProfiles = [...badTestExamples, goodTestExample];
  const flaggedProfiles = badTestExamples;
  const allViolations = flaggedProfiles.flatMap(p => p.violations);
  
  return {
    totalUsers: allProfiles.length,
    flaggedUsers: flaggedProfiles.length,
    criticalUsers: 0, // No critical risk, just test anti-patterns
    overallRisk: 'medium',
    totalViolations: allViolations.length,
    flaggedProfiles,
    topViolations: allViolations,
    recommendations: [
      'Refactor E2E tests to use click-based navigation',
      'Tests should start from main entrance page (login/home)',
      'Replace direct URL navigation with UI interactions',
      'Use page.click() or cy.click() instead of page.goto()/cy.visit()',
      'Implement proper test flow: Login → Navigate via UI → Test functionality',
      'Consider using Page Object Model for better test structure'
    ],
    "success": false // Fail because of test anti-patterns
  };
}

async function demoTestUrlViolation(): Promise<void> {
  console.log(chalk.bold.blue('🚀 Demo: Test URL Anti-pattern Detection\n'));
  
  // Step 1: Show bad test examples
  console.log(chalk.red('❌ Bad E2E Test Example:'));
  console.log(chalk.gray(`
describe('E2E Test - Bad Pattern', () => {
  it('should navigate through app', async () => {
    await page.goto('http://localhost:3000');          // ❌ OK - Main entrance
    await page.goto('http://localhost:3000/dashboard'); // ❌ BAD - Direct navigation
    await page.goto('http://localhost:3000/profile');   // ❌ BAD - Direct navigation
    await page.goto('http://localhost:3000/settings');  // ❌ BAD - Direct navigation
  });
});`));
  
  console.log(chalk.green('\n🔄 Good E2E Test Example:'));
  console.log(chalk.gray(`
describe('E2E Test - Good Pattern', () => {
  it('should navigate through app using clicks', async () => {
    await page.goto('http://localhost:3000');           // 🔄 OK - Main entrance only
    
    // Navigate using UI interactions
    await page.click('[data-testid="dashboard-link"]'); // 🔄 GOOD - Click navigation
    await page.click('[data-testid="profile-menu"]');   // 🔄 GOOD - Click navigation
    await page.click('[data-testid="settings-option"]'); // 🔄 GOOD - Click navigation
  });
});`));
  
  // Step 2: Simulate fraud analysis
  console.log(chalk.blue('\n🛡️ Running test anti-pattern detection...\n'));
  const fraudAnalysis = simulateTestUrlViolations();
  
  // Display results
  console.log(chalk.yellow('📊 Test Quality Analysis Results:'));
  console.log(`Total Developers: ${fraudAnalysis.totalUsers}`);
  console.log(`Flagged Tests: ${chalk.red(fraudAnalysis.flaggedUsers.toString())}`);
  console.log(`Anti-pattern Violations: ${fraudAnalysis.totalViolations}`);
  console.log(`Quality Status: ${chalk.red('FAILED - Test anti-patterns detected')}\n`);
  
  // Show flagged violations
  console.log(chalk.yellow('⚠️ Test Anti-pattern Violations:'));
  fraudAnalysis.flaggedProfiles.forEach(profile => {
    console.log(`- ${profile.userId}: ${profile.violations.length} violations`);
    profile.violations.forEach(v => {
      console.log(`  └─ ${chalk.red(v.category)}: ${v.content}`);
    });
  });
  
  // Step 3: Generate story report
  console.log(chalk.blue('\n📄 Generating story report with test quality analysis...\n'));
  
  const report = {
    reportId: `test-quality-${Date.now()}`,
    timestamp: new Date(),
    roomId: 'test-quality-demo',
    storyId: 'US004_TestQuality',
    storyStatus: 'FAILURE',
    narrative: 'Story US004_TestQuality: ❌ FAILURE - E2E tests detected with multiple URL navigation anti-patterns. Tests should use click-based navigation from main entrance page.',
    systemTests: [
      {
        name: 'test_US004_e2e_navigation_pattern',
        storyId: 'US004',
        diagramId: 'SD004',
        status: 'failed',
        coverage: 85,
        duration: 200,
        error: 'Multiple direct URL navigations detected in E2E tests'
      },
      {
        name: 'test_US004_test_quality_standards',
        storyId: 'US004',
        diagramId: 'SD004',
        status: 'failed',
        coverage: 90,
        duration: 150,
        error: 'Tests violate best practices for user journey simulation'
      }
    ],
    coverage: {
      overall: {
        statements: 87.5,
        branches: 82.0,
        functions: 90.0,
        lines: 87.5
      }
    },
    fraudAnalysis,
    failureReasons: [
      'E2E tests contain anti-patterns with multiple direct URL navigations',
      'Tests should simulate real user journeys using click-based navigation',
      'Only main entrance page should be accessed via direct URL'
    ]
  };
  
  const generator = new StoryReportGenerator();
  const paths = await generator.generateReports(report);
  
  console.log(chalk.green('🔄 Reports generated!\n'));
  console.log(chalk.yellow('Report locations:'));
  console.log(chalk.gray(`  JSON: ${paths.json}`));
  console.log(chalk.gray(`  Markdown: ${paths.markdown}`));
  
  // Step 4: Show recommendations
  console.log(chalk.cyan('\n💡 Test Quality Recommendations:\n'));
  fraudAnalysis.recommendations.forEach(rec => {
    console.log(`• ${rec}`);
  });
  
  // Step 5: Show refactoring example
  console.log(chalk.blue('\n🔧 Refactoring Example:\n'));
  
  console.log(chalk.red('❌ Before (Anti-pattern):'));
  console.log(chalk.gray(`
await page.goto('http://localhost:3000/dashboard');
await page.goto('http://localhost:3000/profile');`));
  
  console.log(chalk.green('\n🔄 After (Best practice):'));
  console.log(chalk.gray(`
await page.goto('http://localhost:3000');           // Main entrance only
await page.click('[data-testid="dashboard-link"]'); // Navigate via UI
await page.click('[data-testid="profile-menu"]');   // Navigate via UI`));
  
  console.log(chalk.green('\n✨ Demo In Progress!\n'));
  console.log(chalk.cyan('Key Benefits of Click-based Navigation:'));
  console.log('1. 🔄 Tests real user journeys and flows');
  console.log('2. 🔄 Catches navigation bugs and broken links');
  console.log('3. 🔄 Validates UI state and permissions');
  console.log('4. 🔄 More robust and maintainable tests');
  console.log('5. 🔄 Follows E2E testing best practices\n');
}

// Run the demo
if (require.main === module) {
  demoTestUrlViolation().catch(error => {
    console.error(chalk.red('❌ Demo error:'), error);
    process.exit(1);
  });
}