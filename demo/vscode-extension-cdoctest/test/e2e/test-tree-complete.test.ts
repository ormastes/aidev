import { test, expect } from '@playwright/test';
import { _electron as electron } from "playwright";
import { Page, ElectronApplication } from "playwright";
import { path } from '../../layer/themes/infra_external-log-lib/src';

test.describe('Test Tree Classes (TestFile, TestHeading, TestCase) - System Test', () => {
    let electronApp: ElectronApplication;
    let page: Page;

    test.beforeAll(async () => {
        electronApp = await electron.launch({
            args: [
                '--extensionDevelopmentPath=' + path.resolve(__dirname, '../../'),
                path.resolve(__dirname, '../fixtures/test-workspace')
            ],
            env: {
                ...process.env,
                NODE_ENV: 'test'
            }
        });
        page = await electronApp.firstWindow();
        await page.waitForTimeout(5000); // Wait for extension to activate
    });

    test.afterAll(async () => {
        await electronApp.close();
    });

    test('should parse test files and create test tree structure', async () => {
        // Open the test explorer
        await page.keyboard.press('Control+Shift+P');
        await page.keyboard.type('Testing: Focus on Test Explorer View');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // Verify test tree structure is created
        const testExplorer = await page.locator('[aria-label="Test Explorer"]');
        await expect(testExplorer).toBeVisible();

        // Look for test files in the tree
        const testFiles = await page.locator('.test-item[aria-label*=".md"]');
        const testFileCount = await testFiles.count();
        expect(testFileCount).toBeGreaterThan(0);

        // Verify TestFile class functionality - click on a test file
        const firstTestFile = testFiles.first();
        await firstTestFile.click();
        await page.waitForTimeout(1000);

        // Verify test headings are shown (TestHeading class)
        const testHeadings = await page.locator('.test-item[aria-level="2"]');
        const headingCount = await testHeadings.count();
        expect(headingCount).toBeGreaterThan(0);

        // Expand a heading to see test cases
        const firstHeading = testHeadings.first();
        await firstHeading.click();
        await page.waitForTimeout(500);

        // Verify test cases are shown (TestCase class)
        const testCases = await page.locator('.test-item[aria-level="3"]');
        const testCaseCount = await testCases.count();
        expect(testCaseCount).toBeGreaterThan(0);
    });

    test('should update test tree when file content changes', async () => {
        // Create a test file with initial content
        await page.keyboard.press('Control+Shift+P');
        await page.keyboard.type('File: New File');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        // Write test content
        await page.keyboard.type(`# Test Heading 1
## Test Case 1.1
\`\`\`math
2 + 2 = 4
\`\`\`

## Test Case 1.2
\`\`\`math
3 * 3 = 9
\`\`\`
`);

        // Save the file
        await page.keyboard.press('Control+S');
        await page.waitForTimeout(500);
        await page.keyboard.type('test-tree-demo.md');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // Open test explorer and verify the new file appears
        await page.keyboard.press('Control+Shift+P');
        await page.keyboard.type('Testing: Focus on Test Explorer View');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // Look for the new test file
        const newTestFile = await page.locator('.test-item[aria-label*="test-tree-demo.md"]');
        await expect(newTestFile).toBeVisible();

        // Click to expand it
        await newTestFile.click();
        await page.waitForTimeout(1000);

        // Verify headings and test cases
        const headings = await page.locator('.test-item:has-text("Test Heading 1")');
        await expect(headings.first()).toBeVisible();

        // Now modify the file and verify tree updates
        await page.keyboard.press('Control+Shift+P');
        await page.keyboard.type('File: Open File');
        await page.keyboard.press('Enter');
        await page.keyboard.type('test-tree-demo.md');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        // Add a new test case
        await page.keyboard.press('Control+End'); // Go to end of file
        await page.keyboard.type(`
## Test Case 1.3
\`\`\`math
5 - 2 = 3
\`\`\`
`);
        await page.keyboard.press('Control+S');
        await page.waitForTimeout(2000);

        // Verify the tree updated with new test case
        const newTestCase = await page.locator('.test-item:has-text("Test Case 1.3")');
        await expect(newTestCase).toBeVisible();
    });

    test('should execute test cases and show results', async () => {
        // Run a specific test case
        const testCase = await page.locator('.test-item:has-text("Test Case 1.1")').first();
        await testCase.hover();
        
        // Click the run button for this test
        const runButton = await page.locator('.test-item:has-text("Test Case 1.1") button[aria-label*="Run"]').first();
        await runButton.click();
        await page.waitForTimeout(3000);

        // Verify test execution and result
        const passedIcon = await page.locator('.test-item:has-text("Test Case 1.1") .codicon-testing-passed-icon');
        await expect(passedIcon).toBeVisible();

        // Run all tests in a heading
        const heading = await page.locator('.test-item:has-text("Test Heading 1")').first();
        await heading.hover();
        const runAllButton = await page.locator('.test-item:has-text("Test Heading 1") button[aria-label*="Run"]').first();
        await runAllButton.click();
        await page.waitForTimeout(3000);

        // Verify all tests under the heading ran
        const allPassed = await page.locator('.test-item[aria-level="3"] .codicon-testing-passed-icon');
        const passedCount = await allPassed.count();
        expect(passedCount).toBeGreaterThanOrEqual(2);
    });

    test('should handle test file deletion and removal from tree', async () => {
        // Delete the test file
        await page.keyboard.press('Control+Shift+P');
        await page.keyboard.type('File: Delete Active File');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter'); // Confirm deletion
        await page.waitForTimeout(2000);

        // Verify the test file is removed from the tree
        const deletedFile = await page.locator('.test-item[aria-label*="test-tree-demo.md"]');
        await expect(deletedFile).not.toBeVisible();
    });

    test('should parse nested test headings correctly', async () => {
        // Create a file with nested headings
        await page.keyboard.press('Control+Shift+P');
        await page.keyboard.type('File: New File');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        await page.keyboard.type(`# Main Section
## Subsection 1
### Test Case 1.1.1
\`\`\`math
1 + 1 = 2
\`\`\`

### Test Case 1.1.2
\`\`\`math
2 + 2 = 4
\`\`\`

## Subsection 2
### Test Case 1.2.1
\`\`\`math
3 + 3 = 6
\`\`\`
`);

        await page.keyboard.press('Control+S');
        await page.waitForTimeout(500);
        await page.keyboard.type('nested-test.md');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // Verify nested structure in test explorer
        const mainSection = await page.locator('.test-item:has-text("Main Section")');
        await expect(mainSection).toBeVisible();
        
        await mainSection.click();
        await page.waitForTimeout(1000);

        const subsection1 = await page.locator('.test-item:has-text("Subsection 1")');
        const subsection2 = await page.locator('.test-item:has-text("Subsection 2")');
        await expect(subsection1).toBeVisible();
        await expect(subsection2).toBeVisible();

        // Expand subsection to see nested test cases
        await subsection1.click();
        await page.waitForTimeout(500);

        const nestedTestCases = await page.locator('.test-item[aria-level="4"]');
        const nestedCount = await nestedTestCases.count();
        expect(nestedCount).toBeGreaterThanOrEqual(2);
    });

    test('should handle invalid test cases gracefully', async () => {
        // Create a file with invalid test cases
        await page.keyboard.press('Control+Shift+P');
        await page.keyboard.type('File: New File');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        await page.keyboard.type(`# Invalid Tests
## Invalid Math Test
\`\`\`math
2 + 2 = 5
\`\`\`

## Malformed Test
\`\`\`math
invalid expression
\`\`\`
`);

        await page.keyboard.press('Control+S');
        await page.waitForTimeout(500);
        await page.keyboard.type('invalid-tests.md');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);

        // Run the invalid tests
        const invalidTestFile = await page.locator('.test-item[aria-label*="invalid-tests.md"]');
        await invalidTestFile.hover();
        const runButton = await page.locator('.test-item[aria-label*="invalid-tests.md"] button[aria-label*="Run"]').first();
        await runButton.click();
        await page.waitForTimeout(3000);

        // Verify failed test indicators
        const failedIcons = await page.locator('.test-item .codicon-testing-failed-icon');
        const failedCount = await failedIcons.count();
        expect(failedCount).toBeGreaterThan(0);

        // Clean up
        await page.keyboard.press('Control+Shift+P');
        await page.keyboard.type('File: Delete Active File');
        await page.keyboard.press('Enter');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);
    });
});