import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Coordinator, CoordinatorConfig } from '../../src/core/coordinator';
import { EventEmitter } from 'node:events';
import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';

describe('Coordinator Unit Tests', () => {
  let coordinator: Coordinator;
  let config: CoordinatorConfig;
  let tempDir: string;

  beforeEach(async () => {
    // Create temporary directory for session storage
    tempDir = path.join(process.cwd(), '.test-sessions-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });

    config = {
      api_key: process.env.API_KEY || "PLACEHOLDER",
      sessionStorageDir: tempDir,
      taskQueuePath: path.join(tempDir, 'TASK_QUEUE.md'),
      autoStart: false,
      dangerousModeEnabled: false
    };

    coordinator = new Coordinator(config);
  });

  afterEach(async () => {
    // Clean up
    if (coordinator.getState().running) {
      await coordinator.stop();
    }
    
    // Remove temp directory
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch (error) {
      // Ignore errors during cleanup
    }
  });

  describe('start/stop lifecycle', () => {
    it('should start coordinator In Progress', async () => {
      const startedHandler = jest.fn();
      coordinator.on('started', startedHandler);

      await coordinator.start();

      const state = coordinator.getState();
      expect(state.running).toBe(true);
      expect(state.sessionId).toBeDefined();
      expect(startedHandler).toHaveBeenCalledWith({
        sessionId: state.sessionId,
        session: expect.any(Object)
      });
    });

    it('should stop coordinator gracefully', async () => {
      await coordinator.start();
      
      const stoppedHandler = jest.fn();
      coordinator.on('stopped', stoppedHandler);

      await coordinator.stop('test stop');

      const state = coordinator.getState();
      expect(state.running).toBe(false);
      expect(stoppedHandler).toHaveBeenCalledWith({
        reason: 'test stop',
        sessionId: expect.any(String),
        stats: expect.any(Object)
      });
    });

    it('should prevent double start', async () => {
      await coordinator.start();
      
      await expect(coordinator.start()).rejects.toThrow('Coordinator is already running');
    });

    it('should handle interrupt', async () => {
      await coordinator.start();
      
      const interruptedHandler = jest.fn();
      coordinator.on("interrupted", interruptedHandler);

      await coordinator.interrupt();

      expect(interruptedHandler).toHaveBeenCalled();
      expect(coordinator.getState().running).toBe(false);
    });
  });

  describe('session management', () => {
    it('should create new session on start', async () => {
      await coordinator.start();
      
      const state = coordinator.getState();
      expect(state.sessionId).toBeDefined();
      expect(state.session).toBeDefined();
      expect(state.session?.id).toBe(state.sessionId);
    });

    it('should resume existing session', async () => {
      // Start and stop to create session
      await coordinator.start();
      const originalSessionId = coordinator.getState().sessionId!;
      await coordinator.stop();

      // Create new coordinator and resume
      const newCoordinator = new Coordinator(config);
      const resumedHandler = jest.fn();
      newCoordinator.on('resumed', resumedHandler);

      await newCoordinator.resume(originalSessionId);

      expect(resumedHandler).toHaveBeenCalledWith({
        sessionId: originalSessionId,
        session: expect.any(Object)
      });
      expect(newCoordinator.getState().sessionId).toBe(originalSessionId);

      await newCoordinator.stop();
    });

    it('should throw on invalid session resume', async () => {
      await expect(coordinator.resume('invalid-session-id'))
        .rejects.toThrow("Session 'invalid-session-id' not found");
    });
  });

  describe('dangerous mode', () => {
    it('should enable dangerous mode', async () => {
      await coordinator.start();
      
      const dangerousEnabledHandler = jest.fn();
      coordinator.on('dangerous_mode_enabled', dangerousEnabledHandler);

      const result = await coordinator.enableDangerousMode('test reason');

      expect(result).toBe(true);
      expect(dangerousEnabledHandler).toHaveBeenCalledWith({
        reason: 'test reason'
      });
    });

    it('should disable dangerous mode', async () => {
      await coordinator.start();
      await coordinator.enableDangerousMode('test');
      
      const dangerousDisabledHandler = jest.fn();
      coordinator.on('dangerous_mode_disabled', dangerousDisabledHandler);

      await coordinator.disableDangerousMode();

      expect(dangerousDisabledHandler).toHaveBeenCalled();
    });

    it('should enable dangerous mode on startup if configured', async () => {
      const dangerousConfig = { ...config, dangerousModeEnabled: true };
      const dangerousCoordinator = new Coordinator(dangerousConfig);
      
      const dangerousEnabledHandler = jest.fn();
      dangerousCoordinator.on('dangerous_mode_enabled', dangerousEnabledHandler);

      await dangerousCoordinator.start();

      expect(dangerousEnabledHandler).toHaveBeenCalled();
      
      await dangerousCoordinator.stop();
    });
  });

  describe('task management', () => {
    beforeEach(async () => {
      // Create empty task queue file
      await fs.writeFile(config.taskQueuePath!, '# Task Queue\n');
    });

    it('should add tasks', async () => {
      await coordinator.start();

      const task = await coordinator.addTask({
        title: 'Test Task',
        description: 'Test description',
        priority: 'medium',
        status: 'pending'
      });

      expect(task).toBeDefined();
      expect(task?.id).toBeDefined();
      expect(task?.title).toBe('Test Task');
    });

    it('should process tasks automatically', async () => {
      await coordinator.start();

      const taskStartedHandler = jest.fn();
      coordinator.on('task_started', taskStartedHandler);

      await coordinator.addTask({
        title: 'Auto Process Task',
        description: 'Should be processed automatically',
        priority: 'high',
        status: 'pending'
      });

      // Wait for task processing to start
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(taskStartedHandler).toHaveBeenCalled();
    });
  });

  describe("integrations", () => {
    it('should handle missing chat-space gracefully', async () => {
      const warningHandler = jest.fn();
      coordinator.on('warning', warningHandler);

      const chatConfig = {
        ...config,
        chatSpaceConfig: {
          chatSpacePath: '/non/existent/path',
          autoJoinRooms: ['test-room']
        }
      };

      const chatCoordinator = new Coordinator(chatConfig);
      await chatCoordinator.start();

      expect(warningHandler).toHaveBeenCalledWith({
        message: 'Failed to connect to chat-space',
        error: expect.any(String)
      });

      await chatCoordinator.stop();
    });

    it('should handle missing PocketFlow gracefully', async () => {
      const warningHandler = jest.fn();
      coordinator.on('warning', warningHandler);

      const pocketConfig = {
        ...config,
        pocketFlowConfig: {
          pocketFlowPath: '/non/existent/path',
          enabledWorkflows: ['test-workflow']
        }
      };

      const pocketCoordinator = new Coordinator(pocketConfig);
      await pocketCoordinator.start();

      expect(warningHandler).toHaveBeenCalledWith({
        message: 'Failed to connect to PocketFlow',
        error: expect.any(String)
      });

      await pocketCoordinator.stop();
    });
  });

  describe('error handling', () => {
    it('should handle startup errors', async () => {
      const errorHandler = jest.fn();
      coordinator.on('error', errorHandler);

      // Force an error by using invalid session storage
      const badConfig = { ...config, sessionStorageDir: '/root/no-access' };
      const badCoordinator = new Coordinator(badConfig);

      await expect(badCoordinator.start()).rejects.toThrow();
      expect(errorHandler).toHaveBeenCalledWith({
        type: 'startup_error',
        error: expect.any(String)
      });
    });

    it('should track error statistics', async () => {
      await coordinator.start();
      
      // Trigger some errors
      coordinator.emit('claude_error', { message: 'Test error' });
      coordinator.emit('claude_error', { message: 'Another error' });

      const state = coordinator.getState();
      expect(state.stats.errors).toBe(2);
    });
  });

  describe('state management', () => {
    it('should track message statistics', async () => {
      await coordinator.start();
      
      // Simulate message processing
      coordinator.emit('message_received', { 
        sessionId: 'test',
        message: { type: 'user', content: 'test' }
      });
      coordinator.emit('message_received', { 
        sessionId: 'test',
        message: { type: 'user', content: 'test2' }
      });

      const state = coordinator.getState();
      expect(state.stats.messagesProcessed).toBe(2);
    });

    it('should track workflow executions', async () => {
      await coordinator.start();
      
      coordinator.emit('workflow_triggered', { workflowId: 'test-workflow' });
      coordinator.emit('workflow_triggered', { workflowId: 'another-workflow' });

      const state = coordinator.getState();
      expect(state.stats.workflowsExecuted).toBe(2);
    });
  });
});