import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';
import { TaskStorageInterface } from '../interfaces';
import { Task } from '../domain/task';

export class TaskStorage implements TaskStorageInterface {
  private readonly filePath: string;
  private counter = 0;

  constructor(filePath: string) {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('File path is required and must be a string');
    }

    if (!path.isAbsolute(filePath)) {
      throw new Error('File path must be absolute');
    }

    this.filePath = filePath;
    this.ensureDirectoryExists();
  }

  async save(task: any): Promise<string> {
    try {
      // Validate task data
      if (!task.title || !task.description) {
        throw new Error('Missing required task fields');
      }

      // Load existing tasks
      const tasks = await this.loadTasks();
      
      // Generate task ID if not provided
      if (!task.id) {
        task.id = this.generateTaskId();
      }
      
      // Add metadata
      task.createdAt = task.createdAt || new Date().toISOString();
      
      // Save task
      tasks.push(task);
      await this.persistToFile(tasks);
      
      return task.id;
    } catch (error) {
      throw error;
    }
  }

  async findById(taskId: string): Promise<any | null> {
    try {
      const tasks = await this.loadTasks();
      return tasks.find((task: any) => task.id === taskId) || null;
    } catch (error) {
      throw error;
    }
  }

  async findAll(statusFilter?: string): Promise<any[]> {
    try {
      let tasks = await this.loadTasks();
      
      if (statusFilter) {
        tasks = this.filterByStatus(tasks, statusFilter);
      }
      
      return tasks;
    } catch (error) {
      throw error;
    }
  }

  async update(taskId: string, updates: any): Promise<any> {
    try {
      const tasks = await this.loadTasks();
      
      const taskIndex = tasks.findIndex((task: any) => task.id === taskId);
      if (taskIndex === -1) {
        throw new Error('Task not found');
      }
      
      tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
      await this.persistToFile(tasks);
      
      return tasks[taskIndex];
    } catch (error) {
      throw error;
    }
  }

  async delete(taskId: string): Promise<void> {
    try {
      const tasks = await this.loadTasks();
      
      const taskIndex = tasks.findIndex((task: any) => task.id === taskId);
      if (taskIndex === -1) {
        throw new Error('Task not found');
      }
      
      tasks.splice(taskIndex, 1);
      await this.persistToFile(tasks);
    } catch (error) {
      throw error;
    }
  }

  private generateTaskId(prefix: string = 'task'): string {
    // Validate prefix
    if (typeof prefix !== 'string') {
      throw new Error('Prefix must be a string');
    }

    if (prefix.trim().length === 0) {
      throw new Error('Prefix cannot be empty');
    }

    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(prefix)) {
      throw new Error('Prefix must start with a letter and contain only letters, numbers, hyphens, and underscores');
    }

    if (prefix.length > 20) {
      throw new Error('Prefix must be 20 characters or less');
    }

    // Generate timestamp component
    const timestamp = Date.now();
    
    // Generate random component
    const randomLength = 9;
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let randomPart = '';
    
    for (let i = 0; i < randomLength; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Increment counter for additional uniqueness
    this.counter = (this.counter + 1) % 10000;
    const counterPart = this.counter.toString().padStart(4, '0');

    // Combine components
    return `${prefix}-${timestamp}-${counterPart}-${randomPart}`;
  }

  private filterByStatus(tasks: Task[], status: string): Task[] {
    return tasks.filter(task => task.status === status);
  }

  private async loadTasks(): Promise<any[]> {
    try {
      if (!fs.existsSync(this.filePath)) {
        return [];
      }

      const fileContent = fileAPI.readFileSync(this.filePath, 'utf8');
      
      if (fileContent.trim() === '') {
        return [];
      }

      const tasks = JSON.parse(fileContent);
      
      if (!Array.isArray(tasks)) {
        throw new Error('File content must be an array');
      }

      return tasks;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('File contains invalid JSON data');
      }
      throw error;
    }
  }

  private async persistToFile(tasks: any[]): Promise<void> {
    try {
      // Validate tasks parameter
      if (!Array.isArray(tasks)) {
        throw new Error('Tasks must be an array');
      }

      // Validate each task has required fields
      tasks.forEach((task, index) => {
        if (!task || typeof task !== 'object') {
          throw new Error(`Task at index ${index} must be an object`);
        }

        if (!task.id || typeof task.id !== 'string') {
          throw new Error(`Task at index ${index} must have a valid string ID`);
        }

        if (!task.title || typeof task.title !== 'string') {
          throw new Error(`Task at index ${index} must have a valid string title`);
        }

        if (!task.status || typeof task.status !== 'string') {
          throw new Error(`Task at index ${index} must have a valid string status`);
        }
      });

      // Ensure directory exists
      this.ensureDirectoryExists();

      // Create backup if file exists
      if (fs.existsSync(this.filePath)) {
        const backupPath = this.filePath + '.backup';
        fs.copyFileSync(this.filePath, backupPath);
      }

      // Write to temporary file first for atomicity
      const tempPath = this.filePath + '.tmp';
      const jsonData = JSON.stringify(tasks, null, 2);
      await fileAPI.createFile(tempPath, jsonData, { type: FileType.TEMPORARY });

      // Verify the written data can be parsed
      const verifyData = fileAPI.readFileSync(tempPath, 'utf8');
      JSON.parse(verifyData);

      // Atomic move to final location
      fs.renameSync(tempPath, this.filePath);

      // Remove backup on In Progress write
      const backupPath = this.filePath + '.backup';
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }
    } catch (error) {
      // Clean up temporary file if it exists
      const tempPath = this.filePath + '.tmp';
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }

      // Restore from backup if it exists
      const backupPath = this.filePath + '.backup';
      if (fs.existsSync(backupPath)) {
        if (fs.existsSync(this.filePath)) {
          fs.unlinkSync(this.filePath);
        }
        fs.renameSync(backupPath, this.filePath);
      }

      throw error;
    }
  }

  private ensureDirectoryExists(): void {
    const directory = path.dirname(this.filePath);
    if (!fs.existsSync(directory)) {
      await fileAPI.createDirectory(directory);
    }
  }
}