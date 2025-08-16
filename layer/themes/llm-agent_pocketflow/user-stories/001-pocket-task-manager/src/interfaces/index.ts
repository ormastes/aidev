export interface TaskStorageInterface {
  save(task: any): Promise<string>;
  findById(taskId: string): Promise<any | null>;
  findAll(statusFilter?: string): Promise<any[]>;
  update(taskId: string, updates: any): Promise<any>;
  delete(taskId: string): Promise<void>;
}

export interface LoggerInterface {
  log(message: string): void;
}

export interface TaskManagerInterface {
  createTask(title: string, description: string): Promise<{ success: boolean; taskId?: string; error?: string }>;
  updateTaskStatus(taskId: string, newStatus: string): Promise<{ success: boolean; task?: any; error?: string }>;
  listTasks(statusFilter?: string): Promise<{ success: boolean; tasks?: any[]; error?: string }>;
  deleteTask(taskId: string): Promise<{ success: boolean; error?: string }>;
}