/**
 * Example: How to use Web App Deployment Testing
 * 
 * This example demonstrates comprehensive testing of web applications
 * across different deployment environments (local dev, release, staging, production)
 */

import { 
  webAppDeploymentTester,
  WebAppConfig,
  DeploymentTestSuite,
  DeploymentTest,
  TestContext,
  TestResult
} from '../pipe';

/**
 * Example 1: Register and test a single web app
 */
async function testSingleApp() {
  console.log('Example 1: Testing a single web app\n');
  
  // Register the GUI Selector app
  const guiSelectorConfig: WebAppConfig = {
    appId: 'gui-selector',
    name: 'GUI Selector',
    localDevPath: '/path/to/gui-selector/dev',
    releasePath: '/path/to/gui-selector/release',
    buildCommand: 'npm run build',
    startCommand: 'npm start',
    testCommand: 'npm test',
    ports: {
      dev: 3457,
      release: 3457
    },
    healthEndpoints: {
      dev: '/health',
      release: '/api/health'
    },
    dependencies: [
      'http://localhost:3456/api/health' // Depends on portal
    ],
    envVariables: {
      NODE_ENV: 'development',
      JWT_SECRET: 'test-secret'
    }
  };
  
  webAppDeploymentTester.registerWebApp(guiSelectorConfig);
  
  // Run tests in local environments only
  const report = await webAppDeploymentTester.runDeploymentTests(
    'gui-selector',
    ['local-dev', 'local-release']
  );
  
  // Print results
  console.log('Test Results:');
  console.log(`- Total Tests: ${report.summary.totalTests}`);
  console.log(`- Passed: ${report.summary.passed}`);
  console.log(`- Failed: ${report.summary.failed}`);
  console.log(`- Duration: ${report.summary.duration}ms`);
  console.log('\nRecommendations:');
  report.recommendations.forEach(rec => console.log(`- ${rec}`));
}

/**
 * Example 2: Create custom test suite with specific tests
 */
async function customTestSuite() {
  console.log('\nExample 2: Custom test suite\n');
  
  // Create custom tests
  const customTests: DeploymentTest[] = [
    {
      name: 'GUI Selector Variant Selection',
      type: 'functional',
      critical: true,
      test: async (ctx: TestContext): Promise<TestResult> => {
        try {
          // Navigate to GUI selector
          await ctx.page.goto(`${ctx.baseUrl}/gui-selector.html`);
          
          // Test variant selection
          await ctx.page.click('[data-variant="modern"]');
          const selected = await ctx.page.$('.variant-card.selected');
          
          return {
            passed: selected !== null,
            message: 'Variant selection working correctly'
          };
        } catch (error) {
          return {
            passed: false,
            message: `Variant selection failed: ${error.message}`
          };
        }
      }
    },
    {
      name: 'Cross-Origin Communication',
      type: 'integration',
      test: async (ctx: TestContext): Promise<TestResult> => {
        try {
          // Test if GUI selector can communicate with portal
          await ctx.page.goto(ctx.baseUrl);
          
          // Setup message listener
          const messageReceived = await ctx.page.evaluate(() => {
            return new Promise((resolve) => {
              window.addEventListener('message', (event) => {
                if (event.data.type === 'ready') {
                  resolve(true);
                }
              });
              
              // Simulate embedding
              const iframe = document.createElement('iframe');
              iframe.src = 'http://localhost:3457/gui-selector.html';
              document.body.appendChild(iframe);
              
              setTimeout(() => resolve(false), 5000);
            });
          });
          
          return {
            passed: messageReceived as boolean,
            message: messageReceived 
              ? 'Cross-origin communication working'
              : 'No message received from embedded app'
          };
        } catch (error) {
          return {
            passed: false,
            message: `Communication test failed: ${error.message}`
          };
        }
      }
    },
    {
      name: 'Mobile Responsive Test',
      type: 'functional',
      test: async (ctx: TestContext): Promise<TestResult> => {
        try {
          // Set mobile viewport
          await ctx.page.setViewportSize({ width: 320, height: 568 });
          await ctx.page.goto(ctx.baseUrl);
          
          // Check if mobile menu exists
          const mobileMenu = await ctx.page.$('.mobile-menu, .hamburger, [data-mobile-menu]');
          
          // Take screenshot for manual verification
          const screenshot = await ctx.page.screenshot({ 
            path: `screenshots/mobile-${ctx.environment.name}.png` 
          });
          
          return {
            passed: mobileMenu !== null,
            message: 'Mobile responsive elements found',
            screenshots: [screenshot]
          };
        } catch (error) {
          return {
            passed: false,
            message: `Mobile test failed: ${error.message}`
          };
        }
      }
    }
  ];
  
  // Create test suite with custom tests
  const suite: DeploymentTestSuite = {
    name: 'GUI Selector Custom Tests',
    environments: ['local-dev', 'local-release'],
    tests: customTests,
    options: {
      parallel: false,
      stopOnFailure: true,
      retries: 2,
      timeout: 30000
    }
  };
  
  console.log('Running custom test suite...');
  // Note: In real implementation, you would need to enhance the 
  // webAppDeploymentTester to accept custom test suites
}

/**
 * Example 3: Compare environments
 */
async function compareEnvironments() {
  console.log('\nExample 3: Comparing environments\n');
  
  // Run tests across all environments
  const report = await webAppDeploymentTester.runDeploymentTests(
    'ai-dev-portal',
    ['local-dev', 'local-release', 'staging', 'production']
  );
  
  // Analyze differences between environments
  console.log('Environment Comparison:');
  console.log('========================');
  
  for (const env of report.environments) {
    console.log(`\n${env.environment}:`);
    console.log(`  Status: ${env.status}`);
    console.log(`  Tests: ${env.tests.length}`);
    console.log(`  Passed: ${env.tests.filter(t => t.result.passed).length}`);
    console.log(`  Failed: ${env.tests.filter(t => !t.result.passed).length}`);
    
    if (env.metrics) {
      console.log(`  Response Time: ${env.metrics.responseTime}ms`);
      console.log(`  Memory Usage: ${env.metrics.memoryUsage}`);
    }
    
    // List failed tests
    const failed = env.tests.filter(t => !t.result.passed);
    if (failed.length > 0) {
      console.log('  Failed Tests:');
      failed.forEach(t => {
        console.log(`    - ${t.name}: ${t.result.message}`);
      });
    }
  }
  
  // Generate recommendations based on comparison
  if (report.recommendations.length > 0) {
    console.log('\nRecommendations based on comparison:');
    report.recommendations.forEach(rec => {
      console.log(`- ${rec}`);
    });
  }
}

/**
 * Example 4: Production deployment verification
 */
async function verifyProductionDeployment() {
  console.log('\nExample 4: Production deployment verification\n');
  
  // Define production readiness criteria
  const productionCriteria = {
    minTestPass: 95, // 95% tests must pass
    requiredTests: [
      'Application Health Check',
      'Security Headers',
      'SSL Certificate',
      'API Integration',
      'Page Load Performance'
    ],
    maxResponseTime: 2000, // 2 seconds max
    requiredEnvironments: ['staging', 'production']
  };
  
  // Run comprehensive tests
  const report = await webAppDeploymentTester.runDeploymentTests(
    'ai-dev-portal',
    productionCriteria.requiredEnvironments
  );
  
  // Verify production readiness
  console.log('Production Readiness Check:');
  console.log('===========================\n');
  
  let isReady = true;
  const issues: string[] = [];
  
  // Check test pass rate
  const passRate = (report.summary.passed / report.summary.totalTests) * 100;
  console.log(`✓ Test Pass Rate: ${passRate.toFixed(2)}%`);
  if (passRate < productionCriteria.minTestPass) {
    isReady = false;
    issues.push(`Test pass rate ${passRate.toFixed(2)}% is below required ${productionCriteria.minTestPass}%`);
  }
  
  // Check required tests
  for (const requiredTest of productionCriteria.requiredTests) {
    const testPassed = report.environments.every(env => 
      env.tests.some(t => t.name === requiredTest && t.result.passed)
    );
    
    console.log(`${testPassed ? '✓' : '✗'} ${requiredTest}`);
    if (!testPassed) {
      isReady = false;
      issues.push(`Required test '${requiredTest}' failed`);
    }
  }
  
  // Check performance
  const prodEnv = report.environments.find(e => e.environment === 'production');
  if (prodEnv) {
    const perfTest = prodEnv.tests.find(t => t.name === 'Page Load Performance');
    if (perfTest && perfTest.result.details?.loadTime > productionCriteria.maxResponseTime) {
      isReady = false;
      issues.push(`Response time ${perfTest.result.details.loadTime}ms exceeds limit of ${productionCriteria.maxResponseTime}ms`);
    }
  }
  
  // Final verdict
  console.log('\n' + '='.repeat(50));
  if (isReady) {
    console.log('✅ PRODUCTION READY - All criteria met');
  } else {
    console.log('❌ NOT PRODUCTION READY');
    console.log('\nIssues to resolve:');
    issues.forEach(issue => console.log(`  - ${issue}`));
  }
  console.log('='.repeat(50));
}

/**
 * Example 5: Automated deployment pipeline integration
 */
async function deploymentPipeline() {
  console.log('\nExample 5: Deployment pipeline integration\n');
  
  const stages = [
    { name: 'Development', environments: ['local-dev'], stopOnFailure: false },
    { name: 'Integration', environments: ['local-release'], stopOnFailure: true },
    { name: 'Staging', environments: ['staging'], stopOnFailure: true },
    { name: 'Production', environments: ['production'], stopOnFailure: true }
  ];
  
  for (const stage of stages) {
    console.log(`\n🚀 Stage: ${stage.name}`);
    console.log('─'.repeat(40));
    
    try {
      const report = await webAppDeploymentTester.runDeploymentTests(
        'ai-dev-portal',
        stage.environments
      );
      
      const failed = report.summary.failed > 0;
      
      if (failed && stage.stopOnFailure) {
        console.error(`❌ Stage ${stage.name} failed. Stopping pipeline.`);
        process.exit(1);
      } else if (failed) {
        console.warn(`⚠️ Stage ${stage.name} has failures but continuing...`);
      } else {
        console.log(`✅ Stage ${stage.name} passed successfully`);
      }
      
    } catch (error) {
      console.error(`❌ Stage ${stage.name} error: ${error.message}`);
      if (stage.stopOnFailure) {
        process.exit(1);
      }
    }
  }
  
  console.log('\n✅ Deployment pipeline completed successfully!');
}

/**
 * Main function to run examples
 */
async function main() {
  console.log('Web App Deployment Testing Examples');
  console.log('====================================\n');
  
  const args = process.argv.slice(2);
  const example = args[0] || '1';
  
  try {
    switch (example) {
      case '1':
        await testSingleApp();
        break;
      case '2':
        await customTestSuite();
        break;
      case '3':
        await compareEnvironments();
        break;
      case '4':
        await verifyProductionDeployment();
        break;
      case '5':
        await deploymentPipeline();
        break;
      default:
        console.log('Usage: ts-node deployment-test-usage.ts [1-5]');
        console.log('  1: Test single app');
        console.log('  2: Custom test suite');
        console.log('  3: Compare environments');
        console.log('  4: Production verification');
        console.log('  5: Deployment pipeline');
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export {
  testSingleApp,
  customTestSuite,
  compareEnvironments,
  verifyProductionDeployment,
  deploymentPipeline
};