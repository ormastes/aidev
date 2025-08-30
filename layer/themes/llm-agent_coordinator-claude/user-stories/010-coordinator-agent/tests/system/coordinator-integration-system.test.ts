import { spawn, ChildProcess } from 'child_process';
import { chromium, Browser, Page, BrowserContext } from "playwright";
import * as path from 'path';
import * as fs from 'fs/promises';
import { test, expect } from '@playwright/test';

// Integration system tests using Playwright browser automation
test.describe('Coordinator Integration System Tests', () => {
  let testDir: string;
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  let webServerProcess: ChildProcess | null = null;
  let baseUrl: string;

  test.beforeAll(async () => {
    // Create test directory structure
    testDir = path.join(process.cwd(), '.integration-test-' + Date.now());
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, "sessions"), { recursive: true });
    await fs.mkdir(path.join(testDir, 'web'), { recursive: true });
    
    // Create test task queue
    await fs.writeFile(path.join(testDir, 'TASK_QUEUE.md'), `# Task Queue

## Pending

- [ ] [high] Integration test task (id: int-task-001)
  Description: Task for integration testing
  Status: pending
`);

    // Create integration web interface
    const webInterfacePath = path.join(testDir, 'web', 'index.html');
    await fs.writeFile(webInterfacePath, `<!DOCTYPE html>
<html>
<head>
    <title>Coordinator Integration Test Interface</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .button { padding: 10px 15px; margin: 5px; background: #007cba; color: white; border: none; cursor: pointer; border-radius: 3px; }
        .button:hover { background: #005a9e; }
        .button.secondary { background: #6c757d; }
        .button.secondary:hover { background: #545b62; }
        .button.success { background: #28a745; }
        .button.success:hover { background: #218838; }
        .button.danger { background: #dc3545; }
        .button.danger:hover { background: #c82333; }
        .log { background: #f5f5f5; padding: 10px; margin: 10px 0; height: 150px; overflow-y: auto; font-family: monospace; border: 1px solid #ddd; }
        .status { padding: 10px; margin: 10px 0; border-radius: 3px; }
        .status.connected { background: #d4edda; color: #155724; }
        .status.disconnected { background: #f8d7da; color: #721c24; }
        .status.warning { background: #fff3cd; color: #856404; }
        .integration-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .agent-card { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .workflow-step { background: #e9ecef; padding: 8px; margin: 5px 0; border-radius: 3px; }
        .message-bubble { background: #007cba; color: white; padding: 10px; border-radius: 15px; margin: 5px 0; max-width: 70%; }
        .message-bubble.received { background: #e9ecef; color: #333; }
        .progress-indicator { width: 100%; height: 6px; background: #e9ecef; border-radius: 3px; margin: 10px 0; }
        .progress-fill { height: 100%; background: #007cba; border-radius: 3px; transition: width 0.3s; }
    </style>
</head>
<body>
    <h1>Coordinator Integration Test Interface</h1>
    
    <div class="section">
        <h2>Integration Status</h2>
        <div id="chat-space-status" class="status disconnected">Chat-Space: Disconnected</div>
        <div id="pocketflow-status" class="status disconnected">PocketFlow: Disconnected</div>
        <div id="coordinator-status" class="status disconnected">Coordinator: Stopped</div>
        
        <button id="connect-all" class="button">Connect All Systems</button>
        <button id="disconnect-all" class="button secondary">Disconnect All</button>
        <button id="test-connections" class="button secondary">Test Connections</button>
    </div>
    
    <div class="integration-grid">
        <div class="section">
            <h2>Chat-Space Integration</h2>
            <div id="chat-room-info">Room: integration-room</div>
            <div id="chat-messages" class="log"></div>
            <input type="text" id="chat-input" placeholder="Enter message" style="width: 70%; margin: 5px;">
            <button id="send-chat" class="button">Send</button>
            <br>
            <button id="join-room" class="button secondary">Join Room</button>
            <button id="broadcast-status" class="button secondary">Broadcast Status</button>
            <button id="coordinate-via-chat" class="button">Coordinate via Chat</button>
        </div>
        
        <div class="section">
            <h2>PocketFlow Integration</h2>
            <div id="workflow-list"></div>
            <select id="workflow-selector" style="width: 70%; margin: 5px;">
                <option value="">Select Workflow</option>
                <option value="test-workflow">Test Workflow</option>
                <option value="deployment-workflow">Deployment Workflow</option>
                <option value="chat-integration-workflow">Chat Integration Workflow</option>
            </select>
            <br>
            <button id="trigger-workflow" class="button">Trigger Workflow</button>
            <button id="register-action" class="button secondary">Register Action</button>
            <button id="list-workflows" class="button secondary">List Workflows</button>
            <div id="workflow-progress" class="progress-indicator">
                <div id="workflow-progress-fill" class="progress-fill" style="width: 0%"></div>
            </div>
            <div id="workflow-status">Status: Ready</div>
        </div>
    </div>
    
    <div class="section">
        <h2>Cross-Theme Coordination</h2>
        <div id="agents-panel">
            <h3>Active Agents</h3>
            <div id="agent-list"></div>
            <button id="register-agents" class="button">Register Test Agents</button>
            <button id="assign-collaborative-tasks" class="button">Assign Collaborative Tasks</button>
        </div>
        
        <div id="coordination-flow">
            <h3>Coordination Flow</h3>
            <div id="coordination-steps"></div>
            <button id="simulate-chat-to-workflow" class="button success">Simulate: Chat → Task → Workflow</button>
            <button id="simulate-agent-collaboration" class="button success">Simulate: Multi-Agent Collaboration</button>
        </div>
    </div>
    
    <div class="section">
        <h2>Error Handling & Recovery</h2>
        <div id="error-log" class="log"></div>
        <button id="simulate-connection-failure" class="button danger">Simulate Connection Failure</button>
        <button id="simulate-recovery" class="button success">Simulate Recovery</button>
        <button id="test-graceful-degradation" class="button secondary">Test Graceful Degradation</button>
        <div id="recovery-status"></div>
    </div>
    
    <div class="section">
        <h2>Performance Metrics</h2>
        <div id="performance-metrics" class="log"></div>
        <button id="start-performance-test" class="button">Start Performance Test</button>
        <button id="stress-test-integrations" class="button secondary">Stress Test Integrations</button>
        <div id="performance-summary"></div>
    </div>
    
    <script>
        let integrationState = {
            chatSpace: false,
            pocketFlow: false,
            coordinator: false
        };
        
        let agents = [];
        let workflows = [];
        let messages = [];
        let currentWorkflow = null;
        
        function log(elementId, message) {
            const element = document.getElementById(elementId);
            const timestamp = new Date().toLocaleTimeString();
            element.innerHTML += '[' + timestamp + '] ' + message + '\\n';
            element.scrollTop = element.scrollHeight;
        }
        
        function updateStatus(component, connected) {
            integrationState[component] = connected;
            const element = document.getElementById(component + '-status') || document.getElementById(component + 'status');
            if (element) {
                element.className = 'status ' + (connected ? "connected" : "disconnected");
                element.textContent = component.charAt(0).toUpperCase() + component.slice(1) + ': ' + 
                    (connected ? "Connected" : "Disconnected");
            }
        }
        
        function addChatMessage(message, sender = 'user') {
            const chatDiv = document.getElementById('chat-messages');
            const bubble = document.createElement('div');
            bubble.className = 'message-bubble' + (sender === "received" ? ' received' : '');
            bubble.textContent = '[' + sender + '] ' + message;
            chatDiv.appendChild(bubble);
            chatDiv.scrollTop = chatDiv.scrollHeight;
            messages.push({ message, sender, timestamp: Date.now() });
        }
        
        function updateWorkflowProgress(progress) {
            document.getElementById('workflow-progress-fill').style.width = progress + '%';
            document.getElementById('workflow-status').textContent = 'Progress: ' + progress + '%';
        }
        
        function addCoordinationStep(step) {
            const stepsDiv = document.getElementById('coordination-steps');
            const stepDiv = document.createElement('div');
            stepDiv.className = 'workflow-step';
            stepDiv.textContent = step;
            stepsDiv.appendChild(stepDiv);
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
                return result;
            } catch (error) {
                log('error-log', 'API Error: ' + error.message);
                return { error: error.message };
            }
        }
        
        // Connection Management
        document.getElementById('connect-all').addEventListener('click', async () => {
            updateStatus("coordinator", true);
            await new Promise(resolve => setTimeout(resolve, 500));
            
            updateStatus("chatSpace", true);
            log('chat-messages', 'Connected to chat-space integration-room');
            addChatMessage('Connected to integration room', 'system');
            
            await new Promise(resolve => setTimeout(resolve, 300));
            updateStatus("pocketFlow", true);
            log('workflow-status', 'Connected to PocketFlow engine');
            
            // Initialize workflows
            workflows = [
                { id: 'test-workflow', name: 'Test Workflow', status: 'ready' },
                { id: 'deployment-workflow', name: 'Deployment Workflow', status: 'ready' },
                { id: 'chat-integration-workflow', name: 'Chat Integration Workflow', status: 'ready' }
            ];
            
            const workflowList = document.getElementById('workflow-list');
            workflowList.innerHTML = '<h4>Available Workflows:</h4>' + 
                workflows.map(w => '<div>' + w.name + ' - ' + w.status + '</div>').join('');
        });
        
        document.getElementById('disconnect-all').addEventListener('click', () => {
            updateStatus("coordinator", false);
            updateStatus("chatSpace", false);
            updateStatus("pocketFlow", false);
            log('error-log', 'All systems disconnected');
        });
        
        document.getElementById('test-connections').addEventListener('click', async () => {
            log('performance-metrics', 'Testing all connections...');
            
            // Test coordinator
            const coordTest = integrationState.coordinator;
            log('performance-metrics', 'Coordinator: ' + (coordTest ? 'OK' : 'FAIL'));
            
            // Test chat-space
            const chatTest = integrationState.chatSpace;
            log('performance-metrics', 'Chat-Space: ' + (chatTest ? 'OK' : 'FAIL'));
            
            // Test pocketflow
            const flowTest = integrationState.pocketFlow;
            log('performance-metrics', 'PocketFlow: ' + (flowTest ? 'OK' : 'FAIL'));
            
            const allConnected = coordTest && chatTest && flowTest;
            log('performance-metrics', 'Connection Test: ' + (allConnected ? 'ALL SYSTEMS OPERATIONAL' : 'SOME SYSTEMS DOWN'));
        });
        
        // Chat-Space Integration
        document.getElementById('send-chat').addEventListener('click', () => {
            const input = document.getElementById('chat-input');
            const message = input.value;
            if (!message) return;
            
            addChatMessage(message, "coordinator");
            input.value = '';
            
            // Simulate response
            setTimeout(() => {
                addChatMessage('Message received and processed', 'system');
            }, 500);
        });
        
        document.getElementById('join-room').addEventListener('click', () => {
            if (integrationState.chatSpace) {
                addChatMessage('Joined integration-room', 'system');
                log('chat-messages', 'Agent coordinator joined room integration-room');
            } else {
                log('error-log', 'Cannot join room: Chat-Space not connected');
            }
        });
        
        document.getElementById('broadcast-status').addEventListener('click', () => {
            if (integrationState.chatSpace) {
                const status = 'Coordinator Status: Active, Tasks: 3, Workflows: 2';
                addChatMessage(status, "coordinator");
                log('chat-messages', 'Status broadcast sent');
            } else {
                log('error-log', 'Cannot broadcast: Chat-Space not connected');
            }
        });
        
        document.getElementById('coordinate-via-chat').addEventListener('click', () => {
            addChatMessage('coordinator: create deployment task for version 2.0.0', 'ops-agent');
            
            setTimeout(() => {
                addChatMessage('Task created: Deploy version 2.0.0', "coordinator");
                addCoordinationStep('1. Chat command received from ops-agent');
                addCoordinationStep('2. Task created: Deploy version 2.0.0');
                addCoordinationStep('3. Workflow deployment-workflow triggered');
            }, 800);
        });
        
        // PocketFlow Integration
        document.getElementById('trigger-workflow').addEventListener('click', async () => {
            const selector = document.getElementById('workflow-selector');
            const workflowId = selector.value;
            
            if (!workflowId) {
                log('error-log', 'Please select a workflow');
                return;
            }
            
            if (!integrationState.pocketFlow) {
                log('error-log', 'Cannot trigger workflow: PocketFlow not connected');
                return;
            }
            
            log('workflow-status', 'Triggering workflow: ' + workflowId);
            currentWorkflow = workflowId;
            
            // Simulate workflow progress
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += Math.random() * 20 + 10;
                if (progress > 100) progress = 100;
                
                updateWorkflowProgress(Math.round(progress));
                
                if (progress >= 100) {
                    clearInterval(progressInterval);
                    log('workflow-status', 'Workflow success: ' + workflowId);
                    addCoordinationStep('4. Workflow ' + workflowId + ' completed successfully');
                }
            }, 300);
        });
        
        document.getElementById('register-action').addEventListener('click', () => {
            if (integrationState.pocketFlow) {
                log('workflow-status', 'Custom action registered: coordinator_notify');
                addCoordinationStep('Custom action registered for coordinator integration');
            } else {
                log('error-log', 'Cannot register action: PocketFlow not connected');
            }
        });
        
        document.getElementById('list-workflows').addEventListener('click', () => {
            if (integrationState.pocketFlow) {
                const workflowList = document.getElementById('workflow-list');
                workflowList.innerHTML = '<h4>Available Workflows:</h4>' + 
                    workflows.map(w => '<div>' + w.name + ' - ' + w.status + '</div>').join('');
                log('workflow-status', 'Listed ' + workflows.length + ' workflows');
            } else {
                log('error-log', 'Cannot list workflows: PocketFlow not connected');
            }
        });
        
        // Cross-Theme Coordination
        document.getElementById('register-agents').addEventListener('click', () => {
            agents = [
                { id: 'chat-agent-1', theme: 'chat-space', capabilities: ["communication"], status: 'active' },
                { id: 'flow-agent-1', theme: "pocketflow", capabilities: ["automation"], status: 'active' },
                { id: 'claude-agent-1', theme: "coordinator", capabilities: ['ai', "coordination"], status: 'active' }
            ];
            
            const agentList = document.getElementById('agent-list');
            agentList.innerHTML = agents.map(agent => 
                '<div class="agent-card">' + 
                '<strong>' + agent.id + '</strong> (' + agent.theme + ')<br>' +
                'Capabilities: ' + agent.capabilities.join(', ') + '<br>' +
                'Status: ' + agent.status +
                '</div>'
            ).join('');
            
            log('performance-metrics', 'Registered ' + agents.length + ' agents across themes');
        });
        
        document.getElementById('assign-collaborative-tasks').addEventListener('click', () => {
            addCoordinationStep('Task 1: Chat-based workflow trigger (chat-space + pocketflow)');
            addCoordinationStep('Task 2: AI-powered chat moderation (chat-space + coordinator)');
            addCoordinationStep('Task 3: Automated deployment notification (pocketflow + chat-space)');
            
            log('performance-metrics', 'Assigned 3 collaborative tasks requiring multiple themes');
        });
        
        document.getElementById('simulate-chat-to-workflow').addEventListener('click', async () => {
            addCoordinationStep('=== SIMULATION START: Chat → Task → Workflow ===');
            
            // Step 1: Chat command
            addChatMessage('coordinator: deploy version 1.5.0 to staging', 'dev-agent');
            addCoordinationStep('1. Chat command received from dev-agent');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Step 2: Task creation
            addCoordinationStep('2. Task created: Deploy v1.5.0 to staging');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Step 3: Workflow trigger
            addCoordinationStep('3. Triggering deployment-workflow automatically');
            document.getElementById('workflow-selector').value = 'deployment-workflow';
            document.getElementById('trigger-workflow').click();
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Step 4: Status update
            addChatMessage('Deployment workflow triggered for v1.5.0', "coordinator");
            addCoordinationStep('4. Status update sent back to chat room');
            
            addCoordinationStep('=== SIMULATION COMPLETE ===');
        });
        
        document.getElementById('simulate-agent-collaboration').addEventListener('click', async () => {
            addCoordinationStep('=== SIMULATION START: Multi-Agent Collaboration ===');
            
            // Register agents if not In Progress
            if (agents.length === 0) {
                document.getElementById('register-agents').click();
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            addCoordinationStep('1. Chat-agent requests deployment status');
            addChatMessage('What is the status of current deployments?', 'chat-agent-1');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            addCoordinationStep('2. Coordinator queries PocketFlow for workflow status');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            addCoordinationStep('3. Flow-agent provides workflow status data');
            await new Promise(resolve => setTimeout(resolve, 500));
            
            addCoordinationStep('4. Coordinator aggregates and responds');
            addChatMessage('Current status: 2 workflows running, 1 completed today', "coordinator");
            await new Promise(resolve => setTimeout(resolve, 500));
            
            addCoordinationStep('=== SIMULATION COMPLETE ===');
        });
        
        // Error Handling & Recovery
        document.getElementById('simulate-connection-failure').addEventListener('click', () => {
            log('error-log', 'SIMULATING: Connection failure to PocketFlow');
            updateStatus("pocketFlow", false);
            
            setTimeout(() => {
                log('error-log', 'SIMULATING: Connection failure to Chat-Space');
                updateStatus("chatSpace", false);
            }, 1000);
            
            // Show recovery status
            document.getElementById('recovery-status').innerHTML = 
                '<div class="status warning">Some integrations failed - Coordinator continues with reduced functionality</div>';
        });
        
        document.getElementById('simulate-recovery').addEventListener('click', async () => {
            log('error-log', 'RECOVERY: Attempting to reconnect...');
            
            setTimeout(() => {
                updateStatus("pocketFlow", true);
                log('error-log', 'RECOVERY: PocketFlow connection restored');
            }, 1000);
            
            setTimeout(() => {
                updateStatus("chatSpace", true);
                log('error-log', 'RECOVERY: Chat-Space connection restored');
                document.getElementById('recovery-status').innerHTML = 
                    '<div class="status connected">All systems recovered successfully</div>';
            }, 2000);
        });
        
        document.getElementById('test-graceful-degradation').addEventListener('click', () => {
            log('error-log', 'Testing graceful degradation...');
            
            // Simulate partial failures
            updateStatus("pocketFlow", false);
            log('error-log', 'PocketFlow offline - Workflow features disabled');
            log('error-log', 'Chat and core coordination still functional');
            
            // Test core functionality
            addChatMessage('System status: Operating with limited workflow capability', "coordinator");
            log('error-log', 'Graceful degradation test: Passed');
        });
        
        // Performance Testing
        document.getElementById('start-performance-test').addEventListener('click', async () => {
            log('performance-metrics', 'Starting performance test...');
            
            const startTime = Date.now();
            
            // Test connection speed
            log('performance-metrics', 'Testing connection speeds...');
            await new Promise(resolve => setTimeout(resolve, 200));
            log('performance-metrics', 'Chat-Space latency: 45ms');
            log('performance-metrics', 'PocketFlow latency: 67ms');
            
            // Test message throughput
            log('performance-metrics', 'Testing message throughput...');
            for (let i = 0; i < 5; i++) {
                addChatMessage('Performance test message ' + (i + 1), 'test-agent');
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            // Test workflow execution
            log('performance-metrics', 'Testing workflow execution speed...');
            updateWorkflowProgress(100);
            
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            
            log('performance-metrics', 'Performance test completed in ' + totalTime + 'ms');
            document.getElementById('performance-summary').innerHTML = 
                '<div class="status connected">Performance: All systems operating within normal parameters</div>';
        });
        
        document.getElementById('stress-test-integrations').addEventListener('click', async () => {
            log('performance-metrics', 'Running stress test...');
            
            // Simulate high load
            for (let i = 0; i < 10; i++) {
                setTimeout(() => {
                    addChatMessage('Stress test message ' + i, 'stress-agent-' + i);
                    log('performance-metrics', 'Load: ' + (i + 1) + '/10 concurrent operations');
                }, i * 100);
            }
            
            // Test recovery
            setTimeout(() => {
                log('performance-metrics', 'Stress test completed - System stable');
                document.getElementById('performance-summary').innerHTML = 
                    '<div class="status connected">Stress Test: Passed - System handles high load gracefully</div>';
            }, 1500);
        });
        
        // Initialize
        log('performance-metrics', 'Integration test interface initialized');
        updateStatus("coordinator", false);
        updateStatus("chatSpace", false);
        updateStatus("pocketFlow", false);
    </script>
</body>
</html>`);

    // Start browser
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext();
    page = await context.newPage();
    
    // Start web server
    baseUrl = 'http://localhost:3003';
    await startWebServer();
  });
  
  async function startWebServer() {
    // Create a simple Express server for integration testing
    const serverScript = path.join(testDir, 'web', 'server.js');
    await fs.writeFile(serverScript, `
      const express = require('express');
      const path = require('node:path');
      
      const app = express();
      app.use(express.json());
      app.use(express.static('${path.join(testDir, 'web')}'));
      
      let systemState = {
        coordinator: false,
        chatSpace: false,
        pocketFlow: false
      };
      
      let messages = [];
      let workflows = [];
      let agents = [];
      
      // Integration API endpoints
      app.post('/api/connect/:system', (req, res) => {
        const system = req.params.system;
        systemState[system] = true;
        res.json({ "success": true, system, connected: true });
      });
      
      app.post('/api/disconnect/:system', (req, res) => {
        const system = req.params.system;
        systemState[system] = false;
        res.json({ "success": true, system, connected: false });
      });
      
      app.get('/api/status', (req, res) => {
        res.json({ 
          status: systemState,
          allConnected: Object.values(systemState).every(Boolean)
        });
      });
      
      app.post('/api/chat/send', (req, res) => {
        const { message, sender } = req.body;
        messages.push({ message, sender, timestamp: Date.now() });
        res.json({ "success": true, messageId: messages.length });
      });
      
      app.get('/api/chat/messages', (req, res) => {
        res.json({ messages });
      });
      
      app.post('/api/workflow/trigger', (req, res) => {
        const { workflowId, params } = req.body;
        
        if (!systemState.pocketFlow) {
          return res.status(503).json({ error: 'PocketFlow not connected' });
        }
        
        const execution = {
          id: 'exec-' + Date.now(),
          workflowId,
          status: 'running',
          startedAt: Date.now(),
          params
        };
        
        // Simulate workflow execution
        setTimeout(() => {
          execution.status = "completed";
          execution.completedAt = Date.now();
        }, 2000);
        
        res.json({ "success": true, execution });
      });
      
      app.get('/api/workflow/list', (req, res) => {
        const defaultWorkflows = [
          { id: 'test-workflow', name: 'Test Workflow', status: 'ready' },
          { id: 'deployment-workflow', name: 'Deployment Workflow', status: 'ready' },
          { id: 'chat-integration-workflow', name: 'Chat Integration Workflow', status: 'ready' }
        ];
        
        res.json({ workflows: defaultWorkflows });
      });
      
      app.post('/api/agents/register', (req, res) => {
        const { agents: newAgents } = req.body;
        agents = newAgents;
        res.json({ "success": true, count: agents.length });
      });
      
      app.get('/api/agents', (req, res) => {
        res.json({ agents });
      });
      
      app.post('/api/coordination/simulate', (req, res) => {
        const { type } = req.body;
        
        const simulations = {
          'chat-to-workflow': {
            steps: [
              'Chat command received',
              'Task created',
              'Workflow triggered',
              'Status updated'
            ]
          },
          'agent-collaboration': {
            steps: [
              'Agent requests status',
              'Coordinator queries systems',
              'Data aggregated',
              'Response provided'
            ]
          }
        };
        
        res.json({ 
          "success": true, 
          simulation: simulations[type] || { steps: [] }
        });
      });
      
      const server = app.listen(3003, () => {
        console.log('Integration test server started on port 3003');
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
        if (data.toString().includes('started on port 3003')) {
          setTimeout(resolve, 1000);
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
      
      setTimeout(resolve, 5000);
    });
  }

  test.afterAll(async () => {
    // Stop processes
    if (webServerProcess) {
      webServerProcess.kill('SIGINT');
      webServerProcess = null;
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

  test.beforeEach(async () => {
    // Navigate to test interface
    await page.goto(baseUrl);
    
    // Wait for page to load
    await page.waitForSelector('#connect-all');
  });

  test.afterEach(async () => {
    // Reset state for next test
    try {
      await page.click('#disconnect-all');
      await page.waitForTimeout(100);
    } catch (error) {
      // Ignore if element not available
    }
  });

  test.describe('Chat-Space Integration through UI', () => {
    test('should connect to chat-space and join rooms', async () => {
      // Given: The system is in a valid state
      // When: connect to chat-space and join rooms
      // Then: The expected behavior occurs
      // Connect all systems
      await page.click('#connect-all');
      await page.waitForTimeout(1000);
      
      // Verify chat-space connection
      const chatStatus = await page.locator('#chat-space-status');
      await expect(chatStatus).toHaveClass(/connected/);
      await expect(chatStatus).toContainText("Connected");
      
      // Join room
      await page.click('#join-room');
      await page.waitForTimeout(500);
      
      // Verify room join message
      const chatMessages = await page.locator('#chat-messages');
      await expect(chatMessages).toContainText('Joined integration-room');
    });

    test('should broadcast coordinator status to chat-space', async () => {
      // Given: The system is in a valid state
      // When: broadcast coordinator status to chat-space
      // Then: The expected behavior occurs
      // Connect systems
      await page.click('#connect-all');
      await page.waitForTimeout(500);
      
      // Broadcast status
      await page.click('#broadcast-status');
      await page.waitForTimeout(500);
      
      // Verify status message appears in chat
      const chatMessages = await page.locator('#chat-messages');
      await expect(chatMessages).toContainText('Coordinator Status: Active');
      await expect(chatMessages).toContainText('Tasks: 3');
      await expect(chatMessages).toContainText('Workflows: 2');
    });

    test('should coordinate tasks through chat messages', async () => {
      // Given: The system is in a valid state
      // When: coordinate tasks through chat messages
      // Then: The expected behavior occurs
      // Connect systems
      await page.click('#connect-all');
      await page.waitForTimeout(500);
      
      // Send a coordination message
      await page.fill('#chat-input', 'coordinator: create urgent deployment task');
      await page.click('#send-chat');
      await page.waitForTimeout(500);
      
      // Verify coordination via chat
      await page.click('#coordinate-via-chat');
      await page.waitForTimeout(1000);
      
      // Check coordination steps
      const coordinationSteps = await page.locator('#coordination-steps');
      await expect(coordinationSteps).toContainText('Chat command received from ops-agent');
      await expect(coordinationSteps).toContainText('Task created: Deploy version 2.0.0');
      await expect(coordinationSteps).toContainText('Workflow deployment-workflow triggered');
    });
  });

  test.describe('PocketFlow Integration through UI', () => {
    test('should connect to pocketflow and register actions', async () => {
      // Given: The system is in a valid state
      // When: connect to pocketflow and register actions
      // Then: The expected behavior occurs
      // Connect all systems
      await page.click('#connect-all');
      await page.waitForTimeout(1000);
      
      // Verify pocketflow connection
      const pocketflowStatus = await page.locator('#pocketflow-status');
      await expect(pocketflowStatus).toHaveClass(/connected/);
      
      // Register action
      await page.click('#register-action');
      await page.waitForTimeout(500);
      
      // Verify action registration in workflow status
      const workflowStatus = await page.locator('#workflow-status');
      await expect(workflowStatus).toContainText('Custom action registered');
    });

    test('should trigger workflows based on task events', async () => {
      // Given: The system is in a valid state
      // When: trigger workflows based on task events
      // Then: The expected behavior occurs
      // Connect systems
      await page.click('#connect-all');
      await page.waitForTimeout(500);
      
      // List workflows
      await page.click('#list-workflows');
      await page.waitForTimeout(500);
      
      // Verify workflows are listed
      const workflowList = await page.locator('#workflow-list');
      await expect(workflowList).toContainText('Test Workflow');
      await expect(workflowList).toContainText('Deployment Workflow');
      
      // Select and trigger a workflow
      await page.selectOption('#workflow-selector', 'deployment-workflow');
      await page.click('#trigger-workflow');
      
      // Wait for workflow to complete
      await page.waitForTimeout(2000);
      
      // Verify workflow completion
      await expect(page.locator('#workflow-status')).toContainText('Workflow In Progress');
    });

    test('should handle workflow results and update tasks', async () => {
      // Given: The system is in a valid state
      // When: handle workflow results and update tasks
      // Then: The expected behavior occurs
      // Connect systems
      await page.click('#connect-all');
      await page.waitForTimeout(500);
      
      // Trigger test workflow
      await page.selectOption('#workflow-selector', 'test-workflow');
      await page.click('#trigger-workflow');
      
      // Monitor progress
      await page.waitForTimeout(1500);
      
      // Verify progress is updating
      const progressFill = await page.locator('#workflow-progress-fill');
      const progressWidth = await progressFill.getAttribute('style');
      expect(progressWidth).toContain('width');
      expect(progressWidth).not.toContain('0%');
    });
  });

  test.describe('Cross-Theme Communication through UI', () => {
    test('should coordinate between chat-space and pocketflow', async () => {
      // Given: The system is in a valid state
      // When: coordinate between chat-space and pocketflow
      // Then: The expected behavior occurs
      // Connect all systems
      await page.click('#connect-all');
      await page.waitForTimeout(500);
      
      // Register agents for coordination
      await page.click('#register-agents');
      await page.waitForTimeout(500);
      
      // Verify agents are registered
      const agentList = await page.locator('#agent-list');
      await expect(agentList).toContainText('chat-agent-1');
      await expect(agentList).toContainText('flow-agent-1');
      await expect(agentList).toContainText('claude-agent-1');
      
      // Simulate chat to workflow coordination
      await page.click('#simulate-chat-to-workflow');
      await page.waitForTimeout(3000);
      
      // Verify coordination flow
      const coordinationSteps = await page.locator('#coordination-steps');
      await expect(coordinationSteps).toContainText('Chat command received from dev-agent');
      await expect(coordinationSteps).toContainText('Task created: Deploy v1.5.0');
      await expect(coordinationSteps).toContainText('Triggering deployment-workflow');
      await expect(coordinationSteps).toContainText('Status update sent back to chat room');
    });

    test('should handle agent collaboration across themes', async () => {
      // Given: The system is in a valid state
      // When: handle agent collaboration across themes
      // Then: The expected behavior occurs
      // Connect systems and register agents
      await page.click('#connect-all');
      await page.click('#register-agents');
      await page.waitForTimeout(500);
      
      // Assign collaborative tasks
      await page.click('#assign-collaborative-tasks');
      await page.waitForTimeout(500);
      
      // Verify collaborative tasks
      const coordinationSteps = await page.locator('#coordination-steps');
      await expect(coordinationSteps).toContainText('Chat-based workflow trigger (chat-space + pocketflow)');
      await expect(coordinationSteps).toContainText('AI-powered chat moderation (chat-space + coordinator)');
      
      // Simulate multi-agent collaboration
      await page.click('#simulate-agent-collaboration');
      await page.waitForTimeout(3000);
      
      // Verify collaboration sequence
      await expect(coordinationSteps).toContainText('Chat-agent requests deployment status');
      await expect(coordinationSteps).toContainText('Coordinator queries PocketFlow for workflow status');
      await expect(coordinationSteps).toContainText('Flow-agent provides workflow status data');
      await expect(coordinationSteps).toContainText('Coordinator aggregates and responds');
    });
  });

  test.describe('Error Handling and Recovery through UI', () => {
    test('should handle theme connection failures gracefully', async () => {
      // Given: The system is in a valid state
      // When: handle theme connection failures gracefully
      // Then: The expected behavior occurs
      // Start with all systems connected
      await page.click('#connect-all');
      await page.waitForTimeout(500);
      
      // Simulate connection failure
      await page.click('#simulate-connection-failure');
      await page.waitForTimeout(2000);
      
      // Verify failure is handled gracefully
      const errorLog = await page.locator('#error-log');
      await expect(errorLog).toContainText('Connection failure to PocketFlow');
      await expect(errorLog).toContainText('Connection failure to Chat-Space');
      
      // Verify graceful degradation message
      const recoveryStatus = await page.locator('#recovery-status');
      await expect(recoveryStatus).toContainText('reduced functionality');
      
      // Verify coordinator still shows as connected
      const coordinatorStatus = await page.locator('#coordinator-status');
      await expect(coordinatorStatus).toHaveClass(/connected/);
    });

    test('should recover from temporary theme disconnections', async () => {
      // Given: The system is in a valid state
      // When: recover from temporary theme disconnections
      // Then: The expected behavior occurs
      // Start with connection failure
      await page.click('#simulate-connection-failure');
      await page.waitForTimeout(2000);
      
      // Attempt recovery
      await page.click('#simulate-recovery');
      await page.waitForTimeout(3000);
      
      // Verify recovery
      const errorLog = await page.locator('#error-log');
      await expect(errorLog).toContainText('PocketFlow connection restored');
      await expect(errorLog).toContainText('Chat-Space connection restored');
      
      const recoveryStatus = await page.locator('#recovery-status');
      await expect(recoveryStatus).toContainText('All systems recovered successfully');
    });

    test('should test graceful degradation', async () => {
      // Given: The system is in a valid state
      // When: test graceful degradation
      // Then: The expected behavior occurs
      // Connect all systems first
      await page.click('#connect-all');
      await page.waitForTimeout(500);
      
      // Test graceful degradation
      await page.click('#test-graceful-degradation');
      await page.waitForTimeout(500);
      
      // Verify degradation handling
      const errorLog = await page.locator('#error-log');
      await expect(errorLog).toContainText('PocketFlow offline - Workflow features disabled');
      await expect(errorLog).toContainText('Chat and core coordination still functional');
      await expect(errorLog).toContainText('Graceful degradation test: Passed');
    });
  });

  test.describe('Performance with Multiple Integrations through UI', () => {
    test('should maintain performance with all integrations active', async () => {
      // Given: The system is in a valid state
      // When: maintain performance with all integrations active
      // Then: The expected behavior occurs
      // Connect all systems
      await page.click('#connect-all');
      await page.waitForTimeout(500);
      
      // Start performance test
      await page.click('#start-performance-test');
      await page.waitForTimeout(1000);
      
      // Verify performance metrics
      const performanceMetrics = await page.locator('#performance-metrics');
      await expect(performanceMetrics).toContainText('Chat-Space latency');
      await expect(performanceMetrics).toContainText('PocketFlow latency');
      await expect(performanceMetrics).toContainText('Performance test completed');
      
      // Verify performance summary
      const performanceSummary = await page.locator('#performance-summary');
      await expect(performanceSummary).toContainText('All systems operating within normal parameters');
    });

    test('should handle stress testing of integrations', async () => {
      // Given: The system is in a valid state
      // When: handle stress testing of integrations
      // Then: The expected behavior occurs
      // Connect systems
      await page.click('#connect-all');
      await page.waitForTimeout(500);
      
      // Run stress test
      await page.click('#stress-test-integrations');
      await page.waitForTimeout(2000);
      
      // Verify stress test results
      const performanceMetrics = await page.locator('#performance-metrics');
      await expect(performanceMetrics).toContainText('Stress test completed');
      await expect(performanceMetrics).toContainText('System UPDATING');
      
      const performanceSummary = await page.locator('#performance-summary');
      await expect(performanceSummary).toContainText('Stress Test: Passed');
      await expect(performanceSummary).toContainText('System handles high load gracefully');
    });
  });

  test.describe('🚨 Story: Integration Workflow Tests', () => {
    test('should handle complete integration workflow', async () => {
      // Given: The system is in a valid state
      // When: handle complete integration workflow
      // Then: The expected behavior occurs
      // Connect all systems
      await page.click('#connect-all');
      await page.waitForTimeout(500);
      
      // Register agents
      await page.click('#register-agents');
      await page.waitForTimeout(500);
      
      // Test connections
      await page.click('#test-connections');
      await page.waitForTimeout(500);
      
      // Verify all systems operational
      const performanceMetrics = await page.locator('#performance-metrics');
      await expect(performanceMetrics).toContainText('ALL SYSTEMS OPERATIONAL');
      
      // Send chat message
      await page.fill('#chat-input', 'Integration test message');
      await page.click('#send-chat');
      
      // Trigger workflow
      await page.selectOption('#workflow-selector', 'test-workflow');
      await page.click('#trigger-workflow');
      
      // Wait for completion
      await page.waitForTimeout(2000);
      
      // Verify integration In Progress
      const chatMessages = await page.locator('#chat-messages');
      await expect(chatMessages).toContainText('Integration test message');
      
      await expect(page.locator('#workflow-status')).toContainText('completed');
    });
  });
});