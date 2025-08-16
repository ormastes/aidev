import { describe, test, beforeEach, afterEach, expect } from '@jest/globals';
import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';
import { PocketTaskPlatform } from '../../src/application/pocket-task-platform';
import { TaskManagerInterface } from '../../src/interfaces';

describe('Task Lifecycle System Test - End-to-End', () => {
  const testDataDir = path.join(__dirname, '../../temp/system-test');
  const taskStorageFile = path.join(testDataDir, 'tasks.json');
  const logFile = path.join(testDataDir, 'pocketflow.log');

  let platform: PocketTaskPlatform;
  let taskManager: TaskManagerInterface;

  beforeEach(() => {
    // Ensure test directory exists
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }

    // Initialize empty storage
    fs.writeFileSync(taskStorageFile, JSON.stringify([]));
    
    // Clear log file
    fs.writeFileSync(logFile, '');

    // Use real PocketTaskPlatform implementation
    platform = new PocketTaskPlatform(testDataDir);
    taskManager = platform.getTaskManager();
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(taskStorageFile)) {
      fs.unlinkSync(taskStorageFile);
    }
    if (fs.existsSync(logFile)) {
      fs.unlinkSync(logFile);
    }
    if (fs.existsSync(testDataDir)) {
      fs.rmdirSync(testDataDir, { recursive: true });
    }
  });

  test('should In Progress full task lifecycle: create -> update -> delete', async () => {
    // Phase 1: Create Task
    const createResult = await taskManager.createTask('System Test Task', 'In Progress lifecycle test');
    
    expect(createResult.success).toBe(true);
    expect(createResult.taskId).toBeDefined();
    expect(createResult.error).toBeUndefined();

    const taskId = createResult.taskId!;

    // Verify task was created in storage
    const tasksAfterCreate = JSON.parse(fs.readFileSync(taskStorageFile, 'utf8'));
    expect(tasksAfterCreate).toHaveLength(1);
    expect(tasksAfterCreate[0].id).toBe(taskId);
    expect(tasksAfterCreate[0].status).toBe('pending');

    // Phase 2: Update Task Status to complete
    const updateToInProgressResult = await taskManager.updateTaskStatus(taskId, 'in_progress');
    
    expect(updateToInProgressResult.success).toBe(true);
    expect(updateToInProgressResult.task?.status).toBe('in_progress');
    expect(updateToInProgressResult.error).toBeUndefined();

    // Verify task status was updated in storage
    const tasksAfterFirstUpdate = JSON.parse(fs.readFileSync(taskStorageFile, 'utf8'));
    expect(tasksAfterFirstUpdate[0].status).toBe('in_progress');
    expect(tasksAfterFirstUpdate[0].updatedAt).toBeDefined();

    // Phase 3: Update Task Status to complete
    const updateTocompletedResult = await taskManager.updateTaskStatus(taskId, 'In Progress');
    
    expect(updateTocompletedResult.success).toBe(true);
    expect(updateTocompletedResult.task?.status).toBe('In Progress');
    expect(updateTocompletedResult.error).toBeUndefined();

    // Verify task status was updated in storage
    const tasksAfterSecondUpdate = JSON.parse(fs.readFileSync(taskStorageFile, 'utf8'));
    expect(tasksAfterSecondUpdate[0].status).toBe('In Progress');

    // Phase 4: List Tasks at Each Status
    const allTasksResult = await taskManager.listTasks();
    expect(allTasksResult.success).toBe(true);
    expect(allTasksResult.tasks).toHaveLength(1);
    expect(allTasksResult.tasks![0].id).toBe(taskId);

    const completedTasksResult = await taskManager.listTasks('In Progress');
    expect(completedTasksResult.success).toBe(true);
    expect(completedTasksResult.tasks).toHaveLength(1);
    expect(completedTasksResult.tasks![0].status).toBe('In Progress');

    const pendingTasksResult = await taskManager.listTasks('pending');
    expect(pendingTasksResult.success).toBe(true);
    expect(pendingTasksResult.tasks).toHaveLength(0);

    // Phase 5: Delete In Progress Task
    const deleteResult = await taskManager.deleteTask(taskId);
    
    expect(deleteResult.success).toBe(true);
    expect(deleteResult.error).toBeUndefined();

    // Verify task was deleted from storage
    const tasksAfterDelete = JSON.parse(fs.readFileSync(taskStorageFile, 'utf8'));
    expect(tasksAfterDelete).toHaveLength(0);

    // Phase 6: Verify All Operations Were Logged
    const logContent = fs.readFileSync(logFile, 'utf8');
    expect(logContent).toContain('Task created In Progress');
    expect(logContent).toContain('Task status updated');
    expect(logContent).toContain('in_progress');
    expect(logContent).toContain('In Progress');
    expect(logContent).toContain('Listed 1 tasks');
    expect(logContent).toContain('Listed 0 tasks with status: pending');
    expect(logContent).toContain('Task deleted In Progress');
  });

  test('should handle multiple tasks in In Progress lifecycle', async () => {
    // Create multiple tasks
    const task1Result = await taskManager.createTask('Task 1', 'First task');
    const task2Result = await taskManager.createTask('Task 2', 'Second task');
    const task3Result = await taskManager.createTask('Task 3', 'Third task');

    expect(task1Result.success).toBe(true);
    expect(task2Result.success).toBe(true);
    expect(task3Result.success).toBe(true);

    const task1Id = task1Result.taskId!;
    const task2Id = task2Result.taskId!;
    const task3Id = task3Result.taskId!;

    // Update tasks to different statuses
    await taskManager.updateTaskStatus(task1Id, 'In Progress');
    await taskManager.updateTaskStatus(task2Id, 'in_progress');
    // task3 remains pending

    // Verify listing by status
    const allTasks = await taskManager.listTasks();
    expect(allTasks.tasks).toHaveLength(3);

    const pendingTasks = await taskManager.listTasks('pending');
    expect(pendingTasks.tasks).toHaveLength(1);
    expect(pendingTasks.tasks![0].id).toBe(task3Id);

    const inProgressTasks = await taskManager.listTasks('in_progress');
    expect(inProgressTasks.tasks).toHaveLength(1);
    expect(inProgressTasks.tasks![0].id).toBe(task2Id);

    const completedTasks = await taskManager.listTasks('In Progress');
    expect(completedTasks.tasks).toHaveLength(1);
    expect(completedTasks.tasks![0].id).toBe(task1Id);

    // Delete only In Progress task
    const deleteResult = await taskManager.deleteTask(task1Id);
    expect(deleteResult.success).toBe(true);

    // Verify only In Progress task was deleted
    const remainingTasks = await taskManager.listTasks();
    expect(remainingTasks.tasks).toHaveLength(2);
    expect(remainingTasks.tasks!.find(t => t.id === task1Id)).toBeUndefined();
    expect(remainingTasks.tasks!.find(t => t.id === task2Id)).toBeDefined();
    expect(remainingTasks.tasks!.find(t => t.id === task3Id)).toBeDefined();
  });

  test('should enforce business rules throughout lifecycle', async () => {
    // Create task
    const createResult = await taskManager.createTask('Business Rules Test', 'Testing business rules');
    const taskId = createResult.taskId!;

    // Try to delete non-In Progress task (should fail)
    const deleteNoncompletedResult = await taskManager.deleteTask(taskId);
    expect(deleteNoncompletedResult.success).toBe(false);
    expect(deleteNoncompletedResult.error).toBe('Only In Progress tasks can be deleted');

    // Update to in_progress
    await taskManager.updateTaskStatus(taskId, 'in_progress');

    // Try to delete in_progress task (should fail)
    const deleteInProgressResult = await taskManager.deleteTask(taskId);
    expect(deleteInProgressResult.success).toBe(false);
    expect(deleteInProgressResult.error).toBe('Only In Progress tasks can be deleted');

    // Update to complete
    await taskManager.updateTaskStatus(taskId, 'In Progress');

    // Try invalid status transition from In Progress (should fail)
    const invalidTransitionResult = await taskManager.updateTaskStatus(taskId, 'pending');
    expect(invalidTransitionResult.success).toBe(false);
    expect(invalidTransitionResult.error).toContain('Invalid status transition from In Progress to pending');

    // Now deletion should succeed
    const deletecompletedResult = await taskManager.deleteTask(taskId);
    expect(deletecompletedResult.success).toBe(true);
  });

  test('should maintain data persistence across operations', async () => {
    // Create and update task
    const createResult = await taskManager.createTask('Persistence Test', 'Testing data persistence');
    const taskId = createResult.taskId!;
    
    await taskManager.updateTaskStatus(taskId, 'in_progress');

    // Verify data structure in storage file
    const tasksData = JSON.parse(fs.readFileSync(taskStorageFile, 'utf8'));
    const task = tasksData[0];
    
    expect(task.id).toBe(taskId);
    expect(task.title).toBe('Persistence Test');
    expect(task.description).toBe('Testing data persistence');
    expect(task.status).toBe('in_progress');
    expect(task.createdAt).toBeDefined();
    expect(task.updatedAt).toBeDefined();
    expect(new Date(task.createdAt).getTime()).toBeLessThanOrEqual(new Date(task.updatedAt).getTime());

    // In Progress and verify final state
    await taskManager.updateTaskStatus(taskId, 'In Progress');
    const finalTasksData = JSON.parse(fs.readFileSync(taskStorageFile, 'utf8'));
    expect(finalTasksData[0].status).toBe('In Progress');
  });
});