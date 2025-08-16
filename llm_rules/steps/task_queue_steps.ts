import { Given, When, Then } from '@cucumber/cucumber';
import { VFTaskQueueWrapper } from '../../layer/themes/filesystem_mcp/pipe';
import { strict as assert } from 'assert';
import { fs } from '../../layer/themes/infra_external-log-lib/dist';
import { path } from '../../layer/themes/infra_external-log-lib/dist';

export interface TaskQueueWorld {
  taskQueue: VFTaskQueueWrapper;
  currentTask: any;
  error: Error | null;
}

Given('a task queue at {string}', async function(this: TaskQueueWorld, queuePath: string) {
  this.taskQueue = new VFTaskQueueWrapper(queuePath);
  await this.taskQueue.initialize();
});

Given('the working item queue is empty', async function(this: TaskQueueWorld) {
  const state = await this.taskQueue.getQueueState();
  if (state.workingItem) {
    await this.taskQueue.completeTask(state.workingItem.id);
  }
});

Given('all other queues are empty', async function(this: TaskQueueWorld) {
  const state = await this.taskQueue.getQueueState();
  assert.equal(state.queues.high.length, 0, 'High priority queue should be empty');
  assert.equal(state.queues.medium.length, 0, 'Medium priority queue should be empty');
  assert.equal(state.queues.low.length, 0, 'Low priority queue should be empty');
});

When('I add a task {string} with priority {string}', async function(this: TaskQueueWorld, taskTitle: string, priority: string) {
  try {
    const task = {
      id: Date.now().toString(),
      title: taskTitle,
      description: `Task: ${taskTitle}`,
      priority: priority as 'high' | 'medium' | 'low',
      status: 'pending' as const,
      created: new Date().toISOString()
    };
    await this.taskQueue.addTask(task);
    this.error = null;
  } catch (error) {
    this.error = error as Error;
  }
});

When('I add a runnable task {string} with command {string}', async function(this: TaskQueueWorld, taskTitle: string, command: string) {
  try {
    const task = {
      id: Date.now().toString(),
      title: taskTitle,
      description: `Runnable task: ${taskTitle}`,
      priority: 'high' as const,
      status: 'pending' as const,
      created: new Date().toISOString(),
      runnable: {
        type: 'command',
        command: command,
        args: []
      }
    };
    await this.taskQueue.addTask(task);
    this.error = null;
  } catch (error) {
    this.error = error as Error;
  }
});

When('I add a runnable task {string} with script {string}', async function(this: TaskQueueWorld, taskTitle: string, scriptPath: string) {
  try {
    const task = {
      id: Date.now().toString(),
      title: taskTitle,
      description: `Runnable task: ${taskTitle}`,
      priority: 'high' as const,
      status: 'pending' as const,
      created: new Date().toISOString(),
      runnable: {
        type: 'script',
        path: scriptPath,
        args: []
      }
    };
    await this.taskQueue.addTask(task);
    this.error = null;
  } catch (error) {
    this.error = error as Error;
  }
});

When('I pop a task from the queue', async function(this: TaskQueueWorld) {
  try {
    this.currentTask = await this.taskQueue.popTask();
    this.error = null;
  } catch (error) {
    this.error = error as Error;
  }
});

When('I complete the current task', async function(this: TaskQueueWorld) {
  try {
    if (!this.currentTask) {
      throw new Error('No current task to complete');
    }
    await this.taskQueue.completeTask(this.currentTask.id);
    this.error = null;
  } catch (error) {
    this.error = error as Error;
  }
});

When('I execute the runnable task', async function(this: TaskQueueWorld) {
  try {
    if (!this.currentTask || !this.currentTask.runnable) {
      throw new Error('Current task is not runnable');
    }
    
    const { type, command, path: scriptPath, args } = this.currentTask.runnable;
    
    if (type === 'command') {
      const { execSync } = require('child_process');
      execSync(command, { stdio: 'inherit' });
    } else if (type === 'script') {
      const { execSync } = require('child_process');
      execSync(`${scriptPath} ${args.join(' ')}`, { stdio: 'inherit' });
    }
    
    this.error = null;
  } catch (error) {
    this.error = error as Error;
  }
});

Then('the task should be added In Progress', function(this: TaskQueueWorld) {
  assert.equal(this.error, null, 'Task should be added without errors');
});

Then('the working item should be {string}', async function(this: TaskQueueWorld, expectedTitle: string) {
  const state = await this.taskQueue.getQueueState();
  assert.ok(state.workingItem, 'Should have a working item');
  assert.equal(state.workingItem.title, expectedTitle, `Working item should be "${expectedTitle}"`);
});

Then('the {string} priority queue should have {int} items', async function(this: TaskQueueWorld, priority: string, expectedCount: number) {
  const state = await this.taskQueue.getQueueState();
  const actualCount = state.queues[priority as 'high' | 'medium' | 'low'].length;
  assert.equal(actualCount, expectedCount, `${priority} priority queue should have ${expectedCount} items`);
});

Then('I should get an error {string}', function(this: TaskQueueWorld, expectedError: string) {
  assert.ok(this.error, 'Should have received an error');
  assert.ok(this.error.message.includes(expectedError), `Error message should contain "${expectedError}"`);
});

Then('the task should be marked as In Progress', async function(this: TaskQueueWorld) {
  const state = await this.taskQueue.getQueueState();
  assert.ok(state.metadata.processedCount > 0, 'Processed count should be greater than 0');
});

Then('the runnable task should execute In Progress', function(this: TaskQueueWorld) {
  assert.equal(this.error, null, 'Runnable task should execute without errors');
});