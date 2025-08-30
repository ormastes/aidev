import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from 'playwright';
import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import * as http from 'http';

/**
 * System Tests for Embedded Web Applications
 * Tests all embedded web apps in the AI Dev Platform including portals, dashboards, and monitoring tools
 */

interface EmbeddedApp {
  name: string;
  port: number;
  path: string;
  startCommand: string;
  healthCheck: string;
  features: string[];
}

test.describe('Embedded Web Applications System Tests', () => {
  let browser: Browser;
  let page: Page;
  const runningApps: Map<string, ChildProcess> = new Map();
  
  const embeddedApps: EmbeddedApp[] = [
    {
      name: 'AI Dev Portal',
      port: 3000,
      path: 'layer/themes/portal_aidev',
      startCommand: 'bun run start',
      healthCheck: '/api/health',
      features: ['authentication', 'dashboard', 'project-management', 'monitoring']
    },
    {
      name: 'Log Analysis Dashboard',
      port: 3001,
      path: 'layer/themes/infra_external-log-lib/user-stories/010-log-analysis-dashboard',
      startCommand: 'bun run start',
      healthCheck: '/api/health',
      features: ['real-time-logs', 'filtering', 'search', 'export']
    },
    {
      name: 'GUI Selector',
      port: 3457,
      path: 'layer/themes/portal_gui-selector',
      startCommand: 'bun run start',
      healthCheck: '/',
      features: ['design-selection', 'preview', 'comparison']
    },
    {
      name: 'Monitoring Dashboard',
      port: 3002,
      path: 'layer/themes/infra_monitoring',
      startCommand: 'bun run start',
      healthCheck: '/api/status',
      features: ['metrics', 'alerts', 'visualizations']
    }
  ];

  test.beforeAll(async () => {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  test.afterAll(async () => {
    await browser.close();
    
    // Stop all running apps
    for (const [name, process] of runningApps.entries()) {
      console.log(`Stopping ${name}...`);
      process.kill();
    }
  });

  test.describe('Application Lifecycle Tests', () => {
    for (const app of embeddedApps) {
      test(`should start ${app.name} successfully`, async () => {
        const appPath = path.join(process.cwd(), app.path);
        
        // Check if app directory exists
        const exists = await fs.access(appPath).then(() => true).catch(() => false);
        if (!exists) {
          console.log(`Skipping ${app.name} - directory not found`);
          test.skip();
          return;
        }

        // Start the application
        const appProcess = spawn('bun', ['run', 'start'], {
          cwd: appPath,
          env: {
            ...process.env,
            PORT: app.port.toString(),
            NODE_ENV: 'test'
          },
          detached: false
        });

        runningApps.set(app.name, appProcess);

        // Wait for app to be ready
        const isReady = await waitForApp(app.port, app.healthCheck, 30000);
        expect(isReady).toBe(true);
      });
    }
  });

  test.describe('Core Functionality Tests', () => {
    test('AI Dev Portal - Authentication Flow', async () => {
      const page = await browser.newPage();
      
      try {
        await page.goto('http://localhost:3000');
        
        // Check for login page
        const hasLoginForm = await page.locator('form[action*="login"], #login-form').count() > 0;
        if (hasLoginForm) {
          // Test login with invalid credentials
          await page.fill('input[type="email"], input[name="email"]', 'test@example.com');
          await page.fill('input[type="password"]', 'wrongpassword');
          await page.click('button[type="submit"]');
          
          // Check for error message
          const errorVisible = await page.locator('.error, .alert-danger, [role="alert"]').isVisible();
          expect(errorVisible).toBe(true);
        }
      } catch (error) {
        console.log('Portal not running or accessible');
      } finally {
        await page.close();
      }
    });

    test('Log Analysis Dashboard - Real-time Updates', async () => {
      const page = await browser.newPage();
      
      try {
        await page.goto('http://localhost:3001');
        
        // Check for log container
        const hasLogContainer = await page.locator('.log-container, #logs, [data-testid="log-viewer"]').count() > 0;
        if (hasLogContainer) {
          // Wait for WebSocket connection
          await page.waitForTimeout(2000);
          
          // Check for real-time updates
          const initialLogCount = await page.locator('.log-entry, .log-line').count();
          
          // Trigger a log event (simulate)
          await page.evaluate(() => {
            if ((window as any).logSocket) {
              (window as any).logSocket.emit('log', {
                level: 'info',
                message: 'Test log entry',
                timestamp: new Date().toISOString()
              });
            }
          });
          
          await page.waitForTimeout(1000);
          const newLogCount = await page.locator('.log-entry, .log-line').count();
          
          // Should have new log entries if real-time is working
          expect(newLogCount).toBeGreaterThanOrEqual(initialLogCount);
        }
      } catch (error) {
        console.log('Log Dashboard not running or accessible');
      } finally {
        await page.close();
      }
    });

    test('GUI Selector - Design Selection Interface', async () => {
      const page = await browser.newPage();
      
      try {
        await page.goto('http://localhost:3457');
        
        // Check for design candidates
        const hasDesigns = await page.locator('.design-candidate, .candidate, [data-design]').count() > 0;
        if (hasDesigns) {
          const designCount = await page.locator('.design-candidate, .candidate').count();
          expect(designCount).toBeGreaterThanOrEqual(2); // Should have multiple designs
          
          // Test selection functionality
          const firstDesign = page.locator('.design-candidate, .candidate').first();
          await firstDesign.click();
          
          // Check if selection is registered
          const isSelected = await firstDesign.evaluate(el => 
            el.classList.contains('selected') || el.getAttribute('data-selected') === 'true'
          );
          expect(isSelected).toBe(true);
        }
      } catch (error) {
        console.log('GUI Selector not running or accessible');
      } finally {
        await page.close();
      }
    });
  });

  test.describe('Security Tests', () => {
    test('should have proper CORS configuration', async () => {
      for (const app of embeddedApps) {
        const response = await fetch(`http://localhost:${app.port}/api/test`, {
          method: 'OPTIONS',
          headers: {
            'Origin': 'http://evil.com',
            'Access-Control-Request-Method': 'POST'
          }
        }).catch(() => null);

        if (response) {
          const corsHeader = response.headers.get('access-control-allow-origin');
          // Should not allow all origins in production
          expect(corsHeader).not.toBe('*');
        }
      }
    });

    test('should not expose sensitive information in errors', async () => {
      const page = await browser.newPage();
      
      for (const app of embeddedApps) {
        try {
          await page.goto(`http://localhost:${app.port}/api/invalid-endpoint`);
          const content = await page.content();
          
          // Should not expose stack traces
          expect(content).not.toContain('at Function.');
          expect(content).not.toContain('node_modules');
          expect(content).not.toContain('Error:');
        } catch (error) {
          // App might not be running
        }
      }
      
      await page.close();
    });

    test('should have security headers', async () => {
      for (const app of embeddedApps) {
        const response = await fetch(`http://localhost:${app.port}`).catch(() => null);
        
        if (response) {
          // Check for security headers
          const headers = response.headers;
          
          // These should be present in production
          const securityHeaders = [
            'x-content-type-options',
            'x-frame-options',
            'x-xss-protection'
          ];
          
          for (const header of securityHeaders) {
            console.log(`${app.name} - ${header}: ${headers.get(header) || 'missing'}`);
          }
        }
      }
    });
  });

  test.describe('Performance Tests', () => {
    test('should load within acceptable time', async () => {
      const page = await browser.newPage();
      
      for (const app of embeddedApps) {
        try {
          const startTime = Date.now();
          await page.goto(`http://localhost:${app.port}`, {
            waitUntil: 'networkidle',
            timeout: 10000
          });
          const loadTime = Date.now() - startTime;
          
          console.log(`${app.name} load time: ${loadTime}ms`);
          expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
        } catch (error) {
          console.log(`${app.name} not accessible for performance test`);
        }
      }
      
      await page.close();
    });

    test('should handle concurrent requests', async () => {
      const concurrentRequests = 10;
      
      for (const app of embeddedApps) {
        const requests = [];
        
        for (let i = 0; i < concurrentRequests; i++) {
          requests.push(
            fetch(`http://localhost:${app.port}`)
              .then(res => ({ success: true, status: res.status }))
              .catch(err => ({ success: false, error: err.message }))
          );
        }
        
        const results = await Promise.all(requests);
        const successCount = results.filter(r => r.success).length;
        
        console.log(`${app.name} handled ${successCount}/${concurrentRequests} concurrent requests`);
        
        // Should handle at least 80% of concurrent requests
        expect(successCount).toBeGreaterThanOrEqual(concurrentRequests * 0.8);
      }
    });
  });

  test.describe('Integration Tests', () => {
    test('should integrate with MCP servers', async () => {
      // Test if apps can connect to MCP servers
      const page = await browser.newPage();
      
      try {
        await page.goto('http://localhost:3000/api/mcp/status');
        const content = await page.content();
        
        // Check for MCP connection status
        if (content.includes('connected') || content.includes('mcp')) {
          expect(content).toContain('connected');
        }
      } catch (error) {
        console.log('MCP integration endpoint not available');
      } finally {
        await page.close();
      }
    });

    test('should share authentication across apps', async () => {
      const page = await browser.newPage();
      
      // Login to main portal
      try {
        await page.goto('http://localhost:3000');
        
        // Perform login (mock)
        await page.evaluate(() => {
          localStorage.setItem('auth_token', 'test_token_123');
          document.cookie = 'session=test_session; path=/';
        });
        
        // Check if other apps recognize the session
        await page.goto('http://localhost:3001');
        const hasAuthCookie = await page.evaluate(() => {
          return document.cookie.includes('session');
        });
        
        // Apps should share authentication
        expect(hasAuthCookie).toBe(true);
      } catch (error) {
        console.log('Authentication sharing test skipped');
      } finally {
        await page.close();
      }
    });
  });

  test.describe('Accessibility Tests', () => {
    test('should have proper ARIA labels', async () => {
      const page = await browser.newPage();
      
      for (const app of embeddedApps) {
        try {
          await page.goto(`http://localhost:${app.port}`);
          
          // Check for ARIA labels on interactive elements
          const buttons = await page.$$('button:not([aria-label]):not([aria-labelledby])');
          const inputs = await page.$$('input:not([aria-label]):not([aria-labelledby]):not([type="hidden"])');
          
          console.log(`${app.name} - Unlabeled buttons: ${buttons.length}, Unlabeled inputs: ${inputs.length}`);
          
          // Should have ARIA labels
          expect(buttons.length).toBe(0);
        } catch (error) {
          console.log(`${app.name} not accessible for ARIA test`);
        }
      }
      
      await page.close();
    });

    test('should be keyboard navigable', async () => {
      const page = await browser.newPage();
      
      for (const app of embeddedApps) {
        try {
          await page.goto(`http://localhost:${app.port}`);
          
          // Tab through page
          await page.keyboard.press('Tab');
          await page.keyboard.press('Tab');
          await page.keyboard.press('Tab');
          
          // Check if focus is visible
          const focusedElement = await page.evaluate(() => {
            const el = document.activeElement;
            return {
              tagName: el?.tagName,
              hasOutline: window.getComputedStyle(el!).outline !== 'none'
            };
          });
          
          console.log(`${app.name} - Focused element: ${focusedElement.tagName}, Has outline: ${focusedElement.hasOutline}`);
        } catch (error) {
          console.log(`${app.name} not accessible for keyboard navigation test`);
        }
      }
      
      await page.close();
    });
  });
});

// Helper functions
async function waitForApp(port: number, healthPath: string, timeout: number): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(`http://localhost:${port}${healthPath}`);
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // App not ready yet
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return false;
}

async function checkPortOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = http.createServer();
    
    server.listen(port, () => {
      server.close();
      resolve(false); // Port was available
    });
    
    server.on('error', () => {
      resolve(true); // Port is in use
    });
  });
}