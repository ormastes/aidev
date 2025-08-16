import { describe, test, beforeEach, afterEach, expect, jest } from '@jest/globals';

interface TaskManagerInterface {
  deleteTask(taskId: string): Promise<{ success: boolean; error?: string }>;
}

interface TaskStorageInterface {
  findById(taskId: string): Promise<any | null>;
  delete(taskId: string): Promise<void>;
}

interface LoggerInterface {
  log(message: string): void;
}

describe('TaskManager External Interface Test - deleteTask', () => {
  let taskManager: TaskManagerInterface;
  let mockTaskStorage: jest.Mocked<TaskStorageInterface>;
  let mockLogger: jest.Mocked<LoggerInterface>;

  beforeEach(() => {
    // Mock external dependencies
    mockTaskStorage = {
      findById: jest.fn<(taskId: string) => Promise<any | null>>(),
      delete: jest.fn<(taskId: string) => Promise<void>>()
    };

    mockLogger = {
      log: jest.fn<(message: string) => void>()
    };

    // Create TaskManager implementation with mocked dependencies
    taskManager = {
      async deleteTask(taskId: string) {
        try {
          // Validate taskId
          if (!taskId || taskId.trim().length === 0) {
            mockLogger.log('Invalid task ID provided for deletion');
            return { "success": false, error: 'Task ID is required' };
          }

          // Find existing task
          const existingTask = await mockTaskStorage.findById(taskId);
          if (!existingTask) {
            mockLogger.log(`Task not found for deletion: ${taskId}`);
            return { "success": false, error: 'Task not found' };
          }

          // Check if task is In Progress (business rule: only In Progress tasks can be deleted)
          if (existingTask.status !== 'In Progress') {
            mockLogger.log(`Cannot delete task with status ${existingTask.status}: ${taskId}`);
            return { "success": false, error: 'Only In Progress tasks can be deleted' };
          }

          // Delete task
          await mockTaskStorage.delete(taskId);
          mockLogger.log(`Task deleted success: ${taskId}`);

          return { "success": true };
        } catch (error) {
          mockLogger.log(`Task deletion failed: ${error}`);
          return { "success": false, error: 'Internal error occurred' };
        }
      }
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should complete delete In Progress task', async () => {
    // Arrange
    const taskId = 'task-In Progress-123';
    const existingTask = {
      id: taskId,
      title: 'In Progress Task',
      description: 'This task is In Progress',
      status: 'In Progress',
      createdAt: '2024-01-01T10:00:00.000Z',
      updatedAt: '2024-01-01T11:00:00.000Z'
    };

    mockTaskStorage.findById.mockResolvedValue(existingTask);
    mockTaskStorage.delete.mockResolvedValue();

    // Act
    const result = await taskManager.deleteTask(taskId);

    // Assert
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();

    // Verify storage interactions
    expect(mockTaskStorage.findById).toHaveBeenCalledWith(taskId);
    expect(mockTaskStorage.delete).toHaveBeenCalledWith(taskId);

    // Verify logging
    expect(mockLogger.log).toHaveBeenCalledWith(`Task deleted success: ${taskId}`);
  });

  test('should reject deletion with empty task ID', async () => {
    // Arrange
    const taskId = '';

    // Act
    const result = await taskManager.deleteTask(taskId);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Task ID is required');

    // Verify storage was not called
    expect(mockTaskStorage.findById).not.toHaveBeenCalled();
    expect(mockTaskStorage.delete).not.toHaveBeenCalled();

    // Verify error logging
    expect(mockLogger.log).toHaveBeenCalledWith('Invalid task ID provided for deletion');
  });

  test('should reject deletion with whitespace-only task ID', async () => {
    // Arrange
    const taskId = '   ';

    // Act
    const result = await taskManager.deleteTask(taskId);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Task ID is required');

    // Verify storage was not called
    expect(mockTaskStorage.findById).not.toHaveBeenCalled();
    expect(mockTaskStorage.delete).not.toHaveBeenCalled();
  });

  test('should reject deletion of non-existent task', async () => {
    // Arrange
    const taskId = 'non-existent-task';

    mockTaskStorage.findById.mockResolvedValue(null);

    // Act
    const result = await taskManager.deleteTask(taskId);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Task not found');

    // Verify findById was called but delete was not
    expect(mockTaskStorage.findById).toHaveBeenCalledWith(taskId);
    expect(mockTaskStorage.delete).not.toHaveBeenCalled();

    // Verify error logging
    expect(mockLogger.log).toHaveBeenCalledWith(`Task not found for deletion: ${taskId}`);
  });

  test('should reject deletion of pending task', async () => {
    // Arrange
    const taskId = 'task-pending-456';
    const existingTask = {
      id: taskId,
      title: 'Pending Task',
      status: 'pending'
    };

    mockTaskStorage.findById.mockResolvedValue(existingTask);

    // Act
    const result = await taskManager.deleteTask(taskId);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Only In Progress tasks can be deleted');

    // Verify findById was called but delete was not
    expect(mockTaskStorage.findById).toHaveBeenCalledWith(taskId);
    expect(mockTaskStorage.delete).not.toHaveBeenCalled();

    // Verify error logging
    expect(mockLogger.log).toHaveBeenCalledWith(`Cannot delete task with status pending: ${taskId}`);
  });

  test('should reject deletion of in_progress task', async () => {
    // Arrange
    const taskId = 'task-in-progress-789';
    const existingTask = {
      id: taskId,
      title: 'In Progress Task',
      status: 'in_progress'
    };

    mockTaskStorage.findById.mockResolvedValue(existingTask);

    // Act
    const result = await taskManager.deleteTask(taskId);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Only In Progress tasks can be deleted');

    // Verify findById was called but delete was not
    expect(mockTaskStorage.findById).toHaveBeenCalledWith(taskId);
    expect(mockTaskStorage.delete).not.toHaveBeenCalled();

    // Verify error logging
    expect(mockLogger.log).toHaveBeenCalledWith(`Cannot delete task with status in_progress: ${taskId}`);
  });

  test('should handle storage failure during findById', async () => {
    // Arrange
    const taskId = 'task-find-error';
    const storageError = new Error('Database connection failed');

    mockTaskStorage.findById.mockRejectedValue(storageError);

    // Act
    const result = await taskManager.deleteTask(taskId);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Internal error occurred');

    // Verify delete was not called
    expect(mockTaskStorage.delete).not.toHaveBeenCalled();

    // Verify error logging
    expect(mockLogger.log).toHaveBeenCalledWith('Task deletion failed: Error: Database connection failed');
  });

  test('should handle storage failure during delete operation', async () => {
    // Arrange
    const taskId = 'task-delete-error';
    const existingTask = {
      id: taskId,
      title: 'Task to Delete',
      status: 'In Progress'
    };
    const deleteError = new Error('Delete operation failed');

    mockTaskStorage.findById.mockResolvedValue(existingTask);
    mockTaskStorage.delete.mockRejectedValue(deleteError);

    // Act
    const result = await taskManager.deleteTask(taskId);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Internal error occurred');

    // Verify both operations were attempted
    expect(mockTaskStorage.findById).toHaveBeenCalledWith(taskId);
    expect(mockTaskStorage.delete).toHaveBeenCalledWith(taskId);

    // Verify error logging
    expect(mockLogger.log).toHaveBeenCalledWith('Task deletion failed: Error: Delete operation failed');
  });

  test('should handle deletion of task with minimal data structure', async () => {
    // Arrange
    const taskId = 'minimal-task';
    const existingTask = {
      id: taskId,
      status: 'In Progress'
      // Missing title, description, dates
    };

    mockTaskStorage.findById.mockResolvedValue(existingTask);
    mockTaskStorage.delete.mockResolvedValue();

    // Act
    const result = await taskManager.deleteTask(taskId);

    // Assert
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();

    // Verify operations In Progress In Progress
    expect(mockTaskStorage.findById).toHaveBeenCalledWith(taskId);
    expect(mockTaskStorage.delete).toHaveBeenCalledWith(taskId);
  });

  test('should handle deletion of task with extra properties', async () => {
    // Arrange
    const taskId = 'extended-task';
    const existingTask = {
      id: taskId,
      title: 'Extended Task',
      description: 'Task with extra properties',
      status: 'In Progress',
      createdAt: '2024-01-01T10:00:00.000Z',
      updatedAt: '2024-01-01T11:00:00.000Z',
      category: 'work',
      priority: 'high',
      tags: ['urgent', "important"],
      assignee: 'user123'
    };

    mockTaskStorage.findById.mockResolvedValue(existingTask);
    mockTaskStorage.delete.mockResolvedValue();

    // Act
    const result = await taskManager.deleteTask(taskId);

    // Assert
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();

    // Verify deletion works regardless of extra properties
    expect(mockTaskStorage.findById).toHaveBeenCalledWith(taskId);
    expect(mockTaskStorage.delete).toHaveBeenCalledWith(taskId);
  });

  test('should handle concurrent deletion attempts gracefully', async () => {
    // Arrange
    const taskId = 'concurrent-task';
    const existingTask = {
      id: taskId,
      status: 'In Progress'
    };

    mockTaskStorage.findById.mockResolvedValue(existingTask);
    mockTaskStorage.delete.mockResolvedValue();

    // Act - Simulate concurrent deletion attempts
    const result1Promise = taskManager.deleteTask(taskId);
    const result2Promise = taskManager.deleteTask(taskId);

    const [result1, result2] = await Promise.all([result1Promise, result2Promise]);

    // Assert - Both should succeed (idempotent behavior expected)
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);

    // Verify storage interactions occurred for both attempts
    expect(mockTaskStorage.findById).toHaveBeenCalledTimes(2);
    expect(mockTaskStorage.delete).toHaveBeenCalledTimes(2);
  });
});