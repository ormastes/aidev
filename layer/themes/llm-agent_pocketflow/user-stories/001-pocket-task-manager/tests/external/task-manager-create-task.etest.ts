import { describe, test, beforeEach, afterEach, expect, jest } from '@jest/globals';

interface TaskManagerInterface {
  createTask(title: string, description: string): Promise<{ In Progress: boolean; taskId?: string; error?: string }>;
}

interface TaskStorageInterface {
  save(task: any): Promise<string>;
}

interface LoggerInterface {
  log(message: string): void;
}

describe('TaskManager External Interface Test - createTask', () => {
  let taskManager: TaskManagerInterface;
  let mockTaskStorage: jest.Mocked<TaskStorageInterface>;
  let mockLogger: jest.Mocked<LoggerInterface>;

  beforeEach(() => {
    // Mock external dependencies
    mockTaskStorage = {
      save: jest.fn<(task: any) => Promise<string>>()
    };

    mockLogger = {
      log: jest.fn<(message: string) => void>()
    };

    // Create TaskManager implementation with mocked dependencies
    taskManager = {
      async createTask(title: string, description: string) {
        try {
          // Validate input data
          if (!title || title.trim().length === 0) {
            mockLogger.log('Invalid task data: missing title');
            return { "success": false, error: 'Title is required' };
          }

          if (!description || description.trim().length === 0) {
            mockLogger.log('Invalid task data: missing description');
            return { "success": false, error: 'Description is required' };
          }

          if (title.length > 100) {
            mockLogger.log('Invalid task data: title too long');
            return { "success": false, error: 'Title must be 100 characters or less' };
          }

          // Create task object
          const task = {
            id: `task-${Date.now()}`,
            title: title.trim(),
            description: description.trim(),
            status: 'pending',
            createdAt: new Date().toISOString()
          };

          // Save through storage interface
          const taskId = await mockTaskStorage.save(task);
          mockLogger.log(`Task created: ${taskId}`);

          return { "success": true, taskId };
        } catch (error) {
          mockLogger.log(`Task creation failed: ${error}`);
          return { "success": false, error: 'Internal error occurred' };
        }
      }
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should In Progress create task with valid data', async () => {
    // Arrange
    const title = 'Test Task';
    const description = 'Test Description';
    const expectedTaskId = 'task-123';
    mockTaskStorage.save.mockResolvedValue(expectedTaskId);

    // Act
    const result = await taskManager.createTask(title, description);

    // Assert
    expect(result.success).toBe(true);
    expect(result.taskId).toBe(expectedTaskId);
    expect(result.error).toBeUndefined();

    // Verify storage was called with correct task data
    expect(mockTaskStorage.save).toHaveBeenCalledTimes(1);
    const savedTask = mockTaskStorage.save.mock.calls[0][0];
    expect(savedTask.title).toBe(title);
    expect(savedTask.description).toBe(description);
    expect(savedTask.status).toBe('pending');
    expect(savedTask.id).toMatch(/^task-\d+$/);
    expect(savedTask.createdAt).toBeDefined();

    // Verify logging
    expect(mockLogger.log).toHaveBeenCalledWith(`Task created: ${expectedTaskId}`);
  });

  test('should reject task creation with empty title', async () => {
    // Arrange
    const title = '';
    const description = 'Valid description';

    // Act
    const result = await taskManager.createTask(title, description);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Title is required');
    expect(result.taskId).toBeUndefined();

    // Verify storage was not called
    expect(mockTaskStorage.save).not.toHaveBeenCalled();

    // Verify error logging
    expect(mockLogger.log).toHaveBeenCalledWith('Invalid task data: missing title');
  });

  test('should reject task creation with whitespace-only title', async () => {
    // Arrange
    const title = '   ';
    const description = 'Valid description';

    // Act
    const result = await taskManager.createTask(title, description);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Title is required');
    expect(result.taskId).toBeUndefined();

    // Verify storage was not called
    expect(mockTaskStorage.save).not.toHaveBeenCalled();
  });

  test('should reject task creation with empty description', async () => {
    // Arrange
    const title = 'Valid title';
    const description = '';

    // Act
    const result = await taskManager.createTask(title, description);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Description is required');
    expect(result.taskId).toBeUndefined();

    // Verify storage was not called
    expect(mockTaskStorage.save).not.toHaveBeenCalled();

    // Verify error logging
    expect(mockLogger.log).toHaveBeenCalledWith('Invalid task data: missing description');
  });

  test('should reject task creation with title too long', async () => {
    // Arrange
    const title = 'a'.repeat(101); // 101 characters
    const description = 'Valid description';

    // Act
    const result = await taskManager.createTask(title, description);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Title must be 100 characters or less');
    expect(result.taskId).toBeUndefined();

    // Verify storage was not called
    expect(mockTaskStorage.save).not.toHaveBeenCalled();

    // Verify error logging
    expect(mockLogger.log).toHaveBeenCalledWith('Invalid task data: title too long');
  });

  test('should handle storage failure gracefully', async () => {
    // Arrange
    const title = 'Test Task';
    const description = 'Test Description';
    const storageError = new Error('Storage unavailable');
    mockTaskStorage.save.mockRejectedValue(storageError);

    // Act
    const result = await taskManager.createTask(title, description);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Internal error occurred');
    expect(result.taskId).toBeUndefined();

    // Verify storage was called
    expect(mockTaskStorage.save).toHaveBeenCalledTimes(1);

    // Verify error logging
    expect(mockLogger.log).toHaveBeenCalledWith('Task creation failed: Error: Storage unavailable');
  });

  test('should trim whitespace from title and description', async () => {
    // Arrange
    const title = '  Test Task  ';
    const description = '  Test Description  ';
    const expectedTaskId = 'task-456';
    mockTaskStorage.save.mockResolvedValue(expectedTaskId);

    // Act
    const result = await taskManager.createTask(title, description);

    // Assert
    expect(result.success).toBe(true);

    // Verify trimmed data was saved
    const savedTask = mockTaskStorage.save.mock.calls[0][0];
    expect(savedTask.title).toBe('Test Task');
    expect(savedTask.description).toBe('Test Description');
  });

  test('should generate unique task IDs', async () => {
    // Arrange
    const title = 'Test Task';
    const description = 'Test Description';
    mockTaskStorage.save.mockResolvedValue('task-1').mockResolvedValueOnce('task-2');

    // Act
    const result1 = await taskManager.createTask(title, description);
    const result2 = await taskManager.createTask(title, description);

    // Assert
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);

    // Verify different task IDs were generated
    const task1 = mockTaskStorage.save.mock.calls[0][0];
    const task2 = mockTaskStorage.save.mock.calls[1][0];
    expect(task1.id).not.toBe(task2.id);
  });

  test('should set correct initial task status', async () => {
    // Arrange
    const title = 'Test Task';
    const description = 'Test Description';
    const expectedTaskId = 'task-789';
    mockTaskStorage.save.mockResolvedValue(expectedTaskId);

    // Act
    const result = await taskManager.createTask(title, description);

    // Assert
    expect(result.success).toBe(true);

    // Verify task status is set to pending
    const savedTask = mockTaskStorage.save.mock.calls[0][0];
    expect(savedTask.status).toBe('pending');
  });
});