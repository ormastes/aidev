import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SessionManager, SessionData, ConversationEntry } from '../../src/core/session-manager';
import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';
import { os } from '../../../../../infra_external-log-lib/src';
import { createTempDir, cleanupTempDir, createMockSessionData } from '../helpers/test-utils';

describe('SessionManager Unit Tests', () => {
  let sessionManager: SessionManager;
  let tempDir: string;
  let errorHandler: jest.Mock;

  beforeEach(async () => {
    tempDir = await createTempDir('session-test');

    sessionManager = new SessionManager({
      storageDir: tempDir,
      autoSaveInterval: 100 // Short interval for testing
    });

    // Add a default error handler to prevent unhandled errors
    errorHandler = jest.fn();
    sessionManager.on('error', errorHandler);

    await sessionManager.initialize();
  });

  afterEach(async () => {
    await sessionManager.shutdown();
    await cleanupTempDir(tempDir);
  });

  describe('Session lifecycle', () => {
    test('should create a new session', async () => {
      const session = await sessionManager.createSession({
        taskQueuePath: '/test/TASK_QUEUE.md'
      });

      expect(session.id).toMatch(/^session-\d+-\w+$/);
      expect(session.state).toBe('active');
      expect(session.conversation).toEqual([]);
      expect(session.permissions.dangerousMode).toBe(false);
      expect(session.taskQueue.queuePath).toBe('/test/TASK_QUEUE.md');
    });

    test('should create session with custom permissions', async () => {
      const session = await sessionManager.createSession({
        permissions: {
          dangerousMode: true,
          allowedTools: ['file_write', 'shell_execute']
        }
      });

      expect(session.permissions.dangerousMode).toBe(true);
      expect(session.permissions.allowedTools).toEqual(['file_write', 'shell_execute']);
    });

    test('should save and load session', async () => {
      const session = await sessionManager.createSession();
      const sessionId = session.id;

      // Add some conversation
      await sessionManager.addConversationEntry(sessionId, {
        role: 'user',
        content: 'Hello Claude'
      });

      // Force save
      await sessionManager.saveSession(sessionId);

      // Create new manager and load
      const newManager = new SessionManager({ storageDir: tempDir });
      await newManager.initialize();
      
      const loadedSession = await newManager.loadSession(sessionId);
      expect(loadedSession).not.toBeNull();
      expect(loadedSession!.id).toBe(sessionId);
      expect(loadedSession!.conversation).toHaveLength(1);
      expect(loadedSession!.conversation[0].content).toBe('Hello Claude');
    });

    test('should handle session interruption', async () => {
      const session = await sessionManager.createSession();
      const sessionId = session.id;

      await sessionManager.interruptSession(sessionId);

      const updatedSession = await sessionManager.loadSession(sessionId);
      expect(updatedSession!.state).toBe("interrupted");
      expect(updatedSession!.checkpoints).toHaveLength(1);
      expect(updatedSession!.checkpoints[0].reason).toBe("interrupt");
    });

    test('should resume interrupted session', async () => {
      const session = await sessionManager.createSession();
      const sessionId = session.id;

      await sessionManager.interruptSession(sessionId);
      const resumedSession = await sessionManager.resumeSession(sessionId);

      expect(resumedSession.state).toBe('active');
      expect(resumedSession.id).toBe(sessionId);
    });

    test('should close session', async () => {
      const session = await sessionManager.createSession();
      const sessionId = session.id;

      await sessionManager.closeSession(sessionId);

      const closedSession = await sessionManager.loadSession(sessionId);
      expect(closedSession!.state).toBe("completed");
    });
  });

  describe('Conversation management', () => {
    test('should add conversation entries', async () => {
      const session = await sessionManager.createSession();
      const sessionId = session.id;

      const entry1 = await sessionManager.addConversationEntry(sessionId, {
        role: 'user',
        content: 'What is TypeScript?'
      });

      const entry2 = await sessionManager.addConversationEntry(sessionId, {
        role: "assistant",
        content: 'TypeScript is a typed superset of JavaScript...'
      });

      expect(entry1.id).toMatch(/^entry-/);
      expect(entry1.timestamp).toBeInstanceOf(Date);

      const updatedSession = await sessionManager.loadSession(sessionId);
      expect(updatedSession!.conversation).toHaveLength(2);
      expect(updatedSession!.conversation[0].content).toBe('What is TypeScript?');
      expect(updatedSession!.conversation[1].content).toContain('TypeScript is');
    });

    test('should include metadata in conversation entries', async () => {
      const session = await sessionManager.createSession();
      
      const entry = await sessionManager.addConversationEntry(session.id, {
        role: "assistant",
        content: 'Processing...',
        metadata: {
          streamId: 'stream-123',
          toolCalls: ['file_read', 'code_analysis']
        }
      });

      expect(entry.metadata).toEqual({
        streamId: 'stream-123',
        toolCalls: ['file_read', 'code_analysis']
      });
    });
  });

  describe('Permission management', () => {
    test('should update permissions', async () => {
      const session = await sessionManager.createSession();
      const sessionId = session.id;

      await sessionManager.updatePermissions(sessionId, {
        dangerousMode: true,
        allowedTools: ['all']
      });

      const updated = await sessionManager.loadSession(sessionId);
      expect(updated!.permissions.dangerousMode).toBe(true);
      expect(updated!.permissions.allowedTools).toEqual(['all']);
      expect(updated!.permissions.modificationHistory).toHaveLength(1);
      expect(updated!.permissions.modificationHistory[0].newMode).toBe(true);
    });

    test('should track permission history', async () => {
      const session = await sessionManager.createSession();
      const sessionId = session.id;

      // Enable dangerous mode
      await sessionManager.updatePermissions(sessionId, {
        dangerousMode: true
      });

      // Disable dangerous mode
      await sessionManager.updatePermissions(sessionId, {
        dangerousMode: false
      });

      const updated = await sessionManager.loadSession(sessionId);
      expect(updated!.permissions.modificationHistory).toHaveLength(2);
      expect(updated!.permissions.modificationHistory[0].previousMode).toBe(false);
      expect(updated!.permissions.modificationHistory[0].newMode).toBe(true);
      expect(updated!.permissions.modificationHistory[1].previousMode).toBe(true);
      expect(updated!.permissions.modificationHistory[1].newMode).toBe(false);
    });
  });

  describe('Checkpoint management', () => {
    test('should create checkpoint', async () => {
      const session = await sessionManager.createSession();
      const sessionId = session.id;

      // Modify session state
      await sessionManager.updatePermissions(sessionId, {
        dangerousMode: true
      });

      const checkpoint = await sessionManager.createCheckpoint(sessionId, 'manual');

      expect(checkpoint.id).toMatch(/^checkpoint-/);
      expect(checkpoint.reason).toBe('manual');
      expect(checkpoint.state.permissions?.dangerousMode).toBe(true);
    });

    test('should restore from checkpoint', async () => {
      const session = await sessionManager.createSession();
      const sessionId = session.id;

      // Create checkpoint with safe mode
      const checkpoint1 = await sessionManager.createCheckpoint(sessionId, 'auto');

      // Change to dangerous mode
      await sessionManager.updatePermissions(sessionId, {
        dangerousMode: true
      });

      // Verify dangerous mode is active
      let current = await sessionManager.loadSession(sessionId);
      expect(current!.permissions.dangerousMode).toBe(true);

      // Restore from checkpoint
      await sessionManager.restoreFromCheckpoint(sessionId, checkpoint1.id);

      // Verify restored to safe mode
      current = await sessionManager.loadSession(sessionId);
      expect(current!.permissions.dangerousMode).toBe(false);
    });

    test('should limit checkpoint count', async () => {
      const sessionManager = new SessionManager({
        storageDir: tempDir,
        maxCheckpoints: 3
      });
      await sessionManager.initialize();

      const session = await sessionManager.createSession();
      const sessionId = session.id;

      // Create more than max checkpoints
      for (let i = 0; i < 5; i++) {
        await sessionManager.createCheckpoint(sessionId, 'auto');
      }

      const updated = await sessionManager.loadSession(sessionId);
      expect(updated!.checkpoints).toHaveLength(3);
    });
  });

  describe('Session listing and filtering', () => {
    test('should list all sessions', async () => {
      const session1 = await sessionManager.createSession();
      const session2 = await sessionManager.createSession();
      
      const sessions = await sessionManager.listSessions();
      expect(sessions).toHaveLength(2);
      expect(sessions.map(s => s.id)).toContain(session1.id);
      expect(sessions.map(s => s.id)).toContain(session2.id);
    });

    test('should filter sessions by state', async () => {
      const session1 = await sessionManager.createSession();
      const session2 = await sessionManager.createSession();
      
      await sessionManager.interruptSession(session1.id);
      
      const activeSessions = await sessionManager.listSessions({ state: 'active' });
      const interruptedSessions = await sessionManager.listSessions({ state: "interrupted" });
      
      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0].id).toBe(session2.id);
      expect(interruptedSessions).toHaveLength(1);
      expect(interruptedSessions[0].id).toBe(session1.id);
    });

    test('should filter sessions by date', async () => {
      const session1 = await sessionManager.createSession();
      
      const since = new Date();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const session2 = await sessionManager.createSession();
      
      const recentSessions = await sessionManager.listSessions({ since });
      expect(recentSessions).toHaveLength(1);
      expect(recentSessions[0].id).toBe(session2.id);
    });
  });

  describe('Auto-save functionality', () => {
    test('should auto-save sessions', async () => {
      const session = await sessionManager.createSession();
      const sessionId = session.id;

      await sessionManager.addConversationEntry(sessionId, {
        role: 'user',
        content: 'Test auto-save'
      });

      // Wait for auto-save
      await new Promise(resolve => setTimeout(resolve, 150));

      // Check if saved
      const savedData = await fs.readFile(path.join(tempDir, `${sessionId}.session.json`), 'utf-8');
      expect(savedData).toBeDefined();
      expect(savedData).toContain('Test auto-save');
    });

    test('should continue auto-save after interrupt', async () => {
      const session = await sessionManager.createSession();
      const sessionId = session.id;

      await sessionManager.interruptSession(sessionId);

      // Add entry after interrupt
      await sessionManager.addConversationEntry(sessionId, {
        role: 'user',
        content: 'After interrupt'
      });

      // Wait for auto-save
      await new Promise(resolve => setTimeout(resolve, 150));

      // Check if saved
      const savedData = await fs.readFile(
        path.join(tempDir, `${sessionId}.session.json`),
        'utf-8'
      );
      const parsedData = JSON.parse(savedData);
      
      // Should have saved the entry even after interrupt
      expect(parsedData.conversation).toHaveLength(1);
      expect(parsedData.conversation[0].content).toBe('After interrupt');
      expect(parsedData.state).toBe("interrupted");
    });
  });

  describe('Error handling', () => {
    test('should handle missing session', async () => {
      const result = await sessionManager.loadSession('non-existent');
      expect(result).toBeNull();
      
      // Should have emitted an error event
      expect(errorHandler).toHaveBeenCalled();
      const errorCall = errorHandler.mock.calls[0][0] as any;
      expect(errorCall.type).toBe('load_error');
      expect(errorCall.sessionId).toBe('non-existent');
      expect(errorCall.error).toBeDefined();
      expect(errorCall.error.code).toBe('ENOENT');
    });

    test('should throw on operations with missing session', async () => {
      await expect(
        sessionManager.addConversationEntry('non-existent', {
          role: 'user',
          content: 'Test'
        })
      ).rejects.toThrow('Session non-existent not found');
    });

    test('should emit error events', async () => {
      // Clear the default error handler calls
      errorHandler.mockClear();

      // Create corrupted session file
      await fs.writeFile(
        path.join(tempDir, 'corrupt.session.json'),
        'invalid json',
        'utf-8'
      );

      await sessionManager.loadSession('corrupt');

      expect(errorHandler).toHaveBeenCalledWith({
        type: 'load_error',
        sessionId: 'corrupt',
        error: expect.any(Error)
      });
    });
  });

  describe('Events', () => {
    test('should emit lifecycle events', async () => {
      const events: string[] = [];
      
      sessionManager.on('session_created', () => events.push('created'));
      sessionManager.on('session_saved', () => events.push('saved'));
      sessionManager.on('session_loaded', () => events.push('loaded'));
      sessionManager.on('session_interrupted', () => events.push("interrupted"));
      sessionManager.on('session_resumed', () => events.push('resumed'));
      sessionManager.on('session_closed', () => events.push('closed'));

      const session = await sessionManager.createSession();
      await sessionManager.saveSession(session.id);
      await sessionManager.loadSession(session.id);
      await sessionManager.interruptSession(session.id);
      await sessionManager.resumeSession(session.id);
      await sessionManager.closeSession(session.id);

      // The first 'saved' event happens during initialization
      // The order may vary slightly depending on timing
      expect(events).toContain('created');
      // 'loaded' is only emitted when loading from disk, not creating new
      expect(events).toContain("interrupted");
      expect(events).toContain('resumed');
      expect(events).toContain('closed');
      expect(events.filter(e => e === 'saved').length).toBeGreaterThan(5);
    });
  });
});