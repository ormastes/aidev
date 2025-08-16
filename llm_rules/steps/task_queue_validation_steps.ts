import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import { strict as assert } from 'assert';
import { fs } from '../../layer/themes/infra_external-log-lib/dist';
import { path } from '../../layer/themes/infra_external-log-lib/dist';

export interface ValidationWorld {
  registryPath: string;
  featurePath: string;
  taskQueuePath: string;
  validationErrors: string[];
}

Before(function(this: ValidationWorld) {
  this.validationErrors = [];
});

Given('a NAME_ID registry at {string}', function(this: ValidationWorld, registryPath: string) {
  this.registryPath = registryPath;
});

Given('a FEATURE.md at {string}', function(this: ValidationWorld, featurePath: string) {
  this.featurePath = featurePath;
});

Given('a TASK_QUEUE.md at {string}', function(this: ValidationWorld, taskQueuePath: string) {
  this.taskQueuePath = taskQueuePath;
});

When('I validate the task {string} is registered', function(this: ValidationWorld, taskId: string) {
  try {
    if (!fs.existsSync(this.registryPath)) {
      this.validationErrors.push(`Registry file not found: ${this.registryPath}`);
      return;
    }
    
    const registry = JSON.parse(fs.readFileSync(this.registryPath, 'utf-8'));
    if (!registry[taskId]) {
      this.validationErrors.push(`Task ID "${taskId}" is not registered in NAME_ID.vf.json`);
    }
  } catch (error) {
    this.validationErrors.push(`Error reading registry: ${error}`);
  }
});

When('I validate all queues are empty before adhoc insertion', function(this: ValidationWorld) {
  try {
    const taskQueueContent = fs.readFileSync(this.taskQueuePath, 'utf-8');
    const lines = taskQueueContent.split('\n');
    
    const queueSections = [
      'Environment Tests Queue',
      'External Tests Queue',
      'System Tests Implement Queue',
      'Integration Tests Implement Queue',
      'Unit Tests Queue',
      'Integration Tests Verify Queue',
      'System Tests Verify Queue',
      'Coverage and Duplication Queue',
      'Retrospective Queue',
      'Scenarios Queue',
      'User Story Queue'
    ];
    
    for (const section of queueSections) {
      const sectionIndex = lines.findIndex(line => line.includes(section));
      if (sectionIndex !== -1) {
        let i = sectionIndex + 1;
        while (i < lines.length && !lines[i].includes('###')) {
          if (lines[i].trim() && !lines[i].includes('- [ ]')) {
            this.validationErrors.push(`Queue "${section}" is not empty`);
            break;
          }
          i++;
        }
      }
    }
  } catch (error) {
    this.validationErrors.push(`Error validating queues: ${error}`);
  }
});

When('I validate the scenario {string} exists in FEATURE.md', function(this: ValidationWorld, scenarioName: string) {
  try {
    if (!fs.existsSync(this.featurePath)) {
      this.validationErrors.push(`FEATURE.md not found: ${this.featurePath}`);
      return;
    }
    
    const featureContent = fs.readFileSync(this.featurePath, 'utf-8');
    if (!featureContent.includes(scenarioName)) {
      this.validationErrors.push(`Scenario "${scenarioName}" not found in FEATURE.md`);
    }
  } catch (error) {
    this.validationErrors.push(`Error reading FEATURE.md: ${error}`);
  }
});

When('I validate the test {string} has a failing test file', function(this: ValidationWorld, testName: string) {
  const testPatterns = [
    `${testName}.test.ts`,
    `${testName}.spec.ts`,
    `${testName}.test.js`,
    `${testName}.spec.js`
  ];
  
  let found = false;
  for (const pattern of testPatterns) {
    const testFiles = findFiles(process.cwd(), pattern);
    if (testFiles.length > 0) {
      found = true;
      break;
    }
  }
  
  if (!found) {
    this.validationErrors.push(`No test file found for "${testName}"`);
  }
});

Then('all validations should pass', function(this: ValidationWorld) {
  if (this.validationErrors.length > 0) {
    const errorMessage = 'Validation errors:\n' + this.validationErrors.join('\n');
    throw new Error(errorMessage);
  }
});

Then('I should see validation error {string}', function(this: ValidationWorld, expectedError: string) {
  const hasError = this.validationErrors.some(error => error.includes(expectedError));
  assert.ok(hasError, `Expected validation error containing "${expectedError}"`);
});

// Helper function to find files recursively
function findFiles(dir: string, pattern: string): string[] {
  const results: string[] = [];
  
  function search(directory: string) {
    try {
      const files = fs.readdirSync(directory);
      for (const file of files) {
        const fullPath = path.join(directory, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          search(fullPath);
        } else if (stat.isFile() && file.includes(pattern)) {
          results.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
  }
  
  search(dir);
  return results;
}