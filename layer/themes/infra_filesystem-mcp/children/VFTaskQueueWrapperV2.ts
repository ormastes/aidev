import { v4 as uuidv4 } from 'uuid';
import { VFFileWrapper } from './VFFileWrapper';
import { JsonDocumentHandler } from '../utils/JsonDocumentHandler';
import { VFQueueStateSchema, VFTaskQueueSchema } from '../schemas/taskQueueSchema';

/**
 * Enhanced VF Task Queue Wrapper with JSON document handling
 * Uses proper JSON parsing and schema validation
 */
export class VFTaskQueueWrapperV2 extends VFFileWrapper {
  private jsonHandler: JsonDocumentHandler;
  private taskExecutor?: (task: any) => Promise<any>;
  
  constructor(basePath: string) {
    super(basePath);
    this.jsonHandler = new JsonDocumentHandler();
    
    // Register schemas
    this.jsonHandler.registerSchema('vf-queue-state', VFQueueStateSchema);
    this.jsonHandler.registerSchema('vf-task-queue', VFTaskQueueSchema);
  }

  /**
   * Update task status by ID with proper JSON handling
   * @param filePath Path to queue file
   * @param taskId Task ID to update
   * @param newStatus New status value
   */
  async updateTaskStatus(filePath: string, taskId: string, newStatus: string): Promise<void> {
    try {
      await this.jsonHandler.updateTaskStatus(filePath, taskId, newStatus, 'vf-queue-state');
    } catch (error) {
      // Try VF format if standard format fails
      await this.jsonHandler.updateTaskStatus(filePath, taskId, newStatus, 'vf-task-queue');
    }
  }

  /**
   * Update all tasks with a specific status
   * @param filePath Path to queue file  
   * @param currentStatus Current status to match
   * @param newStatus New status to set
   */
  async updateAllTasksWithStatus(
    filePath: string, 
    currentStatus: string, 
    newStatus: string
  ): Promise<number> {
    return await this.jsonHandler.updateTasksWhere(
      filePath,
      (task) => task.status === currentStatus,
      { status: newStatus },
      'vf-queue-state'
    );
  }

  /**
   * Update multiple tasks by their IDs
   * @param filePath Path to queue file
   * @param updates Array of {id, status} objects
   */
  async batchUpdateTaskStatus(
    filePath: string,
    updates: Array<{ id: string, status: string }>
  ): Promise<void> {
    const data = await this.jsonHandler.readJson(filePath);
    
    // Create a map for efficient lookup
    const updateMap = new Map(updates.map(u => [u.id, u.status]));
    
    // Update tasks in all possible locations
    const updateTask = (task: any) => {
      if (updateMap.has(task.id)) {
        task.status = updateMap.get(task.id);
        task.updatedAt = new Date().toISOString();
      }
    };
    
    // Update in queues
    if (data.queues) {
      for (const queue of Object.values(data.queues)) {
        if (Array.isArray(queue)) {
          queue.forEach(updateTask);
        } else if (queue && typeof queue === 'object' && queue.items) {
          queue.items.forEach(updateTask);
        }
      }
    }
    
    // Update working items
    if (data.working) updateTask(data.working);
    if (data.workingItem) updateTask(data.workingItem);
    
    await this.jsonHandler.writeJson(filePath, data, 'vf-queue-state');
  }

  /**
   * Safely move task between queues
   * @param filePath Path to queue file
   * @param taskId Task ID to move
   * @param fromQueue Source queue name
   * @param toQueue Destination queue name
   */
  async moveTaskBetweenQueues(
    filePath: string,
    taskId: string,
    fromQueue: string,
    toQueue: string
  ): Promise<void> {
    const data = await this.jsonHandler.readJson(filePath);
    
    if (!data.queues || !data.queues[fromQueue]) {
      throw new Error(`Source queue '${fromQueue}' not found`);
    }
    
    // Find and remove task from source queue
    const sourceQueue = Array.isArray(data.queues[fromQueue]) 
      ? data.queues[fromQueue]
      : data.queues[fromQueue].items || [];
      
    const taskIndex = sourceQueue.findIndex((t: any) => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error(`Task '${taskId}' not found in queue '${fromQueue}'`);
    }
    
    const [task] = sourceQueue.splice(taskIndex, 1);
    
    // Initialize destination queue if needed
    if (!data.queues[toQueue]) {
      data.queues[toQueue] = [];
    }
    
    // Add to destination queue
    const destQueue = Array.isArray(data.queues[toQueue])
      ? data.queues[toQueue]
      : (data.queues[toQueue].items = data.queues[toQueue].items || []);
      
    destQueue.push(task);
    
    await this.jsonHandler.writeJson(filePath, data, 'vf-queue-state');
  }

  /**
   * Find all tasks with a specific status
   * @param filePath Path to queue file
   * @param status Status to search for
   */
  async findTasksByStatus(filePath: string, status: string): Promise<any[]> {
    const data = await this.jsonHandler.readJson(filePath);
    const tasks: any[] = [];
    
    // Collect from queues
    if (data.queues) {
      for (const queue of Object.values(data.queues)) {
        if (Array.isArray(queue)) {
          tasks.push(...queue.filter((t: any) => t.status === status));
        } else if (queue && typeof queue === 'object' && queue.items) {
          tasks.push(...queue.items.filter((t: any) => t.status === status));
        }
      }
    }
    
    // Check working items
    if (data.working && data.working.status === status) {
      tasks.push(data.working);
    }
    if (data.workingItem && data.workingItem.status === status) {
      tasks.push(data.workingItem);
    }
    
    return tasks;
  }

  /**
   * Validate queue file structure
   * @param filePath Path to queue file
   */
  async validateQueueFile(filePath: string): Promise<{ valid: boolean, errors?: any[] }> {
    try {
      const data = await this.jsonHandler.readJson(filePath);
      
      // Try both schemas
      const schemas = ['vf-queue-state', 'vf-task-queue'];
      
      for (const schemaId of schemas) {
        try {
          await this.jsonHandler.writeJson(filePath + '.tmp', data, schemaId);
          await require('fs/promises').unlink(filePath + '.tmp');
          return { valid: true };
        } catch (error) {
          continue;
        }
      }
      
      return { valid: false, errors: ['No matching schema found'] };
    } catch (error) {
      return { valid: false, errors: [error.message] };
    }
  }

  /**
   * Fix common JSON issues in queue files
   * @param filePath Path to queue file
   */
  async repairQueueFile(filePath: string): Promise<void> {
    const data = await this.jsonHandler.readJson(filePath);
    
    // Ensure required structure
    if (!data.queues) {
      data.queues = {};
    }
    
    if (!data.metadata) {
      data.metadata = {
        totalProcessed: 0,
        totalFailed: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
    
    // Fix queue structure
    for (const [queueName, queue] of Object.entries(data.queues)) {
      if (!Array.isArray(queue) && typeof queue === 'object' && !queue.items) {
        data.queues[queueName] = { items: [] };
      }
    }
    
    // Ensure all tasks have required fields
    const ensureTaskFields = (task: any) => {
      if (!task.id) task.id = uuidv4();
      if (!task.type) task.type = 'data';
      if (!task.status) task.status = 'pending';
      if (!task.createdAt && !task.created_at) {
        task.createdAt = new Date().toISOString();
      }
    };
    
    // Fix tasks in queues
    for (const queue of Object.values(data.queues)) {
      if (Array.isArray(queue)) {
        queue.forEach(ensureTaskFields);
      } else if (queue && typeof queue === 'object' && queue.items) {
        queue.items.forEach(ensureTaskFields);
      }
    }
    
    // Fix working items
    if (data.working) ensureTaskFields(data.working);
    if (data.workingItem) ensureTaskFields(data.workingItem);
    
    await this.jsonHandler.writeJson(filePath, data);
  }

  /**
   * Create a status report for all tasks
   * @param filePath Path to queue file
   */
  async getStatusReport(filePath: string): Promise<{
    total: number,
    byStatus: { [status: string]: number },
    byQueue: { [queue: string]: number },
    working: number
  }> {
    const data = await this.jsonHandler.readJson(filePath);
    const report = {
      total: 0,
      byStatus: {} as { [status: string]: number },
      byQueue: {} as { [queue: string]: number },
      working: 0
    };
    
    // Count tasks in queues
    if (data.queues) {
      for (const [queueName, queue] of Object.entries(data.queues)) {
        let queueCount = 0;
        const items = Array.isArray(queue) ? queue : (queue as any).items || [];
        
        for (const task of items) {
          if (task.type !== 'empty') {
            report.total++;
            queueCount++;
            report.byStatus[task.status] = (report.byStatus[task.status] || 0) + 1;
          }
        }
        
        report.byQueue[queueName] = queueCount;
      }
    }
    
    // Count working items
    if (data.working) {
      report.working++;
      report.total++;
      report.byStatus[data.working.status] = (report.byStatus[data.working.status] || 0) + 1;
    }
    if (data.workingItem) {
      report.working++;
      report.total++;
      report.byStatus[data.workingItem.status] = (report.byStatus[data.workingItem.status] || 0) + 1;
    }
    
    return report;
  }
}