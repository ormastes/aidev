/**
 * Template Service Unit Tests
 * Tests template service functionality without external dependencies
 */

import { TemplateService } from '../../src/services/TemplateService';

describe("TemplateService", () => {
  let templateService: TemplateService;

  beforeEach(() => {
    templateService = new TemplateService();
  });

  describe("listTemplates", () => {
    test('should return all available templates', async () => {
      const templates = await templateService.listTemplates();
      
      expect(templates).toHaveLength(4);
      expect(templates.map(t => t.id)).toEqual(
        expect.arrayContaining(['modern-01', 'professional-01', 'creative-01', 'accessible-01'])
      );

      // Verify template structure
      templates.forEach(template => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty("description");
        expect(template).toHaveProperty("category");
        expect(template).toHaveProperty("previewUrl");
        expect(template).toHaveProperty("thumbnailUrl");
        expect(template).toHaveProperty("features");
        expect(template).toHaveProperty("metadata");
        expect(Array.isArray(template.features)).toBe(true);
        expect(template.metadata).toHaveProperty('author');
        expect(template.metadata).toHaveProperty('version');
        expect(template.metadata).toHaveProperty("lastUpdated");
        expect(Array.isArray(template.metadata.tags)).toBe(true);
      });
    });

    test('should return deep copies to prevent mutation', async () => {
      const templates1 = await templateService.listTemplates();
      const templates2 = await templateService.listTemplates();
      
      // Modify one copy
      templates1[0].name = 'Modified Name';
      templates1[0].features.push('modified-feature');
      
      // Second copy should be unchanged
      expect(templates2[0].name).not.toBe('Modified Name');
      expect(templates2[0].features).not.toContain('modified-feature');
    });
  });

  describe("getTemplate", () => {
    test('should return specific template by ID', async () => {
      const template = await templateService.getTemplate('modern-01');
      
      expect(template).toBeDefined();
      expect(template!.id).toBe('modern-01');
      expect(template!.name).toBe('Modern Dashboard');
      expect(template!.category).toBe('modern');
      expect(template!.features).toContain("responsive");
      expect(template!.features).toContain('dark-mode');
      expect(template!.metadata.author).toBe('Design Team');
      expect(template!.metadata.tags).toContain("dashboard");
    });

    test('should return null for non-existent template', async () => {
      const template = await templateService.getTemplate('non-existent');
      expect(template).toBeNull();
    });

    test('should return null for empty string ID', async () => {
      const template = await templateService.getTemplate('');
      expect(template).toBeNull();
    });
  });

  describe("getTemplatePreview", () => {
    test('should return preview data for existing template', async () => {
      const preview = await templateService.getTemplatePreview('modern-01');
      
      expect(preview).toBeDefined();
      expect(preview!.templateId).toBe('modern-01');
      expect(preview!.html).toContain('modern-dashboard');
      expect(preview!.css).toContain('.modern-dashboard');
      expect(preview!.javascript).toContain('Modern dashboard loaded');
      expect(Array.isArray(preview!.assets)).toBe(true);
      expect(preview!.assets.length).toBeGreaterThan(0);
    });

    test('should return creative template with animations', async () => {
      const preview = await templateService.getTemplatePreview('creative-01');
      
      expect(preview).toBeDefined();
      expect(preview!.html).toContain('creative-showcase');
      expect(preview!.css).toContain('linear-gradient');
      expect(preview!.css).toContain('@keyframes glitch');
      expect(preview!.javascript).toContain('Creative portfolio ready');
      expect(preview!.assets).toContain('art/painting1.jpg');
    });

    test('should return accessible template with WCAG features', async () => {
      const preview = await templateService.getTemplatePreview('accessible-01');
      
      expect(preview).toBeDefined();
      expect(preview!.html).toContain('skip-link');
      expect(preview!.html).toContain('role="banner"');
      expect(preview!.html).toContain('aria-label');
      expect(preview!.css).toContain('focus');
      expect(preview!.css).toContain('outline');
      expect(preview!.assets).toContain('audio/screen-reader.mp3');
    });

    test('should return null for non-existent template preview', async () => {
      const preview = await templateService.getTemplatePreview('non-existent');
      expect(preview).toBeNull();
    });
  });

  describe("searchTemplates", () => {
    test('should find templates by name', async () => {
      const results = await templateService.searchTemplates("dashboard");
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('modern-01');
      expect(results[0].name).toBe('Modern Dashboard');
    });

    test('should find templates by description', async () => {
      const results = await templateService.searchTemplates('WCAG');
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('accessible-01');
      expect(results[0].description).toContain('WCAG 2.1 AA');
    });

    test('should find templates by tags', async () => {
      const results = await templateService.searchTemplates("portfolio");
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('creative-01');
      expect(results[0].metadata.tags).toContain("portfolio");
    });

    test('should be case insensitive', async () => {
      const lowerResults = await templateService.searchTemplates("corporate");
      const upperResults = await templateService.searchTemplates("CORPORATE");
      const mixedResults = await templateService.searchTemplates("Corporate");
      
      expect(lowerResults).toHaveLength(1);
      expect(upperResults).toHaveLength(1);
      expect(mixedResults).toHaveLength(1);
      expect(lowerResults[0].id).toBe('professional-01');
      expect(upperResults[0].id).toBe('professional-01');
      expect(mixedResults[0].id).toBe('professional-01');
    });

    test('should return empty array for no matches', async () => {
      const results = await templateService.searchTemplates("nonexistent");
      expect(results).toHaveLength(0);
      expect(Array.isArray(results)).toBe(true);
    });

    test('should handle empty search query', async () => {
      const results = await templateService.searchTemplates('');
      // Empty query matches all templates (includes('') returns true)
      expect(results).toHaveLength(4);
    });

    test('should find multiple matches', async () => {
      const results = await templateService.searchTemplates('design');
      
      // Should match templates with 'design' in name, description, or tags
      expect(results.length).toBeGreaterThan(0);
      results.forEach(template => {
        const hasMatch = 
          template.name.toLowerCase().includes('design') ||
          template.description.toLowerCase().includes('design') ||
          template.metadata.tags.some(tag => tag.toLowerCase().includes('design'));
        expect(hasMatch).toBe(true);
      });
    });
  });

  describe("getTemplatesByCategory", () => {
    test('should return templates for modern category', async () => {
      const templates = await templateService.getTemplatesByCategory('modern');
      
      expect(templates).toHaveLength(1);
      expect(templates[0].id).toBe('modern-01');
      expect(templates[0].category).toBe('modern');
    });

    test('should return templates for professional category', async () => {
      const templates = await templateService.getTemplatesByCategory("professional");
      
      expect(templates).toHaveLength(1);
      expect(templates[0].id).toBe('professional-01');
      expect(templates[0].category).toBe("professional");
    });

    test('should return templates for creative category', async () => {
      const templates = await templateService.getTemplatesByCategory("creative");
      
      expect(templates).toHaveLength(1);
      expect(templates[0].id).toBe('creative-01');
      expect(templates[0].category).toBe("creative");
    });

    test('should return templates for accessible category', async () => {
      const templates = await templateService.getTemplatesByCategory("accessible");
      
      expect(templates).toHaveLength(1);
      expect(templates[0].id).toBe('accessible-01');
      expect(templates[0].category).toBe("accessible");
    });

    test('should return empty array for non-existent category', async () => {
      const templates = await templateService.getTemplatesByCategory("nonexistent");
      expect(templates).toHaveLength(0);
      expect(Array.isArray(templates)).toBe(true);
    });

    test('should be case sensitive for categories', async () => {
      const templates = await templateService.getTemplatesByCategory('Modern');
      expect(templates).toHaveLength(0);
    });
  });

  describe('async behavior', () => {
    test('should simulate async delay in all methods', async () => {
      const start = Date.now();
      
      await templateService.listTemplates();
      
      const duration = Date.now() - start;
      expect(duration).toBeGreaterThanOrEqual(10); // At least 10ms delay
    });

    test('should handle concurrent requests', async () => {
      const promises = [
        templateService.getTemplate('modern-01'),
        templateService.getTemplate('professional-01'),
        templateService.getTemplatePreview('creative-01'),
        templateService.searchTemplates('design'),
        templateService.getTemplatesByCategory("accessible")
      ];
      
      const results = await Promise.all(promises);
      
      expect(results[0]).toBeDefined();
      expect(results[1]).toBeDefined();
      expect(results[2]).toBeDefined();
      expect(Array.isArray(results[3])).toBe(true);
      expect(Array.isArray(results[4])).toBe(true);
    });
  });

  describe('data integrity', () => {
    test('should maintain consistent data across methods', async () => {
      const allTemplates = await templateService.listTemplates();
      const modernTemplate = await templateService.getTemplate('modern-01');
      const modernPreview = await templateService.getTemplatePreview('modern-01');
      
      expect(allTemplates.find(t => t.id === 'modern-01')).toEqual(modernTemplate);
      expect(modernPreview!.templateId).toBe(modernTemplate!.id);
    });

    test('should have valid URLs and paths', async () => {
      const templates = await templateService.listTemplates();
      
      templates.forEach(template => {
        expect(template.previewUrl).toMatch(/^\/templates\/[^/]+\/preview$/);
        expect(template.thumbnailUrl).toMatch(/^\/templates\/[^/]+\/thumbnail\.\w+$/);
      });
    });

    test('should have consistent feature and tag arrays', async () => {
      const templates = await templateService.listTemplates();
      
      templates.forEach(template => {
        expect(template.features.length).toBeGreaterThan(0);
        expect(template.metadata.tags.length).toBeGreaterThan(0);
      });
    });
  });
});