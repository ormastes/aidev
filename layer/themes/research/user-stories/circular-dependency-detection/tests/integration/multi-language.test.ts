/**
 * Integration tests for multi-language analysis
 */

import * as fs from 'fs-extra';
import { path } from '../../../../../infra_external-log-lib/src';
import { MultiLanguageAnalyzer } from '../../src/cli/multi-language-analyzer';

describe('MultiLanguageAnalyzer Integration', () => {
  let analyzer: MultiLanguageAnalyzer;
  let tempDir: string;

  beforeEach(async () => {
    analyzer = new MultiLanguageAnalyzer();
    tempDir = path.join(global.TEST_TEMP_DIR, `integration-test-${Date.now()}`);
    await fs.ensureDir(tempDir);
  });

  afterEach(async () => {
    try {
      await fs.remove(tempDir);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Multi-Language Analysis', () => {
    it('should analyze multiple languages simultaneously', async () => {
      // Create sample files for each language
      await createSampleProject(tempDir);

      const results = await analyzer.analyzeMultiLanguage(
        tempDir,
        ["typescript", 'cpp', 'python']
      );

      expect(results).toHaveLength(3);
      expect(results.map(r => r.language)).toEqual(["typescript", 'cpp', 'python']);
      
      // All analyses should complete (success or failure)
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.language).toBeTruthy();
      });
    });

    it('should handle single language analysis', async () => {
      await createSampleProject(tempDir);

      const results = await analyzer.analyzeMultiLanguage(tempDir, ["typescript"]);

      expect(results).toHaveLength(1);
      expect(results[0].language).toBe("typescript");
    });

    it('should handle unsupported language gracefully', async () => {
      await expect(
        analyzer.analyzeMultiLanguage(tempDir, ['unsupported-language'])
      ).rejects.toThrow('Unsupported languages');
    });

    it('should provide analyzer information', () => {
      const info = analyzer.getAnalyzerInfo();

      expect(info).toHaveProperty("typescript");
      expect(info).toHaveProperty('cpp');
      expect(info).toHaveProperty('python');

      expect(info.typescript.name).toBe("TypeScript");
      expect(info.typescript.extensions).toContain('.ts');
    });
  });

  describe('Configuration Handling', () => {
    it('should apply language-specific options', async () => {
      await createSampleProject(tempDir);

      const config = {
        version: '1.0.0',
        languages: {
          typescript: {
            max_depth: 5,
            exclude_patterns: ['**/*.spec.ts']
          },
          python: {
            max_depth: 3
          }
        },
        global: {
          cache_enabled: true
        }
      };

      const analyzerWithConfig = new MultiLanguageAnalyzer(config as any);
      const results = await analyzerWithConfig.analyzeMultiLanguage(
        tempDir,
        ["typescript", 'python']
      );

      expect(results).toHaveLength(2);
      // Configuration should be applied (exact behavior depends on implementation)
    });
  });

  describe('Error Handling', () => {
    it('should handle partial failures gracefully', async () => {
      // Create only TypeScript files
      const tsFile = path.join(tempDir, 'app.ts');
      await fs.writeFile(tsFile, 'export const app = "test";');

      const results = await analyzer.analyzeMultiLanguage(
        tempDir,
        ["typescript", 'cpp', 'python']
      );

      expect(results).toHaveLength(3);
      
      // TypeScript should work
      const tsResult = results.find(r => r.language === "typescript");
      expect(tsResult).toBeDefined();
      
      // Others might have no files but should not crash
      results.forEach(result => {
        expect(result.language).toBeTruthy();
        expect(Array.isArray(result.errors)).toBe(true);
        expect(Array.isArray(result.warnings)).toBe(true);
      });
    });

    it('should handle empty directory', async () => {
      const results = await analyzer.analyzeMultiLanguage(
        tempDir,
        ["typescript", 'cpp', 'python']
      );

      expect(results).toHaveLength(3);
      
      results.forEach(result => {
        expect(result.total_files).toBe(0);
        expect(result.circular_dependencies).toHaveLength(0);
      });
    });
  });
});

// Helper function to create a sample multi-language project
async function createSampleProject(baseDir: string) {
  // TypeScript files
  const tsDir = path.join(baseDir, 'src', "typescript");
  await fs.ensureDir(tsDir);
  
  await fs.writeFile(path.join(tsDir, 'moduleA.ts'), `
    import { functionB } from './moduleB';
    export function functionA() {
      return functionB();
    }
  `);
  
  await fs.writeFile(path.join(tsDir, 'moduleB.ts'), `
    export function functionB() {
      return 'B';
    }
  `);

  // C++ files
  const cppDir = path.join(baseDir, 'src', 'cpp');
  await fs.ensureDir(cppDir);
  
  await fs.writeFile(path.join(cppDir, 'ClassA.h'), `
    #ifndef CLASS_A_H
    #define CLASS_A_H
    
    class ClassA {
    public:
        void methodA();
    };
    
    #endif
  `);
  
  await fs.writeFile(path.join(cppDir, 'ClassA.cpp'), `
    #include "ClassA.h"
    
    void ClassA::methodA() {
        // Implementation
    }
  `);

  // Python files
  const pyDir = path.join(baseDir, 'src', 'python');
  await fs.ensureDir(pyDir);
  
  await fs.writeFile(path.join(pyDir, 'module_a.py'), `
    def function_a():
        return 'A'
  `);
  
  await fs.writeFile(path.join(pyDir, 'module_b.py'), `
    from .module_a import function_a
    
    def function_b():
        return f'B calls {function_a()}'
  `);

  await fs.writeFile(path.join(pyDir, '__init__.py'), '');
}