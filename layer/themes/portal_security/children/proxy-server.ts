import express from 'express';
import httpProxy from 'http-proxy-middleware';
import session from 'express-session';
import bcrypt from 'bcrypt';
import { PortManager } from '../children/PortManager';
import { AppRegistry } from '../children/AppRegistry';
import { logger } from '../children/utils/logger';

const app = express();
const portManager = PortManager.getInstance();
const appRegistry = AppRegistry.getInstance();

// Get current environment
const environment = portManager.getCurrentEnvironment();

// Main proxy port
const PROXY_PORT = portManager.getPortForEnvironment('web-security', environment);

// Proxy identification
const PROXY_NAME = process.env.PROXY_NAME || `Web Security Proxy (${environment})`;
const PROXY_COLOR = process.env.PROXY_COLOR || '';

// Session middleware
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'web-security-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: environment === 'release',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    environment,
    timestamp: new Date().toISOString()
  });
});

// App discovery endpoint
app.get('/api/apps', (req, res) => {
  const isAuthenticated = !!(req.session as any).userId;
  const apps = appRegistry.getAccessibleApps(isAuthenticated);
  
  // Add port information
  const appsWithPorts = apps.map(app => ({
    ...app,
    port: portManager.getPortForEnvironment(app.id, environment),
    accessible: !app.requiresAuth || isAuthenticated
  }));
  
  res.json(appsWithPorts);
});

// Port registry endpoint
app.get('/api/ports', (req, res) => {
  const isAuthenticated = !!(req.session as any).userId;
  
  if (!isAuthenticated) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const ports = portManager.getAllRegisteredApps();
  res.json({
    environment,
    ports
  });
});

// Simple authentication for demo
const DEFAULT_CREDENTIALS = {
  username: 'admin',
  passwordHash: '$2b$10$YourHashedPasswordHere' // This would be properly hashed in production
};

// Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Simple demo authentication
    if (username === 'admin' && password === 'admin123') {
      (req.session as any).userId = '1';
      (req.session as any).username = username;
      res.json({ success: true, user: { id: '1', username } });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      logger.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

app.get('/api/auth/check', (req, res) => {
  const isAuthenticated = !!(req.session as any).userId;
  res.json({
    authenticated: isAuthenticated,
    user: isAuthenticated ? { username: (req.session as any).username } : null
  });
});

// Dynamic proxy middleware
const createProxyMiddleware = (appId: string) => {
  // Get the target port for this app in the current environment
  const targetPort = portManager.getPortForEnvironment(appId, environment);
  
  return httpProxy.createProxyMiddleware({
    target: `http://localhost:${targetPort}`,
    changeOrigin: true,
    ws: true,
    logLevel: 'info',
    onError: (err, req, res) => {
      logger.error(`Proxy error for ${appId}:`, err);
      res.status(502).json({ 
        error: 'Bad Gateway', 
        message: `Unable to reach ${appId} service on port ${targetPort}`,
        appId,
        targetPort,
        environment 
      });
    },
    onProxyReq: (proxyReq, req, res) => {
      // Forward authentication headers
      if (req.session?.userId) {
        proxyReq.setHeader('X-User-Id', req.session.userId);
        proxyReq.setHeader('X-Username', req.session.username || '');
      }
      // Forward environment info
      proxyReq.setHeader('X-Proxy-Environment', environment);
    }
  });
};

// Route requests based on app ID in path
app.use('/app/:appId', (req, res, next) => {
  const { appId } = req.params;
  const registeredApp = appRegistry.get(appId);
  
  if (!registeredApp) {
    return res.status(404).json({ error: 'App not found' });
  }
  
  // Check authentication if required
  if (registeredApp.requiresAuth) {
    const isAuthenticated = !!(req.session as any).userId;
    if (!isAuthenticated) {
      return res.status(401).json({ error: 'Authentication required' });
    }
  }
  
  // Remove /app/:appId from the path before proxying
  req.url = req.url.replace(`/app/${appId}`, '');
  
  // Create and use proxy middleware
  const proxy = createProxyMiddleware(appId);
  proxy(req, res, next);
});

// Default route - show available apps
app.get('/', (req, res) => {
  const isAuthenticated = !!(req.session as any).userId;
  const apps = appRegistry.getAccessibleApps(isAuthenticated);
  
  const appLinks = apps.map(app => {
    const port = portManager.getPortForEnvironment(app.id, environment);
    return `
      <li>
        <a href="/app/${app.id}">
          ${app.icon || '📱'} ${app.name}
        </a>
        - ${app.description || 'No description'}
        (Port: ${port})
      </li>
    `;
  }).join('');
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Web Security Proxy</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #2c3e50; }
        ul { list-style: none; padding: 0; }
        li { margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 5px; }
        a { color: #3498db; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .info { background: #e8f4f8; padding: 20px; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <h1>Web Security Proxy Server</h1>
      <div class="info">
        <strong>Environment:</strong> ${environment}<br>
        <strong>Proxy Port:</strong> ${PROXY_PORT}<br>
        <strong>Authentication:</strong> ${isAuthenticated ? 'Logged in as ' + req.session?.username : 'Not authenticated'}
      </div>
      <h2>Available Applications:</h2>
      <ul>${appLinks}</ul>
      ${!isAuthenticated ? '<p><a href="/api/auth/login">Login</a> to access protected apps</p>' : '<p><a href="/api/auth/logout">Logout</a></p>'}
    </body>
    </html>
  `);
});

// Determine host binding
// Proxy should be accessible remotely, but individual apps should not
const HOST = process.env.PROXY_HOST || '0.0.0.0'; // Bind to all interfaces by default

// Start server
app.listen(PROXY_PORT, HOST, () => {
  const prefix = PROXY_COLOR || '';
  const reset = '\x1b[0m';
  
  console.log(`${prefix}${'='.repeat(60)}${reset}`);
  console.log(`${prefix}${PROXY_NAME}${reset}`);
  console.log(`${prefix}${'='.repeat(60)}${reset}`);
  logger.info(`Environment: ${environment}`);
  logger.info(`Proxy Port: ${PROXY_PORT}`);
  logger.info(`Binding: ${HOST}:${PROXY_PORT}`);
  logger.info(`Local access: http://localhost:${PROXY_PORT}`);
  if (HOST === '0.0.0.0') {
    logger.info(`Remote access: http://<server-ip>:${PROXY_PORT}`);
  }
  
  // Log apps in this environment's port range
  logger.info(`Managing apps in ${environment} port range:`);
  const apps = portManager.getAllRegisteredApps();
  apps.forEach(app => {
    const port = app.ports[environment] || app.ports.dev;
    logger.info(`  - ${app.appId}: http://localhost:${port}`);
  });
  
  // Special note for GUI Selector
  if (environment === 'dev-local') {
    logger.info(`\nGUI Selector runs on port 3156 in this environment`);
  }
  
  console.log(`${prefix}${'='.repeat(60)}${reset}`);
});

export { app };