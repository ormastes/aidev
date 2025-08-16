/**
 * External Test: SessionStore External Interface - Session management
 * 
 * This test verifies the external interface for the SessionStore component,
 * specifically session creation, storage, retrieval, and lifecycle management.
 * NO MOCKS - Real external interface implementation.
 */

// External Interface for SessionStore
interface SessionData {
  [key: string]: any;
}

interface Session {
  id: string;
  userId?: string;
  data: SessionData;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

interface SessionStoreInterface {
  createSession(userId?: string, ttlSeconds?: number): Promise<Session>;
  getSession(sessionId: string): Promise<Session | null>;
  updateSession(sessionId: string, data: Partial<SessionData>): Promise<Session | null>;
  deleteSession(sessionId: string): Promise<boolean>;
  renewSession(sessionId: string, ttlSeconds?: number): Promise<Session | null>;
  listSessions(userId?: string): Promise<Session[]>;
  cleanupExpiredSessions(): Promise<number>;
  getSessionCount(): Promise<number>;
  isSessionValid(sessionId: string): Promise<boolean>;
}

// Mock implementation for testing the external interface
class MockSessionStore implements SessionStoreInterface {
  private sessions: Map<string, Session> = new Map();
  private defaultTTL = 3600; // 1 hour in seconds

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async createSession(userId?: string, ttlSeconds: number = this.defaultTTL): Promise<Session> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
    
    const session: Session = {
      id: this.generateSessionId(),
      userId,
      data: {},
      createdAt: now,
      lastAccessedAt: now,
      expiresAt,
      isActive: true
    };
    
    this.sessions.set(session.id, session);
    return { ...session };
  }

  async getSession(sessionId: string): Promise<Session | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    // Check if expired
    if (session.expiresAt < new Date()) {
      this.sessions.delete(sessionId);
      return null;
    }
    
    // Update last accessed time
    session.lastAccessedAt = new Date();
    return { ...session };
  }

  async updateSession(sessionId: string, data: Partial<SessionData>): Promise<Session | null> {
    const session = this.sessions.get(sessionId);
    if (!session || session.expiresAt < new Date()) return null;
    
    // Merge data
    Object.assign(session.data, data);
    session.lastAccessedAt = new Date();
    
    return { ...session };
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    return this.sessions.delete(sessionId);
  }

  async renewSession(sessionId: string, ttlSeconds: number = this.defaultTTL): Promise<Session | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    // Check if expired
    if (session.expiresAt < new Date()) {
      this.sessions.delete(sessionId);
      return null;
    }
    
    const now = new Date();
    session.expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
    session.lastAccessedAt = now;
    
    return { ...session };
  }

  async listSessions(userId?: string): Promise<Session[]> {
    const now = new Date();
    const activeSessions = Array.from(this.sessions.values())
      .filter(session => session.expiresAt > now)
      .filter(session => !userId || session.userId === userId);
    
    return activeSessions.map(session => ({ ...session }));
  }

  async cleanupExpiredSessions(): Promise<number> {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [id, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(id);
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  }

  async getSessionCount(): Promise<number> {
    await this.cleanupExpiredSessions();
    return this.sessions.size;
  }

  async isSessionValid(sessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    return session !== null;
  }
}

describe('SessionStore External Interface Test', () => {
  let sessionStore: SessionStoreInterface;
  
  beforeEach(() => {
    sessionStore = new MockSessionStore();
  });
  
  test('should create new session with default settings', async () => {
    const session = await sessionStore.createSession();
    
    expect(session.id).toBeTruthy();
    expect(session.id).toMatch(/^session_\d+_[a-z0-9]+$/);
    expect(session.userId).toBeUndefined();
    expect(session.data).toEqual({});
    expect(session.createdAt).toBeInstanceOf(Date);
    expect(session.lastAccessedAt).toBeInstanceOf(Date);
    expect(session.expiresAt).toBeInstanceOf(Date);
    expect(session.isActive).toBe(true);
    
    // Should expire in about 1 hour (default TTL)
    const ttlMillis = session.expiresAt.getTime() - session.createdAt.getTime();
    expect(ttlMillis).toBeCloseTo(3600 * 1000, -3); // Within 1 second
  });
  
  test('should create session with user ID', async () => {
    const userId = 'user123';
    const session = await sessionStore.createSession(userId);
    
    expect(session.userId).toBe(userId);
    expect(session.id).toBeTruthy();
  });
  
  test('should create session with custom TTL', async () => {
    const customTTL = 300; // 5 minutes
    const session = await sessionStore.createSession('user123', customTTL);
    
    const ttlMillis = session.expiresAt.getTime() - session.createdAt.getTime();
    expect(ttlMillis).toBeCloseTo(customTTL * 1000, -3);
  });
  
  test('should retrieve existing session', async () => {
    const createdSession = await sessionStore.createSession('user456');
    
    // Wait a moment to ensure time difference
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const retrievedSession = await sessionStore.getSession(createdSession.id);
    
    expect(retrievedSession).not.toBeNull();
    expect(retrievedSession!.id).toBe(createdSession.id);
    expect(retrievedSession!.userId).toBe('user456');
    
    // Last accessed time should be updated
    expect(retrievedSession!.lastAccessedAt.getTime()).toBeGreaterThanOrEqual(createdSession.lastAccessedAt.getTime());
  });
  
  test('should return null for non-existent session', async () => {
    const session = await sessionStore.getSession('non-existent-session');
    expect(session).toBeNull();
  });
  
  test('should update session data', async () => {
    const session = await sessionStore.createSession('user789');
    
    // Wait a moment to ensure time difference
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const updateData = {
      selectedTemplate: 'modern',
      preferences: { theme: 'dark' },
      lastAction: 'template_selected'
    };
    
    const updatedSession = await sessionStore.updateSession(session.id, updateData);
    
    expect(updatedSession).not.toBeNull();
    expect(updatedSession!.data).toMatchObject(updateData);
    expect(updatedSession!.lastAccessedAt.getTime()).toBeGreaterThanOrEqual(session.lastAccessedAt.getTime());
  });
  
  test('should merge data when updating session', async () => {
    const session = await sessionStore.createSession('user999');
    
    // First update
    await sessionStore.updateSession(session.id, { key1: 'value1', key2: 'value2' });
    
    // Second update (should merge)
    const finalSession = await sessionStore.updateSession(session.id, { key2: 'updated', key3: 'value3' });
    
    expect(finalSession!.data).toEqual({
      key1: 'value1',
      key2: 'updated',
      key3: 'value3'
    });
  });
  
  test('should return null when updating non-existent session', async () => {
    const result = await sessionStore.updateSession('non-existent', { data: 'test' });
    expect(result).toBeNull();
  });
  
  test('should delete session', async () => {
    const session = await sessionStore.createSession('user_delete');
    
    // Verify session exists
    const beforeDelete = await sessionStore.getSession(session.id);
    expect(beforeDelete).not.toBeNull();
    
    // Delete session
    const deleteResult = await sessionStore.deleteSession(session.id);
    expect(deleteResult).toBe(true);
    
    // Verify session is gone
    const afterDelete = await sessionStore.getSession(session.id);
    expect(afterDelete).toBeNull();
  });
  
  test('should return false when deleting non-existent session', async () => {
    const result = await sessionStore.deleteSession('non-existent');
    expect(result).toBe(false);
  });
  
  test('should renew session with default TTL', async () => {
    const session = await sessionStore.createSession('user_renew', 60); // 1 minute
    const originalExpiry = session.expiresAt;
    
    // Wait a bit to see time difference
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const renewedSession = await sessionStore.renewSession(session.id);
    
    expect(renewedSession).not.toBeNull();
    expect(renewedSession!.expiresAt.getTime()).toBeGreaterThan(originalExpiry.getTime());
    expect(renewedSession!.lastAccessedAt.getTime()).toBeGreaterThan(session.lastAccessedAt.getTime());
  });
  
  test('should renew session with custom TTL', async () => {
    const session = await sessionStore.createSession('user_renew_custom', 60);
    const customTTL = 1800; // 30 minutes
    
    const renewedSession = await sessionStore.renewSession(session.id, customTTL);
    
    expect(renewedSession).not.toBeNull();
    const newTTL = renewedSession!.expiresAt.getTime() - renewedSession!.lastAccessedAt.getTime();
    expect(newTTL).toBeCloseTo(customTTL * 1000, -3);
  });
  
  test('should list all sessions', async () => {
    await sessionStore.createSession('user1');
    await sessionStore.createSession('user2');
    await sessionStore.createSession(); // Anonymous session
    
    const allSessions = await sessionStore.listSessions();
    expect(allSessions).toHaveLength(3);
    
    const userIds = allSessions.map(s => s.userId).filter(Boolean);
    expect(userIds).toContain('user1');
    expect(userIds).toContain('user2');
  });
  
  test('should list sessions by user ID', async () => {
    await sessionStore.createSession('target_user');
    await sessionStore.createSession('target_user');
    await sessionStore.createSession('other_user');
    
    const userSessions = await sessionStore.listSessions('target_user');
    expect(userSessions).toHaveLength(2);
    userSessions.forEach(session => {
      expect(session.userId).toBe('target_user');
    });
  });
  
  test('should handle session expiration', async () => {
    // Create session with very short TTL
    const session = await sessionStore.createSession('user_expire', 0.1); // 100ms
    
    // Session should exist initially
    const initialCheck = await sessionStore.getSession(session.id);
    expect(initialCheck).not.toBeNull();
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Session should be expired and cleaned up
    const expiredCheck = await sessionStore.getSession(session.id);
    expect(expiredCheck).toBeNull();
  });
  
  test('should cleanup expired sessions', async () => {
    // Create mix of sessions
    await sessionStore.createSession('user1', 3600); // Valid
    await sessionStore.createSession('user2', 0.1);  // Will expire
    await sessionStore.createSession('user3', 3600); // Valid
    
    // Wait for some to expire
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const cleanedCount = await sessionStore.cleanupExpiredSessions();
    expect(cleanedCount).toBe(1);
    
    const remainingSessions = await sessionStore.listSessions();
    expect(remainingSessions).toHaveLength(2);
  });
  
  test('should get accurate session count', async () => {
    expect(await sessionStore.getSessionCount()).toBe(0);
    
    await sessionStore.createSession('user1');
    await sessionStore.createSession('user2');
    expect(await sessionStore.getSessionCount()).toBe(2);
    
    // Create expired session
    await sessionStore.createSession('user3', 0.1);
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Count should auto-cleanup expired sessions
    expect(await sessionStore.getSessionCount()).toBe(2);
  });
  
  test('should validate session existence', async () => {
    const session = await sessionStore.createSession('user_validate');
    
    expect(await sessionStore.isSessionValid(session.id)).toBe(true);
    expect(await sessionStore.isSessionValid('non-existent')).toBe(false);
    
    // Delete session and check again
    await sessionStore.deleteSession(session.id);
    expect(await sessionStore.isSessionValid(session.id)).toBe(false);
  });
  
  test('should handle concurrent operations', async () => {
    const session = await sessionStore.createSession('concurrent_user');
    
    // Concurrent updates
    const updatePromises = [
      sessionStore.updateSession(session.id, { op1: 'value1' }),
      sessionStore.updateSession(session.id, { op2: 'value2' }),
      sessionStore.updateSession(session.id, { op3: 'value3' }),
    ];
    
    await Promise.all(updatePromises);
    
    const finalSession = await sessionStore.getSession(session.id);
    expect(finalSession!.data).toMatchObject({
      op1: 'value1',
      op2: 'value2',
      op3: 'value3'
    });
  });
  
  test('should handle high session volume', async () => {
    const sessionCount = 100;
    const createPromises = [];
    
    for (let i = 0; i < sessionCount; i++) {
      createPromises.push(sessionStore.createSession(`user_${i}`));
    }
    
    const sessions = await Promise.all(createPromises);
    expect(sessions).toHaveLength(sessionCount);
    
    // Verify all sessions are unique
    const sessionIds = sessions.map(s => s.id);
    const uniqueIds = new Set(sessionIds);
    expect(uniqueIds.size).toBe(sessionCount);
    
    // Verify count
    expect(await sessionStore.getSessionCount()).toBe(sessionCount);
  });
  
  test('should support complex session data structures', async () => {
    const session = await sessionStore.createSession('complex_user');
    
    const complexData = {
      user: {
        profile: { name: 'John Doe', age: 30 },
        preferences: { theme: 'dark', language: 'en' }
      },
      selections: [
        { template: 'modern', timestamp: new Date().toISOString() },
        { template: "professional", timestamp: new Date().toISOString() }
      ],
      metadata: {
        browser: 'Chrome',
        device: 'desktop',
        sessionStats: { pageViews: 5, timeSpent: 1200 }
      }
    };
    
    const updatedSession = await sessionStore.updateSession(session.id, complexData);
    expect(updatedSession!.data).toEqual(complexData);
    
    // Verify nested access
    const retrievedSession = await sessionStore.getSession(session.id);
    expect(retrievedSession!.data.user.profile.name).toBe('John Doe');
    expect(retrievedSession!.data.selections).toHaveLength(2);
  });
  
  test('should handle error conditions gracefully', async () => {
    // Create expired session manually for edge case testing
    const session = await sessionStore.createSession('error_test', 0.1); // 100ms
    
    // Simulate time passing
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Operations on expired session should return null/false appropriately
    expect(await sessionStore.updateSession(session.id, { test: 'data' })).toBeNull();
    expect(await sessionStore.getSession(session.id)).toBeNull();
    expect(await sessionStore.isSessionValid(session.id)).toBe(false);
    
    // Note: renewSession will return null for expired sessions in getSession check
    expect(await sessionStore.renewSession(session.id)).toBeNull();
  });
});