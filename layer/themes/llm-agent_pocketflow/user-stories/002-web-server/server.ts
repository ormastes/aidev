import express, { Request, Response } from 'express';
import { path } from '../../../infra_external-log-lib/src';
import { 
  setupWebSecurity,
  AuthService,
  SecurityConstants,
  User,
  NavigationHelper
} from '../../../web-security/pipe';

// Extend Request with user
interface AuthRequest extends Request {
  user?: User;
}

// Task interface for PocketFlow
interface TaskItem {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory task storage (replace with database in production)
const tasks: Map<string, TaskItem> = new Map();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3500;

// Basic middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Setup web security
const { authService, sessionManager, appRegistry } = setupWebSecurity(app, {
  requireAuth: false,
  enableRateLimit: true,
  authMiddlewareConfig: {
    loginPath: 'http://localhost:3400/login',
    publicPaths: ['/', '/health', '/api/auth/*']
  },
  sessionConfig: {
    cookieDomain: 'localhost',
    cookieName: SecurityConstants.SESSION.COOKIE_NAME
  }
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    service: 'PocketFlow',
    port: PORT,
    taskCount: tasks.size
  });
});

// Check authentication status
app.get('/api/auth/check', async (req: AuthRequest, res: Response) => {
  const user = await authService.getCurrentUser(req);
  
  if (user) {
    res.json({ 
      authenticated: true, 
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.roles[0]
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Get user's tasks
app.get('/api/tasks', async (req: AuthRequest, res: Response) => {
  const user = await authService.getCurrentUser(req);
  
  if (!user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      loginUrl: 'http://localhost:3400/login?returnUrl=http://localhost:3500'
    });
  }
  
  // Filter tasks by user
  const userTasks = Array.from(tasks.values())
    .filter(task => task.userId === user.id)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  
  res.json(userTasks);
});

// Create new task
app.post('/api/tasks', async (req: AuthRequest, res: Response) => {
  const user = await authService.getCurrentUser(req);
  
  if (!user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      loginUrl: 'http://localhost:3400/login?returnUrl=http://localhost:3500'
    });
  }
  
  const { title, description, priority = 'medium' } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Task title is required' });
  }
  
  const task: TaskItem = {
    id: `task-${Date.now()}`,
    title,
    description: description || '',
    status: 'pending',
    priority,
    userId: user.id,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  tasks.set(task.id, task);
  res.status(201).json(task);
});

// Update task
app.put('/api/tasks/:id', async (req: AuthRequest, res: Response) => {
  const user = await authService.getCurrentUser(req);
  
  if (!user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      loginUrl: 'http://localhost:3400/login?returnUrl=http://localhost:3500'
    });
  }
  
  const taskId = req.params.id;
  const task = tasks.get(taskId);
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  if (task.userId !== user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const { title, description, status, priority } = req.body;
  
  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (status !== undefined) task.status = status;
  if (priority !== undefined) task.priority = priority;
  task.updatedAt = new Date();
  
  res.json(task);
});

// Delete task
app.delete('/api/tasks/:id', async (req: AuthRequest, res: Response) => {
  const user = await authService.getCurrentUser(req);
  
  if (!user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      loginUrl: 'http://localhost:3400/login?returnUrl=http://localhost:3500'
    });
  }
  
  const taskId = req.params.id;
  const task = tasks.get(taskId);
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  if (task.userId !== user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  tasks.delete(taskId);
  res.json({ success: true });
});

// Serve the PocketFlow app
app.get('/', async (req: Request, res: Response) => {
  const navigation = await NavigationHelper.generateNavigationHTML('pocketflow', authService, req);
  
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>PocketFlow - Lightweight Task Manager</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      background: #f5f5f5;
    }
    .header {
      background: white;
      padding: 1rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .container {
      max-width: 800px;
      margin: 2rem auto;
      padding: 0 1rem;
    }
    .auth-status {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .task-form {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      margin-bottom: 2rem;
      display: none;
    }
    .task-form.active {
      display: block;
    }
    .form-group {
      margin-bottom: 1rem;
    }
    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }
    .form-group input, .form-group textarea, .form-group select {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    .task-list {
      background: white;
      border-radius: 8px;
      padding: 1rem;
    }
    .task-item {
      padding: 1rem;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .task-item:last-child {
      border-bottom: none;
    }
    .task-info h3 {
      margin: 0 0 0.5rem 0;
    }
    .task-meta {
      display: flex;
      gap: 1rem;
      font-size: 0.875rem;
      color: #666;
    }
    .task-actions {
      display: flex;
      gap: 0.5rem;
    }
    .btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.875rem;
    }
    .btn-primary {
      background: #007bff;
      color: white;
    }
    .btn-success {
      background: #28a745;
      color: white;
    }
    .btn-danger {
      background: #dc3545;
      color: white;
    }
    .btn-secondary {
      background: #6c757d;
      color: white;
    }
    .login-prompt {
      text-align: center;
      padding: 3rem;
      background: white;
      border-radius: 8px;
    }
    .priority-high { color: #dc3545; }
    .priority-medium { color: #ffc107; }
    .priority-low { color: #28a745; }
    .status-pending { background: #f8f9fa; }
    .status-in_progress { background: #e3f2fd; }
    .status-completed { background: #e8f5e9; }
  </style>
</head>
<body>
  ${navigation}
  <div class="header">
    <h1>PocketFlow</h1>
    <div class="auth-status" id="authStatus">
      <span>Checking authentication...</span>
    </div>
  </div>
  
  <div class="container">
    <div id="loginPrompt" class="login-prompt" style="display:none;">
      <h2>Welcome to PocketFlow</h2>
      <p>Please log in to manage your tasks</p>
      <button class="btn btn-primary" onclick="login()">Login</button>
    </div>
    
    <div id="appContent" style="display:none;">
      <button class="btn btn-primary" onclick="toggleTaskForm()">Add New Task</button>
      
      <div id="taskForm" class="task-form">
        <h2>Create New Task</h2>
        <div class="form-group">
          <label>Title</label>
          <input type="text" id="taskTitle" placeholder="Enter task title">
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="taskDescription" rows="3" placeholder="Enter task description"></textarea>
        </div>
        <div class="form-group">
          <label>Priority</label>
          <select id="taskPriority">
            <option value="low">Low</option>
            <option value="medium" selected>Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <button class="btn btn-success" onclick="createTask()">Create Task</button>
        <button class="btn btn-secondary" onclick="toggleTaskForm()">Cancel</button>
      </div>
      
      <div class="task-list">
        <h2>Your Tasks</h2>
        <div id="taskList">Loading tasks...</div>
      </div>
    </div>
  </div>
  
  <script>
    let isAuthenticated = false;
    let tasks = [];
    
    // Check authentication
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/check');
        const data = await response.json();
        
        const authStatus = document.getElementById('authStatus');
        if (data.authenticated) {
          isAuthenticated = true;
          authStatus.innerHTML = \`
            <span>Welcome, \${data.user.username}!</span>
            <button class="btn btn-secondary" onclick="location.href='http://localhost:3400/dashboard'">Dashboard</button>
          \`;
          document.getElementById('appContent').style.display = 'block';
          document.getElementById('loginPrompt').style.display = 'none';
          loadTasks();
        } else {
          authStatus.innerHTML = \`
            <span>Not logged in</span>
            <button class="btn btn-primary" onclick="login()">Login</button>
          \`;
          document.getElementById('appContent').style.display = 'none';
          document.getElementById('loginPrompt').style.display = 'block';
        }
      } catch (error) {
        console.error('Auth check error:', error);
      }
    }
    
    function login() {
      window.location.href = 'http://localhost:3400/login?returnUrl=http://localhost:3500';
    }
    
    function toggleTaskForm() {
      const form = document.getElementById('taskForm');
      form.classList.toggle('active');
    }
    
    async function loadTasks() {
      try {
        const response = await fetch('/api/tasks');
        if (response.status === 401) {
          login();
          return;
        }
        
        tasks = await response.json();
        renderTasks();
      } catch (error) {
        console.error('Load tasks error:', error);
      }
    }
    
    function renderTasks() {
      const taskList = document.getElementById('taskList');
      
      if (tasks.length === 0) {
        taskList.innerHTML = '<p>No tasks yet. Create your first task!</p>';
        return;
      }
      
      taskList.innerHTML = tasks.map(task => \`
        <div class="task-item status-\${task.status}">
          <div class="task-info">
            <h3>\${task.title}</h3>
            <p>\${task.description}</p>
            <div class="task-meta">
              <span class="priority-\${task.priority}">Priority: \${task.priority}</span>
              <span>Status: \${task.status.replace('_', ' ')}</span>
              <span>Updated: \${new Date(task.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div class="task-actions">
            <select onchange="updateTaskStatus('\${task.id}', this.value)">
              <option value="pending" \${task.status === 'pending' ? 'selected' : ''}>Pending</option>
              <option value="in_progress" \${task.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
              <option value="completed" \${task.status === 'completed' ? 'selected' : ''}>Completed</option>
            </select>
            <button class="btn btn-danger" onclick="deleteTask('\${task.id}')">Delete</button>
          </div>
        </div>
      \`).join('');
    }
    
    async function createTask() {
      const title = document.getElementById('taskTitle').value;
      const description = document.getElementById('taskDescription').value;
      const priority = document.getElementById('taskPriority').value;
      
      if (!title) {
        alert('Please enter a task title');
        return;
      }
      
      try {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, description, priority })
        });
        
        if (response.status === 401) {
          login();
          return;
        }
        
        if (response.ok) {
          document.getElementById('taskTitle').value = '';
          document.getElementById('taskDescription').value = '';
          document.getElementById('taskPriority').value = 'medium';
          toggleTaskForm();
          loadTasks();
        }
      } catch (error) {
        console.error('Create task error:', error);
      }
    }
    
    async function updateTaskStatus(taskId, status) {
      try {
        const response = await fetch(\`/api/tasks/\${taskId}\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
        
        if (response.status === 401) {
          login();
          return;
        }
        
        if (response.ok) {
          loadTasks();
        }
      } catch (error) {
        console.error('Update task error:', error);
      }
    }
    
    async function deleteTask(taskId) {
      if (!confirm('Are you sure you want to delete this task?')) {
        return;
      }
      
      try {
        const response = await fetch(\`/api/tasks/\${taskId}\`, {
          method: 'DELETE'
        });
        
        if (response.status === 401) {
          login();
          return;
        }
        
        if (response.ok) {
          loadTasks();
        }
      } catch (error) {
        console.error('Delete task error:', error);
      }
    }
    
    // Initialize
    checkAuth();
  </script>
</body>
</html>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log(`PocketFlow is running on http://localhost:${PORT}`);
  console.log('Using web-security theme for authentication');
  console.log('Sharing sessions with other AI Dev Platform services');
});