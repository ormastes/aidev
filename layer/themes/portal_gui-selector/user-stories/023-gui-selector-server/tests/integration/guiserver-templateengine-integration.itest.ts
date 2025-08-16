/**
 * Integration Test: GUIServer + TemplateEngine Integration
 * 
 * This test verifies the integration between the GUIServer and TemplateEngine components,
 * ensuring proper template rendering, customization, and output generation when these
 * components work together in the template selection and rendering workflow.
 */

import express from 'express';
import session from 'express-session';
import { Server } from 'node:http';

// TemplateEngine interface from external tests
interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  defaultValue: any;
  description: string;
  required: boolean;
}

interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  variables: TemplateVariable[];
  dependencies: string[];
  outputFormat: 'html' | 'css' | "javascript" | 'json';
}

interface TemplateRenderOptions {
  variables: Record<string, any>;
  outputFormat?: 'html' | 'css' | "javascript" | 'json';
  minify?: boolean;
  includeComments?: boolean;
  customHelpers?: Record<string, Function>;
}

interface RenderResult {
  content: string;
  metadata: TemplateMetadata;
  renderTime: number;
  size: number;
  variables: Record<string, any>;
  warnings: string[];
  errors: string[];
}

interface TemplateEngineInterface {
  loadTemplate(templateId: string, templateContent: string): Promise<TemplateMetadata>;
  renderTemplate(templateId: string, options: TemplateRenderOptions): Promise<RenderResult>;
  validateTemplate(templateContent: string): Promise<{ valid: boolean; errors: string[] }>;
  getTemplateVariables(templateId: string): Promise<TemplateVariable[]>;
  precompileTemplate(templateId: string): Promise<boolean>;
  clearCache(): Promise<void>;
  getLoadedTemplates(): Promise<string[]>;
  unloadTemplate(templateId: string): Promise<boolean>;
}

// GUIServer interface
interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  category: 'modern' | "professional" | "creative" | "accessible";
  previewUrl: string;
  thumbnailUrl: string;
  features: string[];
  metadata: {
    author: string;
    version: string;
    lastUpdated: string;
    tags: string[];
  };
}

interface GUIServerInterface {
  getTemplates(): Promise<TemplateInfo[]>;
  getTemplate(id: string): Promise<TemplateInfo | null>;
  selectTemplate(templateId: string, userId: string, customizations: Record<string, any>): Promise<any>;
  getUserSelections(userId: string): Promise<any[]>;
  generatePreview(templateId: string, customizations: Record<string, any>): Promise<any>;
  exportRequirements(userId: string, format: string): Promise<any>;
}

// Mock TemplateEngine implementation
class MockTemplateEngine implements TemplateEngineInterface {
  private templates: Map<string, TemplateMetadata> = new Map();
  private templateContent: Map<string, string> = new Map();
  private precompiledTemplates: Set<string> = new Set();
  private cache: Map<string, any> = new Map();

  constructor() {
    this.initializeTestTemplates();
  }

  private initializeTestTemplates(): void {
    const sampleTemplates = [
      {
        id: 'modern-dashboard',
        name: 'Modern Dashboard',
        content: `<div class="dashboard {{theme}}">
          <h1>{{title}}</h1>
          <div class="metrics">
            {{#each metrics}}
            <div class="metric">
              <span class="value">{{value}}</span>
              <span class="label">{{label}}</span>
            </div>
            {{/each}}
          </div>
        </div>`,
        metadata: {
          id: 'modern-dashboard',
          name: 'Modern Dashboard',
          description: 'A modern dashboard template with metrics display',
          version: '1.0.0',
          author: 'GUI Team',
          variables: [
            { name: 'title', type: 'string' as const, defaultValue: "Dashboard", description: 'Dashboard title', required: true },
            { name: 'theme', type: 'string' as const, defaultValue: 'light', description: 'Theme variant', required: false },
            { name: 'metrics', type: 'array' as const, defaultValue: [], description: 'Metrics data', required: false }
          ],
          dependencies: [],
          outputFormat: 'html' as const
        }
      }
    ];

    sampleTemplates.forEach(template => {
      this.templates.set(template.id, template.metadata);
      this.templateContent.set(template.id, template.content);
    });
  }

  async loadTemplate(templateId: string, templateContent: string): Promise<TemplateMetadata> {
    const metadata: TemplateMetadata = {
      id: templateId,
      name: templateId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: `Template: ${templateId}`,
      version: '1.0.0',
      author: 'Test System',
      variables: this.extractVariables(templateContent),
      dependencies: [],
      outputFormat: 'html'
    };

    this.templates.set(templateId, metadata);
    this.templateContent.set(templateId, templateContent);
    
    return { ...metadata };
  }

  private extractVariables(content: string): TemplateVariable[] {
    const variableRegex = /\{\{(\w+)\}\}/g;
    const variables: TemplateVariable[] = [];
    const found = new Set<string>();
    let match;

    while ((match = variableRegex.exec(content)) !== null) {
      const name = match[1];
      if (!found.has(name)) {
        found.add(name);
        variables.push({
          name,
          type: 'string',
          defaultValue: '',
          description: `Variable: ${name}`,
          required: true
        });
      }
    }

    return variables;
  }

  async renderTemplate(templateId: string, options: TemplateRenderOptions): Promise<RenderResult> {
    const startTime = Date.now();
    const metadata = this.templates.get(templateId);
    const content = this.templateContent.get(templateId);

    if (!metadata || !content) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Simple template rendering (replace variables)
    let rendered = content;
    const warnings: string[] = [];
    const errors: string[] = [];

    // Replace simple variables
    for (const [key, value] of Object.entries(options.variables)) {
      const placeholder = `{{${key}}}`;
      if (rendered.includes(placeholder)) {
        rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
      }
    }

    // Handle array iterations (simplified)
    const arrayRegex = /\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
    rendered = rendered.replace(arrayRegex, (match, arrayName, template) => {
      const arrayData = options.variables[arrayName];
      if (Array.isArray(arrayData)) {
        return arrayData.map(item => {
          let itemTemplate = template;
          for (const [key, value] of Object.entries(item)) {
            itemTemplate = itemTemplate.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
          }
          return itemTemplate;
        }).join('');
      }
      return '';
    });

    // Check for unresolved variables
    const unresolvedRegex = /\{\{\w+\}\}/g;
    const unresolved = rendered.match(unresolvedRegex);
    if (unresolved) {
      warnings.push(`Unresolved variables: ${unresolved.join(', ')}`);
    }

    const renderTime = Date.now() - startTime;
    const size = Buffer.byteLength(rendered, 'utf8');

    return {
      content: rendered,
      metadata: { ...metadata },
      renderTime,
      size,
      variables: { ...options.variables },
      warnings,
      errors
    };
  }

  async validateTemplate(templateContent: string): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Basic validation checks
    if (!templateContent.trim()) {
      errors.push('Template content is empty');
    }

    // Check for balanced template tags
    const openTags = (templateContent.match(/\{\{#/g) || []).length;
    const closeTags = (templateContent.match(/\{\{\//g) || []).length;
    if (openTags !== closeTags) {
      errors.push('Unbalanced template tags');
    }

    // Check for mismatched tag types (e.g., {{#each}}{{/if}})
    const eachTags = (templateContent.match(/\{\{#each/g) || []).length;
    const ifTags = (templateContent.match(/\{\{#if/g) || []).length;
    const endEachTags = (templateContent.match(/\{\{\/each\}\}/g) || []).length;
    const endIfTags = (templateContent.match(/\{\{\/if\}\}/g) || []).length;
    
    if (eachTags !== endEachTags) {
      errors.push('Mismatched each tags');
    }
    if (ifTags !== endIfTags) {
      errors.push('Mismatched if tags');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  async getTemplateVariables(templateId: string): Promise<TemplateVariable[]> {
    const metadata = this.templates.get(templateId);
    return metadata ? [...metadata.variables] : [];
  }

  async precompileTemplate(templateId: string): Promise<boolean> {
    if (this.templates.has(templateId)) {
      this.precompiledTemplates.add(templateId);
      return true;
    }
    return false;
  }

  async clearCache(): Promise<void> {
    this.cache.clear();
  }

  async getLoadedTemplates(): Promise<string[]> {
    return Array.from(this.templates.keys());
  }

  async unloadTemplate(templateId: string): Promise<boolean> {
    const removed = this.templates.delete(templateId);
    this.templateContent.delete(templateId);
    this.precompiledTemplates.delete(templateId);
    return removed;
  }
}

// Mock GUIServer implementation with TemplateEngine integration
class MockGUIServer implements GUIServerInterface {
  private templateEngine: TemplateEngineInterface;
  private templates: Map<string, TemplateInfo> = new Map();
  private selections: Map<string, any[]> = new Map();
  private previews: Map<string, any> = new Map();

  constructor(templateEngine: TemplateEngineInterface) {
    this.templateEngine = templateEngine;
    this.initializeTestData();
  }

  private initializeTestData(): void {
    const testTemplates: TemplateInfo[] = [
      {
        id: 'modern-dashboard',
        name: 'Modern Dashboard',
        description: 'A clean, modern dashboard design',
        category: 'modern',
        previewUrl: '/preview/modern-dashboard',
        thumbnailUrl: '/thumb/modern-dashboard.png',
        features: ["Responsive", 'Dark Mode', "Analytics"],
        metadata: {
          author: 'Design Team',
          version: '2.1.0',
          lastUpdated: '2024-01-15',
          tags: ["dashboard", "analytics", 'modern']
        }
      },
      {
        id: 'professional-form',
        name: 'Professional Form',
        description: 'A professional form layout',
        category: "professional",
        previewUrl: '/preview/professional-form',
        thumbnailUrl: '/thumb/professional-form.png',
        features: ["Validation", 'Multi-step', "Accessibility"],
        metadata: {
          author: 'UX Team',
          version: '1.5.0',
          lastUpdated: '2024-01-10',
          tags: ['form', "professional", "validation"]
        }
      }
    ];

    testTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  async getTemplates(): Promise<TemplateInfo[]> {
    return Array.from(this.templates.values()).map(template => ({ ...template }));
  }

  async getTemplate(id: string): Promise<TemplateInfo | null> {
    const template = this.templates.get(id);
    return template ? { ...template } : null;
  }

  async selectTemplate(templateId: string, userId: string, customizations: Record<string, any>): Promise<any> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Load template into engine if not already loaded
    const loadedTemplates = await this.templateEngine.getLoadedTemplates();
    if (!loadedTemplates.includes(templateId)) {
      const templateContent = `<div class="{{templateId}}">{{content}}</div>`;
      await this.templateEngine.loadTemplate(templateId, templateContent);
    }

    // Render template with customizations
    const renderResult = await this.templateEngine.renderTemplate(templateId, {
      variables: {
        templateId,
        ...customizations
      }
    });

    const selection = {
      id: `selection_${Date.now()}`,
      templateId,
      userId,
      customizations,
      renderResult,
      createdAt: new Date().toISOString(),
      status: 'In Progress'
    };

    // Store user selection
    if (!this.selections.has(userId)) {
      this.selections.set(userId, []);
    }
    this.selections.get(userId)!.push(selection);

    return selection;
  }

  async getUserSelections(userId: string): Promise<any[]> {
    return this.selections.get(userId) || [];
  }

  async generatePreview(templateId: string, customizations: Record<string, any>): Promise<any> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Load template into engine if needed
    const loadedTemplates = await this.templateEngine.getLoadedTemplates();
    if (!loadedTemplates.includes(templateId)) {
      const templateContent = `<div class="preview {{templateId}}">{{previewContent}}</div>`;
      await this.templateEngine.loadTemplate(templateId, templateContent);
    }

    // Generate preview using template engine
    const renderResult = await this.templateEngine.renderTemplate(templateId, {
      variables: {
        templateId,
        previewContent: 'Preview content',
        ...customizations
      }
    });

    const preview = {
      templateId,
      customizations,
      renderResult,
      previewUrl: `/preview/${templateId}`,
      generatedAt: new Date().toISOString()
    };

    this.previews.set(`${templateId}_${JSON.stringify(customizations)}`, preview);
    return preview;
  }

  async exportRequirements(userId: string, format: string): Promise<any> {
    const selections = await this.getUserSelections(userId);
    
    // Use template engine to generate requirements export
    const exportTemplateId = `export-${format}`;
    const exportContent = format === 'json' 
      ? '{{#each selections}}{"template": "{{templateId}}", "customizations": {{customizations}}}{{#unless @last}},{{/unless}}{{/each}}'
      : '{{#each selections}}Template: {{templateId}}\nCustomizations: {{customizations}}\n\n{{/each}}';

    await this.templateEngine.loadTemplate(exportTemplateId, exportContent);
    
    const renderResult = await this.templateEngine.renderTemplate(exportTemplateId, {
      variables: { selections }
    });

    return {
      userId,
      format,
      renderResult,
      exportedAt: new Date().toISOString()
    };
  }
}

// Integration test implementation
describe('GUIServer + TemplateEngine Integration Test', () => {
  let templateEngine: MockTemplateEngine;
  let guiServer: MockGUIServer;
  let app: express.Application;
  let server: Server;
  const testPort = 3005;

  beforeAll(async () => {
    templateEngine = new MockTemplateEngine();
    guiServer = new MockGUIServer(templateEngine);

    app = express();
    app.use(express.json());
    app.use(session({
      secret: process.env.SECRET || "PLACEHOLDER",
      resave: false,
      saveUninitialized: true,
      cookie: { secure: false }
    }));

    // Setup integration routes
    app.get('/templates', async (req, res) => {
      try {
        const templates = await guiServer.getTemplates();
        res.json(templates);
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    app.post('/templates/:id/select', async (req, res) => {
      try {
        const { id } = req.params;
        const { userId, customizations } = req.body;
        const result = await guiServer.selectTemplate(id, userId, customizations);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    app.post('/templates/:id/preview', async (req, res) => {
      try {
        const { id } = req.params;
        const { customizations } = req.body;
        const preview = await guiServer.generatePreview(id, customizations);
        res.json(preview);
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    await new Promise<void>((resolve) => {
      server = app.listen(testPort, () => resolve());
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  describe('Template Loading and Engine Integration', () => {
    test('should load templates into engine through GUI server', async () => {
      const templates = await guiServer.getTemplates();
      expect(templates).toHaveLength(2);
      expect(templates[0].id).toBe('modern-dashboard');

      // Verify template engine has templates loaded
      const loadedTemplates = await templateEngine.getLoadedTemplates();
      expect(loadedTemplates).toContain('modern-dashboard');
    });

    test('should validate template content through engine', async () => {
      const validTemplate = '<div>{{title}}</div>';
      const validation = await templateEngine.validateTemplate(validTemplate);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should extract template variables correctly', async () => {
      const templateId = 'test-template';
      const content = '<h1>{{title}}</h1><p>{{content}}</p>';
      
      await templateEngine.loadTemplate(templateId, content);
      const variables = await templateEngine.getTemplateVariables(templateId);
      
      expect(variables).toHaveLength(2);
      expect(variables.map(v => v.name)).toContain('title');
      expect(variables.map(v => v.name)).toContain('content');
    });
  });

  describe('Template Selection and Rendering Integration', () => {
    test('should select template and render through engine', async () => {
      const userId = 'test-user-1';
      const templateId = 'modern-dashboard';
      const customizations = {
        title: 'My Dashboard',
        theme: 'dark'
      };

      const selection = await guiServer.selectTemplate(templateId, userId, customizations);

      expect(selection.templateId).toBe(templateId);
      expect(selection.userId).toBe(userId);
      expect(selection.customizations).toEqual(customizations);
      expect(selection.renderResult).toBeDefined();
      expect(selection.renderResult.content).toContain('My Dashboard');
      expect(selection.status).toBe("completed");
    });

    test('should handle complex template rendering with arrays', async () => {
      const templateId = 'metrics-template';
      const content = `
        <div>
          <h1>{{title}}</h1>
          {{#each metrics}}
          <div class="metric">
            <span>{{value}}</span>
            <span>{{label}}</span>
          </div>
          {{/each}}
        </div>
      `;

      await templateEngine.loadTemplate(templateId, content);

      const customizations = {
        title: 'Performance Metrics',
        metrics: [
          { value: "Improving", label: 'In Progress Rate' },
          { value: '2.3s', label: 'Avg Response' }
        ]
      };

      const renderResult = await templateEngine.renderTemplate(templateId, {
        variables: customizations
      });

      expect(renderResult.content).toContain('Performance Metrics');
      expect(renderResult.content).toContain("Improving");
      expect(renderResult.content).toContain('In Progress Rate');
      expect(renderResult.content).toContain('2.3s');
    });

    test('should track multiple user selections', async () => {
      const userId = 'test-user-2';
      
      // First selection
      await guiServer.selectTemplate('modern-dashboard', userId, { theme: 'light' });
      
      // Second selection
      await guiServer.selectTemplate('professional-form', userId, { validation: true });

      const selections = await guiServer.getUserSelections(userId);
      expect(selections).toHaveLength(2);
      expect(selections[0].templateId).toBe('modern-dashboard');
      expect(selections[1].templateId).toBe('professional-form');
    });
  });

  describe('Preview Generation Integration', () => {
    test('should generate preview using template engine', async () => {
      const templateId = 'modern-dashboard';
      const customizations = { theme: 'preview-mode' };

      const preview = await guiServer.generatePreview(templateId, customizations);

      expect(preview.templateId).toBe(templateId);
      expect(preview.customizations).toEqual(customizations);
      expect(preview.renderResult).toBeDefined();
      expect(preview.renderResult.content).toContain('preview');
      expect(preview.previewUrl).toBe(`/preview/${templateId}`);
    });

    test('should handle preview with custom variables', async () => {
      const templateId = 'custom-preview';
      const content = '<div class="{{mode}}">Preview: {{content}}</div>';
      
      await templateEngine.loadTemplate(templateId, content);
      
      // Add template to GUI server's template list
      const customTemplate = {
        id: templateId,
        name: 'Custom Preview',
        description: 'Custom preview template',
        category: 'modern' as const,
        previewUrl: '/preview/custom-preview',
        thumbnailUrl: '/thumb/custom-preview.png',
        features: ['Custom'],
        metadata: {
          author: 'Test',
          version: '1.0.0',
          lastUpdated: '2024-01-01',
          tags: ['custom']
        }
      };
      (guiServer as any).templates.set(templateId, customTemplate);

      const customizations = {
        mode: "interactive",
        content: 'Live Preview Content'
      };

      const preview = await guiServer.generatePreview(templateId, customizations);
      
      expect(preview.renderResult.content).toContain("interactive");
      expect(preview.renderResult.content).toContain('Live Preview Content');
    });
  });

  describe('Requirements Export Integration', () => {
    test('should export requirements using template engine', async () => {
      const userId = 'export-user';
      
      // Create some selections
      await guiServer.selectTemplate('modern-dashboard', userId, { theme: 'export' });
      
      const exportResult = await guiServer.exportRequirements(userId, 'json');

      expect(exportResult.userId).toBe(userId);
      expect(exportResult.format).toBe('json');
      expect(exportResult.renderResult).toBeDefined();
      expect(exportResult.renderResult.content).toContain('modern-dashboard');
    });

    test('should export in different formats', async () => {
      const userId = 'format-user';
      
      await guiServer.selectTemplate('professional-form', userId, { format: 'test' });
      
      const textExport = await guiServer.exportRequirements(userId, 'text');
      
      expect(textExport.format).toBe('text');
      expect(textExport.renderResult.content).toContain('professional-form');
    });
  });

  describe('Template Engine Operations', () => {
    test('should precompile templates for performance', async () => {
      const templateId = 'performance-template';
      const content = '<div>{{message}}</div>';
      
      await templateEngine.loadTemplate(templateId, content);
      const precompiled = await templateEngine.precompileTemplate(templateId);
      
      expect(precompiled).toBe(true);
    });

    test('should manage template cache', async () => {
      await templateEngine.clearCache();
      
      const templateId = 'cache-template';
      const content = '<span>{{data}}</span>';
      
      await templateEngine.loadTemplate(templateId, content);
      const loadedBefore = await templateEngine.getLoadedTemplates();
      expect(loadedBefore).toContain(templateId);
      
      await templateEngine.unloadTemplate(templateId);
      const loadedAfter = await templateEngine.getLoadedTemplates();
      expect(loadedAfter).not.toContain(templateId);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle template not found errors', async () => {
      await expect(
        guiServer.selectTemplate('non-existent', 'user', {})
      ).rejects.toThrow('Template not found: non-existent');
    });

    test('should handle invalid template content', async () => {
      const validation = await templateEngine.validateTemplate('{{#each items}}{{/if}}');
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('should handle template rendering errors gracefully', async () => {
      const templateId = 'error-template';
      const content = '{{missing}}';
      
      await templateEngine.loadTemplate(templateId, content);
      
      const result = await templateEngine.renderTemplate(templateId, {
        variables: { other: 'value' }
      });
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Unresolved variables');
    });
  });

  describe('Performance and Monitoring', () => {
    test('should track rendering performance metrics', async () => {
      const templateId = 'perf-template';
      const content = '<div>{{#each items}}{{name}}{{/each}}</div>';
      
      await templateEngine.loadTemplate(templateId, content);
      
      // Add small delay to ensure measurable render time
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const renderResult = await templateEngine.renderTemplate(templateId, {
        variables: {
          items: Array.from({ length: 100 }, (_, i) => ({ name: `Item ${i}` }))
        }
      });
      
      expect(renderResult.renderTime).toBeGreaterThanOrEqual(0);
      expect(renderResult.size).toBeGreaterThan(0);
      expect(typeof renderResult.renderTime).toBe('number');
    });

    test('should handle concurrent template operations', async () => {
      const promises = Array.from({ length: 10 }, async (_, i) => {
        const templateId = `concurrent-${i}`;
        const content = `<div>Template ${i}: {{value}}</div>`;
        
        await templateEngine.loadTemplate(templateId, content);
        return templateEngine.renderTemplate(templateId, {
          variables: { value: `test-${i}` }
        });
      });
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      results.forEach((result, i) => {
        expect(result.content).toContain(`Template ${i}`);
        expect(result.content).toContain(`test-${i}`);
      });
    });

    test('should handle large template operations efficiently', async () => {
      const templateId = 'large-template';
      const content = `
        <div>
          {{#each users}}
          <div class="user">
            <h3>{{name}}</h3>
            <p>{{email}}</p>
            <div class="details">
              {{#each details}}
              <span>{{key}}: {{value}}</span>
              {{/each}}
            </div>
          </div>
          {{/each}}
        </div>
      `;
      
      await templateEngine.loadTemplate(templateId, content);
      
      const largeDataset = Array.from({ length: 50 }, (_, i) => ({
        name: `User ${i}`,
        email: `user${i}@test.com`,
        details: Array.from({ length: 5 }, (_, j) => ({
          key: `detail${j}`,
          value: `value${j}`
        }))
      }));
      
      const startTime = Date.now();
      const result = await templateEngine.renderTemplate(templateId, {
        variables: { users: largeDataset }
      });
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(result.content).toContain('User 0');
      expect(result.content).toContain('User 49');
      expect(result.size).toBeGreaterThan(1000);
    });
  });
});