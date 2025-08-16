import request from "supertest";
import express from 'express';
import reportsRouter from '../../../src/routes/reports';

describe('Reports Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/reports', reportsRouter);
  });

  describe('GET /api/reports', () => {
    it('should list all reports', async () => {
      const response = await request(app)
        .get('/api/reports');

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('title');
      expect(response.body[0]).toHaveProperty('type');
      expect(response.body[0]).toHaveProperty('status');
    });

    it('should return reports sorted by creation date (newest first)', async () => {
      const response = await request(app)
        .get('/api/reports');

      expect(response.status).toBe(200);
      const dates = response.body.map((r: any) => new Date(r.createdAt).getTime());
      const sortedDates = [...dates].sort((a, b) => b - a);
      expect(dates).toEqual(sortedDates);
    });
  });

  describe('GET /api/reports/stats', () => {
    it('should return report statistics', async () => {
      const response = await request(app)
        .get('/api/reports/stats');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("totalReports");
      expect(response.body).toHaveProperty('byType');
      expect(response.body.byType).toHaveProperty('user-story');
      expect(response.body.byType).toHaveProperty('test-coverage');
      expect(response.body.byType).toHaveProperty("performance");
      expect(response.body.byType).toHaveProperty("security");
      expect(response.body).toHaveProperty("byStatus");
      expect(response.body.byStatus).toHaveProperty("completed");
      expect(response.body.byStatus).toHaveProperty("generating");
      expect(response.body.byStatus).toHaveProperty('failed');
      expect(response.body).toHaveProperty("recentActivity");
    });

    it('should calculate stats correctly', async () => {
      const reportResponse = await request(app).get('/api/reports');
      const statsResponse = await request(app).get('/api/reports/stats');

      expect(statsResponse.body.totalReports).toBe(reportResponse.body.length);
    });
  });

  describe('GET /api/reports/:id', () => {
    it('should return specific report with details', async () => {
      const response = await request(app)
        .get('/api/reports/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', 1);
      expect(response.body).toHaveProperty('details');
      expect(response.body.details).toHaveProperty('summary');
    });

    it('should return 404 for non-existent report', async () => {
      const response = await request(app)
        .get('/api/reports/99999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Report not found');
    });

    it('should include appropriate details based on report type', async () => {
      // Test user-story report
      const userStoryResponse = await request(app).get('/api/reports/1');
      expect(userStoryResponse.body.details).toHaveProperty('stories');
      expect(userStoryResponse.body.details).toHaveProperty("recommendations");

      // Test test-coverage report
      const coverageResponse = await request(app).get('/api/reports/2');
      expect(coverageResponse.body.details).toHaveProperty('summary');
      expect(coverageResponse.body.details.summary).toHaveProperty("overallCoverage");
    });
  });

  describe('POST /api/reports/generate', () => {
    it('should generate new report', async () => {
      const response = await request(app)
        .post('/api/reports/generate')
        .send({
          title: 'Test Report',
          type: 'user-story',
          description: 'Test description',
          storyPath: '/test/path'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('title', 'Test Report');
      expect(response.body).toHaveProperty('status', "generating");
      expect(response.body).toHaveProperty("generatedBy");
    });

    it('should require title and type', async () => {
      const response = await request(app)
        .post('/api/reports/generate')
        .send({
          description: 'Missing required fields'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Title and type are required');
    });

    it('should set generatedBy to anonymous when no user', async () => {
      const response = await request(app)
        .post('/api/reports/generate')
        .send({
          title: 'Anonymous Report',
          type: "security"
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("generatedBy", "anonymous");
    });

    it('should include metadata with timestamps', async () => {
      const response = await request(app)
        .post('/api/reports/generate')
        .send({
          title: 'Metadata Test',
          type: "performance"
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("metadata");
      expect(response.body.metadata).toHaveProperty("requestedAt");
      expect(response.body.metadata).toHaveProperty("estimatedCompletion");
    });
  });

  describe('DELETE /api/reports/:id', () => {
    it('should delete existing report', async () => {
      // First generate a report
      const createResponse = await request(app)
        .post('/api/reports/generate')
        .send({
          title: 'To Delete',
          type: "security"
        });

      const reportId = createResponse.body.id;

      // Then delete it
      const deleteResponse = await request(app)
        .delete(`/api/reports/${reportId}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body).toHaveProperty('message', 'Report deleted successfully');

      // Verify it's deleted
      const getResponse = await request(app)
        .get(`/api/reports/${reportId}`);
      expect(getResponse.status).toBe(404);
    });

    it('should return 404 for non-existent report', async () => {
      const response = await request(app)
        .delete('/api/reports/99999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Report not found');
    });
  });

  describe('GET /api/reports/:id/download', () => {
    it('should download report as JSON', async () => {
      const response = await request(app)
        .get('/api/reports/1/download');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.headers['content-disposition']).toContain("attachment");
      expect(response.headers['content-disposition']).toContain('.json');
      expect(response.body).toHaveProperty('details');
      expect(response.body).toHaveProperty("exportedAt");
    });

    it('should return 404 for non-existent report', async () => {
      const response = await request(app)
        .get('/api/reports/99999/download');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Report not found');
    });

    it('should sanitize filename in content-disposition', async () => {
      const response = await request(app)
        .get('/api/reports/1/download');

      const contentDisposition = response.headers['content-disposition'];
      expect(contentDisposition).toMatch(/filename="[a-z0-9-]+-report\.json"/);
    });
  });

  describe('Report Type Details', () => {
    it('should generate correct user-story details', async () => {
      const response = await request(app)
        .get('/api/reports/1');

      const details = response.body.details;
      expect(details).toHaveProperty('summary');
      expect(details.summary).toHaveProperty("totalStories");
      expect(details.summary).toHaveProperty("completed");
      expect(details).toHaveProperty('stories');
      expect(details.stories).toBeInstanceOf(Array);
      expect(details).toHaveProperty("recommendations");
      expect(details).toHaveProperty('issues');
    });

    it('should generate correct test-coverage details', async () => {
      const response = await request(app)
        .get('/api/reports/2');

      const details = response.body.details;
      expect(details).toHaveProperty('summary');
      expect(details.summary).toHaveProperty("overallCoverage", 85.4);
      expect(details.summary).toHaveProperty("linesTotal");
      expect(details.summary).toHaveProperty("linesCovered");
      expect(details).toHaveProperty('files');
      expect(details).toHaveProperty("uncoveredAreas");
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid report ID format', async () => {
      const response = await request(app)
        .get('/api/reports/invalid-id');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Report not found');
    });

    it('should handle missing report type in generate', async () => {
      const response = await request(app)
        .post('/api/reports/generate')
        .send({
          title: 'Only Title'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Title and type are required');
    });
  });

  describe("Authentication", () => {
    it('should work without authentication (optionalJWT)', async () => {
      const response = await request(app)
        .get('/api/reports');

      expect(response.status).toBe(200);
    });

    it('should use username from authenticated user', async () => {
      // Create new app with authentication middleware
      const authApp = express();
      authApp.use(express.json());
      authApp.use((req: any, res, next) => {
        req.user = { userId: 1, username: "testuser", role: 'user' };
        next();
      });
      authApp.use('/api/reports', reportsRouter);

      const response = await request(authApp)
        .post('/api/reports/generate')
        .send({
          title: 'Authenticated Report',
          type: "security"
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("generatedBy", "testuser");
    });
  });
});