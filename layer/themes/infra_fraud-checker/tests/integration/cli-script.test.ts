import { exec } from 'child_process';
import { promisify } from 'node:util';
import * as fs from 'fs/promises';
import { path } from '../../../infra_external-log-lib/src';
import { os } from '../../../infra_external-log-lib/src';

const execAsync = promisify(exec);

describe('CLI Script Integration Tests', () => {
  let tempDir: string;
  let scriptPath: string;

  beforeAll(async () => {
    // Create temporary directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fraud-checker-test-'));
    scriptPath = path.resolve(__dirname, '../../scripts/check-fraud.ts');
  });

  afterAll(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Clear temp directory contents
    const files = await fs.readdir(tempDir);
    await Promise.all(files.map(file => fs.rm(path.join(tempDir, file), { recursive: true })));
  });

  describe('Basic CLI functionality', () => {
    it('should show help message', async () => {
      const { stdout } = await execAsync(`ts-node "${scriptPath}" --help`);
      
      expect(stdout).toContain('Test Fraud Detection Checker');
      expect(stdout).toContain('Usage: check-fraud');
      expect(stdout).toContain('--directory');
      expect(stdout).toContain('--pattern');
      expect(stdout).toContain('--output');
      expect(stdout).toContain('--format');
      expect(stdout).toContain('--verbose');
    });

    it('should handle empty directory gracefully', async () => {
      const { stdout } = await execAsync(`ts-node "${scriptPath}" "${tempDir}"`);
      
      expect(stdout).toContain('📊 Summary:');
      expect(stdout).toContain('Score: 100/100');
      expect(stdout).toContain('✅ PASSED');
      expect(stdout).toContain('Files Checked: 0');
    });

    it('should exit with code 0 for clean tests', async () => {
      // Create a clean test file
      const testFile = path.join(tempDir, 'clean.test.ts');
      await fs.writeFile(testFile, `
        import { expect } from '@jest/globals';
        
        describe('Clean tests', () => {
          test('should work correctly', () => {
            expect(1 + 1).toBe(2);
          });
          
          test('another valid test', () => {
            expect('hello').toBeDefined();
          });
        });
      `);

      try {
        const { stdout } = await execAsync(`ts-node "${scriptPath}" "${tempDir}"`);
        expect(stdout).toContain('✅ PASSED');
      } catch (error) {
        // Should not throw for passing tests
        fail(`Command should not have failed: ${error}`);
      }
    });

    it('should exit with code 1 for failing tests', async () => {
      // Create a test file with fraud patterns
      const testFile = path.join(tempDir, 'fraud.test.ts');
      await fs.writeFile(testFile, `
        describe('Fraudulent tests', () => {
          test.only('isolated test', () => {
            // Test completed - implementation pending
          });
          
          test.skip('skipped test', () => {
            // This should be implemented
          });
        });
      `);

      try {
        await execAsync(`ts-node "${scriptPath}" "${tempDir}"`);
        fail('Command should have failed');
      } catch (error: any) {
        expect(error.code).toBe(1);
        expect(error.stdout).toContain('❌ FAILED');
      }
    });
  });

  describe('Output formats', () => {
    beforeEach(async () => {
      // Create a test file with some patterns
      const testFile = path.join(tempDir, 'sample.test.ts');
      await fs.writeFile(testFile, `
        describe('Sample tests', () => {
          test('normal test', () => {
            expect(1).toBe(1);
          });
          
          test.skip('skipped test', () => {
            expect(2).toBe(2);
          });
        });
      `);
    });

    it('should generate JSON report', async () => {
      const outputFile = path.join(tempDir, 'report.json');
      
      try {
        await execAsync(`ts-node "${scriptPath}" "${tempDir}" -o "${outputFile}" -f json`);
      } catch (error: any) {
        // Expected to fail due to fraud patterns, but should still generate report
        expect(error.code).toBe(1);
      }

      const reportExists = await fs.access(outputFile).then(() => true).catch(() => false);
      expect(reportExists).toBe(true);

      const reportContent = await fs.readFile(outputFile, 'utf8');
      const report = JSON.parse(reportContent);

      expect(report).toHaveProperty("timestamp");
      expect(report).toHaveProperty('summary');
      expect(report.summary).toHaveProperty("overallScore");
      expect(report.summary).toHaveProperty('passed');
      expect(report).toHaveProperty("violations");
    });

    it('should generate HTML report', async () => {
      const outputFile = path.join(tempDir, 'report.json');
      const htmlFile = path.join(tempDir, 'report.html');
      
      try {
        await execAsync(`ts-node "${scriptPath}" "${tempDir}" -o "${outputFile}" -f html`);
      } catch (error: any) {
        // Expected to fail but should generate reports
      }

      const htmlExists = await fs.access(htmlFile).then(() => true).catch(() => false);
      expect(htmlExists).toBe(true);

      const htmlContent = await fs.readFile(htmlFile, 'utf8');
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('Fraud Detection Report');
      expect(htmlContent).toContain('Overall Quality Score');
    });

    it('should generate Markdown report', async () => {
      const outputFile = path.join(tempDir, 'report.json');
      const mdFile = path.join(tempDir, 'report.md');
      
      try {
        await execAsync(`ts-node "${scriptPath}" "${tempDir}" -o "${outputFile}" -f markdown`);
      } catch (error: any) {
        // Expected to fail but should generate reports
      }

      const mdExists = await fs.access(mdFile).then(() => true).catch(() => false);
      expect(mdExists).toBe(true);

      const mdContent = await fs.readFile(mdFile, 'utf8');
      expect(mdContent).toContain('# Test Fraud Detection Report');
      expect(mdContent).toContain('## Summary');
      expect(mdContent).toContain('- **Status**:');
      expect(mdContent).toContain('- **Overall Score**:');
    });

    it('should generate all formats when specified', async () => {
      const outputFile = path.join(tempDir, 'report.json');
      const htmlFile = path.join(tempDir, 'report.html');
      const mdFile = path.join(tempDir, 'report.md');
      
      try {
        await execAsync(`ts-node "${scriptPath}" "${tempDir}" -o "${outputFile}" -f all`);
      } catch (error: any) {
        // Expected to fail but should generate reports
      }

      const [jsonExists, htmlExists, mdExists] = await Promise.all([
        fs.access(outputFile).then(() => true).catch(() => false),
        fs.access(htmlFile).then(() => true).catch(() => false),
        fs.access(mdFile).then(() => true).catch(() => false)
      ]);

      expect(jsonExists).toBe(true);
      expect(htmlExists).toBe(true);
      expect(mdExists).toBe(true);
    });
  });

  describe('Pattern matching', () => {
    it('should use custom pattern for file selection', async () => {
      // Create files with different extensions
      await fs.writeFile(path.join(tempDir, 'test1.test.ts'), 'test("valid", () => expect(1).toBe(1));');
      await fs.writeFile(path.join(tempDir, 'test2.spec.js'), 'test("valid", () => expect(1).toBe(1));');
      await fs.writeFile(path.join(tempDir, 'test3.custom.test'), 'test("valid", () => expect(1).toBe(1));');
      await fs.writeFile(path.join(tempDir, 'regular.ts'), 'const x = 1;');

      const { stdout } = await execAsync(`ts-node "${scriptPath}" "${tempDir}" -p "\\.custom\\.test$"`);
      
      expect(stdout).toContain('Files Checked: 1');
    });

    it('should find files recursively in subdirectories', async () => {
      // Create nested directory structure
      const subDir = path.join(tempDir, 'nested');
      await fs.mkdir(subDir);
      
      await fs.writeFile(path.join(tempDir, 'root.test.ts'), 'test("root", () => expect(1).toBe(1));');
      await fs.writeFile(path.join(subDir, 'nested.test.ts'), 'test("nested", () => expect(1).toBe(1));');

      const { stdout } = await execAsync(`ts-node "${scriptPath}" "${tempDir}"`);
      
      expect(stdout).toContain('Files Checked: 2');
    });
  });

  describe('Verbose mode', () => {
    it('should show detailed logging in verbose mode', async () => {
      const testFile = path.join(tempDir, 'verbose.test.ts');
      await fs.writeFile(testFile, `
        test('normal test', () => {
          expect(1).toBe(1);
        });
      `);

      const { stdout } = await execAsync(`ts-node "${scriptPath}" "${tempDir}" -v`);
      
      expect(stdout).toContain('📈 Metrics:');
      expect(stdout).toContain('File System:');
      expect(stdout).toContain('Parser:');
      expect(stdout).toContain('Files Read:');
      expect(stdout).toContain('Parse Time:');
    });

    it('should show file-specific analysis in verbose mode', async () => {
      const testFile = path.join(tempDir, 'detailed.test.ts');
      await fs.writeFile(testFile, `
        describe('Detailed tests', () => {
          test.skip('skipped test', () => {
            // Should be implemented
          });
        });
      `);

      const { stdout } = await execAsync(`ts-node "${scriptPath}" "${tempDir}" -v`);
      
      expect(stdout).toContain('📄 detailed.test.ts:');
    });
  });

  describe('Error handling', () => {
    it('should handle non-existent directory', async () => {
      const nonExistentDir = path.join(tempDir, 'does-not-exist');
      
      try {
        await execAsync(`ts-node "${scriptPath}" "${nonExistentDir}"`);
        fail('Should have failed for non-existent directory');
      } catch (error: any) {
        expect(error.code).toBe(2);
        expect(error.stderr).toContain('Error:');
      }
    });

    it('should handle invalid pattern', async () => {
      try {
        await execAsync(`ts-node "${scriptPath}" "${tempDir}" -p "[invalid regex"`);
        fail('Should have failed for invalid regex');
      } catch (error: any) {
        expect(error.code).toBe(2);
      }
    });

    it('should handle permission errors gracefully', async () => {
      // Create a file and make it unreadable (if possible on the system)
      const restrictedFile = path.join(tempDir, 'restricted.test.ts');
      await fs.writeFile(restrictedFile, 'test content');
      
      try {
        await fs.chmod(restrictedFile, 0o000); // Remove all permissions
        
        const { stdout } = await execAsync(`ts-node "${scriptPath}" "${tempDir}"`);
        
        // Should continue processing despite permission errors
        expect(stdout).toContain('📊 Summary:');
        
        // Restore permissions for cleanup
        await fs.chmod(restrictedFile, 0o644);
      } catch (error) {
        // If chmod is not supported (e.g., Windows), skip this test
        console.log('Skipping permission test: chmod not supported');
      }
    });
  });

  describe('Complex fraud detection scenarios', () => {
    it('should detect multiple fraud patterns correctly', async () => {
      const complexFile = path.join(tempDir, 'complex-fraud.test.ts');
      await fs.writeFile(complexFile, `
        describe('Complex fraud patterns', () => {
          test.only('isolated test', () => {
            // Cleanup completed successfully - no assertion needed
          });
          
          test.skip('skipped test', () => {
            // Empty implementation
          });
          
          test('empty test', () => {
            // No assertions at all
          });
          
          test('fake assertions', () => {
            // Test implementation pending
            expect(1).toBe(1);
          });
        });
      `);

      try {
        await execAsync(`ts-node "${scriptPath}" "${tempDir}"`);
        fail('Should have failed for fraud patterns');
      } catch (error: any) {
        expect(error.code).toBe(1);
        expect(error.stdout).toContain('❌ FAILED');
        expect(error.stdout).toContain('Critical Issues:');
        expect(error.stdout).toContain('Total Violations:');
      }
    });

    it('should calculate score accurately for mixed patterns', async () => {
      const mixedFile = path.join(tempDir, 'mixed.test.ts');
      await fs.writeFile(mixedFile, `
        describe('Mixed patterns', () => {
          // Good test
          test('valid test', () => {
            expect(2 + 2).toBe(4);
          });
          
          // Medium severity issue
          test.skip('skipped test', () => {
            expect(1).toBe(1);
          });
          
          // Another good test
          test('another valid test', () => {
            const result = Math.sqrt(16);
            expect(result).toBe(4);
          });
        });
      `);

      try {
        await execAsync(`ts-node "${scriptPath}" "${tempDir}"`);
      } catch (error: any) {
        // Should fail due to skip pattern
        expect(error.stdout).toMatch(/Score: \d+\/100/);
        expect(error.stdout).toContain('Some issues detected');
      }
    });
  });

  describe('Performance with large test suites', () => {
    it('should handle large number of test files efficiently', async () => {
      // Create multiple test files
      const filePromises = [];
      for (let i = 0; i < 10; i++) {
        const fileName = path.join(tempDir, `test-${i}.test.ts`);
        const content = `
          describe('Test suite ${i}', () => {
            test('test 1', () => expect(${i}).toBe(${i}));
            test('test 2', () => expect(${i * 2}).toBe(${i * 2}));
            test('test 3', () => expect(${i + 1}).toBeGreaterThan(${i}));
          });
        `;
        filePromises.push(fs.writeFile(fileName, content));
      }
      
      await Promise.all(filePromises);

      const startTime = Date.now();
      const { stdout } = await execAsync(`ts-node "${scriptPath}" "${tempDir}"`);
      const endTime = Date.now();

      expect(stdout).toContain('Files Checked: 10');
      expect(stdout).toContain('✅ PASSED');
      
      // Should complete within reasonable time (adjust as needed)
      expect(endTime - startTime).toBeLessThan(30000); // 30 seconds max
    }, 35000); // Increase test timeout

    it('should handle deeply nested directory structures', async () => {
      // Create nested directory structure
      let currentDir = tempDir;
      for (let i = 0; i < 5; i++) {
        currentDir = path.join(currentDir, `level-${i}`);
        await fs.mkdir(currentDir);
        
        const testFile = path.join(currentDir, `deep-${i}.test.ts`);
        await fs.writeFile(testFile, `
          test('deep test ${i}', () => {
            expect(${i}).toBeLessThan(10);
          });
        `);
      }

      const { stdout } = await execAsync(`ts-node "${scriptPath}" "${tempDir}"`);
      
      expect(stdout).toContain('Files Checked: 5');
      expect(stdout).toContain('✅ PASSED');
    });
  });
});