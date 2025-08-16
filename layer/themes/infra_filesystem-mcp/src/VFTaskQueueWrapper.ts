/**
 * VFTaskQueueWrapper - Priority-based task queue with automatic execution
 * 
 * This class manages task queues with different priorities, supporting
 * automatic execution of runnable tasks on push/pop operations.
 */

import { VFFileWrapper } from './VFFileWrapper';
import { randomUUID as uuidv4 } from 'crypto';

export interface RunnableConfig {
  type: 'command' | 'script' | 'function';
  command?: string;
  path?: string;
  function?: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface Task {
  id: string;
  type: 'runnable' | 'message' | 'data';
  priority: string;
  content: any;
  status: 'pending' | 'working' | 'completed' | 'failed';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  result?: any;
  runnable?: RunnableConfig;
}

export interface QueueState {
  queues: {
    [priority: string]: Task[];
  };
  working: Task | null;
  metadata: {
    lastPop: string | null;
    totalProcessed: number;
    totalFailed: number;
  };
}

export interface VFQueueState {
  workingItem: any | null;
  working?: any;
  queues: {
    [queueName: string]: {
      items: any[];
      insert_comment?: string;
      pop_comment?: string;
      before_insert_steps?: any[];
      after_pop_steps?: any[];
    };
  };
  metadata: {
    processedCount: number;
    failedCount: number;
    lastUpdated: string;
    totalProcessed?: number;
    totalFailed?: number;
  };
  global_config?: any;
  priority_order?: string[];
}

export interface PopResult {
  workingItem: any | null;
  pop_comment?: string | any;
  queue_name?: string;
  comment_executed?: boolean;
  comment_result?: any;
}

export interface QueueStatus {
  queueSizes: { [priority: string]: number };
  working: Task | null;
  totalPending: number;
  totalProcessed: number;
  totalFailed: number;
}

export type TaskExecutor = (task: Task) => Promise<any>;

export class VFTaskQueueWrapper extends VFFileWrapper {
  private defaultPriorities = ['high', 'medium', 'low'];
  private taskExecutor?: TaskExecutor;

  constructor(basePath: string = '', taskExecutor?: TaskExecutor) {
    super(basePath);
    this.taskExecutor = taskExecutor;
  }

  /**
   * Read TASK_QUEUE.vf.json with empty queue comment handling
   * @param filePath Path to TASK_QUEUE.vf.json
   * @returns Task queue state with comments for empty queues
   */
  async read(filePath: string): Promise<any> {
    const content = await super.read(filePath);
    
    // If content exists and has queues, process empty queues
    if (content && content.queues) {
      // First check if all queues are empty
      let allQueuesEmpty = true;
      for (const [queueName, queueData] of Object.entries(content.queues)) {
        if (queueData && typeof queueData === 'object') {
          const items = (queueData as any).items;
          if (items && items.length > 0 && !(items.length === 1 && items[0].type === 'empty')) {
            allQueuesEmpty = false;
            break;
          }
        }
      }
      
      // Check each queue for emptiness
      for (const [queueName, queueData] of Object.entries(content.queues)) {
        if (queueData && typeof queueData === 'object') {
          const items = (queueData as any).items;
          
          // If queue is empty or has only empty type items
          if (!items || items.length === 0 || 
              (items.length === 1 && items[0].type === 'empty')) {
            
            // Get empty queue comment from queue config or use default
            let comment = (queueData as any).empty_queue_comment;
            
            // If no custom comment specified
            if (!comment) {
              // If all queues are empty, show the pick user story comment
              if (allQueuesEmpty) {
                comment = content.global_config?.all_queues_empty_comment || 
                         'All queues are empty. Pick feature user story from FEATURE.vf.json (or FEATURE.md if vf.json not exist) and push to User Story Queue';
              } else {
                // Use global default or fallback
                comment = content.global_config?.default_empty_queue_comment || 'Queue is empty';
              }
            }
            
            // Set the empty item with comment
            if (!items || items.length === 0) {
              (queueData as any).items = [{
                id: `empty-${queueName}`,
                type: 'empty',
                content: comment,
                parent: 'system',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }];
            } else if (items[0].type === 'empty') {
              // Update existing empty item comment
              items[0].content = comment;
            }
          }
        }
      }
    }
    
    return content;
  }

  /**
   * Push a task to the queue
   * @param task Task to push
   * @param priority Priority level
   * @param filePath Queue file path
   */
  async push(task: Partial<Task>, priority: string = 'medium', filePath: string): Promise<void> {
    const state = await this.readQueueState(filePath);
    
    // Create full task object
    const fullTask: Task = {
      id: task.id || uuidv4(),
      type: task.type || 'data',
      priority,
      content: task.content,
      status: 'pending',
      createdAt: new Date().toISOString(),
      ...task
    };
    
    // Add to appropriate queue
    if (!state.queues[priority]) {
      state.queues[priority] = { items: [] };
    }
    state.queues[priority].items.push(fullTask);
    
    // Save state
    await this.saveQueueState(filePath, state);
    
    // Execute if runnable and no task is working
    if (fullTask.type === 'runnable' && !state.working && this.taskExecutor) {
      await this.executeTask(fullTask, filePath);
    }
  }

  /**
   * Pop a task from VF queue with comments
   * @param priority Specific queue to pop from, or null for priority order
   * @param filePath VF Queue file path
   * @param executeComment Whether to execute the pop_comment if it's runnable
   * @returns PopResult with workingItem, pop_comment, and execution result
   */
  async pop(priority?: string, filePath?: string, executeComment: boolean = false): Promise<PopResult> {
    if (!filePath) throw new Error('File path is required');
    
    const state = await this.readQueueState(filePath);
    
    // If a task is already working, return it with no comment
    if (state.workingItem) {
      return {
        workingItem: state.workingItem,
        pop_comment: undefined,
        queue_name: undefined
      };
    }
    
    // Find queue to pop from
    let queueName: string | undefined;
    let queueData: any;
    
    if (priority && state.queues[priority]?.items?.length > 0) {
      // Pop from specific queue
      queueName = priority;
      queueData = state.queues[priority];
    } else {
      // Pop from priority order
      const priorityOrder = state.priority_order || this.defaultPriorities;
      for (const qName of priorityOrder) {
        if (state.queues[qName]?.items?.length > 0) {
          queueName = qName;
          queueData = state.queues[qName];
          break;
        }
      }
      
      // If no tasks found in default priorities, check other queues
      if (!queueName) {
        for (const qName of Object.keys(state.queues)) {
          if (!this.defaultPriorities.includes(qName) && state.queues[qName]?.items?.length > 0) {
            queueName = qName;
            queueData = state.queues[qName];
            break;
          }
        }
      }
    }
    
    if (!queueName || !queueData || queueData.items.length === 0) {
      return {
        workingItem: null,
        pop_comment: undefined,
        queue_name: undefined
      };
    }
    
    // Pop the item
    const item = queueData.items.shift();
    
    // Set as working item
    state.workingItem = item;
    state.metadata.lastUpdated = new Date().toISOString();
    
    // Save state
    await this.saveQueueState(filePath, state);
    
    // Execute pop_comment if requested and if executor supports it
    let commentResult = undefined;
    let commentExecuted = false;
    
    if (executeComment && queueData.pop_comment && this.taskExecutor) {
      try {
        // Check if executor has executePopComment method
        if ('executePopComment' in this.taskExecutor && typeof this.taskExecutor.executePopComment === 'function') {
          commentResult = await this.taskExecutor.executePopComment(queueData.pop_comment);
          commentExecuted = true;
        }
      } catch (error) {
        // Log error but don't fail the pop operation
        console.error('Failed to execute pop_comment:', error);
      }
    }
    
    return {
      workingItem: item,
      pop_comment: queueData.pop_comment,
      queue_name: queueName,
      comment_executed: commentExecuted,
      comment_result: commentResult
    };
  }

  /**
   * Peek at the next task without removing it
   * @param priority Specific priority to peek from
   * @param filePath Queue file path
   * @returns Next task or null
   */
  async peek(priority?: string, filePath?: string): Promise<Task | null> {
    if (!filePath) throw new Error('File path is required');
    
    const state = await this.readQueueState(filePath);
    
    // If a task is working, return it
    if (state.workingItem) {
      return state.workingItem;
    }
    
    // Find task to peek
    if (priority && state.queues[priority]?.items?.length > 0) {
      return state.queues[priority].items[0];
    }
    
    // Peek from highest priority
    for (const p of this.defaultPriorities) {
      if (state.queues[p]?.items?.length > 0) {
        return state.queues[p].items[0];
      }
    }
    
    // Check other priorities
    for (const queue of Object.values(state.queues)) {
      if (queue?.items?.length > 0) {
        return queue.items[0];
      }
    }
    
    return null;
  }

  /**
   * Execute a runnable task
   * @param task Task to execute
   * @param filePath Queue file path
   */
  async executeTask(task: Task, filePath: string): Promise<void> {
    if (!this.taskExecutor) {
      throw new Error('No task executor provided');
    }
    
    try {
      // Execute the task
      const result = await this.taskExecutor(task);
      
      // Update task status
      const state = await this.readQueueState(filePath);
      if (state.working?.id === task.id) {
        state.working = null;
      }
      
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      task.result = result;
      state.metadata.totalProcessed = (state.metadata.totalProcessed || 0) + 1;
      
      await this.saveQueueState(filePath, state);
    } catch (error) {
      // Handle execution error
      const state = await this.readQueueState(filePath);
      if (state.working?.id === task.id) {
        state.working = null;
      }
      
      task.status = 'failed';
      task.completedAt = new Date().toISOString();
      task.error = error instanceof Error ? error.message : String(error);
      state.metadata.totalFailed = (state.metadata.totalFailed || 0) + 1;
      
      await this.saveQueueState(filePath, state);
      throw error;
    }
  }

  /**
   * Get queue status
   * @param filePath Queue file path
   * @returns Queue status information
   */
  async getQueueStatus(filePath: string): Promise<QueueStatus> {
    const state = await this.readQueueState(filePath);
    
    const queueSizes: { [priority: string]: number } = {};
    let totalPending = 0;
    
    for (const [priority, queue] of Object.entries(state.queues)) {
      queueSizes[priority] = queue?.items?.length || 0;
      totalPending += queue?.items?.length || 0;
    }
    
    return {
      queueSizes,
      working: state.workingItem,
      totalPending,
      totalProcessed: state.metadata.totalProcessed || 0,
      totalFailed: state.metadata.totalFailed || 0
    };
  }

  /**
   * Restart the queue (clear working state)
   * @param filePath Queue file path
   */
  async restart(filePath: string): Promise<void> {
    const state = await this.readQueueState(filePath);
    
    // Move working task back to queue if exists
    if (state.workingItem) {
      const priority = state.workingItem.priority;
      state.workingItem.status = 'pending';
      delete state.workingItem.startedAt;
      
      if (!state.queues[priority]) {
        state.queues[priority] = { items: [] };
      }
      state.queues[priority].items.unshift(state.workingItem);
      state.workingItem = null;
    }
    
    await this.saveQueueState(filePath, state);
  }

  /**
   * Clear all completed/failed tasks from history
   * @param filePath Queue file path
   */
  async clearCompleted(filePath: string): Promise<void> {
    const state = await this.readQueueState(filePath);
    
    // Reset counters but keep current queues
    state.metadata.totalProcessed = 0;
    state.metadata.totalFailed = 0;
    
    await this.saveQueueState(filePath, state);
  }


  /**
   * Read queue state from file
   * @param filePath Path to queue file
   * @returns Queue state
   */
  private async readQueueState(filePath: string): Promise<VFQueueState> {
    try {
      const content = await super.read(filePath);
      if (content && typeof content === 'object' && 'workingItem' in content) {
        return content as VFQueueState;
      }
    } catch (error) {
      // File doesn't exist or is invalid
    }
    
    // Return default VF state
    return {
      workingItem: null,
      queues: {},
      metadata: {
        processedCount: 0,
        failedCount: 0,
        lastUpdated: new Date().toISOString()
      }
    };
  }

  /**
   * Save queue state to file
   * @param filePath Path to queue file
   * @param state Queue state to save
   */
  private async saveQueueState(filePath: string, state: VFQueueState): Promise<void> {
    await super.write(filePath, state);
  }

  /**
   * Set custom task executor
   * @param executor Task executor function
   */
  setTaskExecutor(executor: TaskExecutor): void {
    this.taskExecutor = executor;
  }
}