/**
 * Real Database Test Utilities
 * NO MOCKS - Uses real SQLite for testing
 */

import * as sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { path } from '../../layer/themes/infra_external-log-lib/src';
import * as fs from 'fs-extra';
import * as bcrypt from 'bcrypt';

export interface TestDatabase {
  db: Database;
  path: string;
  cleanup: () => Promise<void>;
}

/**
 * Creates a real test database with schema and test data
 */
export async function createTestDatabase(
  dbPath: string = ':memory:'
): Promise<TestDatabase> {
  // Open real database
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Create real schema
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      revoked BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS apps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      theme TEXT NOT NULL,
      config JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS themes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      config JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      theme_id INTEGER,
      content TEXT,
      metadata JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (theme_id) REFERENCES themes(id)
    );

    CREATE TABLE IF NOT EXISTS selections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id INTEGER,
      template_id INTEGER,
      user_id INTEGER,
      selected_option INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (app_id) REFERENCES apps(id),
      FOREIGN KEY (template_id) REFERENCES templates(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      data JSON,
      text TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Add triggers for updated_at
  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
    AFTER UPDATE ON users 
    BEGIN
      UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

    CREATE TRIGGER IF NOT EXISTS update_apps_timestamp 
    AFTER UPDATE ON apps 
    BEGIN
      UPDATE apps SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `);

  return {
    db,
    path: dbPath,
    cleanup: async () => {
      await db.close();
      if (dbPath !== ':memory:' && await fs.pathExists(dbPath)) {
        await fs.unlink(dbPath);
      }
    }
  };
}

/**
 * Seeds test database with realistic test data
 */
export async function seedTestData(db: Database) {
  // Create test users with real hashed passwords
  const users = [
    { username: 'admin', email: 'admin@test.com', password: "PLACEHOLDER", role: 'admin' },
    { username: 'user1', email: 'user1@test.com', password: "PLACEHOLDER", role: 'user' },
    { username: 'user2', email: 'user2@test.com', password: "PLACEHOLDER", role: 'user' },
    { username: "developer", email: 'dev@test.com', password: "PLACEHOLDER", role: "developer" }
  ];

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    await db.run(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [user.username, user.email, hashedPassword, user.role]
    );
  }

  // Create test themes
  const themes = [
    { name: 'portal_security', description: 'Security and authentication theme' },
    { name: 'portal_gui-selector', description: 'GUI selection interface' },
    { name: 'env-config', description: 'Environment configuration' }
  ];

  for (const theme of themes) {
    await db.run(
      'INSERT INTO themes (name, description, config) VALUES (?, ?, ?)',
      [theme.name, theme.description, JSON.stringify({ enabled: true })]
    );
  }

  // Create test apps
  const apps = [
    { name: "TestApp1", theme: 'portal_security' },
    { name: "TestApp2", theme: 'portal_gui-selector' },
    { name: "TestApp3", theme: 'env-config' }
  ];

  for (const app of apps) {
    await db.run(
      'INSERT INTO apps (name, theme, config) VALUES (?, ?, ?)',
      [app.name, app.theme, JSON.stringify({ port: 3000 + Math.floor(Math.random() * 1000) })]
    );
  }

  // Create test templates
  for (let i = 1; i <= 3; i++) {
    await db.run(
      'INSERT INTO templates (name, theme_id, content, metadata) VALUES (?, ?, ?, ?)',
      [`Template${i}`, i, `<div>Template ${i} content</div>`, JSON.stringify({ version: 1 })]
    );
  }

  return {
    users,
    themes,
    apps
  };
}

/**
 * Creates a test user and returns auth token
 */
export async function createAuthenticatedUser(
  db: Database,
  userData = { username: "testuser", password: "PLACEHOLDER" }
): Promise<{ user: any; token: string }> {
  const hashedPassword = await bcrypt.hash(userData.password, 10);
  
  const result = await db.run(
    'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
    [userData.username, `${userData.username}@test.com`, hashedPassword]
  );

  const user = await db.get('SELECT * FROM users WHERE id = ?', result.lastID);
  
  // Create a real session token
  const token = Buffer.from(JSON.stringify({
    userId: user.id,
    username: user.username,
    timestamp: Date.now()
  })).toString('base64');

  // Store session in database
  await db.run(
    'INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
    [
      `session_${Date.now()}`,
      user.id,
      token,
      new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    ]
  );

  return { user, token };
}

/**
 * Verifies database integrity
 */
export async function verifyDatabaseIntegrity(db: Database): Promise<boolean> {
  try {
    // Check all tables exist
    const tables = await db.all(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    
    const requiredTables = [
      'users', "sessions", 'refresh_tokens', 
      'apps', 'themes', "templates", "selections", "messages"
    ];
    
    const tableNames = tables.map(t => t.name);
    for (const required of requiredTables) {
      if (!tableNames.includes(required)) {
        console.error(`Missing required table: ${required}`);
        return false;
      }
    }

    // Check foreign key constraints are enabled
    const fkCheck = await db.get('PRAGMA foreign_keys');
    if (!fkCheck.foreign_keys) {
      await db.run('PRAGMA foreign_keys = ON');
    }

    return true;
  } catch (error) {
    console.error('Database integrity check failed:', error);
    return false;
  }
}

/**
 * Gets database statistics for testing
 */
export async function getDatabaseStats(db: Database) {
  const stats = {
    users: await db.get('SELECT COUNT(*) as count FROM users'),
    sessions: await db.get('SELECT COUNT(*) as count FROM sessions'),
    apps: await db.get('SELECT COUNT(*) as count FROM apps'),
    themes: await db.get('SELECT COUNT(*) as count FROM themes'),
    templates: await db.get('SELECT COUNT(*) as count FROM templates')
  };

  return {
    userCount: stats.users.count,
    sessionCount: stats.sessions.count,
    appCount: stats.apps.count,
    themeCount: stats.themes.count,
    templateCount: stats.templates.count
  };
}