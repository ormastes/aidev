import { fileAPI } from '../utils/file-api';
#!/usr/bin/env bun

import * as fs from '../../layer/themes/infra_external-log-lib/src';
import * as path from 'node:path';
import { glob } from 'glob';

interface TestCase {
  name: string;
  description: string;
  steps: string[];
  assertions: string[];
}

class STestToCucumberConverter {
  private sourceFile: string;
  private targetDir: string;
  private featureName: string;

  constructor(sourceFile: string) {
    this.sourceFile = sourceFile;
    this.targetDir = path.dirname(sourceFile).replace('/tests/system', '/features');
    
    // Extract feature name from file path
    const fileName = path.basename(sourceFile, '.stest.ts');
    this.featureName = fileName
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  async convert(): Promise<void> {
    console.log(`Converting ${this.sourceFile}...`);
    
    const content = await fs.promises.readFile(this.sourceFile, 'utf-8');
    const testCases = this.extractTestCases(content);
    
    if (testCases.length === 0) {
      console.log(`  No test cases found in ${this.sourceFile}`);
      return;
    }

    // Create feature file
    const featureContent = this.generateFeatureFile(testCases);
    const featureFile = path.join(this.targetDir, `${path.basename(this.sourceFile, '.stest.ts')}.feature`);
    
    // Create step definitions
    const stepDefsContent = this.generateStepDefinitions(testCases);
    const stepDefsDir = path.join(this.targetDir, 'step_definitions');
    const stepDefsFile = path.join(stepDefsDir, `${path.basename(this.sourceFile, '.stest.ts')}.steps.ts`);
    
    // Ensure directories exist
    await fs.promises.mkdir(this.targetDir, { recursive: true });
    await fs.promises.mkdir(stepDefsDir, { recursive: true });
    
    // Write files
    await fs.promises.writeFile(featureFile, featureContent);
    await fs.promises.writeFile(stepDefsFile, stepDefsContent);
    
    console.log(`  ✅ Created feature: ${featureFile}`);
    console.log(`  ✅ Created steps: ${stepDefsFile}`);
  }

  private extractTestCases(content: string): TestCase[] {
    const testCases: TestCase[] = [];
    
    // Match describe blocks
    const describePattern = /describe\(['"]([^'"]+)['"]/g;
    const itPattern = /it\(['"]([^'"]+)['"]/g;
    
    // Extract test names
    let match;
    while ((match = itPattern.exec(content)) !== null) {
      testCases.push({
        name: match[1],
        description: this.extractDescription(match[1]),
        steps: this.extractSteps(content, match.index),
        assertions: this.extractAssertions(content, match.index)
      });
    }
    
    return testCases;
  }

  private extractDescription(testName: string): string {
    // Convert test name to a readable description
    return testName
      .replace(/should\s+/i, '')
      .replace(/_/g, ' ')
      .trim();
  }

  private extractSteps(content: string, startIndex: number): string[] {
    const steps: string[] = [];
    
    // Find the test body
    const testBodyStart = content.indexOf('{', startIndex);
    const testBodyEnd = this.findMatchingBrace(content, testBodyStart);
    const testBody = content.substring(testBodyStart, testBodyEnd);
    
    // Extract meaningful operations
    const patterns = [
      /await\s+(\w+)\((.*?)\)/g,  // Async function calls
      /const\s+(\w+)\s*=\s*await/g,  // Async assignments
      /\.(\w+)\(/g,  // Method calls
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(testBody)) !== null) {
        if (match[1] && !['expect', 'assert', 'should'].includes(match[1])) {
          steps.push(match[1]);
        }
      }
    });
    
    return steps.length > 0 ? steps : ['execute test logic'];
  }

  private extractAssertions(content: string, startIndex: number): string[] {
    const assertions: string[] = [];
    
    // Find the test body
    const testBodyStart = content.indexOf('{', startIndex);
    const testBodyEnd = this.findMatchingBrace(content, testBodyStart);
    const testBody = content.substring(testBodyStart, testBodyEnd);
    
    // Extract assertions
    const patterns = [
      /expect\((.*?)\)\.(.*?)\(/g,
      /assert\.(.*?)\(/g,
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(testBody)) !== null) {
        assertions.push(match[0]);
      }
    });
    
    return assertions.length > 0 ? assertions : ['verify expected outcome'];
  }

  private findMatchingBrace(content: string, startIndex: number): number {
    let depth = 0;
    let inString = false;
    let stringChar = '';
    
    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];
      const prevChar = i > 0 ? content[i - 1] : '';
      
      if (!inString) {
        if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
          inString = true;
          stringChar = char;
        } else if (char === '{') {
          depth++;
        } else if (char === '}') {
          depth--;
          if (depth === 0) {
            return i + 1;
          }
        }
      } else {
        if (char === stringChar && prevChar !== '\\') {
          inString = false;
        }
      }
    }
    
    return content.length;
  }

  private generateFeatureFile(testCases: TestCase[]): string {
    const scenarios = testCases.map(tc => this.generateScenario(tc)).join('\n\n');
    
    return `Feature: ${this.featureName}
  As a user of the system
  I want to ensure ${this.featureName.toLowerCase()} works correctly
  So that I can rely on the system's functionality

${scenarios}
`;
  }

  private generateScenario(testCase: TestCase): string {
    const steps: string[] = [];
    
    // Generate Given/When/Then steps based on the test case
    steps.push(`    Given the system is initialized`);
    
    if (testCase.steps.length > 0) {
      testCase.steps.forEach((step, index) => {
        if (index === 0) {
          steps.push(`    When I ${this.humanizeStep(step)}`);
        } else {
          steps.push(`    And I ${this.humanizeStep(step)}`);
        }
      });
    } else {
      steps.push(`    When I perform the ${testCase.description} operation`);
    }
    
    steps.push(`    Then the ${testCase.description} should complete successfully`);
    
    return `  Scenario: ${testCase.description}
${steps.join('\n')}`;
  }

  private humanizeStep(step: string): string {
    // Convert camelCase to human-readable text
    return step
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()
      .trim()
      .replace(/^(create|get|set|update|delete|run|execute|start|stop|init)/, '$1');
  }

  private generateStepDefinitions(testCases: TestCase[]): string {
    const uniqueSteps = new Set<string>();
    
    // Collect all unique steps
    testCases.forEach(tc => {
      uniqueSteps.add('the system is initialized');
      tc.steps.forEach(step => {
        uniqueSteps.add(`I ${this.humanizeStep(step)}`);
      });
      uniqueSteps.add(`the ${tc.description} should complete successfully`);
      uniqueSteps.add(`I perform the ${tc.description} operation`);
    });
    
    const stepDefs = Array.from(uniqueSteps).map(step => {
      const stepType = step.startsWith('the system') ? 'Given' : 
                      step.startsWith('I ') ? 'When' : 'Then';
      const functionName = step.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      
      return `${stepType}('${step}', async function() {
  // TODO: Implement step logic from original test
  // Original file: ${this.sourceFile}
  await new Promise(resolve => setTimeout(resolve, 100));
});`;
    });
    
    return `import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import { expect } from 'chai';

// Converted from: ${path.basename(this.sourceFile)}
// ${new Date().toISOString()}

Before(async function() {
  // Setup test environment
  this.testData = {};
});

After(async function() {
  // Cleanup test environment
});

${stepDefs.join('\n\n')}
`;
  }
}

// Main execution
async function main() {
  const pattern = process.argv[2] || '**/*.stest.ts';
  const dryRun = process.argv.includes('--dry-run');
  
  console.log('🔄 Converting .stest.ts files to Cucumber format...');
  console.log(`Pattern: ${pattern}`);
  console.log(`Dry run: ${dryRun}`);
  console.log('');
  
  const files = await glob(pattern, {
    cwd: process.cwd(),
    absolute: true,
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
  });
  
  console.log(`Found ${files.length} .stest.ts files to convert\n`);
  
  for (const file of files) {
    const converter = new STestToCucumberConverter(file);
    
    if (dryRun) {
      console.log(`Would convert: ${file}`);
    } else {
      await converter.convert();
    }
  }
  
  if (!dryRun && files.length > 0) {
    console.log('\n✅ Conversion complete!');
    console.log('\n⚠️  Note: The generated step definitions contain TODO placeholders.');
    console.log('You need to manually implement the actual test logic from the original files.');
    console.log('\n🗑️  To remove old .stest.ts files, run:');
    console.log('  find . -name "*.stest.ts" -type f -delete');
  }
}

main().catch(console.error);