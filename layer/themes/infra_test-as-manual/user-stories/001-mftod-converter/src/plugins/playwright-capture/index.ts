/**
 * Playwright Capture Plugin
 * Real screenshot capture implementation using Playwright
 */

import { BaseCapturePlugin, CaptureOptions, CaptureResult } from '../../logic/plugin/PluginSystem';
import { path } from '../../../../../../infra_external-log-lib/src';
import { fs } from '../../../../../../infra_external-log-lib/src';
import { getFileAPI, FileType } from '../../../../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


export default class PlaywrightCapturePlugin extends BaseCapturePlugin {
  name = 'playwright-capture';
  version = '1.0.0';
  description = 'Capture screenshots using Playwright for web applications';
  platform = 'web';
  supportedPlatforms = ['web'];

  private playwright: any;
  private browser: any;

  async initialize(): Promise<void> {
    try {
      // Dynamically import playwright to avoid dependency issues
      this.playwright = await import('playwright');
      console.log('Playwright capture plugin initialized');
    } catch (error) {
      console.warn('Playwright not available. Install with: npm install playwright');
    }
  }

  async destroy(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async capture(options: CaptureOptions): Promise<CaptureResult> {
    if (!this.playwright) {
      return {
        success: false,
        error: 'Playwright is not installed. Run: npm install playwright'
      };
    }

    try {
      // Validate options
      if (!options.url) {
        throw new Error('URL is required for web capture');
      }

      // Ensure output directory exists
      const outputDir = path.dirname(options.outputPath);
      if (!fs.existsSync(outputDir)) {
        await fileAPI.createDirectory(outputDir);
      }

      // Launch browser if not already running
      if (!this.browser) {
        const browserType = options.browserName || 'chromium';
        this.browser = await this.playwright[browserType].launch({
          headless: options.headless !== false
        });
      }

      // Create new page
      const context = await this.browser.newContext({
        viewport: options.viewport || { width: 1280, height: 720 },
        deviceScaleFactor: options.deviceScaleFactor || 1,
        isMobile: options.isMobile || false,
        hasTouch: options.hasTouch || false,
        locale: options.locale || 'en-US',
        timezoneId: options.timezoneId || 'America/New_York'
      });

      const page = await context.newPage();

      // Set extra HTTP headers if provided
      if (options.headers) {
        await page.setExtraHTTPHeaders(options.headers);
      }

      // Navigate to URL
      await page.goto(options.url, {
        waitUntil: options.waitUntil || 'networkidle',
        timeout: options.timeout || 30000
      });

      // Wait for specific element if provided
      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, {
          timeout: options.waitTimeout || 5000
        });
      }

      // Execute custom script if provided
      if (options.executeScript) {
        await page.evaluate(options.executeScript);
      }

      // Highlight elements if provided
      if (options.highlightSelectors) {
        await this.highlightElements(page, options.highlightSelectors);
      }

      // Take screenshot
      const screenshotOptions: any = {
        path: options.outputPath,
        fullPage: options.fullPage !== false,
        type: options.format || 'png'
      };

      if (options.clip) {
        screenshotOptions.clip = options.clip;
      }

      if (options.quality && options.format === 'jpeg') {
        screenshotOptions.quality = options.quality;
      }

      await page.screenshot(screenshotOptions);

      // Capture additional metadata
      const metadata = await this.captureMetadata(page, options);

      // Cleanup
      await page.close();
      await context.close();

      return {
        success: true,
        filePath: options.outputPath,
        metadata
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private async highlightElements(page: any, selectors: string[]): Promise<void> {
    await page.evaluate((selectors: string[]) => {
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element: any) => {
          element.style.outline = '3px solid red';
          element.style.outlineOffset = '2px';
        });
      });
    }, selectors);
  }

  private async captureMetadata(page: any, options: CaptureOptions): Promise<any> {
    const metadata: any = {
      url: page.url(),
      title: await page.title(),
      timestamp: new Date().toISOString(),
      viewport: page.viewportSize(),
      platform: 'web',
      browser: options.browserName || 'chromium'
    };

    // Capture console logs if requested
    if (options.captureLogs) {
      const logs: string[] = [];
      page.on('console', (msg: any) => logs.push(`${msg.type()}: ${msg.text()}`));
      metadata.consoleLogs = logs;
    }

    // Capture network requests if requested
    if (options.captureNetwork) {
      const requests: any[] = [];
      page.on('request', (request: any) => {
        requests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers()
        });
      });
      metadata.networkRequests = requests;
    }

    // Capture performance metrics
    if (options.captureMetrics) {
      metadata.metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as any;
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime,
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime
        };
      });
    }

    return metadata;
  }
}

// Extended capture options for Playwright
export interface PlaywrightCaptureOptions extends CaptureOptions {
  url: string;
  browserName?: 'chromium' | 'firefox' | 'webkit';
  headless?: boolean;
  viewport?: { width: number; height: number };
  deviceScaleFactor?: number;
  isMobile?: boolean;
  hasTouch?: boolean;
  locale?: string;
  timezoneId?: string;
  headers?: Record<string, string>;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  timeout?: number;
  waitForSelector?: string;
  waitTimeout?: number;
  executeScript?: string;
  highlightSelectors?: string[];
  fullPage?: boolean;
  format?: 'png' | 'jpeg';
  quality?: number;
  clip?: { x: number; y: number; width: number; height: number };
  captureLogs?: boolean;
  captureNetwork?: boolean;
  captureMetrics?: boolean;
}