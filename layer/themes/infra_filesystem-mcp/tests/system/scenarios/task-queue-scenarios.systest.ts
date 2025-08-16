/**
 * System Tests for Task Queue Management Scenarios
 * 
 * This test suite covers comprehensive real-world scenarios for
 * task queue management using VFTaskQueueWrapper.
 */

import { VFTaskQueueWrapper, Task, TaskExecutor } from '../../../children/VFTaskQueueWrapper';
import * as fs from 'fs/promises';
import { path } from '../../layer/themes/infra_external-log-lib/src';
import { os } from '../../layer/themes/infra_external-log-lib/src';

describe('Task Queue Management System Test Scenarios', () => {
  let tempDir: string;
  let wrapper: VFTaskQueueWrapper;
  let queueFile: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-queue-system-'));
    wrapper = new VFTaskQueueWrapper(tempDir);
    queueFile = 'task-queue.vf.json';
    
    // Load sample task queue data
    const sampleData = await fs.readFile(
      path.join(__dirname, '../fixtures/sample-task-queue.json'),
      'utf-8'
    );
    await fs.writeFile(path.join(tempDir, queueFile), sampleData);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('🚨 Story: DevOps Engineer Handles Critical Issues', () => {
    test('Should immediately process critical security vulnerabilities', async () => {
      // Given: A DevOps engineer monitoring for critical issues
      // When: They check for critical priority tasks
      const criticalTask = await wrapper.peek("critical", queueFile);
      
      // Then: They should see the security vulnerability
      expect(criticalTask).toBeTruthy();
      expect(criticalTask!.priority).toBe("critical");
      expect(criticalTask!.content.title).toBe('Security Vulnerability Fix');
      expect(criticalTask!.content.severity).toBe("critical");
      
      // And: Task should have detailed remediation steps
      expect(criticalTask!.content.steps).toContain('Analyze vulnerability report');
      expect(criticalTask!.content.steps).toContain('Deploy to production immediately');
      
      console.log('🔄 DevOps engineer can identify critical security issues');
    });

    test('Should execute critical tasks with proper logging', async () => {
      // Given: An automated system for critical task execution
      let executedTasks: Task[] = [];
      const criticalExecutor: TaskExecutor = async (task) => {
        executedTasks.push(task);
        return {
          status: 'hotfix-deployed',
          deploymentId: 'deploy-' + Date.now(),
          affectedSystems: ['auth-service', 'user-api']
        };
      };
      
      wrapper.setTaskExecutor(criticalExecutor);
      
      // When: Processing the critical task
      const task = await wrapper.pop("critical", queueFile);
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for async execution
      
      // Then: Task should be executed with proper results
      expect(executedTasks).toHaveLength(1);
      expect(executedTasks[0].content.title).toBe('Security Vulnerability Fix');
      
      // And: Task status should be updated
      const status = await wrapper.getQueueStatus(queueFile);
      expect(status.totalProcessed).toBe(1);
      
      console.log('🔄 Critical tasks are executed with proper logging and tracking');
    });
  });

  describe('👨‍💻 Story: Developer Manages Sprint Tasks', () => {
    test('Should prioritize and pick up next development task', async () => {
      // Given: A developer starting their work day
      // When: They request the next highest priority task
      const nextTask = await wrapper.peek(undefined, queueFile);
      
      // Then: They should get the critical task first
      expect(nextTask!.priority).toBe("critical");
      
      // When: After critical task is handled, they get the next task
      await wrapper.pop("critical", queueFile);
      const nextDevTask = await wrapper.peek(undefined, queueFile);
      
      // Then: They should get a high priority development task
      expect(nextDevTask!.priority).toBe('high');
      expect(nextDevTask!.content.title).toBe('User Authentication API');
      expect(nextDevTask!.content.assignee).toBe('backend-team');
      
      console.log('🔄 Developer can prioritize and pick up appropriate tasks');
    });

    test('Should handle task dependencies correctly', async () => {
      // Given: A developer working on dependent tasks
      // When: They check medium priority tasks
      const mediumTasks = await wrapper.peek('medium', queueFile);
      
      // Then: They should see tasks with dependency information
      expect(mediumTasks!.content.dependencies).toBeDefined();
      
      // And: Documentation task should depend on API implementation
      if (mediumTasks!.content.title === 'API Documentation') {
        expect(mediumTasks!.content.dependencies).toContain('high-001');
      }
      
      // And: Integration tests should depend on both high priority tasks
      const integrationTaskQueue = await wrapper.read(queueFile);
      const integrationTask = integrationTaskQueue.queues.medium.find(
        t => t.content.title === 'Integration Test Suite'
      );
      expect(integrationTask!.content.dependencies).toContain('high-001');
      expect(integrationTask!.content.dependencies).toContain('high-002');
      
      console.log('🔄 Task dependencies are properly tracked and visible');
    });

    test('Should estimate and track development effort', async () => {
      // Given: A team lead planning sprint capacity
      // When: They analyze all pending tasks
      const status = await wrapper.getQueueStatus(queueFile);
      const allTasks = await wrapper.read(queueFile);
      
      // Calculate total effort across all priorities
      let totalHours = 0;
      Object.values(allTasks.queues).forEach(queue => {
        queue.forEach(task => {
          const hours = parseInt(task.content.estimated_time?.split(' ')[0] || '0');
          totalHours += hours;
        });
      });
      
      // Then: They should see realistic effort estimates
      expect(totalHours).toBe(20); // 2+4+3+2+3+4+2 hours
      expect(status.totalPending).toBe(7); // 1 critical + 2 high + 2 medium + 2 low
      
      console.log(`🔄 Team lead can track ${totalHours} hours across ${status.totalPending} tasks`);
    });
  });

  describe('📊 Story: Project Manager Monitors Progress', () => {
    test('Should track task completion and team velocity', async () => {
      // Given: A project manager monitoring team progress
      let completedTasks = 0;
      const trackingExecutor: TaskExecutor = async (task) => {
        completedTasks++;
        return {
          completedBy: 'team-member',
          completionTime: new Date().toISOString(),
          actualHours: parseInt(task.content.estimated_time?.split(' ')[0] || '0')
        };
      };
      
      wrapper.setTaskExecutor(trackingExecutor);
      
      // When: Processing multiple tasks
      await wrapper.pop('high', queueFile); // First high priority task
      await wrapper.pop('high', queueFile); // Second high priority task
      await new Promise(resolve => setTimeout(resolve, 200)); // Wait for execution
      
      // Then: Progress should be tracked accurately
      const status = await wrapper.getQueueStatus(queueFile);
      expect(status.totalProcessed).toBe(2);
      expect(status.queueSizes.high).toBe(0); // High priority queue empty
      
      console.log(`🔄 Project manager can track completion of ${status.totalProcessed} tasks`);
    });

    test('Should identify blocked tasks and bottlenecks', async () => {
      // Given: A project manager identifying workflow issues
      // When: They check for tasks with unmet dependencies
      const allTasks = await wrapper.read(queueFile);
      const tasksWithDependencies = [];
      
      Object.values(allTasks.queues).forEach((queue: any) => {
        if (queue.items) {
          queue.items.forEach((task: any) => {
            if (task.content?.dependencies && task.content.dependencies.length > 0) {
              tasksWithDependencies.push(task);
            }
          });
        }
      });
      
      // Then: They should identify dependent tasks
      expect(tasksWithDependencies.length).toBeGreaterThan(0);
      
      // And: Can analyze dependency chains
      const documentationTask = tasksWithDependencies.find(
        (t: any) => t.content?.title === 'API Documentation'
      );
      expect(documentationTask?.content?.dependencies).toContain('high-001');
      
      console.log('🔄 Project manager can identify blocked tasks and dependencies');
    });

    test('Should generate progress reports with task distribution', async () => {
      // Given: A project manager preparing status reports
      // When: They analyze task distribution across priorities
      const status = await wrapper.getQueueStatus(queueFile);
      
      // Then: They should see clear priority distribution
      expect(status.queueSizes.critical).toBe(1);
      expect(status.queueSizes.high).toBe(2);
      expect(status.queueSizes.medium).toBe(2);
      expect(status.queueSizes.low).toBe(2);
      
      // And: Can calculate completion percentage
      const totalTasks = status.totalPending + status.totalProcessed;
      const completionRate = (status.totalProcessed / totalTasks) * 100;
      
      expect(completionRate).toBe(0); // No tasks In Progress yet in fresh queue
      expect(totalTasks).toBe(7);
      
      console.log(`🔄 Project manager can generate reports: ${completionRate}% In Progress`);
    });
  });

  describe('🔄 Story: Agile Team Manages Sprint Workflow', () => {
    test('Should support sprint planning with task estimation', async () => {
      // Given: A scrum team planning their sprint
      // When: They filter tasks by team assignment
      const allTasks = await wrapper.read(queueFile);
      const backendTasks = [];
      
      Object.values(allTasks.queues).forEach((queue: any) => {
        if (queue.items) {
          queue.items.forEach((task: any) => {
            if (task.content?.assignee === 'backend-team') {
              backendTasks.push(task);
            }
          });
        }
      });
      
      // Then: They should see team-specific tasks
      expect(backendTasks).toHaveLength(2);
      
      // And: Can calculate team capacity requirements
      const backendHours = backendTasks.reduce((sum, task) => {
        const hours = parseInt(task.content.estimated_time?.split(' ')[0] || '0');
        return sum + hours;
      }, 0);
      
      expect(backendHours).toBe(7); // 4 + 3 hours
      
      console.log(`🔄 Scrum team can plan sprint with ${backendHours} hours for backend team`);
    });

    test('Should handle sprint task reordering and prioritization', async () => {
      // Given: A scrum master adjusting sprint priorities
      const urgentTask: Task = {
        id: 'urgent-001',
        type: "runnable",
        priority: 'high',
        content: {
          command: "implement",
          title: 'Emergency Bug Fix',
          description: 'Critical bug affecting production users',
          estimated_time: '1 hour',
          assignee: 'backend-team'
        },
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      // When: They add an urgent task to high priority queue
      await wrapper.push(urgentTask, 'high', queueFile);
      
      // Then: Task should be added to the queue
      const status = await wrapper.getQueueStatus(queueFile);
      expect(status.queueSizes.high).toBe(3); // Was 2, now 3
      
      // And: Can still retrieve next highest priority task
      const nextTask = await wrapper.peek('high', queueFile);
      expect(nextTask!.priority).toBe('high');
      
      console.log('🔄 Scrum master can reorder and prioritize sprint tasks');
    });

    test('Should support daily standup with task status updates', async () => {
      // Given: A daily standup meeting
      // When: Team members report on task progress
      const popResult = await wrapper.pop('high', queueFile);
      
      // Simulate task being worked on but not In Progress
      expect(popResult?.workingItem!.status).toBe('working');
      
      // Then: Task should show as in-progress in status
      const status = await wrapper.getQueueStatus(queueFile);
      expect(status.working).toBeTruthy();
      expect(status.working!.content.title).toBe('User Authentication API');
      
      // And: Team can see what's currently being worked on
      const currentWork = await wrapper.peek(undefined, queueFile);
      expect(currentWork!.status).toBe('working');
      expect(currentWork!.id).toBe(popResult?.workingItem!.id);
      
      console.log('🔄 Team can track in-progress tasks during daily standups');
    });
  });

  describe('🔧 Story: System Administration and Maintenance', () => {
    test('Should handle queue restart and recovery scenarios', async () => {
      // Given: A system administrator dealing with system restart
      // When: A task is in working state and system restarts
      const popResult = await wrapper.pop('high', queueFile);
      expect(popResult?.workingItem!.status).toBe('working');
      
      // Simulate system restart - move working task back to queue
      await wrapper.restart(queueFile);
      
      // Then: Working task should be moved back to pending state
      const status = await wrapper.getQueueStatus(queueFile);
      expect(status.working).toBeNull();
      
      // And: Task should be available for pickup again
      const nextTask = await wrapper.peek('high', queueFile);
      expect(nextTask!.id).toBe(popResult?.workingItem!.id);
      expect(nextTask!.status).toBe('pending');
      
      console.log('🔄 System can recover from restarts without losing tasks');
    });

    test('Should clean up In Progress task history for maintenance', async () => {
      // Given: A system administrator maintaining the queue
      const executor: TaskExecutor = async () => ({ "success": true });
      wrapper.setTaskExecutor(executor);
      
      // When: Processing and completing some tasks
      await wrapper.pop('low', queueFile);
      await wrapper.pop('low', queueFile);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify tasks were processed
      let status = await wrapper.getQueueStatus(queueFile);
      expect(status.totalProcessed).toBe(2);
      
      // When: Cleaning up In Progress task counters
      await wrapper.clearCompleted(queueFile);
      
      // Then: Counters should be reset
      status = await wrapper.getQueueStatus(queueFile);
      expect(status.totalProcessed).toBe(0);
      expect(status.totalFailed).toBe(0);
      
      console.log('🔄 System administrator can clean up In Progress task history');
    });

    test('Should handle custom priority levels for special workflows', async () => {
      // Given: An organization with custom priority levels
      const customTask: Task = {
        id: 'custom-001',
        type: "runnable",
        priority: 'urgent-hotfix',
        content: {
          command: 'deploy',
          title: 'Emergency Production Hotfix',
          description: 'Immediate production issue requiring instant deployment'
        },
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      // When: Adding task with custom priority
      await wrapper.push(customTask, 'urgent-hotfix', queueFile);
      
      // Then: Custom priority should be supported
      const status = await wrapper.getQueueStatus(queueFile);
      expect(status.queueSizes['urgent-hotfix']).toBe(1);
      
      // And: Can retrieve from custom priority queue
      const customPriorityTask = await wrapper.peek('urgent-hotfix', queueFile);
      expect(customPriorityTask!.priority).toBe('urgent-hotfix');
      expect(customPriorityTask!.content.title).toBe('Emergency Production Hotfix');
      
      console.log('🔄 System supports custom priority levels for special workflows');
    });
  });

  describe('⚡ Story: High-Volume Task Processing', () => {
    test('Should handle high-throughput task processing efficiently', async () => {
      // Given: A high-volume processing scenario
      const highVolumeQueue = 'high-volume-queue.vf.json';
      const taskCount = 100;
      
      // When: Adding many tasks concurrently
      const addPromises = [];
      for (let i = 0; i < taskCount; i++) {
        const task: Partial<Task> = {
          type: 'data',
          content: {
            title: `Batch Task ${i}`,
            data: `Processing item ${i}`,
            batchId: Math.floor(i / 10)
          }
        };
        addPromises.push(wrapper.push(task, 'medium', highVolumeQueue));
      }
      
      const startTime = Date.now();
      await Promise.all(addPromises);
      const endTime = Date.now();
      
      // Then: Operations should complete efficiently
      expect(endTime - startTime).toBeLessThan(5000); // Less than 5 seconds
      
      const status = await wrapper.getQueueStatus(highVolumeQueue);
      expect(status.queueSizes.medium).toBe(taskCount);
      
      console.log(`🔄 System processes ${taskCount} tasks efficiently (${endTime - startTime}ms)`);
    });

    test('Should maintain data integrity under concurrent load', async () => {
      // Given: Multiple concurrent queue operations
      const concurrentQueue = 'concurrent-queue.vf.json';
      const operations = [];
      
      // When: Performing concurrent push and pop operations
      for (let i = 0; i < 20; i++) {
        operations.push(wrapper.push({
          type: 'data',
          content: { id: i, action: 'process' }
        }, 'medium', concurrentQueue));
        
        if (i % 3 === 0) {
          operations.push(wrapper.pop('medium', concurrentQueue));
        }
      }
      
      await Promise.all(operations);
      
      // Then: Queue should maintain consistency
      const status = await wrapper.getQueueStatus(concurrentQueue);
      expect(status.totalPending).toBeGreaterThan(0);
      expect(status.totalPending).toBeLessThan(20);
      
      console.log(`🔄 System maintains integrity under concurrent load (${status.totalPending} remaining)`);
    });
  });

  describe('📈 Story: Analytics and Reporting', () => {
    test('Should provide comprehensive queue analytics', async () => {
      // Given: A business analyst reviewing queue performance
      // When: They request queue analytics
      const status = await wrapper.getQueueStatus(queueFile);
      const allTasks = await wrapper.read(queueFile);
      
      // Calculate analytics
      const priorityDistribution = {
        critical: status.queueSizes.critical || 0,
        high: status.queueSizes.high || 0,
        medium: status.queueSizes.medium || 0,
        low: status.queueSizes.low || 0
      };
      
      const taskTypes = {};
      Object.values(allTasks.queues).forEach(queue => {
        queue.forEach(task => {
          taskTypes[task.type] = (taskTypes[task.type] || 0) + 1;
        });
      });
      
      // Then: Analytics should provide actionable insights
      expect(priorityDistribution.critical).toBe(1);
      expect(priorityDistribution.high).toBe(2);
      expect(taskTypes["runnable"]).toBe(5); // Most tasks are runnable
      expect(taskTypes['data']).toBe(2);
      
      console.log('🔄 Business analyst can access comprehensive queue analytics');
    });
  });
});