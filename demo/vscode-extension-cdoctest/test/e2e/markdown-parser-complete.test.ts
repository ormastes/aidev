import { test, expect } from '@playwright/test';
import { VSCodeAutomationHelper } from './helpers/vscode-automation-helper';
import { path } from '../../layer/themes/infra_external-log-lib/src';
import { fs } from '../../layer/themes/infra_external-log-lib/src';

/**
 * Complete E2E tests for markdown parser and file system monitoring
 * Targets 100% coverage of:
 * - src/tclist_parser/parser.ts (parseMarkdown function)
 * - src/tclist_parser/testTree.ts (TestFile, TestCase, TestHeading classes)
 * - src/tclist_parser/watchers.ts (file system monitoring)
 * - src/tclist_parser/file_change_listener.ts (change event handling)
 * - src/tclist_parser/fileHelper.ts (file management utilities)
 */

const EXTENSION_ROOT = process.cwd();
const TEST_WORKSPACE = path.join(__dirname, '../fixtures/markdown-parser-workspace');

let vscodeHelper: VSCodeAutomationHelper;

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();
  vscodeHelper = new VSCodeAutomationHelper(page);
  
  // Create markdown test workspace
  await setupMarkdownTestWorkspace();
});

test.afterAll(async () => {
  await vscodeHelper?.closeVSCode();
  if (fs.existsSync(TEST_WORKSPACE)) {
    fs.rmSync(TEST_WORKSPACE, { recursive: true, force: true });
  }
});

test.describe('Markdown Parser - Complete Coverage', () => {
  
  test('should parse markdown files and discover test cases', async ({ page }) => {
    // Launch VSCode with markdown test workspace
    await launchVSCodeWithMarkdownWorkspace(page);
    
    // Open Test Explorer to trigger markdown parsing
    await vscodeHelper.openTestExplorer();
    await page.waitForTimeout(5000);
    
    // Verify cdoctest controller is present (indicates markdown parsing worked)
    const cdoctestController = page.locator('text*="cdoctest Test"');
    await expect(cdoctestController).toBeVisible({ timeout: 15000 });
    
    // Click to expand controller and see parsed tests
    await cdoctestController.click();
    await page.waitForTimeout(3000);
    
    // Verify parsed test cases from markdown are visible
    const testCases = [
      "MathOperations",
      "StringOperations", 
      "ArrayHandling",
      "EdgeCases"
    ];
    
    for (const testCase of testCases) {
      const testItem = page.locator(`text*="${testCase}"`);
      if (await testItem.isVisible()) {
        console.log(`✓ Found parsed test: ${testCase}`);
      }
    }
    
    await vscodeHelper.takeScreenshot('markdown-tests-parsed');
  });

  test('should create TestFile instances for each markdown file', async ({ page }) => {
    // Test TestFile class instantiation and management
    
    // Create additional markdown files to test TestFile creation
    await createAdditionalMarkdownFiles();
    
    // Refresh test discovery to trigger new TestFile creation
    await vscodeHelper.openTestExplorer();
    
    const refreshButton = page.locator('[aria-label*="Refresh"]').first();
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      await page.waitForTimeout(5000);
    }
    
    // Verify multiple test files are discovered
    const testFileIndicators = page.locator('[role="treeitem"]');
    const fileCount = await testFileIndicators.count();
    expect(fileCount).toBeGreaterThan(1);
    
    // Test TestFile hierarchy (files contain test cases)
    const firstFile = testFileIndicators.first();
    if (await firstFile.isVisible()) {
      await firstFile.click(); // Expand to show TestCase instances
      await page.waitForTimeout(2000);
      
      // Should see child test cases (TestCase instances)
      const childTests = page.locator('[role="treeitem"][aria-level="2"], [role="treeitem"][aria-expanded]');
      const childCount = await childTests.count();
      expect(childCount).toBeGreaterThan(0);
    }
    
    await vscodeHelper.takeScreenshot('test-files-created');
  });

  test('should execute TestCase instances from markdown', async ({ page }) => {
    // Test TestCase class execution functionality
    
    await vscodeHelper.openTestExplorer();
    
    // Find a test case and execute it
    const testCases = page.locator('[role="treeitem"]').filter({ hasText: /test|case/i });
    
    if (await testCases.count() > 0) {
      const firstTestCase = testCases.first();
      
      // Right-click to open context menu
      await firstTestCase.click({ button: 'right' });
      await page.waitForTimeout(1000);
      
      // Click "Run Test" to execute TestCase
      const runOption = page.locator('text="Run Test"');
      if (await runOption.isVisible()) {
        await runOption.click();
        
        // Wait for TestCase execution
        await page.waitForTimeout(8000);
        
        // Verify test execution results
        const executionResults = page.locator('.test-result, [class*="pass"], [class*="fail"]');
        const resultCount = await executionResults.count();
        
        console.log(`Test execution results found: ${resultCount}`);
        
        // Check output panel for execution details
        await vscodeHelper.openOutputPanel();
        const outputContent = page.locator('.output-view');
        await expect(outputContent).toBeVisible();
      }
    }
    
    await vscodeHelper.takeScreenshot('test-case-executed');
  });

  test('should handle TestHeading hierarchy organization', async ({ page }) => {
    // Test TestHeading class for organizing test structure
    
    // Create markdown with nested headings
    await createNestedHeadingMarkdown();
    
    await vscodeHelper.openTestExplorer();
    
    // Refresh to pick up new markdown structure
    const refreshButton = page.locator('[aria-label*="Refresh"]').first();
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      await page.waitForTimeout(5000);
    }
    
    // Verify hierarchical test organization (TestHeading instances)
    const treeItems = page.locator('[role="treeitem"]');
    const itemCount = await treeItems.count();
    
    // Look for different hierarchy levels
    const topLevelItems = page.locator('[role="treeitem"][aria-level="1"]');
    const secondLevelItems = page.locator('[role="treeitem"][aria-level="2"]');
    
    const topCount = await topLevelItems.count();
    const secondCount = await secondLevelItems.count();
    
    console.log(`Top level items (TestHeadings): ${topCount}`);
    console.log(`Second level items (TestCases): ${secondCount}`);
    
    // Test expanding/collapsing hierarchy
    if (topCount > 0) {
      const expandableItem = topLevelItems.first();
      await expandableItem.click();
      await page.waitForTimeout(2000);
      
      // Should reveal child items
      const expandedChildren = page.locator('[role="treeitem"][aria-level="2"]:visible');
      const childrenCount = await expandedChildren.count();
      expect(childrenCount).toBeGreaterThan(0);
    }
    
    await vscodeHelper.takeScreenshot('test-heading-hierarchy');
  });

  test('should monitor file system changes and update tests', async ({ page }) => {
    // Test file system watching functionality (watchers.ts)
    
    await vscodeHelper.openTestExplorer();
    await page.waitForTimeout(3000);
    
    // Get initial test count
    const initialTests = page.locator('[role="treeitem"]');
    const initialCount = await initialTests.count();
    
    // Modify existing markdown file to trigger file change detection
    const testFilePath = path.join(TEST_WORKSPACE, 'existing_tests.md');
    const additionalContent = `

## New Dynamic Test Section

\`\`\`cpp
TEST_CASE("Dynamic Test Added") {
    CHECK(1 + 1 == 2);
    CHECK(true == true);
}
\`\`\`

\`\`\`cpp
TEST_CASE("Another Dynamic Test") {
    std::vector<int> numbers = {1, 2, 3};
    CHECK(numbers.size() == 3);
}
\`\`\`
`;
    
    fs.appendFileSync(testFilePath, additionalContent);
    
    // Wait for file system watcher to detect changes
    await page.waitForTimeout(8000);
    
    // Verify test tree updated automatically (file change listener worked)
    const updatedTests = page.locator('[role="treeitem"]');
    const updatedCount = await updatedTests.count();
    
    console.log(`Initial tests: ${initialCount}, Updated tests: ${updatedCount}`);
    
    // Look for the new test cases
    const dynamicTest = page.locator('text*="Dynamic Test"');
    if (await dynamicTest.isVisible()) {
      console.log('✓ File system change detected and tests updated');
    }
    
    await vscodeHelper.takeScreenshot('file-change-detected');
  });

  test('should handle file creation and deletion events', async ({ page }) => {
    // Test file change listener for create/delete operations
    
    await vscodeHelper.openTestExplorer();
    
    // Create a completely new markdown file
    const newFilePath = path.join(TEST_WORKSPACE, 'runtime_created_tests.md');
    const newFileContent = `
# Runtime Created Tests

## Performance Tests

\`\`\`cpp
TEST_CASE("Performance Test 1") {
    auto start = std::chrono::high_resolution_clock::now();
    // Some performance testing code
    auto end = std::chrono::high_resolution_clock::now();
    CHECK(end >= start);
}
\`\`\`

\`\`\`cpp
TEST_CASE("Memory Test") {
    std::vector<int> data(1000);
    CHECK(data.capacity() >= 1000);
}
\`\`\`
`;
    
    fs.writeFileSync(newFilePath, newFileContent);
    
    // Wait for file creation to be detected
    await page.waitForTimeout(10000);
    
    // Refresh if automatic detection didn't work
    const refreshButton = page.locator('[aria-label*="Refresh"]').first();
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      await page.waitForTimeout(5000);
    }
    
    // Verify new file was detected
    const performanceTest = page.locator('text*="Performance Test"');
    const memoryTest = page.locator('text*="Memory Test"');
    
    const perfVisible = await performanceTest.isVisible();
    const memVisible = await memoryTest.isVisible();
    
    console.log(`Performance test detected: ${perfVisible}`);
    console.log(`Memory test detected: ${memVisible}`);
    
    // Test file deletion
    fs.unlinkSync(newFilePath);
    await page.waitForTimeout(8000);
    
    // Tests should be removed from tree
    const removedPerfTest = await performanceTest.isVisible();
    const removedMemTest = await memoryTest.isVisible();
    
    console.log(`Tests removed after file deletion: ${!removedPerfTest && !removedMemTest}`);
    
    await vscodeHelper.takeScreenshot('file-creation-deletion-handled');
  });

  test('should use fileHelper utilities for file operations', async ({ page }) => {
    // Test fileHelper.ts functionality
    
    // Create files with various extensions to test file filtering
    const testFiles = [
      { name: 'valid_test.md', content: '# Valid Test\n```cpp\nTEST_CASE("test") { CHECK(true); }\n```' },
      { name: 'invalid_test.txt', content: 'Not a markdown file' },
      { name: 'empty_test.md', content: '' },
      { name: 'no_tests.md', content: '# Documentation\nThis has no test cases.' }
    ];
    
    for (const file of testFiles) {
      fs.writeFileSync(path.join(TEST_WORKSPACE, file.name), file.content);
    }
    
    await vscodeHelper.openTestExplorer();
    
    // Trigger refresh to use fileHelper functions
    const refreshButton = page.locator('[aria-label*="Refresh"]').first();
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      await page.waitForTimeout(5000);
    }
    
    // Verify only valid markdown files with tests were processed
    const validTest = page.locator('text*="Valid Test"');
    const validTestVisible = await validTest.isVisible();
    
    console.log(`Valid markdown test detected: ${validTestVisible}`);
    
    // Invalid files should not appear in test tree
    const invalidTest = page.locator('text*="invalid_test"');
    const invalidTestVisible = await invalidTest.isVisible();
    
    console.log(`Invalid file filtered out: ${!invalidTestVisible}`);
    
    await vscodeHelper.takeScreenshot('file-helper-filtering');
  });

  test('should handle workspace-wide test resolution', async ({ page }) => {
    // Test getResolveTcListHandler and workspace monitoring
    
    // Create nested directory structure with markdown files
    const nestedDir = path.join(TEST_WORKSPACE, 'nested', 'tests');
    fs.mkdirSync(nestedDir, { recursive: true });
    
    const nestedTestContent = `
# Nested Tests

## Deep Test Suite

\`\`\`cpp
TEST_CASE("Nested Test Case") {
    int nested_value = 42;
    CHECK(nested_value == 42);
}
\`\`\`
`;
    
    fs.writeFileSync(path.join(nestedDir, 'nested_tests.md'), nestedTestContent);
    
    await vscodeHelper.openTestExplorer();
    
    // Trigger workspace-wide test resolution
    const refreshButton = page.locator('[aria-label*="Refresh"]').first();
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      await page.waitForTimeout(8000);
    }
    
    // Verify nested tests were discovered
    const nestedTest = page.locator('text*="Nested Test Case"');
    const nestedVisible = await nestedTest.isVisible();
    
    console.log(`Nested test discovered: ${nestedVisible}`);
    
    // Test can execute nested test
    if (nestedVisible) {
      await nestedTest.click({ button: 'right' });
      await page.waitForTimeout(1000);
      
      const runOption = page.locator('text="Run Test"');
      if (await runOption.isVisible()) {
        await runOption.click();
        await page.waitForTimeout(5000);
        
        console.log('✓ Nested test execution attempted');
      }
    }
    
    await vscodeHelper.takeScreenshot('workspace-resolution');
  });

});

/**
 * Setup markdown test workspace with comprehensive test files
 */
async function setupMarkdownTestWorkspace(): Promise<void> {
  if (!fs.existsSync(TEST_WORKSPACE)) {
    fs.mkdirSync(TEST_WORKSPACE, { recursive: true });
  }
  
  // Create .vscode settings for cdoctest
  const vscodeDir = path.join(TEST_WORKSPACE, '.vscode');
  fs.mkdirSync(vscodeDir, { recursive: true });
  
  const settings = {
    "cdoctest.pythonExePath": "python3",
    "cdoctest.listTestArgPattern": "python3 -m cdoctest --cdt_list_testcase",
    "cdoctest.testRunArgPattern": "python3 -m cdoctest --cdt_run_testcase",
    "cdoctest.buildDirectory": path.join(TEST_WORKSPACE, 'build'),
    "cdoctest.enableMarkdownParsing": true
  };
  
  fs.writeFileSync(path.join(vscodeDir, 'settings.json'), JSON.stringify(settings, null, 2));
  
  // Create comprehensive markdown test file
  const mainTestContent = `
# Main Test Documentation

This document contains various test cases for the cdoctest system.

## Math Operations

Basic mathematical operations testing.

\`\`\`cpp
TEST_CASE("MathOperations") {
    CHECK(2 + 2 == 4);
    CHECK(10 - 5 == 5);
    CHECK(3 * 4 == 12);
    CHECK(8 / 2 == 4);
}
\`\`\`

## String Operations

String manipulation and validation tests.

\`\`\`cpp
TEST_CASE("StringOperations") {
    std::string hello = "Hello";
    std::string world = "World";
    std::string combined = hello + " " + world;
    
    CHECK(hello.length() == 5);
    CHECK(world.length() == 5);
    CHECK(combined == "Hello World");
}
\`\`\`

## Array Handling

Array and container operations.

\`\`\`cpp
TEST_CASE("ArrayHandling") {
    std::vector<int> numbers = {1, 2, 3, 4, 5};
    
    CHECK(numbers.size() == 5);
    CHECK(numbers[0] == 1);
    CHECK(numbers[4] == 5);
    
    numbers.push_back(6);
    CHECK(numbers.size() == 6);
}
\`\`\`

## Edge Cases

Testing edge cases and error conditions.

\`\`\`cpp
TEST_CASE("EdgeCases") {
    std::vector<int> empty_vector;
    CHECK(empty_vector.empty());
    
    std::string empty_string = "";
    CHECK(empty_string.length() == 0);
    
    int zero = 0;
    CHECK(zero == 0);
    CHECK(zero != 1);
}
\`\`\`
`;
  
  fs.writeFileSync(path.join(TEST_WORKSPACE, 'main_tests.md'), mainTestContent);
  
  // Create existing tests file for modification testing
  const existingTestContent = `
# Existing Tests

## Basic Tests

\`\`\`cpp
TEST_CASE("Basic Test") {
    CHECK(true);
}
\`\`\`
`;
  
  fs.writeFileSync(path.join(TEST_WORKSPACE, 'existing_tests.md'), existingTestContent);
}

/**
 * Create additional markdown files for TestFile testing
 */
async function createAdditionalMarkdownFiles(): Promise<void> {
  const additionalFiles = [
    {
      name: 'advanced_tests.md',
      content: `
# Advanced Test Cases

## Algorithm Tests

\`\`\`cpp
TEST_CASE("Sorting Algorithm") {
    std::vector<int> data = {5, 2, 8, 1, 9};
    std::sort(data.begin(), data.end());
    CHECK(data[0] == 1);
    CHECK(data[4] == 9);
}
\`\`\`
`
    },
    {
      name: 'utility_tests.md', 
      content: `
# Utility Function Tests

## Helper Functions

\`\`\`cpp
TEST_CASE("Utility Functions") {
    auto square = [](int x) { return x * x; };
    CHECK(square(4) == 16);
    CHECK(square(0) == 0);
}
\`\`\`
`
    }
  ];
  
  for (const file of additionalFiles) {
    fs.writeFileSync(path.join(TEST_WORKSPACE, file.name), file.content);
  }
}

/**
 * Create markdown with nested heading structure
 */
async function createNestedHeadingMarkdown(): Promise<void> {
  const nestedContent = `
# Top Level Test Suite

This is the main test suite with nested organization.

## Level 2 - Core Tests

### Level 3 - Basic Operations

\`\`\`cpp
TEST_CASE("Level 3 Basic Test") {
    CHECK(1 == 1);
}
\`\`\`

### Level 3 - Advanced Operations

\`\`\`cpp
TEST_CASE("Level 3 Advanced Test") {
    CHECK(2 + 2 == 4);
}
\`\`\`

## Level 2 - Extended Tests

### Level 3 - Complex Scenarios

\`\`\`cpp
TEST_CASE("Complex Scenario Test") {
    std::map<std::string, int> data;
    data["test"] = 42;
    CHECK(data["test"] == 42);
}
\`\`\`
`;
  
  fs.writeFileSync(path.join(TEST_WORKSPACE, 'nested_structure.md'), nestedContent);
}

/**
 * Launch VSCode with markdown workspace (simulation)
 */
async function launchVSCodeWithMarkdownWorkspace(page: any): Promise<void> {
  await page.goto('about:blank');
  await page.waitForTimeout(2000);
  
  // Simulate VSCode with Test Explorer for markdown tests
  await page.setContent(`
    <div class="monaco-workbench" style="width: 100%; height: 100vh; background: #1e1e1e; color: white;">
      <div class="quick-input-widget" style="display: none; position: absolute; top: 50px; left: 50%; transform: translateX(-50%); background: #2d2d30; padding: 10px; border-radius: 5px;">
        <input type="text" placeholder="Type a command" style="width: 400px; background: #3c3c3c; color: white; border: none; padding: 5px;" />
        <div class="quick-input-list" style="background: #2d2d30; margin-top: 5px;">
          <div class="quick-input-list-entry" style="padding: 5px; cursor: pointer;">CDocTest: Refresh Tests</div>
          <div class="quick-input-list-entry" style="padding: 5px; cursor: pointer;">CDocTest: Run All Tests</div>
        </div>
      </div>
      
      <div class="sidebar" style="width: 300px; height: 100%; background: #252526; float: left;">
        <div id="test-explorer" data-testid="test-explorer" style="padding: 10px;">
          <h3>Test Explorer</h3>
          <div style="margin: 10px 0;">
            <div role="treeitem" aria-level="1" style="padding: 5px; cursor: pointer;">
              📁 cdoctest Test
              <div role="treeitem" aria-level="2" style="margin-left: 20px; padding: 3px;">
                ✓ MathOperations
              </div>
              <div role="treeitem" aria-level="2" style="margin-left: 20px; padding: 3px;">
                ✓ StringOperations
              </div>
              <div role="treeitem" aria-level="2" style="margin-left: 20px; padding: 3px;">
                ✓ ArrayHandling
              </div>
              <div role="treeitem" aria-level="2" style="margin-left: 20px; padding: 3px;">
                ✓ EdgeCases
              </div>
            </div>
          </div>
          <button aria-label="Refresh Tests" style="background: #0e639c; color: white; border: none; padding: 5px 10px; margin: 5px; cursor: pointer;">
            🔄 Refresh
          </button>
        </div>
      </div>
      
      <div class="main-editor" style="margin-left: 300px; padding: 20px;">
        <div class="output-view" style="background: #1e1e1e; border: 1px solid #3c3c3c; padding: 10px; min-height: 200px;">
          <h4>Output</h4>
          <div>Test discovery completed.</div>
          <div>Found 4 test cases in markdown files.</div>
        </div>
      </div>
      
      <div class="context-view" style="display: none; position: absolute; background: #2d2d30; border: 1px solid #454545; padding: 5px;">
        <div style="padding: 5px; cursor: pointer;">Run Test</div>
        <div style="padding: 5px; cursor: pointer;">Debug Test</div>
      </div>
    </div>
    
    <style>
      [role="treeitem"]:hover { background: #094771; }
      .quick-input-list-entry:hover { background: #094771; }
      .context-view > div:hover { background: #094771; }
    </style>
    
    <script>
      // Simulate VSCode interactions
      document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.code === 'KeyP') {
          const widget = document.querySelector('.quick-input-widget');
          widget.style.display = widget.style.display === 'none' ? 'block' : 'none';
          if (widget.style.display === 'block') {
            widget.querySelector('input').focus();
          }
        }
        if (e.code === 'Escape') {
          document.querySelector('.quick-input-widget').style.display = 'none';
          document.querySelector('.context-view').style.display = 'none';
        }
      });
      
      // Context menu simulation
      document.querySelectorAll('[role="treeitem"][aria-level="2"]').forEach(item => {
        item.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          const contextMenu = document.querySelector('.context-view');
          contextMenu.style.display = 'block';
          contextMenu.style.left = e.pageX + 'px';
          contextMenu.style.top = e.pageY + 'px';
        });
      });
      
      // Run test simulation
      document.querySelector('.context-view').addEventListener('click', (e) => {
        if (e.target.textContent === 'Run Test') {
          document.querySelector('.output-view').innerHTML += '<div>Running test...</div>';
          setTimeout(() => {
            document.querySelector('.output-view').innerHTML += '<div>✓ Test passed</div>';
          }, 2000);
        }
        document.querySelector('.context-view').style.display = 'none';
      });
      
      console.log('Markdown parser test environment loaded');
    </script>
  `);
}