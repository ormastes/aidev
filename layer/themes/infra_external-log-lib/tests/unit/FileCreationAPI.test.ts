/**
 * Unit tests for FileCreationAPI
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { FileCreationAPI, FileType, FileCreationOptions } from '../../src/file-manager/FileCreationAPI';
import { MCPIntegratedFileManager } from '../../src/file-manager/MCPIntegratedFileManager';

describe("FileCreationAPI", () => {
  let api: FileCreationAPI;
  let tempDir: string;

  beforeEach(() => {
    // Create temp directory for tests
    tempDir = path.join(__dirname, '..', '..', 'temp', `test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    
    api = new FileCreationAPI(tempDir, false); // Disable strict mode for tests
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('File Type Detection', () => {
    it('should detect document type from path', async () => {
      const result = await api.createFile('gen/doc/test.md', 'content', {
        type: FileType.DOCUMENT
      });
      
      expect(result.success).toBe(true);
      expect(result.type).toBe(FileType.DOCUMENT);
    });

    it('should detect report type from filename pattern', async () => {
      const result = await api.createFile('analysis-report.md', 'content', {
        type: FileType.REPORT
      });
      
      expect(result.success).toBe(true);
      expect(result.type).toBe(FileType.REPORT);
    });

    it('should detect test type from extension', async () => {
      const result = await api.createFile('tests/unit/example.test.ts', 'content', {
        type: FileType.TEST
      });
      
      expect(result.success).toBe(true);
      expect(result.type).toBe(FileType.TEST);
    });
  });

  describe('File Creation', () => {
    it('should create file with correct type', async () => {
      const content = 'Test document content';
      const result = await api.createFile('doc.md', content, {
        type: FileType.DOCUMENT
      });

      expect(result.success).toBe(true);
      expect(result.path).toContain('gen/doc/doc.md');
      
      const fileContent = fs.readFileSync(result.path, 'utf8');
      expect(fileContent).toBe(content);
    });

    it('should create directories if needed', async () => {
      const result = await api.createFile('deep/nested/file.txt', 'content', {
        type: FileType.TEMPORARY
      });

      expect(result.success).toBe(true);
      expect(fs.existsSync(result.path)).toBe(true);
    });

    it('should handle atomic writes', async () => {
      const result = await api.createFile('atomic.txt', 'atomic content', {
        type: FileType.TEMPORARY,
        atomic: true
      });

      expect(result.success).toBe(true);
      expect(fs.existsSync(result.path)).toBe(true);
    });

    it('should enforce file size limits', async () => {
      const largeContent = Buffer.alloc(200 * 1024 * 1024); // 200MB
      const result = await api.createFile('large.tmp', largeContent, {
        type: FileType.TEMPORARY // Max 100MB
      });

      // Should still create but log warning
      expect(result.success).toBe(true);
    });
  });

  describe('File Type Validation', () => {
    it('should validate allowed extensions', async () => {
      const result = await api.createFile('config.exe', 'content', {
        type: FileType.CONFIG
      });

      // Should fail due to invalid extension
      expect(result.success).toBe(false);
      expect(result.error).toContain('Extension .exe not allowed');
    });

    it('should validate file patterns', async () => {
      const result = await api.createFile('tests/invalid.js', 'content', {
        type: FileType.TEST
      });

      // Should fail as test files need .test or .spec pattern
      expect(result.success).toBe(false);
    });
  });

  describe('Batch Operations', () => {
    it('should create multiple files in batch', async () => {
      const files = [
        { path: 'file1.txt', content: "content1", options: { type: FileType.TEMPORARY } as FileCreationOptions },
        { path: 'file2.txt', content: "content2", options: { type: FileType.TEMPORARY } as FileCreationOptions },
        { path: 'file3.txt', content: "content3", options: { type: FileType.TEMPORARY } as FileCreationOptions }
      ];

      const results = await api.createBatch(files);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should rollback batch on failure', async () => {
      const files = [
        { path: 'file1.txt', content: "content1", options: { type: FileType.TEMPORARY } as FileCreationOptions },
        { path: 'invalid/\0/path.txt', content: "content2", options: { type: FileType.TEMPORARY } as FileCreationOptions }
      ];

      await expect(api.createBatch(files)).rejects.toThrow();
      
      // First file should be rolled back
      expect(fs.existsSync(path.join(tempDir, 'temp/file1.txt'))).toBe(false);
    });
  });

  describe('Audit Logging', () => {
    it('should track file operations in audit log', async () => {
      await api.createFile('audit1.txt', 'content', { type: FileType.TEMPORARY });
      await api.writeFile('audit1.txt', 'updated', { type: FileType.TEMPORARY });

      const auditLog = api.getAuditLog();
      
      expect(auditLog).toHaveLength(2);
      expect(auditLog[0].operation).toBe('create');
      expect(auditLog[1].operation).toBe('write');
    });

    it('should export audit log to file', async () => {
      await api.createFile('tracked.txt', 'content', { type: FileType.TEMPORARY });
      
      const exportPath = await api.exportAuditLog();
      
      expect(fs.existsSync(exportPath)).toBe(true);
      
      const exportContent = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
      expect(exportContent).toHaveLength(2); // Create + export itself
    });
  });

  describe('Fraud Detection', () => {
    it('should detect and block backup files', async () => {
      const result = await api.createFile('file.bak', 'content', {
        type: FileType.TEMPORARY
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('blocked');
    });

    it('should detect suspicious patterns in filenames', async () => {
      const result = await api.createFile('password.txt', 'secrets', {
        type: FileType.TEMPORARY
      });

      // Should create but log warning
      expect(result.success).toBe(true);
    });

    it('should prevent file creation outside project', async () => {
      const result = await api.createFile('../../../etc/passwd', "malicious", {
        type: FileType.TEMPORARY
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('outside project directory');
    });
  });
});

describe("MCPIntegratedFileManager", () => {
  let manager: MCPIntegratedFileManager;
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(__dirname, '..', '..', 'temp', `test-mcp-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    
    // Create a mock FILE_STRUCTURE.vf.json
    const mockStructure = {
      metadata: { version: '2.1.0', supports_freeze: true },
      templates: {
        workspace: {
          freeze: true,
          freeze_message: 'Root is frozen',
          required_children: [
            { name: 'gen', type: "directory" },
            { name: 'temp', type: "directory" }
          ]
        }
      }
    };
    
    fs.writeFileSync(
      path.join(tempDir, 'FILE_STRUCTURE.vf.json'),
      JSON.stringify(mockStructure, null, 2)
    );
    
    manager = new MCPIntegratedFileManager(tempDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Structure Validation', () => {
    it('should validate against FILE_STRUCTURE.vf.json', async () => {
      const validation = await manager.validateAgainstStructure(
        path.join(tempDir, 'gen/doc/report.md'),
        FileType.REPORT
      );

      expect(validation.valid).toBe(true);
      expect(validation.violations).toHaveLength(0);
    });

    it('should detect frozen directory violations', async () => {
      const validation = await manager.validateAgainstStructure(
        path.join(tempDir, 'root-file.txt'),
        FileType.TEMPORARY
      );

      expect(validation.valid).toBe(false);
      expect(validation.violations[0]).toContain('frozen directory');
    });

    it('should suggest alternative paths', async () => {
      const validation = await manager.validateAgainstStructure(
        path.join(tempDir, 'wrong-location.md'),
        FileType.DOCUMENT
      );

      expect(validation.valid).toBe(false);
      expect(validation.allowedPaths).toContain('gen/doc/your-document.md');
    });
  });

  describe('Theme Structure Validation', () => {
    it('should validate theme naming patterns', async () => {
      const validation = await manager.validateAgainstStructure(
        'layer/themes/Invalid-Theme/file.ts',
        FileType.SOURCE
      );

      expect(validation.valid).toBe(false);
      expect(validation.violations[0]).toContain('Invalid theme name');
    });

    it('should validate user story naming patterns', async () => {
      const validation = await manager.validateAgainstStructure(
        'layer/themes/my-theme/user-stories/invalid-story/file.ts',
        FileType.SOURCE
      );

      expect(validation.valid).toBe(false);
      expect(validation.violations[0]).toContain('Invalid user story name');
    });

    it('should accept valid theme structure', async () => {
      const validation = await manager.validateAgainstStructure(
        'layer/themes/my-theme/user-stories/001-valid-story/src/index.ts',
        FileType.SOURCE
      );

      expect(validation.valid).toBe(true);
    });
  });

  describe('Typed File Creation', () => {
    it('should create file in correct location based on type', async () => {
      const result = await manager.createTypedFile(
        'my-report.md',
        '# Report Content',
        FileType.REPORT
      );

      expect(result.success).toBe(true);
      expect(result.path).toContain('gen/doc/my-report.md');
    });

    it('should enforce structure for typed files', async () => {
      await expect(
        manager.createTypedFile(
          '../../../etc/passwd',
          "malicious",
          FileType.CONFIG
        )
      ).rejects.toThrow();
    });
  });

  describe('Batch Validation', () => {
    it('should validate multiple paths', async () => {
      const paths = [
        { path: 'gen/doc/valid.md', type: FileType.DOCUMENT },
        { path: 'invalid-root.txt', type: FileType.TEMPORARY },
        { path: 'temp/valid.tmp', type: FileType.TEMPORARY }
      ];

      const results = await manager.batchValidate(paths);

      expect(results.get('gen/doc/valid.md')?.valid).toBe(true);
      expect(results.get('invalid-root.txt')?.valid).toBe(false);
      expect(results.get('temp/valid.tmp')?.valid).toBe(true);
    });
  });

  describe('Violation Reporting', () => {
    it('should generate violation report', async () => {
      const paths = [
        path.join(tempDir, 'invalid1.txt'),
        path.join(tempDir, 'invalid2.bak'),
        path.join(tempDir, 'layer/themes/INVALID/file.ts')
      ];

      const reportPath = await manager.generateViolationReport(paths);

      expect(fs.existsSync(reportPath)).toBe(true);
      
      const report = fs.readFileSync(reportPath, 'utf8');
      expect(report).toContain('File Structure Violation Report');
      expect(report).toContain('Violations:');
    });
  });

  describe('Path Checking', () => {
    it('should check if path is allowed', async () => {
      const allowed = await manager.checkPathAllowed(
        'gen/doc/allowed.md',
        FileType.DOCUMENT
      );
      
      expect(allowed).toBe(true);

      const notAllowed = await manager.checkPathAllowed(
        'root-file.txt',
        FileType.TEMPORARY
      );
      
      expect(notAllowed).toBe(false);
    });

    it('should get allowed paths for file type', () => {
      const paths = manager.getAllowedPaths(FileType.TEST);
      
      expect(paths).toContain('tests/unit/your-test.test.ts');
      expect(paths).toContain('tests/integration/your-test.itest.ts');
      expect(paths).toContain('tests/system/your-test.stest.ts');
    });
  });
});