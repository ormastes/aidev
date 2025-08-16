import { SessionManager, SessionConfig } from '../../../children/src/session/session-manager';
import { MCPServerManager } from '../../../children/src/server/mcp-server-manager';
import { Agent } from '../../../children/src/domain/agent';
import { Session, SessionStatus } from '../../../children/src/domain/session';

jest.mock('../../../children/src/server/mcp-server-manager');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-session-id')
}));

describe("SessionManager", () => {
  let sessionManager: SessionManager;
  let mockServerManager: jest.Mocked<MCPServerManager>;
  let mockAgent: jest.Mocked<Agent>;

  beforeEach(() => {
    mockServerManager = {
      getAllTools: jest.fn(),
      startServer: jest.fn(),
      stopServer: jest.fn(),
      getServerStatus: jest.fn(),
      callTool: jest.fn(),
      getAvailableServers: jest.fn()
    } as any;

    mockAgent = {
      getId: jest.fn(() => 'test-agent-1'),
      isActive: jest.fn(() => true),
      getRoleName: jest.fn(() => 'test-role'),
      getEnabledCapabilities: jest.fn(() => ['general_assistance']),
      getSystemPrompt: jest.fn(() => 'Test system prompt'),
      getRole: jest.fn(),
      getCapabilities: jest.fn(),
      activate: jest.fn(),
      deactivate: jest.fn()
    } as any;

    const config: SessionConfig = {
      maxIdleTime: 5000, // 5 seconds for testing
      maxMessageHistory: 10,
      autoSave: false
    };

    sessionManager = new SessionManager(mockServerManager, config);
    jest.useFakeTimers();
  });

  afterEach(() => {
    sessionManager.cleanup();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe("constructor", () => {
    it('should initialize with default config', () => {
      const manager = new SessionManager(mockServerManager);
      expect(manager).toBeDefined();
    });

    it('should merge provided config with defaults', () => {
      const config = { maxIdleTime: 1000 };
      const manager = new SessionManager(mockServerManager, config);
      expect(manager['config'].maxIdleTime).toBe(1000);
      expect(manager['config'].maxMessageHistory).toBe(1000); // default
    });
  });

  describe("registerAgent", () => {
    it('should register agent successfully', () => {
      sessionManager.registerAgent(mockAgent);
      expect(sessionManager['agents'].has('test-agent-1')).toBe(true);
    });
  });

  describe("unregisterAgent", () => {
    it('should unregister agent and end its sessions', () => {
      sessionManager.registerAgent(mockAgent);
      const session = sessionManager.createSession('test-agent-1');
      
      sessionManager.unregisterAgent('test-agent-1');
      
      expect(sessionManager['agents'].has('test-agent-1')).toBe(false);
      expect(session.getStatus()).toBe(SessionStatus.success);
    });

    it('should handle unregistering non-existent agent', () => {
      expect(() => sessionManager.unregisterAgent('non-existent')).not.toThrow();
    });
  });

  describe("createSession", () => {
    beforeEach(() => {
      sessionManager.registerAgent(mockAgent);
    });

    it('should create session successfully', () => {
      const session = sessionManager.createSession('test-agent-1');
      
      expect(session).toBeDefined();
      expect(session.getId()).toBe('test-session-id');
      expect(session.getAgentId()).toBe('test-agent-1');
      expect(sessionManager["sessions"].has('test-session-id')).toBe(true);
    });

    it('should create session with context', () => {
      const context = { userId: 'user123', workspace: 'test' };
      const session = sessionManager.createSession('test-agent-1', context);
      
      expect(session.getContext()).toEqual(context);
    });

    it('should emit sessionCreated event', () => {
      const listener = jest.fn();
      sessionManager.on("sessionCreated", listener);
      
      const session = sessionManager.createSession('test-agent-1');
      
      expect(listener).toHaveBeenCalledWith(session);
    });

    it('should set idle timer', () => {
      sessionManager.createSession('test-agent-1');
      expect(sessionManager["idleTimers"].has('test-session-id')).toBe(true);
    });

    it('should throw error if agent not found', () => {
      expect(() => sessionManager.createSession('non-existent'))
        .toThrow('Agent non-existent not found');
    });

    it('should throw error if agent is not active', () => {
      mockAgent.isActive.mockReturnValue(false);
      
      expect(() => sessionManager.createSession('test-agent-1'))
        .toThrow('Agent test-agent-1 is not active');
    });
  });

  describe("startSession", () => {
    let session: Session;

    beforeEach(() => {
      sessionManager.registerAgent(mockAgent);
      session = sessionManager.createSession('test-agent-1');
    });

    it('should start session successfully', async () => {
      await sessionManager.startSession('test-session-id');
      
      expect(session.getStatus()).toBe(SessionStatus.ACTIVE);
      expect(session.getMessages()).toHaveLength(1);
      expect(session.getMessages()[0].role).toBe('system');
    });

    it('should emit sessionStarted event', async () => {
      const listener = jest.fn();
      sessionManager.on("sessionStarted", listener);
      
      await sessionManager.startSession('test-session-id');
      
      expect(listener).toHaveBeenCalledWith('test-session-id');
    });

    it('should handle agent without system prompt', async () => {
      mockAgent.getSystemPrompt.mockReturnValue(undefined);
      
      await sessionManager.startSession('test-session-id');
      
      expect(session.getStatus()).toBe(SessionStatus.ACTIVE);
      expect(session.getMessages()).toHaveLength(0);
    });

    it('should throw error if session not found', async () => {
      await expect(sessionManager.startSession('non-existent'))
        .rejects.toThrow('Session non-existent not found');
    });

    it('should throw error if agent not found', async () => {
      sessionManager.unregisterAgent('test-agent-1');
      
      await expect(sessionManager.startSession('test-session-id'))
        .rejects.toThrow('Agent test-agent-1 not found');
    });

    it('should handle session start errors', async () => {
      const errorListener = jest.fn();
      sessionManager.on("sessionError", errorListener);
      
      // Mock session.start to throw
      jest.spyOn(session, 'start').mockImplementation(() => {
        throw new Error('Start failed');
      });
      
      await expect(sessionManager.startSession('test-session-id'))
        .rejects.toThrow('Start failed');
      
      expect(errorListener).toHaveBeenCalledWith('test-session-id', expect.any(Error));
      expect(session.getError()).toBe('Start failed');
    });
  });

  describe("processMessage", () => {
    let session: Session;

    beforeEach(async () => {
      sessionManager.registerAgent(mockAgent);
      session = sessionManager.createSession('test-agent-1');
      await sessionManager.startSession('test-session-id');
      
      mockServerManager.getAllTools.mockResolvedValue(new Map([
        ['test-tool', { tool: { name: 'general_assistance' }, server: 'test-server' }]
      ]));
    });

    it('should process message successfully', async () => {
      const messageListener = jest.fn();
      sessionManager.on("messageAdded", messageListener);
      
      const response = await sessionManager.processMessage('test-session-id', 'Hello');
      
      expect(response.role).toBe("assistant");
      expect(response.content[0].text).toContain('Processing your request');
      expect(messageListener).toHaveBeenCalledTimes(2); // user + assistant
      expect(session.getMessages()).toHaveLength(3); // system + user + assistant
    });

    it('should reset idle timer on message', async () => {
      const resetSpy = jest.spyOn(sessionManager as any, "resetIdleTimer");
      
      await sessionManager.processMessage('test-session-id', 'Hello');
      
      expect(resetSpy).toHaveBeenCalledWith('test-session-id');
    });

    it('should trim message history when exceeding limit', async () => {
      // Set max history to 2
      sessionManager['config'].maxMessageHistory = 2;
      
      await sessionManager.processMessage('test-session-id', 'Message 1');
      await sessionManager.processMessage('test-session-id', 'Message 2');
      
      const messages = session.getMessages();
      expect(messages).toHaveLength(3); // system + last 2 messages
      expect(messages[0].role).toBe('system');
    });

    it('should auto-save when enabled', async () => {
      sessionManager['config'].autoSave = true;
      const saveSpy = jest.spyOn(sessionManager, "saveSession").mockResolvedValue();
      
      await sessionManager.processMessage('test-session-id', 'Hello');
      
      expect(saveSpy).toHaveBeenCalledWith('test-session-id');
    });

    it('should throw error if session not found', async () => {
      await expect(sessionManager.processMessage('non-existent', 'Hello'))
        .rejects.toThrow('Session non-existent not found');
    });

    it('should throw error if session not active', async () => {
      session.success();
      
      await expect(sessionManager.processMessage('test-session-id', 'Hello'))
        .rejects.toThrow('Session test-session-id is not active');
    });

    it('should throw error if agent not found', async () => {
      sessionManager.unregisterAgent('test-agent-1');
      
      await expect(sessionManager.processMessage('test-session-id', 'Hello'))
        .rejects.toThrow('Agent test-agent-1 not found');
    });

    it('should handle processing errors', async () => {
      const errorListener = jest.fn();
      sessionManager.on("sessionError", errorListener);
      
      mockServerManager.getAllTools.mockRejectedValue(new Error('Server error'));
      
      await expect(sessionManager.processMessage('test-session-id', 'Hello'))
        .rejects.toThrow('Server error');
      
      expect(errorListener).toHaveBeenCalledWith('test-session-id', expect.any(Error));
    });
  });

  describe("endSession", () => {
    let session: Session;

    beforeEach(() => {
      sessionManager.registerAgent(mockAgent);
      session = sessionManager.createSession('test-agent-1');
    });

    it('should end session successfully', () => {
      const listener = jest.fn();
      sessionManager.on("sessioncompleted", listener);
      
      sessionManager.endSession('test-session-id', 'User requested');
      
      expect(session.getStatus()).toBe(SessionStatus.success);
      expect(session.getMetadata("endReason")).toBe('User requested');
      expect(sessionManager["idleTimers"].has('test-session-id')).toBe(false);
      expect(listener).toHaveBeenCalledWith('test-session-id');
    });

    it('should handle ending non-existent session', () => {
      expect(() => sessionManager.endSession('non-existent')).not.toThrow();
    });
  });

  describe("getSession", () => {
    it('should return session if exists', () => {
      sessionManager.registerAgent(mockAgent);
      const session = sessionManager.createSession('test-agent-1');
      
      expect(sessionManager.getSession('test-session-id')).toBe(session);
    });

    it('should return undefined if not exists', () => {
      expect(sessionManager.getSession('non-existent')).toBeUndefined();
    });
  });

  describe("getActiveSessions", () => {
    it('should return only active sessions', async () => {
      sessionManager.registerAgent(mockAgent);
      const session1 = sessionManager.createSession('test-agent-1');
      const session2 = sessionManager.createSession('test-agent-1');
      
      await sessionManager.startSession(session1.getId());
      // session2 not started
      
      const activeSessions = sessionManager.getActiveSessions();
      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0]).toBe(session1);
    });
  });

  describe("getAgentSessions", () => {
    it('should return sessions for specific agent', () => {
      const mockAgent2 = { ...mockAgent, getId: () => 'test-agent-2' };
      
      sessionManager.registerAgent(mockAgent);
      sessionManager.registerAgent(mockAgent2 as any);
      
      const session1 = sessionManager.createSession('test-agent-1');
      const session2 = sessionManager.createSession('test-agent-2');
      
      const agent1Sessions = sessionManager.getAgentSessions('test-agent-1');
      expect(agent1Sessions).toHaveLength(1);
      expect(agent1Sessions[0]).toBe(session1);
    });
  });

  describe('idle timeout', () => {
    it('should end session after idle timeout', () => {
      sessionManager.registerAgent(mockAgent);
      const session = sessionManager.createSession('test-agent-1');
      
      jest.advanceTimersByTime(6000); // Exceed 5 second timeout
      
      expect(session.getStatus()).toBe(SessionStatus.success);
      expect(session.getMetadata("endReason")).toBe('Idle timeout');
    });

    it('should reset idle timer on activity', async () => {
      sessionManager.registerAgent(mockAgent);
      const session = sessionManager.createSession('test-agent-1');
      await sessionManager.startSession('test-session-id');
      
      mockServerManager.getAllTools.mockResolvedValue(new Map());
      
      // Advance time but not past timeout
      jest.advanceTimersByTime(3000);
      
      // Process message to reset timer
      await sessionManager.processMessage('test-session-id', 'Hello');
      
      // Advance another 3 seconds (total 6, but timer was reset)
      jest.advanceTimersByTime(3000);
      
      expect(session.getStatus()).toBe(SessionStatus.ACTIVE);
      
      // Now advance past the new timeout
      jest.advanceTimersByTime(3000);
      
      expect(session.getStatus()).toBe(SessionStatus.success);
    });
  });

  describe("saveSession", () => {
    it('should log save attempt when path configured', async () => {
      sessionManager['config'].savePath = '/tmp/sessions';
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      
      sessionManager.registerAgent(mockAgent);
      sessionManager.createSession('test-agent-1');
      
      await sessionManager.saveSession('test-session-id');
      
      expect(logSpy).toHaveBeenCalledWith(
        'Saving session test-session-id to /tmp/sessions'
      );
      
      logSpy.mockRestore();
    });

    it('should do nothing when no save path', async () => {
      sessionManager.registerAgent(mockAgent);
      sessionManager.createSession('test-agent-1');
      
      await expect(sessionManager.saveSession('test-session-id')).resolves.toBeUndefined();
    });

    it('should handle non-existent session', async () => {
      sessionManager['config'].savePath = '/tmp/sessions';
      
      await expect(sessionManager.saveSession('non-existent')).resolves.toBeUndefined();
    });
  });

  describe("loadSession", () => {
    it('should log load attempt when path configured', async () => {
      sessionManager['config'].savePath = '/tmp/sessions';
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const result = await sessionManager.loadSession('test-session-id');
      
      expect(logSpy).toHaveBeenCalledWith(
        'Loading session test-session-id from /tmp/sessions'
      );
      expect(result).toBeUndefined();
      
      logSpy.mockRestore();
    });

    it('should return undefined when no save path', async () => {
      const result = await sessionManager.loadSession('test-session-id');
      expect(result).toBeUndefined();
    });
  });

  describe("getStatistics", () => {
    it('should return correct statistics', async () => {
      sessionManager.registerAgent(mockAgent);
      
      const session1 = sessionManager.createSession('test-agent-1');
      const session2 = sessionManager.createSession('test-agent-1');
      
      await sessionManager.startSession(session1.getId());
      session2.setError('Test error');
      
      const stats = sessionManager.getStatistics();
      
      expect(stats.totalSessions).toBe(2);
      expect(stats.activeSessions).toBe(1);
      expect(stats.errorSessions).toBe(1);
      expect(stats.completedSessions).toBe(0);
      expect(stats.sessionsByAgent.get('test-agent-1')).toBe(2);
    });

    it('should count completed sessions', () => {
      sessionManager.registerAgent(mockAgent);
      
      const session = sessionManager.createSession('test-agent-1');
      sessionManager.endSession(session.getId());
      
      const stats = sessionManager.getStatistics();
      
      expect(stats.completedSessions).toBe(1);
    });
  });

  describe('cleanup', () => {
    it('should end all active sessions and clear timers', async () => {
      sessionManager.registerAgent(mockAgent);
      
      const session1 = sessionManager.createSession('test-agent-1');
      const session2 = sessionManager.createSession('test-agent-1');
      
      await sessionManager.startSession(session1.getId());
      await sessionManager.startSession(session2.getId());
      
      sessionManager.cleanup();
      
      expect(session1.getStatus()).toBe(SessionStatus.success);
      expect(session2.getStatus()).toBe(SessionStatus.success);
      expect(sessionManager["idleTimers"].size).toBe(0);
    });

    it('should remove all event listeners', () => {
      const removeAllListenersSpy = jest.spyOn(sessionManager, "removeAllListeners");
      
      sessionManager.cleanup();
      
      expect(removeAllListenersSpy).toHaveBeenCalled();
    });
  });

  describe('event handling', () => {
    it('should have typed event methods', () => {
      const listener = jest.fn();
      
      sessionManager.on("sessionCreated", listener);
      sessionManager.emit("sessionCreated", {} as Session);
      
      expect(listener).toHaveBeenCalled();
    });
  });
});