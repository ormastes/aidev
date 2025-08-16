import express, { Request, Response, NextFunction } from 'express';
import sqlite3 from 'sqlite3';
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from 'cors';
import session from 'express-session';
import { path } from '../../../infra_external-log-lib/src';

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

// Configure SQLite
const sqlite = sqlite3.verbose();

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
const db = new sqlite.Database(path.join(__dirname, 'data', 'ai_dev_portal.db'));

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
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Login
app.post('/api/login', (req: AuthRequest, res: Response): void => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' });
    return;
  }
  
  db.get<User>('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }
    
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
  });
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
app.get('/api/user', authenticateToken, (req: AuthRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  
  db.get<User>('SELECT id, username, email, role FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  });
});

// Get all projects
app.get('/api/projects', authenticateToken, (_req: AuthRequest, res: Response): void => {
  db.all<Project>('SELECT * FROM projects ORDER BY created_at DESC', (err, projects) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }
    res.json(projects || []);
  });
});

// Get project by ID
app.get('/api/projects/:id', authenticateToken, (req: AuthRequest, res: Response): void => {
  const projectId = parseInt(req.params.id);
  
  if (isNaN(projectId)) {
    res.status(400).json({ error: 'Invalid project ID' });
    return;
  }
  
  db.get<Project>('SELECT * FROM projects WHERE id = ?', [projectId], (err, project) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json(project);
  });
});

// Get features for a project
app.get('/api/projects/:id/features', authenticateToken, (req: AuthRequest, res: Response): void => {
  const projectId = parseInt(req.params.id);
  
  if (isNaN(projectId)) {
    res.status(400).json({ error: 'Invalid project ID' });
    return;
  }
  
  db.all<Feature>('SELECT * FROM features WHERE project_id = ? ORDER BY priority DESC, created_at DESC', 
    [projectId], (err, features) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }
    res.json(features || []);
  });
});

// Get tasks for a feature
app.get('/api/features/:id/tasks', authenticateToken, (req: AuthRequest, res: Response): void => {
  const featureId = parseInt(req.params.id);
  
  if (isNaN(featureId)) {
    res.status(400).json({ error: 'Invalid feature ID' });
    return;
  }
  
  db.all<Task>('SELECT * FROM tasks WHERE feature_id = ? ORDER BY created_at DESC', 
    [featureId], (err, tasks) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }
    res.json(tasks || []);
  });
});

// Create new project
app.post('/api/projects', authenticateToken, (req: AuthRequest, res: Response): void => {
  const { name, description } = req.body;
  
  if (!name) {
    res.status(400).json({ error: 'Project name is required' });
    return;
  }
  
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  
  db.run('INSERT INTO projects (name, description, user_id) VALUES (?, ?, ?)',
    [name, description || '', req.user.id], function(this: sqlite3.RunResult, err: Error | null) {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }
    res.json({ 
      id: this.lastID, 
      name, 
      description: description || '', 
      user_id: req.user!.id 
    });
  });
});

// Update project
app.put('/api/projects/:id', authenticateToken, (req: AuthRequest, res: Response): void => {
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
  
  db.run('UPDATE projects SET name = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, description || '', status || 'active', projectId], function(this: sqlite3.RunResult, err: Error | null) {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json({ 
      id: projectId, 
      name, 
      description: description || '', 
      status: status || 'active' 
    });
  });
});

// VFS API endpoints for reading virtual file system
app.get('/api/vfs/:filename', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  const filename = req.params.filename;
  const allowedFiles = ['FEATURE.vf.json', 'TASK_QUEUE.vf.json', 'NAME_ID.vf.json'];
  
  if (!allowedFiles.includes(filename)) {
    res.status(403).json({ error: 'Access to this file is not allowed' });
    return;
  }
  
  try {
    const fs = await import('fs/promises');
    const filePath = path.join(process.cwd(), filename);
    const data = await fs.readFile(filePath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Failed to read VFS file:', error);
    res.status(404).json({ error: 'File not found' });
  }
});

// Serve index.html for all other routes (SPA support)
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`AI Dev Portal Demo server running at http://localhost:${PORT}`);
  console.log(`API endpoints available at http://localhost:${PORT}/api`);
  console.log(`\nDemo credentials:`);
  console.log(`  admin/demo123`);
  console.log(`  developer/demo123`);
  console.log(`  tester/demo123`);
});

export default app;