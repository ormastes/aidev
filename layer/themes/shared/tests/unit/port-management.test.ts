import { net } from '../../../infra_external-log-lib/src';
import {
  DEFAULT_PORTS,
  PORT_RANGE,
  isPortAvailable,
  findAvailablePort,
  getNextAvailablePort,
  PortManager,
  createServicePortConfig
} from '../../children/utils/port-management';

// Mock net module
jest.mock('net');
const mockNet = net as jest.Mocked<typeof net>;

describe('Port Management Utils', () => {
  let mockServer: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock server
    mockServer = {
      once: jest.fn(),
      listen: jest.fn(),
      close: jest.fn()
    };
    
    mockNet.createServer.mockReturnValue(mockServer);
  });

  describe("constants", () => {
    it('should have default ports defined', () => {
      expect(DEFAULT_PORTS.webServer).toBe(3000);
      expect(DEFAULT_PORTS.apiServer).toBe(3001);
      expect(DEFAULT_PORTS.database).toBe(5432);
      expect(DEFAULT_PORTS.redis).toBe(6379);
      expect(DEFAULT_PORTS.elasticsearch).toBe(9200);
      expect(DEFAULT_PORTS.kafka).toBe(9092);
      expect(DEFAULT_PORTS.graphql).toBe(4000);
      expect(DEFAULT_PORTS.websocket).toBe(8080);
      expect(DEFAULT_PORTS.metrics).toBe(9090);
      expect(DEFAULT_PORTS.healthCheck).toBe(3999);
    });

    it('should have port range defined', () => {
      expect(PORT_RANGE.min).toBe(3000);
      expect(PORT_RANGE.max).toBe(9999);
    });
  });

  describe("isPortAvailable", () => {
    it('should return true for available port', async () => {
      mockServer.once.mockImplementation((event: string, callback: Function) => {
        if (event === "listening") {
          setTimeout(() => callback(), 0);
        }
        return mockServer;
      });

      const result = await isPortAvailable(3000);
      
      expect(result).toBe(true);
      expect(mockNet.createServer).toHaveBeenCalled();
      expect(mockServer.listen).toHaveBeenCalledWith(3000);
      expect(mockServer.close).toHaveBeenCalled();
    });

    it('should return false for unavailable port', async () => {
      mockServer.once.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error("EADDRINUSE")), 0);
        }
        return mockServer;
      });

      const result = await isPortAvailable(3000);
      
      expect(result).toBe(false);
      expect(mockNet.createServer).toHaveBeenCalled();
      expect(mockServer.listen).toHaveBeenCalledWith(3000);
    });

    it('should handle multiple ports', async () => {
      let callCount = 0;
      mockServer.once.mockImplementation((event: string, callback: Function) => {
        callCount++;
        if (event === "listening") {
          setTimeout(() => callback(), 0);
        } else if (event === 'error' && callCount <= 2) {
          setTimeout(() => callback(new Error("EADDRINUSE")), 0);
        }
        return mockServer;
      });

      const results = await Promise.all([
        isPortAvailable(3000),
        isPortAvailable(3001),
        isPortAvailable(3002)
      ]);

      expect(results[0]).toBe(true);
      expect(results[1]).toBe(false);
      expect(results[2]).toBe(true);
    });
  });

  describe("findAvailablePort", () => {
    it('should find first available port in range', async () => {
      let portChecks = 0;
      mockServer.once.mockImplementation((event: string, callback: Function) => {
        portChecks++;
        if (event === 'error' && portChecks <= 2) {
          setTimeout(() => callback(new Error("EADDRINUSE")), 0);
        } else if (event === "listening") {
          setTimeout(() => callback(), 0);
        }
        return mockServer;
      });

      mockServer.listen.mockImplementation(() => {
        // Mock implementation for listen
      });

      const port = await findAvailablePort(3000, 3005);
      
      expect(port).toBe(3002); // First two ports unavailable
      expect(mockNet.createServer).toHaveBeenCalledTimes(3);
    });

    it('should use default range when not specified', async () => {
      mockServer.once.mockImplementation((event: string, callback: Function) => {
        if (event === "listening") {
          setTimeout(() => callback(), 0);
        }
        return mockServer;
      });

      const port = await findAvailablePort();
      
      expect(port).toBe(PORT_RANGE.min);
    });

    it('should throw error when no ports available', async () => {
      mockServer.once.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error("EADDRINUSE")), 0);
        }
        return mockServer;
      });

      await expect(findAvailablePort(3000, 3002))
        .rejects.toThrow('No available port found between 3000 and 3002');
    });
  });

  describe("getNextAvailablePort", () => {
    it('should return the base port if available', async () => {
      mockServer.once.mockImplementation((event: string, callback: Function) => {
        if (event === "listening") {
          setTimeout(() => callback(), 0);
        }
        return mockServer;
      });

      const port = await getNextAvailablePort(4000);
      
      expect(port).toBe(4000);
    });

    it('should find next available port after base', async () => {
      let portChecks = 0;
      mockServer.once.mockImplementation((event: string, callback: Function) => {
        portChecks++;
        if (event === 'error' && portChecks <= 3) {
          setTimeout(() => callback(new Error("EADDRINUSE")), 0);
        } else if (event === "listening") {
          setTimeout(() => callback(), 0);
        }
        return mockServer;
      });

      const port = await getNextAvailablePort(4000);
      
      expect(port).toBe(4003);
    });

    it('should throw error when no available port after base', async () => {
      mockServer.once.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error("EADDRINUSE")), 0);
        }
        return mockServer;
      });

      await expect(getNextAvailablePort(9999))
        .rejects.toThrow('No available port found after 9999');
    });
  });

  describe("PortManager", () => {
    let portManager: PortManager;

    beforeEach(() => {
      portManager = new PortManager(3000);
      
      // Default mock: all ports available
      mockServer.once.mockImplementation((event: string, callback: Function) => {
        if (event === "listening") {
          setTimeout(() => callback(), 0);
        }
        return mockServer;
      });
    });

    describe("allocate", () => {
      it('should allocate port for service', async () => {
        const port = await portManager.allocate('web');
        
        expect(port).toBe(3000);
        expect(portManager.getAllocations()).toEqual([
          { service: 'web', port: 3000 }
        ]);
      });

      it('should return same port for already allocated service', async () => {
        const port1 = await portManager.allocate('web');
        const port2 = await portManager.allocate('web');
        
        expect(port1).toBe(port2);
        expect(portManager.getAllocations()).toHaveLength(1);
      });

      it('should use preferred port if available', async () => {
        const port = await portManager.allocate('api', 4000);
        
        expect(port).toBe(4000);
      });

      it('should find alternative if preferred port unavailable', async () => {
        let callCount = 0;
        mockServer.once.mockImplementation((event: string, callback: Function) => {
          callCount++;
          if (event === 'error' && callCount === 1) {
            // First check (preferred port) fails
            setTimeout(() => callback(new Error("EADDRINUSE")), 0);
          } else if (event === "listening") {
            setTimeout(() => callback(), 0);
          }
          return mockServer;
        });

        const port = await portManager.allocate('api', 4000);
        
        expect(port).toBe(3000); // Falls back to base port
      });

      it('should allocate multiple services', async () => {
        const webPort = await portManager.allocate('web');
        const apiPort = await portManager.allocate('api');
        const wsPort = await portManager.allocate("websocket");
        
        expect(webPort).toBe(3000);
        expect(apiPort).toBe(3001);
        expect(wsPort).toBe(3002);
        
        expect(portManager.getAllocations()).toHaveLength(3);
      });

      it('should skip already allocated ports', async () => {
        // First allocate a port
        await portManager.allocate('web'); // Gets 3000
        
        // Create new manager with same base port
        const newManager = new PortManager(3000);
        
        // Mock: first port unavailable, second available
        let callCount = 0;
        mockServer.once.mockImplementation((event: string, callback: Function) => {
          callCount++;
          if (event === 'error' && callCount === 1) {
            setTimeout(() => callback(new Error("EADDRINUSE")), 0);
          } else if (event === "listening") {
            setTimeout(() => callback(), 0);
          }
          return mockServer;
        });
        
        const port = await newManager.allocate('api');
        expect(port).toBe(3001);
      });
    });

    describe('release', () => {
      it('should release allocated port', async () => {
        await portManager.allocate('web');
        expect(portManager.getAllocations()).toHaveLength(1);
        
        portManager.release('web');
        expect(portManager.getAllocations()).toHaveLength(0);
      });

      it('should handle releasing non-existent service', () => {
        expect(() => portManager.release('non-existent')).not.toThrow();
      });
    });

    describe("releaseAll", () => {
      it('should release all allocated ports', async () => {
        await portManager.allocate('web');
        await portManager.allocate('api');
        await portManager.allocate("database");
        
        expect(portManager.getAllocations()).toHaveLength(3);
        
        portManager.releaseAll();
        expect(portManager.getAllocations()).toHaveLength(0);
      });
    });

    describe("toEnvVars", () => {
      it('should export allocations as environment variables', async () => {
        await portManager.allocate('web-server');
        await portManager.allocate('api-gateway');
        await portManager.allocate('ws');
        
        const envVars = portManager.toEnvVars();
        
        expect(envVars).toEqual({
          'WEB_SERVER_PORT': 3000,
          'API_GATEWAY_PORT': 3001,
          'WS_PORT': 3002
        });
      });

      it('should use prefix for environment variables', async () => {
        await portManager.allocate('web');
        await portManager.allocate('api');
        
        const envVars = portManager.toEnvVars('MYAPP_');
        
        expect(envVars).toEqual({
          'MYAPP_WEB_PORT': 3000,
          'MYAPP_API_PORT': 3001
        });
      });

      it('should handle special characters in service names', async () => {
        await portManager.allocate('web.server');
        await portManager.allocate('api@gateway');
        await portManager.allocate('ws-socket');
        
        const envVars = portManager.toEnvVars();
        
        expect(envVars).toEqual({
          'WEB_SERVER_PORT': 3000,
          'API_GATEWAY_PORT': 3001,
          'WS_SOCKET_PORT': 3002
        });
      });
    });

    describe('error handling', () => {
      it('should throw when no ports available', async () => {
        // Create manager near end of range
        const manager = new PortManager(9998);
        
        // Mock all ports unavailable
        mockServer.once.mockImplementation((event: string, callback: Function) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error("EADDRINUSE")), 0);
          }
          return mockServer;
        });
        
        await expect(manager.allocate('service'))
          .rejects.toThrow('No available ports in range');
      });
    });
  });

  describe("createServicePortConfig", () => {
    beforeEach(() => {
      // Mock all ports as available
      mockServer.once.mockImplementation((event: string, callback: Function) => {
        if (event === "listening") {
          setTimeout(() => callback(), 0);
        }
        return mockServer;
      });
    });

    it('should create config for default services', async () => {
      const config = await createServicePortConfig();
      
      expect(config).toEqual({
        web: 3000,
        api: 3001,
        ws: 3002
      });
    });

    it('should create config with custom base port', async () => {
      const config = await createServicePortConfig(5000);
      
      expect(config).toEqual({
        web: 5000,
        api: 5001,
        ws: 5002
      });
    });

    it('should create config for custom services', async () => {
      const services = ["frontend", 'backend', "database", 'cache'];
      const config = await createServicePortConfig(4000, services);
      
      expect(config).toEqual({
        frontend: 4000,
        backend: 4001,
        database: 4002,
        cache: 4003
      });
    });

    it('should handle empty services array', async () => {
      const config = await createServicePortConfig(3000, []);
      
      expect(config).toEqual({});
    });
  });

  describe('edge cases', () => {
    it('should handle port at upper boundary', async () => {
      mockServer.once.mockImplementation((event: string, callback: Function) => {
        if (event === "listening") {
          setTimeout(() => callback(), 0);
        }
        return mockServer;
      });

      const available = await isPortAvailable(65535);
      expect(available).toBe(true);
    });

    it('should handle rapid consecutive allocations', async () => {
      const manager = new PortManager(3000);
      
      const promises = Array.from({ length: 10 }, (_, i) => 
        manager.allocate(`service-${i}`)
      );
      
      const ports = await Promise.all(promises);
      
      expect(new Set(ports).size).toBe(10); // All unique
      expect(ports).toEqual([3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009]);
    });
  });
});