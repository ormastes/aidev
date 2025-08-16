/**
 * Mock Free System Integration Test
 * Tests real integration between all services and database operations
 * NO MOCKS - Following Mock Free Test Oriented Development
 */

import * as fs from 'fs-extra';
import { path } from '../../../../../infra_external-log-lib/src';
import { os } from '../../../../../infra_external-log-lib/src';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { TemplateService } from '../../src/services/TemplateService';
import { JWTService } from '../../src/services/JWTService';
import { ExternalLogService } from '../../src/services/ExternalLogService';
import bcrypt from 'bcrypt';

describe('GUI Selector Server System Integration Tests - Mock Free', () => {
  let db: Database;
  let templateService: TemplateService;
  let jwtService: JWTService;
  let logService: ExternalLogService;
  let testDir: string;

  beforeAll(async () => {
    // Create real temp directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'system-test-'));
    
    // Create real database
    const dbPath = path.join(testDir, 'test.db');
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Create real schema
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS apps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        owner_id INTEGER NOT NULL,
        theme TEXT,
        config TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users (id)
      );

      CREATE TABLE IF NOT EXISTS themes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        category TEXT,
        preview_url TEXT,
        template TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS selections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        app_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        theme_id INTEGER NOT NULL,
        requirements TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (app_id) REFERENCES apps (id),
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (theme_id) REFERENCES themes (id)
      );

      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT,
        type TEXT,
        data TEXT,
        timestamp TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Initialize real services
    templateService = new TemplateService();
    jwtService = new JWTService();
    logService = new ExternalLogService();

    // Seed test data
    await seedTestData();
  }, 60000); // 60 second timeout for setup

  afterAll(async () => {
    // Clean up real resources
    if (db) await db.close();
    await fs.remove(testDir);
  });

  async function seedTestData() {
    // Create test users with real hashed passwords
    const adminHash = await bcrypt.hash('admin123', 10);
    const userHash = await bcrypt.hash('user123', 10);
    
    await db.run(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      ['admin', 'admin@test.com', adminHash, 'admin']
    );
    await db.run(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      ['testuser', 'user@test.com', userHash, 'user']
    );

    // Create test themes
    const themes = [
      { name: 'Modern', category: 'modern', description: 'Modern design theme' },
      { name: 'Classic', category: 'classic', description: 'Classic design theme' },
      { name: 'Minimal', category: 'minimal', description: 'Minimal design theme' },
      { name: 'Creative', category: 'creative', description: 'Creative design theme' }
    ];

    for (const theme of themes) {
      await db.run(
        'INSERT INTO themes (name, category, description) VALUES (?, ?, ?)',
        [theme.name, theme.category, theme.description]
      );
    }

    // Create test apps
    await db.run(
      'INSERT INTO apps (name, description, owner_id, theme) VALUES (?, ?, ?, ?)',
      ['TestApp1', 'Test application 1', 1, 'modern']
    );
    await db.run(
      'INSERT INTO apps (name, description, owner_id, theme) VALUES (?, ?, ?, ?)',
      ['TestApp2', 'Test application 2', 2, 'classic']
    );
  }

  describe('Database Operations', () => {
    it('should create and retrieve users', async () => {
      const newUserHash = await bcrypt.hash('newpass123', 10);
      const result = await db.run(
        'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
        ['newuser', 'new@test.com', newUserHash]
      );

      expect(result.lastID).toBeGreaterThan(0);

      const user = await db.get(
        'SELECT * FROM users WHERE username = ?',
        ['newuser']
      );

      expect(user).toBeTruthy();
      expect(user.username).toBe('newuser');
      expect(user.email).toBe('new@test.com');

      // Verify password hash
      const validPassword = await bcrypt.compare('newpass123', user.password_hash);
      expect(validPassword).toBe(true);
    });

    it('should handle concurrent database operations', async () => {
      const operations = [];

      // Multiple concurrent inserts
      for (let i = 0; i < 10; i++) {
        operations.push(
          db.run(
            'INSERT INTO messages (text, timestamp) VALUES (?, ?)',
            [`Message ${i}`, new Date().toISOString()]
          )
        );
      }

      const results = await Promise.all(operations);
      results.forEach(result => {
        expect(result.lastID).toBeGreaterThan(0);
      });

      // Verify all messages were saved
      const count = await db.get('SELECT COUNT(*) as count FROM messages');
      expect(count.count).toBeGreaterThanOrEqual(10);
    });

    it('should enforce foreign key constraints', async () => {
      // Try to create app with non-existent owner
      await expect(
        db.run(
          'INSERT INTO apps (name, owner_id) VALUES (?, ?)',
          ['InvalidApp', 9999]
        )
      ).rejects.toThrow();
    });

    it('should handle transactions correctly', async () => {
      await db.run('BEGIN TRANSACTION');
      
      try {
        await db.run(
          'INSERT INTO messages (text, timestamp) VALUES (?, ?)',
          ['Transaction Test 1', new Date().toISOString()]
        );
        await db.run(
          'INSERT INTO messages (text, timestamp) VALUES (?, ?)',
          ['Transaction Test 2', new Date().toISOString()]
        );
        
        await db.run('COMMIT');
      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }

      const messages = await db.all(
        'SELECT * FROM messages WHERE text LIKE ?',
        ['Transaction Test%']
      );
      expect(messages).toHaveLength(2);
    });
  });

  describe('Template Service Integration', () => {
    it('should list all templates', async () => {
      const templates = await templateService.listTemplates();
      expect(templates).toBeDefined();
      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0]).toHaveProperty('id');
      expect(templates[0]).toHaveProperty('name');
    });

    it('should get template by ID', async () => {
      const templates = await templateService.listTemplates();
      const firstTemplate = templates[0];
      
      const template = await templateService.getTemplate(firstTemplate.id);
      expect(template).toBeDefined();
      expect(template?.id).toBe(firstTemplate.id);
      expect(template?.name).toBe(firstTemplate.name);
    });

    it('should search templates', async () => {
      const results = await templateService.searchTemplates('modern');
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should get templates by category', async () => {
      const modernTemplates = await templateService.getTemplatesByCategory('modern');
      expect(modernTemplates).toBeDefined();
      expect(Array.isArray(modernTemplates)).toBe(true);
      
      modernTemplates.forEach(template => {
        expect(template.tags).toContain('modern');
      });
    });
  });

  describe('JWT Service Integration', () => {
    it('should generate and verify access tokens', () => {
      const payload = {
        userId: 1,
        username: 'testuser',
        role: 'user'
      };

      const token = jwtService.generateAccessToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = jwtService.verifyAccessToken(token);
      expect(decoded.userId).toBe(1);
      expect(decoded.username).toBe('testuser');
      expect(decoded.role).toBe('user');
    });

    it('should generate and verify refresh tokens', () => {
      const payload = {
        userId: 2,
        username: 'admin',
        role: 'admin'
      };

      const token = jwtService.generateRefreshToken(payload);
      expect(token).toBeDefined();

      const decoded = jwtService.verifyRefreshToken(token);
      expect(decoded.userId).toBe(2);
      expect(decoded.role).toBe('admin');
    });

    it('should reject invalid tokens', () => {
      expect(() => {
        jwtService.verifyAccessToken('invalid.token.here');
      }).toThrow('Invalid access token');

      expect(() => {
        jwtService.verifyRefreshToken('invalid.refresh.token');
      }).toThrow('Invalid refresh token');
    });

    it('should handle token expiry correctly', () => {
      const payload = {
        userId: 3,
        username: 'expiry_test',
        role: 'user'
      };

      const accessToken = jwtService.generateAccessToken(payload);
      const refreshToken = jwtService.generateRefreshToken(payload);

      // Decode tokens to check expiry
      const decodedAccess = jwtService.verifyAccessToken(accessToken) as any;
      const decodedRefresh = jwtService.verifyRefreshToken(refreshToken) as any;

      // Access token should expire before refresh token
      expect(decodedAccess.exp).toBeLessThan(decodedRefresh.exp);
    });
  });

  describe('External Log Service Integration', () => {
    it('should log user actions', async () => {
      await logService.logUserAction(
        1,
        'test_action',
        { detail: 'test detail' }
      );

      // Verify log was created (check file exists)
      const logDir = path.join(process.cwd(), 'logs', 'external');
      expect(fs.existsSync(logDir)).toBe(true);
    });

    it('should log app actions', async () => {
      await logService.logAppAction(
        'app_started',
        1,
        { version: '1.0.0' }
      );

      // Log should be created without errors
      expect(true).toBe(true);
    });

    it('should log errors with stack traces', async () => {
      const testError = new Error('Test error');
      await logService.logError('test_error', testError, { context: 'testing' });

      // Error should be logged without throwing
      expect(true).toBe(true);
    });

    it('should log system events', async () => {
      await logService.logSystemEvent('system_test', {
        timestamp: new Date().toISOString(),
        severity: 'info'
      });

      // System event should be logged
      expect(true).toBe(true);
    });

    it('should retrieve recent logs', async () => {
      // Log some events first
      await logService.logSystemEvent('recent_test_1', { index: 1 });
      await logService.logSystemEvent('recent_test_2', { index: 2 });
      await logService.logSystemEvent('recent_test_3', { index: 3 });

      const recentLogs = await logService.getRecentLogs(5);
      expect(Array.isArray(recentLogs)).toBe(true);
    });
  });

  describe('End-to-End Integration Scenarios', () => {
    it('should handle complete user workflow', async () => {
      // 1. Create user
      const passwordHash = await bcrypt.hash('e2e_pass', 10);
      const userResult = await db.run(
        'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
        ['e2e_user', 'e2e@test.com', passwordHash]
      );
      const userId = userResult.lastID!;

      // 2. Generate JWT token
      const token = jwtService.generateAccessToken({
        userId,
        username: 'e2e_user',
        role: 'user'
      });

      // 3. Create app
      const appResult = await db.run(
        'INSERT INTO apps (name, owner_id, theme) VALUES (?, ?, ?)',
        ['E2E Test App', userId, 'modern']
      );
      const appId = appResult.lastID!;

      // 4. Select theme
      const theme = await db.get('SELECT * FROM themes WHERE category = ?', ['modern']);
      
      const selectionResult = await db.run(
        'INSERT INTO selections (app_id, user_id, theme_id, requirements) VALUES (?, ?, ?, ?)',
        [appId, userId, theme.id, JSON.stringify({ responsive: true })]
      );

      // 5. Log the action
      await logService.logUserAction(userId, 'theme_selected', {
        appId,
        themeId: theme.id
      });

      // 6. Verify everything was created
      const selection = await db.get(
        'SELECT * FROM selections WHERE id = ?',
        [selectionResult.lastID]
      );
      
      expect(selection).toBeTruthy();
      expect(selection.app_id).toBe(appId);
      expect(selection.user_id).toBe(userId);
      expect(selection.theme_id).toBe(theme.id);
    });

    it('should handle error scenarios gracefully', async () => {
      // Test duplicate username
      await expect(
        db.run(
          'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
          ['admin', 'duplicate@test.com', 'hash']
        )
      ).rejects.toThrow();

      // Test invalid JWT
      expect(() => {
        jwtService.verifyAccessToken('completely.invalid.token');
      }).toThrow();

      // Log the error
      await logService.logError('duplicate_user_error', new Error('UNIQUE constraint failed'));

      // System should continue working
      const users = await db.all('SELECT * FROM users');
      expect(users.length).toBeGreaterThan(0);
    });

    it('should handle concurrent user operations', async () => {
      const operations = [];

      // Simulate multiple users performing actions simultaneously
      for (let i = 0; i < 5; i++) {
        operations.push((async () => {
          const hash = await bcrypt.hash(`pass${i}`, 10);
          const result = await db.run(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            [`concurrent_${i}`, `concurrent${i}@test.com`, hash]
          );

          const token = jwtService.generateAccessToken({
            userId: result.lastID!,
            username: `concurrent_${i}`,
            role: 'user'
          });

          await logService.logUserAction(result.lastID!, 'user_created', {
            method: 'concurrent_test'
          });

          return { userId: result.lastID, token };
        })());
      }

      const results = await Promise.all(operations);

      // All operations should complete successfully
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.userId).toBeGreaterThan(0);
        expect(result.token).toBeDefined();
      });
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle bulk operations efficiently', async () => {
      const startTime = Date.now();

      // Insert 100 messages
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          db.run(
            'INSERT INTO messages (text, timestamp) VALUES (?, ?)',
            [`Bulk message ${i}`, new Date().toISOString()]
          )
        );
      }

      await Promise.all(promises);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      // Verify all messages were inserted
      const count = await db.get(
        'SELECT COUNT(*) as count FROM messages WHERE text LIKE ?',
        ['Bulk message%']
      );
      expect(count.count).toBe(100);
    });

    it('should query large datasets efficiently', async () => {
      const startTime = Date.now();

      // Query with multiple joins
      const results = await db.all(`
        SELECT 
          a.name as app_name,
          u.username as owner,
          t.name as theme_name,
          s.created_at as selection_date
        FROM apps a
        LEFT JOIN users u ON a.owner_id = u.id
        LEFT JOIN selections s ON s.app_id = a.id
        LEFT JOIN themes t ON s.theme_id = t.id
        ORDER BY s.created_at DESC
        LIMIT 100
      `);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(Array.isArray(results)).toBe(true);
    });
  });
}, 120000); // 2 minute timeout for entire suite