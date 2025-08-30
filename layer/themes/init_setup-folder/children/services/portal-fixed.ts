/**
 * Fixed Project-Aware Portal Server
 * Simplified version without cookie issues
 */

import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import * as fs from 'fs/promises'
import * as path from 'path'

// Simple in-memory state
const state = {
  currentProject: null as string | null,
  projects: [] as any[],
  services: [
    { id: 'task-queue', name: 'Task Queue', icon: '📋', requiresProject: true, endpoint: '/services/task-queue' },
    { id: 'gui-selector', name: 'GUI Selector', icon: '🎨', requiresProject: true, endpoint: '/services/gui-selector' },
    { id: 'story-reporter', name: 'Story Reporter', icon: '📊', requiresProject: true, endpoint: '/services/story-reporter' },
    { id: 'feature-viewer', name: 'Feature Viewer', icon: '🔍', requiresProject: true, endpoint: '/services/feature-viewer' },
    { id: 'log-viewer', name: 'Log Viewer', icon: '📜', requiresProject: false, endpoint: '/services/logs' },
    { id: 'test-runner', name: 'Test Runner', icon: '🧪', requiresProject: true, endpoint: '/services/tests' },
    { id: 'coverage-report', name: 'Coverage Report', icon: '📈', requiresProject: true, endpoint: '/services/coverage' },
    { id: 'security-config', name: 'Security Config', icon: '🔐', requiresProject: false, endpoint: '/services/security' }
  ]
}

// Discover projects
async function discoverProjects() {
  const basePath = '/home/ormastes/dev/pub/aidev/layer/themes'
  const projects: any[] = []
  
  try {
    const themes = await fs.readdir(basePath)
    for (const theme of themes) {
      const themePath = path.join(basePath, theme)
      const stats = await fs.stat(themePath).catch(() => null)
      if (stats?.isDirectory()) {
        const hasTaskQueue = await fs.access(path.join(themePath, 'TASK_QUEUE.vf.json')).then(() => true).catch(() => false)
        const hasFeature = await fs.access(path.join(themePath, 'FEATURE.vf.json')).then(() => true).catch(() => false)
        
        if (hasTaskQueue || hasFeature) {
          projects.push({
            id: theme,
            name: theme.replace(/_/g, ' ').replace(/-/g, ' '),
            path: themePath,
            type: theme.split('_')[0] || 'unknown',
            hasTaskQueue,
            hasFeature
          })
        }
      }
    }
  } catch (err) {
    console.error('Error discovering projects:', err)
  }
  
  // Also check root
  const rootTaskQueue = await fs.access('/home/ormastes/dev/pub/aidev/TASK_QUEUE.vf.json').then(() => true).catch(() => false)
  if (rootTaskQueue) {
    projects.push({
      id: 'root',
      name: 'Root Project',
      path: '/home/ormastes/dev/pub/aidev',
      type: 'root',
      hasTaskQueue: true,
      hasFeature: false
    })
  }
  
  state.projects = projects
  return projects
}

// Create the app
const app = new Elysia()
  .use(cors({ credentials: true }))
  
  // Main page
  .get('/', ({ set }) => {
    set.headers['Content-Type'] = 'text/html; charset=utf-8'
    const selectedProject = state.currentProject
    const projects = state.projects
    const services = state.services
    
    return `<!DOCTYPE html>
    <html>
    <head>
      <title>AI Dev Portal - Fixed</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: system-ui; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 1rem; }
        .container { max-width: 1400px; margin: 0 auto; }
        .header { background: white; border-radius: 1rem; padding: 2rem; margin-bottom: 2rem; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        h1 { color: #333; margin-bottom: 1rem; }
        .project-selector { padding: 0.75rem; font-size: 1rem; border: 2px solid #e0e0e0; border-radius: 0.5rem; width: 100%; max-width: 400px; }
        .services-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1.5rem; }
        .service-card { background: white; padding: 1.5rem; border-radius: 1rem; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .service-card:hover { transform: translateY(-4px); box-shadow: 0 8px 20px rgba(0,0,0,0.15); }
        .service-icon { font-size: 2rem; margin-bottom: 0.5rem; }
        .service-name { font-weight: 600; color: #333; margin-bottom: 0.5rem; }
        .service-desc { color: #666; font-size: 0.9rem; }
        .no-project { background: white; padding: 2rem; border-radius: 1rem; text-align: center; color: #666; }
        #serviceModal { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; }
        #serviceModal.show { display: flex; align-items: center; justify-content: center; }
        .modal-content { background: white; width: 90%; max-width: 1200px; height: 80vh; border-radius: 1rem; overflow: hidden; }
        .modal-header { padding: 1rem 1.5rem; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center; }
        .modal-body { height: calc(100% - 60px); }
        .modal-body iframe { width: 100%; height: 100%; border: none; }
        .close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚀 AI Dev Portal</h1>
          <select id="project" class="project-selector" onchange="selectProject(this.value)">
            <option value="">Select a project...</option>
            ${projects.map(p => `
              <option value="${p.id}" ${p.id === selectedProject ? 'selected' : ''}>
                ${p.name} (${p.type})
              </option>
            `).join('')}
          </select>
        </div>
        
        ${selectedProject ? `
          <div class="services-grid">
            ${services.map(s => `
              <div class="service-card" onclick="openService('${s.id}')">
                <div class="service-icon">${s.icon}</div>
                <div class="service-name">${s.name}</div>
                <div class="service-desc">${s.description || 'Click to open'}</div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="no-project">
            <h2>👆 Please select a project to see available services</h2>
            <p>We found ${projects.length} projects in your workspace</p>
          </div>
        `}
      </div>
      
      <div id="serviceModal">
        <div class="modal-content">
          <div class="modal-header">
            <h2 id="modalTitle">Service</h2>
            <button class="close-btn" onclick="closeModal()">✕</button>
          </div>
          <div class="modal-body">
            <iframe id="modalFrame" src=""></iframe>
          </div>
        </div>
      </div>
      
      <script>
        function selectProject(projectId) {
          fetch('/api/select-project', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId })
          })
          .then(r => r.json())
          .then(data => {
            if (data.success) location.reload()
          })
        }
        
        function openService(serviceId) {
          const modal = document.getElementById('serviceModal')
          const frame = document.getElementById('modalFrame')
          const title = document.getElementById('modalTitle')
          const projectSelect = document.getElementById('project')
          const currentProject = projectSelect ? projectSelect.value : 'default'
          
          fetch('/api/services')
            .then(r => r.json())
            .then(data => {
              const service = data.services.find(s => s.id === serviceId)
              if (service) {
                title.textContent = service.icon + ' ' + service.name
                // Pass project context in the URL for services that need it
                const url = service.requiresProject !== false 
                  ? service.endpoint + '?project=' + currentProject
                  : service.endpoint
                frame.src = url
                modal.classList.add('show')
              }
            })
        }
        
        function closeModal() {
          const modal = document.getElementById('serviceModal')
          modal.classList.remove('show')
          document.getElementById('modalFrame').src = ''
        }
        
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') closeModal()
        })
      </script>
    </body>
    </html>`
  })
  
  // API endpoints - all return proper JSON with headers
  .get('/api/projects', ({ set }) => {
    set.headers = { 'Content-Type': 'application/json' }
    return JSON.stringify({ projects: state.projects })
  })
  
  .post('/api/select-project', async ({ body, set }) => {
    const { projectId } = body as any
    state.currentProject = projectId
    
    set.headers = { 'Content-Type': 'application/json' }
    return JSON.stringify({ success: true, projectId })
  })
  
  .get('/api/services', ({ set }) => {
    set.headers = { 'Content-Type': 'application/json' }
    const services = state.currentProject 
      ? state.services 
      : state.services.filter(s => !s.requiresProject)
    // Include all metadata in the response
    const servicesWithMeta = services.map(s => ({
      id: s.id,
      name: s.name,
      icon: s.icon,
      endpoint: s.endpoint,
      requiresProject: s.requiresProject !== false
    }))
    return JSON.stringify({ services: servicesWithMeta })
  })
  
  .get('/api/services/:serviceId/data', ({ params, set }) => {
    set.headers = { 'Content-Type': 'application/json' }
    const service = state.services.find(s => s.id === params.serviceId)
    
    if (!service) {
      return JSON.stringify({ error: 'Service not found' })
    }
    
    // Mock data
    if (service.id === 'task-queue') {
      return JSON.stringify({ tasks: [] })
    }
    
    return JSON.stringify({ 
      serviceId: service.id,
      projectId: state.currentProject,
      data: {}
    })
  })
  
  // Service pages
  .get('/services/:serviceId', async ({ params, query, set }) => {
    set.headers['Content-Type'] = 'text/html; charset=utf-8'
    const service = state.services.find(s => s.id === params.serviceId)
    if (!service) {
      set.status = 404
      return '<html><body><h1>404 - Service not found</h1></body></html>'
    }
    
    // Special handling for GUI selector - load the full interface
    if (service.id === 'gui-selector') {
      // Import and run the GUI selector service
      const { createGuiSelectorApp } = await import('./gui-selector-service')
      const guiApp = createGuiSelectorApp()
      
      // Get project from query parameter or state
      const projectId = query.project || state.currentProject || 'default'
      
      // Get the response from the GUI selector
      const response = await guiApp.handle(
        new Request(`http://localhost:3156/gui-selector/?project=${projectId}`)
      )
      
      return response
    }
    
    // Default service page for other services
    return `<!DOCTYPE html>
    <html>
    <head>
      <title>${service.name}</title>
      <style>
        body { font-family: system-ui; padding: 2rem; }
        h1 { color: #333; }
        .info { background: #f0f0f0; padding: 1rem; border-radius: 0.5rem; margin: 1rem 0; }
      </style>
    </head>
    <body>
      <h1>${service.icon} ${service.name}</h1>
      <div class="info">
        <p><strong>Service ID:</strong> ${service.id}</p>
        <p><strong>Current Project:</strong> ${state.currentProject || 'None'}</p>
        <p><strong>Endpoint:</strong> ${service.endpoint}</p>
      </div>
      <p>This is the ${service.name} service interface.</p>
    </body>
    </html>`
  })
  
  // GUI Selector API endpoints (proxied)
  .get('/services/gui-selector/*', async ({ request }) => {
    const { createGuiSelectorApp } = await import('./gui-selector-service')
    const guiApp = createGuiSelectorApp()
    return guiApp.handle(request)
  })
  
  .post('/services/gui-selector/*', async ({ request }) => {
    const { createGuiSelectorApp } = await import('./gui-selector-service')
    const guiApp = createGuiSelectorApp()
    return guiApp.handle(request)
  })

// Initialize and start
async function start() {
  await discoverProjects()
  console.log(`Discovered ${state.projects.length} projects`)
  
  app.listen(3156)
  console.log('✅ Fixed Portal running on http://localhost:3156')
}

start()