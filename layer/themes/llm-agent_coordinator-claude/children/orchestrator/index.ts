/**
 * Agent Orchestrator
 * Manages multiple agents and task distribution
 */

import { EventEmitter } from '../../../infra_external-log-lib/src';

export type AgentRole = 
  | 'coordinator'
  | 'researcher'
  | 'coder'
  | 'reviewer'
  | 'tester'
  | 'documenter'
  | 'specialist';

export interface AgentCapability {
  name: string;
  description: string;
  parameters?: Record<string, any>;
}

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  capabilities: AgentCapability[];
  status: 'idle' | 'busy' | 'error' | 'offline';
  currentTask?: Task;
  metadata?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  };
}

export interface Task {
  id: string;
  type: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  dependencies?: string[];
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';
  result?: TaskResult;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface TaskResult {
  success: boolean;
  output?: any;
  error?: string;
  metrics?: {
    duration?: number;
    tokensUsed?: number;
    retries?: number;
  };
}

export type OrchestrationStrategy = 
  | 'round-robin'
  | 'least-loaded'
  | 'capability-based'
  | 'priority-based'
  | 'hierarchical';

export interface AgentPool {
  agents: Agent[];
  strategy: OrchestrationStrategy;
  maxConcurrent?: number;
}

export class AgentOrchestrator extends EventEmitter {
  private agents: Map<string, Agent>;
  private tasks: Map<string, Task>;
  private taskQueue: Task[];
  private strategy: OrchestrationStrategy;
  private running: boolean;

  constructor(strategy: OrchestrationStrategy = 'capability-based') {
    super();
    this.agents = new Map();
    this.tasks = new Map();
    this.taskQueue = [];
    this.strategy = strategy;
    this.running = false;
  }

  registerAgent(config: Omit<Agent, 'id' | 'status'>): Agent {
    const agent: Agent = {
      ...config,
      id: this.generateAgentId(),
      status: 'idle',
    };

    this.agents.set(agent.id, agent);
    this.emit('agentRegistered', agent);
    
    if (this.running) {
      this.processQueue();
    }
    
    return agent;
  }

  unregisterAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    // Reassign any current task
    if (agent.currentTask) {
      agent.currentTask.assignedTo = undefined;
      agent.currentTask.status = 'pending';
      this.taskQueue.unshift(agent.currentTask);
    }

    this.agents.delete(agentId);
    this.emit('agentUnregistered', agent);
    
    return true;
  }

  createTask(config: Omit<Task, 'id' | 'status' | 'createdAt'>): Task {
    const task: Task = {
      ...config,
      id: this.generateTaskId(),
      status: 'pending',
      createdAt: new Date(),
    };

    this.tasks.set(task.id, task);
    this.taskQueue.push(task);
    
    this.emit('taskCreated', task);
    
    if (this.running) {
      this.processQueue();
    }
    
    return task;
  }

  async start(): Promise<void> {
    if (this.running) return;
    
    this.running = true;
    this.emit('orchestratorStarted');
    
    await this.processQueue();
  }

  stop(): void {
    this.running = false;
    this.emit('orchestratorStopped');
  }

  private async processQueue(): Promise<void> {
    while (this.running && this.taskQueue.length > 0) {
      const task = this.getNextTask();
      if (!task) break;

      const agent = this.selectAgent(task);
      if (!agent) {
        // No available agent, wait and retry
        await this.sleep(1000);
        continue;
      }

      await this.assignTask(task, agent);
    }
  }

  private getNextTask(): Task | undefined {
    // Check dependencies
    const availableTasks = this.taskQueue.filter(task => {
      if (!task.dependencies || task.dependencies.length === 0) {
        return true;
      }
      
      return task.dependencies.every(depId => {
        const dep = this.tasks.get(depId);
        return dep && dep.status === 'completed';
      });
    });

    if (availableTasks.length === 0) return undefined;

    // Sort by priority
    availableTasks.sort((a, b) => {
      const priorities = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorities[b.priority] - priorities[a.priority];
    });

    const task = availableTasks[0];
    const index = this.taskQueue.indexOf(task);
    if (index !== -1) {
      this.taskQueue.splice(index, 1);
    }

    return task;
  }

  private selectAgent(task: Task): Agent | undefined {
    const availableAgents = Array.from(this.agents.values())
      .filter(agent => agent.status === 'idle');

    if (availableAgents.length === 0) return undefined;

    switch (this.strategy) {
      case 'round-robin':
        return availableAgents[0];
        
      case 'least-loaded':
        // In this simple implementation, all idle agents have same load
        return availableAgents[0];
        
      case 'capability-based':
        return this.selectByCapability(availableAgents, task);
        
      case 'priority-based':
        // Select based on task priority and agent role
        return this.selectByPriority(availableAgents, task);
        
      case 'hierarchical':
        // Coordinators assign to specialists
        return this.selectHierarchical(availableAgents, task);
        
      default:
        return availableAgents[0];
    }
  }

  private selectByCapability(agents: Agent[], task: Task): Agent | undefined {
    // Match task type with agent capabilities
    for (const agent of agents) {
      const hasCapability = agent.capabilities.some(
        cap => cap.name === task.type || cap.description.includes(task.type)
      );
      
      if (hasCapability) {
        return agent;
      }
    }
    
    // Fallback to any available agent
    return agents[0];
  }

  private selectByPriority(agents: Agent[], task: Task): Agent | undefined {
    // High priority tasks go to coordinators or specialists
    if (task.priority === 'critical' || task.priority === 'high') {
      const specialist = agents.find(a => 
        a.role === 'coordinator' || a.role === 'specialist'
      );
      if (specialist) return specialist;
    }
    
    return agents[0];
  }

  private selectHierarchical(agents: Agent[], task: Task): Agent | undefined {
    // Implement hierarchical selection
    const roleHierarchy: Record<AgentRole, number> = {
      coordinator: 6,
      specialist: 5,
      reviewer: 4,
      coder: 3,
      tester: 3,
      researcher: 2,
      documenter: 1,
    };

    agents.sort((a, b) => 
      (roleHierarchy[b.role] || 0) - (roleHierarchy[a.role] || 0)
    );

    return agents[0];
  }

  private async assignTask(task: Task, agent: Agent): Promise<void> {
    task.assignedTo = agent.id;
    task.status = 'assigned';
    task.startedAt = new Date();
    
    agent.status = 'busy';
    agent.currentTask = task;
    
    this.emit('taskAssigned', { task, agent });
    
    // Simulate task execution
    try {
      task.status = 'in_progress';
      this.emit('taskStarted', { task, agent });
      
      const result = await this.executeTask(task, agent);
      
      task.status = 'completed';
      task.completedAt = new Date();
      task.result = result;
      
      agent.status = 'idle';
      agent.currentTask = undefined;
      
      this.emit('taskCompleted', { task, agent, result });
    } catch (error: any) {
      task.status = 'failed';
      task.completedAt = new Date();
      task.result = {
        success: false,
        error: error.message,
      };
      
      agent.status = 'idle';
      agent.currentTask = undefined;
      
      this.emit('taskFailed', { task, agent, error });
    }
    
    // Continue processing queue
    if (this.running) {
      this.processQueue();
    }
  }

  private async executeTask(task: Task, agent: Agent): Promise<TaskResult> {
    // This is where actual task execution would happen
    // For now, simulate with a delay
    const duration = Math.random() * 5000 + 1000;
    await this.sleep(duration);
    
    return {
      success: true,
      output: `Task ${task.id} completed by ${agent.name}`,
      metrics: {
        duration,
        tokensUsed: Math.floor(Math.random() * 1000),
        retries: 0,
      },
    };
  }

  delegateTask(taskId: string, fromAgentId: string, toAgentId: string): boolean {
    const task = this.tasks.get(taskId);
    const fromAgent = this.agents.get(fromAgentId);
    const toAgent = this.agents.get(toAgentId);
    
    if (!task || !fromAgent || !toAgent) return false;
    if (toAgent.status !== 'idle') return false;
    
    // Transfer task
    fromAgent.currentTask = undefined;
    fromAgent.status = 'idle';
    
    toAgent.currentTask = task;
    toAgent.status = 'busy';
    
    task.assignedTo = toAgentId;
    
    this.emit('taskDelegated', { task, from: fromAgent, to: toAgent });
    return true;
  }

  getAgentWorkload(agentId: string): {
    current?: Task;
    completed: Task[];
    failed: Task[];
    totalTasks: number;
  } {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return { completed: [], failed: [], totalTasks: 0 };
    }

    const agentTasks = Array.from(this.tasks.values())
      .filter(task => task.assignedTo === agentId);

    return {
      current: agent.currentTask,
      completed: agentTasks.filter(t => t.status === 'completed'),
      failed: agentTasks.filter(t => t.status === 'failed'),
      totalTasks: agentTasks.length,
    };
  }

  getStats(): {
    totalAgents: number;
    activeAgents: number;
    totalTasks: number;
    pendingTasks: number;
    completedTasks: number;
    failedTasks: number;
    averageCompletionTime: number;
  } {
    const tasks = Array.from(this.tasks.values());
    const completedTasks = tasks.filter(t => t.status === 'completed');
    
    const completionTimes = completedTasks
      .filter(t => t.startedAt && t.completedAt)
      .map(t => t.completedAt!.getTime() - t.startedAt!.getTime());

    const averageCompletionTime = completionTimes.length > 0
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
      : 0;

    return {
      totalAgents: this.agents.size,
      activeAgents: Array.from(this.agents.values())
        .filter(a => a.status === 'busy').length,
      totalTasks: tasks.length,
      pendingTasks: this.taskQueue.length,
      completedTasks: completedTasks.length,
      failedTasks: tasks.filter(t => t.status === 'failed').length,
      averageCompletionTime,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateAgentId(): string {
    return `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  getTaskQueue(): Task[] {
    return [...this.taskQueue];
  }
}

export default AgentOrchestrator;