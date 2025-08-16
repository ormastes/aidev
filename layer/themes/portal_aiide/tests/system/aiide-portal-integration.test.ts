/**
 * System Tests for AIIDE Integration with AIdev Portal
 * Tests full end-to-end functionality
 */

import { test, expect, Page } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import { path } from '../../../infra_external-log-lib/src';
import { fsPromises as fs } from '../../../infra_external-log-lib/src';

let serverProcess: ChildProcess;
let aiideServerUrl: string;
let portalUrl: string;

test.describe('AIIDE Portal Integration', () => {
  test.beforeAll(async () => {
    // Start AIIDE backend server
    serverProcess = spawn('npm', ['run', 'server'], {
      cwd: path.join(__dirname, '../..'),
      env: { ...process.env, PORT: '3457' }
    });

    aiideServerUrl = 'http://localhost:3457';
    portalUrl = 'http://localhost:5173'; // Vite dev server port

    // Wait for server to be ready
    await waitForServer(aiideServerUrl, 30000);
  });

  test.afterAll(async () => {
    // Clean up server process
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  test.describe('Multi-Provider Chat System', () => {
    test('should create and manage multiple chat sessions', async ({ page }) => {
      await page.goto(`${portalUrl}/aiide`);
      
      // Wait for app to load
      await page.waitForSelector('.aiide-app', { timeout: 10000 });
      
      // Create new chat session
      await page.click('[data-testid="new-chat-button"]');
      
      // Verify chat tab is created
      const chatTab = await page.locator('.ant-tabs-tab').first();
      await expect(chatTab).toBeVisible();
      
      // Send a message
      const input = await page.locator('.chat-input textarea');
      await input.fill('Hello, this is a test message');
      await page.keyboard.press('Enter');
      
      // Verify message appears
      await expect(page.locator('.message-user').last()).toContainText('Hello, this is a test message');
      
      // Wait for AI response
      await page.waitForSelector('.message-assistant', { timeout: 10000 });
      const response = await page.locator('.message-assistant').last();
      await expect(response).toBeVisible();
    });

    test('should switch between different AI providers', async ({ page }) => {
      await page.goto(`${portalUrl}/aiide`);
      await page.waitForSelector('.aiide-app');
      
      // Open provider selector
      await page.click('[data-testid="provider-selector"]');
      
      // Check available providers
      const providers = ['Claude', 'Ollama', 'DeepSeek R1'];
      for (const provider of providers) {
        await expect(page.locator(`.provider-option:has-text("${provider}")`)).toBeVisible();
      }
      
      // Select Ollama
      await page.click('.provider-option:has-text("Ollama")');
      
      // Verify provider changed
      await expect(page.locator('[data-testid="current-provider"]')).toContainText('Ollama');
    });

    test('should handle context attachments', async ({ page }) => {
      await page.goto(`${portalUrl}/aiide`);
      await page.waitForSelector('.aiide-app');
      
      // Open context panel
      await page.click('[data-testid="context-button"]');
      
      // Create a test file for context
      const testFilePath = path.join(__dirname, 'test-context.txt');
      await fs.writeFile(testFilePath, 'This is test context content');
      
      // Upload file as context
      const fileInput = await page.locator('input[type="file"]');
      await fileInput.setInputFiles(testFilePath);
      
      // Verify context added
      await expect(page.locator('.context-item')).toContainText('test-context.txt');
      
      // Clean up
      await fs.unlink(testFilePath);
    });

    test('should export and import chat sessions', async ({ page }) => {
      await page.goto(`${portalUrl}/aiide`);
      await page.waitForSelector('.aiide-app');
      
      // Create a chat with some messages
      await page.locator('.chat-input textarea').fill('Test message for export');
      await page.keyboard.press('Enter');
      await page.waitForSelector('.message-assistant');
      
      // Export chat
      await page.click('[data-testid="chat-menu"]');
      await page.click('[data-testid="export-chat"]');
      
      // Verify download started
      const download = await page.waitForEvent('download');
      expect(download.suggestedFilename()).toContain('.json');
      
      // Save and re-import
      const exportPath = path.join(__dirname, 'exported-chat.json');
      await download.saveAs(exportPath);
      
      // Create new session and import
      await page.click('[data-testid="new-chat-button"]');
      await page.click('[data-testid="chat-menu"]');
      await page.click('[data-testid="import-chat"]');
      
      const importInput = await page.locator('input[type="file"]#import');
      await importInput.setInputFiles(exportPath);
      
      // Verify imported messages appear
      await expect(page.locator('.message-user')).toContainText('Test message for export');
      
      // Clean up
      await fs.unlink(exportPath);
    });
  });

  test.describe('File Explorer and Editor', () => {
    test('should display file tree and navigate folders', async ({ page }) => {
      await page.goto(`${portalUrl}/aiide`);
      await page.waitForSelector('.aiide-app');
      
      // Verify file explorer is visible
      await expect(page.locator('.file-explorer')).toBeVisible();
      
      // Expand a folder
      const folder = await page.locator('.file-node[data-type="directory"]').first();
      await folder.click();
      
      // Verify children are shown
      await page.waitForSelector('.file-node[data-level="1"]');
    });

    test('should create, rename, and delete files', async ({ page }) => {
      await page.goto(`${portalUrl}/aiide`);
      await page.waitForSelector('.aiide-app');
      
      // Create new file
      await page.click('[data-testid="new-file-button"]');
      const fileNameInput = await page.locator('.new-file-input');
      await fileNameInput.fill('test-file.ts');
      await fileNameInput.press('Enter');
      
      // Verify file created
      await expect(page.locator('.file-node:has-text("test-file.ts")')).toBeVisible();
      
      // Rename file
      await page.locator('.file-node:has-text("test-file.ts")').click({ button: 'right' });
      await page.click('.context-menu-item:has-text("Rename")');
      const renameInput = await page.locator('.rename-input');
      await renameInput.fill('renamed-file.ts');
      await renameInput.press('Enter');
      
      // Verify renamed
      await expect(page.locator('.file-node:has-text("renamed-file.ts")')).toBeVisible();
      
      // Delete file
      await page.locator('.file-node:has-text("renamed-file.ts")').click({ button: 'right' });
      await page.click('.context-menu-item:has-text("Delete")');
      await page.click('.confirm-delete');
      
      // Verify deleted
      await expect(page.locator('.file-node:has-text("renamed-file.ts")')).not.toBeVisible();
    });

    test('should open and edit files in Monaco editor', async ({ page }) => {
      await page.goto(`${portalUrl}/aiide`);
      await page.waitForSelector('.aiide-app');
      
      // Create a test file
      await page.click('[data-testid="new-file-button"]');
      const fileNameInput = await page.locator('.new-file-input');
      await fileNameInput.fill('test-code.js');
      await fileNameInput.press('Enter');
      
      // Open file
      await page.locator('.file-node:has-text("test-code.js")').dblclick();
      
      // Wait for editor to load
      await page.waitForSelector('.monaco-editor');
      
      // Type in editor
      const editor = await page.locator('.monaco-editor textarea');
      await editor.fill('function hello() {\n  console.log("Hello AIIDE");\n}');
      
      // Save file
      await page.keyboard.press('Control+S');
      
      // Verify save indicator
      await expect(page.locator('[data-testid="file-saved-indicator"]')).toBeVisible();
    });

    test('should support syntax highlighting and IntelliSense', async ({ page }) => {
      await page.goto(`${portalUrl}/aiide`);
      await page.waitForSelector('.aiide-app');
      
      // Open a TypeScript file
      await page.click('[data-testid="new-file-button"]');
      const fileNameInput = await page.locator('.new-file-input');
      await fileNameInput.fill('test.ts');
      await fileNameInput.press('Enter');
      await page.locator('.file-node:has-text("test.ts")').dblclick();
      
      // Type code
      const editor = await page.locator('.monaco-editor textarea');
      await editor.fill('const message: string = ');
      
      // Trigger IntelliSense
      await page.keyboard.press('Control+Space');
      
      // Verify IntelliSense popup
      await expect(page.locator('.suggest-widget')).toBeVisible();
    });
  });

  test.describe('Layout Management', () => {
    test('should switch between IDE, Chat, and Split layouts', async ({ page }) => {
      await page.goto(`${portalUrl}/aiide`);
      await page.waitForSelector('.aiide-app');
      
      // Test IDE layout (default)
      await expect(page.locator('.aiide-editor-container')).toBeVisible();
      await expect(page.locator('.aiide-chat-container')).toBeVisible();
      
      // Switch to Chat layout
      await page.click('[data-testid="layout-selector"]');
      await page.click('[data-testid="layout-chat"]');
      await expect(page.locator('.aiide-chat-full')).toBeVisible();
      await expect(page.locator('.aiide-editor-container')).not.toBeVisible();
      
      // Switch to Split layout
      await page.click('[data-testid="layout-selector"]');
      await page.click('[data-testid="layout-split"]');
      await expect(page.locator('.aiide-split-pane')).toBeVisible();
    });

    test('should toggle sidebars and panels', async ({ page }) => {
      await page.goto(`${portalUrl}/aiide`);
      await page.waitForSelector('.aiide-app');
      
      // Toggle file explorer
      await page.click('[data-testid="toggle-sidebar"]');
      await expect(page.locator('.aiide-sidebar')).toHaveClass(/collapsed/);
      
      // Toggle again
      await page.click('[data-testid="toggle-sidebar"]');
      await expect(page.locator('.aiide-sidebar')).not.toHaveClass(/collapsed/);
      
      // Toggle context panel
      await page.click('[data-testid="toggle-context-panel"]');
      await expect(page.locator('.aiide-context-panel')).toBeVisible();
    });

    test('should save and restore layout preferences', async ({ page }) => {
      await page.goto(`${portalUrl}/aiide`);
      await page.waitForSelector('.aiide-app');
      
      // Change layout settings
      await page.click('[data-testid="layout-selector"]');
      await page.click('[data-testid="layout-split"]');
      
      // Resize panels
      const divider = await page.locator('.split-pane-divider');
      await divider.dragTo(await page.locator('.aiide-content'), {
        sourcePosition: { x: 0, y: 0 },
        targetPosition: { x: 200, y: 0 }
      });
      
      // Reload page
      await page.reload();
      await page.waitForSelector('.aiide-app');
      
      // Verify layout is restored
      await expect(page.locator('.aiide-split-pane')).toBeVisible();
    });
  });

  test.describe('Integration Features', () => {
    test('should send file content to chat as context', async ({ page }) => {
      await page.goto(`${portalUrl}/aiide`);
      await page.waitForSelector('.aiide-app');
      
      // Create a file with content
      await page.click('[data-testid="new-file-button"]');
      const fileNameInput = await page.locator('.new-file-input');
      await fileNameInput.fill('context-test.js');
      await fileNameInput.press('Enter');
      
      // Open and edit file
      await page.locator('.file-node:has-text("context-test.js")').dblclick();
      const editor = await page.locator('.monaco-editor textarea');
      await editor.fill('function testFunction() { return "test"; }');
      await page.keyboard.press('Control+S');
      
      // Add file to chat context
      await page.locator('.file-node:has-text("context-test.js")').click({ button: 'right' });
      await page.click('.context-menu-item:has-text("Add to Chat Context")');
      
      // Verify context indicator
      await expect(page.locator('.context-badge')).toContainText('1');
      
      // Send message referencing the file
      const chatInput = await page.locator('.chat-input textarea');
      await chatInput.fill('Explain the testFunction in the context');
      await page.keyboard.press('Enter');
      
      // Verify AI response references the function
      await page.waitForSelector('.message-assistant');
      const response = await page.locator('.message-assistant').last();
      await expect(response).toContainText('testFunction');
    });

    test('should apply AI suggestions to code', async ({ page }) => {
      await page.goto(`${portalUrl}/aiide`);
      await page.waitForSelector('.aiide-app');
      
      // Open a file
      await page.click('[data-testid="new-file-button"]');
      const fileNameInput = await page.locator('.new-file-input');
      await fileNameInput.fill('improve-me.js');
      await fileNameInput.press('Enter');
      await page.locator('.file-node:has-text("improve-me.js")').dblclick();
      
      // Add code
      const editor = await page.locator('.monaco-editor textarea');
      await editor.fill('function bad() { var x = 1; return x }');
      
      // Request improvement via chat
      const chatInput = await page.locator('.chat-input textarea');
      await chatInput.fill('Improve the bad() function with better naming and ES6 syntax');
      await page.keyboard.press('Enter');
      
      // Wait for response with code
      await page.waitForSelector('.message-assistant pre');
      
      // Click apply suggestion button
      await page.click('[data-testid="apply-suggestion"]');
      
      // Verify code is updated in editor
      await expect(editor).toContainText('const');
    });
  });

  test.describe('Performance and Reliability', () => {
    test('should handle large file trees efficiently', async ({ page }) => {
      await page.goto(`${portalUrl}/aiide`);
      await page.waitForSelector('.aiide-app');
      
      // Measure file tree load time
      const startTime = Date.now();
      await page.waitForSelector('.file-explorer-tree');
      const loadTime = Date.now() - startTime;
      
      // Should load within 2 seconds even with many files
      expect(loadTime).toBeLessThan(2000);
      
      // Verify virtual scrolling for large lists
      const fileNodes = await page.locator('.file-node').count();
      if (fileNodes > 100) {
        // Check that not all nodes are rendered
        const visibleNodes = await page.locator('.file-node:visible').count();
        expect(visibleNodes).toBeLessThan(fileNodes);
      }
    });

    test('should auto-save and recover from crashes', async ({ page, context }) => {
      await page.goto(`${portalUrl}/aiide`);
      await page.waitForSelector('.aiide-app');
      
      // Create content
      await page.click('[data-testid="new-file-button"]');
      const fileNameInput = await page.locator('.new-file-input');
      await fileNameInput.fill('auto-save-test.js');
      await fileNameInput.press('Enter');
      await page.locator('.file-node:has-text("auto-save-test.js")').dblclick();
      
      const editor = await page.locator('.monaco-editor textarea');
      await editor.fill('const autoSaveTest = true;');
      
      // Wait for auto-save
      await page.waitForTimeout(2000);
      
      // Simulate crash by closing and reopening
      await page.close();
      const newPage = await context.newPage();
      await newPage.goto(`${portalUrl}/aiide`);
      await newPage.waitForSelector('.aiide-app');
      
      // Open the file again
      await newPage.locator('.file-node:has-text("auto-save-test.js")').dblclick();
      
      // Verify content was saved
      const newEditor = await newPage.locator('.monaco-editor textarea');
      await expect(newEditor).toContainText('autoSaveTest');
    });
  });
});

// Helper function to wait for server
async function waitForServer(url: string, timeout: number): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(`${url}/api/providers`);
      if (response.ok) {
        return;
      }
    } catch (error) {
      // Server not ready yet
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error(`Server at ${url} did not start within ${timeout}ms`);
}