import { WebScraper, WebScrapingQueue, WebScrapingCache, ScrapingOptions, ScrapingResult, ScrapingJob } from '../../src/web-scraper';
import { TestDataFactory, MockServiceFactory, ErrorScenarios } from '../utils/test-helpers';

/**
 * Branch Coverage Tests
 * Focus on covering all conditional branches, early returns, and edge cases
 */

describe('Branch Coverage - WebScrapingQueue', () => {
  let queue: WebScrapingQueue;

  beforeEach(() => {
    queue = new WebScrapingQueue();
  });

  describe('markJobRunning branches', () => {
    it('should handle when job exists (if branch)', () => {
      const jobId = queue.addJob('https://example.com');
      queue.markJobRunning(jobId);
      
      const job = queue.getJob(jobId);
      expect(job?.status).toBe('running');
      expect(job?.startedAt).toBeInstanceOf(Date);
    });

    it('should handle when job does not exist (else branch)', () => {
      // Call with non-existent job ID
      expect(() => queue.markJobRunning('non-existent-id')).not.toThrow();
      
      // Verify no jobs were modified
      expect(queue.getProgress().runningJobs).toBe(0);
    });
  });

  describe('markJobCompleted branches', () => {
    it('should execute if branch when job exists', () => {
      const jobId = queue.addJob('https://example.com');
      const result = TestDataFactory.createMockScrapingResult();
      
      queue.markJobCompleted(jobId, result);
      
      const job = queue.getJob(jobId);
      expect(job?.status).toBe("completed");
      expect(job?.result).toEqual(result);
      expect(job?.progress).toBe(100);
    });

    it('should skip when job does not exist', () => {
      const result = TestDataFactory.createMockScrapingResult();
      
      expect(() => queue.markJobCompleted('invalid-id', result)).not.toThrow();
      expect(queue.getCompletedJobs()).toHaveLength(0);
    });
  });

  describe('markJobFailed retry branches', () => {
    it('should enter retry branch when under max retries', () => {
      const jobId = queue.addJob('https://example.com');
      
      // First failure - should retry
      queue.markJobFailed(jobId, 'Error 1');
      expect(queue.getJob(jobId)?.status).toBe("retrying");
      expect(queue.getJob(jobId)?.retryCount).toBe(1);
    });

    it('should enter failed branch when max retries reached', () => {
      const jobId = queue.addJob('https://example.com');
      
      // Fail multiple times to reach max retries
      for (let i = 0; i < 3; i++) {
        queue.markJobFailed(jobId, `Error ${i + 1}`);
      }
      
      expect(queue.getJob(jobId)?.status).toBe('failed');
      expect(queue.getFailedJobs()).toHaveLength(1);
    });

    it('should handle when job does not exist', () => {
      expect(() => queue.markJobFailed('invalid-id', 'Error')).not.toThrow();
      expect(queue.getFailedJobs()).toHaveLength(0);
    });

    it('should handle custom maxRetries value', () => {
      const jobId = queue.addJob('https://example.com');
      const job = queue.getJob(jobId);
      
      if (job) {
        job.maxRetries = 1; // Set to 1 retry only
      }
      
      queue.markJobFailed(jobId, 'Error 1');
      expect(queue.getJob(jobId)?.status).toBe("retrying");
      
      queue.markJobFailed(jobId, 'Error 2');
      expect(queue.getJob(jobId)?.status).toBe('failed');
    });
  });

  describe('getNextJob dependency branches', () => {
    it('should return job when dependencies are completed', () => {
      const dep1 = queue.addJob('https://dep1.com');
      const dep2 = queue.addJob('https://dep2.com');
      const main = queue.addJob('https://main.com');
      
      const mainJob = queue.getJob(main);
      if (mainJob) {
        mainJob.dependencies = ['https://dep1.com', 'https://dep2.com'];
      }
      
      // Complete dependencies
      queue.markJobCompleted(dep1, TestDataFactory.createMockScrapingResult());
      queue.markJobCompleted(dep2, TestDataFactory.createMockScrapingResult());
      
      // Main job should now be available
      const nextJob = queue.getNextJob();
      expect(nextJob?.url).toBe('https://main.com');
    });

    it('should skip job when dependencies are not completed', () => {
      const dep1 = queue.addJob('https://dep1.com');
      const main = queue.addJob('https://main.com');
      
      const mainJob = queue.getJob(main);
      if (mainJob) {
        mainJob.dependencies = ['https://dep1.com'];
      }
      
      // Don't complete dependency
      const nextJob = queue.getNextJob();
      expect(nextJob?.url).toBe('https://dep1.com'); // Should get dependency first
    });

    it('should handle job with no dependencies', () => {
      const jobId = queue.addJob('https://nodeps.com');
      const job = queue.getJob(jobId);
      
      if (job) {
        job.dependencies = undefined; // Explicitly no dependencies
      }
      
      const nextJob = queue.getNextJob();
      expect(nextJob?.url).toBe('https://nodeps.com');
    });

    it('should handle job with empty dependencies array', () => {
      const jobId = queue.addJob('https://emptydeps.com');
      const job = queue.getJob(jobId);
      
      if (job) {
        job.dependencies = []; // Empty array
      }
      
      const nextJob = queue.getNextJob();
      expect(nextJob?.url).toBe('https://emptydeps.com');
    });
  });

  describe('areDependenciesCompleted branches', () => {
    it('should return true for undefined dependencies', () => {
      const job = new (queue as any).constructor().new ScrapingJob();
      job.dependencies = undefined;
      
      expect((queue as any).areDependenciesCompleted(job)).toBe(true);
    });

    it('should return true for empty dependencies', () => {
      const job = { dependencies: [] } as ScrapingJob;
      
      expect((queue as any).areDependenciesCompleted(job)).toBe(true);
    });

    it('should return false when dependency job not found', () => {
      const job = { dependencies: ['https://nonexistent.com'] } as ScrapingJob;
      
      expect((queue as any).areDependenciesCompleted(job)).toBe(false);
    });

    it('should return false when dependency not completed', () => {
      const depId = queue.addJob('https://dep.com');
      const job = { dependencies: ['https://dep.com'] } as ScrapingJob;
      
      expect((queue as any).areDependenciesCompleted(job)).toBe(false);
    });
  });

  describe('updateJobProgress branches', () => {
    it('should update when job exists', () => {
      const jobId = queue.addJob('https://example.com');
      
      queue.updateJobProgress(jobId, 50);
      expect(queue.getJob(jobId)?.progress).toBe(50);
      
      queue.updateJobProgress(jobId, 100);
      expect(queue.getJob(jobId)?.progress).toBe(100);
    });

    it('should handle when job does not exist', () => {
      expect(() => queue.updateJobProgress('invalid-id', 50)).not.toThrow();
    });

    it('should handle negative progress values', () => {
      const jobId = queue.addJob('https://example.com');
      
      queue.updateJobProgress(jobId, -10);
      expect(queue.getJob(jobId)?.progress).toBe(-10);
    });

    it('should handle progress over 100', () => {
      const jobId = queue.addJob('https://example.com');
      
      queue.updateJobProgress(jobId, 150);
      expect(queue.getJob(jobId)?.progress).toBe(150);
    });
  });

  describe('getProgress calculation branches', () => {
    it('should handle empty queue', () => {
      const progress = queue.getProgress();
      
      expect(progress.totalJobs).toBe(0);
      expect(progress.averageJobDuration).toBe(0);
      expect(progress.estimatedCompletion).toBeUndefined();
    });

    it('should calculate average duration when jobs have times', () => {
      const job1 = queue.addJob('https://job1.com');
      queue.markJobRunning(job1);
      
      // Manually set start time in the past
      const job1Data = queue.getJob(job1);
      if (job1Data) {
        job1Data.startedAt = new Date(Date.now() - 1000);
      }
      
      queue.markJobCompleted(job1, TestDataFactory.createMockScrapingResult());
      
      const progress = queue.getProgress();
      expect(progress.averageJobDuration).toBeGreaterThan(0);
    });

    it('should estimate completion when average duration exists', () => {
      // Complete one job to establish average
      const job1 = queue.addJob('https://job1.com');
      queue.markJobRunning(job1);
      const job1Data = queue.getJob(job1);
      if (job1Data) {
        job1Data.startedAt = new Date(Date.now() - 1000);
      }
      queue.markJobCompleted(job1, TestDataFactory.createMockScrapingResult());
      
      // Add pending jobs
      queue.addJob('https://job2.com');
      queue.addJob('https://job3.com');
      
      const progress = queue.getProgress();
      expect(progress.estimatedCompletion).toBeInstanceOf(Date);
    });

    it('should handle jobs without duration data', () => {
      const job1 = queue.addJob('https://job1.com');
      queue.markJobCompleted(job1, TestDataFactory.createMockScrapingResult());
      
      // Job completed but no startedAt time
      const job1Data = queue.getJob(job1);
      if (job1Data) {
        job1Data.startedAt = undefined;
      }
      
      const progress = queue.getProgress();
      expect(progress.averageJobDuration).toBe(0);
    });
  });
});

describe('Branch Coverage - WebScrapingCache', () => {
  let cache: WebScrapingCache;

  beforeEach(() => {
    cache = new WebScrapingCache();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('get method branches', () => {
    it('should return data when entry exists and not expired', () => {
      const data = TestDataFactory.createMockScrapingResult();
      cache.set('key1', data, 1000);
      
      const retrieved = cache.get('key1');
      expect(retrieved).toEqual(data);
    });

    it('should return null and delete when entry expired', () => {
      const data = TestDataFactory.createMockScrapingResult();
      cache.set('key1', data, 1000);
      
      jest.advanceTimersByTime(1001);
      
      const retrieved = cache.get('key1');
      expect(retrieved).toBeNull();
      
      // Verify entry was deleted
      expect(cache.size()).toBe(0);
    });

    it('should return null when entry does not exist', () => {
      expect(cache.get("nonexistent")).toBeNull();
    });
  });

  describe('generateKey branches', () => {
    it('should use custom key when provided', () => {
      const options: ScrapingOptions = {
        cacheOptions: {
          key: 'custom-key-123'
        }
      };
      
      const key = cache.generateKey('https://example.com', options);
      expect(key).toBe('custom-key-123');
    });

    it('should generate key when no custom key', () => {
      const options: ScrapingOptions = {
        fetchOptions: { timeout: 5000 }
      };
      
      const key = cache.generateKey('https://example.com', options);
      expect(key).toContain('https://example.com');
      expect(key).not.toBe('https://example.com'); // Should include hash
    });

    it('should handle undefined options', () => {
      const key = cache.generateKey('https://example.com');
      expect(key).toContain('https://example.com');
    });

    it('should handle empty options object', () => {
      const key = cache.generateKey('https://example.com', {});
      expect(key).toContain('https://example.com');
    });
  });

  describe('cleanup branches', () => {
    it('should remove expired entries', () => {
      cache.set('expired', TestDataFactory.createMockScrapingResult(), 100);
      cache.set('valid', TestDataFactory.createMockScrapingResult(), 10000);
      
      jest.advanceTimersByTime(200);
      
      cache.cleanup();
      
      expect(cache.get('expired')).toBeNull();
      expect(cache.get('valid')).toBeTruthy();
    });

    it('should handle empty cache', () => {
      expect(() => cache.cleanup()).not.toThrow();
      expect(cache.size()).toBe(0);
    });

    it('should handle all entries expired', () => {
      cache.set('key1', TestDataFactory.createMockScrapingResult(), 100);
      cache.set('key2', TestDataFactory.createMockScrapingResult(), 100);
      
      jest.advanceTimersByTime(200);
      
      cache.cleanup();
      
      expect(cache.size()).toBe(0);
    });
  });

  describe('simpleHash branches', () => {
    it('should handle empty string', () => {
      const hash = (cache as any).simpleHash('');
      expect(hash).toBe('0');
    });

    it('should handle special characters', () => {
      const hash1 = (cache as any).simpleHash('!@#$%^&*()');
      const hash2 = (cache as any).simpleHash('!@#$%^&*()');
      
      expect(hash1).toBe(hash2); // Same input, same hash
    });

    it('should produce different hashes for different strings', () => {
      const hash1 = (cache as any).simpleHash('string1');
      const hash2 = (cache as any).simpleHash('string2');
      
      expect(hash1).not.toBe(hash2);
    });
  });
});

describe('Branch Coverage - WebScraper', () => {
  let scraper: WebScraper;
  let mockFetcher: any;
  let mockParser: any;
  let mockExtractor: any;

  beforeEach(() => {
    scraper = new WebScraper();
    mockFetcher = MockServiceFactory.createMockFetcher();
    mockParser = MockServiceFactory.createMockParser();
    mockExtractor = MockServiceFactory.createMockExtractor();
    
    (scraper as any).fetcher = mockFetcher;
    (scraper as any).parser = mockParser;
    (scraper as any).extractor = mockExtractor;
    
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('scrape cache branches', () => {
    it('should use cache when enabled and hit', async () => {
      const cachedResult = TestDataFactory.createMockScrapingResult();
      (scraper as any).cache.get = jest.fn().mockReturnValue(cachedResult);
      
      const options: ScrapingOptions = {
        cacheOptions: { enabled: true }
      };
      
      const result = await scraper.scrape('https://example.com', options);
      
      expect(result).toEqual(cachedResult);
      expect(mockFetcher.fetch).not.toHaveBeenCalled();
      expect((scraper as any).stats.cacheHits).toBe(1);
    });

    it('should fetch when cache miss', async () => {
      (scraper as any).cache.get = jest.fn().mockReturnValue(null);
      mockFetcher.fetch.mockResolvedValue(TestDataFactory.createMockFetchResult());
      mockParser.parse.mockReturnValue(TestDataFactory.createMockDOMNode());
      
      const options: ScrapingOptions = {
        cacheOptions: { enabled: true }
      };
      
      await scraper.scrape('https://example.com', options);
      
      expect(mockFetcher.fetch).toHaveBeenCalled();
      expect((scraper as any).stats.cacheMisses).toBe(1);
    });

    it('should skip cache when disabled', async () => {
      mockFetcher.fetch.mockResolvedValue(TestDataFactory.createMockFetchResult());
      mockParser.parse.mockReturnValue(TestDataFactory.createMockDOMNode());
      
      const options: ScrapingOptions = {
        cacheOptions: { enabled: false }
      };
      
      await scraper.scrape('https://example.com', options);
      
      expect((scraper as any).cache.get).not.toHaveBeenCalled();
    });

    it('should cache result when enabled', async () => {
      (scraper as any).cache.get = jest.fn().mockReturnValue(null);
      (scraper as any).cache.set = jest.fn();
      mockFetcher.fetch.mockResolvedValue(TestDataFactory.createMockFetchResult());
      mockParser.parse.mockReturnValue(TestDataFactory.createMockDOMNode());
      
      const options: ScrapingOptions = {
        cacheOptions: { enabled: true, ttl: 5000 }
      };
      
      await scraper.scrape('https://example.com', options);
      
      expect((scraper as any).cache.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        5000
      );
    });
  });

  describe('browser automation branches', () => {
    it('should use browser when engine specified', async () => {
      const mockBrowserResult = {
        fetchResult: TestDataFactory.createMockFetchResult(),
        dom: TestDataFactory.createMockDOMNode()
      };
      
      (scraper as any).scrapeWithBrowser = jest.fn().mockResolvedValue(mockBrowserResult);
      
      const options: ScrapingOptions = {
        browserOptions: { engine: "playwright" }
      };
      
      await scraper.scrape('https://example.com', options);
      
      expect((scraper as any).scrapeWithBrowser).toHaveBeenCalled();
      expect(mockFetcher.fetch).not.toHaveBeenCalled();
    });

    it('should use fetcher when no browser engine', async () => {
      mockFetcher.fetch.mockResolvedValue(TestDataFactory.createMockFetchResult());
      mockParser.parse.mockReturnValue(TestDataFactory.createMockDOMNode());
      
      const options: ScrapingOptions = {
        fetchOptions: { timeout: 5000 }
      };
      
      await scraper.scrape('https://example.com', options);
      
      expect(mockFetcher.fetch).toHaveBeenCalled();
    });
  });

  describe('export branches', () => {
    it('should export immediately when requested', async () => {
      mockFetcher.fetch.mockResolvedValue(TestDataFactory.createMockFetchResult());
      mockParser.parse.mockReturnValue(TestDataFactory.createMockDOMNode());
      
      const mockExporter = MockServiceFactory.createMockExporter();
      mockExporter.export.mockResolvedValue(TestDataFactory.createMockExportResult());
      (scraper as any).exporter = mockExporter;
      
      const options: ScrapingOptions = {
        exportOptions: {
          immediate: true,
          formats: [{ format: 'json', destination: 'output.json' }]
        }
      };
      
      const result = await scraper.scrape('https://example.com', options);
      
      expect(mockExporter.export).toHaveBeenCalled();
      expect(result.exports).toBeDefined();
      expect(result.exports).toHaveLength(1);
    });

    it('should skip export when not immediate', async () => {
      mockFetcher.fetch.mockResolvedValue(TestDataFactory.createMockFetchResult());
      mockParser.parse.mockReturnValue(TestDataFactory.createMockDOMNode());
      
      const mockExporter = MockServiceFactory.createMockExporter();
      (scraper as any).exporter = mockExporter;
      
      const options: ScrapingOptions = {
        exportOptions: {
          immediate: false,
          formats: [{ format: 'json', destination: 'output.json' }]
        }
      };
      
      const result = await scraper.scrape('https://example.com', options);
      
      expect(mockExporter.export).not.toHaveBeenCalled();
      expect(result.exports).toBeUndefined();
    });

    it('should skip export when no formats specified', async () => {
      mockFetcher.fetch.mockResolvedValue(TestDataFactory.createMockFetchResult());
      mockParser.parse.mockReturnValue(TestDataFactory.createMockDOMNode());
      
      const options: ScrapingOptions = {
        exportOptions: {
          immediate: true,
          formats: undefined
        }
      };
      
      const result = await scraper.scrape('https://example.com', options);
      
      expect(result.exports).toBeUndefined();
    });
  });

  describe('error handling branches', () => {
    it('should emit error and throw on fetch failure', async () => {
      const error = ErrorScenarios.networkError();
      mockFetcher.fetch.mockRejectedValue(error);
      
      const errorSpy = jest.fn();
      scraper.on("scrapeError", errorSpy);
      
      await expect(scraper.scrape('https://example.com')).rejects.toThrow();
      
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://example.com',
          error
        })
      );
    });

    it('should update failed stats on error', async () => {
      mockFetcher.fetch.mockRejectedValue(new Error('Test error'));
      
      try {
        await scraper.scrape('https://example.com');
      } catch (e) {
        // Expected
      }
      
      expect((scraper as any).stats.failedRequests).toBe(1);
    });
  });

  describe('processNextJob branches', () => {
    it('should return early when not running', async () => {
      (scraper as any).isRunning = false;
      
      await (scraper as any).processNextJob();
      
      expect((scraper as any).queue.getNextJob).not.toHaveBeenCalled();
    });

    it('should return early when at concurrency limit', async () => {
      (scraper as any).isRunning = true;
      (scraper as any).concurrency = 2;
      (scraper as any).activeWorkers = 2;
      
      await (scraper as any).processNextJob();
      
      expect((scraper as any).queue.getNextJob).not.toHaveBeenCalled();
    });

    it('should retry when no jobs available', async () => {
      (scraper as any).isRunning = true;
      (scraper as any).activeWorkers = 0;
      (scraper as any).queue.getNextJob = jest.fn().mockReturnValue(null);
      
      const setTimeoutSpy = jest.spyOn(global, "setTimeout");
      
      await (scraper as any).processNextJob();
      
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
    });

    it('should process job when available', async () => {
      const mockJob = {
        id: 'job1',
        url: 'https://example.com',
        options: {}
      };
      
      (scraper as any).isRunning = true;
      (scraper as any).activeWorkers = 0;
      (scraper as any).queue.getNextJob = jest.fn().mockReturnValue(mockJob);
      (scraper as any).queue.markJobRunning = jest.fn();
      (scraper as any).scrape = jest.fn().mockResolvedValue(TestDataFactory.createMockScrapingResult());
      
      await (scraper as any).processNextJob();
      
      expect((scraper as any).queue.markJobRunning).toHaveBeenCalledWith('job1');
    });

    it('should handle job processing error', async () => {
      const mockJob = {
        id: 'job1',
        url: 'https://example.com',
        options: {}
      };
      
      (scraper as any).isRunning = true;
      (scraper as any).activeWorkers = 0;
      (scraper as any).queue.getNextJob = jest.fn().mockReturnValue(mockJob);
      (scraper as any).queue.markJobFailed = jest.fn();
      (scraper as any).scrape = jest.fn().mockRejectedValue(new Error('Process error'));
      
      await (scraper as any).processNextJob();
      
      expect((scraper as any).queue.markJobFailed).toHaveBeenCalledWith('job1', 'Error: Process error');
    });
  });

  describe('startProcessing branches', () => {
    it('should return early if already running', () => {
      (scraper as any).isRunning = true;
      const emitSpy = jest.spyOn(scraper, 'emit');
      
      scraper.startProcessing();
      
      expect(emitSpy).not.toHaveBeenCalledWith("processingStart");
    });

    it('should start workers based on concurrency', () => {
      (scraper as any).isRunning = false;
      (scraper as any).concurrency = 3;
      (scraper as any).processNextJob = jest.fn();
      
      scraper.startProcessing();
      
      expect((scraper as any).processNextJob).toHaveBeenCalledTimes(3);
    });
  });

  describe('extractData branches', () => {
    it('should auto-detect schema when validation enabled', async () => {
      const dom = TestDataFactory.createMockDOMNode();
      mockExtractor.autoDetectSchema = jest.fn().mockReturnValue(['product-schema']);
      mockExtractor.extract = jest.fn().mockReturnValue(TestDataFactory.createMockExtractionResult());
      
      const options: ScrapingOptions = {
        extractionOptions: {
          validation: true
        }
      };
      
      const result = await (scraper as any).extractData(dom, 'https://example.com', options);
      
      expect(mockExtractor.autoDetectSchema).toHaveBeenCalled();
      expect(result.schemaUsed).toBe('product-schema');
    });

    it('should use custom schema object', async () => {
      const dom = TestDataFactory.createMockDOMNode();
      const customSchema = TestDataFactory.createMockExtractionSchema();
      
      mockExtractor.addSchema = jest.fn();
      mockExtractor.extract = jest.fn().mockReturnValue(TestDataFactory.createMockExtractionResult());
      
      const options: ScrapingOptions = {
        schema: customSchema
      } as any;
      
      const result = await (scraper as any).extractData(dom, 'https://example.com', options);
      
      expect(mockExtractor.addSchema).toHaveBeenCalledWith(customSchema);
    });

    it('should extract custom selectors', async () => {
      const dom = TestDataFactory.createMockDOMNode();
      const mockElements = [{ type: 'element', name: 'div' }];
      
      (scraper as any).cssSelector.select = jest.fn().mockReturnValue(mockElements);
      (scraper as any).getTextContent = jest.fn().mockReturnValue('text content');
      
      const options: ScrapingOptions = {
        extractionOptions: {
          customSelectors: {
            title: 'h1',
            price: '.price'
          }
        }
      };
      
      const result = await (scraper as any).extractData(dom, 'https://example.com', options);
      
      expect((scraper as any).cssSelector.select).toHaveBeenCalledWith(dom, 'h1');
      expect((scraper as any).cssSelector.select).toHaveBeenCalledWith(dom, '.price');
    });

    it('should extract basic data when no extraction options', async () => {
      const dom = TestDataFactory.createMockDOMNode();
      (scraper as any).extractBasicData = jest.fn().mockReturnValue({ title: 'Basic' });
      
      const result = await (scraper as any).extractData(dom, 'https://example.com');
      
      expect((scraper as any).extractBasicData).toHaveBeenCalled();
      expect(result.data.title).toBe('Basic');
    });
  });

  describe('getTextContent branches', () => {
    it('should return text for text node', () => {
      const textNode = { type: 'text', text: 'Hello World' };
      
      const result = (scraper as any).getTextContent(textNode);
      
      expect(result).toBe('Hello World');
    });

    it('should return empty string for text node without text', () => {
      const textNode = { type: 'text' };
      
      const result = (scraper as any).getTextContent(textNode);
      
      expect(result).toBe('');
    });

    it('should recursively get text from children', () => {
      const node = {
        type: 'element',
        children: [
          { type: 'text', text: 'Hello ' },
          {
            type: 'element',
            children: [
              { type: 'text', text: 'World' }
            ]
          }
        ]
      };
      
      const result = (scraper as any).getTextContent(node);
      
      expect(result).toBe('Hello World');
    });

    it('should handle nodes without children', () => {
      const node = { type: 'element', name: 'div' };
      
      const result = (scraper as any).getTextContent(node);
      
      expect(result).toBe('');
    });
  });

  describe('concurrency control branches', () => {
    it('should enforce minimum concurrency of 1', () => {
      scraper.setConcurrency(0);
      expect((scraper as any).concurrency).toBe(1);
      
      scraper.setConcurrency(-5);
      expect((scraper as any).concurrency).toBe(1);
    });

    it('should set valid concurrency', () => {
      scraper.setConcurrency(10);
      expect((scraper as any).concurrency).toBe(10);
    });
  });

  describe('cleanup branches', () => {
    it('should close puppeteer browser if exists', async () => {
      const mockBrowser = { close: jest.fn() };
      (scraper as any).puppeteerBrowser = mockBrowser;
      
      await scraper.cleanup();
      
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should close playwright browser if exists', async () => {
      const mockBrowser = { close: jest.fn() };
      (scraper as any).playwrightBrowser = mockBrowser;
      
      await scraper.cleanup();
      
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should handle cleanup with no browsers', async () => {
      (scraper as any).puppeteerBrowser = undefined;
      (scraper as any).playwrightBrowser = undefined;
      
      await expect(scraper.cleanup()).resolves.not.toThrow();
    });
  });
});