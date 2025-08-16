/**
 * Unit tests for Template Manager
 */

import { TemplateManager } from '../../src/template-manager';
import { Template, TemplateType } from '../../src/types';
import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';

jest.mock('fs');

describe("TemplateManager", () => {
  let templateManager: TemplateManager;
  let mockFs: jest.Mocked<typeof fs>;

  beforeEach(() => {
    templateManager = new TemplateManager();
    mockFs = fs as jest.Mocked<typeof fs>;
    jest.clearAllMocks();
  });

  describe("loadTemplate", () => {
    it('should load TypeScript template', async () => {
      const mockTemplate = {
        name: "typescript",
        files: {
          'App.tsx': 'import React from "react";',
          'tsconfig.json': '{}'
        }
      };

      mockFs.promises = {
        readFile: jest.fn().mockResolvedValue(JSON.stringify(mockTemplate))
      } as any;

      const template = await templateManager.loadTemplate("typescript");

      expect(template.name).toBe("typescript");
      expect(template.files).toHaveProperty('App.tsx');
      expect(template.files).toHaveProperty('tsconfig.json');
    });

    it('should throw error for invalid template', async () => {
      mockFs.promises = {
        readFile: jest.fn().mockRejectedValue(new Error('File not found'))
      } as any;

      await expect(templateManager.loadTemplate('invalid')).rejects.toThrow();
    });
  });

  describe("applyTemplate", () => {
    it('should write all template files', async () => {
      const template: Template = {
        name: "typescript",
        type: TemplateType.TYPESCRIPT,
        files: {
          'App.tsx': 'export default App;',
          'index.js': 'AppRegistry.registerComponent();'
        }
      };

      mockFs.promises = {
        writeFile: jest.fn().mockResolvedValue(undefined)
      } as any;

      await templateManager.applyTemplate(template, '/tmp/app');

      expect(mockFs.promises.writeFile).toHaveBeenCalledTimes(2);
      expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
        '/tmp/app/App.tsx',
        'export default App;',
        'utf8'
      );
    });

    it('should replace template variables', async () => {
      const template: Template = {
        name: "typescript",
        type: TemplateType.TYPESCRIPT,
        files: {
          'package.json': '{"name": "{{PROJECT_NAME}}"}'
        }
      };

      mockFs.promises = {
        writeFile: jest.fn().mockResolvedValue(undefined)
      } as any;

      await templateManager.applyTemplate(template, '/tmp/app', {
        PROJECT_NAME: 'MyApp'
      });

      expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
        '/tmp/app/package.json',
        '{"name": "MyApp"}',
        'utf8'
      );
    });
  });

  describe("getAvailableTemplates", () => {
    it('should return list of available templates', async () => {
      mockFs.promises = {
        readdir: jest.fn().mockResolvedValue([
          'typescript.json',
          'javascript.json',
          'README.md'
        ])
      } as any;

      const templates = await templateManager.getAvailableTemplates();

      expect(templates).toEqual(["typescript", "javascript"]);
      expect(templates).not.toContain('README');
    });
  });

  describe("validateTemplate", () => {
    it('should validate correct template structure', () => {
      const validTemplate: Template = {
        name: 'test',
        type: TemplateType.JAVASCRIPT,
        files: {
          'App.js': 'content'
        }
      };

      expect(() => templateManager.validateTemplate(validTemplate)).not.toThrow();
    });

    it('should reject template without files', () => {
      const invalidTemplate = {
        name: 'test',
        type: TemplateType.JAVASCRIPT,
        files: {}
      } as Template;

      expect(() => templateManager.validateTemplate(invalidTemplate))
        .toThrow('Template must contain at least one file');
    });

    it('should reject template without name', () => {
      const invalidTemplate = {
        type: TemplateType.JAVASCRIPT,
        files: { 'App.js': 'content' }
      } as any;

      expect(() => templateManager.validateTemplate(invalidTemplate))
        .toThrow('Template must have a name');
    });
  });

  describe("mergeTemplates", () => {
    it('should merge multiple templates', () => {
      const base: Template = {
        name: 'base',
        type: TemplateType.JAVASCRIPT,
        files: {
          'App.js': 'base content',
          'index.js': 'base index'
        }
      };

      const addon: Template = {
        name: 'addon',
        type: TemplateType.JAVASCRIPT,
        files: {
          'App.js': 'addon content', // Override
          'extra.js': 'extra file'   // New file
        }
      };

      const merged = templateManager.mergeTemplates(base, addon);

      expect(merged.files['App.js']).toBe('addon content');
      expect(merged.files['index.js']).toBe('base index');
      expect(merged.files['extra.js']).toBe('extra file');
    });
  });
});