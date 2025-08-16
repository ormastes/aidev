/**
 * Unit tests for React Native project generator
 */

import { ProjectGenerator } from '../../src/project-generator';
import { ProjectConfig } from '../../src/types';
import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';

jest.mock('fs');
jest.mock('child_process');

describe('ProjectGenerator', () => {
  let generator: ProjectGenerator;
  let mockFs: jest.Mocked<typeof fs>;
  
  beforeEach(() => {
    generator = new ProjectGenerator();
    mockFs = fs as jest.Mocked<typeof fs>;
    jest.clearAllMocks();
  });

  describe('generateProject', () => {
    it('should create project with valid config', async () => {
      const config: ProjectConfig = {
        name: 'TestApp',
        template: 'typescript',
        outputDir: '/tmp/test-app'
      };

      mockFs.existsSync.mockReturnValue(false);
      mockFs.promises = {
        mkdir: jest.fn().mockResolvedValue(undefined),
        writeFile: jest.fn().mockResolvedValue(undefined),
      } as any;

      const result = await generator.generateProject(config);

      expect(result.success).toBe(true);
      expect(result.projectPath).toBe('/tmp/test-app/TestApp');
      expect(mockFs.promises.mkdir).toHaveBeenCalled();
    });

    it('should throw error for invalid project name', async () => {
      const config: ProjectConfig = {
        name: '123-invalid',
        template: 'typescript',
        outputDir: '/tmp'
      };

      await expect(generator.generateProject(config)).rejects.toThrow('Invalid project name');
    });

    it('should handle existing directory', async () => {
      const config: ProjectConfig = {
        name: 'ExistingApp',
        template: 'typescript',
        outputDir: '/tmp'
      };

      mockFs.existsSync.mockReturnValue(true);

      await expect(generator.generateProject(config)).rejects.toThrow('already exists');
    });
  });

  describe('validateProjectName', () => {
    it('should validate correct project names', () => {
      expect(generator.validateProjectName('MyApp')).toBe(true);
      expect(generator.validateProjectName('TestApp123')).toBe(true);
      expect(generator.validateProjectName('my_app')).toBe(true);
    });

    it('should reject invalid project names', () => {
      expect(generator.validateProjectName('123App')).toBe(false);
      expect(generator.validateProjectName('my-app')).toBe(false);
      expect(generator.validateProjectName('My App')).toBe(false);
      expect(generator.validateProjectName('')).toBe(false);
    });
  });

  describe('createProjectStructure', () => {
    it('should create all required directories', async () => {
      const projectPath = '/tmp/test-app';
      mockFs.promises = {
        mkdir: jest.fn().mockResolvedValue(undefined),
      } as any;

      await generator.createProjectStructure(projectPath);

      expect(mockFs.promises.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('src'),
        expect.any(Object)
      );
      expect(mockFs.promises.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('components'),
        expect.any(Object)
      );
      expect(mockFs.promises.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('screens'),
        expect.any(Object)
      );
    });
  });

  describe('generatePackageJson', () => {
    it('should generate correct package.json content', () => {
      const packageJson = generator.generatePackageJson('TestApp', 'typescript');

      expect(packageJson.name).toBe('TestApp');
      expect(packageJson.version).toBe('0.1.0');
      expect(packageJson.dependencies).toHaveProperty('react');
      expect(packageJson.dependencies).toHaveProperty('react-native');
      expect(packageJson.devDependencies).toHaveProperty('typescript');
    });

    it('should include TypeScript dependencies for TS template', () => {
      const packageJson = generator.generatePackageJson('TestApp', 'typescript');

      expect(packageJson.devDependencies).toHaveProperty('@types/react');
      expect(packageJson.devDependencies).toHaveProperty('@types/react-native');
    });

    it('should not include TypeScript for JS template', () => {
      const packageJson = generator.generatePackageJson('TestApp', 'javascript');

      expect(packageJson.devDependencies).not.toHaveProperty('typescript');
      expect(packageJson.devDependencies).not.toHaveProperty('@types/react');
    });
  });
});