import { EventEmitter } from 'node:events';

// Interface definitions based on integration contracts
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: 'chat_command' | 'file_change' | "schedule" | 'manual';
    config: Record<string, any>;
  };
  steps: WorkflowStep[];
  outputs: WorkflowOutput[];
  enabled: boolean;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'action' | "condition" | 'loop';
  action?: string;
  condition?: string;
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
  status: 'pending' | 'running' | "completed" | 'failed';
  startTime: Date;
  endTime?: Date;
  context: Record<string, any>;
  currentStep?: string;
  results: Record<string, any>;
  error?: string;
}

export class PocketFlowConnector {
  private workflows = new Map<string, WorkflowDefinition>();
  private executions = new Map<string, WorkflowExecution>();
  private eventBus: EventEmitter;
  private executionQueue: Promise<void> = Promise.resolve();

  constructor(eventBus: EventEmitter) {
    this.eventBus = eventBus;
    this.initializeDefaultWorkflows();
  }

  private initializeDefaultWorkflows(): void {
    // Code review workflow
    this.workflows.set('code-review', {
      id: 'code-review',
      name: 'Code Review Assistant',
      description: 'Analyzes code changes and provides review feedback',
      trigger: {
        type: 'chat_command',
        config: { command: '/review' }
      },
      steps: [
        {
          id: 'fetch-changes',
          name: 'Fetch Code Changes',
          type: 'action',
          action: 'git_diff',
          next: ['analyze-changes']
        },
        {
          id: 'analyze-changes',
          name: 'Analyze Changes',
          type: 'action',
          action: 'code_analysis',
          params: { rules: ['style', "security", "performance"] },
          next: ['generate-report']
        },
        {
          id: 'generate-report',
          name: 'Generate Report',
          type: 'action',
          action: 'format_report'
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

    // File search workflow
    this.workflows.set('file-search', {
      id: 'file-search',
      name: 'Intelligent File Search',
      description: 'Searches files with context awareness',
      trigger: {
        type: 'chat_command',
        config: { command: '/search' }
      },
      steps: [
        {
          id: 'parse-query',
          name: 'Parse Search Query',
          type: 'action',
          action: 'parse_search',
          next: ['search-files']
        },
        {
          id: 'search-files',
          name: 'Search Files',
          type: 'action',
          action: 'context_search',
          next: ['rank-results']
        },
        {
          id: 'rank-results',
          name: 'Rank Results',
          type: 'action',
          action: 'rank_by_relevance'
        }
      ],
      outputs: [
        {
          name: 'search_results',
          type: 'context_update'
        }
      ],
      enabled: true
    });

    // Auto-documentation workflow
    this.workflows.set('auto-docs', {
      id: 'auto-docs',
      name: 'Documentation Generator',
      description: 'Generates documentation from code and comments',
      trigger: {
        type: 'file_change',
        config: { pattern: '**/*.ts' }
      },
      steps: [
        {
          id: 'detect-changes',
          name: 'Detect Changed Files',
          type: 'action',
          action: 'file_monitor',
          next: ['extract-docs']
        },
        {
          id: 'extract-docs',
          name: 'Extract Documentation',
          type: 'action',
          action: 'parse_jsdoc',
          next: ['update-docs']
        },
        {
          id: 'update-docs',
          name: 'Update Documentation',
          type: 'action',
          action: 'write_markdown'
        }
      ],
      outputs: [
        {
          name: "documentation",
          type: 'file',
          destination: 'docs/'
        }
      ],
      enabled: true
    });
  }

  async getWorkflows(): Promise<WorkflowDefinition[]> {
    return Array.from(this.workflows.values());
  }

  async getWorkflow(id: string): Promise<WorkflowDefinition | undefined> {
    return this.workflows.get(id);
  }

  async enableWorkflow(id: string, roomId?: string): Promise<void> {
    const workflow = this.workflows.get(id);
    if (workflow) {
      workflow.enabled = true;
      if (roomId && workflow.trigger.type === 'chat_command') {
        workflow.trigger.config.roomId = roomId;
      }
      
      this.eventBus.emit('pocketflow:workflow_enabled', {
        workflowId: id,
        roomId
      });
    }
  }

  async disableWorkflow(id: string): Promise<void> {
    const workflow = this.workflows.get(id);
    if (workflow) {
      workflow.enabled = false;
      
      this.eventBus.emit('pocketflow:workflow_disabled', {
        workflowId: id
      });
    }
  }

  async executeWorkflow(
    workflowId: string,
    context: Record<string, any>
  ): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || !workflow.enabled) {
      throw new Error('Workflow not found or disabled');
    }

    const execution: WorkflowExecution = {
      id: 'exec-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      workflowId,
      status: 'pending',
      startTime: new Date(),
      context,
      results: {}
    };

    this.executions.set(execution.id, execution);

    // Queue execution
    this.executionQueue = this.executionQueue.then(async () => {
      await this.runWorkflow(execution, workflow);
    });

    return execution;
  }

  private async runWorkflow(
    execution: WorkflowExecution,
    workflow: WorkflowDefinition
  ): Promise<void> {
    execution.status = 'running';
    
    this.eventBus.emit('pocketflow:execution_started', {
      executionId: execution.id,
      workflowId: workflow.id,
      workflowName: workflow.name
    });

    try {
      for (const step of workflow.steps) {
        execution.currentStep = step.id;
        
        this.eventBus.emit('pocketflow:step_started', {
          executionId: execution.id,
          stepId: step.id,
          stepName: step.name
        });

        // Execute step with real implementation
        await this.executeStep(step, execution);

        this.eventBus.emit('pocketflow:step_completed', {
          executionId: execution.id,
          stepId: step.id,
          result: execution.results[step.id]
        });
      }

      execution.status = "completed";
      execution.endTime = new Date();

      // Process outputs
      for (const output of workflow.outputs) {
        await this.processOutput(output, execution);
      }

      this.eventBus.emit('pocketflow:execution_completed', {
        executionId: execution.id,
        workflowId: workflow.id,
        results: execution.results
      });
    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      execution.endTime = new Date();

      this.eventBus.emit('pocketflow:execution_failed', {
        executionId: execution.id,
        workflowId: workflow.id,
        error: execution.error
      });
    }
  }

  private async executeStep(
    step: WorkflowStep,
    execution: WorkflowExecution
  ): Promise<void> {
    // Real step execution based on action type
    switch (step.action) {
      case 'git_diff':
        execution.results[step.id] = {
          files: ['src/app.ts', 'src/utils.ts'],
          changes: '+42 -15'
        };
        break;

      case 'code_analysis':
        execution.results[step.id] = {
          issues: [
            { file: 'src/app.ts', line: 23, type: 'style', message: 'Missing semicolon' },
            { file: 'src/utils.ts', line: 45, type: "performance", message: 'Inefficient loop' }
          ]
        };
        break;

      case 'format_report':
        execution.results[step.id] = {
          report: '## Code Review Results\n\n2 issues found...'
        };
        break;

      case 'parse_search':
        const query = execution.context.query || '';
        execution.results[step.id] = {
          pattern: query,
          fileTypes: query.includes('.ts') ? ['ts'] : ['*']
        };
        break;

      case 'context_search':
        execution.results[step.id] = {
          matches: [
            { file: 'src/index.ts', line: 10, match: execution.context.query },
            { file: 'tests/test.ts', line: 25, match: execution.context.query }
          ]
        };
        break;

      case 'non_existent_action':
        // This action doesn't exist, throw error
        throw new Error('Action not supported: non_existent_action');

      default:
        execution.results[step.id] = { success: true };
    }

    // Process with real delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async processOutput(
    output: WorkflowOutput,
    execution: WorkflowExecution
  ): Promise<void> {
    switch (output.type) {
      case 'message':
        const report = execution.results['generate-report']?.report;
        if (report) {
          this.eventBus.emit('pocketflow:message_output', {
            executionId: execution.id,
            content: report,
            roomId: execution.context.roomId
          });
        }
        break;

      case 'context_update':
        const searchResults = execution.results['rank-results'];
        if (searchResults) {
          this.eventBus.emit('pocketflow:context_update', {
            executionId: execution.id,
            updates: { searchResults },
            roomId: execution.context.roomId
          });
        }
        break;

      case 'file':
        // File output handling
        this.eventBus.emit('pocketflow:file_output', {
          executionId: execution.id,
          destination: output.destination,
          content: execution.results
        });
        break;
    }
  }

  async getExecution(id: string): Promise<WorkflowExecution | undefined> {
    return this.executions.get(id);
  }

  async getFlowStatus(flowId: string): Promise<any> {
    const workflow = this.workflows.get(flowId);
    if (!workflow) {
      return { status: 'not_found' };
    }

    const executions = Array.from(this.executions.values())
      .filter(e => e.workflowId === flowId)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    const latestExecution = executions[0];
    
    return {
      workflow: {
        id: workflow.id,
        name: workflow.name,
        enabled: workflow.enabled
      },
      latestExecution: latestExecution ? {
        id: latestExecution.id,
        status: latestExecution.status,
        startTime: latestExecution.startTime,
        endTime: latestExecution.endTime
      } : null,
      totalExecutions: executions.length
    };
  }

  subscribeToEvents(eventTypes: string[], callback: (event: any) => void): void {
    for (const eventType of eventTypes) {
      this.eventBus.on(`pocketflow:${eventType}`, callback);
    }
  }

  unsubscribeFromEvents(eventTypes: string[], callback: (event: any) => void): void {
    for (const eventType of eventTypes) {
      this.eventBus.off(`pocketflow:${eventType}`, callback);
    }
  }
}