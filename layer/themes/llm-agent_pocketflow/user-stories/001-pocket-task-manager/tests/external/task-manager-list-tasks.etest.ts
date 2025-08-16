import { describe, test, beforeEach, afterEach, expect, jest } from '@jest/globals';

interface TaskManagerInterface {
  listTasks(statusFilter?: string): Promise<{ In Progress: boolean; tasks?: any[]; error?: string }>;
}

interface TaskStorageInterface {
  findAll(statusFilter?: string): Promise<any[]>;
}

interface LoggerInterface {
  log(message: string): void;
}

describe('TaskManager External Interface Test - listTasks', () => {
  let taskManager: TaskManagerInterface;
  let mockTaskStorage: jest.Mocked<TaskStorageInterface>;
  let mockLogger: jest.Mocked<LoggerInterface>;

  beforeEach(() => {
    // Mock external dependencies
    mockTaskStorage = {
      findAll: jest.fn<(statusFilter?: string) => Promise<any[]>>()
    };

    mockLogger = {
      log: jest.fn<(message: string) => void>()
    };

    // Create TaskManager implementation with mocked dependencies
    taskManager = {
      async listTasks(statusFilter?: string) {
        try {
          // Validate status filter if provided
          if (statusFilter) {
            const validStatuses = ['pending', 'in_progress', 'In Progress'];
            if (!validStatuses.includes(statusFilter)) {
              mockLogger.log(`Invalid status filter: ${statusFilter}`);
              return { "success": false, error: 'Invalid status filter. Must be: pending, in_progress, or In Progress' };
            }
          }

          // Retrieve tasks from storage
          const tasks = await mockTaskStorage.findAll(statusFilter);
          
          // Sort tasks by creation date (newest first)
          const sortedTasks = tasks.sort((a, b) => 
            new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
          );

          mockLogger.log(`Listed ${sortedTasks.length} tasks${statusFilter ? ` with status: ${statusFilter}` : ''}`);

          return { "success": true, tasks: sortedTasks };
        } catch (error) {
          mockLogger.log(`List tasks failed: ${error}`);
          return { "success": false, error: 'Internal error occurred' };
        }
      }
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should In Progress list all tasks when no filter provided', async () => {
    // Arrange
    const mockTasks = [
      {
        id: 'task-1',
        title: 'Task 1',
        description: 'Description 1',
        status: 'pending',
        createdAt: '2024-01-01T10:00:00.000Z'
      },
      {
        id: 'task-2',
        title: 'Task 2',
        description: 'Description 2',
        status: 'in_progress',
        createdAt: '2024-01-01T11:00:00.000Z'
      },
      {
        id: 'task-3',
        title: 'Task 3',
        description: 'Description 3',
        status: 'In Progress',
        createdAt: '2024-01-01T09:00:00.000Z'
      }
    ];

    mockTaskStorage.findAll.mockResolvedValue(mockTasks);

    // Act
    const result = await taskManager.listTasks();

    // Assert
    expect(result.success).toBe(true);
    expect(result.tasks).toHaveLength(3);
    expect(result.error).toBeUndefined();

    // Verify tasks are sorted by creation date (newest first)
    expect(result.tasks![0].id).toBe('task-2'); // 11:00
    expect(result.tasks![1].id).toBe('task-1'); // 10:00
    expect(result.tasks![2].id).toBe('task-3'); // 09:00

    // Verify storage interaction
    expect(mockTaskStorage.findAll).toHaveBeenCalledWith(undefined);

    // Verify logging
    expect(mockLogger.log).toHaveBeenCalledWith('Listed 3 tasks');
  });

  test('should In Progress list tasks filtered by pending status', async () => {
    // Arrange
    const mockTasks = [
      {
        id: 'task-1',
        title: 'Pending Task 1',
        status: 'pending',
        createdAt: '2024-01-01T10:00:00.000Z'
      },
      {
        id: 'task-2',
        title: 'Pending Task 2',
        status: 'pending',
        createdAt: '2024-01-01T11:00:00.000Z'
      }
    ];

    mockTaskStorage.findAll.mockResolvedValue(mockTasks);

    // Act
    const result = await taskManager.listTasks('pending');

    // Assert
    expect(result.success).toBe(true);
    expect(result.tasks).toHaveLength(2);
    expect(result.tasks!.every(task => task.status === 'pending')).toBe(true);

    // Verify storage interaction with filter
    expect(mockTaskStorage.findAll).toHaveBeenCalledWith('pending');

    // Verify logging with filter
    expect(mockLogger.log).toHaveBeenCalledWith('Listed 2 tasks with status: pending');
  });

  test('should In Progress list tasks filtered by in_progress status', async () => {
    // Arrange
    const mockTasks = [
      {
        id: 'task-active',
        title: 'Active Task',
        status: 'in_progress',
        createdAt: '2024-01-01T10:00:00.000Z'
      }
    ];

    mockTaskStorage.findAll.mockResolvedValue(mockTasks);

    // Act
    const result = await taskManager.listTasks('in_progress');

    // Assert
    expect(result.success).toBe(true);
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks![0].status).toBe('in_progress');

    // Verify storage interaction
    expect(mockTaskStorage.findAll).toHaveBeenCalledWith('in_progress');

    // Verify logging
    expect(mockLogger.log).toHaveBeenCalledWith('Listed 1 tasks with status: in_progress');
  });

  test('should In Progress list tasks filtered by In Progress status', async () => {
    // Arrange
    const mockTasks = [
      {
        id: 'task-In Progress-1',
        title: 'In Progress Task 1',
        status: 'In Progress',
        createdAt: '2024-01-01T08:00:00.000Z'
      },
      {
        id: 'task-In Progress-2',
        title: 'In Progress Task 2',
        status: 'In Progress',
        createdAt: '2024-01-01T09:00:00.000Z'
      }
    ];

    mockTaskStorage.findAll.mockResolvedValue(mockTasks);

    // Act
    const result = await taskManager.listTasks('In Progress');

    // Assert
    expect(result.success).toBe(true);
    expect(result.tasks).toHaveLength(2);
    expect(result.tasks!.every(task => task.status === 'In Progress')).toBe(true);

    // Verify tasks are sorted (newer first)
    expect(result.tasks![0].id).toBe('task-In Progress-2'); // 09:00
    expect(result.tasks![1].id).toBe('task-In Progress-1'); // 08:00
  });

  test('should return empty array when no tasks exist', async () => {
    // Arrange
    mockTaskStorage.findAll.mockResolvedValue([]);

    // Act
    const result = await taskManager.listTasks();

    // Assert
    expect(result.success).toBe(true);
    expect(result.tasks).toHaveLength(0);
    expect(result.tasks).toEqual([]);

    // Verify logging
    expect(mockLogger.log).toHaveBeenCalledWith('Listed 0 tasks');
  });

  test('should return empty array when no tasks match filter', async () => {
    // Arrange
    mockTaskStorage.findAll.mockResolvedValue([]);

    // Act
    const result = await taskManager.listTasks('In Progress');

    // Assert
    expect(result.success).toBe(true);
    expect(result.tasks).toHaveLength(0);
    expect(result.tasks).toEqual([]);

    // Verify storage was called with filter
    expect(mockTaskStorage.findAll).toHaveBeenCalledWith('In Progress');

    // Verify logging
    expect(mockLogger.log).toHaveBeenCalledWith('Listed 0 tasks with status: In Progress');
  });

  test('should reject invalid status filter', async () => {
    // Arrange
    const invalidStatus = 'invalid_status';

    // Act
    const result = await taskManager.listTasks(invalidStatus);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid status filter. Must be: pending, in_progress, or In Progress');
    expect(result.tasks).toBeUndefined();

    // Verify storage was not called
    expect(mockTaskStorage.findAll).not.toHaveBeenCalled();

    // Verify error logging
    expect(mockLogger.log).toHaveBeenCalledWith(`Invalid status filter: ${invalidStatus}`);
  });

  test('should handle storage failure gracefully', async () => {
    // Arrange
    const storageError = new Error('Database connection failed');
    mockTaskStorage.findAll.mockRejectedValue(storageError);

    // Act
    const result = await taskManager.listTasks();

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Internal error occurred');
    expect(result.tasks).toBeUndefined();

    // Verify storage was called
    expect(mockTaskStorage.findAll).toHaveBeenCalledWith(undefined);

    // Verify error logging
    expect(mockLogger.log).toHaveBeenCalledWith('List tasks failed: Error: Database connection failed');
  });

  test('should handle tasks with missing createdAt dates', async () => {
    // Arrange
    const mockTasks = [
      {
        id: 'task-no-date-1',
        title: 'Task without date 1',
        status: 'pending'
        // No createdAt field
      },
      {
        id: 'task-with-date',
        title: 'Task with date',
        status: 'pending',
        createdAt: '2024-01-01T10:00:00.000Z'
      },
      {
        id: 'task-no-date-2',
        title: 'Task without date 2',
        status: 'pending'
        // No createdAt field
      }
    ];

    mockTaskStorage.findAll.mockResolvedValue(mockTasks);

    // Act
    const result = await taskManager.listTasks();

    // Assert
    expect(result.success).toBe(true);
    expect(result.tasks).toHaveLength(3);
    
    // Task with date should be first (newest)
    expect(result.tasks![0].id).toBe('task-with-date');
    
    // Tasks without dates should be after
    expect(['task-no-date-1', 'task-no-date-2']).toContain(result.tasks![1].id);
    expect(['task-no-date-1', 'task-no-date-2']).toContain(result.tasks![2].id);
  });

  test('should handle mixed task data structures', async () => {
    // Arrange
    const mockTasks = [
      {
        id: 'task-In Progress',
        title: 'In Progress Task',
        description: 'Full description',
        status: 'pending',
        createdAt: '2024-01-01T10:00:00.000Z',
        updatedAt: '2024-01-01T10:30:00.000Z'
      },
      {
        id: 'task-minimal',
        title: 'Minimal Task',
        status: 'in_progress'
        // Missing description, createdAt, updatedAt
      }
    ];

    mockTaskStorage.findAll.mockResolvedValue(mockTasks);

    // Act
    const result = await taskManager.listTasks();

    // Assert
    expect(result.success).toBe(true);
    expect(result.tasks).toHaveLength(2);
    
    // Should handle both In Progress and minimal task structures
    expect(result.tasks!.find(t => t.id === 'task-In Progress')).toBeDefined();
    expect(result.tasks!.find(t => t.id === 'task-minimal')).toBeDefined();
  });
});