/**
 * Unit tests for File Access Auditor
 */

import { FileAccessAuditor } from '../../children/file-access-auditor';
import { AuditedFS } from '../../children/audited-fs';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'os';

describe("FileAccessAuditor", () => {
  let auditor: FileAccessAuditor;
  let tempDir: string;
  
  beforeEach(() => {
    // Create temp directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auditor-test-'));
    
    // Create auditor with test config
    auditor = new FileAccessAuditor({
      enabled: true,
      logLevel: 'all',
      realTimeMonitoring: false,
      persistAuditLog: false,
      validateWithMCP: false,
      fraudCheckEnabled: false
    });
  });
  
  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    
    // Clear audit log
    auditor.clearAuditLog();
  });
  
  describe('audit', () => {
    it('should audit file read operations', async () => {
      const testFile = path.join(tempDir, 'test.txt');
      fs.writeFileSync(testFile, 'test content');
      
      const event = await auditor.audit('read', testFile);
      
      expect(event).toBeDefined();
      expect(event.operation).toBe('read');
      expect(event.path).toBe(testFile);
      expect(event.timestamp).toBeInstanceOf(Date);
      expect(event.caller).toBeDefined();
    });
    
    it('should audit file write operations', async () => {
      const testFile = path.join(tempDir, 'write-test.txt');
      
      const event = await auditor.audit('write', testFile, {
        size: 100
      });
      
      expect(event).toBeDefined();
      expect(event.operation).toBe('write');
      expect(event.path).toBe(testFile);
      expect(event.metadata?.size).toBe(100);
    });
    
    it('should track statistics', async () => {
      const testFile = path.join(tempDir, 'stats-test.txt');
      
      // Perform multiple operations
      await auditor.audit('read', testFile);
      await auditor.audit('write', testFile);
      await auditor.audit('read', testFile);
      
      const stats = auditor.getStats();
      
      expect(stats.totalOperations).toBe(3);
      expect(stats.operationCounts.read).toBe(2);
      expect(stats.operationCounts.write).toBe(1);
    });
    
    it('should detect rapid access patterns', async () => {
      const testFile = path.join(tempDir, 'rapid-test.txt');
      let patternDetected = false;
      
      auditor.on('suspicious-pattern', (pattern) => {
        if (pattern.type === 'rapid_access') {
          patternDetected = true;
        }
      });
      
      // Perform rapid operations
      for (let i = 0; i < 15; i++) {
        await auditor.audit('read', testFile);
      }
      
      expect(patternDetected).toBe(true);
      
      const stats = auditor.getStats();
      expect(stats.suspiciousPatterns.length).toBeGreaterThan(0);
    });
    
    it('should maintain audit log', async () => {
      const file1 = path.join(tempDir, 'file1.txt');
      const file2 = path.join(tempDir, 'file2.txt');
      
      await auditor.audit('read', file1);
      await auditor.audit('write', file2);
      
      const log = auditor.getAuditLog();
      expect(log).toHaveLength(2);
      
      const readEvents = auditor.getAuditLog({ operation: 'read' });
      expect(readEvents).toHaveLength(1);
      expect(readEvents[0].path).toBe(file1);
    });
    
    it('should extract caller information', async () => {
      const testFile = path.join(tempDir, 'caller-test.txt');
      
      const event = await auditor.audit('read', testFile);
      
      expect(event.caller).toBeDefined();
      expect(event.caller.stack).toBeDefined();
      expect(typeof event.caller.stack).toBe('string');
    });
  });
  
  describe("generateReport", () => {
    it('should generate markdown report', async () => {
      const testFile = path.join(tempDir, 'report-test.txt');
      
      // Perform some operations
      await auditor.audit('read', testFile);
      await auditor.audit('write', testFile);
      await auditor.audit('delete', testFile);
      
      const report = await auditor.generateReport();
      
      expect(report).toContain('# File Access Audit Report');
      expect(report).toContain('## Summary');
      expect(report).toContain('Total Operations: 3');
      expect(report).toContain('## Operation Breakdown');
    });
    
    it('should include suspicious patterns in report', async () => {
      const testFile = path.join(tempDir, 'suspicious-test.txt');
      
      // Create suspicious pattern
      for (let i = 0; i < 15; i++) {
        await auditor.audit('write', testFile);
      }
      
      const report = await auditor.generateReport();
      
      expect(report).toContain('## Suspicious Patterns');
      expect(report).toContain('rapid_access');
    });
  });
  
  describe('hooks', () => {
    it('should call beforeOperation hook', async () => {
      let hookCalled = false;
      
      const auditorWithHooks = new FileAccessAuditor({
        enabled: true,
        hooks: {
          beforeOperation: async (event) => {
            hookCalled = true;
            return true; // Allow operation
          }
        }
      });
      
      await auditorWithHooks.audit('read', 'test.txt');
      expect(hookCalled).toBe(true);
    });
    
    it('should block operation if hook returns false', async () => {
      const auditorWithHooks = new FileAccessAuditor({
        enabled: true,
        hooks: {
          beforeOperation: async () => false
        }
      });
      
      await expect(auditorWithHooks.audit('write', 'blocked.txt'))
        .rejects.toThrow('Operation blocked by audit hook');
    });
    
    it('should call afterOperation hook', async () => {
      let hookEvent: any = null;
      
      const auditorWithHooks = new FileAccessAuditor({
        enabled: true,
        hooks: {
          afterOperation: async (event) => {
            hookEvent = event;
          }
        }
      });
      
      await auditorWithHooks.audit('read', 'test.txt');
      
      expect(hookEvent).toBeDefined();
      expect(hookEvent.operation).toBe('read');
    });
    
    it('should call onViolation hook', async () => {
      let violationEvent: any = null;
      
      const auditorWithHooks = new FileAccessAuditor({
        enabled: true,
        validateWithMCP: false,
        fraudCheckEnabled: false,
        hooks: {
          onViolation: async (event) => {
            violationEvent = event;
          }
        }
      });
      
      // Simulate a violation by manually triggering
      const event = await auditorWithHooks.audit('write', '/etc/passwd');
      event.validation = { authorized: false, violations: ["Unauthorized"] };
      auditorWithHooks["handleViolation"](event);
      
      expect(violationEvent).toBeDefined();
    });
  });
});

describe("AuditedFS", () => {
  let auditedFs: AuditedFS;
  let auditor: FileAccessAuditor;
  let tempDir: string;
  
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audited-fs-test-'));
    
    auditor = new FileAccessAuditor({
      enabled: true,
      logLevel: 'all',
      validateWithMCP: false,
      fraudCheckEnabled: false
    });
    
    auditedFs = new AuditedFS(auditor);
  });
  
  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
  
  describe('file operations', () => {
    it('should audit file reads', async () => {
      const testFile = path.join(tempDir, 'read-test.txt');
      fs.writeFileSync(testFile, 'test content');
      
      const content = await auditedFs.readFile(testFile, 'utf8');
      
      expect(content).toBe('test content');
      
      const log = auditor.getAuditLog();
      const readEvents = log.filter(e => e.operation === 'read' && e.path === testFile);
      expect(readEvents.length).toBeGreaterThan(0);
    });
    
    it('should audit file writes', async () => {
      const testFile = path.join(tempDir, 'write-test.txt');
      
      await auditedFs.writeFile(testFile, 'new content');
      
      expect(fs.existsSync(testFile)).toBe(true);
      expect(fs.readFileSync(testFile, 'utf8')).toBe('new content');
      
      const log = auditor.getAuditLog();
      const writeEvents = log.filter(e => e.operation === 'write' && e.path === testFile);
      expect(writeEvents.length).toBeGreaterThan(0);
    });
    
    it('should audit file appends', async () => {
      const testFile = path.join(tempDir, 'append-test.txt');
      fs.writeFileSync(testFile, 'initial');
      
      await auditedFs.appendFile(testFile, ' appended');
      
      expect(fs.readFileSync(testFile, 'utf8')).toBe('initial appended');
      
      const log = auditor.getAuditLog();
      const appendEvents = log.filter(e => e.operation === 'append');
      expect(appendEvents.length).toBeGreaterThan(0);
    });
    
    it('should audit file deletion', async () => {
      const testFile = path.join(tempDir, 'delete-test.txt');
      fs.writeFileSync(testFile, 'to delete');
      
      await auditedFs.unlink(testFile);
      
      expect(fs.existsSync(testFile)).toBe(false);
      
      const log = auditor.getAuditLog();
      const deleteEvents = log.filter(e => e.operation === 'delete');
      expect(deleteEvents.length).toBeGreaterThan(0);
    });
    
    it('should audit directory creation', async () => {
      const testDir = path.join(tempDir, 'new-dir');
      
      await auditedFs.mkdir(testDir);
      
      expect(fs.existsSync(testDir)).toBe(true);
      
      const log = auditor.getAuditLog();
      const mkdirEvents = log.filter(e => e.operation === 'mkdir');
      expect(mkdirEvents.length).toBeGreaterThan(0);
    });
    
    it('should audit file stats', async () => {
      const testFile = path.join(tempDir, 'stat-test.txt');
      fs.writeFileSync(testFile, 'stat content');
      
      const stats = await auditedFs.stat(testFile);
      
      expect(stats).toBeDefined();
      expect(stats.isFile()).toBe(true);
      
      const log = auditor.getAuditLog();
      const statEvents = log.filter(e => e.operation === 'stat');
      expect(statEvents.length).toBeGreaterThan(0);
    });
  });
  
  describe('synchronous operations', () => {
    it('should audit synchronous file reads', () => {
      const testFile = path.join(tempDir, 'sync-read.txt');
      fs.writeFileSync(testFile, 'sync content');
      
      const content = auditedFs.readFileSync(testFile, 'utf8');
      
      expect(content).toBe('sync content');
      
      const log = auditor.getAuditLog();
      const syncReadEvents = log.filter(e => 
        e.operation === 'read' && 
        e.metadata?.sync === true
      );
      expect(syncReadEvents.length).toBeGreaterThan(0);
    });
    
    it('should audit synchronous file writes', () => {
      const testFile = path.join(tempDir, 'sync-write.txt');
      
      auditedFs.writeFileSync(testFile, 'sync write content');
      
      expect(fs.existsSync(testFile)).toBe(true);
      
      const log = auditor.getAuditLog();
      const syncWriteEvents = log.filter(e => 
        e.operation === 'write' && 
        e.metadata?.sync === true
      );
      expect(syncWriteEvents.length).toBeGreaterThan(0);
    });
  });
  
  describe('stream operations', () => {
    it('should audit read streams', (done) => {
      const testFile = path.join(tempDir, 'stream-read.txt');
      fs.writeFileSync(testFile, 'stream content for reading');
      
      const stream = auditedFs.createReadStream(testFile);
      let data = '';
      
      stream.on('data', chunk => {
        data += chunk;
      });
      
      stream.on('end', () => {
        expect(data).toBe('stream content for reading');
        
        const log = auditor.getAuditLog();
        const streamEvents = log.filter(e => 
          e.operation === 'read' && 
          e.metadata?.stream === true
        );
        expect(streamEvents.length).toBeGreaterThan(0);
        
        done();
      });
    });
    
    it('should audit write streams', (done) => {
      const testFile = path.join(tempDir, 'stream-write.txt');
      
      const stream = auditedFs.createWriteStream(testFile);
      
      stream.write('line 1\n');
      stream.write('line 2\n');
      stream.end();
      
      stream.on('finish', () => {
        expect(fs.existsSync(testFile)).toBe(true);
        expect(fs.readFileSync(testFile, 'utf8')).toBe('line 1\nline 2\n');
        
        const log = auditor.getAuditLog();
        const streamEvents = log.filter(e => 
          e.operation === 'write' && 
          e.metadata?.stream === true
        );
        expect(streamEvents.length).toBeGreaterThan(0);
        
        done();
      });
    });
  });
});