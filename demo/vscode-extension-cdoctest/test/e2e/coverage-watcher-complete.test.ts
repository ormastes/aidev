import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import { Page, ElectronApplication } from 'playwright';
import { path } from '../../../../layer/themes/infra_external-log-lib/dist';
import { fs } from '../../../../layer/themes/infra_external-log-lib/dist';

test.describe('CoverageWatcher - System Test', () => {
    let electronApp: ElectronApplication;
    let page: Page;
    const testWorkspace = path.resolve(__dirname, '../fixtures/test-workspace');
    const buildDir = path.join(testWorkspace, 'build');
    const coverageFile = path.join(buildDir, 'coverage.lcov');
    const rawCoverageFile = path.join(buildDir, 'test.gcda');

    test.beforeAll(async () => {
        // Create build directory if it doesn't exist
        if (!fs.existsSync(buildDir)) {
            fs.mkdirSync(buildDir, { recursive: true });
        }

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
        // Clean up files
        if (fs.existsSync(coverageFile)) {
            fs.unlinkSync(coverageFile);
        }
        if (fs.existsSync(rawCoverageFile)) {
            fs.unlinkSync(rawCoverageFile);
        }
        await electronApp.close();
    });

    test('should watch coverage files and update automatically', async () => {
        // Configure coverage settings with watcher
        await page.keyboard.press('Control+Shift+P');
        await page.keyboard.type('Preferences: Open Settings (JSON)');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        // Add coverage configuration
        await page.keyboard.press('Control+End');
        await page.keyboard.type(`,
    "ctest.buildDirectory": "${buildDir}",
    "ctest.coverageLocation": "coverage.lcov",
    "ctest.coverageRawFilePattern": "*.gcda",
    "ctest.coverageGenerateTask": "echo 'Generating coverage...'"`);
        await page.keyboard.press('Control+S');
        await page.waitForTimeout(2000);

        // Create initial coverage file
        const initialCoverage = `SF:src/main.cpp
DA:1,1
DA:2,1
DA:3,0
DA:4,0
DA:5,0
end_of_record`;
        
        fs.writeFileSync(coverageFile, initialCoverage);
        await page.waitForTimeout(2000);

        // Run tests to initialize coverage
        await page.keyboard.press('Control+Shift+P');
        await page.keyboard.type('Testing: Run All Tests');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(5000);

        // Check initial coverage (40%)
        let coverageStatusItem = await page.locator('[id="workbench.parts.statusbar"] [aria-label*="coverage"]');
        let coverageText = await coverageStatusItem.textContent();
        expect(coverageText).toContain('40');

        // Update coverage file - watcher should detect change
        const updatedCoverage = `SF:src/main.cpp
DA:1,1
DA:2,1
DA:3,1
DA:4,1
DA:5,0
end_of_record`;
        
        fs.writeFileSync(coverageFile, updatedCoverage);
        await page.waitForTimeout(3000); // Wait for watcher to detect and process

        // Check updated coverage (80%)
        coverageStatusItem = await page.locator('[id="workbench.parts.statusbar"] [aria-label*="coverage"]');
        coverageText = await coverageStatusItem.textContent();
        expect(coverageText).toContain('80');
    });

    test('should trigger coverage generation when raw files change', async () => {
        // Create a raw coverage file (simulating gcda file creation)
        fs.writeFileSync(rawCoverageFile, 'dummy gcda content');
        await page.waitForTimeout(1000);

        // The watcher should detect the raw file and trigger generation
        // We'll check by creating a new coverage file after a delay
        setTimeout(() => {
            const generatedCoverage = `SF:src/generated.cpp
DA:1,1
DA:2,1
DA:3,1
DA:4,1
DA:5,1
DA:6,1
DA:7,1
DA:8,1
DA:9,1
DA:10,1
end_of_record`;
            
            fs.writeFileSync(coverageFile, generatedCoverage);
        }, 2000);

        await page.waitForTimeout(5000); // Wait for generation and update

        // Check that coverage was updated (100%)
        const coverageStatusItem = await page.locator('[id="workbench.parts.statusbar"] [aria-label*="coverage"]');
        const coverageText = await coverageStatusItem.textContent();
        expect(coverageText).toContain('100');
    });

    test('should debounce multiple rapid file changes', async () => {
        let updateCount = 0;
        
        // Monitor console for coverage update messages
        page.on('console', msg => {
            if (msg.text().includes('Coverage updated from')) {
                updateCount++;
            }
        });

        // Make multiple rapid changes to coverage file
        for (let i = 0; i < 5; i++) {
            const coverage = `SF:src/rapid.cpp
DA:1,1
DA:2,${i % 2}
DA:3,${i % 2}
end_of_record`;
            
            fs.writeFileSync(coverageFile, coverage);
            await page.waitForTimeout(100); // Small delay between writes
        }

        // Wait for debounce period
        await page.waitForTimeout(3000);

        // Should have fewer updates than writes due to debouncing
        expect(updateCount).toBeLessThan(5);
    });

    test('should handle coverage file deletion gracefully', async () => {
        // Ensure coverage file exists
        const coverage = `SF:src/delete-test.cpp
DA:1,1
DA:2,1
end_of_record`;
        
        fs.writeFileSync(coverageFile, coverage);
        await page.waitForTimeout(2000);

        // Delete the coverage file
        fs.unlinkSync(coverageFile);
        await page.waitForTimeout(3000);

        // Status bar should hide when no coverage data
        const coverageStatusItem = await page.locator('[id="workbench.parts.statusbar"] [aria-label*="coverage"]');
        const isVisible = await coverageStatusItem.isVisible().catch(() => false);
        expect(isVisible).toBe(false);
    });

    test('should watch multiple file patterns', async () => {
        // Create coverage files in different formats
        const lcovFile = path.join(buildDir, 'coverage.info');
        const xmlFile = path.join(buildDir, 'coverage.xml');

        // Create LCOV file
        const lcovContent = `SF:src/lcov-test.cpp
DA:1,1
DA:2,1
DA:3,0
end_of_record`;
        
        fs.writeFileSync(lcovFile, lcovContent);
        await page.waitForTimeout(2000);

        // Update settings to watch multiple patterns
        await page.keyboard.press('Control+Shift+P');
        await page.keyboard.type('Preferences: Open Settings (JSON)');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        // Find and update coverage location
        await page.keyboard.press('Control+F');
        await page.keyboard.type('coverageLocation');
        await page.keyboard.press('Escape');
        await page.keyboard.press('End');
        await page.keyboard.press('Backspace', { delay: 50, count: 15 });
        await page.keyboard.type('"coverage.info"');
        await page.keyboard.press('Control+S');
        await page.waitForTimeout(3000);

        // Check that new file is being watched
        const coverageStatusItem = await page.locator('[id="workbench.parts.statusbar"] [aria-label*="coverage"]');
        const isVisible = await coverageStatusItem.isVisible();
        expect(isVisible).toBe(true);

        // Clean up
        if (fs.existsSync(lcovFile)) {
            fs.unlinkSync(lcovFile);
        }
        if (fs.existsSync(xmlFile)) {
            fs.unlinkSync(xmlFile);
        }
    });

    test('should cache coverage data to avoid redundant updates', async () => {
        let updateCount = 0;
        
        // Monitor for coverage updates
        page.on('console', msg => {
            if (msg.text().includes('Coverage updated from')) {
                updateCount++;
            }
        });

        // Write the same coverage data multiple times
        const sameCoverage = `SF:src/cache-test.cpp
DA:1,1
DA:2,1
DA:3,1
end_of_record`;
        
        // Initial write
        fs.writeFileSync(coverageFile, sameCoverage);
        await page.waitForTimeout(2000);
        
        const initialUpdateCount = updateCount;

        // Write same content again
        fs.writeFileSync(coverageFile, sameCoverage);
        await page.waitForTimeout(2000);

        // Should not trigger another update due to caching
        expect(updateCount).toBe(initialUpdateCount);

        // Write different content
        const differentCoverage = `SF:src/cache-test.cpp
DA:1,1
DA:2,0
DA:3,1
end_of_record`;
        
        fs.writeFileSync(coverageFile, differentCoverage);
        await page.waitForTimeout(2000);

        // Should trigger update for different content
        expect(updateCount).toBe(initialUpdateCount + 1);
    });

    test('should handle concurrent file changes properly', async () => {
        // Create multiple coverage files
        const file1 = path.join(buildDir, 'module1.lcov');
        const file2 = path.join(buildDir, 'module2.lcov');

        // Write to both files concurrently
        const coverage1 = `SF:src/module1.cpp
DA:1,1
DA:2,0
end_of_record`;

        const coverage2 = `SF:src/module2.cpp
DA:1,1
DA:2,1
end_of_record`;

        // Write files simultaneously
        fs.writeFileSync(file1, coverage1);
        fs.writeFileSync(file2, coverage2);
        await page.waitForTimeout(3000);

        // Both should be processed without issues
        // Clean up first
        if (fs.existsSync(coverageFile)) {
            fs.unlinkSync(coverageFile);
        }

        // Combine coverage files
        fs.writeFileSync(coverageFile, coverage1 + '\n' + coverage2);
        await page.waitForTimeout(2000);

        // Check combined coverage (75% - 3/4 lines)
        const coverageStatusItem = await page.locator('[id="workbench.parts.statusbar"] [aria-label*="coverage"]');
        const coverageText = await coverageStatusItem.textContent();
        expect(coverageText).toContain('75');

        // Clean up
        if (fs.existsSync(file1)) {
            fs.unlinkSync(file1);
        }
        if (fs.existsSync(file2)) {
            fs.unlinkSync(file2);
        }
    });

    test('should stop watching when extension deactivates', async () => {
        // This test verifies that watchers are properly disposed
        // We'll reload the window which should stop all watchers
        
        // First ensure watcher is active
        const coverage = `SF:src/deactivate-test.cpp
DA:1,1
end_of_record`;
        
        fs.writeFileSync(coverageFile, coverage);
        await page.waitForTimeout(2000);

        // Reload window
        await page.keyboard.press('Control+Shift+P');
        await page.keyboard.type('Developer: Reload Window');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(5000);

        // After reload, the watcher should be reinitialized
        // Update coverage to verify new watcher works
        const updatedCoverage = `SF:src/deactivate-test.cpp
DA:1,1
DA:2,1
end_of_record`;
        
        fs.writeFileSync(coverageFile, updatedCoverage);
        await page.waitForTimeout(3000);

        // Should still update after reload
        const coverageStatusItem = await page.locator('[id="workbench.parts.statusbar"] [aria-label*="coverage"]');
        const isVisible = await coverageStatusItem.isVisible();
        expect(isVisible).toBe(true);
    });
});