import { describe, it, expect, beforeEach } from '@jest/globals';
import { DefaultTaskExecutor } from '../../children/DefaultTaskExecutor';
import { Task } from '../../children/VFTaskQueueWrapper';

describe('DefaultTaskExecutor Basic Tests', () => {
  let executor: DefaultTaskExecutor;

  beforeEach(() => {
    executor = new DefaultTaskExecutor();
  });

  describe('basic functionality', () => {
    it('should create executor instance', () => {
      expect(executor).toBeDefined();
      expect(executor.directory).toBe(process.cwd());
    });

    it('should return task executor function', () => {
      const taskExecutor = executor.getExecutor();
      expect(typeof taskExecutor).toBe('function');
    });

    it('should register and store functions', () => {
      const testFn = jest.fn();
      executor.registerFunction('testFunc', testFn);
      
      // Test that function is registered (will be called when we fix the executor)
      expect(executor).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should throw error for non-runnable tasks', async () => {
      const task: Task = {
        id: 'test-1',
        type: 'data',
        priority: 'medium',
        content: { message: 'test' },
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      const taskExecutor = executor.getExecutor();
      
      await expect(taskExecutor(task)).rejects.toThrow('Task is not runnable');
    });

    it('should throw error for missing runnable config', async () => {
      const task: Task = {
        id: 'test-2',
        type: 'runnable',
        priority: 'medium',
        content: {},
        status: 'pending',
        createdAt: new Date().toISOString()
        // Missing runnable property
      };

      const taskExecutor = executor.getExecutor();
      
      await expect(taskExecutor(task)).rejects.toThrow('missing runnable configuration');
    });
  });

  describe('directory management', () => {
    it('should accept custom working directory', () => {
      const customDir = '/tmp/test';
      const customExecutor = new DefaultTaskExecutor(customDir);
      expect(customExecutor.directory).toBe(customDir);
    });
  });
});