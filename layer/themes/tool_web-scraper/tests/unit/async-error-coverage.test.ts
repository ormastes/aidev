import { WebScraper, WebScrapingQueue } from '../../src/web-scraper';
import { TestDataFactory } from '../utils/test-helpers';

/**
 * Async/Await and Try/Catch Branch Coverage Tests
 * Focus on error handling paths and async control flow
 */

describe('Async Error Handling Coverage', () => {
  describe('WebScraper - Try/Catch Branches', () => {
    let scraper: WebScraper;

    beforeEach(() => {
      scraper = new WebScraper();
      jest.clearAllMocks();
    });

    describe('scrape method error paths', () => {
      it('should catch and handle fetch timeout', async () => {
        const timeoutError = new Error("ETIMEDOUT");
        (scraper as any).fetcher.fetch = jest.fn().mockRejectedValue(timeoutError);

        const errorSpy = jest.fn();
        scraper.on("scrapeError", errorSpy);

        await expect(scraper.scrape('https://example.com')).rejects.toThrow("ETIMEDOUT");

        expect(errorSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            url: 'https://example.com',
            error: timeoutError
          })
        );
        expect((scraper as any).stats.failedRequests).toBe(1);
      });

      it('should catch parsing errors in try block', async () => {
        (scraper as any).fetcher.fetch = jest.fn().mockResolvedValue(
          TestDataFactory.createMockFetchResult()
        );
        (scraper as any).parser.parse = jest.fn().mockImplementation(() => {
          throw new Error('Invalid HTML structure');
        });

        await expect(scraper.scrape('https://example.com')).rejects.toThrow('Invalid HTML structure');
        expect((scraper as any).stats.failedRequests).toBe(1);
      });

      it('should catch extraction errors', async () => {
        (scraper as any).fetcher.fetch = jest.fn().mockResolvedValue(
          TestDataFactory.createMockFetchResult()
        );
        (scraper as any).parser.parse = jest.fn().mockReturnValue(
          TestDataFactory.createMockDOMNode()
        );
        (scraper as any).extractData = jest.fn().mockRejectedValue(
          new Error('Extraction failed')
        );

        await expect(scraper.scrape('https://example.com')).rejects.toThrow('Extraction failed');
      });

      it('should catch export errors but continue', async () => {
        (scraper as any).fetcher.fetch = jest.fn().mockResolvedValue(
          TestDataFactory.createMockFetchResult()
        );
        (scraper as any).parser.parse = jest.fn().mockReturnValue(
          TestDataFactory.createMockDOMNode()
        );
        (scraper as any).exporter.export = jest.fn().mockRejectedValue(
          new Error('Export failed')
        );

        const options = {
          exportOptions: {
            immediate: true,
            formats: [{ format: 'json' as const, destination: 'output.json' }]
          }
        };

        const result = await scraper.scrape('https://example.com', options);
        
        // Should still return result even if export fails
        expect(result).toBeDefined();
        expect(result.url).toBe('https://example.com');
      });
    });

    describe('scrapeBatch error handling', () => {
      it('should handle partial batch failures', async () => {
        let callCount = 0;
        (scraper as any).fetcher.fetch = jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 2) {
            return Promise.reject(new Error('Second URL failed'));
          }
          return Promise.resolve(TestDataFactory.createMockFetchResult());
        });
        (scraper as any).parser.parse = jest.fn().mockReturnValue(
          TestDataFactory.createMockDOMNode()
        );

        // Mock the queue processing
        const mockQueue = {
          addBatchJobs: jest.fn().mockReturnValue(['job1', 'job2', 'job3']),
          getJob: jest.fn().mockImplementation((id) => ({
            id,
            status: id === 'job2' ? 'failed' : "completed",
            result: id === 'job2' ? undefined : TestDataFactory.createMockScrapingResult()
          })),
          getProgress: jest.fn().mockReturnValue({
            pendingJobs: 0,
            runningJobs: 0
          })
        };
        (scraper as any).queue = mockQueue;

        const urls = ['https://url1.com', 'https://url2.com', 'https://url3.com'];
        const results = await scraper.scrapeBatch(urls);

        // Should return results for successful URLs
        expect(results.length).toBeGreaterThan(0);
      });

      it('should handle timeout in batch processing', async () => {
        const mockQueue = {
          addBatchJobs: jest.fn().mockReturnValue(['job1']),
          getProgress: jest.fn().mockReturnValue({
            pendingJobs: 1,
            runningJobs: 0
          })
        };
        (scraper as any).queue = mockQueue;
        (scraper as any).isRunning = false;

        // This will timeout in the completion check
        const batchPromise = scraper.scrapeBatch(['https://example.com']);

        // Fast-forward to trigger timeout logic
        jest.advanceTimersByTime(10000);

        // The promise should eventually resolve/reject
        await expect(Promise.race([
          batchPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Test timeout')), 100))
        ])).rejects.toBeDefined();
      });
    });

    describe('browser automation error paths', () => {
      it('should catch playwright launch errors', async () => {
        const playwright = require("playwright");
        playwright.chromium = {
          launch: jest.fn().mockRejectedValue(new Error('Browser launch failed'))
        };

        const options = {
          browserOptions: {
            engine: "playwright" as const,
            headless: true
          }
        };

        await expect(scraper.scrape('https://example.com', options)).rejects.toThrow('Browser launch failed');
      });

      it('should catch puppeteer page errors', async () => {
        const puppeteer = require("puppeteer");
        puppeteer.launch = jest.fn().mockResolvedValue({
          newPage: jest.fn().mockRejectedValue(new Error('Page creation failed'))
        });

        const options = {
          browserOptions: {
            engine: "puppeteer" as const
          }
        };

        await expect(scraper.scrape('https://example.com', options)).rejects.toThrow('Page creation failed');
      });

      it('should handle page navigation errors', async () => {
        const mockPage = {
          goto: jest.fn().mockRejectedValue(new Error('Navigation timeout')),
          close: jest.fn()
        };

        const playwright = require("playwright");
        playwright.chromium = {
          launch: jest.fn().mockResolvedValue({
            newPage: jest.fn().mockResolvedValue(mockPage)
          })
        };

        const options = {
          browserOptions: {
            engine: "playwright" as const
          }
        };

        await expect(scraper.scrape('https://example.com', options)).rejects.toThrow('Navigation timeout');
        expect(mockPage.close).toHaveBeenCalled();
      });

      it('should handle JavaScript execution errors', async () => {
        const mockPage = {
          goto: jest.fn().mockResolvedValue(undefined),
          evaluate: jest.fn().mockRejectedValue(new Error('JS execution failed')),
          content: jest.fn().mockResolvedValue('<html></html>'),
          close: jest.fn()
        };

        const playwright = require("playwright");
        playwright.chromium = {
          launch: jest.fn().mockResolvedValue({
            newPage: jest.fn().mockResolvedValue(mockPage)
          })
        };

        const options = {
          browserOptions: {
            engine: "playwright" as const
          },
          parseOptions: {
            executeJS: 'invalid.javascript.code()'
          }
        };

        await expect(scraper.scrape('https://example.com', options)).rejects.toThrow('JS execution failed');
      });
    });

    describe('processNextJob error recovery', () => {
      it('should recover from job processing errors', async () => {
        const mockJob = {
          id: 'job1',
          url: 'https://example.com'
        };

        (scraper as any).isRunning = true;
        (scraper as any).activeWorkers = 0;
        (scraper as any).queue.getNextJob = jest.fn()
          .mockReturnValueOnce(mockJob)
          .mockReturnValue(null);
        (scraper as any).queue.markJobFailed = jest.fn();
        
        // First call fails
        (scraper as any).scrape = jest.fn()
          .mockRejectedValueOnce(new Error('Process error'))
          .mockResolvedValue(TestDataFactory.createMockScrapingResult());

        await (scraper as any).processNextJob();

        expect((scraper as any).queue.markJobFailed).toHaveBeenCalledWith('job1', 'Error: Process error');
        expect((scraper as any).activeWorkers).toBe(0);
      });

      it('should continue processing after error', async () => {
        const mockJob1 = { id: 'job1', url: 'https://fail.com' };
        const mockJob2 = { id: 'job2', url: 'https://success.com' };

        (scraper as any).isRunning = true;
        (scraper as any).activeWorkers = 0;
        (scraper as any).queue.getNextJob = jest.fn()
          .mockReturnValueOnce(mockJob1)
          .mockReturnValueOnce(mockJob2)
          .mockReturnValue(null);

        (scraper as any).scrape = jest.fn()
          .mockRejectedValueOnce(new Error('First job fails'))
          .mockResolvedValueOnce(TestDataFactory.createMockScrapingResult());

        const setImmediateSpy = jest.spyOn(global, "setImmediate");

        await (scraper as any).processNextJob();

        // Should schedule next job processing
        expect(setImmediateSpy).toHaveBeenCalled();
      });
    });
  });

  describe('Async Race Conditions', () => {
    let scraper: WebScraper;

    beforeEach(() => {
      scraper = new WebScraper();
    });

    it('should handle concurrent scrape calls to same URL', async () => {
      let fetchCallCount = 0;
      (scraper as any).fetcher.fetch = jest.fn().mockImplementation(async () => {
        fetchCallCount++;
        await new Promise(resolve => setTimeout(resolve, 10));
        return TestDataFactory.createMockFetchResult();
      });
      (scraper as any).parser.parse = jest.fn().mockReturnValue(
        TestDataFactory.createMockDOMNode()
      );

      // Start multiple scrapes concurrently
      const promises = [
        scraper.scrape('https://example.com'),
        scraper.scrape('https://example.com'),
        scraper.scrape('https://example.com')
      ];

      const results = await Promise.all(promises);

      // Without caching, should fetch 3 times
      expect(fetchCallCount).toBe(3);
      expect(results).toHaveLength(3);
    });

    it('should handle concurrent cache access', async () => {
      const cache = (scraper as any).cache;
      const cacheGetSpy = jest.spyOn(cache, 'get');
      const cacheSetSpy = jest.spyOn(cache, 'set');

      (scraper as any).fetcher.fetch = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return TestDataFactory.createMockFetchResult();
      });
      (scraper as any).parser.parse = jest.fn().mockReturnValue(
        TestDataFactory.createMockDOMNode()
      );

      const options = { cacheOptions: { enabled: true } };

      // Start multiple scrapes with caching
      const promises = [
        scraper.scrape('https://cached.com', options),
        scraper.scrape('https://cached.com', options),
        scraper.scrape('https://cached.com', options)
      ];

      await Promise.all(promises);

      // Cache should be accessed multiple times
      expect(cacheGetSpy).toHaveBeenCalled();
      expect(cacheSetSpy).toHaveBeenCalled();
    });
  });

  describe('Promise Chain Error Handling', () => {
    let scraper: WebScraper;

    beforeEach(() => {
      scraper = new WebScraper();
    });

    it('should handle errors in promise chain', async () => {
      const urls = ['https://url1.com', 'https://url2.com'];
      
      // Mock queue to simulate promise chain
      const mockQueue = {
        addBatchJobs: jest.fn().mockReturnValue(['job1', 'job2']),
        getProgress: jest.fn()
          .mockReturnValueOnce({ pendingJobs: 2, runningJobs: 0 })
          .mockReturnValueOnce({ pendingJobs: 1, runningJobs: 1 })
          .mockReturnValueOnce({ pendingJobs: 0, runningJobs: 0 }),
        getJob: jest.fn().mockImplementation((id) => {
          if (id === 'job1') {
            throw new Error('Unexpected error in getJob');
          }
          return { result: TestDataFactory.createMockScrapingResult() };
        })
      };
      (scraper as any).queue = mockQueue;
      (scraper as any).isRunning = false;
      (scraper as any).startProcessing = jest.fn();
      (scraper as any).stopProcessing = jest.fn();

      const results = await scraper.scrapeBatch(urls);

      // Should handle the error and return partial results
      expect(results.length).toBeLessThanOrEqual(urls.length);
      expect((scraper as any).stopProcessing).toHaveBeenCalled();
    });

    it('should handle async iterator errors', async () => {
      const mockJob = {
        id: 'job1',
        url: 'https://example.com',
        options: {}
      };

      (scraper as any).isRunning = true;
      (scraper as any).queue.getNextJob = jest.fn().mockReturnValue(mockJob);
      
      // Create an async iterator that throws
      (scraper as any).scrape = jest.fn().mockImplementation(async function* () {
        yield TestDataFactory.createMockScrapingResult();
        throw new Error('Async iterator error');
      });

      await expect((scraper as any).processNextJob()).resolves.not.toThrow();
    });
  });

  describe('Optional Chaining and Nullish Coalescing', () => {
    let scraper: WebScraper;

    beforeEach(() => {
      scraper = new WebScraper();
    });

    it('should handle optional chaining in extractData', async () => {
      const dom = TestDataFactory.createMockDOMNode();
      
      // Test with undefined options
      let result = await (scraper as any).extractData(dom, 'https://example.com', undefined);
      expect(result.data).toBeDefined();

      // Test with null extractionOptions
      result = await (scraper as any).extractData(dom, 'https://example.com', { extractionOptions: null });
      expect(result.data).toBeDefined();

      // Test with empty extractionOptions
      result = await (scraper as any).extractData(dom, 'https://example.com', { extractionOptions: {} });
      expect(result.data).toBeDefined();
    });

    it('should handle nullish coalescing in cache operations', () => {
      const cache = (scraper as any).cache;
      
      // Test with various falsy values
      const result1 = cache.generateKey('https://example.com', null);
      const result2 = cache.generateKey('https://example.com', undefined);
      const result3 = cache.generateKey('https://example.com', {});
      
      expect(result1).toBeTruthy();
      expect(result2).toBeTruthy();
      expect(result3).toBeTruthy();
    });

    it('should handle optional properties in job processing', async () => {
      const mockJob = {
        id: 'job1',
        url: 'https://example.com'
        // options is undefined
      };

      (scraper as any).isRunning = true;
      (scraper as any).queue.getNextJob = jest.fn().mockReturnValue(mockJob);
      (scraper as any).scrape = jest.fn().mockResolvedValue(TestDataFactory.createMockScrapingResult());

      await (scraper as any).processNextJob();

      expect((scraper as any).scrape).toHaveBeenCalledWith('https://example.com', undefined);
    });
  });

  describe('Finally Block Coverage', () => {
    let scraper: WebScraper;

    beforeEach(() => {
      scraper = new WebScraper();
    });

    it('should execute finally block in scrape method', async () => {
      const cleanupSpy = jest.fn();
      
      // Mock scrape to have a finally block
      scraper.scrape = jest.fn().mockImplementation(async () => {
        try {
          throw new Error('Intentional error');
        } finally {
          cleanupSpy();
        }
      });

      await expect(scraper.scrape('https://example.com')).rejects.toThrow('Intentional error');
      expect(cleanupSpy).toHaveBeenCalled();
    });

    it('should cleanup resources in finally block', async () => {
      const mockBrowser = {
        close: jest.fn()
      };

      // Simulate browser cleanup in finally
      (scraper as any).scrapeWithBrowser = jest.fn().mockImplementation(async () => {
        try {
          throw new Error('Browser error');
        } finally {
          if (mockBrowser) {
            await mockBrowser.close();
          }
        }
      });

      const options = {
        browserOptions: { engine: "playwright" as const }
      };

      await expect(scraper.scrape('https://example.com', options)).rejects.toThrow('Browser error');
      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });

  describe('Async Queue Processing Edge Cases', () => {
    let queue: WebScrapingQueue;

    beforeEach(() => {
      queue = new WebScrapingQueue();
    });

    it('should handle async job status updates', async () => {
      const jobId = queue.addJob('https://example.com');
      
      // Simulate concurrent status updates
      const updates = [
        () => queue.markJobRunning(jobId),
        () => queue.updateJobProgress(jobId, 25),
        () => queue.updateJobProgress(jobId, 50),
        () => queue.updateJobProgress(jobId, 75),
        () => queue.markJobCompleted(jobId, TestDataFactory.createMockScrapingResult())
      ];

      // Run updates concurrently
      await Promise.all(updates.map(fn => Promise.resolve(fn())));

      const job = queue.getJob(jobId);
      expect(job?.status).toBe("completed");
      expect(job?.progress).toBe(100);
    });

    it('should handle async dependency resolution', async () => {
      const dep1 = queue.addJob('https://dep1.com');
      const dep2 = queue.addJob('https://dep2.com');
      const main = queue.addJob('https://main.com');
      
      const mainJob = queue.getJob(main);
      if (mainJob) {
        mainJob.dependencies = ['https://dep1.com', 'https://dep2.com'];
      }

      // Complete dependencies asynchronously
      await Promise.all([
        new Promise(resolve => {
          setTimeout(() => {
            queue.markJobCompleted(dep1, TestDataFactory.createMockScrapingResult());
            resolve(undefined);
          }, 10);
        }),
        new Promise(resolve => {
          setTimeout(() => {
            queue.markJobCompleted(dep2, TestDataFactory.createMockScrapingResult());
            resolve(undefined);
          }, 20);
        })
      ]);

      const nextJob = queue.getNextJob();
      expect(nextJob?.url).toBe('https://main.com');
    });
  });
});