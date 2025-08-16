import request from "supertest";
import express from 'express';
import { appsRouter } from '../../../src/routes/apps';
import { DatabaseService } from '../../../src/services/DatabaseService';
import { fs } from '../../../../../../infra_external-log-lib/src';
import { path } from '../../../../../../infra_external-log-lib/src';

// Mock dependencies
jest.mock('../../../src/services/DatabaseService');
jest.mock('fs');

describe('Apps Routes', () => {
  let app: express.Application;
  let mockDb: jest.Mocked<DatabaseService>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock user authentication
    app.use((req: any, res, next) => {
      req.user = { userId: 1, username: "testuser", role: 'user' };
      next();
    });
    
    app.use('/api/apps', appsRouter);

    // Setup mocks
    mockDb = new DatabaseService() as jest.Mocked<DatabaseService>;
    jest.clearAllMocks();
  });

  describe('GET /api/apps', () => {
    it('should list user apps', async () => {
      mockDb.getAppsByOwner = jest.fn().mockResolvedValue([
        {
          id: 1,
          name: 'Test App',
          description: 'Test Description',
          owner_id: 1,
          path: '/test/app',
          port: 3000
        }
      ]);

      const response = await request(app)
        .get('/api/apps');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body[0]).toHaveProperty('name', 'Test App');
    });

    it('should list all apps for admin', async () => {
      // Override with admin user
      app.use((req: any, res, next) => {
        req.user = { userId: 1, username: 'admin', role: 'admin' };
        next();
      });

      mockDb.getAllApps = jest.fn().mockResolvedValue([
        { id: 1, name: 'App 1' },
        { id: 2, name: 'App 2' }
      ]);

      const response = await request(app)
        .get('/api/apps');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it('should handle database errors', async () => {
      mockDb.getAppsByOwner = jest.fn().mockRejectedValue(new Error('DB Error'));

      const response = await request(app)
        .get('/api/apps');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to list apps');
    });
  });

  describe('GET /api/apps/:id', () => {
    it('should get specific app owned by user', async () => {
      mockDb.getAppById = jest.fn().mockResolvedValue({
        id: 1,
        name: 'Test App',
        description: 'Test Description',
        owner_id: 1,
        path: '/test/app',
        port: 3000
      });

      const response = await request(app)
        .get('/api/apps/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name', 'Test App');
    });

    it('should reject access to app not owned by user', async () => {
      mockDb.getAppById = jest.fn().mockResolvedValue({
        id: 1,
        name: 'Test App',
        owner_id: 2 // Different owner
      });

      const response = await request(app)
        .get('/api/apps/1');

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Not authorized to view this app');
    });

    it('should return 404 for non-existent app', async () => {
      mockDb.getAppById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .get('/api/apps/999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'App not found');
    });

    it('should allow admin to view any app', async () => {
      app.use((req: any, res, next) => {
        req.user = { userId: 1, username: 'admin', role: 'admin' };
        next();
      });

      mockDb.getAppById = jest.fn().mockResolvedValue({
        id: 1,
        name: 'Test App',
        owner_id: 2 // Different owner
      });

      const response = await request(app)
        .get('/api/apps/1');

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/apps', () => {
    it('should create app with valid data', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (path.resolve as jest.Mock).mockReturnValue('/absolute/path');
      
      mockDb.createApp = jest.fn().mockResolvedValue({ lastID: 1 });

      const response = await request(app)
        .post('/api/apps')
        .send({
          name: 'New App',
          description: 'New app description',
          path: '/valid/path',
          port: 3001
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'App created successfully');
      expect(response.body).toHaveProperty('appId', 1);
    });

    it('should create app without authentication for demo', async () => {
      // Remove authentication
      app = express();
      app.use(express.json());
      app.use('/api/apps', appsRouter);

      const response = await request(app)
        .post('/api/apps')
        .send({
          name: 'Demo App'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'App created successfully');
      expect(response.body).toHaveProperty('appId');
    });

    it('should skip path validation for demo paths', async () => {
      mockDb.createApp = jest.fn().mockResolvedValue({ lastID: 1 });

      const response = await request(app)
        .post('/api/apps')
        .send({
          name: 'Demo App',
          description: 'Demo app',
          path: '/demo/test-app',
          port: 3002
        });

      expect(response.status).toBe(201);
      expect(fs.existsSync).not.toHaveBeenCalled();
    });

    it('should validate real paths', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (path.resolve as jest.Mock).mockReturnValue('/invalid/path');

      const response = await request(app)
        .post('/api/apps')
        .send({
          name: 'New App',
          description: 'New app',
          path: '/invalid/path'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid path');
    });

    it('should require name', async () => {
      const response = await request(app)
        .post('/api/apps')
        .send({
          description: 'No name app'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Name required');
    });

    it('should handle database errors', async () => {
      mockDb.createApp = jest.fn().mockRejectedValue(new Error('DB Error'));

      const response = await request(app)
        .post('/api/apps')
        .send({
          name: 'Error App',
          description: 'Will fail'
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to create app');
    });
  });

  describe('PUT /api/apps/:id', () => {
    it('should update app owned by user', async () => {
      mockDb.getAppById = jest.fn().mockResolvedValue({
        id: 1,
        name: 'Old Name',
        owner_id: 1
      });

      const response = await request(app)
        .put('/api/apps/1')
        .send({
          name: 'Updated Name'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'App update not yet implemented');
    });

    it('should reject update for app not owned by user', async () => {
      mockDb.getAppById = jest.fn().mockResolvedValue({
        id: 1,
        name: 'App',
        owner_id: 2
      });

      const response = await request(app)
        .put('/api/apps/1')
        .send({
          name: 'Updated Name'
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Not authorized to update this app');
    });

    it('should return 404 for non-existent app', async () => {
      mockDb.getAppById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .put('/api/apps/999')
        .send({
          name: 'Updated Name'
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'App not found');
    });
  });

  describe('DELETE /api/apps/:id', () => {
    it('should delete app (admin only)', async () => {
      app.use((req: any, res, next) => {
        req.user = { userId: 1, username: 'admin', role: 'admin' };
        next();
      });

      const response = await request(app)
        .delete('/api/apps/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'App deletion not yet implemented');
    });

    it('should reject deletion for non-admin', async () => {
      const response = await request(app)
        .delete('/api/apps/1');

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/apps/validate-path', () => {
    it('should validate existing directory', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true });
      (path.resolve as jest.Mock).mockReturnValue('/absolute/path');

      const response = await request(app)
        .post('/api/apps/validate-path')
        .send({
          path: '/valid/directory'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('valid', true);
      expect(response.body).toHaveProperty("isDirectory", true);
      expect(response.body).toHaveProperty("absolutePath", '/absolute/path');
    });

    it('should validate non-existent path', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (path.resolve as jest.Mock).mockReturnValue('/absolute/path');

      const response = await request(app)
        .post('/api/apps/validate-path')
        .send({
          path: '/non/existent'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('valid', false);
      expect(response.body).toHaveProperty('exists', false);
    });

    it('should validate file (not directory)', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => false });
      (path.resolve as jest.Mock).mockReturnValue('/absolute/file.txt');

      const response = await request(app)
        .post('/api/apps/validate-path')
        .send({
          path: '/some/file.txt'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('valid', false);
      expect(response.body).toHaveProperty('exists', true);
      expect(response.body).toHaveProperty("isDirectory", false);
    });

    it('should require path parameter', async () => {
      const response = await request(app)
        .post('/api/apps/validate-path')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Path required');
    });

    it('should handle filesystem errors', async () => {
      (fs.existsSync as jest.Mock).mockImplementation(() => {
        throw new Error('FS Error');
      });

      const response = await request(app)
        .post('/api/apps/validate-path')
        .send({
          path: '/error/path'
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to validate path');
    });
  });
});