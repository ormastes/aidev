import { FraudChecker, TestFile } from '../../children/FraudChecker';
import { FileSystemWrapper } from '../../external/FileSystemWrapper';
import { ASTParserWrapper, TestPattern } from '../../external/ASTParserWrapper';
import * as t from '@babel/types';

// Mock the external dependencies
jest.mock('../../external/FileSystemWrapper');
jest.mock('../../external/ASTParserWrapper');

describe('FraudChecker', () => {
  let fraudChecker: FraudChecker;
  let mockFileSystem: jest.Mocked<FileSystemWrapper>;
  let mockAstParser: jest.Mocked<ASTParserWrapper>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock instances
    mockFileSystem = new FileSystemWrapper() as jest.Mocked<FileSystemWrapper>;
    mockAstParser = new ASTParserWrapper() as jest.Mocked<ASTParserWrapper>;
    
    // Mock constructor calls
    (FileSystemWrapper as jest.Mock).mockReturnValue(mockFileSystem);
    (ASTParserWrapper as jest.Mock).mockReturnValue(mockAstParser);
    
    fraudChecker = new FraudChecker('/test/path');
  });

  describe('constructor', () => {
    it('should initialize with correct base path', () => {
      expect(FileSystemWrapper).toHaveBeenCalledWith('/test/path');
      expect(ASTParserWrapper).toHaveBeenCalled();
    });

    it('should use current working directory as default', () => {
      new FraudChecker();
      expect(FileSystemWrapper).toHaveBeenCalledWith(process.cwd());
    });
  });

  describe('checkTestFiles', () => {
    it('should return clean result for no test files', async () => {
      const result = await fraudChecker.checkTestFiles([]);

      expect(result).toEqual({
        passed: true,
        score: 100,
        violations: [],
        metrics: {
          filesChecked: 0,
          totalTests: 0,
          skippedTests: 0,
          emptyTests: 0,
          suspiciousPatterns: 0
        }
      });
    });

    it('should process test files with content provided', async () => {
      const testFiles: TestFile[] = [
        { path: '/test/file1.test.ts', content: 'test content' }
      ];

      const mockAst = { type: 'File' } as t.File;
      const mockPatterns: TestPattern[] = [];

      mockAstParser.parseTestFile.mockResolvedValue(mockAst);
      mockAstParser.findTestPatterns.mockReturnValue(mockPatterns);
      mockAstParser.hasAssertions.mockReturnValue(true);

      const result = await fraudChecker.checkTestFiles(testFiles);

      expect(mockFileSystem.readFile).not.toHaveBeenCalled();
      expect(mockAstParser.parseTestFile).toHaveBeenCalledWith('test content', '/test/file1.test.ts');
      expect(result.metrics.filesChecked).toBe(1);
    });

    it('should read file content when not provided', async () => {
      const testFiles: TestFile[] = [
        { path: '/test/file1.test.ts' }
      ];

      const mockAst = { type: 'File' } as t.File;
      const mockPatterns: TestPattern[] = [];

      mockFileSystem.readFile.mockResolvedValue('file content');
      mockAstParser.parseTestFile.mockResolvedValue(mockAst);
      mockAstParser.findTestPatterns.mockReturnValue(mockPatterns);
      mockAstParser.hasAssertions.mockReturnValue(true);

      await fraudChecker.checkTestFiles(testFiles);

      expect(mockFileSystem.readFile).toHaveBeenCalledWith('/test/file1.test.ts');
      expect(mockAstParser.parseTestFile).toHaveBeenCalledWith('file content', '/test/file1.test.ts');
    });

    it('should detect skipped tests', async () => {
      const testFiles: TestFile[] = [
        { path: '/test/file1.test.ts', content: 'test content' }
      ];

      const mockAst = { type: 'File' } as t.File;
      const mockPatterns: TestPattern[] = [{
        type: 'skip',
        location: { file: '/test/file1.test.ts', line: 10, column: 5 },
        code: 'it.skip'
      }];

      mockAstParser.parseTestFile.mockResolvedValue(mockAst);
      mockAstParser.findTestPatterns.mockReturnValue(mockPatterns);
      mockAstParser.hasAssertions.mockReturnValue(true);

      const result = await fraudChecker.checkTestFiles(testFiles);

      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toEqual({
        type: 'disabled-tests',
        severity: 'medium',
        message: 'Skipped test found: it.skip',
        location: '/test/file1.test.ts:10:5',
        pattern: mockPatterns[0]
      });
      expect(result.metrics.skippedTests).toBe(1);
    });

    it('should detect test isolation with .only', async () => {
      const testFiles: TestFile[] = [
        { path: '/test/file1.test.ts', content: 'test content' }
      ];

      const mockAst = { type: 'File' } as t.File;
      const mockPatterns: TestPattern[] = [{
        type: 'only',
        location: { file: '/test/file1.test.ts', line: 15, column: 8 },
        code: 'it.only'
      }];

      mockAstParser.parseTestFile.mockResolvedValue(mockAst);
      mockAstParser.findTestPatterns.mockReturnValue(mockPatterns);
      mockAstParser.hasAssertions.mockReturnValue(true);

      const result = await fraudChecker.checkTestFiles(testFiles);

      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toEqual({
        type: 'test-manipulation',
        severity: 'high',
        message: 'Test isolation with .only: it.only',
        location: '/test/file1.test.ts:15:8',
        pattern: mockPatterns[0]
      });
    });

    it('should detect empty tests', async () => {
      const testFiles: TestFile[] = [
        { path: '/test/file1.test.ts', content: 'test content' }
      ];

      const mockAst = { type: 'File' } as t.File;
      const mockPatterns: TestPattern[] = [{
        type: 'empty',
        location: { file: '/test/file1.test.ts', line: 20, column: 2 },
        code: 'Empty test body'
      }];

      mockAstParser.parseTestFile.mockResolvedValue(mockAst);
      mockAstParser.findTestPatterns.mockReturnValue(mockPatterns);
      mockAstParser.hasAssertions.mockReturnValue(true);

      const result = await fraudChecker.checkTestFiles(testFiles);

      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toEqual({
        type: 'fake-assertions',
        severity: 'high',
        message: 'Empty test with no assertions',
        location: '/test/file1.test.ts:20:2',
        pattern: mockPatterns[0]
      });
      expect(result.metrics.emptyTests).toBe(1);
    });

    it('should detect always-true assertions', async () => {
      const testFiles: TestFile[] = [
        { path: '/test/file1.test.ts', content: 'test content' }
      ];

      const mockAst = { type: 'File' } as t.File;
      const mockPatterns: TestPattern[] = [{
        type: 'always-true',
        location: { file: '/test/file1.test.ts', line: 25, column: 4 },
        // Test implementation pending
      }];

      mockAstParser.parseTestFile.mockResolvedValue(mockAst);
      mockAstParser.findTestPatterns.mockReturnValue(mockPatterns);
      mockAstParser.hasAssertions.mockReturnValue(true);

      const result = await fraudChecker.checkTestFiles(testFiles);

      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toEqual({
        type: 'fake-assertions',
        severity: 'critical',
        // Test implementation pending
        location: '/test/file1.test.ts:25:4',
        pattern: mockPatterns[0]
      });
    });

    it('should detect files with no assertions', async () => {
      const testFiles: TestFile[] = [
        { path: '/test/file1.test.ts', content: 'test content' }
      ];

      const mockAst = { type: 'File' } as t.File;

      mockAstParser.parseTestFile.mockResolvedValue(mockAst);
      mockAstParser.findTestPatterns.mockReturnValue([]);
      mockAstParser.hasAssertions.mockReturnValue(false);

      const result = await fraudChecker.checkTestFiles(testFiles);

      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toEqual({
        type: 'fake-assertions',
        severity: 'high',
        message: 'Test file contains no assertions',
        location: '/test/file1.test.ts'
      });
    });

    it('should handle file processing errors', async () => {
      const testFiles: TestFile[] = [
        { path: '/test/file1.test.ts' }
      ];

      mockFileSystem.readFile.mockRejectedValue(new Error('File not found'));

      const result = await fraudChecker.checkTestFiles(testFiles);

      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]).toEqual({
        type: 'test-manipulation',
        severity: 'low',
        message: 'Failed to analyze test file: File not found',
        location: '/test/file1.test.ts'
      });
    });

    it('should calculate score correctly with various violations', async () => {
      const testFiles: TestFile[] = [
        { path: '/test/file1.test.ts', content: 'test content' }
      ];

      const mockAst = { type: 'File' } as t.File;
      const mockPatterns: TestPattern[] = [
        {
          type: 'always-true',
          location: { file: '/test/file1.test.ts', line: 1, column: 1 },
          // Test implementation pending
        },
        {
          type: 'only',
          location: { file: '/test/file1.test.ts', line: 2, column: 1 },
          code: 'it.only'
        },
        {
          type: 'skip',
          location: { file: '/test/file1.test.ts', line: 3, column: 1 },
          code: 'it.skip'
        }
      ];

      mockAstParser.parseTestFile.mockResolvedValue(mockAst);
      mockAstParser.findTestPatterns.mockReturnValue(mockPatterns);
      mockAstParser.hasAssertions.mockReturnValue(true);

      const result = await fraudChecker.checkTestFiles(testFiles);

      // Score calculation: 100 - 25 (critical) - 15 (high) - 10 (medium) - 15 (skip ratio penalty) = 35
      expect(result.score).toBe(35);
      expect(result.passed).toBe(false);
    });
  });

  describe('checkDirectory', () => {
    it('should find and check test files in directory', async () => {
      const mockFiles = ['file1.js', 'file2.test.ts', 'file3.spec.js'];
      const mockStat = { isDirectory: () => false, isFile: () => true };

      mockFileSystem.readdir.mockResolvedValue(mockFiles);
      mockFileSystem.stat.mockResolvedValue(mockStat as any);
      mockFileSystem.readFile.mockResolvedValue('test content');

      const mockAst = { type: 'File' } as t.File;
      mockAstParser.parseTestFile.mockResolvedValue(mockAst);
      mockAstParser.findTestPatterns.mockReturnValue([]);
      mockAstParser.hasAssertions.mockReturnValue(true);

      const result = await fraudChecker.checkDirectory('/test/dir');

      expect(mockFileSystem.readdir).toHaveBeenCalledWith('/test/dir');
      expect(result.metrics.filesChecked).toBe(2); // Only .test.ts and .spec.js files
    });

    it('should recursively search subdirectories', async () => {
      const mockFiles = ['subdir', 'file1.test.ts'];
      const mockDirStat = { isDirectory: () => true, isFile: () => false };
      const mockFileStat = { isDirectory: () => false, isFile: () => true };
      const mockSubFiles = ['nested.spec.ts'];

      mockFileSystem.readdir
        .mockResolvedValueOnce(mockFiles)
        .mockResolvedValueOnce(mockSubFiles);
      
      mockFileSystem.stat
        .mockResolvedValueOnce(mockDirStat as any)
        .mockResolvedValueOnce(mockFileStat as any)
        .mockResolvedValueOnce(mockFileStat as any);

      mockFileSystem.readFile.mockResolvedValue('test content');

      const mockAst = { type: 'File' } as t.File;
      mockAstParser.parseTestFile.mockResolvedValue(mockAst);
      mockAstParser.findTestPatterns.mockReturnValue([]);
      mockAstParser.hasAssertions.mockReturnValue(true);

      const result = await fraudChecker.checkDirectory('/test/dir');

      expect(mockFileSystem.readdir).toHaveBeenCalledTimes(2);
      expect(result.metrics.filesChecked).toBe(2);
    });

    it('should handle directory read errors gracefully', async () => {
      mockFileSystem.readdir.mockRejectedValue(new Error('Permission denied'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await fraudChecker.checkDirectory('/test/dir');

      expect(consoleSpy).toHaveBeenCalledWith('Error reading directory /test/dir:', expect.any(Error));
      expect(result.metrics.filesChecked).toBe(0);

      consoleSpy.mockRestore();
    });

    it('should use custom pattern for file matching', async () => {
      const mockFiles = ['file1.test.ts', 'file2.spec.js', 'file3.custom.test'];
      const mockStat = { isDirectory: () => false, isFile: () => true };

      mockFileSystem.readdir.mockResolvedValue(mockFiles);
      mockFileSystem.stat.mockResolvedValue(mockStat as any);
      mockFileSystem.readFile.mockResolvedValue('test content');

      const mockAst = { type: 'File' } as t.File;
      mockAstParser.parseTestFile.mockResolvedValue(mockAst);
      mockAstParser.findTestPatterns.mockReturnValue([]);
      mockAstParser.hasAssertions.mockReturnValue(true);

      const customPattern = /\.custom\.test$/;
      const result = await fraudChecker.checkDirectory('/test/dir', customPattern);

      expect(result.metrics.filesChecked).toBe(1); // Only file3.custom.test matches
    });
  });

  describe('score calculation edge cases', () => {
    it('should apply high skip ratio penalty', async () => {
      const testFiles: TestFile[] = [
        { path: '/test/file1.test.ts', content: 'content1' },
        { path: '/test/file2.test.ts', content: 'content2' },
        { path: '/test/file3.test.ts', content: 'content3' }
      ];

      const mockAst = { type: 'File' } as t.File;
      const skipPattern: TestPattern = {
        type: 'skip',
        location: { file: '/test/file1.test.ts', line: 1, column: 1 },
        code: 'it.skip'
      };

      mockAstParser.parseTestFile.mockResolvedValue(mockAst);
      mockAstParser.findTestPatterns
        .mockReturnValueOnce([skipPattern]) // First file has skip
        .mockReturnValueOnce([skipPattern]) // Second file has skip
        .mockReturnValueOnce([]); // Third file is clean
      mockAstParser.hasAssertions.mockReturnValue(true);

      const result = await fraudChecker.checkTestFiles(testFiles);

      // Skip ratio: 2/3 = 0.667 > 0.2, so 15 point penalty
      // Plus 2 medium violations: 2 * 10 = 20 points
      // Score: 100 - 15 - 20 = 65
      expect(result.score).toBe(65);
    });

    it('should apply high empty test ratio penalty', async () => {
      const testFiles: TestFile[] = [
        { path: '/test/file1.test.ts', content: 'content1' },
        { path: '/test/file2.test.ts', content: 'content2' }
      ];

      const mockAst = { type: 'File' } as t.File;
      const emptyPattern: TestPattern = {
        type: 'empty',
        location: { file: '/test/file1.test.ts', line: 1, column: 1 },
        code: 'Empty test body'
      };

      mockAstParser.parseTestFile.mockResolvedValue(mockAst);
      mockAstParser.findTestPatterns
        .mockReturnValueOnce([emptyPattern]) // First file has empty test
        .mockReturnValueOnce([]); // Second file is clean
      mockAstParser.hasAssertions.mockReturnValue(true);

      const result = await fraudChecker.checkTestFiles(testFiles);

      // Empty ratio: 1/2 = 0.5 > 0.1, so 10 point penalty
      // Plus 1 high violation: 15 points
      // Score: 100 - 10 - 15 = 75
      expect(result.score).toBe(75);
    });

    it('should ensure score stays within 0-100 range', async () => {
      const testFiles: TestFile[] = [
        { path: '/test/file1.test.ts', content: 'content1' }
      ];

      const mockAst = { type: 'File' } as t.File;
      // Create many critical violations to push score below 0
      const criticalPatterns: TestPattern[] = Array(10).fill(null).map((_, i) => ({
        type: 'always-true',
        location: { file: '/test/file1.test.ts', line: i + 1, column: 1 },
        // Test implementation pending
      }));

      mockAstParser.parseTestFile.mockResolvedValue(mockAst);
      mockAstParser.findTestPatterns.mockReturnValue(criticalPatterns);
      mockAstParser.hasAssertions.mockReturnValue(true);

      const result = await fraudChecker.checkTestFiles(testFiles);

      expect(result.score).toBe(0); // Should not go below 0
      expect(result.passed).toBe(false);
    });
  });

  describe('metrics access methods', () => {
    it('should provide access to file system metrics', () => {
      const mockMetrics = { readCount: 5, writeCount: 2, totalBytesRead: 1000, totalBytesWritten: 500, errors: [] };
      mockFileSystem.getMetrics.mockReturnValue(mockMetrics);

      const metrics = fraudChecker.getFileSystemMetrics();

      expect(metrics).toEqual(mockMetrics);
      expect(mockFileSystem.getMetrics).toHaveBeenCalled();
    });

    it('should provide access to parser metrics', () => {
      const mockMetrics = { filesAnalyzed: 3, parseTime: 150, errors: [] };
      mockAstParser.getMetrics.mockReturnValue(mockMetrics);

      const metrics = fraudChecker.getParserMetrics();

      expect(metrics).toEqual(mockMetrics);
      expect(mockAstParser.getMetrics).toHaveBeenCalled();
    });

    it('should set up log callbacks', () => {
      const mockCallback = jest.fn();

      fraudChecker.onLog(mockCallback);

      expect(mockFileSystem.onLog).toHaveBeenCalledWith(mockCallback);
      expect(mockAstParser.onLog).toHaveBeenCalledWith(mockCallback);
    });

    it('should provide access to log entries', () => {
      const mockFsLogs = [{ timestamp: new Date(), level: 'info' as const, message: 'fs log', source: 'stdout' as const }];
      const mockParserLogs = [{ timestamp: new Date(), level: 'debug' as const, message: 'parser log', source: 'stdout' as const }];

      mockFileSystem.getLogEntries.mockReturnValue(mockFsLogs);
      mockAstParser.getLogEntries.mockReturnValue(mockParserLogs);

      const logs = fraudChecker.getLogEntries();

      expect(logs).toEqual({
        fileSystem: mockFsLogs,
        parser: mockParserLogs
      });
    });
  });
});