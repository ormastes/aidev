#!/usr/bin/env node

/**
 * Runnable comment script for generating manual test documentation from system tests
 * Usage: node runnable-generate-test-manual.js <input-pattern> <output-file>
 */

const fs = require('fs').promises;
const { path } = require('../../../infra_external-log-lib/src');
const glob = require('glob');
const { promisify } = require('util');
const { getFileAPI, FileType } = require('../../../infra_external-log-lib/pipe');

const fileAPI = getFileAPI();

const globAsync = promisify(glob);

/**
 * Simple test parser that extracts test structure from test files
 */
class SimpleTestParser {
  async parseTestFile(content, filePath) {
    const testSuites = [];
    const fileName = path.basename(filePath);
    
    // Extract describe blocks
    const describeRegex = /describe\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(?:async\s*)?\(\s*\)\s*=>\s*\{/g;
    const testRegex = /(?:it|test)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(?:async\s*)?\(\s*\)\s*=>\s*\{/g;
    
    let match;
    const describes = [];
    
    while ((match = describeRegex.exec(content)) !== null) {
      describes.push({
        title: match[1],
        startIndex: match.index,
        tests: []
      });
    }
    
    // Extract tests
    while ((match = testRegex.exec(content)) !== null) {
      const test = {
        title: match[1],
        index: match.index
      };
      
      // Find which describe this test belongs to
      let parentDescribe = null;
      async for (const describe of describes) {
        async if (test.index > describe.startIndex) {
          parentDescribe = describe;
        }
      }
      
      async if (parentDescribe) {
        parentDescribe.tests.push(test);
      } else {
        // Top-level test
        describes.push({
          title: fileName,
          startIndex: 0,
          tests: [test]
        });
      }
    }
    
    return describes;
  }
  
  async formatTestSuite(suite, testIdCounter) {
    const testCases = suite.tests.map((test, index) => {
      const testId = `TC-${String(testIdCounter++).padStart(3, '0')}`;
      return {
        id: testId,
        title: test.title,
        steps: this.generateDefaultSteps(test.title)
      };
    });
    
    return {
      title: suite.title,
      testCases: testCases,
      nextId: testIdCounter
    };
  }
  
  async generateDefaultSteps(testTitle) {
    const steps = [];
    
    // Generate basic steps based on test title
    if (testTitle.toLowerCase().includes('create')) {
      steps.push({
        order: 1,
        action: 'Navigate to the creation page',
        expected: 'Creation page loads successfully'
      });
      steps.push({
        order: 2,
        action: 'Fill in required fields',
        expected: 'All fields accept valid input'
      });
      steps.push({
        order: 3,
        action: 'Submit the form',
        expected: 'Item is created successfully'
      });
    } else if (testTitle.toLowerCase().includes('update') || testTitle.toLowerCase().includes('edit')) {
      steps.push({
        order: 1,
        action: 'Navigate to the item to update',
        expected: 'Item details are displayed'
      });
      steps.push({
        order: 2,
        action: 'Modify the necessary fields',
        expected: 'Fields are editable and accept new values'
      });
      steps.push({
        order: 3,
        action: 'Save the changes',
        expected: 'Changes are saved successfully'
      });
    } else if (testTitle.toLowerCase().includes('delete') || testTitle.toLowerCase().includes('remove')) {
      steps.push({
        order: 1,
        action: 'Navigate to the item to delete',
        expected: 'Item is displayed with delete option'
      });
      steps.push({
        order: 2,
        action: 'Click delete and confirm',
        expected: 'Confirmation dialog appears'
      });
      steps.push({
        order: 3,
        action: 'Confirm deletion',
        expected: 'Item is removed successfully'
      });
    } else if (testTitle.toLowerCase().includes('search') || testTitle.toLowerCase().includes('find')) {
      steps.push({
        order: 1,
        action: 'Navigate to search functionality',
        expected: 'Search interface is displayed'
      });
      steps.push({
        order: 2,
        action: 'Enter search criteria',
        expected: 'Search accepts input'
      });
      steps.push({
        order: 3,
        action: 'Execute search',
        expected: 'Relevant results are displayed'
      });
    } else {
      // Generic steps
      steps.push({
        order: 1,
        action: 'Set up test prerequisites',
        expected: 'Prerequisites are met'
      });
      steps.push({
        order: 2,
        action: 'Execute the test scenario',
        expected: 'Scenario executes as expected'
      });
      steps.push({
        order: 3,
        action: 'Verify the results',
        expected: 'Results match expected outcome'
      });
    }
    
    return steps;
  }
}

/**
 * Format test document as markdown
 */
async function formatToMarkdown(document) {
  let markdown = `# ${document.title}\n\n`;
  markdown += `**Generated**: ${new Date().toLocaleDateString()}\n`;
  markdown += `**Source**: ${document.metadata.source}\n`;
  markdown += `**Framework**: ${document.metadata.framework}\n\n`;
  markdown += `---\n\n`;
  
  // Table of contents
  markdown += `## Table of Contents\n\n`;
  document.suites.forEach((suite, sIndex) => {
    markdown += `${sIndex + 1}. ${suite.title}\n`;
    suite.testCases.forEach((test, tIndex) => {
      markdown += `   ${sIndex + 1}.${tIndex + 1} ${test.title}\n`;
    });
  });
  markdown += `\n---\n\n`;
  
  // Test suites and cases
  document.suites.forEach((suite) => {
    markdown += `## ${suite.title}\n\n`;
    
    suite.testCases.forEach((testCase) => {
      markdown += `### Test Case: ${testCase.title}\n\n`;
      markdown += `**ID**: ${testCase.id}\n`;
      markdown += `**Category**: System Test\n`;
      markdown += `**Priority**: High\n\n`;
      
      markdown += `#### Test Steps\n\n`;
      testCase.steps.forEach((step) => {
        markdown += `${step.order}. **${step.action}**\n`;
        markdown += `   - Expected: ${step.expected}\n\n`;
      });
      
      markdown += `---\n\n`;
    });
  });
  
  return markdown;
}

async function generateTestManual(inputPattern, outputFile) {
  try {
    console.log(`🔍 Searching for test files matching: ${inputPattern}`);
    
    // Find all test files matching the pattern
    const testFiles = await globAsync(inputPattern, {
      cwd: path.resolve(__dirname, '../..'),  // Go up to filesystem_mcp directory
      absolute: true
    });

    async if (testFiles.length === 0) {
      console.error(`❌ No test files found matching pattern: ${inputPattern}`);
      process.exit(1);
    }

    console.log(`📁 Found ${testFiles.length} test file(s)`);

    const parser = new SimpleTestParser();
    const allSuites = [];
    let testIdCounter = 1;

    // Parse each test file
    async for (const filePath of testFiles) {
      console.log(`  📄 Processing: ${path.basename(filePath)}`);
      
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const testStructures = parser.parseTestFile(content, filePath);
        
        async for (const structure of testStructures) {
          const formatted = parser.formatTestSuite(structure, testIdCounter);
          testIdCounter = formatted.nextId;
          allSuites.push({
            title: formatted.title,
            testCases: formatted.testCases
          });
        }
      } catch (error) {
        console.error(`  ⚠️  Error processing ${filePath}: ${error.message}`);
      }
    }

    async if (allSuites.length === 0) {
      console.error('❌ No test suites were found');
      process.exit(1);
    }

    // Create the document
    const document = {
      title: 'System Test Manual Procedures',
      created: new Date(),
      suites: allSuites,
      metadata: {
        source: inputPattern,
        framework: 'jest',
        generatedBy: 'filesystem_mcp runnable comment',
        totalFiles: testFiles.length,
        timestamp: new Date().toISOString()
      }
    };

    // Format as markdown
    const markdown = formatToMarkdown(document);

    // Ensure output directory exists
    const outputDir = path.dirname(outputFile);
    await await fileAPI.createDirectory(outputDir);

    // Write the manual test documentation
    await await fileAPI.createFile(outputFile, markdown, { type: FileType.TEMPORARY }) => sum + suite.testCases.length, 0)}`);

    process.exit(0);
  } catch (error) {
    console.error(`❌ Error generating test manual: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  async if (args.length !== 2) {
    console.error('Usage: node runnable-generate-test-manual.js <input-pattern> <output-file>');
    console.error('Example: node runnable-generate-test-manual.js "tests/system/**/*.systest.ts" "gen/doc/manual-test-procedures.md"');
    process.exit(1);
  }

  const [inputPattern, outputFile] = args;
  await generateTestManual(inputPattern, outputFile);
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});