/**
 * Integration tests for FileCreationAPI
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { FileCreationAPI, FileType } from '../../src/file-manager/FileCreationAPI';
import { MCPIntegratedFileManager } from '../../src/file-manager/MCPIntegratedFileManager';

describe('FileCreationAPI Integration', () => {
  let api: FileCreationAPI;
  let manager: MCPIntegratedFileManager;
  let testDir: string;

  beforeEach(() => {
    // Create test directory
    testDir = path.join(__dirname, '..', '..', 'temp', `test-integration-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
    
    api = new FileCreationAPI(testDir, false);
    manager = new MCPIntegratedFileManager(testDir);
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('File Type Routing', () => {
    it('should route documents to gen/doc', async () => {
      const result = await api.createFile('test.md', '# Test', {
        type: FileType.DOCUMENT
      });
      
      expect(result.success).toBe(true);
      expect(result.path).toContain('gen/doc/test.md');
      expect(fs.existsSync(result.path)).toBe(true);
    });

    it('should route reports to gen/doc', async () => {
      const result = await api.createFile('report.md', '# Report', {
        type: FileType.REPORT
      });
      
      expect(result.success).toBe(true);
      expect(result.path).toContain('gen/doc/report.md');
    });

    it('should route temp files to temp', async () => {
      const result = await api.createFile('temp.txt', 'temp data', {
        type: FileType.TEMPORARY
      });
      
      expect(result.success).toBe(true);
      expect(result.path).toContain('temp/temp.txt');
    });

    it('should route logs to logs', async () => {
      const result = await api.createFile('app.log', 'log entry', {
        type: FileType.LOG
      });
      
      expect(result.success).toBe(true);
      expect(result.path).toContain('logs/app.log');
    });
  });

  describe("Validation", () => {
    it('should validate file extensions', async () => {
      const result = await api.createFile('config.exe', "malicious", {
        type: FileType.CONFIG
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Extension .exe not allowed');
    });

    it('should detect fraud patterns', async () => {
      const result = await api.createFile('file.bak', 'backup', {
        type: FileType.TEMPORARY
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('blocked');
    });
  });

  describe('Batch Operations', () => {
    it('should create multiple files atomically', async () => {
      const files = [
        { 
          path: 'batch1.txt', 
          content: "content1", 
          options: { type: FileType.TEMPORARY } 
        },
        { 
          path: 'batch2.txt', 
          content: "content2", 
          options: { type: FileType.TEMPORARY } 
        }
      ];

      const results = await api.createBatch(files);
      
      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should rollback on batch failure', async () => {
      const files = [
        { 
          path: 'good.txt', 
          content: 'ok', 
          options: { type: FileType.TEMPORARY } 
        },
        { 
          path: 'bad.exe', 
          content: 'fail', 
          options: { type: FileType.CONFIG } // Will fail
        }
      ];

      await expect(api.createBatch(files)).rejects.toThrow();
      
      // First file should be rolled back
      const firstPath = path.join(testDir, 'temp/good.txt');
      expect(fs.existsSync(firstPath)).toBe(false);
    });
  });

  describe('Audit Logging', () => {
    it('should track all operations', async () => {
      await api.createFile('audit1.txt', 'test', { 
        type: FileType.TEMPORARY 
      });
      
      await api.writeFile('audit1.txt', 'updated', {
        type: FileType.TEMPORARY
      });

      const audit = api.getAuditLog();
      
      expect(audit.length).toBeGreaterThanOrEqual(2);
      expect(audit.some(e => e.operation === 'create')).toBe(true);
      expect(audit.some(e => e.operation === 'write')).toBe(true);
    });

    it('should export audit log', async () => {
      await api.createFile('tracked.txt', 'data', {
        type: FileType.TEMPORARY
      });
      
      const exportPath = await api.exportAuditLog();
      
      expect(fs.existsSync(exportPath)).toBe(true);
      
      const content = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
      expect(Array.isArray(content)).toBe(true);
    });
  });

  describe('MCP Integration', () => {
    it('should validate path structure', async () => {
      const validation = await manager.validateAgainstStructure(
        'temp/valid.txt',
        FileType.TEMPORARY
      );
      
      expect(validation.valid).toBe(true);
    });

    it('should suggest alternatives for invalid paths', async () => {
      const validation = await manager.validateAgainstStructure(
        'invalid-location.md',
        FileType.DOCUMENT
      );
      
      expect(validation.valid).toBe(false);
      expect(validation.allowedPaths).toBeDefined();
      expect(validation.allowedPaths!.length).toBeGreaterThan(0);
    });

    it('should create files in correct locations', async () => {
      const result = await manager.createTypedFile(
        'my-doc.md',
        '# Document',
        FileType.DOCUMENT
      );
      
      expect(result.success).toBe(true);
      expect(result.path).toContain('gen/doc/my-doc.md');
    });
  });

  describe('Atomic Operations', () => {
    it('should support atomic writes', async () => {
      const content = 'atomic content';
      const result = await api.createFile('atomic.txt', content, {
        type: FileType.TEMPORARY,
        atomic: true
      });
      
      expect(result.success).toBe(true);
      
      const savedContent = fs.readFileSync(result.path, 'utf8');
      expect(savedContent).toBe(content);
    });
  });
});