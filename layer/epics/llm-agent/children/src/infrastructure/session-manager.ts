/**
 * Session Manager implementation
 */

import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import { path } from '../../layer/themes/infra_external-log-lib/src';
import {
  ISessionManager,
  Session,
  SessionOptions,
  SessionInfo,
  Message
} from '../../xlib/interfaces/infrastructure.interfaces';

export class SessionManager implements ISessionManager {
  private sessions: Map<string, Session>;
  private sessionPath: string;
  private autoSave: boolean;
  private maxMessageHistory: number;

  constructor(config?: {
    sessionPath?: string;
    autoSave?: boolean;
    maxMessageHistory?: number;
  }) {
    this.sessions = new Map();
    this.sessionPath = config?.sessionPath || './sessions';
    this.autoSave = config?.autoSave ?? true;
    this.maxMessageHistory = config?.maxMessageHistory ?? 1000;

    // Load sessions on startup
    this.loadSessionsFromDisk().catch(console.error);
  }

  async createSession(agentId: string, options?: SessionOptions): Promise<Session> {
    const sessionId = uuidv4();
    const now = new Date();
    
    const session: Session = {
      id: sessionId,
      agentId,
      created: now,
      updated: now,
      messages: [],
      context: options?.initialContext || {},
      metadata: {}
    };

    if (options?.expiresIn) {
      session.expires = new Date(now.getTime() + options.expiresIn);
    }

    this.sessions.set(sessionId, session);

    if (this.autoSave && options?.persistent !== false) {
      await this.saveSessionToDisk(session);
    }

    return session;
  }

  async loadSession(sessionId: string): Promise<Session | null> {
    // Check memory first
    let session = this.sessions.get(sessionId);
    if (session) {
      return session;
    }

    // Try to load from disk
    try {
      const filePath = path.join(this.sessionPath, `${sessionId}.json`);
      const data = await fileAPI.readFile(filePath, 'utf-8');
      session = JSON.parse(data, this.reviveSession);
      
      // Check if session is expired
      if (session.expires && new Date(session.expires) < new Date()) {
        await this.deleteSession(sessionId);
        return null;
      }

      this.sessions.set(sessionId, session);
      return session;
    } catch (error) {
      return null;
    }
  }

  async saveSession(session: Session): Promise<void> {
    // Update in memory
    session.updated = new Date();
    this.sessions.set(session.id, session);

    // Trim message history if needed
    if (session.messages.length > this.maxMessageHistory) {
      session.messages = session.messages.slice(-this.maxMessageHistory);
    }

    // Save to disk if auto-save enabled
    if (this.autoSave) {
      await this.saveSessionToDisk(session);
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);

    // Delete from disk
    try {
      const filePath = path.join(this.sessionPath, `${sessionId}.json`);
      await fileAPI.unlink(filePath);
    } catch (error) {
      // Ignore file not found errors
    }
  }

  async listSessions(agentId?: string): Promise<SessionInfo[]> {
    const sessions: SessionInfo[] = [];

    // List from memory
    for (const session of this.sessions.values()) {
      if (!agentId || session.agentId === agentId) {
        sessions.push(this.getSessionInfo(session));
      }
    }

    // Also check disk for sessions not in memory
    try {
      await fileAPI.createDirectory(this.sessionPath);
      const files = await fs.readdir(this.sessionPath);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const sessionId = file.replace('.json', '');
          
          // Skip if already in memory
          if (this.sessions.has(sessionId)) continue;

          const session = await this.loadSession(sessionId);
          if (session && (!agentId || session.agentId === agentId)) {
            sessions.push(this.getSessionInfo(session));
          }
        }
      }
    } catch (error) {
      console.error('Error listing sessions from disk:', error);
    }

    return sessions;
  }

  getActiveSessionCount(): number {
    let count = 0;
    const now = new Date();

    for (const session of this.sessions.values()) {
      if (!session.expires || session.expires > now) {
        count++;
      }
    }

    return count;
  }

  async cleanupExpiredSessions(): Promise<number> {
    const now = new Date();
    const expiredSessions: string[] = [];

    // Find expired sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expires && session.expires < now) {
        expiredSessions.push(sessionId);
      }
    }

    // Delete expired sessions
    for (const sessionId of expiredSessions) {
      await this.deleteSession(sessionId);
    }

    return expiredSessions.length;
  }

  // Helper methods
  async addMessage(sessionId: string, message: Message): Promise<void> {
    const session = await this.loadSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Add message ID and timestamp if not present
    if (!message.id) {
      message.id = uuidv4();
    }
    if (!message.timestamp) {
      message.timestamp = new Date();
    }

    session.messages.push(message);
    await this.saveSession(session);
  }

  async updateContext(sessionId: string, updates: Record<string, any>): Promise<void> {
    const session = await this.loadSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.context = { ...session.context, ...updates };
    await this.saveSession(session);
  }

  // Private helper methods
  private getSessionInfo(session: Session): SessionInfo {
    const now = new Date();
    return {
      id: session.id,
      agentId: session.agentId,
      created: session.created,
      updated: session.updated,
      messageCount: session.messages.length,
      active: !session.expires || session.expires > now
    };
  }

  private async saveSessionToDisk(session: Session): Promise<void> {
    try {
      await fileAPI.createDirectory(this.sessionPath);
      const filePath = path.join(this.sessionPath, `${session.id}.json`);
      const data = JSON.stringify(session, null, 2);
      await fileAPI.createFile(filePath, data, { type: FileType.TEMPORARY });
    } catch (error) {
      console.error(`Error saving session ${session.id}:`, error);
      throw error;
    }
  }

  private async loadSessionsFromDisk(): Promise<void> {
    try {
      await fileAPI.createDirectory(this.sessionPath);
      const files = await fs.readdir(this.sessionPath);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const sessionId = file.replace('.json', '');
          await this.loadSession(sessionId);
        }
      }
    } catch (error) {
      console.error('Error loading sessions from disk:', error);
    }
  }

  private reviveSession(key: string, value: any): any {
    // Convert date strings back to Date objects
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      return new Date(value);
    }
    return value;
  }

  // Export/Import functionality
  async exportSession(sessionId: string): Promise<string> {
    const session = await this.loadSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    return JSON.stringify(session, null, 2);
  }

  async importSession(sessionData: string): Promise<Session> {
    const session = JSON.parse(sessionData, this.reviveSession);
    
    // Generate new ID to avoid conflicts
    session.id = uuidv4();
    session.updated = new Date();

    this.sessions.set(session.id, session);
    
    if (this.autoSave) {
      await this.saveSessionToDisk(session);
    }

    return session;
  }
}

// Singleton instance
let sessionManagerInstance: SessionManager | null = null;

export function getSessionManager(config?: {
  sessionPath?: string;
  autoSave?: boolean;
  maxMessageHistory?: number;
}): SessionManager {
  if (!sessionManagerInstance) {
    sessionManagerInstance = new SessionManager(config);
  }
  return sessionManagerInstance;
}