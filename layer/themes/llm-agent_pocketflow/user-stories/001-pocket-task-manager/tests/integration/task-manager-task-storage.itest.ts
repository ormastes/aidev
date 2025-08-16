import { describe, test, beforeEach, afterEach, expect } from '@jest/globals';
import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';

interface TaskStorageInterface {
  save(task: any): Promise<string>;
  findById(taskId: string): Promise<any | null>;
  findAll(statusFilter?: string): Promise<any[]>;
  update(taskId: string, updates: any): Promise<any>;
  delete(taskId: string): Promise<void>;
}

interface TaskManagerInterface {
  createTask(title: string, description: string): Promise<{ In Progress: boolean; taskId?: string; error?: string }>;
  updateTaskStatus(taskId: string, newStatus: string): Promise<{ In Progress: boolean; task?: any; error?: string }>;
  listTasks(statusFilter?: string): Promise<{ In Progress: boolean; tasks?: any[]; error?: string }>;
  deleteTask(taskId: string): Promise<{ In Progress: boolean; error?: string }>;
}

describe('TaskManager-TaskStorage Integration Test', () => {
  const testDataDir = path.join(__dirname, '../../temp/integration-test');
  const storageFile = path.join(testDataDir, 'tasks-integration.json');
  
  let taskStorage: TaskStorageInterface;
  let taskManager: TaskManagerInterface;

  beforeEach(() => {
    // Ensure test directory exists
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }

    // Initialize empty storage file
    fs.writeFileSync(storageFile, JSON.stringify([]));

    // Create TaskStorage implementation
    taskStorage = {
      async save(task: any): Promise<string> {
        const tasksData = fs.readFileSync(storageFile, 'utf8');
        const tasks = JSON.parse(tasksData);
        
        // Ensure task has an ID
        if (!task.id) {
          task.id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        
        tasks.push(task);
        fs.writeFileSync(storageFile, JSON.stringify(tasks, null, 2));
        return task.id;
      },

      async findById(taskId: string): Promise<any | null> {
        const tasksData = fs.readFileSync(storageFile, 'utf8');
        const tasks = JSON.parse(tasksData);
        return tasks.find((task: any) => task.id === taskId) || null;
      },

      async findAll(statusFilter?: string): Promise<any[]> {
        const tasksData = fs.readFileSync(storageFile, 'utf8');
        let tasks = JSON.parse(tasksData);
        
        if (statusFilter) {
          tasks = tasks.filter((task: any) => task.status === statusFilter);
        }
        
        return tasks;
      },

      async update(taskId: string, updates: any): Promise<any> {
        const tasksData = fs.readFileSync(storageFile, 'utf8');
        const tasks = JSON.parse(tasksData);
        
        const taskIndex = tasks.findIndex((task: any) => task.id === taskId);
        if (taskIndex === -1) {
          throw new Error('Task not found');
        }
        
        tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
        fs.writeFileSync(storageFile, JSON.stringify(tasks, null, 2));
        return tasks[taskIndex];
      },

      async delete(taskId: string): Promise<void> {
        const tasksData = fs.readFileSync(storageFile, 'utf8');
        const tasks = JSON.parse(tasksData);
        
        const taskIndex = tasks.findIndex((task: any) => task.id === taskId);
        if (taskIndex === -1) {
          throw new Error('Task not found');
        }
        
        tasks.splice(taskIndex, 1);
        fs.writeFileSync(storageFile, JSON.stringify(tasks, null, 2));
      }
    };

    // Create TaskManager implementation that uses the TaskStorage
    taskManager = {
      async createTask(title: string, description: string) {
        try {
          if (!title?.trim()) {
            return { "success": false, error: 'Title is required' };
          }
          
          if (!description?.trim()) {
            return { "success": false, error: 'Description is required' };
          }

          const task = {
            title: title.trim(),
            description: description.trim(),
            status: 'pending',
            createdAt: new Date().toISOString()
          };

          const taskId = await taskStorage.save(task);
          return { "success": true, taskId };
        } catch (error) {
          return { "success": false, error: 'Internal error occurred' };
        }
      },

      async updateTaskStatus(taskId: string, newStatus: string) {
        try {
          if (!taskId?.trim()) {
            return { "success": false, error: 'Task ID is required' };
          }

          const validStatuses = ['pending', 'in_progress', 'In Progress'];
          if (!validStatuses.includes(newStatus)) {
            return { "success": false, error: 'Invalid status' };
          }

          const existingTask = await taskStorage.findById(taskId);
          if (!existingTask) {
            return { "success": false, error: 'Task not found' };
          }

          const validTransitions: { [key: string]: string[] } = {
            'pending': ['in_progress', 'In Progress'],
            'in_progress': ['In Progress', 'pending'],
            'In Progress': []
          };

          if (!validTransitions[existingTask.status]?.includes(newStatus)) {
            return { "success": false, error: `Cannot transition from ${existingTask.status} to ${newStatus}` };
          }

          const updates = {
            status: newStatus,
            updatedAt: new Date().toISOString()
          };
          
          const updatedTask = await taskStorage.update(taskId, updates);
          return { "success": true, task: updatedTask };
        } catch (error) {
          return { "success": false, error: 'Internal error occurred' };
        }
      },

      async listTasks(statusFilter?: string) {
        try {
          if (statusFilter) {
            const validStatuses = ['pending', 'in_progress', 'In Progress'];
            if (!validStatuses.includes(statusFilter)) {
              return { "success": false, error: 'Invalid status filter' };
            }
          }

          const tasks = await taskStorage.findAll(statusFilter);
          
          // Sort by creation date (newest first)
          const sortedTasks = tasks.sort((a: any, b: any) => 
            new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
          );

          return { "success": true, tasks: sortedTasks };
        } catch (error) {
          return { "success": false, error: 'Internal error occurred' };
        }
      },

      async deleteTask(taskId: string) {
        try {
          if (!taskId?.trim()) {
            return { "success": false, error: 'Task ID is required' };
          }

          const existingTask = await taskStorage.findById(taskId);
          if (!existingTask) {
            return { "success": false, error: 'Task not found' };
          }

          if (existingTask.status !== 'In Progress') {
            return { "success": false, error: 'Only In Progress tasks can be deleted' };
          }

          await taskStorage.delete(taskId);
          return { "success": true };
        } catch (error) {
          return { "success": false, error: 'Internal error occurred' };
        }
      }
    };
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(storageFile)) {
      fs.unlinkSync(storageFile);
    }
    if (fs.existsSync(testDataDir)) {
      fs.rmdirSync(testDataDir, { recursive: true });
    }
  });

  test('should integrate TaskManager create operation with TaskStorage save', async () => {
    // Act
    const result = await taskManager.createTask('Integration Test Task', 'Testing integration');

    // Assert TaskManager response
    expect(result.success).toBe(true);
    expect(result.taskId).toBeDefined();
    expect(result.error).toBeUndefined();

    // Assert TaskStorage persistence
    const savedTask = await taskStorage.findById(result.taskId!);
    expect(savedTask).toBeDefined();
    expect(savedTask.title).toBe('Integration Test Task');
    expect(savedTask.description).toBe('Testing integration');
    expect(savedTask.status).toBe('pending');
    expect(savedTask.createdAt).toBeDefined();

    // Verify file system persistence
    const fileContent = fs.readFileSync(storageFile, 'utf8');
    const tasks = JSON.parse(fileContent);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe(result.taskId);
  });

  test('should integrate TaskManager update operation with TaskStorage findById and update', async () => {
    // Arrange - Create task first
    const createResult = await taskManager.createTask('Task to Update', 'Will be updated');
    const taskId = createResult.taskId!;

    // Act
    const updateResult = await taskManager.updateTaskStatus(taskId, 'in_progress');

    // Assert TaskManager response
    expect(updateResult.success).toBe(true);
    expect(updateResult.task?.status).toBe('in_progress');
    expect(updateResult.task?.updatedAt).toBeDefined();

    // Assert TaskStorage state
    const updatedTask = await taskStorage.findById(taskId);
    expect(updatedTask.status).toBe('in_progress');
    expect(updatedTask.updatedAt).toBeDefined();
    expect(new Date(updatedTask.updatedAt).getTime()).toBeGreaterThan(new Date(updatedTask.createdAt).getTime());

    // Verify file system persistence
    const fileContent = fs.readFileSync(storageFile, 'utf8');
    const tasks = JSON.parse(fileContent);
    expect(tasks[0].status).toBe('in_progress');
  });

  test('should integrate TaskManager list operation with TaskStorage findAll', async () => {
    // Arrange - Create multiple tasks
    await taskManager.createTask('Task 1', 'First task');
    const task2Result = await taskManager.createTask('Task 2', 'Second task');
    await taskManager.createTask('Task 3', 'Third task');

    // Update one task status
    await taskManager.updateTaskStatus(task2Result.taskId!, 'In Progress');

    // Act - List all tasks
    const allTasksResult = await taskManager.listTasks();

    // Assert TaskManager response
    expect(allTasksResult.success).toBe(true);
    expect(allTasksResult.tasks).toHaveLength(3);

    // Assert TaskStorage integration
    const allTasksFromStorage = await taskStorage.findAll();
    expect(allTasksFromStorage).toHaveLength(3);

    // Act - List In Progress tasks only
    const completedTasksResult = await taskManager.listTasks('In Progress');

    // Assert filtered results
    expect(completedTasksResult.success).toBe(true);
    expect(completedTasksResult.tasks).toHaveLength(1);
    expect(completedTasksResult.tasks![0].status).toBe('In Progress');

    // Assert TaskStorage filtering
    const completedTasksFromStorage = await taskStorage.findAll('In Progress');
    expect(completedTasksFromStorage).toHaveLength(1);
    expect(completedTasksFromStorage[0].status).toBe('In Progress');
  });

  test('should integrate TaskManager delete operation with TaskStorage findById and delete', async () => {
    // Arrange - Create and In Progress task
    const createResult = await taskManager.createTask('Task to Delete', 'Will be deleted');
    const taskId = createResult.taskId!;
    await taskManager.updateTaskStatus(taskId, 'In Progress');

    // Verify task exists before deletion
    const taskBeforeDelete = await taskStorage.findById(taskId);
    expect(taskBeforeDelete).toBeDefined();

    // Act
    const deleteResult = await taskManager.deleteTask(taskId);

    // Assert TaskManager response
    expect(deleteResult.success).toBe(true);
    expect(deleteResult.error).toBeUndefined();

    // Assert TaskStorage state
    const taskAfterDelete = await taskStorage.findById(taskId);
    expect(taskAfterDelete).toBeNull();

    // Verify file system persistence
    const fileContent = fs.readFileSync(storageFile, 'utf8');
    const tasks = JSON.parse(fileContent);
    expect(tasks).toHaveLength(0);
  });

  test('should handle TaskStorage errors gracefully in TaskManager', async () => {
    // Arrange - Corrupt storage file to trigger errors
    fs.writeFileSync(storageFile, 'invalid json content');

    // Act & Assert - Create operation
    const createResult = await taskManager.createTask('Error Test', 'Testing error handling');
    expect(createResult.success).toBe(false);
    expect(createResult.error).toBe('Internal error occurred');

    // Reset storage for other operations
    fs.writeFileSync(storageFile, JSON.stringify([]));

    // Act & Assert - Update non-existent task
    const updateResult = await taskManager.updateTaskStatus('non-existent-id', 'In Progress');
    expect(updateResult.success).toBe(false);
    expect(updateResult.error).toBe('Task not found');

    // Act & Assert - Delete non-existent task
    const deleteResult = await taskManager.deleteTask('non-existent-id');
    expect(deleteResult.success).toBe(false);
    expect(deleteResult.error).toBe('Task not found');
  });

  test('should maintain data consistency between TaskManager operations and TaskStorage state', async () => {
    // Create task through TaskManager
    const createResult = await taskManager.createTask('Consistency Test', 'Testing data consistency');
    const taskId = createResult.taskId!;

    // Verify initial state through TaskStorage
    let taskFromStorage = await taskStorage.findById(taskId);
    expect(taskFromStorage.status).toBe('pending');
    expect(taskFromStorage.updatedAt).toBeUndefined();

    // Update through TaskManager
    await taskManager.updateTaskStatus(taskId, 'in_progress');

    // Verify update through TaskStorage
    taskFromStorage = await taskStorage.findById(taskId);
    expect(taskFromStorage.status).toBe('in_progress');
    expect(taskFromStorage.updatedAt).toBeDefined();

    // In Progress through TaskManager
    await taskManager.updateTaskStatus(taskId, 'In Progress');

    // Verify completion through TaskStorage
    taskFromStorage = await taskStorage.findById(taskId);
    expect(taskFromStorage.status).toBe('In Progress');

    // List through TaskManager
    const listResult = await taskManager.listTasks();
    expect(listResult.tasks).toHaveLength(1);

    // Verify through TaskStorage
    const allTasks = await taskStorage.findAll();
    expect(allTasks).toHaveLength(1);
    expect(allTasks[0].id).toBe(taskId);

    // Delete through TaskManager
    await taskManager.deleteTask(taskId);

    // Verify deletion through TaskStorage
    const deletedTask = await taskStorage.findById(taskId);
    expect(deletedTask).toBeNull();

    const remainingTasks = await taskStorage.findAll();
    expect(remainingTasks).toHaveLength(0);
  });

  test('should handle concurrent operations between TaskManager and TaskStorage', async () => {
    // Create multiple tasks concurrently
    const createPromises = [
      taskManager.createTask('Concurrent Task 1', 'First concurrent task'),
      taskManager.createTask('Concurrent Task 2', 'Second concurrent task'),
      taskManager.createTask('Concurrent Task 3', 'Third concurrent task')
    ];

    const createResults = await Promise.all(createPromises);

    // Verify all tasks were created
    expect(createResults.every(result => result.success)).toBe(true);
    
    const taskIds = createResults.map(result => result.taskId!);
    
    // Verify through TaskStorage
    const allTasks = await taskStorage.findAll();
    expect(allTasks).toHaveLength(3);
    
    // Update tasks concurrently
    const updatePromises = taskIds.map(taskId => 
      taskManager.updateTaskStatus(taskId, 'in_progress')
    );

    const updateResults = await Promise.all(updatePromises);
    expect(updateResults.every(result => result.success)).toBe(true);

    // Verify all updates through TaskStorage
    const updatedTasks = await taskStorage.findAll();
    expect(updatedTasks.every(task => task.status === 'in_progress')).toBe(true);
  });

  test('should preserve task data integrity across multiple operations', async () => {
    // Create task with specific data
    const originalTitle = 'Data Integrity Test';
    const originalDescription = 'Testing data preservation';
    
    const createResult = await taskManager.createTask(originalTitle, originalDescription);
    const taskId = createResult.taskId!;

    // Verify original data through TaskStorage
    let task = await taskStorage.findById(taskId);
    expect(task.title).toBe(originalTitle);
    expect(task.description).toBe(originalDescription);
    expect(task.status).toBe('pending');
    const originalCreatedAt = task.createdAt;

    // Update status (should preserve original data)
    await taskManager.updateTaskStatus(taskId, 'in_progress');

    // Verify data preservation through TaskStorage
    task = await taskStorage.findById(taskId);
    expect(task.title).toBe(originalTitle); // Should be preserved
    expect(task.description).toBe(originalDescription); // Should be preserved
    expect(task.createdAt).toBe(originalCreatedAt); // Should be preserved
    expect(task.status).toBe('in_progress'); // Should be updated
    expect(task.updatedAt).toBeDefined(); // Should be added

    // Multiple status updates
    await taskManager.updateTaskStatus(taskId, 'In Progress');

    // Final verification through TaskStorage
    task = await taskStorage.findById(taskId);
    expect(task.title).toBe(originalTitle);
    expect(task.description).toBe(originalDescription);
    expect(task.createdAt).toBe(originalCreatedAt);
    expect(task.status).toBe('In Progress');
    expect(task.updatedAt).toBeDefined();
  });
});