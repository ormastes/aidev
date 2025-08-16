import { Router } from 'express';
import { logger } from '../utils/logger';
import { requireAuth } from '../middleware/auth';
import { optionalJWT } from '../middleware/jwt-auth';
import { ThemeStorageService } from '../services/ThemeStorageService';

export const selectionsRouter = Router();

// Get user selections
selectionsRouter.get('/', optionalJWT, async (req, res) => {
  try {
    const themeStorage = (req as any).themeStorage as ThemeStorageService;
    const themeId = req.query.themeId as string || 'default';
    const epicId = req.query.epicId as string;
    const appId = req.query.appId as string;
    
    // Initialize security context
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      await themeStorage.initializeSecurityContext(authHeader.substring(7));
    } else if ((req as any).session?.userId) {
      await themeStorage.initializeSecurityContext('session-' + (req as any).session.userId);
    }
    
    const selections = await themeStorage.getGUISelections(themeId, epicId, appId);
    
    // Filter by user if not admin
    const userId = req.user?.userId || req.session?.userId;
    const userSelections = userId ? selections.filter(s => s.selectedBy === userId.toString()) : selections;
    
    res.json(userSelections);
  } catch (error) {
    logger.error('Error getting selections:', error);
    res.status(500).json({ error: 'Failed to get selections' });
  }
});

// Get GUI design candidates
selectionsRouter.get('/candidates', optionalJWT, async (req, res) => {
  try {
    const themeStorage = (req as any).themeStorage as ThemeStorageService;
    const themeId = req.query.themeId as string || 'default';
    const epicId = req.query.epicId as string;
    const appId = req.query.appId as string;
    const category = req.query.category as any;
    
    // Initialize security context
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      await themeStorage.initializeSecurityContext(authHeader.substring(7));
    } else if ((req as any).session?.userId) {
      await themeStorage.initializeSecurityContext('session-' + (req as any).session.userId);
    }
    
    const candidates = await themeStorage.getGUICandidates(themeId, epicId, appId, category);
    res.json(candidates);
  } catch (error) {
    logger.error('Error getting candidates:', error);
    res.status(500).json({ error: 'Failed to get candidates' });
  }
});

// Create new selection
selectionsRouter.post('/', optionalJWT, async (req, res) => {
  try {
    const themeStorage = (req as any).themeStorage as ThemeStorageService;
    const { themeId = 'default', epicId, appId, selectedCandidateId, reason, metadata } = req.body;
    
    if (!epicId || !appId || !selectedCandidateId) {
      return res.status(400).json({ error: 'Epic ID, App ID, and selected candidate ID are required' });
    }
    
    const userId = req.user?.userId || req.session?.userId || "anonymous";
    
    // Initialize security context
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      await themeStorage.initializeSecurityContext(authHeader.substring(7));
    } else if ((req as any).session?.userId) {
      await themeStorage.initializeSecurityContext('session-' + (req as any).session.userId);
    }
    
    const selection = await themeStorage.saveGUISelection({
      themeId,
      epicId,
      appId,
      selectedCandidateId,
      selectedBy: userId.toString(),
      reason,
      metadata
    });

    logger.info(`Selection created: ${selection.id} by user ${userId}`);
    res.status(201).json(selection);
  } catch (error) {
    logger.error('Error creating selection:', error);
    res.status(500).json({ error: 'Failed to create selection' });
  }
});

// Create new GUI candidate
selectionsRouter.post('/candidates', requireAuth, async (req, res) => {
  try {
    const themeStorage = (req as any).themeStorage as ThemeStorageService;
    const { themeId = 'default', epicId, appId, name, category, assets, metadata } = req.body;
    
    if (!epicId || !appId || !name || !category) {
      return res.status(400).json({ error: 'Epic ID, App ID, name, and category are required' });
    }
    
    const userId = req.user?.userId || req.session?.userId;
    
    // Initialize security context
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      await themeStorage.initializeSecurityContext(authHeader.substring(7));
    } else if ((req as any).session?.userId) {
      await themeStorage.initializeSecurityContext('session-' + (req as any).session.userId);
    }
    
    const candidate = await themeStorage.saveGUICandidate(themeId, epicId, appId, {
      name,
      category,
      assets: assets || { preview: '', mockups: [] },
      metadata: {
        designer: userId?.toString() || "anonymous",
        createdAt: new Date().toISOString(),
        tags: metadata?.tags || [],
        ...metadata
      }
    });

    logger.info(`GUI candidate created: ${candidate.candidateId}`);
    res.status(201).json(candidate);
  } catch (error) {
    logger.error('Error creating GUI candidate:', error);
    res.status(500).json({ error: 'Failed to create GUI candidate' });
  }
});

// Get selection by ID
selectionsRouter.get('/:id', optionalJWT, async (req, res) => {
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
    
    // Search for the selection across all epics and apps
    const searchResult = await themeStorage.searchAll(req.params.id, {
      themeIds: [themeId],
      types: ["selection"]
    });
    
    const selection = searchResult.selections.find(s => s.id === req.params.id);
    
    if (!selection) {
      return res.status(404).json({ error: 'Selection not found' });
    }
    
    res.json(selection);
  } catch (error) {
    logger.error('Error getting selection:', error);
    res.status(500).json({ error: 'Failed to get selection' });
  }
});

// Note: Update and delete operations would require modifying the Theme Storage System
// to support updating/deleting specific storage layer items.
// For now, selections are immutable once created.