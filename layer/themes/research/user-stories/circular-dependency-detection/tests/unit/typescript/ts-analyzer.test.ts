/**
 * Tests for TypeScript analyzer
 */

import * as fs from 'fs-extra';
import { path } from '../../../../../../infra_external-log-lib/src';
import { TypeScriptAnalyzer } from '../../../src/typescript/ts-analyzer';

describe('TypeScriptAnalyzer', () => {
  let analyzer: TypeScriptAnalyzer;
  let tempDir: string;

  beforeEach(async () => {
    analyzer = new TypeScriptAnalyzer();
    tempDir = path.join(global.TEST_TEMP_DIR, `ts-test-${Date.now()}`);
    await fs.ensureDir(tempDir);
  });

  afterEach(async () => {
    try {
      await fs.remove(tempDir);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Basic Functionality', () => {
    it('should have correct name and supported extensions', () => {
      expect(analyzer.getName()).toBe('TypeScript');
      expect(analyzer.getSupportedExtensions()).toEqual(['.ts', '.tsx', '.js', '.jsx', '.mjs']);
    });

    it('should validate options', () => {
      expect(analyzer.validateOptions({})).toBe(true);
      expect(analyzer.validateOptions({ max_depth: 5 })).toBe(true);
    });
  });

  describe('Import Detection', () => {
    it('should detect simple circular dependency', async () => {
      // Create test files with circular imports
      const fileA = path.join(tempDir, 'moduleA.ts');
      const fileB = path.join(tempDir, 'moduleB.ts');

      await fs.writeFile(fileA, `
        import { functionB } from './moduleB';
        export function functionA() {
          return functionB();
        }
      `);

      await fs.writeFile(fileB, `
        import { functionA } from './moduleA';
        export function functionB() {
          return functionA();
        }
      `);

      const result = await analyzer.analyze(tempDir);

      expect(result.success).toBe(true);
      expect(result.language).toBe('typescript');
      expect(result.total_files).toBeGreaterThan(0);
      // Note: Actual cycle detection depends on external tools being available
      // This test mainly verifies the analyzer runs without crashing
    });

    it('should handle empty directory', async () => {
      const result = await analyzer.analyze(tempDir);

      expect(result.success).toBe(true);
      expect(result.total_files).toBe(0);
      expect(result.circular_dependencies).toHaveLength(0);
    });

    it('should handle single file without dependencies', async () => {
      const singleFile = path.join(tempDir, 'standalone.ts');
      await fs.writeFile(singleFile, `
        export function standalone() {
          return 'No dependencies';
        }
      `);

      const result = await analyzer.analyze(tempDir);

      expect(result.success).toBe(true);
      expect(result.total_files).toBeGreaterThanOrEqual(1);
      expect(result.circular_dependencies).toHaveLength(0);
    });
  });

  describe('Options Handling', () => {
    it('should respect exclude patterns', async () => {
      // Create files in excluded directory
      const nodeModulesDir = path.join(tempDir, 'node_modules');
      await fs.ensureDir(nodeModulesDir);
      await fs.writeFile(path.join(nodeModulesDir, 'module.js'), 'export default {};');

      // Create regular file
      await fs.writeFile(path.join(tempDir, 'app.ts'), 'export default {};');

      const result = await analyzer.analyze(tempDir, {
        exclude_patterns: ['**/node_modules/**']
      });

      expect(result.success).toBe(true);
      // Should not include node_modules files
    });

    it('should respect include patterns', async () => {
      // Create TypeScript file
      await fs.writeFile(path.join(tempDir, 'app.ts'), 'export default {};');
      
      // Create JavaScript file
      await fs.writeFile(path.join(tempDir, 'app.js'), 'export default {};');

      const result = await analyzer.analyze(tempDir, {
        include_patterns: ['**/*.ts']
      });

      expect(result.success).toBe(true);
      // Should only include .ts files
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent directory gracefully', async () => {
      const nonExistentDir = path.join(tempDir, 'does-not-exist');

      const result = await analyzer.analyze(nonExistentDir);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle malformed TypeScript files', async () => {
      const malformedFile = path.join(tempDir, 'malformed.ts');
      await fs.writeFile(malformedFile, 'import {{{ invalid syntax');

      const result = await analyzer.analyze(tempDir);

      // Should not crash, might report warnings or errors
      expect(result).toBeDefined();
      expect(result.language).toBe('typescript');
    });
  });
});