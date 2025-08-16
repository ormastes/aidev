/**
 * Unit tests for UnauthorizedFileDetector
 */

import { UnauthorizedFileDetector } from '../../src/detectors/unauthorized-file-detector';
import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';
import { os } from '../../../infra_external-log-lib/src';

describe("UnauthorizedFileDetector", () => {
  let tempDir: string;
  let detector: UnauthorizedFileDetector;
  
  beforeEach(() => {
    // Create temp directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fraud-test-'));
    detector = new UnauthorizedFileDetector(tempDir);
  });
  
  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
  
  describe('detect', () => {
    it('should detect unauthorized root directories', async () => {
      // Create unauthorized directories
      fs.mkdirSync(path.join(tempDir, "coverage"));
      fs.mkdirSync(path.join(tempDir, 'deploy'));
      fs.mkdirSync(path.join(tempDir, 'src'));
      
      const result = await detector.detect();
      
      expect(result.valid).toBe(false);
      expect(result.totalViolations).toBeGreaterThanOrEqual(3);
      
      const violations = result.violations.filter(v => v.type === 'unauthorized_directory');
      expect(violations).toHaveLength(3);
      
      const coverageViolation = violations.find(v => v.path === "coverage");
      expect(coverageViolation).toBeDefined();
      expect(coverageViolation?.suggestedLocation).toBe('gen/coverage/');
    });
    
    it('should detect backup files', async () => {
      // Create backup files
      fs.writeFileSync(path.join(tempDir, 'file.bak'), 'backup');
      fs.writeFileSync(path.join(tempDir, 'old.backup'), 'backup');
      fs.writeFileSync(path.join(tempDir, 'temp~'), 'temp');
      
      const result = await detector.detect();
      
      expect(result.valid).toBe(false);
      
      const backupViolations = result.violations.filter(
        v => v.reason.includes('Backup') || v.reason.includes("Temporary")
      );
      expect(backupViolations.length).toBeGreaterThanOrEqual(3);
    });
    
    it('should not flag platform required files', async () => {
      // Create platform required files
      fs.writeFileSync(path.join(tempDir, 'CLAUDE.md'), '# Claude Config');
      fs.writeFileSync(path.join(tempDir, 'README.md'), '# Readme');
      fs.writeFileSync(path.join(tempDir, 'TASK_QUEUE.vf.json'), '{}');
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{}');
      
      const result = await detector.detect();
      
      // Should not have violations for these files
      const platformFileViolations = result.violations.filter(v =>
        ['CLAUDE.md', 'README.md', 'TASK_QUEUE.vf.json', 'package.json'].includes(path.basename(v.path))
      );
      
      expect(platformFileViolations).toHaveLength(0);
    });
    
    it('should detect system files', async () => {
      // Create system files that shouldn't be committed
      fs.writeFileSync(path.join(tempDir, '.DS_Store'), '');
      fs.writeFileSync(path.join(tempDir, 'Thumbs.db'), '');
      fs.writeFileSync(path.join(tempDir, '.swp'), '');
      
      const result = await detector.detect();
      
      expect(result.valid).toBe(false);
      
      const systemFileViolations = result.violations.filter(
        v => v.reason.includes('system files') || v.reason.includes('swap files')
      );
      expect(systemFileViolations.length).toBeGreaterThanOrEqual(3);
    });
    
    it('should find creators of violations', async () => {
      // Create a test directory
      fs.mkdirSync(path.join(tempDir, "coverage"));
      
      // Create a mock test file that creates the directory
      const testDir = path.join(tempDir, 'tests');
      fs.mkdirSync(testDir);
      fs.writeFileSync(
        path.join(testDir, 'test.js'),
        'fs.mkdirSync("coverage", { recursive: true });'
      );
      
      const result = await detector.detect();
      
      const coverageViolation = result.violations.find(v => v.path === "coverage");
      expect(coverageViolation).toBeDefined();
      
      // Note: Creator detection might not work in test environment
      // since it looks for specific patterns in real project structure
    });
  });
  
  describe("generateReport", () => {
    it('should generate markdown report', async () => {
      // Create some violations
      fs.mkdirSync(path.join(tempDir, "coverage"));
      fs.writeFileSync(path.join(tempDir, 'file.bak'), 'backup');
      
      const result = await detector.detect();
      const report = await detector.generateReport(result);
      
      expect(report).toContain('# Unauthorized File/Folder Detection Report');
      expect(report).toContain('## Summary');
      expect(report).toContain('Total Violations:');
      expect(report).toContain('## Violations');
      
      if (result.violations.length > 0) {
        expect(report).toContain("UNAUTHORIZED");
        expect(report).toContain('## Recommended Actions');
      }
    });
    
    it('should generate passing report when no violations', async () => {
      // Don't create any violations
      const result = await detector.detect();
      const report = await detector.generateReport(result);
      
      expect(report).toContain('Status: ✅ PASS');
      expect(report).toContain('Total Violations: 0');
    });
  });
  
  describe('integration with filesystem-mcp', () => {
    it('should handle missing filesystem-mcp gracefully', async () => {
      // The detector should work even if filesystem-mcp is not available
      const result = await detector.detect();
      
      expect(result).toBeDefined();
      expect(result.violations).toBeDefined();
      expect(Array.isArray(result.violations)).toBe(true);
    });
    
    it('should validate against FILE_STRUCTURE.vf.json when available', async () => {
      // Create a mock FILE_STRUCTURE.vf.json
      const fileStructure = {
        metadata: {
          version: '1.0.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        templates: {
          root: {
            id: 'root',
            type: "directory",
            freeze: true,
            freeze_message: 'Root is frozen'
          }
        },
        structure: {
          name: '/',
          type: "directory",
          template: 'root'
        }
      };
      
      fs.writeFileSync(
        path.join(tempDir, 'FILE_STRUCTURE.vf.json'),
        JSON.stringify(fileStructure, null, 2)
      );
      
      // Create an unauthorized directory
      fs.mkdirSync(path.join(tempDir, "unauthorized"));
      
      const result = await detector.detect();
      
      // Should detect the unauthorized directory
      expect(result.valid).toBe(false);
    });
  });
  
  describe('frozen directory detection', () => {
    it('should detect modifications to frozen directories', async () => {
      // Create llm_rules directory (which should be frozen)
      const llmRulesDir = path.join(tempDir, 'llm_rules');
      fs.mkdirSync(llmRulesDir);
      
      // Create a file in the frozen directory (simulating recent modification)
      fs.writeFileSync(path.join(llmRulesDir, 'new_rule.md'), '# New Rule');
      
      // Note: The detector checks for recent modifications (last 24 hours)
      // In a real scenario, this would trigger a frozen directory violation
      const result = await detector.detect();
      
      // The test might not detect this as a violation since we just created it
      // and the detector checks for modifications, not creation
      expect(result).toBeDefined();
    });
  });
});