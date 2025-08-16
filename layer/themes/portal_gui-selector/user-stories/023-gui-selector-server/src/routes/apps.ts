import { Router } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { authenticateJWT, authorizeRole, optionalJWT } from '../middleware/jwt-auth';
import { logger } from '../utils/logger';
import { path } from '../../../../../infra_external-log-lib/src';
import { fs } from '../../../../../infra_external-log-lib/src';

export const appsRouter = Router();
const db = new DatabaseService();

// List all apps (admin) or user's apps
appsRouter.get('/', authenticateJWT, async (req, res) => {
  try {
    let apps;
    if (req.user?.role === 'admin') {
      apps = await db.getAllApps();
    } else {
      apps = await db.getAppsByOwner(req.user!.userId);
    }
    res.json(apps);
  } catch (error) {
    logger.error('Error listing apps:', error);
    res.status(500).json({ error: 'Failed to list apps' });
  }
});

// Get specific app
appsRouter.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const app = await db.getAppById(parseInt(req.params.id));
    
    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }
    
    // Check authorization
    if (req.user?.role !== 'admin' && app.owner_id !== req.user?.userId) {
      return res.status(403).json({ error: 'Not authorized to view this app' });
    }
    
    res.json(app);
  } catch (error) {
    logger.error('Error getting app:', error);
    res.status(500).json({ error: 'Failed to get app' });
  }
});

// Create new app
appsRouter.post('/', optionalJWT, async (req, res) => {
  try {
    const { name, description, path: appPath, port } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name required' });
    }
    
    // For demo purposes, create simple response without database
    if (!req.user) {
      const demoAppId = Date.now();
      logger.info(`Demo app created: ${name}`);
      return res.status(201).json({ 
        message: 'App created successfully',
        appId: demoAppId,
        id: demoAppId 
      });
    }
    
    // Validate path if provided (skip validation for demo paths)
    if (appPath && !appPath.startsWith('/demo/')) {
      const fullPath = path.resolve(appPath);
      if (!fs.existsSync(fullPath)) {
        return res.status(400).json({ error: 'Invalid path' });
      }
    }
    
    const result = await db.createApp(
      name,
      description || 'Demo app',
      req.user.userId,
      appPath,
      port
    );
    
    logger.info(`App created: ${name} by user ${req.user.username}`);
    res.status(201).json({ 
      message: 'App created successfully',
      appId: result.lastID,
      id: result.lastID 
    });
  } catch (error) {
    logger.error('Error creating app:', error);
    res.status(500).json({ error: 'Failed to create app' });
  }
});

// Update app
appsRouter.put('/:id', authenticateJWT, async (req, res) => {
  try {
    const appId = parseInt(req.params.id);
    const app = await db.getAppById(appId);
    
    if (!app) {
      return res.status(404).json({ error: 'App not found' });
    }
    
    // Check authorization
    if (req.user?.role !== 'admin' && app.owner_id !== req.user?.userId) {
      return res.status(403).json({ error: 'Not authorized to update this app' });
    }
    
    // TODO: Implement update logic
    res.json({ message: 'App update not yet implemented' });
  } catch (error) {
    logger.error('Error updating app:', error);
    res.status(500).json({ error: 'Failed to update app' });
  }
});

// Delete app (admin only)
appsRouter.delete('/:id', authenticateJWT, authorizeRole('admin'), async (req, res) => {
  try {
    const appId = parseInt(req.params.id);
    // TODO: Implement delete logic with cascade
    res.json({ message: 'App deletion not yet implemented' });
  } catch (error) {
    logger.error('Error deleting app:', error);
    res.status(500).json({ error: 'Failed to delete app' });
  }
});

// Validate path endpoint
appsRouter.post('/validate-path', authenticateJWT, async (req, res) => {
  try {
    const { path: checkPath } = req.body;
    
    if (!checkPath) {
      return res.status(400).json({ error: 'Path required' });
    }
    
    const fullPath = path.resolve(checkPath);
    const exists = fs.existsSync(fullPath);
    const isDirectory = exists && fs.statSync(fullPath).isDirectory();
    
    res.json({
      valid: exists && isDirectory,
      exists,
      isDirectory,
      absolutePath: fullPath
    });
  } catch (error) {
    logger.error('Error validating path:', error);
    res.status(500).json({ error: 'Failed to validate path' });
  }
});