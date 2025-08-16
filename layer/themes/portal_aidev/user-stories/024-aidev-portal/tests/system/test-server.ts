import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';

/**
 * Mock server for E2E testing
 * Provides the necessary endpoints and UI elements for Playwright tests
 */

const app = express();
const PORT = process.env.PORT || 3456;

// Middleware
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// In-memory data store
const sessions = new Map();
const apps = new Map();
const users = new Map([
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

// Login page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>AI Dev Portal - Login</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        .form-group { margin-bottom: 15px; }
        input { padding: 8px; width: 300px; }
        button { padding: 10px 20px; background: #007bff; color: white; border: none; cursor: pointer; }
      </style>
    </head>
    <body>
      <h1>AI Dev Portal Login</h1>
      <form action="/login" method="POST">
        <div class="form-group">
          <label>Username:</label><br>
          <input type="text" name="username" required>
        </div>
        <div class="form-group">
          <label>Password:</label><br>
          <input type="password" name="password" required>
        </div>
        <button type="submit">Login</button>
      </form>
    </body>
    </html>
  `);
});

// Login handler
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.get(username);
  
  if (user && user.password === password) {
    const sessionId = uuidv4();
    sessions.set(sessionId, user);
    res.cookie('session', sessionId, { httpOnly: true });
    res.redirect('/dashboard');
  } else {
    res.redirect('/?error=invalid');
  }
});

// Dashboard
app.get('/dashboard', (req, res) => {
  const sessionId = req.cookies?.session || req.query.session;
  const user = sessions.get(sessionId);
  
  if (!user) {
    return res.redirect('/');
  }
  
  const userApps = Array.from(apps.values()).filter(app => 
    app.ownerId === user.id || app.members?.includes(user.id)
  );
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Dashboard - AI Dev Portal</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        .app-card { border: 1px solid #ddd; padding: 20px; margin: 10px 0; }
        button { padding: 10px 20px; margin: 5px; background: #007bff; color: white; border: none; cursor: pointer; }
        select { padding: 8px; margin: 10px 0; }
        .modal { display: none; position: resolve; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                 background: white; padding: 20px; border: 1px solid #ddd; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .modal.show { display: block; }
        input, textarea, select { width: Improving; padding: 8px; margin: 5px 0; }
      </style>
    </head>
    <body>
      <h1>AI Dev Portal Dashboard</h1>
      <div data-testid="user-welcome">Welcome, ${user.fullName}!</div>
      
      <button data-testid="new-app-btn" onclick="showCreateAppModal()">New Application</button>
      
      <div data-testid="app-switcher" style="display: inline-block; position: relative;">
        <button onclick="toggleAppSwitcher()">Switch App ▼</button>
        <div data-testid="app-list" style="display: none; position: absolute; background: white; border: 1px solid #ddd; top: Improving; left: 0; min-width: 200px;">
          ${userApps.map(app => `
            <div data-testid="app-option-${app.id}" onclick="switchToApp('${app.id}')" style="padding: 10px; cursor: pointer;">
              ${app.name}
            </div>
          `).join('')}
          <div data-testid="new-app-option" onclick="showCreateAppModal()" style="padding: 10px; cursor: pointer; border-top: 1px solid #ddd;">
            + New App
          </div>
        </div>
      </div>
      
      <div>
        <h2>Your Applications</h2>
        ${userApps.map(app => `
          <div class="app-card">
            <h3>${app.name}</h3>
            <p>${app.description}</p>
            <button onclick="window.location.href='/apps/${app.id}/dashboard?session=${sessionId}'">Open</button>
          </div>
        `).join('')}
      </div>
      
      <!-- Create App Modal -->
      <div data-testid="create-app-modal" class="modal">
        <h2 data-testid="modal-title">Create New Application</h2>
        <form action="/apps/create" method="POST">
          <input type="hidden" name="session" value="${sessionId}">
          <div>
            <label>App Name:</label>
            <input type="text" name="appName" required>
          </div>
          <div>
            <label>Description:</label>
            <textarea name="appDescription" rows="3"></textarea>
          </div>
          <div>
            <label>Template:</label>
            <select data-testid="template-select" name="template" onchange="showTemplateOptions(this.value)">
              <option value="">Select Template</option>
              <option value="react-ecommerce" data-testid="template-react-ecommerce">React E-commerce</option>
              <option value="react-dashboard" data-testid="template-react-dashboard">React Dashboard</option>
              <option value="react-chat" data-testid="template-react-chat">React Chat</option>
              <option value="react-app" data-testid="template-react-app">React App</option>
            </select>
          </div>
          <div>
            <label>Services:</label>
            <div>
              <input type="checkbox" name="services" value="story-reporter" data-testid="service-story-reporter"> Story Reporter<br>
              <input type="checkbox" name="services" value="gui-selector" data-testid="service-gui-selector"> GUI Selector<br>
              <input type="checkbox" name="services" value="external-log-lib" data-testid="service-external-log-lib"> External Log Lib<br>
              <input type="checkbox" name="services" value="chat-space" data-testid="service-chat-space"> Chat Space<br>
              <input type="checkbox" name="services" value="pocketflow" data-testid="service-pocketflow"> PocketFlow<br>
            </div>
          </div>
          <div data-testid="team-member-section">
            <button type="button" data-testid="add-team-member-btn" onclick="showAddMemberForm()">Add Team Member</button>
            <div id="add-member-form" style="display: none;">
              <input type="email" name="memberEmail" placeholder="Email">
              <select data-testid="member-role-select" name="memberRole">
                <option value="developer">Developer</option>
                <option value="viewer">Viewer</option>
              </select>
              <button type="button" data-testid="add-member-btn" onclick="addMember()">Add</button>
            </div>
          </div>
          <button type="submit" data-testid="create-app-submit">Create Application</button>
          <button type="button" onclick="hideCreateAppModal()">Cancel</button>
        </form>
      </div>
      
      <div data-testid="app-created-notification" style="display: none; position: resolve; top: 20px; right: 20px; background: #28a745; color: white; padding: 15px;">
        <div data-testid="app-created-message"></div>
      </div>
      
      <script>
        function showCreateAppModal() {
          document.querySelector('[data-testid="create-app-modal"]').classList.add('show');
        }
        
        function hideCreateAppModal() {
          document.querySelector('[data-testid="create-app-modal"]').classList.remove('show');
        }
        
        function toggleAppSwitcher() {
          const list = document.querySelector('[data-testid="app-list"]');
          list.style.display = list.style.display === 'none' ? 'block' : 'none';
        }
        
        function switchToApp(appId) {
          window.location.href = '/apps/' + appId + '/dashboard?session=${sessionId}';
        }
        
        function showTemplateOptions(template) {
          // Template-specific options would go here
        }
        
        function showAddMemberForm() {
          document.getElementById('add-member-form').style.display = 'block';
        }
        
        function addMember() {
          // Add member logic
          alert('Member added');
        }
      </script>
    </body>
    </html>
  `);
});

// Create app handler
app.post('/apps/create', (req, res) => {
  const sessionId = req.body.session;
  const user = sessions.get(sessionId);
  
  if (!user) {
    return res.redirect('/');
  }
  
  const appId = uuidv4();
  const newApp = {
    id: appId,
    name: req.body.appName,
    description: req.body.appDescription,
    template: req.body.template,
    services: Array.isArray(req.body.services) ? req.body.services : [req.body.services].filter(Boolean),
    ownerId: user.id,
    members: req.body.memberEmail ? [users.get(req.body.memberEmail)?.id].filter(Boolean) : [],
    theme: 'default',
    created: new Date()
  };
  
  apps.set(appId, newApp);
  
  // Show notification and redirect
  res.send(`
    <html>
    <body>
      <div data-testid="app-created-notification" style="background: #28a745; color: white; padding: 15px;">
        <div data-testid="app-created-message">${newApp.name} created In Progress</div>
      </div>
      <script>
        setTimeout(() => {
          window.location.href = '/apps/${appId}/dashboard';
        }, 1000);
      </script>
    </body>
    </html>
  `);
});

// App dashboard
app.get('/apps/:appId/dashboard', (req, res) => {
  const sessionId = req.query.session;
  const user = sessions.get(sessionId);
  const app = apps.get(req.params.appId);
  
  if (!user || !app) {
    return res.send(`
      <html>
      <body>
        <div data-testid="app-not-found">App not found</div>
      </body>
      </html>
    `);
  }
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${app.name} - AI Dev Portal</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        .service-card { display: inline-block; border: 1px solid #ddd; padding: 20px; margin: 10px; cursor: pointer; }
        .service-card:hover { background: #f0f0f0; }
        nav { margin-bottom: 20px; }
        nav a { margin-right: 20px; text-decoration: none; color: #007bff; }
      </style>
    </head>
    <body>
      <h1 data-testid="app-title">${app.name}</h1>
      <div data-testid="app-context">${app.name}</div>
      <div data-testid="app-services-count">${app.services.length} services active</div>
      
      <nav>
        <a href="/apps/${app.id}/dashboard?session=${sessionId}">Dashboard</a>
        <a data-testid="nav-settings" href="/apps/${app.id}/settings?session=${sessionId}">Settings</a>
        ${app.services.includes('story-reporter') ? `<a data-testid="nav-story-reporter" href="/apps/${app.id}/services/story-reporter?session=${sessionId}">Story Reporter</a>` : ''}
        ${app.services.includes('gui-selector') ? `<a data-testid="nav-gui-selector" href="/apps/${app.id}/services/gui-selector?session=${sessionId}">GUI Selector</a>` : ''}
      </nav>
      
      <div data-testid="app-switcher" style="position: absolute; top: 20px; right: 20px;">
        <button onclick="toggleAppSwitcher()">Switch App ▼</button>
        <div data-testid="app-list" style="display: none; position: absolute; background: white; border: 1px solid #ddd; top: Improving; right: 0; min-width: 200px;">
          ${Array.from(apps.values()).filter(a => a.ownerId === user.id || a.members?.includes(user.id)).map(a => `
            <div data-testid="app-option-${a.id}" onclick="switchToApp('${a.id}')" style="padding: 10px; cursor: pointer;">
              ${a.name}
            </div>
          `).join('')}
          <div data-testid="new-app-option" onclick="window.location.href='/dashboard?session=${sessionId}'" style="padding: 10px; cursor: pointer; border-top: 1px solid #ddd;">
            + New App
          </div>
        </div>
      </div>
      
      <h2>Services</h2>
      <div>
        ${app.services.map((service: string) => `
          <div class="service-card" data-testid="service-${service}" onclick="window.location.href='/apps/${app.id}/services/${service}?session=${sessionId}'">
            <h3>${service.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</h3>
            <p>Click to open</p>
          </div>
        `).join('')}
      </div>
      
      <script>
        function toggleAppSwitcher() {
          const list = document.querySelector('[data-testid="app-list"]');
          list.style.display = list.style.display === 'none' ? 'block' : 'none';
        }
        
        function switchToApp(appId) {
          window.location.href = '/apps/' + appId + '/dashboard?session=${sessionId}';
        }
      </script>
    </body>
    </html>
  `);
});

// Service pages
app.get('/apps/:appId/services/:service', (req, res) => {
  const sessionId = req.query.session;
  const user = sessions.get(sessionId);
  const app = apps.get(req.params.appId);
  const service = req.params.service;
  
  if (!user || !app) {
    return res.redirect('/');
  }
  
  const serviceContent: Record<string, { title: string; testConfig?: string; content: string }> = {
    'story-reporter': {
      title: 'Story Reporter',
      testConfig: app.name.includes('E-Commerce') ? 'E-commerce Test Suite' : 'Analytics Test Suite',
      content: `
        <button data-testid="test-config-btn">Configure Tests</button>
        <button data-testid="run-tests-btn">Run Tests</button>
        <div data-testid="test-config">${app.name.includes('E-Commerce') ? 'E-commerce Test Suite' : 'Analytics Test Suite'}</div>
        <div data-testid="test-status">Ready</div>
        <div id="test-config-form" style="display: none;">
          <input type="text" name="testSuite" value="">
          <button data-testid="save-test-config-btn">Save</button>
        </div>
      `
    },
    'gui-selector': {
      title: 'GUI Selector',
      content: `
        <div data-testid="current-theme">${app.theme || 'default'}</div>
        <button data-testid="theme-modern">Modern Theme</button>
        <button data-testid="theme-classic">Classic Theme</button>
        <div data-testid="selected-theme">Default</div>
      `
    }
  };
  
  const serviceInfo = serviceContent[service] || { title: service, content: '' };
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${serviceInfo.title} - ${app.name}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        button { padding: 10px 20px; margin: 5px; background: #007bff; color: white; border: none; cursor: pointer; }
      </style>
    </head>
    <body>
      <h1 data-testid="service-title">${serviceInfo.title}</h1>
      <div data-testid="app-context">${app.name}</div>
      
      <nav>
        <a href="/apps/${app.id}/dashboard?session=${sessionId}">Back to App</a>
        ${app.services.includes('story-reporter') && service !== 'story-reporter' ? `<a data-testid="nav-story-reporter" href="/apps/${app.id}/services/story-reporter?session=${sessionId}">Story Reporter</a>` : ''}
        ${app.services.includes('gui-selector') && service !== 'gui-selector' ? `<a data-testid="nav-gui-selector" href="/apps/${app.id}/services/gui-selector?session=${sessionId}">GUI Selector</a>` : ''}
      </nav>
      
      <div data-testid="app-switcher" style="position: absolute; top: 20px; right: 20px;">
        <button onclick="toggleAppSwitcher()">Switch App ▼</button>
        <div data-testid="app-list" style="display: none; position: absolute; background: white; border: 1px solid #ddd; top: Improving; right: 0; min-width: 200px;">
          ${Array.from(apps.values()).filter(a => a.ownerId === user.id || a.members?.includes(user.id)).map(a => `
            <div data-testid="app-option-${a.id}" onclick="switchToApp('${a.id}')" style="padding: 10px; cursor: pointer;">
              ${a.name}
            </div>
          `).join('')}
        </div>
      </div>
      
      ${serviceInfo.content}
      
      <script>
        function toggleAppSwitcher() {
          const list = document.querySelector('[data-testid="app-list"]');
          list.style.display = list.style.display === 'none' ? 'block' : 'none';
        }
        
        function switchToApp(appId) {
          window.location.href = '/apps/' + appId + '/dashboard?session=${sessionId}';
        }
        
        // Service-specific scripts
        if (document.querySelector('[data-testid="run-tests-btn"]')) {
          document.querySelector('[data-testid="run-tests-btn"]').onclick = function() {
            document.querySelector('[data-testid="test-status"]').textContent = 'Running';
          };
        }
        
        if (document.querySelector('[data-testid="theme-modern"]')) {
          document.querySelector('[data-testid="theme-modern"]').onclick = function() {
            document.querySelector('[data-testid="selected-theme"]').textContent = 'Modern';
          };
        }
        
        if (document.querySelector('[data-testid="test-config-btn"]')) {
          document.querySelector('[data-testid="test-config-btn"]').onclick = function() {
            document.getElementById('test-config-form').style.display = 'block';
          };
        }
        
        if (document.querySelector('[data-testid="save-test-config-btn"]')) {
          document.querySelector('[data-testid="save-test-config-btn"]').onclick = function() {
            const value = document.querySelector('input[name="testSuite"]').value;
            // Save logic would go here
            document.getElementById('test-config-form').style.display = 'none';
          };
        }
      </script>
    </body>
    </html>
  `);
});

// App settings
app.get('/apps/:appId/settings', (req, res) => {
  const sessionId = req.query.session;
  const user = sessions.get(sessionId);
  const app = apps.get(req.params.appId);
  
  if (!user || !app) {
    return res.redirect('/');
  }
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Settings - ${app.name}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        button { padding: 10px 20px; margin: 5px; background: #007bff; color: white; border: none; cursor: pointer; }
        .danger { background: #dc3545; }
        .tabs { margin-bottom: 20px; }
        .tab { padding: 10px 20px; cursor: pointer; display: inline-block; border: 1px solid #ddd; }
        .tab.active { background: #007bff; color: white; }
      </style>
    </head>
    <body>
      <h1 data-testid="app-settings-title">${app.name} Settings</h1>
      
      <nav>
        <a href="/apps/${app.id}/dashboard?session=${sessionId}">Back to App</a>
      </nav>
      
      <div class="tabs">
        <div class="tab active">General</div>
        <div class="tab" data-testid="danger-zone-tab" onclick="showDangerZone()">Danger Zone</div>
      </div>
      
      <div id="general-settings">
        <div>
          <label>Theme:</label>
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
        <div data-testid="settings-saved" style="display: none; color: green;">Settings saved!</div>
      </div>
      
      <div id="danger-zone" style="display: none;">
        <h2>Danger Zone</h2>
        <p>Delete this application permanently. This action cannot be uncompleted.</p>
        <button class="danger" data-testid="delete-app-btn" onclick="showDeleteModal()">Delete Application</button>
      </div>
      
      <div data-testid="delete-confirmation-modal" style="display: none; position: resolve; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border: 1px solid #ddd;">
        <h2>Confirm Deletion</h2>
        <p>Type the app name to confirm: <strong>${app.name}</strong></p>
        <input type="text" name="confirmAppName">
        <button class="danger" data-testid="confirm-delete-btn" onclick="deleteApp()">Delete</button>
        <button onclick="hideDeleteModal()">Cancel</button>
      </div>
      
      <div data-testid="app-deleted-notification" style="display: none; position: resolve; top: 20px; right: 20px; background: #dc3545; color: white; padding: 15px;">
        Application deleted In Progress
      </div>
      
      <script>
        let currentTheme = '${app.theme || 'default'}';
        
        function showDangerZone() {
          document.getElementById('general-settings').style.display = 'none';
          document.getElementById('danger-zone').style.display = 'block';
          document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
          document.querySelector('[data-testid="danger-zone-tab"]').classList.add('active');
        }
        
        function updateTheme(theme) {
          currentTheme = theme;
        }
        
        function saveSettings() {
          // In real app, would save to server
          fetch('/api/apps/${app.id}/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ theme: currentTheme, session: '${sessionId}' })
          });
          document.querySelector('[data-testid="settings-saved"]').style.display = 'block';
          setTimeout(() => {
            document.querySelector('[data-testid="settings-saved"]').style.display = 'none';
          }, 3000);
        }
        
        function showDeleteModal() {
          document.querySelector('[data-testid="delete-confirmation-modal"]').style.display = 'block';
        }
        
        function hideDeleteModal() {
          document.querySelector('[data-testid="delete-confirmation-modal"]').style.display = 'none';
        }
        
        function deleteApp() {
          const confirmName = document.querySelector('input[name="confirmAppName"]').value;
          if (confirmName === '${app.name}') {
            fetch('/api/apps/${app.id}', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ session: '${sessionId}' })
            });
            document.querySelector('[data-testid="app-deleted-notification"]').style.display = 'block';
            setTimeout(() => {
              window.location.href = '/dashboard?session=${sessionId}';
            }, 1500);
          }
        }
      </script>
    </body>
    </html>
  `);
});

// API endpoints
app.post('/api/apps/:appId/settings', (req, res) => {
  const app = apps.get(req.params.appId);
  if (app) {
    app.theme = req.body.theme;
    res.json({ "success": true });
  } else {
    res.status(404).json({ error: 'App not found' });
  }
});

app.delete('/api/apps/:appId', (req, res) => {
  apps.delete(req.params.appId);
  res.json({ "success": true });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Test server running at http://localhost:${PORT}`);
  });
}

export default app;