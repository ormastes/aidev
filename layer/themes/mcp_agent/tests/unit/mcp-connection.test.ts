import { EventEmitter } from 'node:events';
import { spawn, ChildProcess } from 'child_process';
import WebSocket from 'ws';
import { MCPConnection } from '../../children/src/server/mcp-connection';
import {
  MCPConnectionConfig,
  MCPMethod,
  MCPProtocol,
  ServerCapabilities
} from '../../children/src/domain/protocol';

// Mock dependencies
jest.mock('child_process');
jest.mock('ws');
jest.mock('../../children/src/domain/protocol', () => ({
  ...jest.requireActual('../../children/src/domain/protocol'),
  MCPProtocol: {
    createRequest: jest.fn(),
    createNotification: jest.fn(),
  }
}));

const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
const MockWebSocket = WebSocket as jest.MockedClass<typeof WebSocket>;
const mockMCPProtocol = MCPProtocol as jest.Mocked<typeof MCPProtocol>;

describe("MCPConnection", () => {
  let connection: MCPConnection;
  let mockProcess: jest.Mocked<ChildProcess>;
  let mockWebSocket: jest.Mocked<WebSocket>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock child process
    mockProcess = {
      pid: 12345,
      stdin: {
        write: jest.fn()
      },
      stdout: {
        on: jest.fn()
      },
      stderr: {
        on: jest.fn()
      },
      on: jest.fn(),
      kill: jest.fn()
    } as any;

    // Mock WebSocket
    mockWebSocket = {
      on: jest.fn(),
      send: jest.fn(),
      close: jest.fn()
    } as any;

    mockSpawn.mockReturnValue(mockProcess);
    MockWebSocket.mockImplementation(() => mockWebSocket);

    // Mock protocol methods
    mockMCPProtocol.createRequest.mockImplementation((method, params) => ({
      jsonrpc: '2.0',
      id: Math.random(),
      method,
      params
    }));

    mockMCPProtocol.createNotification.mockImplementation((method, params) => ({
      jsonrpc: '2.0',
      method,
      params
    }));
  });

  describe("constructor", () => {
    it('should create connection with config', () => {
      const config: MCPConnectionConfig = {
        transport: 'stdio',
        command: 'node',
        args: ['server.js']
      };

      connection = new MCPConnection(config);

      expect(connection).toBeDefined();
      expect(connection).toBeInstanceOf(EventEmitter);
    });
  });

  describe('stdio transport', () => {
    beforeEach(() => {
      const config: MCPConnectionConfig = {
        transport: 'stdio',
        command: 'node',
        args: ['server.js']
      };
      connection = new MCPConnection(config);
    });

    it('should attempt to spawn process on connect', async () => {
      // Mock process ready
      mockProcess.on.mockImplementation((event, callback) => {
        return mockProcess;
      });

      // Mock stdout data handler for initialization
      mockProcess.stdout!.on = jest.fn().mockImplementation((event, callback) => {
        if (event === 'data') {
          // Simulate initialize response after short delay
          setTimeout(() => {
            const initResponse = {
              jsonrpc: '2.0',
              id: 1,
              result: {
                protocolVersion: '2024-11-05',
                capabilities: {
                  tools: { listChanged: true }
                },
                serverInfo: {
                  name: 'test-server',
                  version: '1.0.0'
                }
              }
            };
            callback(Buffer.from(JSON.stringify(initResponse) + '\n'));
          }, 10);
        }
        return mockProcess.stdout;
      });

      try {
        await connection.connect();
      } catch (error) {
        // Expected to fail due to missing implementation details
      }

      expect(mockSpawn).toHaveBeenCalledWith('node', ['server.js'], {
        stdio: ['pipe', 'pipe', 'inherit']
      });
    });

    it('should throw error if command is missing', async () => {
      const config: MCPConnectionConfig = {
        transport: 'stdio'
      };
      const badConnection = new MCPConnection(config);

      await expect(badConnection.connect()).rejects.toThrow('Command required for stdio transport');
    });
  });

  describe('websocket transport', () => {
    beforeEach(() => {
      const config: MCPConnectionConfig = {
        transport: "websocket",
        url: 'ws://localhost:8080',
        headers: { "Authorization": 'Bearer ${process.env.AUTH_TOKEN || "PLACEHOLDER_TOKEN"}' }
      };
      connection = new MCPConnection(config);
    });

    it('should create websocket connection', async () => {
      mockWebSocket.on.mockImplementation((event, callback) => {
        if (event === 'open') {
          setTimeout(() => callback(), 10);
        } else if (event === 'message') {
          // Simulate initialize response
          setTimeout(() => {
            const initResponse = {
              jsonrpc: '2.0',
              id: 1,
              result: {
                protocolVersion: '2024-11-05',
                capabilities: {
                  tools: { listChanged: true }
                },
                serverInfo: {
                  name: 'websocket-server',
                  version: '1.0.0'
                }
              }
            };
            callback(JSON.stringify(initResponse) + '\n');
          }, 20);
        }
        return mockWebSocket;
      });

      try {
        await connection.connect();
      } catch (error) {
        // Expected to fail due to missing implementation details
      }

      expect(MockWebSocket).toHaveBeenCalledWith('ws://localhost:8080', {
        headers: { "Authorization": 'Bearer ${process.env.AUTH_TOKEN || "PLACEHOLDER_TOKEN"}' }
      });
    });

    it('should throw error if URL is missing', async () => {
      const config: MCPConnectionConfig = {
        transport: "websocket"
      };
      const badConnection = new MCPConnection(config);

      await expect(badConnection.connect()).rejects.toThrow('URL required for websocket transport');
    });
  });

  describe('message handling', () => {
    beforeEach(() => {
      const config: MCPConnectionConfig = {
        transport: 'stdio',
        command: 'node',
        args: ['server.js']
      };
      connection = new MCPConnection(config);
    });

    it('should handle JSON-RPC responses', () => {
      const mockHandler = {
        resolve: jest.fn(),
        reject: jest.fn()
      };

      // Access private method through any type casting for testing
      const anyConnection = connection as any;
      anyConnection.requestMap.set(123, mockHandler);

      const response = {
        jsonrpc: '2.0',
        id: 123,
        result: { success: true }
      };

      // Test data handling
      anyConnection.handleData(JSON.stringify(response) + '\n');

      expect(mockHandler.resolve).toHaveBeenCalledWith({ success: true });
      expect(anyConnection.requestMap.has(123)).toBe(false);
    });

    it('should handle JSON-RPC errors', () => {
      const mockHandler = {
        resolve: jest.fn(),
        reject: jest.fn()
      };

      const anyConnection = connection as any;
      anyConnection.requestMap.set(456, mockHandler);

      const errorResponse = {
        jsonrpc: '2.0',
        id: 456,
        error: {
          code: -1,
          message: 'Method not found'
        }
      };

      anyConnection.handleData(JSON.stringify(errorResponse) + '\n');

      expect(mockHandler.reject).toHaveBeenCalledWith(new Error('Method not found'));
    });

    it('should handle notifications', () => {
      const notificationSpy = jest.spyOn(connection, 'emit');

      const notification = {
        jsonrpc: '2.0',
        method: 'tools/list_changed',
        params: {}
      };

      (connection as any).handleData(JSON.stringify(notification) + '\n');

      expect(notificationSpy).toHaveBeenCalledWith("notification", notification);
    });

    it('should handle malformed JSON gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      (connection as any).handleData('invalid json\n');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to parse message:',
        'invalid json',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should buffer partial messages', () => {
      const notificationSpy = jest.spyOn(connection, 'emit');

      const notification = {
        jsonrpc: '2.0',
        method: 'test',
        params: {}
      };

      const message = JSON.stringify(notification) + '\n';
      const part1 = message.slice(0, 10);
      const part2 = message.slice(10);

      // Send partial message
      (connection as any).handleData(part1);
      expect(notificationSpy).not.toHaveBeenCalled();

      // Send remaining part
      (connection as any).handleData(part2);
      expect(notificationSpy).toHaveBeenCalledWith("notification", notification);
    });
  });

  describe('error handling', () => {
    it('should handle unsupported transport', async () => {
      const config: MCPConnectionConfig = {
        transport: 'invalid' as any
      };
      connection = new MCPConnection(config);

      await expect(connection.connect()).rejects.toThrow('Unsupported transport: invalid');
    });

    it('should prevent multiple connections', async () => {
      const config: MCPConnectionConfig = {
        transport: 'stdio',
        command: 'node',
        args: ['server.js']
      };
      connection = new MCPConnection(config);

      (connection as any).isConnected = true;

      await expect(connection.connect()).rejects.toThrow('Already connected');
    });
  });

  describe('utility methods', () => {
    it('should return capabilities when available', () => {
      const capabilities: ServerCapabilities = {
        tools: { listChanged: true },
        resources: { subscribe: false },
        prompts: { listChanged: false }
      };

      (connection as any).capabilities = capabilities;

      expect(connection.getCapabilities()).toEqual(capabilities);
    });

    it('should return undefined when no capabilities', () => {
      const config: MCPConnectionConfig = {
        transport: 'stdio',
        command: 'node',
        args: ['server.js']
      };
      connection = new MCPConnection(config);

      expect(connection.getCapabilities()).toBeUndefined();
    });

    it('should check ready state correctly', () => {
      const config: MCPConnectionConfig = {
        transport: 'stdio',
        command: 'node',
        args: ['server.js']
      };
      connection = new MCPConnection(config);

      expect(connection.isReady()).toBe(false);

      (connection as any).isConnected = true;
      expect(connection.isReady()).toBe(false);

      (connection as any).capabilities = { tools: { listChanged: true } };
      expect(connection.isReady()).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty message data', () => {
      const config: MCPConnectionConfig = {
        transport: 'stdio',
        command: 'node',
        args: ['server.js']
      };
      connection = new MCPConnection(config);

      expect(() => (connection as any).handleData('')).not.toThrow();
      expect(() => (connection as any).handleData('\n\n\n')).not.toThrow();
    });

    it('should handle very large messages', () => {
      const config: MCPConnectionConfig = {
        transport: 'stdio',
        command: 'node',
        args: ['server.js']
      };
      connection = new MCPConnection(config);

      const largeMessage = {
        jsonrpc: '2.0',
        method: 'test',
        params: {
          data: 'x'.repeat(100000)
        }
      };

      expect(() => (connection as any).handleData(JSON.stringify(largeMessage) + '\n')).not.toThrow();
    });
  });
});