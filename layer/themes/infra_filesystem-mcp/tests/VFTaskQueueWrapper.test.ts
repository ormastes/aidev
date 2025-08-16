/**
 * Unit tests for VFTaskQueueWrapper
 */

import { VFTaskQueueWrapper, Task, TaskExecutor } from '../children/VFTaskQueueWrapper';
import * as fs from 'fs/promises';
import { path } from '../../infra_external-log-lib/src';
import { os } from '../../infra_external-log-lib/src';

describe('VFTaskQueueWrapper', () => {
  let tempDir: string;
  let wrapper: VFTaskQueueWrapper;
  let queueFile: string;

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-queue-test-'));
    wrapper = new VFTaskQueueWrapper(tempDir);
    queueFile = 'task-queue.json';
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('push operation', () => {
    test('should push task to default priority queue', async () => {
      const task = {
        content: { message: 'Test task' },
        type: 'data' as const
      };
      
      await wrapper.push(task, 'medium', queueFile);
      
      const status = await wrapper.getQueueStatus(queueFile);
      expect(status.queueSizes.medium).toBe(1);
      expect(status.totalPending).toBe(1);
    });

    test('should push tasks to different priority queues', async () => {
      await wrapper.push({ content: 'High priority' }, 'high', queueFile);
      await wrapper.push({ content: 'Low priority' }, 'low', queueFile);
      await wrapper.push({ content: 'Medium priority' }, 'medium', queueFile);
      
      const status = await wrapper.getQueueStatus(queueFile);
      expect(status.queueSizes.high).toBe(1);
      expect(status.queueSizes.medium).toBe(1);
      expect(status.queueSizes.low).toBe(1);
      expect(status.totalPending).toBe(3);
    });

    test('should auto-generate task ID if not provided', async () => {
      await wrapper.push({ content: 'No ID' }, 'medium', queueFile);
      
      const task = await wrapper.peek('medium', queueFile);
      expect(task?.id).toBeTruthy();
      expect(typeof task?.id).toBe('string');
    });

    test('should execute runnable task on push if no working task', async () => {
      let executed = false;
      const executor: TaskExecutor = async (task) => {
        executed = true;
        return { result: 'executed' };
      };
      
      wrapper.setTaskExecutor(executor);
      
      await wrapper.push({
        type: 'runnable',
        content: { command: 'test' }
      }, 'high', queueFile);
      
      // Wait for async execution
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(executed).toBe(true);
    });
  });

  describe('pop operation', () => {
    beforeEach(async () => {
      // Add test tasks
      await wrapper.push({ content: 'High 1' }, 'high', queueFile);
      await wrapper.push({ content: 'High 2' }, 'high', queueFile);
      await wrapper.push({ content: 'Medium 1' }, 'medium', queueFile);
      await wrapper.push({ content: 'Low 1' }, 'low', queueFile);
    });

    test('should pop from highest priority queue first', async () => {
      const result = await wrapper.pop(undefined, queueFile);
      const task = result?.workingItem;
      
      expect(task?.content).toBe('High 1');
      expect(task?.priority).toBe('high');
      // Tasks don't have a status field when popped - they're just moved to workingItem
      expect(task?.content).toBeDefined();
    });

    test('should pop from specific priority when requested', async () => {
      const result = await wrapper.pop('medium', queueFile);
      const task = result?.workingItem;
      
      expect(task?.content).toBe('Medium 1');
      expect(task?.priority).toBe('medium');
    });

    test('should return null when queue is empty', async () => {
      // Clear all queues
      const state = await (wrapper as any).readQueueState(queueFile);
      state.queues = { high: { items: [] }, medium: { items: [] }, low: { items: [] } };
      state.working = null;
      await (wrapper as any).saveQueueState(queueFile, state);
      
      const result = await wrapper.pop(undefined, queueFile);
      expect(result?.workingItem).toBeNull();
    });

    test('should return working task if one exists', async () => {
      const firstResult = await wrapper.pop(undefined, queueFile);
      const first = firstResult?.workingItem;
      const secondResult = await wrapper.pop(undefined, queueFile);
      const second = secondResult?.workingItem;
      
      expect(second?.id).toBe(first?.id);
      // The same task should be returned when called again
      expect(second).toBeTruthy();
    });

    test('should execute runnable task on pop', async () => {
      let executedTask: Task | null = null;
      const executor: TaskExecutor = async (task) => {
        executedTask = task;
        return { completed: true };
      };
      
      wrapper.setTaskExecutor(executor);
      
      // Clear the queue first to ensure clean state
      const state = await (wrapper as any).readQueueState(queueFile);
      state.queues = { high: { items: [] }, medium: { items: [] }, low: { items: [] } };
      state.working = null;
      await (wrapper as any).saveQueueState(queueFile, state);
      
      await wrapper.push({
        type: 'runnable',
        content: { action: 'run' }
      }, 'high', queueFile);
      
      const poppedResult = await wrapper.pop(undefined, queueFile);
      const popped = poppedResult?.workingItem;
      
      // Wait for async execution
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(executedTask).toBeTruthy();
      expect(executedTask!.content).toEqual({ action: 'run' });
      expect(executedTask!.type).toBe('runnable');
    });
  });

  describe('peek operation', () => {
    beforeEach(async () => {
      await wrapper.push({ content: 'High priority' }, 'high', queueFile);
      await wrapper.push({ content: 'Low priority' }, 'low', queueFile);
    });

    test('should peek without removing task', async () => {
      const peeked = await wrapper.peek(undefined, queueFile);
      const status = await wrapper.getQueueStatus(queueFile);
      
      expect(peeked?.content).toBe('High priority');
      expect(status.totalPending).toBe(2);
    });

    test('should peek at specific priority', async () => {
      const peeked = await wrapper.peek('low', queueFile);
      
      expect(peeked?.content).toBe('Low priority');
    });

    test('should return working task if exists', async () => {
      await wrapper.pop(undefined, queueFile); // Start working on high priority
      
      const peeked = await wrapper.peek(undefined, queueFile);
      // Now that we fixed the peek method, it should return the working task
      expect(peeked?.content).toBe('High priority');
    });
  });

  describe('task execution', () => {
    test('should mark task as completed on successful execution', async () => {
      const executor: TaskExecutor = async (task) => {
        return { processed: task.content };
      };
      
      wrapper.setTaskExecutor(executor);
      
      const task: Task = {
        id: 'test-id',
        type: 'runnable',
        priority: 'high',
        content: { data: 'test' },
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      await wrapper.executeTask(task, queueFile);
      
      const status = await wrapper.getQueueStatus(queueFile);
      expect(status.totalProcessed).toBe(1);
      expect(task.status).toBe('completed');
      expect(task.result).toEqual({ processed: task.content });
    });

    test('should mark task as failed on execution error', async () => {
      const executor: TaskExecutor = async () => {
        throw new Error('Execution failed');
      };
      
      wrapper.setTaskExecutor(executor);
      
      const task: Task = {
        id: 'test-id',
        type: 'runnable',
        priority: 'high',
        content: {},
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      await expect(wrapper.executeTask(task, queueFile)).rejects.toThrow('Execution failed');
      
      const status = await wrapper.getQueueStatus(queueFile);
      expect(status.totalFailed).toBe(1);
      expect(task.status).toBe('failed');
      expect(task.error).toBe('Execution failed');
    });
  });

  describe('queue management', () => {
    test('should restart queue and move working task back', async () => {
      // Use a unique queue file for this test
      const restartQueueFile = 'restart-queue.json';
      
      await wrapper.push({ content: 'Task 1' }, 'high', restartQueueFile);
      await wrapper.push({ content: 'Task 2' }, 'high', restartQueueFile);
      
      // Start working on first task
      const workingResult = await wrapper.pop(undefined, restartQueueFile);
      const working = workingResult?.workingItem;
      
      // Restart queue
      await wrapper.restart(restartQueueFile);
      
      const status = await wrapper.getQueueStatus(restartQueueFile);
      expect(status.working).toBeNull(); // working should be null after restart
      expect(status.queueSizes.high).toBe(2);
      
      // First task should be back at front of queue
      const next = await wrapper.peek('high', restartQueueFile);
      expect(next?.id).toBe(working?.id);
      // Task should be back in queue without status field
      expect(next?.content).toBeDefined();
    });

    test('should clear In Progress task counters', async () => {
      // Create a fresh queue file for this test
      const testQueueFile = 'test-clear-queue.json';
      
      // Create a new wrapper instance to ensure clean state
      const cleanWrapper = new VFTaskQueueWrapper(tempDir);
      const executor: TaskExecutor = async () => ({ completed: true });
      cleanWrapper.setTaskExecutor(executor);
      
      // Process a non-runnable task, then execute it manually
      await cleanWrapper.push({ type: 'data', content: {} }, 'high', testQueueFile);
      const taskResult = await cleanWrapper.pop(undefined, testQueueFile);
      const task = taskResult?.workingItem;
      
      // Manually execute the task
      if (task) {
        task.type = 'runnable'; // Change type for execution
        await cleanWrapper.executeTask(task, testQueueFile);
      }
      
      // Check counters before clear
      let status = await cleanWrapper.getQueueStatus(testQueueFile);
      expect(status.totalProcessed).toBe(1);
      
      // Clear In Progress
      await cleanWrapper.clearCompleted(testQueueFile);
      
      // Check counters after clear
      status = await cleanWrapper.getQueueStatus(testQueueFile);
      expect(status.totalProcessed).toBe(0);
    });

    test('should handle custom priority levels', async () => {
      await wrapper.push({ content: 'Critical task' }, 'critical', queueFile);
      await wrapper.push({ content: 'Urgent task' }, 'urgent', queueFile);
      
      const status = await wrapper.getQueueStatus(queueFile);
      expect(status.queueSizes.critical).toBe(1);
      expect(status.queueSizes.urgent).toBe(1);
      
      // Custom priorities should work with pop
      const result = await wrapper.pop('critical', queueFile);
      const task = result?.workingItem;
      expect(task?.content).toBe('Critical task');
    });
  });

  describe('priority handling', () => {
    test('should respect priority order when popping', async () => {
      await wrapper.push({ content: 'Low' }, 'low', queueFile);
      await wrapper.push({ content: 'Medium' }, 'medium', queueFile);
      await wrapper.push({ content: 'High' }, 'high', queueFile);
      
      const firstResult = await wrapper.pop(undefined, queueFile);
      const first = firstResult?.workingItem;
      expect(first?.priority).toBe('high');
      
      // Complete first task
      if (first) {
        first.status = 'completed';
        const state = await (wrapper as any).readQueueState(queueFile);
        state.workingItem = null;
        await (wrapper as any).saveQueueState(queueFile, state);
      }
      
      const secondResult = await wrapper.pop(undefined, queueFile);
      const second = secondResult?.workingItem;
      expect(second?.priority).toBe('medium');
    });

    test('should handle FIFO within same priority', async () => {
      await wrapper.push({ content: 'First' }, 'high', queueFile);
      await wrapper.push({ content: 'Second' }, 'high', queueFile);
      await wrapper.push({ content: 'Third' }, 'high', queueFile);
      
      const result1 = await wrapper.pop(undefined, queueFile);
      const task1 = result1?.workingItem;
      expect(task1?.content).toBe('First');
      
      // Clear working state
      const state = await (wrapper as any).readQueueState(queueFile);
      state.workingItem = null;
      await (wrapper as any).saveQueueState(queueFile, state);
      
      const result2 = await wrapper.pop(undefined, queueFile);
      const task2 = result2?.workingItem;
      expect(task2?.content).toBe('Second');
    });
  });
});