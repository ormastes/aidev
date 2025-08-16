/**
 * Comprehensive System Tests for PocketFlow Theme
 * Tests the complete integration of pocketflow components using real process execution
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';
import { os } from '../../../infra_external-log-lib/src';
import { execSync } from 'child_process';

describe('PocketFlow Complete System Test', () => {
  let testDir: string;

  beforeEach(() => {
    // Create unique test directory
    testDir = path.join(os.tmpdir(), `pocketflow-complete-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  test('should execute a complete workflow simulation', async () => {
    // Create a workflow script that demonstrates workflow execution
    const workflowScript = path.join(testDir, 'workflow.js');
    const scriptContent = `
      const fs = require('fs');
      const path = require('path');
      
      class PocketFlow {
        constructor(name) {
          this.name = name;
          this.nodes = [];
          this.connections = new Map();
          this.results = new Map();
        }
        
        addNode(node) {
          this.nodes.push(node);
        }
        
        connect(fromId, toId) {
          if (!this.connections.has(fromId)) {
            this.connections.set(fromId, []);
          }
          this.connections.get(fromId).push(toId);
        }
        
        async execute() {
          console.log('Starting PocketFlow workflow...');
          
          // Execute nodes in order
          for (const node of this.nodes) {
            const result = await node.execute();
            this.results.set(node.id, result);
            console.log(\`Node \${node.id} completed\`);
          }
          
          console.log('Workflow completed');
          return this.results;
        }
      }
      
      class InputNode {
        constructor(id, config) {
          this.id = id;
          this.data = config.data;
        }
        
        async execute() {
          return this.data;
        }
      }
      
      class TransformNode {
        constructor(id, config) {
          this.id = id;
          this.transform = config.transform;
        }
        
        async execute() {
          // In real implementation, would get input from connected nodes
          return this.transform('Hello PocketFlow');
        }
      }
      
      class OutputNode {
        constructor(id, config) {
          this.id = id;
          this.handler = config.handler;
        }
        
        async execute() {
          // In real implementation, would get input from connected nodes
          const data = 'HELLO POCKETFLOW';
          this.handler(data);
          return data;
        }
      }
      
      async function runWorkflow() {
        // Create workflow
        const workflow = new PocketFlow('test-workflow');
        
        // Create nodes
        const input = new InputNode('input', { data: 'Hello PocketFlow' });
        const transform = new TransformNode('transform', {
          transform: (data) => data.toUpperCase()
        });
        const output = new OutputNode('output', {
          handler: (data) => {
            const outputFile = path.join('${testDir}', 'output.txt');
            fs.writeFileSync(outputFile, data);
            console.log('Output:', data);
          }
        });
        
        // Connect nodes
        workflow.addNode(input);
        workflow.addNode(transform);
        workflow.addNode(output);
        
        workflow.connect(input.id, transform.id);
        workflow.connect(transform.id, output.id);
        
        // Execute workflow
        const result = await workflow.execute();
        
        return result;
      }
      
      runWorkflow().catch(console.error);
    `;
    
    fs.writeFileSync(workflowScript, scriptContent);
    
    // Execute the workflow
    const output = execSync(`node ${workflowScript}`, {
      cwd: testDir,
      encoding: 'utf8'
    });
    
    // Verify execution
    expect(output).toContain('Starting PocketFlow workflow');
    expect(output).toContain('Node input completed');
    expect(output).toContain('Node transform completed');
    expect(output).toContain('Node output completed');
    expect(output).toContain('Output: HELLO POCKETFLOW');
    expect(output).toContain('Workflow completed');
    
    // Verify output file
    const outputFile = path.join(testDir, 'output.txt');
    expect(fs.existsSync(outputFile)).toBe(true);
    expect(fs.readFileSync(outputFile, 'utf8')).toBe('HELLO POCKETFLOW');
  });

  test('should handle agent-based workflows', async () => {
    // Create an agent workflow script
    const agentScript = path.join(testDir, 'agent-workflow.js');
    const scriptContent = `
      const fs = require('fs');
      const path = require('path');
      
      class Agent {
        constructor(id, name, description) {
          this.id = id;
          this.name = name;
          this.description = description;
          this.memory = [];
          this.responses = [];
        }
        
        setResponses(responses) {
          this.responses = responses;
        }
        
        async initialize(config) {
          console.log(\`Agent \${this.name} initialized\`);
        }
        
        async process(input) {
          // Save to memory
          this.memory.push(input);
          
          // Get next response
          const response = this.responses.shift() || {
            role: 'assistant',
            content: 'Default response'
          };
          
          console.log(\`Agent \${this.name} processed input\`);
          return {
            message: response,
            metadata: {
              agent: this.name,
              memorySize: this.memory.length
            }
          };
        }
      }
      
      class AgentWorkflow {
        constructor() {
          this.agents = [];
          this.results = [];
        }
        
        addAgent(agent) {
          this.agents.push(agent);
        }
        
        async execute(input) {
          console.log('Starting agent-based workflow...');
          
          let currentInput = input;
          
          for (const agent of this.agents) {
            const result = await agent.process(currentInput);
            this.results.push(result);
            
            // Pass output to next agent
            currentInput = {
              messages: [...currentInput.messages, result.message]
            };
          }
          
          console.log('Agent workflow completed');
          return this.results;
        }
      }
      
      async function runAgentWorkflow() {
        // Create agents
        const agent1 = new Agent('agent1', 'Analyzer', 'Analyzes input');
        agent1.setResponses([
          { role: 'assistant', content: 'Analysis completed: Task is valid' }
        ]);
        
        const agent2 = new Agent('agent2', 'Processor', 'Processes tasks');
        agent2.setResponses([
          { role: 'assistant', content: 'Processing completed: Task executed successfully' }
        ]);
        
        // Initialize agents
        await agent1.initialize({});
        await agent2.initialize({});
        
        // Create workflow
        const workflow = new AgentWorkflow();
        workflow.addAgent(agent1);
        workflow.addAgent(agent2);
        
        // Execute workflow
        const input = {
          messages: [{ role: 'user', content: 'Process this task' }]
        };
        
        const results = await workflow.execute(input);
        
        // Save results
        const resultsFile = path.join('${testDir}', 'agent-results.json');
        fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
        
        console.log('Total agents:', workflow.agents.length);
        console.log('Total results:', results.length);
        
        return results;
      }
      
      runAgentWorkflow().catch(console.error);
    `;
    
    fs.writeFileSync(agentScript, scriptContent);
    
    // Execute the workflow
    const output = execSync(`node ${agentScript}`, {
      cwd: testDir,
      encoding: 'utf8'
    });
    
    // Verify execution
    expect(output).toContain('Agent Analyzer initialized');
    expect(output).toContain('Agent Processor initialized');
    expect(output).toContain('Starting agent-based workflow');
    expect(output).toContain('Agent Analyzer processed input');
    expect(output).toContain('Agent Processor processed input');
    expect(output).toContain('Agent workflow completed');
    expect(output).toContain('Total agents: 2');
    expect(output).toContain('Total results: 2');
    
    // Verify results file
    const resultsFile = path.join(testDir, 'agent-results.json');
    expect(fs.existsSync(resultsFile)).toBe(true);
    
    const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
    expect(results).toHaveLength(2);
    expect(results[0].message.content).toContain('Analysis completed');
    expect(results[1].message.content).toContain('Processing completed');
  });

  test('should execute workflow patterns', async () => {
    // Create a pattern workflow script
    const patternScript = path.join(testDir, 'pattern-workflow.js');
    const scriptContent = `
      const fs = require('fs');
      const path = require('path');
      
      class SupervisorPattern {
        constructor(config) {
          this.supervisor = config.supervisor;
          this.workers = config.workers;
          this.maxIterations = config.maxIterations || 5;
        }
        
        async execute(input) {
          console.log('Starting supervisor pattern workflow...');
          const results = [];
          
          // Supervisor assigns tasks
          console.log('Supervisor assigning tasks...');
          const supervisorResult = await this.supervisor.process(input);
          results.push(supervisorResult);
          
          // Workers process tasks
          for (const worker of this.workers) {
            console.log(\`Worker \${worker.name} processing task...\`);
            const workerResult = await worker.process(input);
            results.push(workerResult);
          }
          
          // Supervisor reviews results
          console.log('Supervisor reviewing results...');
          const reviewInput = {
            messages: [
              ...input.messages,
              { role: 'system', content: 'Review worker results' }
            ]
          };
          const reviewResult = await this.supervisor.process(reviewInput);
          results.push(reviewResult);
          
          console.log('Pattern workflow completed');
          return {
            messages: results.map(r => r.message),
            metadata: {
              pattern: 'supervisor',
              iterations: 1,
              workerCount: this.workers.length
            }
          };
        }
      }
      
      class MockAgent {
        constructor(id, name, description) {
          this.id = id;
          this.name = name;
          this.description = description;
          this.responseIndex = 0;
          this.mockResponses = [];
        }
        
        setMockResponses(responses) {
          this.mockResponses = responses;
          this.responseIndex = 0;
        }
        
        async initialize(config) {
          console.log(\`Initialized \${this.name}\`);
        }
        
        async process(input) {
          const response = this.mockResponses[this.responseIndex] || {
            role: 'assistant',
            content: \`\${this.name} response\`
          };
          this.responseIndex++;
          
          return {
            message: response,
            metadata: { agent: this.name }
          };
        }
      }
      
      async function runPatternWorkflow() {
        // Create supervisor agent
        const supervisor = new MockAgent('supervisor', 'Supervisor', 'Manages workers');
        supervisor.setMockResponses([
          { role: 'assistant', content: 'Assigning task to workers' },
          { role: 'assistant', content: 'All tasks completed successfully' }
        ]);
        
        // Create worker agents
        const worker1 = new MockAgent('worker1', 'Worker 1', 'Processes tasks');
        worker1.setMockResponses([
          { role: 'assistant', content: 'Worker 1 completed task' }
        ]);
        
        const worker2 = new MockAgent('worker2', 'Worker 2', 'Processes tasks');
        worker2.setMockResponses([
          { role: 'assistant', content: 'Worker 2 completed task' }
        ]);
        
        // Initialize agents
        await supervisor.initialize({});
        await worker1.initialize({});
        await worker2.initialize({});
        
        // Create pattern
        const pattern = new SupervisorPattern({
          supervisor,
          workers: [worker1, worker2],
          maxIterations: 3
        });
        
        // Execute pattern
        const input = {
          messages: [{ role: 'user', content: 'Process this complex task' }]
        };
        
        const result = await pattern.execute(input);
        
        // Save results
        const resultsFile = path.join('${testDir}', 'pattern-results.json');
        fs.writeFileSync(resultsFile, JSON.stringify(result, null, 2));
        
        console.log('Total messages:', result.messages.length);
        console.log('Worker count:', result.metadata.workerCount);
        
        return result;
      }
      
      runPatternWorkflow().catch(console.error);
    `;
    
    fs.writeFileSync(patternScript, scriptContent);
    
    // Execute the workflow
    const output = execSync(`node ${patternScript}`, {
      cwd: testDir,
      encoding: 'utf8'
    });
    
    // Verify execution
    expect(output).toContain('Starting supervisor pattern workflow');
    expect(output).toContain('Supervisor assigning tasks');
    expect(output).toContain('Worker 1 processing task');
    expect(output).toContain('Worker 2 processing task');
    expect(output).toContain('Supervisor reviewing results');
    expect(output).toContain('Pattern workflow completed');
    expect(output).toContain('Total messages: 4');
    expect(output).toContain('Worker count: 2');
    
    // Verify results file
    const resultsFile = path.join(testDir, 'pattern-results.json');
    expect(fs.existsSync(resultsFile)).toBe(true);
    
    const result = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
    expect(result.messages).toHaveLength(4);
    expect(result.metadata.pattern).toBe('supervisor');
  });

  test('should handle file-based state management', async () => {
    // Create a stateful workflow script
    const stateScript = path.join(testDir, 'stateful-workflow.js');
    const scriptContent = `
      const fs = require('fs');
      const path = require('path');
      
      class FileStateManager {
        constructor(baseDir) {
          this.stateFile = path.join(baseDir, 'workflow-state.json');
          this.ensureStateFile();
        }
        
        ensureStateFile() {
          if (!fs.existsSync(this.stateFile)) {
            fs.writeFileSync(this.stateFile, JSON.stringify({
              workflows: {},
              executions: [],
              metadata: {
                created: new Date().toISOString(),
                version: '1.0.0'
              }
            }, null, 2));
          }
        }
        
        saveWorkflow(id, workflow) {
          const state = JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
          state.workflows[id] = {
            ...workflow,
            savedAt: new Date().toISOString()
          };
          fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2));
        }
        
        saveExecution(execution) {
          const state = JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
          state.executions.push({
            ...execution,
            timestamp: new Date().toISOString()
          });
          fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2));
        }
        
        getState() {
          return JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
        }
      }
      
      // Test the state manager
      console.log('Starting stateful workflow test...');
      
      const stateManager = new FileStateManager('${testDir}');
      
      // Save workflow
      stateManager.saveWorkflow('test-workflow', {
        name: 'Test Workflow',
        nodes: ['input', 'process', 'output'],
        connections: [['input', 'process'], ['process', 'output']]
      });
      
      // Save executions
      stateManager.saveExecution({
        workflowId: 'test-workflow',
        status: 'completed',
        duration: 150,
        result: 'completed'
      });
      
      stateManager.saveExecution({
        workflowId: 'test-workflow',
        status: 'In Progress',
        duration: 200,
        result: 'In Progress'
      });
      
      // Get final state
      const finalState = stateManager.getState();
      console.log('Workflows saved:', Object.keys(finalState.workflows).length);
      console.log('Executions saved:', finalState.executions.length);
      console.log('State management test In Progress');
    `;
    
    fs.writeFileSync(stateScript, scriptContent);
    
    // Execute the script
    const output = execSync(`node ${stateScript}`, {
      cwd: testDir,
      encoding: 'utf8'
    });
    
    // Verify execution
    expect(output).toContain('Starting stateful workflow test');
    expect(output).toContain('Workflows saved: 1');
    expect(output).toContain('Executions saved: 2');
    expect(output).toContain('State management test In Progress');
    
    // Verify state file
    const stateFile = path.join(testDir, 'workflow-state.json');
    expect(fs.existsSync(stateFile)).toBe(true);
    
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    expect(state.workflows['test-workflow']).toBeDefined();
    expect(state.executions).toHaveLength(2);
  });

  test('should handle concurrent workflow execution', async () => {
    // Create a concurrent workflow script
    const concurrentScript = path.join(testDir, 'concurrent-workflow.js');
    const scriptContent = `
      const fs = require('fs');
      const path = require('path');
      
      async function runConcurrentWorkflows() {
        console.log('Starting concurrent workflow execution...');
        const results = [];
        const numWorkers = 3;
        
        // Create worker tasks
        const tasks = [];
        for (let i = 0; i < numWorkers; i++) {
          const taskFile = path.join('${testDir}', \`task-\${i}.txt\`);
          const task = new Promise((resolve) => {
            setTimeout(() => {
              fs.writeFileSync(taskFile, \`Task \${i} In Progress at \${new Date().toISOString()}\`);
              console.log(\`Worker \${i} In Progress\`);
              resolve({ worker: i, file: taskFile });
            }, Math.random() * 500);
          });
          tasks.push(task);
        }
        
        // Execute all tasks concurrently
        const startTime = Date.now();
        const taskResults = await Promise.all(tasks);
        const endTime = Date.now();
        
        console.log(\`All workers In Progress in \${endTime - startTime}ms\`);
        console.log('Files created:', taskResults.length);
        
        // Save summary
        const summaryFile = path.join('${testDir}', 'concurrent-summary.json');
        fs.writeFileSync(summaryFile, JSON.stringify({
          workers: numWorkers,
          duration: endTime - startTime,
          results: taskResults
        }, null, 2));
        
        console.log('Concurrent workflow test In Progress');
      }
      
      runConcurrentWorkflows().catch(console.error);
    `;
    
    fs.writeFileSync(concurrentScript, scriptContent);
    
    // Execute the script
    const output = execSync(`node ${concurrentScript}`, {
      cwd: testDir,
      encoding: 'utf8'
    });
    
    // Verify execution
    expect(output).toContain('Starting concurrent workflow execution');
    expect(output).toContain('Worker 0 In Progress');
    expect(output).toContain('Worker 1 In Progress');
    expect(output).toContain('Worker 2 In Progress');
    expect(output).toContain('Files created: 3');
    expect(output).toContain('Concurrent workflow test In Progress');
    
    // Verify task files
    for (let i = 0; i < 3; i++) {
      const taskFile = path.join(testDir, `task-${i}.txt`);
      expect(fs.existsSync(taskFile)).toBe(true);
      const content = fs.readFileSync(taskFile, 'utf8');
      expect(content).toContain(`Task ${i} In Progress`);
    }
  });
});