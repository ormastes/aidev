import { WebScraper, ScrapingResult, ScrapingOptions, ScrapingJob } from '../../src/web-scraper';
import { Fetcher, FetchResult } from '../../children/fetcher';
import { HTMLParser, DOMNode } from '../../children/parser';
import { CSSSelector } from '../../children/selector';
import { SchemaExtractor, ExtractionResult, ExtractionSchema } from '../../children/extractor';
import { DataExporter, ExportResult } from '../../children/exporter';

/**
 * Test data factories and builders
 */
export class TestDataFactory {
  static createMockFetchResult(overrides?: Partial<FetchResult>): FetchResult {
    return {
      data: '<html><title>Test Page</title></html>',
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'text/html' },
      url: 'https://example.com',
      redirectUrls: [],
      timing: { start: Date.now(), end: Date.now(), duration: 100 },
      cookies: {},
      ...overrides
    };
  }

  static createMockDOMNode(overrides?: Partial<DOMNode>): DOMNode {
    return {
      type: 'element',
      name: 'html',
      children: [
        {
          type: 'element',
          name: 'head',
          children: [
            {
              type: 'element',
              name: 'title',
              children: [
                { type: 'text', text: 'Test Page' }
              ]
            }
          ]
        }
      ],
      ...overrides
    };
  }

  static createMockScrapingResult(overrides?: Partial<ScrapingResult>): ScrapingResult {
    return {
      url: 'https://example.com',
      data: { title: 'Test' },
      metadata: {
        scrapedAt: new Date(),
        duration: 1000,
        fetchResult: this.createMockFetchResult()
      },
      ...overrides
    };
  }

  static createMockExtractionResult(overrides?: Partial<ExtractionResult>): ExtractionResult {
    return {
      data: { title: 'Extracted Title', price: '$99.99' },
      validation: { valid: true, errors: [] },
      metadata: {
        extractedAt: new Date(),
        schemaName: 'test',
        totalRules: 2,
        successfulRules: 2,
        failedRules: 0
      },
      ...overrides
    };
  }

  static createMockExportResult(overrides?: Partial<ExportResult>): ExportResult {
    return {
      success: true,
      destination: 'output.json',
      recordCount: 1,
      duration: 20,
      errors: [],
      ...overrides
    };
  }

  static createMockScrapingOptions(overrides?: Partial<ScrapingOptions>): ScrapingOptions {
    return {
      fetchOptions: { timeout: 5000 },
      cacheOptions: { enabled: true },
      ...overrides
    };
  }

  static createMockExtractionSchema(overrides?: Partial<ExtractionSchema>): ExtractionSchema {
    return {
      name: 'test-schema',
      description: 'Test schema',
      rules: [],
      ...overrides
    };
  }
}

/**
 * Mock service factory for creating mocked instances
 */
export class MockServiceFactory {
  static createMockFetcher(): jest.Mocked<Fetcher> {
    const mock = new Fetcher() as jest.Mocked<Fetcher>;
    mock.fetch = jest.fn();
    mock.clearCache = jest.fn();
    return mock;
  }

  static createMockParser(): jest.Mocked<HTMLParser> {
    const mock = new HTMLParser() as jest.Mocked<HTMLParser>;
    mock.parse = jest.fn();
    return mock;
  }

  static createMockCSSSelector(): jest.Mocked<CSSSelector> {
    const mock = new CSSSelector() as jest.Mocked<CSSSelector>;
    mock.select = jest.fn();
    return mock;
  }

  static createMockExtractor(): jest.Mocked<SchemaExtractor> {
    const mock = new SchemaExtractor() as jest.Mocked<SchemaExtractor>;
    mock.extract = jest.fn();
    mock.addSchema = jest.fn();
    mock.autoDetectSchema = jest.fn();
    return mock;
  }

  static createMockExporter(): jest.Mocked<DataExporter> {
    const mock = new DataExporter() as jest.Mocked<DataExporter>;
    mock.export = jest.fn();
    return mock;
  }
}

/**
 * Test setup helper for WebScraper tests
 */
export class WebScraperTestSetup {
  scraper: WebScraper;
  mockFetcher: jest.Mocked<Fetcher>;
  mockParser: jest.Mocked<HTMLParser>;
  mockCssSelector: jest.Mocked<CSSSelector>;
  mockExtractor: jest.Mocked<SchemaExtractor>;
  mockExporter: jest.Mocked<DataExporter>;

  constructor() {
    this.mockFetcher = MockServiceFactory.createMockFetcher();
    this.mockParser = MockServiceFactory.createMockParser();
    this.mockCssSelector = MockServiceFactory.createMockCSSSelector();
    this.mockExtractor = MockServiceFactory.createMockExtractor();
    this.mockExporter = MockServiceFactory.createMockExporter();
    
    this.scraper = new WebScraper();
    
    // Replace internal instances with mocks
    (this.scraper as any).fetcher = this.mockFetcher;
    (this.scraper as any).parser = this.mockParser;
    (this.scraper as any).cssSelector = this.mockCssSelector;
    (this.scraper as any).extractor = this.mockExtractor;
    (this.scraper as any).exporter = this.mockExporter;
  }

  setupDefaultMocks(): void {
    this.mockFetcher.fetch.mockResolvedValue(TestDataFactory.createMockFetchResult());
    this.mockParser.parse.mockReturnValue(TestDataFactory.createMockDOMNode());
    this.mockCssSelector.select.mockReturnValue([]);
  }

  reset(): void {
    jest.clearAllMocks();
  }
}

/**
 * Assertion helpers for common test scenarios
 */
export class TestAssertions {
  static assertScrapingResultValid(result: ScrapingResult): void {
    expect(result).toBeDefined();
    expect(result.url).toBeTruthy();
    expect(result.metadata).toBeDefined();
    expect(result.metadata.scrapedAt).toBeInstanceOf(Date);
    expect(result.metadata.duration).toBeGreaterThanOrEqual(0);
  }

  static assertFetchCalled(mockFetcher: jest.Mocked<Fetcher>, url: string, times: number = 1): void {
    expect(mockFetcher.fetch).toHaveBeenCalledTimes(times);
    if (times > 0) {
      expect(mockFetcher.fetch).toHaveBeenCalledWith(
        url,
        expect.any(Object)
      );
    }
  }

  static assertEventEmitted(eventSpy: jest.Mock, eventName: string, data?: any): void {
    expect(eventSpy).toHaveBeenCalled();
    if (data) {
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining(data)
      );
    }
  }

  static assertJobStateValid(job: ScrapingJob | undefined, expectedStatus: string): void {
    expect(job).toBeDefined();
    expect(job?.status).toBe(expectedStatus);
    if (expectedStatus === 'running' || expectedStatus === "completed") {
      expect(job?.startedAt).toBeInstanceOf(Date);
    }
    if (expectedStatus === "completed" || expectedStatus === 'failed') {
      expect(job?.completedAt).toBeInstanceOf(Date);
    }
  }
}

/**
 * Wait utilities for async testing
 */
export class TestWaitUtils {
  static async waitForCondition(
    condition: () => boolean,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> {
    const startTime = Date.now();
    while (!condition()) {
      if (Date.now() - startTime > timeout) {
        throw new Error('Timeout waiting for condition');
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }

  static async waitForJobCompletion(
    getJob: () => ScrapingJob | undefined,
    timeout: number = 5000
  ): Promise<ScrapingJob> {
    await this.waitForCondition(
      () => {
        const job = getJob();
        return job?.status === "completed" || job?.status === 'failed';
      },
      timeout
    );
    return getJob()!;
  }
}

/**
 * Test data builders for complex scenarios
 */
export class ScrapingJobBuilder {
  private job: Partial<ScrapingJob> = {};

  withUrl(url: string): this {
    this.job.url = url;
    return this;
  }

  withStatus(status: ScrapingJob['status']): this {
    this.job.status = status;
    return this;
  }

  withPriority(priority: number): this {
    this.job.priority = priority;
    return this;
  }

  withDependencies(dependencies: string[]): this {
    this.job.dependencies = dependencies;
    return this;
  }

  withRetryCount(count: number): this {
    this.job.retryCount = count;
    return this;
  }

  build(): ScrapingJob {
    return {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url: this.job.url || 'https://example.com',
      status: this.job.status || 'pending',
      priority: this.job.priority || 5,
      createdAt: new Date(),
      retryCount: this.job.retryCount || 0,
      maxRetries: 3,
      ...this.job
    } as ScrapingJob;
  }
}

/**
 * Performance testing utilities
 */
export class PerformanceTestUtils {
  static measureExecutionTime<T>(fn: () => T): { result: T; duration: number } {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    return { result, duration };
  }

  static async measureAsyncExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    return { result, duration };
  }

  static assertPerformance(duration: number, maxDuration: number, operation: string = "Operation"): void {
    expect(duration).toBeLessThanOrEqual(maxDuration);
    if (duration > maxDuration * 0.8) {
      console.warn(`${operation} took ${duration}ms, approaching limit of ${maxDuration}ms`);
    }
  }
}

/**
 * Error scenario helpers
 */
export class ErrorScenarios {
  static networkError(): Error {
    return new Error('Network error: ECONNREFUSED');
  }

  static timeoutError(): Error {
    return new Error('Request timeout after 30000ms');
  }

  static parseError(): Error {
    return new Error('Failed to parse HTML: Invalid markup');
  }

  static validationError(): Error {
    return new Error('Schema validation failed: Missing required field');
  }

  static permissionError(): Error {
    return new Error('Permission denied: Cannot access resource');
  }

  static rateLimitError(): Error {
    return new Error('Rate limit exceeded: Too many requests');
  }
}

/**
 * Mock response generators for different scenarios
 */
export class MockResponseGenerator {
  static emptyHtml(): string {
    return '<html><body></body></html>';
  }

  static productPage(): string {
    return `
      <html>
        <head><title>Product Page</title></head>
        <body>
          <h1 class="product-title">Test Product</h1>
          <span class="price">$99.99</span>
          <div class="description">Product description</div>
          <img class="product-image" src="/image1.jpg" />
          <div class="stock-status">In Stock</div>
        </body>
      </html>
    `;
  }

  static newsArticle(): string {
    return `
      <html>
        <head><title>News Article</title></head>
        <body>
          <article>
            <h1 class="headline">Breaking News</h1>
            <div class="byline">By John Doe</div>
            <time datetime="2024-01-01">January 1, 2024</time>
            <div class="article-content">
              <p>Article content paragraph 1</p>
              <p>Article content paragraph 2</p>
            </div>
          </article>
        </body>
      </html>
    `;
  }

  static errorPage(code: number = 404): string {
    return `
      <html>
        <head><title>Error ${code}</title></head>
        <body>
          <h1>Error ${code}</h1>
          <p>Page not found</p>
        </body>
      </html>
    `;
  }
}