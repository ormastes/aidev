import { ContextProvider } from '../../src/external/context-provider';
import { TestFileSystem } from '../helpers/test-file-system';
import { path } from '../../../../../infra_external-log-lib/src';

describe('ContextProvider Comprehensive Tests', () => {
  let provider: ContextProvider;
  let testFileSystem: TestFileSystem;
  let workspaceDir: string;
  let aidevDir: string;

  beforeEach(async () => {
    testFileSystem = new TestFileSystem();
    workspaceDir = await testFileSystem.createTempDir('test-workspace');
    aidevDir = path.join(workspaceDir, '..', '_aidev');
    
    // Create aidev directory structure
    await testFileSystem.createDirectory(aidevDir);
    await testFileSystem.createFile(aidevDir, 'settings.json', JSON.stringify({
      version: '1.0.0',
      theme: 'dark'
    }));
    
    // Create theme directories
    await testFileSystem.createDirectory(path.join(aidevDir, 'themes'));
    await testFileSystem.createDirectory(path.join(aidevDir, 'themes', 'theme1'));
    await testFileSystem.createDirectory(path.join(aidevDir, 'themes', 'theme2'));
    
    // Create project directories
    await testFileSystem.createDirectory(path.join(aidevDir, 'projects'));
    await testFileSystem.createFile(path.join(aidevDir, 'projects'), 'project1.json', '{"active": true}');
    await testFileSystem.createFile(path.join(aidevDir, 'projects'), 'project2.json', '{"active": false}');
    
    // Create test file for cache tests
    await testFileSystem.createFile(workspaceDir, 'test.txt', 'Hello, World!');
    
    provider = new ContextProvider(workspaceDir, true, 300000);
  });

  afterEach(async () => {
    await testFileSystem.cleanup();
  });

  describe('loadAidevContext', () => {
    test('should load workspace context successfully', async () => {
      const context = await provider.loadAidevContext();
      
      expect(context.path).toBe(aidevDir);
      expect(context.themes).toContain('theme1');
      expect(context.themes).toContain('theme2');
      expect(context.activeProjects).toContain('project1');
      expect(context.settings.version).toBe('1.0.0');
      expect(context.metadata.version).toBe('1.0.0');
    });

    test('should use cache on second call', async () => {
      const context1 = await provider.loadAidevContext();
      const context2 = await provider.loadAidevContext();
      
      expect(context1).toEqual(context2);
      const stats = provider.getCacheStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    test('should create aidev directory if not exists', async () => {
      await testFileSystem.cleanup();
      const newWorkspace = await testFileSystem.createTempDir('new-workspace');
      new ContextProvider(newWorkspace);
      
      const context = await provider.loadAidevContext();
      expect(context).toBeDefined();
    });

    test('should handle missing settings file', async () => {
      await testFileSystem.removeFile(path.join(aidevDir, 'settings.json'));
      
      const context = await provider.loadAidevContext();
      expect(context.settings).toEqual({});
    });

    test('should handle empty themes directory', async () => {
      await testFileSystem.removeDirectory(path.join(aidevDir, 'themes', 'theme1'));
      await testFileSystem.removeDirectory(path.join(aidevDir, 'themes', 'theme2'));
      
      const context = await provider.loadAidevContext();
      expect(context.themes).toEqual([]);
    });
  });

  describe('getCurrentContext', () => {
    test('should get current context', async () => {
      const context = await provider.getCurrentContext();
      
      expect(context.workspace.path).toBe(aidevDir);
      expect(context.currentDirectory).toBeDefined();
      expect(context.environmentInfo).toBeDefined();
    });

    test('should include additional context info', async () => {
      // Create some workspace files
      await testFileSystem.createFile(workspaceDir, 'file1.ts', 'content1');
      await testFileSystem.createFile(workspaceDir, 'file2.ts', 'content2');
      await testFileSystem.createDirectory(path.join(workspaceDir, 'src'));
      
      const context = await provider.getCurrentContext();
      expect(context.workspace.path).toBe(aidevDir);
    });
  });

  describe('getFileContent', () => {
    beforeEach(async () => {
      await testFileSystem.createFile(workspaceDir, 'test.txt', 'Hello, World!');
      await testFileSystem.createFile(workspaceDir, 'data.json', '{"key": "value"}');
    });

    test('should get file content successfully', async () => {
      const content = await provider.getFileContent('test.txt');
      expect(content).toBe('Hello, World!');
    });

    test('should handle absolute paths', async () => {
      const absolutePath = path.join(workspaceDir, 'test.txt');
      const content = await provider.getFileContent(absolutePath);
      expect(content).toBe('Hello, World!');
    });

    test('should throw error for non-existent file', async () => {
      await expect(provider.getFileContent('non-existent.txt'))
        .rejects.toThrow('File not found: non-existent.txt');
    });

    test('should use cache for repeated reads', async () => {
      await provider.getFileContent('test.txt');
      await provider.getFileContent('test.txt');
      
      const stats = provider.getCacheStats();
      expect(stats.hits).toBeGreaterThan(0);
    });

    test('should handle special characters in filenames', async () => {
      await testFileSystem.createFile(workspaceDir, 'special-@#$%-file.txt', 'Special content');
      
      const content = await provider.getFileContent('special-@#$%-file.txt');
      expect(content).toBe('Special content');
    });

    test('should handle unicode content', async () => {
      const unicodeContent = '测试内容 🚀 テスト émojis';
      await testFileSystem.createFile(workspaceDir, 'unicode.txt', unicodeContent);
      
      const content = await provider.getFileContent('unicode.txt');
      expect(content).toBe(unicodeContent);
    });

    test('should handle empty files', async () => {
      await testFileSystem.createFile(workspaceDir, 'empty.txt', '');
      
      const content = await provider.getFileContent('empty.txt');
      expect(content).toBe('');
    });

    test('should handle nested paths', async () => {
      const deepPath = path.join('deep', 'nested', 'path', 'file.txt');
      await testFileSystem.createFile(workspaceDir, deepPath, 'Deep content');
      
      const content = await provider.getFileContent(deepPath);
      expect(content).toBe('Deep content');
    });
  });

  describe('getFileInfo', () => {
    beforeEach(async () => {
      await testFileSystem.createFile(workspaceDir, 'info-test.txt', 'File info test content');
    });

    test('should get file info successfully', async () => {
      const info = await provider.getFileInfo('info-test.txt');
      
      expect(info.path).toContain('info-test.txt');
      expect(info.content).toBe('File info test content');
      expect(info.size).toBeGreaterThan(0);
      expect(info.lastModified).toBeInstanceOf(Date);
      expect(info.encoding).toBe('utf-8');
    });

    test('should cache file info', async () => {
      await provider.getFileInfo('info-test.txt');
      await provider.getFileInfo('info-test.txt');
      
      const stats = provider.getCacheStats();
      expect(stats.hits).toBeGreaterThan(0);
    });

    test('should throw error for non-existent file', async () => {
      await expect(provider.getFileInfo('non-existent.txt'))
        .rejects.toThrow('File not found: non-existent.txt');
    });

    test('should handle large files', async () => {
      const largeContent = 'x'.repeat(100000); // 100KB
      await testFileSystem.createFile(workspaceDir, 'large.txt', largeContent);
      
      const info = await provider.getFileInfo('large.txt');
      expect(info.size).toBe(100000);
      expect(info.content).toBe(largeContent);
    });
  });

  describe('getDirectoryInfo', () => {
    beforeEach(async () => {
      await testFileSystem.createDirectory(path.join(workspaceDir, 'test-dir'));
      await testFileSystem.createFile(path.join(workspaceDir, 'test-dir'), 'file1.txt', 'content1');
      await testFileSystem.createFile(path.join(workspaceDir, 'test-dir'), 'file2.txt', 'content2');
      await testFileSystem.createDirectory(path.join(workspaceDir, 'test-dir', 'subdir1'));
      await testFileSystem.createDirectory(path.join(workspaceDir, 'test-dir', 'subdir2'));
    });

    test('should get directory info successfully', async () => {
      const info = await provider.getDirectoryInfo('test-dir');
      
      expect(info.path).toContain('test-dir');
      expect(info.files).toContain('file1.txt');
      expect(info.files).toContain('file2.txt');
      expect(info.directories).toContain('subdir1');
      expect(info.directories).toContain('subdir2');
      expect(info.fileCount).toBe(2);
      expect(info.totalSize).toBeGreaterThan(0);
    });

    test('should handle empty directory', async () => {
      await testFileSystem.createDirectory(path.join(workspaceDir, 'empty-dir'));
      
      const info = await provider.getDirectoryInfo('empty-dir');
      expect(info.files).toEqual([]);
      expect(info.directories).toEqual([]);
      expect(info.fileCount).toBe(0);
      expect(info.totalSize).toBe(0);
    });

    test('should cache directory info', async () => {
      await provider.getDirectoryInfo('test-dir');
      await provider.getDirectoryInfo('test-dir');
      
      const stats = provider.getCacheStats();
      expect(stats.hits).toBeGreaterThan(0);
    });

    test('should throw error for non-existent directory', async () => {
      await expect(provider.getDirectoryInfo('non-existent-dir'))
        .rejects.toThrow('Directory not found: non-existent-dir');
    });

    test('should handle directory with many files', async () => {
      const manyFilesDir = path.join(workspaceDir, 'many-files');
      await testFileSystem.createDirectory(manyFilesDir);
      
      // Create 50 files
      for (let i = 0; i < 50; i++) {
        await testFileSystem.createFile(manyFilesDir, `file${i}.txt`, `content${i}`);
      }
      
      const info = await provider.getDirectoryInfo('many-files');
      expect(info.files).toHaveLength(50);
      expect(info.fileCount).toBe(50);
    });
  });

  describe('searchFiles', () => {
    beforeEach(async () => {
      await testFileSystem.createFile(workspaceDir, 'search1.txt', 'Hello World');
      await testFileSystem.createFile(workspaceDir, 'search2.txt', 'Hello Universe');
      await testFileSystem.createFile(workspaceDir, 'other.txt', 'Goodbye');
      await testFileSystem.createDirectory(path.join(workspaceDir, 'subdir'));
      await testFileSystem.createFile(path.join(workspaceDir, 'subdir'), 'search3.txt', 'Hello Subdir');
    });

    test('should search files by pattern', async () => {
      const results = await provider.searchFiles('search*.txt');
      
      expect(results).toHaveLength(2);
      expect(results.some(f => f.path.includes('search1.txt'))).toBe(true);
      expect(results.some(f => f.path.includes('search2.txt'))).toBe(true);
    });

    test('should search recursively', async () => {
      const results = await provider.searchFiles('**/*.txt');
      
      expect(results.length).toBeGreaterThanOrEqual(4);
      expect(results.some(f => f.path.includes('search3.txt'))).toBe(true);
    });

    test('should handle no matches', async () => {
      const results = await provider.searchFiles('*.nonexistent');
      expect(results).toEqual([]);
    });

    test('should search with content filter', async () => {
      const results = await provider.searchFiles('*Hello*', workspaceDir);
      
      expect(results).toHaveLength(3);
      expect(results.some(f => f.path.includes('other.txt'))).toBe(false);
    });
  });

  describe('Cache Management', () => {
    test('should respect cache TTL', async () => {
      const shortTTLProvider = new ContextProvider(workspaceDir, true, 100); // 100ms TTL
      
      await shortTTLProvider.getFileContent('test.txt');
      const stats1 = shortTTLProvider.getCacheStats();
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      await shortTTLProvider.getFileContent('test.txt');
      const stats2 = shortTTLProvider.getCacheStats();
      
      expect(stats2.misses).toBeGreaterThan(stats1.misses);
    });

    test('should clear cache', async () => {
      await provider.getFileContent('test.txt');
      await provider.getDirectoryInfo('.');
      
      provider.clearCache();
      const stats = provider.getCacheStats();
      
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    test('should disable cache', async () => {
      const noCacheProvider = new ContextProvider(workspaceDir, false);
      
      await noCacheProvider.getFileContent('test.txt');
      await noCacheProvider.getFileContent('test.txt');
      
      const stats = noCacheProvider.getCacheStats();
      expect(stats.hits).toBe(0);
    });

    test('should get cache statistics', async () => {
      await provider.getFileContent('test.txt');
      await provider.getDirectoryInfo('.');
      await provider.getFileContent('test.txt'); // Cache hit
      
      const stats = provider.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.hits).toBeGreaterThan(0);
      expect(stats.misses).toBeGreaterThan(0);
      expect(stats.hitRate).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle permission errors gracefully', async () => {
      // This test would require platform-specific setup to create permission errors
      // For now, we'll test the error handling paths
      const invalidPath = '/root/restricted/file.txt';
      
      await expect(provider.getFileContent(invalidPath))
        .rejects.toThrow();
    });

    test('should handle invalid JSON in settings', async () => {
      await testFileSystem.createFile(aidevDir, 'invalid-settings.json', 'invalid json{');
      
      // Should not throw, but return empty settings
      const context = await provider.loadAidevContext();
      expect(context).toBeDefined();
    });

    test('should handle concurrent operations', async () => {
      const promises = [];
      
      // Perform multiple operations concurrently
      for (let i = 0; i < 10; i++) {
        promises.push(provider.getFileContent('test.txt'));
        promises.push(provider.getDirectoryInfo('.'));
      }
      
      const results = await Promise.all(promises);
      expect(results).toHaveLength(20);
    });
  });
});