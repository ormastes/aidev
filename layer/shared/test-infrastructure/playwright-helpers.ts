/**
 * Playwright Test Helpers
 * Real browser testing - NO MOCKS
 */

import { chromium, Browser, Page, BrowserContext } from '@playwright/test';
import { TestServer } from './server';

export interface TestBrowser {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  cleanup: () => Promise<void>;
}

/**
 * Creates a real browser instance for testing
 */
export async function createTestBrowser(options: {
  headless?: boolean;
  slowMo?: number;
} = {}): Promise<TestBrowser> {
  const browser = await chromium.launch({
    headless: options.headless !== false,
    slowMo: options.slowMo || 0
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  return {
    browser,
    context,
    page,
    cleanup: async () => {
      await page.close();
      await context.close();
      await browser.close();
    }
  };
}

/**
 * Real user login flow
 */
export async function loginUser(
  page: Page,
  serverUrl: string,
  credentials: { username: string; password: string }
): Promise<string> {
  // Navigate to real login page
  await page.goto(`${serverUrl}/login`);
  
  // Fill real form fields
  await page.fill('input[name="username"]', credentials.username);
  await page.fill('input[name="password"]', credentials.password);
  
  // Click real submit button
  await page.click('button[type="submit"]');
  
  // Wait for real navigation
  await page.waitForURL('**/dashboard', { timeout: 5000 });
  
  // Get real token from localStorage
  const token = await page.evaluate(() => {
    return localStorage.getItem('authToken');
  });
  
  return token || '';
}

/**
 * Real GUI selection test
 */
export async function selectGuiOption(
  page: Page,
  optionIndex: number
): Promise<void> {
  // Wait for real options to load
  await page.waitForSelector('.gui-option', { timeout: 5000 });
  
  // Click real option
  await page.click(`.gui-option:nth-child(${optionIndex + 1})`);
  
  // Wait for real selection confirmation
  await page.waitForSelector('.selection-confirmed', { timeout: 5000 });
}

/**
 * Real form submission
 */
export async function submitForm(
  page: Page,
  formData: Record<string, string>
): Promise<void> {
  for (const [field, value] of Object.entries(formData)) {
    const selector = `input[name="${field}"], textarea[name="${field}"], select[name="${field}"]`;
    await page.fill(selector, value);
  }
  
  await page.click('button[type="submit"]');
}

/**
 * Real API request from browser
 */
export async function makeApiRequest(
  page: Page,
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  } = {}
): Promise<any> {
  return await page.evaluate(async ({ url, options }) => {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    
    return {
      status: response.status,
      data: await response.json()
    };
  }, { url, options });
}

/**
 * Real file upload test
 */
export async function uploadFile(
  page: Page,
  selector: string,
  filePath: string
): Promise<void> {
  const fileInput = await page.$(selector);
  if (!fileInput) {
    throw new Error(`File input not found: ${selector}`);
  }
  
  await fileInput.setInputFiles(filePath);
  
  // Wait for real upload to complete
  await page.waitForSelector('.upload-success', { timeout: 10000 });
}

/**
 * Real drag and drop test
 */
export async function dragAndDrop(
  page: Page,
  sourceSelector: string,
  targetSelector: string
): Promise<void> {
  const source = await page.$(sourceSelector);
  const target = await page.$(targetSelector);
  
  if (!source || !target) {
    throw new Error('Source or target element not found');
  }
  
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  
  if (!sourceBox || !targetBox) {
    throw new Error('Could not get element positions');
  }
  
  // Real mouse operations
  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2
  );
  await page.mouse.down();
  
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height / 2
  );
  await page.mouse.up();
}

/**
 * Real screenshot comparison
 */
export async function compareScreenshots(
  page: Page,
  name: string,
  options: {
    fullPage?: boolean;
    clip?: { x: number; y: number; width: number; height: number };
  } = {}
): Promise<Buffer> {
  return await page.screenshot({
    path: `screenshots/${name}.png`,
    fullPage: options.fullPage,
    clip: options.clip
  });
}

/**
 * Real performance metrics
 */
export async function getPerformanceMetrics(page: Page): Promise<{
  loadTime: number;
  domContentLoaded: number;
  firstPaint: number;
  firstContentfulPaint: number;
}> {
  return await page.evaluate(() => {
    const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paintData = performance.getEntriesByType('paint');
    
    const firstPaint = paintData.find(p => p.name === 'first-paint');
    const firstContentfulPaint = paintData.find(p => p.name === 'first-contentful-paint');
    
    return {
      loadTime: perfData.loadEventEnd - perfData.fetchStart,
      domContentLoaded: perfData.domContentLoadedEventEnd - perfData.fetchStart,
      firstPaint: firstPaint ? firstPaint.startTime : 0,
      firstContentfulPaint: firstContentfulPaint ? firstContentfulPaint.startTime : 0
    };
  });
}

/**
 * Real accessibility test
 */
export async function checkAccessibility(page: Page): Promise<{
  violations: any[];
  passes: any[];
}> {
  // Inject axe-core for real accessibility testing
  await page.addScriptTag({
    url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.0/axe.min.js'
  });
  
  return await page.evaluate(async () => {
    // @ts-ignore - axe is injected
    const results = await axe.run();
    return {
      violations: results.violations,
      passes: results.passes
    };
  });
}

/**
 * Real network monitoring
 */
export async function monitorNetworkRequests(
  page: Page,
  callback: (request: any) => void
): Promise<() => void> {
  const handler = (request: any) => {
    callback({
      url: request.url(),
      method: request.method(),
      headers: request.headers(),
      postData: request.postData()
    });
  };
  
  page.on('request', handler);
  
  // Return cleanup function
  return () => {
    page.off('request', handler);
  };
}

/**
 * Real console monitoring
 */
export async function monitorConsole(
  page: Page,
  callback: (message: any) => void
): Promise<() => void> {
  const handler = (message: any) => {
    callback({
      type: message.type(),
      text: message.text(),
      location: message.location()
    });
  };
  
  page.on('console', handler);
  
  // Return cleanup function
  return () => {
    page.off('console', handler);
  };
}