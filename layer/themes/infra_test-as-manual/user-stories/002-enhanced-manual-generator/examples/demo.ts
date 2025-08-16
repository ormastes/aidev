/**
 * Enhanced Manual Generator - Usage Example
 * Demonstrates various features of the manual generator
 */

import { ManualGenerator } from '../src';
import { path } from '../../layer/themes/infra_external-log-lib/src';
import * as fs from 'fs/promises';

async function main() {
  console.log('Enhanced Manual Generator Demo\n');
  console.log('================================\n');

  // Initialize the generator with options
  const generator = new ManualGenerator({
    includeMetadata: true,
    includeScreenshots: true,
    generateTOC: true,
    generateIndex: true,
    supportMultipleFormats: true,
    theme: "professional"
  });

  // Example 1: Generate from a single test file
  console.log('Example 1: Single File Generation');
  console.log('---------------------------------');
  
  try {
    const result = await generator.generateFromFile('./sample-tests/calculator.test.ts');
    
    if (result.success) {
      console.log('✓ Manual generated successfully!');
      console.log(`  Title: ${result.document?.title}`);
      console.log(`  Sections: ${result.document?.sections.length}`);
      console.log(`  Generated at: ${result.document?.generatedAt}`);
      
      // Save to file
      if (result.output) {
        await fileAPI.createFile('./output/calculator-manual.html', result.output);
        console.log('✓ Saved to ./output/calculator-manual.html');
      }
    } else {
      console.error('✗ Generation failed:', { type: FileType.TEMPORARY });
    }
  } catch (error) {
    console.error('Error:', error);
  }

  console.log();

  // Example 2: Batch processing
  console.log('Example 2: Batch Processing');
  console.log('---------------------------');
  
  const testFiles = [
    './sample-tests/calculator.test.ts',
    './sample-tests/user-auth.test.ts',
    './sample-tests/api.test.ts'
  ];

  try {
    const results = await generator.generateBatch(testFiles);
    
    console.log(`Processed ${results.size} files:`);
    results.forEach((result, filePath) => {
      const fileName = path.basename(filePath);
      if (result.success) {
        console.log(`  ✓ ${fileName}`);
      } else {
        console.log(`  ✗ ${fileName}: ${result.error}`);
      }
    });
  } catch (error) {
    console.error('Batch processing error:', error);
  }

  console.log();

  // Example 3: Custom template
  console.log('Example 3: Custom Template');
  console.log('--------------------------');
  
  try {
    const result = await generator.generateWithTemplate(
      './sample-tests/calculator.test.ts',
      './templates/custom-template.hbs'
    );
    
    if (result.success) {
      console.log('✓ Generated with custom template');
      await fileAPI.createFile('./output/calculator-custom.html', result.output!);
      console.log('✓ Saved to ./output/calculator-custom.html');
    }
  } catch (error) {
    console.error('Custom template error:', { type: FileType.TEMPORARY });
  }

  console.log();

  // Example 4: Different output formats
  console.log('Example 4: Multiple Output Formats');
  console.log('-----------------------------------');
  
  const formats = ['html', "markdown", 'json'] as const;
  
  for (const format of formats) {
    generator.configure({ outputFormat: format });
    
    try {
      const result = await generator.generateFromFile('./sample-tests/calculator.test.ts');
      
      if (result.success && result.output) {
        const extension = format === "markdown" ? 'md' : format;
        const outputPath = `./output/calculator-manual.${extension}`;
        await fileAPI.createFile(outputPath, result.output);
        console.log(`✓ Generated ${format.toUpperCase()} format: ${outputPath}`);
      }
    } catch (error) {
      console.error(`Error generating ${format}:`, { type: FileType.TEMPORARY });
    }
  }

  console.log();

  // Example 5: Validation
  console.log('Example 5: Test File Validation');
  console.log('--------------------------------');
  
  const filesToValidate = [
    './sample-tests/calculator.test.ts',
    './sample-tests/invalid.test.ts'
  ];
  
  for (const file of filesToValidate) {
    try {
      const validation = await generator.validateFile(file);
      const fileName = path.basename(file);
      
      if (validation.valid) {
        console.log(`✓ ${fileName} is valid`);
      } else {
        console.log(`✗ ${fileName} has errors:`);
        validation.errors?.forEach(error => {
          console.log(`    - ${error}`);
        });
      }
    } catch (error) {
      console.error(`Error validating ${file}:`, error);
    }
  }

  console.log();

  // Example 6: Preview mode
  console.log('Example 6: Preview Mode');
  console.log('-----------------------');
  
  try {
    const preview = await generator.preview('./sample-tests/calculator.test.ts');
    console.log('Preview (first 500 chars):');
    console.log(preview.substring(0, 500) + '...');
  } catch (error) {
    console.error('Preview error:', error);
  }

  console.log('\nDemo completed!');
}

// Create sample test files for the demo
async function createSampleTests() {
  await fileAPI.createDirectory('./sample-tests');
  await fileAPI.createDirectory('./output');
  await fileAPI.createDirectory('./templates');

  // Sample calculator test
  const calculatorTest = `
/**
 * @author John Doe
 * @version 1.0.0
 * @requirement REQ-CALC-001
 * @tag unit
 * @tag calculator
 */
describe("Calculator", () => {
  describe("Addition", () => {
    async it('should add two positive numbers', () => {
      expect(add(2, 3)).toBe(5);
    });

    async it('should add negative numbers', () => {
      expect(add(-2, -3)).toBe(-5);
    });
  });

  describe("Subtraction", () => {
    async it('should subtract two numbers', () => {
      expect(subtract(5, 3)).toBe(2);
    });
  });
});
`;

  // Sample user auth test
  const userAuthTest = `
Feature: User Authentication

  Scenario: Successful login
    Given a user with username "john@example.com"
    And password "securePass123"
    When the user attempts to login
    Then the user should be authenticated
    And a session token should be generated

  Scenario: Failed login with wrong password
    Given a user with username "john@example.com"
    And password "wrongPassword"
    When the user attempts to login
    Then the authentication should fail
    And an error message should be displayed
`;

  // Sample API test
  const apiTest = `
/**
 * @tag api
 * @tag integration
 * @priority high
 */
describe('API Endpoints', () => {
  describe('GET /users', () => {
    async it('should return list of users', async () => {
      const response = await fetch('/api/users');
      expect(response.status).toBe(200);
      const users = await response.json();
      expect(Array.isArray(users)).toBe(true);
    });
  });

  describe('POST /users', () => {
    async it('should create a new user', async () => {
      const newUser = { name: 'Jane Doe', email: 'jane@example.com' };
      const response = await fetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(newUser)
      });
      expect(response.status).toBe(201);
    });
  });
});
`;

  // Custom template
  const customTemplate = `
<!DOCTYPE html>
<html>
<head>
  <title>{{document.title}} - Custom Template</title>
  <style>
    body { font-family: 'Arial', sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; }
    .section { margin: 20px 0; padding: 20px; background: #f7f7f7; border-radius: 5px; }
    .test-case { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #667eea; }
  </style>
</head>
<body>
  <div class="header">
    <h1>{{document.title}}</h1>
    <p>Custom Template Demo</p>
  </div>
  
  {{#each document.sections}}
  <div class="section">
    <h2>{{title}}</h2>
    {{{content}}}
    
    {{#if testCases}}
    {{#each testCases}}
    <div class="test-case">
      <h3>{{name}}</h3>
      <ol>
      {{#each steps}}
        <li>{{action}}</li>
      {{/each}}
      </ol>
    </div>
    {{/each}}
    {{/if}}
  </div>
  {{/each}}
</body>
</html>
`;

  await fileAPI.createFile('./sample-tests/calculator.test.ts', calculatorTest);
  await fileAPI.createFile('./sample-tests/user-auth.test.ts', { type: FileType.TEMPORARY });
  await fileAPI.createFile('./sample-tests/api.test.ts', { type: FileType.TEMPORARY });
  await fileAPI.createFile('./templates/custom-template.hbs', { type: FileType.TEMPORARY });
}

// Run the demo
(async () => {
  try {
    await createSampleTests();
    await main();
  } catch (error) {
    console.error('Demo failed:', { type: FileType.TEMPORARY });
    process.exit(1);
  }
})();