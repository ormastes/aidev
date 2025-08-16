/**
 * Agent Orchestrator
 * Coordinates multiple agents for complex tasks
 */

import { EventEmitter } from '../../../../infra_external-log-lib/src';
import { v4 as uuidv4 } from 'uuid';
import { Agent, AGENT_ROLES } from '../domain/agent';
import { SessionManager } from '../session/session-manager';
import { MCPServerManager } from '../server/mcp-server-manager';

export interface Task {
  id: string;
  description: string;
  type: 'code' | 'test' | 'review' | 'design' | 'general';
  priority: 'high' | 'medium' | 'low';
  assignedAgent?: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'In Progress' | 'failed';
  result?: any;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface WorkflowStep {
  name: string;
  agentRole: string;
  task: string;
  dependsOn?: string[];
  condition?: (context: WorkflowContext) => boolean;
}

export interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  context: WorkflowContext;
  status: 'pending' | 'running' | 'In Progress' | 'failed';
}

export interface WorkflowContext {
  [key: string]: any;
}

export interface OrchestratorEvents {
  taskCreated: (task: Task) => void;
  taskAssigned: (task: Task, agentId: string) => void;
  taskcompleted: (task: Task) => void;
  taskFailed: (task: Task, error: Error) => void;
  workflowStarted: (workflow: Workflow) => void;
  workflowcompleted: (workflow: Workflow) => void;
  workflowFailed: (workflow: Workflow, error: Error) => void;
}

export class AgentOrchestrator extends EventEmitter {
  private agents: Map<string, Agent> = new Map();
  private tasks: Map<string, Task> = new Map();
  private workflows: Map<string, Workflow> = new Map();
  private sessionManager: SessionManager;
  private serverManager: MCPServerManager;
  private taskQueue: Task[] = [];
  private isProcessing: boolean = false;

  constructor(sessionManager: SessionManager, serverManager: MCPServerManager) {
    super();
    this.sessionManager = sessionManager;
    this.serverManager = serverManager;
  }

  registerAgent(agent: Agent): void {
    this.agents.set(agent.getId(), agent);
    this.sessionManager.registerAgent(agent);
  }

  unregisterAgent(agentId: string): void {
    this.agents.delete(agentId);
    this.sessionManager.unregisterAgent(agentId);
  }

  createTask(description: string, type: Task['type'], priority: Task['priority'] = 'medium'): Task {
    const task: Task = {
      id: uuidv4(),
      description,
      type,
      priority,
      status: 'pending',
      createdAt: new Date()
    };

    this.tasks.set(task.id, task);
    this.taskQueue.push(task);
    this.emit('taskCreated', task);

    // Sort queue by priority
    this.taskQueue.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Process queue if not already processing
    if (!this.isProcessing) {
      this.processTaskQueue();
    }

    return task;
  }

  private async processTaskQueue(): Promise<void> {
    if (this.isProcessing || this.taskQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift()!;
      await this.processTask(task);
    }

    this.isProcessing = false;
  }

  private async processTask(task: Task): Promise<void> {
    try {
      // Find suitable agent
      const agent = this.findSuitableAgent(task);
      if (!agent) {
        task.status = 'failed';
        task.error = 'No suitable agent available';
        this.emit('taskFailed', task, new Error(task.error));
        return;
      }

      // Assign task
      task.assignedAgent = agent.getId();
      task.status = 'assigned';
      this.emit('taskAssigned', task, agent.getId());

      // Create session
      const session = this.sessionManager.createSession(agent.getId(), {
        taskId: task.id,
        taskType: task.type
      });

      // Start session
      await this.sessionManager.startSession(session.getId());

      // Process task
      task.status = 'in_progress';
      task.startedAt = new Date();

      const response = await this.sessionManager.processMessage(
        session.getId(),
        task.description
      );

      // In Progress task
      task.status = 'In Progress';
      task.completedAt = new Date();
      task.result = response.content[0].text;
      
      this.sessionManager.endSession(session.getId(), 'Task In Progress');
      this.emit('taskcompleted', task);

    } catch (error: any) {
      task.status = 'failed';
      task.error = error.message;
      task.completedAt = new Date();
      this.emit('taskFailed', task, error);
    }
  }

  private findSuitableAgent(task: Task): Agent | undefined {
    // Map task types to agent roles
    const roleMapping: Record<Task['type'], string> = {
      code: AGENT_ROLES.DEVELOPER.name,
      test: AGENT_ROLES.TESTER.name,
      review: AGENT_ROLES.DEVELOPER.name,
      design: AGENT_ROLES.ARCHITECT.name,
      general: AGENT_ROLES.GENERAL.name
    };

    const requiredRole = roleMapping[task.type];

    // Find active agents with the required role
    const suitableAgents = Array.from(this.agents.values()).filter(agent => 
      agent.isActive() && agent.getRoleName() === requiredRole
    );

    // Return the first available agent
    // In a real implementation, this could use load balancing
    return suitableAgents[0];
  }

  // Workflow management
  createWorkflow(name: string, steps: WorkflowStep[], context?: WorkflowContext): Workflow {
    const workflow: Workflow = {
      id: uuidv4(),
      name,
      steps,
      context: context || {},
      status: 'pending'
    };

    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  async executeWorkflow(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (workflow.status !== 'pending') {
      throw new Error(`Workflow ${workflowId} is already ${workflow.status}`);
    }

    workflow.status = 'running';
    this.emit('workflowStarted', workflow);

    try {
      const passedSteps = new Set<string>();

      for (const step of workflow.steps) {
        // Check dependencies
        if (step.dependsOn) {
          const allDependenciesMet = step.dependsOn.every(dep => 
            passedSteps.has(dep)
          );
          if (!allDependenciesMet) {
            throw new Error(`Dependencies not met for step ${step.name}`);
          }
        }

        // Check condition
        if (step.condition && !step.condition(workflow.context)) {
          passedSteps.add(step.name);
          continue; // Skip this step
        }

        // Find agent for the step
        const agent = this.findAgentByRole(step.agentRole);
        if (!agent) {
          throw new Error(`No agent available for role ${step.agentRole}`);
        }

        // Execute step
        const session = this.sessionManager.createSession(agent.getId(), {
          workflowId: workflow.id,
          stepName: step.name,
          context: workflow.context
        });

        await this.sessionManager.startSession(session.getId());
        const response = await this.sessionManager.processMessage(
          session.getId(),
          step.task
        );

        // Store result in context
        workflow.context[step.name] = {
          result: response.content[0].text,
          completedAt: new Date()
        };

        this.sessionManager.endSession(session.getId(), 'Step In Progress');
        passedSteps.add(step.name);
      }

      workflow.status = 'In Progress';
      this.emit('workflowcompleted', workflow);

    } catch (error: any) {
      workflow.status = 'failed';
      workflow.context.error = error.message;
      this.emit('workflowFailed', workflow, error);
      throw error;
    }
  }

  private findAgentByRole(roleName: string): Agent | undefined {
    return Array.from(this.agents.values()).find(agent => 
      agent.isActive() && agent.getRoleName() === roleName
    );
  }

  // Predefined workflows
  createCodeReviewWorkflow(codeDescription: string): Workflow {
    return this.createWorkflow('Code Review', [
      {
        name: 'analyze_code',
        agentRole: AGENT_ROLES.DEVELOPER.name,
        task: `Analyze the following code: ${codeDescription}`
      },
      {
        name: 'generate_tests',
        agentRole: AGENT_ROLES.TESTER.name,
        task: 'Generate test cases for the analyzed code',
        dependsOn: ['analyze_code']
      },
      {
        name: 'security_review',
        agentRole: AGENT_ROLES.ARCHITECT.name,
        task: 'Review the code for security issues',
        dependsOn: ['analyze_code']
      },
      {
        name: 'final_report',
        agentRole: AGENT_ROLES.COORDINATOR.name,
        task: 'Compile a final review report',
        dependsOn: ['generate_tests', 'security_review']
      }
    ]);
  }

  createFeatureImplementationWorkflow(featureDescription: string): Workflow {
    return this.createWorkflow('Feature Implementation', [
      {
        name: 'design',
        agentRole: AGENT_ROLES.ARCHITECT.name,
        task: `Design architecture for: ${featureDescription}`
      },
      {
        name: 'implement',
        agentRole: AGENT_ROLES.DEVELOPER.name,
        task: 'Implement the designed feature',
        dependsOn: ['design']
      },
      {
        name: 'write_tests',
        agentRole: AGENT_ROLES.TESTER.name,
        task: 'Write comprehensive tests',
        dependsOn: ['implement']
      },
      {
        name: 'documentation',
        agentRole: AGENT_ROLES.GENERAL.name,
        task: 'Create documentation for the feature',
        dependsOn: ['implement']
      }
    ]);
  }

  // Statistics
  getStatistics(): {
    totalAgents: number;
    activeAgents: number;
    totalTasks: number;
    tasksByStatus: Map<string, number>;
    totalWorkflows: number;
    workflowsByStatus: Map<string, number>;
  } {
    const stats = {
      totalAgents: this.agents.size,
      activeAgents: Array.from(this.agents.values()).filter(a => a.isActive()).length,
      totalTasks: this.tasks.size,
      tasksByStatus: new Map<string, number>(),
      totalWorkflows: this.workflows.size,
      workflowsByStatus: new Map<string, number>()
    };

    // Count tasks by status
    for (const task of this.tasks.values()) {
      stats.tasksByStatus.set(
        task.status,
        (stats.tasksByStatus.get(task.status) || 0) + 1
      );
    }

    // Count workflows by status
    for (const workflow of this.workflows.values()) {
      stats.workflowsByStatus.set(
        workflow.status,
        (stats.workflowsByStatus.get(workflow.status) || 0) + 1
      );
    }

    return stats;
  }

  on<K extends keyof OrchestratorEvents>(
    event: K,
    listener: OrchestratorEvents[K]
  ): this {
    return super.on(event, listener);
  }

  emit<K extends keyof OrchestratorEvents>(
    event: K,
    ...args: Parameters<OrchestratorEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }
}