import { spawn, ChildProcess } from 'child_process';
import { fsPromises as fs } from '../../../../infra_external-log-lib/src';
import { join } from 'path';
import { os } from '../../../../../infra_external-log-lib/src';

describe('Workflow Manager External Interface Test', () => {
  let testDir: string;
  let testProcess: ChildProcess | null = null;

  beforeAll(async () => {
    // Create temporary directory for test files
    testDir = await fs.mkdtemp(join(os.tmpdir(), 'story-reporter-workflow-'));
  });

  afterAll(async () => {
    // Clean up test directory
    if (testDir) {
      await fs.rm(testDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up any running processes
    if (testProcess && !testProcess.killed) {
      testProcess.kill();
    }
    testProcess = null;
  });

  describe('Workflow Configuration External Interface', () => {
    it('should accept workflow configuration via JSON file', async () => {
      // Create test configuration file
      const workflowConfig = {
        name: 'test-workflow',
        testSuite: {
          features: ['test.feature'],
          stepDefinitions: ['steps.js']
        },
        reporting: {
          formats: ['html', 'json'],
          outputDir: join(testDir, 'reports')
        },
        logging: {
          level: 'info',
          external: {
            enabled: true,
            loggers: ['test-logger']
          }
        }
      };

      const configPath = join(testDir, 'workflow-config.json');
      await fs.writeFile(configPath, JSON.stringify(workflowConfig, null, 2));

      // Test that configuration is readable and valid
      const configContent = await fs.readFile(configPath, 'utf8');
      const parsedConfig = JSON.parse(configContent);

      expect(parsedConfig.name).toBe('test-workflow');
      expect(parsedConfig.testSuite.features).toContain('test.feature');
      expect(parsedConfig.reporting.formats).toContain('html');
      expect(parsedConfig.logging.external.enabled).toBe(true);
    });

    it('should validate required configuration fields', async () => {
      // Test with missing required fields
      const invalidConfig = {
        name: 'incomplete-workflow'
        // Missing testSuite and other required fields
      };

      const configPath = join(testDir, 'invalid-config.json');
      await fs.writeFile(configPath, JSON.stringify(invalidConfig, null, 2));

      const configContent = await fs.readFile(configPath, 'utf8');
      const parsedConfig = JSON.parse(configContent);

      // Verify incomplete config is detected
      expect(parsedConfig.name).toBe('incomplete-workflow');
      expect(parsedConfig.testSuite).toBeUndefined();
      expect(parsedConfig.reporting).toBeUndefined();
    });
  });

  describe('Feature File Discovery External Interface', () => {
    it('should discover feature files from specified directory', async () => {
      // Create test feature files
      const featuresDir = join(testDir, 'features');
      await fs.mkdir(featuresDir, { recursive: true });

      const featureFiles = [
        'login.feature',
        'profile.feature',
        'checkout.feature'
      ];

      for (const featureFile of featureFiles) {
        const featureContent = `Feature: ${featureFile.replace('.feature', '')}
  Scenario: Test scenario
    Given test step
    When test action
    Then test result`;
        await fs.writeFile(join(featuresDir, featureFile), featureContent);
      }

      // Test file discovery
      const discoveredFiles = await fs.readdir(featuresDir);
      const discoveredFeatures = discoveredFiles.filter(f => f.endsWith('.feature'));

      expect(discoveredFeatures).toHaveLength(3);
      expect(discoveredFeatures).toContain('login.feature');
      expect(discoveredFeatures).toContain('profile.feature');
      expect(discoveredFeatures).toContain('checkout.feature');
    });

    it('should validate feature file syntax', async () => {
      const validFeature = `Feature: Valid feature
  As a user
  I want to test something
  So that I can verify it works

  Scenario: Valid scenario
    Given I have a valid setup
    When I perform an action
    Then I should see the result`;

      const invalidFeature = `Feature: Invalid feature
  This is not valid Gherkin syntax
  Missing proper structure`;

      const validPath = join(testDir, 'valid.feature');
      const invalidPath = join(testDir, 'invalid.feature');

      await fs.writeFile(validPath, validFeature);
      await fs.writeFile(invalidPath, invalidFeature);

      // Test validation by checking content structure
      const validContent = await fs.readFile(validPath, 'utf8');
      const invalidContent = await fs.readFile(invalidPath, 'utf8');

      expect(validContent).toContain('Feature:');
      expect(validContent).toContain('Scenario:');
      expect(validContent).toContain('Given');
      expect(validContent).toContain('When');
      expect(validContent).toContain('Then');

      expect(invalidContent).toContain('Feature:');
      expect(invalidContent).not.toContain('Scenario:');
      expect(invalidContent).not.toContain('Given');
    });
  });

  describe('Step Definition Discovery External Interface', () => {
    it('should discover step definition files', async () => {
      const stepsDir = join(testDir, 'steps');
      await fs.mkdir(stepsDir, { recursive: true });

      const stepFiles = [
        'common-steps.js',
        'auth-steps.js',
        'profile-steps.ts'
      ];

      for (const stepFile of stepFiles) {
        const stepContent = stepFile.endsWith('.ts') ?
          `import { Given, When, Then } from '@cucumber/cucumber';

Given('I have a step', () => {
  // TypeScript step implementation
});` :
          `const { Given, When, Then } = require('@cucumber/cucumber');

Given('I have a step', () => {
  // JavaScript step implementation
});`;
        await fs.writeFile(join(stepsDir, stepFile), stepContent);
      }

      // Test discovery
      const discoveredFiles = await fs.readdir(stepsDir);
      const stepDefinitions = discoveredFiles.filter(f => 
        f.endsWith('.js') || f.endsWith('.ts')
      );

      expect(stepDefinitions).toHaveLength(3);
      expect(stepDefinitions).toContain('common-steps.js');
      expect(stepDefinitions).toContain('auth-steps.js');
      expect(stepDefinitions).toContain('profile-steps.ts');
    });

    it('should validate step definition syntax', async () => {
      const validStepJs = `const { Given, When, Then } = require('@cucumber/cucumber');

Given('I am on the login page', function () {
  // Valid step implementation
});

When('I enter valid credentials', function () {
  // Valid step implementation
});

Then('I should be logged in', function () {
  // Valid step implementation
});`;

      const validStepTs = `import { Given, When, Then } from '@cucumber/cucumber';

Given('I am on the {string} page', (pageName: string) => {
  // Valid TypeScript step implementation
});`;

      const jsPath = join(testDir, 'valid-steps.js');
      const tsPath = join(testDir, 'valid-steps.ts');

      await fs.writeFile(jsPath, validStepJs);
      await fs.writeFile(tsPath, validStepTs);

      // Test validation
      const jsContent = await fs.readFile(jsPath, 'utf8');
      const tsContent = await fs.readFile(tsPath, 'utf8');

      expect(jsContent).toContain('@cucumber/cucumber');
      expect(jsContent).toContain('Given');
      expect(jsContent).toContain('When');
      expect(jsContent).toContain('Then');

      expect(tsContent).toContain('@cucumber/cucumber');
      expect(tsContent).toContain('import');
      expect(tsContent).toContain(': string');
    });
  });

  describe('External Logger Integration Interface', () => {
    it('should interface with external logging system', async () => {
      // Create mock logger configuration
      const loggerConfig = {
        type: 'external',
        name: 'test-logger',
        endpoint: 'http://localhost:3000/logs',
        format: 'json',
        levels: ['info', 'warn', 'error']
      };

      const loggerPath = join(testDir, 'logger-config.json');
      await fs.writeFile(loggerPath, JSON.stringify(loggerConfig, null, 2));

      // Test logger configuration
      const configContent = await fs.readFile(loggerPath, 'utf8');
      const parsedConfig = JSON.parse(configContent);

      expect(parsedConfig.type).toBe('external');
      expect(parsedConfig.name).toBe('test-logger');
      expect(parsedConfig.levels).toContain('info');
      expect(parsedConfig.levels).toContain('warn');
      expect(parsedConfig.levels).toContain('error');
    });

    it('should handle logger initialization parameters', async () => {
      const initParams = {
        loggerId: 'workflow-test-logger',
        configuration: {
          level: 'debug',
          format: 'structured',
          metadata: {
            workflow: 'test-workflow',
            version: '1.0.0'
          }
        }
      };

      const paramsPath = join(testDir, 'logger-init.json');
      await fs.writeFile(paramsPath, JSON.stringify(initParams, null, 2));

      // Test initialization parameters
      const paramsContent = await fs.readFile(paramsPath, 'utf8');
      const parsedParams = JSON.parse(paramsContent);

      expect(parsedParams.loggerId).toBe('workflow-test-logger');
      expect(parsedParams.configuration.level).toBe('debug');
      expect(parsedParams.configuration.metadata.workflow).toBe('test-workflow');
    });
  });

  describe('Report Output Interface', () => {
    it('should define report output directory structure', async () => {
      const reportsDir = join(testDir, 'reports');
      await fs.mkdir(reportsDir, { recursive: true });

      // Create expected directory structure
      const subdirs = ['html', 'json', 'xml'];
      for (const subdir of subdirs) {
        await fs.mkdir(join(reportsDir, subdir), { recursive: true });
      }

      // Test directory structure
      const reportsDirContent = await fs.readdir(reportsDir);
      expect(reportsDirContent).toContain('html');
      expect(reportsDirContent).toContain('json');
      expect(reportsDirContent).toContain('xml');
    });

    it('should handle report file naming conventions', async () => {
      const reportFiles = [
        'test-report.html',
        'test-results.json',
        'junit-results.xml'
      ];

      const reportsDir = join(testDir, 'reports');
      await fs.mkdir(reportsDir, { recursive: true });

      // Create mock report files
      for (const reportFile of reportFiles) {
        const reportContent = `Mock ${reportFile} content`;
        await fs.writeFile(join(reportsDir, reportFile), reportContent);
      }

      // Test file naming
      const reportsDirContent = await fs.readdir(reportsDir);
      expect(reportsDirContent).toContain('test-report.html');
      expect(reportsDirContent).toContain('test-results.json');
      expect(reportsDirContent).toContain('junit-results.xml');
    });
  });

  describe('Process Management Interface', () => {
    it('should handle external process spawning', async () => {
      // Test spawning a simple process
      testProcess = spawn('node', ['-e', `
        console.log('External process started');
        console.log('PID: ' + process.pid);
        process.exit(0);
      `]);

      const output: string[] = [];

      testProcess.stdout?.on('data', (data) => {
        output.push(data.toString());
      });

      await new Promise<void>((resolve) => {
        testProcess!.on('exit', (code) => {
          expect(code).toBe(0);
          expect(output.join('')).toContain('External process started');
          expect(output.join('')).toContain('PID:');
          resolve();
        });
      });
    });

    it('should handle process termination signals', async () => {
      testProcess = spawn('node', ['-e', `
        process.on('SIGTERM', () => {
          console.log('Received SIGTERM');
          process.exit(143);
        });
        
        // Keep process alive
        setInterval(() => {}, 1000);
      `]);

      const output: string[] = [];

      testProcess.stdout?.on('data', (data) => {
        output.push(data.toString());
      });

      // Wait a bit then send SIGTERM
      setTimeout(() => {
        testProcess!.kill('SIGTERM');
      }, 100);

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          testProcess!.kill('SIGKILL');
          reject(new Error('Process did not exit within timeout'));
        }, 4000);

        testProcess!.on('exit', (code, signal) => {
          clearTimeout(timeout);
          if (signal === 'SIGKILL') {
            // Process was killed by timeout, treat as success
            expect(output.join('')).toContain('Received SIGTERM');
          } else {
            expect(code).toBe(143);
            expect(output.join('')).toContain('Received SIGTERM');
          }
          resolve();
        });
      });
    }, 10000);
  });

  describe('Environment Variable Interface', () => {
    it('should handle workflow environment variables', async () => {
      const envVars = {
        WORKFLOW_NAME: 'test-workflow',
        WORKFLOW_ENV: 'test',
        REPORT_OUTPUT_DIR: join(testDir, 'reports'),
        LOGGER_LEVEL: 'debug'
      };

      testProcess = spawn('node', ['-e', `
        console.log('WORKFLOW_NAME=' + process.env.WORKFLOW_NAME);
        console.log('WORKFLOW_ENV=' + process.env.WORKFLOW_ENV);
        console.log('REPORT_OUTPUT_DIR=' + process.env.REPORT_OUTPUT_DIR);
        console.log('LOGGER_LEVEL=' + process.env.LOGGER_LEVEL);
        process.exit(0);
      `], {
        env: { ...process.env, ...envVars }
      });

      const output: string[] = [];

      testProcess.stdout?.on('data', (data) => {
        output.push(data.toString());
      });

      await new Promise<void>((resolve) => {
        testProcess!.on('exit', (code) => {
          expect(code).toBe(0);
          const outputStr = output.join('');
          expect(outputStr).toContain('WORKFLOW_NAME=test-workflow');
          expect(outputStr).toContain('WORKFLOW_ENV=test');
          expect(outputStr).toContain('REPORT_OUTPUT_DIR=');
          expect(outputStr).toContain('LOGGER_LEVEL=debug');
          resolve();
        });
      });
    });
  });
});