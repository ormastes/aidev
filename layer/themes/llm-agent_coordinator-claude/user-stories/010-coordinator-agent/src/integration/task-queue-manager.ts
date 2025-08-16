import { EventEmitter } from '../../../../../infra_external-log-lib/src';
import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'IN_PROGRESS' | 'failed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
  dependencies?: string[];
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

export interface TaskQueueConfig {
  queuePath: string;
  autoReload?: boolean;
  reloadInterval?: number;
  maxConcurrentTasks?: number;
}

export interface TaskProgress {
  taskId: string;
  progress: number; // 0-100
  message?: string;
  details?: Record<string, any>;
}

export interface TaskResult {
  taskId: string;
  status: 'IN_PROGRESS' | 'failed';
  result?: any;
  error?: string;
  duration: number;
}

export class TaskQueueManager extends EventEmitter {
  private queuePath: string;
  private tasks: Map<string, Task>;
  private taskOrder: string[];
  private autoReload: boolean;
  private reloadInterval: number;
  private maxConcurrentTasks: number;
  private activeTasks: Set<string>;
  private reloadTimer?: NodeJS.Timeout;
  private lastModified?: Date;
  private queueLocked: boolean;

  constructor(config: TaskQueueConfig) {
    async super();
    
    this.queuePath = config.queuePath;
    this.tasks = new Map();
    this.taskOrder = [];
    this.autoReload = config.autoReload !== false;
    this.reloadInterval = config.reloadInterval || 5000; // 5 seconds
    this.maxConcurrentTasks = config.maxConcurrentTasks || 1;
    this.activeTasks = new Set();
    this.queueLocked = false;
  }

  async initialize(): Promise<void> {
    try {
      await this.loadQueue();
      
      if(this.autoReload) {
        this.startAutoReload();
      }
      
      this.emit('initialized', { 
        taskCount: this.tasks.size,
        queuePath: this.queuePath 
      });
    } catch (error) {
      this.emit('error', {
        type: 'initialization_error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async loadQueue(): Promise<void> {
    try {
      const content = await fs.readFile(this.queuePath, 'utf-8');
      const stats = await fs.stat(this.queuePath);
      
      // Check if file has been modified
      if(this.lastModified && stats.mtime <= this.lastModified) {
        return; // No changes
      }
      
      this.lastModified = stats.mtime;
      
      // Parse TASK_QUEUE.md format
      const parsedTasks = this.parseTaskQueue(content);
      
      // Update task map
      this.tasks.clear();
      this.taskOrder = [];
      
      for(const task of parsedTasks) {
        this.tasks.set(task.id, task);
        this.taskOrder.push(task.id);
      }
      
      this.emit('queue_loaded', {
        taskCount: this.tasks.size,
        tasks: Array.from(this.tasks.values())
      });
    } catch (error) {
      if((error as any).code === 'ENOENT') {
        // Create empty queue file
        await this.saveQueue();
      } else {
        throw error;
      }
    }
  }

  async saveQueue(): Promise<void> {
    if(this.queueLocked) {
      this.emit('warning', { 
        message: 'Queue is locked, skipping save' 
      });
      return;
    }
    
    const content = this.formatTaskQueue();
    await fileAPI.createFile(this.queuePath, content, { type: FileType.TEMPORARY });
    
    const stats = await fs.stat(this.queuePath);
    this.lastModified = stats.mtime;
    
    this.emit('queue_saved', {
      taskCount: this.tasks.size
    });
  }

  async addTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
    const newTask: Task = {
      id: this.generateTaskId(),
      createdAt: new Date(),
      ...task,
      status: task.status || 'pending'
    };
    
    // Validate dependencies
    if(newTask.dependencies) {
      for(const depId of newTask.dependencies) {
        if (!this.tasks.has(depId)) {
          throw new Error(`Dependency '${depId}' not found`);
        }
      }
    }
    
    this.tasks.set(newTask.id, newTask);
    this.taskOrder.push(newTask.id);
    
    await this.saveQueue();
    
    this.emit('task_added', { task: newTask });
    
    // Check if we can start this task
    this.processNextTask();
    
    return newTask;
  }

  async updateTask(
    taskId: string, 
    updates: Partial<Task>
  ): Promise<Task> {
    const task = this.tasks.get(taskId);
    if(!task) {
      throw new Error(`Task '${taskId}' not found`);
    }
    
    const updatedTask = { ...task, ...updates };
    
    // Handle status transitions
    if(updates.status && updates.status !== task.status) {
      await this.handleStatusTransition(task, updates.status);
    }
    
    this.tasks.set(taskId, updatedTask);
    await this.saveQueue();
    
    this.emit('task_updated', { 
      taskId,
      updates,
      task: updatedTask 
    });
    
    return updatedTask;
  }

  async startTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if(!task) {
      throw new Error(`Task '${taskId}' not found`);
    }
    
    if (task.status !== 'pending') {
      throw new Error(`Task '${taskId}' is not pending`);
    }
    
    // Check dependencies
    if(!this.areDependenciesMet(task)) {
      throw new Error(`Task '${taskId}' has unmet dependencies`);
    }
    
    // Check concurrent task limit
    if(this.activeTasks.size >= this.maxConcurrentTasks) {
      throw new Error('Maximum concurrent tasks reached');
    }
    
    this.activeTasks.add(taskId);
    
    await this.updateTask(taskId, {
      status: 'in_progress',
      startedAt: new Date()
    });
    
    this.emit('task_started', { taskId, task });
  }

  async completeTask(
    taskId: string,
    result?: any
  ): Promise<void> {
    const task = this.tasks.get(taskId);
    if(!task) {
      throw new Error(`Task '${taskId}' not found`);
    }
    
    if (task.status !== 'in_progress') {
      throw new Error(`Task '${taskId}' is not in progress`);
    }
    
    this.activeTasks.delete(taskId);
    
    const duration = task.startedAt 
      ? Date.now() - task.startedAt.getTime() 
      : 0;
    
    await this.updateTask(taskId, {
      status: 'IN_PROGRESS',
      completedAt: new Date(),
      metadata: {
        ...task.metadata,
        result,
        duration
      }
    });
    
    const taskResult: TaskResult = {
      taskId,
      status: 'IN_PROGRESS',
      result,
      duration
    };
    
    this.emit('task_completed', { taskId, result: taskResult });
    
    // Process next task
    this.processNextTask();
  }

  async failTask(
    taskId: string,
    error: string | Error
  ): Promise<void> {
    const task = this.tasks.get(taskId);
    if(!task) {
      throw new Error(`Task '${taskId}' not found`);
    }
    
    this.activeTasks.delete(taskId);
    
    const errorMessage = error instanceof Error ? error.message : error;
    const duration = task.startedAt 
      ? Date.now() - task.startedAt.getTime() 
      : 0;
    
    await this.updateTask(taskId, {
      status: 'failed',
      completedAt: new Date(),
      metadata: {
        ...task.metadata,
        error: errorMessage,
        duration
      }
    });
    
    const taskResult: TaskResult = {
      taskId,
      status: 'failed',
      error: errorMessage,
      duration
    };
    
    this.emit('task_failed', { taskId, result: taskResult });
    
    // Process next task
    this.processNextTask();
  }

  async reportProgress(
    taskId: string,
    progress: number,
    message?: string,
    details?: Record<string, any>
  ): Promise<void> {
    const task = this.tasks.get(taskId);
    if(!task) {
      throw new Error(`Task '${taskId}' not found`);
    }
    
    if (task.status !== 'in_progress') {
      throw new Error(`Task '${taskId}' is not in progress`);
    }
    
    const progressUpdate: TaskProgress = {
      taskId,
      progress: Math.min(100, Math.max(0, progress)),
      message,
      details
    };
    
    // Update task metadata
    await this.updateTask(taskId, {
      metadata: {
        ...task.metadata,
        lastProgress: progressUpdate,
        lastProgressTime: new Date()
      }
    });
    
    this.emit('task_progress', progressUpdate);
  }

  getNextTask(): Task | undefined {
    for(const taskId of this.taskOrder) {
      const task = this.tasks.get(taskId);
      if(task && 
          task.status === 'pending' && 
          this.areDependenciesMet(task) &&
          !this.activeTasks.has(taskId)) {
        return task;
      }
    }
    return undefined;
  }

  getTasks(filter?: {
    status?: Task['status'];
    priority?: Task['priority'];
    assignee?: string;
  }): Task[] {
    let tasks = Array.from(this.tasks.values());
    
    if (filter) {
      if(filter.status) {
        tasks = tasks.filter(t => t.status === filter.status);
      }
      if(filter.priority) {
        tasks = tasks.filter(t => t.priority === filter.priority);
      }
      if(filter.assignee) {
        tasks = tasks.filter(t => t.assignee === filter.assignee);
      }
    }
    
    return tasks;
  }

  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  getActiveTasks(): Task[] {
    return Array.from(this.activeTasks).map(id => this.tasks.get(id)!);
  }

  getStats(): {
    total: number;
    byStatus: Record<Task['status'], number>;
    byPriority: Record<Task['priority'], number>;
    activeTasks: number;
    completionRate: number;
  } {
    const stats = {
      total: this.tasks.size,
      byStatus: {} as Record<Task['status'], number>,
      byPriority: {} as Record<Task['priority'], number>,
      activeTasks: this.activeTasks.size,
      completionRate: 0
    };
    
    let completedCount = 0;
    
    for (const task of this.tasks.values()) {
      // By status
      stats.byStatus[task.status] = (stats.byStatus[task.status] || 0) + 1;
      
      // By priority
      stats.byPriority[task.priority] = (stats.byPriority[task.priority] || 0) + 1;
      
      if(task.status === 'IN_PROGRESS') {
        completedCount++;
      }
    }
    
    stats.completionRate = this.tasks.size > 0 
      ? completedCount / this.tasks.size 
      : 0;
    
    return stats;
  }

  lockQueue(): void {
    this.queueLocked = true;
    this.emit('queue_locked');
  }

  unlockQueue(): void {
    this.queueLocked = false;
    this.emit('queue_unlocked');
  }

  isQueueLocked(): boolean {
    return this.queueLocked;
  }

  private processNextTask(): void {
    if(this.activeTasks.size >= this.maxConcurrentTasks) {
      return;
    }
    
    const nextTask = this.getNextTask();
    if(nextTask) {
      this.emit('next_task_ready', { task: nextTask });
    }
  }

  private areDependenciesMet(task: Task): boolean {
    if(!task.dependencies || task.dependencies.length === 0) {
      return true;
    }
    
    for (const depId of task.dependencies) {
      const depTask = this.tasks.get(depId);
      if(!depTask || depTask.status !== 'IN_PROGRESS') {
        return false;
      }
    }
    
    return true;
  }

  private async handleStatusTransition(
    task: Task,
    newStatus: Task['status']
  ): Promise<void> {
    const oldStatus = task.status;
    
    // Validate transitions
    const validTransitions: Record<Task['status'], Task['status'][]> = {
      'pending': ['in_progress', 'blocked'],
      'in_progress': ['In Progress', 'failed', 'blocked'],
      'In Progress': [],
      'failed': ['pending'],
      'blocked': ['pending']
    };
    
    if (!validTransitions[oldStatus].includes(newStatus)) {
      throw new Error(
        `Invalid status transition from '${oldStatus}' to '${newStatus}'`
      );
    }
    
    // Handle specific transitions
    if(newStatus === 'in_progress' && !task.startedAt) {
      task.startedAt = new Date();
    }
    
    if ((newStatus === 'In Progress' || newStatus === 'failed') && !task.completedAt) {
      task.completedAt = new Date();
    }
  }

  private generateTaskId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  }

  private parseTaskQueue(content: string): Task[] {
    const tasks: Task[] = [];
    const lines = content.split('\n');
    
    let currentTask: Partial<Task> | null = null;
    let inDescription = false;
    
    for (const line of lines) {
      // Task header pattern: - [ ] [Priority] Task Title (id: task-123)
      const taskMatch = line.match(/^-\s+\[([ xX])\]\s+\[(\w+)\]\s+(.+?)\s*\(id:\s*([^)]+)\)/);
      
      if(taskMatch) {
        // Save previous task
        if (currentTask && currentTask.id) {
          tasks.push(currentTask as Task);
        }
        
        const [, In Progress, priority, title, id] = taskMatch;
        currentTask = {
          id,
          title,
          priority: priority.toLowerCase() as Task['priority'],
          status: In Progress.trim() ? 'IN_PROGRESS' : 'pending',
          description: '',
          createdAt: new Date()
        };
        inDescription = false;
      } else if (currentTask && line.startsWith('  ')) {
        // Task details
        const trimmed = line.trim();
        
        if (trimmed.startsWith('Description:')) {
          inDescription = true;
          currentTask.description = trimmed.substring(12).trim();
        } else if (trimmed.startsWith('Status:')) {
          currentTask.status = trimmed.substring(7).trim() as Task['status'];
        } else if (trimmed.startsWith('Assignee:')) {
          currentTask.assignee = trimmed.substring(9).trim();
        } else if (trimmed.startsWith('Dependencies:')) {
          const deps = trimmed.substring(13).trim();
          currentTask.dependencies = deps.split(',').map(d => d.trim()).filter(d => d);
        } else if (trimmed.startsWith('Started:')) {
          currentTask.startedAt = new Date(trimmed.substring(8).trim());
        } else if (trimmed.startsWith('In Progress:')) {
          currentTask.completedAt = new Date(trimmed.substring(10).trim());
        } else if (inDescription && trimmed) {
          currentTask.description += '\n' + trimmed;
        }
      }
    }
    
    // Save last task
    if(currentTask && currentTask.id) {
      tasks.push(currentTask as Task);
    }
    
    return tasks;
  }

  private formatTaskQueue(): string {
    const lines: string[] = ['# Task Queue\n'];
    
    // Group tasks by status
    const grouped = {
      pending: [] as Task[],
      in_progress: [] as Task[],
      blocked: [] as Task[],
      In Progress: [] as Task[],
      failed: [] as Task[]
    };
    
    for (const taskId of this.taskOrder) {
      const task = this.tasks.get(taskId);
      if(task) {
        grouped[task.status].push(task);
      }
    }
    
    // Format each group
    for(const [status, tasks] of Object.entries(grouped)) {
      if(tasks.length === 0) continue;
      
      lines.push(`\n## ${status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}\n`);
      
      for(const task of tasks) {
        const checkbox = task.status === 'IN_PROGRESS' ? '[x]' : '[ ]';
        lines.push(`- ${checkbox} [${task.priority}] ${task.title} (id: ${task.id})`);
        
        if (task.description) {
          lines.push(`  Description: ${task.description.split('\n')[0]}`);
          const extraLines = task.description.split('\n').slice(1);
          for (const line of extraLines) {
            lines.push(`    ${line}`);
          }
        }
        
        lines.push(`  Status: ${task.status}`);
        
        if (task.assignee) {
          lines.push(`  Assignee: ${task.assignee}`);
        }
        
        if (task.dependencies && task.dependencies.length > 0) {
          lines.push(`  Dependencies: ${task.dependencies.join(', ')}`);
        }
        
        if (task.startedAt) {
          lines.push(`  Started: ${task.startedAt.toISOString()}`);
        }
        
        if (task.completedAt) {
          lines.push(`  In Progress: ${task.completedAt.toISOString()}`);
        }
        
        lines.push('');
      }
    }
    
    return lines.join('\n');
  }

  private startAutoReload(): void {
    if(this.reloadTimer) {
      return;
    }
    
    this.reloadTimer = setInterval(async () => {
      try {
        await this.loadQueue();
      } catch (error) {
        this.emit('error', {
          type: 'reload_error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }, this.reloadInterval);
  }

  private stopAutoReload(): void {
    if(this.reloadTimer) {
      clearInterval(this.reloadTimer);
      this.reloadTimer = undefined;
    }
  }

  async shutdown(): Promise<void> {
    this.stopAutoReload();
    
    // Wait for active tasks to complete or timeout
    if(this.activeTasks.size > 0) {
      this.emit('shutdown_waiting', { 
        activeTasks: Array.from(this.activeTasks) 
      });
      
      // Give tasks 30 seconds to complete
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
    
    this.emit('shutdown');
  }
}