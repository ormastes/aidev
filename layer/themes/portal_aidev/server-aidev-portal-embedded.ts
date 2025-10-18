/**
 * AI Dev Portal - With Embedded Services Support
 * Uses portal_security theme for authentication and embedding manager for services
 */

import { Elysia } from 'elysia';
import { html } from '@elysiajs/html';
import { cors } from '@elysiajs/cors';
import * as fs from 'fs';
import * as path from 'path';
import { setupElysiaSecurity, User } from '../portal_security/pipe';

// Embedded services configuration
const EMBEDDED_SERVICES = [
  {
    id: 'task-queue',
    name: 'Task Queue',
    url: 'http://localhost:3456/services/task-queue',
    port: 3456,
    icon: '📋',
    description: 'View and manage development tasks',
    internal: true
  },
  {
    id: 'log-dashboard',
    name: 'Log Analysis',
    url: 'http://localhost:3001',
    port: 3001,
    icon: '📊',
    description: 'Real-time log analysis and monitoring'
  },
  {
    id: 'gui-selector',
    name: 'GUI Selector',
    url: 'http://localhost:3457',
    port: 3457,
    icon: '🎨',
    description: 'Design selection and preview'
  },
  {
    id: 'story-reporter',
    name: 'Story Reporter',
    url: 'http://localhost:3002',
    port: 3002,
    icon: '📝',
    description: 'Automated testing and reporting'
  }
];

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

// Generate main dashboard with embedded services
function getDashboardPage(user: User, sessionId: string): string {
  return `<!DOCTYPE html>
  <html>
  <head>
    <title>AI Dev Portal</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { height: 100%; overflow: hidden; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background: #1a1a2e;
        color: #eee;
      }
      .portal-layout {
        display: flex;
        flex-direction: column;
        height: 100vh;
      }
      .portal-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 1rem 2rem;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .portal-header h1 {
        color: white;
        font-size: 1.5rem;
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
      }
      .logout-btn:hover {
        background: rgba(255,255,255,0.3);
      }
      .portal-main {
        flex: 1;
        display: flex;
        overflow: hidden;
      }
      .service-sidebar {
        width: 250px;
        background: #0f1419;
        border-right: 1px solid #2a2a3e;
        padding: 1rem 0;
      }
      .service-nav-item {
        padding: 0.75rem 1.5rem;
        border: none;
        background: transparent;
        cursor: pointer;
        font-size: 0.9rem;
        color: #aaa;
        width: 100%;
        text-align: left;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        transition: all 0.2s;
        border-left: 3px solid transparent;
      }
      .service-nav-item:hover {
        background: #16213e;
        color: #eee;
      }
      .service-nav-item.active {
        background: #16213e;
        color: #667eea;
        border-left-color: #667eea;
      }
      .service-icon {
        font-size: 1.2rem;
      }
      .service-content {
        flex: 1;
        position: relative;
        overflow: hidden;
      }
      #embedded-container {
        width: 100%;
        height: 100%;
      }
    </style>
  </head>
  <body>
    <div class="portal-layout">
      <div class="portal-header">
        <h1>🚀 AI Dev Portal</h1>
        <div class="user-info">
          <span>👤 ${user.username}</span>
          <form method="POST" action="/api/auth/logout" style="margin: 0;">
            <button class="logout-btn" type="submit">Logout</button>
          </form>
        </div>
      </div>

      <div class="portal-main">
        <nav class="service-sidebar">
          ${EMBEDDED_SERVICES.map(service => `
            <button
              class="service-nav-item ${service.id === 'task-queue' ? 'active' : ''}"
              data-service-id="${service.id}"
              data-testid="nav-${service.id}"
            >
              <span class="service-icon">${service.icon}</span>
              <div>
                <div style="font-weight: 500;">${service.name}</div>
                <div style="font-size: 0.75rem; color: #666;">${service.description}</div>
              </div>
            </button>
          `).join('')}
        </nav>

        <div class="service-content">
          <div id="embedded-container"></div>
        </div>
      </div>
    </div>

    <script type="module">
      // Import embedding infrastructure (in real app, this would be bundled)
      const services = ${JSON.stringify(EMBEDDED_SERVICES)};
      const sessionId = '${sessionId}';
      const userId = '${user.id}';
      const username = '${user.username}';

      // Simple embedding manager (client-side version)
      class SimpleEmbeddingManager {
        constructor() {
          this.currentServiceId = null;
          this.setupMessageListener();
        }

        setupMessageListener() {
          window.addEventListener('message', (event) => {
            // Handle messages from embedded services
            console.log('Received message:', event.data);
          });
        }

        async switchToService(serviceId) {
          const service = services.find(s => s.id === serviceId);
          if (!service) return;

          const container = document.getElementById('embedded-container');

          // Clear existing
          container.innerHTML = '';

          if (service.internal) {
            // Load internal service content
            this.loadInternalService(serviceId, container);
          } else {
            // Create iframe for external service
            const iframe = document.createElement('iframe');
            iframe.src = service.url;
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = 'none';
            iframe.sandbox = 'allow-same-origin allow-scripts allow-forms allow-popups';
            iframe.title = service.name;

            // Send auth token when iframe loads
            iframe.addEventListener('load', () => {
              iframe.contentWindow.postMessage({
                type: 'AUTH_TOKEN',
                data: { sessionId, userId, username }
              }, service.url);
            });

            container.appendChild(iframe);
          }

          this.currentServiceId = serviceId;
        }

        async loadInternalService(serviceId, container) {
          if (serviceId === 'task-queue') {
            // Load task queue
            const response = await fetch('/api/tasks');
            const data = await response.json();
            container.innerHTML = this.renderTaskQueue(data.data);
          }
        }

        renderTaskQueue(taskQueue) {
          if (!taskQueue || !taskQueue.queues) {
            return '<div style="padding: 2rem; text-align: center; color: #666;">No tasks found</div>';
          }

          let html = '<div style="padding: 2rem; overflow-y: auto; height: 100%;">';
          html += '<h2 style="color: #667eea; margin-bottom: 1.5rem;">Task Queue</h2>';

          Object.entries(taskQueue.queues).forEach(([queueType, queue]) => {
            if (queue.items && queue.items.length > 0) {
              html += \`<h3 style="color: #764ba2; margin: 1.5rem 0 1rem;">\${queueType.replace(/_/g, ' ').toUpperCase()}</h3>\`;
              queue.items.forEach(task => {
                html += \`
                  <div style="background: #16213e; border-left: 4px solid #667eea; border-radius: 0.5rem; padding: 1rem; margin-bottom: 1rem;">
                    <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                      <span style="padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.75rem; background: \${task.status === 'completed' ? '#27ae60' : task.status === 'in_progress' ? '#f39c12' : '#95a5a6'}; color: white;">\${task.status}</span>
                    </div>
                    <h4 style="margin: 0.5rem 0;">\${task.content}</h4>
                    \${task.details?.description ? \`<p style="color: #aaa; margin: 0.5rem 0;">\${task.details.description}</p>\` : ''}
                  </div>
                \`;
              });
            }
          });

          html += '</div>';
          return html;
        }
      }

      // Initialize
      const manager = new SimpleEmbeddingManager();

      // Handle navigation clicks
      document.querySelectorAll('.service-nav-item').forEach(item => {
        item.addEventListener('click', () => {
          const serviceId = item.getAttribute('data-service-id');

          // Update active state
          document.querySelectorAll('.service-nav-item').forEach(i => i.classList.remove('active'));
          item.classList.add('active');

          // Switch service
          manager.switchToService(serviceId);
        });
      });

      // Load default service
      manager.switchToService('task-queue');
    </script>
  </body>
  </html>`;
}

// Create the secured portal app
export const app = new Elysia()
  .use(html())
  .use(cors({
    origin: ['http://localhost:3001', 'http://localhost:3002', 'http://localhost:3457'],
    credentials: true
  }));

// Setup security
const securityWrapper = setupElysiaSecurity(app, {
  requireAuth: true,
  publicPaths: ['/login', '/api/auth/login', '/health', '/services/*'],
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

  // Main dashboard with embedded services
  .get('/', ({ user, cookie }) => {
    if (!user) {
      return getLoginPage();
    }

    const sessionId = cookie.sessionId?.value || '';
    return getDashboardPage(user as User, sessionId);
  })

  // Internal service: Task Queue
  .get('/services/task-queue', ({ user }) => {
    const taskQueue = getTaskQueue();
    let taskContent = '';

    if (taskQueue && taskQueue.queues) {
      Object.entries(taskQueue.queues).forEach(([queueType, queue]: [string, any]) => {
        if (queue.items && queue.items.length > 0) {
          taskContent += `<h3 class="queue-title">${queueType.replace(/_/g, ' ').toUpperCase()}</h3>`;
          queue.items.forEach((task: any) => {
            taskContent += formatTask(task);
          });
        }
      });
    }

    return taskContent || '<div class="empty-state">No tasks in queue</div>';
  })

  // API endpoint for task queue data
  .get('/api/tasks', ({ user }) => {
    const taskQueue = getTaskQueue();
    return {
      success: true,
      data: taskQueue,
      user: user ? (user as User).username : null,
      timestamp: new Date().toISOString()
    };
  })

  // API endpoint for embedded services list
  .get('/api/services', () => {
    return {
      success: true,
      services: EMBEDDED_SERVICES
    };
  })

  // Health check
  .get('/health', () => ({
    status: 'healthy',
    service: 'aidev-portal-embedded',
    version: '3.0.0',
    security: 'enabled',
    embedding: 'enabled',
    timestamp: new Date().toISOString()
  }));

// Start the server
if (import.meta.main) {
  app.listen(3456, () => {
    console.log('🚀 AI Dev Portal (with Embedding) running at http://localhost:3456');
    console.log('📋 Authentication required - Default: admin/admin');
    console.log('🎯 Embedded Services:');
    EMBEDDED_SERVICES.forEach(service => {
      console.log(`   ${service.icon} ${service.name} - ${service.description}`);
    });
  });
}

export default app;
