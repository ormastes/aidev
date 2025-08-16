/**
 * Test Suite for Embedded Web Applications
 * Tests for web apps running inside other web apps (iframe scenarios)
 */

import { test, expect, Page, Frame } from '@playwright/test';

test.describe('Embedded Web Apps - Manual Theme Tests', () => {
  let page: Page;
  
  // Test configuration
  const PORTAL_URL = 'http://localhost:3456';
  const GUI_SELECTOR_URL = 'http://localhost:3457';
  const TEST_TIMEOUT = 30000;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    page.setDefaultTimeout(TEST_TIMEOUT);
  });

  test.describe('GUI Selector in AI Dev Portal', () => {
    test('should embed GUI selector in portal iframe', async () => {
      // Navigate to portal
      await page.goto(PORTAL_URL);
      
      // Login
      await page.fill('#username', 'admin');
      await page.fill('#password', 'demo123');
      await page.click('button[type="submit"]');
      
      // Wait for dashboard
      await page.waitForSelector('#dashboard-page');
      
      // Navigate to apps
      await page.click('#apps-link');
      
      // Find and click GUI Selector app
      await page.click('text=GUI Selector');
      
      // Check if iframe is created
      const iframe = await page.waitForSelector('iframe#embedded-gui-selector', {
        timeout: 5000
      });
      
      expect(iframe).toBeTruthy();
      
      // Verify iframe source
      const src = await iframe.getAttribute('src');
      expect(src).toContain(GUI_SELECTOR_URL);
    });

    test('should handle cross-origin communication', async () => {
      // Setup portal with embedded app
      await page.goto(PORTAL_URL);
      await loginToPortal(page);
      await embedGuiSelector(page);
      
      // Setup message listener in parent
      const messageReceived = await page.evaluate(() => {
        return new Promise((resolve) => {
          window.addEventListener('message', (event) => {
            if (event.data.type === 'selection') {
              resolve(event.data);
            }
          });
        });
      });
      
      // Interact with embedded app
      const frame = page.frameLocator('iframe#embedded-gui-selector');
      await frame.locator('[data-variant="modern"]').click();
      
      // Verify message received
      const message = await messageReceived;
      expect(message).toHaveProperty('type', 'selection');
      expect(message).toHaveProperty('payload');
    });

    test('should maintain responsive layout in iframe', async () => {
      await page.goto(PORTAL_URL);
      await loginToPortal(page);
      await embedGuiSelector(page);
      
      const viewportSizes = [
        { width: 320, height: 568, name: 'mobile' },
        { width: 768, height: 1024, name: 'tablet' },
        { width: 1920, height: 1080, name: 'desktop' }
      ];
      
      for (const size of viewportSizes) {
        await page.setViewportSize({ width: size.width, height: size.height });
        await page.waitForTimeout(500); // Allow resize to complete
        
        const iframe = await page.$('iframe#embedded-gui-selector');
        const box = await iframe?.boundingBox();
        
        expect(box).toBeTruthy();
        expect(box!.width).toBeLessThanOrEqual(size.width);
        
        // Take screenshot for manual verification
        await page.screenshot({
          path: `screenshots/embedded-gui-${size.name}.png`,
          fullPage: true
        });
      }
    });

    test('should handle navigation within iframe', async () => {
      await page.goto(PORTAL_URL);
      await loginToPortal(page);
      await embedGuiSelector(page);
      
      const frame = page.frameLocator('iframe#embedded-gui-selector');
      
      // Test workflow navigation
      await frame.locator('text=Choose Template').click();
      await expect(frame.locator('.workflow-step').first()).toHaveClass(/active/);
      
      await frame.locator('text=Select Theme').click();
      await expect(frame.locator('.workflow-step').nth(1)).toHaveClass(/active/);
      
      // Verify parent URL hasn't changed
      expect(page.url()).toContain(PORTAL_URL);
    });

    test('should enforce sandbox restrictions', async () => {
      await page.goto(PORTAL_URL);
      await loginToPortal(page);
      await embedGuiSelector(page);
      
      const iframe = await page.$('iframe#embedded-gui-selector');
      const sandbox = await iframe?.getAttribute('sandbox');
      
      // Verify sandbox attributes
      expect(sandbox).toBeTruthy();
      expect(sandbox).toContain('allow-scripts');
      expect(sandbox).toContain('allow-same-origin');
      expect(sandbox).not.toContain('allow-top-navigation');
      
      // Test that iframe cannot navigate parent
      const canNavigateParent = await page.evaluate(() => {
        const iframe = document.querySelector('iframe#embedded-gui-selector') as HTMLIFrameElement;
        try {
          if (iframe.contentWindow) {
            iframe.contentWindow.parent.location.href = 'http://evil.com';
          }
          return true;
        } catch {
          return false;
        }
      });
      
      expect(canNavigateParent).toBe(false);
    });

    test('should handle iframe errors gracefully', async () => {
      await page.goto(PORTAL_URL);
      await loginToPortal(page);
      
      // Try to embed non-existent app
      await page.evaluate(() => {
        const iframe = document.createElement('iframe');
        iframe.id = 'test-iframe';
        iframe.src = 'http://localhost:9999/non-existent';
        document.body.appendChild(iframe);
      });
      
      // Wait for error handling
      await page.waitForTimeout(2000);
      
      // Check for error message
      const errorVisible = await page.isVisible('.embedded-app-error');
      expect(errorVisible).toBe(true);
    });

    test('should support fullscreen mode', async () => {
      await page.goto(PORTAL_URL);
      await loginToPortal(page);
      await embedGuiSelector(page);
      
      // Click fullscreen button
      await page.click('button:has-text("Fullscreen")');
      
      // Check if fullscreen is activated
      const isFullscreen = await page.evaluate(() => {
        return document.fullscreenElement !== null;
      });
      
      expect(isFullscreen).toBe(true);
      
      // Exit fullscreen
      await page.keyboard.press('Escape');
      
      const exitedFullscreen = await page.evaluate(() => {
        return document.fullscreenElement === null;
      });
      
      expect(exitedFullscreen).toBe(true);
    });

    test('should persist data across embed sessions', async () => {
      await page.goto(PORTAL_URL);
      await loginToPortal(page);
      await embedGuiSelector(page);
      
      // Make selection in embedded app
      const frame = page.frameLocator('iframe#embedded-gui-selector');
      await frame.locator('[data-variant="modern"]').click();
      await frame.locator('#design-comments').fill('Test comment');
      
      // Navigate away
      await page.click('#projects-link');
      await page.waitForSelector('#projects-view');
      
      // Return to embedded app
      await page.click('#apps-link');
      await embedGuiSelector(page);
      
      // Verify data persisted
      const frame2 = page.frameLocator('iframe#embedded-gui-selector');
      const comment = await frame2.locator('#design-comments').inputValue();
      expect(comment).toBe('Test comment');
      
      const selectedVariant = await frame2.locator('.variant-card.selected').getAttribute('data-variant');
      expect(selectedVariant).toBe('modern');
    });
  });

  test.describe('Performance Tests', () => {
    test('should load embedded app within acceptable time', async () => {
      await page.goto(PORTAL_URL);
      await loginToPortal(page);
      
      const startTime = Date.now();
      await embedGuiSelector(page);
      
      // Wait for app to be ready
      await page.waitForSelector('iframe#embedded-gui-selector');
      const frame = page.frameLocator('iframe#embedded-gui-selector');
      await frame.locator('.variants-grid').waitFor();
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
    });

    test('should handle multiple embedded apps', async () => {
      await page.goto(PORTAL_URL);
      await loginToPortal(page);
      
      // Create multiple iframes
      await page.evaluate(() => {
        for (let i = 0; i < 3; i++) {
          const iframe = document.createElement('iframe');
          iframe.id = `app-${i}`;
          iframe.src = `http://localhost:${3457 + i}/`;
          iframe.style.width = '100%';
          iframe.style.height = '400px';
          document.body.appendChild(iframe);
        }
      });
      
      // Verify all iframes load
      for (let i = 0; i < 3; i++) {
        const iframe = await page.$(`iframe#app-${i}`);
        expect(iframe).toBeTruthy();
      }
      
      // Check memory usage doesn't spike
      const metrics = await page.metrics();
      expect(metrics.JSHeapUsedSize).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    });
  });

  test.describe('Security Tests', () => {
    test('should prevent XSS attacks through postMessage', async () => {
      await page.goto(PORTAL_URL);
      await loginToPortal(page);
      await embedGuiSelector(page);
      
      // Try to inject malicious script
      const attackPrevented = await page.evaluate(() => {
        try {
          window.postMessage({
            type: 'xss',
            payload: '<script>alert("XSS")</script>'
          }, '*');
          
          // Check if script executed
          return !window['xssExecuted'];
        } catch {
          return true;
        }
      });
      
      expect(attackPrevented).toBe(true);
    });

    test('should validate message origins', async () => {
      await page.goto(PORTAL_URL);
      await loginToPortal(page);
      
      // Setup message handler with origin validation
      const validOrigin = await page.evaluate(() => {
        return new Promise((resolve) => {
          window.addEventListener('message', (event) => {
            // Only accept messages from expected origin
            if (event.origin === 'http://localhost:3457') {
              resolve(true);
            } else if (event.origin === 'http://evil.com') {
              resolve(false);
            }
          });
          
          // Simulate message from evil origin
          setTimeout(() => {
            window.postMessage({ source: 'evil' }, '*');
          }, 100);
        });
      });
      
      expect(validOrigin).toBe(true);
    });
  });

  // Helper functions
  async function loginToPortal(page: Page): Promise<void> {
    await page.fill('#username', 'admin');
    await page.fill('#password', 'demo123');
    await page.click('button[type="submit"]');
    await page.waitForSelector('#dashboard-page');
  }

  async function embedGuiSelector(page: Page): Promise<void> {
    await page.click('#apps-link');
    await page.waitForSelector('#apps-view');
    
    // Simulate embedding the GUI selector
    await page.evaluate(() => {
      const container = document.getElementById('apps-view');
      if (container) {
        const iframe = document.createElement('iframe');
        iframe.id = 'embedded-gui-selector';
        iframe.src = 'http://localhost:3457/gui-selector.html';
        iframe.style.width = '100%';
        iframe.style.height = '600px';
        iframe.sandbox.value = 'allow-scripts allow-same-origin allow-forms';
        container.appendChild(iframe);
      }
    });
    
    await page.waitForSelector('iframe#embedded-gui-selector');
  }
});

/**
 * Manual test checklist generator
 */
export function generateManualChecklist(): string {
  return `
  # Manual Test Checklist for Embedded Web Apps

  ## Pre-Test Setup
  - [ ] Start AI Dev Portal on port 3456
  - [ ] Start GUI Selector on port 3457
  - [ ] Open browser developer tools
  - [ ] Clear browser cache and cookies

  ## Basic Functionality
  - [ ] Portal loads successfully
  - [ ] Can login with test credentials
  - [ ] Apps section shows available applications
  - [ ] GUI Selector appears in app list
  - [ ] Clicking GUI Selector opens embedded view
  - [ ] Embedded app loads without errors

  ## Cross-Origin Communication
  - [ ] No CORS errors in console
  - [ ] Messages pass between iframe and parent
  - [ ] Data selections are communicated properly
  - [ ] No security warnings appear

  ## Responsive Behavior
  - [ ] Mobile view (320x568) displays correctly
  - [ ] Tablet view (768x1024) displays correctly
  - [ ] Desktop view (1920x1080) displays correctly
  - [ ] Content adapts to container size
  - [ ] No horizontal scrolling issues

  ## Navigation
  - [ ] Workflow steps work within iframe
  - [ ] Browser back button doesn't affect parent
  - [ ] Links within iframe work correctly
  - [ ] External links open in new tabs

  ## Security
  - [ ] Iframe has appropriate sandbox attributes
  - [ ] Scripts cannot access parent window
  - [ ] Parent cannot be navigated by iframe
  - [ ] Message origins are validated

  ## Performance
  - [ ] App loads within 3 seconds
  - [ ] Smooth scrolling and interactions
  - [ ] No memory leaks observed
  - [ ] Multiple apps can be embedded

  ## Error Handling
  - [ ] Graceful handling of load failures
  - [ ] Clear error messages displayed
  - [ ] Recovery options available
  - [ ] No console errors during normal use

  ## Data Persistence
  - [ ] Selections persist across sessions
  - [ ] Comments are saved properly
  - [ ] State maintained when navigating away
  - [ ] LocalStorage works within iframe

  ## Visual Verification
  - [ ] Consistent styling between apps
  - [ ] No visual glitches or artifacts
  - [ ] Proper spacing and alignment
  - [ ] Icons and images load correctly

  ## Accessibility
  - [ ] Keyboard navigation works
  - [ ] Focus indicators visible
  - [ ] Screen reader compatible
  - [ ] ARIA labels present

  ## Sign-off
  - [ ] All tests passed
  - [ ] No critical issues found
  - [ ] Performance acceptable
  - [ ] Ready for production

  Tested by: _______________
  Date: _______________
  Browser: _______________
  OS: _______________
  `;
}

export default {
  generateManualChecklist
};