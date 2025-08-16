import { SessionManager } from '../../children/src/infrastructure/session-manager';
import { fs } from '../../../../themes/infra_external-log-lib/dist';
import { path } from '../../../../themes/infra_external-log-lib/dist';

jest.mock('fs');

describe('SessionManager', () => {
  let sessionManager: SessionManager;
  const mockFs = fs as jest.Mocked<typeof fs>;
  const testSessionDir = '/test/sessions';

  beforeEach(() => {
    sessionManager = new SessionManager(testSessionDir);
    jest.clearAllMocks();
    
    // Mock fs methods
    mockFs.existsSync.mockReturnValue(false);
    mockFs.mkdirSync.mockImplementation(() => undefined as any);
    mockFs.writeFileSync.mockImplementation(() => {});
    mockFs.readFileSync.mockImplementation(() => '');
    mockFs.readdirSync.mockReturnValue([]);
    mockFs.unlinkSync.mockImplementation(() => {});
  });

  describe('constructor', () => {
    it('should create session directory if it does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      new SessionManager(testSessionDir);
      
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(testSessionDir, { recursive: true });
    });

    it('should not create directory if it exists', () => {
      mockFs.existsSync.mockReturnValue(true);
      
      new SessionManager(testSessionDir);
      
      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('createSession', () => {
    it('should create a new session with unique ID', () => {
      const userId = 'user123';
      const metadata = { browser: 'chrome' };
      
      const session = sessionManager.createSession(userId, metadata);
      
      expect(session.id).toBeTruthy();
      expect(session.userId).toBe(userId);
      expect(session.metadata).toEqual(metadata);
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.expiresAt).toBeInstanceOf(Date);
      expect(session.expiresAt.getTime()).toBeGreaterThan(session.createdAt.getTime());
    });

    it('should create session with custom TTL', () => {
      const customTTL = 60 * 60 * 1000; // 1 hour
      const sessionManagerWithTTL = new SessionManager(testSessionDir, customTTL);
      
      const session = sessionManagerWithTTL.createSession('user123');
      
      const expectedExpiry = session.createdAt.getTime() + customTTL;
      expect(session.expiresAt.getTime()).toBeCloseTo(expectedExpiry, -2);
    });

    it('should save session to file', () => {
      const session = sessionManager.createSession('user123');
      
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        path.join(testSessionDir, `${session.id}.json`),
        expect.stringContaining(session.id)
      );
    });
  });

  describe('getSession', () => {
    it('should retrieve existing session', () => {
      const sessionData = {
        id: 'session123',
        userId: 'user123',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        lastAccessedAt: new Date().toISOString(),
        messages: [],
        context: {}
      };
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(sessionData));
      
      const session = sessionManager.getSession('session123');
      
      expect(session).toBeTruthy();
      expect(session?.id).toBe('session123');
      expect(session?.userId).toBe('user123');
    });

    it('should return null for non-existent session', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      const session = sessionManager.getSession('nonexistent');
      
      expect(session).toBeNull();
    });

    it('should return null for expired session', () => {
      const expiredSessionData = {
        id: 'expired123',
        userId: 'user123',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        expiresAt: new Date(Date.now() - 3600000).toISOString(),
        lastAccessedAt: new Date(Date.now() - 3600000).toISOString(),
        messages: [],
        context: {}
      };
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(expiredSessionData));
      
      const session = sessionManager.getSession('expired123');
      
      expect(session).toBeNull();
    });

    it('should update lastAccessedAt on retrieval', () => {
      const sessionData = {
        id: 'session123',
        userId: 'user123',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        lastAccessedAt: new Date(Date.now() - 1000).toISOString(),
        messages: [],
        context: {}
      };
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(sessionData));
      
      const beforeAccess = new Date();
      const session = sessionManager.getSession('session123');
      
      expect(session?.lastAccessedAt.getTime()).toBeGreaterThanOrEqual(beforeAccess.getTime());
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('updateSession', () => {
    beforeEach(() => {
      const sessionData = {
        id: 'update123',
        userId: 'user123',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        lastAccessedAt: new Date().toISOString(),
        messages: [],
        context: {}
      };
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(sessionData));
    });

    it('should update session context', () => {
      const updates = { context: { theme: 'dark' } };
      
      sessionManager.updateSession('update123', updates);
      
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"theme":"dark"')
      );
    });

    it('should throw error for non-existent session', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      expect(() => {
        sessionManager.updateSession('nonexistent', {});
      }).toThrow('Session not found');
    });
  });

  describe('deleteSession', () => {
    it('should delete session file', () => {
      mockFs.existsSync.mockReturnValue(true);
      
      sessionManager.deleteSession('delete123');
      
      expect(mockFs.unlinkSync).toHaveBeenCalledWith(
        path.join(testSessionDir, 'delete123.json')
      );
    });

    it('should not throw for non-existent session', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      expect(() => {
        sessionManager.deleteSession('nonexistent');
      }).not.toThrow();
    });
  });

  describe('addMessage', () => {
    beforeEach(() => {
      const sessionData = {
        id: 'msg123',
        userId: 'user123',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        lastAccessedAt: new Date().toISOString(),
        messages: [],
        context: {}
      };
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(sessionData));
    });

    it('should add message to session', () => {
      const message = {
        role: 'user' as const,
        content: 'Hello, AI!'
      };
      
      sessionManager.addMessage('msg123', message);
      
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Hello, AI!')
      );
    });

    it('should add timestamp to message', () => {
      const message = {
        role: 'assistant' as const,
        content: 'Hello, human!'
      };
      
      sessionManager.addMessage('msg123', message);
      
      const writeCall = mockFs.writeFileSync.mock.calls[0];
      const savedData = JSON.parse(writeCall[1] as string);
      
      expect(savedData.messages[0]).toHaveProperty('timestamp');
    });
  });

  describe('getMessages', () => {
    it('should return all messages for session', () => {
      const sessionData = {
        id: 'getmsg123',
        userId: 'user123',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        lastAccessedAt: new Date().toISOString(),
        messages: [
          { role: 'user', content: 'Question?', timestamp: new Date().toISOString() },
          { role: 'assistant', content: 'Answer!', timestamp: new Date().toISOString() }
        ],
        context: {}
      };
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(sessionData));
      
      const messages = sessionManager.getMessages('getmsg123');
      
      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe('Question?');
      expect(messages[1].content).toBe('Answer!');
    });

    it('should return empty array for non-existent session', () => {
      mockFs.existsSync.mockReturnValue(false);
      
      const messages = sessionManager.getMessages('nonexistent');
      
      expect(messages).toEqual([]);
    });
  });

  describe('listUserSessions', () => {
    it('should return all sessions for a user', () => {
      const session1 = {
        id: 'sess1',
        userId: 'user123',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      };
      
      const session2 = {
        id: 'sess2',
        userId: 'user123',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      };
      
      const session3 = {
        id: 'sess3',
        userId: 'other-user',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      };
      
      mockFs.readdirSync.mockReturnValue(['sess1.json', 'sess2.json', 'sess3.json'] as any);
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation((filePath) => {
        if (filePath.toString().includes('sess1')) return JSON.stringify(session1);
        if (filePath.toString().includes('sess2')) return JSON.stringify(session2);
        if (filePath.toString().includes('sess3')) return JSON.stringify(session3);
        return '{}';
      });
      
      const userSessions = sessionManager.listUserSessions('user123');
      
      expect(userSessions).toHaveLength(2);
      expect(userSessions.every(s => s.userId === 'user123')).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should delete expired sessions', () => {
      const expiredSession = {
        id: 'expired1',
        userId: 'user123',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        expiresAt: new Date(Date.now() - 3600000).toISOString()
      };
      
      const validSession = {
        id: 'valid1',
        userId: 'user123',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      };
      
      mockFs.readdirSync.mockReturnValue(['expired1.json', 'valid1.json'] as any);
      mockFs.readFileSync.mockImplementation((filePath) => {
        if (filePath.toString().includes('expired1')) return JSON.stringify(expiredSession);
        if (filePath.toString().includes('valid1')) return JSON.stringify(validSession);
        return '{}';
      });
      
      sessionManager.cleanup();
      
      expect(mockFs.unlinkSync).toHaveBeenCalledWith(
        path.join(testSessionDir, 'expired1.json')
      );
      expect(mockFs.unlinkSync).not.toHaveBeenCalledWith(
        path.join(testSessionDir, 'valid1.json')
      );
    });
  });

  describe('exportSession', () => {
    it('should export session data', () => {
      const sessionData = {
        id: 'export123',
        userId: 'user123',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        messages: [{ role: 'user', content: 'Test' }],
        context: { key: 'value' }
      };
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(sessionData));
      
      const exported = sessionManager.exportSession('export123');
      
      expect(exported).toEqual(sessionData);
    });
  });

  describe('importSession', () => {
    it('should import session data', () => {
      const sessionData = {
        id: 'import123',
        userId: 'user123',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        lastAccessedAt: new Date().toISOString(),
        messages: [],
        context: {}
      };
      
      sessionManager.importSession(sessionData);
      
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        path.join(testSessionDir, 'import123.json'),
        JSON.stringify(sessionData, null, 2)
      );
    });
  });
});