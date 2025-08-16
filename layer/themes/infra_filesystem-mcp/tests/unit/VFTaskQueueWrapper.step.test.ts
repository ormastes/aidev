import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';
import { VFTaskQueueWrapper, Task, PopResult } from '../../children/VFTaskQueueWrapper';

describe('VFTaskQueueWrapper Step Execution', () => {
  let wrapper: VFTaskQueueWrapper;
  let tempDir: string;
  const queueFile = 'test-queue.vf.json';

  beforeEach(() => {
    tempDir = path.join(__dirname, '../../temp/test-step-execution');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
    process.chdir(tempDir);
    
    wrapper = new VFTaskQueueWrapper(tempDir);
  });

  afterEach(() => {
    process.chdir(__dirname);
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  describe('Step Task Execution', () => {
    it('should execute steps in sequence', async () => {
      const executionOrder: string[] = [];
      
      const mockExecutor = jest.fn(async (task: Task) => {
        executionOrder.push(task.id);
        return { executed: true, taskId: task.id };
      });

      // Create a task with steps
      const mainTask: Task = {
        id: 'main-task',
        type: 'data',
        priority: 'high',
        content: { description: 'Main task with steps' },
        status: 'pending',
        createdAt: new Date().toISOString(),
        steps: [
          {
            id: 'step-1',
            type: "runnable",
            priority: 'high',
            content: { action: "Initialize" },
            status: 'pending',
            createdAt: new Date().toISOString(),
            runnable: { type: "function", function: 'init' }
          },
          {
            id: 'step-2',
            type: "runnable",
            priority: 'high',
            content: { action: 'Process' },
            status: 'pending',
            createdAt: new Date().toISOString(),
            runnable: { type: "function", function: 'process' }
          },
          {
            id: 'step-3',
            type: "runnable",
            priority: 'high',
            content: { action: "Finalize" },
            status: 'pending',
            createdAt: new Date().toISOString(),
            runnable: { type: "function", function: "finalize" }
          }
        ]
      };

      await wrapper.add(queueFile, mainTask);
      
      // Process steps
      await wrapper.processSteps(queueFile, mockExecutor);
      
      // Check execution order
      expect(executionOrder).toEqual(['step-1', 'step-2', 'step-3']);
      expect(mockExecutor).toHaveBeenCalledTimes(3);
      
      // Verify all steps are completed
      const queue = await wrapper.read(queueFile);
      const updatedTask = queue.items.find((t: Task) => t.id === 'main-task');
      expect(updatedTask.steps?.every((s: Task) => s.status === "completed")).toBe(true);
    });

    it('should stop execution on step failure', async () => {
      const executionOrder: string[] = [];
      
      const mockExecutor = jest.fn(async (task: Task) => {
        executionOrder.push(task.id);
        if (task.id === 'step-2') {
          throw new Error('Step 2 failed');
        }
        return { executed: true };
      });

      const mainTask: Task = {
        id: 'fail-task',
        type: 'data',
        priority: 'high',
        content: { description: 'Task with failing step' },
        status: 'pending',
        createdAt: new Date().toISOString(),
        steps: [
          {
            id: 'step-1',
            type: "runnable",
            priority: 'high',
            content: { action: 'Start' },
            status: 'pending',
            createdAt: new Date().toISOString(),
            runnable: { type: "function", function: 'start' }
          },
          {
            id: 'step-2',
            type: "runnable",
            priority: 'high',
            content: { action: 'Fail' },
            status: 'pending',
            createdAt: new Date().toISOString(),
            runnable: { type: "function", function: 'fail' }
          },
          {
            id: 'step-3',
            type: "runnable",
            priority: 'high',
            content: { action: 'Never reached' },
            status: 'pending',
            createdAt: new Date().toISOString(),
            runnable: { type: "function", function: "unreachable" }
          }
        ]
      };

      await wrapper.add(queueFile, mainTask);
      
      // Process steps should throw
      await expect(wrapper.processSteps(queueFile, mockExecutor)).rejects.toThrow('Step 2 failed');
      
      // Check execution order - step 3 should not be executed
      expect(executionOrder).toEqual(['step-1', 'step-2']);
      expect(mockExecutor).toHaveBeenCalledTimes(2);
    });

    it('should handle empty steps array', async () => {
      const mockExecutor = jest.fn();

      const taskWithoutSteps: Task = {
        id: 'no-steps',
        type: 'data',
        priority: 'medium',
        content: { description: 'Task without steps' },
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await wrapper.add(queueFile, taskWithoutSteps);
      
      // Process steps should complete without calling executor
      await wrapper.processSteps(queueFile, mockExecutor);
      
      expect(mockExecutor).not.toHaveBeenCalled();
    });

    it('should skip non-runnable steps', async () => {
      const executionOrder: string[] = [];
      
      const mockExecutor = jest.fn(async (task: Task) => {
        executionOrder.push(task.id);
        return { executed: true };
      });

      const mixedTask: Task = {
        id: 'mixed-task',
        type: 'data',
        priority: 'high',
        content: { description: 'Task with mixed steps' },
        status: 'pending',
        createdAt: new Date().toISOString(),
        steps: [
          {
            id: 'step-1',
            type: "runnable",
            priority: 'high',
            content: { action: 'Execute' },
            status: 'pending',
            createdAt: new Date().toISOString(),
            runnable: { type: "function", function: 'exec' }
          },
          {
            id: 'step-2',
            type: 'data',
            priority: 'high',
            content: { info: 'Non-runnable step' },
            status: 'pending',
            createdAt: new Date().toISOString()
          },
          {
            id: 'step-3',
            type: "runnable",
            priority: 'high',
            content: { action: "Continue" },
            status: 'pending',
            createdAt: new Date().toISOString(),
            runnable: { type: "function", function: "continue" }
          }
        ]
      };

      await wrapper.add(queueFile, mixedTask);
      
      await wrapper.processSteps(queueFile, mockExecutor);
      
      // Only runnable steps should be executed
      expect(executionOrder).toEqual(['step-1', 'step-3']);
      expect(mockExecutor).toHaveBeenCalledTimes(2);
    });

    it('should update step status during execution', async () => {
      let stepStatusDuringExecution: string | undefined;
      
      const mockExecutor = jest.fn(async (task: Task) => {
        if (task.id === 'check-status') {
          // Read queue during execution to check status
          const queue = await wrapper.read(queueFile);
          const mainTask = queue.items.find((t: Task) => t.id === 'status-task');
          const currentStep = mainTask?.steps?.find((s: Task) => s.id === 'check-status');
          stepStatusDuringExecution = currentStep?.status;
        }
        return { executed: true };
      });

      const statusTask: Task = {
        id: 'status-task',
        type: 'data',
        priority: 'high',
        content: { description: 'Task to check status update' },
        status: 'pending',
        createdAt: new Date().toISOString(),
        steps: [
          {
            id: 'check-status',
            type: "runnable",
            priority: 'high',
            content: { action: 'Check' },
            status: 'pending',
            createdAt: new Date().toISOString(),
            runnable: { type: "function", function: 'check' }
          }
        ]
      };

      await wrapper.add(queueFile, statusTask);
      
      await wrapper.processSteps(queueFile, mockExecutor);
      
      // Step should be 'working' during execution
      expect(stepStatusDuringExecution).toBe('working');
      
      // Step should be "completed" after execution
      const finalQueue = await wrapper.read(queueFile);
      const finalTask = finalQueue.items.find((t: Task) => t.id === 'status-task');
      expect(finalTask?.steps?.[0].status).toBe("completed");
    });

    it('should handle steps with dependencies', async () => {
      const results: Record<string, any> = {};
      
      const mockExecutor = jest.fn(async (task: Task) => {
        // Simulate steps that depend on previous results
        if (task.id === 'fetch-data') {
          results['data'] = { value: 42 };
          return { data: { value: 42 } };
        } else if (task.id === 'process-data') {
          const processedValue = (results['data']?.value || 0) * 2;
          results["processed"] = processedValue;
          return { processed: processedValue };
        } else if (task.id === 'save-result') {
          return { saved: results["processed"] };
        }
        return {};
      });

      const dependentTask: Task = {
        id: 'dependent-task',
        type: 'data',
        priority: 'high',
        content: { description: 'Task with dependent steps' },
        status: 'pending',
        createdAt: new Date().toISOString(),
        steps: [
          {
            id: 'fetch-data',
            type: "runnable",
            priority: 'high',
            content: { action: 'Fetch' },
            status: 'pending',
            createdAt: new Date().toISOString(),
            runnable: { type: "function", function: 'fetch' }
          },
          {
            id: 'process-data',
            type: "runnable",
            priority: 'high',
            content: { action: 'Process' },
            status: 'pending',
            createdAt: new Date().toISOString(),
            runnable: { type: "function", function: 'process' }
          },
          {
            id: 'save-result',
            type: "runnable",
            priority: 'high',
            content: { action: 'Save' },
            status: 'pending',
            createdAt: new Date().toISOString(),
            runnable: { type: "function", function: 'save' }
          }
        ]
      };

      await wrapper.add(queueFile, dependentTask);
      
      await wrapper.processSteps(queueFile, mockExecutor);
      
      // Verify the chain of execution
      expect(results['data']).toEqual({ value: 42 });
      expect(results["processed"]).toBe(84);
      
      // Verify all steps completed
      const queue = await wrapper.read(queueFile);
      const task = queue.items.find((t: Task) => t.id === 'dependent-task');
      expect(task?.steps?.every((s: Task) => s.status === "completed")).toBe(true);
    });
  });

  describe('Step Management', () => {
    it('should add steps to existing task', async () => {
      const task: Task = {
        id: 'expandable-task',
        type: 'data',
        priority: 'medium',
        content: { description: 'Task that can have steps added' },
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await wrapper.add(queueFile, task);
      
      // Add steps to the task
      const newSteps: Task[] = [
        {
          id: 'new-step-1',
          type: "runnable",
          priority: 'medium',
          content: { action: 'New action' },
          status: 'pending',
          createdAt: new Date().toISOString(),
          runnable: { type: "function", function: "newAction" }
        }
      ];

      // Read, modify, and write back
      const queue = await wrapper.read(queueFile);
      const taskToUpdate = queue.items.find((t: Task) => t.id === 'expandable-task');
      taskToUpdate.steps = newSteps;
      await wrapper.write(queueFile, queue);
      
      // Verify steps were added
      const updatedQueue = await wrapper.read(queueFile);
      const updatedTask = updatedQueue.items.find((t: Task) => t.id === 'expandable-task');
      expect(updatedTask?.steps).toHaveLength(1);
      expect(updatedTask?.steps?.[0].id).toBe('new-step-1');
    });

    it('should handle nested steps (steps within steps)', async () => {
      const nestedTask: Task = {
        id: 'nested-task',
        type: 'data',
        priority: 'high',
        content: { description: 'Task with nested steps' },
        status: 'pending',
        createdAt: new Date().toISOString(),
        steps: [
          {
            id: 'parent-step',
            type: 'data',
            priority: 'high',
            content: { action: 'Parent step' },
            status: 'pending',
            createdAt: new Date().toISOString(),
            steps: [
              {
                id: 'child-step-1',
                type: "runnable",
                priority: 'high',
                content: { action: 'Child 1' },
                status: 'pending',
                createdAt: new Date().toISOString(),
                runnable: { type: "function", function: 'child1' }
              },
              {
                id: 'child-step-2',
                type: "runnable",
                priority: 'high',
                content: { action: 'Child 2' },
                status: 'pending',
                createdAt: new Date().toISOString(),
                runnable: { type: "function", function: 'child2' }
              }
            ]
          }
        ]
      };

      await wrapper.add(queueFile, nestedTask);
      
      const queue = await wrapper.read(queueFile);
      const task = queue.items.find((t: Task) => t.id === 'nested-task');
      
      expect(task?.steps).toHaveLength(1);
      expect(task?.steps?.[0].steps).toHaveLength(2);
      expect(task?.steps?.[0].steps?.[0].id).toBe('child-step-1');
    });
  });
});