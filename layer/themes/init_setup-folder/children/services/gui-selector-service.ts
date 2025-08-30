/**
 * GUI Selector Service
 * Full-featured GUI selection interface for the AI Dev Portal
 */

import { Elysia } from 'elysia'
import * as fs from 'fs/promises'
import * as path from 'path'

interface Theme {
  id: string
  name: string
  description: string
  preview?: string
  styles?: Record<string, any>
  category: 'modern' | 'classic' | 'creative' | 'accessible'
}

interface Template {
  id: string
  name: string
  description: string
  components: string[]
  layout: 'grid' | 'list' | 'dashboard' | 'single'
  thumbnail?: string
}

interface Selection {
  id: string
  projectId: string
  theme: Theme
  template: Template
  customizations?: Record<string, any>
  timestamp: Date
}

class GuiSelectorService {
  private themes: Theme[] = [
    {
      id: 'modern-dark',
      name: 'Modern Dark',
      description: 'Sleek dark theme with vibrant accents',
      category: 'modern',
      preview: '🌙',
      styles: {
        primary: '#667eea',
        secondary: '#764ba2',
        background: '#1a1a2e',
        text: '#ffffff'
      }
    },
    {
      id: 'modern-light',
      name: 'Modern Light',
      description: 'Clean, minimalist light theme',
      category: 'modern',
      preview: '☀️',
      styles: {
        primary: '#4f46e5',
        secondary: '#7c3aed',
        background: '#ffffff',
        text: '#1f2937'
      }
    },
    {
      id: 'classic-business',
      name: 'Classic Business',
      description: 'Professional, corporate design',
      category: 'classic',
      preview: '💼',
      styles: {
        primary: '#2563eb',
        secondary: '#1e40af',
        background: '#f3f4f6',
        text: '#111827'
      }
    },
    {
      id: 'creative-gradient',
      name: 'Creative Gradient',
      description: 'Bold gradients and animations',
      category: 'creative',
      preview: '🎨',
      styles: {
        primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        secondary: '#f093fb',
        background: '#fafafa',
        text: '#374151'
      }
    },
    {
      id: 'accessible-high-contrast',
      name: 'High Contrast',
      description: 'WCAG AAA compliant high contrast',
      category: 'accessible',
      preview: '♿',
      styles: {
        primary: '#000000',
        secondary: '#ffffff',
        background: '#ffffff',
        text: '#000000'
      }
    }
  ]

  private templates: Template[] = [
    {
      id: 'dashboard',
      name: 'Dashboard Layout',
      description: 'Analytics dashboard with charts and metrics',
      layout: 'dashboard',
      components: ['header', 'sidebar', 'charts', 'metrics', 'footer']
    },
    {
      id: 'landing-page',
      name: 'Landing Page',
      description: 'Marketing landing page with hero section',
      layout: 'single',
      components: ['hero', 'features', 'testimonials', 'cta', 'footer']
    },
    {
      id: 'admin-panel',
      name: 'Admin Panel',
      description: 'Full admin interface with tables and forms',
      layout: 'grid',
      components: ['nav', 'sidebar', 'table', 'forms', 'modals']
    },
    {
      id: 'mobile-app',
      name: 'Mobile App UI',
      description: 'Mobile-first responsive design',
      layout: 'single',
      components: ['tab-bar', 'cards', 'lists', 'buttons', 'bottom-nav']
    },
    {
      id: 'e-commerce',
      name: 'E-Commerce Shop',
      description: 'Product catalog with cart and checkout',
      layout: 'grid',
      components: ['product-grid', 'cart', 'filters', 'search', 'checkout']
    }
  ]

  private selections: Map<string, Selection[]> = new Map()

  getThemes(category?: string): Theme[] {
    if (category) {
      return this.themes.filter(t => t.category === category)
    }
    return this.themes
  }

  getTemplates(layout?: string): Template[] {
    if (layout) {
      return this.templates.filter(t => t.layout === layout)
    }
    return this.templates
  }

  saveSelection(projectId: string, themeId: string, templateId: string, customizations?: any): Selection {
    const theme = this.themes.find(t => t.id === themeId)
    const template = this.templates.find(t => t.id === templateId)
    
    if (!theme || !template) {
      throw new Error('Invalid theme or template')
    }

    const selection: Selection = {
      id: `sel_${Date.now()}`,
      projectId,
      theme,
      template,
      customizations,
      timestamp: new Date()
    }

    const projectSelections = this.selections.get(projectId) || []
    projectSelections.push(selection)
    this.selections.set(projectId, projectSelections)

    return selection
  }

  getSelections(projectId: string): Selection[] {
    return this.selections.get(projectId) || []
  }

  generatePreview(themeId: string, templateId: string): string {
    const theme = this.themes.find(t => t.id === themeId)
    const template = this.templates.find(t => t.id === templateId)

    if (!theme || !template) {
      return 'Invalid selection'
    }

    return `
      <div style="
        background: ${theme.styles?.background || '#fff'};
        color: ${theme.styles?.text || '#000'};
        padding: 2rem;
        border-radius: 0.5rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      ">
        <h3 style="color: ${theme.styles?.primary || '#333'}">
          ${template.name} with ${theme.name}
        </h3>
        <div style="margin-top: 1rem;">
          <p>${template.description}</p>
          <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
            ${template.components.slice(0, 3).map(c => 
              `<span style="
                background: ${theme.styles?.primary || '#666'};
                color: white;
                padding: 0.25rem 0.75rem;
                border-radius: 0.25rem;
                font-size: 0.875rem;
              ">${c}</span>`
            ).join('')}
          </div>
        </div>
      </div>
    `
  }
}

// Create the Elysia app for GUI selector
export function createGuiSelectorApp() {
  const service = new GuiSelectorService()
  
  return new Elysia({ prefix: '/gui-selector' })
    // Main GUI selector interface
    .get('/', ({ query }) => {
      const projectId = query.project || 'default'
      const selections = service.getSelections(projectId)
      
      return new Response(`<!DOCTYPE html>
      <html>
      <head>
        <title>GUI Design Selector</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: system-ui, -apple-system, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 2rem;
          }
          .container {
            max-width: 1400px;
            margin: 0 auto;
          }
          .header {
            background: white;
            border-radius: 1rem;
            padding: 2rem;
            margin-bottom: 2rem;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          }
          h1 {
            color: #333;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 1rem;
          }
          .tabs {
            display: flex;
            gap: 1rem;
            margin-bottom: 2rem;
            border-bottom: 2px solid #e0e0e0;
            padding-bottom: 1rem;
          }
          .tab {
            padding: 0.75rem 1.5rem;
            background: none;
            border: none;
            cursor: pointer;
            font-size: 1rem;
            color: #666;
            transition: all 0.3s;
            border-radius: 0.5rem 0.5rem 0 0;
          }
          .tab.active {
            background: #667eea;
            color: white;
          }
          .tab:hover {
            background: #f0f0f0;
            color: #333;
          }
          .tab.active:hover {
            background: #5a67d8;
            color: white;
          }
          .content {
            background: white;
            border-radius: 1rem;
            padding: 2rem;
            margin-bottom: 2rem;
            min-height: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          .section {
            display: none;
          }
          .section.active {
            display: block;
          }
          .theme-grid, .template-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 1.5rem;
            margin-top: 1.5rem;
          }
          .theme-card, .template-card {
            background: #f9fafb;
            border: 2px solid transparent;
            border-radius: 0.75rem;
            padding: 1.5rem;
            cursor: pointer;
            transition: all 0.3s;
          }
          .theme-card:hover, .template-card:hover {
            border-color: #667eea;
            transform: translateY(-4px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.1);
          }
          .theme-card.selected, .template-card.selected {
            border-color: #667eea;
            background: #f0f4ff;
          }
          .theme-preview {
            font-size: 3rem;
            margin-bottom: 1rem;
            text-align: center;
          }
          .theme-name, .template-name {
            font-weight: 600;
            color: #333;
            margin-bottom: 0.5rem;
          }
          .theme-desc, .template-desc {
            color: #666;
            font-size: 0.9rem;
            margin-bottom: 1rem;
          }
          .color-swatches {
            display: flex;
            gap: 0.5rem;
          }
          .swatch {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .components {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-top: 1rem;
          }
          .component-tag {
            background: #e0e7ff;
            color: #5a67d8;
            padding: 0.25rem 0.75rem;
            border-radius: 0.25rem;
            font-size: 0.875rem;
          }
          .preview-section {
            margin-top: 2rem;
            padding-top: 2rem;
            border-top: 2px solid #e0e0e0;
          }
          .preview-container {
            margin-top: 1rem;
            padding: 2rem;
            background: #f9fafb;
            border-radius: 0.75rem;
            min-height: 200px;
          }
          .action-buttons {
            display: flex;
            gap: 1rem;
            margin-top: 2rem;
          }
          .btn {
            padding: 0.75rem 2rem;
            border: none;
            border-radius: 0.5rem;
            cursor: pointer;
            font-size: 1rem;
            transition: all 0.3s;
          }
          .btn-primary {
            background: #667eea;
            color: white;
          }
          .btn-primary:hover {
            background: #5a67d8;
          }
          .btn-secondary {
            background: #e0e0e0;
            color: #333;
          }
          .btn-secondary:hover {
            background: #d0d0d0;
          }
          .history-list {
            margin-top: 1.5rem;
          }
          .history-item {
            background: #f9fafb;
            border-radius: 0.5rem;
            padding: 1rem;
            margin-bottom: 1rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .history-info {
            flex: 1;
          }
          .history-date {
            color: #666;
            font-size: 0.875rem;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>
              <span>🎨</span>
              GUI Design Selector
            </h1>
            <p style="color: #666;">Project: <strong>${projectId}</strong></p>
          </div>
          
          <div class="tabs">
            <button class="tab active" onclick="showSection('themes')">1. Choose Theme</button>
            <button class="tab" onclick="showSection('templates')">2. Select Template</button>
            <button class="tab" onclick="showSection('preview')">3. Preview</button>
            <button class="tab" onclick="showSection('customize')">4. Customize</button>
            <button class="tab" onclick="showSection('history')">5. History</button>
          </div>
          
          <div class="content">
            <!-- Themes Section -->
            <div id="themes" class="section active">
              <h2>Select a Theme</h2>
              <p style="color: #666; margin-bottom: 1rem;">Choose a visual style for your interface</p>
              
              <div class="theme-grid">
                ${service.getThemes().map(theme => `
                  <div class="theme-card" onclick="selectTheme('${theme.id}')" data-theme-id="${theme.id}">
                    <div class="theme-preview">${theme.preview}</div>
                    <div class="theme-name">${theme.name}</div>
                    <div class="theme-desc">${theme.description}</div>
                    <div class="color-swatches">
                      ${theme.styles ? `
                        <div class="swatch" style="background: ${theme.styles.primary}"></div>
                        <div class="swatch" style="background: ${theme.styles.secondary}"></div>
                        <div class="swatch" style="background: ${theme.styles.background}"></div>
                      ` : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
            
            <!-- Templates Section -->
            <div id="templates" class="section">
              <h2>Select a Template</h2>
              <p style="color: #666; margin-bottom: 1rem;">Choose a layout structure for your application</p>
              
              <div class="template-grid">
                ${service.getTemplates().map(template => `
                  <div class="template-card" onclick="selectTemplate('${template.id}')" data-template-id="${template.id}">
                    <div class="template-name">${template.name}</div>
                    <div class="template-desc">${template.description}</div>
                    <div class="components">
                      ${template.components.map(comp => 
                        `<span class="component-tag">${comp}</span>`
                      ).join('')}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
            
            <!-- Preview Section -->
            <div id="preview" class="section">
              <h2>Preview Your Selection</h2>
              <p style="color: #666;">See how your chosen theme and template look together</p>
              
              <div class="preview-section">
                <div id="preview-container" class="preview-container">
                  <p style="color: #999; text-align: center;">Select a theme and template to see preview</p>
                </div>
                
                <div class="action-buttons">
                  <button class="btn btn-primary" onclick="saveSelection()">Save Selection</button>
                  <button class="btn btn-secondary" onclick="exportSelection()">Export Configuration</button>
                </div>
              </div>
            </div>
            
            <!-- Customize Section -->
            <div id="customize" class="section">
              <h2>Customize Details</h2>
              <p style="color: #666; margin-bottom: 1.5rem;">Fine-tune your design choices</p>
              
              <div style="display: grid; gap: 1.5rem;">
                <div>
                  <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Primary Color</label>
                  <input type="color" id="primaryColor" style="width: 100px; height: 40px; border: 2px solid #e0e0e0; border-radius: 0.25rem;">
                </div>
                
                <div>
                  <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Font Size</label>
                  <select style="padding: 0.5rem; border: 2px solid #e0e0e0; border-radius: 0.25rem; width: 200px;">
                    <option>Small (14px)</option>
                    <option selected>Medium (16px)</option>
                    <option>Large (18px)</option>
                    <option>Extra Large (20px)</option>
                  </select>
                </div>
                
                <div>
                  <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Border Radius</label>
                  <input type="range" min="0" max="20" value="8" style="width: 200px;">
                </div>
                
                <div>
                  <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Spacing</label>
                  <select style="padding: 0.5rem; border: 2px solid #e0e0e0; border-radius: 0.25rem; width: 200px;">
                    <option>Compact</option>
                    <option selected>Normal</option>
                    <option>Comfortable</option>
                    <option>Spacious</option>
                  </select>
                </div>
              </div>
              
              <div class="action-buttons" style="margin-top: 2rem;">
                <button class="btn btn-primary" onclick="applyCustomizations()">Apply Changes</button>
                <button class="btn btn-secondary" onclick="resetCustomizations()">Reset to Default</button>
              </div>
            </div>
            
            <!-- History Section -->
            <div id="history" class="section">
              <h2>Selection History</h2>
              <p style="color: #666; margin-bottom: 1rem;">Your previous design selections for this project</p>
              
              <div class="history-list">
                ${selections.length > 0 ? selections.map(sel => `
                  <div class="history-item">
                    <div class="history-info">
                      <div><strong>${sel.theme.name}</strong> + ${sel.template.name}</div>
                      <div class="history-date">${new Date(sel.timestamp).toLocaleString()}</div>
                    </div>
                    <button class="btn btn-secondary" onclick="loadSelection('${sel.id}')">Load</button>
                  </div>
                `).join('') : '<p style="color: #999;">No selections saved yet</p>'}
              </div>
            </div>
          </div>
        </div>
        
        <script>
          let selectedTheme = null;
          let selectedTemplate = null;
          
          function showSection(sectionId) {
            // Hide all sections
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            
            // Show selected section
            document.getElementById(sectionId).classList.add('active');
            event.target.classList.add('active');
          }
          
          function selectTheme(themeId) {
            selectedTheme = themeId;
            document.querySelectorAll('.theme-card').forEach(card => {
              card.classList.remove('selected');
            });
            document.querySelector(\`[data-theme-id="\${themeId}"]\`).classList.add('selected');
            updatePreview();
          }
          
          function selectTemplate(templateId) {
            selectedTemplate = templateId;
            document.querySelectorAll('.template-card').forEach(card => {
              card.classList.remove('selected');
            });
            document.querySelector(\`[data-template-id="\${templateId}"]\`).classList.add('selected');
            updatePreview();
          }
          
          async function updatePreview() {
            if (selectedTheme && selectedTemplate) {
              const response = await fetch(\`/gui-selector/api/preview?theme=\${selectedTheme}&template=\${selectedTemplate}\`);
              const preview = await response.text();
              document.getElementById('preview-container').innerHTML = preview;
            }
          }
          
          async function saveSelection() {
            if (!selectedTheme || !selectedTemplate) {
              alert('Please select both a theme and template');
              return;
            }
            
            const response = await fetch('/gui-selector/api/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectId: '${projectId}',
                themeId: selectedTheme,
                templateId: selectedTemplate
              })
            });
            
            if (response.ok) {
              alert('Selection saved successfully!');
              showSection('history');
              location.reload();
            }
          }
          
          function exportSelection() {
            if (!selectedTheme || !selectedTemplate) {
              alert('Please select both a theme and template');
              return;
            }
            
            const config = {
              theme: selectedTheme,
              template: selectedTemplate,
              timestamp: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'gui-config.json';
            a.click();
          }
          
          function applyCustomizations() {
            alert('Customizations applied!');
          }
          
          function resetCustomizations() {
            alert('Reset to defaults');
          }
          
          function loadSelection(selectionId) {
            alert('Loading selection: ' + selectionId);
          }
        </script>
      </body>
      </html>`, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    })
    
    // API endpoints
    .get('/api/themes', () => {
      return { themes: service.getThemes() }
    })
    
    .get('/api/templates', () => {
      return { templates: service.getTemplates() }
    })
    
    .get('/api/preview', ({ query }) => {
      const { theme, template } = query
      return new Response(service.generatePreview(theme, template), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    })
    
    .post('/api/save', ({ body }) => {
      const { projectId, themeId, templateId, customizations } = body as any
      const selection = service.saveSelection(projectId, themeId, templateId, customizations)
      return { success: true, selection }
    })
    
    .get('/api/selections/:projectId', ({ params }) => {
      return { selections: service.getSelections(params.projectId) }
    })
}

// Export for use in portal
export default createGuiSelectorApp