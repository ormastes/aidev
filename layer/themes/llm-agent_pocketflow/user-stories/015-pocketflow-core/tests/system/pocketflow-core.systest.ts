import { test, expect } from '@playwright/test';
import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';

interface FlowNode {
  id: string;
  type: 'start' | 'action' | 'condition' | 'end';
  name: string;
  config: Record<string, any>;
  connections: string[];
}

interface FlowDefinition {
  id: string;
  name: string;
  description: string;
  nodes: FlowNode[];
  variables: Record<string, any>;
  metadata: {
    version: string;
    createdAt: string;
    updatedAt: string;
    author: string;
  };
}

interface FlowExecution {
  id: string;
  flowId: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  startTime: string;
  endTime?: string;
  currentNodeId?: string;
  context: Record<string, any>;
  logs: FlowExecutionLog[];
}

interface FlowExecutionLog {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  nodeId: string;
  message: string;
  data?: any;
}

class PocketFlowCore extends EventEmitter {
  private flows: Map<string, FlowDefinition> = new Map();
  private executions: Map<string, FlowExecution> = new Map();
  private activeExecutions: Set<string> = new Set();

  createFlow(name: string, description: string): FlowDefinition {
    const flow: FlowDefinition = {
      id: this.generateId('flow'),
      name,
      description,
      nodes: [],
      variables: {},
      metadata: {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'PocketFlow'
      }
    };

    this.flows.set(flow.id, flow);
    this.emit('flowCreated', flow);
    return flow;
  }

  addNode(flowId: string, node: Omit<FlowNode, 'id'>): FlowNode | null {
    const flow = this.flows.get(flowId);
    if (!flow) return null;

    const newNode: FlowNode = {
      ...node,
      id: this.generateId('node')
    };

    flow.nodes.push(newNode);
    flow.metadata.updatedAt = new Date().toISOString();

    this.flows.set(flowId, flow);
    this.emit('nodeAdded', { flowId, node: newNode });
    return newNode;
  }

  connectNodes(flowId: string, fromNodeId: string, toNodeId: string): boolean {
    const flow = this.flows.get(flowId);
    if (!flow) return false;

    const fromNode = flow.nodes.find(n => n.id === fromNodeId);
    const toNode = flow.nodes.find(n => n.id === toNodeId);

    if (!fromNode || !toNode) return false;

    if (!fromNode.connections.includes(toNodeId)) {
      fromNode.connections.push(toNodeId);
      flow.metadata.updatedAt = new Date().toISOString();
      this.flows.set(flowId, flow);
      this.emit('nodesConnected', { flowId, fromNodeId, toNodeId });
      return true;
    }

    return false;
  }

  async executeFlow(flowId: string, initialContext: Record<string, any> = {}): Promise<string> {
    const flow = this.flows.get(flowId);
    if (!flow) throw new Error(`Flow ${flowId} not found`);

    const startNodes = flow.nodes.filter(n => n.type === 'start');
    if (startNodes.length === 0) throw new Error('Flow has no start node');
    if (startNodes.length > 1) throw new Error('Flow has multiple start nodes');

    const execution: FlowExecution = {
      id: this.generateId('exec'),
      flowId,
      status: 'running',
      startTime: new Date().toISOString(),
      currentNodeId: startNodes[0].id,
      context: { ...initialContext },
      logs: []
    };

    this.executions.set(execution.id, execution);
    this.activeExecutions.add(execution.id);
    this.emit('executionStarted', execution);

    // Start execution in background
    this.processExecution(execution.id).catch(error => {
      this.logExecution(execution.id, 'error', execution.currentNodeId || 'unknown', 
        `Execution failed: ${error.message}`, { error: error.message });
      this.updateExecutionStatus(execution.id, 'failed');
    });

    return execution.id;
  }

  private async processExecution(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    const flow = this.flows.get(execution.flowId);
    if (!flow) return;

    let currentNodeId = execution.currentNodeId;
    
    while (currentNodeId && execution.status === 'running') {
      const currentNode = flow.nodes.find(n => n.id === currentNodeId);
      if (!currentNode) break;

      this.logExecution(executionId, 'info', currentNodeId, `Executing node: ${currentNode.name}`);

      try {
        const result = await this.executeNode(currentNode, execution.context);
        
        if (currentNode.type === 'end') {
          this.updateExecutionStatus(executionId, 'completed');
          break;
        }

        // Determine next node
        currentNodeId = this.getNextNode(currentNode, result, flow);
        execution.currentNodeId = currentNodeId;
        
        if (currentNodeId) {
          this.executions.set(executionId, execution);
        } else {
          this.updateExecutionStatus(executionId, 'completed');
        }

        // Add small delay to prevent tight loops
        await new Promise(resolve => setTimeout(resolve, 10));
        
      } catch (error) {
        this.logExecution(executionId, 'error', currentNodeId, 
          `Node execution failed: ${error}`, { error: error instanceof Error ? error.message : String(error) });
        this.updateExecutionStatus(executionId, 'failed');
        break;
      }
    }

    this.activeExecutions.delete(executionId);
  }

  private async executeNode(node: FlowNode, context: Record<string, any>): Promise<any> {
    switch (node.type) {
      case 'start':
        return { success: true };

      case 'action':
        return await this.executeAction(node, context);

      case 'condition':
        return this.evaluateCondition(node, context);

      case 'end':
        return { completed: true };

      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }

  private async executeAction(node: FlowNode, context: Record<string, any>): Promise<any> {
    const { actionType, parameters } = node.config;

    switch (actionType) {
      case 'setVariable':
        context[parameters.variable] = parameters.value;
        return { success: true };

      case 'httpRequest':
        // Mock HTTP request
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        const mockResponse = { status: 200, data: { result: 'success' } };
        if (parameters.responseVariable) {
          context[parameters.responseVariable] = mockResponse;
        }
        return mockResponse;

      case 'log':
        console.log(`Flow Log: ${parameters.message}`);
        return { logged: true };

      case 'delay':
        await new Promise(resolve => setTimeout(resolve, parameters.duration || 1000));
        return { delayed: true };

      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }
  }

  private evaluateCondition(node: FlowNode, context: Record<string, any>): boolean {
    const { condition, variable, operator, value } = node.config;

    if (condition === 'simple') {
      const contextValue = context[variable];
      
      switch (operator) {
        case 'equals': return contextValue === value;
        case 'notEquals': return contextValue !== value;
        case 'greater': return contextValue > value;
        case 'less': return contextValue < value;
        case 'exists': return contextValue !== undefined;
        default: return false;
      }
    }

    return false;
  }

  private getNextNode(currentNode: FlowNode, result: any, flow: FlowDefinition): string | null {
    if (currentNode.connections.length === 0) return null;

    if (currentNode.type === 'condition') {
      // For condition nodes, use result to determine path
      const trueIndex = 0;
      const falseIndex = 1;
      const connectionIndex = result ? trueIndex : falseIndex;
      return currentNode.connections[connectionIndex] || null;
    }

    // For other nodes, take first connection
    return currentNode.connections[0] || null;
  }

  private logExecution(executionId: string, level: FlowExecutionLog['level'], 
                      nodeId: string, message: string, data?: any): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    const log: FlowExecutionLog = {
      timestamp: new Date().toISOString(),
      level,
      nodeId,
      message,
      data
    };

    execution.logs.push(log);
    this.executions.set(executionId, execution);
    this.emit('executionLog', { executionId, log });
  }

  private updateExecutionStatus(executionId: string, status: FlowExecution['status']): void {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    execution.status = status;
    if (status === 'completed' || status === 'failed') {
      execution.endTime = new Date().toISOString();
    }

    this.executions.set(executionId, execution);
    this.emit('executionStatusChanged', { executionId, status });
  }

  getFlow(flowId: string): FlowDefinition | null {
    return this.flows.get(flowId) || null;
  }

  getAllFlows(): FlowDefinition[] {
    return Array.from(this.flows.values());
  }

  getExecution(executionId: string): FlowExecution | null {
    return this.executions.get(executionId) || null;
  }

  getActiveExecutions(): FlowExecution[] {
    return Array.from(this.activeExecutions).map(id => this.executions.get(id)!).filter(Boolean);
  }

  pauseExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'running') return false;

    this.updateExecutionStatus(executionId, 'paused');
    this.activeExecutions.delete(executionId);
    return true;
  }

  resumeExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'paused') return false;

    this.updateExecutionStatus(executionId, 'running');
    this.activeExecutions.add(executionId);
    
    // Resume processing
    this.processExecution(executionId).catch(error => {
      this.logExecution(executionId, 'error', execution.currentNodeId || 'unknown',
        `Resume failed: ${error.message}`);
      this.updateExecutionStatus(executionId, 'failed');
    });

    return true;
  }

  async exportFlow(flowId: string): Promise<string> {
    const flow = this.flows.get(flowId);
    if (!flow) throw new Error(`Flow ${flowId} not found`);

    return JSON.stringify(flow, null, 2);
  }

  async importFlow(flowJson: string): Promise<string> {
    const flow: FlowDefinition = JSON.parse(flowJson);
    
    // Generate new ID to avoid conflicts
    const newId = this.generateId('flow');
    flow.id = newId;
    flow.metadata.updatedAt = new Date().toISOString();

    this.flows.set(newId, flow);
    this.emit('flowImported', flow);
    
    return newId;
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getFlowStats(): {
    totalFlows: number;
    totalExecutions: number;
    activeExecutions: number;
    completedExecutions: number;
    failedExecutions: number;
  } {
    const executions = Array.from(this.executions.values());
    
    return {
      totalFlows: this.flows.size,
      totalExecutions: executions.length,
      activeExecutions: this.activeExecutions.size,
      completedExecutions: executions.filter(e => e.status === 'completed').length,
      failedExecutions: executions.filter(e => e.status === 'failed').length
    };
  }
}

test.describe('PocketFlow Core System Tests', () => {
  let tempDir: string;
  let flowCore: PocketFlowCore;

  test.beforeEach(async () => {
    tempDir = path.join(__dirname, '..', '..', 'temp', `core-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    flowCore = new PocketFlowCore();
  });

  test.afterEach(async () => {
    // Stop any active executions
    const activeExecutions = flowCore.getActiveExecutions();
    activeExecutions.forEach(exec => {
      flowCore.pauseExecution(exec.id);
    });

    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Cleanup failed: ${error}`);
    }
  });

  test('should create and manage flow definitions', async () => {
    const flow = flowCore.createFlow('Test Flow', 'A simple test flow');

    expect(flow.id).toMatch(/^flow-\d+-[a-z0-9]{9}$/);
    expect(flow.name).toBe('Test Flow');
    expect(flow.description).toBe('A simple test flow');
    expect(flow.nodes).toHaveLength(0);
    expect(new Date(flow.metadata.createdAt)).toBeInstanceOf(Date);

    // Verify flow is stored
    const retrievedFlow = flowCore.getFlow(flow.id);
    expect(retrievedFlow).toEqual(flow);

    // Verify in list
    const allFlows = flowCore.getAllFlows();
    expect(allFlows).toContain(flow);
  });

  test('should add nodes and create connections', async () => {
    const flow = flowCore.createFlow('Node Test Flow', 'Testing nodes and connections');

    // Add start node
    const startNode = flowCore.addNode(flow.id, {
      type: 'start',
      name: 'Start',
      config: {},
      connections: []
    });

    expect(startNode).toBeDefined();
    expect(startNode!.type).toBe('start');
    expect(startNode!.id).toMatch(/^node-\d+-[a-z0-9]{9}$/);

    // Add action node
    const actionNode = flowCore.addNode(flow.id, {
      type: 'action',
      name: 'Set Variable',
      config: {
        actionType: 'setVariable',
        parameters: { variable: 'counter', value: 1 }
      },
      connections: []
    });

    // Add end node
    const endNode = flowCore.addNode(flow.id, {
      type: 'end',
      name: 'End',
      config: {},
      connections: []
    });

    // Connect nodes
    const connected1 = flowCore.connectNodes(flow.id, startNode!.id, actionNode!.id);
    const connected2 = flowCore.connectNodes(flow.id, actionNode!.id, endNode!.id);

    expect(connected1).toBe(true);
    expect(connected2).toBe(true);

    // Verify connections
    const updatedFlow = flowCore.getFlow(flow.id);
    expect(updatedFlow!.nodes).toHaveLength(3);
    
    const updatedStartNode = updatedFlow!.nodes.find(n => n.id === startNode!.id);
    expect(updatedStartNode!.connections).toContain(actionNode!.id);

    const updatedActionNode = updatedFlow!.nodes.find(n => n.id === actionNode!.id);
    expect(updatedActionNode!.connections).toContain(endNode!.id);
  });

  test('should execute simple linear flows', async () => {
    const flow = flowCore.createFlow('Linear Flow', 'Simple linear execution');

    // Build flow: Start -> SetVariable -> Log -> End
    const startNode = flowCore.addNode(flow.id, {
      type: 'start',
      name: 'Start',
      config: {},
      connections: []
    });

    const setVarNode = flowCore.addNode(flow.id, {
      type: 'action',
      name: 'Set Counter',
      config: {
        actionType: 'setVariable',
        parameters: { variable: 'counter', value: 42 }
      },
      connections: []
    });

    const logNode = flowCore.addNode(flow.id, {
      type: 'action',
      name: 'Log Value',
      config: {
        actionType: 'log',
        parameters: { message: 'Counter value set' }
      },
      connections: []
    });

    const endNode = flowCore.addNode(flow.id, {
      type: 'end',
      name: 'End',
      config: {},
      connections: []
    });

    // Connect nodes
    flowCore.connectNodes(flow.id, startNode!.id, setVarNode!.id);
    flowCore.connectNodes(flow.id, setVarNode!.id, logNode!.id);
    flowCore.connectNodes(flow.id, logNode!.id, endNode!.id);

    // Execute flow
    const executionId = await flowCore.executeFlow(flow.id, { initialValue: 'test' });

    // Wait for completion
    await new Promise<void>(resolve => {
      const checkStatus = () => {
        const execution = flowCore.getExecution(executionId);
        if (execution && (execution.status === 'completed' || execution.status === 'failed')) {
          resolve();
        } else {
          setTimeout(checkStatus, 50);
        }
      };
      checkStatus();
    });

    const execution = flowCore.getExecution(executionId);
    expect(execution!.status).toBe('completed');
    expect(execution!.context.counter).toBe(42);
    expect(execution!.context.initialValue).toBe('test');
    expect(execution!.logs.length).toBeGreaterThan(0);

    // Verify execution logs
    const logEntries = execution!.logs;
    expect(logEntries.some(log => log.message.includes('Set Counter'))).toBe(true);
    expect(logEntries.some(log => log.message.includes('Log Value'))).toBe(true);
  });

  test('should handle conditional flows with branching', async () => {
    const flow = flowCore.createFlow('Conditional Flow', 'Flow with conditional branching');

    const startNode = flowCore.addNode(flow.id, {
      type: 'start',
      name: 'Start',
      config: {},
      connections: []
    });

    const conditionNode = flowCore.addNode(flow.id, {
      type: 'condition',
      name: 'Check Value',
      config: {
        condition: 'simple',
        variable: 'testValue',
        operator: 'greater',
        value: 10
      },
      connections: []
    });

    const trueBranchNode = flowCore.addNode(flow.id, {
      type: 'action',
      name: 'True Branch',
      config: {
        actionType: 'setVariable',
        parameters: { variable: 'result', value: 'greater' }
      },
      connections: []
    });

    const falseBranchNode = flowCore.addNode(flow.id, {
      type: 'action',
      name: 'False Branch',
      config: {
        actionType: 'setVariable',
        parameters: { variable: 'result', value: 'lesser' }
      },
      connections: []
    });

    const endNode = flowCore.addNode(flow.id, {
      type: 'end',
      name: 'End',
      config: {},
      connections: []
    });

    // Connect nodes (condition has two connections: true path, false path)
    flowCore.connectNodes(flow.id, startNode!.id, conditionNode!.id);
    flowCore.connectNodes(flow.id, conditionNode!.id, trueBranchNode!.id);
    flowCore.connectNodes(flow.id, conditionNode!.id, falseBranchNode!.id);
    flowCore.connectNodes(flow.id, trueBranchNode!.id, endNode!.id);
    flowCore.connectNodes(flow.id, falseBranchNode!.id, endNode!.id);

    // Execute with value > 10 (should take true branch)
    const execution1Id = await flowCore.executeFlow(flow.id, { testValue: 15 });
    
    await new Promise<void>(resolve => {
      const checkStatus = () => {
        const execution = flowCore.getExecution(execution1Id);
        if (execution && execution.status !== 'running') {
          resolve();
        } else {
          setTimeout(checkStatus, 50);
        }
      };
      checkStatus();
    });

    const execution1 = flowCore.getExecution(execution1Id);
    expect(execution1!.status).toBe('completed');
    expect(execution1!.context.result).toBe('greater');

    // Execute with value < 10 (should take false branch)
    const execution2Id = await flowCore.executeFlow(flow.id, { testValue: 5 });
    
    await new Promise<void>(resolve => {
      const checkStatus = () => {
        const execution = flowCore.getExecution(execution2Id);
        if (execution && execution.status !== 'running') {
          resolve();
        } else {
          setTimeout(checkStatus, 50);
        }
      };
      checkStatus();
    });

    const execution2 = flowCore.getExecution(execution2Id);
    expect(execution2!.status).toBe('completed');
    expect(execution2!.context.result).toBe('lesser');
  });

  test('should support flow execution pause and resume', async () => {
    const flow = flowCore.createFlow('Pausable Flow', 'Flow that can be paused');

    const startNode = flowCore.addNode(flow.id, {
      type: 'start',
      name: 'Start',
      config: {},
      connections: []
    });

    const delay1Node = flowCore.addNode(flow.id, {
      type: 'action',
      name: 'Delay 1',
      config: {
        actionType: 'delay',
        parameters: { duration: 200 }
      },
      connections: []
    });

    const delay2Node = flowCore.addNode(flow.id, {
      type: 'action',
      name: 'Delay 2',
      config: {
        actionType: 'delay',
        parameters: { duration: 200 }
      },
      connections: []
    });

    const endNode = flowCore.addNode(flow.id, {
      type: 'end',
      name: 'End',
      config: {},
      connections: []
    });

    flowCore.connectNodes(flow.id, startNode!.id, delay1Node!.id);
    flowCore.connectNodes(flow.id, delay1Node!.id, delay2Node!.id);
    flowCore.connectNodes(flow.id, delay2Node!.id, endNode!.id);

    // Start execution
    const executionId = await flowCore.executeFlow(flow.id);

    // Wait a bit, then pause
    await new Promise(resolve => setTimeout(resolve, 100));
    const paused = flowCore.pauseExecution(executionId);
    expect(paused).toBe(true);

    let execution = flowCore.getExecution(executionId);
    expect(execution!.status).toBe('paused');

    // Verify it's not in active executions
    const activeExecutions = flowCore.getActiveExecutions();
    expect(activeExecutions.some(e => e.id === executionId)).toBe(false);

    // Resume execution
    const resumed = flowCore.resumeExecution(executionId);
    expect(resumed).toBe(true);

    // Wait for completion
    await new Promise<void>(resolve => {
      const checkStatus = () => {
        const execution = flowCore.getExecution(executionId);
        if (execution && execution.status !== 'running') {
          resolve();
        } else {
          setTimeout(checkStatus, 100);
        }
      };
      checkStatus();
    });

    execution = flowCore.getExecution(executionId);
    expect(execution!.status).toBe('completed');
  });

  test('should handle multiple concurrent flow executions', async () => {
    const flow = flowCore.createFlow('Concurrent Flow', 'Flow for testing concurrency');

    // Create a simple flow
    const startNode = flowCore.addNode(flow.id, {
      type: 'start',
      name: 'Start',
      config: {},
      connections: []
    });

    const actionNode = flowCore.addNode(flow.id, {
      type: 'action',
      name: 'Set Value',
      config: {
        actionType: 'setVariable',
        parameters: { variable: 'value', value: 'processed' }
      },
      connections: []
    });

    const delayNode = flowCore.addNode(flow.id, {
      type: 'action',
      name: 'Delay',
      config: {
        actionType: 'delay',
        parameters: { duration: 100 }
      },
      connections: []
    });

    const endNode = flowCore.addNode(flow.id, {
      type: 'end',
      name: 'End',
      config: {},
      connections: []
    });

    flowCore.connectNodes(flow.id, startNode!.id, actionNode!.id);
    flowCore.connectNodes(flow.id, actionNode!.id, delayNode!.id);
    flowCore.connectNodes(flow.id, delayNode!.id, endNode!.id);

    // Start multiple executions concurrently
    const executionPromises = Array.from({ length: 5 }, (_, i) =>
      flowCore.executeFlow(flow.id, { executionNumber: i })
    );

    const executionIds = await Promise.all(executionPromises);
    expect(executionIds).toHaveLength(5);
    expect(new Set(executionIds).size).toBe(5); // All unique

    // Verify all are active
    let activeExecutions = flowCore.getActiveExecutions();
    expect(activeExecutions.length).toBe(5);

    // Wait for all to complete
    await Promise.all(executionIds.map(id => 
      new Promise<void>(resolve => {
        const checkStatus = () => {
          const execution = flowCore.getExecution(id);
          if (execution && execution.status !== 'running') {
            resolve();
          } else {
            setTimeout(checkStatus, 50);
          }
        };
        checkStatus();
      })
    ));

    // Verify all completed successfully
    executionIds.forEach((id, index) => {
      const execution = flowCore.getExecution(id);
      expect(execution!.status).toBe('completed');
      expect(execution!.context.executionNumber).toBe(index);
      expect(execution!.context.value).toBe('processed');
    });

    // Verify no more active executions
    activeExecutions = flowCore.getActiveExecutions();
    expect(activeExecutions).toHaveLength(0);
  });

  test('should export and import flows', async () => {
    // Create a complex flow
    const originalFlow = flowCore.createFlow('Export Test Flow', 'Flow for testing export/import');

    const startNode = flowCore.addNode(originalFlow.id, {
      type: 'start',
      name: 'Start',
      config: {},
      connections: []
    });

    const actionNode = flowCore.addNode(originalFlow.id, {
      type: 'action',
      name: 'HTTP Request',
      config: {
        actionType: 'httpRequest',
        parameters: { url: 'https://api.example.com', method: 'GET' }
      },
      connections: []
    });

    const conditionNode = flowCore.addNode(originalFlow.id, {
      type: 'condition',
      name: 'Check Response',
      config: {
        condition: 'simple',
        variable: 'response.status',
        operator: 'equals',
        value: 200
      },
      connections: []
    });

    const endNode = flowCore.addNode(originalFlow.id, {
      type: 'end',
      name: 'End',
      config: {},
      connections: []
    });

    flowCore.connectNodes(originalFlow.id, startNode!.id, actionNode!.id);
    flowCore.connectNodes(originalFlow.id, actionNode!.id, conditionNode!.id);
    flowCore.connectNodes(originalFlow.id, conditionNode!.id, endNode!.id);

    // Export flow
    const exportedJson = await flowCore.exportFlow(originalFlow.id);
    const exportedFlow = JSON.parse(exportedJson);

    expect(exportedFlow.name).toBe('Export Test Flow');
    expect(exportedFlow.nodes).toHaveLength(4);

    // Save to file
    const exportFile = path.join(tempDir, 'exported_flow.json');
    await fs.writeFile(exportFile, exportedJson);

    // Import flow
    const importedFlowId = await flowCore.importFlow(exportedJson);
    const importedFlow = flowCore.getFlow(importedFlowId);

    expect(importedFlow).toBeDefined();
    expect(importedFlow!.id).not.toBe(originalFlow.id); // New ID generated
    expect(importedFlow!.name).toBe(originalFlow.name);
    expect(importedFlow!.description).toBe(originalFlow.description);
    expect(importedFlow!.nodes).toHaveLength(originalFlow.nodes.length);

    // Verify imported flow can be executed
    const executionId = await flowCore.executeFlow(importedFlowId);
    
    await new Promise<void>(resolve => {
      const checkStatus = () => {
        const execution = flowCore.getExecution(executionId);
        if (execution && execution.status !== 'running') {
          resolve();
        } else {
          setTimeout(checkStatus, 50);
        }
      };
      checkStatus();
    });

    const execution = flowCore.getExecution(executionId);
    expect(execution!.status).toBe('completed');
  });

  test('should provide comprehensive flow statistics', async () => {
    // Create multiple flows
    const flow1 = flowCore.createFlow('Flow 1', 'First flow');
    const flow2 = flowCore.createFlow('Flow 2', 'Second flow');

    // Add simple structures to flows
    for (const flow of [flow1, flow2]) {
      const start = flowCore.addNode(flow.id, {
        type: 'start', name: 'Start', config: {}, connections: []
      });
      const action = flowCore.addNode(flow.id, {
        type: 'action', name: 'Action', 
        config: { actionType: 'setVariable', parameters: { variable: 'test', value: 1 } }, 
        connections: []
      });
      const end = flowCore.addNode(flow.id, {
        type: 'end', name: 'End', config: {}, connections: []
      });

      flowCore.connectNodes(flow.id, start!.id, action!.id);
      flowCore.connectNodes(flow.id, action!.id, end!.id);
    }

    // Execute flows multiple times with different outcomes
    const exec1 = await flowCore.executeFlow(flow1.id); // Will succeed
    const exec2 = await flowCore.executeFlow(flow1.id); // Will succeed
    const exec3 = await flowCore.executeFlow(flow2.id); // Will succeed

    // Create a flow that will fail
    const failingFlow = flowCore.createFlow('Failing Flow', 'This flow will fail');
    const failStart = flowCore.addNode(failingFlow.id, {
      type: 'start', name: 'Start', config: {}, connections: []
    });
    const failAction = flowCore.addNode(failingFlow.id, {
      type: 'action', name: 'Failing Action',
      config: { actionType: 'unknownAction', parameters: {} },
      connections: []
    });
    flowCore.connectNodes(failingFlow.id, failStart!.id, failAction!.id);

    const exec4 = await flowCore.executeFlow(failingFlow.id); // Will fail

    // Wait for all executions to complete
    await Promise.all([exec1, exec2, exec3, exec4].map(id => 
      new Promise<void>(resolve => {
        const checkStatus = () => {
          const execution = flowCore.getExecution(id);
          if (execution && execution.status !== 'running') {
            resolve();
          } else {
            setTimeout(checkStatus, 50);
          }
        };
        checkStatus();
      })
    ));

    // Get statistics
    const stats = flowCore.getFlowStats();

    expect(stats.totalFlows).toBe(3);
    expect(stats.totalExecutions).toBe(4);
    expect(stats.activeExecutions).toBe(0);
    expect(stats.completedExecutions).toBe(3);
    expect(stats.failedExecutions).toBe(1);
  });

  test('should handle flow execution events', async () => {
    const events: any[] = [];

    // Listen to all flow events
    flowCore.on('flowCreated', (flow) => events.push({ type: 'flowCreated', flow }));
    flowCore.on('nodeAdded', (data) => events.push({ type: 'nodeAdded', data }));
    flowCore.on('nodesConnected', (data) => events.push({ type: 'nodesConnected', data }));
    flowCore.on('executionStarted', (execution) => events.push({ type: 'executionStarted', execution }));
    flowCore.on('executionStatusChanged', (data) => events.push({ type: 'executionStatusChanged', data }));
    flowCore.on('executionLog', (data) => events.push({ type: 'executionLog', data }));

    // Create and execute a flow
    const flow = flowCore.createFlow('Event Test Flow', 'Testing events');

    const startNode = flowCore.addNode(flow.id, {
      type: 'start', name: 'Start', config: {}, connections: []
    });

    const actionNode = flowCore.addNode(flow.id, {
      type: 'action', name: 'Action',
      config: { actionType: 'setVariable', parameters: { variable: 'eventTest', value: true } },
      connections: []
    });

    const endNode = flowCore.addNode(flow.id, {
      type: 'end', name: 'End', config: {}, connections: []
    });

    flowCore.connectNodes(flow.id, startNode!.id, actionNode!.id);
    flowCore.connectNodes(flow.id, actionNode!.id, endNode!.id);

    const executionId = await flowCore.executeFlow(flow.id);

    // Wait for execution to complete
    await new Promise<void>(resolve => {
      const checkStatus = () => {
        const execution = flowCore.getExecution(executionId);
        if (execution && execution.status !== 'running') {
          resolve();
        } else {
          setTimeout(checkStatus, 50);
        }
      };
      checkStatus();
    });

    // Verify events were emitted
    const eventTypes = events.map(e => e.type);
    expect(eventTypes).toContain('flowCreated');
    expect(eventTypes).toContain('nodeAdded');
    expect(eventTypes).toContain('nodesConnected');
    expect(eventTypes).toContain('executionStarted');
    expect(eventTypes).toContain('executionStatusChanged');
    expect(eventTypes).toContain('executionLog');

    // Verify event data
    const flowCreatedEvent = events.find(e => e.type === 'flowCreated');
    expect(flowCreatedEvent.flow.name).toBe('Event Test Flow');

    const executionStartedEvent = events.find(e => e.type === 'executionStarted');
    expect(executionStartedEvent.execution.id).toBe(executionId);

    const statusChangedEvents = events.filter(e => e.type === 'executionStatusChanged');
    expect(statusChangedEvents.length).toBeGreaterThan(0);
    expect(statusChangedEvents.some(e => e.data.status === 'completed')).toBe(true);

    expect(events.length).toBeGreaterThan(10); // Should have many events
  });
});