import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { path } from '../../layer/themes/infra_external-log-lib/src';
import { templateRouter } from './routes/templates';
import { authRouter } from './routes/auth';
import { authJWTRouter } from './routes/auth-jwt';
import { selectionsRouter } from './routes/selections';
import { requirementsRouter } from './routes/requirements';
import { appsRouter } from './routes/apps';
import { healthRouter } from './routes/health';
import reportsRouter from './routes/reports';
import { themesRouter } from './routes/themes';
import { messagesRouter } from './routes/messages';
import pagesRouter from './routes/pages';
import { logger } from './utils/logger';
import { sessionConfig } from './config/session';
import { DatabaseService } from './services/DatabaseService';
import { ExternalLogService } from './services/ExternalLogService';
import { ThemeStorageService } from './services/ThemeStorageService';
import { JWTService } from './services/JWTService';
import { requireAuth } from './middleware/auth';
import bcrypt from 'bcrypt';

// Import SQLite session store
const SQLiteStore = require('connect-sqlite3')(session);

const app = express();

// Initialize services
const db = new DatabaseService();
const externalLog = new ExternalLogService({
  service: 'gui-selector',
  logDir: path.join(__dirname, '../logs'),
  logToConsole: process.env.NODE_ENV === "development"
});
const jwtService = new JWTService();
const themeStorage = new ThemeStorageService(jwtService, externalLog);

// Port MUST be provided by portal_security theme via environment variable
// NEVER hardcode ports - all port allocation goes through EnhancedPortManager
const ENV = process.env.NODE_ENV || "development";
const DEPLOY_TYPE = process.env.DEPLOY_TYPE || ENV;
const PORT = process.env.PORT;

if (!PORT) {
  console.error('❌ ERROR: PORT environment variable is required');
  console.error('Port must be allocated by portal_security theme');
  console.error('Use deploy.sh or deploy-with-security.ts to start the server');
  process.exit(1);
}

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure session with SQLite store
const sessionOptions = {
  ...sessionConfig,
  store: new SQLiteStore({
    db: 'sessions.db',
    concurrentDB: true,
    table: "sessions",
    dir: path.join(__dirname, '../data')
  })
};
app.use(session(sessionOptions));

// Attach services to request object
app.use((req, res, next) => {
  (req as any).db = db;
  (req as any).themeStorage = themeStorage;
  (req as any).externalLog = externalLog;
  (req as any).jwtService = jwtService;
  next();
});

// Request logging with external log
app.use(async (req, res, next) => {
  const start = Date.now();
  
  // Log request
  await externalLog.logSystemEvent('http_request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Log response
  res.on('finish', async () => {
    const duration = Date.now() - start;
    await externalLog.logSystemEvent('http_response', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration
    });
  });

  next();
});

// API Routes
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);  // Session-based auth
app.use('/api/v2/auth', authJWTRouter);  // JWT-based auth

// Protected API routes - require authentication
// IMPORTANT: Pages router must be before templates router because it handles /api/templates/:id/pages routes
app.use('/api', requireAuth, pagesRouter);  // Page management (handles /templates/:id/pages routes)
app.use('/api/templates', requireAuth, templateRouter);
app.use('/api/selections', requireAuth, selectionsRouter);
app.use('/api/requirements', requireAuth, requirementsRouter);
app.use('/api/apps', requireAuth, appsRouter);  // New apps management
app.use('/api/reports', requireAuth, reportsRouter);  // Story reports
app.use('/api/themes', requireAuth, themesRouter);  // Theme management
app.use('/api/messages', requireAuth, messagesRouter);  // Message storage

// Dashboard route - serve different content based on auth (before static files)
app.get('/', (req, res) => {
  if (!req.session || !req.session.userId) {
    res.sendFile(path.join(__dirname, '../../public/login.html'));
  } else {
    res.sendFile(path.join(__dirname, '../../public/dashboard.html'));
  }
});

// Protected HTML page routes
app.get('/dashboard', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, '../../public/dashboard.html'));
});

app.get('/templates', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, '../../public/templates.html'));
});

app.get('/themes', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, '../../public/themes.html'));
});

app.get('/gui-selector', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, '../../public/gui-selector.html'));
});

app.get('/mobile-preview', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, '../../public/mobile-preview.html'));
});

app.get('/page-manager', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, '../../public/page-manager.html'));
});

// Static files - serve the client application (excluding html files)
app.use(express.static(path.join(__dirname, '../../public'), {
  index: false,  // Don't serve index.html automatically
  extensions: ['css', 'js', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'woff', 'woff2', 'ttf', 'eot']
}));

// Fallback for unmatched routes
app.get('*', (req, res) => {
  if (!req.session || !req.session.userId) {
    res.redirect('/');
  } else {
    res.redirect('/dashboard');
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  externalLog.logError('unhandled_error', err, {
    path: req.path,
    method: req.method
  });
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === "production" ? undefined : err.message
  });
});

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database
    await db.initialize();
    await externalLog.logSystemEvent('database_initialized');

    // Create default admin user if not exists
    const adminUser = await db.getUserByUsername('admin');
    if (!adminUser) {
      const adminPassword = await bcrypt.hash("admin123", 10);
      await db.createUser('admin', 'admin@guiselector.local', adminPassword, 'admin');
      logger.info('Default admin user created');
      await externalLog.logSystemEvent('default_admin_created');
    }

    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`GUI Selector Server (AI Dev Portal) running on port ${PORT} in ${ENV} mode`);
      logger.info(`Access the portal at http://localhost:${PORT}`);
      
      // Log default credentials to console only (not shown on login page)
      console.log('\n========================================');
      console.log('Default Credentials (console only):');
      console.log('  Admin: admin / admin123');
      console.log('  User: user / user123');
      console.log('========================================\n');
      externalLog.logSystemEvent('server_started', { port: PORT, env: ENV });
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      await externalLog.logSystemEvent('server_shutdown_initiated');
      
      server.close(async () => {
        await db.close();
        logger.info('Server closed');
        await externalLog.logSystemEvent('server_shutdown_complete');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    await externalLog.logError('server_start_failed', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export { app };