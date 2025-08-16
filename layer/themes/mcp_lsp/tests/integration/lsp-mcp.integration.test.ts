import { lspMcpTools } from '../../pipe';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';

// Mock the modules
jest.mock('child_process');
jest.mock('fs/promises');

const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
const mockFs = fs as jest.Mocked<typeof fs>;

describe('LSP-MCP Integration Tests', () => {
  let mockProcess: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a more complete mock process
    mockProcess = {
      stdout: {
        on: jest.fn(),
        read: jest.fn(),
        pipe: jest.fn()
      },
      stdin: {
        write: jest.fn((_data, cb) => cb && cb()),
        end: jest.fn()
      },
      stderr: {
        on: jest.fn()
      },
      on: jest.fn(),
      kill: jest.fn(),
      pid: 12345
    };
    
    mockSpawn.mockReturnValue(mockProcess as any);
  });
  
  describe('Basic Workflow', () => {
    it('should get type information for a position', async () => {
      // Mock file read
      mockFs.readFile.mockResolvedValue('const x: number = 42;');
      
      // Mock LSP responses
      let requestId = 0;
      mockProcess.stdin.write.mockImplementation((_data: any, cb: any) => {
        const message = _data.toString();
        
        // Parse the message to get the method
        if (message.includes('"method":"initialize"')) {
          requestId++;
          // Simulate initialize response
          setTimeout(() => {
            mockProcess.stdout.on.mock.calls
              .find((call: any) => call[0] === 'data')?.[1]?.(
                Buffer.from(JSON.stringify({
                  jsonrpc: '2.0',
                  id: requestId,
                  result: { capabilities: {} }
                }))
              );
          }, 10);
        } else if (message.includes('"method":"textDocument/hover"')) {
          requestId++;
          // Simulate hover response
          setTimeout(() => {
            mockProcess.stdout.on.mock.calls
              .find((call: any) => call[0] === 'data')?.[1]?.(
                Buffer.from(JSON.stringify({
                  jsonrpc: '2.0',
                  id: requestId,
                  result: {
                    contents: 'const x: number'
                  }
                }))
              );
          }, 10);
        }
        
        if (cb) cb();
      });
      
      const result = await lspMcpTools.getTypeAtPosition({
        file: '/test/example.ts',
        line: 0,
        character: 6
      });
      
      expect(result).toBeTruthy();
      expect(result?.name).toBe('x');
      expect(result?.kind).toBe('const');
      expect(result?.type).toBe('number');
    });
    
    it('should find references across files', async () => {
      let requestId = 0;
      mockProcess.stdin.write.mockImplementation((_data: any, cb: any) => {
        const message = _data.toString();
        
        if (message.includes('"method":"initialize"')) {
          requestId++;
          setTimeout(() => {
            mockProcess.stdout.on.mock.calls
              .find((call: any) => call[0] === 'data')?.[1]?.(
                Buffer.from(JSON.stringify({
                  jsonrpc: '2.0',
                  id: requestId,
                  result: { capabilities: {} }
                }))
              );
          }, 10);
        } else if (message.includes('"method":"textDocument/references"')) {
          requestId++;
          setTimeout(() => {
            mockProcess.stdout.on.mock.calls
              .find((call: any) => call[0] === 'data')?.[1]?.(
                Buffer.from(JSON.stringify({
                  jsonrpc: '2.0',
                  id: requestId,
                  result: [
                    {
                      uri: 'file:///src/definition.ts',
                      range: {
                        start: { line: 5, character: 10 },
                        end: { line: 5, character: 20 }
                      }
                    },
                    {
                      uri: 'file:///src/usage1.ts',
                      range: {
                        start: { line: 10, character: 15 },
                        end: { line: 10, character: 25 }
                      }
                    },
                    {
                      uri: 'file:///src/usage2.ts',
                      range: {
                        start: { line: 3, character: 0 },
                        end: { line: 3, character: 10 }
                      }
                    }
                  ]
                }))
              );
          }, 10);
        }
        
        if (cb) cb();
      });
      
      const references = await lspMcpTools.findReferences({
        file: '/src/definition.ts',
        line: 5,
        character: 15
      });
      
      expect(references).toHaveLength(3);
      expect(references[0].file).toBe('/src/definition.ts');
      expect(references[1].file).toBe('/src/usage1.ts');
      expect(references[2].file).toBe('/src/usage2.ts');
    });
    
    it('should get code completions', async () => {
      let requestId = 0;
      mockProcess.stdin.write.mockImplementation((_data: any, cb: any) => {
        const message = _data.toString();
        
        if (message.includes('"method":"initialize"')) {
          requestId++;
          setTimeout(() => {
            mockProcess.stdout.on.mock.calls
              .find((call: any) => call[0] === 'data')?.[1]?.(
                Buffer.from(JSON.stringify({
                  jsonrpc: '2.0',
                  id: requestId,
                  result: { capabilities: {} }
                }))
              );
          }, 10);
        } else if (message.includes('"method":"textDocument/completion"')) {
          requestId++;
          setTimeout(() => {
            mockProcess.stdout.on.mock.calls
              .find((call: any) => call[0] === 'data')?.[1]?.(
                Buffer.from(JSON.stringify({
                  jsonrpc: '2.0',
                  id: requestId,
                  result: {
                    items: [
                      {
                        label: 'console',
                        kind: 6,
                        detail: 'const console: Console',
                        documentation: 'The console object'
                      },
                      {
                        label: "parseInt",
                        kind: 3,
                        detail: 'function parseInt(string: string, radix?: number): number',
                        insertText: 'parseInt($1)'
                      }
                    ]
                  }
                }))
              );
          }, 10);
        }
        
        if (cb) cb();
      });
      
      const completions = await lspMcpTools.getCompletions({
        file: '/src/test.ts',
        line: 10,
        character: 5
      });
      
      expect(completions).toHaveLength(2);
      expect(completions[0].label).toBe('console');
      expect(completions[0].kind).toBe("variable");
      expect(completions[1].label).toBe("parseInt");
      expect(completions[1].kind).toBe("function");
    });
  });
  
  describe('Workspace Management', () => {
    it('should open and close workspace', async () => {
      let requestId = 0;
      let workspaceOpened = false;
      
      mockProcess.stdin.write.mockImplementation((_data: any, cb: any) => {
        const message = _data.toString();
        
        if (message.includes('"method":"initialize"')) {
          requestId++;
          const hasWorkspace = message.includes('rootUri');
          workspaceOpened = hasWorkspace;
          
          setTimeout(() => {
            mockProcess.stdout.on.mock.calls
              .find((call: any) => call[0] === 'data')?.[1]?.(
                Buffer.from(JSON.stringify({
                  jsonrpc: '2.0',
                  id: requestId,
                  result: { capabilities: {} }
                }))
              );
          }, 10);
        } else if (message.includes('"method":"shutdown"')) {
          requestId++;
          setTimeout(() => {
            mockProcess.stdout.on.mock.calls
              .find((call: any) => call[0] === 'data')?.[1]?.(
                Buffer.from(JSON.stringify({
                  jsonrpc: '2.0',
                  id: requestId,
                  result: null
                }))
              );
          }, 10);
        }
        
        if (cb) cb();
      });
      
      await lspMcpTools.openWorkspace({ rootPath: '/my/project' });
      expect(workspaceOpened).toBe(true);
      
      await lspMcpTools.closeWorkspace();
      expect(mockProcess.kill).toHaveBeenCalled();
    });
  });
  
  describe('Document Management', () => {
    it('should manage document lifecycle', async () => {
      const documentMessages: string[] = [];
      
      mockProcess.stdin.write.mockImplementation((_data: any, cb: any) => {
        const message = _data.toString();
        
        if (message.includes('textDocument/did')) {
          documentMessages.push(message);
        }
        
        if (cb) cb();
      });
      
      // Open document
      await lspMcpTools.openDocument({
        file: '/src/example.ts',
        content: 'const test = 123;'
      });
      
      expect(documentMessages.some(m => m.includes('textDocument/didOpen'))).toBe(true);
      expect(documentMessages.some(m => m.includes('const test = 123;'))).toBe(true);
      
      // Update document
      await lspMcpTools.updateDocument({
        file: '/src/example.ts',
        changes: [{
          range: {
            start: { line: 0, character: 6 },
            end: { line: 0, character: 10 }
          },
          newText: 'value'
        }]
      });
      
      expect(documentMessages.some(m => m.includes('textDocument/didChange'))).toBe(true);
      
      // Close document
      await lspMcpTools.closeDocument({
        file: '/src/example.ts'
      });
      
      expect(documentMessages.some(m => m.includes('textDocument/didClose'))).toBe(true);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle LSP server crashes', async () => {
      // Simulate server crash
      mockProcess.on.mockImplementation((event: any, handler: any) => {
        if (event === 'error') {
          setTimeout(() => handler(new Error('Server crashed')), 10);
        }
      });
      
      await expect(lspMcpTools.getTypeAtPosition({
        file: '/src/test.ts',
        line: 0,
        character: 0
      })).rejects.toThrow();
    });
    
    it('should handle malformed LSP responses', async () => {
      mockProcess.stdin.write.mockImplementation((_data: any, cb: any) => {
        // Send malformed response
        setTimeout(() => {
          mockProcess.stdout.on.mock.calls
            .find((call: any) => call[0] === 'data')?.[1]?.(
              Buffer.from('Invalid JSON')
            );
        }, 10);
        
        if (cb) cb();
      });
      
      await expect(lspMcpTools.getTypeAtPosition({
        file: '/src/test.ts',
        line: 0,
        character: 0
      })).rejects.toThrow();
    });
  });
});