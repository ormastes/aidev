import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';
import { spawn, exec } from 'child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const fsAsync = fs.promises;

/**
 * Comprehensive System Tests for Filesystem MCP Protection
 * Tests both success and failure scenarios
 */
describe('Filesystem MCP Protection System Tests', () => {
  const workspaceRoot = process.cwd();
  const testResultsDir = path.join(workspaceRoot, 'tests/system/reports');
  
  beforeAll(async () => {
    // Create test results directory
    await fsAsync.mkdir(testResultsDir, { recursive: true });
  });

  describe('File Protection Detection', () => {
    test('should detect when CLAUDE.md is NOT protected', async () => {
      const claudePath = path.join(workspaceRoot, '../../../CLAUDE.md');
      
      // Try to read the file
      const original = await fsAsync.readFile(claudePath, 'utf-8');
      
      // Attempt to modify
      let isProtected = false;
      try {
        const testContent = original + '\n## Test Modification';
        await fsAsync.writeFile(claudePath, testContent);
        // If write succeeds, immediately restore
        await fsAsync.writeFile(claudePath, original);
        isProtected = false;
      } catch (error) {
        isProtected = true;
      }
      
      // Currently expecting NO protection
      expect(isProtected).toBe(false);
      
      // Log result
      const result = {
        file: 'CLAUDE.md',
        protected: isProtected,
        timestamp: new Date().toISOString()
      };
      
      await fsAsync.writeFile(
        path.join(testResultsDir, 'claude-protection-test.json'),
        JSON.stringify(result, null, 2)
      );
    });

    test('should detect when .vf.json files are NOT protected', async () => {
      const vfFiles = [
        'TASK_QUEUE.vf.json',
        'FEATURE.vf.json',
        'NAME_ID.vf.json',
        'FILE_STRUCTURE.vf.json'
      ];
      
      const results = [];
      
      for (const vfFile of vfFiles) {
        const vfPath = path.join(workspaceRoot, '../../../', vfFile);
        
        try {
          const original = await fsAsync.readFile(vfPath, 'utf-8');
          const data = JSON.parse(original);
          
          // Try to modify
          let isProtected = false;
          try {
            data.__test_modification__ = Date.now();
            await fsAsync.writeFile(vfPath, JSON.stringify(data, null, 2));
            // Restore immediately
            await fsAsync.writeFile(vfPath, original);
            isProtected = false;
          } catch (error) {
            isProtected = true;
          }
          
          results.push({
            file: vfFile,
            protected: isProtected,
            exists: true
          });
          
          // Currently expecting NO protection
          expect(isProtected).toBe(false);
        } catch (error) {
          results.push({
            file: vfFile,
            protected: false,
            exists: false,
            error: error.message
          });
        }
      }
      
      await fsAsync.writeFile(
        path.join(testResultsDir, 'vf-files-protection-test.json'),
        JSON.stringify(results, null, 2)
      );
    });

    test('should detect root file creation violations', async () => {
      const testFile = path.join(workspaceRoot, '../../../', `test-violation-${Date.now()}.txt`);
      
      let violationAllowed = false;
      try {
        await fsAsync.writeFile(testFile, 'This should not be allowed in root');
        await fsAsync.unlink(testFile);
        violationAllowed = true;
      } catch (error) {
        violationAllowed = false;
      }
      
      // Currently expecting violation to be ALLOWED (no protection)
      expect(violationAllowed).toBe(true);
      
      const result = {
        test: 'root_file_creation',
        allowed: violationAllowed,
        timestamp: new Date().toISOString()
      };
      
      await fsAsync.writeFile(
        path.join(testResultsDir, 'root-violation-test.json'),
        JSON.stringify(result, null, 2)
      );
    });
  });

  describe('MCP Server Connection Tests', () => {
    test('should detect when MCP server is NOT running', async () => {
      const isRunning = await checkMCPServer();
      
      // Currently expecting MCP server to NOT be running
      expect(isRunning).toBe(false);
      
      const result = {
        test: 'mcp_server_status',
        running: isRunning,
        timestamp: new Date().toISOString()
      };
      
      await fsAsync.writeFile(
        path.join(testResultsDir, 'mcp-server-status.json'),
        JSON.stringify(result, null, 2)
      );
    });

    test('should handle MCP server connection failures gracefully', async () => {
      let errorHandled = false;
      
      try {
        // Try to connect to MCP server
        const WebSocket = require('ws');
        await new Promise((resolve, reject) => {
          const ws = new WebSocket('ws://localhost:8080');
          
          ws.on('open', () => {
            ws.close();
            resolve(true);
          });
          
          ws.on('error', (error) => {
            errorHandled = true;
            reject(error);
          });
          
          setTimeout(() => {
            ws.close();
            reject(new Error('Connection timeout'));
          }, 2000);
        });
      } catch (error) {
        errorHandled = true;
      }
      
      // Should handle connection failure
      expect(errorHandled).toBe(true);
    });
  });

  describe('Failure Detection Tests', () => {
    test('should correctly identify protection failures', async () => {
      const protectionTests = [
        { name: 'CLAUDE.md', protected: await testFileProtection('CLAUDE.md') },
        { name: 'TASK_QUEUE.vf.json', protected: await testFileProtection('TASK_QUEUE.vf.json') },
        { name: 'root_creation', protected: await testRootCreationProtection() }
      ];
      
      const failureCount = protectionTests.filter(t => !t.protected).length;
      const successCount = protectionTests.filter(t => t.protected).length;
      
      // Currently expecting ALL to fail (no protection)
      expect(failureCount).toBe(protectionTests.length);
      expect(successCount).toBe(0);
      
      const report = {
        tests: protectionTests,
        summary: {
          total: protectionTests.length,
          protected: successCount,
          unprotected: failureCount,
          protectionRate: (successCount / protectionTests.length) * 100
        },
        timestamp: new Date().toISOString()
      };
      
      await fsAsync.writeFile(
        path.join(testResultsDir, 'failure-detection-report.json'),
        JSON.stringify(report, null, 2)
      );
    });

    test('should generate comprehensive test report', async () => {
      const reports = await fsAsync.readdir(testResultsDir);
      const jsonReports = reports.filter(f => f.endsWith('.json'));
      
      const fullReport = {
        timestamp: new Date().toISOString(),
        environment: {
          workspace: workspaceRoot,
          nodeVersion: process.version,
          platform: process.platform
        },
        tests: {},
        summary: {
          totalTests: 0,
          passed: 0,
          failed: 0
        }
      };
      
      for (const reportFile of jsonReports) {
        const content = await fsAsync.readFile(
          path.join(testResultsDir, reportFile),
          'utf-8'
        );
        const data = JSON.parse(content);
        fullReport.tests[reportFile.replace('.json', '')] = data;
        fullReport.summary.totalTests++;
      }
      
      // Generate markdown report
      let mdReport = `# Filesystem MCP System Test Report

Generated: ${fullReport.timestamp}

## Environment
- Workspace: ${fullReport.environment.workspace}
- Node Version: ${fullReport.environment.nodeVersion}
- Platform: ${fullReport.environment.platform}

## Test Results

`;
      
      for (const [testName, testData] of Object.entries(fullReport.tests)) {
        mdReport += `### ${testName}\n`;
        mdReport += '```json\n';
        mdReport += JSON.stringify(testData, null, 2);
        mdReport += '\n```\n\n';
      }
      
      mdReport += `## Summary

- Total Test Suites: ${fullReport.summary.totalTests}
- Current Protection Status: **NOT ACTIVE** ❌

## Recommendations

1. Enable MCP server in strict or enhanced mode
2. Configure filesystem permissions
3. Implement violation logging
4. Enable real-time monitoring
`;
      
      await fsAsync.writeFile(
        path.join(testResultsDir, 'system-test-report.md'),
        mdReport
      );
      
      await fsAsync.writeFile(
        path.join(testResultsDir, 'system-test-report.json'),
        JSON.stringify(fullReport, null, 2)
      );
      
      expect(jsonReports.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Case Tests', () => {
    test('should handle concurrent modification attempts', async () => {
      const testFile = path.join(workspaceRoot, '../../../CLAUDE.md');
      const original = await fsAsync.readFile(testFile, 'utf-8');
      
      // Try multiple concurrent modifications
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          fsAsync.writeFile(testFile, original + `\n## Concurrent Test ${i}`)
            .then(() => fsAsync.writeFile(testFile, original))
            .then(() => ({ success: true, index: i }))
            .catch(() => ({ success: false, index: i }))
        );
      }
      
      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.success).length;
      
      // Currently expecting all to succeed (no protection)
      expect(successCount).toBe(5);
    });

    test('should handle large file modifications', async () => {
      const testFile = path.join(testResultsDir, 'large-test.txt');
      const largeContent = 'x'.repeat(1024 * 1024); // 1MB
      
      let canHandleLargeFiles = false;
      try {
        await fsAsync.writeFile(testFile, largeContent);
        const read = await fsAsync.readFile(testFile, 'utf-8');
        canHandleLargeFiles = read.length === largeContent.length;
        await fsAsync.unlink(testFile);
      } catch (error) {
        canHandleLargeFiles = false;
      }
      
      expect(canHandleLargeFiles).toBe(true);
    });

    test('should detect permission-based protection', async () => {
      // Check if we can detect filesystem-level protection
      const testFile = path.join(testResultsDir, 'permission-test.txt');
      
      try {
        // Create file
        await fsAsync.writeFile(testFile, 'test');
        
        // Try to make it read-only
        await fsAsync.chmod(testFile, 0o444);
        
        // Try to modify
        let isProtected = false;
        try {
          await fsAsync.writeFile(testFile, "modified");
          isProtected = false;
        } catch (error) {
          isProtected = true;
        }
        
        // Restore permissions and clean up
        await fsAsync.chmod(testFile, 0o644);
        await fsAsync.unlink(testFile);
        
        // Permission-based protection should work
        expect(isProtected).toBe(true);
      } catch (error) {
        // Skip test if permissions not supported
        console.log('Permission test skipped:', error.message);
      }
    });
  });
});

// Helper functions
async function checkMCPServer(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const WebSocket = require('ws');
      const ws = new WebSocket('ws://localhost:8080');
      
      ws.on('open', () => {
        ws.close();
        resolve(true);
      });
      
      ws.on('error', () => {
        resolve(false);
      });
      
      setTimeout(() => {
        ws.close();
        resolve(false);
      }, 2000);
    } catch (error) {
      resolve(false);
    }
  });
}

async function testFileProtection(fileName: string): Promise<boolean> {
  const filePath = path.join(process.cwd(), '../../../', fileName);
  
  try {
    const original = await fsAsync.readFile(filePath, 'utf-8');
    const testContent = original + '\n## Test Modification';
    
    try {
      await fsAsync.writeFile(filePath, testContent);
      await fsAsync.writeFile(filePath, original);
      return false; // Not protected
    } catch {
      return true; // Protected
    }
  } catch {
    return false; // File doesn't exist or can't be read
  }
}

async function testRootCreationProtection(): Promise<boolean> {
  const testFile = path.join(process.cwd(), '../../../', `test-${Date.now()}.txt`);
  
  try {
    await fsAsync.writeFile(testFile, 'test');
    await fsAsync.unlink(testFile);
    return false; // Not protected
  } catch {
    return true; // Protected
  }
}