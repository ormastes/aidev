import { Router } from 'express';
import { logger } from '../utils/logger';
import { ThemeStorageService } from '../services/ThemeStorageService';
import { optionalJWT } from '../middleware/jwt-auth';

const router = Router();

// GET /api/themes - Get all available themes
router.get('/', async (req, res) => {
  try {
    const themeStorage = (req as any).themeStorage as ThemeStorageService;
    const externalLog = (req as any).externalLog;
    
    await externalLog.logSystemEvent('themes_list_requested', {
      userAgent: req.get('user-agent'),
      platform: req.query.platform || 'web'
    });
    
    // Initialize security context
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      await themeStorage.initializeSecurityContext(authHeader.substring(7));
    } else if ((req as any).session?.userId) {
      await themeStorage.initializeSecurityContext('session-' + (req as any).session.userId);
    }
    
    // For now, return a default theme if no themes exist
    const defaultTheme = await themeStorage.getTheme('default');
    if (!defaultTheme) {
      // Create default theme if it doesn't exist
      await themeStorage.createTheme({
        name: 'Default Theme',
        description: 'The default GUI selector theme',
        permissions: {
          owner: 'system',
          readAccess: ['*'],
          writeAccess: ['admin'],
          adminAccess: ['admin']
        }
      });
    }
    
    // In a real implementation, you would list all themes the user has access to
    const themes = defaultTheme ? [defaultTheme] : [];
    
    res.json({
      success: true,
      themes,
      platform: req.query.platform || 'web'
    });

  } catch (error) {
    logger.error('Error fetching themes:', error);
    await (req as any).externalLog.logError('themes_fetch_error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch themes'
    });
  }
});

// GET /api/themes/:id - Get specific theme
router.get('/:id', async (req, res) => {
  try {
    const themeStorage = (req as any).themeStorage as ThemeStorageService;
    const externalLog = (req as any).externalLog;
    const { id } = req.params;

    await externalLog.logSystemEvent('theme_detail_requested', {
      themeId: id,
      platform: req.query.platform || 'web'
    });
    
    // Initialize security context
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      await themeStorage.initializeSecurityContext(authHeader.substring(7));
    } else if ((req as any).session?.userId) {
      await themeStorage.initializeSecurityContext('session-' + (req as any).session.userId);
    }

    const theme = await themeStorage.getTheme(id);
    
    if (!theme) {
      return res.status(404).json({
        success: false,
        error: 'Theme not found'
      });
    }
    
    res.json({
      success: true,
      theme
    });

  } catch (error) {
    logger.error(`Error fetching theme ${req.params.id}:`, error);
    await (req as any).externalLog.logError('theme_fetch_error', error, { themeId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch theme'
    });
  }
});

// POST /api/themes - Create new theme
router.post('/', optionalJWT, async (req, res) => {
  try {
    const themeStorage = (req as any).themeStorage as ThemeStorageService;
    const externalLog = (req as any).externalLog;
    const { name, description, dependencies } = req.body;
    const userId = req.user?.userId || (req as any).session?.userId || "anonymous";

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Theme name is required'
      });
    }
    
    // Initialize security context
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      await themeStorage.initializeSecurityContext(authHeader.substring(7));
    } else if ((req as any).session?.userId) {
      await themeStorage.initializeSecurityContext('session-' + (req as any).session.userId);
    }

    await externalLog.logSystemEvent('theme_create_requested', {
      name,
      userId
    });

    const theme = await themeStorage.createTheme({
      name,
      description,
      dependencies,
      permissions: {
        owner: userId.toString(),
        readAccess: [userId.toString()],
        writeAccess: [userId.toString()],
        adminAccess: [userId.toString()]
      }
    });
    
    res.status(201).json({
      success: true,
      theme
    });

  } catch (error) {
    logger.error('Error creating theme:', error);
    await (req as any).externalLog.logError('theme_create_error', error, { body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to create theme'
    });
  }
});

// GET /api/themes/:id/analytics - Get theme analytics
router.get('/:id/analytics', optionalJWT, async (req, res) => {
  try {
    const themeStorage = (req as any).themeStorage as ThemeStorageService;
    const externalLog = (req as any).externalLog;
    const { id } = req.params;

    await externalLog.logSystemEvent('theme_analytics_requested', {
      themeId: id
    });
    
    // Initialize security context
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      await themeStorage.initializeSecurityContext(authHeader.substring(7));
    } else if ((req as any).session?.userId) {
      await themeStorage.initializeSecurityContext('session-' + (req as any).session.userId);
    }

    const analytics = await themeStorage.getThemeAnalytics(id);
    
    res.json({
      success: true,
      analytics
    });

  } catch (error) {
    logger.error(`Error fetching theme analytics ${req.params.id}:`, error);
    await (req as any).externalLog.logError('theme_analytics_error', error, { themeId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch theme analytics'
    });
  }
});

// POST /api/themes/:id/epic - Create epic within theme
router.post('/:id/epic', optionalJWT, async (req, res) => {
  try {
    const themeStorage = (req as any).themeStorage as ThemeStorageService;
    const externalLog = (req as any).externalLog;
    const { id: themeId } = req.params;
    const { name, description, status = "planning" } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Epic name is required'
      });
    }
    
    // Initialize security context
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      await themeStorage.initializeSecurityContext(authHeader.substring(7));
    } else if ((req as any).session?.userId) {
      await themeStorage.initializeSecurityContext('session-' + (req as any).session.userId);
    }

    await externalLog.logSystemEvent('epic_create_requested', {
      themeId,
      name
    });

    const epic = await themeStorage.createEpic({
      themeId,
      name,
      description,
      status
    });
    
    res.status(201).json({
      success: true,
      epic
    });

  } catch (error) {
    logger.error('Error creating epic:', error);
    await (req as any).externalLog.logError('epic_create_error', error, { body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to create epic'
    });
  }
});

// POST /api/themes/:themeId/epic/:epicId/app - Create app within epic
router.post('/:themeId/epic/:epicId/app', optionalJWT, async (req, res) => {
  try {
    const themeStorage = (req as any).themeStorage as ThemeStorageService;
    const externalLog = (req as any).externalLog;
    const { themeId, epicId } = req.params;
    const { name, version = '1.0.0', environment = "development" } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'App name is required'
      });
    }
    
    // Initialize security context
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      await themeStorage.initializeSecurityContext(authHeader.substring(7));
    } else if ((req as any).session?.userId) {
      await themeStorage.initializeSecurityContext('session-' + (req as any).session.userId);
    }

    await externalLog.logSystemEvent('app_create_requested', {
      themeId,
      epicId,
      name
    });

    const app = await themeStorage.createApp({
      themeId,
      epicId,
      name,
      version,
      environment
    });
    
    res.status(201).json({
      success: true,
      app
    });

  } catch (error) {
    logger.error('Error creating app:', error);
    await (req as any).externalLog.logError('app_create_error', error, { body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to create app'
    });
  }
});

// GET /api/themes/search - Search across all theme data
router.get('/search', optionalJWT, async (req, res) => {
  try {
    const themeStorage = (req as any).themeStorage as ThemeStorageService;
    const externalLog = (req as any).externalLog;
    const { q: query, types, dateFrom, dateTo } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }
    
    // Initialize security context
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      await themeStorage.initializeSecurityContext(authHeader.substring(7));
    } else if ((req as any).session?.userId) {
      await themeStorage.initializeSecurityContext('session-' + (req as any).session.userId);
    }

    await externalLog.logSystemEvent('theme_search_requested', {
      query,
      types
    });

    const results = await themeStorage.searchAll(query as string, {
      types: types ? (types as string).split(',') as any : undefined,
      dateRange: dateFrom && dateTo ? {
        start: dateFrom as string,
        end: dateTo as string
      } : undefined
    });
    
    res.json({
      success: true,
      results
    });

  } catch (error) {
    logger.error('Error searching themes:', error);
    await (req as any).externalLog.logError('theme_search_error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search themes'
    });
  }
});

export { router as themesRouter };