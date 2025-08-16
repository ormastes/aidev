#!/usr/bin/env bun

import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

interface TestCase {
  name: string;
  description: string;
  steps: string[];
  assertions: string[];
}

class SystemTestToCucumberConverter {
  private outputDir: string = 'features';
  private stepDefsDir: string = 'step_definitions';

  async convertFile(filePath: string): Promise<void> {
    console.log(`Converting: ${filePath}`);
    
    const content = await fs.readFile(filePath, 'utf-8');
    const testCases = this.parseTypeScriptTests(content);
    
    if (testCases.length === 0) {
      console.log(`  No test cases found in ${filePath}`);
      return;
    }

    const featureName = this.generateFeatureName(filePath);
    const featureContent = this.generateFeatureFile(featureName, testCases, filePath);
    const stepDefContent = this.generateStepDefinitions(testCases, filePath);
    
    const outputPath = await this.saveFeatureFile(filePath, featureContent);
    const stepDefPath = await this.saveStepDefinitions(filePath, stepDefContent);
    
    console.log(`  ✅ Created feature: ${outputPath}`);
    console.log(`  ✅ Created steps: ${stepDefPath}`);
  }

  private parseTypeScriptTests(content: string): TestCase[] {
    const testCases: TestCase[] = [];
    
    // Match describe blocks
    const describeMatches = content.matchAll(/describe\(['"`](.*?)['"`].*?\{([\s\S]*?)\n\}\);?/g);
    
    for (const describeMatch of describeMatches) {
      const suiteName = describeMatch[1];
      const suiteContent = describeMatch[2];
      
      // Match it/test blocks within describe
      const testMatches = suiteContent.matchAll(/(?:it|test)\(['"`](.*?)['"`].*?\{([\s\S]*?)\n\s*\}\);?/g);
      
      for (const testMatch of testMatches) {
        const testName = testMatch[1];
        const testContent = testMatch[2];
        
        const steps = this.extractSteps(testContent);
        const assertions = this.extractAssertions(testContent);
        
        testCases.push({
          name: testName,
          description: `${suiteName} - ${testName}`,
          steps,
          assertions
        });
      }
    }
    
    return testCases;
  }

  private extractSteps(testContent: string): string[] {
    const steps: string[] = [];
    
    // Extract common test actions
    const patterns = [
      /await\s+(\w+)\.(create|start|stop|connect|disconnect|send|receive|click|type|navigate|waitFor)\((.*?)\)/g,
      /const\s+\w+\s*=\s*await\s+(\w+)\.(\w+)\((.*?)\)/g,
      /(\w+)\.(setup|teardown|initialize|cleanup)\(\)/g
    ];
    
    for (const pattern of patterns) {
      const matches = testContent.matchAll(pattern);
      for (const match of matches) {
        const action = this.formatStepFromMatch(match);
        if (action && !steps.includes(action)) {
          steps.push(action);
        }
      }
    }
    
    return steps;
  }

  private extractAssertions(testContent: string): string[] {
    const assertions: string[] = [];
    
    // Extract expect statements
    const expectMatches = testContent.matchAll(/expect\((.*?)\)\.(toBe|toEqual|toContain|toHaveBeenCalled|toMatch|toThrow|toBeTruthy|toBeFalsy)\((.*?)\)/g);
    
    for (const match of expectMatches) {
      const assertion = this.formatAssertionFromMatch(match);
      if (assertion && !assertions.includes(assertion)) {
        assertions.push(assertion);
      }
    }
    
    return assertions;
  }

  private formatStepFromMatch(match: RegExpMatchArray): string {
    const [, object, method, params] = match;
    
    const actionMap: Record<string, string> = {
      'create': `I create a ${object}`,
      'start': `I start the ${object}`,
      'stop': `I stop the ${object}`,
      'connect': `I connect to the ${object}`,
      'disconnect': `I disconnect from the ${object}`,
      'send': `I send data to the ${object}`,
      'receive': `I receive data from the ${object}`,
      'click': `I click on the ${object}`,
      'type': `I type into the ${object}`,
      'navigate': `I navigate to the ${object}`,
      'waitFor': `I wait for the ${object}`,
      'setup': `the ${object} is set up`,
      'initialize': `the ${object} is initialized`,
      'cleanup': `the ${object} is cleaned up`,
      'teardown': `the ${object} is torn down`
    };
    
    return actionMap[method] || `I perform ${method} on ${object}`;
  }

  private formatAssertionFromMatch(match: RegExpMatchArray): string {
    const [, subject, matcher, expected] = match;
    
    const cleanSubject = subject.replace(/['"]/g, '').trim();
    const cleanExpected = expected?.replace(/['"]/g, '').trim() || '';
    
    const assertionMap: Record<string, string> = {
      'toBe': `${cleanSubject} should be ${cleanExpected}`,
      'toEqual': `${cleanSubject} should equal ${cleanExpected}`,
      'toContain': `${cleanSubject} should contain ${cleanExpected}`,
      'toHaveBeenCalled': `${cleanSubject} should have been called`,
      'toMatch': `${cleanSubject} should match ${cleanExpected}`,
      'toThrow': `${cleanSubject} should throw an error`,
      'toBeTruthy': `${cleanSubject} should be truthy`,
      'toBeFalsy': `${cleanSubject} should be falsy`
    };
    
    return assertionMap[matcher] || `${cleanSubject} should ${matcher} ${cleanExpected}`;
  }

  private generateFeatureName(filePath: string): string {
    const basename = path.basename(filePath, '.stest.ts');
    return basename.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  private generateFeatureFile(featureName: string, testCases: TestCase[], filePath: string): string {
    const relativePath = path.relative(process.cwd(), filePath);
    
    let feature = `# Converted from: ${relativePath}\n`;
    feature += `# Generated on: ${new Date().toISOString()}\n\n`;
    feature += `Feature: ${featureName}\n`;
    feature += `  As a system tester\n`;
    feature += `  I want to validate ${featureName.toLowerCase()}\n`;
    feature += `  So that I can ensure system reliability\n\n`;
    
    feature += `  Background:\n`;
    feature += `    Given the test environment is initialized\n`;
    feature += `    And all required services are running\n\n`;
    
    for (const testCase of testCases) {
      feature += `  @automated @system\n`;
      feature += `  Scenario: ${testCase.name}\n`;
      
      // Add Given steps
      if (testCase.steps.length > 0) {
        feature += `    Given ${testCase.steps[0]}\n`;
        
        // Add When/And steps
        for (let i = 1; i < testCase.steps.length - 1; i++) {
          feature += `    And ${testCase.steps[i]}\n`;
        }
        
        // Add When step (last action before assertions)
        if (testCase.steps.length > 1) {
          feature += `    When ${testCase.steps[testCase.steps.length - 1]}\n`;
        }
      }
      
      // Add Then assertions
      if (testCase.assertions.length > 0) {
        feature += `    Then ${testCase.assertions[0]}\n`;
        for (let i = 1; i < testCase.assertions.length; i++) {
          feature += `    And ${testCase.assertions[i]}\n`;
        }
      } else {
        feature += `    Then the operation should complete successfully\n`;
      }
      
      feature += '\n';
      
      // Add manual validation scenario
      feature += `  @manual\n`;
      feature += `  Scenario: Manual validation of ${testCase.name}\n`;
      feature += `    Given the tester has access to the system\n`;
      feature += `    When the tester manually executes the test steps:\n`;
      feature += `      | Step | Action | Expected Result |\n`;
      
      for (let i = 0; i < testCase.steps.length; i++) {
        feature += `      | ${i + 1} | ${testCase.steps[i]} | Action completes successfully |\n`;
      }
      
      feature += `    Then verify all assertions pass:\n`;
      feature += `      | Assertion | Expected |\n`;
      
      for (const assertion of testCase.assertions) {
        feature += `      | ${assertion} | Pass |\n`;
      }
      
      feature += '\n';
    }
    
    return feature;
  }

  private generateStepDefinitions(testCases: TestCase[], filePath: string): string {
    const uniqueSteps = new Set<string>();
    
    // Collect all unique steps
    for (const testCase of testCases) {
      testCase.steps.forEach(step => uniqueSteps.add(step));
      testCase.assertions.forEach(assertion => uniqueSteps.add(assertion));
    }
    
    let stepDefs = `import { Given, When, Then, Before, After } from '@cucumber/cucumber';\n`;
    stepDefs += `import { expect } from '@playwright/test';\n\n`;
    stepDefs += `// Step definitions converted from: ${path.basename(filePath)}\n\n`;
    
    stepDefs += `Before(async function() {\n`;
    stepDefs += `  // Initialize test environment\n`;
    stepDefs += `  this.context = {};\n`;
    stepDefs += `});\n\n`;
    
    stepDefs += `After(async function() {\n`;
    stepDefs += `  // Cleanup test environment\n`;
    stepDefs += `  if (this.context.cleanup) {\n`;
    stepDefs += `    await this.context.cleanup();\n`;
    stepDefs += `  }\n`;
    stepDefs += `});\n\n`;
    
    // Generate Given steps
    stepDefs += `Given('the test environment is initialized', async function() {\n`;
    stepDefs += `  // Initialize test environment\n`;
    stepDefs += `});\n\n`;
    
    stepDefs += `Given('all required services are running', async function() {\n`;
    stepDefs += `  // Verify services are running\n`;
    stepDefs += `});\n\n`;
    
    // Generate step definitions for unique steps
    for (const step of uniqueSteps) {
      const stepType = this.determineStepType(step);
      const stepPattern = this.escapeStepPattern(step);
      
      stepDefs += `${stepType}('${stepPattern}', async function() {\n`;
      stepDefs += `  // TODO: Implement step: ${step}\n`;
      stepDefs += `  throw new Error('Step not implemented');\n`;
      stepDefs += `});\n\n`;
    }
    
    return stepDefs;
  }

  private determineStepType(step: string): string {
    if (step.includes('should')) return 'Then';
    if (step.startsWith('I ')) return 'When';
    return 'Given';
  }

  private escapeStepPattern(step: string): string {
    // Escape special regex characters
    return step.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private async saveFeatureFile(originalPath: string, content: string): Promise<string> {
    const relativePath = path.relative(process.cwd(), originalPath);
    const pathParts = relativePath.split(path.sep);
    
    // Determine output directory structure
    let outputBase = process.cwd();
    if (pathParts.includes('layer')) {
      const layerIndex = pathParts.indexOf('layer');
      outputBase = path.join(process.cwd(), ...pathParts.slice(0, layerIndex + 3));
    } else if (pathParts.includes('common')) {
      outputBase = path.join(process.cwd(), 'common');
    }
    
    const featuresDir = path.join(outputBase, this.outputDir);
    await await fileAPI.createDirectory(featuresDir);
    
    const featureName = path.basename(originalPath, '.stest.ts') + '.feature';
    const outputPath = path.join(featuresDir, featureName);
    
    await await fileAPI.createFile(outputPath, content);
    return outputPath;
  }

  private async saveStepDefinitions(originalPath: string, { type: FileType.TEMPORARY }): Promise<string> {
    const relativePath = path.relative(process.cwd(), originalPath);
    const pathParts = relativePath.split(path.sep);
    
    // Determine output directory structure
    let outputBase = process.cwd();
    if (pathParts.includes('layer')) {
      const layerIndex = pathParts.indexOf('layer');
      outputBase = path.join(process.cwd(), ...pathParts.slice(0, layerIndex + 3));
    } else if (pathParts.includes('common')) {
      outputBase = path.join(process.cwd(), 'common');
    }
    
    const stepDefsDir = path.join(outputBase, this.stepDefsDir);
    await await fileAPI.createDirectory(stepDefsDir);
    
    const stepDefName = path.basename(originalPath, '.stest.ts') + '.steps.ts';
    const outputPath = path.join(stepDefsDir, stepDefName);
    
    await fs.writeFile(outputPath, content);
    return outputPath;
  }

  async convertAll(): Promise<void> {
    const testFiles = await glob('**/*.stest.ts', {
      ignore: ['node_modules/**', 'dist/**', 'build/**']
    });
    
    console.log(`Found ${testFiles.length} system test files to convert\n`);
    
    for (const file of testFiles) {
      try {
        await this.convertFile(file);
      } catch (error) {
        console.error(`Error converting ${file}:`, error);
      }
    }
    
    console.log('\n✅ Conversion complete!');
    console.log(`Converted ${testFiles.length} test files to Cucumber format`);
  }
}

// Run the converter
const converter = new SystemTestToCucumberConverter();
converter.convertAll().catch(console.error);