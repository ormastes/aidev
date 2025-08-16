/**
 * System test for freeze validation in filesystem MCP
 * Tests that root directory file creation is properly blocked
 */

import { FilesystemMCPServer } from '../../mcp-server';
import { path } from '../../../infra_external-log-lib/src';
import * as fs from 'fs/promises';
import { VFFileStructureWrapper } from '../../dist/children/VFFileStructureWrapper';

describe('Freeze Validation System Test', () => {
  let server: FilesystemMCPServer;
  let testBasePath: string;
  let structureWrapper: VFFileStructureWrapper;

  beforeEach(async () => {
    // Create a test directory
    testBasePath = path.join(__dirname, 'test-freeze-validation');
    await fs.mkdir(testBasePath, { recursive: true });
    
    // Copy FILE_STRUCTURE.vf.json to test directory
    const structureContent = await fs.readFile(
      path.join(__dirname, '../../../../../../FILE_STRUCTURE.vf.json'),
      'utf-8'
    );
    await fs.writeFile(
      path.join(testBasePath, 'FILE_STRUCTURE.vf.json'),
      structureContent
    );
    
    // Create server instance
    server = new FilesystemMCPServer(testBasePath);
    structureWrapper = new VFFileStructureWrapper(testBasePath);
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testBasePath, { recursive: true, force: true });
  });

  describe('Root directory freeze validation', () => {
    it('should block file creation at root level', async () => {
      // Given: The system is in a valid state
      // When: block file creation at root level
      // Then: The expected behavior occurs
      // Test various unauthorized root files
      const unauthorizedFiles = [
        'test-file.js',
        'random-script.sh',
        'demo.png',
        'unauthorized.md'
      ];

      for (const file of unauthorizedFiles) {
        const result = await server.handleRequest('vf_write', {
          file,
          content: 'test content'
        });

        expect(result).toMatchObject({
          error: expect.stringContaining('frozen')
        });
      }
    });

    it('should allow platform-specific files at root', async () => {
      // Given: The system is in a valid state
      // When: allow platform-specific files at root
      // Then: The expected behavior occurs
      // Test platform-specific files that should be allowed
      const platformFiles = [
        { file: 'package.json', content: '{"name": "test"}' },
        { file: 'package-lock.json', content: '{}' },
        { file: '.gitignore', content: 'node_modules' }
      ];

      for (const { file, content } of platformFiles) {
        const result = await server.handleRequest('vf_write', {
          file,
          content
        });

        // Platform files should be allowed
        expect(result.error).toBeUndefined();
      }
    });

    it('should allow required root files', async () => {
      // Given: The system is in a valid state
      // When: allow required root files
      // Then: The expected behavior occurs
      // Test required root files from FILE_STRUCTURE.vf.json
      const requiredFiles = [
        { file: 'CLAUDE.md', content: '# Claude Config' },
        { file: 'README.md', content: '# Project' },
        { file: 'TASK_QUEUE.vf.json', content: '{"queues": {}}' }
      ];

      for (const { file, content } of requiredFiles) {
        const result = await server.handleRequest('vf_write', {
          file,
          content
        });

        expect(result.error).toBeUndefined();
      }
    });

    it('should allow files in gen/doc/', async () => {
      // Given: The system is in a valid state
      // When: allow files in gen/doc/
      // Then: The expected behavior occurs
      const result = await server.handleRequest('vf_write', {
        file: 'gen/doc/report.md',
        content: '# Report'
      });

      expect(result.error).toBeUndefined();
    });

    it('should return helpful freeze message', async () => {
      // Given: The system is in a valid state
      // When: return helpful freeze message
      // Then: The expected behavior occurs
      const result = await server.handleRequest('vf_write', {
        file: 'unauthorized-file.txt',
        content: 'test'
      });

      expect(result).toMatchObject({
        error: expect.stringContaining('Root directory is frozen'),
        suggestion: expect.stringContaining('gen/doc/')
      });
    });
  });

  describe('Theme directory freeze validation', () => {
    it('should block direct file creation in theme root', async () => {
      // Given: The system is in a valid state
      // When: block direct file creation in theme root
      // Then: The expected behavior occurs
      // First create theme structure
      await fs.mkdir(path.join(testBasePath, 'layer/themes/test-theme'), { 
        recursive: true 
      });

      const result = await server.handleRequest('vf_write', {
        file: 'layer/themes/test-theme/random-file.js',
        content: 'test'
      });

      expect(result).toMatchObject({
        error: expect.stringContaining('frozen')
      });
    });

    it('should allow files in theme subdirectories', async () => {
      // Given: The system is in a valid state
      // When: allow files in theme subdirectories
      // Then: The expected behavior occurs
      const result = await server.handleRequest('vf_write', {
        file: 'layer/themes/test-theme/children/component.ts',
        content: 'export class Component {}'
      });

      expect(result.error).toBeUndefined();
    });
  });

  describe('Direct wrapper usage', () => {
    it('should validate freeze when using VFFileStructureWrapper directly', async () => {
      // Given: The system is in a valid state
      // When: validate freeze when using VFFileStructureWrapper directly
      // Then: The expected behavior occurs
      const validation = await structureWrapper.validateWrite('test.js', false);
      
      expect(validation.valid).toBe(false);
      expect(validation.message).toContain('frozen');
    });

    it('should include allowed structure in validation message', async () => {
      // Given: The system is in a valid state
      // When: include allowed structure in validation message
      // Then: The expected behavior occurs
      const validation = await structureWrapper.validateWrite('demo.txt', false);
      
      expect(validation.valid).toBe(false);
      expect(validation.message).toContain('gen/doc/');
      expect(validation.message).toContain('layer/themes/');
    });
  });

  describe('vf_write_validated endpoint', () => {
    it('should enforce freeze validation', async () => {
      // Given: The system is in a valid state
      // When: enforce freeze validation
      // Then: The expected behavior occurs
      const result = await server.handleRequest('vf_write_validated', {
        file: 'unauthorized.txt',
        content: 'test'
      });

      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('frozen')
      });
    });

    it('should allow valid paths', async () => {
      // Given: The system is in a valid state
      // When: allow valid paths
      // Then: The expected behavior occurs
      const result = await server.handleRequest('vf_write_validated', {
        file: 'gen/doc/valid-report.md',
        content: '# Valid Report'
      });

      expect(result).toMatchObject({
        success: true,
        message: 'File written successfully'
      });
    });
  });
});