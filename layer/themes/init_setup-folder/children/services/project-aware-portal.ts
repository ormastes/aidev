/**
 * Project-Aware Portal Server
 * Services share selected project context
 */

import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import * as fs from 'fs/promises'
import * as path from 'path'
import { MockPortManager } from './mock-port-manager'

// Project discovery
interface Project {
  id: string
  name: string
  path: string
  type: 'theme' | 'epic' | 'story' | 'root'
  hasTaskQueue: boolean
  hasFeature: boolean
  services: string[]
}

interface Service {
  id: string
  name: string
  icon: string
  requiresProject: boolean
  supportedProjectTypes?: string[]
  endpoint: string
  description: string
}

class ProjectManager {
  private projects: Map<string, Project> = new Map()
  
  async discoverProjects(basePath: string): Promise<Project[]> {
    const projects: Project[] = []
    
    // Check root project
    const rootTaskQueue = await this.fileExists(path.join(basePath, 'TASK_QUEUE.vf.json'))
    if (rootTaskQueue) {
      projects.push({
        id: 'root',
        name: 'AI Dev Platform (Root)',
        path: basePath,
        type: 'root',
        hasTaskQueue: true,
        hasFeature: await this.fileExists(path.join(basePath, 'FEATURE.vf.json')),
        services: ['all']
      })
    }
    
    // Discover themes
    const themesPath = path.join(basePath, 'layer/themes')
    try {
      const themes = await fs.readdir(themesPath)
      
      for (const theme of themes) {
        const themePath = path.join(themesPath, theme)
        const stats = await fs.stat(themePath)
        
        if (stats.isDirectory()) {
          const hasTaskQueue = await this.fileExists(path.join(themePath, 'TASK_QUEUE.vf.json'))
          const hasFeature = await this.fileExists(path.join(themePath, 'FEATURE.vf.json'))
          
          if (hasTaskQueue || hasFeature) {
            // Determine available services based on theme
            const services = this.getServicesForTheme(theme)
            
            projects.push({
              id: theme,
              name: this.formatThemeName(theme),
              path: themePath,
              type: 'theme',
              hasTaskQueue,
              hasFeature,
              services
            })
          }
        }
      }
    } catch (error) {
      console.error('Error discovering themes:', error)
    }
    
    // Store projects
    projects.forEach(p => this.projects.set(p.id, p))
    
    return projects
  }
  
  private async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path)
      return true
    } catch {
      return false
    }
  }
  
  private formatThemeName(theme: string): string {
    return theme
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }
  
  private getServicesForTheme(theme: string): string[] {
    const services = ['task-queue', 'feature-viewer']
    
    if (theme.includes('portal')) {
      services.push('gui-selector', 'security-config')
    }
    if (theme.includes('story')) {
      services.push('story-reporter', 'test-runner')
    }
    if (theme.includes('log')) {
      services.push('log-viewer', 'log-analysis')
    }
    if (theme.includes('test')) {
      services.push('test-runner', 'coverage-report')
    }
    
    return services
  }
  
  getProject(id: string): Project | undefined {
    return this.projects.get(id)
  }
  
  getAllProjects(): Project[] {
    return Array.from(this.projects.values())
  }
}

class ServiceManager {
  private services: Map<string, Service> = new Map()
  
  constructor() {
    this.registerDefaultServices()
  }
  
  private registerDefaultServices() {
    const defaultServices: Service[] = [
      {
        id: 'task-queue',
        name: 'Task Queue Manager',
        icon: '📋',
        requiresProject: true,
        endpoint: '/services/task-queue',
        description: 'Manage and track project tasks'
      },
      {
        id: 'feature-viewer',
        name: 'Feature Viewer',
        icon: '🎯',
        requiresProject: true,
        endpoint: '/services/features',
        description: 'View and manage project features'
      },
      {
        id: 'gui-selector',
        name: 'GUI Selector',
        icon: '🎨',
        requiresProject: true,
        supportedProjectTypes: ['theme', 'story'],
        endpoint: '/services/gui-selector',
        description: 'Select and preview GUI designs'
      },
      {
        id: 'story-reporter',
        name: 'Story Reporter',
        icon: '📊',
        requiresProject: true,
        supportedProjectTypes: ['story', 'theme'],
        endpoint: '/services/story-reporter',
        description: 'Generate story reports and metrics'
      },
      {
        id: 'log-viewer',
        name: 'Log Viewer',
        icon: '📜',
        requiresProject: false,
        endpoint: '/services/logs',
        description: 'View application logs in real-time'
      },
      {
        id: 'test-runner',
        name: 'Test Runner',
        icon: '🧪',
        requiresProject: true,
        endpoint: '/services/tests',
        description: 'Run and monitor tests'
      },
      {
        id: 'coverage-report',
        name: 'Coverage Report',
        icon: '📈',
        requiresProject: true,
        endpoint: '/services/coverage',
        description: 'View test coverage metrics'
      },
      {
        id: 'security-config',
        name: 'Security Config',
        icon: '🔐',
        requiresProject: false,
        endpoint: '/services/security',
        description: 'Configure security settings'
      }
    ]
    
    defaultServices.forEach(service => {
      this.services.set(service.id, service)
    })
  }
  
  getService(id: string): Service | undefined {
    return this.services.get(id)
  }
  
  getAllServices(): Service[] {
    return Array.from(this.services.values())
  }
  
  getServicesForProject(project: Project): Service[] {
    return this.getAllServices().filter(service => {
      if (!service.requiresProject) return true
      if (!project.services.includes('all') && !project.services.includes(service.id)) {
        return false
      }
      if (service.supportedProjectTypes && !service.supportedProjectTypes.includes(project.type)) {
        return false
      }
      return true
    })
  }
}

export class ProjectAwarePortal {
  private app: Elysia
  private projectManager: ProjectManager
  private serviceManager: ServiceManager
  private currentProject?: string
  private port?: number
  
  constructor() {
    this.app = new Elysia()
    this.projectManager = new ProjectManager()
    this.serviceManager = new ServiceManager()
    this.setupApp()
  }
  
  private setupApp() {
    this.app
      .use(cors({ credentials: true }))
      
      // State management
      .state('currentProject', this.currentProject)
      .derive(() => ({
        getProject: () => {
          // Use in-memory state for project selection
          return this.currentProject ? this.projectManager.getProject(this.currentProject) : undefined
        }
      }))
      
      // Main portal page
      .get('/', () => {
        // Use in-memory state instead of cookies
        return this.renderPortal(this.currentProject)
      })
      
      // API endpoints
      .get('/api/projects', ({ set }) => {
        set.headers['Content-Type'] = 'application/json'
        return { projects: this.projectManager.getAllProjects() }
      })
      
      .post('/api/select-project', ({ body, set }) => {
        const { projectId } = body as any
        this.currentProject = projectId
        
        // For now, just store in memory - cookie handling seems to have issues
        // Will use the in-memory state for project selection
        
        set.headers['Content-Type'] = 'application/json'
        return { success: true, projectId }
      })
      
      .get('/api/services', ({ getProject, set }) => {
        set.headers['Content-Type'] = 'application/json'
        const project = getProject()
        if (!project) {
          return { services: this.serviceManager.getAllServices() }
        }
        return { services: this.serviceManager.getServicesForProject(project) }
      })
      
      // Service endpoints with project context
      .get('/services/:serviceId', ({ params, getProject }) => {
        const service = this.serviceManager.getService(params.serviceId)
        const project = getProject()
        
        if (!service) {
          return new Response('Service not found', { status: 404 })
        }
        
        return this.renderService(service, project)
      })
      
      // Service-specific APIs
      .get('/api/services/:serviceId/data', ({ params, getProject, set }) => {
        set.headers['Content-Type'] = 'application/json'
        const service = this.serviceManager.getService(params.serviceId)
        const project = getProject()
        
        if (!service) {
          return { error: 'Service not found' }
        }
        
        // Mock service data based on project
        return this.getServiceData(service.id, project)
      })
  }
  
  private renderPortal(selectedProjectId?: string) {
    const projects = this.projectManager.getAllProjects()
    const selectedProject = selectedProjectId ? this.projectManager.getProject(selectedProjectId) : undefined
    const availableServices = selectedProject 
      ? this.serviceManager.getServicesForProject(selectedProject)
      : this.serviceManager.getAllServices()
    
    return new Response(`<!DOCTYPE html>
    <html>
    <head>
      <title>AI Dev Portal - Project Manager</title>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: system-ui, -apple-system, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 1rem;
        }
        .container {
          max-width: 1400px;
          margin: 0 auto;
        }
        .header {
          background: white;
          border-radius: 1rem;
          padding: 1.5rem;
          margin-bottom: 1rem;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }
        .project-selector {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-top: 1rem;
        }
        select {
          padding: 0.75rem;
          border-radius: 0.5rem;
          border: 2px solid #e5e7eb;
          font-size: 1rem;
          background: white;
          cursor: pointer;
          min-width: 300px;
        }
        .project-info {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }
        .badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .badge.theme { background: #10b981; color: white; }
        .badge.root { background: #ef4444; color: white; }
        .badge.has-queue { background: #3b82f6; color: white; }
        .badge.has-feature { background: #f59e0b; color: white; }
        
        .services-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }
        .service-card {
          background: white;
          border-radius: 0.75rem;
          padding: 1.5rem;
          cursor: pointer;
          transition: all 0.3s;
          text-decoration: none;
          color: inherit;
          display: block;
        }
        .service-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        }
        .service-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }
        .service-name {
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
          margin-bottom: 0.5rem;
        }
        .service-desc {
          font-size: 0.875rem;
          color: #6b7280;
          line-height: 1.5;
        }
        .service-unavailable {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .no-project {
          background: #fef2f2;
          border: 2px dashed #ef4444;
          border-radius: 0.75rem;
          padding: 2rem;
          text-align: center;
          color: #991b1b;
        }
        
        /* Modal styles */
        .modal {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          z-index: 1000;
          align-items: center;
          justify-content: center;
        }
        .modal.active {
          display: flex;
        }
        .modal-content {
          background: white;
          border-radius: 1rem;
          width: 90%;
          max-width: 1200px;
          max-height: 90vh;
          overflow: hidden;
          position: relative;
        }
        .modal-header {
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .modal-body {
          padding: 1.5rem;
          overflow-y: auto;
          max-height: calc(90vh - 80px);
        }
        .close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.5rem;
        }
        iframe {
          width: 100%;
          height: 600px;
          border: none;
          border-radius: 0.5rem;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚀 AI Dev Portal</h1>
          
          <div class="project-selector">
            <label for="project">Current Project:</label>
            <select id="project" onchange="selectProject(this.value)">
              <option value="">Select a project...</option>
              ${projects.map(p => `
                <option value="${p.id}" ${p.id === selectedProjectId ? 'selected' : ''}>
                  ${p.name}
                </option>
              `).join('')}
            </select>
            ${selectedProject ? `
              <div class="project-info">
                <span class="badge ${selectedProject.type}">${selectedProject.type}</span>
                ${selectedProject.hasTaskQueue ? '<span class="badge has-queue">Tasks</span>' : ''}
                ${selectedProject.hasFeature ? '<span class="badge has-feature">Features</span>' : ''}
              </div>
            ` : ''}
          </div>
        </div>
        
        ${selectedProject ? `
          <div class="services-grid">
            ${availableServices.map(service => `
              <a href="#" class="service-card" onclick="openService('${service.id}'); return false;">
                <div class="service-icon">${service.icon}</div>
                <div class="service-name">${service.name}</div>
                <div class="service-desc">${service.description}</div>
              </a>
            `).join('')}
          </div>
        ` : `
          <div class="no-project">
            <h2>👆 Please select a project first</h2>
            <p>Services will appear once you select a project from the dropdown above.</p>
          </div>
        `}
      </div>
      
      <!-- Service Modal -->
      <div id="serviceModal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h2 id="modalTitle">Service</h2>
            <button class="close-btn" onclick="closeModal()">✕</button>
          </div>
          <div class="modal-body" id="modalBody">
            Loading...
          </div>
        </div>
      </div>
      
      <script>
        function selectProject(projectId) {
          fetch('/api/select-project', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId }),
            credentials: 'include'
          })
          .then(() => location.reload())
        }
        
        function openService(serviceId) {
          const modal = document.getElementById('serviceModal')
          const modalTitle = document.getElementById('modalTitle')
          const modalBody = document.getElementById('modalBody')
          
          modal.classList.add('active')
          modalBody.innerHTML = '<iframe src="/services/' + serviceId + '"></iframe>'
          
          // Get service name
          fetch('/api/services')
            .then(r => r.json())
            .then(data => {
              const service = data.services.find(s => s.id === serviceId)
              if (service) {
                modalTitle.textContent = service.icon + ' ' + service.name
              }
            })
        }
        
        function closeModal() {
          const modal = document.getElementById('serviceModal')
          modal.classList.remove('active')
          document.getElementById('modalBody').innerHTML = 'Loading...'
        }
        
        // Close modal on escape key
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') closeModal()
        })
        
        // Close modal on background click
        document.getElementById('serviceModal').addEventListener('click', (e) => {
          if (e.target.id === 'serviceModal') closeModal()
        })
      </script>
    </body>
    </html>`, {
      headers: { 'Content-Type': 'text/html' }
    })
  }
  
  private renderService(service: Service, project?: Project) {
    const projectInfo = project ? `
      <div style="background: #f3f4f6; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">
        <strong>Project:</strong> ${project.name}<br>
        <strong>Path:</strong> ${project.path}<br>
        <strong>Type:</strong> ${project.type}
      </div>
    ` : ''
    
    // Service-specific rendering
    let serviceContent = ''
    
    switch (service.id) {
      case 'task-queue':
        serviceContent = this.renderTaskQueue(project)
        break
      case 'gui-selector':
        serviceContent = this.renderGuiSelector(project)
        break
      case 'story-reporter':
        serviceContent = this.renderStoryReporter(project)
        break
      default:
        serviceContent = `
          <p>Service implementation for ${service.name}</p>
          <p>This would connect to the actual ${service.id} service.</p>
        `
    }
    
    return new Response(`<!DOCTYPE html>
    <html>
    <head>
      <title>${service.name}</title>
      <style>
        body {
          font-family: system-ui, -apple-system, sans-serif;
          padding: 2rem;
          margin: 0;
          background: #f9fafb;
        }
        h1 { color: #111827; margin-bottom: 1rem; }
        .content { background: white; padding: 1.5rem; border-radius: 0.75rem; }
      </style>
    </head>
    <body>
      <h1>${service.icon} ${service.name}</h1>
      ${projectInfo}
      <div class="content">
        ${serviceContent}
      </div>
    </body>
    </html>`, {
      headers: { 'Content-Type': 'text/html' }
    })
  }
  
  private renderTaskQueue(project?: Project) {
    if (!project) return '<p>No project selected</p>'
    
    return `
      <h2>Task Queue for ${project.name}</h2>
      <p>Reading from: ${project.path}/TASK_QUEUE.vf.json</p>
      <div id="taskQueue">Loading tasks...</div>
      <script>
        fetch('/api/services/task-queue/data')
          .then(r => r.json())
          .then(data => {
            const container = document.getElementById('taskQueue')
            if (data.tasks && data.tasks.length > 0) {
              container.innerHTML = '<ul>' + 
                data.tasks.map(task => '<li>' + task.title + ' (' + task.priority + ')</li>').join('') +
                '</ul>'
            } else {
              container.innerHTML = '<p>No tasks found</p>'
            }
          })
      </script>
    `
  }
  
  private renderGuiSelector(project?: Project) {
    if (!project) return '<p>No project selected</p>'
    
    return `
      <h2>GUI Design Selector</h2>
      <p>Project: ${project.name}</p>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-top: 1rem;">
        <div style="border: 2px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem;">
          <h3>Modern Design</h3>
          <p>Clean, minimalist interface with focus on usability</p>
          <button onclick="alert('Selected: Modern Design')">Select</button>
        </div>
        <div style="border: 2px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem;">
          <h3>Professional Design</h3>
          <p>Corporate-friendly design with structured layout</p>
          <button onclick="alert('Selected: Professional Design')">Select</button>
        </div>
        <div style="border: 2px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem;">
          <h3>Creative Design</h3>
          <p>Bold colors and unique visual elements</p>
          <button onclick="alert('Selected: Creative Design')">Select</button>
        </div>
        <div style="border: 2px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem;">
          <h3>Accessible Design</h3>
          <p>High contrast with accessibility features</p>
          <button onclick="alert('Selected: Accessible Design')">Select</button>
        </div>
      </div>
    `
  }
  
  private renderStoryReporter(project?: Project) {
    if (!project) return '<p>No project selected</p>'
    
    return `
      <h2>Story Reporter</h2>
      <p>Generate reports for: ${project.name}</p>
      <div style="margin-top: 1rem;">
        <h3>Available Reports:</h3>
        <ul>
          <li>User Story Coverage Report</li>
          <li>Test Execution Summary</li>
          <li>Feature Completion Status</li>
          <li>Sprint Velocity Metrics</li>
        </ul>
        <button onclick="alert('Generating report for ${project.name}...')">Generate Report</button>
      </div>
    `
  }
  
  private getServiceData(serviceId: string, project?: Project) {
    // Mock data based on service and project
    switch (serviceId) {
      case 'task-queue':
        return {
          tasks: project ? [
            { title: `Update ${project.name}`, priority: 'high', status: 'pending' },
            { title: 'Fix tests', priority: 'medium', status: 'in_progress' },
            { title: 'Update documentation', priority: 'low', status: 'pending' }
          ] : []
        }
      
      case 'feature-viewer':
        return {
          features: project ? [
            { name: 'Core functionality', status: 'completed' },
            { name: 'Advanced features', status: 'in_progress' }
          ] : []
        }
      
      default:
        return { message: `Data for ${serviceId}`, project: project?.name }
    }
  }
  
  async start(basePath: string = process.cwd()) {
    // Discover projects
    await this.projectManager.discoverProjects(basePath)
    
    // Get port from security
    const portManager = MockPortManager.getInstance()
    const registration = await portManager.registerApp({
      appId: 'portal',
      deployType: (process.env.DEPLOY_TYPE || 'local') as any,
      ipAddress: '127.0.0.1'
    })
    
    if (!registration.success) {
      throw new Error(`Failed to get port: ${registration.message}`)
    }
    
    this.port = registration.port!
    
    // Start server
    this.app.listen(this.port)
    
    console.log(`
╔════════════════════════════════════════════╗
║     Project-Aware Portal - Running         ║
╠════════════════════════════════════════════╣
║ 🚀 Port:       ${String(this.port).padEnd(28)}║
║ 📁 Projects:   ${String(this.projectManager.getAllProjects().length).padEnd(28)}║
║ 🛠️  Services:   ${String(this.serviceManager.getAllServices().length).padEnd(28)}║
║ 🌐 URL:        http://localhost:${this.port}${' '.repeat(28 - String(this.port).length - 11)}║
╚════════════════════════════════════════════╝
    `)
    
    return this.app
  }
}

export default ProjectAwarePortal