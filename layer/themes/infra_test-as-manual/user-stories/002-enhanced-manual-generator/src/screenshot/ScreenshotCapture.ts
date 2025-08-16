/**
 * ScreenshotCapture - Automated screenshot capture with Playwright
 * Captures screenshots during test execution for manual documentation
 */

import { Page, Browser, BrowserContext, chromium, firefox, webkit } from 'playwright';
import { path } from '../../../../../infra_external-log-lib/src';
import * as fs from 'fs/promises';
import { createHash } from 'crypto';
import { getFileAPI, FileType } from '../../../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


export interface ScreenshotOptions {
  fullPage?: boolean;
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  quality?: number;
  type?: 'png' | 'jpeg';
  selector?: string;
  highlight?: string[];
  annotations?: AnnotationOptions[];
  timeout?: number;
  waitForSelector?: string;
  waitForLoadState?: 'load' | 'domcontentloaded' | 'networkidle';
}

export interface AnnotationOptions {
  type: 'box' | 'arrow' | 'text' | 'circle';
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color?: string;
  style?: 'solid' | 'dashed' | 'dotted';
}

export interface CaptureResult {
  id: string;
  path: string;
  timestamp: Date;
  metadata: {
    url?: string;
    title?: string;
    testName?: string;
    stepName?: string;
    viewport?: { width: number; height: number };
    userAgent?: string;
    browser?: string;
  };
  size: number;
  dimensions: { width: number; height: number };
}

export class ScreenshotCapture {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private outputDir: string;
  private browserType: 'chromium' | 'firefox' | 'webkit';
  private captures: Map<string, CaptureResult> = new Map();

  constructor(
    outputDir: string = './screenshots',
    browserType: 'chromium' | 'firefox' | 'webkit' = 'chromium'
  ) {
    this.outputDir = outputDir;
    this.browserType = browserType;
  }

  /**
   * Initialize the browser and context
   */
  async initialize(options?: {
    headless?: boolean;
    viewport?: { width: number; height: number };
    deviceScaleFactor?: number;
    userAgent?: string;
  }): Promise<void> {
    const browserLauncher = {
      chromium,
      firefox,
      webkit
    }[this.browserType];

    this.browser = await browserLauncher.launch({
      headless: options?.headless ?? true
    });

    this.context = await this.browser.newContext({
      viewport: options?.viewport || { width: 1280, height: 720 },
      deviceScaleFactor: options?.deviceScaleFactor || 1,
      userAgent: options?.userAgent
    });

    // Ensure output directory exists
    await fileAPI.createDirectory(this.outputDir);
  }

  /**
   * Capture a screenshot of a page
   */
  async capture(
    page: Page,
    name: string,
    options?: ScreenshotOptions
  ): Promise<CaptureResult> {
    if (!this.context) {
      throw new Error('ScreenshotCapture not initialized. Call initialize() first.');
    }

    // Wait for specific conditions if requested
    if (options?.waitForSelector) {
      await page.waitForSelector(options.waitForSelector, {
        timeout: options.timeout || 30000
      });
    }

    if (options?.waitForLoadState) {
      await page.waitForLoadState(options.waitForLoadState);
    }

    // Apply highlights if specified
    if (options?.highlight && options.highlight.length > 0) {
      await this.applyHighlights(page, options.highlight);
    }

    // Generate unique ID for the screenshot
    const timestamp = new Date();
    const id = this.generateId(name, timestamp);
    const filename = `${id}.${options?.type || 'png'}`;
    const filepath = path.join(this.outputDir, filename);

    // Capture screenshot
    const screenshotOptions: any = {
      path: filepath,
      fullPage: options?.fullPage ?? false,
      type: options?.type || 'png'
    };

    if (options?.clip) {
      screenshotOptions.clip = options.clip;
    }

    if (options?.quality && options.type === 'jpeg') {
      screenshotOptions.quality = options.quality;
    }

    // Capture element if selector is provided
    if (options?.selector) {
      const element = await page.$(options.selector);
      if (element) {
        await element.screenshot(screenshotOptions);
      } else {
        throw new Error(`Element not found: ${options.selector}`);
      }
    } else {
      await page.screenshot(screenshotOptions);
    }

    // Get file stats
    const stats = await fs.stat(filepath);

    // Get page metadata
    const metadata = {
      url: page.url(),
      title: await page.title(),
      viewport: page.viewportSize(),
      userAgent: await page.evaluate(() => navigator.userAgent),
      browser: this.browserType
    };

    // Get image dimensions (simplified - in production, use image library)
    const dimensions = await this.getImageDimensions(filepath);

    const result: CaptureResult = {
      id,
      path: filepath,
      timestamp,
      metadata,
      size: stats.size,
      dimensions
    };

    this.captures.set(id, result);
    return result;
  }

  /**
   * Capture multiple screenshots in sequence
   */
  async captureSequence(
    page: Page,
    steps: Array<{
      name: string;
      action?: () => Promise<void>;
      options?: ScreenshotOptions;
    }>
  ): Promise<CaptureResult[]> {
    const results: CaptureResult[] = [];

    for (const step of steps) {
      if (step.action) {
        await step.action();
      }
      const result = await this.capture(page, step.name, step.options);
      results.push(result);
    }

    return results;
  }

  /**
   * Capture screenshots across multiple viewports
   */
  async captureResponsive(
    url: string,
    name: string,
    viewports: Array<{ width: number; height: number; label: string }>,
    options?: ScreenshotOptions
  ): Promise<CaptureResult[]> {
    const results: CaptureResult[] = [];

    for (const viewport of viewports) {
      const page = await this.context!.newPage();
      await page.setViewportSize(viewport);
      await page.goto(url);

      const screenshotName = `${name}-${viewport.label}`;
      const result = await this.capture(page, screenshotName, options);
      results.push(result);

      await page.close();
    }

    return results;
  }

  /**
   * Create a new page for capturing
   */
  async createPage(): Promise<Page> {
    if (!this.context) {
      throw new Error('ScreenshotCapture not initialized. Call initialize() first.');
    }
    return await this.context.newPage();
  }

  /**
   * Apply visual highlights to elements
   */
  private async applyHighlights(page: Page, selectors: string[]): Promise<void> {
    await page.evaluate((selectors) => {
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element: any) => {
          element.style.outline = '3px solid #ff0000';
          element.style.outlineOffset = '2px';
          element.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
        });
      });
    }, selectors);
  }

  /**
   * Generate unique ID for screenshot
   */
  private async generateId(name: string, timestamp: Date): string {
    const sanitizedName = name.replace(/[^a-zA-Z0-9-_]/g, '_');
    const dateStr = timestamp.toISOString().replace(/[:.]/g, '-');
    const hash = createHash('md5')
      .update(`${name}${timestamp.getTime()}`)
      .digest('hex')
      .substring(0, 8);
    return `${sanitizedName}_${dateStr}_${hash}`;
  }

  /**
   * Get image dimensions (simplified implementation)
   */
  private async getImageDimensions(filepath: string): Promise<{ width: number; height: number }> {
    // In production, use proper image library like sharp or jimp
    // This is a placeholder that returns default dimensions
    return { width: 1280, height: 720 };
  }

  /**
   * Get all captured screenshots
   */
  async getCaptures(): CaptureResult[] {
    return Array.from(this.captures.values());
  }

  /**
   * Get capture by ID
   */
  async getCapture(id: string): CaptureResult | undefined {
    return this.captures.get(id);
  }

  /**
   * Clear all captures
   */
  async clearCaptures(): void {
    this.captures.clear();
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Export captures metadata to JSON
   */
  async exportMetadata(filepath: string): Promise<void> {
    const metadata = Array.from(this.captures.values()).map(capture => ({
      ...capture,
      path: path.relative(process.cwd(), capture.path)
    }));
    
    await fileAPI.createFile(filepath, JSON.stringify(metadata, { type: FileType.TEMPORARY }));
  }
}