import { TemplateService } from '../../../src/services/TemplateService';
// Template types are used in mocked implementations
import { logger } from '../../../src/utils/logger';

// Mock dependencies
jest.mock('../../../src/utils/logger');

describe("TemplateService", () => {
  let service: TemplateService;
  // Logger is mocked globally

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TemplateService();
    // Speed up tests by mocking setTimeout
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("listTemplates", () => {
    it('should return all available templates', async () => {
      const templatesPromise = service.listTemplates();
      jest.runAllTimers();
      const templates = await templatesPromise;
      
      expect(templates).toHaveLength(4);
      expect(templates.map(t => t.id)).toEqual([
        'modern-01',
        'professional-01',
        'creative-01',
        'accessible-01'
      ]);
    });

    it('should return copies of templates to prevent mutation', async () => {
      const templatesPromise1 = service.listTemplates();
      jest.runAllTimers();
      const templates1 = await templatesPromise1;
      
      // Store original name
      const originalName = templates1[0].name;
      
      // Modify first result
      templates1[0].name = 'Modified Name';
      
      // Get templates again
      const templatesPromise2 = service.listTemplates();
      jest.runAllTimers();
      const templates2 = await templatesPromise2;
      
      // Second result should not be affected
      expect(templates2[0].name).toBe(originalName);
      expect(templates1).not.toBe(templates2);
    });

    it('should include all required template properties', async () => {
      const templatesPromise = service.listTemplates();
      jest.runAllTimers();
      const templates = await templatesPromise;
      
      templates.forEach(template => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty("description");
        expect(template).toHaveProperty("category");
        expect(template).toHaveProperty("previewUrl");
        expect(template).toHaveProperty("thumbnailUrl");
        expect(template).toHaveProperty("features");
        expect(template).toHaveProperty("metadata");
        expect(template.metadata).toHaveProperty('author');
        expect(template.metadata).toHaveProperty('version');
        expect(template.metadata).toHaveProperty("lastUpdated");
        expect(template.metadata).toHaveProperty('tags');
      });
    });
  });

  describe("getTemplate", () => {
    it('should return template by id', async () => {
      const templatePromise = service.getTemplate('modern-01');
      jest.runAllTimers();
      const template = await templatePromise;
      
      expect(template).toMatchObject({
        id: 'modern-01',
        name: 'Modern Dashboard',
        category: 'modern'
      });
    });

    it('should return null for non-existent template', async () => {
      const templatePromise = service.getTemplate('non-existent');
      jest.runAllTimers();
      const template = await templatePromise;
      
      expect(template).toBeNull();
    });

    it('should handle all template categories', async () => {
      const categories = ['modern-01', 'professional-01', 'creative-01', 'accessible-01'];
      
      for (const id of categories) {
        const templatePromise = service.getTemplate(id);
        jest.runAllTimers();
        const template = await templatePromise;
        
        expect(template).not.toBeNull();
        expect(template?.id).toBe(id);
      }
    });
  });

  describe("getTemplatePreview", () => {
    it('should return preview data for existing template', async () => {
      const previewPromise = service.getTemplatePreview('modern-01');
      jest.runAllTimers();
      const preview = await previewPromise;
      
      expect(preview).toMatchObject({
        templateId: 'modern-01',
        html: expect.stringContaining('modern-dashboard'),
        css: expect.stringContaining('.modern-dashboard'),
        javascript: expect.any(String),
        assets: expect.arrayContaining(['icons/dashboard.svg'])
      });
    });

    it('should return null for non-existent template preview', async () => {
      const previewPromise = service.getTemplatePreview('non-existent');
      jest.runAllTimers();
      const preview = await previewPromise;
      
      expect(preview).toBeNull();
    });

    it('should include proper HTML structure in previews', async () => {
      const templateIds = ['modern-01', 'professional-01', 'creative-01', 'accessible-01'];
      
      for (const id of templateIds) {
        const previewPromise = service.getTemplatePreview(id);
        jest.runAllTimers();
        const preview = await previewPromise;
        
        expect(preview?.html).toContain('<div');
        expect(preview?.html).toContain('</div>');
        expect(preview?.css).toBeTruthy();
      }
    });

    it('should include accessibility features in accessible template', async () => {
      const previewPromise = service.getTemplatePreview('accessible-01');
      jest.runAllTimers();
      const preview = await previewPromise;
      
      expect(preview?.html).toContain('role="banner"');
      expect(preview?.html).toContain('role="navigation"');
      expect(preview?.html).toContain('role="main"');
      expect(preview?.html).toContain('aria-label');
      expect(preview?.html).toContain('skip-link');
    });
  });

  describe("searchTemplates", () => {
    it('should find templates by name', async () => {
      const searchPromise = service.searchTemplates('modern');
      jest.runAllTimers();
      const results = await searchPromise;
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('modern-01');
    });

    it('should find templates by description', async () => {
      const searchPromise = service.searchTemplates("minimalist");
      jest.runAllTimers();
      const results = await searchPromise;
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('modern-01');
    });

    it('should find templates by tags', async () => {
      const searchPromise = service.searchTemplates("portfolio");
      jest.runAllTimers();
      const results = await searchPromise;
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('creative-01');
    });

    it('should be case insensitive', async () => {
      const searchPromise1 = service.searchTemplates('MODERN');
      jest.runAllTimers();
      const results1 = await searchPromise1;
      
      const searchPromise2 = service.searchTemplates('modern');
      jest.runAllTimers();
      const results2 = await searchPromise2;
      
      expect(results1).toEqual(results2);
    });

    it('should return empty array for no matches', async () => {
      const searchPromise = service.searchTemplates("nonexistent");
      jest.runAllTimers();
      const results = await searchPromise;
      
      expect(results).toEqual([]);
    });

    it('should find multiple templates with common terms', async () => {
      const searchPromise = service.searchTemplates('design');
      jest.runAllTimers();
      const results = await searchPromise;
      
      expect(results.length).toBeGreaterThan(1);
      expect(results.some(t => t.id === 'modern-01')).toBe(true);
      expect(results.some(t => t.id === 'creative-01')).toBe(true);
    });

    it('should handle partial matches', async () => {
      const searchPromise = service.searchTemplates('corp');
      jest.runAllTimers();
      const results = await searchPromise;
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('professional-01');
    });
  });

  describe("getTemplatesByCategory", () => {
    it('should return templates for modern category', async () => {
      const templatesPromise = service.getTemplatesByCategory('modern');
      jest.runAllTimers();
      const templates = await templatesPromise;
      
      expect(templates).toHaveLength(1);
      expect(templates[0].id).toBe('modern-01');
    });

    it('should return templates for professional category', async () => {
      const templatesPromise = service.getTemplatesByCategory("professional");
      jest.runAllTimers();
      const templates = await templatesPromise;
      
      expect(templates).toHaveLength(1);
      expect(templates[0].id).toBe('professional-01');
    });

    it('should return templates for creative category', async () => {
      const templatesPromise = service.getTemplatesByCategory("creative");
      jest.runAllTimers();
      const templates = await templatesPromise;
      
      expect(templates).toHaveLength(1);
      expect(templates[0].id).toBe('creative-01');
    });

    it('should return templates for accessible category', async () => {
      const templatesPromise = service.getTemplatesByCategory("accessible");
      jest.runAllTimers();
      const templates = await templatesPromise;
      
      expect(templates).toHaveLength(1);
      expect(templates[0].id).toBe('accessible-01');
    });

    it('should return empty array for non-existent category', async () => {
      const templatesPromise = service.getTemplatesByCategory('non-existent');
      jest.runAllTimers();
      const templates = await templatesPromise;
      
      expect(templates).toEqual([]);
    });

    it('should be case sensitive for categories', async () => {
      const templatesPromise = service.getTemplatesByCategory('Modern');
      jest.runAllTimers();
      const templates = await templatesPromise;
      
      expect(templates).toEqual([]);
    });
  });

  describe('template data validation', () => {
    it('should have valid preview URLs for all templates', async () => {
      const templatesPromise = service.listTemplates();
      jest.runAllTimers();
      const templates = await templatesPromise;
      
      templates.forEach(template => {
        expect(template.previewUrl).toMatch(/^\/templates\/[a-z]+-\d+\/preview$/);
      });
    });

    it('should have valid thumbnail URLs for all templates', async () => {
      const templatesPromise = service.listTemplates();
      jest.runAllTimers();
      const templates = await templatesPromise;
      
      templates.forEach(template => {
        expect(template.thumbnailUrl).toMatch(/^\/templates\/[a-z]+-\d+\/thumbnail\.jpg$/);
      });
    });

    it('should have consistent template IDs and preview data', async () => {
      const templatesPromise = service.listTemplates();
      jest.runAllTimers();
      const templates = await templatesPromise;
      
      for (const template of templates) {
        const previewPromise = service.getTemplatePreview(template.id);
        jest.runAllTimers();
        const preview = await previewPromise;
        
        expect(preview).not.toBeNull();
        expect(preview?.templateId).toBe(template.id);
      }
    });

    it('should have non-empty features for all templates', async () => {
      const templatesPromise = service.listTemplates();
      jest.runAllTimers();
      const templates = await templatesPromise;
      
      templates.forEach(template => {
        expect(template.features).toBeInstanceOf(Array);
        expect(template.features.length).toBeGreaterThan(0);
      });
    });
  });

  describe("simulateDelay", () => {
    it('should add consistent delay to all operations', async () => {
      const operations = [
        service.listTemplates(),
        service.getTemplate('modern-01'),
        service.getTemplatePreview('modern-01'),
        service.searchTemplates('test'),
        service.getTemplatesByCategory('modern')
      ];

      // All operations should be pending
      operations.forEach(op => {
        expect(op).toBeInstanceOf(Promise);
      });

      // Fast-forward timers
      jest.runAllTimers();

      // All operations should resolve
      await Promise.all(operations);
    });
  });
});