/**
 * Database Adapter
 * Abstracts database implementation (SQLite for dev, PostgreSQL for production)
 * Based on _aidev's database adapter pattern
 */

import { Database } from 'sqlite3';
import { Pool } from 'pg';

export interface DatabaseConfig {
  type: 'memory' | 'sqlite' | 'postgresql';
  connection?: {
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
  };
  filePath?: string; // For SQLite
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'tester' | 'viewer';
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface TestHistory {
  id: string;
  suiteId: string;
  userId: string;
  version: number;
  createdAt: Date;
  data: any; // JSON data of the test suite
  metadata: {
    sourceFile?: string;
    conversionType?: string;
    pluginsUsed?: string[];
  };
}

export interface TestExecution {
  id: string;
  historyId: string;
  userId: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  results?: any; // JSON results
  notes?: string;
}

export interface UserSession {
  id: string;
  userId: string;
  token: string;
  createdAt: Date;
  expiresAt: Date;
  metadata?: any;
}

export abstract class DatabaseAdapter {
  protected config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  
  // User management
  abstract createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User>;
  abstract getUser(id: string): Promise<User | null>;
  abstract getUserByUsername(username: string): Promise<User | null>;
  abstract updateUser(id: string, updates: Partial<User>): Promise<User>;
  abstract deleteUser(id: string): Promise<void>;

  // Test history
  abstract createTestHistory(history: Omit<TestHistory, 'id' | 'createdAt'>): Promise<TestHistory>;
  abstract getTestHistory(id: string): Promise<TestHistory | null>;
  abstract getTestHistoryBySuite(suiteId: string): Promise<TestHistory[]>;
  abstract getLatestVersion(suiteId: string): Promise<TestHistory | null>;
  abstract compareVersions(suiteId: string, version1: number, version2: number): Promise<any>;

  // Test execution
  abstract createTestExecution(execution: Omit<TestExecution, 'id'>): Promise<TestExecution>;
  abstract updateTestExecution(id: string, updates: Partial<TestExecution>): Promise<TestExecution>;
  abstract getTestExecution(id: string): Promise<TestExecution | null>;
  abstract getExecutionsByHistory(historyId: string): Promise<TestExecution[]>;
  abstract getExecutionsByUser(userId: string, limit?: number): Promise<TestExecution[]>;

  // Session management
  abstract createSession(session: Omit<UserSession, 'id' | 'createdAt'>): Promise<UserSession>;
  abstract getSession(token: string): Promise<UserSession | null>;
  abstract updateSession(id: string, updates: Partial<UserSession>): Promise<UserSession>;
  abstract deleteSession(id: string): Promise<void>;
  abstract cleanExpiredSessions(): Promise<number>;

  // Analytics
  abstract getTestStatistics(userId?: string): Promise<{
    totalSuites: number;
    totalExecutions: number;
    avgExecutionTime: number;
    successRate: number;
  }>;

  abstract getMostUsedPlugins(): Promise<Array<{ plugin: string; count: number }>>;
}

// Memory adapter for testing
export class MemoryDatabaseAdapter extends DatabaseAdapter {
  private users = new Map<string, User>();
  private testHistories = new Map<string, TestHistory>();
  private executions = new Map<string, TestExecution>();
  private sessions = new Map<string, UserSession>();

  async connect(): Promise<void> {
    console.log('Memory database connected');
  }

  async disconnect(): Promise<void> {
    console.log('Memory database disconnected');
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const user: User = {
      ...userData,
      id: `user-${Date.now()}`,
      createdAt: new Date()
    };
    this.users.set(user.id, user);
    return user;
  }

  async getUser(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.username === username) return user;
    }
    return null;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error('User not found');
    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    this.users.delete(id);
  }

  async createTestHistory(historyData: Omit<TestHistory, 'id' | 'createdAt'>): Promise<TestHistory> {
    const history: TestHistory = {
      ...historyData,
      id: `history-${Date.now()}`,
      createdAt: new Date()
    };
    this.testHistories.set(history.id, history);
    return history;
  }

  async getTestHistory(id: string): Promise<TestHistory | null> {
    return this.testHistories.get(id) || null;
  }

  async getTestHistoryBySuite(suiteId: string): Promise<TestHistory[]> {
    const histories: TestHistory[] = [];
    for (const history of this.testHistories.values()) {
      if (history.suiteId === suiteId) {
        histories.push(history);
      }
    }
    return histories.sort((a, b) => b.version - a.version);
  }

  async getLatestVersion(suiteId: string): Promise<TestHistory | null> {
    const histories = await this.getTestHistoryBySuite(suiteId);
    return histories[0] || null;
  }

  async compareVersions(suiteId: string, version1: number, version2: number): Promise<any> {
    const histories = await this.getTestHistoryBySuite(suiteId);
    const v1 = histories.find(h => h.version === version1);
    const v2 = histories.find(h => h.version === version2);
    
    if (!v1 || !v2) throw new Error('Version not found');
    
    return {
      version1: v1.data,
      version2: v2.data,
      differences: this.calculateDifferences(v1.data, v2.data)
    };
  }

  private calculateDifferences(data1: any, data2: any): any {
    // Simple difference calculation
    return {
      added: [],
      removed: [],
      modified: []
    };
  }

  async createTestExecution(executionData: Omit<TestExecution, 'id'>): Promise<TestExecution> {
    const execution: TestExecution = {
      ...executionData,
      id: `exec-${Date.now()}`
    };
    this.executions.set(execution.id, execution);
    return execution;
  }

  async updateTestExecution(id: string, updates: Partial<TestExecution>): Promise<TestExecution> {
    const execution = this.executions.get(id);
    if (!execution) throw new Error('Execution not found');
    const updated = { ...execution, ...updates };
    this.executions.set(id, updated);
    return updated;
  }

  async getTestExecution(id: string): Promise<TestExecution | null> {
    return this.executions.get(id) || null;
  }

  async getExecutionsByHistory(historyId: string): Promise<TestExecution[]> {
    const executions: TestExecution[] = [];
    for (const exec of this.executions.values()) {
      if (exec.historyId === historyId) {
        executions.push(exec);
      }
    }
    return executions;
  }

  async getExecutionsByUser(userId: string, limit: number = 50): Promise<TestExecution[]> {
    const executions: TestExecution[] = [];
    for (const exec of this.executions.values()) {
      if (exec.userId === userId) {
        executions.push(exec);
      }
    }
    return executions
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(0, limit);
  }

  async createSession(sessionData: Omit<UserSession, 'id' | 'createdAt'>): Promise<UserSession> {
    const session: UserSession = {
      ...sessionData,
      id: `session-${Date.now()}`,
      createdAt: new Date()
    };
    this.sessions.set(session.token, session);
    return session;
  }

  async getSession(token: string): Promise<UserSession | null> {
    return this.sessions.get(token) || null;
  }

  async updateSession(id: string, updates: Partial<UserSession>): Promise<UserSession> {
    for (const session of this.sessions.values()) {
      if (session.id === id) {
        const updated = { ...session, ...updates };
        this.sessions.set(session.token, updated);
        return updated;
      }
    }
    throw new Error('Session not found');
  }

  async deleteSession(id: string): Promise<void> {
    for (const [token, session] of this.sessions.entries()) {
      if (session.id === id) {
        this.sessions.delete(token);
        return;
      }
    }
  }

  async cleanExpiredSessions(): Promise<number> {
    const now = new Date();
    let count = 0;
    for (const [token, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(token);
        count++;
      }
    }
    return count;
  }

  async getTestStatistics(userId?: string): Promise<{
    totalSuites: number;
    totalExecutions: number;
    avgExecutionTime: number;
    successRate: number;
  }> {
    let totalSuites = 0;
    let totalExecutions = 0;
    let totalTime = 0;
    let successCount = 0;

    const userHistories = new Set<string>();
    
    for (const exec of this.executions.values()) {
      if (!userId || exec.userId === userId) {
        totalExecutions++;
        userHistories.add(exec.historyId);
        
        if (exec.completedAt) {
          totalTime += exec.completedAt.getTime() - exec.startedAt.getTime();
        }
        
        if (exec.status === 'completed') {
          successCount++;
        }
      }
    }

    totalSuites = userHistories.size;
    const avgExecutionTime = totalExecutions > 0 ? totalTime / totalExecutions : 0;
    const successRate = totalExecutions > 0 ? (successCount / totalExecutions) * 100 : 0;

    return {
      totalSuites,
      totalExecutions,
      avgExecutionTime,
      successRate
    };
  }

  async getMostUsedPlugins(): Promise<Array<{ plugin: string; count: number }>> {
    const pluginCounts = new Map<string, number>();
    
    for (const history of this.testHistories.values()) {
      if (history.metadata.pluginsUsed) {
        for (const plugin of history.metadata.pluginsUsed) {
          pluginCounts.set(plugin, (pluginCounts.get(plugin) || 0) + 1);
        }
      }
    }

    return Array.from(pluginCounts.entries())
      .map(([plugin, count]) => ({ plugin, count }))
      .sort((a, b) => b.count - a.count);
  }
}