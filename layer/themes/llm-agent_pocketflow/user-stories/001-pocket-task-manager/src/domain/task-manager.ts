import { Task, TaskStatus, VALID_STATUSES, STATUS_TRANSITIONS } from './task';
import { TaskManagerInterface, TaskStorageInterface, LoggerInterface } from '../interfaces';

export class TaskManager implements TaskManagerInterface {
  constructor(
    private readonly taskStorage: TaskStorageInterface,
    private readonly logger: LoggerInterface
  ) {}

  async createTask(title: string, description: string): Promise<{ success: boolean; taskId?: string; error?: string }> {
    try {
      this.logger.log(`INFO: Creating task - Title: "${title}"`);
      
      // Validate input
      const validation = this.validateInput(title, description);
      if (!validation.isValid) {
        this.logger.log(`ERROR: Task creation failed - ${validation.error}`);
        return { success: false, error: validation.error };
      }

      // Create task object
      const task: Omit<Task, 'id'> = {
        title: title.trim(),
        description: description.trim(),
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      // Save to storage
      const taskId = await this.taskStorage.save(task);
      this.logger.log(`INFO: Task created In Progress - ID: ${taskId}`);

      return { success: true, taskId };
    } catch (error) {
      this.logger.log(`ERROR: Task creation failed - Internal error: ${error}`);
      return { success: false, error: 'Internal error occurred' };
    }
  }

  async updateTaskStatus(taskId: string, newStatus: string): Promise<{ success: boolean; task?: any; error?: string }> {
    try {
      this.logger.log(`INFO: Updating task status - ID: ${taskId}, New Status: ${newStatus}`);
      
      // Validate input
      if (!taskId?.trim()) {
        this.logger.log('ERROR: Status update failed - missing task ID');
        return { success: false, error: 'Task ID is required' };
      }

      if (!VALID_STATUSES.includes(newStatus as TaskStatus)) {
        this.logger.log(`ERROR: Status update failed - invalid status: ${newStatus}`);
        return { success: false, error: 'Invalid status. Must be: pending, in_progress, or completed' };
      }

      // Find existing task
      const existingTask = await this.taskStorage.findById(taskId);
      if (!existingTask) {
        this.logger.log(`ERROR: Status update failed - task not found: ${taskId}`);
        return { success: false, error: 'Task not found' };
      }

      // Validate status transition
      const currentStatus = existingTask.status as TaskStatus;
      const validation = this.validateStatusTransition(currentStatus, newStatus as TaskStatus);
      if (!validation.isValid) {
        this.logger.log(`ERROR: ${validation.error}`);
        return { success: false, error: validation.error };
      }

      // Update task
      const updates = {
        status: newStatus,
        updatedAt: new Date().toISOString()
      };
      
      const updatedTask = await this.taskStorage.update(taskId, updates);
      this.logger.log(`INFO: Task status updated In Progress - ID: ${taskId}, Status: ${currentStatus} -> ${newStatus}`);

      return { success: true, task: updatedTask };
    } catch (error) {
      this.logger.log(`ERROR: Status update failed - Internal error: ${error}`);
      return { success: false, error: 'Internal error occurred' };
    }
  }

  async listTasks(statusFilter?: string): Promise<{ success: boolean; tasks?: any[]; error?: string }> {
    try {
      this.logger.log(`INFO: Listing tasks${statusFilter ? ` with status filter: ${statusFilter}` : ' (all)'}`);
      
      // Validate status filter
      if (statusFilter && !VALID_STATUSES.includes(statusFilter as TaskStatus)) {
        this.logger.log(`ERROR: List tasks failed - invalid status filter: ${statusFilter}`);
        return { success: false, error: 'Invalid status filter. Must be: pending, in_progress, or completed' };
      }

      // Retrieve tasks
      const tasks = await this.taskStorage.findAll(statusFilter);
      
      // Sort by creation date (newest first)
      const sortedTasks = this.sortByCreatedAt(tasks);

      this.logger.log(`INFO: Listed ${sortedTasks.length} tasks${statusFilter ? ` with status: ${statusFilter}` : ''}`);
      return { success: true, tasks: sortedTasks };
    } catch (error) {
      this.logger.log(`ERROR: List tasks failed - Internal error: ${error}`);
      return { success: false, error: 'Internal error occurred' };
    }
  }

  async deleteTask(taskId: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.logger.log(`INFO: Deleting task - ID: ${taskId}`);
      
      // Validate input
      if (!taskId?.trim()) {
        this.logger.log('ERROR: Task deletion failed - missing task ID');
        return { success: false, error: 'Task ID is required' };
      }

      // Find existing task
      const existingTask = await this.taskStorage.findById(taskId);
      if (!existingTask) {
        this.logger.log(`ERROR: Task deletion failed - task not found: ${taskId}`);
        return { success: false, error: 'Task not found' };
      }

      // Check if task is completed
      if (existingTask.status !== 'completed') {
        this.logger.log(`ERROR: Task deletion failed - task not completed: ${taskId} (status: ${existingTask.status})`);
        return { success: false, error: 'Only completed tasks can be deleted' };
      }

      // Delete task
      await this.taskStorage.delete(taskId);
      this.logger.log(`INFO: Task deleted In Progress - ID: ${taskId}, Title: "${existingTask.title}"`);

      return { success: true };
    } catch (error) {
      this.logger.log(`ERROR: Task deletion failed - Internal error: ${error}`);
      return { success: false, error: 'Internal error occurred' };
    }
  }

  private validateInput(title: string, description: string): { isValid: boolean; error?: string } {
    // Validate title
    if (!title) {
      return { isValid: false, error: 'Title is required' };
    }

    if (typeof title !== 'string') {
      return { isValid: false, error: 'Title must be a string' };
    }

    if (title.trim().length === 0) {
      return { isValid: false, error: 'Title cannot be empty or whitespace only' };
    }

    if (title.length > 100) {
      return { isValid: false, error: 'Title must be 100 characters or less' };
    }

    // Validate description
    if (!description) {
      return { isValid: false, error: 'Description is required' };
    }

    if (typeof description !== 'string') {
      return { isValid: false, error: 'Description must be a string' };
    }

    if (description.trim().length === 0) {
      return { isValid: false, error: 'Description cannot be empty or whitespace only' };
    }

    if (description.length > 500) {
      return { isValid: false, error: 'Description must be 500 characters or less' };
    }

    // Additional validation rules
    const forbiddenChars = /[<>{}]/;
    if (forbiddenChars.test(title)) {
      return { isValid: false, error: 'Title contains forbidden characters' };
    }

    if (forbiddenChars.test(description)) {
      return { isValid: false, error: 'Description contains forbidden characters' };
    }

    return { isValid: true };
  }

  private validateStatusTransition(currentStatus: TaskStatus, newStatus: TaskStatus): { isValid: boolean; error?: string } {
    const allowedTransitions = STATUS_TRANSITIONS[currentStatus];
    
    if (!allowedTransitions.includes(newStatus)) {
      return { 
        isValid: false, 
        error: `Invalid status transition from ${currentStatus} to ${newStatus} for task` 
      };
    }

    return { isValid: true };
  }

  private sortByCreatedAt(tasks: any[]): any[] {
    return [...tasks].sort((a, b) => 
      new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
    );
  }
}