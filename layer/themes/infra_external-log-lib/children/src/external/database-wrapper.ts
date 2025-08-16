/**
 * Database Wrapper for External Log Library
 * 
 * Provides unified interface for SQLite, PostgreSQL, and MySQL databases
 * with connection checking, health monitoring, and update validation
 * for use in E2E testing and demo deployments.
 */

import { config } from 'dotenv';
import { Client as PostgresClient } from 'pg';
import mysql from 'mysql2/promise';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

config();

export interface DatabaseConfig {
  type: 'sqlite' | 'postgres' | 'mysql';
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  path?: string; // For SQLite
  ssl?: boolean | { rejectUnauthorized: boolean };
  connectionLimit?: number; // For MySQL
  timeout?: number;
}

export interface ConnectionHealth {
  connected: boolean;
  latency?: number;
  version?: string;
  error?: string;
  timestamp: Date;
}

export interface QueryResult {
  rows: any[];
  rowCount: number;
  insertId?: number;
  affectedRows?: number;
}

export interface DatabaseInfo {
  type: string;
  version: string;
  size?: string;
  tables: string[];
  uptime?: string;
}

export class DatabaseWrapper {
  private config: DatabaseConfig;
  private connection: PostgresClient | mysql.Connection | sqlite3.Database | null = null;
  private isConnected = false;
  private lastHealthCheck: ConnectionHealth | null = null;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  /**
   * Create database wrapper from environment variables
   */
  static fromEnvironment(): DatabaseWrapper {
    const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase() as 'sqlite' | 'postgres' | 'mysql';
    
    let config: DatabaseConfig = { type: dbType };

    switch (dbType) {
      case 'postgres':
        config = {
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || '',
          database: process.env.DB_NAME || 'ai_dev_portal',
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
          timeout: parseInt(process.env.DB_TIMEOUT || '30000')
        };
        break;

      case 'mysql':
        config = {
          type: 'mysql',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '3306'),
          user: process.env.DB_USER || 'root',
          password: process.env.DB_PASSWORD || '',
          database: process.env.DB_NAME || 'ai_dev_portal',
          connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
          timeout: parseInt(process.env.DB_TIMEOUT || '30000')
        };
        break;

      case 'sqlite':
      default:
        config = {
          type: 'sqlite',
          path: process.env.SQLITE_PATH || './data/ai_dev_portal.db',
          timeout: parseInt(process.env.DB_TIMEOUT || '30000')
        };
        break;
    }

    return new DatabaseWrapper(config);
  }

  /**
   * Connect to the database
   */
  async connect(): Promise<void> {
    try {
      switch (this.config.type) {
        case 'postgres':
          await this.connectPostgres();
          break;
        case 'mysql':
          await this.connectMySQL();
          break;
        case 'sqlite':
          await this.connectSQLite();
          break;
        default:
          throw new Error(`Unsupported database type: ${this.config.type}`);
      }
      this.isConnected = true;
      console.log(`🔄 Connected to ${this.config.type} database`);
    } catch (error) {
      this.isConnected = false;
      console.error(`❌ Failed to connect to ${this.config.type} database:`, error);
      throw error;
    }
  }

  private async connectPostgres(): Promise<void> {
    const client = new PostgresClient({
      host: this.config.host,
      port: this.config.port,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      ssl: this.config.ssl,
      connectionTimeoutMillis: this.config.timeout
    });

    await client.connect();
    this.connection = client;
  }

  private async connectMySQL(): Promise<void> {
    const connection = await mysql.createConnection({
      host: this.config.host,
      port: this.config.port,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      connectTimeout: this.config.timeout,
      ssl: this.config.ssl ? {} : false
    });

    this.connection = connection;
  }

  private async connectSQLite(): Promise<void> {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(
        this.config.path!,
        sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
        (err) => {
          if (err) {
            reject(err);
          } else {
            this.connection = db;
            resolve();
          }
        }
      );
    });
  }

  /**
   * Execute a query
   */
  async query(sql: string, params: any[] = []): Promise<QueryResult> {
    if (!this.isConnected || !this.connection) {
      throw new Error('Database not connected');
    }

    try {
      switch (this.config.type) {
        case 'postgres':
          return await this.queryPostgres(sql, params);
        case 'mysql':
          return await this.queryMySQL(sql, params);
        case 'sqlite':
          return await this.querySQLite(sql, params);
        default:
          throw new Error(`Unsupported database type: ${this.config.type}`);
      }
    } catch (error) {
      console.error(`Query failed [${this.config.type}]:`, error);
      throw error;
    }
  }

  private async queryPostgres(sql: string, params: any[]): Promise<QueryResult> {
    const client = this.connection as PostgresClient;
    const result = await client.query(sql, params);
    
    return {
      rows: result.rows,
      rowCount: result.rowCount || 0,
      affectedRows: result.rowCount || 0
    };
  }

  private async queryMySQL(sql: string, params: any[]): Promise<QueryResult> {
    const connection = this.connection as mysql.Connection;
    const [rows, fields] = await connection.execute(sql, params);
    
    const result = rows as any;
    return {
      rows: Array.isArray(result) ? result : [result],
      rowCount: Array.isArray(result) ? result.length : (result.affectedRows || 0),
      insertId: result.insertId,
      affectedRows: result.affectedRows || 0
    };
  }

  private async querySQLite(sql: string, params: any[]): Promise<QueryResult> {
    const db = this.connection as sqlite3.Database;
    
    return new Promise((resolve, reject) => {
      const isSelect = sql.trim().toLowerCase().startsWith('select');
      
      if (isSelect) {
        db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve({
            rows: rows || [],
            rowCount: (rows || []).length
          });
        });
      } else {
        db.run(sql, params, function(this: sqlite3.RunResult, err: Error | null) {
          if (err) reject(err);
          else resolve({
            rows: [],
            rowCount: this.changes || 0,
            insertId: this.lastID,
            affectedRows: this.changes || 0
          });
        });
      }
    });
  }

  /**
   * Get single row
   */
  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const result = await this.query(sql, params);
    return result.rows[0] || null;
  }

  /**
   * Check database connection health
   */
  async checkHealth(): Promise<ConnectionHealth> {
    const startTime = Date.now();
    const timestamp = new Date();

    try {
      if (!this.isConnected || !this.connection) {
        return {
          connected: false,
          error: 'Not connected to database',
          timestamp
        };
      }

      let version = 'Unknown';
      
      switch (this.config.type) {
        case 'postgres':
          const pgResult = await this.query('SELECT version()');
          version = pgResult.rows[0]?.version || 'Unknown';
          break;
        case 'mysql':
          const mysqlResult = await this.query('SELECT VERSION() as version');
          version = mysqlResult.rows[0]?.version || 'Unknown';
          break;
        case 'sqlite':
          const sqliteResult = await this.query('SELECT sqlite_version() as version');
          version = sqliteResult.rows[0]?.version || 'Unknown';
          break;
      }

      const latency = Date.now() - startTime;
      
      this.lastHealthCheck = {
        connected: true,
        latency,
        version,
        timestamp
      };

      return this.lastHealthCheck;
    } catch (error) {
      this.lastHealthCheck = {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp
      };

      return this.lastHealthCheck;
    }
  }

  /**
   * Get database information
   */
  async getDatabaseInfo(): Promise<DatabaseInfo> {
    const health = await this.checkHealth();
    
    if (!health.connected) {
      throw new Error(`Database not connected: ${health.error}`);
    }

    let tables: string[] = [];
    let size: string | undefined;
    let uptime: string | undefined;

    try {
      switch (this.config.type) {
        case 'postgres':
          const pgTables = await this.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
          `);
          tables = pgTables.rows.map(row => row.table_name);
          
          const pgSize = await this.query(`
            SELECT pg_size_pretty(pg_database_size($1)) as size
          `, [this.config.database]);
          size = pgSize.rows[0]?.size;
          
          const pgUptime = await this.query(`
            SELECT date_trunc('second', current_timestamp - pg_postmaster_start_time()) as uptime
          `);
          uptime = pgUptime.rows[0]?.uptime;
          break;

        case 'mysql':
          const mysqlTables = await this.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = ?
          `, [this.config.database]);
          tables = mysqlTables.rows.map(row => row.table_name || row.TABLE_NAME);
          
          const mysqlSize = await this.query(`
            SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 1) AS size_mb
            FROM information_schema.tables 
            WHERE table_schema = ?
          `, [this.config.database]);
          size = mysqlSize.rows[0]?.size_mb ? `${mysqlSize.rows[0].size_mb} MB` : undefined;
          
          const mysqlUptime = await this.query('SHOW STATUS LIKE "Uptime"');
          uptime = mysqlUptime.rows[0]?.Value ? `${Math.floor(parseInt(mysqlUptime.rows[0].Value) / 3600)} hours` : undefined;
          break;

        case 'sqlite':
          const sqliteTables = await this.query(`
            SELECT name FROM sqlite_master WHERE type='table'
          `);
          tables = sqliteTables.rows.map(row => row.name);
          
          // Get file size for SQLite
          try {
            const fs = require('fs');
            const stats = fs.statSync(this.config.path!);
            size = `${Math.round(stats.size / 1024)} KB`;
          } catch (e) {
            size = 'Unknown';
          }
          break;
      }
    } catch (error) {
      console.warn(`Could not retrieve full database info: ${error}`);
    }

    return {
      type: this.config.type,
      version: health.version || 'Unknown',
      size,
      tables,
      uptime
    };
  }

  /**
   * Test database updates with a simple operation
   */
  async testDatabaseUpdates(): Promise<{
    canRead: boolean;
    canWrite: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    details: string[];
  }> {
    const details: string[] = [];
    let canRead = false;
    let canWrite = false;
    let canUpdate = false;
    let canDelete = false;

    const testTableName = `db_test_${Date.now()}`;

    try {
      // Test READ capability
      try {
        await this.query('SELECT 1 as test_value');
        canRead = true;
        details.push('🔄 Read operations: In Progress');
      } catch (error) {
        details.push(`❌ Read operations: FAILED - ${error}`);
      }

      // Test WRITE capability
      try {
        let createTableSQL: string;
        switch (this.config.type) {
          case 'postgres':
            createTableSQL = `CREATE TABLE ${testTableName} (id SERIAL PRIMARY KEY, test_value TEXT)`;
            break;
          case 'mysql':
            createTableSQL = `CREATE TABLE ${testTableName} (id INT AUTO_INCREMENT PRIMARY KEY, test_value TEXT)`;
            break;
          case 'sqlite':
          default:
            createTableSQL = `CREATE TABLE ${testTableName} (id INTEGER PRIMARY KEY AUTOINCREMENT, test_value TEXT)`;
            break;
        }

        await this.query(createTableSQL);
        await this.query(`INSERT INTO ${testTableName} (test_value) VALUES (?)`, ['test_insert']);
        canWrite = true;
        details.push('🔄 Write operations: In Progress');
      } catch (error) {
        details.push(`❌ Write operations: FAILED - ${error}`);
      }

      // Test UPDATE capability
      if (canWrite) {
        try {
          await this.query(`UPDATE ${testTableName} SET test_value = ? WHERE test_value = ?`, ['test_updated', 'test_insert']);
          canUpdate = true;
          details.push('🔄 Update operations: In Progress');
        } catch (error) {
          details.push(`❌ Update operations: FAILED - ${error}`);
        }
      }

      // Test DELETE capability
      if (canWrite) {
        try {
          await this.query(`DELETE FROM ${testTableName} WHERE test_value = ?`, ['test_updated']);
          canDelete = true;
          details.push('🔄 Delete operations: In Progress');
        } catch (error) {
          details.push(`❌ Delete operations: FAILED - ${error}`);
        }
      }

      // Cleanup test table
      if (canWrite) {
        try {
          await this.query(`DROP TABLE ${testTableName}`);
          details.push('🔄 Cleanup: In Progress');
        } catch (error) {
          details.push(`⚠️ Cleanup: FAILED - ${error}`);
        }
      }

    } catch (error) {
      details.push(`❌ Database test failed: ${error}`);
    }

    return {
      canRead,
      canWrite,
      canUpdate,
      canDelete,
      details
    };
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    if (!this.connection) return;

    try {
      switch (this.config.type) {
        case 'postgres':
          await (this.connection as PostgresClient).end();
          break;
        case 'mysql':
          await (this.connection as mysql.Connection).end();
          break;
        case 'sqlite':
          await new Promise<void>((resolve, reject) => {
            (this.connection as sqlite3.Database).close((err) => {
              if (err) reject(err);
              else resolve();
            });
          });
          break;
      }
      
      this.connection = null;
      this.isConnected = false;
      console.log(`🔄 Disconnected from ${this.config.type} database`);
    } catch (error) {
      console.error(`❌ Error disconnecting from ${this.config.type} database:`, error);
      throw error;
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    connected: boolean;
    type: string;
    lastHealthCheck: ConnectionHealth | null;
  } {
    return {
      connected: this.isConnected,
      type: this.config.type,
      lastHealthCheck: this.lastHealthCheck
    };
  }

  /**
   * Static method to quickly test a database configuration
   */
  static async testConnection(config: DatabaseConfig): Promise<ConnectionHealth> {
    const wrapper = new DatabaseWrapper(config);
    try {
      await wrapper.connect();
      const health = await wrapper.checkHealth();
      await wrapper.disconnect();
      return health;
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }
}