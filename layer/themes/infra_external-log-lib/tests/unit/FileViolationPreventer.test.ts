/**
 * Unit tests for FileViolationPreventer
 */

import { FileViolationPreventer, FileViolationError } from '../../src/validators/FileViolationPreventer';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'os';

// Mock fs module
jest.mock('fs');

describe("FileViolationPreventer", () => {
  let preventer: FileViolationPreventer;
  let tempDir: string;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), 'test-violation-preventer');
    jest.clearAllMocks();
  });

  describe('Strict Mode Configuration', () => {
    it('should default to non-strict mode', () => {
      preventer = new FileViolationPreventer(tempDir);
      const config = preventer.getStrictModeConfig();
      
      expect(config.enabled).toBe(false);
      expect(config.throwOnViolation).toBe(false);
      expect(config.logWarnings).toBe(true);
    });

    it('should enable strict mode when specified', () => {
      preventer = new FileViolationPreventer(tempDir, true);
      const config = preventer.getStrictModeConfig();
      
      expect(config.enabled).toBe(true);
      expect(config.throwOnViolation).toBe(true);
      expect(config.inheritToChildren).toBe(true);
    });

    it('should accept custom configuration', () => {
      preventer = new FileViolationPreventer(tempDir, {
        enabled: true,
        inheritToChildren: false,
        logWarnings: true,
        throwOnViolation: false
      });
      
      const config = preventer.getStrictModeConfig();
      expect(config.enabled).toBe(true);
      expect(config.inheritToChildren).toBe(false);
      expect(config.logWarnings).toBe(true);
      expect(config.throwOnViolation).toBe(false);
    });

    it('should toggle strict mode', () => {
      preventer = new FileViolationPreventer(tempDir);
      
      preventer.enableStrictMode();
      expect(preventer.getStrictModeConfig().enabled).toBe(true);
      expect(preventer.getStrictModeConfig().throwOnViolation).toBe(true);
      
      preventer.disableStrictMode();
      expect(preventer.getStrictModeConfig().enabled).toBe(false);
      expect(preventer.getStrictModeConfig().throwOnViolation).toBe(false);
    });
  });

  describe('Path Validation', () => {
    beforeEach(() => {
      preventer = new FileViolationPreventer(tempDir, true);
      
      // Mock FILE_STRUCTURE.vf.json
      const mockStructure = {
        metadata: {
          level: 'root',
          version: '1.0.0',
          supports_freeze: true
        },
        templates: {
          workspace: {
            id: "workspace",
            type: "directory" as const,
            freeze: true,
            required_children: [
              { name: 'README.md', type: 'file' as const },
              { name: 'layer', type: "directory" as const }
            ],
            optional_children: [
              { name: 'package.json', type: 'file' as const }
            ]
          }
        }
      };

      mockFs.existsSync.mockImplementation((path: any) => {
        if (path.includes('FILE_STRUCTURE.vf.json')) return true;
        return false;
      });

      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockStructure));
    });

    it('should throw on freeze violation in strict mode', async () => {
      const violatingPath = path.join(tempDir, 'unauthorized.txt');
      
      await expect(
        preventer.validateFileOperation('create', violatingPath)
      ).rejects.toThrow(FileViolationError);
    });

    it('should not throw for allowed files in frozen directory', async () => {
      const allowedPath = path.join(tempDir, 'README.md');
      
      await expect(
        preventer.validateFileOperation('create', allowedPath)
      ).resolves.not.toThrow();
    });

    it('should detect backup file violations', async () => {
      const backupPath = path.join(tempDir, 'layer/themes/infra_external-log-lib/file.bak');
      
      await expect(
        preventer.validateFileOperation('create', backupPath)
      ).rejects.toThrow(FileViolationError);
    });

    it('should detect pattern violations', async () => {
      const spacePath = path.join(tempDir, 'file with spaces.txt');
      
      await expect(
        preventer.validateFileOperation('create', spacePath)
      ).rejects.toThrow(FileViolationError);
    });
  });

  describe('Safe File Operations', () => {
    beforeEach(() => {
      preventer = new FileViolationPreventer(tempDir, false);
      
      mockFs.existsSync.mockReturnValue(false); // No FILE_STRUCTURE.vf.json
      mockFs.writeFileSync.mockImplementation(() => {});
      mockFs.mkdirSync.mockImplementation(() => {});
    });

    it('should write file when no violations', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      
      await preventer.safeWriteFile(filePath, 'content');
      
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(filePath, 'content');
    });

    it('should create directory when no violations', async () => {
      const dirPath = path.join(tempDir, 'testdir');
      
      await preventer.safeMkdir(dirPath);
      
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(dirPath, undefined);
    });

    it('should create file with content', async () => {
      const filePath = path.join(tempDir, 'new.txt');
      
      await preventer.safeCreateFile(filePath, 'initial content');
      
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(filePath, 'initial content');
    });
  });

  describe('Inheritance to Children', () => {
    it('should apply strict mode to child directories when inherit is true', () => {
      preventer = new FileViolationPreventer(tempDir, {
        enabled: true,
        inheritToChildren: true,
        throwOnViolation: true,
        logWarnings: false
      });

      const themePath = path.join(tempDir, 'layer/themes/infra_external-log-lib');
      const childPath = path.join(themePath, 'children/some-child/file.txt');
      
      expect(preventer.isStrictModeEnabled(childPath)).toBe(true);
    });

    it('should not apply strict mode to children when inherit is false', () => {
      preventer = new FileViolationPreventer(tempDir, {
        enabled: true,
        inheritToChildren: false,
        throwOnViolation: true,
        logWarnings: false
      });

      const themePath = path.join(tempDir, 'layer/themes/infra_external-log-lib');
      const childPath = path.join(themePath, 'children/some-child/file.txt');
      
      expect(preventer.isStrictModeEnabled(childPath)).toBe(false);
    });

    it('should not apply to paths outside theme', () => {
      preventer = new FileViolationPreventer(tempDir, true);
      
      const outsidePath = path.join(tempDir, 'layer/themes/other-theme/file.txt');
      
      expect(preventer.isStrictModeEnabled(outsidePath)).toBe(false);
    });
  });

  describe('Warning Mode', () => {
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      preventer = new FileViolationPreventer(tempDir, {
        enabled: true,
        inheritToChildren: true,
        logWarnings: true,
        throwOnViolation: false
      });

      const mockStructure = {
        metadata: { version: '1.0.0', supports_freeze: true },
        templates: {
          workspace: {
            freeze: true,
            required_children: [],
            optional_children: []
          }
        }
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockStructure));
    });

    afterEach(() => {
      consoleWarnSpy.mockRestore();
    });

    it('should log warnings but not throw in warning mode', async () => {
      const violatingPath = path.join(tempDir, 'layer/themes/infra_external-log-lib/bad-file.bak');
      
      await expect(
        preventer.validateFileOperation('create', violatingPath)
      ).resolves.not.toThrow();
      
      // Check that warning was logged
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });
});

describe("FileViolationError", () => {
  it('should create error with proper properties', () => {
    const error = new FileViolationError(
      'Test message',
      '/test/path',
      'freeze_violation'
    );
    
    expect(error.message).toBe('Test message');
    expect(error.path).toBe('/test/path');
    expect(error.violationType).toBe('freeze_violation');
    expect(error.name).toBe("FileViolationError");
  });
});