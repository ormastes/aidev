/**
 * MCP System Test Suite
 * Comprehensive tests for MCP server validation
 */

const MCPTestRunner = require('../src/mcp-test-runner');
const ClaudeLauncher = require('../src/claude-launcher');
const ViolationDetector = require('../src/violation-detector');
const fs = require('fs').promises;
const { path } = require('../../../infra_external-log-lib/src');

describe('MCP System Tests', () => {
  let runner;
  let launcher;
  let detector;
  
  beforeAll(async () => {
    // Initialize test components
    runner = new MCPTestRunner({
      mode: process.env.MCP_MODE || 'strict',
      workspacePath: process.env.VF_BASE_PATH || '/workspace',
      resultPath: '/results'
    });
    
    launcher = new ClaudeLauncher({
      mcpServer: 'mcp-server-strict.js',
      workspacePath: process.env.VF_BASE_PATH || '/workspace'
    });
    
    detector = new ViolationDetector({
      workspacePath: process.env.VF_BASE_PATH || '/workspace'
    });
    
    await detector.initialize();
  });
  
  afterAll(async () => {
    // Cleanup
    if (launcher) {
      await launcher.shutdown();
    }
  });
  
  describe('Root File Violations', () => {
    test('should block unauthorized root files', async () => {
      const result = detector.detectRootFileViolation('test.js');
      expect(result.violated).toBe(true);
      expect(result.type).toBe('ROOT_FILE_VIOLATION');
    });
    
    test('should allow authorized root files', async () => {
      const result = detector.detectRootFileViolation('README.md');
      expect(result.violated).toBe(false);
    });
    
    test('should detect multiple root violations', async () => {
      const files = ['test.js', 'config.yaml', 'script.sh'];
      const violations = files.map(f => detector.detectRootFileViolation(f));
      
      expect(violations.every(v => v.violated)).toBe(true);
    });
  });
  
  describe('Directory Validation', () => {
    test('should allow files in gen/doc', async () => {
      const result = detector.detectUnauthorizedDirectory('gen/doc/report.md');
      expect(result.violated).toBe(false);
    });
    
    test('should allow files in layer/themes', async () => {
      const result = detector.detectUnauthorizedDirectory('layer/themes/my-theme/index.ts');
      expect(result.violated).toBe(false);
    });
    
    test('should block files in unauthorized directories', async () => {
      const result = detector.detectUnauthorizedDirectory('random/dir/file.js');
      expect(result.violated).toBe(true);
      expect(result.type).toBe('DIRECTORY_VIOLATION');
    });
  });
  
  describe('NAME_ID Validation', () => {
    test('should detect missing purpose', async () => {
      const result = await detector.detectNameIdViolation('test.js', '');
      expect(result.violated).toBe(true);
      expect(result.type).toBe('MISSING_PURPOSE');
    });
    
    test('should allow files with purpose', async () => {
      const result = await detector.detectNameIdViolation('test.js', 'Test file for validation');
      expect(result.violated).toBe(false);
    });
  });
  
  describe('Duplicate Detection', () => {
    test('should detect duplicate purposes', () => {
      const result = detector.detectDuplicatePurpose('Main project documentation');
      // Depends on NAME_ID.vf.json content
      expect(result).toBeDefined();
    });
    
    test('should calculate similarity correctly', () => {
      const sim1 = detector.calculateSimilarity('error handling utility', 'error handler utility');
      expect(sim1).toBeGreaterThan(0.5);
      
      const sim2 = detector.calculateSimilarity('database connection', 'error handling');
      expect(sim2).toBeLessThan(0.3);
    });
  });
  
  describe('Naming Conventions', () => {
    test('should accept valid file names', () => {
      const validNames = ['test.js', 'my-file.ts', 'file_name.py', 'config.json'];
      
      for (const name of validNames) {
        const result = detector.detectNamingViolation(name);
        expect(result.violated).toBe(false);
      }
    });
    
    test('should reject invalid file names', () => {
      const invalidNames = ['test file.js', 'file@name.ts', 'config!.json'];
      
      for (const name of invalidNames) {
        const result = detector.detectNamingViolation(name);
        expect(result.violated).toBe(true);
        expect(result.type).toBe('NAMING_CONVENTION');
      }
    });
  });
  
  describe('Path Traversal Protection', () => {
    test('should block path traversal attempts', () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        'test/../../../secret.txt',
        '../../root/file.js'
      ];
      
      for (const path of maliciousPaths) {
        const result = detector.detectPathTraversal(path);
        expect(result.violated).toBe(true);
        expect(result.type).toBe('PATH_TRAVERSAL');
        expect(result.severity).toBe('critical');
      }
    });
    
    test('should allow normal paths', () => {
      const normalPaths = [
        'gen/doc/report.md',
        'layer/themes/my-theme/index.ts',
        'tests/test.spec.js'
      ];
      
      for (const path of normalPaths) {
        const result = detector.detectPathTraversal(path);
        expect(result.violated).toBe(false);
      }
    });
  });
  
  describe('Complete Operation Analysis', () => {
    test('should analyze file creation operation', async () => {
      const operation = {
        filePath: 'test.js',
        purpose: 'Test file',
        content: '// Test',
        force: false
      };
      
      const result = await detector.analyzeOperation(operation);
      
      expect(result.filePath).toBe('test.js');
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.blocked).toBe(true);
    });
    
    test('should allow forced operations with justification', async () => {
      const operation = {
        filePath: 'emergency.js',
        purpose: 'Emergency fix',
        content: '// Fix',
        force: true
      };
      
      const result = await detector.analyzeOperation(operation);
      
      expect(result.forced).toBe(true);
      expect(result.blocked).toBe(false);
    });
  });
  
  describe('Response Analysis', () => {
    test('should analyze successful response', () => {
      const response = {
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              allowed: true
            })
          }]
        }
      };
      
      const analysis = detector.analyzeResponse(response);
      expect(analysis.success).toBe(true);
      expect(analysis.violations.length).toBe(0);
    });
    
    test('should analyze error response', () => {
      const response = {
        error: {
          message: 'File creation blocked'
        }
      };
      
      const analysis = detector.analyzeResponse(response);
      expect(analysis.success).toBe(false);
      expect(analysis.violations.length).toBeGreaterThan(0);
    });
    
    test('should analyze violation response', () => {
      const response = {
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              allowed: false,
              issues: [
                { type: 'ROOT_FILE_VIOLATION', message: 'Not allowed' }
              ],
              warnings: [
                { type: 'DUPLICATE_PURPOSE', message: 'Similar file exists' }
              ]
            })
          }]
        }
      };
      
      const analysis = detector.analyzeResponse(response);
      expect(analysis.success).toBe(false);
      expect(analysis.violations.length).toBe(1);
      expect(analysis.warnings.length).toBe(1);
    });
  });
  
  describe('Integration Tests', () => {
    test('should run complete test cycle', async () => {
      // This would require actual MCP server running
      if (process.env.INTEGRATION_TEST === 'true') {
        await runner.initialize();
        
        const results = await runner.runAllTests();
        
        expect(results.summary.totalTests).toBeGreaterThan(0);
        expect(results.tests).toHaveLength(3); // violation, allowed, edge cases
      }
    });
  });
});

// Performance tests
describe('MCP Performance Tests', () => {
  test('should handle large number of operations', async () => {
    const detector = new ViolationDetector();
    await detector.initialize();
    
    const startTime = Date.now();
    
    // Test 100 operations
    for (let i = 0; i < 100; i++) {
      await detector.analyzeOperation({
        filePath: `test-${i}.js`,
        purpose: `Test file ${i}`,
        content: '// Test',
        force: false
      });
    }
    
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    expect(detector.violations.length).toBe(100);
  });
  
  test('should handle concurrent operations', async () => {
    const detector = new ViolationDetector();
    await detector.initialize();
    
    const operations = Array.from({ length: 10 }, (_, i) => ({
      filePath: `concurrent-${i}.js`,
      purpose: `Concurrent test ${i}`,
      content: '// Test',
      force: false
    }));
    
    const startTime = Date.now();
    
    // Run operations concurrently
    await Promise.all(
      operations.map(op => detector.analyzeOperation(op))
    );
    
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(1000); // Should complete within 1 second
    expect(detector.violations.length).toBe(10);
  });
});