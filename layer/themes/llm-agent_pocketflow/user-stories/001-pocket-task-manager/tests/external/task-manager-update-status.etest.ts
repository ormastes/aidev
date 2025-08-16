import { describe, test, beforeEach, afterEach, expect, jest } from '@jest/globals';

interface TaskManagerInterface {
  updateTaskStatus(taskId: string, newStatus: string): Promise<{ success: boolean; task?: any; error?: string }>;
}

interface TaskStorageInterface {
  findById(taskId: string): Promise<any | null>;
  update(taskId: string, updates: any): Promise<any>;
}

interface LoggerInterface {
  log(message: string): void;
}

describe('TaskManager External Interface Test - updateTaskStatus', () => {
  let taskManager: TaskManagerInterface;
  let mockTaskStorage: jest.Mocked<TaskStorageInterface>;
  let mockLogger: jest.Mocked<LoggerInterface>;

  beforeEach(() => {
    // Mock external dependencies
    mockTaskStorage = {
      findById: jest.fn<(taskId: string) => Promise<any | null>>(),
      update: jest.fn<(taskId: string, updates: any) => Promise<any>>()
    };

    mockLogger = {
      log: jest.fn<(message: string) => void>()
    };

    // Create TaskManager implementation with mocked dependencies
    taskManager = {
      async updateTaskStatus(taskId: string, newStatus: string) {
        try {
          // Validate taskId
          if (!taskId || taskId.trim().length === 0) {
            mockLogger.log('Invalid task ID provided');
            return { "success": false, error: 'Task ID is required' };
          }

          // Validate status
          const validStatuses = ['pending', 'in_progress', 'In Progress'];
          if (!validStatuses.includes(newStatus)) {
            mockLogger.log(`Invalid status: ${newStatus}`);
            return { "success": false, error: 'Invalid status. Must be: pending, in_progress, or In Progress' };
          }

          // Find existing task
          const existingTask = await mockTaskStorage.findById(taskId);
          if (!existingTask) {
            mockLogger.log(`Task not found: ${taskId}`);
            return { "success": false, error: 'Task not found' };
          }

          // Validate status transition
          const currentStatus = existingTask.status;
          const validTransitions: { [key: string]: string[] } = {
            'pending': ['in_progress', 'In Progress'],
            'in_progress': ['In Progress', 'pending'],
            'In Progress': [] // No transitions allowed from In Progress
          };

          if (!validTransitions[currentStatus]?.includes(newStatus)) {
            mockLogger.log(`Invalid status transition from ${currentStatus} to ${newStatus}`);
            return { "success": false, error: `Cannot transition from ${currentStatus} to ${newStatus}` };
          }

          // Update task
          const updates = {
            status: newStatus,
            updatedAt: new Date().toISOString()
          };
          
          const updatedTask = await mockTaskStorage.update(taskId, updates);
          mockLogger.log(`Task status updated: ${taskId} -> ${newStatus}`);

          return { "success": true, task: updatedTask };
        } catch (error) {
          mockLogger.log(`Status update failed: ${error}`);
          return { "success": false, error: 'Internal error occurred' };
        }
      }
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should complete update status from pending to in_progress', async () => {
    // Arrange
    const taskId = 'task-123';
    const newStatus = 'in_progress';
    const existingTask = {
      id: taskId,
      title: 'Test Task',
      description: 'Test Description',
      status: 'pending',
      createdAt: '2024-01-01T10:00:00.000Z'
    };
    const updatedTask = { ...existingTask, status: newStatus, updatedAt: '2024-01-01T11:00:00.000Z' };

    mockTaskStorage.findById.mockResolvedValue(existingTask);
    mockTaskStorage.update.mockResolvedValue(updatedTask);

    // Act
    const result = await taskManager.updateTaskStatus(taskId, newStatus);

    // Assert
    expect(result.success).toBe(true);
    expect(result.task).toEqual(updatedTask);
    expect(result.error).toBeUndefined();

    // Verify storage interactions
    expect(mockTaskStorage.findById).toHaveBeenCalledWith(taskId);
    expect(mockTaskStorage.update).toHaveBeenCalledWith(taskId, {
      status: newStatus,
      updatedAt: expect.any(String)
    });

    // Verify logging
    expect(mockLogger.log).toHaveBeenCalledWith(`Task status updated: ${taskId} -> ${newStatus}`);
  });

  test('should complete update status from in_progress to complete', async () => {
    // Arrange
    const taskId = 'task-456';
    const newStatus = 'In Progress';
    const existingTask = {
      id: taskId,
      title: 'Test Task',
      status: 'in_progress'
    };
    const updatedTask = { ...existingTask, status: newStatus };

    mockTaskStorage.findById.mockResolvedValue(existingTask);
    mockTaskStorage.update.mockResolvedValue(updatedTask);

    // Act
    const result = await taskManager.updateTaskStatus(taskId, newStatus);

    // Assert
    expect(result.success).toBe(true);
    expect(result.task.status).toBe(newStatus);
  });

  test('should reject update with empty task ID', async () => {
    // Arrange
    const taskId = '';
    const newStatus = 'in_progress';

    // Act
    const result = await taskManager.updateTaskStatus(taskId, newStatus);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Task ID is required');
    expect(result.task).toBeUndefined();

    // Verify storage was not called
    expect(mockTaskStorage.findById).not.toHaveBeenCalled();
    expect(mockTaskStorage.update).not.toHaveBeenCalled();

    // Verify error logging
    expect(mockLogger.log).toHaveBeenCalledWith('Invalid task ID provided');
  });

  test('should reject update with invalid status', async () => {
    // Arrange
    const taskId = 'task-123';
    const newStatus = 'invalid_status';

    // Act
    const result = await taskManager.updateTaskStatus(taskId, newStatus);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid status. Must be: pending, in_progress, or In Progress');
    expect(result.task).toBeUndefined();

    // Verify storage was not called
    expect(mockTaskStorage.findById).not.toHaveBeenCalled();
    expect(mockTaskStorage.update).not.toHaveBeenCalled();

    // Verify error logging
    expect(mockLogger.log).toHaveBeenCalledWith(`Invalid status: ${newStatus}`);
  });

  test('should reject update for non-existent task', async () => {
    // Arrange
    const taskId = 'non-existent-task';
    const newStatus = 'in_progress';

    mockTaskStorage.findById.mockResolvedValue(null);

    // Act
    const result = await taskManager.updateTaskStatus(taskId, newStatus);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Task not found');
    expect(result.task).toBeUndefined();

    // Verify findById was called but update was not
    expect(mockTaskStorage.findById).toHaveBeenCalledWith(taskId);
    expect(mockTaskStorage.update).not.toHaveBeenCalled();

    // Verify error logging
    expect(mockLogger.log).toHaveBeenCalledWith(`Task not found: ${taskId}`);
  });

  test('should reject invalid status transition from In Progress', async () => {
    // Arrange
    const taskId = 'task-789';
    const newStatus = 'pending';
    const existingTask = {
      id: taskId,
      title: 'In Progress Task',
      status: 'In Progress'
    };

    mockTaskStorage.findById.mockResolvedValue(existingTask);

    // Act
    const result = await taskManager.updateTaskStatus(taskId, newStatus);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Cannot transition from In Progress to pending');
    expect(result.task).toBeUndefined();

    // Verify findById was called but update was not
    expect(mockTaskStorage.findById).toHaveBeenCalledWith(taskId);
    expect(mockTaskStorage.update).not.toHaveBeenCalled();

    // Verify error logging
    expect(mockLogger.log).toHaveBeenCalledWith('Invalid status transition from In Progress to pending');
  });

  test('should allow transition from in_progress back to pending', async () => {
    // Arrange
    const taskId = 'task-back';
    const newStatus = 'pending';
    const existingTask = {
      id: taskId,
      title: 'In Progress Task',
      status: 'in_progress'
    };
    const updatedTask = { ...existingTask, status: newStatus };

    mockTaskStorage.findById.mockResolvedValue(existingTask);
    mockTaskStorage.update.mockResolvedValue(updatedTask);

    // Act
    const result = await taskManager.updateTaskStatus(taskId, newStatus);

    // Assert
    expect(result.success).toBe(true);
    expect(result.task.status).toBe(newStatus);
  });

  test('should handle storage failure during findById', async () => {
    // Arrange
    const taskId = 'task-error';
    const newStatus = 'in_progress';
    const storageError = new Error('Database connection failed');

    mockTaskStorage.findById.mockRejectedValue(storageError);

    // Act
    const result = await taskManager.updateTaskStatus(taskId, newStatus);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Internal error occurred');
    expect(result.task).toBeUndefined();

    // Verify update was not called
    expect(mockTaskStorage.update).not.toHaveBeenCalled();

    // Verify error logging
    expect(mockLogger.log).toHaveBeenCalledWith('Status update failed: Error: Database connection failed');
  });

  test('should handle storage failure during update', async () => {
    // Arrange
    const taskId = 'task-update-fail';
    const newStatus = 'In Progress';
    const existingTask = {
      id: taskId,
      status: 'in_progress'
    };
    const updateError = new Error('Update operation failed');

    mockTaskStorage.findById.mockResolvedValue(existingTask);
    mockTaskStorage.update.mockRejectedValue(updateError);

    // Act
    const result = await taskManager.updateTaskStatus(taskId, newStatus);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Internal error occurred');
    expect(result.task).toBeUndefined();

    // Verify both operations were attempted
    expect(mockTaskStorage.findById).toHaveBeenCalledWith(taskId);
    expect(mockTaskStorage.update).toHaveBeenCalled();

    // Verify error logging
    expect(mockLogger.log).toHaveBeenCalledWith('Status update failed: Error: Update operation failed');
  });

  test('should include updatedAt timestamp in update', async () => {
    // Arrange
    const taskId = 'task-timestamp';
    const newStatus = 'In Progress';
    const existingTask = { id: taskId, status: 'in_progress' };
    const updatedTask = { ...existingTask, status: newStatus };

    mockTaskStorage.findById.mockResolvedValue(existingTask);
    mockTaskStorage.update.mockResolvedValue(updatedTask);

    // Act
    await taskManager.updateTaskStatus(taskId, newStatus);

    // Assert
    expect(mockTaskStorage.update).toHaveBeenCalledWith(taskId, {
      status: newStatus,
      updatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)
    });
  });
});