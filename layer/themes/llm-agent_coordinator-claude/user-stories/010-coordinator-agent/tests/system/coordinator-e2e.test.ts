import { test, expect } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import { path } from '../../../../../infra_external-log-lib/src';
import * as fs from 'fs/promises';

// E2E tests using Playwright for real user interactions
test.describe('Coordinator Agent E2E Tests', () => {
  let coordinatorProcess: ChildProcess;
  let tempDir: string;
  
  test.beforeAll(async () => {
    // Create temporary directory for test sessions
    tempDir = path.join(process.cwd(), '.e2e-test-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
    
    // Create test task queue
    await fs.writeFile(path.join(tempDir, 'TASK_QUEUE.md'), `# Task Queue

## Pending

- [ ] [high] E2E Test Task (id: e2e-task-001)
  Description: Task for E2E testing
  Status: pending
`);
  });
  
  test.afterAll(async () => {
    // Clean up
    if (coordinatorProcess) {
      coordinatorProcess.kill();
    }
    
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('should start coordinator via CLI', async () => {
    // Given: The system is in a valid state
    // When: start coordinator via CLI
    // Then: The expected behavior occurs
    // Start coordinator process
    coordinatorProcess = spawn('node', [
      path.join(__dirname, '../../src/index.js'),
      'start',
      '--api-key', process.env.CLAUDE_API_KEY || 'test-key',
      '--storage-dir', tempDir,
      '--task-queue', path.join(tempDir, 'TASK_QUEUE.md'),
      '--no-interactive'
    ]);
    
    // Wait for startup
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(callback, 5000);
      
      coordinatorProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Coordinator started')) {
          clearTimeout(timeout);
          resolve();
        }
      });
      
      coordinatorProcess.stderr?.on('data', (data) => {
        console.error('Coordinator error:', data.toString());
      });
    });
    
    // Verify process is running
    expect(coordinatorProcess.pid).toBeDefined();
    expect(coordinatorProcess.killed).toBe(false);
  });

  test('should handle interactive commands in terminal', async ({ page }) => {
    // This test would require a terminal emulator or PTY
    // For now, we'll test the non-interactive CLI commands
    
    // Start coordinator
    const startProcess = spawn('node', [
      path.join(__dirname, '../../src/index.js'),
      'start',
      '--api-key', process.env.CLAUDE_API_KEY || 'test-key',
      '--storage-dir', tempDir,
      '--no-interactive'
    ]);
    
    let sessionId: string | undefined;
    
    await new Promise<void>((resolve) => {
      startProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        const match = output.match(/Session ID: ([\w-]+)/);
        if (match) {
          sessionId = match[1];
          resolve();
        }
      });
    });
    
    expect(sessionId).toBeDefined();
    
    // Stop the process
    startProcess.kill('SIGINT');
    
    // List sessions
    const listProcess = spawn('node', [
      path.join(__dirname, '../../src/index.js'),
      'list-sessions',
      '--storage-dir', tempDir
    ]);
    
    const listOutput = await new Promise<string>((resolve) => {
      let output = '';
      listProcess.stdout?.on('data', (data) => {
        output += data.toString();
      });
      listProcess.on('close', () => resolve(output));
    });
    
    expect(listOutput).toContain(sessionId);
    expect(listOutput).toContain('State: active');
  });

  test('should resume interrupted session', async () => {
    // Given: The system is in a valid state
    // When: resume interrupted session
    // Then: The expected behavior occurs
    // Start and interrupt a session
    const startProcess = spawn('node', [
      path.join(__dirname, '../../src/index.js'),
      'start',
      '--api-key', process.env.CLAUDE_API_KEY || 'test-key',
      '--storage-dir', tempDir,
      '--no-interactive'
    ]);
    
    let sessionId: string | undefined;
    
    await new Promise<void>((resolve) => {
      startProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        const match = output.match(/Session ID: ([\w-]+)/);
        if (match) {
          sessionId = match[1];
          resolve();
        }
      });
    });
    
    // Interrupt with SIGINT
    startProcess.kill('SIGINT');
    
    // Wait for process to exit
    await new Promise(resolve => startProcess.on('close', resolve));
    
    // Resume the session
    const resumeProcess = spawn('node', [
      path.join(__dirname, '../../src/index.js'),
      'resume',
      sessionId!,
      '--api-key', process.env.CLAUDE_API_KEY || 'test-key',
      '--no-interactive'
    ]);
    
    const resumeOutput = await new Promise<string>((resolve) => {
      let output = '';
      resumeProcess.stdout?.on('data', (data) => {
        output += data.toString();
      });
      resumeProcess.on('close', () => resolve(output));
    });
    
    expect(resumeOutput).toContain('Resumed session');
    expect(resumeOutput).toContain(sessionId);
  });

  test('should export session data', async () => {
    // Given: The system is in a valid state
    // When: export session data
    // Then: The expected behavior occurs
    // Create a session first
    const startProcess = spawn('node', [
      path.join(__dirname, '../../src/index.js'),
      'start',
      '--api-key', process.env.CLAUDE_API_KEY || 'test-key',
      '--storage-dir', tempDir,
      '--dangerous', // Enable dangerous mode for testing
      '--no-interactive'
    ]);
    
    let sessionId: string | undefined;
    
    await new Promise<void>((resolve) => {
      startProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        const match = output.match(/Session ID: ([\w-]+)/);
        if (match) {
          sessionId = match[1];
          resolve();
        }
      });
    });
    
    startProcess.kill('SIGINT');
    await new Promise(resolve => startProcess.on('close', resolve));
    
    // Export the session
    const exportPath = path.join(tempDir, 'export.json');
    const exportProcess = spawn('node', [
      path.join(__dirname, '../../src/index.js'),
      'export-session',
      sessionId!,
      '--storage-dir', tempDir,
      '--output', exportPath
    ]);
    
    await new Promise(resolve => exportProcess.on('close', resolve));
    
    // Verify export file
    const exportData = JSON.parse(await fs.readFile(exportPath, 'utf-8'));
    expect(exportData.id).toBe(sessionId);
    expect(exportData.permissions.dangerousMode).toBe(true);
    expect(exportData.state).toBe('active');
  });

  test('should integrate with chat-space theme', async () => {
    // Given: The system is in a valid state
    // When: integrate with chat-space theme
    // Then: The expected behavior occurs
    // This would require chat-space to be running
    // For now, test that the option is accepted
    
    const process = spawn('node', [
      path.join(__dirname, '../../src/index.js'),
      'start',
      '--api-key', process.env.CLAUDE_API_KEY || 'test-key',
      '--storage-dir', tempDir,
      '--chat-space',
      '--chat-room', 'test-room',
      '--no-interactive'
    ]);
    
    const output = await new Promise<string>((resolve) => {
      let data = '';
      const timeout = setTimeout(() => {
        process.kill();
        resolve(data);
      }, 5000);
      
      process.stdout?.on('data', (chunk) => {
        data += chunk.toString();
        if (data.includes('Coordinator started')) {
          clearTimeout(timeout);
          process.kill();
          resolve(data);
        }
      });
    });
    
    // Should start In Progress even if chat-space is not available
    expect(output).toContain('Coordinator started');
  });
});

// Browser-based UI tests (if coordinator has a web interface)
test.describe('Coordinator Web Interface', () => {
  test.todo("should display session status in browser - TODO: Implement this test - Implementation needed", async ({ page }) => {
    // This would test a web interface if one exists
    // Placeholder for future web UI testing
    
    await page.goto('http://localhost:3456/coordinator');
    
    // Check for session display
    await expect(page.locator('.session-status')).toBeVisible();
    await expect(page.locator('.session-id')).toContainText(/session-/);
    
    // Test interactive features
    await page.click('button#dangerous-mode-toggle');
    await expect(page.locator('.dangerous-mode-warning')).toBeVisible();
    
    // Test task management
    await page.fill('input#new-task-title', 'UI Test Task');
    await page.fill('textarea#new-task-description', 'Created from UI');
    await page.click('button#add-task');
    
    await expect(page.locator('.task-list')).toContainText('UI Test Task');
  });
});

// Performance and stress tests
test.describe('Performance Tests', () => {
  test.todo("should handle multiple concurrent sessions - TODO: Implement this test - Implementation needed", async () => {
    const sessions = [];
    
    // Start 5 concurrent sessions
    for (let i = 0; i < 5; i++) {
      const process = spawn('node', [
        path.join(__dirname, '../../src/index.js'),
        'start',
        '--api-key', process.env.CLAUDE_API_KEY || 'test-key',
        '--storage-dir', path.join(tempDir, `session-${i}`),
        '--no-interactive'
      ]);
      
      sessions.push(process);
    }
    
    // Wait for all to start
    await Promise.all(sessions.map(proc => 
      new Promise(resolve => {
        proc.stdout?.once('data', resolve);
      })
    ));
    
    // All should be running
    sessions.forEach(proc => {
      expect(proc.killed).toBe(false);
    });
    
    // Clean up
    sessions.forEach(proc => proc.kill());
  });
});