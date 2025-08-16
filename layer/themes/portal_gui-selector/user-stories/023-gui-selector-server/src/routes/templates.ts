import { Router } from 'express';
import { ThemeStorageService } from '../services/ThemeStorageService';
import { logger } from '../utils/logger';

export const templateRouter = Router();

// List all templates
templateRouter.get('/', async (req, res) => {
  try {
    const themeStorage = (req as any).themeStorage as ThemeStorageService;
    const themeId = req.query.themeId as string || 'default';
    
    // Initialize security context with auth token if available
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      await themeStorage.initializeSecurityContext(authHeader.substring(7));
    } else if ((req as any).session?.userId) {
      // Use session info for security context
      await themeStorage.initializeSecurityContext('session-' + (req as any).session.userId);
    }
    
    const templates = await themeStorage.getTemplates(themeId);
    res.json(templates);
  } catch (error) {
    logger.error('Error listing templates:', error);
    res.status(500).json({ error: 'Failed to list templates' });
  }
});

// Search templates - must be before :id route
templateRouter.get('/search', async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    
    const themeStorage = (req as any).themeStorage as ThemeStorageService;
    const themeId = req.query.themeId as string;
    
    // Initialize security context
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      await themeStorage.initializeSecurityContext(authHeader.substring(7));
    } else if ((req as any).session?.userId) {
      await themeStorage.initializeSecurityContext('session-' + (req as any).session.userId);
    }
    
    const results = await themeStorage.searchAll(query, {
      themeIds: themeId ? [themeId] : undefined,
      types: ['template']
    });
    res.json(results.templates);
  } catch (error) {
    logger.error('Error searching templates:', error);
    res.status(500).json({ error: 'Failed to search templates' });
  }
});

// Get templates by category - must be before :id route
templateRouter.get('/category/:category', async (req, res) => {
  try {
    const themeStorage = (req as any).themeStorage as ThemeStorageService;
    const themeId = req.query.themeId as string || 'default';
    
    // Initialize security context
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      await themeStorage.initializeSecurityContext(authHeader.substring(7));
    } else if ((req as any).session?.userId) {
      await themeStorage.initializeSecurityContext('session-' + (req as any).session.userId);
    }
    
    const templates = await themeStorage.getTemplates(themeId, req.params.category);
    res.json(templates);
  } catch (error) {
    logger.error('Error getting templates by category:', error);
    res.status(500).json({ error: 'Failed to get templates by category' });
  }
});

// Get template by ID
templateRouter.get('/:id', async (req, res) => {
  try {
    const themeStorage = (req as any).themeStorage as ThemeStorageService;
    const themeId = req.query.themeId as string || 'default';
    
    // Initialize security context
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      await themeStorage.initializeSecurityContext(authHeader.substring(7));
    } else if ((req as any).session?.userId) {
      await themeStorage.initializeSecurityContext('session-' + (req as any).session.userId);
    }
    
    const templates = await themeStorage.getTemplates(themeId);
    const template = templates.find(t => t.id === req.params.id);
    
    if (template) {
      res.json(template);
    } else {
      res.status(404).json({ error: 'Template not found' });
    }
  } catch (error) {
    logger.error('Error getting template:', error);
    res.status(500).json({ error: 'Failed to get template' });
  }
});

// Get template preview
templateRouter.get('/:id/preview', async (req, res) => {
  try {
    const themeStorage = (req as any).themeStorage as ThemeStorageService;
    const themeId = req.query.themeId as string || 'default';
    
    // Initialize security context
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      await themeStorage.initializeSecurityContext(authHeader.substring(7));
    } else if ((req as any).session?.userId) {
      await themeStorage.initializeSecurityContext('session-' + (req as any).session.userId);
    }
    
    const templates = await themeStorage.getTemplates(themeId);
    const template = templates.find(t => t.id === req.params.id);
    
    if (template && template.preview) {
      res.json({ preview: template.preview });
    } else {
      res.status(404).json({ error: 'Template preview not found' });
    }
  } catch (error) {
    logger.error('Error getting template preview:', error);
    res.status(500).json({ error: 'Failed to get template preview' });
  }
});

// Create new template
templateRouter.post('/', async (req, res) => {
  try {
    const themeStorage = (req as any).themeStorage as ThemeStorageService;
    const { themeId = 'default', name, description, category, preview, source, metadata } = req.body;
    
    if (!name || !category) {
      return res.status(400).json({ error: 'Name and category are required' });
    }
    
    // Initialize security context
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      await themeStorage.initializeSecurityContext(authHeader.substring(7));
    } else if ((req as any).session?.userId) {
      await themeStorage.initializeSecurityContext('session-' + (req as any).session.userId);
    }
    
    const template = await themeStorage.saveTemplate({
      themeId,
      name,
      description,
      category,
      preview,
      source,
      metadata
    });
    
    res.status(201).json(template);
  } catch (error) {
    logger.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});