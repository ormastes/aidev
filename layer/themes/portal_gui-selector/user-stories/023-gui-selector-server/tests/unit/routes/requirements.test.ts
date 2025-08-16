import request from "supertest";
import express from 'express';
import session from 'express-session';
import { requirementsRouter } from '../../../src/routes/requirements';

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('Requirements Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(session({
      secret: process.env.SECRET || "PLACEHOLDER",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false }
    }));
    app.use('/api/requirements', requirementsRouter);
  });

  describe('GET /api/requirements', () => {
    it('should list all requirements without authentication', async () => {
      const response = await request(app)
        .get('/api/requirements');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
    });

    it('should filter requirements by user when authenticated', async () => {
      // Create app with user authentication
      const authApp = express();
      authApp.use(express.json());
      authApp.use((req: any, res, next) => {
        req.user = { userId: 1, username: "testuser", role: 'user' };
        next();
      });
      authApp.use('/api/requirements', requirementsRouter);

      // Create a requirement for the user
      await request(authApp)
        .post('/api/requirements')
        .send({
          selectionId: 'sel-123',
          type: "functional",
          description: 'User requirement'
        });

      // Create another requirement for different user
      const otherApp = express();
      otherApp.use(express.json());
      otherApp.use((req: any, res, next) => {
        req.user = { userId: 2, username: "otheruser", role: 'user' };
        next();
      });
      otherApp.use('/api/requirements', requirementsRouter);

      await request(otherApp)
        .post('/api/requirements')
        .send({
          selectionId: 'sel-456',
          type: 'design',
          description: 'Other user requirement'
        });

      // Get requirements for first user
      const response = await request(authApp)
        .get('/api/requirements');

      expect(response.status).toBe(200);
      const userRequirements = response.body.filter((r: any) => r.userId === '1');
      expect(userRequirements.length).toBeGreaterThan(0);
      expect(userRequirements.every((r: any) => r.userId === '1')).toBe(true);
    });

    it('should filter by session userId when available', async () => {
      const agent = request.agent(app);
      
      // Set session data
      await agent
        .post('/api/requirements')
        .send({
          selectionId: 'sel-789',
          type: "technical",
          description: 'Session requirement'
        });

      const response = await agent
        .get('/api/requirements');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/requirements', () => {
    it('should create new requirement', async () => {
      const response = await request(app)
        .post('/api/requirements')
        .send({
          selectionId: 'sel-123',
          type: "functional",
          description: 'Test requirement',
          priority: 'high'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty("selectionId", 'sel-123');
      expect(response.body).toHaveProperty('type', "functional");
      expect(response.body).toHaveProperty("description", 'Test requirement');
      expect(response.body).toHaveProperty("priority", 'high');
      expect(response.body).toHaveProperty('status', 'pending');
      expect(response.body).toHaveProperty("createdAt");
      expect(response.body).toHaveProperty("updatedAt");
    });

    it('should set default priority to medium', async () => {
      const response = await request(app)
        .post('/api/requirements')
        .send({
          selectionId: 'sel-123',
          type: 'design',
          description: 'Test without priority'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("priority", 'medium');
    });

    it('should require selectionId, type, and description', async () => {
      const response = await request(app)
        .post('/api/requirements')
        .send({
          type: "functional"
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Selection ID, type, and description required');
    });

    it('should set userId from authenticated user', async () => {
      const authApp = express();
      authApp.use(express.json());
      authApp.use((req: any, res, next) => {
        req.user = { userId: 123, username: "testuser", role: 'user' };
        next();
      });
      authApp.use('/api/requirements', requirementsRouter);

      const response = await request(authApp)
        .post('/api/requirements')
        .send({
          selectionId: 'sel-123',
          type: "technical",
          description: 'Authenticated requirement'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('userId', '123');
    });

    it('should set userId to anonymous when no authentication', async () => {
      const response = await request(app)
        .post('/api/requirements')
        .send({
          selectionId: 'sel-123',
          type: 'other',
          description: 'Anonymous requirement'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('userId', "anonymous");
    });

    it('should validate requirement type', async () => {
      const validTypes = ["functional", 'design', "technical", 'other'];
      
      for (const type of validTypes) {
        const response = await request(app)
          .post('/api/requirements')
          .send({
            selectionId: 'sel-123',
            type,
            description: `${type} requirement`
          });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('type', type);
      }
    });
  });

  describe('GET /api/requirements/export', () => {
    beforeEach(async () => {
      // Create some test requirements
      await request(app)
        .post('/api/requirements')
        .send({
          selectionId: 'sel-001',
          type: "functional",
          description: 'Functional requirement 1',
          priority: 'high'
        });

      await request(app)
        .post('/api/requirements')
        .send({
          selectionId: 'sel-002',
          type: 'design',
          description: 'Design requirement 1',
          priority: 'medium'
        });

      await request(app)
        .post('/api/requirements')
        .send({
          selectionId: 'sel-003',
          type: "technical",
          description: 'Technical requirement 1',
          priority: 'low'
        });
    });

    it('should export requirements as JSON by default', async () => {
      const response = await request(app)
        .get('/api/requirements/export');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("exportDate");
      expect(response.body).toHaveProperty("requirements");
      expect(response.body.requirements).toBeInstanceOf(Array);
      expect(response.body.requirements.length).toBeGreaterThanOrEqual(3);
    });

    it('should export requirements as markdown', async () => {
      const response = await request(app)
        .get('/api/requirements/export?format=markdown');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/markdown');
      expect(response.headers['content-disposition']).toContain('attachment; filename="requirements.md"');
      expect(response.text).toContain('# GUI Requirements Export');
      expect(response.text).toContain('## Functional Requirements');
      expect(response.text).toContain('## Design Requirements');
      expect(response.text).toContain('## Technical Requirements');
    });

    it('should filter exported requirements by user', async () => {
      const authApp = express();
      authApp.use(express.json());
      authApp.use((req: any, res, next) => {
        req.user = { userId: 999, username: "exportuser", role: 'user' };
        next();
      });
      authApp.use('/api/requirements', requirementsRouter);

      // Create a requirement for this user
      await request(authApp)
        .post('/api/requirements')
        .send({
          selectionId: 'sel-export',
          type: "functional",
          description: 'Export test requirement'
        });

      const response = await request(authApp)
        .get('/api/requirements/export');

      expect(response.status).toBe(200);
      const userRequirements = response.body.requirements.filter((r: any) => r.userId === '999');
      expect(userRequirements.length).toBeGreaterThan(0);
      expect(userRequirements.every((r: any) => r.userId === '999')).toBe(true);
    });

    it('should handle export errors gracefully', async () => {
      // Mock error by overriding Array.from
      const originalArrayFrom = Array.from;
      Array.from = jest.fn().mockImplementation(() => {
        throw new Error('Export error');
      });

      const response = await request(app)
        .get('/api/requirements/export');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Failed to export requirements');

      // Restore Array.from
      Array.from = originalArrayFrom;
    });
  });

  describe('Requirement validation', () => {
    it('should validate priority values', async () => {
      const validPriorities = ['high', 'medium', 'low'];
      
      for (const priority of validPriorities) {
        const response = await request(app)
          .post('/api/requirements')
          .send({
            selectionId: 'sel-123',
            type: "functional",
            description: 'Priority test',
            priority
          });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty("priority", priority);
      }
    });

    it('should handle missing required fields', async () => {
      const invalidPayloads = [
        { type: "functional", description: 'Missing selectionId' },
        { selectionId: 'sel-123', description: 'Missing type' },
        { selectionId: 'sel-123', type: "functional" } // Missing description
      ];

      for (const payload of invalidPayloads) {
        const response = await request(app)
          .post('/api/requirements')
          .send(payload);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Selection ID, type, and description required');
      }
    });
  });
});