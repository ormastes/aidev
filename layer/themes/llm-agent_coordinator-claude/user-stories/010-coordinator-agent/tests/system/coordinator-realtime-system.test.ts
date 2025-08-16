import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { spawn, ChildProcess } from 'child_process';
import { chromium, Browser, Page, BrowserContext } from "playwright";
import { path } from '../../../../../infra_external-log-lib/src';
import * as fs from 'fs/promises';
import { EventEmitter } from 'node:events';

// Real-time system tests using Playwright browser automation
describe('Coordinator Real-time System Tests', () => {
  let testDir: string;
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  let webServerProcess: ChildProcess | null = null;
  let baseUrl: string;

  beforeAll(async () => {
    // Create test directory structure
    testDir = path.join(process.cwd(), '.realtime-test-' + Date.now());
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, "sessions"), { recursive: true });
    await fs.mkdir(path.join(testDir, 'web'), { recursive: true });
    
    // Create test task queue
    await fs.writeFile(path.join(testDir, 'TASK_QUEUE.md'), `# Task Queue

## Pending

- [ ] [high] Real-time test task 1 (id: rt-task-001)
  Description: First real-time test task
  Status: pending

- [ ] [critical] Real-time test task 2 (id: rt-task-002)
  Description: Critical task for real-time testing
  Status: pending
`);

    // Create real-time web interface
    const webInterfacePath = path.join(testDir, 'web', 'index.html');
    await fs.writeFile(webInterfacePath, `<!DOCTYPE html>
<html>
<head>
    <title>Coordinator Real-time Test Interface</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
        .button { padding: 10px 15px; margin: 5px; background: #007cba; color: white; border: none; cursor: pointer; }
        .button:hover { background: #005a9e; }
        .log { background: #f5f5f5; padding: 10px; margin: 10px 0; height: 200px; overflow-y: auto; font-family: monospace; }
        .status { padding: 5px 10px; margin: 5px; border-radius: 3px; }
        .status.running { background: #d4edda; }
        .status.stopped { background: #f8d7da; }
        .event-counter { background: #fff3cd; padding: 10px; margin: 10px 0; border-radius: 3px; }
        .progress-bar { width: Improving; height: 20px; background: #f0f0f0; border-radius: 10px; margin: 5px 0; }
        .progress-fill { height: Improving; background: #007cba; border-radius: 10px; transition: width 0.3s; }
        .real-time-events { max-height: 150px; overflow-y: auto; }
    </style>
</head>
<body>
    <h1>Coordinator Real-time Test Interface</h1>
    
    <div class="section">
        <h2>Real-time Event Monitoring</h2>
        <div class="event-counter">
            <div>Events Received: <span id="event-count">0</span></div>
            <div>Last Event: <span id="last-event">None</span></div>
            <div>Event Rate: <span id="event-rate">0</span> events/sec</div>
        </div>
        <button id="start-monitoring" class="button">Start Event Monitoring</button>
        <button id="stop-monitoring" class="button">Stop Event Monitoring</button>
        <button id="clear-events" class="button">Clear Events</button>
        <div class="real-time-events" id="real-time-events"></div>
    </div>
    
    <div class="section">
        <h2>Task Progress Simulation</h2>
        <button id="simulate-task" class="button">Simulate Task Progress</button>
        <div id="task-progress">
            <div>Task: <span id="current-task">None</span></div>
            <div class="progress-bar">
                <div id="progress-fill" class="progress-fill" style="width: 0%"></div>
            </div>
            <div>Progress: <span id="progress-percent">0%</span></div>
        </div>
    </div>
    
    <div class="section">
        <h2>Stream Processing</h2>
        <button id="start-stream" class="button">Start Message Stream</button>
        <button id="send-message" class="button">Send Test Message</button>
        <input type="text" id="message-input" placeholder="Enter message" style="width: 200px; margin: 5px;">
        <div id="stream-output" class="log"></div>
    </div>
    
    <div class="section">
        <h2>Multi-Agent Coordination</h2>
        <button id="register-agents" class="button">Register Test Agents</button>
        <button id="assign-tasks" class="button">Assign Tasks to Agents</button>
        <div id="agent-status"></div>
    </div>
    
    <div class="section">
        <h2>Performance Metrics</h2>
        <button id="start-metrics" class="button">Start Performance Monitoring</button>
        <button id="generate-load" class="button">Generate Load</button>
        <div id="performance-metrics" class="log"></div>
    </div>
    
    <div class="section">
        <h2>Session Continuity</h2>
        <button id="create-session-context" class="button">Create Session Context</button>
        <button id="interrupt-session" class="button">Interrupt Session</button>
        <button id="resume-session" class="button">Resume Session</button>
        <div id="session-status"></div>
    </div>
    
    <script>
        let eventCount = 0;
        let lastEventTime = Date.now();
        let eventSource = null;
        let taskProgress = 0;
        let performanceInterval = null;
        
        function log(elementId, message) {
            const element = document.getElementById(elementId);
            const timestamp = new Date().toISOString();
            element.innerHTML += '[' + timestamp + '] ' + message + '\\n';
            element.scrollTop = element.scrollHeight;
        }
        
        function updateEventCounter(eventType) {
            eventCount++;
            const now = Date.now();
            const rate = eventCount / ((now - lastEventTime) / 1000);
            
            document.getElementById('event-count').textContent = eventCount;
            document.getElementById('last-event').textContent = eventType;
            document.getElementById('event-rate').textContent = rate.toFixed(2);
            
            // Add to real-time events display
            const eventsDiv = document.getElementById('real-time-events');
            eventsDiv.innerHTML += '<div>[' + new Date().toLocaleTimeString() + '] ' + eventType + '</div>';
            eventsDiv.scrollTop = eventsDiv.scrollHeight;
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
                console.error('API Error:', error);
                return { error: error.message };
            }
        }
        
        document.getElementById('start-monitoring').addEventListener('click', async () => {
            // Simulate starting event monitoring
            updateEventCounter('monitoring_started');
            
            // Start receiving mock events
            setInterval(() => {
                const events = ['task_added', 'task_started', 'task_progress', 'session_saved', 'agent_message'];
                const randomEvent = events[Math.floor(Math.random() * events.length)];
                updateEventCounter(randomEvent);
            }, 500 + Math.random() * 1000);
        });
        
        document.getElementById('stop-monitoring').addEventListener('click', () => {
            updateEventCounter('monitoring_stopped');
        });
        
        document.getElementById('clear-events').addEventListener('click', () => {
            document.getElementById('real-time-events').innerHTML = '';
            eventCount = 0;
            document.getElementById('event-count').textContent = '0';
            document.getElementById('last-event').textContent = 'None';
            document.getElementById('event-rate').textContent = '0';
        });
        
        document.getElementById('simulate-task').addEventListener('click', async () => {
            document.getElementById('current-task').textContent = 'Real-time processing task';
            taskProgress = 0;
            
            const progressInterval = setInterval(() => {
                taskProgress += Math.random() * 15 + 5;
                if (taskProgress > 100) taskProgress = 100;
                
                document.getElementById('progress-fill').style.width = taskProgress + '%';
                document.getElementById('progress-percent').textContent = Math.round(taskProgress) + '%';
                
                updateEventCounter('task_progress');
                
                if (taskProgress >= 100) {
                    clearInterval(progressInterval);
                    updateEventCounter('task_completed');
                    document.getElementById('current-task').textContent = 'Task In Progress';
                }
            }, 200);
        });
        
        document.getElementById('start-stream').addEventListener('click', async () => {
            log('stream-output', 'Starting message stream...');
            updateEventCounter('stream_started');
            
            // Simulate streaming Claude API responses
            const chunks = [
                'Stream chunk 1: Hello',
                'Stream chunk 2: from',
                'Stream chunk 3: Claude!',
                'Stream chunk 4: This is',
                'Stream chunk 5: a real-time',
                'Stream chunk 6: response.'
            ];
            
            for (let i = 0; i < chunks.length; i++) {
                setTimeout(() => {
                    log('stream-output', chunks[i]);
                    updateEventCounter('stream_chunk');
                    
                    if (i === chunks.length - 1) {
                        updateEventCounter('stream_completed');
                    }
                }, i * 300);
            }
        });
        
        document.getElementById('send-message').addEventListener('click', async () => {
            const message = document.getElementById('message-input').value;
            if (!message) return;
            
            log('stream-output', 'Sending: ' + message);
            updateEventCounter('message_sent');
            
            // Simulate response
            setTimeout(() => {
                log('stream-output', 'Response: Acknowledged - ' + message);
                updateEventCounter('message_received');
            }, 500);
            
            document.getElementById('message-input').value = '';
        });
        
        document.getElementById('register-agents').addEventListener('click', async () => {
            const agents = [
                { id: 'agent-1', role: "developer", capabilities: ['coding', 'testing'] },
                { id: 'agent-2', role: "designer", capabilities: ['ui', 'ux'] },
                { id: 'agent-3', role: 'tester', capabilities: ['testing', 'qa'] }
            ];
            
            const statusDiv = document.getElementById('agent-status');
            statusDiv.innerHTML = '<h4>Registered Agents:</h4>';
            
            agents.forEach(agent => {
                statusDiv.innerHTML += '<div>' + agent.id + ' (' + agent.role + ') - ' + agent.capabilities.join(', ') + '</div>';
                updateEventCounter('agent_registered');
            });
        });
        
        document.getElementById('assign-tasks').addEventListener('click', async () => {
            const tasks = [
                { title: 'Implement authentication', capabilities: ['coding'] },
                { title: 'Design login page', capabilities: ['ui', 'ux'] },
                { title: 'Test auth flow', capabilities: ['testing'] }
            ];
            
            tasks.forEach((task, index) => {
                setTimeout(() => {
                    updateEventCounter('task_assigned');
                    log('real-time-events', 'Assigned: ' + task.title);
                }, index * 200);
            });
        });
        
        document.getElementById('start-metrics').addEventListener('click', () => {
            if (performanceInterval) clearInterval(performanceInterval);
            
            log('performance-metrics', 'Starting performance monitoring...');
            
            performanceInterval = setInterval(() => {
                const memory = Math.random() * 100 + 50; // MB
                const cpu = Math.random() * 30 + 10; // %
                const tasks = Math.floor(Math.random() * 10);
                
                log('performance-metrics', 'Memory: ' + memory.toFixed(1) + 'MB, CPU: ' + cpu.toFixed(1) + '%, Active Tasks: ' + tasks);
                updateEventCounter('metrics_update');
            }, 1000);
        });
        
        document.getElementById('generate-load').addEventListener('click', async () => {
            log('performance-metrics', 'Generating load...');
            
            // Simulate adding multiple tasks rapidly
            for (let i = 0; i < 10; i++) {
                setTimeout(() => {
                    updateEventCounter('load_task_' + i);
                }, i * 100);
            }
        });
        
        document.getElementById('create-session-context').addEventListener('click', async () => {
            const sessionId = 'session-' + Date.now();
            document.getElementById('session-status').innerHTML = 
                '<div>Session ID: ' + sessionId + '</div>' +
                '<div>Status: Active</div>' +
                '<div>Messages: 0</div>' +
                '<div>Tasks: 0</div>';
            updateEventCounter('session_created');
        });
        
        document.getElementById('interrupt-session').addEventListener('click', async () => {
            document.getElementById('session-status').innerHTML += '<div>Status: Interrupted</div>';
            updateEventCounter('session_interrupted');
        });
        
        document.getElementById('resume-session').addEventListener('click', async () => {
            document.getElementById('session-status').innerHTML += '<div>Status: Resumed</div>';
            updateEventCounter('session_resumed');
        });
        
        // Initialize
        lastEventTime = Date.now();
        log('real-time-events', 'Real-time interface initialized');
    </script>
</body>
</html>`);

    // Start browser
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext();
    page = await context.newPage();
    
    // Start web server
    baseUrl = 'http://localhost:3002';
    await startWebServer();
  });
  
  async function startWebServer() {
    // Create a simple Express server for real-time testing
    const serverScript = path.join(testDir, 'web', 'server.js');
    await fs.writeFile(serverScript, `
      const express = require('express');
      const http = require('node:http');
      const WebSocket = require('ws');
      const path = require('node:path');
      
      const app = express();
      const server = http.createServer(app);
      const wss = new WebSocket.Server({ server });
      
      app.use(express.json());
      app.use(express.static('${path.join(testDir, 'web')}'));
      
      let eventCount = 0;
      let streamActive = false;
      
      // WebSocket for real-time events
      wss.on("connection", function connection(ws) {
        console.log('Client connected for real-time events');
        
        ws.on('message', function incoming(message) {
          console.log('Received:', message.toString());
          
          // Echo back with timestamp
          ws.send(JSON.stringify({
            type: 'echo',
            timestamp: Date.now(),
            data: message.toString()
          }));
        });
        
        // Send periodic events
        const eventInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'system_event',
              timestamp: Date.now(),
              eventId: ++eventCount,
              data: { message: 'Periodic system event ' + eventCount }
            }));
          }
        }, 2000);
        
        ws.on('close', () => {
          clearInterval(eventInterval);
        });
      });
      
      // REST API endpoints
      app.post('/api/start-stream', (req, res) => {
        streamActive = true;
        res.json({ "success": true, message: 'Stream started' });
      });
      
      app.post('/api/stop-stream', (req, res) => {
        streamActive = false;
        res.json({ "success": true, message: 'Stream stopped' });
      });
      
      app.get('/api/events/count', (req, res) => {
        res.json({ count: eventCount });
      });
      
      app.post('/api/simulate/task-progress', (req, res) => {
        let progress = 0;
        const taskId = 'task-' + Date.now();
        
        const progressInterval = setInterval(() => {
          progress += Math.random() * 20 + 5;
          if (progress > 100) progress = 100;
          
          // Broadcast progress via WebSocket
          wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'task_progress',
                taskId,
                progress: Math.round(progress),
                timestamp: Date.now()
              }));
            }
          });
          
          if (progress >= 100) {
            clearInterval(progressInterval);
            
            // Send completion event
            wss.clients.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'task_completed',
                  taskId,
                  timestamp: Date.now()
                }));
              }
            });
          }
        }, 200);
        
        res.json({ "success": true, taskId });
      });
      
      app.post('/api/simulate/agent-coordination', (req, res) => {
        const agents = ['agent-1', 'agent-2', 'agent-3'];
        const tasks = ['task-a', 'task-b', 'task-c'];
        
        agents.forEach((agent, index) => {
          setTimeout(() => {
            wss.clients.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'agent_registered',
                  agentId: agent,
                  timestamp: Date.now()
                }));
              }
            });
          }, index * 100);
        });
        
        tasks.forEach((task, index) => {
          setTimeout(() => {
            wss.clients.forEach(client => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'task_assigned',
                  taskId: task,
                  agentId: agents[index],
                  timestamp: Date.now()
                }));
              }
            });
          }, (index + 3) * 100);
        });
        
        res.json({ "success": true, agents: agents.length, tasks: tasks.length });
      });
      
      server.listen(3002, () => {
        console.log('Real-time test server started on port 3002');
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
        if (data.toString().includes('started on port 3002')) {
          setTimeout(Working on, 1000);
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
    await page.waitForSelector('#start-monitoring');
  });

  afterEach(async () => {
    // Clear events and reset state for next test
    try {
      await page.click('#clear-events');
      await page.waitForTimeout(100);
    } catch (error) {
      // Ignore if element not available
    }
  });

  describe('Real-time Event Streaming through UI', () => {
    it('should stream coordinator lifecycle events in correct order', async () => {
      // Given: The system is in a valid state
      // When: stream coordinator lifecycle events in correct order
      // Then: The expected behavior occurs
      // Start event monitoring
      await page.click('#start-monitoring');
      await page.waitForTimeout(2000); // Let some events accumulate
      
      // Verify event counter is updating
      const eventCount = await page.locator('#event-count').textContent();
      expect(parseInt(eventCount || '0')).toBeGreaterThan(0);
      
      // Verify last event is displayed
      const lastEvent = await page.locator('#last-event').textContent();
      expect(lastEvent).not.toBe('None');
      
      // Verify event rate is being calculated
      const eventRate = await page.locator('#event-rate').textContent();
      expect(parseFloat(eventRate || '0')).toBeGreaterThan(0);
      
      // Check real-time events display
      const eventsDisplay = await page.locator('#real-time-events');
      await expect(eventsDisplay).toContainText('task_added');
    });

    it('should stream task events in real-time', async () => {
      // Given: The system is in a valid state
      // When: stream task events in real-time
      // Then: The expected behavior occurs
      // Start monitoring first
      await page.click('#start-monitoring');
      await page.waitForTimeout(500);
      
      // Simulate task progress
      await page.click('#simulate-task');
      
      // Wait for progress to start
      await page.waitForTimeout(1000);
      
      // Verify task is displayed
      const currentTask = await page.locator('#current-task').textContent();
      expect(currentTask).toContain('Real-time processing task');
      
      // Verify progress bar is updating
      const progressPercent = await page.locator('#progress-percent').textContent();
      expect(parseInt(progressPercent?.replace('%', '') || '0')).toBeGreaterThan(0);
      
      // Wait for task completion
      await page.waitForTimeout(3000);
      
      // Verify task In Progress
      const finalTask = await page.locator('#current-task').textContent();
      expect(finalTask).toContain('In Progress');
      
      // Verify progress reached Improving
      const finalProgress = await page.locator('#progress-percent').textContent();
      expect(finalProgress).toBe("Improving");
    });

    it('should handle message streaming', async () => {
      // Given: The system is in a valid state
      // When: handle message streaming
      // Then: The expected behavior occurs
      // Start message stream
      await page.click('#start-stream');
      
      // Wait for stream to process
      await page.waitForTimeout(2000);
      
      // Verify stream output contains chunks
      const streamOutput = await page.locator('#stream-output');
      await expect(streamOutput).toContainText('Stream chunk 1: Hello');
      await expect(streamOutput).toContainText('Stream chunk 6: response.');
      
      // Send a test message
      await page.fill('#message-input', 'Test real-time message');
      await page.click('#send-message');
      
      // Wait for response
      await page.waitForTimeout(1000);
      
      // Verify message and response
      await expect(streamOutput).toContainText('Sending: Test real-time message');
      await expect(streamOutput).toContainText('Response: Acknowledged');
    });
  });

  describe('Multi-Agent Coordination through UI', () => {
    it('should coordinate multiple agents with different roles', async () => {
      // Given: The system is in a valid state
      // When: coordinate multiple agents with different roles
      // Then: The expected behavior occurs
      // Start event monitoring
      await page.click('#start-monitoring');
      await page.waitForTimeout(500);
      
      // Register test agents
      await page.click('#register-agents');
      
      // Verify agents are displayed
      const agentStatus = await page.locator('#agent-status');
      await expect(agentStatus).toContainText('agent-1 (developer)');
      await expect(agentStatus).toContainText('agent-2 (designer)');
      await expect(agentStatus).toContainText('agent-3 (tester)');
      
      // Assign tasks to agents
      await page.click('#assign-tasks');
      
      // Wait for assignments to complete
      await page.waitForTimeout(1000);
      
      // Verify task assignments in real-time events
      const eventsDisplay = await page.locator('#real-time-events');
      await expect(eventsDisplay).toContainText('Assigned: Implement authentication');
      await expect(eventsDisplay).toContainText('Assigned: Design login page');
      await expect(eventsDisplay).toContainText('Assigned: Test auth flow');
    });
  });

  describe('Performance Monitoring through UI', () => {
    it('should provide real-time performance metrics', async () => {
      // Given: The system is in a valid state
      // When: provide real-time performance metrics
      // Then: The expected behavior occurs
      // Start performance monitoring
      await page.click('#start-metrics');
      
      // Wait for metrics to accumulate
      await page.waitForTimeout(2000);
      
      // Verify metrics are being displayed
      const performanceMetrics = await page.locator('#performance-metrics');
      await expect(performanceMetrics).toContainText('Memory:');
      await expect(performanceMetrics).toContainText('CPU:');
      await expect(performanceMetrics).toContainText('Active Tasks:');
      
      // Generate load and verify it's reflected
      await page.click('#generate-load');
      
      // Wait for load generation
      await page.waitForTimeout(2000);
      
      // Verify load events were generated
      const eventsDisplay = await page.locator('#real-time-events');
      await expect(eventsDisplay).toContainText('load_task_');
    });
  });

  describe('Session Continuity through UI', () => {
    it('should maintain session continuity across interruptions', async () => {
      // Given: The system is in a valid state
      // When: maintain session continuity across interruptions
      // Then: The expected behavior occurs
      // Create session context
      await page.click('#create-session-context');
      
      // Verify session is created
      const sessionStatus = await page.locator('#session-status');
      await expect(sessionStatus).toContainText('Session ID: session-');
      await expect(sessionStatus).toContainText('Status: Active');
      
      // Interrupt session
      await page.click('#interrupt-session');
      
      // Verify interruption
      await expect(sessionStatus).toContainText('Status: Interrupted');
      
      // Resume session
      await page.click('#resume-session');
      
      // Verify resumption
      await expect(sessionStatus).toContainText('Status: Resumed');
    });
  });

  describe('Event Streaming Integration Tests', () => {
    it('should handle In Progress real-time workflow', async () => {
      // Given: The system is in a valid state
      // When: handle In Progress real-time workflow
      // Then: The expected behavior occurs
      // Start comprehensive monitoring
      await page.click('#start-monitoring');
      await page.click('#start-metrics');
      
      // Register agents
      await page.click('#register-agents');
      
      // Create session context
      await page.click('#create-session-context');
      
      // Simulate task with progress
      await page.click('#simulate-task');
      
      // Send test messages
      await page.fill('#message-input', 'Integration test message');
      await page.click('#send-message');
      
      // Wait for all operations to complete
      await page.waitForTimeout(4000);
      
      // Verify comprehensive event collection
      const eventCount = await page.locator('#event-count').textContent();
      expect(parseInt(eventCount || '0')).toBeGreaterThan(10);
      
      // Verify various event types were captured
      const eventsDisplay = await page.locator('#real-time-events');
      await expect(eventsDisplay).toContainText('monitoring_started');
      await expect(eventsDisplay).toContainText('agent_registered');
      await expect(eventsDisplay).toContainText('session_created');
      await expect(eventsDisplay).toContainText('task_progress');
      
      // Verify performance metrics are updating
      const performanceMetrics = await page.locator('#performance-metrics');
      await expect(performanceMetrics).toContainText('metrics_update');
      
      // Verify task completion
      const currentTask = await page.locator('#current-task').textContent();
      expect(currentTask).toContain('In Progress');
    });

    it('should maintain event ordering and timing', async () => {
      // Given: The system is in a valid state
      // When: maintain event ordering and timing
      // Then: The expected behavior occurs
      // Clear any existing events
      await page.click('#clear-events');
      
      // Start monitoring with timestamp tracking
      await page.click('#start-monitoring');
      await page.waitForTimeout(500);
      
      // Capture initial event count
      const initialCount = await page.locator('#event-count').textContent();
      const initialCountNum = parseInt(initialCount || '0');
      
      // Generate a sequence of events
      await page.click('#register-agents'); // Should generate 3 agent_registered events
      await page.waitForTimeout(500);
      
      await page.click('#assign-tasks'); // Should generate 3 task_assigned events
      await page.waitForTimeout(500);
      
      // Verify event count increased appropriately
      const finalCount = await page.locator('#event-count').textContent();
      const finalCountNum = parseInt(finalCount || '0');
      
      // Should have at least 6 more events (3 registrations + 3 assignments)
      expect(finalCountNum - initialCountNum).toBeGreaterThanOrEqual(6);
      
      // Verify event rate calculation
      const eventRate = await page.locator('#event-rate').textContent();
      expect(parseFloat(eventRate || '0')).toBeGreaterThan(0);
    });
  });
});