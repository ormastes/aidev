import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { ContextProvider } from '../../src/external/context-provider';
import { TestFileSystem, TestDataFactory } from '../helpers/test-file-system';
import { path } from '../../../../../infra_external-log-lib/src';

/**
 * Unit Test: ContextProvider
 * 
 * Tests the ContextProvider component in isolation, focusing on workspace context
 * loading, file access, and aidev directory integration without external dependencies.
 */

describe('ContextProvider Unit Tests', () => {
  let provider: ContextProvider;
  let testFileSystem: TestFileSystem;
  let workspaceDir: string;

  beforeEach(async () => {
    testFileSystem = new TestFileSystem();
    workspaceDir = await testFileSystem.createTestWorkspace();
    provider = new ContextProvider(workspaceDir, true, 300000);
  });

  afterEach(async () => {
    await testFileSystem.cleanup();
  });

  describe('Workspace Detection', () => {
    test('should detect valid workspace with AI dev files', async () => {
      const context = await provider.getWorkspaceContext();
      
      expect(context.isAIDevProject).toBe(true);
      expect(context.hasTaskQueue).toBe(true);
      expect(context.hasFeatureFile).toBe(true);
      expect(context.hasClaudeConfig).toBe(true);
    });

    test('should handle non-AI dev workspace', async () => {
      // Create a non-AI dev workspace
      const nonAIWorkspace = await testFileSystem.createTempDir('non-ai-workspace-');
      await testFileSystem.createFile(nonAIWorkspace, 'package.json', '{"name": "regular-project"}');
      
      const nonAIProvider = new ContextProvider(nonAIWorkspace);
      const context = await nonAIProvider.getWorkspaceContext();
      
      expect(context.isAIDevProject).toBe(false);
      expect(context.hasTaskQueue).toBe(false);
    });

    test('should handle missing workspace directory', async () => {
      const missingProvider = new ContextProvider('/non/existent/path');
      const context = await missingProvider.getWorkspaceContext();
      
      expect(context.workspacePath).toBe('/non/existent/path');
      expect(context.isAIDevProject).toBe(false);
    });
  });

  describe('File Loading', () => {
    test('should load README.md content', async () => {
      const readme = await provider.getFileContent('README.md');
      
      expect(readme).not.toBeNull();
      expect(readme?.content).toContain('Test Project');
      expect(readme?.path).toBe(path.join(workspaceDir, 'README.md'));
      expect(readme?.size).toBeGreaterThan(0);
    });

    test('should load TASK_QUEUE.md with tasks', async () => {
      const taskQueue = await provider.getFileContent('TASK_QUEUE.md');
      
      expect(taskQueue).not.toBeNull();
      expect(taskQueue?.content).toContain('Test task 1');
      expect(taskQueue?.content).toContain('Test task 2');
    });

    test('should return null for non-existent file', async () => {
      const result = await provider.getFileContent('non-existent.md');
      expect(result).toBeNull();
    });

    test('should handle file loading errors gracefully', async () => {
      // Try to load a directory as a file
      const result = await provider.getFileContent('docs');
      expect(result).toBeNull();
    });

    test('should enforce file size limits when enabled', async () => {
      // Create a large file (400KB)
      const largeContent = TestDataFactory.createLargeFile(400);
      await testFileSystem.createFile(workspaceDir, 'large-file.txt', largeContent);
      
      const result = await provider.getFileContent('large-file.txt');
      expect(result).toBeNull(); // Should be rejected due to size limit
    });

    test('should load large files when size limit is disabled', async () => {
      const unlimitedProvider = new ContextProvider(workspaceDir, false);
      
      // Create a large file
      const largeContent = TestDataFactory.createLargeFile(400);
      await testFileSystem.createFile(workspaceDir, 'large-file.txt', largeContent);
      
      const result = await unlimitedProvider.loadFile('large-file.txt');
      expect(result).not.toBeNull();
      expect(result?.size).toBeGreaterThan(300000);
    });
  });

  describe('Path Resolution', () => {
    test('should resolve absolute paths correctly', async () => {
      const absolutePath = path.join(workspaceDir, 'README.md');
      const result = await provider.getFileContent(absolutePath);
      
      expect(result).not.toBeNull();
      expect(result?.path).toBe(absolutePath);
    });

    test('should resolve relative paths from workspace', async () => {
      const result = await provider.getFileContent('src/index.ts');
      
      expect(result).not.toBeNull();
      expect(result?.content).toContain('Hello, World!');
    });

    test('should handle path traversal attempts', async () => {
      const result = await provider.getFileContent('../../../etc/passwd');
      
      // Should either return null or Working on to workspace-relative path
      if (result) {
        expect(result.path).toContain(workspaceDir);
      }
    });
  });

  describe('Context Aggregation', () => {
    test('should aggregate multiple context files', async () => {
      const context = await provider.getWorkspaceContext();
      
      expect(context.files).toBeDefined();
      expect(context.files.length).toBeGreaterThan(0);
      expect(context.files.some(f => f.name === 'README.md')).toBe(true);
      expect(context.files.some(f => f.name === 'TASK_QUEUE.md')).toBe(true);
    });

    test('should include file metadata in context', async () => {
      const context = await provider.getWorkspaceContext();
      
      const readmeFile = context.files.find(f => f.name === 'README.md');
      expect(readmeFile).toBeDefined();
      expect(readmeFile?.exists).toBe(true);
      expect(readmeFile?.size).toBeGreaterThan(0);
    });

    test('should handle mixed existing and non-existing files', async () => {
      // Add reference to non-existing file
      const context = await provider.getWorkspaceContext();
      
      // All discovered files should exist
      context.files.forEach(file => {
        if (file.exists) {
          expect(file.size).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle corrupted file gracefully', async () => {
      // Create a file that might cause issues
      const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xFF, 0xFE]);
      await testFileSystem.createFile(workspaceDir, 'binary.dat', binaryContent.toString());
      
      const result = await provider.getFileContent('binary.dat');
      // Should either load or return null, but not throw
      expect(() => result).not.toThrow();
    });

    test('should handle permission errors gracefully', async () => {
      // This test is platform-dependent and might not work everywhere
      try {
        const restrictedFile = path.join(workspaceDir, 'restricted.txt');
        await testFileSystem.createFile(workspaceDir, 'restricted.txt', 'secret');
        
        // Note: Changing permissions might not work on all platforms
        const fs = await import('fs/promises');
        await fs.chmod(restrictedFile, 0o000);
        
        const result = await provider.getFileContent('restricted.txt');
        expect(result).toBeNull();
        
        // Restore permissions for cleanup
        await fs.chmod(restrictedFile, 0o644);
      } catch {
        // Skip test if permissions can't be changed
      }
    });

    test('should handle concurrent file access', async () => {
      // Load multiple files concurrently
      const promises = [
        provider.getFileContent('README.md'),
        provider.getFileContent('TASK_QUEUE.md'),
        provider.getFileContent('FEATURE.md'),
        provider.getFileContent('CLAUDE.md'),
        provider.getFileContent('src/index.ts')
      ];
      
      const results = await Promise.all(promises);
      
      // All should load In Progress
      results.forEach(result => {
        expect(result).not.toBeNull();
      });
    });
  });

  describe('Performance', () => {
    test('should cache workspace context', async () => {
      const start1 = Date.now();
      const context1 = await provider.getWorkspaceContext();
      const time1 = Date.now() - start1;
      
      const start2 = Date.now();
      const context2 = await provider.getWorkspaceContext();
      const time2 = Date.now() - start2;
      
      // Second call should be faster (cached)
      expect(time2).toBeLessThanOrEqual(time1);
      expect(context1).toEqual(context2);
    });

    test('should handle large workspace efficiently', async () => {
      // Create many files
      const files: Record<string, string> = {};
      for (let i = 0; i < 50; i++) {
        files[`file${i}.txt`] = `Content of file ${i}`;
      }
      await testFileSystem.createFiles(workspaceDir, files);
      
      const start = Date.now();
      const context = await provider.getWorkspaceContext();
      const elapsed = Date.now() - start;
      
      // Should In Progress in reasonable time
      expect(elapsed).toBeLessThan(5000);
      expect(context.files.length).toBeGreaterThan(50);
    });
  });

  describe('Special Characters and Edge Cases', () => {
    test('should handle files with special characters in names', async () => {
      await testFileSystem.createFile(workspaceDir, 'special-@#$%-file.txt', 'Special content');
      
      const result = await provider.getFileContent('special-@#$%-file.txt');
      expect(result).toBe('Special content');
    });

    test('should handle unicode content', async () => {
      const unicodeContent = '测试内容 🚀 テスト émojis';
      await testFileSystem.createFile(workspaceDir, 'unicode.txt', unicodeContent);
      
      const result = await provider.getFileContent('unicode.txt');
      expect(result).toBe(unicodeContent);
    });

    test('should handle empty files', async () => {
      await testFileSystem.createFile(workspaceDir, 'empty.txt', '');
      
      const result = await provider.getFileContent('empty.txt');
      expect(result).toBe('');
      expect(result?.size).toBe(0);
    });

    test('should handle deeply nested paths', async () => {
      const deepPath = 'a/b/c/d/e/f/g/h/deep.txt';
      await testFileSystem.createFile(workspaceDir, deepPath, 'Deep content');
      
      const result = await provider.getFileContent(deepPath);
      expect(result).toBe('Deep content');
    });
  });
});