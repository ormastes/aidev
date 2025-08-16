import { WebScraper, WebScrapingQueue, WebScrapingCache, ScrapingOptions, ScrapingResult } from '../../src/web-scraper';
import { Fetcher, FetchResult } from '../../children/fetcher';
import { HTMLParser, DOMNode } from '../../children/parser';
import { CSSSelector } from '../../children/selector';
import { SchemaExtractor, ExtractionResult, ExtractionSchema } from '../../children/extractor';
import { DataExporter, ExportResult } from '../../children/exporter';

// Mock all dependencies
jest.mock('../../children/fetcher');
jest.mock('../../children/parser');
jest.mock('../../children/selector');
jest.mock('../../children/extractor');
jest.mock('../../children/exporter');
jest.mock("puppeteer");
jest.mock("playwright");

describe("WebScrapingQueue", () => {
  let queue: WebScrapingQueue;

  beforeEach(() => {
    queue = new WebScrapingQueue();
  });

  describe('addJob', () => {
    it('should add a new job to the queue', () => {
      const jobId = queue.addJob('https://example.com');
      
      expect(jobId).toBeTruthy();
      expect(queue.getJob(jobId)).toBeDefined();
      expect(queue.getJob(jobId)?.url).toBe('https://example.com');
      expect(queue.getJob(jobId)?.status).toBe('pending');
    });

    it('should add job with custom options and priority', () => {
      const options: ScrapingOptions = {
        fetchOptions: { timeout: 5000 },
        cacheOptions: { enabled: true }
      };
      const jobId = queue.addJob('https://example.com', options, 10);
      
      const job = queue.getJob(jobId);
      expect(job?.options).toEqual(options);
      expect(job?.priority).toBe(10);
    });

    it('should initialize job with correct defaults', () => {
      const jobId = queue.addJob('https://example.com');
      const job = queue.getJob(jobId);
      
      expect(job?.retryCount).toBe(0);
      expect(job?.maxRetries).toBe(3);
      expect(job?.createdAt).toBeInstanceOf(Date);
    });
  });

  describe("addBatchJobs", () => {
    it('should add multiple jobs at once', () => {
      const urls = ['https://example1.com', 'https://example2.com', 'https://example3.com'];
      const jobIds = queue.addBatchJobs(urls);
      
      expect(jobIds).toHaveLength(3);
      jobIds.forEach((id, index) => {
        expect(queue.getJob(id)?.url).toBe(urls[index]);
      });
    });
  });

  describe("getNextJob", () => {
    it('should return highest priority job', () => {
      queue.addJob('https://low.com', undefined, 1);
      queue.addJob('https://high.com', undefined, 10);
      queue.addJob('https://medium.com', undefined, 5);
      
      const nextJob = queue.getNextJob();
      expect(nextJob?.url).toBe('https://high.com');
    });

    it('should respect job dependencies', () => {
      const job1Id = queue.addJob('https://dependency.com');
      queue.getJob(job1Id);
      
      const job2Id = queue.addJob('https://dependent.com');
      const job2 = queue.getJob(job2Id);
      if (job2) {
        job2.dependencies = ['https://dependency.com'];
      }
      
      // Job2 should not be available until job1 is completed
      let nextJob = queue.getNextJob();
      expect(nextJob?.url).toBe('https://dependency.com');
      
      // Mark job1 as completed
      queue.markJobCompleted(job1Id, {} as ScrapingResult);
      
      // Now job2 should be available
      nextJob = queue.getNextJob();
      expect(nextJob?.url).toBe('https://dependent.com');
    });

    it('should return null when no jobs available', () => {
      expect(queue.getNextJob()).toBeNull();
    });
  });

  describe('job state management', () => {
    it('should mark job as running', () => {
      const jobId = queue.addJob('https://example.com');
      queue.markJobRunning(jobId);
      
      const job = queue.getJob(jobId);
      expect(job?.status).toBe('running');
      expect(job?.startedAt).toBeInstanceOf(Date);
    });

    it('should mark job as completed', () => {
      const jobId = queue.addJob('https://example.com');
      const result: ScrapingResult = {
        url: 'https://example.com',
        data: { title: 'Test' },
        metadata: {
          scrapedAt: new Date(),
          duration: 1000,
          fetchResult: {} as FetchResult
        }
      };
      
      queue.markJobCompleted(jobId, result);
      
      const job = queue.getJob(jobId);
      expect(job?.status).toBe("completed");
      expect(job?.result).toEqual(result);
      expect(job?.progress).toBe(100);
      expect(job?.completedAt).toBeInstanceOf(Date);
    });

    it('should mark job as failed and handle retries', () => {
      const jobId = queue.addJob('https://example.com');
      
      // First failure - should retry
      queue.markJobFailed(jobId, 'Network error');
      let job = queue.getJob(jobId);
      expect(job?.status).toBe("retrying");
      expect(job?.retryCount).toBe(1);
      expect(job?.error).toBe('Network error');
      
      // Second failure
      queue.markJobFailed(jobId, 'Network error');
      job = queue.getJob(jobId);
      expect(job?.status).toBe("retrying");
      expect(job?.retryCount).toBe(2);
      
      // Third failure - max retries reached
      queue.markJobFailed(jobId, 'Network error');
      job = queue.getJob(jobId);
      expect(job?.status).toBe('failed');
      expect(job?.retryCount).toBe(3);
    });

    it('should update job progress', () => {
      const jobId = queue.addJob('https://example.com');
      
      queue.updateJobProgress(jobId, 50);
      expect(queue.getJob(jobId)?.progress).toBe(50);
      
      queue.updateJobProgress(jobId, 75);
      expect(queue.getJob(jobId)?.progress).toBe(75);
    });
  });

  describe("getProgress", () => {
    it('should return correct progress statistics', () => {
      // Add some jobs
      const job1 = queue.addJob('https://example1.com');
      const job2 = queue.addJob('https://example2.com');
      const job3 = queue.addJob('https://example3.com');
      queue.addJob('https://example4.com');
      
      // Process some jobs
      queue.getNextJob(); // Remove job1 from pending
      queue.markJobRunning(job1);
      
      queue.getNextJob(); // Remove job2 from pending
      queue.markJobCompleted(job2, {} as ScrapingResult);
      
      queue.getNextJob(); // Remove job3 from pending
      queue.markJobFailed(job3, 'Error');
      queue.markJobFailed(job3, 'Error');
      queue.markJobFailed(job3, 'Error'); // Max retries
      
      const progress = queue.getProgress();
      
      expect(progress.totalJobs).toBe(4);
      expect(progress.completedJobs).toBe(1);
      expect(progress.failedJobs).toBe(1);
      expect(progress.runningJobs).toBe(1);
      expect(progress.pendingJobs).toBe(1);
    });

    it('should calculate average job duration', () => {
      const job1 = queue.addJob('https://example1.com');
      const job2 = queue.addJob('https://example2.com');
      
      // Simulate job execution with known durations
      queue.markJobRunning(job1);
      const job1Data = queue.getJob(job1);
      if (job1Data && job1Data.startedAt) {
        job1Data.startedAt = new Date(Date.now() - 2000); // Started 2 seconds ago
      }
      queue.markJobCompleted(job1, {} as ScrapingResult);
      
      queue.markJobRunning(job2);
      const job2Data = queue.getJob(job2);
      if (job2Data && job2Data.startedAt) {
        job2Data.startedAt = new Date(Date.now() - 3000); // Started 3 seconds ago
      }
      queue.markJobCompleted(job2, {} as ScrapingResult);
      
      const progress = queue.getProgress();
      expect(progress.averageJobDuration).toBeGreaterThan(0);
    });
  });

  describe('utility methods', () => {
    it('should clear all jobs', () => {
      queue.addJob('https://example1.com');
      queue.addJob('https://example2.com');
      
      queue.clear();
      
      const progress = queue.getProgress();
      expect(progress.totalJobs).toBe(0);
      expect(progress.pendingJobs).toBe(0);
    });

    it('should get completed jobs', () => {
      const job1 = queue.addJob('https://example1.com');
      const job2 = queue.addJob('https://example2.com');
      
      queue.markJobCompleted(job1, {} as ScrapingResult);
      queue.markJobCompleted(job2, {} as ScrapingResult);
      
      const completedJobs = queue.getCompletedJobs();
      expect(completedJobs).toHaveLength(2);
      expect(completedJobs.every(j => j.status === "completed")).toBe(true);
    });

    it('should get failed jobs', () => {
      const job1 = queue.addJob('https://example1.com');
      const job2 = queue.addJob('https://example2.com');
      
      // Max out retries
      for (let i = 0; i < 3; i++) {
        queue.markJobFailed(job1, 'Error');
        queue.markJobFailed(job2, 'Error');
      }
      
      const failedJobs = queue.getFailedJobs();
      expect(failedJobs).toHaveLength(2);
      expect(failedJobs.every(j => j.status === 'failed')).toBe(true);
    });
  });
});

describe("WebScrapingCache", () => {
  let cache: WebScrapingCache;

  beforeEach(() => {
    cache = new WebScrapingCache();
  });

  describe('get and set', () => {
    it('should store and retrieve data', () => {
      const data: ScrapingResult = {
        url: 'https://example.com',
        data: { title: 'Test' },
        metadata: {
          scrapedAt: new Date(),
          duration: 1000,
          fetchResult: {} as FetchResult
        }
      };
      
      cache.set('test-key', data);
      const retrieved = cache.get('test-key');
      
      expect(retrieved).toEqual(data);
    });

    it('should return null for non-existent keys', () => {
      expect(cache.get('non-existent')).toBeNull();
    });

    it('should respect TTL', () => {
      const data: ScrapingResult = {
        url: 'https://example.com',
        data: {},
        metadata: {
          scrapedAt: new Date(),
          duration: 1000,
          fetchResult: {} as FetchResult
        }
      };
      
      // Set with 100ms TTL
      cache.set('test-key', data, 100);
      
      // Should exist immediately
      expect(cache.get('test-key')).toEqual(data);
      
      // Wait for expiration
      jest.advanceTimersByTime(150);
      
      // Should be expired
      expect(cache.get('test-key')).toBeNull();
    });
  });

  describe('delete and clear', () => {
    it('should delete specific key', () => {
      const data: ScrapingResult = {
        url: 'https://example.com',
        data: {},
        metadata: {
          scrapedAt: new Date(),
          duration: 1000,
          fetchResult: {} as FetchResult
        }
      };
      
      cache.set('test-key', data);
      cache.delete('test-key');
      
      expect(cache.get('test-key')).toBeNull();
    });

    it('should clear all entries', () => {
      const data: ScrapingResult = {
        url: 'https://example.com',
        data: {},
        metadata: {
          scrapedAt: new Date(),
          duration: 1000,
          fetchResult: {} as FetchResult
        }
      };
      
      cache.set('key1', data);
      cache.set('key2', data);
      cache.set('key3', data);
      
      expect(cache.size()).toBe(3);
      
      cache.clear();
      
      expect(cache.size()).toBe(0);
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', () => {
      const data: ScrapingResult = {
        url: 'https://example.com',
        data: {},
        metadata: {
          scrapedAt: new Date(),
          duration: 1000,
          fetchResult: {} as FetchResult
        }
      };
      
      // Set entries with different TTLs
      cache.set('short', data, 100);
      cache.set('long', data, 10000);
      
      expect(cache.size()).toBe(2);
      
      // Advance time past short TTL
      jest.advanceTimersByTime(150);
      
      // Run cleanup
      cache.cleanup();
      
      expect(cache.size()).toBe(1);
      expect(cache.get('short')).toBeNull();
      expect(cache.get('long')).toBeTruthy();
    });
  });

  describe("generateKey", () => {
    it('should use custom key if provided', () => {
      const options: ScrapingOptions = {
        cacheOptions: {
          key: 'custom-key'
        }
      };
      
      const key = cache.generateKey('https://example.com', options);
      expect(key).toBe('custom-key');
    });

    it('should generate key based on URL and options', () => {
      const options1: ScrapingOptions = {
        fetchOptions: { timeout: 5000 }
      };
      
      const options2: ScrapingOptions = {
        fetchOptions: { timeout: 10000 }
      };
      
      const key1 = cache.generateKey('https://example.com', options1);
      const key2 = cache.generateKey('https://example.com', options2);
      const key3 = cache.generateKey('https://different.com', options1);
      
      // Same URL with different options should have different keys
      expect(key1).not.toBe(key2);
      
      // Different URLs should have different keys
      expect(key1).not.toBe(key3);
    });

    it('should generate consistent keys for same inputs', () => {
      const options: ScrapingOptions = {
        fetchOptions: { timeout: 5000 }
      };
      
      const key1 = cache.generateKey('https://example.com', options);
      const key2 = cache.generateKey('https://example.com', options);
      
      expect(key1).toBe(key2);
    });
  });
});

describe("WebScraper", () => {
  let scraper: WebScraper;
  let mockFetcher: jest.Mocked<Fetcher>;
  let mockParser: jest.Mocked<HTMLParser>;
  let mockCssSelector: jest.Mocked<CSSSelector>;
  let mockExtractor: jest.Mocked<SchemaExtractor>;
  let mockExporter: jest.Mocked<DataExporter>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Create mocked instances
    mockFetcher = new Fetcher() as jest.Mocked<Fetcher>;
    mockParser = new HTMLParser() as jest.Mocked<HTMLParser>;
    mockCssSelector = new CSSSelector() as jest.Mocked<CSSSelector>;
    mockExtractor = new SchemaExtractor() as jest.Mocked<SchemaExtractor>;
    mockExporter = new DataExporter() as jest.Mocked<DataExporter>;
    
    scraper = new WebScraper();
    
    // Replace internal instances with mocks
    (scraper as any).fetcher = mockFetcher;
    (scraper as any).parser = mockParser;
    (scraper as any).cssSelector = mockCssSelector;
    (scraper as any).extractor = mockExtractor;
    (scraper as any).exporter = mockExporter;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("constructor", () => {
    it('should initialize with default values', () => {
      const newScraper = new WebScraper();
      
      expect(newScraper).toBeInstanceOf(WebScraper);
      expect((newScraper as any).concurrency).toBe(5);
      expect((newScraper as any).activeWorkers).toBe(0);
      expect((newScraper as any).isRunning).toBe(false);
    });

    it('should accept rate limit configuration', () => {
      const rateLimitConfig = {
        requestsPerSecond: 2,
        requestsPerMinute: 100,
        requestsPerHour: 6000,
        delayBetweenRequests: 500,
        respectRobotsTxt: true
      };
      
      const newScraper = new WebScraper(rateLimitConfig);
      expect(newScraper).toBeInstanceOf(WebScraper);
    });
  });

  describe('scrape', () => {
    const mockDom: DOMNode = {
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
      ]
    };

    const mockFetchResult: FetchResult = {
      data: '<html><title>Test Page</title></html>',
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'text/html' },
      url: 'https://example.com',
      redirectUrls: [],
      timing: { start: Date.now(), end: Date.now(), duration: 100 },
      cookies: {}
    };

    beforeEach(() => {
      mockFetcher.fetch.mockResolvedValue(mockFetchResult);
      mockParser.parse.mockReturnValue(mockDom);
      mockCssSelector.select.mockReturnValue([]);
    });

    it('should scrape a URL successfully', async () => {
      const result = await scraper.scrape('https://example.com');
      
      expect(result.url).toBe('https://example.com');
      expect(result.metadata.fetchResult).toEqual(mockFetchResult);
      expect(result.metadata.scrapedAt).toBeInstanceOf(Date);
      expect(result.metadata.duration).toBeGreaterThanOrEqual(0);
    });

    it('should use cache when enabled', async () => {
      const options: ScrapingOptions = {
        cacheOptions: { enabled: true }
      };
      
      // First request
      const result1 = await scraper.scrape('https://example.com', options);
      expect(mockFetcher.fetch).toHaveBeenCalledTimes(1);
      
      // Second request should use cache
      const result2 = await scraper.scrape('https://example.com', options);
      expect(mockFetcher.fetch).toHaveBeenCalledTimes(1); // Still only called once
      expect(result2).toEqual(result1);
    });

    it('should skip cache when disabled', async () => {
      const options: ScrapingOptions = {
        cacheOptions: { enabled: false }
      };
      
      await scraper.scrape('https://example.com', options);
      await scraper.scrape('https://example.com', options);
      
      expect(mockFetcher.fetch).toHaveBeenCalledTimes(2);
    });

    it('should emit events during scraping', async () => {
      const startSpy = jest.fn();
      const completeSpy = jest.fn();
      
      scraper.on("scrapeStart", startSpy);
      scraper.on("scrapeComplete", completeSpy);
      
      await scraper.scrape('https://example.com');
      
      expect(startSpy).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'https://example.com' })
      );
      expect(completeSpy).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'https://example.com' })
      );
    });

    it('should handle scraping errors', async () => {
      const error = new Error('Network error');
      mockFetcher.fetch.mockRejectedValue(error);
      
      const errorSpy = jest.fn();
      scraper.on("scrapeError", errorSpy);
      
      await expect(scraper.scrape('https://example.com')).rejects.toThrow('Network error');
      
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://example.com',
          error
        })
      );
    });

    it('should extract data with custom schema', async () => {
      const mockExtractionResult: ExtractionResult = {
        data: { title: 'Extracted Title', price: '$99.99' },
        validation: { valid: true, errors: [] },
        metadata: { extractedAt: new Date(), schemaName: 'test', totalRules: 2, successfulRules: 2, failedRules: 0 }
      };
      
      mockExtractor.extract.mockReturnValue(mockExtractionResult);
      
      const options: ScrapingOptions = {
        extractionOptions: {
          validation: true
        }
      };
      (options as any).schema = 'product-schema';
      
      const result = await scraper.scrape('https://example.com', options);
      
      expect(result.data).toEqual(mockExtractionResult.data);
      expect(result.metadata.schemaUsed).toBe('product-schema');
    });

    it('should export data when immediate export is requested', async () => {
      const mockExportResult: ExportResult = {
        success: true,
        destination: 'output.json',
        recordCount: 1,
        duration: 20,
        errors: []
      };
      
      mockExporter.export.mockResolvedValue(mockExportResult);
      
      const options: ScrapingOptions = {
        exportOptions: {
          immediate: true,
          formats: [{ format: 'json', destination: 'output.json' }]
        }
      };
      
      const result = await scraper.scrape('https://example.com', options);
      
      expect(mockExporter.export).toHaveBeenCalled();
      expect(result.exports).toEqual([mockExportResult]);
    });
  });

  describe("scrapeBatch", () => {
    beforeEach(() => {
      const mockFetchResult: FetchResult = {
        data: '<html></html>',
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'text/html' },
        url: 'https://example.com',
        redirectUrls: [],
        timing: { start: Date.now(), end: Date.now(), duration: 100 },
        cookies: {}
      };
      
      mockFetcher.fetch.mockResolvedValue(mockFetchResult);
      mockParser.parse.mockReturnValue({ type: 'element', name: 'html' });
      mockCssSelector.select.mockReturnValue([]);
    });

    it('should scrape multiple URLs', async () => {
      const urls = ['https://example1.com', 'https://example2.com', 'https://example3.com'];
      
      // Mock immediate processing
      jest.spyOn(scraper as any, "processNextJob").mockImplementation(async function(this: any) {
        const job = this.queue.getNextJob();
        if (job) {
          this.queue.markJobRunning(job.id);
          const result: ScrapingResult = {
            url: job.url,
            data: {},
            metadata: {
              scrapedAt: new Date(),
              duration: 100,
              fetchResult: {} as FetchResult
            }
          };
          this.queue.markJobCompleted(job.id, result);
        }
      });
      
      const results = await scraper.scrapeBatch(urls);
      
      expect(results).toHaveLength(3);
      expect(results.map(r => r.url)).toEqual(urls);
    });

    it('should emit batch events', async () => {
      const batchStartSpy = jest.fn();
      const batchCompleteSpy = jest.fn();
      
      scraper.on("batchStart", batchStartSpy);
      scraper.on("batchComplete", batchCompleteSpy);
      
      // Mock immediate processing
      jest.spyOn(scraper as any, "processNextJob").mockImplementation(async function(this: any) {
        const job = this.queue.getNextJob();
        if (job) {
          this.queue.markJobRunning(job.id);
          this.queue.markJobCompleted(job.id, {} as ScrapingResult);
        }
      });
      
      await scraper.scrapeBatch(['https://example.com']);
      
      expect(batchStartSpy).toHaveBeenCalled();
      expect(batchCompleteSpy).toHaveBeenCalled();
    });
  });

  describe('job management', () => {
    it('should add job to queue', () => {
      const jobId = scraper.addJob('https://example.com', undefined, 5);
      
      expect(jobId).toBeTruthy();
      expect(scraper.getJob(jobId)).toBeDefined();
      expect(scraper.getJob(jobId)?.url).toBe('https://example.com');
    });

    it('should get job status', () => {
      const jobId = scraper.addJob('https://example.com');
      const job = scraper.getJob(jobId);
      
      expect(job).toBeDefined();
      expect(job?.status).toBe('pending');
    });

    it('should get overall progress', () => {
      scraper.addJob('https://example1.com');
      scraper.addJob('https://example2.com');
      
      const progress = scraper.getProgress();
      
      expect(progress.totalJobs).toBe(2);
      expect(progress.pendingJobs).toBe(2);
    });
  });

  describe("configuration", () => {
    it('should set concurrency', () => {
      scraper.setConcurrency(10);
      expect((scraper as any).concurrency).toBe(10);
      
      scraper.setConcurrency(0);
      expect((scraper as any).concurrency).toBe(1); // Minimum is 1
    });

    it('should add custom extraction schema', () => {
      const schema: ExtractionSchema = {
        name: 'custom-schema',
        description: 'Custom schema',
        rules: []
      };
      
      scraper.addSchema(schema);
      
      expect(mockExtractor.addSchema).toHaveBeenCalledWith(schema);
    });
  });

  describe("statistics", () => {
    it('should track statistics', () => {
      const stats = scraper.getStats();
      
      expect(stats).toHaveProperty("totalRequests");
      expect(stats).toHaveProperty("successfulRequests");
      expect(stats).toHaveProperty("failedRequests");
      expect(stats).toHaveProperty("cacheHits");
      expect(stats).toHaveProperty("cacheMisses");
    });

    it('should return a copy of statistics', () => {
      const stats1 = scraper.getStats();
      const stats2 = scraper.getStats();
      
      expect(stats1).not.toBe(stats2); // Different objects
      expect(stats1).toEqual(stats2); // Same values
    });
  });

  describe('cleanup', () => {
    it('should clear cache', () => {
      scraper.clearCache();
      
      expect(mockFetcher.clearCache).toHaveBeenCalled();
    });

    it('should cleanup resources', async () => {
      const stopProcessingSpy = jest.spyOn(scraper, "stopProcessing");
      const clearCacheSpy = jest.spyOn(scraper, "clearCache");
      
      await scraper.cleanup();
      
      expect(stopProcessingSpy).toHaveBeenCalled();
      expect(clearCacheSpy).toHaveBeenCalled();
    });
  });

  describe('processing control', () => {
    it('should start processing', () => {
      const emitSpy = jest.spyOn(scraper, 'emit');
      
      scraper.startProcessing();
      
      expect((scraper as any).isRunning).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith("processingStart");
    });

    it('should not start processing if already running', () => {
      scraper.startProcessing();
      const emitSpy = jest.spyOn(scraper, 'emit');
      
      scraper.startProcessing(); // Second call
      
      expect(emitSpy).not.toHaveBeenCalledWith("processingStart");
    });

    it('should stop processing', () => {
      const emitSpy = jest.spyOn(scraper, 'emit');
      
      scraper.startProcessing();
      scraper.stopProcessing();
      
      expect((scraper as any).isRunning).toBe(false);
      expect(emitSpy).toHaveBeenCalledWith("processingStop");
    });
  });
});