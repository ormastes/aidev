import { DatabaseService } from '../../../src/services/DatabaseService';
import sqlite3 from 'sqlite3';
import { fs } from '../../../../../../infra_external-log-lib/src';
import { path } from '../../../../../../infra_external-log-lib/src';
import { logger } from '../../../src/utils/logger';

// Mock dependencies
jest.mock('sqlite3');
jest.mock('fs');
jest.mock('../../../src/utils/logger');

describe("DatabaseService", () => {
  let service: DatabaseService;
  let mockDb: any;
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockPath = path;
  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock database instance
    mockDb = {
      run: jest.fn((sql: string, params: any, callback: any) => {
        if (typeof params === "function") {
          callback = params;
          params = [];
        }
        if (callback) {
          callback.call({ lastID: 1, changes: 1 }, null);
        }
        return mockDb;
      }),
      get: jest.fn((sql: string, params: any, callback: any) => {
        if (callback) {
          callback(null, {
            id: 1,
            username: "testuser",
            email: 'test@example.com',
            password: "PLACEHOLDER",
            role: 'user'
          });
        }
        return mockDb;
      }),
      all: jest.fn((sql: string, params: any, callback: any) => {
        if (callback) {
          callback(null, [{
            id: 1,
            name: 'Test App',
            owner_id: 1
          }]);
        }
        return mockDb;
      }),
      close: jest.fn((callback: any) => {
        if (callback) callback(null);
      })
    };
    
    // Mock sqlite3.Database constructor
    (sqlite3.Database as any).mockImplementation(() => mockDb);
    
    // Mock fs methods
    mockFs.existsSync.mockReturnValue(false);
    mockFs.mkdirSync.mockReturnValue(undefined as any);
    
    service = new DatabaseService();
  });

  describe("constructor", () => {
    it('should create data directory if it does not exist', () => {
      expect(mockFs.existsSync).toHaveBeenCalledWith(
        expect.stringContaining('data')
      );
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('data'),
        { recursive: true }
      );
    });

    it('should not create data directory if it already exists', () => {
      jest.clearAllMocks();
      mockFs.existsSync.mockReturnValue(true);
      new DatabaseService();
      
      expect(mockFs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should initialize database with correct path', () => {
      expect(sqlite3.Database).toHaveBeenCalledWith(
        expect.stringContaining('gui-selector.db')
      );
    });
  });

  describe("initialize", () => {
    it('should create all required tables', async () => {
      await service.initialize();
      
      // Check table creation
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS users'),
        expect.any(Array),
        expect.any(Function)
      );
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS apps'),
        expect.any(Array),
        expect.any(Function)
      );
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS selections'),
        expect.any(Array),
        expect.any(Function)
      );
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS requirements'),
        expect.any(Array),
        expect.any(Function)
      );
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS sessions'),
        expect.any(Array),
        expect.any(Function)
      );
    });

    it('should create indexes', async () => {
      await service.initialize();
      
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_users_username'),
        expect.any(Array),
        expect.any(Function)
      );
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_apps_owner'),
        expect.any(Array),
        expect.any(Function)
      );
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Database error');
      mockDb.run.mockImplementation((sql: string, params: any, callback: any) => {
        if (typeof params === "function") {
          callback = params;
        }
        if (callback) {
          callback.call({}, error);
        }
        return mockDb;
      });

      await expect(service.initialize()).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Database initialization failed:',
        error
      );
    });
  });

  describe('User operations', () => {
    describe("createUser", () => {
      it('should create a user with default role', async () => {
        const result = await service.createUser(
          "testuser",
          'test@example.com',
          "hashedPassword"
        );

        expect(mockDb.run).toHaveBeenCalledWith(
          'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
          ["testuser", 'test@example.com', "hashedPassword", 'user'],
          expect.any(Function)
        );
        expect(result).toEqual({ lastID: 1, changes: 1 });
      });

      it('should create a user with custom role', async () => {
        await service.createUser(
          'admin',
          'admin@example.com',
          "hashedPassword",
          'admin'
        );

        expect(mockDb.run).toHaveBeenCalledWith(
          'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
          ['admin', 'admin@example.com', "hashedPassword", 'admin'],
          expect.any(Function)
        );
      });

      it('should handle database errors', async () => {
        const error = new Error('Unique constraint failed');
        mockDb.run.mockImplementation((sql: string, params: any[], callback: any) => {
          callback.call({}, error);
          return mockDb;
        });

        await expect(
          service.createUser("testuser", 'test@example.com', "password")
        ).rejects.toThrow('Unique constraint failed');
      });
    });

    describe("getUserByUsername", () => {
      it('should retrieve user by username', async () => {
        const user = await service.getUserByUsername("testuser");

        expect(mockDb.get).toHaveBeenCalledWith(
          'SELECT * FROM users WHERE username = ?',
          ["testuser"],
          expect.any(Function)
        );
        expect(user).toEqual({
          id: 1,
          username: "testuser",
          email: 'test@example.com',
          password: "PLACEHOLDER",
          role: 'user'
        });
      });

      it('should return undefined for non-existent user', async () => {
        mockDb.get.mockImplementation((sql: string, params: any[], callback: any) => {
          callback(null, undefined);
          return mockDb;
        });

        const user = await service.getUserByUsername("nonexistent");
        expect(user).toBeUndefined();
      });
    });

    describe("getUserById", () => {
      it('should retrieve user by id', async () => {
        const user = await service.getUserById(1);

        expect(mockDb.get).toHaveBeenCalledWith(
          'SELECT * FROM users WHERE id = ?',
          [1],
          expect.any(Function)
        );
        expect(user.id).toBe(1);
      });
    });
  });

  describe('App operations', () => {
    describe("createApp", () => {
      it('should create an app with all fields', async () => {
        const result = await service.createApp(
          'Test App',
          'A test application',
          1,
          '/test/app',
          3000
        );

        expect(mockDb.run).toHaveBeenCalledWith(
          'INSERT INTO apps (name, description, owner_id, path, port) VALUES (?, ?, ?, ?, ?)',
          ['Test App', 'A test application', 1, '/test/app', 3000],
          expect.any(Function)
        );
        expect(result).toEqual({ lastID: 1, changes: 1 });
      });

      it('should create an app with optional fields as undefined', async () => {
        await service.createApp(
          'Minimal App',
          'Minimal description',
          1
        );

        expect(mockDb.run).toHaveBeenCalledWith(
          'INSERT INTO apps (name, description, owner_id, path, port) VALUES (?, ?, ?, ?, ?)',
          ['Minimal App', 'Minimal description', 1, undefined, undefined],
          expect.any(Function)
        );
      });
    });

    describe("getAppsByOwner", () => {
      it('should retrieve apps by owner id', async () => {
        const apps = await service.getAppsByOwner(1);

        expect(mockDb.all).toHaveBeenCalledWith(
          'SELECT * FROM apps WHERE owner_id = ? ORDER BY created_at DESC',
          [1],
          expect.any(Function)
        );
        expect(apps).toHaveLength(1);
        expect(apps[0].name).toBe('Test App');
      });
    });

    describe("getAppById", () => {
      it('should retrieve app by id', async () => {
        mockDb.get.mockImplementation((sql: string, params: any[], callback: any) => {
          callback(null, {
            id: 1,
            name: 'Test App',
            description: 'A test application',
            owner_id: 1,
            path: '/test/app',
            port: 3000
          });
          return mockDb;
        });

        const app = await service.getAppById(1);

        expect(mockDb.get).toHaveBeenCalledWith(
          'SELECT * FROM apps WHERE id = ?',
          [1],
          expect.any(Function)
        );
        expect(app.id).toBe(1);
      });
    });

    describe("getAllApps", () => {
      it('should retrieve all apps with owner information', async () => {
        mockDb.all.mockImplementation((sql: string, params: any[], callback: any) => {
          callback(null, [{
            id: 1,
            name: 'Test App',
            owner_id: 1,
            owner_name: "testuser"
          }]);
          return mockDb;
        });

        const apps = await service.getAllApps();

        expect(mockDb.all).toHaveBeenCalledWith(
          expect.stringContaining('SELECT a.*, u.username as owner_name'),
          [],
          expect.any(Function)
        );
        expect(apps[0].owner_name).toBe("testuser");
      });
    });
  });

  describe('Selection operations', () => {
    describe("createSelection", () => {
      it('should create a selection with metadata', async () => {
        const metadata = { theme: 'dark', features: ["responsive"] };
        const result = await service.createSelection(
          1, 1, 'modern', 'My Project', 'Test selection', metadata
        );

        expect(mockDb.run).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO selections'),
          [1, 1, 'modern', 'My Project', 'Test selection', JSON.stringify(metadata)],
          expect.any(Function)
        );
        expect(result).toEqual({ lastID: 1, changes: 1 });
      });

      it('should create a selection without optional fields', async () => {
        await service.createSelection(1, 1, "professional", 'Basic Project');

        expect(mockDb.run).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO selections'),
          [1, 1, "professional", 'Basic Project', undefined, '{}'],
          expect.any(Function)
        );
      });
    });

    describe("getSelectionsByUser", () => {
      it('should retrieve selections by user with app names', async () => {
        mockDb.all.mockImplementation((sql: string, params: any[], callback: any) => {
          callback(null, [{
            id: 1,
            template_id: 'modern',
            app_name: 'Test App'
          }]);
          return mockDb;
        });

        const selections = await service.getSelectionsByUser(1);

        expect(mockDb.all).toHaveBeenCalledWith(
          expect.stringContaining('JOIN apps a ON s.app_id = a.id'),
          [1],
          expect.any(Function)
        );
        expect(selections[0].app_name).toBe('Test App');
      });
    });

    describe("getSelectionsByApp", () => {
      it('should retrieve selections by app id', async () => {
        mockDb.all.mockImplementation((sql: string, params: any[], callback: any) => {
          callback(null, [{
            id: 1,
            user_id: 1,
            app_id: 1,
            template_id: 'modern',
            project_name: 'My Project',
            comments: 'Test selection',
            metadata: '{"key":"value"}'
          }]);
          return mockDb;
        });

        const selections = await service.getSelectionsByApp(1);

        expect(mockDb.all).toHaveBeenCalledWith(
          'SELECT * FROM selections WHERE app_id = ? ORDER BY created_at DESC',
          [1],
          expect.any(Function)
        );
        expect(selections).toHaveLength(1);
      });
    });
  });

  describe('Requirements operations', () => {
    describe("createRequirement", () => {
      it('should create a requirement with custom priority', async () => {
        const result = await service.createRequirement(
          1, 1, 'feature', 'Add dark mode', 'high'
        );

        expect(mockDb.run).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO requirements'),
          [1, 1, 'feature', 'Add dark mode', 'high'],
          expect.any(Function)
        );
        expect(result).toEqual({ lastID: 1, changes: 1 });
      });

      it('should create a requirement with default priority', async () => {
        await service.createRequirement(
          1, 1, 'bug', 'Fix navigation'
        );

        expect(mockDb.run).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO requirements'),
          [1, 1, 'bug', 'Fix navigation', 'medium'],
          expect.any(Function)
        );
      });
    });

    describe("getRequirementsByUser", () => {
      it('should retrieve requirements by user id', async () => {
        mockDb.all.mockImplementation((sql: string, params: any[], callback: any) => {
          callback(null, [{
            id: 1,
            user_id: 1,
            selection_id: 1,
            type: 'feature',
            description: 'Add dark mode',
            priority: 'high'
          }]);
          return mockDb;
        });

        const requirements = await service.getRequirementsByUser(1);

        expect(mockDb.all).toHaveBeenCalledWith(
          'SELECT * FROM requirements WHERE user_id = ? ORDER BY created_at DESC',
          [1],
          expect.any(Function)
        );
        expect(requirements).toHaveLength(1);
      });
    });

    describe("getRequirementsBySelection", () => {
      it('should retrieve requirements by selection id ordered by priority', async () => {
        mockDb.all.mockImplementation((sql: string, params: any[], callback: any) => {
          callback(null, [{
            id: 1,
            user_id: 1,
            selection_id: 1,
            type: 'feature',
            description: 'Add dark mode',
            priority: 'high'
          }]);
          return mockDb;
        });

        const requirements = await service.getRequirementsBySelection(1);

        expect(mockDb.all).toHaveBeenCalledWith(
          expect.stringContaining('ORDER BY priority, created_at DESC'),
          [1],
          expect.any(Function)
        );
        expect(requirements[0].priority).toBe('high');
      });
    });
  });

  describe('Session operations', () => {
    const mockDate = new Date('2024-01-01T00:00:00Z');
    const mocktoken: process.env.TOKEN || "PLACEHOLDER";

    describe("createSession", () => {
      it('should create a session with expiration', async () => {
        const result = await service.createSession(1, mockToken, mockDate);

        expect(mockDb.run).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO sessions'),
          [1, mockToken, mockDate.toISOString()],
          expect.any(Function)
        );
        expect(result).toEqual({ lastID: 1, changes: 1 });
      });
    });

    describe("getSession", () => {
      it('should retrieve valid session by refresh token', async () => {
        mockDb.get.mockImplementation((sql: string, params: any[], callback: any) => {
          callback(null, {
            id: 1,
            user_id: 1,
            refresh_token: mockToken,
            expires_at: mockDate.toISOString()
          });
          return mockDb;
        });

        const session = await service.getSession(mockToken);

        expect(mockDb.get).toHaveBeenCalledWith(
          expect.stringContaining('expires_at > datetime("now")'),
          [mockToken],
          expect.any(Function)
        );
        expect(session.refresh_token).toBe(mockToken);
      });

      it('should not retrieve expired sessions', async () => {
        mockDb.get.mockImplementation((sql: string, params: any[], callback: any) => {
          callback(null, undefined);
          return mockDb;
        });

        const session = await service.getSession('expired-token');
        expect(session).toBeUndefined();
      });
    });

    describe("deleteSession", () => {
      it('should delete session by refresh token', async () => {
        await service.deleteSession(mockToken);

        expect(mockDb.run).toHaveBeenCalledWith(
          'DELETE FROM sessions WHERE refresh_token = ?',
          [mockToken],
          expect.any(Function)
        );
      });
    });

    describe("deleteExpiredSessions", () => {
      it('should delete all expired sessions', async () => {
        await service.deleteExpiredSessions();

        expect(mockDb.run).toHaveBeenCalledWith(
          'DELETE FROM sessions WHERE expires_at <= datetime("now")',
          [],
          expect.any(Function)
        );
      });
    });
  });

  describe('close', () => {
    it('should close the database connection', async () => {
      await service.close();
      expect(mockDb.close).toHaveBeenCalled();
    });

    it('should handle close errors', async () => {
      const error = new Error('Close failed');
      mockDb.close.mockImplementation((callback: any) => {
        callback(error);
      });

      await expect(service.close()).rejects.toThrow('Close failed');
    });
  });

  describe('Error handling', () => {
    it('should handle database errors in runAsync', async () => {
      const error = new Error('Database locked');
      mockDb.run.mockImplementation((sql: string, params: any[], callback: any) => {
        callback.call({}, error);
        return mockDb;
      });

      await expect(
        service.createUser('test', 'test@example.com', "password")
      ).rejects.toThrow('Database locked');
    });

    it('should handle database errors in getAsync', async () => {
      const error = new Error('Query failed');
      mockDb.get.mockImplementation((sql: string, params: any[], callback: any) => {
        callback(error, null);
        return mockDb;
      });

      await expect(
        service.getUserById(1)
      ).rejects.toThrow('Query failed');
    });

    it('should handle database errors in allAsync', async () => {
      const error = new Error('Invalid SQL');
      mockDb.all.mockImplementation((sql: string, params: any[], callback: any) => {
        callback(error, null);
        return mockDb;
      });

      await expect(
        service.getAllApps()
      ).rejects.toThrow('Invalid SQL');
    });
  });
});