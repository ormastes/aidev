import { test, expect } from '@playwright/test';
import { _electron as electron } from "playwright";
import { Page, ElectronApplication } from "playwright";
import { path } from '../../layer/themes/infra_external-log-lib/src';
import { fs } from '../../layer/themes/infra_external-log-lib/src';

test.describe('CoverageStatusBarItem - System Test', () => {
    let electronApp: ElectronApplication;
    let page: Page;
    const testWorkspace = path.resolve(__dirname, '../fixtures/test-workspace');
    const coverageFile = path.join(testWorkspace, 'coverage.lcov');

    test.beforeAll(async () => {
        // Create a test coverage file
        const lcovContent = `SF:src/main.cpp
DA:1,1
DA:2,1
DA:3,1
DA:4,0
DA:5,0
DA:6,1
DA:7,1
DA:8,1
DA:9,0
DA:10,1
FN:1,main
FNDA:1,main
FN:5,unusedFunction
FNDA:0,unusedFunction
BRDA:3,0,0,1
BRDA:3,0,1,0
end_of_record`;
        
        fs.writeFileSync(coverageFile, lcovContent);

        electronApp = await electron.launch({
            args: [
                '--extensionDevelopmentPath=' + path.resolve(__dirname, '../../'),
                testWorkspace
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
        // Clean up coverage file
        if (fs.existsSync(coverageFile)) {
            fs.unlinkSync(coverageFile);
        }
        await electronApp.close();
    });

    test('should display coverage in status bar after test run', async () => {
        // Configure coverage settings
        await page.keyboard.press('Control+Shift+P');
        await page.keyboard.type('Preferences: Open Settings (JSON)');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        // Add coverage configuration
        await page.keyboard.press('Control+End');
        await page.keyboard.type(`,
    "ctest.coverageLocation": "coverage.lcov",
    "ctest.coverageRawFilePattern": "*.gcda",
    "ctest.coverageWarnIfBelowThreshold": true,
    "ctest.coverageThresholdLine": 80`);
        await page.keyboard.press('Control+S');
        await page.waitForTimeout(2000);

        // Run tests to trigger coverage processing
        await page.keyboard.press('Control+Shift+P');
        await page.keyboard.type('Testing: Run All Tests');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(5000);

        // Check for status bar item
        const statusBar = await page.locator('[id="workbench.parts.statusbar"]');
        await expect(statusBar).toBeVisible();

        // Look for coverage percentage in status bar
        const coverageStatusItem = await page.locator('[id="workbench.parts.statusbar"] [aria-label*="coverage"]');
        await expect(coverageStatusItem).toBeVisible();

        // Verify coverage percentage is displayed (70% based on our test data)
        const coverageText = await coverageStatusItem.textContent();
        expect(coverageText).toContain('70');
        expect(coverageText).toContain('%');
    });

    test('should show detailed coverage tooltip on hover', async () => {
        // Hover over the coverage status bar item
        const coverageStatusItem = await page.locator('[id="workbench.parts.statusbar"] [aria-label*="coverage"]');
        await coverageStatusItem.hover();
        await page.waitForTimeout(1000);

        // Check for tooltip
        const tooltip = await page.locator('.monaco-hover-content');
        await expect(tooltip).toBeVisible();

        // Verify tooltip contains detailed information
        const tooltipText = await tooltip.textContent();
        expect(tooltipText).toContain('Code Coverage');
        expect(tooltipText).toContain('Lines:');
        expect(tooltipText).toContain('7/10'); // Based on our test data
        expect(tooltipText).toContain('70.0%');
        expect(tooltipText).toContain('Functions:');
        expect(tooltipText).toContain('1/2'); // Based on our test data
        expect(tooltipText).toContain('50.0%');
    });

    test('should update status bar color based on coverage thresholds', async () => {
        // The coverage should be 70%, which is below the 80% threshold
        // This should show warning color
        const coverageStatusItem = await page.locator('[id="workbench.parts.statusbar"] [aria-label*="coverage"]');
        
        // Check for warning background color
        const backgroundColor = await coverageStatusItem.evaluate(el => 
            window.getComputedStyle(el).backgroundColor
        );
        
        // Warning color should be applied (yellow/orange-ish)
        expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)'); // Not transparent
    });

    test('should show coverage command on click', async () => {
        // Click on the coverage status bar item
        const coverageStatusItem = await page.locator('[id="workbench.parts.statusbar"] [aria-label*="coverage"]');
        await coverageStatusItem.click();
        await page.waitForTimeout(2000);

        // Should open coverage view or execute coverage command
        // Check if coverage panel is visible
        const coveragePanel = await page.locator('[aria-label*="Coverage"]');
        const isPanelVisible = await coveragePanel.isVisible().catch(() => false);
        
        // Either panel is visible or command palette opened
        if (!isPanelVisible) {
            const commandPalette = await page.locator('.quick-input-widget');
            await expect(commandPalette).toBeVisible();
        }
    });

    test('should hide status bar when no coverage data', async () => {
        // Delete the coverage file
        if (fs.existsSync(coverageFile)) {
            fs.unlinkSync(coverageFile);
        }
        await page.waitForTimeout(2000);

        // Reload window to reset coverage
        await page.keyboard.press('Control+Shift+P');
        await page.keyboard.type('Developer: Reload Window');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(5000);

        // Status bar item should not be visible
        const coverageStatusItem = await page.locator('[id="workbench.parts.statusbar"] [aria-label*="coverage"]');
        await expect(coverageStatusItem).not.toBeVisible();
    });

    test('should update in real-time when coverage changes', async () => {
        // Create initial coverage file with low coverage
        const lowCoverageContent = `SF:src/main.cpp
DA:1,1
DA:2,0
DA:3,0
DA:4,0
DA:5,0
end_of_record`;
        
        fs.writeFileSync(coverageFile, lowCoverageContent);
        await page.waitForTimeout(2000);

        // Run tests to process coverage
        await page.keyboard.press('Control+Shift+P');
        await page.keyboard.type('Testing: Run All Tests');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(5000);

        // Check initial coverage (20%)
        let coverageStatusItem = await page.locator('[id="workbench.parts.statusbar"] [aria-label*="coverage"]');
        let coverageText = await coverageStatusItem.textContent();
        expect(coverageText).toContain('20');

        // Update coverage file with higher coverage
        const highCoverageContent = `SF:src/main.cpp
DA:1,1
DA:2,1
DA:3,1
DA:4,1
DA:5,0
end_of_record`;
        
        fs.writeFileSync(coverageFile, highCoverageContent);
        await page.waitForTimeout(3000); // Wait for file watcher to pick up change

        // Check updated coverage (80%)
        coverageStatusItem = await page.locator('[id="workbench.parts.statusbar"] [aria-label*="coverage"]');
        coverageText = await coverageStatusItem.textContent();
        expect(coverageText).toContain('80');
    });

    test('should display coverage for multiple files aggregated', async () => {
        // Create coverage file with multiple source files
        const multiFileContent = `SF:src/main.cpp
DA:1,1
DA:2,1
DA:3,0
DA:4,0
DA:5,1
end_of_record
SF:src/utils.cpp
DA:1,1
DA:2,1
DA:3,1
DA:4,1
DA:5,1
end_of_record
SF:src/test.cpp
DA:1,0
DA:2,0
DA:3,0
DA:4,0
DA:5,0
end_of_record`;
        
        fs.writeFileSync(coverageFile, multiFileContent);
        await page.waitForTimeout(2000);

        // Run tests to process coverage
        await page.keyboard.press('Control+Shift+P');
        await page.keyboard.type('Testing: Run All Tests');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(5000);

        // Check aggregated coverage (8/15 = 53.3%)
        const coverageStatusItem = await page.locator('[id="workbench.parts.statusbar"] [aria-label*="coverage"]');
        const coverageText = await coverageStatusItem.textContent();
        expect(coverageText).toContain('53');

        // Hover to see detailed breakdown
        await coverageStatusItem.hover();
        await page.waitForTimeout(1000);

        const tooltip = await page.locator('.monaco-hover-content');
        const tooltipText = await tooltip.textContent();
        expect(tooltipText).toContain('8/15'); // Total lines covered
    });

    test('should show error color for very low coverage', async () => {
        // Create coverage file with very low coverage (10%)
        const lowCoverageContent = `SF:src/main.cpp
DA:1,1
DA:2,0
DA:3,0
DA:4,0
DA:5,0
DA:6,0
DA:7,0
DA:8,0
DA:9,0
DA:10,0
end_of_record`;
        
        fs.writeFileSync(coverageFile, lowCoverageContent);
        await page.waitForTimeout(2000);

        // Run tests to process coverage
        await page.keyboard.press('Control+Shift+P');
        await page.keyboard.type('Testing: Run All Tests');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(5000);

        // Check for error color (red background)
        const coverageStatusItem = await page.locator('[id="workbench.parts.statusbar"] [aria-label*="coverage"]');
        const backgroundColor = await coverageStatusItem.evaluate(el => 
            window.getComputedStyle(el).backgroundColor
        );
        
        // Should have error background color
        expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)'); // Not transparent
        
        // Verify low percentage
        const coverageText = await coverageStatusItem.textContent();
        expect(coverageText).toContain('10');
    });
});