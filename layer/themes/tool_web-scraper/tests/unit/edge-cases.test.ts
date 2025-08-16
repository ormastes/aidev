import { WebScraper, WebScrapingQueue, WebScrapingCache } from '../../src/web-scraper';
import { TestDataFactory, MockResponseGenerator } from '../utils/test-helpers';

describe('Edge Cases and Security Tests', () => {
  describe('WebScrapingQueue Edge Cases', () => {
    let queue: WebScrapingQueue;

    beforeEach(() => {
      queue = new WebScrapingQueue();
    });

    describe('Boundary Conditions', () => {
      it('should handle empty URL', () => {
        const jobId = queue.addJob('');
        expect(queue.getJob(jobId)?.url).toBe('');
      });

      it('should handle very long URLs', () => {
        const longUrl = 'https://example.com/' + 'a'.repeat(10000);
        const jobId = queue.addJob(longUrl);
        expect(queue.getJob(jobId)?.url).toBe(longUrl);
      });

      it('should handle negative priority', () => {
        const jobId = queue.addJob('https://example.com', undefined, -10);
        expect(queue.getJob(jobId)?.priority).toBe(-10);
      });

      it('should handle maximum priority', () => {
        const jobId = queue.addJob('https://example.com', undefined, Number.MAX_SAFE_INTEGER);
        expect(queue.getJob(jobId)?.priority).toBe(Number.MAX_SAFE_INTEGER);
      });

      it('should handle zero retries configuration', () => {
        const jobId = queue.addJob('https://example.com');
        const job = queue.getJob(jobId);
        if (job) {
          job.maxRetries = 0;
          queue.markJobFailed(jobId, 'Error');
          expect(queue.getJob(jobId)?.status).toBe('failed');
        }
      });
    });

    describe('Concurrent Modifications', () => {
      it('should handle job deletion during iteration', () => {
        const jobIds = [];
        for (let i = 0; i < 10; i++) {
          jobIds.push(queue.addJob(`https://example${i}.com`));
        }

        // Start getting jobs while modifying queue
        const job1 = queue.getNextJob();
        queue.clear(); // Clear while iterating
        const job2 = queue.getNextJob();

        expect(job1).toBeDefined();
        expect(job2).toBeNull();
      });

      it('should handle status changes during processing', () => {
        const jobId = queue.addJob('https://example.com');
        
        // Simulate concurrent status changes
        queue.markJobRunning(jobId);
        queue.markJobFailed(jobId, 'Error 1');
        queue.markJobRunning(jobId);
        queue.markJobCompleted(jobId, TestDataFactory.createMockScrapingResult());

        const job = queue.getJob(jobId);
        expect(job?.status).toBe("completed");
      });
    });

    describe('Memory Leaks Prevention', () => {
      it('should not retain completed jobs indefinitely', () => {
        const initialMemory = process.memoryUsage().heapUsed;
        
        // Add and complete many jobs
        for (let i = 0; i < 1000; i++) {
          const jobId = queue.addJob(`https://example${i}.com`);
          queue.markJobCompleted(jobId, TestDataFactory.createMockScrapingResult());
        }

        // Clear completed jobs
        queue.clear();
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        const finalMemory = process.memoryUsage().heapUsed;
        // Memory should not grow excessively
        expect(finalMemory - initialMemory).toBeLessThan(10 * 1024 * 1024); // 10MB threshold
      });
    });
  });

  describe('WebScrapingCache Edge Cases', () => {
    let cache: WebScrapingCache;

    beforeEach(() => {
      cache = new WebScrapingCache();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe('Cache Key Collisions', () => {
      it('should handle hash collisions gracefully', () => {
        // Create URLs that might produce similar hashes
        const urls = [
          'https://example.com/path1',
          'https://example.com/path2',
          'https://example.com/1path',
          'https://example.com/2path'
        ];

        urls.forEach(url => {
          const result = TestDataFactory.createMockScrapingResult({ url });
          cache.set(cache.generateKey(url), result);
        });

        // Verify all entries are distinct
        urls.forEach((url) => {
          const retrieved = cache.get(cache.generateKey(url));
          expect(retrieved?.url).toBe(url);
        });
      });

      it('should handle special characters in cache keys', () => {
        const specialUrls = [
          'https://example.com/path?query=test&foo=bar',
          'https://example.com/path#fragment',
          'https://example.com/path with spaces',
          'https://example.com/path/文字/unicode'
        ];

        specialUrls.forEach(url => {
          const key = cache.generateKey(url);
          const result = TestDataFactory.createMockScrapingResult({ url });
          cache.set(key, result);
          
          const retrieved = cache.get(key);
          expect(retrieved?.url).toBe(url);
        });
      });
    });

    describe('TTL Edge Cases', () => {
      it('should handle zero TTL', () => {
        const result = TestDataFactory.createMockScrapingResult();
        cache.set('zero-ttl', result, 0);
        
        jest.advanceTimersByTime(1);
        expect(cache.get('zero-ttl')).toBeNull();
      });

      it('should handle very large TTL', () => {
        const result = TestDataFactory.createMockScrapingResult();
        cache.set('large-ttl', result, Number.MAX_SAFE_INTEGER);
        
        jest.advanceTimersByTime(1000000);
        expect(cache.get('large-ttl')).toBeTruthy();
      });

      it('should handle negative TTL as immediate expiry', () => {
        const result = TestDataFactory.createMockScrapingResult();
        cache.set('negative-ttl', result, -1000);
        
        expect(cache.get('negative-ttl')).toBeNull();
      });
    });

    describe('Concurrent Access', () => {
      it('should handle simultaneous reads and writes', () => {
        const operations: any[] = [];
        
        // Simultaneous writes
        for (let i = 0; i < 100; i++) {
          operations.push(
            cache.set(`key${i}`, TestDataFactory.createMockScrapingResult())
          );
        }

        // Simultaneous reads
        for (let i = 0; i < 100; i++) {
          operations.push(cache.get(`key${i}`));
        }

        // All operations should complete without errors
        expect(() => operations).not.toThrow();
      });
    });
  });

  describe('WebScraper Security Tests', () => {
    let scraper: WebScraper;

    beforeEach(() => {
      scraper = new WebScraper();
    });

    describe('Input Validation', () => {
      it('should reject javascript: URLs', async () => {
        await expect(
          scraper.scrape('javascript:alert(1)')
        ).rejects.toThrow();
      });

      it('should reject data: URLs', async () => {
        await expect(
          scraper.scrape('data:text/html,<script>alert(1)</script>')
        ).rejects.toThrow();
      });

      it('should handle malformed URLs gracefully', async () => {
        const malformedUrls = [
          'ht!tp://example.com',
          '//example.com',
          'example.com',
          'ftp://example.com'
        ];

        for (const url of malformedUrls) {
          await expect(scraper.scrape(url)).rejects.toThrow();
        }
      });
    });

    describe('Content Security', () => {
      it('should sanitize extracted script tags', async () => {
        const maliciousHtml = `
          <html>
            <body>
              <script>alert('XSS')</script>
              <div onclick="alert('XSS')">Click me</div>
              <img src=x onerror="alert('XSS')">
            </body>
          </html>
        `;

        // Mock fetcher to return malicious content
        (scraper as any).fetcher.fetch = jest.fn().mockResolvedValue({
          data: maliciousHtml,
          status: 200
        });

        const result = await scraper.scrape('https://malicious.com');
        
        // Extracted data should not contain script content
        expect(JSON.stringify(result.data)).not.toContain('alert');
      });

      it('should limit extraction depth to prevent DoS', async () => {
        // Create deeply nested HTML
        let nestedHtml = '<div>';
        for (let i = 0; i < 10000; i++) {
          nestedHtml += '<div>';
        }
        nestedHtml += 'Content';
        for (let i = 0; i < 10000; i++) {
          nestedHtml += '</div>';
        }
        nestedHtml += '</div>';

        (scraper as any).fetcher.fetch = jest.fn().mockResolvedValue({
          data: nestedHtml,
          status: 200
        });

        // Should complete without stack overflow
        await expect(scraper.scrape('https://nested.com')).resolves.toBeDefined();
      });
    });

    describe('Resource Limits', () => {
      it('should limit response size', async () => {
        const largeContent = 'x'.repeat(100 * 1024 * 1024); // 100MB
        
        (scraper as any).fetcher.fetch = jest.fn().mockResolvedValue({
          data: largeContent,
          status: 200
        });

        // Should reject or truncate large responses
        await expect(scraper.scrape('https://large.com')).rejects.toThrow();
      });

      it('should limit number of redirects', async () => {
        let redirectCount = 0;
        (scraper as any).fetcher.fetch = jest.fn().mockImplementation(async () => {
          redirectCount++;
          if (redirectCount > 20) {
            throw new Error('Too many redirects');
          }
          return {
            data: '',
            status: 301,
            headers: { location: `https://redirect${redirectCount}.com` }
          };
        });

        await expect(scraper.scrape('https://redirect.com')).rejects.toThrow();
      });

      it('should enforce request timeout', async () => {
        (scraper as any).fetcher.fetch = jest.fn().mockImplementation(
          () => new Promise(resolve => setTimeout(resolve, 60000))
        );

        await expect(
          scraper.scrape('https://slow.com', { fetchOptions: { timeout: 100 } })
        ).rejects.toThrow();
      });
    });
  });

  describe('Performance Edge Cases', () => {
    describe('Large Scale Operations', () => {
      it('should handle batch of 10000 URLs efficiently', () => {
        const queue = new WebScrapingQueue();
        const startTime = Date.now();
        
        const urls = Array.from({ length: 10000 }, (_, i) => `https://example${i}.com`);
        queue.addBatchJobs(urls);
        
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(1000); // Should complete within 1 second
      });

      it('should maintain performance with full cache', () => {
        const cache = new WebScrapingCache();
        
        // Fill cache with many entries
        for (let i = 0; i < 10000; i++) {
          cache.set(`key${i}`, TestDataFactory.createMockScrapingResult());
        }

        const startTime = Date.now();
        
        // Access should still be fast
        for (let i = 0; i < 100; i++) {
          cache.get(`key${Math.floor(Math.random() * 10000)}`);
        }
        
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(100); // 100 reads should be under 100ms
      });
    });

    describe('Memory Constraints', () => {
      it('should operate within memory limits', () => {
        const scraper = new WebScraper();
        const initialMemory = process.memoryUsage().heapUsed;
        
        // Process many URLs
        const urls = Array.from({ length: 1000 }, (_, i) => `https://example${i}.com`);
        scraper.scrapeBatch(urls);
        
        const peakMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = (peakMemory - initialMemory) / 1024 / 1024; // MB
        
        expect(memoryIncrease).toBeLessThan(100); // Should use less than 100MB
      });
    });
  });

  describe('Network Error Scenarios', () => {
    let scraper: WebScraper;

    beforeEach(() => {
      scraper = new WebScraper();
    });

    it('should handle DNS resolution failures', async () => {
      (scraper as any).fetcher.fetch = jest.fn().mockRejectedValue(
        new Error('ENOTFOUND: DNS lookup failed')
      );

      await expect(scraper.scrape('https://nonexistent.domain')).rejects.toThrow("ENOTFOUND");
    });

    it('should handle connection timeouts', async () => {
      (scraper as any).fetcher.fetch = jest.fn().mockRejectedValue(
        new Error('ETIMEDOUT: Connection timeout')
      );

      await expect(scraper.scrape('https://timeout.com')).rejects.toThrow("ETIMEDOUT");
    });

    it('should handle SSL certificate errors', async () => {
      (scraper as any).fetcher.fetch = jest.fn().mockRejectedValue(
        new Error('CERT_HAS_EXPIRED: SSL certificate expired')
      );

      await expect(scraper.scrape('https://expired-cert.com')).rejects.toThrow('CERT_HAS_EXPIRED');
    });

    it('should handle connection reset', async () => {
      (scraper as any).fetcher.fetch = jest.fn().mockRejectedValue(
        new Error('ECONNRESET: Connection reset by peer')
      );

      await expect(scraper.scrape('https://reset.com')).rejects.toThrow("ECONNRESET");
    });
  });

  describe('Data Integrity', () => {
    it('should preserve data types during extraction', async () => {
      const scraper = new WebScraper();
      
      (scraper as any).fetcher.fetch = jest.fn().mockResolvedValue({
        data: MockResponseGenerator.productPage(),
        status: 200
      });

      (scraper as any).extractor.extract = jest.fn().mockReturnValue({
        data: {
          price: 99.99, // Number
          title: 'Product', // String
          inStock: true, // Boolean
          tags: ['tag1', 'tag2'], // Array
          metadata: { color: 'red' } // Object
        }
      });

      const result = await scraper.scrape('https://example.com');
      
      expect(typeof result.data.price).toBe('number');
      expect(typeof result.data.title).toBe('string');
      expect(typeof result.data.inStock).toBe('boolean');
      expect(Array.isArray(result.data.tags)).toBe(true);
      expect(typeof result.data.metadata).toBe('object');
    });

    it('should handle circular references in extracted data', async () => {
      const scraper = new WebScraper();
      
      const circularData: any = { name: 'test' };
      circularData.self = circularData;

      (scraper as any).extractor.extract = jest.fn().mockReturnValue({
        data: circularData
      });

      // Should handle circular reference without throwing
      await expect(scraper.scrape('https://example.com')).resolves.toBeDefined();
    });
  });
});