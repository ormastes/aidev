import { lspMcpTools } from '../../pipe';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';

// Mock the modules
jest.mock('child_process');
jest.mock('fs/promises');

const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
const mockFs = fs as jest.Mocked<typeof fs>;

describe('Multi-Instance LSP-MCP Integration', () => {
  let mockProcesses: Map<string, any>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockProcesses = new Map();
    
    // Mock spawn to create different processes for each instance
    mockSpawn.mockImplementation(() => {
      const processId = `process-${mockProcesses.size}`;
      const mockProcess = {
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
        pid: 12345 + mockProcesses.size
      };
      
      mockProcesses.set(processId, mockProcess);
      return mockProcess as any;
    });
    
    // Mock file system
    mockFs.access.mockImplementation(async (path) => {
      if (path.includes('package.json') || path.includes('tsconfig.json')) {
        return Promise.resolve();
      }
      throw new Error('Not found');
    });
  });
  
  afterEach(async () => {
    // Clean up any instances
    const instances = await lspMcpTools.listInstances();
    for (const instance of instances) {
      await lspMcpTools.removeInstance({ instanceId: instance.id });
    }
  });
  
  describe('Instance Management', () => {
    it('should create multiple instances for different projects', async () => {
      // Create first instance
      const id1 = await lspMcpTools.createInstance({
        name: 'Frontend Project',
        rootPath: '/projects/frontend'
      });
      
      // Create second instance
      const id2 = await lspMcpTools.createInstance({
        name: 'Backend Project',
        rootPath: '/projects/backend'
      });
      
      expect(id1).toBe('frontend-project');
      expect(id2).toBe('backend-project');
      
      // List instances
      const instances = await lspMcpTools.listInstances();
      expect(instances).toHaveLength(2);
      expect(instances[0].name).toBe('Frontend Project');
      expect(instances[1].name).toBe('Backend Project');
    });
    
    it('should switch between instances', async () => {
      // Create instances
      const id1 = await lspMcpTools.createInstance({
        name: 'Project A',
        rootPath: '/projects/a'
      });
      
      const id2 = await lspMcpTools.createInstance({
        name: 'Project B',
        rootPath: '/projects/b'
      });
      
      // Set active instance
      await lspMcpTools.setActiveInstance({ instanceId: id2 });
      
      const instances = await lspMcpTools.listInstances();
      expect(instances.find(i => i.id === id1)?.isActive).toBe(false);
      expect(instances.find(i => i.id === id2)?.isActive).toBe(true);
    });
    
    it('should auto-create instance based on file location', async () => {
      mockFs.readFile.mockResolvedValue('const x = 42;');
      
      // Mock LSP responses
      const setupMockProcess = (process: any) => {
        let requestId = 0;
        process.stdin.write.mockImplementation((_data: any, cb: any) => {
          const message = _data.toString();
          
          if (message.includes('"method":"initialize"')) {
            requestId++;
            setTimeout(() => {
              process.stdout.on.mock.calls
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
            setTimeout(() => {
              process.stdout.on.mock.calls
                .find((call: any) => call[0] === 'data')?.[1]?.(
                  Buffer.from(JSON.stringify({
                    jsonrpc: '2.0',
                    id: requestId,
                    result: { contents: 'const x: number' }
                  }))
                );
            }, 10);
          }
          
          if (cb) cb();
        });
      };
      
      // Setup mock for any created process
      mockSpawn.mockImplementation(() => {
        const process = {
          stdout: { on: jest.fn() },
          stdin: { write: jest.fn() },
          stderr: { on: jest.fn() },
          on: jest.fn(),
          kill: jest.fn(),
          pid: 12345
        };
        setupMockProcess(process);
        return process as any;
      });
      
      // Request without creating instance first
      const result = await lspMcpTools.getTypeAtPosition({
        file: '/auto/project/src/file.ts',
        line: 0,
        character: 6
      });
      
      expect(result).toBeTruthy();
      expect(result?.name).toBe('x');
      
      // Check that instance was created
      const instances = await lspMcpTools.listInstances();
      expect(instances).toHaveLength(1);
      expect(instances[0].rootPath).toMatch(/\/auto\/project$/);
    });
  });
  
  describe('Instance-specific Operations', () => {
    let instance1Id: string;
    let instance2Id: string;
    
    beforeEach(async () => {
      // Create two instances
      instance1Id = await lspMcpTools.createInstance({
        name: 'Instance 1',
        rootPath: '/project1'
      });
      
      instance2Id = await lspMcpTools.createInstance({
        name: 'Instance 2',
        rootPath: '/project2'
      });
      
      // Setup different responses for each process
      let processIndex = 0;
      for (const [_id, process] of mockProcesses) {
        const instanceNum = processIndex + 1;
        let requestId = 0;
        
        process.stdin.write.mockImplementation((_data: any, cb: any) => {
          const message = _data.toString();
          
          if (message.includes('"method":"initialize"')) {
            requestId++;
            setTimeout(() => {
              process.stdout.on.mock.calls
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
            setTimeout(() => {
              process.stdout.on.mock.calls
                .find((call: any) => call[0] === 'data')?.[1]?.(
                  Buffer.from(JSON.stringify({
                    jsonrpc: '2.0',
                    id: requestId,
                    result: {
                      contents: `Instance ${instanceNum}: const x: string`
                    }
                  }))
                );
            }, 10);
          }
          
          if (cb) cb();
        });
        
        processIndex++;
      }
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    it('should use specific instance when provided', async () => {
      // Get type from instance 1
      const result1 = await lspMcpTools.getHover({
        file: '/project1/file.ts',
        line: 0,
        character: 0,
        instanceId: instance1Id
      });
      
      expect(result1?.contents).toContain('Instance 1');
      
      // Get type from instance 2
      const result2 = await lspMcpTools.getHover({
        file: '/project2/file.ts',
        line: 0,
        character: 0,
        instanceId: instance2Id
      });
      
      expect(result2?.contents).toContain('Instance 2');
    });
    
    it('should handle workspace-specific operations', async () => {
      // Mock different capabilities for each instance
      let processIndex = 0;
      for (const [_id, process] of mockProcesses) {
        const instanceNum = processIndex + 1;
        let requestId = 0;
        
        process.stdin.write.mockImplementation((_data: any, cb: any) => {
          const message = _data.toString();
          
          if (message.includes('"method":"workspace/symbol"')) {
            requestId++;
            setTimeout(() => {
              process.stdout.on.mock.calls
                .find((call: any) => call[0] === 'data')?.[1]?.(
                  Buffer.from(JSON.stringify({
                    jsonrpc: '2.0',
                    id: requestId,
                    result: [
                      {
                        name: `Symbol${instanceNum}`,
                        kind: 5,
                        location: {
                          uri: `file:///project${instanceNum}/symbol.ts`,
                          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } }
                        }
                      }
                    ]
                  }))
                );
            }, 10);
          }
          
          if (cb) cb();
        });
        
        processIndex++;
      }
      
      // Search symbols in instance 1
      const symbols1 = await lspMcpTools.getWorkspaceSymbols({
        query: 'Symbol',
        instanceId: instance1Id
      });
      
      expect(symbols1).toHaveLength(1);
      expect(symbols1[0].name).toBe('Symbol1');
      expect(symbols1[0].location.file).toBe('/project1/symbol.ts');
      
      // Search symbols in instance 2
      const symbols2 = await lspMcpTools.getWorkspaceSymbols({
        query: 'Symbol',
        instanceId: instance2Id
      });
      
      expect(symbols2).toHaveLength(1);
      expect(symbols2[0].name).toBe('Symbol2');
      expect(symbols2[0].location.file).toBe('/project2/symbol.ts');
    });
  });
  
  describe('Instance Lifecycle', () => {
    it('should handle instance removal properly', async () => {
      // Create instances
      const id1 = await lspMcpTools.createInstance({
        name: 'Temp Project',
        rootPath: '/temp/project'
      });
      
      const id2 = await lspMcpTools.createInstance({
        name: 'Main Project',
        rootPath: '/main/project'
      });
      
      // Remove first instance
      await lspMcpTools.removeInstance({ instanceId: id1 });
      
      // Check that process was killed
      const firstProcess = Array.from(mockProcesses.values())[0];
      expect(firstProcess.kill).toHaveBeenCalled();
      
      // Verify instance is gone
      const instances = await lspMcpTools.listInstances();
      expect(instances).toHaveLength(1);
      expect(instances[0].id).toBe(id2);
      
      // Operations on removed instance should fail
      await expect(lspMcpTools.getTypeAtPosition({
        file: '/temp/project/file.ts',
        line: 0,
        character: 0,
        instanceId: id1
      })).rejects.toThrow();
    });
    
    it('should handle concurrent operations on different instances', async () => {
      // Create instances
      const id1 = await lspMcpTools.createInstance({
        name: 'Project 1',
        rootPath: '/concurrent/project1'
      });
      
      const id2 = await lspMcpTools.createInstance({
        name: 'Project 2',
        rootPath: '/concurrent/project2'
      });
      
      // Setup mock responses
      for (const [_id, process] of mockProcesses) {
        let requestId = 0;
        process.stdin.write.mockImplementation((_data: any, cb: any) => {
          const message = _data.toString();
          
          if (message.includes('"method":"initialize"')) {
            requestId++;
            setTimeout(() => {
              process.stdout.on.mock.calls
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
            const file = message.includes('project1') ? 'project1' : 'project2';
            setTimeout(() => {
              process.stdout.on.mock.calls
                .find((call: any) => call[0] === 'data')?.[1]?.(
                  Buffer.from(JSON.stringify({
                    jsonrpc: '2.0',
                    id: requestId,
                    result: {
                      items: [{ label: `completion-${file}`, kind: 6 }]
                    }
                  }))
                );
            }, 10);
          }
          
          if (cb) cb();
        });
      }
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Run concurrent operations
      const [completions1, completions2] = await Promise.all([
        lspMcpTools.getCompletions({
          file: '/concurrent/project1/file.ts',
          line: 0,
          character: 0,
          instanceId: id1
        }),
        lspMcpTools.getCompletions({
          file: '/concurrent/project2/file.ts',
          line: 0,
          character: 0,
          instanceId: id2
        })
      ]);
      
      expect(completions1[0].label).toBe('completion-project1');
      expect(completions2[0].label).toBe('completion-project2');
    });
  });
});