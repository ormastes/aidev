// Mock TemplateService before importing the router
const mockTemplateService = {
  listTemplates: jest.fn(),
  getTemplate: jest.fn(),
  getTemplatePreview: jest.fn(),
  searchTemplates: jest.fn(),
  getTemplatesByCategory: jest.fn()
};

jest.mock('../../../src/services/TemplateService', () => ({
  TemplateService: jest.fn(() => mockTemplateService)
}));
jest.mock('../../../src/utils/logger');

import request from "supertest";
import express from 'express';
import { templateRouter } from '../../../src/routes/templates';

describe('templates routes', () => {
  let app: express.Application;
  
  const mockTemplates = [
    {
      id: 'modern-01',
      name: 'Modern Dashboard',
      description: 'Clean and minimalist design',
      category: 'modern' as const,
      previewUrl: '/templates/modern-01/preview',
      thumbnailUrl: '/templates/modern-01/thumbnail.jpg',
      features: ["responsive", 'dark-mode'],
      metadata: { author: 'Design Team', version: '1.0.0', lastUpdated: '2024-01-15', tags: ['modern'] }
    }
  ];

  const mockPreview = {
    templateId: 'modern-01',
    html: '<div>Preview HTML</div>',
    css: '.preview { color: blue; }',
    javascript: 'console.log("preview");',
    assets: ['icon.svg']
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create Express app
    app = express();
    app.use(express.json());
    app.use('/templates', templateRouter);
  });

  describe('GET /templates', () => {
    it('should list all templates', async () => {
      mockTemplateService.listTemplates.mockResolvedValue(mockTemplates);
      
      const response = await request(app)
        .get('/templates')
        .expect(200);
      
      expect(mockTemplateService.listTemplates).toHaveBeenCalled();
      expect(response.body).toEqual(mockTemplates);
    });

    it('should handle errors when listing templates', async () => {
      const error = new Error('Database error');
      mockTemplateService.listTemplates.mockRejectedValue(error);
      
      const response = await request(app)
        .get('/templates')
        .expect(500);
      
      expect(response.body).toEqual({ error: 'Failed to list templates' });
    });
  });

  describe('GET /templates/search', () => {
    it('should search templates with query parameter', async () => {
      mockTemplateService.searchTemplates.mockResolvedValue(mockTemplates);
      
      const response = await request(app)
        .get('/templates/search?q=modern')
        .expect(200);
      
      expect(mockTemplateService.searchTemplates).toHaveBeenCalledWith('modern');
      expect(response.body).toEqual(mockTemplates);
    });

    it('should return 400 when query parameter is missing', async () => {
      const response = await request(app)
        .get('/templates/search')
        .expect(400);
      
      expect(response.body).toEqual({ error: 'Query parameter "q" is required' });
      expect(mockTemplateService.searchTemplates).not.toHaveBeenCalled();
    });

    it('should return 400 when query parameter is empty', async () => {
      const response = await request(app)
        .get('/templates/search?q=')
        .expect(400);
      
      expect(response.body).toEqual({ error: 'Query parameter "q" is required' });
    });

    it('should handle errors when searching templates', async () => {
      const error = new Error('Search failed');
      mockTemplateService.searchTemplates.mockRejectedValue(error);
      
      const response = await request(app)
        .get('/templates/search?q=test')
        .expect(500);
      
      expect(response.body).toEqual({ error: 'Failed to search templates' });
    });
  });

  describe('GET /templates/category/:category', () => {
    it('should get templates by category', async () => {
      mockTemplateService.getTemplatesByCategory.mockResolvedValue(mockTemplates);
      
      const response = await request(app)
        .get('/templates/category/modern')
        .expect(200);
      
      expect(mockTemplateService.getTemplatesByCategory).toHaveBeenCalledWith('modern');
      expect(response.body).toEqual(mockTemplates);
    });

    it('should handle different categories', async () => {
      const categories = ["professional", "creative", "accessible"];
      
      for (const category of categories) {
        mockTemplateService.getTemplatesByCategory.mockResolvedValue([]);
        
        const response = await request(app)
          .get(`/templates/category/${category}`)
          .expect(200);
        
        expect(mockTemplateService.getTemplatesByCategory).toHaveBeenCalledWith(category);
        expect(response.body).toEqual([]);
      }
    });

    it('should handle errors when getting templates by category', async () => {
      const error = new Error('Category search failed');
      mockTemplateService.getTemplatesByCategory.mockRejectedValue(error);
      
      const response = await request(app)
        .get('/templates/category/modern')
        .expect(500);
      
      expect(response.body).toEqual({ error: 'Failed to get templates by category' });
    });
  });

  describe('GET /templates/:id', () => {
    it('should get template by id', async () => {
      mockTemplateService.getTemplate.mockResolvedValue(mockTemplates[0]);
      
      const response = await request(app)
        .get('/templates/modern-01')
        .expect(200);
      
      expect(mockTemplateService.getTemplate).toHaveBeenCalledWith('modern-01');
      expect(response.body).toEqual(mockTemplates[0]);
    });

    it('should return 404 when template not found', async () => {
      mockTemplateService.getTemplate.mockResolvedValue(null);
      
      const response = await request(app)
        .get('/templates/non-existent')
        .expect(404);
      
      expect(response.body).toEqual({ error: 'Template not found' });
    });

    it('should handle errors when getting template', async () => {
      const error = new Error('Database error');
      mockTemplateService.getTemplate.mockRejectedValue(error);
      
      const response = await request(app)
        .get('/templates/modern-01')
        .expect(500);
      
      expect(response.body).toEqual({ error: 'Failed to get template' });
    });
  });

  describe('GET /templates/:id/preview', () => {
    it('should get template preview', async () => {
      mockTemplateService.getTemplatePreview.mockResolvedValue(mockPreview);
      
      const response = await request(app)
        .get('/templates/modern-01/preview')
        .expect(200);
      
      expect(mockTemplateService.getTemplatePreview).toHaveBeenCalledWith('modern-01');
      expect(response.body).toEqual(mockPreview);
    });

    it('should return 404 when template preview not found', async () => {
      mockTemplateService.getTemplatePreview.mockResolvedValue(null);
      
      const response = await request(app)
        .get('/templates/non-existent/preview')
        .expect(404);
      
      expect(response.body).toEqual({ error: 'Template preview not found' });
    });

    it('should handle errors when getting template preview', async () => {
      const error = new Error('Preview generation failed');
      mockTemplateService.getTemplatePreview.mockRejectedValue(error);
      
      const response = await request(app)
        .get('/templates/modern-01/preview')
        .expect(500);
      
      expect(response.body).toEqual({ error: 'Failed to get template preview' });
    });
  });

  describe('route order', () => {
    it('should handle /search before /:id', async () => {
      mockTemplateService.searchTemplates.mockResolvedValue([]);
      
      const response = await request(app)
        .get('/templates/search?q=test')
        .expect(200);
      
      // Should call searchTemplates, not getTemplate with 'search' as id
      expect(mockTemplateService.searchTemplates).toHaveBeenCalledWith('test');
      expect(mockTemplateService.getTemplate).not.toHaveBeenCalled();
    });

    it('should handle /category/:category before /:id', async () => {
      mockTemplateService.getTemplatesByCategory.mockResolvedValue([]);
      
      const response = await request(app)
        .get('/templates/category/modern')
        .expect(200);
      
      // Should call getTemplatesByCategory, not getTemplate with "category" as id
      expect(mockTemplateService.getTemplatesByCategory).toHaveBeenCalledWith('modern');
      expect(mockTemplateService.getTemplate).not.toHaveBeenCalled();
    });
  });
});