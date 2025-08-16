import { EnhancedPortManager } from '../children/EnhancedPortManager';
import { net } from '../../infra_external-log-lib/src';
import { http } from '../../infra_external-log-lib/src';

describe('EnhancedPortManager Enforcement', () => {
  let portManager: EnhancedPortManager;
  
  beforeEach(() => {
    portManager = EnhancedPortManager.getInstance();
  });
  
  describe('Port Registration', () => {
    test('should register predefined app with correct port', () => {
      const result = portManager.registerApp({
        appId: 'portal',
        deployType: 'release'
      });
      
      expect(result.success).toBe(true);
      expect(result.port).toBe(3456);  // Portal on release = 3456
      expect(result.message).toContain('Registered portal');
    });
    
    test('should register dynamic app with available port', () => {
      const result = portManager.registerApp({
        appId: 'custom-app',
        deployType: 'dev'
      });
      
      expect(result.success).toBe(true);
      expect(result.port).toBeGreaterThanOrEqual(3260);  // Dynamic range starts at x60
      expect(result.port).toBeLessThanOrEqual(3299);     // Dev range ends at 3299
    });
    
    test('should respect requested port if available', () => {
      const result = portManager.registerApp({
        appId: 'test-app',
        deployType: 'local',
        requestedPort: 3175
      });
      
      expect(result.success).toBe(true);
      expect(result.port).toBe(3175);
    });
    
    test('should handle IP-based registration', () => {
      const result = portManager.registerApp({
        appId: 'multi-server-app',
        deployType: 'production',
        ipAddress: '192.168.1.100'
      });
      
      expect(result.success).toBe(true);
      expect(result.port).toBeDefined();
    });
  });
  
  describe('Port Enforcement', () => {
    test('should block unauthorized port usage', (done) => {
      // Try to use port without registration
      const server = net.createServer();
      
      try {
        server.listen(3999, () => {
          // Should not reach here
          server.close();
          done(new Error('Port enforcement failed - server started on unauthorized port'));
        });
      } catch (error: any) {
        expect(error.message).toContain('PORT SECURITY VIOLATION');
        expect(error.message).toContain('3999');
        done();
      }
    });
    
    test('should allow registered port usage', (done) => {
      // First register the app
      const result = portManager.registerApp({
        appId: 'test-server',
        deployType: 'local'
      });
      
      expect(result.success).toBe(true);
      
      if (result.port) {
        // Now try to use the registered port
        const server = http.createServer();
        
        server.listen(result.port, () => {
          // Should succeed
          expect(server.listening).toBe(true);
          server.close();
          done();
        });
        
        server.on('error', (err) => {
          done(new Error(`Failed to use registered port: ${err.message}`));
        });
      }
    });
  });
  
  describe('Port Updates', () => {
    test('should update registration when requested', () => {
      // Register initially
      portManager.registerApp({
        appId: 'update-test',
        deployType: 'demo'
      });
      
      // Update registration
      const updated = portManager.updateRegistration(
        'update-test',
        'demo',
        3380  // New port
      );
      
      expect(updated).toBe(true);
      
      // Verify new port is registered
      const registrations = portManager.getAllRegistrations();
      const reg = registrations.find(r => r.appId === 'update-test');
      expect(reg?.assignedPort).toBe(3380);
    });
  });
  
  describe('Reporting', () => {
    test('should generate comprehensive report', () => {
      // Register some apps
      portManager.registerApp({ appId: 'portal', deployType: 'release' });
      portManager.registerApp({ appId: 'test-app', deployType: 'dev' });
      
      const report = portManager.generateReport();
      
      expect(report).toContain('Enhanced Port Manager Report');
      expect(report).toContain('Port Ranges:');
      expect(report).toContain('Predefined Apps:');
      expect(report).toContain('Active Registrations:');
      expect(report).toContain('portal');
      expect(report).toContain('3456');
    });
  });
  
  describe('Deploy Type Handling', () => {
    const deployTypes = ['local', 'dev', 'demo', 'release', 'production'] as const;
    
    deployTypes.forEach(deployType => {
      test(`should assign correct port range for ${deployType}`, () => {
        const result = portManager.registerApp({
          appId: `${deployType}-test`,
          deployType
        });
        
        expect(result.success).toBe(true);
        
        const expectedPrefix = {
          local: 31,
          dev: 32,
          demo: 33,
          release: 34,
          production: 35
        }[deployType];
        
        if (result.port) {
          const prefix = Math.floor(result.port / 100);
          expect(prefix).toBe(expectedPrefix);
        }
      });
    });
  });
  
  describe('OpenPort Helper', () => {
    test('should create server with registered port', async () => {
      const server = await portManager.openPort('gui-selector', 'demo');
      
      expect(server).toBeDefined();
      expect(server.listening).toBe(true);
      
      // @ts-ignore - Access private property for testing
      const address = server.address();
      expect(address?.port).toBe(3357);  // GUI selector demo port
      
      server.close();
    });
    
    test('should reject if registration fails', async () => {
      // Try to register same app twice on same port
      await portManager.openPort('conflict-test', 'local');
      
      // Second attempt should fail
      await expect(
        portManager.openPort('different-app', 'local', { requestedPort: 3160 })
      ).rejects.toThrow();
    });
  });
});