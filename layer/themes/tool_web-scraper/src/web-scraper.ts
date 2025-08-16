/**
 * Main WebScraper Class
 * Orchestrates all modules with queue management, parallel scraping,
 * progress tracking, error recovery, and caching
 */

import EventEmitter from 'events';
import { HTMLParser, DOMNode } from '../children/parser';
import { CSSSelector } from '../children/selector';
import { SchemaExtractor, ExtractionResult, ExtractionSchema, PatternExtractor, StructuredDataExtractor } from '../children/extractor';
import { Fetcher, FetchResult, FetchOptions, RateLimitConfig } from '../children/fetcher';
import { DataExporter, ExportConfig, ExportOptions, ExportResult } from '../children/exporter';
// import { Browser, Page } from 'puppeteer';
type Browser = any;
type Page = any;
import { Browser as PlaywrightBrowser, Page as PlaywrightPage, chromium } from 'playwright';

export interface ScrapingJob {
  id: string;
  url: string;
  schema?: string | ExtractionSchema;
  options?: ScrapingOptions;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'retrying';
  priority: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  retryCount: number;
  maxRetries: number;
  result?: ScrapingResult;
  error?: string;
  progress?: number;
  dependencies?: string[]; // URLs that must be scraped first
}

export interface ScrapingOptions {
  fetchOptions?: FetchOptions;
  parseOptions?: {
    waitForSelector?: string;
    waitTime?: number;
    executeJS?: string | string[];
    screenshots?: boolean;
    screenshotPath?: string;
  };
  extractionOptions?: {
    includeMetadata?: boolean;
    includeStructuredData?: boolean;
    includePatterns?: boolean;
    customSelectors?: Record<string, string>;
    validation?: boolean;
  };
  exportOptions?: {
    formats?: ExportConfig[];
    immediate?: boolean; // Export immediately after scraping
  };
  cacheOptions?: {
    enabled?: boolean;
    ttl?: number; // Time to live in milliseconds
    key?: string; // Custom cache key
  };
  browserOptions?: {
    engine?: 'puppeteer' | 'playwright';
    headless?: boolean;
    viewport?: { width: number; height: number };
    userAgent?: string;
    timeout?: number;
  };
}

export interface ScrapingResult {
  url: string;
  data: Record<string, any>;
  metadata: {
    scrapedAt: Date;
    duration: number;
    fetchResult: FetchResult;
    schemaUsed?: string;
    structuredData?: Record<string, any>[];
    patterns?: Record<string, string[]>;
    screenshots?: string[];
  };
  extraction?: ExtractionResult;
  exports?: ExportResult[];
}

export interface ScrapingProgress {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  runningJobs: number;
  pendingJobs: number;
  currentJob?: ScrapingJob;
  estimatedCompletion?: Date;
  averageJobDuration: number;
}

export interface ScrapingStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalDataExtracted: number;
  totalExports: number;
  averageResponseTime: number;
  cacheHits: number;
  cacheMisses: number;
  robotsBlocked: number;
  rateLimited: number;
}

export class WebScrapingQueue {
  private jobs: Map<string, ScrapingJob> = new Map();
  private pendingJobs: ScrapingJob[] = [];
  private runningJobs: Map<string, ScrapingJob> = new Map();
  private completedJobs: ScrapingJob[] = [];
  private failedJobs: ScrapingJob[] = [];

  addJob(url: string, options?: ScrapingOptions, priority: number = 5): string {
    const id = this.generateJobId();
    const job: ScrapingJob = {
      id,
      url,
      schema: options?.extractionOptions?.validation ? 'auto-detect' : undefined,
      options,
      status: 'pending',
      priority,
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: 3
    };

    this.jobs.set(id, job);
    this.insertByPriority(job);
    return id;
  }

  addBatchJobs(urls: string[], options?: ScrapingOptions, priority: number = 5): string[] {
    return urls.map(url => this.addJob(url, options, priority));
  }

  getNextJob(): ScrapingJob | null {
    // Check for jobs whose dependencies are completed
    for (let i = 0; i < this.pendingJobs.length; i++) {
      const job = this.pendingJobs[i];
      
      if (this.areDependenciesCompleted(job)) {
        this.pendingJobs.splice(i, 1);
        return job;
      }
    }

    return null;
  }

  markJobRunning(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'running';
      job.startedAt = new Date();
      this.runningJobs.set(jobId, job);
    }
  }

  markJobCompleted(jobId: string, result: ScrapingResult): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'completed';
      job.completedAt = new Date();
      job.result = result;
      job.progress = 100;
      
      this.runningJobs.delete(jobId);
      this.completedJobs.push(job);
    }
  }

  markJobFailed(jobId: string, error: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.error = error;
      job.retryCount++;

      if (job.retryCount < job.maxRetries) {
        job.status = 'retrying';
        // Add back to pending with lower priority
        job.priority = Math.max(1, job.priority - 1);
        this.insertByPriority(job);
      } else {
        job.status = 'failed';
        job.completedAt = new Date();
        this.failedJobs.push(job);
      }

      this.runningJobs.delete(jobId);
    }
  }

  updateJobProgress(jobId: string, progress: number): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.progress = progress;
    }
  }

  getJob(jobId: string): ScrapingJob | undefined {
    return this.jobs.get(jobId);
  }

  getProgress(): ScrapingProgress {
    const totalJobs = this.jobs.size;
    const completedJobs = this.completedJobs.length;
    const failedJobs = this.failedJobs.length;
    const runningJobs = this.runningJobs.size;
    const pendingJobs = this.pendingJobs.length;

    // Calculate average duration
    const completedJobsWithDuration = this.completedJobs.filter(j => j.startedAt && j.completedAt);
    const averageJobDuration = completedJobsWithDuration.length > 0 ?
      completedJobsWithDuration.reduce((sum, job) => {
        return sum + (job.completedAt!.getTime() - job.startedAt!.getTime());
      }, 0) / completedJobsWithDuration.length : 0;

    // Estimate completion time
    let estimatedCompletion: Date | undefined;
    if (averageJobDuration > 0 && (pendingJobs + runningJobs) > 0) {
      const remainingTime = averageJobDuration * (pendingJobs + runningJobs);
      estimatedCompletion = new Date(Date.now() + remainingTime);
    }

    return {
      totalJobs,
      completedJobs,
      failedJobs,
      runningJobs,
      pendingJobs,
      currentJob: Array.from(this.runningJobs.values())[0],
      estimatedCompletion,
      averageJobDuration
    };
  }

  clear(): void {
    this.jobs.clear();
    this.pendingJobs = [];
    this.runningJobs.clear();
    this.completedJobs = [];
    this.failedJobs = [];
  }

  getCompletedJobs(): ScrapingJob[] {
    return [...this.completedJobs];
  }

  getFailedJobs(): ScrapingJob[] {
    return [...this.failedJobs];
  }

  private insertByPriority(job: ScrapingJob): void {
    let insertIndex = 0;
    while (insertIndex < this.pendingJobs.length && this.pendingJobs[insertIndex].priority >= job.priority) {
      insertIndex++;
    }
    this.pendingJobs.splice(insertIndex, 0, job);
  }

  private areDependenciesCompleted(job: ScrapingJob): boolean {
    if (!job.dependencies || job.dependencies.length === 0) {
      return true;
    }

    for (const depUrl of job.dependencies) {
      const depJob = Array.from(this.jobs.values()).find(j => j.url === depUrl);
      if (!depJob || depJob.status !== 'completed') {
        return false;
      }
    }

    return true;
  }

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export class WebScrapingCache {
  private cache: Map<string, { data: ScrapingResult; expiresAt: number }> = new Map();
  private defaultTTL: number = 3600000; // 1 hour

  get(key: string): ScrapingResult | null {
    const entry = this.cache.get(key);
    if (entry) {
      if (Date.now() < entry.expiresAt) {
        return entry.data;
      } else {
        this.cache.delete(key);
      }
    }
    return null;
  }

  set(key: string, data: ScrapingResult, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { data, expiresAt });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  generateKey(url: string, options?: ScrapingOptions): string {
    if (options?.cacheOptions?.key) {
      return options.cacheOptions.key;
    }
    
    // Create a hash based on URL and relevant options
    const optionsStr = JSON.stringify({
      schema: options?.extractionOptions,
      fetch: options?.fetchOptions,
      parse: options?.parseOptions
    });
    
    return `${url}_${this.simpleHash(optionsStr)}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
}

export class WebScraper extends EventEmitter {
  private fetcher: Fetcher;
  private parser: HTMLParser;
  private cssSelector: CSSSelector;
  // private xpathSelector: XPathSelector;
  private extractor: SchemaExtractor;
  private exporter: DataExporter;
  private queue: WebScrapingQueue;
  private cache: WebScrapingCache;
  private puppeteerBrowser?: Browser;
  private playwrightBrowser?: PlaywrightBrowser;
  
  private stats: ScrapingStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalDataExtracted: 0,
    totalExports: 0,
    averageResponseTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
    robotsBlocked: 0,
    rateLimited: 0
  };

  private concurrency: number = 5;
  private activeWorkers: number = 0;
  private isRunning: boolean = false;

  constructor(rateLimitConfig?: RateLimitConfig) {
    super();
    
    this.fetcher = new Fetcher(rateLimitConfig);
    this.parser = new HTMLParser();
    this.cssSelector = new CSSSelector();
    // this.xpathSelector = new XPathSelector();
    this.extractor = new SchemaExtractor();
    this.exporter = new DataExporter();
    this.queue = new WebScrapingQueue();
    this.cache = new WebScrapingCache();

    // Setup periodic cache cleanup
    setInterval(() => this.cache.cleanup(), 300000); // Every 5 minutes
  }

  // Single URL scraping
  async scrape(url: string, options?: ScrapingOptions): Promise<ScrapingResult> {
    const startTime = Date.now();
    this.emit('scrapeStart', { url, options });

    try {
      // Check cache first
      const cacheKey = this.cache.generateKey(url, options);
      if (options?.cacheOptions?.enabled !== false) {
        const cached = this.cache.get(cacheKey);
        if (cached) {
          this.stats.cacheHits++;
          this.emit('scrapeComplete', cached);
          return cached;
        }
        this.stats.cacheMisses++;
      }

      // Fetch the page
      let fetchResult: FetchResult;
      let dom: DOMNode;

      if (options?.browserOptions?.engine) {
        const browserResult = await this.scrapeWithBrowser(url, options);
        fetchResult = browserResult.fetchResult;
        dom = browserResult.dom;
      } else {
        fetchResult = await this.fetcher.fetch(url, options?.fetchOptions);
        dom = this.parser.parse(fetchResult.data as string);
      }

      this.stats.totalRequests++;
      this.stats.successfulRequests++;

      // Extract data
      const extractionResult = await this.extractData(dom, url, options);
      
      // Create result
      const result: ScrapingResult = {
        url,
        data: extractionResult.data,
        metadata: {
          scrapedAt: new Date(),
          duration: Date.now() - startTime,
          fetchResult,
          schemaUsed: extractionResult.schemaUsed,
          structuredData: extractionResult.structuredData,
          patterns: extractionResult.patterns,
          screenshots: extractionResult.screenshots
        },
        extraction: extractionResult.extraction
      };

      // Update stats
      this.stats.totalDataExtracted++;
      this.updateAverageResponseTime(result.metadata.duration);

      // Cache result
      if (options?.cacheOptions?.enabled !== false) {
        this.cache.set(cacheKey, result, options?.cacheOptions?.ttl);
      }

      // Export if requested
      if (options?.exportOptions?.immediate && options.exportOptions.formats) {
        result.exports = await this.exportData([result.data], options.exportOptions.formats);
      }

      this.emit('scrapeComplete', result);
      return result;

    } catch (error) {
      this.stats.failedRequests++;
      // const errorResult: ScrapingResult = {
      //   url,
      //   data: {},
      //   metadata: {
      //     scrapedAt: new Date(),
      //     duration: Date.now() - startTime,
      //     fetchResult: {} as FetchResult
      //   }
      // };

      this.emit('scrapeError', { url, error, duration: Date.now() - startTime });
      throw error;
    }
  }

  // Batch scraping with queue management
  async scrapeBatch(urls: string[], options?: ScrapingOptions): Promise<ScrapingResult[]> {
    this.emit('batchStart', { urls: urls.length, options });

    // Add all jobs to queue
    const jobIds = this.queue.addBatchJobs(urls, options);
    
    // Start processing if not already running
    if (!this.isRunning) {
      this.startProcessing();
    }

    // Wait for all jobs to complete
    return new Promise((resolve, reject) => {
      const checkCompletion = () => {
        const progress = this.queue.getProgress();
        
        if (progress.pendingJobs === 0 && progress.runningJobs === 0) {
          this.stopProcessing();
          
          const results = jobIds.map(id => {
            const job = this.queue.getJob(id);
            return job?.result;
          }).filter(r => r !== undefined) as ScrapingResult[];

          this.emit('batchComplete', { results, stats: this.getStats() });
          resolve(results);
        } else {
          setTimeout(checkCompletion, 1000);
        }
      };

      setTimeout(checkCompletion, 100);
    });
  }

  // Start continuous processing
  startProcessing(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.emit('processingStart');

    // Start worker processes
    for (let i = 0; i < this.concurrency; i++) {
      this.processNextJob();
    }
  }

  // Stop processing
  stopProcessing(): void {
    this.isRunning = false;
    this.emit('processingStop');
  }

  // Add job to queue
  addJob(url: string, options?: ScrapingOptions, priority: number = 5): string {
    const jobId = this.queue.addJob(url, options, priority);
    this.emit('jobAdded', { jobId, url, priority });

    if (!this.isRunning) {
      this.startProcessing();
    }

    return jobId;
  }

  // Get job status
  getJob(jobId: string): ScrapingJob | undefined {
    return this.queue.getJob(jobId);
  }

  // Get overall progress
  getProgress(): ScrapingProgress {
    return this.queue.getProgress();
  }

  // Get scraping statistics
  getStats(): ScrapingStats {
    return { ...this.stats };
  }

  // Configure concurrency
  setConcurrency(concurrency: number): void {
    this.concurrency = Math.max(1, concurrency);
  }

  // Add custom extraction schema
  addSchema(schema: ExtractionSchema): void {
    this.extractor.addSchema(schema);
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
    this.fetcher.clearCache();
  }

  // Cleanup resources
  async cleanup(): void {
    this.stopProcessing();
    this.clearCache();

    if (this.puppeteerBrowser) {
      await this.puppeteerBrowser.close();
    }
    if (this.playwrightBrowser) {
      await this.playwrightBrowser.close();
    }
  }

  private async processNextJob(): Promise<void> {
    if (!this.isRunning || this.activeWorkers >= this.concurrency) {
      return;
    }

    const job = this.queue.getNextJob();
    if (!job) {
      // No jobs available, try again later
      setTimeout(() => this.processNextJob(), 1000);
      return;
    }

    this.activeWorkers++;
    this.queue.markJobRunning(job.id);
    this.emit('jobStart', job);

    try {
      const result = await this.scrape(job.url, job.options);
      this.queue.markJobCompleted(job.id, result);
      this.emit('jobComplete', { job, result });
    } catch (error) {
      this.queue.markJobFailed(job.id, String(error));
      this.emit('jobError', { job, error });
    }

    this.activeWorkers--;

    // Process next job
    if (this.isRunning) {
      setImmediate(() => this.processNextJob());
    }
  }

  private async extractData(dom: DOMNode, url: string, options?: ScrapingOptions): Promise<{
    data: Record<string, any>;
    schemaUsed?: string;
    structuredData?: Record<string, any>[];
    patterns?: Record<string, string[]>;
    screenshots?: string[];
    extraction?: ExtractionResult;
  }> {
    const result: any = {
      data: {},
      structuredData: [],
      patterns: {}
    };

    // Extract using schema if provided
    if (options?.extractionOptions) {
      const extractOptions = options.extractionOptions;

      // Auto-detect schema if needed
      let schemaToUse = typeof options.schema === 'string' ? options.schema : undefined;
      if (schemaToUse === 'auto-detect' || (!schemaToUse && extractOptions.validation)) {
        const detected = this.extractor.autoDetectSchema(dom);
        schemaToUse = detected[0]; // Use first detected schema
      }

      // Extract using schema
      if (schemaToUse) {
        result.extraction = this.extractor.extract(dom, schemaToUse);
        result.data = result.extraction.data;
        result.schemaUsed = schemaToUse;
      } else if (typeof options.schema === 'object') {
        // Use custom schema
        this.extractor.addSchema(options.schema);
        result.extraction = this.extractor.extract(dom, options.schema.name);
        result.data = result.extraction.data;
        result.schemaUsed = options.schema.name;
      }

      // Extract custom selectors
      if (extractOptions.customSelectors) {
        for (const [key, selector] of Object.entries(extractOptions.customSelectors)) {
          const elements = this.cssSelector.select(dom, selector);
          if (elements.length > 0) {
            result.data[key] = elements.map(el => this.getTextContent(el));
          }
        }
      }

      // Include structured data
      if (extractOptions.includeStructuredData) {
        result.structuredData = [
          ...StructuredDataExtractor.extractJsonLd(dom),
          ...StructuredDataExtractor.extractMicrodata(dom),
          StructuredDataExtractor.extractOpenGraph(dom),
          StructuredDataExtractor.extractTwitterCard(dom)
        ];
      }

      // Include pattern extraction
      if (extractOptions.includePatterns) {
        const textContent = this.getTextContent(dom);
        result.patterns = PatternExtractor.extractAllPatterns(textContent);
      }
    }

    // Default extraction if no data extracted
    if (Object.keys(result.data).length === 0) {
      result.data = this.extractBasicData(dom);
    }

    return result;
  }

  private async scrapeWithBrowser(url: string, options: ScrapingOptions): Promise<{ fetchResult: FetchResult; dom: DOMNode }> {
    const browserOptions = options.browserOptions!;
    let page: Page | PlaywrightPage;
    let content: string;

    if (browserOptions.engine === 'playwright') {
      if (!this.playwrightBrowser) {
        this.playwrightBrowser = await chromium.launch({ 
          headless: browserOptions.headless !== false 
        });
      }
      
      const pwPage = await this.playwrightBrowser.newPage();
      
      if (browserOptions.viewport) {
        await pwPage.setViewportSize(browserOptions.viewport);
      }
      if (browserOptions.userAgent) {
        await pwPage.setUserAgent(browserOptions.userAgent);
      }

      await pwPage.goto(url, { timeout: browserOptions.timeout || 30000 });

      // Wait for selector if specified
      if (options.parseOptions?.waitForSelector) {
        await pwPage.waitForSelector(options.parseOptions.waitForSelector);
      }

      // Execute custom JavaScript
      if (options.parseOptions?.executeJS) {
        const scripts = Array.isArray(options.parseOptions.executeJS) ? 
          options.parseOptions.executeJS : [options.parseOptions.executeJS];
        
        for (const script of scripts) {
          await pwPage.evaluate(script);
        }
      }

      // Wait additional time if specified
      if (options.parseOptions?.waitTime) {
        await pwPage.waitForTimeout(options.parseOptions.waitTime);
      }

      content = await pwPage.content();
      
      // Take screenshot if requested
      if (options.parseOptions?.screenshots && options.parseOptions?.screenshotPath) {
        await pwPage.screenshot({ path: options.parseOptions.screenshotPath });
      }

      await pwPage.close();
      page = pwPage as any;

    } else {
      // Puppeteer implementation
      const puppeteer = require('puppeteer');
      
      if (!this.puppeteerBrowser) {
        this.puppeteerBrowser = await puppeteer.launch({ 
          headless: browserOptions.headless !== false 
        });
      }

      const pupPage = await this.puppeteerBrowser.newPage();
      
      if (browserOptions.viewport) {
        await pupPage.setViewport(browserOptions.viewport);
      }
      if (browserOptions.userAgent) {
        await pupPage.setUserAgent(browserOptions.userAgent);
      }

      await pupPage.goto(url, { 
        waitUntil: 'networkidle0', 
        timeout: browserOptions.timeout || 30000 
      });

      // Wait for selector if specified
      if (options.parseOptions?.waitForSelector) {
        await pupPage.waitForSelector(options.parseOptions.waitForSelector);
      }

      // Execute custom JavaScript
      if (options.parseOptions?.executeJS) {
        const scripts = Array.isArray(options.parseOptions.executeJS) ? 
          options.parseOptions.executeJS : [options.parseOptions.executeJS];
        
        for (const script of scripts) {
          await pupPage.evaluate(script);
        }
      }

      // Wait additional time if specified
      if (options.parseOptions?.waitTime) {
        await pupPage.waitForTimeout(options.parseOptions.waitTime);
      }

      content = await pupPage.content();
      
      // Take screenshot if requested
      if (options.parseOptions?.screenshots && options.parseOptions?.screenshotPath) {
        await pupPage.screenshot({ path: options.parseOptions.screenshotPath });
      }

      await pupPage.close();
      page = pupPage as any;
    }

    // Create mock FetchResult
    const fetchResult: FetchResult = {
      data: content,
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'text/html' },
      url,
      redirectUrls: [],
      timing: { start: Date.now(), end: Date.now(), duration: 0 },
      cookies: {}
    };

    const dom = this.parser.parse(content);

    return { fetchResult, dom };
  }

  private extractBasicData(dom: DOMNode): Record<string, any> {
    const data: Record<string, any> = {};

    // Extract title
    const titleElements = this.cssSelector.select(dom, 'title');
    if (titleElements.length > 0) {
      data.title = this.getTextContent(titleElements[0]);
    }

    // Extract meta description
    const descriptionElements = this.cssSelector.select(dom, 'meta[name="description"]');
    if (descriptionElements.length > 0) {
      data.description = descriptionElements[0].attributes?.content;
    }

    // Extract headings
    const headings = this.cssSelector.select(dom, 'h1, h2, h3, h4, h5, h6');
    data.headings = headings.map(h => ({
      level: h.name,
      text: this.getTextContent(h)
    }));

    // Extract links
    const links = this.cssSelector.select(dom, 'a[href]');
    data.links = links.map(link => ({
      url: link.attributes?.href,
      text: this.getTextContent(link)
    }));

    // Extract images
    const images = this.cssSelector.select(dom, 'img[src]');
    data.images = images.map(img => ({
      src: img.attributes?.src,
      alt: img.attributes?.alt
    }));

    return data;
  }

  private async exportData(data: any[], formats: ExportConfig[]): Promise<ExportResult[]> {
    const results: ExportResult[] = [];
    
    for (const format of formats) {
      try {
        const result = await this.exporter.export(data, format);
        results.push(result);
        this.stats.totalExports++;
      } catch (error) {
        results.push({
          success: false,
          destination: format.destination,
          recordCount: 0,
          duration: 0,
          errors: [String(error)]
        });
      }
    }

    return results;
  }

  private getTextContent(node: DOMNode): string {
    if (node.type === 'text') {
      return node.text || '';
    }
    
    let text = '';
    if (node.children) {
      for (const child of node.children) {
        text += this.getTextContent(child);
      }
    }
    
    return text.trim();
  }

  private updateAverageResponseTime(duration: number): void {
    this.stats.averageResponseTime = 
      (this.stats.averageResponseTime * (this.stats.successfulRequests - 1) + duration) / 
      this.stats.successfulRequests;
  }
}

export default WebScraper;