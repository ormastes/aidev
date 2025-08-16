/**
 * Vulnerable Test Application
 * This app intentionally contains bugs for Explorer testing
 * DO NOT USE IN PRODUCTION - FOR TESTING ONLY
 */

const express = require('express');
const app = express();
const port = process.env.PORT || 3456;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Intentional bugs for testing
const BUGS = {
  CONSOLE_ERROR: true,
  STACK_TRACE: true,
  PII_LEAK: true,
  XSS_VULNERABLE: true,
  SLOW_RESPONSE: true,
  MISSING_HEADERS: true,
  API_MISMATCH: true
};

// In-memory data store
let users = [
  { id: 1, email: 'test@example.com', password: "PLACEHOLDER", ssn: '123-45-6789' }
];

// Static HTML with intentional console error
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Vulnerable Test App</title>
      <script>
        // Intentional console error
        ${BUGS.CONSOLE_ERROR ? 'console.error("TypeError: Cannot read property user of undefined");' : ''}
        ${BUGS.CONSOLE_ERROR ? 'undefinedVariable.property;' : ''}
      </script>
    </head>
    <body>
      <h1>Test Application</h1>
      <div id="app">
        <a href="/login">Login</a> | 
        <a href="/search">Search</a> |
        <a href="/api/users">API</a>
      </div>
    </body>
    </html>
  `);
});

// Login page with XSS vulnerability
app.get('/login', (req, res) => {
  const message = req.query.message || '';
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Login</title></head>
    <body>
      <h1>Login</h1>
      ${BUGS.XSS_VULNERABLE ? message : escapeHtml(message)}
      <form method="POST" action="/login">
        <input type="email" name="email" placeholder="Email" required>
        <input type="password" name="password" placeholder="Password" required>
        <button type="submit">Login</button>
      </form>
    </body>
    </html>
  `);
});

// Login endpoint with PII leak
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  // Intentional slow response
  if (BUGS.SLOW_RESPONSE) {
    await new Promise(resolve => setTimeout(resolve, 4000));
  }
  
  const user = users.find(u => u.email === email);
  
  if (!user || user.password !== password) {
    // Intentional PII leak in error
    if (BUGS.PII_LEAK) {
      return res.status(401).json({
        error: `Invalid credentials for ${email} (password: ${password})`
      });
    }
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  res.redirect('/dashboard');
});

// Search with improper escaping
app.get('/search', (req, res) => {
  const query = req.query.q || '';
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Search</title></head>
    <body>
      <h1>Search</h1>
      <form method="GET" action="/search">
        <input type="search" name="q" value="${BUGS.XSS_VULNERABLE ? query : escapeHtml(query)}" placeholder="Search...">
        <button type="submit">Search</button>
      </form>
      <div>
        Results for: ${BUGS.XSS_VULNERABLE ? query : escapeHtml(query)}
      </div>
    </body>
    </html>
  `);
});

// API endpoints with intentional issues
app.get('/api/users', (req, res) => {
  // Missing security headers
  if (!BUGS.MISSING_HEADERS) {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
  }
  
  // API response that doesn't match OpenAPI spec
  if (BUGS.API_MISMATCH) {
    // Missing required field 'total'
    return res.json({ 
      items: users.map(u => ({ id: u.id, email: u.email }))
    });
  }
  
  res.json({
    items: users.map(u => ({ id: u.id, email: u.email })),
    total: users.length
  });
});

// Endpoint that throws error with stack trace
app.get('/api/error', (req, res) => {
  try {
    throw new Error('Database connection failed');
  } catch (error) {
    if (BUGS.STACK_TRACE) {
      // Expose full stack trace
      return res.status(500).json({
        error: error.message,
        stack: error.stack,
        file: __filename
      });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 5xx error endpoint
app.get('/api/crash', (req, res) => {
  res.status(503).send('Service Unavailable');
});

// Missing CORS headers
app.options('/api/*', (req, res) => {
  if (!BUGS.MISSING_HEADERS) {
    res.set('Access-Control-Allow-Origin', 'http://localhost:3457');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  }
  res.sendStatus(200);
});

// OpenAPI spec endpoint
app.get('/openapi.json', (req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'Vulnerable Test API',
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
                    required: ['items', 'total'],
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
                      total: { type: 'integer' }
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

// Helper function
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Start server
const server = app.listen(port, () => {
  console.log(`Vulnerable test app running at http://localhost:${port}`);
  console.log('Bugs enabled:', Object.keys(BUGS).filter(k => BUGS[k]).join(', '));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server closed');
  });
});

module.exports = { app, server, BUGS };