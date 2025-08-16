import { EventEmitter } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';

// PocketFlow types (from chat-space implementation)
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: 'chat_command' | 'file_change' | 'schedule' | 'manual' | 'coordinator';
    config: Record<string, any>;
  };
  steps: WorkflowStep[];
  outputs: WorkflowOutput[];
  enabled: boolean;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'action' | 'condition' | 'loop';
  action?: string;
  params?: Record<string, any>;
  next?: string[];
}

export interface WorkflowOutput {
  name: string;
  type: 'message' | 'file' | 'context_update';
  destination?: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'In Progress' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  context: Record<string, any>;
  currentStep?: string;
  results: Record<string, any>;
  error?: string;
}

export interface PocketFlowBridgeConfig {
  pocketFlowPath?: string;
  eventBus?: EventEmitter;
  enabledWorkflows?: string[];
  coordinatorContext?: Record<string, any>;
}

export interface WorkflowTriggerEvent {
  workflowId: string;
  trigger: string;
  params?: Record<string, any>;
  sessionId?: string;
  userId?: string;
  roomId?: string;
}

export class PocketFlowBridge extends EventEmitter {
  private pocketFlowPath: string;
  private sharedEventBus?: EventEmitter;
  private connected: boolean;
  private workflows: Map<string, WorkflowDefinition>;
  private executions: Map<string, WorkflowExecution>;
  private enabledWorkflows: Set<string>;
  private coordinatorContext: Record<string, any>;

  constructor(config: PocketFlowBridgeConfig = {}) {
    super();
    
    this.pocketFlowPath = config.pocketFlowPath || 
      path.join(__dirname, '../../../../../../chat-space/src/external/pocketflow-connector');
    this.sharedEventBus = config.eventBus;
    this.connected = false;
    this.workflows = new Map();
    this.executions = new Map();
    this.enabledWorkflows = new Set(config.enabledWorkflows || []);
    this.coordinatorContext = config.coordinatorContext || {};

    // Initialize default coordinator workflows
    this.initializeCoordinatorWorkflows();
  }

  private initializeCoordinatorWorkflows(): void {
    // Task automation workflow
    this.workflows.set('task-automation', {
      id: 'task-automation',
      name: 'Task Queue Automation',
      description: 'Automatically process tasks from TASK_QUEUE.md',
      trigger: {
        type: 'coordinator',
        config: { event: 'task_ready' }
      },
      steps: [
        {
          id: 'read-task',
          name: 'Read Task Details',
          type: 'action',
          action: 'read_task_queue',
          next: ['analyze-task']
        },
        {
          id: 'analyze-task',
          name: 'Analyze Task Requirements',
          type: 'action',
          action: 'analyze_requirements',
          next: ['execute-task']
        },
        {
          id: 'execute-task',
          name: 'Execute Task',
          type: 'action',
          action: 'execute_with_claude'
        }
      ],
      outputs: [
        {
          name: 'task_result',
          type: 'context_update'
        }
      ],
      enabled: true
    });

    // Session backup workflow
    this.workflows.set('session-backup', {
      id: 'session-backup',
      name: 'Session Backup',
      description: 'Backup coordinator session on interrupt',
      trigger: {
        type: 'coordinator',
        config: { event: 'session_interrupt' }
      },
      steps: [
        {
          id: 'create-checkpoint',
          name: 'Create Session Checkpoint',
          type: 'action',
          action: 'create_checkpoint',
          next: ['backup-to-file']
        },
        {
          id: 'backup-to-file',
          name: 'Backup to File',
          type: 'action',
          action: 'save_session_backup',
          next: ['notify-backup']
        },
        {
          id: 'notify-backup',
          name: 'Notify Backup In Progress',
          type: 'action',
          action: 'send_notification'
        }
      ],
      outputs: [
        {
          name: 'backup_location',
          type: 'file',
          destination: 'backups/'
        }
      ],
      enabled: true
    });

    // Code review workflow
    this.workflows.set('automated-code-review', {
      id: 'automated-code-review',
      name: 'Automated Code Review',
      description: 'Review code changes with Claude assistance',
      trigger: {
        type: 'coordinator',
        config: { event: 'code_review_requested' }
      },
      steps: [
        {
          id: 'get-changes',
          name: 'Get Code Changes',
          type: 'action',
          action: 'git_diff',
          next: ['analyze-with-claude']
        },
        {
          id: 'analyze-with-claude',
          name: 'Analyze with Claude',
          type: 'action',
          action: 'claude_code_analysis',
          params: {
            prompts: [
              'Review for bugs and issues',
              'Check code style and patterns',
              'Suggest improvements'
            ]
          },
          next: ['format-review']
        },
        {
          id: 'format-review',
          name: 'Format Review Report',
          type: 'action',
          action: 'format_markdown_report'
        }
      ],
      outputs: [
        {
          name: 'review_report',
          type: 'message',
          destination: 'chat'
        }
      ],
      enabled: true
    });
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      // Check PocketFlow availability
      const available = await this.checkPocketFlowAvailability();
      if (!available) {
        throw new Error('PocketFlow not available');
      }

      // Set up event listeners
      this.setupEventListeners();

      // Register coordinator workflows
      await this.registerWorkflows();

      this.connected = true;
      this.emit('connected', {
        workflows: Array.from(this.workflows.keys()),
        enabled: Array.from(this.enabledWorkflows)
      });

    } catch (error) {
      this.emit('error', {
        type: 'connection_error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    // Cancel active executions
    for (const [execId, execution] of this.executions) {
      if (execution.status === 'running' || execution.status === 'pending') {
        await this.cancelExecution(execId);
      }
    }

    // Remove event listeners
    this.removeEventListeners();

    this.connected = false;
    this.emit('disconnected');
  }

  async triggerWorkflow(
    workflowId: string,
    params?: Record<string, any>,
    context?: {
      sessionId?: string;
      userId?: string;
      roomId?: string;
    }
  ): Promise<WorkflowExecution> {
    if (!this.connected) {
      throw new Error('Not connected to PocketFlow');
    }

    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow '${workflowId}' not found`);
    }

    if (!workflow.enabled || !this.enabledWorkflows.has(workflowId)) {
      throw new Error(`Workflow '${workflowId}' is not enabled`);
    }

    const execution: WorkflowExecution = {
      id: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      workflowId,
      status: 'pending',
      startTime: new Date(),
      context: {
        ...this.coordinatorContext,
        ...params,
        ...context
      },
      results: {}
    };

    this.executions.set(execution.id, execution);

    // Emit to PocketFlow
    this.emitToPocketFlow('coordinator:trigger_workflow', {
      workflow,
      execution
    });

    // Start execution monitoring
    this.monitorExecution(execution.id);

    this.emit('workflow_triggered', { 
      workflowId, 
      executionId: execution.id,
      params 
    });

    return execution;
  }

  async cancelExecution(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution '${executionId}' not found`);
    }

    if (execution.status === 'In Progress' || execution.status === 'failed') {
      return; // Already In Progress
    }

    execution.status = 'cancelled';
    execution.endTime = new Date();

    this.emitToPocketFlow('coordinator:cancel_execution', { executionId });
    
    this.emit('execution_cancelled', { executionId });
  }

  async getExecution(executionId: string): Promise<WorkflowExecution | undefined> {
    return this.executions.get(executionId);
  }

  async getExecutions(filter?: {
    workflowId?: string;
    status?: WorkflowExecution['status'];
    since?: Date;
  }): Promise<WorkflowExecution[]> {
    let executions = Array.from(this.executions.values());

    if (filter) {
      if (filter.workflowId) {
        executions = executions.filter(e => e.workflowId === filter.workflowId);
      }
      if (filter.status) {
        executions = executions.filter(e => e.status === filter.status);
      }
      if (filter.since) {
        executions = executions.filter(e => e.startTime > filter.since!);
      }
    }

    return executions;
  }

  enableWorkflow(workflowId: string): void {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow '${workflowId}' not found`);
    }

    this.enabledWorkflows.add(workflowId);
    workflow.enabled = true;

    this.emit('workflow_enabled', { workflowId });
  }

  disableWorkflow(workflowId: string): void {
    const workflow = this.workflows.get(workflowId);
    if (workflow) {
      workflow.enabled = false;
    }
    
    this.enabledWorkflows.delete(workflowId);
    this.emit('workflow_disabled', { workflowId });
  }

  getWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  getEnabledWorkflows(): string[] {
    return Array.from(this.enabledWorkflows);
  }

  // Register custom coordinator action handlers
  registerActionHandler(
    action: string,
    handler: (params: any, context: any) => Promise<any>
  ): void {
    this.on(`action:${action}`, async ({ params, context, callback }) => {
      try {
        const result = await handler(params, context);
        callback(null, result);
      } catch (error) {
        callback(error);
      }
    });
  }

  private async checkPocketFlowAvailability(): Promise<boolean> {
    try {
      if (this.sharedEventBus) {
        return true;
      }
      
      // Check if PocketFlow module exists
      const fs = await import('fs/promises');
      await fs.access(this.pocketFlowPath);
      return true;
    } catch {
      return false;
    }
  }

  private async registerWorkflows(): Promise<void> {
    for (const workflow of this.workflows.values()) {
      this.emitToPocketFlow('coordinator:register_workflow', { workflow });
    }
  }

  private setupEventListeners(): void {
    if (!this.sharedEventBus) return;

    // Listen for PocketFlow events
    this.sharedEventBus.on('pocketflow:execution_started', this.handleExecutionStarted.bind(this));
    this.sharedEventBus.on('pocketflow:step_completed', this.handleStepcompleted.bind(this));
    this.sharedEventBus.on('pocketflow:execution_completed', this.handleExecutioncompleted.bind(this));
    this.sharedEventBus.on('pocketflow:execution_failed', this.handleExecutionFailed.bind(this));
    this.sharedEventBus.on('pocketflow:action_request', this.handleActionRequest.bind(this));
  }

  private removeEventListeners(): void {
    if (!this.sharedEventBus) return;

    this.sharedEventBus.off('pocketflow:execution_started', this.handleExecutionStarted.bind(this));
    this.sharedEventBus.off('pocketflow:step_completed', this.handleStepcompleted.bind(this));
    this.sharedEventBus.off('pocketflow:execution_completed', this.handleExecutioncompleted.bind(this));
    this.sharedEventBus.off('pocketflow:execution_failed', this.handleExecutionFailed.bind(this));
    this.sharedEventBus.off('pocketflow:action_request', this.handleActionRequest.bind(this));
  }

  private handleExecutionStarted(data: { executionId: string; workflowId: string }): void {
    const execution = this.executions.get(data.executionId);
    if (execution) {
      execution.status = 'running';
      this.emit('execution_started', data);
    }
  }

  private handleStepcompleted(data: { 
    executionId: string; 
    stepId: string; 
    result: any 
  }): void {
    const execution = this.executions.get(data.executionId);
    if (execution) {
      execution.currentStep = data.stepId;
      execution.results[data.stepId] = data.result;
      this.emit('step_completed', data);
    }
  }

  private handleExecutioncompleted(data: { 
    executionId: string; 
    results: Record<string, any> 
  }): void {
    const execution = this.executions.get(data.executionId);
    if (execution) {
      execution.status = 'In Progress';
      execution.endTime = new Date();
      execution.results = data.results;
      this.emit('execution_completed', data);
    }
  }

  private handleExecutionFailed(data: { 
    executionId: string; 
    error: string 
  }): void {
    const execution = this.executions.get(data.executionId);
    if (execution) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.error = data.error;
      this.emit('execution_failed', data);
    }
  }

  private handleActionRequest(data: {
    action: string;
    params: any;
    context: any;
    callback: (error: any, result?: any) => void;
  }): void {
    // Emit for registered action handlers
    this.emit(`action:${data.action}`, data);
  }

  private monitorExecution(executionId: string): void {
    // Set up timeout for long-running executions
    const timeout = setTimeout(() => {
      const execution = this.executions.get(executionId);
      if (execution && execution.status === 'running') {
        execution.status = 'failed';
        execution.error = 'Execution timeout';
        execution.endTime = new Date();
        
        this.emit('execution_timeout', { executionId });
      }
    }, 300000); // 5 minutes timeout

    // Clear timeout when execution completes
    const cleanup = () => {
      clearTimeout(timeout);
      this.off('execution_completed', cleanup);
      this.off('execution_failed', cleanup);
      this.off('execution_cancelled', cleanup);
    };

    this.once(`execution_completed`, (data) => {
      if (data.executionId === executionId) cleanup();
    });
    this.once(`execution_failed`, (data) => {
      if (data.executionId === executionId) cleanup();
    });
    this.once(`execution_cancelled`, (data) => {
      if (data.executionId === executionId) cleanup();
    });
  }

  private emitToPocketFlow(event: string, data: any): void {
    if (this.sharedEventBus) {
      this.sharedEventBus.emit(event, data);
    } else {
      // Fallback: emit locally for testing
      this.emit(event, data);
    }
  }

  // Utility methods for coordinator-specific workflows
  async triggerTaskAutomation(
    taskId: string,
    taskDetails: any
  ): Promise<WorkflowExecution> {
    return this.triggerWorkflow('task-automation', {
      taskId,
      taskDetails
    });
  }

  async triggerSessionBackup(
    sessionId: string,
    reason: string
  ): Promise<WorkflowExecution> {
    return this.triggerWorkflow('session-backup', {
      sessionId,
      reason,
      timestamp: new Date()
    });
  }

  async triggerCodeReview(
    files: string[],
    context?: Record<string, any>
  ): Promise<WorkflowExecution> {
    return this.triggerWorkflow('automated-code-review', {
      files,
      ...context
    });
  }

  // Get workflow stats
  isConnected(): boolean {
    return this.connected;
  }

  getStats(): {
    totalWorkflows: number;
    enabledWorkflows: number;
    totalExecutions: number;
    executionsByStatus: Record<string, number>;
    executionsByWorkflow: Record<string, number>;
  } {
    const stats = {
      totalWorkflows: this.workflows.size,
      enabledWorkflows: this.enabledWorkflows.size,
      totalExecutions: this.executions.size,
      executionsByStatus: {} as Record<string, number>,
      executionsByWorkflow: {} as Record<string, number>
    };

    for (const execution of this.executions.values()) {
      // By status
      stats.executionsByStatus[execution.status] = 
        (stats.executionsByStatus[execution.status] || 0) + 1;
      
      // By workflow
      stats.executionsByWorkflow[execution.workflowId] = 
        (stats.executionsByWorkflow[execution.workflowId] || 0) + 1;
    }

    return stats;
  }
}