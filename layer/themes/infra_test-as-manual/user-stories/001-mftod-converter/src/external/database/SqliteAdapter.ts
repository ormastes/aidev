/**
 * SQLite Database Adapter
 * Implementation for local development and testing
 */

import { Database } from 'sqlite3';
import { promisify } from 'node:util';
import { DatabaseAdapter, User, TestHistory, TestExecution, UserSession } from './DatabaseAdapter';
import { path } from '../../../../../../infra_external-log-lib/src';
import { fs } from '../../../../../../infra_external-log-lib/src';

export class SqliteAdapter extends DatabaseAdapter {
  private db: Database | null = null;
  private dbPath: string;

  constructor(config: any) {
    super(config);
    this.dbPath = config.filePath || path.join(process.cwd(), 'test-manual.db');
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new Database(this.dbPath, async (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`Connected to SQLite database: ${this.dbPath}`);
          await this.initializeTables();
          resolve();
        }
      });
    });
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  }

  private async initializeTables(): Promise<void> {
    if (!this.db) throw new Error('Database not connected');

    const run = promisify(this.db.run.bind(this.db));

    // Users table
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login_at DATETIME
      )
    `);

    // Test history table
    await run(`
      CREATE TABLE IF NOT EXISTS test_history (
        id TEXT PRIMARY KEY,
        suite_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        data TEXT NOT NULL,
        metadata TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE (suite_id, version)
      )
    `);

    // Test executions table
    await run(`
      CREATE TABLE IF NOT EXISTS test_executions (
        id TEXT PRIMARY KEY,
        history_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        started_at DATETIME NOT NULL,
        completed_at DATETIME,
        status TEXT NOT NULL,
        results TEXT,
        notes TEXT,
        FOREIGN KEY (history_id) REFERENCES test_history(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // User sessions table
    await run(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        metadata TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Indexes for performance
    await run('CREATE INDEX IF NOT EXISTS idx_test_history_suite ON test_history(suite_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_test_executions_history ON test_executions(history_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_test_executions_user ON test_executions(user_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token)');
    await run('CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at)');
  }

  // Helper methods for promisifying
  private get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not connected'));
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  private all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not connected'));
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  private run(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not connected'));
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  // User management
  async createUser(userData: Omit<User, 'id' | "createdAt">): Promise<User> {
    const id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const sql = `
      INSERT INTO users (id, username, email, role)
      VALUES (?, ?, ?, ?)
    `;
    
    await this.run(sql, [id, userData.username, userData.email, userData.role]);
    
    return {
      ...userData,
      id,
      createdAt: new Date()
    };
  }

  async getUser(id: string): Promise<User | null> {
    const row = await this.get('SELECT * FROM users WHERE id = ?', [id]);
    if (!row) return null;
    
    return this.rowToUser(row);
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const row = await this.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!row) return null;
    
    return this.rowToUser(row);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const setClauses: string[] = [];
    const values: any[] = [];
    
    if (updates.email) {
      setClauses.push('email = ?');
      values.push(updates.email);
    }
    if (updates.role) {
      setClauses.push('role = ?');
      values.push(updates.role);
    }
    if (updates.lastLoginAt) {
      setClauses.push('last_login_at = ?');
      values.push(updates.lastLoginAt.toISOString());
    }
    
    values.push(id);
    
    await this.run(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );
    
    const user = await this.getUser(id);
    if (!user) throw new Error('User not found');
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await this.run('DELETE FROM users WHERE id = ?', [id]);
  }

  // Test history
  async createTestHistory(historyData: Omit<TestHistory, 'id' | "createdAt">): Promise<TestHistory> {
    const id = `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const sql = `
      INSERT INTO test_history (id, suite_id, user_id, version, data, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    await this.run(sql, [
      id,
      historyData.suiteId,
      historyData.userId,
      historyData.version,
      JSON.stringify(historyData.data),
      JSON.stringify(historyData.metadata)
    ]);
    
    return {
      ...historyData,
      id,
      createdAt: new Date()
    };
  }

  async getTestHistory(id: string): Promise<TestHistory | null> {
    const row = await this.get('SELECT * FROM test_history WHERE id = ?', [id]);
    if (!row) return null;
    
    return this.rowToTestHistory(row);
  }

  async getTestHistoryBySuite(suiteId: string): Promise<TestHistory[]> {
    const rows = await this.all(
      'SELECT * FROM test_history WHERE suite_id = ? ORDER BY version DESC',
      [suiteId]
    );
    
    return rows.map(row => this.rowToTestHistory(row));
  }

  async getLatestVersion(suiteId: string): Promise<TestHistory | null> {
    const row = await this.get(
      'SELECT * FROM test_history WHERE suite_id = ? ORDER BY version DESC LIMIT 1',
      [suiteId]
    );
    
    if (!row) return null;
    return this.rowToTestHistory(row);
  }

  async compareVersions(suiteId: string, version1: number, version2: number): Promise<any> {
    const rows = await this.all(
      'SELECT * FROM test_history WHERE suite_id = ? AND version IN (?, ?)',
      [suiteId, version1, version2]
    );
    
    const v1 = rows.find(r => r.version === version1);
    const v2 = rows.find(r => r.version === version2);
    
    if (!v1 || !v2) throw new Error('Version not found');
    
    return {
      version1: JSON.parse(v1.data),
      version2: JSON.parse(v2.data),
      differences: this.calculateDifferences(JSON.parse(v1.data), JSON.parse(v2.data))
    };
  }

  private calculateDifferences(data1: any, data2: any): any {
    // Implement actual diff logic
    return {
      added: [],
      removed: [],
      modified: []
    };
  }

  // Test execution
  async createTestExecution(executionData: Omit<TestExecution, 'id'>): Promise<TestExecution> {
    const id = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const sql = `
      INSERT INTO test_executions (id, history_id, user_id, started_at, completed_at, status, results, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.run(sql, [
      id,
      executionData.historyId,
      executionData.userId,
      executionData.startedAt.toISOString(),
      executionData.completedAt?.toISOString() || null,
      executionData.status,
      executionData.results ? JSON.stringify(executionData.results) : null,
      executionData.notes || null
    ]);
    
    return { ...executionData, id };
  }

  async updateTestExecution(id: string, updates: Partial<TestExecution>): Promise<TestExecution> {
    const setClauses: string[] = [];
    const values: any[] = [];
    
    if (updates.completedAt) {
      setClauses.push('completed_at = ?');
      values.push(updates.completedAt.toISOString());
    }
    if (updates.status) {
      setClauses.push('status = ?');
      values.push(updates.status);
    }
    if (updates.results) {
      setClauses.push('results = ?');
      values.push(JSON.stringify(updates.results));
    }
    if (updates.notes !== undefined) {
      setClauses.push('notes = ?');
      values.push(updates.notes);
    }
    
    values.push(id);
    
    await this.run(
      `UPDATE test_executions SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );
    
    const execution = await this.getTestExecution(id);
    if (!execution) throw new Error('Execution not found');
    return execution;
  }

  async getTestExecution(id: string): Promise<TestExecution | null> {
    const row = await this.get('SELECT * FROM test_executions WHERE id = ?', [id]);
    if (!row) return null;
    
    return this.rowToTestExecution(row);
  }

  async getExecutionsByHistory(historyId: string): Promise<TestExecution[]> {
    const rows = await this.all(
      'SELECT * FROM test_executions WHERE history_id = ? ORDER BY started_at DESC',
      [historyId]
    );
    
    return rows.map(row => this.rowToTestExecution(row));
  }

  async getExecutionsByUser(userId: string, limit: number = 50): Promise<TestExecution[]> {
    const rows = await this.all(
      'SELECT * FROM test_executions WHERE user_id = ? ORDER BY started_at DESC LIMIT ?',
      [userId, limit]
    );
    
    return rows.map(row => this.rowToTestExecution(row));
  }

  // Session management
  async createSession(sessionData: Omit<UserSession, 'id' | "createdAt">): Promise<UserSession> {
    const id = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const sql = `
      INSERT INTO user_sessions (id, user_id, token, expires_at, metadata)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    await this.run(sql, [
      id,
      sessionData.userId,
      sessionData.token,
      sessionData.expiresAt.toISOString(),
      sessionData.metadata ? JSON.stringify(sessionData.metadata) : null
    ]);
    
    return {
      ...sessionData,
      id,
      createdAt: new Date()
    };
  }

  async getSession(token: string): Promise<UserSession | null> {
    const row = await this.get('SELECT * FROM user_sessions WHERE token = ?', [token]);
    if (!row) return null;
    
    return this.rowToUserSession(row);
  }

  async updateSession(id: string, updates: Partial<UserSession>): Promise<UserSession> {
    const setClauses: string[] = [];
    const values: any[] = [];
    
    if (updates.expiresAt) {
      setClauses.push('expires_at = ?');
      values.push(updates.expiresAt.toISOString());
    }
    if (updates.metadata) {
      setClauses.push('metadata = ?');
      values.push(JSON.stringify(updates.metadata));
    }
    
    values.push(id);
    
    await this.run(
      `UPDATE user_sessions SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );
    
    const session = await this.get('SELECT * FROM user_sessions WHERE id = ?', [id]);
    if (!session) throw new Error('Session not found');
    
    return this.rowToUserSession(session);
  }

  async deleteSession(id: string): Promise<void> {
    await this.run('DELETE FROM user_sessions WHERE id = ?', [id]);
  }

  async cleanExpiredSessions(): Promise<number> {
    const result = await this.run(
      'DELETE FROM user_sessions WHERE expires_at < datetime("now")'
    );
    return result.changes;
  }

  // Analytics
  async getTestStatistics(userId?: string): Promise<{
    totalSuites: number;
    totalExecutions: number;
    avgExecutionTime: number;
    successRate: number;
  }> {
    let userClause = '';
    const params: any[] = [];
    
    if (userId) {
      userClause = ' WHERE e.user_id = ?';
      params.push(userId);
    }

    const stats = await this.get(`
      SELECT 
        COUNT(DISTINCT h.suite_id) as total_suites,
        COUNT(DISTINCT e.id) as total_executions,
        AVG(
          CASE 
            WHEN e.completed_at IS NOT NULL 
            THEN (julianday(e.completed_at) - julianday(e.started_at)) * 24 * 60 * 60 * 1000
            ELSE NULL 
          END
        ) as avg_execution_time,
        (COUNT(CASE WHEN e.status = "completed" THEN 1 END) * 100.0 / COUNT(*)) as success_rate
      FROM test_executions e
      JOIN test_history h ON e.history_id = h.id
      ${userClause}
    `, params);

    return {
      totalSuites: stats.total_suites || 0,
      totalExecutions: stats.total_executions || 0,
      avgExecutionTime: stats.avg_execution_time || 0,
      successRate: stats.success_rate || 0
    };
  }

  async getMostUsedPlugins(): Promise<Array<{ plugin: string; count: number }>> {
    const rows = await this.all(`
      SELECT plugin, COUNT(*) as count
      FROM (
        SELECT json_extract(value, '$') as plugin
        FROM test_history, json_each(json_extract(metadata, '$.pluginsUsed'))
        WHERE json_extract(metadata, '$.pluginsUsed') IS NOT NULL
      )
      GROUP BY plugin
      ORDER BY count DESC
      LIMIT 10
    `);

    return rows.map(row => ({
      plugin: row.plugin,
      count: row.count
    }));
  }

  // Row conversion helpers
  private rowToUser(row: any): User {
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      role: row.role,
      createdAt: new Date(row.created_at),
      lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : undefined
    };
  }

  private rowToTestHistory(row: any): TestHistory {
    return {
      id: row.id,
      suiteId: row.suite_id,
      userId: row.user_id,
      version: row.version,
      createdAt: new Date(row.created_at),
      data: JSON.parse(row.data),
      metadata: row.metadata ? JSON.parse(row.metadata) : {}
    };
  }

  private rowToTestExecution(row: any): TestExecution {
    return {
      id: row.id,
      historyId: row.history_id,
      userId: row.user_id,
      startedAt: new Date(row.started_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      status: row.status,
      results: row.results ? JSON.parse(row.results) : undefined,
      notes: row.notes || undefined
    };
  }

  private rowToUserSession(row: any): UserSession {
    return {
      id: row.id,
      userId: row.user_id,
      token: row.token,
      createdAt: new Date(row.created_at),
      expiresAt: new Date(row.expires_at),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    };
  }
}