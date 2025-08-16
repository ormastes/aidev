import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Coordinator, CoordinatorConfig } from '../../src/core/coordinator';
import { TaskQueueManager } from '../../src/integration/task-queue-manager';
import { ChatSpaceConnector } from '../../src/integration/chat-space-connector';
import { PocketFlowBridge } from '../../src/integration/pocketflow-bridge';
import { EventEmitter } from '../../../../../infra_external-log-lib/src';
import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';

describe('Coordinator Integration Tests', () => {
  let coordinator: Coordinator;
  let config: CoordinatorConfig;
  let tempDir: string;
  let sharedEventBus: EventEmitter;

  beforeEach(async () => {
    tempDir = path.join(process.cwd(), '.test-integration-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
    
    // Create shared event bus for integration
    sharedEventBus = new EventEmitter();

    // Create task queue file
    const taskQueuePath = path.join(tempDir, 'TASK_QUEUE.md');
    await fs.writeFile(taskQueuePath, `# Task Queue

## Pending

- [ ] [high] Integration Test Task 1 (id: task-001)
  Description: First test task
  Status: pending

- [ ] [medium] Integration Test Task 2 (id: task-002)  
  Description: Second test task
  Status: pending
  Dependencies: task-001
`);

    config = {
      apiKey: 'test-api-key',
      sessionStorageDir: tempDir,
      taskQueuePath,
      autoStart: false,
      chatSpaceConfig: {
        eventBus: sharedEventBus,
        autoJoinRooms: ['test-room'],
        botUsername: 'TestBot'
      },
      pocketFlowConfig: {
        eventBus: sharedEventBus,
        enabledWorkflows: ['task-automation', 'session-backup']
      }
    };

    coordinator = new Coordinator(config);
  });

  afterEach(async () => {
    if (coordinator.getState().running) {
      await coordinator.stop();
    }
    
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Task Queue Integration', () => {
    it('should load tasks from TASK_QUEUE.md on start', async () => {
      await coordinator.start();
      
      // Wait for task queue to initialize
      await new Promise(resolve => setTimeout(resolve, 100));

      const state = coordinator.getState();
      expect(state.activeTask).toBeUndefined(); // No task started yet
    });

    it('should process tasks with dependencies', async () => {
      const taskcompletedHandler = jest.fn();
      coordinator.on('task_completed', taskcompletedHandler);

      await coordinator.start();
      
      // Manually trigger task processing
      const task1 = await coordinator.addTask({
        title: 'Dependency Test Parent',
        description: 'Parent task',
        priority: 'high',
        status: 'pending'
      });

      const task2 = await coordinator.addTask({
        title: 'Dependency Test Child',
        description: 'Child task',
        priority: 'medium',
        status: 'pending',
        dependencies: [task1!.id]
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Only parent task should start (child has dependency)
      const state = coordinator.getState();
      expect(state.activeTask?.id).toBe(task1?.id);
    });

    it('should update task queue file when tasks In Progress', async () => {
      await coordinator.start();
      
      const task = await coordinator.addTask({
        title: 'File Update Test',
        description: 'Should update file',
        priority: 'high',
        status: 'pending'
      });

      // Read queue file after task addition
      const content = await fs.readFile(config.taskQueuePath!, 'utf-8');
      expect(content).toContain('File Update Test');
      expect(content).toContain(task!.id);
    });
  });

  describe('Chat-Space Integration', () => {
    it('should connect to chat-space via event bus', async () => {
      const connectedHandler = jest.fn();
      sharedEventBus.on('coordinator:register_bot', connectedHandler);

      await coordinator.start();

      expect(connectedHandler).toHaveBeenCalledWith({
        user: expect.objectContaining({
          username: 'TestBot'
        })
      });
      
      const state = coordinator.getState();
      expect(state.connected.chatSpace).toBe(true);
    });

    it('should handle chat messages', async () => {
      await coordinator.start();
      
      const messageHandler = jest.fn();
      sharedEventBus.on('coordinator:send_message', messageHandler);

      // Simulate chat message
      sharedEventBus.emit('chat:message_received', {
        message: {
          id: 'msg-001',
          roomId: 'test-room',
          userId: 'user-123',
          username: 'TestUser',
          content: '/coordinator status',
          timestamp: new Date(),
          type: 'text'
        }
      });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(messageHandler).toHaveBeenCalledWith({
        message: expect.objectContaining({
          content: expect.stringContaining('Coordinator is active')
        }),
        metadata: undefined
      });
    });

    it('should send task updates to chat', async () => {
      await coordinator.start();
      await coordinator.sendToChatSpace('Test message', 'test-room');

      // Should emit to event bus
      const messageHandler = jest.fn();
      sharedEventBus.on('coordinator:send_message', messageHandler);
      
      await coordinator.sendToChatSpace('Task update', 'test-room');
      
      expect(messageHandler).toHaveBeenCalledWith({
        message: expect.objectContaining({
          content: 'Task update',
          roomId: 'test-room'
        }),
        metadata: undefined
      });
    });
  });

  describe('PocketFlow Integration', () => {
    it('should connect to PocketFlow via event bus', async () => {
      const workflowHandler = jest.fn();
      sharedEventBus.on('coordinator:register_workflow', workflowHandler);

      await coordinator.start();

      // Should register coordinator workflows
      expect(workflowHandler).toHaveBeenCalledWith({
        workflow: expect.objectContaining({
          id: 'task-automation'
        })
      });
      expect(workflowHandler).toHaveBeenCalledWith({
        workflow: expect.objectContaining({
          id: 'session-backup'
        })
      });
      
      const state = coordinator.getState();
      expect(state.connected.pocketFlow).toBe(true);
    });

    it('should trigger workflows', async () => {
      await coordinator.start();
      
      const triggerHandler = jest.fn();
      sharedEventBus.on('coordinator:trigger_workflow', triggerHandler);

      await coordinator.triggerWorkflow('task-automation', {
        taskId: 'test-task',
        priority: 'high'
      });

      expect(triggerHandler).toHaveBeenCalledWith({
        workflow: expect.objectContaining({
          id: 'task-automation'
        }),
        execution: expect.objectContaining({
          workflowId: 'task-automation',
          status: 'pending',
          context: expect.objectContaining({
            taskId: 'test-task',
            priority: 'high'
          })
        })
      });
    });

    it('should handle workflow action requests', async () => {
      await coordinator.start();
      
      // Simulate PocketFlow action request
      let actionCallback: any;
      coordinator.once('action:execute_with_claude', ({ callback }) => {
        actionCallback = callback;
      });

      sharedEventBus.emit('pocketflow:action_request', {
        action: 'execute_with_claude',
        params: { prompt: 'Test prompt', dangerousMode: false },
        context: { sessionId: 'test-session' },
        callback: (error: any, result?: any) => {
          expect(error).toBeNull();
          expect(result).toBeDefined();
        }
      });

      // Wait for handler registration
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(actionCallback).toBeDefined();
    });
  });

  describe('Session Persistence Integration', () => {
    it('should save session with integrated state', async () => {
      await coordinator.start();
      const sessionId = coordinator.getState().sessionId!;
      
      // Perform some actions
      await coordinator.enableDangerousMode('test');
      await coordinator.addTask({
        title: 'Session Test Task',
        description: 'For session testing',
        priority: 'low',
        status: 'pending'
      });
      
      // Trigger some events
      coordinator.emit('message_received', { 
        sessionId,
        message: { type: 'user', content: 'test' }
      });
      
      await coordinator.stop();
      
      // Check session file exists
      const sessionFile = path.join(tempDir, `${sessionId}.session.json`);
      const sessionData = JSON.parse(await fs.readFile(sessionFile, 'utf-8'));
      
      expect(sessionData.conversation).toHaveLength(1);
      expect(sessionData.permissions.dangerousMode).toBe(true);
      expect(sessionData.context.variables.coordinatorState.stats.messagesProcessed).toBe(1);
    });

    it('should restore integrated state on resume', async () => {
      // Start and create session
      await coordinator.start();
      const sessionId = coordinator.getState().sessionId!;
      
      // Set some state
      coordinator.emit('message_received', { sessionId, message: {} });
      coordinator.emit('workflow_triggered', { workflowId: 'test' });
      
      await coordinator.stop();
      
      // Resume with new coordinator
      const newCoordinator = new Coordinator(config);
      await newCoordinator.resume(sessionId);
      
      const state = newCoordinator.getState();
      expect(state.stats.messagesProcessed).toBe(1);
      expect(state.stats.workflowsExecuted).toBe(1);
      
      await newCoordinator.stop();
    });
  });

  describe('End-to-End Scenarios', () => {
    it('should handle In Progress task automation flow', async () => {
      const events: string[] = [];
      
      // Track all events
      coordinator.on('started', () => events.push('started'));
      coordinator.on('task_started', () => events.push('task_started'));
      coordinator.on('workflow_triggered', () => events.push('workflow_triggered'));
      coordinator.on('task_completed', () => events.push('task_completed'));
      
      await coordinator.start();
      
      // Add a task
      await coordinator.addTask({
        title: 'E2E Test Task',
        description: 'In Progress flow test',
        priority: 'critical',
        status: 'pending'
      });
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Verify event sequence
      expect(events).toContain('started');
      expect(events).toContain('task_started');
      
      const state = coordinator.getState();
      expect(state.stats.messagesProcessed).toBeGreaterThan(0);
    });

    it('should handle interrupt and resume with all integrations', async () => {
      await coordinator.start();
      const sessionId = coordinator.getState().sessionId!;
      
      // Start a task
      await coordinator.addTask({
        title: 'Interrupt Test Task',
        description: 'Will be interrupted',
        priority: 'high',
        status: 'pending'
      });
      
      // Send chat message
      await coordinator.sendToChatSpace('Before interrupt', 'test-room');
      
      // Trigger workflow
      await coordinator.triggerWorkflow('session-backup', { reason: 'test' });
      
      // Interrupt
      await coordinator.interrupt();
      
      // Resume
      const newCoordinator = new Coordinator(config);
      await newCoordinator.resume(sessionId);
      
      // Verify state restored
      const state = newCoordinator.getState();
      expect(state.sessionId).toBe(sessionId);
      expect(state.connected.chatSpace).toBe(true);
      expect(state.connected.pocketFlow).toBe(true);
      
      // Should be able to continue operations
      await newCoordinator.sendToChatSpace('After resume', 'test-room');
      
      await newCoordinator.stop();
    });
  });
});