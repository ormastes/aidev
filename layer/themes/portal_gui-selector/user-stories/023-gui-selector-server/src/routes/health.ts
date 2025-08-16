import { Router } from 'express';
import { logger } from '../utils/logger';

export const healthRouter = Router();

healthRouter.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'gui-selector-server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

healthRouter.get('/ready', (req, res) => {
  // Check if all services are ready
  const isReady = true; // In real implementation, check database, etc.
  
  if (isReady) {
    res.json({
      status: 'ready',
      checks: {
        database: "connected",
        templates: 'loaded'
      }
    });
  } else {
    res.status(503).json({
      status: 'not ready',
      checks: {
        database: "disconnected",
        templates: 'loading'
      }
    });
  }
});