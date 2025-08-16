import { EventEmitter } from 'node:events';
import { v4 as uuidv4 } from 'uuid';
import { SessionManager, SessionConfig } from '../../children/src/session/session-manager';
import { Session, SessionStatus, SessionMessage } from '../../children/src/domain/session';
import { Agent } from '../../children/src/domain/agent';
import { MCPServerManager } from '../../children/src/server/mcp-server-manager';

// Mock dependencies
jest.mock('uuid');
jest.mock('../../children/src/domain/session');
jest.mock('../../children/src/domain/agent');
jest.mock('../../children/src/server/mcp-server-manager');

const mockUuidv4 = uuidv4 as jest.MockedFunction<typeof uuidv4>;
const MockSession = Session as jest.MockedClass<typeof Session>;
const MockAgent = Agent as jest.MockedClass<typeof Agent>;
const MockMCPServerManager = MCPServerManager as jest.MockedClass<typeof MCPServerManager>;

describe("SessionManager", () => {
  let sessionManager: SessionManager;
  let mockServerManager: jest.Mocked<MCPServerManager>;
  let mockAgent: jest.Mocked<Agent>;
  let mockSession: jest.Mocked<Session>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock server manager
    mockServerManager = new MockMCPServerManager() as jest.Mocked<MCPServerManager>;
    mockServerManager.getAllTools = jest.fn().mockResolvedValue(new Map([
      ['tool1', { tool: { name: 'file_operations' }, serverId: 'server1' }],
      ['tool2', { tool: { name: 'web_search' }, serverId: 'server2' }]
    ]));

    // Mock agent
    mockAgent = new MockAgent() as jest.Mocked<Agent>;
    mockAgent.getId = jest.fn().mockReturnValue('agent-123');
    mockAgent.getRoleName = jest.fn().mockReturnValue('test-agent');
    mockAgent.isActive = jest.fn().mockReturnValue(true);
    mockAgent.getEnabledCapabilities = jest.fn().mockReturnValue(['file_operations', 'general_assistance']);
    mockAgent.getSystemPrompt = jest.fn().mockReturnValue('You are a helpful test agent.');

    // Mock session
    mockSession = new MockSession() as jest.Mocked<Session>;
    mockSession.getId = jest.fn().mockReturnValue('session-456');
    mockSession.getAgentId = jest.fn().mockReturnValue('agent-123');
    mockSession.isActive = jest.fn().mockReturnValue(true);
    mockSession.getStatus = jest.fn().mockReturnValue(SessionStatus.ACTIVE);
    mockSession.getContext = jest.fn().mockReturnValue({});
    mockSession.getMessages = jest.fn().mockReturnValue([]);
    mockSession.addMessage = jest.fn();
    mockSession.start = jest.fn();
    mockSession.success = jest.fn();
    mockSession.setError = jest.fn();
    mockSession.setMetadata = jest.fn();

    MockSession.mockImplementation(() => mockSession);

    sessionManager = new SessionManager(mockServerManager);
  });

  describe("constructor", () => {
    it('should create session manager with default config', () => {
      expect(sessionManager).toBeDefined();
      expect(sessionManager).toBeInstanceOf(EventEmitter);
    });

    it('should create session manager with custom config', () => {
      const config: SessionConfig = {
        maxIdleTime: 60000,
        maxMessageHistory: 500,
        autoSave: true,
        savePath: '/tmp/sessions'
      };

      const customManager = new SessionManager(mockServerManager, config);
      expect(customManager).toBeDefined();
    });
  });

  describe('agent management', () => {
    it('should register agent', () => {
      sessionManager.registerAgent(mockAgent);

      expect(mockAgent.getId).toHaveBeenCalled();
    });

    it('should unregister agent and end its sessions', () => {
      sessionManager.registerAgent(mockAgent);
      
      // Create session for the agent
      mockUuidv4.mockReturnValue('session-123');
      const session = sessionManager.createSession('agent-123');
      
      const endSessionSpy = jest.spyOn(sessionManager, "endSession");
      
      sessionManager.unregisterAgent('agent-123');

      expect(endSessionSpy).toHaveBeenCalledWith('session-123', 'Agent unregistered');
    });
  });

  describe("createSession", () => {
    beforeEach(() => {
      sessionManager.registerAgent(mockAgent);
      mockUuidv4.mockReturnValue('new-session-id');
    });

    it('should create session successfully', () => {
      const context = { userId: 'user123' };
      const session = sessionManager.createSession('agent-123', context);

      expect(MockSession).toHaveBeenCalledWith({
        id: 'new-session-id',
        agentId: 'agent-123',
        context,
        metadata: {
          agentRole: 'test-agent',
          capabilities: ['file_operations', 'general_assistance']
        }
      });

      expect(session).toBe(mockSession);
    });

    it('should emit sessionCreated event', () => {
      const eventSpy = jest.spyOn(sessionManager, 'emit');
      
      const session = sessionManager.createSession('agent-123');

      expect(eventSpy).toHaveBeenCalledWith("sessionCreated", session);
    });

    it('should throw error for non-existent agent', () => {
      expect(() => sessionManager.createSession('non-existent-agent'))
        .toThrow('Agent non-existent-agent not found');
    });

    it('should throw error for inactive agent', () => {
      mockAgent.isActive.mockReturnValue(false);
      
      expect(() => sessionManager.createSession('agent-123'))
        .toThrow('Agent agent-123 is not active');
    });

    it('should create session with default context', () => {
      sessionManager.createSession('agent-123');

      expect(MockSession).toHaveBeenCalledWith(
        expect.objectContaining({
          context: {}
        })
      );
    });
  });

  describe("startSession", () => {
    beforeEach(() => {
      sessionManager.registerAgent(mockAgent);
      mockUuidv4.mockReturnValue('session-789');
    });

    it('should start session successfully', async () => {
      const session = sessionManager.createSession('agent-123');
      
      await sessionManager.startSession('session-789');

      expect(mockSession.start).toHaveBeenCalled();
      expect(mockSession.addMessage).toHaveBeenCalledWith({
        role: 'system',
        content: [{
          type: 'text',
          text: 'You are a helpful test agent.'
        }],
        timestamp: expect.any(Date)
      });
    });

    it('should emit sessionStarted event', async () => {
      sessionManager.createSession('agent-123');
      const eventSpy = jest.spyOn(sessionManager, 'emit');
      
      await sessionManager.startSession('session-789');

      expect(eventSpy).toHaveBeenCalledWith("sessionStarted", 'session-789');
    });

    it('should handle session start errors', async () => {
      sessionManager.createSession('agent-123');
      const startError = new Error('Start failed');
      mockSession.start.mockImplementation(() => {
        throw startError;
      });

      const eventSpy = jest.spyOn(sessionManager, 'emit');

      await expect(sessionManager.startSession('session-789')).rejects.toThrow('Start failed');
      expect(mockSession.setError).toHaveBeenCalledWith('Start failed');
      expect(eventSpy).toHaveBeenCalledWith("sessionError", 'session-789', startError);
    });

    it('should throw error for non-existent session', async () => {
      await expect(sessionManager.startSession('non-existent'))
        .rejects.toThrow('Session non-existent not found');
    });

    it('should skip system message if no system prompt', async () => {
      mockAgent.getSystemPrompt.mockReturnValue(undefined);
      sessionManager.createSession('agent-123');
      
      await sessionManager.startSession('session-789');

      expect(mockSession.addMessage).not.toHaveBeenCalled();
    });
  });

  describe("processMessage", () => {
    beforeEach(() => {
      sessionManager.registerAgent(mockAgent);
      mockUuidv4.mockReturnValue('session-process');
    });

    it('should process message successfully', async () => {
      sessionManager.createSession('agent-123');
      const eventSpy = jest.spyOn(sessionManager, 'emit');

      const result = await sessionManager.processMessage('session-process', 'Hello, world!');

      expect(mockSession.addMessage).toHaveBeenCalledTimes(2); // User message + assistant response
      expect(eventSpy).toHaveBeenCalledWith("messageAdded", 'session-process', expect.any(Object));
      expect(result.role).toBe("assistant");
      expect(result.content[0].text).toContain('Processing your request with test-agent agent');
    });

    it('should throw error for non-existent session', async () => {
      await expect(sessionManager.processMessage('non-existent', 'test'))
        .rejects.toThrow('Session non-existent not found');
    });

    it('should throw error for inactive session', async () => {
      sessionManager.createSession('agent-123');
      mockSession.isActive.mockReturnValue(false);

      await expect(sessionManager.processMessage('session-process', 'test'))
        .rejects.toThrow('Session session-process is not active');
    });

    it('should handle processing errors', async () => {
      sessionManager.createSession('agent-123');
      mockServerManager.getAllTools.mockRejectedValue(new Error('Tools failed'));

      const eventSpy = jest.spyOn(sessionManager, 'emit');

      await expect(sessionManager.processMessage('session-process', 'test'))
        .rejects.toThrow('Tools failed');

      expect(mockSession.setError).toHaveBeenCalledWith('Tools failed');
      expect(eventSpy).toHaveBeenCalledWith("sessionError", 'session-process', expect.any(Error));
    });

    it('should trim message history when limit exceeded', async () => {
      const config: SessionConfig = { maxMessageHistory: 2 };
      const limitedManager = new SessionManager(mockServerManager, config);
      limitedManager.registerAgent(mockAgent);
      
      // Mock messages exceeding limit
      mockSession.getMessages.mockReturnValue([
        { role: 'system', content: [], timestamp: new Date() },
        { role: 'user', content: [], timestamp: new Date() },
        { role: "assistant", content: [], timestamp: new Date() },
        { role: 'user', content: [], timestamp: new Date() }
      ] as SessionMessage[]);

      limitedManager.createSession('agent-123');
      
      await limitedManager.processMessage('session-process', 'test');

      // Verify trimming logic was applied
      expect(mockSession.getMessages).toHaveBeenCalled();
    });

    it('should auto-save when enabled', async () => {
      const config: SessionConfig = { autoSave: true, savePath: '/tmp' };
      const autoSaveManager = new SessionManager(mockServerManager, config);
      autoSaveManager.registerAgent(mockAgent);
      autoSaveManager.createSession('agent-123');

      const saveSpy = jest.spyOn(autoSaveManager, "saveSession").mockResolvedValue();

      await autoSaveManager.processMessage('session-process', 'test');

      expect(saveSpy).toHaveBeenCalledWith('session-process');
    });
  });

  describe("endSession", () => {
    beforeEach(() => {
      sessionManager.registerAgent(mockAgent);
      mockUuidv4.mockReturnValue('session-end');
    });

    it('should end session successfully', () => {
      sessionManager.createSession('agent-123');
      const eventSpy = jest.spyOn(sessionManager, 'emit');

      sessionManager.endSession('session-end', 'User requested');

      expect(mockSession.success).toHaveBeenCalled();
      expect(mockSession.setMetadata).toHaveBeenCalledWith("endReason", 'User requested');
      expect(eventSpy).toHaveBeenCalledWith("sessioncompleted", 'session-end');
    });

    it('should handle non-existent session gracefully', () => {
      expect(() => sessionManager.endSession('non-existent')).not.toThrow();
    });

    it('should clear idle timer', () => {
      sessionManager.createSession('agent-123');
      const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");

      sessionManager.endSession('session-end');

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe('session retrieval', () => {
    beforeEach(() => {
      sessionManager.registerAgent(mockAgent);
    });

    it('should get session by ID', () => {
      mockUuidv4.mockReturnValue('get-session-id');
      const session = sessionManager.createSession('agent-123');

      const retrieved = sessionManager.getSession('get-session-id');

      expect(retrieved).toBe(session);
    });

    it('should return undefined for non-existent session', () => {
      const retrieved = sessionManager.getSession('non-existent');

      expect(retrieved).toBeUndefined();
    });

    it('should get active sessions', () => {
      mockUuidv4
        .mockReturnValueOnce('active-1')
        .mockReturnValueOnce('active-2');

      sessionManager.createSession('agent-123');
      sessionManager.createSession('agent-123');

      const activeSessions = sessionManager.getActiveSessions();

      expect(activeSessions).toHaveLength(2);
    });

    it('should get sessions for specific agent', () => {
      const anotherAgent = { ...mockAgent };
      anotherAgent.getId = jest.fn().mockReturnValue('agent-456');
      sessionManager.registerAgent(anotherAgent as any);

      mockUuidv4
        .mockReturnValueOnce('session-agent-123-1')
        .mockReturnValueOnce('session-agent-456-1')
        .mockReturnValueOnce('session-agent-123-2');

      sessionManager.createSession('agent-123');
      sessionManager.createSession('agent-456');
      sessionManager.createSession('agent-123');

      const agent123Sessions = sessionManager.getAgentSessions('agent-123');

      expect(agent123Sessions).toHaveLength(2);
    });
  });

  describe('idle timer management', () => {
    beforeEach(() => {
      sessionManager.registerAgent(mockAgent);
      mockUuidv4.mockReturnValue('idle-session');
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should set idle timer on session creation', () => {
      const setTimeoutSpy = jest.spyOn(global, "setTimeout");

      sessionManager.createSession('agent-123');

      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 30 * 60 * 1000);
    });

    it('should reset idle timer on message processing', async () => {
      sessionManager.createSession('agent-123');
      const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");
      const setTimeoutSpy = jest.spyOn(global, "setTimeout");

      setTimeoutSpy.mockClear();

      await sessionManager.processMessage('idle-session', 'test');

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 30 * 60 * 1000);
    });

    it('should end session on idle timeout', () => {
      sessionManager.createSession('agent-123');
      const endSessionSpy = jest.spyOn(sessionManager, "endSession");

      // Fast-forward past idle timeout
      jest.advanceTimersByTime(30 * 60 * 1000 + 1);

      expect(endSessionSpy).toHaveBeenCalledWith('idle-session', 'Idle timeout');
    });
  });

  describe('session persistence', () => {
    beforeEach(() => {
      sessionManager.registerAgent(mockAgent);
      mockUuidv4.mockReturnValue('persist-session');
    });

    it('should save session when path is configured', async () => {
      const config: SessionConfig = { savePath: '/tmp/sessions' };
      const persistManager = new SessionManager(mockServerManager, config);
      persistManager.registerAgent(mockAgent);
      persistManager.createSession('agent-123');

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await persistManager.saveSession('persist-session');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Saving session persist-session to /tmp/sessions'
      );

      consoleSpy.mockRestore();
    });

    it('should skip save when no path configured', async () => {
      sessionManager.createSession('agent-123');

      await expect(sessionManager.saveSession('persist-session')).resolves.not.toThrow();
    });

    it('should load session when path is configured', async () => {
      const config: SessionConfig = { savePath: '/tmp/sessions' };
      const persistManager = new SessionManager(mockServerManager, config);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await persistManager.loadSession('persist-session');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Loading session persist-session from /tmp/sessions'
      );
      expect(result).toBeUndefined();

      consoleSpy.mockRestore();
    });
  });

  describe("statistics", () => {
    beforeEach(() => {
      sessionManager.registerAgent(mockAgent);
    });

    it('should return session statistics', () => {
      // Create sessions with different statuses
      mockUuidv4
        .mockReturnValueOnce('active-session')
        .mockReturnValueOnce('completed-session')
        .mockReturnValueOnce('error-session');

      sessionManager.createSession('agent-123');
      sessionManager.createSession('agent-123');
      sessionManager.createSession('agent-123');

      // Mock different session statuses
      const sessions = Array.from((sessionManager as any).sessions.values());
      sessions[0].getStatus.mockReturnValue(SessionStatus.ACTIVE);
      sessions[1].getStatus.mockReturnValue(SessionStatus.success);
      sessions[2].getStatus.mockReturnValue(SessionStatus.ERROR);

      const stats = sessionManager.getStatistics();

      expect(stats.totalSessions).toBe(3);
      expect(stats.activeSessions).toBe(1);
      expect(stats.completedSessions).toBe(1);
      expect(stats.errorSessions).toBe(1);
      expect(stats.sessionsByAgent.get('agent-123')).toBe(3);
    });

    it('should handle empty session list', () => {
      const stats = sessionManager.getStatistics();

      expect(stats.totalSessions).toBe(0);
      expect(stats.activeSessions).toBe(0);
      expect(stats.sessionsByAgent.size).toBe(0);
    });
  });

  describe('cleanup', () => {
    beforeEach(() => {
      sessionManager.registerAgent(mockAgent);
      mockUuidv4.mockReturnValue('cleanup-session');
    });

    it('should cleanup all sessions and timers', () => {
      sessionManager.createSession('agent-123');
      const endSessionSpy = jest.spyOn(sessionManager, "endSession");
      const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");
      const removeListenersSpy = jest.spyOn(sessionManager, "removeAllListeners");

      sessionManager.cleanup();

      expect(endSessionSpy).toHaveBeenCalledWith('cleanup-session', 'Manager cleanup');
      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(removeListenersSpy).toHaveBeenCalled();
    });

    it('should handle cleanup with no active sessions', () => {
      expect(() => sessionManager.cleanup()).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle agent lookup failures during session creation', () => {
      expect(() => sessionManager.createSession('unknown-agent'))
        .toThrow('Agent unknown-agent not found');
    });

    it('should handle missing agent during session start', async () => {
      sessionManager.registerAgent(mockAgent);
      mockUuidv4.mockReturnValue('orphan-session');
      sessionManager.createSession('agent-123');
      
      // Unregister agent after session creation
      sessionManager.unregisterAgent('agent-123');

      await expect(sessionManager.startSession('orphan-session'))
        .rejects.toThrow('Agent agent-123 not found');
    });

    it('should handle server manager failures during message processing', async () => {
      sessionManager.registerAgent(mockAgent);
      mockUuidv4.mockReturnValue('error-session');
      sessionManager.createSession('agent-123');

      mockServerManager.getAllTools.mockRejectedValue(new Error('Server unavailable'));

      await expect(sessionManager.processMessage('error-session', 'test'))
        .rejects.toThrow('Server unavailable');
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      sessionManager.registerAgent(mockAgent);
    });

    it('should handle very long message content', async () => {
      mockUuidv4.mockReturnValue('long-message-session');
      sessionManager.createSession('agent-123');

      const longMessage = 'x'.repeat(100000);

      await expect(sessionManager.processMessage('long-message-session', longMessage))
        .resolves.toBeDefined();
    });

    it('should handle concurrent session operations', async () => {
      mockUuidv4.mockReturnValue('concurrent-session');
      sessionManager.createSession('agent-123');

      const promises = [
        sessionManager.processMessage('concurrent-session', 'message 1'),
        sessionManager.processMessage('concurrent-session', 'message 2'),
        sessionManager.processMessage('concurrent-session', 'message 3')
      ];

      const results = await Promise.allSettled(promises);

      // At least one operation should succeed
      expect(results.some(result => result.status === "fulfilled")).toBe(true);
    });

    it('should handle special characters in session context', () => {
      mockUuidv4.mockReturnValue('special-char-session');
      const context = {
        emoji: '🚀🌟',
        unicode: '测试内容',
        special: '!@#$%^&*()'
      };

      expect(() => sessionManager.createSession('agent-123', context)).not.toThrow();
    });

    it('should handle empty message processing', async () => {
      mockUuidv4.mockReturnValue('empty-message-session');
      sessionManager.createSession('agent-123');

      await expect(sessionManager.processMessage('empty-message-session', ''))
        .resolves.toBeDefined();
    });
  });
});