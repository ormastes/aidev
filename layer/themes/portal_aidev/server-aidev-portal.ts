/**
 * AI Dev Portal - Secured Task Queue Portal
 * Uses portal_security theme for authentication
 */

import { Elysia } from 'elysia';
import { html } from '@elysiajs/html';
import * as fs from 'fs';
import * as path from 'path';
import { setupElysiaSecurity, User } from '../portal_security/pipe';

// Read task queue data
function getTaskQueue() {
  try {
    const taskQueuePath = path.join(process.cwd(), 'TASK_QUEUE.vf.json');
    const data = fs.readFileSync(taskQueuePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading TASK_QUEUE.vf.json:', error);
    return null;
  }
}

// Format task for display
function formatTask(task: any): string {
  const statusBadge = task.status === 'completed'
    ? '<span class="badge completed">Completed</span>'
    : task.status === 'in_progress'
    ? '<span class="badge in-progress">In Progress</span>'
    : '<span class="badge pending">Pending</span>';

  const priority = task.priority === 'critical' ? '🔴'
    : task.priority === 'high' ? '🟠'
    : task.priority === 'medium' ? '🟡'
    : task.priority === 'low' ? '🟢'
    : '';

  return `
    <div class="task-card">
      <div class="task-header">
        ${priority} ${statusBadge}
        <span class="task-id">${task.id}</span>
      </div>
      <h4>${task.content}</h4>
      ${task.details?.description ? `<p class="task-desc">${task.details.description}</p>` : ''}
      ${task.created_at ? `<div class="task-meta">Created: ${new Date(task.created_at).toLocaleDateString()}</div>` : ''}
    </div>
  `;
}

// Generate login page HTML
function getLoginPage(): string {
  return `<!DOCTYPE html>
  <html>
  <head>
    <title>AI Dev Portal - Login</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .login-card {
        background: white;
        padding: 2rem;
        border-radius: 1rem;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        width: 100%;
        max-width: 400px;
      }
      h1 {
        color: #667eea;
        margin-bottom: 1.5rem;
        text-align: center;
      }
      .form-group {
        margin-bottom: 1rem;
      }
      label {
        display: block;
        color: #333;
        margin-bottom: 0.5rem;
        font-weight: 500;
      }
      input {
        width: 100%;
        padding: 0.75rem;
        border: 2px solid #e0e0e0;
        border-radius: 0.5rem;
        font-size: 1rem;
      }
      input:focus {
        outline: none;
        border-color: #667eea;
      }
      button {
        width: 100%;
        padding: 0.75rem;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 0.5rem;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.2s;
      }
      button:hover {
        transform: translateY(-2px);
      }
      .error {
        color: #e74c3c;
        margin-top: 1rem;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="login-card">
      <h1>🔐 AI Dev Portal</h1>
      <form method="POST" action="/api/auth/login">
        <div class="form-group">
          <label for="username">Username</label>
          <input type="text" id="username" name="username" required>
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" name="password" required>
        </div>
        <button type="submit">Login</button>
      </form>
      <div id="error" class="error"></div>
    </div>
  </body>
  </html>`;
}

// Create the secured portal app
export const app = new Elysia()
  .use(html());

// Setup security
const securityWrapper = setupElysiaSecurity(app, {
  requireAuth: true,
  publicPaths: ['/login', '/api/auth/login', '/health'],
  loginPath: '/login'
});

app
  // Login page
  .get('/login', () => getLoginPage())

  // Login API
  .post('/api/auth/login', async ({ body, cookie, set }) => {
    const { username, password } = body as any;

    const result = await securityWrapper.login(username, password);
    if (!result) {
      set.status = 401;
      return { success: false, error: 'Invalid credentials' };
    }

    // Set session cookie
    cookie.sessionId.set({
      value: result.sessionId,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600 // 1 hour
    });

    set.redirect = '/';
    return { success: true, user: result.user };
  })

  // Logout API
  .post('/api/auth/logout', ({ cookie, set }) => {
    const sessionId = cookie.sessionId?.value;
    if (sessionId) {
      securityWrapper.logout(sessionId);
    }
    cookie.sessionId.remove();
    set.redirect = '/login';
    return { success: true };
  })

  // Main dashboard - Requires authentication
  .get('/', ({ user }) => {
    if (!user) {
      // This shouldn't happen due to security middleware, but just in case
      return getLoginPage();
    }

    const taskQueue = getTaskQueue();
    let taskContent = '';
    let stats = {
      total: 0,
      completed: 0,
      in_progress: 0,
      pending: 0
    };

    if (taskQueue && taskQueue.queues) {
      Object.entries(taskQueue.queues).forEach(([queueType, queue]: [string, any]) => {
        if (queue.items && queue.items.length > 0) {
          taskContent += `<h3 class="queue-title">${queueType.replace(/_/g, ' ').toUpperCase()}</h3>`;
          queue.items.forEach((task: any) => {
            taskContent += formatTask(task);
            stats.total++;
            if (task.status === 'completed') stats.completed++;
            else if (task.status === 'in_progress') stats.in_progress++;
            else stats.pending++;
          });
        }
      });
    }

    return `<!DOCTYPE html>
    <html>
    <head>
      <title>AI Dev Portal - Task Queue</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        /* Same styles as before */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: #1a1a2e;
          color: #eee;
          min-height: 100vh;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .header .container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .header h1 {
          color: white;
          font-size: 2rem;
        }
        .header p {
          color: rgba(255,255,255,0.9);
          margin-top: 0.5rem;
        }
        .user-info {
          color: white;
          display: flex;
          gap: 1rem;
          align-items: center;
        }
        .logout-btn {
          background: rgba(255,255,255,0.2);
          border: 1px solid white;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
        }
        .logout-btn:hover {
          background: rgba(255,255,255,0.3);
        }
        .container {
          max-width: 1200px;
          margin: 2rem auto;
          padding: 0 1rem;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .stat-card {
          background: #16213e;
          padding: 1.5rem;
          border-radius: 0.5rem;
          text-align: center;
        }
        .stat-card h3 {
          font-size: 2rem;
          color: #667eea;
          margin-bottom: 0.5rem;
        }
        .stat-card p {
          color: #aaa;
        }
        .task-section {
          background: #0f1419;
          padding: 1.5rem;
          border-radius: 0.5rem;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        .refresh-btn {
          background: #667eea;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          cursor: pointer;
        }
        .queue-title {
          color: #764ba2;
          margin: 1.5rem 0 1rem;
          font-size: 1.2rem;
        }
        .task-card {
          background: #16213e;
          border-left: 4px solid #667eea;
          border-radius: 0.5rem;
          padding: 1rem;
          margin-bottom: 1rem;
        }
        .task-header {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .badge {
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .badge.completed { background: #27ae60; color: white; }
        .badge.in-progress { background: #f39c12; color: white; }
        .badge.pending { background: #95a5a6; color: white; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="container">
          <div>
            <h1>📋 AI Dev Portal - Task Queue</h1>
            <p>Secured task management dashboard</p>
          </div>
          <div class="user-info">
            <span>👤 ${(user as User).username}</span>
            <form method="POST" action="/api/auth/logout">
              <button class="logout-btn" type="submit">Logout</button>
            </form>
          </div>
        </div>
      </div>

      <div class="container">
        <div class="stats-grid">
          <div class="stat-card"><h3>${stats.total}</h3><p>Total Tasks</p></div>
          <div class="stat-card"><h3>${stats.pending}</h3><p>Pending</p></div>
          <div class="stat-card"><h3>${stats.in_progress}</h3><p>In Progress</p></div>
          <div class="stat-card"><h3>${stats.completed}</h3><p>Completed</p></div>
        </div>

        <div class="task-section">
          <div class="section-header">
            <h2>Task Queue</h2>
            <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>
          </div>
          ${taskContent || '<div class="empty-state">No tasks in queue</div>'}
        </div>
      </div>

      <script>
        setTimeout(() => location.reload(), 30000);
      </script>
    </body>
    </html>`;
  })

  // API endpoint for task queue data - Requires authentication
  .get('/api/tasks', ({ user }) => {
    const taskQueue = getTaskQueue();
    return {
      success: true,
      data: taskQueue,
      user: user ? (user as User).username : null,
      timestamp: new Date().toISOString()
    };
  })

  // Health check - Public
  .get('/health', () => ({
    status: 'healthy',
    service: 'aidev-portal-secured',
    version: '2.0.0',
    security: 'enabled',
    timestamp: new Date().toISOString()
  }));

// Start the server
if (import.meta.main) {
  app.listen(3456, () => {
    console.log('🔐 Secured AI Dev Portal running at http://localhost:3456');
    console.log('📋 Authentication required - Default: admin/admin');
  });
}

export default app;
