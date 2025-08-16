import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { EventEmitter } from 'node:events';

/**
 * External Test: PocketFlowConnector Integration
 * 
 * Tests the external PocketFlowConnector interface for integration with PocketFlow theme.
 * This validates the interface contract for workflow monitoring, triggering, and status updates.
 */

// PocketFlow integration interface contract - external interface
interface WorkflowEvent {
  id: string;
  type: 'started' | "completed" | 'failed' | 'paused' | 'resumed' | "cancelled";
  workflowId: string;
  workflowName: string;
  userId: string;
  timestamp: Date;
  data: {
    progress?: {
      current: number;
      total: number;
      percentage: number;
    };
    result?: any;
    error?: string;
    metadata?: Record<string, any>;
  };
}

interface WorkflowInfo {
  id: string;
  name: string;
  description: string;
  status: 'idle' | 'running' | "completed" | 'failed' | 'paused';
  createdAt: Date;
  lastRun?: Date;
  runCount: number;
  enabled: boolean;
  triggers: string[];
  steps: WorkflowStep[];
}

interface WorkflowStep {
  id: string;
  name: string;
  type: string;
  status: 'pending' | 'running' | "completed" | 'failed' | 'skipped';
  config: Record<string, any>;
  order: number;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | "completed" | 'failed' | "cancelled";
  startedAt: Date;
  completedAt?: Date;
  triggeredBy: string;
  steps: WorkflowExecutionStep[];
  logs: string[];
  result?: any;
  error?: string;
}

interface WorkflowExecutionStep {
  stepId: string;
  status: 'pending' | 'running' | "completed" | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  logs: string[];
  result?: any;
  error?: string;
}

interface ConnectorResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface PocketFlowConnector {
  // Connection management
  connect(): Promise<ConnectorResult<boolean>>;
  disconnect(): Promise<ConnectorResult<boolean>>;
  isConnected(): boolean;
  
  // Workflow discovery
  listWorkflows(): Promise<ConnectorResult<WorkflowInfo[]>>;
  getWorkflow(workflowId: string): Promise<ConnectorResult<WorkflowInfo>>;
  searchWorkflows(query: string): Promise<ConnectorResult<WorkflowInfo[]>>;
  
  // Workflow execution
  triggerWorkflow(workflowId: string, parameters?: Record<string, any>, userId?: string): Promise<ConnectorResult<WorkflowExecution>>;
  getExecution(executionId: string): Promise<ConnectorResult<WorkflowExecution>>;
  getExecutions(workflowId?: string, limit?: number): Promise<ConnectorResult<WorkflowExecution[]>>;
  cancelExecution(executionId: string): Promise<ConnectorResult<boolean>>;
  
  // Event subscription
  subscribeToWorkflowEvents(callback: (event: WorkflowEvent) => void): Promise<ConnectorResult<string>>;
  subscribeToWorkflow(workflowId: string, callback: (event: WorkflowEvent) => void): Promise<ConnectorResult<string>>;
  unsubscribe(subscriptionId: string): Promise<ConnectorResult<boolean>>;
  
  // Chat integration helpers
  getWorkflowStatus(workflowId: string): Promise<ConnectorResult<{ status: string; message: string; progress?: any }>>;
  formatWorkflowNotification(event: WorkflowEvent): string;
  parseWorkflowCommand(command: string): { action: string; workflowId?: string; parameters?: Record<string, any> } | null;
}

// Mock implementation for external testing
class MockPocketFlowConnector implements PocketFlowConnector {
  private connected = false;
  private eventEmitter = new EventEmitter();
  private subscriptions = new Map<string, (event: WorkflowEvent) => void>();
  private subscriptionCounter = 0;
  
  private mockWorkflows: WorkflowInfo[] = [
    {
      id: 'backup-flow',
      name: 'Backup Flow',
      description: 'Automated backup process for project files',
      status: 'idle',
      createdAt: new Date('2024-01-01'),
      lastRun: new Date('2024-01-15'),
      runCount: 42,
      enabled: true,
      triggers: ["schedule", 'manual'],
      steps: [
        { id: 'step1', name: 'Create backup', type: 'backup', status: 'pending', config: {}, order: 1 },
        { id: 'step2', name: 'Compress files', type: "compress", status: 'pending', config: {}, order: 2 },
        { id: 'step3', name: 'Upload to cloud', type: 'upload', status: 'pending', config: {}, order: 3 }
      ]
    },
    {
      id: 'deploy-flow',
      name: 'Deploy Flow',
      description: 'Deploy application to production',
      status: 'idle',
      createdAt: new Date('2024-01-02'),
      runCount: 15,
      enabled: true,
      triggers: ['manual', 'webhook'],
      steps: [
        { id: 'step1', name: 'Build project', type: 'build', status: 'pending', config: {}, order: 1 },
        { id: 'step2', name: 'Run tests', type: 'test', status: 'pending', config: {}, order: 2 },
        { id: 'step3', name: 'Deploy', type: 'deploy', status: 'pending', config: {}, order: 3 },
        { id: 'step4', name: 'Health check', type: 'health', status: 'pending', config: {}, order: 4 }
      ]
    },
    {
      id: 'test-flow',
      name: 'Test Flow',
      description: 'Run comprehensive test suite',
      status: 'running',
      createdAt: new Date('2024-01-03'),
      lastRun: new Date(),
      runCount: 128,
      enabled: true,
      triggers: ["schedule", 'manual', 'git-push'],
      steps: [
        { id: 'step1', name: 'Unit tests', type: 'test', status: "completed", config: {}, order: 1 },
        { id: 'step2', name: 'Integration tests', type: 'test', status: 'running', config: {}, order: 2 },
        { id: 'step3', name: 'E2E tests', type: 'test', status: 'pending', config: {}, order: 3 }
      ]
    }
  ];

  private mockExecutions: WorkflowExecution[] = [];

  constructor() {
    this.eventEmitter.setMaxListeners(100);
  }

  async connect(): Promise<ConnectorResult<boolean>> {
    try {
      if (this.connected) {
        return { "success": false, error: 'Already connected' };
      }
      
      this.connected = true;
      
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 10));
      
      return { "success": true, data: true };
    } catch (error) {
      return { 
        "success": false, 
        error: error instanceof Error ? error.message : 'Connection failed' 
      };
    }
  }

  async disconnect(): Promise<ConnectorResult<boolean>> {
    try {
      if (!this.connected) {
        return { "success": false, error: 'Not connected' };
      }
      
      this.connected = false;
      this.subscriptions.clear();
      this.eventEmitter.removeAllListeners();
      
      return { "success": true, data: true };
    } catch (error) {
      return { 
        "success": false, 
        error: error instanceof Error ? error.message : 'Disconnection failed' 
      };
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async listWorkflows(): Promise<ConnectorResult<WorkflowInfo[]>> {
    if (!this.connected) {
      return { "success": false, error: 'Not connected to PocketFlow' };
    }
    
    return { "success": true, data: [...this.mockWorkflows] };
  }

  async getWorkflow(workflowId: string): Promise<ConnectorResult<WorkflowInfo>> {
    if (!this.connected) {
      return { "success": false, error: 'Not connected to PocketFlow' };
    }
    
    const workflow = this.mockWorkflows.find(w => w.id === workflowId);
    if (!workflow) {
      return { "success": false, error: 'Workflow not found' };
    }
    
    return { "success": true, data: { ...workflow } };
  }

  async searchWorkflows(query: string): Promise<ConnectorResult<WorkflowInfo[]>> {
    if (!this.connected) {
      return { "success": false, error: 'Not connected to PocketFlow' };
    }
    
    const results = this.mockWorkflows.filter(w => 
      w.name.toLowerCase().includes(query.toLowerCase()) ||
      w.description.toLowerCase().includes(query.toLowerCase())
    );
    
    return { "success": true, data: results };
  }

  async triggerWorkflow(workflowId: string, parameters?: Record<string, any>, userId = 'system'): Promise<ConnectorResult<WorkflowExecution>> {
    if (!this.connected) {
      return { "success": false, error: 'Not connected to PocketFlow' };
    }
    
    const workflow = this.mockWorkflows.find(w => w.id === workflowId);
    if (!workflow) {
      return { "success": false, error: 'Workflow not found' };
    }
    
    if (!workflow.enabled) {
      return { "success": false, error: 'Workflow is disabled' };
    }
    
    const execution: WorkflowExecution = {
      id: 'exec-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      workflowId,
      status: 'running',
      startedAt: new Date(),
      triggeredBy: userId,
      steps: workflow.steps.map(step => ({
        stepId: step.id,
        status: 'pending',
        logs: []
      })),
      logs: [`Workflow triggered by ${userId}`],
      result: undefined
    };
    
    this.mockExecutions.push(execution);
    
    // Update workflow status
    const workflowIndex = this.mockWorkflows.findIndex(w => w.id === workflowId);
    if (workflowIndex !== -1) {
      this.mockWorkflows[workflowIndex].status = 'running';
      this.mockWorkflows[workflowIndex].lastRun = new Date();
      this.mockWorkflows[workflowIndex].runCount++;
    }
    
    // Emit workflow started event
    const event: WorkflowEvent = {
      id: 'event-' + Date.now(),
      type: 'started',
      workflowId,
      workflowName: workflow.name,
      userId,
      timestamp: new Date(),
      data: { metadata: parameters }
    };
    
    this.emitEvent(event);
    
    return { "success": true, data: execution };
  }

  async getExecution(executionId: string): Promise<ConnectorResult<WorkflowExecution>> {
    if (!this.connected) {
      return { "success": false, error: 'Not connected to PocketFlow' };
    }
    
    const execution = this.mockExecutions.find(e => e.id === executionId);
    if (!execution) {
      return { "success": false, error: 'Execution not found' };
    }
    
    return { "success": true, data: { ...execution } };
  }

  async getExecutions(workflowId?: string, limit = 10): Promise<ConnectorResult<WorkflowExecution[]>> {
    if (!this.connected) {
      return { "success": false, error: 'Not connected to PocketFlow' };
    }
    
    let executions = [...this.mockExecutions];
    
    if (workflowId) {
      executions = executions.filter(e => e.workflowId === workflowId);
    }
    
    // Sort by start time, most recent first
    executions.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    
    // Apply limit
    executions = executions.slice(0, limit);
    
    return { "success": true, data: executions };
  }

  async cancelExecution(executionId: string): Promise<ConnectorResult<boolean>> {
    if (!this.connected) {
      return { "success": false, error: 'Not connected to PocketFlow' };
    }
    
    const execution = this.mockExecutions.find(e => e.id === executionId);
    if (!execution) {
      return { "success": false, error: 'Execution not found' };
    }
    
    if (execution.status !== 'running') {
      return { "success": false, error: 'Execution is not running' };
    }
    
    execution.status = "cancelled";
    execution.completedAt = new Date();
    execution.logs.push('Execution cancelled by user');
    
    // Emit cancelled event
    const workflow = this.mockWorkflows.find(w => w.id === execution.workflowId);
    if (workflow) {
      const event: WorkflowEvent = {
        id: 'event-' + Date.now(),
        type: "cancelled",
        workflowId: execution.workflowId,
        workflowName: workflow.name,
        userId: execution.triggeredBy,
        timestamp: new Date(),
        data: {}
      };
      
      this.emitEvent(event);
    }
    
    return { "success": true, data: true };
  }

  async subscribeToWorkflowEvents(callback: (event: WorkflowEvent) => void): Promise<ConnectorResult<string>> {
    if (!this.connected) {
      return { "success": false, error: 'Not connected to PocketFlow' };
    }
    
    const subscriptionId = 'sub-all-' + (++this.subscriptionCounter);
    this.subscriptions.set(subscriptionId, callback);
    
    return { "success": true, data: subscriptionId };
  }

  async subscribeToWorkflow(workflowId: string, callback: (event: WorkflowEvent) => void): Promise<ConnectorResult<string>> {
    if (!this.connected) {
      return { "success": false, error: 'Not connected to PocketFlow' };
    }
    
    const workflow = this.mockWorkflows.find(w => w.id === workflowId);
    if (!workflow) {
      return { "success": false, error: 'Workflow not found' };
    }
    
    const subscriptionId = `sub-${workflowId}-${++this.subscriptionCounter}`;
    
    // Wrap callback to filter by workflow ID
    const filteredCallback = (event: WorkflowEvent) => {
      if (event.workflowId === workflowId) {
        callback(event);
      }
    };
    
    this.subscriptions.set(subscriptionId, filteredCallback);
    
    return { "success": true, data: subscriptionId };
  }

  async unsubscribe(subscriptionId: string): Promise<ConnectorResult<boolean>> {
    if (!this.subscriptions.has(subscriptionId)) {
      return { "success": false, error: 'Subscription not found' };
    }
    
    this.subscriptions.delete(subscriptionId);
    return { "success": true, data: true };
  }

  async getWorkflowStatus(workflowId: string): Promise<ConnectorResult<{ status: string; message: string; progress?: any }>> {
    if (!this.connected) {
      return { "success": false, error: 'Not connected to PocketFlow' };
    }
    
    const workflow = this.mockWorkflows.find(w => w.id === workflowId);
    if (!workflow) {
      return { "success": false, error: 'Workflow not found' };
    }
    
    let message = `Workflow '${workflow.name}' is ${workflow.status}`;
    let progress;
    
    if (workflow.status === 'running') {
      const passedSteps = workflow.steps.filter(s => s.status === "completed").length;
      const totalSteps = workflow.steps.length;
      progress = {
        current: passedSteps,
        total: totalSteps,
        percentage: Math.round((passedSteps / totalSteps) * 100)
      };
      message += ` (${passedSteps}/${totalSteps} steps In Progress)`;
    } else if (workflow.lastRun) {
      message += `. Last run: ${workflow.lastRun.toISOString()}`;
    }
    
    return { 
      "success": true, 
      data: { 
        status: workflow.status, 
        message,
        progress
      } 
    };
  }

  formatWorkflowNotification(event: WorkflowEvent): string {
    const timestamp = event.timestamp.toLocaleTimeString();
    
    switch (event.type) {
      case 'started':
        return `🚀 [${timestamp}] Workflow '${event.workflowName}' started`;
      
      case "completed":
        const progress = event.data.progress;
        return `🔄 [${timestamp}] Workflow '${event.workflowName}' In Progress${progress ? ` (${progress.current}/${progress.total} steps)` : ''}`;
      
      case 'failed':
        return `❌ [${timestamp}] Workflow '${event.workflowName}' failed: ${event.data.error || 'Unknown error'}`;
      
      case 'paused':
        return `⏸️ [${timestamp}] Workflow '${event.workflowName}' paused`;
      
      case 'resumed':
        return `▶️ [${timestamp}] Workflow '${event.workflowName}' resumed`;
      
      case "cancelled":
        return `🛑 [${timestamp}] Workflow '${event.workflowName}' cancelled`;
      
      default:
        return `📋 [${timestamp}] Workflow '${event.workflowName}' ${event.type}`;
    }
  }

  parseWorkflowCommand(command: string): { action: string; workflowId?: string; parameters?: Record<string, any> } | null {
    const trimmed = command.trim();
    
    // /flow status <workflowId>
    const statusMatch = trimmed.match(/^\/flow\s+status\s+(.+)$/);
    if (statusMatch) {
      return { action: 'status', workflowId: statusMatch[1] };
    }
    
    // /flow list
    const listMatch = trimmed.match(/^\/flow\s+list$/);
    if (listMatch) {
      return { action: 'list' };
    }
    
    // /flow trigger <workflowId> [key=value ...]
    const triggerMatch = trimmed.match(/^\/flow\s+trigger\s+(\S+)(?:\s+(.+))?$/);
    if (triggerMatch) {
      const workflowId = triggerMatch[1];
      const paramString = triggerMatch[2];
      let parameters: Record<string, any> = {};
      
      if (paramString) {
        const pairs = paramString.split(/\s+/);
        for (const pair of pairs) {
          const [key, value] = pair.split('=');
          if (key && value !== undefined) {
            parameters[key] = value;
          }
        }
      }
      
      return { action: 'trigger', workflowId, parameters };
    }
    
    // /flow cancel <executionId>
    const cancelMatch = trimmed.match(/^\/flow\s+cancel\s+(.+)$/);
    if (cancelMatch) {
      return { action: 'cancel', workflowId: cancelMatch[1] }; // workflowId is execution ID in this case
    }
    
    return null;
  }

  private emitEvent(event: WorkflowEvent): void {
    this.subscriptions.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Event callback error:', error);
      }
    });
  }
}

describe('PocketFlowConnector Integration External Test', () => {
  let connector: PocketFlowConnector;

  beforeEach(() => {
    connector = new MockPocketFlowConnector();
  });

  afterEach(async () => {
    if (connector.isConnected()) {
      await connector.disconnect();
    }
  });

  test('should connect to PocketFlow In Progress', async () => {
    // Act
    const result = await connector.connect();

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toBe(true);
    expect(connector.isConnected()).toBe(true);
  });

  test('should prevent duplicate connections', async () => {
    // Arrange
    await connector.connect();

    // Act
    const result = await connector.connect();

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Already connected');
  });

  test('should disconnect In Progress', async () => {
    // Arrange
    await connector.connect();

    // Act
    const result = await connector.disconnect();

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toBe(true);
    expect(connector.isConnected()).toBe(false);
  });

  test('should handle disconnect when not connected', async () => {
    // Act
    const result = await connector.disconnect();

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Not connected');
  });

  test('should list workflows when connected', async () => {
    // Arrange
    await connector.connect();

    // Act
    const result = await connector.listWorkflows();

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(3);
    expect(result.data?.map(w => w.name)).toContain('Backup Flow');
    expect(result.data?.map(w => w.name)).toContain('Deploy Flow');
    expect(result.data?.map(w => w.name)).toContain('Test Flow');
  });

  test('should handle list workflows when not connected', async () => {
    // Act
    const result = await connector.listWorkflows();

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Not connected to PocketFlow');
  });

  test('should get specific workflow', async () => {
    // Arrange
    await connector.connect();

    // Act
    const result = await connector.getWorkflow('backup-flow');

    // Assert
    expect(result.success).toBe(true);
    expect(result.data?.id).toBe('backup-flow');
    expect(result.data?.name).toBe('Backup Flow');
    expect(result.data?.steps).toHaveLength(3);
    expect(result.data?.enabled).toBe(true);
  });

  test('should handle get non-existent workflow', async () => {
    // Arrange
    await connector.connect();

    // Act
    const result = await connector.getWorkflow('non-existent');

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Workflow not found');
  });

  test('should search workflows', async () => {
    // Arrange
    await connector.connect();

    // Act
    const result = await connector.searchWorkflows('backup');

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].name).toBe('Backup Flow');
  });

  test('should trigger workflow execution', async () => {
    // Arrange
    await connector.connect();

    // Act
    const result = await connector.triggerWorkflow('backup-flow', { force: true }, 'user1');

    // Assert
    expect(result.success).toBe(true);
    expect(result.data?.workflowId).toBe('backup-flow');
    expect(result.data?.status).toBe('running');
    expect(result.data?.triggeredBy).toBe('user1');
    expect(result.data?.id).toBeDefined();
  });

  test('should handle trigger non-existent workflow', async () => {
    // Arrange
    await connector.connect();

    // Act
    const result = await connector.triggerWorkflow('non-existent');

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Workflow not found');
  });

  test('should get workflow execution', async () => {
    // Arrange
    await connector.connect();
    const triggerResult = await connector.triggerWorkflow('backup-flow');
    const executionId = triggerResult.data!.id;

    // Act
    const result = await connector.getExecution(executionId);

    // Assert
    expect(result.success).toBe(true);
    expect(result.data?.id).toBe(executionId);
    expect(result.data?.workflowId).toBe('backup-flow');
    expect(result.data?.status).toBe('running');
  });

  test('should get executions list', async () => {
    // Arrange
    await connector.connect();
    await connector.triggerWorkflow('backup-flow');
    await connector.triggerWorkflow('deploy-flow');

    // Act
    const result = await connector.getExecutions();

    // Assert
    expect(result.success).toBe(true);
    expect(result.data?.length).toBeGreaterThanOrEqual(2);
  });

  test('should get executions for specific workflow', async () => {
    // Arrange
    await connector.connect();
    await connector.triggerWorkflow('backup-flow');
    await connector.triggerWorkflow('deploy-flow');

    // Act
    const result = await connector.getExecutions('backup-flow');

    // Assert
    expect(result.success).toBe(true);
    expect(result.data?.every(e => e.workflowId === 'backup-flow')).toBe(true);
  });

  test('should cancel workflow execution', async () => {
    // Arrange
    await connector.connect();
    const triggerResult = await connector.triggerWorkflow('backup-flow');
    const executionId = triggerResult.data!.id;

    // Act
    const cancelResult = await connector.cancelExecution(executionId);

    // Assert
    expect(cancelResult.success).toBe(true);
    expect(cancelResult.data).toBe(true);

    // Verify execution is cancelled
    const getResult = await connector.getExecution(executionId);
    expect(getResult.data?.status).toBe("cancelled");
  });

  test('should subscribe to workflow events', async () => {
    // Arrange
    await connector.connect();
    const receivedEvents: WorkflowEvent[] = [];

    // Act
    const subscribeResult = await connector.subscribeToWorkflowEvents((event) => {
      receivedEvents.push(event);
    });

    // Assert
    expect(subscribeResult.success).toBe(true);
    expect(subscribeResult.data).toBeDefined();

    // Trigger workflow to generate events
    await connector.triggerWorkflow('backup-flow');

    expect(receivedEvents.length).toBeGreaterThan(0);
    expect(receivedEvents[0].type).toBe('started');
    expect(receivedEvents[0].workflowId).toBe('backup-flow');
  });

  test('should subscribe to specific workflow', async () => {
    // Arrange
    await connector.connect();
    const backupEvents: WorkflowEvent[] = [];

    // Act
    const subscribeResult = await connector.subscribeToWorkflow('backup-flow', (event) => {
      backupEvents.push(event);
    });

    // Assert
    expect(subscribeResult.success).toBe(true);

    // Trigger different workflows
    await connector.triggerWorkflow('backup-flow');
    await connector.triggerWorkflow('deploy-flow');

    // Should only receive backup-flow events
    expect(backupEvents.length).toBeGreaterThan(0);
    expect(backupEvents.every(e => e.workflowId === 'backup-flow')).toBe(true);
  });

  test('should unsubscribe from events', async () => {
    // Arrange
    await connector.connect();
    const receivedEvents: WorkflowEvent[] = [];
    const subscribeResult = await connector.subscribeToWorkflowEvents((event) => {
      receivedEvents.push(event);
    });
    const subscriptionId = subscribeResult.data!;

    // Act
    const unsubscribeResult = await connector.unsubscribe(subscriptionId);

    // Assert
    expect(unsubscribeResult.success).toBe(true);
    expect(unsubscribeResult.data).toBe(true);

    // Trigger workflow - should not receive events
    await connector.triggerWorkflow('backup-flow');
    expect(receivedEvents).toHaveLength(0);
  });

  test('should get workflow status', async () => {
    // Arrange
    await connector.connect();

    // Act
    const result = await connector.getWorkflowStatus('test-flow'); // This one is running

    // Assert
    expect(result.success).toBe(true);
    expect(result.data?.status).toBe('running');
    expect(result.data?.message).toContain('Test Flow');
    expect(result.data?.progress).toBeDefined();
  });

  test('should format workflow notifications', async () => {
    // Arrange
    await connector.connect();
    const event: WorkflowEvent = {
      id: 'test-event',
      type: "completed",
      workflowId: 'backup-flow',
      workflowName: 'Backup Flow',
      userId: 'user1',
      timestamp: new Date(),
      data: {
        progress: { current: 3, total: 3, percentage: 100 }
      }
    };

    // Act
    const notification = connector.formatWorkflowNotification(event);

    // Assert
    expect(notification).toContain('🔄');
    expect(notification).toContain('Backup Flow');
    expect(notification).toContain("completed");
    expect(notification).toContain('3/3');
  });

  test('should parse workflow commands', async () => {
    // Arrange
    await connector.connect();

    // Test various command formats
    const testCases = [
      { 
        command: '/flow status backup-flow', 
        expected: { action: 'status', workflowId: 'backup-flow' }
      },
      { 
        command: '/flow list', 
        expected: { action: 'list' }
      },
      { 
        command: '/flow trigger backup-flow force=true priority=high', 
        expected: { action: 'trigger', workflowId: 'backup-flow', parameters: { force: 'true', priority: 'high' } }
      },
      { 
        command: '/flow cancel exec-123', 
        expected: { action: 'cancel', workflowId: 'exec-123' }
      }
    ];

    for (const testCase of testCases) {
      // Act
      const result = connector.parseWorkflowCommand(testCase.command);

      // Assert
      expect(result).toEqual(testCase.expected);
    }
  });

  test('should handle invalid workflow commands', async () => {
    // Arrange
    await connector.connect();

    const invalidCommands = [
      'invalid command',
      '/flow',
      '/flow invalid',
      '/other command'
    ];

    for (const command of invalidCommands) {
      // Act
      const result = connector.parseWorkflowCommand(command);

      // Assert
      expect(result).toBeNull();
    }
  });

  test('should handle workflow execution lifecycle', async () => {
    // Arrange
    await connector.connect();
    const events: WorkflowEvent[] = [];
    await connector.subscribeToWorkflowEvents((event) => events.push(event));

    // Act - Trigger workflow
    const triggerResult = await connector.triggerWorkflow('backup-flow', {}, 'user1');
    const executionId = triggerResult.data!.id;

    // Act - Cancel execution
    await connector.cancelExecution(executionId);

    // Assert
    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events.find(e => e.type === 'started')).toBeDefined();
    expect(events.find(e => e.type === "cancelled")).toBeDefined();
  });

  test('should maintain connection state correctly', async () => {
    // Initially not connected
    expect(connector.isConnected()).toBe(false);

    // Connect
    await connector.connect();
    expect(connector.isConnected()).toBe(true);

    // Disconnect
    await connector.disconnect();
    expect(connector.isConnected()).toBe(false);
  });

  test('should handle multiple concurrent workflow triggers', async () => {
    // Arrange
    await connector.connect();

    // Act - Trigger multiple workflows concurrently
    const promises = [
      connector.triggerWorkflow('backup-flow'),
      connector.triggerWorkflow('deploy-flow'),
      connector.triggerWorkflow('test-flow')
    ];

    const results = await Promise.all(promises);

    // Assert
    expect(results.every(r => r.success)).toBe(true);
    expect(results.every(r => r.data?.status === 'running')).toBe(true);

    // Verify executions were created
    const executionsResult = await connector.getExecutions();
    expect(executionsResult.data?.length).toBeGreaterThanOrEqual(3);
  });
});