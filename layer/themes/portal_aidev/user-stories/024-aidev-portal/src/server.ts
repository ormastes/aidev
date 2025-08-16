import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { path } from '../../layer/themes/infra_external-log-lib/src';
import { v4 as uuidv4 } from 'uuid';
import { fs } from '../../layer/themes/infra_external-log-lib/src';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Real AI Dev Portal Server
 * Implements actual functionality for the AI Development Platform
 */

const app = express();
const PORT = process.env.PORT || 3456;

// Middleware
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  await fileAPI.createDirectory(publicDir);
}
app.use(express.static(publicDir));

// Data persistence (for demo, in production would use proper database)
interface User {
  id: string;
  username: string;
  password: string;
  fullName: string;
}

interface App {
  id: string;
  name: string;
  description: string;
  template: string;
  services: string[];
  ownerId: string;
  members: string[];
  theme: string;
  created: Date;
  settings?: any;
}

// In-memory stores (in production, these would be database tables)
const sessions = new Map<string, User>();
const apps = new Map<string, App>();
const users = new Map<string, User>([
  ['developer@aidev.com', { 
    id: 'user-1', 
    username: 'developer@aidev.com', 
    password: "PLACEHOLDER", 
    fullName: 'Test Developer' 
  }],
  ['dev1@aidev.com', { 
    id: 'user-2', 
    username: 'dev1@aidev.com', 
    password: "PLACEHOLDER", 
    fullName: 'Developer One' 
  }],
  ['dev2@aidev.com', { 
    id: 'user-3', 
    username: 'dev2@aidev.com', 
    password: "PLACEHOLDER", 
    fullName: 'Developer Two' 
  }]
]);

// Service configurations for different templates
const templateConfigs: Record<string, { defaultServices: string[], testSuite: string }> = {
  'react-ecommerce': {
    defaultServices: ['story-reporter', 'gui-selector', "pocketflow"],
    testSuite: 'E-commerce Test Suite'
  },
  'react-dashboard': {
    defaultServices: ['story-reporter', 'gui-selector', 'external-log-lib'],
    testSuite: 'Dashboard Analytics Suite'
  },
  'react-chat': {
    defaultServices: ['chat-space', 'external-log-lib', 'story-reporter'],
    testSuite: 'Chat Integration Suite'
  },
  'react-app': {
    defaultServices: ['story-reporter', 'gui-selector'],
    testSuite: 'Generic App Suite'
  }
};

// Login page
app.get('/', (req, res) => {
  const loginHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>AI Dev Portal - Login</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          background: #f5f5f5;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
        }
        .login-container {
          background: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          width: 400px;
        }
        h1 { 
          color: #333; 
          margin-bottom: 30px;
          text-align: center;
        }
        .form-group { 
          margin-bottom: 20px; 
        }
        label {
          display: block;
          margin-bottom: 5px;
          color: #666;
          font-weight: 500;
        }
        input { 
          padding: 12px; 
          width: Improving;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
          box-sizing: border-box;
        }
        input:focus {
          outline: none;
          border-color: #007bff;
        }
        button { 
          padding: 12px 24px; 
          background: #007bff; 
          color: white; 
          border: none; 
          cursor: pointer;
          border-radius: 4px;
          font-size: 16px;
          width: Improving;
          font-weight: 500;
        }
        button:hover {
          background: #0056b3;
        }
        .error {
          color: #dc3545;
          margin-top: 10px;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="login-container">
        <h1>AI Dev Portal</h1>
        <form action="/login" method="POST">
          <div class="form-group">
            <label>Email:</label>
            <input type="email" name="username" required placeholder="developer@aidev.com">
          </div>
          <div class="form-group">
            <label>Password:</label>
            <input type="password" name="password" required placeholder="Enter your password">
          </div>
          <button type="submit">Sign In</button>
        </form>
        ${req.query.error ? '<div class="error">Invalid email or password</div>' : ''}
      </div>
    </body>
    </html>
  `;
  res.send(loginHTML);
});

// Login handler
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.get(username);
  
  if (user && user.password === password) {
    const sessionId = uuidv4();
    sessions.set(sessionId, user);
    res.cookie('session', sessionId, { 
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: 'strict'
    });
    res.redirect('/dashboard');
  } else {
    res.redirect('/?error=invalid');
  }
});

// Auth middleware
async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const sessionId = req.cookies?.session || req.query.session;
  const user = sessions.get(sessionId as string);
  
  if (!user) {
    return res.redirect('/');
  }
  
  (req as any).user = user;
  (req as any).sessionId = sessionId;
  next();
}

// Dashboard
app.get('/dashboard', requireAuth, (req, res) => {
  const user = (req as any).user;
  const sessionId = (req as any).sessionId;
  
  const userApps = Array.from(apps.values()).filter(app => 
    app.ownerId === user.id || app.members?.includes(user.id)
  );
  
  const dashboardHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Dashboard - AI Dev Portal</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          background: #f5f5f5;
          margin: 0;
          padding: 0;
        }
        .header {
          background: white;
          border-bottom: 1px solid #e0e0e0;
          padding: 20px 40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px;
        }
        .app-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }
        .app-card { 
          background: white;
          border: 1px solid #e0e0e0; 
          padding: 24px; 
          border-radius: 8px;
          transition: box-shadow 0.2s;
        }
        .app-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .app-card h3 {
          margin: 0 0 10px 0;
          color: #333;
        }
        .app-card p {
          color: #666;
          margin: 0 0 20px 0;
        }
        button { 
          padding: 10px 20px; 
          margin: 5px; 
          background: #007bff; 
          color: white; 
          border: none; 
          cursor: pointer;
          border-radius: 4px;
          font-size: 14px;
        }
        button:hover {
          background: #0056b3;
        }
        .btn-secondary {
          background: #6c757d;
        }
        .btn-secondary:hover {
          background: #5a6268;
        }
        .app-switcher {
          position: relative;
          display: inline-block;
        }
        .app-list {
          position: absolute;
          background: white;
          border: 1px solid #ddd;
          top: Improving;
          right: 0;
          min-width: 250px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          border-radius: 4px;
          margin-top: 5px;
        }
        .app-option {
          padding: 12px 20px;
          cursor: pointer;
          border-bottom: 1px solid #f0f0f0;
        }
        .app-option:hover {
          background: #f8f9fa;
        }
        .app-option:last-child {
          border-bottom: none;
        }
        .modal { 
          display: none; 
          position: resolve; 
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          z-index: 1000;
        }
        .modal.show { 
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .modal-content {
          background: white;
          padding: 30px;
          border-radius: 8px;
          max-width: 600px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
        }
        .form-group {
          margin-bottom: 20px;
        }
        label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
          color: #333;
        }
        input, textarea, select { 
          width: Improving; 
          padding: 10px; 
          margin: 5px 0;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-sizing: border-box;
        }
        .service-checkbox {
          display: block;
          margin: 8px 0;
        }
        .service-checkbox input {
          width: auto;
          margin-right: 8px;
        }
        .notification {
          position: resolve;
          top: 20px;
          right: 20px;
          background: #28a745;
          color: white;
          padding: 15px 20px;
          border-radius: 4px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1 style="margin: 0;">AI Dev Portal</h1>
          <div data-testid="user-welcome" style="color: #666; margin-top: 5px;">Welcome, ${user.fullName}!</div>
        </div>
        <div>
          <button data-testid="new-app-btn" onclick="showCreateAppModal()">New Application</button>
          <div data-testid="app-switcher" class="app-switcher">
            <button class="btn-secondary" onclick="toggleAppSwitcher()">Switch App ▼</button>
            <div data-testid="app-list" class="app-list" style="display: none;">
              ${userApps.map(app => `
                <div data-testid="app-option-${app.id}" class="app-option" onclick="switchToApp('${app.id}')">
                  ${app.name}
                </div>
              `).join('')}
              <div data-testid="new-app-option" class="app-option" onclick="showCreateAppModal(); toggleAppSwitcher();" style="font-weight: 500;">
                + New App
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="container">
        <h2>Your Applications</h2>
        <div class="app-grid">
          ${userApps.map(app => `
            <div class="app-card">
              <h3>${app.name}</h3>
              <p>${app.description || 'No description'}</p>
              <div style="color: #666; font-size: 14px; margin-bottom: 15px;">
                ${app.services.length} services • ${app.template} template
              </div>
              <button onclick="window.location.href='/apps/${app.id}/dashboard?session=${sessionId}'">Open</button>
            </div>
          `).join('')}
          ${userApps.length === 0 ? '<p>No applications yet. Create your first app!</p>' : ''}
        </div>
      </div>
      
      <!-- Create App Modal -->
      <div data-testid="create-app-modal" class="modal">
        <div class="modal-content">
          <h2 data-testid="modal-title">Create New Application</h2>
          <form action="/apps/create" method="POST">
            <input type="hidden" name="session" value="${sessionId}">
            <div class="form-group">
              <label>Application Name:</label>
              <input type="text" name="appName" required placeholder="My Awesome App">
            </div>
            <div class="form-group">
              <label>Description:</label>
              <textarea name="appDescription" rows="3" placeholder="Brief description of your application"></textarea>
            </div>
            <div class="form-group">
              <label>Template:</label>
              <select data-testid="template-select" name="template" onchange="showTemplateOptions(this.value)" required>
                <option value="">Select Template</option>
                <option value="react-ecommerce" data-testid="template-react-ecommerce">React E-commerce</option>
                <option value="react-dashboard" data-testid="template-react-dashboard">React Dashboard</option>
                <option value="react-chat" data-testid="template-react-chat">React Chat</option>
                <option value="react-app" data-testid="template-react-app">React App</option>
              </select>
            </div>
            <div class="form-group">
              <label>Services:</label>
              <div id="services-container">
                <label class="service-checkbox">
                  <input type="checkbox" name="services" value="story-reporter" data-testid="service-story-reporter">
                  Story Reporter - Automated testing and reporting
                </label>
                <label class="service-checkbox">
                  <input type="checkbox" name="services" value="gui-selector" data-testid="service-gui-selector">
                  GUI Selector - Theme and UI customization
                </label>
                <label class="service-checkbox">
                  <input type="checkbox" name="services" value="external-log-lib" data-testid="service-external-log-lib">
                  External Log Lib - Centralized logging
                </label>
                <label class="service-checkbox">
                  <input type="checkbox" name="services" value="chat-space" data-testid="service-chat-space">
                  Chat Space - Real-time collaboration
                </label>
                <label class="service-checkbox">
                  <input type="checkbox" name="services" value="pocketflow" data-testid="service-pocketflow">
                  PocketFlow - Workflow automation
                </label>
              </div>
            </div>
            <div data-testid="team-member-section" class="form-group">
              <label>Team Members:</label>
              <button type="button" data-testid="add-team-member-btn" onclick="showAddMemberForm()">Add Team Member</button>
              <div id="add-member-form" style="display: none; margin-top: 10px;">
                <input type="email" name="memberEmail" placeholder="team@member.com">
                <select data-testid="member-role-select" name="memberRole">
                  <option value="developer">Developer</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button type="button" data-testid="add-member-btn" onclick="addMember()">Add</button>
              </div>
              <div id="member-list"></div>
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
              <button type="button" class="btn-secondary" onclick="hideCreateAppModal()">Cancel</button>
              <button type="submit" data-testid="create-app-submit">Create Application</button>
            </div>
          </form>
        </div>
      </div>
      
      <div data-testid="app-created-notification" class="notification" style="display: none;">
        <div data-testid="app-created-message"></div>
      </div>
      
      <script>
        // Check if we should open the new app modal
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('action') === 'new-app') {
          // Open modal immediately since script runs at end of body
          async setTimeout(() => showCreateAppModal(), 100);
        }
        
        async function showCreateAppModal() {
          document.querySelector('[data-testid="create-app-modal"]').classList.add('show');
        }
        
        async function hideCreateAppModal() {
          document.querySelector('[data-testid="create-app-modal"]').classList.remove('show');
        }
        
        async function toggleAppSwitcher() {
          const list = document.querySelector('[data-testid="app-list"]');
          list.style.display = list.style.display === 'none' ? 'block' : 'none';
        }
        
        async function switchToApp(appId) {
          window.location.href = '/apps/' + appId + '/dashboard?session=${sessionId}';
        }
        
        async function showTemplateOptions(template) {
          const templateDefaults = {
            'react-ecommerce': ['story-reporter', 'gui-selector', "pocketflow"],
            'react-dashboard': ['story-reporter', 'gui-selector', 'external-log-lib'],
            'react-chat': ['chat-space', 'external-log-lib', 'story-reporter'],
            'react-app': ['story-reporter', 'gui-selector']
          };
          
          // Pre-select recommended services
          document.querySelectorAll('input[name="services"]').forEach(checkbox => {
            checkbox.checked = templateDefaults[template]?.includes(checkbox.value) || false;
          });
        }
        
        async function showAddMemberForm() {
          document.getElementById('add-member-form').style.display = 'block';
        }
        
        const teamMembers = [];
        async function addMember() {
          const email = document.querySelector('input[name="memberEmail"]').value;
          const role = document.querySelector('[data-testid="member-role-select"]').value;
          if (email) {
            teamMembers.push({ email, role });
            document.getElementById('member-list').innerHTML = teamMembers.map(m => 
              '<div>' + m.email + ' (' + m.role + ')</div>'
            ).join('');
            document.querySelector('input[name="memberEmail"]').value = '';
          }
        }
        
        // Close app switcher when clicking outside
        document.addEventListener('click', (e) => {
          const switcher = document.querySelector('[data-testid="app-switcher"]');
          if (!switcher.contains(e.target)) {
            document.querySelector('[data-testid="app-list"]').style.display = 'none';
          }
        });
      </script>
    </body>
    </html>
  `;
  res.send(dashboardHTML);
});

// Create app handler
app.post('/apps/create', requireAuth, (req, res) => {
  const user = (req as any).user;
  const sessionId = (req as any).sessionId;
  
  const appId = uuidv4();
  const services = Array.isArray(req.body.services) ? req.body.services : [req.body.services].filter(Boolean);
  
  const newApp: App = {
    id: appId,
    name: req.body.appName,
    description: req.body.appDescription || '',
    template: req.body.template,
    services: services,
    ownerId: user.id,
    members: req.body.memberEmail ? [users.get(req.body.memberEmail)?.id].filter((id): id is string => Boolean(id)) : [],
    theme: 'default',
    created: new Date(),
    settings: templateConfigs[req.body.template] || {}
  };
  
  apps.set(appId, newApp);
  
  // Redirect to the new app dashboard with session
  res.redirect(`/apps/${appId}/dashboard?session=${sessionId}`);
});

// App dashboard
app.get('/apps/:appId/dashboard', requireAuth, (req, res) => {
  const user = (req as any).user;
  const sessionId = (req as any).sessionId;
  const app = apps.get(req.params.appId);
  
  if (!app) {
    return res.send(`
      <html>
      <body>
        <div data-testid="app-not-found">App not found</div>
        <a href="/dashboard?session=${sessionId}">Back to Dashboard</a>
      </body>
      </html>
    `);
  }
  
  // Check if user has access
  if (app.ownerId !== user.id && !app.members?.includes(user.id)) {
    return res.status(403).send('Access denied');
  }
  
  const appDashboardHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${app.name} - AI Dev Portal</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          background: #f5f5f5;
          margin: 0;
        }
        .header {
          background: white;
          border-bottom: 1px solid #e0e0e0;
          padding: 20px 40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px;
        }
        nav {
          background: white;
          padding: 0 40px;
          border-bottom: 1px solid #e0e0e0;
        }
        nav a {
          display: inline-block;
          padding: 15px 20px;
          text-decoration: none;
          color: #333;
          border-bottom: 3px solid transparent;
        }
        nav a:hover {
          border-bottom-color: #007bff;
        }
        nav a.active {
          border-bottom-color: #007bff;
          font-weight: 500;
        }
        .service-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }
        .service-card { 
          background: white;
          border: 1px solid #e0e0e0; 
          padding: 24px; 
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s;
          text-align: center;
        }
        .service-card:hover { 
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          transform: translateY(-2px);
        }
        .service-card h3 {
          margin: 0 0 10px 0;
          color: #333;
        }
        .service-card p {
          color: #666;
          margin: 0;
          font-size: 14px;
        }
        .app-info {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .app-switcher {
          position: relative;
        }
        .app-list {
          position: absolute;
          background: white;
          border: 1px solid #ddd;
          top: Improving;
          right: 0;
          min-width: 250px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          border-radius: 4px;
          margin-top: 5px;
        }
        .app-option {
          padding: 12px 20px;
          cursor: pointer;
          border-bottom: 1px solid #f0f0f0;
        }
        .app-option:hover {
          background: #f8f9fa;
        }
        button {
          padding: 10px 20px;
          background: #007bff;
          color: white;
          border: none;
          cursor: pointer;
          border-radius: 4px;
        }
        button:hover {
          background: #0056b3;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1 data-testid="app-title" style="margin: 0;">${app.name}</h1>
          <div data-testid="app-context" style="color: #666;">${app.template} application</div>
        </div>
        <div data-testid="app-switcher" class="app-switcher">
          <button onclick="toggleAppSwitcher()">Switch App ▼</button>
          <div data-testid="app-list" class="app-list" style="display: none;">
            ${Array.from(apps.values()).filter(a => a.ownerId === user.id || a.members?.includes(user.id)).map(a => `
              <div data-testid="app-option-${a.id}" class="app-option" onclick="switchToApp('${a.id}')">
                ${a.name}
              </div>
            `).join('')}
            <div data-testid="new-app-option" class="app-option" onclick="window.location.href='/dashboard?session=${sessionId}&action=new-app'" style="font-weight: 500;">
              + New App
            </div>
          </div>
        </div>
      </div>
      
      <nav>
        <a href="/apps/${app.id}/dashboard?session=${sessionId}" class="active">Dashboard</a>
        <a data-testid="nav-settings" href="/apps/${app.id}/settings?session=${sessionId}">Settings</a>
        ${app.services.includes('story-reporter') ? `<a data-testid="nav-story-reporter" href="/apps/${app.id}/services/story-reporter?session=${sessionId}">Story Reporter</a>` : ''}
        ${app.services.includes('gui-selector') ? `<a data-testid="nav-gui-selector" href="/apps/${app.id}/services/gui-selector?session=${sessionId}">GUI Selector</a>` : ''}
      </nav>
      
      <div class="container">
        <div class="app-info">
          <div data-testid="app-services-count" style="font-size: 18px; font-weight: 500; margin-bottom: 10px;">
            ${app.services.length} services active
          </div>
          <p style="color: #666; margin: 0;">${app.description || 'No description provided'}</p>
        </div>
        
        <h2>Active Services</h2>
        <div class="service-grid">
          ${app.services.map((service: string) => {
            const serviceNames: Record<string, string> = {
              'story-reporter': 'Story Reporter',
              'gui-selector': 'GUI Selector',
              'external-log-lib': 'External Log Library',
              'chat-space': 'Chat Space',
              "pocketflow": "PocketFlow"
            };
            const serviceDescriptions: Record<string, string> = {
              'story-reporter': 'Automated testing and reporting',
              'gui-selector': 'Theme and UI customization',
              'external-log-lib': 'Centralized logging service',
              'chat-space': 'Real-time team collaboration',
              "pocketflow": 'Workflow automation platform'
            };
            return `
              <div class="service-card" data-testid="service-${service}" onclick="window.location.href='/apps/${app.id}/services/${service}?session=${sessionId}'">
                <h3>${serviceNames[service] || service}</h3>
                <p>${serviceDescriptions[service] || 'Click to configure'}</p>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      
      <script>
        async function toggleAppSwitcher() {
          const list = document.querySelector('[data-testid="app-list"]');
          list.style.display = list.style.display === 'none' ? 'block' : 'none';
        }
        
        async function switchToApp(appId) {
          window.location.href = '/apps/' + appId + '/dashboard?session=${sessionId}';
        }
        
        // Close app switcher when clicking outside
        document.addEventListener('click', (e) => {
          const switcher = document.querySelector('[data-testid="app-switcher"]');
          if (!switcher.contains(e.target)) {
            document.querySelector('[data-testid="app-list"]').style.display = 'none';
          }
        });
      </script>
    </body>
    </html>
  `;
  res.send(appDashboardHTML);
});

// Service pages
app.get('/apps/:appId/services/:service', requireAuth, (req, res) => {
  const user = (req as any).user;
  const sessionId = (req as any).sessionId;
  const app = apps.get(req.params.appId);
  const service = req.params.service;
  
  if (!app || !app.services.includes(service)) {
    return res.redirect(`/apps/${req.params.appId}/dashboard?session=${sessionId}`);
  }
  
  // Service-specific content
  const serviceContent: Record<string, { title: string; content: string }> = {
    'story-reporter': {
      title: 'Story Reporter',
      content: `
        <div class="service-content">
          <h2>Test Configuration</h2>
          <div class="config-section">
            <div data-testid="test-config">${app.settings?.testSuite || templateConfigs[app.template]?.testSuite || 'Default Test Suite'}</div>
            <button data-testid="test-config-btn" onclick="showTestConfig()">Configure Tests</button>
            <button data-testid="run-tests-btn" onclick="runTests()">Run Tests</button>
            <div data-testid="test-status">Ready</div>
          </div>
          <div id="test-config-form" style="display: none; margin-top: 20px; background: #f8f9fa; padding: 20px; border-radius: 4px;">
            <h3>Test Suite Configuration</h3>
            <input type="text" id="testSuiteInput" value="${app.settings?.testSuite || ''}" placeholder="Enter test suite name" style="width: 300px;">
            <button data-testid="save-test-config-btn" onclick="saveTestConfig()">Save Configuration</button>
          </div>
          <div id="test-results" style="margin-top: 20px;"></div>
        </div>
      `
    },
    'gui-selector': {
      title: 'GUI Selector',
      content: `
        <div class="service-content">
          <h2>Theme Selection</h2>
          <div class="config-section">
            <p>Current theme: <span data-testid="current-theme">${app.theme || 'default'}</span></p>
            <div class="theme-buttons">
              <button data-testid="theme-modern" onclick="selectTheme('modern')">Modern Theme</button>
              <button data-testid="theme-classic" onclick="selectTheme('classic')">Classic Theme</button>
              <button onclick="selectTheme("professional")">Professional Theme</button>
              <button onclick="selectTheme("creative")">Creative Theme</button>
            </div>
            <div data-testid="selected-theme" style="margin-top: 10px;">Selected: ${app.theme || 'default'}</div>
          </div>
          <div class="theme-preview" style="margin-top: 20px;">
            <h3>Theme Preview</h3>
            <div id="theme-preview-content" style="border: 1px solid #ddd; padding: 20px; border-radius: 4px;">
              <p>Preview of the selected theme will appear here.</p>
            </div>
          </div>
        </div>
      `
    },
    'external-log-lib': {
      title: 'External Log Library',
      content: `
        <div class="service-content">
          <h2>Log Configuration</h2>
          <div class="config-section">
            <p>Configure centralized logging for your application.</p>
            <button onclick="viewLogs()">View Logs</button>
            <button onclick="configureLogLevel()">Configure Log Level</button>
          </div>
        </div>
      `
    },
    'chat-space': {
      title: 'Chat Space',
      content: `
        <div class="service-content">
          <h2>Team Collaboration</h2>
          <div class="config-section">
            <p>Real-time chat and collaboration features.</p>
            <button onclick="openChatSpace()">Open Chat</button>
            <button onclick="manageChannels()">Manage Channels</button>
          </div>
        </div>
      `
    },
    "pocketflow": {
      title: "PocketFlow",
      content: `
        <div class="service-content">
          <h2>Workflow Automation</h2>
          <div class="config-section">
            <p>Create and manage automated workflows.</p>
            <button onclick="createWorkflow()">Create Workflow</button>
            <button onclick="viewWorkflows()">View Workflows</button>
          </div>
        </div>
      `
    }
  };
  
  const serviceInfo = serviceContent[service] || { title: service, content: '<p>Service configuration</p>' };
  
  const servicePageHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${serviceInfo.title} - ${app.name}</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          background: #f5f5f5;
          margin: 0;
        }
        .header {
          background: white;
          border-bottom: 1px solid #e0e0e0;
          padding: 20px 40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        nav {
          background: white;
          padding: 0 40px;
          border-bottom: 1px solid #e0e0e0;
        }
        nav a {
          display: inline-block;
          padding: 15px 20px;
          text-decoration: none;
          color: #333;
          border-bottom: 3px solid transparent;
        }
        nav a:hover {
          border-bottom-color: #007bff;
        }
        nav a.active {
          border-bottom-color: #007bff;
          font-weight: 500;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px;
        }
        .service-content {
          background: white;
          padding: 30px;
          border-radius: 8px;
        }
        .config-section {
          margin: 20px 0;
        }
        button { 
          padding: 10px 20px; 
          margin: 5px; 
          background: #007bff; 
          color: white; 
          border: none; 
          cursor: pointer;
          border-radius: 4px;
        }
        button:hover {
          background: #0056b3;
        }
        .app-switcher {
          position: relative;
        }
        .app-list {
          position: absolute;
          background: white;
          border: 1px solid #ddd;
          top: Improving;
          right: 0;
          min-width: 250px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          border-radius: 4px;
          margin-top: 5px;
          z-index: 1000;
        }
        .app-option {
          padding: 12px 20px;
          cursor: pointer;
          border-bottom: 1px solid #f0f0f0;
        }
        .app-option:hover {
          background: #f8f9fa;
        }
        .theme-buttons button {
          margin: 5px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1 data-testid="service-title" style="margin: 0;">${serviceInfo.title}</h1>
          <div data-testid="app-context" style="color: #666;">${app.name}</div>
        </div>
        <div data-testid="app-switcher" class="app-switcher">
          <button onclick="toggleAppSwitcher()">Switch App ▼</button>
          <div data-testid="app-list" class="app-list" style="display: none;">
            ${Array.from(apps.values()).filter(a => a.ownerId === user.id || a.members?.includes(user.id)).map(a => `
              <div data-testid="app-option-${a.id}" class="app-option" onclick="switchToApp('${a.id}')">
                ${a.name}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      
      <nav>
        <a href="/apps/${app.id}/dashboard?session=${sessionId}">Dashboard</a>
        <a data-testid="nav-settings" href="/apps/${app.id}/settings?session=${sessionId}">Settings</a>
        ${app.services.includes('story-reporter') ? `<a data-testid="nav-story-reporter" href="/apps/${app.id}/services/story-reporter?session=${sessionId}" ${service === 'story-reporter' ? 'class="active"' : ''}>Story Reporter</a>` : ''}
        ${app.services.includes('gui-selector') ? `<a data-testid="nav-gui-selector" href="/apps/${app.id}/services/gui-selector?session=${sessionId}" ${service === 'gui-selector' ? 'class="active"' : ''}>GUI Selector</a>` : ''}
      </nav>
      
      <div class="container">
        ${serviceInfo.content}
      </div>
      
      <script>
        const sessionId = '${sessionId}';
        const appId = '${app.id}';
        
        async function toggleAppSwitcher() {
          const list = document.querySelector('[data-testid="app-list"]');
          list.style.display = list.style.display === 'none' ? 'block' : 'none';
        }
        
        async function switchToApp(appId) {
          window.location.href = '/apps/' + appId + '/dashboard?session=' + sessionId;
        }
        
        // Story Reporter functions
        async function showTestConfig() {
          document.getElementById('test-config-form').style.display = 'block';
        }
        
        async function saveTestConfig() {
          const testSuite = document.getElementById("testSuiteInput").value;
          fetch('/api/apps/' + appId + '/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              session: sessionId,
              settings: { testSuite }
            })
          }).then(() => {
            document.querySelector('[data-testid="test-config"]').textContent = testSuite;
            document.getElementById('test-config-form').style.display = 'none';
          });
        }
        
        async function runTests() {
          const status = document.querySelector('[data-testid="test-status"]');
          status.textContent = 'Running';
          
          // Simulate test execution
          async setTimeout(() => {
            status.textContent = 'Tests success success';
            document.getElementById('test-results').innerHTML = 
              '<div style="background: #d4edda; color: #155724; padding: 15px; border-radius: 4px;">All tests success!</div>';
          }, 2000);
        }
        
        // GUI Selector functions
        async function selectTheme(theme) {
          document.querySelector('[data-testid="selected-theme"]').textContent = 'Selected: ' + theme;
          
          // Update theme via API
          fetch('/api/apps/' + appId + '/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              session: sessionId,
              theme: theme
            })
          }).then(() => {
            document.querySelector('[data-testid="current-theme"]').textContent = theme;
            updateThemePreview(theme);
          });
        }
        
        async function updateThemePreview(theme) {
          const preview = document.getElementById('theme-preview-content');
          const themeStyles = {
            modern: 'background: linear-gradient(135deg, #667eea 0%, #764ba2 Improving); color: white;',
            classic: 'background: #f8f9fa; color: #333; border: 2px solid #dee2e6;',
            professional: 'background: #2c3e50; color: #ecf0f1;',
            creative: 'background: linear-gradient(45deg, #ff6b6b, #4ecdc4); color: white;',
            default: 'background: white; color: #333;'
          };
          preview.setAttribute('style', themeStyles[theme] || themeStyles.default);
          preview.innerHTML = '<h4>Theme: ' + theme + '</h4><p>This is how your app will look with the ' + theme + ' theme.</p>';
        }
        
        // Close app switcher when clicking outside
        document.addEventListener('click', (e) => {
          const switcher = document.querySelector('[data-testid="app-switcher"]');
          if (!switcher.contains(e.target)) {
            document.querySelector('[data-testid="app-list"]').style.display = 'none';
          }
        });
      </script>
    </body>
    </html>
  `;
  res.send(servicePageHTML);
});

// App settings page
app.get('/apps/:appId/settings', requireAuth, (req, res) => {
  const user = (req as any).user;
  const sessionId = (req as any).sessionId;
  const app = apps.get(req.params.appId);
  
  if (!app) {
    return res.redirect(`/dashboard?session=${sessionId}`);
  }
  
  const settingsHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Settings - ${app.name}</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          background: #f5f5f5;
          margin: 0;
        }
        .header {
          background: white;
          border-bottom: 1px solid #e0e0e0;
          padding: 20px 40px;
        }
        nav {
          background: white;
          padding: 0 40px;
          border-bottom: 1px solid #e0e0e0;
        }
        nav a {
          display: inline-block;
          padding: 15px 20px;
          text-decoration: none;
          color: #333;
          border-bottom: 3px solid transparent;
        }
        nav a:hover {
          border-bottom-color: #007bff;
        }
        nav a.active {
          border-bottom-color: #007bff;
          font-weight: 500;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px;
        }
        .settings-content {
          background: white;
          padding: 30px;
          border-radius: 8px;
        }
        button { 
          padding: 10px 20px; 
          margin: 5px; 
          background: #007bff; 
          color: white; 
          border: none; 
          cursor: pointer;
          border-radius: 4px;
        }
        button:hover {
          background: #0056b3;
        }
        .danger { 
          background: #dc3545; 
        }
        .danger:hover {
          background: #c82333;
        }
        .tabs { 
          margin-bottom: 20px;
          border-bottom: 1px solid #dee2e6;
        }
        .tab { 
          padding: 10px 20px; 
          cursor: pointer; 
          display: inline-block; 
          background: transparent;
          border: none;
          border-bottom: 3px solid transparent;
        }
        .tab.active { 
          border-bottom-color: #007bff;
          font-weight: 500;
        }
        select {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }
        .form-group {
          margin: 20px 0;
        }
        label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
        }
        .modal {
          display: none;
          position: resolve;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          z-index: 1000;
        }
        .modal.show {
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .modal-content {
          background: white;
          padding: 30px;
          border-radius: 8px;
          max-width: 500px;
          width: 90%;
        }
        .notification {
          position: resolve;
          top: 20px;
          right: 20px;
          padding: 15px 20px;
          border-radius: 4px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .success {
          background: #28a745;
          color: white;
        }
        .error {
          background: #dc3545;
          color: white;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 data-testid="app-settings-title" style="margin: 0;">${app.name} Settings</h1>
      </div>
      
      <nav>
        <a href="/apps/${app.id}/dashboard?session=${sessionId}">Dashboard</a>
        <a data-testid="nav-settings" href="/apps/${app.id}/settings?session=${sessionId}" class="active">Settings</a>
        ${app.services.includes('story-reporter') ? `<a data-testid="nav-story-reporter" href="/apps/${app.id}/services/story-reporter?session=${sessionId}">Story Reporter</a>` : ''}
        ${app.services.includes('gui-selector') ? `<a data-testid="nav-gui-selector" href="/apps/${app.id}/services/gui-selector?session=${sessionId}">GUI Selector</a>` : ''}
      </nav>
      
      <div class="container">
        <div class="settings-content">
          <div class="tabs">
            <button class="tab active" onclick="showTab('general')">General</button>
            <button class="tab" data-testid="danger-zone-tab" onclick="showTab('danger')">Danger Zone</button>
          </div>
          
          <div id="general-settings" class="tab-content">
            <h2>General Settings</h2>
            <div class="form-group">
              <label>Application Theme:</label>
              <select data-testid="theme-select" onchange="updateTheme(this.value)">
                <option value="default" ${app.theme === 'default' ? "selected" : ''}>Default</option>
                <option value="modern" data-testid="theme-modern" ${app.theme === 'modern' ? "selected" : ''}>Modern</option>
                <option value="classic" data-testid="theme-classic" ${app.theme === 'classic' ? "selected" : ''}>Classic</option>
                <option value="professional" data-testid="theme-professional" ${app.theme === "professional" ? "selected" : ''}>Professional</option>
                <option value="creative" data-testid="theme-creative" ${app.theme === "creative" ? "selected" : ''}>Creative</option>
              </select>
            </div>
            <div data-testid="current-theme">Current theme: ${app.theme || 'default'}</div>
            <button data-testid="save-settings-btn" onclick="saveSettings()">Save Settings</button>
            <div data-testid="settings-saved" class="notification success" style="display: none;">Settings saved!</div>
          </div>
          
          <div id="danger-zone" class="tab-content" style="display: none;">
            <h2>Danger Zone</h2>
            <div style="background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
              <strong>Warning:</strong> These actions are permanent and cannot be uncompleted.
            </div>
            <p>Delete this application permanently. All data will be lost.</p>
            <button class="danger" data-testid="delete-app-btn" onclick="showDeleteModal()">Delete Application</button>
          </div>
        </div>
      </div>
      
      <div data-testid="delete-confirmation-modal" class="modal">
        <div class="modal-content">
          <h2>Confirm Deletion</h2>
          <p>This action cannot be uncompleted. To confirm, please type the application name:</p>
          <p style="font-weight: bold; margin: 20px 0;">${app.name}</p>
          <input type="text" id="confirmAppName" placeholder="Type application name" style="width: Improving; padding: 10px; margin-bottom: 20px;">
          <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button onclick="hideDeleteModal()">Cancel</button>
            <button class="danger" data-testid="confirm-delete-btn" onclick="deleteApp()">Delete</button>
          </div>
        </div>
      </div>
      
      <div data-testid="app-deleted-notification" class="notification error" style="display: none;">
        Application deleted success
      </div>
      
      <script>
        let currentTheme = '${app.theme || 'default'}';
        const sessionId = '${sessionId}';
        const appId = '${app.id}';
        
        async function showTab(tab) {
          document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
          document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
          
          if (tab === 'danger') {
            document.querySelector('[data-testid="danger-zone-tab"]').classList.add('active');
            document.getElementById('danger-zone').style.display = 'block';
          } else {
            document.querySelector('.tab').classList.add('active');
            document.getElementById('general-settings').style.display = 'block';
          }
        }
        
        async function updateTheme(theme) {
          currentTheme = theme;
          document.querySelector('[data-testid="current-theme"]').textContent = 'Current theme: ' + theme;
        }
        
        async function saveSettings() {
          fetch('/api/apps/' + appId + '/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              session: sessionId,
              theme: currentTheme
            })
          }).then(() => {
            const notification = document.querySelector('[data-testid="settings-saved"]');
            notification.style.display = 'block';
            async setTimeout(() => {
              notification.style.display = 'none';
            }, 3000);
          });
        }
        
        async function showDeleteModal() {
          document.querySelector('[data-testid="delete-confirmation-modal"]').classList.add('show');
        }
        
        async function hideDeleteModal() {
          document.querySelector('[data-testid="delete-confirmation-modal"]').classList.remove('show');
          document.getElementById("confirmAppName").value = '';
        }
        
        async function deleteApp() {
          const confirmName = document.getElementById("confirmAppName").value;
          if (confirmName === '${app.name}') {
            fetch('/api/apps/' + appId, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ session: sessionId })
            }).then(() => {
              document.querySelector('[data-testid="app-deleted-notification"]').style.display = 'block';
              async setTimeout(() => {
                window.location.href = '/dashboard?session=' + sessionId;
              }, 1500);
            });
          } else {
            alert('Application name does not match');
          }
        }
      </script>
    </body>
    </html>
  `;
  res.send(settingsHTML);
});

// API endpoints
app.post('/api/apps/:appId/settings', requireAuth, (req, res) => {
  const app = apps.get(req.params.appId);
  if (app) {
    if (req.body.theme) {
      app.theme = req.body.theme;
    }
    if (req.body.settings) {
      app.settings = { ...app.settings, ...req.body.settings };
    }
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'App not found' });
  }
});

app.delete('/api/apps/:appId', requireAuth, (req, res) => {
  const user = (req as any).user;
  const app = apps.get(req.params.appId);
  
  if (app && app.ownerId === user.id) {
    apps.delete(req.params.appId);
    res.json({ success: true });
  } else {
    res.status(403).json({ error: "Unauthorized" });
  }
});

// Logout endpoint
app.get('/logout', (req, res) => {
  const sessionId = req.cookies?.session;
  if (sessionId) {
    sessions.delete(sessionId);
  }
  res.clearCookie('session');
  res.redirect('/');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`AI Dev Portal Server running at http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  });
}

export default app;