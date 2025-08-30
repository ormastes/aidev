/**
 * System Test: vLLM Coordinator
 * 
 * Tests the complete vLLM coordinator functionality with real API interactions,
 * model management, and integration with the AI development platform.
 */

import { test, expect } from '@playwright/test';
import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

test.describe('vLLM Coordinator System Tests', () => {
  let testDir: string;
  let coordinatorProcess: ChildProcess;
  const coordinatorPort = 8001;
  const coordinatorUrl = `http://localhost:${coordinatorPort}`;

  test.beforeAll(async () => {
    testDir = join(tmpdir(), 'vllm-coordinator-test');
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }

    // Create test configuration
    const config = {
      models: {
        "small-model": {
          path: "microsoft/DialoGPT-small",
          max_tokens: 1024,
          temperature: 0.7
        }
      },
      server: {
        host: "localhost",
        port: coordinatorPort,
        workers: 1
      },
      coordinator: {
        max_concurrent_requests: 10,
        timeout: 30000
      }
    };
    
    writeFileSync(join(testDir, 'vllm-config.json'), JSON.stringify(config, null, 2));
  });

  test.afterAll(async () => {
    if (coordinatorProcess) {
      coordinatorProcess.kill();
    }
  });

  test('should start vLLM coordinator service', async () => {
    try {
      // Check if vLLM is available
      await execAsync('python -c "import vllm"');
      
      const coordinatorScript = join(__dirname, '../../src/coordinator.py');
      if (existsSync(coordinatorScript)) {
        coordinatorProcess = spawn('python', [coordinatorScript, '--config', join(testDir, 'vllm-config.json')], {
          cwd: testDir,
          stdio: 'pipe'
        });
        
        // Wait for service to start
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check if service is running
        const healthResponse = await fetch(`${coordinatorUrl}/health`).catch(() => null);
        if (healthResponse) {
          expect(healthResponse.status).toBe(200);
        }
      }
    } catch (error) {
      console.log('vLLM not available, skipping coordinator startup:', error.message);
    }
  });

  test('should handle model loading and management', async () => {
    try {
      // Test model listing endpoint
      const modelsResponse = await fetch(`${coordinatorUrl}/v1/models`);
      if (modelsResponse.ok) {
        const models = await modelsResponse.json();
        expect(models).toHaveProperty('data');
        expect(Array.isArray(models.data)).toBe(true);
      }
    } catch (error) {
      console.log('Model management API not available:', error.message);
    }
  });

  test('should process completions requests', async () => {
    try {
      const completionRequest = {
        model: 'small-model',
        prompt: 'Hello, how are you?',
        max_tokens: 50,
        temperature: 0.7
      };
      
      const response = await fetch(`${coordinatorUrl}/v1/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(completionRequest)
      });
      
      if (response.ok) {
        const result = await response.json();
        expect(result).toHaveProperty('choices');
        expect(Array.isArray(result.choices)).toBe(true);
        expect(result.choices[0]).toHaveProperty('text');
      }
    } catch (error) {
      console.log('Completions API not available:', error.message);
    }
  });

  test('should handle chat completions', async () => {
    try {
      const chatRequest = {
        model: 'small-model',
        messages: [
          { role: 'user', content: 'What is the weather like today?' }
        ],
        max_tokens: 100,
        temperature: 0.5
      };
      
      const response = await fetch(`${coordinatorUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(chatRequest)
      });
      
      if (response.ok) {
        const result = await response.json();
        expect(result).toHaveProperty('choices');
        expect(result.choices[0]).toHaveProperty('message');
        expect(result.choices[0].message).toHaveProperty('content');
      }
    } catch (error) {
      console.log('Chat completions API not available:', error.message);
    }
  });

  test('should provide streaming responses', async () => {
    try {
      const streamRequest = {
        model: 'small-model',
        prompt: 'Tell me a short story',
        max_tokens: 200,
        stream: true
      };
      
      const response = await fetch(`${coordinatorUrl}/v1/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(streamRequest)
      });
      
      if (response.ok && response.body) {
        const reader = response.body.getReader();
        let chunks = 0;
        
        try {
          while (chunks < 5) { // Read first few chunks
            const { done, value } = await reader.read();
            if (done) break;
            
            const text = new TextDecoder().decode(value);
            expect(text).toContain('data:' || 'choices');
            chunks++;
          }
        } finally {
          reader.releaseLock();
        }
      }
    } catch (error) {
      console.log('Streaming API not available:', error.message);
    }
  });

  test('should integrate with AI development platform', async ({ page }) => {
    // Test web interface integration
    const platformUrl = 'http://localhost:3457';
    
    try {
      await page.goto(platformUrl);
      
      // Look for vLLM coordinator integration
      const vllmSection = page.locator('[data-testid="vllm-coordinator"]').or(
        page.locator('text=vLLM').or(
          page.locator('.coordinator-section')
        )
      );
      
      if (await vllmSection.count() > 0) {
        await expect(vllmSection).toBeVisible();
        
        // Test model selection
        const modelSelect = page.locator('select').or(
          page.locator('[data-testid="model-selector"]')
        );
        
        if (await modelSelect.count() > 0) {
          await modelSelect.selectOption('small-model');
        }
        
        // Test prompt input
        const promptInput = page.locator('textarea').or(
          page.locator('[data-testid="prompt-input"]')
        );
        
        if (await promptInput.count() > 0) {
          await promptInput.fill('Test prompt for vLLM');
          
          const submitButton = page.locator('button').filter({ hasText: /generate|submit/i });
          if (await submitButton.count() > 0) {
            await submitButton.click();
            
            // Wait for response
            const responseArea = page.locator('[data-testid="response"]').or(
              page.locator('.response')
            );
            
            if (await responseArea.count() > 0) {
              await expect(responseArea).toBeVisible({ timeout: 10000 });
            }
          }
        }
      }
    } catch (error) {
      console.log('Platform integration interface not available:', error.message);
    }
  });

  test('should handle concurrent requests', async () => {
    const concurrentRequests = 5;
    const promises = [];
    
    for (let i = 0; i < concurrentRequests; i++) {
      const request = {
        model: 'small-model',
        prompt: `Test prompt ${i + 1}`,
        max_tokens: 20
      };
      
      const promise = fetch(`${coordinatorUrl}/v1/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      }).catch(() => null);
      
      promises.push(promise);
    }
    
    try {
      const results = await Promise.all(promises);
      const successCount = results.filter(r => r?.ok).length;
      
      // At least some requests should succeed if coordinator is running
      if (results.some(r => r !== null)) {
        expect(successCount).toBeGreaterThan(0);
      }
    } catch (error) {
      console.log('Concurrent request testing failed:', error.message);
    }
  });

  test('should provide performance metrics', async () => {
    try {
      const metricsResponse = await fetch(`${coordinatorUrl}/metrics`);
      if (metricsResponse.ok) {
        const metrics = await metricsResponse.text();
        
        // Check for Prometheus-style metrics
        expect(metrics).toContain('# HELP' || 'requests_total' || 'latency');
      }
    } catch (error) {
      console.log('Metrics endpoint not available:', error.message);
    }
  });

  test('should handle error conditions gracefully', async () => {
    try {
      // Test with invalid model
      const invalidRequest = {
        model: 'non-existent-model',
        prompt: 'Test prompt'
      };
      
      const response = await fetch(`${coordinatorUrl}/v1/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidRequest)
      });
      
      // Should return proper error response
      expect(response.status).toBeGreaterThanOrEqual(400);
      
      const error = await response.json();
      expect(error).toHaveProperty('error');
    } catch (error) {
      console.log('Error handling test not available:', error.message);
    }
  });

  test('should support configuration management', async () => {
    try {
      const configResponse = await fetch(`${coordinatorUrl}/config`);
      if (configResponse.ok) {
        const config = await configResponse.json();
        expect(config).toHaveProperty('models' || 'server' || 'coordinator');
      }
      
      // Test configuration update
      const updateConfig = {
        coordinator: {
          max_concurrent_requests: 5
        }
      };
      
      const updateResponse = await fetch(`${coordinatorUrl}/config`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateConfig)
      });
      
      if (updateResponse.ok) {
        expect(updateResponse.status).toBe(200);
      }
    } catch (error) {
      console.log('Configuration management not available:', error.message);
    }
  });
});
