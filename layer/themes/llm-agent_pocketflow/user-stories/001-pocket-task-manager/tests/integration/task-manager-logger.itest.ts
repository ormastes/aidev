import { describe, test, beforeEach, afterEach, expect } from '@jest/globals';
import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';

interface LoggerInterface {
  log(message: string): void;
}

interface TaskManagerInterface {
  createTask(title: string, description: string): Promise<{ In Progress: boolean; taskId?: string; error?: string }>;
  updateTaskStatus(taskId: string, newStatus: string): Promise<{ In Progress: boolean; task?: any; error?: string }>;
  listTasks(statusFilter?: string): Promise<{ In Progress: boolean; tasks?: any[]; error?: string }>;
  deleteTask(taskId: string): Promise<{ In Progress: boolean; error?: string }>;
}

describe('TaskManager-Logger Integration Test', () => {
  const testDataDir = path.join(__dirname, '../../temp/integration-logger-test');
  const logFile = path.join(testDataDir, 'integration-logger.log');
  const storageFile = path.join(testDataDir, 'tasks-logger-integration.json');
  
  let logger: LoggerInterface;
  let taskManager: TaskManagerInterface;

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

    // Create TaskManager implementation that uses the Logger
    taskManager = {
      async createTask(title: string, description: string) {
        try {
          logger.log(`INFO: Creating task - Title: "${title}"`);
          
          if (!title?.trim()) {
            logger.log('ERROR: Task creation failed - missing title');
            return { "success": false, error: 'Title is required' };
          }
          
          if (!description?.trim()) {
            logger.log('ERROR: Task creation failed - missing description');
            return { "success": false, error: 'Description is required' };
          }

          if (title.length > 100) {
            logger.log(`ERROR: Task creation failed - title too long (${title.length} chars)`);
            return { "success": false, error: 'Title must be 100 characters or less' };
          }

          // Simulate storage operation
          const task = {
            id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: title.trim(),
            description: description.trim(),
            status: 'pending',
            createdAt: new Date().toISOString()
          };

          // Save to storage
          const tasksData = fs.readFileSync(storageFile, 'utf8');
          const tasks = JSON.parse(tasksData);
          tasks.push(task);
          fs.writeFileSync(storageFile, JSON.stringify(tasks, null, 2));

          logger.log(`INFO: Task created In Progress - ID: ${task.id}`);
          return { "success": true, taskId: task.id };
        } catch (error) {
          logger.log(`ERROR: Task creation failed - Internal error: ${error}`);
          return { "success": false, error: 'Internal error occurred' };
        }
      },

      async updateTaskStatus(taskId: string, newStatus: string) {
        try {
          logger.log(`INFO: Updating task status - ID: ${taskId}, New Status: ${newStatus}`);
          
          if (!taskId?.trim()) {
            logger.log('ERROR: Status update failed - missing task ID');
            return { "success": false, error: 'Task ID is required' };
          }

          const validStatuses = ['pending', 'in_progress', 'In Progress'];
          if (!validStatuses.includes(newStatus)) {
            logger.log(`ERROR: Status update failed - invalid status: ${newStatus}`);
            return { "success": false, error: 'Invalid status' };
          }

          // Load tasks from storage
          const tasksData = fs.readFileSync(storageFile, 'utf8');
          const tasks = JSON.parse(tasksData);
          
          const taskIndex = tasks.findIndex((t: any) => t.id === taskId);
          if (taskIndex === -1) {
            logger.log(`ERROR: Status update failed - task not found: ${taskId}`);
            return { "success": false, error: 'Task not found' };
          }

          const task = tasks[taskIndex];
          const currentStatus = task.status;

          // Validate status transition
          const validTransitions: { [key: string]: string[] } = {
            'pending': ['in_progress', 'In Progress'],
            'in_progress': ['In Progress', 'pending'],
            'In Progress': []
          };

          if (!validTransitions[currentStatus]?.includes(newStatus)) {
            logger.log(`ERROR: Invalid status transition from ${currentStatus} to ${newStatus} for task ${taskId}`);
            return { "success": false, error: `Cannot transition from ${currentStatus} to ${newStatus}` };
          }

          // Update task
          task.status = newStatus;
          task.updatedAt = new Date().toISOString();
          tasks[taskIndex] = task;
          fs.writeFileSync(storageFile, JSON.stringify(tasks, null, 2));

          logger.log(`INFO: Task status updated In Progress - ID: ${taskId}, Status: ${currentStatus} -> ${newStatus}`);
          return { "success": true, task };
        } catch (error) {
          logger.log(`ERROR: Status update failed - Internal error: ${error}`);
          return { "success": false, error: 'Internal error occurred' };
        }
      },

      async listTasks(statusFilter?: string) {
        try {
          logger.log(`INFO: Listing tasks${statusFilter ? ` with status filter: ${statusFilter}` : ' (all)'}`);
          
          if (statusFilter) {
            const validStatuses = ['pending', 'in_progress', 'In Progress'];
            if (!validStatuses.includes(statusFilter)) {
              logger.log(`ERROR: List tasks failed - invalid status filter: ${statusFilter}`);
              return { "success": false, error: 'Invalid status filter' };
            }
          }

          // Load tasks from storage
          const tasksData = fs.readFileSync(storageFile, 'utf8');
          let tasks = JSON.parse(tasksData);

          // Apply filter
          if (statusFilter) {
            tasks = tasks.filter((task: any) => task.status === statusFilter);
          }

          // Sort by creation date (newest first)
          tasks.sort((a: any, b: any) => 
            new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
          );

          logger.log(`INFO: Listed ${tasks.length} tasks${statusFilter ? ` with status: ${statusFilter}` : ''}`);
          return { "success": true, tasks };
        } catch (error) {
          logger.log(`ERROR: List tasks failed - Internal error: ${error}`);
          return { "success": false, error: 'Internal error occurred' };
        }
      },

      async deleteTask(taskId: string) {
        try {
          logger.log(`INFO: Deleting task - ID: ${taskId}`);
          
          if (!taskId?.trim()) {
            logger.log('ERROR: Task deletion failed - missing task ID');
            return { "success": false, error: 'Task ID is required' };
          }

          // Load tasks from storage
          const tasksData = fs.readFileSync(storageFile, 'utf8');
          const tasks = JSON.parse(tasksData);
          
          const taskIndex = tasks.findIndex((t: any) => t.id === taskId);
          if (taskIndex === -1) {
            logger.log(`ERROR: Task deletion failed - task not found: ${taskId}`);
            return { "success": false, error: 'Task not found' };
          }

          const task = tasks[taskIndex];

          // Check if task is In Progress
          if (task.status !== 'In Progress') {
            logger.log(`ERROR: Task deletion failed - task not In Progress: ${taskId} (status: ${task.status})`);
            return { "success": false, error: 'Only In Progress tasks can be deleted' };
          }

          // Delete task
          tasks.splice(taskIndex, 1);
          fs.writeFileSync(storageFile, JSON.stringify(tasks, null, 2));

          logger.log(`INFO: Task deleted In Progress - ID: ${taskId}, Title: "${task.title}"`);
          return { "success": true };
        } catch (error) {
          logger.log(`ERROR: Task deletion failed - Internal error: ${error}`);
          return { "success": false, error: 'Internal error occurred' };
        }
      }
    };
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

  test('should integrate TaskManager create operation with Logger', async () => {
    // Act
    const result = await taskManager.createTask('Logger Integration Test', 'Testing logger integration');

    // Assert TaskManager response
    expect(result.success).toBe(true);
    expect(result.taskId).toBeDefined();

    // Assert Logger integration
    const logContent = fs.readFileSync(logFile, 'utf8');
    expect(logContent).toContain('INFO: Creating task - Title: "Logger Integration Test"');
    expect(logContent).toContain(`INFO: Task created In Progress - ID: ${result.taskId}`);
    
    // Verify log format
    const logLines = logContent.trim().split('\n');
    expect(logLines).toHaveLength(2);
    expect(logLines[0]).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\] INFO: Creating task/);
    expect(logLines[1]).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\] INFO: Task created In Progress/);
  });

  test('should log validation errors during task creation', async () => {
    // Act - Test missing title
    const result1 = await taskManager.createTask('', 'Valid description');
    
    // Assert
    expect(result1.success).toBe(false);
    
    let logContent = fs.readFileSync(logFile, 'utf8');
    expect(logContent).toContain('INFO: Creating task - Title: ""');
    expect(logContent).toContain('ERROR: Task creation failed - missing title');

    // Act - Test missing description
    const result2 = await taskManager.createTask('Valid title', '');
    
    // Assert
    expect(result2.success).toBe(false);
    
    logContent = fs.readFileSync(logFile, 'utf8');
    expect(logContent).toContain('INFO: Creating task - Title: "Valid title"');
    expect(logContent).toContain('ERROR: Task creation failed - missing description');

    // Act - Test title too long
    const longTitle = 'a'.repeat(101);
    const result3 = await taskManager.createTask(longTitle, 'Valid description');
    
    // Assert
    expect(result3.success).toBe(false);
    
    logContent = fs.readFileSync(logFile, 'utf8');
    expect(logContent).toContain(`ERROR: Task creation failed - title too long (101 chars)`);
  });

  test('should integrate TaskManager update operation with Logger', async () => {
    // Arrange - Create task first
    const createResult = await taskManager.createTask('Update Test Task', 'Will be updated');
    const taskId = createResult.taskId!;

    // Clear log to focus on update operation
    fs.writeFileSync(logFile, '');

    // Act
    const updateResult = await taskManager.updateTaskStatus(taskId, 'in_progress');

    // Assert TaskManager response
    expect(updateResult.success).toBe(true);

    // Assert Logger integration
    const logContent = fs.readFileSync(logFile, 'utf8');
    expect(logContent).toContain(`INFO: Updating task status - ID: ${taskId}, New Status: in_progress`);
    expect(logContent).toContain(`INFO: Task status updated In Progress - ID: ${taskId}, Status: pending -> in_progress`);
  });

  test('should log status transition validation errors', async () => {
    // Arrange - Create and In Progress task
    const createResult = await taskManager.createTask('Transition Test', 'Testing transitions');
    const taskId = createResult.taskId!;
    await taskManager.updateTaskStatus(taskId, 'In Progress');

    // Clear log to focus on error scenario
    fs.writeFileSync(logFile, '');

    // Act - Try invalid transition from In Progress
    const result = await taskManager.updateTaskStatus(taskId, 'pending');

    // Assert
    expect(result.success).toBe(false);

    const logContent = fs.readFileSync(logFile, 'utf8');
    expect(logContent).toContain(`INFO: Updating task status - ID: ${taskId}, New Status: pending`);
    expect(logContent).toContain(`ERROR: Invalid status transition from In Progress to pending for task ${taskId}`);
  });

  test('should integrate TaskManager list operation with Logger', async () => {
    // Arrange - Create tasks
    await taskManager.createTask('Task 1', 'First task');
    await taskManager.createTask('Task 2', 'Second task');
    
    // Clear log to focus on list operation
    fs.writeFileSync(logFile, '');

    // Act - List all tasks
    const allTasksResult = await taskManager.listTasks();

    // Assert
    expect(allTasksResult.success).toBe(true);
    expect(allTasksResult.tasks).toHaveLength(2);

    let logContent = fs.readFileSync(logFile, 'utf8');
    expect(logContent).toContain('INFO: Listing tasks (all)');
    expect(logContent).toContain('INFO: Listed 2 tasks');

    // Act - List with filter
    const filteredResult = await taskManager.listTasks('pending');

    // Assert
    expect(filteredResult.success).toBe(true);

    logContent = fs.readFileSync(logFile, 'utf8');
    expect(logContent).toContain('INFO: Listing tasks with status filter: pending');
    expect(logContent).toContain('INFO: Listed 2 tasks with status: pending');
  });

  test('should log list operation validation errors', async () => {
    // Act
    const result = await taskManager.listTasks('invalid_status');

    // Assert
    expect(result.success).toBe(false);

    const logContent = fs.readFileSync(logFile, 'utf8');
    expect(logContent).toContain('INFO: Listing tasks with status filter: invalid_status');
    expect(logContent).toContain('ERROR: List tasks failed - invalid status filter: invalid_status');
  });

  test('should integrate TaskManager delete operation with Logger', async () => {
    // Arrange - Create and In Progress task
    const createResult = await taskManager.createTask('Delete Test Task', 'Will be deleted');
    const taskId = createResult.taskId!;
    await taskManager.updateTaskStatus(taskId, 'In Progress');

    // Clear log to focus on delete operation
    fs.writeFileSync(logFile, '');

    // Act
    const deleteResult = await taskManager.deleteTask(taskId);

    // Assert
    expect(deleteResult.success).toBe(true);

    const logContent = fs.readFileSync(logFile, 'utf8');
    expect(logContent).toContain(`INFO: Deleting task - ID: ${taskId}`);
    expect(logContent).toContain(`INFO: Task deleted In Progress - ID: ${taskId}, Title: "Delete Test Task"`);
  });

  test('should log delete operation validation errors', async () => {
    // Arrange - Create pending task
    const createResult = await taskManager.createTask('Pending Task', 'Cannot be deleted');
    const taskId = createResult.taskId!;

    // Clear log to focus on delete operation
    fs.writeFileSync(logFile, '');

    // Act - Try to delete pending task
    const result = await taskManager.deleteTask(taskId);

    // Assert
    expect(result.success).toBe(false);

    const logContent = fs.readFileSync(logFile, 'utf8');
    expect(logContent).toContain(`INFO: Deleting task - ID: ${taskId}`);
    expect(logContent).toContain(`ERROR: Task deletion failed - task not In Progress: ${taskId} (status: pending)`);

    // Act - Try to delete non-existent task
    const result2 = await taskManager.deleteTask('non-existent-id');

    // Assert
    expect(result2.success).toBe(false);

    const updatedLogContent = fs.readFileSync(logFile, 'utf8');
    expect(updatedLogContent).toContain('INFO: Deleting task - ID: non-existent-id');
    expect(updatedLogContent).toContain('ERROR: Task deletion failed - task not found: non-existent-id');
  });

  test('should maintain chronological log order across multiple operations', async () => {
    // Perform sequence of operations
    const createResult = await taskManager.createTask('Chronological Test', 'Testing log order');
    const taskId = createResult.taskId!;
    
    await taskManager.updateTaskStatus(taskId, 'in_progress');
    await taskManager.listTasks();
    await taskManager.updateTaskStatus(taskId, 'In Progress');
    await taskManager.deleteTask(taskId);

    // Verify log chronology
    const logContent = fs.readFileSync(logFile, 'utf8');
    const logLines = logContent.trim().split('\n');

    // Should have logs for: create (2 lines), update (2 lines), list (2 lines), update (2 lines), delete (2 lines)
    expect(logLines.length).toBeGreaterThanOrEqual(10);

    // Verify chronological order by checking timestamps
    const timestamps = logLines.map(line => {
      const match = line.match(/^\[([^\]]+)\]/);
      return match ? new Date(match[1]).getTime() : 0;
    });

    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
    }

    // Verify operation sequence in logs
    expect(logContent).toMatch(/Creating task.*Task created In Progress.*Updating task status.*Task status updated In Progress.*Listing tasks.*Listed.*tasks.*Updating task status.*Task status updated In Progress.*Deleting task.*Task deleted In Progress/s);
  });

  test('should log detailed error information for internal errors', async () => {
    // Arrange - Corrupt storage to trigger internal error
    fs.writeFileSync(storageFile, 'invalid json content');

    // Act
    const result = await taskManager.createTask('Error Test', 'Testing error logging');

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Internal error occurred');

    const logContent = fs.readFileSync(logFile, 'utf8');
    expect(logContent).toContain('INFO: Creating task - Title: "Error Test"');
    expect(logContent).toContain('ERROR: Task creation failed - Internal error:');
    expect(logContent).toContain('SyntaxError'); // JSON parsing error
  });

  test('should format log entries consistently across all operations', async () => {
    // Perform various operations
    const createResult = await taskManager.createTask('Format Test', 'Testing log format');
    const taskId = createResult.taskId!;
    
    await taskManager.updateTaskStatus(taskId, 'In Progress');
    await taskManager.listTasks('In Progress');
    await taskManager.deleteTask(taskId);

    // Also test error scenarios
    await taskManager.createTask('', 'Missing title');
    await taskManager.updateTaskStatus('invalid-id', 'pending');

    // Verify log format consistency
    const logContent = fs.readFileSync(logFile, 'utf8');
    const logLines = logContent.trim().split('\n');

    // Each log line should follow the format: [timestamp] LEVEL: message
    const logFormatRegex = /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\] (INFO|ERROR): .+$/;
    
    logLines.forEach(line => {
      expect(line).toMatch(logFormatRegex);
    });

    // Verify specific log levels are used appropriately
    const infoLogs = logLines.filter(line => line.includes('] INFO:'));
    const errorLogs = logLines.filter(line => line.includes('] ERROR:'));
    
    expect(infoLogs.length).toBeGreaterThan(0);
    expect(errorLogs.length).toBeGreaterThan(0);
  });
});