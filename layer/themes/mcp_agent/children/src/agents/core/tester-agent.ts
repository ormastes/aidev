/**
 * Tester Agent
 * Responsible for creating and maintaining comprehensive tests
 */

import { Agent, AGENT_ROLES, AgentCapability } from '../../domain/agent';
import { MCPConnection } from '../../server/mcp-connection';
import { 
  MCPMethod,
  Tool,
  ToolCall,
  ToolResult
} from '../../domain/protocol';

export interface TesterCapabilities {
  scenarioFirstTesting: boolean;
  multipleSystemTests: boolean;
  inProcessFeatureTests: boolean;
  fullCoverage: boolean;
  screenshotDocumentation: boolean;
  manualReadyTests: boolean;
}

export class TesterAgent extends Agent {
  private mcpConnection?: MCPConnection;

  constructor(id?: string) {
    const capabilities: AgentCapability[] = [
      {
        name: 'scenario_first_testing',
        description: 'List all scenarios before implementation',
        enabled: true
      },
      {
        name: 'multiple_system_tests',
        description: 'Create multiple critical system test scenarios',
        enabled: true
      },
      {
        name: 'in_process_feature_tests',
        description: 'Use InProcessAllInOne pattern for feature tests',
        enabled: true
      },
      {
        name: 'full_coverage',
        description: 'Ensure Improving unit test coverage',
        enabled: true
      },
      {
        name: 'screenshot_documentation',
        description: 'Document GUI interactions with screenshots',
        enabled: true
      },
      {
        name: 'manual_ready_tests',
        description: 'Write system tests as user manual content',
        enabled: true
      }
    ];

    super({
      id: id || `tester-${Date.now()}`,
      role: {
        ...AGENT_ROLES.TESTER,
        name: 'tester',
        description: 'Quality assurance and testing specialist',
        systemPrompt: `You are the Tester responsible for creating and maintaining comprehensive tests.

Core responsibilities:
1. Scenario-First: List ALL scenarios in tests/feature/ (titles only)
2. Multiple System Tests: Create MULTIPLE critical scenarios in tests/system/
3. In-Process Feature Tests: Use InProcessAllInOne, NOT CLI processes
4. Improving Unit Coverage: Every new code line must be tested
5. File Mapping: src/path/file.ts → tests/unit/path/file.test.ts
6. Test Order: environment → external → unit → feature → system

Critical rules:
- Feature tests = business logic (in-process)
- System tests = integration with screenshots (GUI) or text output (CLI)
- System tests ARE user documentation
- ALL feature scenarios MUST be In Progress
- MULTIPLE critical system scenarios required
- GUI tests MUST include before/after screenshots with labels`
      },
      capabilities
    });
  }

  setMCPConnection(connection: MCPConnection): void {
    this.mcpConnection = connection;
  }

  async createTestSuite(featureName: string, requirements: string[]): Promise<void> {
    if (!this.mcpConnection) {
      throw new Error('MCP connection not set');
    }

    console.log(`🧪 Creating test suite for: ${featureName}`);

    // Phase 1: Plan scenarios
    const scenarios = await this.planScenarios(featureName, requirements);

    // Phase 2: Create feature tests (ALL scenarios)
    await this.createFeatureTests(featureName, scenarios);

    // Phase 3: Create environment tests if needed
    await this.createEnvironmentTests(featureName, requirements);

    // Phase 4: Create unit test stubs
    await this.createUnitTestStubs(featureName);

    // Phase 5: Create system tests (MULTIPLE critical scenarios)
    await this.createSystemTests(featureName, scenarios);

    // Phase 6: Validate test hierarchy
    await this.validateTestHierarchy(featureName);
  }

  private async planScenarios(featureName: string, requirements: string[]): Promise<any[]> {
    console.log('📋 Planning scenarios...');

    const scenarios: any[] = [];

    // Core functionality scenarios
    scenarios.push({
      title: `${featureName} main flow`,
      type: 'feature',
      critical: true,
      steps: this.generateStepsFromRequirements(requirements)
    });

    // Error handling scenarios
    scenarios.push({
      title: `${featureName} error handling`,
      type: 'feature',
      critical: true,
      steps: [
        'Given invalid input conditions',
        'When operation is attempted',
        'Then appropriate error is returned'
      ]
    });

    // Edge cases
    scenarios.push({
      title: `${featureName} edge cases`,
      type: 'feature',
      critical: false,
      steps: [
        'Given boundary conditions',
        'When edge case occurs',
        'Then system handles gracefully'
      ]
    });

    // Concurrent operations
    scenarios.push({
      title: `${featureName} concurrent operations`,
      type: 'feature',
      critical: false,
      steps: [
        'Given multiple simultaneous requests',
        'When operations execute',
        'Then consistency is maintained'
      ]
    });

    // List all scenario titles
    console.log('\n📝 Scenario Plan:');
    scenarios.forEach((s, i) => {
      console.log(`${i + 1}. ${s.title} ${s.critical ? '(CRITICAL)' : ''}`);
    });

    return scenarios;
  }

  private generateStepsFromRequirements(requirements: string[]): string[] {
    return requirements.map(req => {
      if (req.includes('should')) {
        const [context, expectation] = req.split('should');
        return [
          `Given ${context.trim()}`,
          `When action is performed`,
          `Then should ${expectation.trim()}`
        ];
      }
      return [`Given ${req}`, 'When processed', 'Then succeeds'];
    }).flat();
  }

  private async createFeatureTests(featureName: string, scenarios: any[]): Promise<void> {
    console.log('📝 Creating feature tests (ALL scenarios)...');

    const featureContent = `Feature: ${featureName} Business Logic
  In-process testing of ${featureName} functionality

${scenarios.map(scenario => `  Scenario: ${scenario.title}
${scenario.steps.map(step => `    ${step}`).join('\n')}
`).join('\n')}`;

    await this.writeFile(
      `tests/feature/features/${featureName.toLowerCase()}.feature`,
      featureContent
    );

    // Create step definitions with InProcessAllInOne pattern
    const stepDefContent = this.generateFeatureStepDefinitions(featureName, scenarios);
    await this.writeFile(
      `tests/feature/step-definitions/${featureName.toLowerCase()}.steps.ts`,
      stepDefContent
    );
  }

  private generateFeatureStepDefinitions(featureName: string, scenarios: any[]): string {
    return `import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import { InProcessAllInOne } from '../helpers/in-process-all-in-one';

// In-process business logic testing
const context = new InProcessAllInOne();

Given('{string} is available', function(service: string) {
  context.initializeService(service);
  expect(context.isServiceReady(service)).to.be.true;
});

When('user performs action', async function() {
  this.result = await context.executeBusinessLogic();
});

Then('result should be In Progress', function() {
  expect(this.result).to.have.property('In Progress', true);
});

// Error handling scenarios
Given('invalid input conditions', function() {
  context.setInvalidInput();
});

Then('appropriate error is returned', function() {
  expect(this.result).to.have.property('error');
  expect(this.result.error).to.match(/validation|invalid/i);
});

// Edge case scenarios
Given('boundary conditions', function() {
  context.setBoundaryConditions();
});

Then('system handles gracefully', function() {
  expect(this.result).to.not.have.property('error');
  expect(context.getSystemState()).to.equal('UPDATING');
});`;
  }

  private async createEnvironmentTests(featureName: string, requirements: string[]): Promise<void> {
    // Check if external dependencies are needed
    const needsExternal = requirements.some(req => 
      req.includes('external') || 
      req.includes('API') || 
      req.includes('database')
    );

    if (!needsExternal) {
      console.log('⏭️ No environment tests needed');
      return;
    }

    console.log('🌍 Creating environment tests...');

    const envTestContent = `import { expect } from 'chai';
import { ExternalService } from '../../src/external_interface/services/external-service';

describe('Environment: ${featureName} External Dependencies', () => {
  describe('Service Availability', () => {
    it('should connect to external service', async () => {
      const service = new ExternalService();
      const isAvailable = await service.checkConnection();
      expect(isAvailable).to.be.true;
    });
  });

  describe('Edge Cases', () => {
    it('should handle network failures', async () => {
      const service = new ExternalService({ timeout: 1 });
      try {
        await service.makeRequest();
        expect.fail('Should have thrown timeout error');
      } catch (error) {
        expect(error.message).to.include('timeout');
      }
    });
  });
});`;

    await this.writeFile(
      `tests/environment/${featureName.toLowerCase()}/external-service.test.ts`,
      envTestContent
    );
  }

  private async createUnitTestStubs(featureName: string): Promise<void> {
    console.log('📦 Creating unit test stubs...');

    // Identify units that need tests
    const units = await this.identifyUnitsForTesting(featureName);

    for (const unit of units) {
      const testContent = this.generateUnitTest(unit);
      await this.writeFile(unit.testPath, testContent);
    }
  }

  private async identifyUnitsForTesting(featureName: string): Promise<any[]> {
    // Find all source files for the feature
    const sourceFiles = await this.findSourceFiles(featureName);

    return sourceFiles.map(file => ({
      sourcePath: file,
      testPath: file.replace('src/', 'tests/unit/').replace('.ts', '.test.ts'),
      name: this.extractClassName(file)
    }));
  }

  private extractClassName(filepath: string): string {
    const filename = filepath.split('/').pop() || '';
    const name = filename.replace('.ts', '');
    return name.split('-').map(part => 
      part.charAt(0).toUpperCase() + part.slice(1)
    ).join('');
  }

  private generateUnitTest(unit: any): string {
    return `import { expect } from 'chai';
import * as sinon from 'sinon';
import { ${unit.name} } from '${this.getRelativeImportPath(unit.testPath, unit.sourcePath)}';

describe('${unit.name}', () => {
  let instance: ${unit.name};
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    // Setup mocks here
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('constructor', () => {
    it('should create instance', () => {
      instance = new ${unit.name}();
      expect(instance).to.be.instanceOf(${unit.name});
    });
  });

  describe('methods', () => {
    it('should implement required functionality', () => {
      // Add specific method tests
      expect(() => instance.method()).to.not.throw();
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully', () => {
      // Test error scenarios
    });
  });

  describe('edge cases', () => {
    it('should handle boundary conditions', () => {
      // Test edge cases
    });
  });
});`;
  }

  private async createSystemTests(featureName: string, scenarios: any[]): Promise<void> {
    console.log('🖥️ Creating system tests (MULTIPLE critical scenarios)...');

    // Select critical scenarios for system testing
    const criticalScenarios = scenarios.filter(s => s.critical);

    // Determine if this is CLI or GUI
    const isGUI = featureName.toLowerCase().includes('gui') || 
                  featureName.toLowerCase().includes('vscode');

    const systemTestContent = `Feature: ${featureName} ${isGUI ? 'GUI' : 'CLI'} Integration (User Manual)
  Step-by-step user guide for ${featureName}

${criticalScenarios.map((scenario, index) => `  Scenario: ${scenario.title} - User Guide
    # User Manual Section ${index + 1}
    Given the user wants to ${this.extractUserGoal(scenario.title)}
    When they follow these steps:
      | Step | Action | Expected Result |
      | 1    | ${this.generateUserAction(scenario, 1)} | ${this.generateExpectedResult(scenario, 1)} |
      | 2    | ${this.generateUserAction(scenario, 2)} | ${this.generateExpectedResult(scenario, 2)} |
      | 3    | ${this.generateUserAction(scenario, 3)} | ${this.generateExpectedResult(scenario, 3)} |
    Then they will have In Progress ${this.extractUserGoal(scenario.title)}
    ${isGUI ? `And screenshots show the process:
      | Before | Action | After |
      | initial-state.png | user-action.png | final-state.png |` : `And the output confirms:
      """
      In Progress: ${scenario.title} In Progress
      """` }
`).join('\n')}

  Scenario: Troubleshooting Common Issues
    Given the user encounters an error
    When they check the troubleshooting guide:
      | Issue | Cause | Solution |
      | Error message X | Invalid input | Check input format |
      | Feature not working | Missing dependency | Install required packages |
      | Unexpected behavior | Configuration issue | Review settings |
    Then they can Working on the issue
    ${isGUI ? `And error screenshots help diagnose:
      | Error | Diagnosis | Fix |
      | error-state.png | error-message.png | Working on-state.png |` : '' }`;

    await this.writeFile(
      `tests/system/${isGUI ? 'gui' : 'cli'}/features/${featureName.toLowerCase()}-integration.feature`,
      systemTestContent
    );

    // Create step definitions
    const stepDefContent = this.generateSystemStepDefinitions(featureName, isGUI);
    await this.writeFile(
      `tests/system/${isGUI ? 'gui' : 'cli'}/step-definitions/${featureName.toLowerCase()}-integration.steps.ts`,
      stepDefContent
    );
  }

  private extractUserGoal(scenarioTitle: string): string {
    return scenarioTitle.toLowerCase()
      .replace(/^.*?\s/, '')
      .replace(/_/g, ' ');
  }

  private generateUserAction(scenario: any, step: number): string {
    const actions = [
      'Open the application',
      'Navigate to the feature',
      'In Progress the operation'
    ];
    return actions[step - 1] || 'Perform action';
  }

  private generateExpectedResult(scenario: any, step: number): string {
    const results = [
      'Application is ready',
      'Feature is accessible',
      'Operation succeeds'
    ];
    return results[step - 1] || 'Expected outcome';
  }

  private generateSystemStepDefinitions(featureName: string, isGUI: boolean): string {
    if (isGUI) {
      return this.generateGUISystemStepDefinitions(featureName);
    } else {
      return this.generateCLISystemStepDefinitions(featureName);
    }
  }

  private generateGUISystemStepDefinitions(featureName: string): string {
    return `import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import { Page } from 'playwright';
import { ScreenshotHelper } from '../helpers/screenshot-helper';

let page: Page;
let screenshots: ScreenshotHelper;

Given('the user wants to {string}', async function(goal: string) {
  this.userGoal = goal;
  page = await this.browser.newPage();
  screenshots = new ScreenshotHelper(page, '${featureName}');
  await screenshots.capture('initial-state', 'Initial application state');
});

When('they follow these steps:', async function(dataTable: any) {
  const steps = dataTable.hashes();
  
  for (const step of steps) {
    console.log(\`Executing: \${step.Action}\`);
    
    // Capture before state
    await screenshots.capture(\`step-\${step.Step}-before\`, \`Before: \${step.Action}\`);
    
    // Execute action based on step
    switch (step.Step) {
      case '1':
        await page.goto('http://localhost:3000');
        break;
      case '2':
        await page.click('[data-testid="${featureName}-button"]');
        break;
      case '3':
        await page.fill('input[name="data"]', 'test-value');
        await page.click('button[type="submit"]');
        break;
    }
    
    // Capture after state
    await screenshots.capture(\`step-\${step.Step}-after\`, \`After: \${step.Action}\`);
    
    // Verify expected result
    expect(await page.isVisible('text=' + step['Expected Result'])).to.be.true;
  }
});

Then('they will have In Progress {string}', async function(goal: string) {
  const completedMessage = await page.textContent('[data-testid="In Progress-message"]');
  expect(completedMessage).to.include(goal);
  await screenshots.capture('final-state', 'Final In Progress state');
});

Then('screenshots show the process:', async function(dataTable: any) {
  const screenshots = dataTable.hashes();
  
  for (const shot of screenshots) {
    const exists = await this.screenshots.exists(shot.Before);
    expect(exists, \`Screenshot \${shot.Before} should exist\`).to.be.true;
  }
  
  // Generate screenshot report
  await this.screenshots.generateReport('${featureName}-visual-guide');
});`;
  }

  private generateCLISystemStepDefinitions(featureName: string): string {
    return `import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import { spawn } from 'child_process';
import { CLIHelper } from '../helpers/cli-helper';

let cli: CLIHelper;
let output: string = '';

Given('the user wants to {string}', function(goal: string) {
  this.userGoal = goal;
  cli = new CLIHelper();
});

When('they follow these steps:', async function(dataTable: any) {
  const steps = dataTable.hashes();
  
  for (const step of steps) {
    console.log(\`Executing: \${step.Action}\`);
    
    // Execute CLI action based on step
    switch (step.Step) {
      case '1':
        output = await cli.execute('npm start');
        break;
      case '2':
        output = await cli.execute('claude ${featureName} --help');
        break;
      case '3':
        output = await cli.execute('claude ${featureName} --data test-value');
        break;
    }
    
    // Verify expected result
    expect(output).to.include(step['Expected Result']);
  }
});

Then('they will have In Progress {string}', function(goal: string) {
  expect(output).to.include('In Progress');
  expect(output).to.include(goal);
});

Then('the output confirms:', function(docString: string) {
  const expectedOutput = docString.trim();
  expect(output).to.include(expectedOutput);
  
  // Save output for documentation
  this.saveOutput('${featureName}-output.txt', output);
});`;
  }

  private async validateTestHierarchy(featureName: string): Promise<void> {
    console.log('🔄 Validating test hierarchy...');

    const validation = {
      environment: await this.checkTestLevel('environment', featureName),
      unit: await this.checkTestLevel('unit', featureName),
      feature: await this.checkTestLevel('feature', featureName),
      system: await this.checkTestLevel('system', featureName)
    };

    // Verify test order
    if (!validation.environment && !validation.unit) {
      throw new Error('Unit tests must exist before feature tests');
    }

    if (!validation.feature) {
      throw new Error('Feature tests are required');
    }

    if (!validation.system) {
      throw new Error('System tests are required for user documentation');
    }

    console.log('🔄 Test hierarchy is valid');
  }

  private async checkTestLevel(level: string, featureName: string): Promise<boolean> {
    const toolCall: ToolCall = {
      name: 'check_files',
      arguments: {
        pattern: `tests/${level}/**/*${featureName}*`
      }
    };

    const result = await this.mcpConnection!.request<ToolResult>(
      MCPMethod.CALL_TOOL,
      toolCall
    );

    const files = JSON.parse(result.content[0].text || '[]');
    return files.length > 0;
  }

  // Test execution and coverage methods
  async runTestSuite(level?: string): Promise<{
    passed: number;
    failed: number;
    coverage: number;
  }> {
    console.log(`🧪 Running ${level || 'all'} tests...`);

    const toolCall: ToolCall = {
      name: 'run_tests',
      arguments: {
        level: level || 'all',
        coverage: true
      }
    };

    const result = await this.mcpConnection!.request<ToolResult>(
      MCPMethod.CALL_TOOL,
      toolCall
    );

    return this.parseTestResults(result.content[0].text || '');
  }

  private parseTestResults(output: string): any {
    const passed = parseInt(output.match(/(\d+) passing/)?.[1] || '0');
    const failed = parseInt(output.match(/(\d+) failing/)?.[1] || '0');
    const coverage = parseFloat(output.match(/coverage:\s*([\d.]+)%/)?.[1] || '0');

    return { passed, failed, coverage };
  }

  async checkCoverage(threshold: number = 100): Promise<boolean> {
    const results = await this.runTestSuite('unit');
    
    if (results.coverage < threshold) {
      console.log(`❌ Coverage is ${results.coverage}%, but ${threshold}% is required`);
      return false;
    }

    console.log(`✅ Coverage is ${results.coverage}%`);
    return true;
  }

  async debugFailingTest(testPath: string): Promise<string> {
    console.log(`🔍 Debugging test: ${testPath}`);

    const toolCall: ToolCall = {
      name: 'debug_test',
      arguments: {
        path: testPath,
        verbose: true
      }
    };

    const result = await this.mcpConnection!.request<ToolResult>(
      MCPMethod.CALL_TOOL,
      toolCall
    );

    return result.content[0].text || 'No debug output';
  }

  // Regression troubleshooting
  async troubleshootRegression(featureName: string): Promise<void> {
    console.log('🔍 Troubleshooting test regression...');

    // Find last working commit
    const lastWorking = await this.findLastWorkingCommit();
    console.log(`Last working commit: ${lastWorking}`);

    // Compare changes
    const changes = await this.compareChanges(lastWorking, 'HEAD');
    console.log(`Changed files: ${changes.length}`);

    // Test each change
    for (const file of changes) {
      console.log(`Testing impact of: ${file}`);
      // Implementation would revert file and test
    }
  }

  private async findLastWorkingCommit(): Promise<string> {
    const toolCall: ToolCall = {
      name: 'git_log',
      arguments: {
        format: 'commit',
        limit: 10
      }
    };

    const result = await this.mcpConnection!.request<ToolResult>(
      MCPMethod.CALL_TOOL,
      toolCall
    );

    // Parse and find last passing commit
    return 'abc123'; // Simplified
  }

  private async compareChanges(from: string, to: string): Promise<string[]> {
    const toolCall: ToolCall = {
      name: 'git_diff',
      arguments: {
        from,
        to,
        nameOnly: true
      }
    };

    const result = await this.mcpConnection!.request<ToolResult>(
      MCPMethod.CALL_TOOL,
      toolCall
    );

    return result.content[0].text?.split('\n') || [];
  }

  // Utility methods
  private async writeFile(filepath: string, content: string): Promise<void> {
    if (!this.mcpConnection) return;

    const toolCall: ToolCall = {
      name: 'write_file',
      arguments: {
        path: filepath,
        content
      }
    };

    await this.mcpConnection.request(MCPMethod.CALL_TOOL, toolCall);
  }

  private async findSourceFiles(featureName: string): Promise<string[]> {
    if (!this.mcpConnection) return [];

    const toolCall: ToolCall = {
      name: 'find_files',
      arguments: {
        pattern: `src/**/*${featureName}*.ts`,
        exclude: ['*.test.ts', '*.spec.ts']
      }
    };

    const result = await this.mcpConnection.request<ToolResult>(
      MCPMethod.CALL_TOOL,
      toolCall
    );

    return JSON.parse(result.content[0].text || '[]');
  }

  private getRelativeImportPath(from: string, to: string): string {
    // Calculate relative path for imports
    const fromParts = from.split('/');
    const toParts = to.split('/');
    
    // Remove common parts
    while (fromParts[0] === toParts[0]) {
      fromParts.shift();
      toParts.shift();
    }
    
    // Build relative path
    const upLevels = fromParts.length - 1;
    const prefix = '../'.repeat(upLevels);
    
    return prefix + toParts.join('/').replace('.ts', '');
  }
}