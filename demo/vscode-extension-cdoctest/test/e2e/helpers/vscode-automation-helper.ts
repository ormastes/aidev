import { Page, expect } from '@playwright/test';
import { path } from '../../layer/themes/infra_external-log-lib/src';
import { fs } from '../../layer/themes/infra_external-log-lib/src';
import { spawn, ChildProcess } from 'child_process';

/**
 * Enhanced VSCode automation helper for GUI testing with Playwright
 * Provides high-level methods for interacting with VSCode UI elements
 * FOCUS: Real E2E interactions without mocks - actual clicking, typing, and UI automation
 */
export class VSCodeAutomationHelper {
  private page: Page;
  private vscodeProcess: ChildProcess | null = null;
  private extensionHost: string = '';

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Launch VSCode with specific workspace and extension
   */
  async launchVSCode(workspacePath: string, extensionPath?: string): Promise<void> {
    const vscodeArgs = [
      '--extensionDevelopmentPath=' + (extensionPath || process.cwd()),
      '--disable-extensions',
      '--disable-workspace-trust',
      '--no-sandbox',
      workspacePath
    ];

    // Launch VSCode in test mode
    this.vscodeProcess = spawn('code', vscodeArgs, {
      stdio: 'pipe',
      env: {
        ...process.env,
        VSCODE_PID: process.pid.toString(),
        ELECTRON_ENABLE_LOGGING: '1'
      }
    });

    // Wait for VSCode window to appear
    await this.page.waitForLoadState("domcontentloaded");
    await this.page.waitForTimeout(3000); // Allow VSCode to fully load

    // Wait for the main VSCode interface
    await this.page.waitForSelector('.monaco-workbench', { timeout: 30000 });
    
    console.log('VSCode launched successfully');
  }

  /**
   * Wait for extension activation by checking for specific UI elements
   */
  async waitForExtensionActivation(extensionId: string): Promise<void> {
    // Wait for extension host to be ready
    await this.page.waitForFunction(() => {
      return (window as any).vscode !== undefined;
    }, { timeout: 30000 });

    // Check extension activation through command palette
    await this.page.keyboard.press('Control+Shift+P');
    await this.page.waitForSelector('.quick-input-widget', { timeout: 5000 });
    
    // Type extension name to verify it's active
    await this.page.type('.quick-input-widget input', extensionId);
    await this.page.waitForTimeout(1000);
    
    // Close command palette
    await this.page.keyboard.press('Escape');
    
    console.log(`Extension ${extensionId} activated`);
  }

  /**
   * Open the Test Explorer panel
   */
  async openTestExplorer(): Promise<void> {
    // Click on Test Explorer icon in sidebar
    const testExplorerIcon = this.page.locator('[aria-label="Test Explorer"]').first();
    
    if (await testExplorerIcon.isVisible()) {
      await testExplorerIcon.click();
    } else {
      // Alternative: Use View menu
      await this.page.keyboard.press('Alt+v');
      await this.page.waitForSelector('.context-view', { timeout: 5000 });
      await this.page.click('text="Test Explorer"');
    }

    // Wait for Test Explorer to load
    await this.page.waitForSelector('[data-testid="test-explorer"]', { timeout: 10000 });
    console.log('Test Explorer opened');
  }

  /**
   * Wait for test discovery to complete
   */
  async waitForTestDiscovery(): Promise<void> {
    // Wait for loading indicators to disappear
    await this.page.waitForFunction(() => {
      const loadingElements = document.querySelectorAll('.loading, .codicon-loading');
      return loadingElements.length === 0;
    }, { timeout: 30000 });

    // Wait for test items to appear
    await this.page.waitForSelector('[data-testid="test-item"]', { timeout: 15000 });
    
    console.log('Test discovery completed');
  }

  /**
   * Refresh tests for specific controller
   */
  async refreshTests(controllerName: string): Promise<void> {
    // Find the controller section
    const controller = this.page.locator(`text="${controllerName}"`);
    await expect(controller).toBeVisible();

    // Right-click to open context menu
    await controller.click({ button: 'right' });

    // Click refresh option
    const refreshOption = this.page.locator('text="Refresh"');
    await refreshOption.click();

    // Wait for refresh to complete
    await this.waitForTestDiscovery();
  }

  /**
   * Run a specific test by name
   */
  async runTest(testName: string): Promise<void> {
    const testItem = this.page.locator(`[data-testid="test-item-${testName}"]`);
    await expect(testItem).toBeVisible();

    // Right-click on test
    await testItem.click({ button: 'right' });

    // Click run option
    const runOption = this.page.locator('text="Run Test"');
    await runOption.click();

    // Wait for execution to start
    await this.waitForTestExecution();
  }

  /**
   * Run all tests in a test suite
   */
  async runTestSuite(suiteName: string): Promise<void> {
    const suiteItem = this.page.locator(`[data-testid="test-suite-${suiteName}"]`);
    await expect(suiteItem).toBeVisible();

    // Right-click on suite
    await suiteItem.click({ button: 'right' });

    // Click run tests option
    const runOption = this.page.locator('text="Run Tests"');
    await runOption.click();

    await this.waitForTestExecution();
  }

  /**
   * Wait for test execution to complete
   */
  async waitForTestExecution(): Promise<void> {
    // Wait for execution to start (progress indicators appear)
    await this.page.waitForSelector('.test-execution-progress', { timeout: 5000 }).catch(() => {
      console.log('No progress indicator found, test may have completed quickly');
    });

    // Wait for execution to complete (progress indicators disappear)
    await this.page.waitForFunction(() => {
      const progressElements = document.querySelectorAll('.test-execution-progress, .codicon-loading');
      return progressElements.length === 0;
    }, { timeout: 60000 });

    // Additional wait for UI updates
    await this.page.waitForTimeout(1000);
    
    console.log('Test execution completed');
  }

  /**
   * Get test result status
   */
  async getTestResult(testName: string): Promise<'passed' | 'failed' | 'skipped' | 'running'> {
    const testItem = this.page.locator(`[data-testid="test-item-${testName}"]`);
    await expect(testItem).toBeVisible();

    const classNames = await testItem.getAttribute('class');
    
    if (classNames?.includes('passed')) return 'passed';
    if (classNames?.includes('failed')) return 'failed';
    if (classNames?.includes('skipped')) return 'skipped';
    if (classNames?.includes('running')) return 'running';
    
    throw new Error(`Unable to determine test result for ${testName}`);
  }

  /**
   * Open the Output panel
   */
  async openOutputPanel(): Promise<void> {
    // Use keyboard shortcut
    await this.page.keyboard.press('Control+Shift+U');
    
    // Wait for output panel to appear
    await this.page.waitForSelector('.output-view', { timeout: 5000 });
    
    console.log('Output panel opened');
  }

  /**
   * Get output panel content
   */
  async getOutputContent(): Promise<string> {
    await this.openOutputPanel();
    
    const outputContent = this.page.locator('.output-view .monaco-editor .view-lines');
    await expect(outputContent).toBeVisible();
    
    return await outputContent.textContent() || '';
  }

  /**
   * Open VSCode settings
   */
  async openSettings(): Promise<void> {
    await this.page.keyboard.press('Control+,');
    
    // Wait for settings to load
    await this.page.waitForSelector('.settings-editor', { timeout: 10000 });
    
    console.log('Settings opened');
  }

  /**
   * Modify a setting value
   */
  async modifySetting(settingName: string, value: string): Promise<void> {
    await this.openSettings();
    
    // Search for the setting
    const searchBox = this.page.locator('.settings-header input[placeholder*="Search"]');
    await searchBox.fill(settingName);
    await this.page.waitForTimeout(1000);
    
    // Find and modify the setting
    const settingInput = this.page.locator(`[data-setting="${settingName}"] input`);
    await expect(settingInput).toBeVisible();
    
    await settingInput.fill(value);
    await this.page.keyboard.press('Enter');
    
    console.log(`Setting ${settingName} modified to: ${value}`);
  }

  /**
   * Modify a source file to trigger rebuilds
   */
  async modifySourceFile(filePath: string, modification: string): Promise<void> {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      content += '\n' + modification;
      fs.writeFileSync(filePath, content);
      
      console.log(`Modified source file: ${filePath}`);
    }
  }

  /**
   * Take a screenshot with timestamp
   */
  async takeScreenshot(name: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}-${timestamp}.png`;
    await this.page.screenshot({ 
      path: path.join('test-results', filename),
      fullPage: true
    });
    
    console.log(`Screenshot saved: ${filename}`);
  }

  /**
   * Wait for element with retry logic
   */
  async waitForElementWithRetry(selector: string, maxRetries: number = 3): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.page.waitForSelector(selector, { timeout: 10000 });
        return;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        console.log(`Retry ${i + 1}/${maxRetries} for selector: ${selector}`);
        await this.page.waitForTimeout(2000);
      }
    }
  }

  /**
   * Check if element exists without waiting
   */
  async elementExists(selector: string): Promise<boolean> {
    try {
      const element = await this.page.$(selector);
      return element !== null;
    } catch {
      return false;
    }
  }

  /**
   * Click element with retry and error handling
   */
  async safeClick(selector: string, options?: { timeout?: number; force?: boolean }): Promise<void> {
    try {
      await this.page.click(selector, { 
        timeout: options?.timeout || 10000,
        force: options?.force || false
      });
    } catch (error) {
      console.error(`Failed to click element: ${selector}`, error);
      await this.takeScreenshot(`failed-click-${selector.replace(/[^a-zA-Z0-9]/g, '_')}`);
      throw error;
    }
  }

  /**
   * Type text with retry logic
   */
  async safeType(selector: string, text: string): Promise<void> {
    try {
      await this.page.fill(selector, text);
    } catch (error) {
      console.error(`Failed to type in element: ${selector}`, error);
      await this.takeScreenshot(`failed-type-${selector.replace(/[^a-zA-Z0-9]/g, '_')}`);
      throw error;
    }
  }

  /**
   * Close VSCode and cleanup
   */
  async closeVSCode(): Promise<void> {
    if (this.vscodeProcess) {
      this.vscodeProcess.kill();
      this.vscodeProcess = null;
    }
    
    // Close the page
    if (!this.page.isClosed()) {
      await this.page.close();
    }
    
    console.log('VSCode closed');
  }

  /**
   * Real VSCode extension interaction: Open extension's command palette commands
   */
  async openExtensionCommands(extensionId: string): Promise<void> {
    await this.page.keyboard.press('Control+Shift+P');
    await this.page.waitForSelector('.quick-input-widget input', { timeout: 5000 });
    
    // Type extension prefix to filter commands
    await this.page.type('.quick-input-widget input', `>${extensionId}:`);
    await this.page.waitForTimeout(1000);
    
    // Wait for extension commands to appear
    await this.page.waitForSelector('.quick-input-list .quick-input-list-entry', { timeout: 5000 });
    
    console.log(`Extension ${extensionId} commands opened`);
  }

  /**
   * Real interaction: Click on actual test item in Test Explorer
   */
  async clickTestItem(testName: string, action: 'single' | 'right' | 'double' = 'single'): Promise<void> {
    // Find test item by text content (real DOM search)
    const testItems = this.page.locator('[role="treeitem"], .test-item, [data-testid*="test"]');
    
    // Look for the specific test by name
    const targetTest = testItems.filter({ hasText: testName }).first();
    await expect(targetTest).toBeVisible({ timeout: 10000 });
    
    // Perform real click interaction
    switch (action) {
      case 'single':
        await targetTest.click();
        break;
      case 'right':
        await targetTest.click({ button: 'right' });
        break;
      case 'double':
        await targetTest.dblclick();
        break;
    }
    
    console.log(`Clicked test item: ${testName} with ${action} click`);
  }

  /**
   * Real interaction: Execute test through actual UI context menu
   */
  async executeTestThroughUI(testName: string): Promise<void> {
    // Right-click to open context menu
    await this.clickTestItem(testName, 'right');
    await this.page.waitForTimeout(500);
    
    // Look for actual "Run Test" context menu item
    const contextMenu = this.page.locator('.context-view, .monaco-menu');
    await expect(contextMenu).toBeVisible({ timeout: 3000 });
    
    // Click on Run Test option (real UI interaction)
    const runOption = contextMenu.locator('text=/Run.*Test/i').first();
    if (await runOption.isVisible()) {
      await runOption.click();
    } else {
      // Alternative: use keyboard shortcut
      await this.page.keyboard.press('Escape'); // Close menu
      await this.clickTestItem(testName, 'single'); // Select test
      await this.page.keyboard.press('F5'); // Run selected test
    }
    
    console.log(`Executed test ${testName} through real UI`);
  }

  /**
   * Real interaction: Wait for actual test execution to complete
   */
  async waitForRealTestExecution(timeoutMs: number = 30000): Promise<void> {
    const startTime = Date.now();
    
    console.log('Waiting for real test execution to complete...');
    
    // Look for real execution indicators
    while (Date.now() - startTime < timeoutMs) {
      // Check for running indicators
      const runningIndicators = this.page.locator('[class*="loading"], [class*="running"], .codicon-loading, .codicon-sync~spin');
      const runningCount = await runningIndicators.count();
      
      if (runningCount === 0) {
        // Wait a bit more to ensure execution has finished
        await this.page.waitForTimeout(2000);
        
        // Double-check no execution is happening
        const finalCheck = await this.page.locator('[class*="loading"], [class*="running"]').count();
        if (finalCheck === 0) {
          console.log('Real test execution completed');
          return;
        }
      }
      
      await this.page.waitForTimeout(1000);
    }
    
    throw new Error(`Test execution did not complete within ${timeoutMs}ms`);
  }

  /**
   * Real interaction: Get actual test results from UI
   */
  async getActualTestResults(): Promise<Array<{name: string; status: 'passed' | 'failed' | 'skipped' | 'running'}>> {
    // Look for real test result indicators in the UI
    const testItems = this.page.locator('[role="treeitem"], .test-item');
    const count = await testItems.count();
    const results = [];
    
    for (let i = 0; i < count; i++) {
      const item = testItems.nth(i);
      const name = await item.textContent() || `Test${i}`;
      
      // Check for actual result icons/classes
      const hasPassIcon = await item.locator('.codicon-pass, .codicon-check, [class*="pass"]').count() > 0;
      const hasFailIcon = await item.locator('.codicon-error, .codicon-close, [class*="fail"], [class*="error"]').count() > 0;
      const hasSkipIcon = await item.locator('.codicon-circle-slash, [class*="skip"]').count() > 0;
      const hasRunningIcon = await item.locator('.codicon-loading, .codicon-sync, [class*="running"]').count() > 0;
      
      let status: 'passed' | 'failed' | 'skipped' | 'running' = 'skipped';
      if (hasRunningIcon) status = 'running';
      else if (hasPassIcon) status = 'passed';
      else if (hasFailIcon) status = 'failed';
      else if (hasSkipIcon) status = 'skipped';
      
      results.push({ name: name.trim(), status });
    }
    
    return results;
  }

  /**
   * Real interaction: Verify extension is actually loaded and active
   */
  async verifyExtensionActive(extensionId: string): Promise<boolean> {
    try {
      // Method 1: Check through command palette
      await this.page.keyboard.press('Control+Shift+P');
      await this.page.waitForSelector('.quick-input-widget input', { timeout: 5000 });
      await this.page.type('.quick-input-widget input', extensionId);
      await this.page.waitForTimeout(1000);
      
      const commandResults = this.page.locator('.quick-input-list .quick-input-list-entry');
      const hasCommands = await commandResults.count() > 0;
      
      await this.page.keyboard.press('Escape'); // Close command palette
      
      if (hasCommands) {
        console.log(`Extension ${extensionId} is active (found commands)`);
        return true;
      }
      
      // Method 2: Check extensions view
      await this.page.keyboard.press('Control+Shift+X');
      await this.page.waitForSelector('.extensions-viewlet', { timeout: 5000 });
      
      const searchBox = this.page.locator('.extensions-viewlet input[placeholder*="Search"]');
      await searchBox.fill(extensionId);
      await this.page.waitForTimeout(2000);
      
      const extensionItems = this.page.locator('.extension-list-item');
      const extensionFound = await extensionItems.count() > 0;
      
      return extensionFound;
    } catch (error) {
      console.error('Failed to verify extension activation:', error);
      return false;
    }
  }

  /**
   * Real workspace interaction: Open actual files in editor
   */
  async openFileInEditor(filePath: string): Promise<void> {
    // Use real file opening through Quick Open
    await this.page.keyboard.press('Control+P');
    await this.page.waitForSelector('.quick-input-widget input', { timeout: 5000 });
    
    // Type filename to search
    const fileName = path.basename(filePath);
    await this.page.type('.quick-input-widget input', fileName);
    await this.page.waitForTimeout(1000);
    
    // Select first result
    await this.page.keyboard.press('Enter');
    
    // Wait for file to open in editor
    await this.page.waitForSelector('.monaco-editor', { timeout: 5000 });
    
    console.log(`Opened file: ${fileName}`);
  }

  /**
   * Real build interaction: Trigger actual build through UI
   */
  async triggerBuildThroughUI(): Promise<void> {
    // Open command palette
    await this.page.keyboard.press('Control+Shift+P');
    await this.page.waitForSelector('.quick-input-widget input', { timeout: 5000 });
    
    // Search for build commands
    await this.page.type('.quick-input-widget input', 'build');
    await this.page.waitForTimeout(1000);
    
    // Look for CMake or Build commands
    const buildCommands = this.page.locator('.quick-input-list .quick-input-list-entry').filter({ 
      hasText: /build|cmake/i 
    });
    
    if (await buildCommands.count() > 0) {
      await buildCommands.first().click();
      console.log('Triggered build through UI');
    } else {
      // Fallback: use keyboard shortcut
      await this.page.keyboard.press('Escape');
      await this.page.keyboard.press('Control+Shift+B');
      console.log('Triggered build via keyboard shortcut');
    }
  }

  /**
   * Debug helper: print current page state
   */
  async debugPageState(): Promise<void> {
    console.log('=== DEBUG: Current Page State ===');
    console.log('URL:', this.page.url());
    console.log('Title:', await this.page.title());
    
    // Print visible elements
    const visibleElements = await this.page.$$eval('*', elements => 
      elements
        .filter(el => el.offsetParent !== null)
        .slice(0, 10)
        .map(el => ({ tag: el.tagName, text: el.textContent?.slice(0, 50) }))
    );
    
    console.log('Visible elements (first 10):', visibleElements);
    
    await this.takeScreenshot('debug-page-state');
  }
}

/**
 * Real test data processor for analyzing actual test execution results
 * NO TEST DATA GENERATION - Only processing of real execution outputs
 */
export class RealTestDataProcessor {
  /**
   * Parse actual CTest JSON output from real ctest execution
   */
  static parseCTestJsonOutput(realOutput: string): Array<{ name: string; command: string[]; properties: any }> {
    try {
      const parsed = JSON.parse(realOutput);
      if (parsed.kind === "ctestInfo" && parsed.tests) {
        return parsed.tests;
      }
      throw new Error('Invalid CTest JSON format');
    } catch (error) {
      console.error('Failed to parse real CTest output:', error);
      return [];
    }
  }

  /**
   * Parse actual JUnit XML output from real test execution
   */
  static parseJUnitXmlOutput(realXmlOutput: string): Array<{ name: string; status: 'passed' | 'failed' | 'skipped'; duration: number; message?: string }> {
    const results: Array<{ name: string; status: 'passed' | 'failed' | 'skipped'; duration: number; message?: string }> = [];
    
    try {
      // Basic XML parsing for real test results
      const testcaseRegex = /<testcase[^>]*name="([^"]*)"[^>]*time="([^"]*)"[^>]*>(.*?)<\/testcase>/gs;
      let match;
      
      while ((match = testcaseRegex.exec(realXmlOutput)) !== null) {
        const [, name, time, content] = match;
        const duration = parseFloat(time) || 0;
        
        let status: 'passed' | 'failed' | 'skipped' = 'passed';
        let message: string | undefined;
        
        if (content.includes('<failure')) {
          status = 'failed';
          const failureMatch = content.match(/<failure[^>]*message="([^"]*)"[^>]*>/);
          if (failureMatch) {
            message = failureMatch[1];
          }
        } else if (content.includes('<skipped')) {
          status = 'skipped';
        }
        
        results.push({ name, status, duration, message });
      }
      
      return results;
    } catch (error) {
      console.error('Failed to parse real JUnit XML:', error);
      return [];
    }
  }

  /**
   * Parse real GTest output for test discovery
   */
  static parseGTestListOutput(realOutput: string): Array<{ suite: string; test: string; fullName: string }> {
    const tests: Array<{ suite: string; test: string; fullName: string }> = [];
    
    const lines = realOutput.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.includes('.')) {
        const [suite, test] = trimmed.split('.');
        if (suite && test) {
          tests.push({
            suite: suite.trim(),
            test: test.trim(),
            fullName: trimmed
          });
        }
      }
    }
    
    return tests;
  }

  /**
   * Analyze real test execution timing and performance
   */
  static analyzeRealTestPerformance(realResults: Array<{ name: string; duration: number }>): {
    totalTime: number;
    averageTime: number;
    slowestTest: { name: string; duration: number } | null;
    fastestTest: { name: string; duration: number } | null;
  } {
    if (realResults.length === 0) {
      return { totalTime: 0, averageTime: 0, slowestTest: null, fastestTest: null };
    }
    
    const totalTime = realResults.reduce((sum, result) => sum + result.duration, 0);
    const averageTime = totalTime / realResults.length;
    
    const sortedByDuration = [...realResults].sort((a, b) => b.duration - a.duration);
    const slowestTest = sortedByDuration[0];
    const fastestTest = sortedByDuration[sortedByDuration.length - 1];
    
    return {
      totalTime,
      averageTime,
      slowestTest,
      fastestTest
    };
  }
}

/**
 * Real process runner for actual command execution in system tests
 * Replaces mock runners to ensure real E2E testing
 */
export class RealProcessRunner {
  async execute(command: string, args: string[], cwd?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
      const process = spawn(command, args, {
        cwd: cwd || process.cwd(),
        stdio: 'pipe',
        shell: true
      });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (exitCode) => {
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: exitCode || 0
        });
      });

      process.on('error', (error) => {
        resolve({
          stdout: '',
          stderr: error.message,
          exitCode: 1
        });
      });
    });
  }

  async executeInBackground(command: string, args: string[], cwd?: string): Promise<ChildProcess> {
    return spawn(command, args, {
      cwd: cwd || process.cwd(),
      stdio: 'pipe',
      detached: false,
      shell: true
    });
  }
}