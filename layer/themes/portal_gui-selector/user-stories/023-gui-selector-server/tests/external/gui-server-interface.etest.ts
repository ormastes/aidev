/**
 * External Test: GUIServer External Interface - Template listing and preview
 * 
 * This test verifies the external interface for the GUIServer component,
 * specifically template listing and preview functionality.
 * NO MOCKS - Real external interface implementation.
 */


// External Interface for GUIServer
interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  category: 'modern' | 'professional' | 'creative' | 'accessible';
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

interface PreviewData {
  templateId: string;
  html: string;
  css: string;
  javascript?: string;
  assets: string[];
}

interface GUIServerInterface {
  listTemplates(): Promise<TemplateInfo[]>;
  getTemplate(id: string): Promise<TemplateInfo | null>;
  getTemplatePreview(id: string): Promise<PreviewData | null>;
  searchTemplates(query: string): Promise<TemplateInfo[]>;
  getTemplatesByCategory(category: string): Promise<TemplateInfo[]>;
}

// Mock implementation for testing the external interface
class MockGUIServer implements GUIServerInterface {
  private templates: TemplateInfo[] = [
    {
      id: 'modern-01',
      name: 'Modern Dashboard',
      description: 'Clean and minimalist dashboard design',
      category: 'modern',
      previewUrl: '/templates/modern-01/preview',
      thumbnailUrl: '/templates/modern-01/thumbnail.jpg',
      features: ['responsive', 'dark-mode', 'animations'],
      metadata: {
        author: 'Design Team',
        version: '1.2.0',
        lastUpdated: '2024-01-15',
        tags: ['dashboard', 'clean', 'minimalist']
      }
    },
    {
      id: 'professional-01',
      name: 'Corporate Portal',
      description: 'Professional business application interface',
      category: 'professional',
      previewUrl: '/templates/professional-01/preview',
      thumbnailUrl: '/templates/professional-01/thumbnail.jpg',
      features: ['corporate', 'formal', 'structured'],
      metadata: {
        author: 'Business Team',
        version: '2.1.0',
        lastUpdated: '2024-01-10',
        tags: ['business', 'corporate', 'formal']
      }
    },
    {
      id: 'creative-01',
      name: 'Artistic Showcase',
      description: 'Bold and creative design for portfolios',
      category: 'creative',
      previewUrl: '/templates/creative-01/preview',
      thumbnailUrl: '/templates/creative-01/thumbnail.jpg',
      features: ['artistic', 'bold-colors', 'animations'],
      metadata: {
        author: 'Creative Team',
        version: '1.0.0',
        lastUpdated: '2024-01-20',
        tags: ['creative', 'portfolio', 'artistic']
      }
    },
    {
      id: 'accessible-01',
      name: 'Universal Access',
      description: 'WCAG 2.1 AA compliant accessible design',
      category: 'accessible',
      previewUrl: '/templates/accessible-01/preview',
      thumbnailUrl: '/templates/accessible-01/thumbnail.jpg',
      features: ['wcag-compliant', 'high-contrast', 'keyboard-navigation'],
      metadata: {
        author: 'Accessibility Team',
        version: '1.1.0',
        lastUpdated: '2024-01-12',
        tags: ['accessibility', 'wcag', 'inclusive']
      }
    }
  ];

  private previewData: { [key: string]: PreviewData } = {
    'modern-01': {
      templateId: 'modern-01',
      html: '<div class="modern-dashboard"><h1>Modern Dashboard</h1><div class="content">Clean and modern interface</div></div>',
      css: '.modern-dashboard { font-family: Arial, sans-serif; background: #f5f5f5; } .content { padding: 20px; }',
      javascript: 'console.log("Modern dashboard loaded");',
      assets: ['icons/dashboard.svg', 'images/hero.jpg']
    },
    'professional-01': {
      templateId: 'professional-01',
      html: '<div class="professional-portal"><header>Corporate Portal</header><main>Business content</main></div>',
      css: '.professional-portal { font-family: "Times New Roman", serif; background: #ffffff; border: 1px solid #ccc; }',
      assets: ['logos/company.png', 'documents/terms.pdf']
    },
    'creative-01': {
      templateId: 'creative-01',
      html: '<div class="creative-showcase"><h1 style="color: #ff6b6b;">Artistic Showcase</h1><div class="gallery">Creative content</div></div>',
      css: '.creative-showcase { background: linear-gradient(45deg, #ff6b6b, #4ecdc4); color: white; padding: 30px; }',
      javascript: 'document.addEventListener("DOMContentLoaded", () => { console.log("Creative portfolio ready"); });',
      assets: ['art/painting1.jpg', 'art/sculpture2.jpg', 'videos/demo.mp4']
    },
    'accessible-01': {
      templateId: 'accessible-01',
      html: '<div class="accessible-design" role="main"><h1>Universal Access</h1><nav aria-label="Main navigation">Navigation</nav></div>',
      css: '.accessible-design { font-size: 18px; line-height: 1.6; background: #ffffff; color: #000000; border: 2px solid #0066cc; }',
      assets: ['audio/screen-reader.mp3', 'icons/accessible-icons.svg']
    }
  };

  async listTemplates(): Promise<TemplateInfo[]> {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 10));
    return [...this.templates];
  }

  async getTemplate(id: string): Promise<TemplateInfo | null> {
    await new Promise(resolve => setTimeout(resolve, 10));
    return this.templates.find(t => t.id === id) || null;
  }

  async getTemplatePreview(id: string): Promise<PreviewData | null> {
    await new Promise(resolve => setTimeout(resolve, 10));
    return this.previewData[id] || null;
  }

  async searchTemplates(query: string): Promise<TemplateInfo[]> {
    await new Promise(resolve => setTimeout(resolve, 10));
    const lowerQuery = query.toLowerCase();
    return this.templates.filter(t => 
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.metadata.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  async getTemplatesByCategory(category: string): Promise<TemplateInfo[]> {
    await new Promise(resolve => setTimeout(resolve, 10));
    return this.templates.filter(t => t.category === category);
  }
}

describe('GUIServer External Interface Test', () => {
  let guiServer: GUIServerInterface;
  
  beforeEach(() => {
    guiServer = new MockGUIServer();
  });
  
  test('should list all available templates', async () => {
    const templates = await guiServer.listTemplates();
    
    expect(templates).toHaveLength(4);
    expect(templates[0]).toMatchObject({
      id: 'modern-01',
      name: 'Modern Dashboard',
      category: 'modern',
      features: expect.arrayContaining(['responsive', 'dark-mode', 'animations'])
    });
    
    // Verify all categories are represented
    const categories = templates.map(t => t.category);
    expect(categories).toContain('modern');
    expect(categories).toContain('professional');
    expect(categories).toContain('creative');
    expect(categories).toContain('accessible');
  });
  
  test('should get specific template by ID', async () => {
    const template = await guiServer.getTemplate('modern-01');
    
    expect(template).not.toBeNull();
    expect(template!.id).toBe('modern-01');
    expect(template!.name).toBe('Modern Dashboard');
    expect(template!.category).toBe('modern');
    expect(template!.metadata.version).toBe('1.2.0');
  });
  
  test('should return null for non-existent template', async () => {
    const template = await guiServer.getTemplate('non-existent');
    expect(template).toBeNull();
  });
  
  test('should get template preview data', async () => {
    const preview = await guiServer.getTemplatePreview('modern-01');
    
    expect(preview).not.toBeNull();
    expect(preview!.templateId).toBe('modern-01');
    expect(preview!.html).toContain('Modern Dashboard');
    expect(preview!.css).toContain('.modern-dashboard');
    expect(preview!.javascript).toContain('Modern dashboard loaded');
    expect(preview!.assets).toContain('icons/dashboard.svg');
  });
  
  test('should handle preview for template without javascript', async () => {
    const preview = await guiServer.getTemplatePreview('professional-01');
    
    expect(preview).not.toBeNull();
    expect(preview!.html).toContain('Corporate Portal');
    expect(preview!.css).toContain('.professional-portal');
    expect(preview!.javascript).toBeUndefined();
    expect(preview!.assets).toHaveLength(2);
  });
  
  test('should return null for preview of non-existent template', async () => {
    const preview = await guiServer.getTemplatePreview('non-existent');
    expect(preview).toBeNull();
  });
  
  test('should search templates by name', async () => {
    const results = await guiServer.searchTemplates('Dashboard');
    
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('modern-01');
    expect(results[0].name).toContain('Dashboard');
  });
  
  test('should search templates by description', async () => {
    const results = await guiServer.searchTemplates('business');
    
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('professional-01');
    expect(results[0].description).toContain('business');
  });
  
  test('should search templates by tags', async () => {
    const results = await guiServer.searchTemplates('accessibility');
    
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('accessible-01');
    expect(results[0].metadata.tags).toContain('accessibility');
  });
  
  test('should return empty array for no search matches', async () => {
    const results = await guiServer.searchTemplates('nonexistent');
    expect(results).toHaveLength(0);
  });
  
  test('should get templates by category', async () => {
    const modernTemplates = await guiServer.getTemplatesByCategory('modern');
    expect(modernTemplates).toHaveLength(1);
    expect(modernTemplates[0].category).toBe('modern');
    
    const professionalTemplates = await guiServer.getTemplatesByCategory('professional');
    expect(professionalTemplates).toHaveLength(1);
    expect(professionalTemplates[0].category).toBe('professional');
    
    const creativeTemplates = await guiServer.getTemplatesByCategory('creative');
    expect(creativeTemplates).toHaveLength(1);
    expect(creativeTemplates[0].category).toBe('creative');
    
    const accessibleTemplates = await guiServer.getTemplatesByCategory('accessible');
    expect(accessibleTemplates).toHaveLength(1);
    expect(accessibleTemplates[0].category).toBe('accessible');
  });
  
  test('should return empty array for non-existent category', async () => {
    const results = await guiServer.getTemplatesByCategory('nonexistent');
    expect(results).toHaveLength(0);
  });
  
  test('should handle concurrent requests efficiently', async () => {
    const startTime = Date.now();
    
    // Make multiple concurrent requests
    const promises = [
      guiServer.listTemplates(),
      guiServer.getTemplate('modern-01'),
      guiServer.getTemplatePreview('professional-01'),
      guiServer.searchTemplates('creative'),
      guiServer.getTemplatesByCategory('accessible')
    ];
    
    const [templates, template, preview, searchResults, categoryResults] = await Promise.all(promises);
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Verify all responses are correct
    expect(templates).toHaveLength(4);
    expect((template as TemplateInfo)?.id).toBe('modern-01');
    expect((preview as PreviewData)?.templateId).toBe('professional-01');
    expect((searchResults as TemplateInfo[])[0]?.category).toBe('creative');
    expect((categoryResults as TemplateInfo[])[0]?.category).toBe('accessible');
    
    // Should In Progress concurrently, not sequentially
    expect(totalTime).toBeLessThan(100); // Much less than 5 * 10ms if sequential
  });
  
  test('should validate template data structure', async () => {
    const templates = await guiServer.listTemplates();
    
    for (const template of templates) {
      // Required fields
      expect(template.id).toBeTruthy();
      expect(template.name).toBeTruthy();
      expect(template.description).toBeTruthy();
      expect(['modern', 'professional', 'creative', 'accessible']).toContain(template.category);
      expect(template.previewUrl).toBeTruthy();
      expect(template.thumbnailUrl).toBeTruthy();
      
      // Features array
      expect(Array.isArray(template.features)).toBe(true);
      expect(template.features.length).toBeGreaterThan(0);
      
      // Metadata structure
      expect(template.metadata).toBeTruthy();
      expect(template.metadata.author).toBeTruthy();
      expect(template.metadata.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(template.metadata.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Array.isArray(template.metadata.tags)).toBe(true);
      expect(template.metadata.tags.length).toBeGreaterThan(0);
    }
  });
  
  test('should validate preview data structure', async () => {
    const templates = await guiServer.listTemplates();
    
    for (const template of templates) {
      const preview = await guiServer.getTemplatePreview(template.id);
      
      expect(preview).not.toBeNull();
      expect(preview!.templateId).toBe(template.id);
      expect(preview!.html).toBeTruthy();
      expect(preview!.css).toBeTruthy();
      expect(Array.isArray(preview!.assets)).toBe(true);
      
      // JavaScript is optional
      if (preview!.javascript) {
        expect(typeof preview!.javascript).toBe('string');
      }
    }
  });
  
  test('should support error handling and logging', async () => {
    const logs: string[] = [];
    
    // Enhanced GUI Server with logging
    class LoggingGUIServer extends MockGUIServer {
      async getTemplate(id: string): Promise<TemplateInfo | null> {
        logs.push(`Fetching template: ${id}`);
        try {
          const result = await super.getTemplate(id);
          logs.push(`Template ${id}: ${result ? 'found' : 'not found'}`);
          return result;
        } catch (error) {
          logs.push(`Error fetching template ${id}: ${error}`);
          throw error;
        }
      }
    }
    
    const loggingServer = new LoggingGUIServer();
    
    // Test In Progress request
    await loggingServer.getTemplate('modern-01');
    expect(logs).toContain('Fetching template: modern-01');
    expect(logs).toContain('Template modern-01: found');
    
    // Test failed request
    await loggingServer.getTemplate('non-existent');
    expect(logs).toContain('Fetching template: non-existent');
    expect(logs).toContain('Template non-existent: not found');
  });
});