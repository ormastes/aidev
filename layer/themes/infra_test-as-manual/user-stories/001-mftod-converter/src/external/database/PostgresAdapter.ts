/**
 * PostgreSQL Database Adapter
 * Production database implementation
 */

import { Pool, PoolClient } from 'pg';
import { DatabaseAdapter, User, TestHistory, TestExecution, UserSession } from './DatabaseAdapter';

export class PostgresAdapter extends DatabaseAdapter {
  private pool: Pool | null = null;

  async connect(): Promise<void> {
    this.pool = new Pool({
      host: this.config.connection?.host || "localhost",
      port: this.config.connection?.port || 5432,
      database: this.config.connection?.database || "testmanual",
      user: this.config.connection?.user || "postgres",
      password: this.config.connection?.password || "postgres",
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test connection
    const client = await this.pool.connect();
    try {
      await client.query('SELECT NOW()');
      console.log('Connected to PostgreSQL database');
      await this.initializeTables();
    } finally {
      client.release();
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      console.log('Disconnected from PostgreSQL database');
    }
  }

  private async initializeTables(): Promise<void> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');

      // Users table
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          role VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_login_at TIMESTAMP
        )
      `);

      // Test history table
      await client.query(`
        CREATE TABLE IF NOT EXISTS test_history (
          id VARCHAR(255) PRIMARY KEY,
          suite_id VARCHAR(255) NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          version INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          data JSONB NOT NULL,
          metadata JSONB,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE (suite_id, version)
        )
      `);

      // Test executions table
      await client.query(`
        CREATE TABLE IF NOT EXISTS test_executions (
          id VARCHAR(255) PRIMARY KEY,
          history_id VARCHAR(255) NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          started_at TIMESTAMP NOT NULL,
          completed_at TIMESTAMP,
          status VARCHAR(50) NOT NULL,
          results JSONB,
          notes TEXT,
          FOREIGN KEY (history_id) REFERENCES test_history(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // User sessions table
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          token VARCHAR(255) UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP NOT NULL,
          metadata JSONB,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // Indexes
      await client.query('CREATE INDEX IF NOT EXISTS idx_test_history_suite ON test_history(suite_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_test_history_user ON test_history(user_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_test_executions_history ON test_executions(history_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_test_executions_user ON test_executions(user_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_test_history_metadata_plugins ON test_history USING gin ((metadata->>\'pluginsUsed\'))');

      await client.query('COMMIT');
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async getClient(): Promise<PoolClient> {
    if (!this.pool) throw new Error('Database not connected');
    return this.pool.connect();
  }

  // User management
  async createUser(userData: Omit<User, 'id' | "createdAt">): Promise<User> {
    const client = await this.getClient();
    try {
      const id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const result = await client.query(
        `INSERT INTO users (id, username, email, role) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [id, userData.username, userData.email, userData.role]
      );
      
      return this.rowToUser(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async getUser(id: string): Promise<User | null> {
    const client = await this.getClient();
    try {
      const result = await client.query('SELECT * FROM users WHERE id = $1', [id]);
      return result.rows[0] ? this.rowToUser(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const client = await this.getClient();
    try {
      const result = await client.query('SELECT * FROM users WHERE username = $1', [username]);
      return result.rows[0] ? this.rowToUser(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const client = await this.getClient();
    try {
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.email) {
        setClauses.push(`email = $${paramIndex++}`);
        values.push(updates.email);
      }
      if (updates.role) {
        setClauses.push(`role = $${paramIndex++}`);
        values.push(updates.role);
      }
      if (updates.lastLoginAt) {
        setClauses.push(`last_login_at = $${paramIndex++}`);
        values.push(updates.lastLoginAt);
      }

      values.push(id);
      
      const result = await client.query(
        `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );
      
      if (!result.rows[0]) throw new Error('User not found');
      return this.rowToUser(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async deleteUser(id: string): Promise<void> {
    const client = await this.getClient();
    try {
      await client.query('DELETE FROM users WHERE id = $1', [id]);
    } finally {
      client.release();
    }
  }

  // Test history
  async createTestHistory(historyData: Omit<TestHistory, 'id' | "createdAt">): Promise<TestHistory> {
    const client = await this.getClient();
    try {
      const id = `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const result = await client.query(
        `INSERT INTO test_history (id, suite_id, user_id, version, data, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          id,
          historyData.suiteId,
          historyData.userId,
          historyData.version,
          historyData.data,
          historyData.metadata
        ]
      );
      
      return this.rowToTestHistory(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async getTestHistory(id: string): Promise<TestHistory | null> {
    const client = await this.getClient();
    try {
      const result = await client.query('SELECT * FROM test_history WHERE id = $1', [id]);
      return result.rows[0] ? this.rowToTestHistory(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  async getTestHistoryBySuite(suiteId: string): Promise<TestHistory[]> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        'SELECT * FROM test_history WHERE suite_id = $1 ORDER BY version DESC',
        [suiteId]
      );
      return result.rows.map(row => this.rowToTestHistory(row));
    } finally {
      client.release();
    }
  }

  async getLatestVersion(suiteId: string): Promise<TestHistory | null> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        'SELECT * FROM test_history WHERE suite_id = $1 ORDER BY version DESC LIMIT 1',
        [suiteId]
      );
      return result.rows[0] ? this.rowToTestHistory(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  async compareVersions(suiteId: string, version1: number, version2: number): Promise<any> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        'SELECT * FROM test_history WHERE suite_id = $1 AND version IN ($2, $3)',
        [suiteId, version1, version2]
      );
      
      const v1 = result.rows.find(r => r.version === version1);
      const v2 = result.rows.find(r => r.version === version2);
      
      if (!v1 || !v2) throw new Error('Version not found');
      
      return {
        version1: v1.data,
        version2: v2.data,
        differences: this.calculateDifferences(v1.data, v2.data)
      };
    } finally {
      client.release();
    }
  }

  private calculateDifferences(data1: any, data2: any): any {
    // Implement comprehensive diff logic
    const differences = {
      added: [] as any[],
      removed: [] as any[],
      modified: [] as any[]
    };

    // Compare procedures
    const procs1 = new Map(data1.procedures?.map((p: any) => [p.id, p]) || []);
    const procs2 = new Map(data2.procedures?.map((p: any) => [p.id, p]) || []);

    // Find added
    for (const [id, proc] of procs2) {
      if (!procs1.has(id)) {
        differences.added.push({ type: "procedure", item: proc });
      }
    }

    // Find removed
    for (const [id, proc] of procs1) {
      if (!procs2.has(id)) {
        differences.removed.push({ type: "procedure", item: proc });
      }
    }

    // Find modified
    for (const [id, proc1] of procs1) {
      const proc2 = procs2.get(id);
      if (proc2 && JSON.stringify(proc1) !== JSON.stringify(proc2)) {
        differences.modified.push({
          type: "procedure",
          before: proc1,
          after: proc2
        });
      }
    }

    return differences;
  }

  // Test execution
  async createTestExecution(executionData: Omit<TestExecution, 'id'>): Promise<TestExecution> {
    const client = await this.getClient();
    try {
      const id = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const result = await client.query(
        `INSERT INTO test_executions (id, history_id, user_id, started_at, completed_at, status, results, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          id,
          executionData.historyId,
          executionData.userId,
          executionData.startedAt,
          executionData.completedAt,
          executionData.status,
          executionData.results,
          executionData.notes
        ]
      );
      
      return this.rowToTestExecution(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async updateTestExecution(id: string, updates: Partial<TestExecution>): Promise<TestExecution> {
    const client = await this.getClient();
    try {
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.completedAt) {
        setClauses.push(`completed_at = $${paramIndex++}`);
        values.push(updates.completedAt);
      }
      if (updates.status) {
        setClauses.push(`status = $${paramIndex++}`);
        values.push(updates.status);
      }
      if (updates.results) {
        setClauses.push(`results = $${paramIndex++}`);
        values.push(updates.results);
      }
      if (updates.notes !== undefined) {
        setClauses.push(`notes = $${paramIndex++}`);
        values.push(updates.notes);
      }

      values.push(id);
      
      const result = await client.query(
        `UPDATE test_executions SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );
      
      if (!result.rows[0]) throw new Error('Execution not found');
      return this.rowToTestExecution(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async getTestExecution(id: string): Promise<TestExecution | null> {
    const client = await this.getClient();
    try {
      const result = await client.query('SELECT * FROM test_executions WHERE id = $1', [id]);
      return result.rows[0] ? this.rowToTestExecution(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  async getExecutionsByHistory(historyId: string): Promise<TestExecution[]> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        'SELECT * FROM test_executions WHERE history_id = $1 ORDER BY started_at DESC',
        [historyId]
      );
      return result.rows.map(row => this.rowToTestExecution(row));
    } finally {
      client.release();
    }
  }

  async getExecutionsByUser(userId: string, limit: number = 50): Promise<TestExecution[]> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        'SELECT * FROM test_executions WHERE user_id = $1 ORDER BY started_at DESC LIMIT $2',
        [userId, limit]
      );
      return result.rows.map(row => this.rowToTestExecution(row));
    } finally {
      client.release();
    }
  }

  // Session management
  async createSession(sessionData: Omit<UserSession, 'id' | "createdAt">): Promise<UserSession> {
    const client = await this.getClient();
    try {
      const id = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const result = await client.query(
        `INSERT INTO user_sessions (id, user_id, token, expires_at, metadata)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          id,
          sessionData.userId,
          sessionData.token,
          sessionData.expiresAt,
          sessionData.metadata
        ]
      );
      
      return this.rowToUserSession(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async getSession(token: string): Promise<UserSession | null> {
    const client = await this.getClient();
    try {
      const result = await client.query('SELECT * FROM user_sessions WHERE token = $1', [token]);
      return result.rows[0] ? this.rowToUserSession(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  async updateSession(id: string, updates: Partial<UserSession>): Promise<UserSession> {
    const client = await this.getClient();
    try {
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.expiresAt) {
        setClauses.push(`expires_at = $${paramIndex++}`);
        values.push(updates.expiresAt);
      }
      if (updates.metadata) {
        setClauses.push(`metadata = $${paramIndex++}`);
        values.push(updates.metadata);
      }

      values.push(id);
      
      const result = await client.query(
        `UPDATE user_sessions SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );
      
      if (!result.rows[0]) throw new Error('Session not found');
      return this.rowToUserSession(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async deleteSession(id: string): Promise<void> {
    const client = await this.getClient();
    try {
      await client.query('DELETE FROM user_sessions WHERE id = $1', [id]);
    } finally {
      client.release();
    }
  }

  async cleanExpiredSessions(): Promise<number> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        'DELETE FROM user_sessions WHERE expires_at < NOW()'
      );
      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }

  // Analytics
  async getTestStatistics(userId?: string): Promise<{
    totalSuites: number;
    totalExecutions: number;
    avgExecutionTime: number;
    successRate: number;
  }> {
    const client = await this.getClient();
    try {
      let query = `
        SELECT 
          COUNT(DISTINCT h.suite_id) as total_suites,
          COUNT(DISTINCT e.id) as total_executions,
          AVG(
            CASE 
              WHEN e.completed_at IS NOT NULL 
              THEN EXTRACT(EPOCH FROM (e.completed_at - e.started_at)) * 1000
              ELSE NULL 
            END
          ) as avg_execution_time,
          (COUNT(CASE WHEN e.status = "completed" THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)) as success_rate
        FROM test_executions e
        JOIN test_history h ON e.history_id = h.id
      `;
      
      const params: any[] = [];
      if (userId) {
        query += ' WHERE e.user_id = $1';
        params.push(userId);
      }

      const result = await client.query(query, params);
      const stats = result.rows[0];

      return {
        totalSuites: parseInt(stats.total_suites) || 0,
        totalExecutions: parseInt(stats.total_executions) || 0,
        avgExecutionTime: parseFloat(stats.avg_execution_time) || 0,
        successRate: parseFloat(stats.success_rate) || 0
      };
    } finally {
      client.release();
    }
  }

  async getMostUsedPlugins(): Promise<Array<{ plugin: string; count: number }>> {
    const client = await this.getClient();
    try {
      const result = await client.query(`
        SELECT 
          plugin,
          COUNT(*) as count
        FROM (
          SELECT jsonb_array_elements_text(metadata->"pluginsUsed") as plugin
          FROM test_history
          WHERE metadata->"pluginsUsed" IS NOT NULL
        ) as plugins
        GROUP BY plugin
        ORDER BY count DESC
        LIMIT 10
      `);

      return result.rows.map(row => ({
        plugin: row.plugin,
        count: parseInt(row.count)
      }));
    } finally {
      client.release();
    }
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
      data: row.data,
      metadata: row.metadata || {}
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
      results: row.results || undefined,
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
      metadata: row.metadata || undefined
    };
  }
}