import {
  HierarchicalStoryReporter,
  EpicConfiguration
} from '../src/services/hierarchical-story-reporter';

/**
 * Example: Using the Hierarchical Story Reporter
 * 
 * This example demonstrates how to configure and execute
 * hierarchical builds for epics containing multiple themes
 * and stories with their own build configurations.
 */

async function runHierarchicalBuildExample() {
  // Initialize the reporter
  const reporter = new HierarchicalStoryReporter({
    artifactRoot: './build-artifacts',
    storiesPath: './stories',
    enableCompression: true,
    retentionPolicy: {
      maxAgeInDays: 30,
      maxSizeInMB: 1000,
      maxBuilds: 100
    }
  });
  
  // Set up event listeners
  reporter.on("executionStart", (event) => {
    console.log(`Starting execution for ${event.buildId} (${event.buildType})`);
  });
  
  reporter.on("buildStart", (event) => {
    console.log(`  Building ${event.buildId}...`);
  });
  
  reporter.on("buildComplete", (event) => {
    console.log(`  ✓ Build ${event.buildId} completed with status: ${event.status}`);
  });
  
  reporter.on("buildLog", (event) => {
    console.log(`    [${event.level}] ${event.message}`);
  });
  
  reporter.on('phase', (event) => {
    console.log(`\nPhase: ${event.phase}`);
  });
  
  reporter.on("executionComplete", (event) => {
    console.log(`\nExecution completed in ${event.duration}ms with status: ${event.status}`);
  });
  
  reporter.on("executionError", (event) => {
    console.error(`\nExecution failed: ${event.error}`);
  });
  
  await reporter.initialize();
  
  // Example 1: Create and execute a simple theme build
  console.log('\n=== Example 1: Simple Theme Build ===\n');
  
  const themeConfig = reporter.createBuildHierarchy({
    id: 'authentication-theme',
    buildSettings: {
      workingDirectory: './themes/authentication',
      env: {
        NODE_ENV: 'test'
      }
    },
    themes: [{
      id: "authentication",
      featureFiles: ['features/login.feature', 'features/logout.feature'],
      stepDefinitions: ['steps/auth.steps.ts'],
      buildSettings: {
        buildCommand: 'npm run build',
        testCommand: 'npm test'
      },
      stories: [
        {
          id: 'login-story',
          featureFiles: ['features/login.feature'],
          stepDefinitions: ['steps/login.steps.ts']
        },
        {
          id: 'logout-story',
          featureFiles: ['features/logout.feature'],
          stepDefinitions: ['steps/logout.steps.ts']
        }
      ]
    }]
  });
  
  try {
    const result1 = await reporter.executeHierarchicalBuild(themeConfig, {
      reportTitle: 'Authentication Theme Test Report',
      reportFormats: ['html', 'json', "markdown"],
      aggregateCoverage: true
    });
    
    console.log('\nBuild Summary:');
    console.log(`- Total Builds: ${result1.summary.totalBuilds}`);
    console.log(`- Total Tests: ${result1.summary.totalTests}`);
    console.log(`- Passed Tests: ${result1.summary.passedTests}`);
    console.log(`- Failed Tests: ${result1.summary.failedTests}`);
    if (result1.summary.coverage) {
      console.log(`- Overall Coverage: ${result1.summary.coverage.overall.toFixed(2)}%`);
    }
  } catch (error) {
    console.error('Build failed:', error);
  }
  
  // Example 2: Create and execute a complex epic with multiple themes
  console.log('\n\n=== Example 2: Complex Epic Build ===\n');
  
  const epicConfig: EpicConfiguration = {
    id: 'e-commerce-platform',
    buildSettings: {
      workingDirectory: './apps/e-commerce',
      env: {
        NODE_ENV: 'test',
        API_URL: 'http://localhost:3000'
      }
    },
    failureHandling: "continue",
    parallel: true,
    maxParallel: 3,
    themes: [
      {
        id: 'user-management',
        featureFiles: ['features/users/*.feature'],
        stepDefinitions: ['steps/users/*.steps.ts'],
        buildSettings: {
          workingDirectory: './themes/user-management',
          buildCommand: 'npm run build:theme',
          testCommand: 'npm run test:integration',
          artifacts: {
            paths: ['coverage/**', 'reports/**'],
            includeReports: true,
            includeCoverage: true
          }
        },
        parallel: true,
        stories: [
          {
            id: 'user-registration',
            featureFiles: ['features/users/registration.feature'],
            stepDefinitions: ['steps/users/registration.steps.ts']
          },
          {
            id: 'user-profile',
            featureFiles: ['features/users/profile.feature'],
            stepDefinitions: ['steps/users/profile.steps.ts']
          }
        ]
      },
      {
        id: 'product-catalog',
        featureFiles: ['features/products/*.feature'],
        stepDefinitions: ['steps/products/*.steps.ts'],
        buildSettings: {
          workingDirectory: './themes/product-catalog',
          buildCommand: 'npm run build:theme',
          testCommand: 'npm run test:integration'
        },
        parallel: false, // Sequential execution for this theme
        stories: [
          {
            id: 'product-search',
            featureFiles: ['features/products/search.feature'],
            stepDefinitions: ['steps/products/search.steps.ts']
          },
          {
            id: 'product-details',
            featureFiles: ['features/products/details.feature'],
            stepDefinitions: ['steps/products/details.steps.ts']
          }
        ]
      },
      {
        id: 'shopping-cart',
        featureFiles: ['features/cart/*.feature'],
        stepDefinitions: ['steps/cart/*.steps.ts'],
        buildSettings: {
          workingDirectory: './themes/shopping-cart',
          buildCommand: 'npm run build:theme',
          testCommand: 'npm run test:integration',
          env: {
            ENABLE_CART_PERSISTENCE: 'true'
          }
        }
      }
    ]
  };
  
  const epicBuildConfig = reporter.createBuildHierarchy(epicConfig);
  
  try {
    const result2 = await reporter.executeHierarchicalBuild(epicBuildConfig, {
      reportTitle: 'E-Commerce Platform - Full Test Suite',
      reportFormats: ['html', 'json', "markdown", 'csv'],
      reportOutputPath: './reports/e-commerce',
      aggregateCoverage: true,
      includeChildArtifacts: true
    });
    
    console.log('\nEpic Build Summary:');
    console.log(`- Status: ${result2.summary.status}`);
    console.log(`- Duration: ${(result2.summary.duration / 1000).toFixed(2)}s`);
    console.log(`- Total Builds: ${result2.summary.totalBuilds}`);
    console.log(`- Total Tests: ${result2.summary.totalTests}`);
    console.log(`- Pass Rate: ${((result2.summary.passedTests / result2.summary.totalTests) * 100).toFixed(2)}%`);
    
    // Display theme-level results
    console.log('\nTheme Results:');
    const summaryReport = result2.unifiedReport.summary;
    if (summaryReport.buildMetrics) {
      console.log(`- Successful Builds: ${summaryReport.buildMetrics.successfulBuilds}`);
      console.log(`- Failed Builds: ${summaryReport.buildMetrics.failedBuilds}`);
      console.log(`- Build Success Rate: ${summaryReport.buildMetrics.successRate}%`);
    }
    
    // Display key findings
    if (summaryReport.keyFindings && summaryReport.keyFindings.length > 0) {
      console.log('\nKey Findings:');
      summaryReport.keyFindings.forEach(finding => {
        console.log(`- ${finding}`);
      });
    }
    
    // Display artifact information
    console.log('\nCollected Artifacts:');
    console.log(`- Total Files: ${result2.artifacts.totalCount}`);
    console.log(`- Total Size: ${(result2.artifacts.totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`- Logs: ${result2.artifacts.logs.length}`);
    console.log(`- Coverage Reports: ${result2.artifacts.coverage.length}`);
    console.log(`- Test Reports: ${result2.artifacts.reports.length}`);
    
  } catch (error) {
    console.error('Epic build failed:', error);
  }
  
  // Example 3: Execute from existing test suite configuration
  console.log('\n\n=== Example 3: Execute from Test Suite ===\n');
  
  try {
    const result3 = await reporter.executeFromTestSuite(
      'payment-processing',
      'theme',
      {
        featureFiles: ['features/payments/*.feature'],
        stepDefinitions: ['steps/payments/*.steps.ts'],
        reportTitle: 'Payment Processing Tests',
        aggregateCoverage: true
      }
    );
    
    console.log('Test Suite Execution Summary:');
    console.log(`- Build ID: ${result3.summary.buildId}`);
    console.log(`- Status: ${result3.summary.status}`);
    console.log(`- Tests Run: ${result3.summary.totalTests}`);
    
  } catch (error) {
    console.error('Test suite execution failed:', error);
  }
  
  // Clean up
  await reporter.cleanup();
}

// Run the example
if (require.main === module) {
  runHierarchicalBuildExample()
    .then(() => {
      console.log('\n✓ Example completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Example failed:', error);
      process.exit(1);
    });
}

export { runHierarchicalBuildExample };