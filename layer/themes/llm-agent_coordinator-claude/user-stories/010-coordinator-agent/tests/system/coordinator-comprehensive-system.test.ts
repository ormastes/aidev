import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { spawn, ChildProcess } from 'child_process';
import { chromium, Browser, Page, BrowserContext } from "playwright";
import { path } from '../../../../../infra_external-log-lib/src';
import * as fs from 'fs/promises';
import { EventEmitter } from 'node:events';

// Comprehensive system tests using Playwright browser automation
describe('Coordinator Comprehensive System Tests', () => {
  let testDir: string;
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  let coordinatorProcess: ChildProcess | null = null;
  let webServerProcess: ChildProcess | null = null;
  let baseUrl: string;

  beforeAll(async () => {
    // Create test directory structure
    testDir = path.join(process.cwd(), '.system-test-' + Date.now());
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, "sessions"), { recursive: true });
    await fs.mkdir(path.join(testDir, 'queue'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'web'), { recursive: true });
    
    // Create initial task queue with various task types
    const taskQueuePath = path.join(testDir, 'queue', 'TASK_QUEUE.md');
    await fs.writeFile(taskQueuePath, `# Task Queue

## Pending

- [ ] [high] Implement authentication system (id: auth-task-001)
  Description: Create secure authentication with JWT tokens
  Status: pending
  
- [ ] [medium] Add user profile management (id: profile-task-002)
  Description: Allow users to manage their profiles
  Status: pending
  Dependencies: auth-task-001
  
- [ ] [low] Create documentation (id: docs-task-003)
  Description: Write comprehensive API documentation
  Status: pending
  
- [ ] [critical] Fix security vulnerability (id: security-task-004)
  Description: Patch critical security issue in login endpoint
  Status: pending

## In Progress

- [ ] [high] Refactor database schema (id: db-task-005)
  Description: Optimize database structure for performance
  Status: in_progress
  Started: ${new Date().toISOString()}

## Blocked

- [ ] [medium] Integrate payment gateway (id: payment-task-006)
  Description: Add Stripe payment processing
  Status: blocked
  Dependencies: auth-task-001
`);

    // Create a simple web interface for testing
    const webInterfacePath = path.join(testDir, 'web', 'index.html');
    await fs.writeFile(webInterfacePath, `<!DOCTYPE html>
<html>
<head>
    <title>Coordinator Test Interface</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
        .button { padding: 10px 15px; margin: 5px; background: #007cba; color: white; border: none; cursor: pointer; }
        .button:hover { background: #005a9e; }
        .log { background: #f5f5f5; padding: 10px; margin: 10px 0; height: 200px; overflow-y: auto; }
        .status { padding: 5px 10px; margin: 5px; border-radius: 3px; }
        .status.running { background: #d4edda; }
        .status.stopped { background: #f8d7da; }
    </style>
</head>
<body>
    <h1>Coordinator System Test Interface</h1>
    
    <div class="section">
        <h2>Coordinator Control</h2>
        <button id="start-coordinator" class="button">Start Coordinator</button>
        <button id="stop-coordinator" class="button">Stop Coordinator</button>
        <button id="get-status" class="button">Get Status</button>
        <div id="coordinator-status" class="status stopped">Status: Stopped</div>
    </div>
    
    <div class="section">
        <h2>Task Management</h2>
        <input type="text" id="task-title" placeholder="Task title" style="width: 200px; margin: 5px;">
        <select id="task-priority" style="margin: 5px;">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
        </select>
        <button id="add-task" class="button">Add Task</button>
        <button id="list-tasks" class="button">List Tasks</button>
        <div id="task-list"></div>
    </div>
    
    <div class="section">
        <h2>Session Management</h2>
        <button id="create-session" class="button">Create Session</button>
        <button id="list-sessions" class="button">List Sessions</button>
        <input type="text" id="session-id" placeholder="Session ID" style="width: 200px; margin: 5px;">
        <button id="resume-session" class="button">Resume Session</button>
        <div id="session-info"></div>
    </div>
    
    <div class="section">
        <h2>Dangerous Mode</h2>
        <button id="enable-dangerous" class="button">Enable Dangerous Mode</button>
        <button id="disable-dangerous" class="button">Disable Dangerous Mode</button>
        <div id="dangerous-status">Dangerous Mode: Disabled</div>
    </div>
    
    <div class="section">
        <h2>Event Log</h2>
        <button id="clear-log" class="button">Clear Log</button>
        <div id="event-log" class="log"></div>
    </div>
    
    <script>
        let eventSource = null;
        
        function log(message) {
            const logElement = document.getElementById('event-log');
            const timestamp = new Date().toISOString();
            logElement.innerHTML += '[' + timestamp + '] ' + message + '\\n';
            logElement.scrollTop = logElement.scrollHeight;
        }
        
        async function apiCall(endpoint, method = 'GET', data = null) {
            try {
                const options = {
                    method,
                    headers: { 'Content-Type': 'application/json' }
                };
                if (data) options.body = JSON.stringify(data);
                
                const response = await fetch('/api/' + endpoint, options);
                const result = await response.json();
                log('API ' + method + ' /' + endpoint + ': ' + JSON.stringify(result));
                return result;
            } catch (error) {
                log('API Error: ' + error.message);
                return { error: error.message };
            }
        }
        
        document.getElementById('start-coordinator').addEventListener('click', async () => {
            const result = await apiCall('coordinator/start', 'POST');
            if (result.success) {
                document.getElementById('coordinator-status').textContent = 'Status: Running';
                document.getElementById('coordinator-status').className = 'status running';
            }
        });
        
        document.getElementById('stop-coordinator').addEventListener('click', async () => {
            const result = await apiCall('coordinator/stop', 'POST');
            if (result.success) {
                document.getElementById('coordinator-status').textContent = 'Status: Stopped';
                document.getElementById('coordinator-status').className = 'status stopped';
            }
        });
        
        document.getElementById('get-status').addEventListener('click', async () => {
            const result = await apiCall('coordinator/status');
            if (result.status) {
                document.getElementById('coordinator-status').textContent = 'Status: ' + 
                    (result.status.running ? 'Running' : 'Stopped');
                document.getElementById('coordinator-status').className = 'status ' + 
                    (result.status.running ? 'running' : 'stopped');
            }
        });
        
        document.getElementById('add-task').addEventListener('click', async () => {
            const title = document.getElementById('task-title').value;
            const priority = document.getElementById('task-priority').value;
            if (!title) return;
            
            const result = await apiCall('tasks', 'POST', {
                title,
                priority,
                description: 'Task created via web interface',
                status: 'pending'
            });
            document.getElementById('task-title').value = '';
        });
        
        document.getElementById('list-tasks').addEventListener('click', async () => {
            const result = await apiCall('tasks');
            if (result.tasks) {
                const taskList = document.getElementById('task-list');
                taskList.innerHTML = '<h3>Tasks (' + result.tasks.length + '):</h3>';
                result.tasks.forEach(task => {
                    taskList.innerHTML += '<div>[' + task.priority + '] ' + task.title + ' - ' + task.status + '</div>';
                });
            }
        });
        
        document.getElementById('create-session').addEventListener('click', async () => {
            await apiCall("sessions", 'POST');
        });
        
        document.getElementById('list-sessions').addEventListener('click', async () => {
            const result = await apiCall("sessions");
            if (result.sessions) {
                const sessionInfo = document.getElementById('session-info');
                sessionInfo.innerHTML = '<h3>Sessions (' + result.sessions.length + '):</h3>';
                result.sessions.forEach(session => {
                    sessionInfo.innerHTML += '<div>' + session.id + ' - ' + session.state + '</div>';
                });
            }
        });
        
        document.getElementById('resume-session').addEventListener('click', async () => {
            const sessionId = document.getElementById('session-id').value;
            if (!sessionId) return;
            await apiCall('sessions/' + sessionId + '/resume', 'POST');
        });
        
        document.getElementById('enable-dangerous').addEventListener('click', async () => {
            const result = await apiCall('coordinator/dangerous-mode', 'POST', { enabled: true });
            if (result.success) {
                document.getElementById('dangerous-status').textContent = 'Dangerous Mode: Enabled';
            }
        });
        
        document.getElementById('disable-dangerous').addEventListener('click', async () => {
            const result = await apiCall('coordinator/dangerous-mode', 'POST', { enabled: false });
            if (result.success) {
                document.getElementById('dangerous-status').textContent = 'Dangerous Mode: Disabled';
            }
        });
        
        document.getElementById('clear-log').addEventListener('click', () => {
            document.getElementById('event-log').innerHTML = '';
        });
        
        // Initialize
        log('Web interface loaded');
    </script>
</body>
</html>`);

    // Start browser
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext();
    page = await context.newPage();
    
    // Start coordinator web server
    baseUrl = 'http://localhost:3001';
    await startCoordinatorWebServer();
  });
  
  async function startCoordinatorWebServer() {
    // Create a simple Express server script
    const serverScript = path.join(testDir, 'web', 'server.js');
    await fs.writeFile(serverScript, `
      const express = require('express');
      const path = require('node:path');
      const { spawn } = require('child_process');
      const fs = require('node:fs');
      
      const app = express();
      app.use(express.json());
      app.use(express.static('${path.join(testDir, 'web')}'));
      
      let coordinatorState = { running: false, sessionId: null };
      let tasks = [];
      let sessions = [];
      
      // Mock API endpoints for testing
      app.post('/api/coordinator/start', (req, res) => {
        coordinatorState.running = true;
        coordinatorState.sessionId = 'session-' + Date.now();
        res.json({ "success": true, sessionId: coordinatorState.sessionId });
      });
      
      app.post('/api/coordinator/stop', (req, res) => {
        coordinatorState.running = false;
        res.json({ "success": true });
      });
      
      app.get('/api/coordinator/status', (req, res) => {
        res.json({ status: coordinatorState });
      });
      
      app.post('/api/tasks', (req, res) => {
        const task = {
          id: 'task-' + Date.now(),
          ...req.body,
          createdAt: new Date().toISOString()
        };
        tasks.push(task);
        res.json({ "success": true, task });
      });
      
      app.get('/api/tasks', (req, res) => {
        res.json({ tasks });
      });
      
      app.post('/api/sessions', (req, res) => {
        const session = {
          id: 'session-' + Date.now(),
          state: 'active',
          createdAt: new Date().toISOString()
        };
        sessions.push(session);
        res.json({ "success": true, session });
      });
      
      app.get('/api/sessions', (req, res) => {
        res.json({ sessions });
      });
      
      app.post('/api/sessions/:id/resume', (req, res) => {
        const session = sessions.find(s => s.id === req.params.id);
        if (session) {
          session.state = 'active';
          coordinatorState.sessionId = session.id;
          res.json({ "success": true });
        } else {
          res.status(404).json({ error: 'Session not found' });
        }
      });
      
      app.post('/api/coordinator/dangerous-mode', (req, res) => {
        coordinatorState.dangerousMode = req.body.enabled;
        res.json({ "success": true });
      });
      
      const server = app.listen(3001, () => {
        console.log('Test coordinator web server started on port 3001');
      });
      
      process.on('SIGINT', () => {
        server.close();
        process.exit(0);
      });
    `);
    
    return new Promise((resolve, reject) => {
      webServerProcess = spawn('node', [serverScript], {
        cwd: testDir,
        stdio: 'pipe'
      });
      
      webServerProcess?.stdout?.on('data', (data) => {
        if (data.toString().includes('started on port 3001')) {
          setTimeout(Working on, 1000); // Give server time to fully start
        }
      });
      
      webServerProcess?.stderr?.on('data', (data) => {
        console.error('Web server error:', data.toString());
      });
      
      webServerProcess?.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Web server exited with code ${code}`));
        }
      });
      
      setTimeout(callback, 5000);
    });
  }

  afterAll(async () => {
    // Stop processes
    if (webServerProcess) {
      webServerProcess.kill('SIGINT');
      webServerProcess = null;
    }
    if (coordinatorProcess) {
      coordinatorProcess.kill('SIGINT');
      coordinatorProcess = null;
    }
    
    // Close browser
    if (context) await context.close();
    if (browser) await browser.close();
    
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true });
    } catch (error) {
      console.error('Failed to clean up test directory:', error);
    }
  });

  beforeEach(async () => {
    // Navigate to test interface
    await page.goto(baseUrl);
    
    // Wait for page to load
    await page.waitForSelector('#start-coordinator');
    
    // Clear any previous logs
    await page.click('#clear-log');
  });

  afterEach(async () => {
    // Ensure coordinator is stopped after each test
    try {
      await page.click('#stop-coordinator');
      await page.waitForTimeout(500);
    } catch (error) {
      // Ignore if already stopped
    }
  });

  describe('Core Coordinator Functionality', () => {
    it('should initialize coordinator through web interface', async () => {
      // Given: The system is in a valid state
      // When: initialize coordinator through web interface
      // Then: The expected behavior occurs
      // Check initial status
      await page.click('#get-status');
      
      // Verify status shows stopped
      const statusElement = await page.locator('#coordinator-status');
      await expect(statusElement).toContainText('Status: Stopped');
      
      // Verify the status has correct CSS class
      await expect(statusElement).toHaveClass(/stopped/);
      
      // Check that event log shows status check
      const logElement = await page.locator('#event-log');
      await expect(logElement).toContainText('API GET /coordinator/status');
    });

    it('should start coordinator and create new session through UI', async () => {
      // Given: The system is in a valid state
      // When: start coordinator and create new session through UI
      // Then: The expected behavior occurs
      // Start coordinator via web interface
      await page.click('#start-coordinator');
      
      // Wait for status to update
      await page.waitForTimeout(1000);
      
      // Verify status shows running
      const statusElement = await page.locator('#coordinator-status');
      await expect(statusElement).toContainText('Status: Running');
      await expect(statusElement).toHaveClass(/running/);
      
      // Check event log for start command
      const logElement = await page.locator('#event-log');
      await expect(logElement).toContainText('API POST /coordinator/start');
      
      // Get status to verify session was created
      await page.click('#get-status');
      await page.waitForTimeout(500);
      await expect(logElement).toContainText("sessionId");
    });

    it('should create and resume session through UI', async () => {
      // Given: The system is in a valid state
      // When: create and resume session through UI
      // Then: The expected behavior occurs
      // Create a new session
      await page.click('#create-session');
      await page.waitForTimeout(500);
      
      // List sessions to get session ID
      await page.click('#list-sessions');
      await page.waitForTimeout(500);
      
      // Verify session was created
      const sessionInfo = await page.locator('#session-info');
      await expect(sessionInfo).toContainText('Sessions (1):');
      
      // Extract session ID from the display
      const sessionText = await sessionInfo.textContent();
      const sessionMatch = sessionText?.match(/session-\d+/);
      expect(sessionMatch).toBeTruthy();
      
      if (sessionMatch) {
        const sessionId = sessionMatch[0];
        
        // Enter session ID and resume
        await page.fill('#session-id', sessionId);
        await page.click('#resume-session');
        await page.waitForTimeout(500);
        
        // Verify resume was In Progress via event log
        const logElement = await page.locator('#event-log');
        await expect(logElement).toContainText(`sessions/${sessionId}/resume`);
      }
    });
  });

  describe('Task Management through UI', () => {
    it('should add tasks through web interface', async () => {
      // Given: The system is in a valid state
      // When: add tasks through web interface
      // Then: The expected behavior occurs
      // Add a task
      await page.fill('#task-title', 'UI Test Task');
      await page.selectOption('#task-priority', 'high');
      await page.click('#add-task');
      await page.waitForTimeout(500);
      
      // Verify task was added via API call log
      const logElement = await page.locator('#event-log');
      await expect(logElement).toContainText('API POST /tasks');
      
      // List tasks to verify
      await page.click('#list-tasks');
      await page.waitForTimeout(500);
      
      // Verify task appears in list
      const taskList = await page.locator('#task-list');
      await expect(taskList).toContainText('UI Test Task');
      await expect(taskList).toContainText('[high]');
    });
    
    it('should handle multiple task priorities', async () => {
      // Given: The system is in a valid state
      // When: handle multiple task priorities
      // Then: The expected behavior occurs
      // Add tasks with different priorities
      const priorities = ['low', 'medium', 'high', "critical"];
      
      for (const priority of priorities) {
        await page.fill('#task-title', `${priority} priority task`);
        await page.selectOption('#task-priority', priority);
        await page.click('#add-task');
        await page.waitForTimeout(200);
      }
      
      // List all tasks
      await page.click('#list-tasks');
      await page.waitForTimeout(500);
      
      // Verify all priorities are present
      const taskList = await page.locator('#task-list');
      for (const priority of priorities) {
        await expect(taskList).toContainText(`[${priority}]`);
      }
    });
  });
  
  describe('Session Management through UI', () => {
    it('should create multiple sessions', async () => {
      // Given: The system is in a valid state
      // When: create multiple sessions
      // Then: The expected behavior occurs
      // Create multiple sessions
      for (let i = 0; i < 3; i++) {
        await page.click('#create-session');
        await page.waitForTimeout(200);
      }
      
      // List sessions
      await page.click('#list-sessions');
      await page.waitForTimeout(500);
      
      // Verify multiple sessions exist
      const sessionInfo = await page.locator('#session-info');
      await expect(sessionInfo).toContainText('Sessions (3):');
    });
  });
  
  describe('Dangerous Mode through UI', () => {
    it('should toggle dangerous mode', async () => {
      // Given: The system is in a valid state
      // When: toggle dangerous mode
      // Then: The expected behavior occurs
      // Initially should be disabled
      const dangerousStatus = await page.locator('#dangerous-status');
      await expect(dangerousStatus).toContainText('Dangerous Mode: Disabled');
      
      // Enable dangerous mode
      await page.click('#enable-dangerous');
      await page.waitForTimeout(500);
      
      // Verify enabled
      await expect(dangerousStatus).toContainText('Dangerous Mode: Enabled');
      
      // Disable dangerous mode
      await page.click('#disable-dangerous');
      await page.waitForTimeout(500);
      
      // Verify disabled
      await expect(dangerousStatus).toContainText('Dangerous Mode: Disabled');
      
      // Check event log for API calls
      const logElement = await page.locator('#event-log');
      await expect(logElement).toContainText('API POST /coordinator/dangerous-mode');
    });
  });
  
  describe('🚨 Story: Integration Workflow Tests', () => {
    it('should handle In Progress coordinator workflow', async () => {
      // Given: The system is in a valid state
      // When: handle In Progress coordinator workflow
      // Then: The expected behavior occurs
      // Start coordinator
      await page.click('#start-coordinator');
      await page.waitForTimeout(500);
      
      // Add a task
      await page.fill('#task-title', 'Integration Test Task');
      await page.selectOption('#task-priority', 'high');
      await page.click('#add-task');
      await page.waitForTimeout(500);
      
      // Create session
      await page.click('#create-session');
      await page.waitForTimeout(500);
      
      // Enable dangerous mode
      await page.click('#enable-dangerous');
      await page.waitForTimeout(500);
      
      // Verify all operations In Progress In Progress
      const logElement = await page.locator('#event-log');
      await expect(logElement).toContainText('API POST /coordinator/start');
      await expect(logElement).toContainText('API POST /tasks');
      await expect(logElement).toContainText('API POST /sessions');
      await expect(logElement).toContainText('API POST /coordinator/dangerous-mode');
      
      // Verify UI states
      await expect(page.locator('#coordinator-status')).toHaveClass(/running/);
      await expect(page.locator('#dangerous-status')).toContainText('Enabled');
      
      // Stop coordinator
      await page.click('#stop-coordinator');
      await page.waitForTimeout(500);
      
      await expect(page.locator('#coordinator-status')).toHaveClass(/stopped/);
    });
  });
});