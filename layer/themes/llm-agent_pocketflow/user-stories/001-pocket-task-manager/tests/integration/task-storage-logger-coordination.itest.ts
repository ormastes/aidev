import { describe, test, beforeEach, afterEach, expect } from '@jest/globals';
import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';

interface LoggerInterface {
  log(message: string): void;
}

interface TaskStorageInterface {
  save(task: any): Promise<string>;
  findById(taskId: string): Promise<any | null>;
  findAll(statusFilter?: string): Promise<any[]>;
  update(taskId: string, updates: any): Promise<any>;
  delete(taskId: string): Promise<void>;
}

describe('TaskStorage-Logger Coordination Integration Test', () => {
  const testDataDir = path.join(__dirname, '../../temp/storage-logger-coordination');
  const logFile = path.join(testDataDir, 'storage-coordination.log');
  const storageFile = path.join(testDataDir, 'tasks-coordination.json');
  
  let logger: LoggerInterface;
  let taskStorage: TaskStorageInterface;

  beforeEach(() => {
    // Ensure test directory exists
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }

    // Initialize empty files
    fs.writeFileSync(logFile, '');
    fs.writeFileSync(storageFile, JSON.stringify([]));

    // Create Logger implementation
    logger = {
      log(message: string): void {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${message}\n`;
        fs.appendFileSync(logFile, logEntry);
      }
    };

    // Create TaskStorage implementation that coordinates with Logger
    taskStorage = {
      async save(task: any): Promise<string> {
        try {
          logger.log(`STORAGE: Attempting to save task - Title: "${task.title}"`);
          
          // Validate task data
          if (!task.title || !task.description) {
            logger.log('STORAGE: Save failed - missing required fields');
            throw new Error('Missing required task fields');
          }

          // Load existing tasks
          const tasksData = fs.readFileSync(storageFile, 'utf8');
          const tasks = JSON.parse(tasksData);
          
          // Ensure task has an ID
          if (!task.id) {
            task.id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            logger.log(`STORAGE: Generated task ID: ${task.id}`);
          }
          
          // Add metadata
          task.createdAt = task.createdAt || new Date().toISOString();
          
          // Save task
          tasks.push(task);
          fs.writeFileSync(storageFile, JSON.stringify(tasks, null, 2));
          
          logger.log(`STORAGE: Task saved In Progress - ID: ${task.id}, Storage size: ${tasks.length} tasks`);
          return task.id;
        } catch (error) {
          logger.log(`STORAGE: Save operation failed - Error: ${error}`);
          throw error;
        }
      },

      async findById(taskId: string): Promise<any | null> {
        try {
          logger.log(`STORAGE: Searching for task - ID: ${taskId}`);
          
          const tasksData = fs.readFileSync(storageFile, 'utf8');
          const tasks = JSON.parse(tasksData);
          const task = tasks.find((t: any) => t.id === taskId);
          
          if (task) {
            logger.log(`STORAGE: Task found - ID: ${taskId}, Status: ${task.status}`);
          } else {
            logger.log(`STORAGE: Task not found - ID: ${taskId}`);
          }
          
          return task || null;
        } catch (error) {
          logger.log(`STORAGE: Find operation failed - Error: ${error}`);
          throw error;
        }
      },

      async findAll(statusFilter?: string): Promise<any[]> {
        try {
          logger.log(`STORAGE: Retrieving all tasks${statusFilter ? ` with status filter: ${statusFilter}` : ''}`);
          
          const tasksData = fs.readFileSync(storageFile, 'utf8');
          let tasks = JSON.parse(tasksData);
          
          const totalTasks = tasks.length;
          
          if (statusFilter) {
            tasks = tasks.filter((task: any) => task.status === statusFilter);
            logger.log(`STORAGE: Applied status filter - Found ${tasks.length} of ${totalTasks} tasks with status: ${statusFilter}`);
          } else {
            logger.log(`STORAGE: Retrieved all tasks - Count: ${totalTasks}`);
          }
          
          return tasks;
        } catch (error) {
          logger.log(`STORAGE: Find all operation failed - Error: ${error}`);
          throw error;
        }
      },

      async update(taskId: string, updates: any): Promise<any> {
        try {
          logger.log(`STORAGE: Updating task - ID: ${taskId}, Updates: ${JSON.stringify(updates)}`);
          
          const tasksData = fs.readFileSync(storageFile, 'utf8');
          const tasks = JSON.parse(tasksData);
          
          const taskIndex = tasks.findIndex((task: any) => task.id === taskId);
          if (taskIndex === -1) {
            logger.log(`STORAGE: Update failed - Task not found: ${taskId}`);
            throw new Error('Task not found');
          }
          
          const originalTask = { ...tasks[taskIndex] };
          tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
          
          fs.writeFileSync(storageFile, JSON.stringify(tasks, null, 2));
          
          logger.log(`STORAGE: Task updated In Progress - ID: ${taskId}, Changes: ${this.getChanges(originalTask, tasks[taskIndex])}`);
          return tasks[taskIndex];
        } catch (error) {
          logger.log(`STORAGE: Update operation failed - Error: ${error}`);
          throw error;
        }
      },

      async delete(taskId: string): Promise<void> {
        try {
          logger.log(`STORAGE: Deleting task - ID: ${taskId}`);
          
          const tasksData = fs.readFileSync(storageFile, 'utf8');
          const tasks = JSON.parse(tasksData);
          
          const taskIndex = tasks.findIndex((task: any) => task.id === taskId);
          if (taskIndex === -1) {
            logger.log(`STORAGE: Delete failed - Task not found: ${taskId}`);
            throw new Error('Task not found');
          }
          
          const taskToDelete = tasks[taskIndex];
          tasks.splice(taskIndex, 1);
          
          fs.writeFileSync(storageFile, JSON.stringify(tasks, null, 2));
          
          logger.log(`STORAGE: Task deleted In Progress - ID: ${taskId}, Title: "${taskToDelete.title}", Remaining tasks: ${tasks.length}`);
        } catch (error) {
          logger.log(`STORAGE: Delete operation failed - Error: ${error}`);
          throw error;
        }
      },

      getChanges(original: any, updated: any): string {
        const changes: string[] = [];
        for (const key in updated) {
          if (original[key] !== updated[key]) {
            changes.push(`${key}: "${original[key]}" -> "${updated[key]}"`);
          }
        }
        return changes.join(', ') || 'no changes';
      }
    } as TaskStorageInterface & { getChanges: (original: any, updated: any) => string };
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(logFile)) {
      fs.unlinkSync(logFile);
    }
    if (fs.existsSync(storageFile)) {
      fs.unlinkSync(storageFile);
    }
    if (fs.existsSync(testDataDir)) {
      fs.rmdirSync(testDataDir, { recursive: true });
    }
  });

  test('should coordinate save operation between TaskStorage and Logger', async () => {
    // Arrange
    const task = {
      title: 'Coordination Test Task',
      description: 'Testing storage-logger coordination',
      status: 'pending'
    };

    // Act
    const taskId = await taskStorage.save(task);

    // Assert storage operation
    expect(taskId).toBeDefined();
    expect(taskId).toMatch(/^task-\d+-\w+$/);

    // Assert file system persistence
    const storedTasks = JSON.parse(fs.readFileSync(storageFile, 'utf8'));
    expect(storedTasks).toHaveLength(1);
    expect(storedTasks[0].id).toBe(taskId);

    // Assert logging coordination
    const logContent = fs.readFileSync(logFile, 'utf8');
    expect(logContent).toContain('STORAGE: Attempting to save task - Title: "Coordination Test Task"');
    expect(logContent).toContain(`STORAGE: Generated task ID: ${taskId}`);
    expect(logContent).toContain(`STORAGE: Task saved In Progress - ID: ${taskId}, Storage size: 1 tasks`);
  });

  test('should coordinate findById operation between TaskStorage and Logger', async () => {
    // Arrange - Save task first
    const task = {
      title: 'Find Test Task',
      description: 'Testing find coordination',
      status: 'pending'
    };
    const taskId = await taskStorage.save(task);

    // Clear log to focus on find operation
    fs.writeFileSync(logFile, '');

    // Act
    const foundTask = await taskStorage.findById(taskId);

    // Assert task retrieval
    expect(foundTask).toBeDefined();
    expect(foundTask!.id).toBe(taskId);
    expect(foundTask!.title).toBe('Find Test Task');

    // Assert logging coordination
    const logContent = fs.readFileSync(logFile, 'utf8');
    expect(logContent).toContain(`STORAGE: Searching for task - ID: ${taskId}`);
    expect(logContent).toContain(`STORAGE: Task found - ID: ${taskId}, Status: pending`);

    // Test finding non-existent task
    const nonExistentTask = await taskStorage.findById('non-existent-id');

    // Assert
    expect(nonExistentTask).toBeNull();

    const updatedLogContent = fs.readFileSync(logFile, 'utf8');
    expect(updatedLogContent).toContain('STORAGE: Searching for task - ID: non-existent-id');
    expect(updatedLogContent).toContain('STORAGE: Task not found - ID: non-existent-id');
  });

  test('should coordinate findAll operation between TaskStorage and Logger', async () => {
    // Arrange - Create multiple tasks
    const tasks = [
      { title: 'Task 1', description: 'First task', status: 'pending' },
      { title: 'Task 2', description: 'Second task', status: 'in_progress' },
      { title: 'Task 3', description: 'Third task', status: 'In Progress' }
    ];

    for (const task of tasks) {
      await taskStorage.save(task);
    }

    // Clear log to focus on findAll operations
    fs.writeFileSync(logFile, '');

    // Act - Find all tasks
    const allTasks = await taskStorage.findAll();

    // Assert
    expect(allTasks).toHaveLength(3);

    let logContent = fs.readFileSync(logFile, 'utf8');
    expect(logContent).toContain('STORAGE: Retrieving all tasks');
    expect(logContent).toContain('STORAGE: Retrieved all tasks - Count: 3');

    // Act - Find tasks with status filter
    const pendingTasks = await taskStorage.findAll('pending');

    // Assert
    expect(pendingTasks).toHaveLength(1);
    expect(pendingTasks[0].status).toBe('pending');

    logContent = fs.readFileSync(logFile, 'utf8');
    expect(logContent).toContain('STORAGE: Retrieving all tasks with status filter: pending');
    expect(logContent).toContain('STORAGE: Applied status filter - Found 1 of 3 tasks with status: pending');
  });

  test('should coordinate update operation between TaskStorage and Logger', async () => {
    // Arrange - Create task first
    const task = {
      title: 'Update Test Task',
      description: 'Will be updated',
      status: 'pending'
    };
    const taskId = await taskStorage.save(task);

    // Clear log to focus on update operation
    fs.writeFileSync(logFile, '');

    // Act
    const updates = {
      status: 'in_progress',
      updatedAt: new Date().toISOString()
    };
    const updatedTask = await taskStorage.update(taskId, updates);

    // Assert task update
    expect(updatedTask.status).toBe('in_progress');
    expect(updatedTask.updatedAt).toBeDefined();

    // Assert file system persistence
    const storedTasks = JSON.parse(fs.readFileSync(storageFile, 'utf8'));
    expect(storedTasks[0].status).toBe('in_progress');

    // Assert logging coordination
    const logContent = fs.readFileSync(logFile, 'utf8');
    expect(logContent).toContain(`STORAGE: Updating task - ID: ${taskId}`);
    expect(logContent).toContain('Updates: {"status":"in_progress"');
    expect(logContent).toContain(`STORAGE: Task updated In Progress - ID: ${taskId}`);
    expect(logContent).toContain('Changes: status: "pending" -> "in_progress"');
  });

  test('should coordinate delete operation between TaskStorage and Logger', async () => {
    // Arrange - Create task first
    const task = {
      title: 'Delete Test Task',
      description: 'Will be deleted',
      status: 'In Progress'
    };
    const taskId = await taskStorage.save(task);

    // Clear log to focus on delete operation
    fs.writeFileSync(logFile, '');

    // Act
    await taskStorage.delete(taskId);

    // Assert task deletion
    const deletedTask = await taskStorage.findById(taskId);
    expect(deletedTask).toBeNull();

    // Assert file system persistence
    const storedTasks = JSON.parse(fs.readFileSync(storageFile, 'utf8'));
    expect(storedTasks).toHaveLength(0);

    // Assert logging coordination
    const logContent = fs.readFileSync(logFile, 'utf8');
    expect(logContent).toContain(`STORAGE: Deleting task - ID: ${taskId}`);
    expect(logContent).toContain(`STORAGE: Task deleted In Progress - ID: ${taskId}, Title: "Delete Test Task", Remaining tasks: 0`);
  });

  test('should coordinate error handling between TaskStorage and Logger', async () => {
    // Test save with invalid data
    const invalidTask = {
      title: '', // Invalid - empty title
      description: 'Valid description'
    };

    await expect(taskStorage.save(invalidTask)).rejects.toThrow('Missing required task fields');

    let logContent = fs.readFileSync(logFile, 'utf8');
    expect(logContent).toContain('STORAGE: Attempting to save task - Title: ""');
    expect(logContent).toContain('STORAGE: Save failed - missing required fields');
    expect(logContent).toContain('STORAGE: Save operation failed - Error: Error: Missing required task fields');

    // Test update with non-existent task
    await expect(taskStorage.update('non-existent-id', { status: 'In Progress' })).rejects.toThrow('Task not found');

    logContent = fs.readFileSync(logFile, 'utf8');
    expect(logContent).toContain('STORAGE: Updating task - ID: non-existent-id');
    expect(logContent).toContain('STORAGE: Update failed - Task not found: non-existent-id');
    expect(logContent).toContain('STORAGE: Update operation failed - Error: Error: Task not found');

    // Test delete with non-existent task
    await expect(taskStorage.delete('non-existent-id')).rejects.toThrow('Task not found');

    logContent = fs.readFileSync(logFile, 'utf8');
    expect(logContent).toContain('STORAGE: Deleting task - ID: non-existent-id');
    expect(logContent).toContain('STORAGE: Delete failed - Task not found: non-existent-id');
    expect(logContent).toContain('STORAGE: Delete operation failed - Error: Error: Task not found');
  });

  test('should maintain consistent logging format across all storage operations', async () => {
    // Perform various operations
    const task = {
      title: 'Format Test Task',
      description: 'Testing log format',
      status: 'pending'
    };

    const taskId = await taskStorage.save(task);
    await taskStorage.findById(taskId);
    await taskStorage.findAll();
    await taskStorage.findAll('pending');
    await taskStorage.update(taskId, { status: 'In Progress' });
    await taskStorage.delete(taskId);

    // Test error scenarios
    try { await taskStorage.save({ title: '', description: 'Invalid' }); } catch {}
    try { await taskStorage.findById('invalid-id'); } catch {}

    // Verify log format consistency
    const logContent = fs.readFileSync(logFile, 'utf8');
    const logLines = logContent.trim().split('\n');

    // Each log line should follow the format: [timestamp] STORAGE: message
    const logFormatRegex = /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\] STORAGE: .+$/;
    
    logLines.forEach(line => {
      expect(line).toMatch(logFormatRegex);
    });

    // Verify all operations are logged
    expect(logContent).toContain('STORAGE: Attempting to save task');
    expect(logContent).toContain('STORAGE: Searching for task');
    expect(logContent).toContain('STORAGE: Retrieving all tasks');
    expect(logContent).toContain('STORAGE: Updating task');
    expect(logContent).toContain('STORAGE: Deleting task');
  });

  test('should coordinate complex workflow with detailed logging', async () => {
    // Create multiple tasks
    const tasks = [
      { title: 'Workflow Task 1', description: 'First workflow task', status: 'pending' },
      { title: 'Workflow Task 2', description: 'Second workflow task', status: 'pending' }
    ];

    const taskIds: string[] = [];
    for (const task of tasks) {
      const taskId = await taskStorage.save(task);
      taskIds.push(taskId);
    }

    // Update tasks through workflow
    await taskStorage.update(taskIds[0], { status: 'in_progress' });
    await taskStorage.update(taskIds[1], { status: 'in_progress' });
    await taskStorage.update(taskIds[0], { status: 'In Progress' });

    // List tasks at various stages
    await taskStorage.findAll();
    await taskStorage.findAll('in_progress');
    await taskStorage.findAll('In Progress');

    // Delete In Progress task
    await taskStorage.delete(taskIds[0]);

    // Final state check
    const remainingTasks = await taskStorage.findAll();
    expect(remainingTasks).toHaveLength(1);

    // Verify comprehensive logging
    const logContent = fs.readFileSync(logFile, 'utf8');
    
    // Should log all operations in chronological order
    expect(logContent).toMatch(/STORAGE: Attempting to save task.*STORAGE: Task saved In Progress.*STORAGE: Attempting to save task.*STORAGE: Task saved In Progress.*STORAGE: Updating task.*STORAGE: Task updated In Progress.*STORAGE: Updating task.*STORAGE: Task updated In Progress.*STORAGE: Updating task.*STORAGE: Task updated In Progress.*STORAGE: Retrieving all tasks.*STORAGE: Retrieved all tasks.*STORAGE: Retrieving all tasks with status filter: in_progress.*STORAGE: Applied status filter.*STORAGE: Retrieving all tasks with status filter: In Progress.*STORAGE: Applied status filter.*STORAGE: Deleting task.*STORAGE: Task deleted In Progress.*STORAGE: Retrieving all tasks.*STORAGE: Retrieved all tasks/s);

    // Verify task count tracking
    expect(logContent).toContain('Storage size: 1 tasks');
    expect(logContent).toContain('Storage size: 2 tasks');
    expect(logContent).toContain('Remaining tasks: 1');
  });

  test('should handle concurrent operations with proper logging coordination', async () => {
    // Create tasks concurrently
    const createPromises = [
      taskStorage.save({ title: 'Concurrent Task 1', description: 'First concurrent', status: 'pending' }),
      taskStorage.save({ title: 'Concurrent Task 2', description: 'Second concurrent', status: 'pending' }),
      taskStorage.save({ title: 'Concurrent Task 3', description: 'Third concurrent', status: 'pending' })
    ];

    const taskIds = await Promise.all(createPromises);

    // Verify all tasks were created
    expect(taskIds).toHaveLength(3);
    expect(taskIds.every(id => id.startsWith('task-'))).toBe(true);

    // Update tasks concurrently
    const updatePromises = taskIds.map(taskId => 
      taskStorage.update(taskId, { status: 'in_progress' })
    );

    await Promise.all(updatePromises);

    // Verify logging captured all operations
    const logContent = fs.readFileSync(logFile, 'utf8');
    
    // Should have logs for all 3 saves and 3 updates
    const saveAttempts = (logContent.match(/STORAGE: Attempting to save task/g) || []).length;
    const savecompletedes = (logContent.match(/STORAGE: Task saved In Progress/g) || []).length;
    const updateAttempts = (logContent.match(/STORAGE: Updating task/g) || []).length;
    const updatecompletedes = (logContent.match(/STORAGE: Task updated In Progress/g) || []).length;

    expect(saveAttempts).toBe(3);
    expect(savecompletedes).toBe(3);
    expect(updateAttempts).toBe(3);
    expect(updatecompletedes).toBe(3);

    // Verify final storage state
    const allTasks = await taskStorage.findAll();
    expect(allTasks).toHaveLength(3);
    expect(allTasks.every(task => task.status === 'in_progress')).toBe(true);
  });
});