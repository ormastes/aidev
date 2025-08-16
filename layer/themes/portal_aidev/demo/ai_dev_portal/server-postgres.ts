import express, { Request, Response, NextFunction } from 'express';
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from 'cors';
import session from 'express-session';
import { path } from '../../../infra_external-log-lib/src';
import { createConnection, query, queryOne } from './config/database';
import { Client } from 'pg';
import sqlite3 from 'sqlite3';

// Type definitions
interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  role: string;
}

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

interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
  session: session.Session & {
    token?: string;
  };
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3300;
const JWT_SECRET = process.env.JWT_SECRET || 'demo-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(session({
  secret: JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true }
}));

// Database connection
let db: Client | sqlite3.Database;

async function connectDb(): Promise<void> {
  try {
    db = await createConnection();
    console.log('Database connected In Progress');
  } catch (error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }
}

// Authentication middleware
const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(' ')[1] || req.session.token;
  
  if (!token) {
    res.status(401).json({ error: 'Access denied' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      res.status(403).json({ error: 'Invalid token' });
      return;
    }
    
    req.user = decoded as { id: number; username: string; role: string };
    next();
  });
};

// Routes

// Health check
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    // Test database connection
    await query(db, 'SELECT 1');
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: process.env.DB_TYPE || 'sqlite'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Database connection failed',
      timestamp: new Date().toISOString() 
    });
  }
});

// Login
app.post('/api/login', async (req: AuthRequest, res: Response): Promise<void> => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' });
    return;
  }
  
  try {
    const user = await queryOne<User>(db, 'SELECT * FROM users WHERE username = $1', [username]);
    
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    req.session.token = token;
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        role: user.role 
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Logout
app.post('/api/logout', (req: AuthRequest, res: Response): void => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: 'Logout failed' });
      return;
    }
    res.json({ message: 'Logged out In Progress' });
  });
});

// Get current user
app.get('/api/user', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  
  try {
    const user = await queryOne<User>(db, 
      'SELECT id, username, email, role FROM users WHERE id = $1', 
      [req.user.id]
    );
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get all projects
app.get('/api/projects', authenticateToken, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projects = await query<Project>(db, 
      'SELECT * FROM projects ORDER BY created_at DESC'
    );
    res.json(projects || []);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get project by ID
app.get('/api/projects/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const projectId = parseInt(req.params.id);
  
  if (isNaN(projectId)) {
    res.status(400).json({ error: 'Invalid project ID' });
    return;
  }
  
  try {
    const project = await queryOne<Project>(db, 
      'SELECT * FROM projects WHERE id = $1', 
      [projectId]
    );
    
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json(project);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get features for a project
app.get('/api/projects/:id/features', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const projectId = parseInt(req.params.id);
  
  if (isNaN(projectId)) {
    res.status(400).json({ error: 'Invalid project ID' });
    return;
  }
  
  try {
    const features = await query<Feature>(db, 
      'SELECT * FROM features WHERE project_id = $1 ORDER BY priority DESC, created_at DESC', 
      [projectId]
    );
    res.json(features || []);
  } catch (error) {
    console.error('Get features error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get tasks for a feature
app.get('/api/features/:id/tasks', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const featureId = parseInt(req.params.id);
  
  if (isNaN(featureId)) {
    res.status(400).json({ error: 'Invalid feature ID' });
    return;
  }
  
  try {
    const tasks = await query<Task>(db, 
      'SELECT * FROM tasks WHERE feature_id = $1 ORDER BY created_at DESC', 
      [featureId]
    );
    res.json(tasks || []);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create new project
app.post('/api/projects', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, description } = req.body;
  
  if (!name) {
    res.status(400).json({ error: 'Project name is required' });
    return;
  }
  
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  
  try {
    const result = await query<Project>(db, 
      'INSERT INTO projects (name, description, user_id) VALUES ($1, $2, $3) RETURNING *',
      [name, description || '', req.user.id]
    );
    res.json(result[0]);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update project
app.put('/api/projects/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const projectId = parseInt(req.params.id);
  const { name, description, status } = req.body;
  
  if (isNaN(projectId)) {
    res.status(400).json({ error: 'Invalid project ID' });
    return;
  }
  
  if (!name) {
    res.status(400).json({ error: 'Project name is required' });
    return;
  }
  
  try {
    const result = await query<Project>(db, 
      'UPDATE projects SET name = $1, description = $2, status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [name, description || '', status || 'active', projectId]
    );
    
    if (result.length === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json(result[0]);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Serve index.html for all other routes (SPA support)
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  if (db) {
    if ('end' in db) {
      await (db as Client).end();
    } else {
      (db as sqlite3.Database).close();
    }
  }
  process.exit(0);
});

// Start server
async function startServer(): Promise<void> {
  await connectDb();
  
  app.listen(PORT, () => {
    console.log(`AI Dev Portal Demo server running at http://localhost:${PORT}`);
    console.log(`API endpoints available at http://localhost:${PORT}/api`);
    console.log(`Database: ${process.env.DB_TYPE || 'sqlite'}`);
    console.log(`\nDemo credentials:`);
    console.log(`  admin/demo123`);
    console.log(`  developer/demo123`);
    console.log(`  tester/demo123`);
  });
}

startServer();

export default app;