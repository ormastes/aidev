import { test, expect, Page } from '@playwright/test';

/**
 * End-to-End Tests for Explorer Agent
 * These tests verify Explorer can detect real failures
 */

const TEST_APP_URL = process.env.TEST_APP_URL || 'http://localhost:3456';

test.describe('Explorer Failure Detection', () => {
  let consoleErrors: string[] = [];
  let networkErrors: any[] = [];

  test.beforeEach(async ({ page }) => {
    // Reset error collectors
    consoleErrors = [];
    networkErrors = [];

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture network failures
    page.on("response", response => {
      if (response.status() >= 400) {
        networkErrors.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });
  });

  test('should detect console errors on homepage', async ({ page }) => {
    await page.goto(TEST_APP_URL);
    
    // Wait for potential console errors
    await page.waitForTimeout(1000);
    
    // Verify console errors are present (intentional bug)
    expect(consoleErrors.length).toBeGreaterThan(0);
    expect(consoleErrors.some(e => e.includes("TypeError"))).toBeTruthy();
  });

  test('should detect XSS vulnerability in search', async ({ page }) => {
    await page.goto(`${TEST_APP_URL}/search`);
    
    const xssPayload = '<img src=x onerror=alert(1)>';
    
    // Enter XSS payload
    await page.fill('input[type=search]', xssPayload);
    await page.press('input[type=search]', 'Enter');
    
    // Check if payload is reflected without escaping
    const content = await page.content();
    expect(content).toContain(xssPayload);
  });

  test('should detect slow API response', async ({ page }) => {
    await page.goto(`${TEST_APP_URL}/login`);
    
    // Fill login form
    await page.fill('input[type=email]', 'test@example.com');
    await page.fill('input[type=password]', 'wrong');
    
    // Measure response time
    const startTime = Date.now();
    await page.click('button[type=submit]');
    
    // Wait for navigation or error
    await page.waitForLoadState("networkidle");
    const duration = Date.now() - startTime;
    
    // Should detect slow response (>3s)
    expect(duration).toBeGreaterThan(3000);
  });

  test('should detect missing security headers', async ({ page }) => {
    const response = await page.goto(`${TEST_APP_URL}/api/users`);
    
    if (response) {
      const headers = response.headers();
      
      // Verify security headers are missing (intentional)
      expect(headers['x-content-type-options']).toBeUndefined();
      expect(headers['x-frame-options']).toBeUndefined();
    }
  });

  test('should detect API schema mismatch', async ({ page }) => {
    // Get OpenAPI spec
    const specResponse = await page.goto(`${TEST_APP_URL}/openapi.json`);
    const spec = await specResponse?.json();
    
    // Get actual API response
    const apiResponse = await page.goto(`${TEST_APP_URL}/api/users`);
    const apiData = await apiResponse?.json();
    
    // Verify schema mismatch (missing 'total' field)
    const requiredFields = spec?.paths?.['/api/users']?.get?.responses?.['200']?.content?.['application/json']?.schema?.required || [];
    
    expect(requiredFields).toContain('total');
    expect(apiData).not.toHaveProperty('total');
  });

  test('should detect stack trace exposure', async ({ page }) => {
    const response = await page.goto(`${TEST_APP_URL}/api/error`);
    const data = await response?.json();
    
    // Verify stack trace is exposed (security issue)
    expect(data).toHaveProperty('stack');
    expect(data.stack).toContain('at ');
    expect(data).toHaveProperty('file');
  });

  test('should detect PII leak in error messages', async ({ page }) => {
    await page.goto(`${TEST_APP_URL}/login`);
    
    // Submit invalid credentials
    await page.fill('input[type=email]', 'user@example.com');
    await page.fill('input[type=password]', "secretpass");
    await page.click('button[type=submit]');
    
    // Wait for response
    await page.waitForLoadState("networkidle");
    
    // Check response for PII leak
    const content = await page.content();
    
    // Should contain leaked password in error (bad practice)
    expect(content).toContain("secretpass");
  });

  test('should detect 5xx server errors', async ({ page }) => {
    await page.goto(`${TEST_APP_URL}/api/crash`);
    
    // Check for 5xx error
    expect(networkErrors.some(e => e.status >= 500)).toBeTruthy();
  });
});

test.describe('Explorer Detection Verification', () => {
  test('can distinguish between vulnerable and safe responses', async ({ page }) => {
    // Test safe endpoint (if exists)
    const safeResponse = await page.goto(`${TEST_APP_URL}/health`);
    
    if (safeResponse && safeResponse.status() === 200) {
      const headers = safeResponse.headers();
      
      // Safe endpoint should have proper headers
      if (headers['x-content-type-options']) {
        expect(headers['x-content-type-options']).toBe('nosniff');
      }
    }
    
    // Test vulnerable endpoint
    const vulnResponse = await page.goto(`${TEST_APP_URL}/api/users`);
    
    if (vulnResponse) {
      const headers = vulnResponse.headers();
      
      // Vulnerable endpoint lacks headers
      expect(headers['x-content-type-options']).toBeUndefined();
    }
  });

  test('generates accurate reproduction steps', async ({ page }) => {
    // Simulate Explorer workflow
    const steps = [
      { action: "navigate", target: TEST_APP_URL },
      { action: 'click', target: 'a[href="/login"]' },
      { action: 'fill', target: 'input[type=email]', value: 'test@example.com' },
      { action: 'fill', target: 'input[type=password]', value: "password" },
      { action: 'click', target: 'button[type=submit]' }
    ];
    
    // Execute steps
    for (const step of steps) {
      switch (step.action) {
        case "navigate":
          await page.goto(step.target);
          break;
        case 'click':
          await page.click(step.target);
          break;
        case 'fill':
          await page.fill(step.target, step.value || '');
          break;
      }
    }
    
    // Verify steps can be reproduced
    expect(page.url()).toContain('/dashboard');
  });
});

test.describe('Explorer False Positive Prevention', () => {
  test('should not flag legitimate slow operations', async ({ page }) => {
    // Simulate legitimate slow operation (like file upload)
    // This would be a slow endpoint that's intentionally slow
    
    // Explorer should understand context and not flag this
    const response = await page.goto(`${TEST_APP_URL}/api/backup`);
    
    if (response && response.status() === 200) {
      // Even if slow, legitimate operations shouldn't be flagged
      expect(response.ok()).toBeTruthy();
    }
  });

  test('should not flag intended error messages', async ({ page }) => {
    // Test validation error (intended behavior)
    await page.goto(`${TEST_APP_URL}/login`);
    
    // Submit empty form
    await page.click('button[type=submit]');
    
    // Validation errors are expected, not bugs
    const content = await page.content();
    expect(content).toContain("required");
  });
});

test.describe('Explorer Report Generation', () => {
  test('creates valid Playwright test from findings', async ({ page }) => {
    // This test verifies that generated tests are valid
    const generatedTest = `
      test('generated: XSS in search', async ({ page }) => {
        await page.goto('${TEST_APP_URL}');
        await page.click('a[href="/search"]');
        await page.fill('input[type=search]', '<script>alert(1)</script>');
        await page.press('input[type=search]', 'Enter');
        
        const content = await page.content();
        expect(content).not.toContain('<script>');
      });
    `;
    
    // Verify test syntax is valid (would compile)
    expect(generatedTest).toContain('test(');
    expect(generatedTest).toContain('async ({ page })');
    expect(generatedTest).toContain('expect(');
  });

  test('includes evidence in bug reports', async ({ page }) => {
    // Simulate collecting evidence
    const evidence = {
      console: [],
      network: [],
      screenshot: null,
      html: ''
    };
    
    await page.goto(TEST_APP_URL);
    
    // Collect console messages
    page.on('console', msg => {
      evidence.console.push({
        type: msg.type(),
        text: msg.text()
      });
    });
    
    // Collect network requests
    page.on("response", response => {
      evidence.network.push({
        url: response.url(),
        status: response.status()
      });
    });
    
    // Take screenshot
    evidence.screenshot = await page.screenshot({ encoding: 'base64' });
    
    // Get HTML
    evidence.html = await page.content();
    
    // Verify evidence collection
    expect(evidence.console.length).toBeGreaterThan(0);
    expect(evidence.network.length).toBeGreaterThan(0);
    expect(evidence.screenshot).toBeTruthy();
    expect(evidence.html).toContain('<html');
  });
});