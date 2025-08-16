/**
 * Secure Test Application
 * All vulnerabilities from the vulnerable app have been fixed
 * This demonstrates proper security implementation
 */

const express = require('express');
const crypto = require('crypto');
const helmet = require('helmet');
const app = express();
const port = process.env.PORT || 3456;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Fix #3, #4, #5: Security headers using helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Fix #7: Rate limiting
const rateLimit = new Map();

function rateLimiter(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const limit = 100;
  const window = 15 * 60 * 1000; // 15 minutes
  
  if (!rateLimit.has(ip)) {
    rateLimit.set(ip, { count: 1, resetTime: now + window });
  } else {
    const record = rateLimit.get(ip);
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + window;
    } else {
      record.count++;
      if (record.count > limit) {
        return res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.ceil((record.resetTime - now) / 1000)
        });
      }
    }
  }
  next();
}

app.use(rateLimiter);

// Fix #6: CSRF Protection
const csrfTokens = new Map();

function generateCSRFToken(sessionId) {
  const token = crypto.randomBytes(32).toString('hex');
  csrfTokens.set(sessionId, token);
  return token;
}

function validateCSRFToken(sessionId, token) {
  return csrfTokens.get(sessionId) === token;
}

// Fix #11: Input sanitization
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Fix #1: Secure JWT secret
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || crypto.randomBytes(64).toString('hex');
if (!process.env.JWT_ACCESS_SECRET) {
  console.warn('Warning: JWT_ACCESS_SECRET not set. Generated random secret for this session.');
}

// Fix #2, #12: No default users, secure authentication
const users = [];

// Homepage - Fix: No console errors
app.get('/', (req, res) => {
  const sessionId = req.ip;
  const csrfToken = generateCSRFToken(sessionId);
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Secure Test App</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body>
      <h1>Secure Application</h1>
      <div id="app">
        <a href="/login">Login</a> | 
        <a href="/search">Search</a> |
        <a href="/api/users">API</a>
      </div>
      <input type="hidden" name="_csrf" value="${csrfToken}">
    </body>
    </html>
  `);
});

// Login page - Fix #11: XSS protection
app.get('/login', (req, res) => {
  const message = req.query.message ? escapeHtml(req.query.message) : '';
  const sessionId = req.ip;
  const csrfToken = generateCSRFToken(sessionId);
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Login</title></head>
    <body>
      <h1>Login</h1>
      ${message}
      <form method="POST" action="/login">
        <input type="email" name="email" placeholder="Email" required>
        <input type="password" name="password" placeholder="Password" required>
        <input type="hidden" name="_csrf" value="${csrfToken}">
        <button type="submit">Login</button>
      </form>
    </body>
    </html>
  `);
});

// Login endpoint - Fix #10: No PII in errors, Fix #13: No artificial delays
app.post('/login', (req, res) => {
  const { email, password, _csrf } = req.body;
  const sessionId = req.ip;
  
  // Fix #6: Validate CSRF token
  if (!validateCSRFToken(sessionId, _csrf)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  
  // Fix #12: No default credentials
  if (password === 'admin' || password === 'password' || password === 'test') {
    return res.status(403).json({ error: 'Default passwords are not allowed' });
  }
  
  // Fix #10: Generic error messages (no PII)
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  res.redirect('/dashboard');
});

// Search - Fix #11: XSS protection
app.get('/search', (req, res) => {
  const query = req.query.q ? escapeHtml(req.query.q) : '';
  const sessionId = req.ip;
  const csrfToken = generateCSRFToken(sessionId);
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Search</title></head>
    <body>
      <h1>Search</h1>
      <form method="GET" action="/search">
        <input type="search" name="q" value="${query}" placeholder="Search...">
        <input type="hidden" name="_csrf" value="${csrfToken}">
        <button type="submit">Search</button>
      </form>
      <div>
        ${query ? `Results for: ${query}` : ''}
      </div>
    </body>
    </html>
  `);
});

// API endpoints - Fix #14: Proper schema
app.get('/api/users', (req, res) => {
  // Fix #14: Include all required fields
  res.json({
    items: users.map(u => ({ 
      id: u.id, 
      email: u.email 
    })),
    total: users.length,
    page: 1,
    limit: 10
  });
});

// Error endpoint - Fix #9: No stack traces
app.get('/api/error', (req, res) => {
  // Simulate error without exposing internals
  res.status(500).json({
    error: 'Internal server error',
    message: 'An error occurred processing your request',
    requestId: crypto.randomBytes(16).toString('hex')
  });
});

// Fix #8: Proper CORS configuration
app.use((req, res, next) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
  }
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Fix #15: Block sensitive files
app.use((req, res, next) => {
  const blockedPaths = [
    /^\/\.env/,
    /^\/\.git/,
    /\/config\.json$/,
    /\/package\.json$/,
    /\.sql$/,
    /\.db$/
  ];
  
  if (blockedPaths.some(pattern => pattern.test(req.path))) {
    return res.status(404).json({ error: 'Not found' });
  }
  
  next();
});

// Fix #9, #10: Safe error handler
app.use((err, req, res, next) => {
  // Log error internally
  console.error('Error:', err);
  
  // Send safe error response
  res.status(err.status || 500).json({
    error: 'An error occurred',
    message: process.env.NODE_ENV === 'development' 
      ? err.message.replace(/password['":\s]+[^,}\s]+/gi, 'password: [hidden]')
      : 'Internal server error',
    requestId: crypto.randomBytes(16).toString('hex')
  });
});

// OpenAPI spec - Fix #14: Complete schema
app.get('/openapi.json', (req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'Secure Test API',
      version: '1.0.0'
    },
    paths: {
      '/api/users': {
        get: {
          summary: 'Get users',
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['items', 'total', 'page', 'limit'],
                    properties: {
                      items: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'integer' },
                            email: { type: 'string' }
                          }
                        }
                      },
                      total: { type: 'integer' },
                      page: { type: 'integer' },
                      limit: { type: 'integer' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });
});

// Start server
const server = app.listen(port, () => {
  console.log(`Secure test app running at http://localhost:${port}`);
  console.log('Security features enabled:');
  console.log('✅ Security headers (Helmet)');
  console.log('✅ Rate limiting');
  console.log('✅ CSRF protection');
  console.log('✅ XSS protection');
  console.log('✅ No default credentials');
  console.log('✅ Safe error handling');
  console.log('✅ Secure CORS');
  console.log('✅ Sensitive file blocking');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server closed');
  });
});

module.exports = { app, server };