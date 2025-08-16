import { LSPClient } from '../../children/LSPClient';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import { EventEmitter } from '../../../infra_external-log-lib/src';
import { Readable, Writable } from 'stream';

// Mock types
const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
const mockFs = fs as jest.Mocked<typeof fs>;

describe('LSPClient', () => {
  let client: LSPClient;
  let mockProcess: any;
  let mockStdout: Readable;
  let mockStdin: Writable;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock streams
    mockStdout = new Readable({
      read() {}
    });
    mockStdin = new Writable({
      write(_chunk, _encoding, callback) {
        callback();
      }
    });
    
    // Create mock process
    mockProcess = new EventEmitter();
    mockProcess.stdout = mockStdout;
    mockProcess.stdin = mockStdin;
    mockProcess.stderr = new Readable({ read() {} });
    mockProcess.kill = jest.fn();
    
    // Mock spawn to return our mock process
    mockSpawn.mockReturnValue(mockProcess as any);
    
    // Create client
    client = new LSPClient();
  });
  
  afterEach(async () => {
    if (client) {
      try {
        await client.shutdown();
      } catch (error) {
        // Ignore shutdown errors in tests
      }
    }
  });
  
  describe('initialize', () => {
    it('should start the language server process', async () => {
      // Mock the connection response
      const initPromise = client.initialize();
      
      // Simulate server started
      process.nextTick(() => {
        // Simulate initialize response
        const response = {
          jsonrpc: '2.0',
          id: 1,
          result: {
            capabilities: {
              textDocumentSync: 1,
              completionProvider: true
            }
          }
        };
        
        mockStdout.push(`Content-Length: ${JSON.stringify(response).length}\r\n\r\n${JSON.stringify(response)}`);
        mockStdout.push(null);
      });
      
      await expect(initPromise).resolves.not.toThrow();
      expect(mockSpawn).toHaveBeenCalled();
    });
    
    it('should handle process spawn errors', async () => {
      // Make spawn emit error
      mockSpawn.mockImplementation(() => {
        const proc = new EventEmitter() as any;
        process.nextTick(() => proc.emit('error', new Error('Spawn failed')));
        return proc;
      });
      
      await expect(client.initialize()).rejects.toThrow('Failed to start language server');
    });
    
    it('should not reinitialize if already initialized', async () => {
      // First initialization
      const initPromise1 = client.initialize();
      process.nextTick(() => {
        const response = {
          jsonrpc: '2.0',
          id: 1,
          result: { capabilities: {} }
        };
        mockStdout.push(`Content-Length: ${JSON.stringify(response).length}\r\n\r\n${JSON.stringify(response)}`);
      });
      await initPromise1;
      
      // Second initialization should return immediately
      jest.clearAllMocks();
      await client.initialize();
      expect(mockSpawn).not.toHaveBeenCalled();
    });
  });
  
  describe('shutdown', () => {
    it('should send shutdown request and exit notification', async () => {
      // Initialize first
      const initPromise = client.initialize();
      process.nextTick(() => {
        const response = {
          jsonrpc: '2.0',
          id: 1,
          result: { capabilities: {} }
        };
        mockStdout.push(`Content-Length: ${JSON.stringify(response).length}\r\n\r\n${JSON.stringify(response)}`);
      });
      await initPromise;
      
      // Mock write to capture messages
      const writtenMessages: string[] = [];
      mockStdin.write = jest.fn((chunk: any, callback?: any) => {
        writtenMessages.push(chunk.toString());
        if (callback) callback(null);
        return true;
      }) as any;
      
      // Shutdown
      const shutdownPromise = client.shutdown();
      
      // Simulate shutdown response
      process.nextTick(() => {
        const response = {
          jsonrpc: '2.0',
          id: 2,
          result: null
        };
        mockStdout.push(`Content-Length: ${JSON.stringify(response).length}\r\n\r\n${JSON.stringify(response)}`);
      });
      
      await shutdownPromise;
      
      // Verify shutdown and exit were sent
      expect(writtenMessages.some(msg => msg.includes('"method":"shutdown"'))).toBe(true);
      expect(writtenMessages.some(msg => msg.includes('"method":"exit"'))).toBe(true);
      expect(mockProcess.kill).toHaveBeenCalled();
    });
  });
  
  describe('openDocument', () => {
    beforeEach(async () => {
      // Initialize client
      const initPromise = client.initialize();
      process.nextTick(() => {
        const response = {
          jsonrpc: '2.0',
          id: 1,
          result: { capabilities: {} }
        };
        mockStdout.push(`Content-Length: ${JSON.stringify(response).length}\r\n\r\n${JSON.stringify(response)}`);
      });
      await initPromise;
    });
    
    it('should open a document with provided content', async () => {
      const writtenMessages: string[] = [];
      mockStdin.write = jest.fn((chunk: any, callback?: any) => {
        writtenMessages.push(chunk.toString());
        if (callback) callback(null);
        return true;
      }) as any;
      
      await client.openDocument('/test/file.ts', 'const x = 42;');
      
      const openMessage = writtenMessages.find(msg => msg.includes('textDocument/didOpen'));
      expect(openMessage).toBeDefined();
      expect(openMessage).toContain('file:///test/file.ts');
      expect(openMessage).toContain('const x = 42;');
      expect(openMessage).toContain('"languageId":"typescript"');
    });
    
    it('should read file content if not provided', async () => {
      mockFs.readFile.mockResolvedValue('const y = "hello";');
      
      const writtenMessages: string[] = [];
      mockStdin.write = jest.fn((chunk: any, callback?: any) => {
        writtenMessages.push(chunk.toString());
        if (callback) callback(null);
        return true;
      }) as any;
      
      await client.openDocument('/test/file.js');
      
      expect(mockFs.readFile).toHaveBeenCalledWith('/test/file.js', 'utf-8');
      const openMessage = writtenMessages.find(msg => msg.includes('textDocument/didOpen'));
      expect(openMessage).toContain('const y = "hello";');
      expect(openMessage).toContain('"languageId":"javascript"');
    });
  });
  
  describe('getLanguageId', () => {
    it('should return correct language IDs for file extensions', async () => {
      // Initialize client to access private method through reflection
      const initPromise = client.initialize();
      process.nextTick(() => {
        const response = {
          jsonrpc: '2.0',
          id: 1,
          result: { capabilities: {} }
        };
        mockStdout.push(`Content-Length: ${JSON.stringify(response).length}\r\n\r\n${JSON.stringify(response)}`);
      });
      await initPromise;
      
      // Test various file extensions
      const testCases = [
        { file: 'test.ts', expected: 'typescript' },
        { file: 'test.tsx', expected: 'typescriptreact' },
        { file: 'test.js', expected: 'javascript' },
        { file: 'test.jsx', expected: 'javascriptreact' },
        { file: 'test.json', expected: 'json' },
        { file: 'test.txt', expected: 'plaintext' },
        { file: 'test.unknown', expected: 'plaintext' }
      ];
      
      // Access private method through prototype
      const getLanguageId = (client as any).getLanguageId.bind(client);
      
      for (const { file, expected } of testCases) {
        expect(getLanguageId(file)).toBe(expected);
      }
    });
  });
  
  describe('normalizeUri', () => {
    it('should normalize file paths to URIs', () => {
      const testCases = [
        { input: '/home/user/file.ts', expected: 'file:///home/user/file.ts' },
        { input: 'relative/path.js', expected: expect.stringMatching(/^file:\/\/.*relative\/path\.js$/) }
      ];
      
      for (const { input, expected } of testCases) {
        const result = client.normalizeUri(input);
        if (typeof expected === 'string') {
          expect(result).toBe(expected);
        } else {
          expect(result).toMatch(expected);
        }
      }
    });
  });
});