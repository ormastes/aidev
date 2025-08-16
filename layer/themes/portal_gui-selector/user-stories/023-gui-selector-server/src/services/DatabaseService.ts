import sqlite3 from 'sqlite3';
import { path } from '../../../../../infra_external-log-lib/src';
import { fs } from '../../../../../infra_external-log-lib/src';
import { logger } from '../utils/logger';

interface DbRunResult {
  lastID?: number;
  changes?: number;
}

export class DatabaseService {
  private db: sqlite3.Database;
  private dbPath: string;

  constructor() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      await fileAPI.createDirectory(dataDir);
    }
    
    this.dbPath = path.join(dataDir, 'gui-selector.db');
    this.db = new sqlite3.Database(this.dbPath);
  }

  private runAsync(sql: string, params: any[] = []): Promise<DbRunResult> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(this: any, err: Error | null) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  private getAsync(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  private allAsync(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async initialize(): Promise<void> {
    try {
      // Users table
      await this.runAsync(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT DEFAULT 'user',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Apps/Projects table
      await this.runAsync(`
        CREATE TABLE IF NOT EXISTS apps (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          owner_id INTEGER NOT NULL,
          path TEXT,
          port INTEGER,
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (owner_id) REFERENCES users (id)
        )
      `);

      // Selections table
      await this.runAsync(`
        CREATE TABLE IF NOT EXISTS selections (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          app_id INTEGER NOT NULL,
          template_id TEXT NOT NULL,
          project_name TEXT NOT NULL,
          comments TEXT,
          metadata TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (app_id) REFERENCES apps (id)
        )
      `);

      // Requirements table
      await this.runAsync(`
        CREATE TABLE IF NOT EXISTS requirements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          selection_id INTEGER NOT NULL,
          type TEXT NOT NULL,
          description TEXT NOT NULL,
          priority TEXT DEFAULT 'medium',
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (selection_id) REFERENCES selections (id)
        )
      `);

      // Sessions table for JWT refresh tokens
      await this.runAsync(`
        CREATE TABLE IF NOT EXISTS sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          refresh_token TEXT UNIQUE NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Create indexes
      await this.runAsync('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
      await this.runAsync('CREATE INDEX IF NOT EXISTS idx_apps_owner ON apps(owner_id)');
      await this.runAsync('CREATE INDEX IF NOT EXISTS idx_selections_user ON selections(user_id)');
      await this.runAsync('CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(refresh_token)');

      logger.info('Database initialized successfully');
    } catch (error) {
      logger.error('Database initialization failed:', error);
      throw error;
    }
  }

  // User operations
  async createUser(username: string, email: string, hashedPassword: string, role = 'user'): Promise<DbRunResult> {
    const result = await this.runAsync(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, role]
    );
    return result;
  }

  async getUserByUsername(username: string): Promise<any> {
    return this.getAsync('SELECT * FROM users WHERE username = ?', [username]);
  }

  async getUserById(id: number): Promise<any> {
    return this.getAsync('SELECT * FROM users WHERE id = ?', [id]);
  }

  // App operations
  async createApp(name: string, description: string, ownerId: number, path?: string, port?: number): Promise<DbRunResult> {
    const result = await this.runAsync(
      'INSERT INTO apps (name, description, owner_id, path, port) VALUES (?, ?, ?, ?, ?)',
      [name, description, ownerId, path, port]
    );
    return result;
  }

  async getAppsByOwner(ownerId: number): Promise<any[]> {
    return this.allAsync('SELECT * FROM apps WHERE owner_id = ? ORDER BY created_at DESC', [ownerId]);
  }

  async getAppById(id: number): Promise<any> {
    return this.getAsync('SELECT * FROM apps WHERE id = ?', [id]);
  }

  async getAllApps(): Promise<any[]> {
    return this.allAsync('SELECT a.*, u.username as owner_name FROM apps a JOIN users u ON a.owner_id = u.id ORDER BY a.created_at DESC');
  }

  // Selection operations
  async createSelection(userId: number, appId: number, templateId: string, projectName: string, comments?: string, metadata?: any): Promise<DbRunResult> {
    const result = await this.runAsync(
      'INSERT INTO selections (user_id, app_id, template_id, project_name, comments, metadata) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, appId, templateId, projectName, comments, JSON.stringify(metadata || {})]
    );
    return result;
  }

  async getSelectionsByUser(userId: number): Promise<any[]> {
    return this.allAsync(
      'SELECT s.*, a.name as app_name FROM selections s JOIN apps a ON s.app_id = a.id WHERE s.user_id = ? ORDER BY s.created_at DESC',
      [userId]
    );
  }

  async getSelectionsByApp(appId: number): Promise<any[]> {
    return this.allAsync('SELECT * FROM selections WHERE app_id = ? ORDER BY created_at DESC', [appId]);
  }

  // Requirements operations
  async createRequirement(userId: number, selectionId: number, type: string, description: string, priority = 'medium'): Promise<DbRunResult> {
    const result = await this.runAsync(
      'INSERT INTO requirements (user_id, selection_id, type, description, priority) VALUES (?, ?, ?, ?, ?)',
      [userId, selectionId, type, description, priority]
    );
    return result;
  }

  async getRequirementsByUser(userId: number): Promise<any[]> {
    return this.allAsync('SELECT * FROM requirements WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  }

  async getRequirementsBySelection(selectionId: number): Promise<any[]> {
    return this.allAsync('SELECT * FROM requirements WHERE selection_id = ? ORDER BY priority, created_at DESC', [selectionId]);
  }

  // Session operations for JWT
  async createSession(userId: number, refreshToken: string, expiresAt: Date): Promise<DbRunResult> {
    const result = await this.runAsync(
      'INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES (?, ?, ?)',
      [userId, refreshToken, expiresAt.toISOString()]
    );
    return result;
  }

  async getSession(refreshToken: string): Promise<any> {
    return this.getAsync('SELECT * FROM sessions WHERE refresh_token = ? AND expires_at > datetime("now")', [refreshToken]);
  }

  async deleteSession(refreshToken: string): Promise<void> {
    await this.runAsync('DELETE FROM sessions WHERE refresh_token = ?', [refreshToken]);
  }

  async deleteExpiredSessions(): Promise<void> {
    await this.runAsync('DELETE FROM sessions WHERE expires_at <= datetime("now")');
  }

  // Public methods for general database operations
  async run(sql: string, params: any[] = []): Promise<DbRunResult> {
    return this.runAsync(sql, params);
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    return this.getAsync(sql, params);
  }

  async all(sql: string, params: any[] = []): Promise<any[]> {
    return this.allAsync(sql, params);
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}