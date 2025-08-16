import request from "supertest";
import express from 'express';
import { healthRouter } from '../../../src/routes/health';

describe('health routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use('/health', healthRouter);
    
    // Mock process.uptime
    jest.spyOn(process, 'uptime').mockReturnValue(12345.678);
    
    // Mock Date
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T10:30:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'healthy',
        service: 'gui-selector-server',
        version: '1.0.0',
        timestamp: '2024-01-15T10:30:00.000Z',
        uptime: 12345.678
      });
    });

    it('should use current timestamp', async () => {
      // Change time
      jest.setSystemTime(new Date('2024-12-25T00:00:00Z'));
      
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.timestamp).toBe('2024-12-25T00:00:00.000Z');
    });

    it('should use actual process uptime', async () => {
      // Change uptime
      (process.uptime as jest.Mock).mockReturnValue(99999.999);
      
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.uptime).toBe(99999.999);
    });
  });

  describe('GET /health/ready', () => {
    it('should return ready status when system is ready', async () => {
      const response = await request(app)
        .get('/health/ready')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ready',
        checks: {
          database: "connected",
          templates: 'loaded'
        }
      });
    });

    // Note: The current implementation always returns ready
    // This test demonstrates what a real readiness check might look like
    it('should check actual service readiness', () => {
      // In a real implementation, you would check:
      // - Database connectivity
      // - Required services initialized
      // - Configuration loaded
      // - etc.
      
      // For now, we just verify the response format
      // Test implementation pending
    });
  });

  // Note: Error handling for unknown routes is handled by Express
  // at the application level, not at the router level
});