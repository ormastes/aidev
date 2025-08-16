/**
 * Unit tests for FileStructureValidator
 */

import { FileStructureValidator, Violation, ValidationReport } from '../../src/validators/FileStructureValidator';
import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';
import { os } from '../../../infra_external-log-lib/src';

// Mock fs module
jest.mock('fs');

describe("FileStructureValidator", () => {
  let validator: FileStructureValidator;
  let tempDir: string;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), 'test-structure');
    validator = new FileStructureValidator(tempDir);
    jest.clearAllMocks();
  });

  describe("loadFileStructure", () => {
    it('should load FILE_STRUCTURE.vf.json successfully', async () => {
      const mockStructure = {
        metadata: {
          level: 'root',
          version: '1.0.0',
          supports_freeze: true
        },
        templates: {
          workspace: {
            id: "workspace",
            type: "directory",
            freeze: true,
            required_children: [
              { name: 'README.md', type: 'file' }
            ]
          }
        }
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockStructure));

      await validator.loadFileStructure();
      
      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        path.join(tempDir, 'FILE_STRUCTURE.vf.json'),
        'utf8'
      );
    });

    it('should throw error if FILE_STRUCTURE.vf.json not found', async () => {
      mockFs.existsSync.mockReturnValue(false);

      await expect(validator.loadFileStructure()).rejects.toThrow(
        'FILE_STRUCTURE.vf.json not found'
      );
    });
  });

  describe("validate", () => {
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
          freeze_message: 'Root is frozen',
          required_children: [
            { name: 'README.md', type: 'file' as const },
            { name: 'package.json', type: 'file' as const },
            { name: 'layer', type: "directory" as const }
          ],
          optional_children: [
            { name: 'tsconfig.json', type: 'file' as const }
          ]
        }
      }
    };

    beforeEach(() => {
      mockFs.existsSync.mockImplementation((path: any) => {
        if (path.includes('FILE_STRUCTURE.vf.json')) return true;
        if (path.includes('README.md')) return true;
        if (path.includes('package.json')) return false; // Missing required file
        if (path.includes('layer')) return true;
        if (path.includes('themes')) return false;
        return false;
      });

      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockStructure));
      mockFs.readdirSync.mockReturnValue([
        'README.md',
        'unexpected.txt', // Unexpected file in frozen directory
        'layer'
      ] as any);

      mockFs.statSync.mockImplementation((path: any) => ({
        isDirectory: () => path.toString().includes('layer'),
        isFile: () => !path.toString().includes('layer')
      } as any));
    });

    it('should detect missing required files', async () => {
      const report = await validator.validate();

      const missingViolations = report.violations.filter(
        v => v.type === 'missing_required'
      );

      expect(missingViolations).toHaveLength(1);
      expect(missingViolations[0].message).toContain('package.json');
    });

    it('should detect freeze violations', async () => {
      const report = await validator.validate();

      const freezeViolations = report.violations.filter(
        v => v.type === 'freeze_violation'
      );

      expect(freezeViolations).toHaveLength(1);
      expect(freezeViolations[0].message).toContain('unexpected.txt');
    });

    it('should calculate compliance score correctly', async () => {
      const report = await validator.validate();

      // With 2 violations out of multiple checks
      expect(report.complianceScore).toBeLessThan(100);
      expect(report.complianceScore).toBeGreaterThan(0);
    });

    it('should categorize violations by severity', async () => {
      const report = await validator.validate();

      expect(report.summary).toHaveProperty("critical");
      expect(report.summary).toHaveProperty('high');
      expect(report.summary).toHaveProperty('medium');
      expect(report.summary).toHaveProperty('low');

      const totalViolations = 
        report.summary.critical +
        report.summary.high +
        report.summary.medium +
        report.summary.low;

      expect(totalViolations).toBe(report.violations.length);
    });
  });

  describe("validateThemes", () => {
    it('should validate theme naming patterns', async () => {
      const mockStructure = {
        metadata: { version: '1.0.0' },
        templates: {}
      };

      mockFs.existsSync.mockImplementation((path: any) => {
        if (path.includes('FILE_STRUCTURE.vf.json')) return true;
        if (path.includes('layer/themes')) return true;
        return false;
      });

      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockStructure));
      mockFs.readdirSync.mockImplementation((path: any) => {
        if (path.includes('layer/themes')) {
          return ['valid-theme', 'Invalid-Theme', '123-invalid'] as any;
        }
        return [] as any;
      });

      mockFs.statSync.mockReturnValue({
        isDirectory: () => true,
        isFile: () => false
      } as any);

      const report = await validator.validate();

      const patternViolations = report.violations.filter(
        v => v.type === 'pattern_mismatch'
      );

      expect(patternViolations.length).toBeGreaterThanOrEqual(2);
    });

    it('should check for required theme files', async () => {
      const mockStructure = {
        metadata: { version: '1.0.0' },
        templates: {}
      };

      mockFs.existsSync.mockImplementation((path: any) => {
        if (path.includes('FILE_STRUCTURE.vf.json')) return true;
        if (path.includes('layer/themes')) return true;
        if (path.includes('valid-theme')) return true;
        if (path.includes('README.md')) return false; // Missing required file
        if (path.includes('FEATURE.vf.json')) return true;
        if (path.includes('pipe/index.ts')) return false; // Missing critical file
        return false;
      });

      mockFs.readFileSync.mockReturnValue(JSON.stringify(mockStructure));
      mockFs.readdirSync.mockImplementation((path: any) => {
        if (path.includes('layer/themes')) {
          return ['valid-theme'] as any;
        }
        if (path.includes('valid-theme')) {
          return ['FEATURE.vf.json', 'src'] as any;
        }
        return [] as any;
      });

      mockFs.statSync.mockImplementation((path: any) => ({
        isDirectory: () => path.toString().includes('theme') || path.toString().includes('src'),
        isFile: () => !path.toString().includes('theme') && !path.toString().includes('src')
      } as any));

      const report = await validator.validate();

      const criticalViolations = report.violations.filter(
        v => v.severity === "critical"
      );

      expect(criticalViolations.length).toBeGreaterThan(0);
      expect(criticalViolations[0].message).toContain('pipe/index.ts');
    });
  });

  describe("generateMarkdownReport", () => {
    it('should generate formatted markdown report', () => {
      const report: ValidationReport = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        basePath: '/test/path',
        totalChecks: 10,
        violations: [
          {
            type: 'missing_required',
            severity: 'high',
            path: '/test/path/package.json',
            message: 'Required file missing',
            suggestion: 'Create package.json'
          },
          {
            type: 'freeze_violation',
            severity: 'medium',
            path: '/test/path/unexpected.txt',
            message: 'Unexpected file in frozen directory'
          }
        ],
        complianceScore: 80,
        summary: {
          critical: 0,
          high: 1,
          medium: 1,
          low: 0
        },
        suggestions: ['Create package.json']
      };

      const markdown = validator.generateMarkdownReport(report);

      expect(markdown).toContain('# File Structure Validation Report');
      expect(markdown).toContain('Compliance Score: 80%');
      expect(markdown).toContain('HIGH (1)');
      expect(markdown).toContain('MEDIUM (1)');
      expect(markdown).toContain('Required file missing');
      expect(markdown).toContain('Good Compliance');
    });

    it('should handle perfect compliance', () => {
      const report: ValidationReport = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        basePath: '/test/path',
        totalChecks: 10,
        violations: [],
        complianceScore: 100,
        summary: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        },
        suggestions: []
      };

      const markdown = validator.generateMarkdownReport(report);

      expect(markdown).toContain('Perfect Compliance!');
      expect(markdown).toContain('100%');
    });
  });
});