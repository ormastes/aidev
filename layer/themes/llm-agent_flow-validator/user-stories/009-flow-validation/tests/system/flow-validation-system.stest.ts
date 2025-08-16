/**
 * System tests for Flow Validator - Complete System
 */

import { FlowValidatorSystem } from '../../src/flow-validator-system';
import { FlowEngine } from '../../src/flow-engine';
import { ValidationServer } from '../../src/validation-server';
import { FlowRepository } from '../../src/flow-repository';
import { 
  Flow, 
  ValidationResult, 
  FlowExecutionContext,
  SystemConfig 
} from '../../src/types';
import { http } from '../../../../../infra_external-log-lib/src';
import * as WebSocket from 'ws';
import { EventEmitter } from '../../../../../infra_external-log-lib/src';
import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';

describe('Flow Validator System Tests', () => {
  let system: FlowValidatorSystem;
  let server: ValidationServer;
  let repository: FlowRepository;
  let testDataDir: string;
  let serverUrl: string;
  let wsUrl: string;
  const testPort = 9876;

  beforeAll(async () => {
    // Setup test data directory
    testDataDir = `/tmp/flow-validator-test-${Date.now()}`;
    await fs.mkdir(testDataDir, { recursive: true });

    // Initialize system components
    const config: SystemConfig = {
      port: testPort,
      dataDir: testDataDir,
      enableWebSocket: true,
      enableMetrics: true,
      maxConcurrentFlows: 10
    };

    system = new FlowValidatorSystem(config);
    await system.start();

    server = system.getServer();
    repository = system.getRepository();
    
    serverUrl = `http://localhost:${testPort}`;
    wsUrl = `ws://localhost:${testPort}`;
  });

  afterAll(async () => {
    await system.stop();
    await fs.rm(testDataDir, { recursive: true, force: true });
  });

  describe('End-to-End Flow Validation', () => {
    it('should validate and execute a complete flow', async () => {
      // Define a complex flow
      const flow: Flow = {
        id: 'test-flow-1',
        name: 'Complete Test Flow',
        version: '1.0.0',
        nodes: [
          {
            id: 'start',
            type: 'trigger',
            config: { event: 'http_request' }
          },
          {
            id: 'validate_input',
            type: 'validator',
            config: {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  age: { type: 'number', minimum: 18 }
                },
                required: ['email', 'age']
              }
            }
          },
          {
            id: 'process_data',
            type: 'processor',
            config: {
              operation: 'transform',
              mapping: {
                'user.email': '$.email',
                'user.age': '$.age',
                'user.isAdult': '$.age >= 18'
              }
            }
          },
          {
            id: 'make_decision',
            type: 'decision',
            config: {
              conditions: [
                {
                  when: '$.user.isAdult',
                  then: 'send_welcome'
                },
                {
                  when: '!$.user.isAdult',
                  then: 'send_rejection'
                }
              ]
            }
          },
          {
            id: 'send_welcome',
            type: 'action',
            config: {
              action: 'send_email',
              template: 'welcome'
            }
          },
          {
            id: 'send_rejection',
            type: 'action',
            config: {
              action: 'send_email',
              template: 'age_restriction'
            }
          },
          {
            id: 'end',
            type: 'terminator'
          }
        ],
        edges: [
          { from: 'start', to: 'validate_input' },
          { from: 'validate_input', to: 'process_data' },
          { from: 'process_data', to: 'make_decision' },
          { from: 'make_decision', to: 'send_welcome', condition: 'adult' },
          { from: 'make_decision', to: 'send_rejection', condition: 'minor' },
          { from: 'send_welcome', to: 'end' },
          { from: 'send_rejection', to: 'end' }
        ]
      };

      // Save flow
      await repository.saveFlow(flow);

      // Validate flow
      const validationResponse = await fetch(`${serverUrl}/api/flows/${flow.id}/validate`, {
        method: 'POST'
      });
      const validationResult = await validationResponse.json();

      expect(validationResult.valid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);

      // Execute flow with valid data
      const executionResponse = await fetch(`${serverUrl}/api/flows/${flow.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
          age: 25
        })
      });
      const executionResult = await executionResponse.json();

      expect(executionResult.success).toBe(true);
      expect(executionResult.path).toContain('send_welcome');
      expect(executionResult.output.user.isAdult).toBe(true);
    });

    it('should handle validation errors properly', async () => {
      const flow: Flow = {
        id: 'test-flow-2',
        name: 'Flow with Validation',
        version: '1.0.0',
        nodes: [
          {
            id: 'start',
            type: 'trigger',
            config: {}
          },
          {
            id: 'strict_validator',
            type: 'validator',
            config: {
              schema: {
                type: 'object',
                properties: {
                  requiredField: { type: 'string', minLength: 5 }
                },
                required: ['requiredField']
              }
            }
          }
        ],
        edges: [
          { from: 'start', to: 'strict_validator' }
        ]
      };

      await repository.saveFlow(flow);

      // Execute with invalid data
      const response = await fetch(`${serverUrl}/api/flows/${flow.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requiredField: 'abc' // Too short
        })
      });
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          node: 'strict_validator',
          message: expect.stringContaining('minLength')
        })
      );
    });
  });

  describe('Real-time Flow Monitoring', () => {
    it('should stream flow execution events via WebSocket', async () => {
      const flow: Flow = {
        id: 'monitored-flow',
        name: 'Monitored Flow',
        version: '1.0.0',
        nodes: [
          { id: 'start', type: 'trigger', config: {} },
          { id: 'delay', type: 'processor', config: { delay: 100 } },
          { id: 'end', type: 'terminator', config: {} }
        ],
        edges: [
          { from: 'start', to: 'delay' },
          { from: 'delay', to: 'end' }
        ]
      };

      await repository.saveFlow(flow);

      // Connect WebSocket
      const ws = new WebSocket(`${wsUrl}/monitor`);
      const events: any[] = [];

      await new Promise((resolve) => {
        ws.on('open', resolve);
      });

      ws.on('message', (data) => {
        events.push(JSON.parse(data.toString()));
      });

      // Subscribe to flow
      ws.send(JSON.stringify({
        action: 'subscribe',
        flowId: flow.id
      }));

      // Execute flow
      await fetch(`${serverUrl}/api/flows/${flow.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      // Wait for events
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(events.length).toBeGreaterThan(0);
      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'flow.started',
          flowId: flow.id
        })
      );
      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'node.entered',
          nodeId: 'start'
        })
      );
      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'flow.completed',
          flowId: flow.id
        })
      );

      ws.close();
    });
  });

  describe('Flow Import/Export', () => {
    it('should import flows from various formats', async () => {
      // Import from JSON
      const jsonFlow = {
        id: 'imported-json',
        name: 'JSON Import',
        format: 'json',
        content: JSON.stringify({
          nodes: [
            { id: 'start', type: 'trigger' },
            { id: 'end', type: 'terminator' }
          ],
          edges: [{ from: 'start', to: 'end' }]
        })
      };

      const jsonResponse = await fetch(`${serverUrl}/api/flows/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonFlow)
      });

      expect(jsonResponse.status).toBe(200);
      const jsonResult = await jsonResponse.json();
      expect(jsonResult.flowId).toBe('imported-json');

      // Import from YAML
      const yamlFlow = {
        id: 'imported-yaml',
        name: 'YAML Import',
        format: 'yaml',
        content: `
nodes:
  - id: start
    type: trigger
  - id: process
    type: processor
  - id: end
    type: terminator
edges:
  - from: start
    to: process
  - from: process
    to: end
`
      };

      const yamlResponse = await fetch(`${serverUrl}/api/flows/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(yamlFlow)
      });

      expect(yamlResponse.status).toBe(200);
    });

    it('should export flows in different formats', async () => {
      const flow: Flow = {
        id: 'export-test',
        name: 'Export Test',
        version: '1.0.0',
        nodes: [
          { id: 'start', type: 'trigger', config: {} },
          { id: 'end', type: 'terminator', config: {} }
        ],
        edges: [{ from: 'start', to: 'end' }]
      };

      await repository.saveFlow(flow);

      // Export as JSON
      const jsonExport = await fetch(`${serverUrl}/api/flows/${flow.id}/export?format=json`);
      expect(jsonExport.status).toBe(200);
      const jsonContent = await jsonExport.json();
      expect(jsonContent.id).toBe(flow.id);
      expect(jsonContent.nodes).toHaveLength(2);

      // Export as YAML
      const yamlExport = await fetch(`${serverUrl}/api/flows/${flow.id}/export?format=yaml`);
      expect(yamlExport.status).toBe(200);
      const yamlContent = await yamlExport.text();
      expect(yamlContent).toContain('id: export-test');
      expect(yamlContent).toContain('type: trigger');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent flow executions', async () => {
      const flow: Flow = {
        id: 'concurrent-test',
        name: 'Concurrent Test',
        version: '1.0.0',
        nodes: [
          { id: 'start', type: 'trigger', config: {} },
          { id: 'compute', type: 'processor', config: { 
            operation: 'compute',
            expression: 'Math.random() * 1000'
          }},
          { id: 'end', type: 'terminator', config: {} }
        ],
        edges: [
          { from: 'start', to: 'compute' },
          { from: 'compute', to: 'end' }
        ]
      };

      await repository.saveFlow(flow);

      // Execute multiple flows concurrently
      const concurrentRequests = 20;
      const startTime = Date.now();
      
      const promises = Array(concurrentRequests).fill(0).map((_, index) =>
        fetch(`${serverUrl}/api/flows/${flow.id}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId: index })
        })
      );

      const responses = await Promise.all(promises);
      const executionTime = Date.now() - startTime;

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete within reasonable time
      expect(executionTime).toBeLessThan(5000);

      // Check metrics
      const metricsResponse = await fetch(`${serverUrl}/api/metrics`);
      const metrics = await metricsResponse.json();
      
      expect(metrics.totalExecutions).toBeGreaterThanOrEqual(concurrentRequests);
      expect(metrics.activeExecutions).toBeLessThanOrEqual(10); // Max concurrent limit
    });

    it('should enforce rate limiting', async () => {
      // Create a simple flow
      const flow: Flow = {
        id: 'rate-limit-test',
        name: 'Rate Limit Test',
        version: '1.0.0',
        nodes: [
          { id: 'start', type: 'trigger', config: {} },
          { id: 'end', type: 'terminator', config: {} }
        ],
        edges: [{ from: 'start', to: 'end' }]
      };

      await repository.saveFlow(flow);

      // Exceed rate limit
      const requests = Array(50).fill(0).map(() =>
        fetch(`${serverUrl}/api/flows/${flow.id}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        })
      );

      const responses = await Promise.all(requests);
      
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
      
      const rateLimitedResponse = await rateLimited[0].json();
      expect(rateLimitedResponse.error).toContain('Rate limit exceeded');
    });
  });

  describe('Flow Versioning and History', () => {
    it('should maintain flow version history', async () => {
      const flowId = 'versioned-flow';
      
      // Create initial version
      const v1: Flow = {
        id: flowId,
        name: 'Versioned Flow',
        version: '1.0.0',
        nodes: [
          { id: 'start', type: 'trigger', config: {} },
          { id: 'end', type: 'terminator', config: {} }
        ],
        edges: [{ from: 'start', to: 'end' }]
      };

      await repository.saveFlow(v1);

      // Update to v2
      const v2: Flow = {
        ...v1,
        version: '2.0.0',
        nodes: [
          ...v1.nodes,
          { id: 'middle', type: 'processor', config: {} }
        ],
        edges: [
          { from: 'start', to: 'middle' },
          { from: 'middle', to: 'end' }
        ]
      };

      await repository.saveFlow(v2);

      // Get version history
      const historyResponse = await fetch(`${serverUrl}/api/flows/${flowId}/versions`);
      const history = await historyResponse.json();

      expect(history.versions).toHaveLength(2);
      expect(history.versions[0].version).toBe('1.0.0');
      expect(history.versions[1].version).toBe('2.0.0');

      // Execute specific version
      const v1Response = await fetch(`${serverUrl}/api/flows/${flowId}/execute?version=1.0.0`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const v1Result = await v1Response.json();
      expect(v1Result.version).toBe('1.0.0');
      expect(v1Result.path).toEqual(['start', 'end']);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from node failures', async () => {
      const flow: Flow = {
        id: 'resilient-flow',
        name: 'Resilient Flow',
        version: '1.0.0',
        nodes: [
          { id: 'start', type: 'trigger', config: {} },
          { 
            id: 'unreliable', 
            type: 'processor', 
            config: { 
              failureRate: 0.5,
              retries: 3,
              retryDelay: 100
            } 
          },
          { id: 'end', type: 'terminator', config: {} }
        ],
        edges: [
          { from: 'start', to: 'unreliable' },
          { from: 'unreliable', to: 'end' }
        ]
      };

      await repository.saveFlow(flow);

      // Execute multiple times to test retry logic
      const results = await Promise.all(
        Array(10).fill(0).map(() =>
          fetch(`${serverUrl}/api/flows/${flow.id}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
          }).then(r => r.json())
        )
      );

      // Some should succeed due to retries
      const successful = results.filter(r => r.success);
      expect(successful.length).toBeGreaterThan(0);
      
      // Check retry attempts in successful executions
      successful.forEach(result => {
        expect(result.metadata.retryAttempts).toBeDefined();
      });
    });
  });

  // Helper function for HTTP requests
  async function fetch(url: string, options?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const reqOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: options?.method || 'GET',
        headers: options?.headers || {}
      };

      const req = http.request(reqOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const response = {
            status: res.statusCode,
            json: () => Promise.resolve(JSON.parse(data)),
            text: () => Promise.resolve(data)
          };
          resolve(response);
        });
      });

      req.on('error', reject);
      
      if (options?.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  }
});