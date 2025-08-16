import { MCPServerManager, MCPServerInfo, ServerStatus } from '../../children/src/server/mcp-server-manager';
import { MCPConnection } from '../../children/src/server/mcp-connection';
import { MCPConnectionConfig, Tool, Resource, Prompt } from '../../children/src/domain/protocol';

// Mock MCPConnection
jest.mock('../../children/src/server/mcp-connection');
const MockedMCPConnection = MCPConnection as jest.MockedClass<typeof MCPConnection>;

describe("MCPServerManager", () => {
  let serverManager: MCPServerManager;
  let mockConnection: jest.Mocked<MCPConnection>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConnection = new MockedMCPConnection() as jest.Mocked<MCPConnection>;
    mockConnection.connect = jest.fn().mockResolvedValue(true);
    mockConnection.disconnect = jest.fn().mockResolvedValue(undefined);
    mockConnection.isConnected = jest.fn().mockReturnValue(true);
    mockConnection.getCapabilities = jest.fn().mockResolvedValue({
      tools: { listChanged: true },
      resources: { subscribe: true },
      prompts: { listChanged: false }
    });
    mockConnection.listTools = jest.fn().mockResolvedValue([]);
    mockConnection.listResources = jest.fn().mockResolvedValue([]);
    mockConnection.listPrompts = jest.fn().mockResolvedValue([]);

    serverManager = new MCPServerManager();
  });

  describe("constructor", () => {
    it('should create empty server manager', () => {
      expect(serverManager).toBeDefined();
      expect(serverManager.getAllServers()).toHaveLength(0);
    });

    it('should initialize with server configs', () => {
      const configs: MCPServerInfo[] = [
        {
          id: 'test-server-1',
          name: 'Test Server 1',
          config: {
            command: 'node',
            args: ['server.js'],
            env: {}
          }
        },
        {
          id: 'test-server-2',
          name: 'Test Server 2',
          config: {
            command: 'python',
            args: ['server.py'],
            env: { DEBUG: 'true' }
          }
        }
      ];

      const manager = new MCPServerManager(configs);
      expect(manager.getAllServers()).toHaveLength(2);
    });
  });

  describe("addServer", () => {
    it('should add new server', () => {
      const serverInfo: MCPServerInfo = {
        id: 'test-server',
        name: 'Test Server',
        config: {
          command: 'node',
          args: ['test-server.js'],
          env: {}
        }
      };

      serverManager.addServer(serverInfo);

      const servers = serverManager.getAllServers();
      expect(servers).toHaveLength(1);
      expect(servers[0].id).toBe('test-server');
      expect(servers[0].name).toBe('Test Server');
      expect(servers[0].connected).toBe(false);
    });

    it('should throw error for duplicate server ID', () => {
      const serverInfo: MCPServerInfo = {
        id: 'duplicate-id',
        name: 'Server 1',
        config: { command: 'node', args: ['server1.js'], env: {} }
      };

      serverManager.addServer(serverInfo);

      const duplicateInfo: MCPServerInfo = {
        id: 'duplicate-id',
        name: 'Server 2',
        config: { command: 'node', args: ['server2.js'], env: {} }
      };

      expect(() => serverManager.addServer(duplicateInfo)).toThrow('Server with id duplicate-id already exists');
    });

    it('should handle server with autoConnect flag', () => {
      const serverInfo: MCPServerInfo = {
        id: 'auto-connect-server',
        name: 'Auto Connect Server',
        config: { command: 'node', args: ['server.js'], env: {} },
        autoConnect: true
      };

      serverManager.addServer(serverInfo);

      const server = serverManager.getServer('auto-connect-server');
      expect(server?.id).toBe('auto-connect-server');
    });
  });

  describe("removeServer", () => {
    beforeEach(() => {
      const serverInfo: MCPServerInfo = {
        id: 'removable-server',
        name: 'Removable Server',
        config: { command: 'node', args: ['server.js'], env: {} }
      };
      serverManager.addServer(serverInfo);
    });

    it('should remove existing server', async () => {
      await serverManager.removeServer('removable-server');

      const servers = serverManager.getAllServers();
      expect(servers).toHaveLength(0);
    });

    it('should disconnect server before removing', async () => {
      // Connect the server first
      await serverManager.connectServer('removable-server');

      // Mock the connection to track disconnect calls
      const serverEntry = (serverManager as any).servers.get('removable-server');
      serverEntry.connection = mockConnection;

      await serverManager.removeServer('removable-server');

      expect(mockConnection.disconnect).toHaveBeenCalled();
    });

    it('should throw error for non-existent server', async () => {
      await expect(serverManager.removeServer('non-existent')).rejects.toThrow('Server non-existent not found');
    });
  });

  describe("connectServer", () => {
    beforeEach(() => {
      const serverInfo: MCPServerInfo = {
        id: 'connectable-server',
        name: 'Connectable Server',
        config: {
          command: 'node',
          args: ['server.js'],
          env: { NODE_ENV: 'test' }
        }
      };
      serverManager.addServer(serverInfo);

      // Mock MCPConnection constructor to return our mock
      MockedMCPConnection.mockImplementation(() => mockConnection);
    });

    it('should connect to server successfully', async () => {
      const success = await serverManager.connectServer('connectable-server');

      expect(success).toBe(true);
      expect(mockConnection.connect).toHaveBeenCalled();

      const status = serverManager.getServerStatus('connectable-server');
      expect(status?.connected).toBe(true);
    });

    it('should handle connection failure', async () => {
      mockConnection.connect.mockRejectedValue(new Error('Connection failed'));

      const success = await serverManager.connectServer('connectable-server');

      expect(success).toBe(false);
      const status = serverManager.getServerStatus('connectable-server');
      expect(status?.connected).toBe(false);
      expect(status?.error).toBe('Connection failed');
    });

    it('should throw error for non-existent server', async () => {
      await expect(serverManager.connectServer('non-existent')).rejects.toThrow('Server non-existent not found');
    });

    it('should not reconnect already connected server', async () => {
      // Connect first time
      await serverManager.connectServer('connectable-server');
      
      // Try to connect again
      mockConnection.connect.mockClear();
      const success = await serverManager.connectServer('connectable-server');

      expect(success).toBe(true);
      expect(mockConnection.connect).not.toHaveBeenCalled();
    });
  });

  describe("disconnectServer", () => {
    beforeEach(async () => {
      const serverInfo: MCPServerInfo = {
        id: 'disconnectable-server',
        name: 'Disconnectable Server',
        config: { command: 'node', args: ['server.js'], env: {} }
      };
      serverManager.addServer(serverInfo);

      MockedMCPConnection.mockImplementation(() => mockConnection);
      await serverManager.connectServer('disconnectable-server');
    });

    it('should disconnect server successfully', async () => {
      await serverManager.disconnectServer('disconnectable-server');

      expect(mockConnection.disconnect).toHaveBeenCalled();
      const status = serverManager.getServerStatus('disconnectable-server');
      expect(status?.connected).toBe(false);
    });

    it('should handle disconnection error', async () => {
      mockConnection.disconnect.mockRejectedValue(new Error('Disconnect failed'));

      await serverManager.disconnectServer('disconnectable-server');

      const status = serverManager.getServerStatus('disconnectable-server');
      expect(status?.error).toBe('Disconnect failed');
    });

    it('should throw error for non-existent server', async () => {
      await expect(serverManager.disconnectServer('non-existent')).rejects.toThrow('Server non-existent not found');
    });
  });

  describe("connectAll", () => {
    beforeEach(() => {
      const servers: MCPServerInfo[] = [
        {
          id: 'server-1',
          name: 'Server 1',
          config: { command: 'node', args: ['server1.js'], env: {} }
        },
        {
          id: 'server-2',
          name: 'Server 2',
          config: { command: 'node', args: ['server2.js'], env: {} },
          autoConnect: true
        }
      ];

      servers.forEach(server => serverManager.addServer(server));
      MockedMCPConnection.mockImplementation(() => mockConnection);
    });

    it('should connect all servers', async () => {
      const results = await serverManager.connectAll();

      expect(results).toHaveLength(2);
      expect(results.every(result => result.success)).toBe(true);
      expect(mockConnection.connect).toHaveBeenCalledTimes(2);
    });

    it('should handle mixed success/failure', async () => {
      let callCount = 0;
      mockConnection.connect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(true);
        } else {
          return Promise.reject(new Error('Connection failed'));
        }
      });

      const results = await serverManager.connectAll();

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('Connection failed');
    });
  });

  describe("getAllTools", () => {
    beforeEach(async () => {
      const serverInfos: MCPServerInfo[] = [
        {
          id: 'tools-server-1',
          name: 'Tools Server 1',
          config: { command: 'node', args: ['server1.js'], env: {} }
        },
        {
          id: 'tools-server-2',
          name: 'Tools Server 2',
          config: { command: 'node', args: ['server2.js'], env: {} }
        }
      ];

      serverInfos.forEach(info => serverManager.addServer(info));

      // Mock different tools for each server
      let connectionCount = 0;
      MockedMCPConnection.mockImplementation(() => {
        const mockConn = { ...mockConnection };
        connectionCount++;
        
        if (connectionCount === 1) {
          mockConn.listTools = jest.fn().mockResolvedValue([
            { name: 'tool1', description: 'Tool 1', inputSchema: { type: 'object' } },
            { name: 'tool2', description: 'Tool 2', inputSchema: { type: 'object' } }
          ]);
        } else {
          mockConn.listTools = jest.fn().mockResolvedValue([
            { name: 'tool3', description: 'Tool 3', inputSchema: { type: 'object' } }
          ]);
        }
        
        return mockConn as any;
      });

      await serverManager.connectServer('tools-server-1');
      await serverManager.connectServer('tools-server-2');
    });

    it('should aggregate tools from all connected servers', async () => {
      const allTools = await serverManager.getAllTools();

      expect(allTools).toHaveLength(3);
      expect(allTools.map(t => t.name)).toEqual(['tool1', 'tool2', 'tool3']);
    });

    it('should handle servers with no tools', async () => {
      // Add server with no tools
      const emptyServerInfo: MCPServerInfo = {
        id: 'empty-server',
        name: 'Empty Server',
        config: { command: 'node', args: ['empty.js'], env: {} }
      };
      serverManager.addServer(emptyServerInfo);

      const mockEmptyConn = { ...mockConnection };
      mockEmptyConn.listTools = jest.fn().mockResolvedValue([]);
      MockedMCPConnection.mockImplementation(() => mockEmptyConn as any);

      await serverManager.connectServer('empty-server');

      const allTools = await serverManager.getAllTools();
      expect(allTools).toHaveLength(3); // Still the original 3 tools
    });
  });

  describe('health monitoring', () => {
    beforeEach(() => {
      const serverInfo: MCPServerInfo = {
        id: 'health-server',
        name: 'Health Server',
        config: { command: 'node', args: ['server.js'], env: {} }
      };
      serverManager.addServer(serverInfo);
    });

    it('should check server health', async () => {
      MockedMCPConnection.mockImplementation(() => mockConnection);
      await serverManager.connectServer('health-server');

      const isHealthy = await serverManager.checkServerHealth('health-server');

      expect(isHealthy).toBe(true);
    });

    it('should detect unhealthy server', async () => {
      mockConnection.isConnected.mockReturnValue(false);
      MockedMCPConnection.mockImplementation(() => mockConnection);
      await serverManager.connectServer('health-server');

      const isHealthy = await serverManager.checkServerHealth('health-server');

      expect(isHealthy).toBe(false);
    });

    it('should perform health check on all servers', async () => {
      const serverInfos: MCPServerInfo[] = [
        {
          id: 'healthy-server',
          name: 'Healthy Server',
          config: { command: 'node', args: ['healthy.js'], env: {} }
        },
        {
          id: 'unhealthy-server',
          name: 'Unhealthy Server',
          config: { command: 'node', args: ['unhealthy.js'], env: {} }
        }
      ];

      serverInfos.forEach(info => serverManager.addServer(info));

      let connectionCount = 0;
      MockedMCPConnection.mockImplementation(() => {
        const mockConn = { ...mockConnection };
        connectionCount++;
        
        if (connectionCount === 2) {
          mockConn.isConnected = jest.fn().mockReturnValue(false);
        }
        
        return mockConn as any;
      });

      await serverManager.connectServer('healthy-server');
      await serverManager.connectServer('unhealthy-server');

      const healthResults = await serverManager.checkAllHealth();

      expect(healthResults).toHaveLength(2);
      expect(healthResults[0].healthy).toBe(true);
      expect(healthResults[1].healthy).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle server operations on non-existent servers', async () => {
      await expect(serverManager.connectServer('non-existent')).rejects.toThrow();
      await expect(serverManager.disconnectServer('non-existent')).rejects.toThrow();
      await expect(serverManager.checkServerHealth('non-existent')).rejects.toThrow();
      
      expect(serverManager.getServer('non-existent')).toBeUndefined();
      expect(serverManager.getServerStatus('non-existent')).toBeUndefined();
    });

    it('should handle connection creation failure', async () => {
      const serverInfo: MCPServerInfo = {
        id: 'fail-server',
        name: 'Fail Server',
        config: { command: 'invalid-command', args: [], env: {} }
      };
      serverManager.addServer(serverInfo);

      MockedMCPConnection.mockImplementation(() => {
        throw new Error('Failed to create connection');
      });

      const success = await serverManager.connectServer('fail-server');

      expect(success).toBe(false);
      const status = serverManager.getServerStatus('fail-server');
      expect(status?.error).toBe('Failed to create connection');
    });
  });

  describe('edge cases', () => {
    it('should handle servers with special characters in IDs', () => {
      const serverInfo: MCPServerInfo = {
        id: 'server-with_special.chars@domain',
        name: 'Special Server',
        config: { command: 'node', args: ['server.js'], env: {} }
      };

      expect(() => serverManager.addServer(serverInfo)).not.toThrow();
      
      const server = serverManager.getServer('server-with_special.chars@domain');
      expect(server?.id).toBe('server-with_special.chars@domain');
    });

    it('should handle empty server configurations', () => {
      const serverInfo: MCPServerInfo = {
        id: 'empty-config-server',
        name: '',
        config: { command: '', args: [], env: {} }
      };

      expect(() => serverManager.addServer(serverInfo)).not.toThrow();
    });

    it('should handle concurrent operations', async () => {
      const serverInfo: MCPServerInfo = {
        id: 'concurrent-server',
        name: 'Concurrent Server',
        config: { command: 'node', args: ['server.js'], env: {} }
      };
      serverManager.addServer(serverInfo);

      MockedMCPConnection.mockImplementation(() => mockConnection);

      // Perform multiple concurrent operations
      const promises = [
        serverManager.connectServer('concurrent-server'),
        serverManager.connectServer('concurrent-server'),
        serverManager.checkServerHealth('concurrent-server')
      ];

      const results = await Promise.allSettled(promises);
      
      // At least one operation should succeed
      expect(results.some(result => result.status === "fulfilled")).toBe(true);
    });
  });
});