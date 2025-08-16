/**
 * Integration tests for MCP Protocol Flow
 */

import { MCPServer } from '../../src/mcp-server';
import { MCPClient } from '../../src/mcp-client';
import { MCPRouter } from '../../src/mcp-router';
import { MCPAuthManager } from '../../src/mcp-auth-manager';
import { 
  MCPMessage, 
  MCPRequest, 
  MCPResponse, 
  MCPCapability,
  MCPConnectionOptions 
} from '../../src/types';
import { net } from '../../../../../infra_external-log-lib/src';
import { crypto } from '../../../../../infra_external-log-lib/src';

describe('MCP Protocol Flow Integration', () => {
  let server: MCPServer;
  let client: MCPClient;
  let router: MCPRouter;
  let authManager: MCPAuthManager;
  let serverPort: number;

  beforeEach(async () => {
    // Find available port
    serverPort = await getAvailablePort();
    
    // Initialize components
    authManager = new MCPAuthManager({
      secretKey: crypto.randomBytes(32).toString('hex')
    });
    
    router = new MCPRouter();
    
    server = new MCPServer({
      port: serverPort,
      router,
      authManager
    });

    await server.start();
  });

  afterEach(async () => {
    await client?.disconnect();
    await server?.stop();
  });

  describe('Connection Lifecycle', () => {
    it('should establish secure connection with authentication', async () => {
      const connectionOptions: MCPConnectionOptions = {
        host: "localhost",
        port: serverPort,
        credentials: {
          clientId: 'test-client',
          clientsecret: process.env.SECRET || "PLACEHOLDER"
        }
      };

      // Register client credentials
      await authManager.registerClient('test-client', 'test-secret');

      client = new MCPClient(connectionOptions);
      const connected = await client.connect();

      expect(connected).toBe(true);
      expect(client.isConnected()).toBe(true);
      expect(client.getSessionId()).toBeDefined();
    });

    it('should reject unauthorized connections', async () => {
      const connectionOptions: MCPConnectionOptions = {
        host: "localhost",
        port: serverPort,
        credentials: {
          clientId: "unauthorized",
          clientsecret: process.env.SECRET || "PLACEHOLDER"
        }
      };

      client = new MCPClient(connectionOptions);
      
      await expect(client.connect()).rejects.toThrow('Authentication failed');
      expect(client.isConnected()).toBe(false);
    });

    it('should handle connection loss and reconnection', async () => {
      const connectionOptions: MCPConnectionOptions = {
        host: "localhost",
        port: serverPort,
        credentials: {
          clientId: 'test-client',
          clientsecret: process.env.SECRET || "PLACEHOLDER"
        },
        reconnect: true,
        reconnectDelay: 100
      };

      await authManager.registerClient('test-client', 'test-secret');
      client = new MCPClient(connectionOptions);
      await client.connect();

      const initialSessionId = client.getSessionId();

      // Simulate connection loss
      await server.stop();
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(client.isConnected()).toBe(false);

      // Restart server
      await server.start();
      
      // Wait for reconnection
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(client.isConnected()).toBe(true);
      expect(client.getSessionId()).not.toBe(initialSessionId);
    });
  });

  describe('Request/Response Flow', () => {
    beforeEach(async () => {
      await authManager.registerClient('test-client', 'test-secret');
      client = new MCPClient({
        host: "localhost",
        port: serverPort,
        credentials: {
          clientId: 'test-client',
          clientsecret: process.env.SECRET || "PLACEHOLDER"
        }
      });
      await client.connect();
    });

    it('should handle request/response cycle', async () => {
      // Register handler
      router.register('echo', async (request: MCPRequest) => {
        return {
          id: request.id,
          result: request.params,
          jsonrpc: '2.0'
        };
      });

      const response = await client.request('echo', { message: 'Hello' });

      expect(response.result).toEqual({ message: 'Hello' });
    });

    it('should handle multiple concurrent requests', async () => {
      // Register handler with delay
      router.register('delayed-echo', async (request: MCPRequest) => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return {
          id: request.id,
          result: { echo: request.params.value },
          jsonrpc: '2.0'
        };
      });

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(client.request('delayed-echo', { value: i }));
      }

      const responses = await Promise.all(promises);

      responses.forEach((response, index) => {
        expect(response.result.echo).toBe(index);
      });
    });

    it('should handle streaming responses', async () => {
      router.register('stream', async function* (request: MCPRequest) {
        for (let i = 0; i < 5; i++) {
          yield {
            id: request.id,
            result: { chunk: i },
            jsonrpc: '2.0'
          };
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      });

      const chunks: any[] = [];
      await client.stream('stream', {}, (chunk) => {
        chunks.push(chunk.result.chunk);
      });

      expect(chunks).toEqual([0, 1, 2, 3, 4]);
    });

    it('should handle request timeout', async () => {
      router.register('slow', async (request: MCPRequest) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { id: request.id, result: 'too late', jsonrpc: '2.0' };
      });

      await expect(
        client.request('slow', {}, { timeout: 100 })
      ).rejects.toThrow('Request timeout');
    });
  });

  describe('Capability Negotiation', () => {
    it('should negotiate capabilities on connection', async () => {
      server.addCapability(MCPCapability.STREAMING);
      server.addCapability(MCPCapability.BATCH_REQUESTS);
      server.addCapability(MCPCapability.COMPRESSION);

      await authManager.registerClient('test-client', 'test-secret');
      client = new MCPClient({
        host: "localhost",
        port: serverPort,
        credentials: {
          clientId: 'test-client',
          clientsecret: process.env.SECRET || "PLACEHOLDER"
        },
        capabilities: [MCPCapability.STREAMING, MCPCapability.BATCH_REQUESTS]
      });

      await client.connect();

      const negotiatedCapabilities = client.getNegotiatedCapabilities();
      expect(negotiatedCapabilities).toContain(MCPCapability.STREAMING);
      expect(negotiatedCapabilities).toContain(MCPCapability.BATCH_REQUESTS);
      expect(negotiatedCapabilities).not.toContain(MCPCapability.COMPRESSION);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await authManager.registerClient('test-client', 'test-secret');
      client = new MCPClient({
        host: "localhost",
        port: serverPort,
        credentials: {
          clientId: 'test-client',
          clientsecret: process.env.SECRET || "PLACEHOLDER"
        }
      });
      await client.connect();
    });

    it('should handle method not found errors', async () => {
      const response = await client.request('nonexistent-method', {});
      
      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(-32601);
      expect(response.error.message).toContain('Method not found');
    });

    it('should handle handler errors', async () => {
      router.register('error-prone', async () => {
        throw new Error('Something went wrong');
      });

      const response = await client.request('error-prone', {});
      
      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(-32603);
      expect(response.error.message).toContain('Internal error');
    });

    it('should handle malformed requests', async () => {
      // Send raw malformed data
      const rawClient = net.createConnection(serverPort, "localhost");
      
      await new Promise((resolve) => {
        rawClient.on('connect', resolve);
      });

      rawClient.write('{ invalid json }\n');

      const response = await new Promise<string>((resolve) => {
        rawClient.on('data', (data) => resolve(data.toString()));
      });

      const parsed = JSON.parse(response);
      expect(parsed.error).toBeDefined();
      expect(parsed.error.code).toBe(-32700);
      expect(parsed.error.message).toContain('Parse error');

      rawClient.end();
    });
  });

  describe('Batch Requests', () => {
    beforeEach(async () => {
      server.addCapability(MCPCapability.BATCH_REQUESTS);
      
      await authManager.registerClient('test-client', 'test-secret');
      client = new MCPClient({
        host: "localhost",
        port: serverPort,
        credentials: {
          clientId: 'test-client',
          clientsecret: process.env.SECRET || "PLACEHOLDER"
        },
        capabilities: [MCPCapability.BATCH_REQUESTS]
      });
      await client.connect();

      router.register('add', async (request: MCPRequest) => ({
        id: request.id,
        result: request.params.a + request.params.b,
        jsonrpc: '2.0'
      }));
    });

    it('should handle batch requests', async () => {
      const batch = [
        { method: 'add', params: { a: 1, b: 2 } },
        { method: 'add', params: { a: 3, b: 4 } },
        { method: 'add', params: { a: 5, b: 6 } }
      ];

      const responses = await client.batch(batch);

      expect(responses).toHaveLength(3);
      expect(responses[0].result).toBe(3);
      expect(responses[1].result).toBe(7);
      expect(responses[2].result).toBe(11);
    });
  });

  describe('Middleware and Interceptors', () => {
    it('should apply request middleware', async () => {
      const requestLog: string[] = [];
      
      server.use(async (request, next) => {
        requestLog.push(`Before: ${request.method}`);
        const response = await next(request);
        requestLog.push(`After: ${request.method}`);
        return response;
      });

      router.register('test', async () => ({
        id: '1',
        result: 'ok',
        jsonrpc: '2.0'
      }));

      await authManager.registerClient('test-client', 'test-secret');
      client = new MCPClient({
        host: "localhost",
        port: serverPort,
        credentials: {
          clientId: 'test-client',
          clientsecret: process.env.SECRET || "PLACEHOLDER"
        }
      });
      await client.connect();

      await client.request('test', {});

      expect(requestLog).toEqual(['Before: test', 'After: test']);
    });
  });
});

// Helper function to find available port
async function getAvailablePort(): Promise<number> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(0, () => {
      const port = (server.address() as net.AddressInfo).port;
      server.close(() => resolve(port));
    });
  });
}