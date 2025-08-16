import express, { Request, Response, NextFunction } from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import { path } from '../../../infra_external-log-lib/src';
import { 
  setupWebSecurity, 
  AuthService, 
  SessionManager,
  createAuthMiddleware,
  createRateLimitMiddleware,
  SecurityConstants,
  User,
  UserRole,
  NavigationHelper
} from '../../../web-security/pipe';

// Extend Request with user
interface AuthRequest extends Request {
  user?: User;
  session?: any;
}

// Type definitions for database models
interface Project {
  id: number;
  name: string;
  description: string;
  user_id: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Feature {
  id: number;
  project_id: number;
  title: string;
  description: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Task {
  id: number;
  feature_id: number;
  title: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3400;

// Database connection
const db = new sqlite3.Database(path.join(__dirname, 'data', 'ai_dev_portal.db'));

// Basic middleware
app.use(cors({
  origin: SecurityConstants.CORS.ALLOWED_ORIGINS,
  credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// Setup web security
const { authService, sessionManager, appRegistry } = setupWebSecurity(app, {
  requireAuth: true,
  enableRateLimit: true,
  authMiddlewareConfig: {
    loginPath: '/login',
    publicPaths: ['/login', '/api/auth/*', '/health', '/']
  }
});

// Create user repository adapter for existing SQLite database
const userRepository = {
  async findByUsername(username: string): Promise<User | null> {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE username = ?',
        [username],
        (err, row: any) => {
          if (err) reject(err);
          else if (!row) resolve(null);
          else {
            resolve({
              id: row.id.toString(),
              username: row.username,
              email: row.email,
              roles: [row.role as UserRole],
              createdAt: new Date(row.created_at),
              updatedAt: new Date(row.updated_at)
            });
          }
        }
      );
    });
  },

  async findById(id: string): Promise<User | null> {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE id = ?',
        [parseInt(id)],
        (err, row: any) => {
          if (err) reject(err);
          else if (!row) resolve(null);
          else {
            resolve({
              id: row.id.toString(),
              username: row.username,
              email: row.email,
              roles: [row.role as UserRole],
              createdAt: new Date(row.created_at),
              updatedAt: new Date(row.updated_at)
            });
          }
        }
      );
    });
  },

  async create(userData: Partial<User>): Promise<User> {
    // Implementation for creating users in SQLite
    throw new Error('Not implemented - use existing registration flow');
  },

  async update(id: string, userData: Partial<User>): Promise<User> {
    // Update last login time
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET updated_at = datetime("now") WHERE id = ?',
        [parseInt(id)],
        async (err) => {
          if (err) reject(err);
          else {
            const user = await this.findById(id);
            resolve(user!);
          }
        }
      );
    });
  }
};

// Configure auth service to use our SQLite adapter
(authService as any).userRepository = userRepository;

// Serve login page
app.get('/login', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Serve dashboard
app.get('/dashboard', async (req: AuthRequest, res: Response) => {
  const user = await authService.getCurrentUser(req);
  
  if (!user) {
    return res.redirect('/login?returnUrl=/dashboard');
  }
  
  const navigation = await NavigationHelper.generateNavigationHTML('portal', authService, req);
  
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Dashboard - AI Dev Portal</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      background: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 2rem auto;
      padding: 0 1rem;
    }
    .welcome {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      margin-bottom: 2rem;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      text-align: center;
    }
    .stat-card h3 {
      margin: 0 0 0.5rem 0;
      font-size: 2rem;
      color: #3498db;
    }
    .actions {
      background: white;
      padding: 2rem;
      border-radius: 8px;
    }
    .btn {
      display: inline-block;
      padding: 0.75rem 1.5rem;
      background: #3498db;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      margin-right: 1rem;
    }
    .btn:hover {
      background: #2980b9;
    }
  </style>
</head>
<body>
  ${navigation}
  <div class="container">
    <div class="welcome">
      <h1>Welcome, ${user.username}!</h1>
      <p>Your centralized hub for AI development projects.</p>
    </div>
    
    <div class="stats">
      <div class="stat-card">
        <h3>4</h3>
        <p>Active Projects</p>
      </div>
      <div class="stat-card">
        <h3>12</h3>
        <p>Features in Progress</p>
      </div>
      <div class="stat-card">
        <h3>28</h3>
        <p>Completed Tasks</p>
      </div>
    </div>
    
    <div class="actions">
      <h2>Quick Actions</h2>
      <a href="/projects" class="btn">View Projects</a>
      <a href="${appRegistry.get('gui-selector')?.url}" class="btn">Select GUI Design</a>
      <a href="${appRegistry.get('chat-space')?.url}" class="btn">Open Chat</a>
      <a href="${appRegistry.get("pocketflow")?.url}" class="btn">Manage Tasks</a>
    </div>
  </div>
</body>
</html>
  `);
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'AI Dev Portal (Secured)' });
});

// Authentication endpoints
app.post('/api/auth/login', 
  createRateLimitMiddleware({
    max: 5,
    windowMs: 15 * 60 * 1000 // 15 minutes
  }),
  async (req: Request, res: Response) => {
    const { username, password } = req.body;
    
    try {
      const result = await authService.login({
        username,
        password,
        rememberMe: req.body.rememberMe
      });
      
      if (result.success && result.user) {
        // Set session cookie
        sessionManager.configureCookie(res, result.user.id);
        
        res.json({
          success: true,
          user: {
            id: result.user.id,
            username: result.user.username,
            email: result.user.email,
            role: result.user.roles[0]
          },
          token: result.token
        });
      } else {
        res.status(401).json({
          success: false,
          message: result.message || 'Invalid credentials'
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred during login'
      });
    }
  }
);

app.post('/api/auth/logout', async (req: AuthRequest, res: Response) => {
  const sessionId = sessionManager.getSessionIdFromRequest(req);
  
  if (sessionId) {
    await authService.logout(sessionId);
  }
  
  res.json({ success: true, message: 'Logged out successfully' });
});

app.get('/api/auth/profile', async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  res.json({
    id: req.user.id,
    username: req.user.username,
    email: req.user.email,
    role: req.user.roles[0]
  });
});

// Projects API endpoints (protected)
app.get('/api/projects', async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  db.all(
    'SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC',
    [parseInt(req.user.id)],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error' });
        return;
      }
      res.json(rows);
    }
  );
});

app.post('/api/projects', async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { name, description } = req.body;
  
  if (!name) {
    res.status(400).json({ error: 'Project name is required' });
    return;
  }

  db.run(
    `INSERT INTO projects (name, description, user_id, status, created_at, updated_at) 
     VALUES (?, ?, ?, 'active', datetime('now'), datetime('now'))`,
    [name, description || '', parseInt(req.user.id)],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error' });
        return;
      }
      
      db.get('SELECT * FROM projects WHERE id = ?', [this.lastID], (err, row) => {
        if (err) {
          console.error('Database error:', err);
          res.status(500).json({ error: 'Database error' });
          return;
        }
        res.status(201).json(row);
      });
    }
  );
});

// Features API endpoints (protected)
app.get('/api/projects/:projectId/features', async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { projectId } = req.params;
  
  // Verify project belongs to user
  db.get(
    'SELECT * FROM projects WHERE id = ? AND user_id = ?',
    [projectId, parseInt(req.user.id)],
    (err, project) => {
      if (err || !project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      
      db.all(
        'SELECT * FROM features WHERE project_id = ? ORDER BY priority DESC, created_at DESC',
        [projectId],
        (err, rows) => {
          if (err) {
            console.error('Database error:', err);
            res.status(500).json({ error: 'Database error' });
            return;
          }
          res.json(rows);
        }
      );
    }
  );
});

// Database initialization
function initializeDatabase() {
  // Create tables if they don't exist
  db.serialize(() => {
    // Users table - keeping existing structure
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Projects table
    db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        user_id INTEGER NOT NULL,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Features table
    db.run(`
      CREATE TABLE IF NOT EXISTS features (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        priority TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id)
      )
    `);

    // Tasks table
    db.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        feature_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (feature_id) REFERENCES features(id)
      )
    `);

    console.log('Database initialized');
  });
}

// Home page redirect
app.get('/', (req: Request, res: Response) => {
  res.redirect('/dashboard');
});

// Start server
app.listen(PORT, () => {
  console.log(`AI Dev Portal (Secured) is running on http://localhost:${PORT}`);
  console.log('Using centralized web-security authentication');
  initializeDatabase();
});