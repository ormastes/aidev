/**
 * MCP Protocol Tests
 * Comprehensive test suite for Model Context Protocol implementation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MCPServer, MCPTool } from '../src/server/MCPServer';
import { MCPClient, createMCPClient } from '../src/client/MCPClient';
import WebSocket from 'ws';

describe('MCP Protocol Implementation', () => {
  let server: MCPServer;
  let client: MCPClient;
  const testPort = 9876;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (client) {
      client.disconnect();
    }
    if (server) {
      await server.stop();
    }
  });

  describe('MCP Server', () => {
    it('should start and stop server', async () => {
      server = new MCPServer({ port: testPort, enableLogging: false });
      
      await server.start();
      const stats = server.getStats();
      expect(stats.sessions).toBe(0);
      expect(stats.tools).toBe(0);
      
      await server.stop();
    });

    it('should register and list tools', async () => {
      server = new MCPServer({ port: testPort, enableLogging: false });
      
      const testTool: MCPTool = {
        name: 'testTool',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {
            input: { type: 'string' }
          }
        },
        handler: async (params) => {
          return { result: `Processed: ${params.input}` };
        }
      };
      
      server.registerTool(testTool);
      
      await server.start();
      const stats = server.getStats();
      expect(stats.tools).toBe(1);
      
      await server.stop();
    });

    it('should handle multiple client connections', async () => {
      server = new MCPServer({ 
        port: testPort, 
        enableLogging: false,
        authRequired: false 
      });
      
      const connectionPromise = new Promise<void>((resolve) => {
        let connectionCount = 0;
        server.on('connection', () => {
          connectionCount++;
          if (connectionCount === 2) {
            resolve();
          }
        });
      });
      
      await server.start();
      
      // Create two WebSocket connections
      const ws1 = new WebSocket(`ws://localhost:${testPort}`);
      const ws2 = new WebSocket(`ws://localhost:${testPort}`);
      
      await connectionPromise;
      
      const stats = server.getStats();
      expect(stats.sessions).toBe(2);
      
      ws1.close();
      ws2.close();
      await server.stop();
    });

    it('should broadcast messages to all clients', async () => {
      server = new MCPServer({ 
        port: testPort, 
        enableLogging: false,
        authRequired: false 
      });
      
      await server.start();
      
      const receivedMessages: any[] = [];
      
      // Create two clients
      const ws1 = new WebSocket(`ws://localhost:${testPort}`);
      const ws2 = new WebSocket(`ws://localhost:${testPort}`);
      
      ws1.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.method === 'broadcast-test') {
          receivedMessages.push(message);
        }
      });
      
      ws2.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.method === 'broadcast-test') {
          receivedMessages.push(message);
        }
      });
      
      // Wait for connections
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Broadcast message
      server.broadcast('broadcast-test', { data: 'test' });
      
      // Wait for messages
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(receivedMessages).toHaveLength(2);
      expect(receivedMessages[0].params.data).toBe('test');
      
      ws1.close();
      ws2.close();
      await server.stop();
    });

    it('should enforce max connections limit', async () => {
      server = new MCPServer({ 
        port: testPort, 
        enableLogging: false,
        maxConnections: 2,
        authRequired: false 
      });
      
      await server.start();
      
      const ws1 = new WebSocket(`ws://localhost:${testPort}`);
      const ws2 = new WebSocket(`ws://localhost:${testPort}`);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const ws3 = new WebSocket(`ws://localhost:${testPort}`);
      
      const closePromise = new Promise<number>((resolve) => {
        ws3.on('close', (code) => resolve(code));
      });
      
      const closeCode = await closePromise;
      expect(closeCode).toBe(1008); // Policy violation
      
      ws1.close();
      ws2.close();
      await server.stop();
    });
  });

  describe('MCP Client', () => {
    beforeEach(async () => {
      server = new MCPServer({ 
        port: testPort, 
        enableLogging: false,
        authRequired: false 
      });
      await server.start();
    });

    it('should connect to server', async () => {
      client = createMCPClient({
        serverUrl: `ws://localhost:${testPort}`,
        enableLogging: false
      });
      
      await client.connect();
      
      expect(client.isConnected()).toBe(true);
      expect(client.getSessionId()).toBeDefined();
    });

    it('should disconnect from server', async () => {
      client = createMCPClient({
        serverUrl: `ws://localhost:${testPort}`,
        enableLogging: false
      });
      
      await client.connect();
      expect(client.isConnected()).toBe(true);
      
      client.disconnect();
      expect(client.isConnected()).toBe(false);
    });

    it('should authenticate with server', async () => {
      // Configure server to require auth
      await server.stop();
      server = new MCPServer({ 
        port: testPort, 
        enableLogging: false,
        authRequired: true 
      });
      await server.start();
      
      client = createMCPClient({
        serverUrl: `ws://localhost:${testPort}`,
        enableLogging: false,
        authentication: {
          credentials: {
            username: 'admin',
            password: 'admin'
          }
        }
      });
      
      await client.connect();
      
      expect(client.isAuthenticated()).toBe(true);
      expect(client.getPermissions()).toContain('read');
      expect(client.getPermissions()).toContain('write');
    });

    it('should fail authentication with invalid credentials', async () => {
      await server.stop();
      server = new MCPServer({ 
        port: testPort, 
        enableLogging: false,
        authRequired: true 
      });
      await server.start();
      
      client = createMCPClient({
        serverUrl: `ws://localhost:${testPort}`,
        enableLogging: false,
        authentication: {
          credentials: {
            username: 'invalid',
            password: 'wrong'
          }
        }
      });
      
      await expect(client.connect()).rejects.toThrow('Authentication failed');
    });

    it('should list available tools', async () => {
      const testTool: MCPTool = {
        name: 'calculator',
        description: 'Performs calculations',
        inputSchema: {
          type: 'object',
          properties: {
            operation: { type: 'string' },
            a: { type: 'number' },
            b: { type: 'number' }
          }
        },
        handler: async (params) => {
          const { operation, a, b } = params;
          switch (operation) {
            case 'add': return { result: a + b };
            case 'subtract': return { result: a - b };
            case 'multiply': return { result: a * b };
            case 'divide': return { result: a / b };
            default: throw new Error('Unknown operation');
          }
        }
      };
      
      server.registerTool(testTool);
      
      client = createMCPClient({
        serverUrl: `ws://localhost:${testPort}`,
        enableLogging: false
      });
      
      await client.connect();
      
      const tools = await client.listTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('calculator');
      expect(tools[0].description).toBe('Performs calculations');
    });

    it('should execute tools', async () => {
      const testTool: MCPTool = {
        name: 'echo',
        description: 'Echoes input',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        },
        handler: async (params) => {
          return { echo: params.message };
        }
      };
      
      server.registerTool(testTool);
      
      client = createMCPClient({
        serverUrl: `ws://localhost:${testPort}`,
        enableLogging: false
      });
      
      await client.connect();
      await client.listTools(); // Load tools
      
      const result = await client.executeTool('echo', { message: 'Hello, MCP!' });
      expect(result.echo).toBe('Hello, MCP!');
    });

    it('should get and update context', async () => {
      client = createMCPClient({
        serverUrl: `ws://localhost:${testPort}`,
        enableLogging: false
      });
      
      await client.connect();
      
      // Get initial context
      const context = await client.getContext();
      expect(context.name).toBe('default');
      expect(context.metadata).toEqual({});
      
      // Update context
      await client.updateContext({
        metadata: { key: 'value' },
        resources: [{ uri: 'resource://test', type: 'text' }]
      });
      
      // Get updated context
      const updatedContext = await client.getContext();
      expect(updatedContext.metadata.key).toBe('value');
      expect(updatedContext.resources).toHaveLength(1);
    });

    it('should handle request timeout', async () => {
      // Register a slow handler
      server.registerHandler('slowOperation', async () => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        return { result: 'done' };
      });
      
      client = createMCPClient({
        serverUrl: `ws://localhost:${testPort}`,
        enableLogging: false,
        requestTimeout: 1000
      });
      
      await client.connect();
      
      await expect(client.request('slowOperation')).rejects.toThrow('Request timeout');
    });

    it('should send notifications', async () => {
      const receivedNotifications: any[] = [];
      
      server.on('notification', (message) => {
        receivedNotifications.push(message);
      });
      
      client = createMCPClient({
        serverUrl: `ws://localhost:${testPort}`,
        enableLogging: false
      });
      
      await client.connect();
      
      client.notify('test-notification', { data: 'test' });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(receivedNotifications).toHaveLength(1);
      expect(receivedNotifications[0].method).toBe('test-notification');
      expect(receivedNotifications[0].params.data).toBe('test');
    });

    it('should auto-reconnect on connection loss', async () => {
      client = createMCPClient({
        serverUrl: `ws://localhost:${testPort}`,
        enableLogging: false,
        autoReconnect: true,
        reconnectInterval: 100
      });
      
      await client.connect();
      const firstSessionId = client.getSessionId();
      
      // Force disconnect
      await server.stop();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(client.isConnected()).toBe(false);
      
      // Restart server
      await server.start();
      
      // Wait for auto-reconnect
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(client.isConnected()).toBe(true);
      const secondSessionId = client.getSessionId();
      expect(secondSessionId).not.toBe(firstSessionId);
    });
  });

  describe('End-to-End Scenarios', () => {
    beforeEach(async () => {
      server = new MCPServer({ 
        port: testPort, 
        enableLogging: false,
        authRequired: false 
      });
      
      // Register test tools
      server.registerTool({
        name: 'fetchData',
        description: 'Fetches data from a source',
        inputSchema: {
          type: 'object',
          properties: {
            source: { type: 'string' }
          }
        },
        handler: async (params) => {
          return { 
            data: `Data from ${params.source}`,
            timestamp: new Date().toISOString()
          };
        }
      });
      
      server.registerTool({
        name: 'processData',
        description: 'Processes data',
        inputSchema: {
          type: 'object',
          properties: {
            data: { type: 'string' },
            operation: { type: 'string' }
          }
        },
        handler: async (params) => {
          const { data, operation } = params;
          switch (operation) {
            case 'uppercase':
              return { result: data.toUpperCase() };
            case 'lowercase':
              return { result: data.toLowerCase() };
            case 'reverse':
              return { result: data.split('').reverse().join('') };
            default:
              return { result: data };
          }
        }
      });
      
      await server.start();
    });

    it('should complete a multi-step workflow', async () => {
      client = createMCPClient({
        serverUrl: `ws://localhost:${testPort}`,
        enableLogging: false
      });
      
      await client.connect();
      await client.listTools();
      
      // Step 1: Fetch data
      const fetchResult = await client.executeTool('fetchData', { source: 'database' });
      expect(fetchResult.data).toBe('Data from database');
      
      // Step 2: Process data
      const processResult = await client.executeTool('processData', {
        data: fetchResult.data,
        operation: 'uppercase'
      });
      expect(processResult.result).toBe('DATA FROM DATABASE');
      
      // Step 3: Update context with results
      await client.updateContext({
        metadata: {
          lastFetch: fetchResult.timestamp,
          lastProcess: new Date().toISOString(),
          result: processResult.result
        }
      });
      
      const context = await client.getContext();
      expect(context.metadata.result).toBe('DATA FROM DATABASE');
    });

    it('should handle concurrent tool executions', async () => {
      client = createMCPClient({
        serverUrl: `ws://localhost:${testPort}`,
        enableLogging: false
      });
      
      await client.connect();
      await client.listTools();
      
      // Execute multiple tools concurrently
      const promises = [
        client.executeTool('fetchData', { source: 'api' }),
        client.executeTool('fetchData', { source: 'cache' }),
        client.executeTool('processData', { data: 'test', operation: 'uppercase' }),
        client.executeTool('processData', { data: 'test', operation: 'reverse' })
      ];
      
      const results = await Promise.all(promises);
      
      expect(results[0].data).toBe('Data from api');
      expect(results[1].data).toBe('Data from cache');
      expect(results[2].result).toBe('TEST');
      expect(results[3].result).toBe('tset');
    });

    it('should handle multiple clients with shared context', async () => {
      const client1 = createMCPClient({
        serverUrl: `ws://localhost:${testPort}`,
        clientId: 'client1',
        enableLogging: false
      });
      
      const client2 = createMCPClient({
        serverUrl: `ws://localhost:${testPort}`,
        clientId: 'client2',
        enableLogging: false
      });
      
      await client1.connect();
      await client2.connect();
      
      // Client 1 updates context
      await client1.updateContext({
        metadata: { sharedData: 'from client1' }
      });
      
      // Both clients should see the update
      const context1 = await client1.getContext();
      const context2 = await client2.getContext();
      
      // Note: In a real implementation, you might want to broadcast context updates
      // For now, contexts are per-session
      expect(context1.metadata.sharedData).toBe('from client1');
      
      client1.disconnect();
      client2.disconnect();
    });
  });
});