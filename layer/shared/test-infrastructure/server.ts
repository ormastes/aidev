/**
 * Real Server Test Utilities
 * NO MOCKS - Uses real Express servers for testing
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import session from 'express-session';
import * as http from 'http';
import * as net from 'net';
import { path } from '../../themes/infra_external-log-lib/dist';
import { Database } from 'sqlite';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

export interface TestServer {
  app: Express;
  server: http.Server;
  port: number;
  url: string;
  db: Database;
  cleanup: () => Promise<void>;
}

/**
 * Gets a truly available port
 */
export async function getAvailablePort(): Promise<number> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(0, () => {
      const port = (server.address() as net.AddressInfo).port;
      server.close(() => resolve(port));
    });
  });
}

/**
 * Creates a real test server with all middleware
 */
export async function createTestServer(
  db: Database,
  options: {
    port?: number;
    sessionSecret?: string;
    jwtSecret?: string;
  } = {}
): Promise<TestServer> {
  const port = options.port || await getAvailablePort();
  const app = express();

  // Real middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Real session management
  app.use(session({
    secret: options.sessionSecret || 'test-secret-' + Date.now(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Allow non-HTTPS in tests
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000
    }
  }));

  // Real authentication middleware
  const jwtSecret = options.jwtSecret || 'jwt-secret-' + Date.now();
  
  app.use((req: Request & { user?: any }, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      try {
        const decoded = jwt.verify(token, jwtSecret);
        req.user = decoded;
      } catch (error) {
        // Invalid token, continue without user
      }
    }
    next();
  });

  // Real routes
  setupAuthRoutes(app, db, jwtSecret);
  setupApiRoutes(app, db);
  setupHealthRoutes(app);

  // Error handling
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message });
  });

  // Start real server
  const server = await new Promise<http.Server>((resolve) => {
    const srv = app.listen(port, () => {
      console.log(`Test server started on port ${port}`);
      resolve(srv);
    });
  });

  return {
    app,
    server,
    port,
    url: `http://localhost:${port}`,
    db,
    cleanup: async () => {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
  };
}

/**
 * Sets up real authentication routes
 */
function setupAuthRoutes(app: Express, db: Database, jwtSecret: string) {
  // Real login endpoint
  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    try {
      const user = await db.get(
        'SELECT * FROM users WHERE username = ?',
        username
      );

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Create real JWT token
      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          role: user.role 
        },
        jwtSecret,
        { expiresIn: '24h' }
      );

      // Store session
      await db.run(
        'INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
        [
          `session_${Date.now()}`,
          user.id,
          token,
          new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        ]
      );

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Real logout endpoint
  app.post('/api/auth/logout', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      try {
        await db.run(
          'DELETE FROM sessions WHERE token = ?',
          token
        );
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    res.json({ message: 'Logout successful' });
  });

  // Real token refresh endpoint
  app.post('/api/auth/refresh', async (req, res) => {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    try {
      const tokenRecord = await db.get(
        'SELECT * FROM refresh_tokens WHERE token = ? AND revoked = 0 AND expires_at > datetime("now")',
        refreshToken
      );

      if (!tokenRecord) {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }

      const user = await db.get(
        'SELECT * FROM users WHERE id = ?',
        tokenRecord.user_id
      );

      // Create new access token
      const newToken = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          role: user.role 
        },
        jwtSecret,
        { expiresIn: '24h' }
      );

      res.json({ token: newToken });
    } catch (error: any) {
      console.error('Refresh error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}

/**
 * Sets up real API routes
 */
function setupApiRoutes(app: Express, db: Database) {
  // Real user endpoints
  app.get('/api/users', async (req, res) => {
    try {
      const users = await db.all('SELECT id, username, email, role FROM users');
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/users/:id', async (req, res) => {
    try {
      const user = await db.get(
        'SELECT id, username, email, role FROM users WHERE id = ?',
        req.params.id
      );
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Real app endpoints
  app.get('/api/apps', async (req, res) => {
    try {
      const apps = await db.all('SELECT * FROM apps');
      res.json(apps);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/apps', async (req, res) => {
    const { name, theme, config } = req.body;
    
    try {
      const result = await db.run(
        'INSERT INTO apps (name, theme, config) VALUES (?, ?, ?)',
        [name, theme, JSON.stringify(config || {})]
      );
      
      const app = await db.get('SELECT * FROM apps WHERE id = ?', result.lastID);
      res.status(201).json(app);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Real message endpoints
  app.post('/api/messages', async (req, res) => {
    const { type, data, text } = req.body;
    
    try {
      const result = await db.run(
        'INSERT INTO messages (type, data, text) VALUES (?, ?, ?)',
        [type, JSON.stringify(data), text]
      );
      
      const message = await db.get(
        'SELECT * FROM messages WHERE id = ?',
        result.lastID
      );
      
      res.json({
        success: true,
        message: 'Message saved successfully',
        id: message.id,
        timestamp: message.timestamp
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/messages', async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    try {
      const messages = await db.all(
        'SELECT * FROM messages ORDER BY timestamp DESC LIMIT ? OFFSET ?',
        [limit, offset]
      );
      
      const total = await db.get('SELECT COUNT(*) as count FROM messages');
      
      res.json({
        success: true,
        messages,
        total: total.count,
        limit,
        offset
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}

/**
 * Sets up health check routes
 */
function setupHealthRoutes(app: Express) {
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok',
      service: 'test-server',
      version: '1.0.0'
    });
  });
}

/**
 * Waits for server to be ready
 */
export async function waitForServer(
  url: string,
  maxAttempts: number = 10,
  delayMs: number = 100
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }
    
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  return false;
}