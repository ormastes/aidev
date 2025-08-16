/**
 * EmbeddedAppTester - Testing utilities for embedded applications
 */

import { EmbeddedAppManager, EmbeddedAppConfig } from './EmbeddedAppManager';

export class EmbeddedAppTester {
  private manager: EmbeddedAppManager;

  constructor(manager: EmbeddedAppManager) {
    this.manager = manager;
  }

  /**
   * Test cross-origin communication
   */
  public async testCommunication(): Promise<boolean> {
    return new Promise((resolve) => {
      const testId = Math.random().toString(36);
      const timeout = setTimeout(() => resolve(false), 5000);

      this.manager.onMessage('ping-response', (payload: any) => {
        if (payload.id === testId) {
          clearTimeout(timeout);
          resolve(true);
        }
      });

      this.manager.sendMessage('ping', { id: testId });
    });
  }

  /**
   * Test iframe sandbox restrictions
   */
  public testSandboxRestrictions(): { [key: string]: boolean } {
    const results: { [key: string]: boolean } = {};

    if (typeof window === "undefined" || typeof document === "undefined") {
      return results;
    }

    // Test script execution
    try {
      results.scripts = true;
      eval('1 + 1');
    } catch {
      results.scripts = false;
    }

    // Test form submission
    results.forms = document.createElement('form').submit !== undefined;

    // Test popup creation
    try {
      results.popups = window.open !== undefined;
    } catch {
      results.popups = false;
    }

    // Test pointer lock
    results.pointerLock = document.body.requestPointerLock !== undefined;

    // Test same-origin access
    try {
      results.sameOrigin = window.top?.location?.href !== undefined;
    } catch {
      results.sameOrigin = false;
    }

    return results;
  }

  /**
   * Test responsive behavior
   */
  public testResponsiveBehavior(): void {
    const sizes = [
      { width: 320, height: 568 },   // Mobile
      { width: 768, height: 1024 },  // Tablet
      { width: 1920, height: 1080 }  // Desktop
    ];

    sizes.forEach(size => {
      this.manager.sendMessage('test-resize', size);
    });
  }

  /**
   * Test event propagation
   */
  public testEventPropagation(): void {
    if (typeof document === "undefined") {
      return;
    }

    const events = ['click', 'keydown', 'scroll', 'resize'];
    
    events.forEach(eventType => {
      document.addEventListener(eventType, (e) => {
        this.manager.sendMessage('event-propagation', {
          type: eventType,
          timestamp: Date.now(),
          propagated: !e.defaultPrevented
        });
      });
    });
  }
}

/**
 * Manual test procedures for embedded apps
 */
export class ManualTestProcedures {
  /**
   * GUI Selector embedded in AI Dev Portal test procedure
   */
  static guiSelectorInPortal(): string {
    return `
    Manual Test Procedure: GUI Selector in AI Dev Portal
    =====================================================
    
    Prerequisites:
    - AI Dev Portal running on port 3456
    - GUI Selector running on port 3457
    
    Test Steps:
    
    1. Initial Load Test:
       a. Open AI Dev Portal (http://localhost:3456)
       b. Login with admin credentials
       c. Navigate to Applications section
       d. Verify GUI Selector appears in app list
       e. Click on GUI Selector app
       f. Verify embedded view loads correctly
    
    2. Cross-Origin Communication Test:
       a. In embedded GUI Selector, select a design variant
       b. Verify selection is communicated to parent portal
       c. Check browser console for any CORS errors
       d. Verify no security warnings appear
    
    3. Responsive Behavior Test:
       a. Resize browser window to mobile size (320x568)
       b. Verify GUI Selector adapts to container size
       c. Resize to tablet size (768x1024)
       d. Verify layout adjusts appropriately
       e. Resize to desktop size (1920x1080)
       f. Verify full features are visible
    
    4. Navigation Test:
       a. Use GUI Selector workflow steps
       b. Verify navigation works within iframe
       c. Test browser back/forward buttons
       d. Verify they don't affect parent portal
    
    5. Data Persistence Test:
       a. Make selections in GUI Selector
       b. Navigate away from the app
       c. Return to GUI Selector
       d. Verify selections are preserved
    
    6. Security Sandbox Test:
       a. Open browser developer tools
       b. Check iframe sandbox attributes
       c. Verify appropriate restrictions are in place
       d. Test that scripts can't access parent window
    
    7. Event Handling Test:
       a. Click buttons in GUI Selector
       b. Verify clicks don't bubble to parent
       c. Use keyboard navigation
       d. Verify focus remains in iframe
    
    8. Error Handling Test:
       a. Stop GUI Selector server
       b. Verify portal shows appropriate error
       c. Restart GUI Selector server
       d. Verify reconnection works
    
    Expected Results:
    - All interactions work smoothly
    - No security violations
    - Proper isolation between apps
    - Responsive behavior at all sizes
    - Clear error messages when issues occur
    
    Pass Criteria:
    - [ ] All test steps complete successfully
    - [ ] No console errors during testing
    - [ ] Performance remains acceptable
    - [ ] User experience is seamless
    `;
  }

  /**
   * Generate automated test for embedded app
   */
  static generateAutomatedTest(config: EmbeddedAppConfig): string {
    return `
import { test, expect } from '@playwright/test';
import { EmbeddedAppManager, EmbeddedAppTester } from '../children/EmbeddedAppManager';

test.describe('Embedded App: ${config.appName}', () => {
  let page;
  
  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('${config.parentUrl}');
  });

  test('should load embedded app in iframe', async () => {
    // Wait for iframe to load
    const iframe = await page.waitForSelector('iframe#${config.iframeId || 'embedded-app'}');
    expect(iframe).toBeTruthy();
    
    // Verify iframe source
    const src = await iframe.getAttribute('src');
    expect(src).toContain('${config.embeddedUrl}');
  });

  test('should handle cross-origin messages', async () => {
    // Setup message listener
    await page.evaluate(() => {
      window.messageReceived = false;
      window.addEventListener('message', () => {
        window.messageReceived = true;
      });
    });

    // Send message from iframe
    const iframe = await page.frameLocator('iframe#${config.iframeId || 'embedded-app'}');
    await iframe.evaluate(() => {
      window.parent.postMessage({ type: 'test', payload: 'hello' }, '*');
    });

    // Verify message received
    await page.waitForFunction(() => window.messageReceived);
    const received = await page.evaluate(() => window.messageReceived);
    expect(received).toBe(true);
  });

  test('should maintain sandbox security', async () => {
    const iframe = await page.$('iframe#${config.iframeId || 'embedded-app'}');
    const sandbox = await iframe.getAttribute('sandbox');
    
    // Verify sandbox attributes
    ${config.sandboxAttributes?.map(attr => 
      `expect(sandbox).toContain('${attr}');`
    ).join('\n    ') || '// No sandbox attributes specified'}
  });

  test('should be responsive to container size', async () => {
    const viewportSizes = [
      { width: 320, height: 568 },
      { width: 768, height: 1024 },
      { width: 1920, height: 1080 }
    ];

    for (const size of viewportSizes) {
      await page.setViewportSize(size);
      await page.waitForTimeout(500); // Allow for resize
      
      const iframe = await page.$('iframe#${config.iframeId || 'embedded-app'}');
      const boundingBox = await iframe.boundingBox();
      
      // Verify iframe adapts to viewport
      expect(boundingBox.width).toBeLessThanOrEqual(size.width);
      expect(boundingBox.height).toBeLessThanOrEqual(size.height);
    }
  });
});
    `;
  }
}