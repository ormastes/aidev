#!/usr/bin/env ts-node

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { EnvironmentValidator } from './helpers/environment-validator';
import { TestReportGenerator } from './helpers/test-report-generator';

/**
 * System Test Runner for Embedded Web Applications
 * Orchestrates comprehensive testing across all discovered services
 */

class SystemTestRunner {
  private readonly projectRoot: string;
  private validator: EnvironmentValidator;
  private reportGenerator: TestReportGenerator;
  
  constructor() {
    this.projectRoot = process.cwd();
    this.validator = new EnvironmentValidator();
    this.reportGenerator = new TestReportGenerator();
  }
  
  async run(): Promise<void> {
    console.log('🚀 AI Development Platform - System Test Runner');
    console.log('Testing embedded web applications with Playwright\n');
    
    try {
      // Pre-flight checks
      await this.performPreFlightChecks();
      
      // Discover running services
      await this.discoverServices();
      
      // Run system tests
      await this.executeSystemTests();
      
      // Generate reports
      await this.generateReports();
      
      console.log('\n✅ System testing completed successfully!');
      
    } catch (error) {
      console.error('\n❌ System testing failed:', error);
      process.exit(1);
    }
  }
  
  private async performPreFlightChecks(): Promise<void> {
    console.log('🔍 Performing pre-flight checks...');
    
    // Check if Playwright is installed
    if (!existsSync(join(this.projectRoot, 'node_modules', '@playwright', 'test'))) {
      throw new Error('Playwright is not installed. Run: npm install');
    }
    
    // Check if Playwright browsers are installed
    try {
      execSync('npx playwright --version', { stdio: 'pipe' });
    } catch (error) {
      console.log('⚠️ Installing Playwright browsers...');
      execSync('npx playwright install', { stdio: 'inherit' });
    }
    
    // Validate environment
    await this.validator.validateEnvironment();
    
    console.log('✅ Pre-flight checks passed');
  }
  
  private async discoverServices(): Promise<void> {
    console.log('\n🔍 Discovering running web services...');
    
    const services = await this.validator.discoverRunningServices();
    
    if (services.length === 0) {
      console.log('⚠️ No web services detected. Starting log analysis dashboard...');
      
      // Try to start the log analysis dashboard
      try {
        execSync('npm run dev &', { stdio: 'pipe' });
        await this.sleep(3000);
        
        // Re-check for services
        const updatedServices = await this.validator.discoverRunningServices();
        if (updatedServices.length > 0) {
          console.log('✅ Log analysis dashboard started');
        }
      } catch (error) {
        console.log('⚠️ Could not start log analysis dashboard automatically');
      }
    } else {
      console.log(`✅ Found ${services.length} running services:`);
      services.forEach(service => {
        console.log(`  - ${service.name} at ${service.url} (${service.status})`);
      });
    }
  }
  
  private async executeSystemTests(): Promise<void> {
    console.log('\n🧪 Running comprehensive system tests...');
    
    const testCommands = [
      {
        name: 'Log Analysis Dashboard Tests',
        command: 'npx playwright test tests/system/embedded-apps/log-analysis-dashboard.stest.ts'
      },
      {
        name: 'AI Dev Portal Tests',
        command: 'npx playwright test tests/system/embedded-apps/ai-dev-portal.stest.ts'
      },
      {
        name: 'Setup Configuration UI Tests',
        command: 'npx playwright test tests/system/embedded-apps/setup-configuration-ui.stest.ts'
      },
      {
        name: 'Monitoring Dashboard Tests',
        command: 'npx playwright test tests/system/embedded-apps/monitoring-dashboards.stest.ts'
      }
    ];
    
    const testResults = [];
    
    for (const testSuite of testCommands) {
      console.log(`\n📊 Running: ${testSuite.name}`);
      
      try {
        const startTime = Date.now();
        execSync(testSuite.command, { stdio: 'inherit', timeout: 120000 });
        const duration = Date.now() - startTime;
        
        testResults.push({
          name: testSuite.name,
          status: 'passed',
          duration
        });
        
        console.log(`✅ ${testSuite.name} completed in ${duration}ms`);
        
      } catch (error) {
        testResults.push({
          name: testSuite.name,
          status: 'failed',
          error: error.message
        });
        
        console.log(`❌ ${testSuite.name} failed: ${error.message}`);
        
        // Continue with other tests
      }
    }
    
    // Summary
    const passed = testResults.filter(r => r.status === 'passed').length;
    const failed = testResults.filter(r => r.status === 'failed').length;
    
    console.log(`\n📈 Test Summary: ${passed} passed, ${failed} failed`);
    
    if (failed > 0) {
      console.log('\nFailed test suites:');
      testResults
        .filter(r => r.status === 'failed')
        .forEach(r => console.log(`  - ${r.name}: ${r.error}`));
    }
  }
  
  private async generateReports(): Promise<void> {
    console.log('\n📄 Generating comprehensive test reports...');
    
    try {
      await this.reportGenerator.generateSystemTestReport();
      console.log('✅ Test reports generated successfully');
      
      // Display report locations
      console.log('\nReports generated:');
      console.log('  - HTML Report: coverage/system-reports/system-test-report.html');
      console.log('  - JSON Results: coverage/system-reports/system-test-results.json');
      console.log('  - Markdown Report: coverage/system-reports/SYSTEM_TEST_REPORT.md');
      console.log('  - Playwright HTML: coverage/playwright-report/index.html');
      
    } catch (error) {
      console.log(`⚠️ Report generation failed: ${error.message}`);
    }
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI Usage
if (require.main === module) {
  const runner = new SystemTestRunner();
  runner.run().catch(error => {
    console.error('System test runner failed:', error);
    process.exit(1);
  });
}

export { SystemTestRunner };
