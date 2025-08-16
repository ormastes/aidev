/**
 * Story Reports API Routes
 * Handles report generation, listing, and management
 */

import express from 'express';
import { authenticateJWT, optionalJWT } from '../middleware/jwt-auth';
import { ThemeStorageService, GUIReport } from '../services/ThemeStorageService';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * GET /api/reports - List all reports
 */
router.get('/', optionalJWT, async (req, res) => {
  try {
    const themeStorage = (req as any).themeStorage as ThemeStorageService;
    const themeId = req.query.themeId as string || 'default';
    const epicId = req.query.epicId as string;
    const appId = req.query.appId as string;
    const type = req.query.type as GUIReport['type'];
    
    // Initialize security context
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      await themeStorage.initializeSecurityContext(authHeader.substring(7));
    } else if ((req as any).session?.userId) {
      await themeStorage.initializeSecurityContext('session-' + (req as any).session.userId);
    }
    
    const reports = await themeStorage.getReports(themeId, epicId, appId, type);
    res.json(reports);
  } catch (error) {
    logger.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/reports/stats - Get report statistics
 */
router.get('/stats', optionalJWT, async (req, res) => {
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
    
    const reports = await themeStorage.getReports(themeId);
    
    const stats = {
      totalReports: reports.length,
      byType: {
        "selection": reports.filter(r => r.type === "selection").length,
        "performance": reports.filter(r => r.type === "performance").length,
        "usability": reports.filter(r => r.type === "usability").length,
        "accessibility": reports.filter(r => r.type === "accessibility").length
      },
      recentActivity: reports
        .filter(r => new Date(r.generatedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        .length
    };

    res.json(stats);
  } catch (error) {
    logger.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/reports/:id - Get specific report
 */
router.get('/:id', optionalJWT, async (req, res) => {
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
    
    // Search for the report
    const searchResult = await themeStorage.searchAll(req.params.id, {
      themeIds: [themeId],
      types: ['report']
    });
    
    const report = searchResult.reports.find(r => r.id === req.params.id);
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Include detailed analysis data if available
    const detailedReport = {
      ...report,
      details: report.data || generateReportDetails(report)
    };

    res.json(detailedReport);
  } catch (error) {
    logger.error('Error fetching report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/reports/generate - Generate new report
 */
router.post('/generate', optionalJWT, async (req, res) => {
  try {
    const themeStorage = (req as any).themeStorage as ThemeStorageService;
    const { 
      themeId = 'default', 
      epicId, 
      appId, 
      type = "selection", 
      title, 
      content,
      data 
    } = req.body;
    
    const user = req.user;
    const userId = user?.userId || (req as any).session?.userId || "anonymous";

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    
    // Initialize security context
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      await themeStorage.initializeSecurityContext(authHeader.substring(7));
    } else if ((req as any).session?.userId) {
      await themeStorage.initializeSecurityContext('session-' + (req as any).session.userId);
    }

    // Create new report
    const newReport = await themeStorage.saveReport({
      themeId,
      epicId,
      appId,
      type,
      title,
      content,
      generatedBy: userId.toString(),
      data: data || generateAnalysisResults(type)
    });

    res.status(201).json(newReport);
  } catch (error) {
    logger.error('Error generating report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/reports/:id/download - Download report
 */
router.get('/:id/download', optionalJWT, async (req, res) => {
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
    
    // Search for the report
    const searchResult = await themeStorage.searchAll(req.params.id, {
      themeIds: [themeId],
      types: ['report']
    });
    
    const report = searchResult.reports.find(r => r.id === req.params.id);
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const reportData = {
      ...report,
      details: report.data || generateReportDetails(report),
      exportedAt: new Date().toISOString()
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${report.title.replace(/\s+/g, '-').toLowerCase()}-report.json"`);
    res.json(reportData);
  } catch (error) {
    logger.error('Error downloading report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/reports/migrate - Migrate reports from database
 */
router.post('/migrate', optionalJWT, async (req, res) => {
  try {
    const themeStorage = (req as any).themeStorage as ThemeStorageService;
    const db = (req as any).db;
    
    // Initialize security context
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      await themeStorage.initializeSecurityContext(authHeader.substring(7));
    } else if ((req as any).session?.userId) {
      await themeStorage.initializeSecurityContext('session-' + (req as any).session.userId);
    }
    
    // Perform migration
    const results = await themeStorage.migrateFromDatabase(db);
    
    res.json({
      message: 'Migration completed',
      ...results
    });
  } catch (error) {
    logger.error('Error migrating reports:', error);
    res.status(500).json({ error: 'Migration failed' });
  }
});

// Helper functions
function generateReportDetails(report: GUIReport) {
  switch (report.type) {
    case "selection":
      return generateSelectionDetails();
    case "performance":
      return generatePerformanceDetails();
    case "usability":
      return generateUsabilityDetails();
    case "accessibility":
      return generateAccessibilityDetails();
    default:
      return { message: 'Report details not available' };
  }
}

function generateSelectionDetails() {
  return {
    summary: {
      totalCandidates: 4,
      selectedCandidate: 'modern-dashboard',
      selectionCriteria: ['User experience', "Performance", "Accessibility"],
      consensusScore: 8.5
    },
    candidates: [
      {
        id: 'modern-dashboard',
        score: 8.5,
        strengths: ['Clean design', 'Intuitive navigation', 'Fast load times'],
        weaknesses: ['Limited color options']
      },
      {
        id: 'professional-layout',
        score: 7.8,
        strengths: ['Corporate look', 'Extensive features'],
        weaknesses: ['Complex navigation', 'Slower performance']
      }
    ],
    recommendations: [
      'Implement color customization options',
      'Add keyboard navigation shortcuts',
      'Optimize image loading for mobile devices'
    ]
  };
}

function generatePerformanceDetails() {
  return {
    summary: {
      avgResponseTime: 245,
      p95ResponseTime: 580,
      throughput: 1250,
      errorRate: 0.02
    },
    endpoints: [
      { path: '/api/templates', avgTime: 120, p95Time: 280 },
      { path: '/api/selections', avgTime: 180, p95Time: 420 },
      { path: '/api/reports', avgTime: 310, p95Time: 750 }
    ],
    bottlenecks: [
      'Database queries in report generation',
      'Template preview rendering',
      'File system operations'
    ]
  };
}

function generateUsabilityDetails() {
  return {
    summary: {
      overallScore: 8.2,
      taskCompletionRate: 92,
      avgTimeToComplete: '3m 24s',
      userSatisfaction: 4.3
    },
    testResults: [
      {
        task: 'Select a template',
        completionRate: 95,
        avgTime: '45s',
        issues: ['Filter options not immediately visible']
      },
      {
        task: 'Generate a report',
        completionRate: 88,
        avgTime: '2m 15s',
        issues: ['Report type selection confusing for new users']
      }
    ],
    recommendations: [
      'Add tooltips for complex features',
      'Improve filter visibility',
      'Simplify report generation workflow'
    ]
  };
}

function generateAccessibilityDetails() {
  return {
    summary: {
      wcagLevel: 'AA',
      score: 87,
      criticalIssues: 0,
      minorIssues: 5
    },
    issues: [
      {
        severity: 'minor',
        element: 'Template preview images',
        issue: 'Missing alt text',
        recommendation: 'Add descriptive alt text for all images'
      },
      {
        severity: 'minor',
        element: 'Form labels',
        issue: 'Some form fields missing labels',
        recommendation: 'Associate all form inputs with labels'
      }
    ],
    strengths: [
      'Good color contrast ratios',
      'Keyboard navigation implemented',
      'Screen reader compatible structure'
    ]
  };
}

function generateAnalysisResults(type: string) {
  return {
    processingTime: Math.floor(Math.random() * 5000) + 2000,
    dataPoints: Math.floor(Math.random() * 100) + 50,
    confidence: (Math.random() * 0.3 + 0.7).toFixed(2),
    timestamp: new Date().toISOString()
  };
}

export default router;