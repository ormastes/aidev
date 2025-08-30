import { test, expect } from '@playwright/test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Comprehensive MCP Integration System Tests
 * Tests full MCP server functionality, protocol compliance, and integration points
 */

test.describe('MCP Integration System Tests', () => {
  let mcpClient: Client;
  let transport: StdioClientTransport;
  let serverProcess: any;
  
  const workspaceRoot = process.cwd();
  const testDataDir = path.join(workspaceRoot, 'gen/test-data');
  const mcpServerPath = path.join(workspaceRoot, 'layer/themes/infra_filesystem-mcp/mcp-server.js');
  
  test.beforeAll(async () => {
    // Ensure test data directory exists
    await fs.mkdir(testDataDir, { recursive: true });
  });

  test.afterAll(async () => {
    // Cleanup
    if (serverProcess) {
      serverProcess.kill();
    }
    
    // Remove test data
    try {
      await fs.rm(testDataDir, { recursive: true });
    } catch (e) {
      // Directory might not exist
    }
  });

  test.describe('MCP Server Lifecycle', () => {
    test('should start MCP server successfully', async () => {
      serverProcess = spawn('node', [mcpServerPath], {
        env: {
          ...process.env,
          VF_BASE_PATH: workspaceRoot,
          MCP_MODE: 'test'
        }
      });

      // Create client transport
      transport = new StdioClientTransport({
        command: 'node',
        args: [mcpServerPath],
        env: {
          VF_BASE_PATH: workspaceRoot,
          MCP_MODE: 'test'
        }
      });

      mcpClient = new Client({
        name: 'test-client',
        version: '1.0.0'
      }, {
        capabilities: {}
      });

      // Connect to server
      await mcpClient.connect(transport);
      
      // Verify server info
      const serverInfo = await mcpClient.getServerInfo();
      expect(serverInfo.name).toBe('filesystem-mcp');
      expect(serverInfo.version).toBeDefined();
    });

    test('should handle multiple client connections', async () => {
      const clients: Client[] = [];
      
      for (let i = 0; i < 3; i++) {
        const transport = new StdioClientTransport({
          command: 'node',
          args: [mcpServerPath],
          env: {
            VF_BASE_PATH: workspaceRoot,
            MCP_MODE: 'test'
          }
        });

        const client = new Client({
          name: `test-client-${i}`,
          version: '1.0.0'
        }, {
          capabilities: {}
        });

        await client.connect(transport);
        clients.push(client);
      }

      // Verify all clients are connected
      for (const client of clients) {
        const info = await client.getServerInfo();
        expect(info.name).toBe('filesystem-mcp');
      }

      // Cleanup
      for (const client of clients) {
        await client.close();
      }
    });
  });

  test.describe('Tool Discovery and Invocation', () => {
    test('should list all available tools', async () => {
      const tools = await mcpClient.listTools();
      
      expect(tools).toBeDefined();
      expect(Array.isArray(tools.tools)).toBe(true);
      
      // Check for expected tools
      const toolNames = tools.tools.map(t => t.name);
      expect(toolNames).toContain('read_file');
      expect(toolNames).toContain('write_file');
      expect(toolNames).toContain('list_files');
      expect(toolNames).toContain('validate_vf_json');
      expect(toolNames).toContain('update_task_queue');
    });

    test('should read files through MCP', async () => {
      // Create a test file
      const testFile = path.join(testDataDir, 'test-read.txt');
      const testContent = 'Test content for MCP read';
      await fs.writeFile(testFile, testContent);

      // Read through MCP
      const result = await mcpClient.callTool('read_file', {
        path: testFile
      });

      expect(result).toBeDefined();
      const content = result.content?.[0]?.text;
      expect(content).toContain(testContent);
    });

    test('should write files through MCP', async () => {
      const testFile = path.join(testDataDir, 'test-write.txt');
      const testContent = 'Content written through MCP';

      // Write through MCP
      const result = await mcpClient.callTool('write_file', {
        path: testFile,
        content: testContent
      });

      expect(result).toBeDefined();
      expect(result.content?.[0]?.text).toContain('success');

      // Verify file was written
      const actualContent = await fs.readFile(testFile, 'utf-8');
      expect(actualContent).toBe(testContent);
    });

    test('should validate VF.json files', async () => {
      const validVfJson = {
        metadata: {
          version: '1.0.0',
          created_at: new Date().toISOString()
        },
        content: {
          test: 'data'
        }
      };

      const invalidVfJson = {
        // Missing metadata
        content: {
          test: 'data'
        }
      };

      // Test valid JSON
      const validResult = await mcpClient.callTool('validate_vf_json', {
        content: JSON.stringify(validVfJson)
      });
      expect(validResult.content?.[0]?.text).toContain('valid');

      // Test invalid JSON
      const invalidResult = await mcpClient.callTool('validate_vf_json', {
        content: JSON.stringify(invalidVfJson)
      });
      expect(invalidResult.content?.[0]?.text).toContain('invalid');
    });
  });

  test.describe('Resource Management', () => {
    test('should list available resources', async () => {
      const resources = await mcpClient.listResources();
      
      expect(resources).toBeDefined();
      expect(Array.isArray(resources.resources)).toBe(true);
      
      // Check for expected resources
      const resourceNames = resources.resources.map(r => r.name);
      expect(resourceNames).toContain('vf://TASK_QUEUE');
      expect(resourceNames).toContain('vf://FEATURE');
      expect(resourceNames).toContain('vf://CLAUDE');
    });

    test('should read resource content', async () => {
      // Read TASK_QUEUE resource
      const resource = await mcpClient.readResource('vf://TASK_QUEUE');
      
      expect(resource).toBeDefined();
      expect(resource.content).toBeDefined();
      
      // Parse and validate content
      const content = JSON.parse(resource.content[0].text);
      expect(content.metadata).toBeDefined();
      expect(content.queues).toBeDefined();
    });

    test('should handle resource updates', async () => {
      // Create a test resource
      const testResourcePath = path.join(workspaceRoot, 'TEST_RESOURCE.vf.json');
      const originalContent = {
        metadata: {
          version: '1.0.0',
          created_at: new Date().toISOString()
        },
        data: {
          test: 'original'
        }
      };
      
      await fs.writeFile(testResourcePath, JSON.stringify(originalContent, null, 2));

      // Read through MCP
      const readResult = await mcpClient.readResource('vf://TEST_RESOURCE');
      const readContent = JSON.parse(readResult.content[0].text);
      expect(readContent.data.test).toBe('original');

      // Update through MCP
      const updatedContent = {
        ...originalContent,
        data: {
          test: 'updated'
        }
      };
      
      await mcpClient.callTool('write_file', {
        path: testResourcePath,
        content: JSON.stringify(updatedContent, null, 2)
      });

      // Verify update
      const verifyResult = await mcpClient.readResource('vf://TEST_RESOURCE');
      const verifyContent = JSON.parse(verifyResult.content[0].text);
      expect(verifyContent.data.test).toBe('updated');

      // Cleanup
      await fs.unlink(testResourcePath);
    });
  });

  test.describe('Prompts and Templates', () => {
    test('should list available prompts', async () => {
      const prompts = await mcpClient.listPrompts();
      
      expect(prompts).toBeDefined();
      expect(Array.isArray(prompts.prompts)).toBe(true);
      
      // Check for expected prompts
      const promptNames = prompts.prompts.map(p => p.name);
      expect(promptNames.length).toBeGreaterThan(0);
    });

    test('should get prompt content', async () => {
      const prompts = await mcpClient.listPrompts();
      
      if (prompts.prompts.length > 0) {
        const firstPrompt = prompts.prompts[0];
        const promptContent = await mcpClient.getPrompt(firstPrompt.name, {});
        
        expect(promptContent).toBeDefined();
        expect(promptContent.messages).toBeDefined();
        expect(Array.isArray(promptContent.messages)).toBe(true);
      }
    });
  });

  test.describe('Error Handling and Validation', () => {
    test('should handle invalid tool calls gracefully', async () => {
      try {
        await mcpClient.callTool('non_existent_tool', {});
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('not found');
      }
    });

    test('should validate file paths', async () => {
      // Try to read file outside workspace
      try {
        await mcpClient.callTool('read_file', {
          path: '/etc/passwd'
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toMatch(/not allowed|permission|outside/i);
      }
    });

    test('should handle malformed requests', async () => {
      // Send request with missing required parameters
      try {
        await mcpClient.callTool('write_file', {
          // Missing 'content' parameter
          path: path.join(testDataDir, 'test.txt')
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toMatch(/required|missing|content/i);
      }
    });
  });

  test.describe('Concurrent Operations', () => {
    test('should handle concurrent read operations', async () => {
      // Create test files
      const files = [];
      for (let i = 0; i < 5; i++) {
        const filePath = path.join(testDataDir, `concurrent-${i}.txt`);
        await fs.writeFile(filePath, `Content ${i}`);
        files.push(filePath);
      }

      // Read all files concurrently
      const readPromises = files.map(file => 
        mcpClient.callTool('read_file', { path: file })
      );
      
      const results = await Promise.all(readPromises);
      
      // Verify all reads succeeded
      results.forEach((result, i) => {
        expect(result.content?.[0]?.text).toContain(`Content ${i}`);
      });
    });

    test('should handle concurrent write operations', async () => {
      // Write multiple files concurrently
      const writePromises = [];
      for (let i = 0; i < 5; i++) {
        const filePath = path.join(testDataDir, `concurrent-write-${i}.txt`);
        writePromises.push(
          mcpClient.callTool('write_file', {
            path: filePath,
            content: `Concurrent content ${i}`
          })
        );
      }
      
      const results = await Promise.all(writePromises);
      
      // Verify all writes succeeded
      results.forEach(result => {
        expect(result.content?.[0]?.text).toContain('success');
      });
      
      // Verify files were written
      for (let i = 0; i < 5; i++) {
        const filePath = path.join(testDataDir, `concurrent-write-${i}.txt`);
        const content = await fs.readFile(filePath, 'utf-8');
        expect(content).toBe(`Concurrent content ${i}`);
      }
    });
  });

  test.describe('Performance Tests', () => {
    test('should handle large file operations', async () => {
      // Create a large file (1MB)
      const largeContent = 'x'.repeat(1024 * 1024);
      const largeFile = path.join(testDataDir, 'large-file.txt');
      
      // Write large file
      const startWrite = Date.now();
      await mcpClient.callTool('write_file', {
        path: largeFile,
        content: largeContent
      });
      const writeTime = Date.now() - startWrite;
      
      expect(writeTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Read large file
      const startRead = Date.now();
      const result = await mcpClient.callTool('read_file', {
        path: largeFile
      });
      const readTime = Date.now() - startRead;
      
      expect(readTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.content?.[0]?.text.length).toBe(largeContent.length);
    });

    test('should list directories efficiently', async () => {
      // Create many files
      for (let i = 0; i < 100; i++) {
        await fs.writeFile(
          path.join(testDataDir, `file-${i}.txt`),
          `Content ${i}`
        );
      }
      
      // List files
      const startList = Date.now();
      const result = await mcpClient.callTool('list_files', {
        path: testDataDir
      });
      const listTime = Date.now() - startList;
      
      expect(listTime).toBeLessThan(1000); // Should complete within 1 second
      
      const files = JSON.parse(result.content?.[0]?.text);
      expect(files.length).toBeGreaterThanOrEqual(100);
    });
  });

  test.describe('Security and Permissions', () => {
    test('should prevent unauthorized root file creation', async () => {
      try {
        await mcpClient.callTool('write_file', {
          path: path.join(workspaceRoot, 'unauthorized.txt'),
          content: 'This should not be created'
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toMatch(/not allowed|root|violation/i);
      }
    });

    test('should protect CLAUDE.md from direct modification', async () => {
      const claudePath = path.join(workspaceRoot, 'CLAUDE.md');
      
      try {
        await mcpClient.callTool('write_file', {
          path: claudePath,
          content: 'Modified content'
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toMatch(/protected|not allowed|CLAUDE/i);
      }
    });

    test('should enforce TASK_QUEUE.vf.json validation', async () => {
      const taskQueuePath = path.join(workspaceRoot, 'TASK_QUEUE.vf.json');
      
      // Read current content
      const currentContent = await fs.readFile(taskQueuePath, 'utf-8');
      const taskQueue = JSON.parse(currentContent);
      
      // Try to update with invalid structure
      const invalidUpdate = {
        invalid: 'structure'
      };
      
      try {
        await mcpClient.callTool('update_task_queue', {
          updates: invalidUpdate
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toMatch(/invalid|validation|structure/i);
      }
    });
  });
});

// Helper function to wait for condition
async function waitFor(condition: () => Promise<boolean>, timeout = 5000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Timeout waiting for condition');
}