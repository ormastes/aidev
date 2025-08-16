// Mock API Server for AI Dev Portal
import express from 'express';
import cors from 'cors';
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3457; // API port
const JWT_SECRET = process.env.JWT_SECRET || 'demo-secret-key';

// Middleware
app.use(cors());
app.use(express.json());

// In-memory database (replace with real DB)
const db = {
  users: [
    { id: '1', username: 'admin', email: 'admin@aidev.com', password: bcrypt.hashSync('demo123', 10), role: 'admin' },
    { id: '2', username: "developer", email: 'dev@aidev.com', password: bcrypt.hashSync('demo123', 10), role: "developer" },
    { id: '3', username: 'tester', email: 'test@aidev.com', password: bcrypt.hashSync('demo123', 10), role: 'tester' }
  ],
  projects: [
    { id: '1', name: 'AI Development Platform', status: 'active', description: 'Core platform development', createdAt: new Date('2024-01-01'), owner: '1' },
    { id: '2', name: 'MCP Integration', status: 'active', description: 'Model Context Protocol implementation', createdAt: new Date('2024-02-01'), owner: '2' },
    { id: '3', name: 'GUI Generator', status: 'pending', description: 'Automated UI generation system', createdAt: new Date('2024-03-01'), owner: '2' }
  ],
  features: [
    { id: '1', projectId: '1', name: 'Authentication System', priority: 'high', status: "completed", progress: 100 },
    { id: '2', projectId: '1', name: 'Real-time Monitoring', priority: 'high', status: 'active', progress: 75 },
    { id: '3', projectId: '2', name: 'Automated Testing', priority: 'medium', status: 'active', progress: 60 },
    { id: '4', projectId: '2', name: 'Documentation Generator', priority: 'low', status: 'pending', progress: 0 }
  ],
  tasks: [
    { id: '1', featureId: '1', title: 'Implement login validation', status: "completed", assignee: '1', priority: 'high' },
    { id: '2', featureId: '1', title: 'Add error handling', status: "completed", assignee: '2', priority: 'high' },
    { id: '3', featureId: '2', title: 'Write unit tests', status: 'active', assignee: '3', priority: 'medium' },
    { id: '4', featureId: '2', title: 'Update documentation', status: 'pending', assignee: '1', priority: 'low' },
    { id: '5', featureId: '3', title: 'Performance optimization', status: 'pending', assignee: '2', priority: 'medium' }
  ],
  sessions: []
};

// Middleware to verify JWT
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// ========================
// Authentication Endpoints
// ========================

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = db.users.find(u => u.username === username);
  
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  const sessionId = uuidv4();
  db.sessions.push({ sessionId, userId: user.id, token, createdAt: new Date() });

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  });
});

app.post('/api/auth/logout', authenticateToken, (req, res) => {
  const token = req.headers["authorization"]?.split(' ')[1];
  db.sessions = db.sessions.filter(s => s.token !== token);
  res.json({ success: true, message: 'Logged out successfully' });
});

app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// ========================
// Projects Endpoints
// ========================

app.get('/api/projects', authenticateToken, (req, res) => {
  const { status, owner } = req.query;
  let projects = [...db.projects];

  if (status) {
    projects = projects.filter(p => p.status === status);
  }
  if (owner) {
    projects = projects.filter(p => p.owner === owner);
  }

  res.json({
    success: true,
    data: projects,
    total: projects.length
  });
});

app.get('/api/projects/:id', authenticateToken, (req, res) => {
  const project = db.projects.find(p => p.id === req.params.id);
  
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  res.json({ success: true, data: project });
});

app.post('/api/projects', authenticateToken, (req, res) => {
  const { name, description, status = 'pending' } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Project name required' });
  }

  const newProject = {
    id: uuidv4(),
    name,
    description,
    status,
    createdAt: new Date(),
    owner: req.user.id
  };

  db.projects.push(newProject);
  res.status(201).json({ success: true, data: newProject });
});

app.put('/api/projects/:id', authenticateToken, (req, res) => {
  const projectIndex = db.projects.findIndex(p => p.id === req.params.id);
  
  if (projectIndex === -1) {
    return res.status(404).json({ error: 'Project not found' });
  }

  db.projects[projectIndex] = { ...db.projects[projectIndex], ...req.body };
  res.json({ success: true, data: db.projects[projectIndex] });
});

app.delete('/api/projects/:id', authenticateToken, (req, res) => {
  const projectIndex = db.projects.findIndex(p => p.id === req.params.id);
  
  if (projectIndex === -1) {
    return res.status(404).json({ error: 'Project not found' });
  }

  // Check if user is admin or owner
  if (req.user.role !== 'admin' && db.projects[projectIndex].owner !== req.user.id) {
    return res.status(403).json({ error: 'Permission denied' });
  }

  db.projects.splice(projectIndex, 1);
  res.json({ success: true, message: 'Project deleted' });
});

// ========================
// Features Endpoints
// ========================

app.get('/api/features', authenticateToken, (req, res) => {
  const { projectId, status, priority } = req.query;
  let features = [...db.features];

  if (projectId) {
    features = features.filter(f => f.projectId === projectId);
  }
  if (status) {
    features = features.filter(f => f.status === status);
  }
  if (priority) {
    features = features.filter(f => f.priority === priority);
  }

  res.json({
    success: true,
    data: features,
    total: features.length
  });
});

app.get('/api/features/:id', authenticateToken, (req, res) => {
  const feature = db.features.find(f => f.id === req.params.id);
  
  if (!feature) {
    return res.status(404).json({ error: 'Feature not found' });
  }

  res.json({ success: true, data: feature });
});

app.post('/api/features', authenticateToken, (req, res) => {
  const { projectId, name, priority = 'medium', status = 'pending' } = req.body;

  if (!projectId || !name) {
    return res.status(400).json({ error: 'Project ID and name required' });
  }

  const newFeature = {
    id: uuidv4(),
    projectId,
    name,
    priority,
    status,
    progress: 0,
    createdAt: new Date()
  };

  db.features.push(newFeature);
  res.status(201).json({ success: true, data: newFeature });
});

app.put('/api/features/:id', authenticateToken, (req, res) => {
  const featureIndex = db.features.findIndex(f => f.id === req.params.id);
  
  if (featureIndex === -1) {
    return res.status(404).json({ error: 'Feature not found' });
  }

  db.features[featureIndex] = { ...db.features[featureIndex], ...req.body };
  res.json({ success: true, data: db.features[featureIndex] });
});

app.delete('/api/features/:id', authenticateToken, (req, res) => {
  const featureIndex = db.features.findIndex(f => f.id === req.params.id);
  
  if (featureIndex === -1) {
    return res.status(404).json({ error: 'Feature not found' });
  }

  db.features.splice(featureIndex, 1);
  res.json({ success: true, message: 'Feature deleted' });
});

// ========================
// Tasks Endpoints
// ========================

app.get('/api/tasks', authenticateToken, (req, res) => {
  const { featureId, status, assignee, priority } = req.query;
  let tasks = [...db.tasks];

  if (featureId) {
    tasks = tasks.filter(t => t.featureId === featureId);
  }
  if (status) {
    tasks = tasks.filter(t => t.status === status);
  }
  if (assignee) {
    tasks = tasks.filter(t => t.assignee === assignee);
  }
  if (priority) {
    tasks = tasks.filter(t => t.priority === priority);
  }

  res.json({
    success: true,
    data: tasks,
    total: tasks.length
  });
});

app.get('/api/tasks/:id', authenticateToken, (req, res) => {
  const task = db.tasks.find(t => t.id === req.params.id);
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json({ success: true, data: task });
});

app.post('/api/tasks', authenticateToken, (req, res) => {
  const { featureId, title, assignee, priority = 'medium', status = 'pending' } = req.body;

  if (!featureId || !title) {
    return res.status(400).json({ error: 'Feature ID and title required' });
  }

  const newTask = {
    id: uuidv4(),
    featureId,
    title,
    assignee: assignee || req.user.id,
    priority,
    status,
    createdAt: new Date()
  };

  db.tasks.push(newTask);
  res.status(201).json({ success: true, data: newTask });
});

app.put('/api/tasks/:id', authenticateToken, (req, res) => {
  const taskIndex = db.tasks.findIndex(t => t.id === req.params.id);
  
  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  db.tasks[taskIndex] = { ...db.tasks[taskIndex], ...req.body };
  res.json({ success: true, data: db.tasks[taskIndex] });
});

app.patch('/api/tasks/:id/status', authenticateToken, (req, res) => {
  const { status } = req.body;
  const taskIndex = db.tasks.findIndex(t => t.id === req.params.id);
  
  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (!['pending', 'active', "completed"].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  db.tasks[taskIndex].status = status;
  res.json({ success: true, data: db.tasks[taskIndex] });
});

app.delete('/api/tasks/:id', authenticateToken, (req, res) => {
  const taskIndex = db.tasks.findIndex(t => t.id === req.params.id);
  
  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  db.tasks.splice(taskIndex, 1);
  res.json({ success: true, message: 'Task deleted' });
});

// ========================
// User Profile Endpoints
// ========================

app.get('/api/users/profile', authenticateToken, (req, res) => {
  const user = db.users.find(u => u.id === req.user.id);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { password, ...userWithoutPassword } = user;
  res.json({ success: true, data: userWithoutPassword });
});

app.put('/api/users/profile', authenticateToken, (req, res) => {
  const userIndex = db.users.findIndex(u => u.id === req.user.id);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { password, ...updates } = req.body;
  
  // If password is being updated, hash it
  if (password) {
    updates.password = bcrypt.hashSync(password, 10);
  }

  db.users[userIndex] = { ...db.users[userIndex], ...updates };
  const { password: _, ...userWithoutPassword } = db.users[userIndex];
  
  res.json({ success: true, data: userWithoutPassword });
});

app.get('/api/users', authenticateToken, (req, res) => {
  // Only admins can list all users
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Permission denied' });
  }

  const users = db.users.map(({ password, ...user }) => user);
  res.json({ success: true, data: users, total: users.length });
});

// ========================
// Statistics Endpoint
// ========================

app.get('/api/stats', authenticateToken, (req, res) => {
  const stats = {
    totalProjects: db.projects.length,
    activeProjects: db.projects.filter(p => p.status === 'active').length,
    totalFeatures: db.features.length,
    completedFeatures: db.features.filter(f => f.status === "completed").length,
    inProgressFeatures: db.features.filter(f => f.status === 'active').length,
    totalTasks: db.tasks.length,
    pendingTasks: db.tasks.filter(t => t.status === 'pending').length,
    activeTasks: db.tasks.filter(t => t.status === 'active').length,
    completedTasks: db.tasks.filter(t => t.status === "completed").length
  };

  res.json({ success: true, data: stats });
});

// ========================
// Health Check
// ========================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development"
  });
});

// ========================
// Error Handler
// ========================

app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === "development" ? err.message : undefined
  });
});

// ========================
// Start Server
// ========================

app.listen(PORT, () => {
  console.log(`🚀 AI Dev Portal API Server running at http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log('\nAvailable endpoints:');
  console.log('  POST   /api/auth/login');
  console.log('  POST   /api/auth/logout');
  console.log('  GET    /api/auth/verify');
  console.log('  GET    /api/projects');
  console.log('  GET    /api/features');
  console.log('  GET    /api/tasks');
  console.log('  GET    /api/stats');
  console.log('  GET    /api/health');
});

export default app;