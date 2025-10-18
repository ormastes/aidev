/**
 * Integration Tests for Embedding Manager
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { EmbeddingManager } from '../../src/portal/embedding-manager';
import { EmbeddedServiceConfig, ServiceStatus } from '../../src/types/embedding';

describe('EmbeddingManager Integration Tests', () => {
  let manager: EmbeddingManager;
  let container: HTMLElement;

  beforeEach(() => {
    // Create test container
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);

    // Create manager
    manager = new EmbeddingManager();
  });

  afterEach(() => {
    // Clean up
    manager.destroy();
    document.body.removeChild(container);
  });

  it('should create embedding manager', () => {
    expect(manager).toBeDefined();
  });

  it('should embed a service', async () => {
    const config: EmbeddedServiceConfig = {
      id: 'test-service',
      name: 'Test Service',
      url: 'http://localhost:3001',
      port: 3001
    };

    // Embed service (will timeout waiting for READY but that's ok for this test)
    try {
      await manager.embedService('test-service', config, container);
    } catch (error) {
      // Expected to timeout in test environment
    }

    // Check that service is in the list
    const services = manager.listEmbeddedServices();
    expect(services).toContain('test-service');

    // Check that iframe was created
    const iframe = container.querySelector('iframe');
    expect(iframe).toBeDefined();
    expect(iframe?.src).toContain('localhost:3001');
  });

  it('should set correct iframe attributes', async () => {
    const config: EmbeddedServiceConfig = {
      id: 'secure-service',
      name: 'Secure Service',
      url: 'http://localhost:3002',
      port: 3002,
      description: 'A secure service'
    };

    try {
      await manager.embedService('secure-service', config, container);
    } catch (error) {
      // Expected
    }

    const iframe = container.querySelector('iframe');
    expect(iframe?.getAttribute('data-service-id')).toBe('secure-service');
    expect(iframe?.title).toBe('Secure Service');
    expect(iframe?.sandbox.contains('allow-same-origin')).toBe(true);
    expect(iframe?.sandbox.contains('allow-scripts')).toBe(true);
  });

  it('should track service state', async () => {
    const config: EmbeddedServiceConfig = {
      id: 'state-service',
      name: 'State Service',
      url: 'http://localhost:3003',
      port: 3003
    };

    try {
      await manager.embedService('state-service', config, container);
    } catch (error) {
      // Expected
    }

    const state = manager.getServiceState('state-service');
    expect(state).toBeDefined();
    expect(state?.id).toBe('state-service');
    expect(state?.iframe).toBeDefined();
  });

  it('should unembed a service', async () => {
    const config: EmbeddedServiceConfig = {
      id: 'temp-service',
      name: 'Temp Service',
      url: 'http://localhost:3004',
      port: 3004
    };

    try {
      await manager.embedService('temp-service', config, container);
    } catch (error) {
      // Expected
    }

    // Verify embedded
    expect(manager.listEmbeddedServices()).toContain('temp-service');
    expect(container.querySelector('iframe')).toBeDefined();

    // Unembed
    await manager.unembedService('temp-service');

    // Verify unembedded
    expect(manager.listEmbeddedServices()).not.toContain('temp-service');
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('should handle multiple services', async () => {
    const services: EmbeddedServiceConfig[] = [
      { id: 'service-1', name: 'Service 1', url: 'http://localhost:3001', port: 3001 },
      { id: 'service-2', name: 'Service 2', url: 'http://localhost:3002', port: 3002 },
      { id: 'service-3', name: 'Service 3', url: 'http://localhost:3003', port: 3003 }
    ];

    for (const config of services) {
      try {
        await manager.embedService(config.id, config, container);
      } catch (error) {
        // Expected
      }
    }

    const embeddedServices = manager.listEmbeddedServices();
    expect(embeddedServices.length).toBe(3);
    expect(embeddedServices).toContain('service-1');
    expect(embeddedServices).toContain('service-2');
    expect(embeddedServices).toContain('service-3');
  });

  it('should switch between services', async () => {
    const services: EmbeddedServiceConfig[] = [
      { id: 'service-a', name: 'Service A', url: 'http://localhost:3001', port: 3001 },
      { id: 'service-b', name: 'Service B', url: 'http://localhost:3002', port: 3002 }
    ];

    // Embed both services
    for (const config of services) {
      try {
        await manager.embedService(config.id, config, container);
      } catch (error) {
        // Expected
      }
    }

    // Switch to service-a
    await manager.switchToService('service-a');
    expect(manager.getCurrentService()).toBe('service-a');

    // Check visibility
    const iframes = container.querySelectorAll('iframe');
    const iframeA = Array.from(iframes).find(i => i.getAttribute('data-service-id') === 'service-a');
    const iframeB = Array.from(iframes).find(i => i.getAttribute('data-service-id') === 'service-b');

    expect(iframeA?.style.display).toBe('block');
    expect(iframeB?.style.display).toBe('none');

    // Switch to service-b
    await manager.switchToService('service-b');
    expect(manager.getCurrentService()).toBe('service-b');

    expect(iframeA?.style.display).toBe('none');
    expect(iframeB?.style.display).toBe('block');
  });

  it('should get service status', async () => {
    const config: EmbeddedServiceConfig = {
      id: 'status-service',
      name: 'Status Service',
      url: 'http://localhost:3005',
      port: 3005
    };

    // Before embedding
    expect(manager.getServiceStatus('status-service')).toBe(ServiceStatus.UNLOADED);

    // After embedding (will be LOADING since we won't get READY)
    try {
      await manager.embedService('status-service', config, container);
    } catch (error) {
      // Expected
    }

    const status = manager.getServiceStatus('status-service');
    expect([ServiceStatus.LOADING, ServiceStatus.ERROR]).toContain(status);
  });

  it('should prevent embedding same service twice', async () => {
    const config: EmbeddedServiceConfig = {
      id: 'duplicate-service',
      name: 'Duplicate Service',
      url: 'http://localhost:3006',
      port: 3006
    };

    try {
      await manager.embedService('duplicate-service', config, container);
    } catch (error) {
      // Expected
    }

    // Try to embed again
    await manager.embedService('duplicate-service', config, container);

    // Should still only have one
    const iframes = container.querySelectorAll('iframe[data-service-id="duplicate-service"]');
    expect(iframes.length).toBe(1);
  });
});
