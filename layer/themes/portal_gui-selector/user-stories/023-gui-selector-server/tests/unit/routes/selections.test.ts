import request from 'supertest';
import express from 'express';
import session from 'express-session';
import { selectionsRouter } from '../../../src/routes/selections';

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('Selections Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false }
    }));
    app.use('/api/selections', selectionsRouter);
  });

  describe('GET /api/selections', () => {
    it('should list all selections without authentication', async () => {
      const response = await request(app)
        .get('/api/selections');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
    });

    it('should filter selections by user when authenticated', async () => {
      // Create app with user authentication
      const authApp = express();
      authApp.use(express.json());
      authApp.use((req: any, res, next) => {
        req.user = { userId: 1, username: 'testuser', role: 'user' };
        next();
      });
      authApp.use('/api/selections', selectionsRouter);

      // Create a selection for the user
      await request(authApp)
        .post('/api/selections')
        .send({
          templateId: 'template-1',
          projectName: 'User Project'
        });

      // Create another selection for different user
      const otherApp = express();
      otherApp.use(express.json());
      otherApp.use((req: any, res, next) => {
        req.user = { userId: 2, username: 'otheruser', role: 'user' };
        next();
      });
      otherApp.use('/api/selections', selectionsRouter);

      await request(otherApp)
        .post('/api/selections')
        .send({
          templateId: 'template-2',
          projectName: 'Other User Project'
        });

      // Get selections for first user
      const response = await request(authApp)
        .get('/api/selections');

      expect(response.status).toBe(200);
      const userSelections = response.body.filter((s: any) => s.userId === '1');
      expect(userSelections.length).toBeGreaterThan(0);
      expect(userSelections.every((s: any) => s.userId === '1')).toBe(true);
    });

    it('should use session userId when available', async () => {
      const agent = request.agent(app);
      
      // Login to establish session
      app.use((req: any, res, next) => {
        if (req.path === '/login') {
          req.session.userId = '123';
          res.json({ success: true });
        } else {
          next();
        }
      });

      await agent.post('/login');

      // Create selection with session
      await agent
        .post('/api/selections')
        .send({
          templateId: 'template-session',
          projectName: 'Session Project'
        });

      const response = await agent
        .get('/api/selections');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/selections', () => {
    it('should create new selection', async () => {
      const response = await request(app)
        .post('/api/selections')
        .send({
          templateId: 'template-123',
          projectName: 'Test Project',
          comments: 'Test comments'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('templateId', 'template-123');
      expect(response.body).toHaveProperty('projectName', 'Test Project');
      expect(response.body).toHaveProperty('comments', 'Test comments');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should create selection with empty comments', async () => {
      const response = await request(app)
        .post('/api/selections')
        .send({
          templateId: 'template-123',
          projectName: 'Test Project'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('comments', '');
    });

    it('should require templateId and projectName', async () => {
      const response = await request(app)
        .post('/api/selections')
        .send({
          comments: 'Missing required fields'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Template ID and project name required');
    });

    it('should set userId from authenticated user', async () => {
      const authApp = express();
      authApp.use(express.json());
      authApp.use((req: any, res, next) => {
        req.user = { userId: 456, username: 'authuser', role: 'user' };
        next();
      });
      authApp.use('/api/selections', selectionsRouter);

      const response = await request(authApp)
        .post('/api/selections')
        .send({
          templateId: 'template-auth',
          projectName: 'Auth Project'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('userId', '456');
    });

    it('should set userId to anonymous when no authentication', async () => {
      const response = await request(app)
        .post('/api/selections')
        .send({
          templateId: 'template-anon',
          projectName: 'Anonymous Project'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('userId', 'anonymous');
    });
  });

  describe('PUT /api/selections/:id', () => {
    it('should update selection when authorized', async () => {
      const agent = request.agent(app);
      
      // Setup session
      app.use((req: any, res, next) => {
        if (req.path === '/login') {
          req.session.userId = '123';
          res.json({ success: true });
        } else {
          next();
        }
      });

      await agent.post('/login');

      // Create a selection
      const createResponse = await agent
        .post('/api/selections')
        .send({
          templateId: 'template-update',
          projectName: 'Original Name',
          comments: 'Original comments'
        });

      const selectionId = createResponse.body.id;

      // Update the selection
      const updateResponse = await agent
        .put(`/api/selections/${selectionId}`)
        .send({
          projectName: 'Updated Name',
          comments: 'Updated comments'
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body).toHaveProperty('projectName', 'Updated Name');
      expect(updateResponse.body).toHaveProperty('comments', 'Updated comments');
      expect(new Date(updateResponse.body.updatedAt).getTime())
        .toBeGreaterThan(new Date(createResponse.body.createdAt).getTime());
    });

    it('should allow partial updates', async () => {
      const agent = request.agent(app);
      
      // Setup session
      app.use((req: any, res, next) => {
        if (req.path === '/login') {
          req.session.userId = '123';
          res.json({ success: true });
        } else {
          next();
        }
      });

      await agent.post('/login');

      // Create a selection
      const createResponse = await agent
        .post('/api/selections')
        .send({
          templateId: 'template-partial',
          projectName: 'Original Name',
          comments: 'Original comments'
        });

      const selectionId = createResponse.body.id;

      // Update only comments
      const updateResponse = await agent
        .put(`/api/selections/${selectionId}`)
        .send({
          comments: 'Only comments updated'
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body).toHaveProperty('projectName', 'Original Name');
      expect(updateResponse.body).toHaveProperty('comments', 'Only comments updated');
    });

    it('should return 404 for non-existent selection', async () => {
      const agent = request.agent(app);
      
      // Setup session
      app.use((req: any, res, next) => {
        if (req.path === '/login') {
          req.session.userId = '123';
          res.json({ success: true });
        } else {
          next();
        }
      });

      await agent.post('/login');

      const response = await agent
        .put('/api/selections/non-existent')
        .send({
          projectName: 'Updated Name'
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Selection not found');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/selections/some-id')
        .send({
          projectName: 'Updated Name'
        });

      expect(response.status).toBe(401);
    });

    it('should return 403 for unauthorized user', async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);
      
      // Setup sessions for two users
      app.use((req: any, res, next) => {
        if (req.path === '/login1') {
          req.session.userId = 'user1';
          res.json({ success: true });
        } else if (req.path === '/login2') {
          req.session.userId = 'user2';
          res.json({ success: true });
        } else {
          next();
        }
      });

      await agent1.post('/login1');
      await agent2.post('/login2');

      // Create selection as user1
      const createResponse = await agent1
        .post('/api/selections')
        .send({
          templateId: 'template-auth',
          projectName: 'User1 Project'
        });

      const selectionId = createResponse.body.id;

      // Try to update as user2
      const updateResponse = await agent2
        .put(`/api/selections/${selectionId}`)
        .send({
          projectName: 'Hacked Name'
        });

      expect(updateResponse.status).toBe(403);
      expect(updateResponse.body).toHaveProperty('error', 'Unauthorized');
    });
  });

  describe('DELETE /api/selections/:id', () => {
    it('should delete selection when authorized', async () => {
      const agent = request.agent(app);
      
      // Setup session
      app.use((req: any, res, next) => {
        if (req.path === '/login') {
          req.session.userId = '123';
          res.json({ success: true });
        } else {
          next();
        }
      });

      await agent.post('/login');

      // Create a selection
      const createResponse = await agent
        .post('/api/selections')
        .send({
          templateId: 'template-delete',
          projectName: 'To Delete'
        });

      const selectionId = createResponse.body.id;

      // Delete the selection
      const deleteResponse = await agent
        .delete(`/api/selections/${selectionId}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body).toHaveProperty('message', 'Selection deleted successfully');

      // Verify it's deleted
      const getResponse = await agent.get('/api/selections');
      const deletedSelection = getResponse.body.find((s: any) => s.id === selectionId);
      expect(deletedSelection).toBeUndefined();
    });

    it('should return 404 for non-existent selection', async () => {
      const agent = request.agent(app);
      
      // Setup session
      app.use((req: any, res, next) => {
        if (req.path === '/login') {
          req.session.userId = '123';
          res.json({ success: true });
        } else {
          next();
        }
      });

      await agent.post('/login');

      const response = await agent
        .delete('/api/selections/non-existent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Selection not found');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/selections/some-id');

      expect(response.status).toBe(401);
    });

    it('should return 403 for unauthorized user', async () => {
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);
      
      // Setup sessions for two users
      app.use((req: any, res, next) => {
        if (req.path === '/login1') {
          req.session.userId = 'user1';
          res.json({ success: true });
        } else if (req.path === '/login2') {
          req.session.userId = 'user2';
          res.json({ success: true });
        } else {
          next();
        }
      });

      await agent1.post('/login1');
      await agent2.post('/login2');

      // Create selection as user1
      const createResponse = await agent1
        .post('/api/selections')
        .send({
          templateId: 'template-unauth',
          projectName: 'User1 Project'
        });

      const selectionId = createResponse.body.id;

      // Try to delete as user2
      const deleteResponse = await agent2
        .delete(`/api/selections/${selectionId}`);

      expect(deleteResponse.status).toBe(403);
      expect(deleteResponse.body).toHaveProperty('error', 'Unauthorized');
    });
  });
});