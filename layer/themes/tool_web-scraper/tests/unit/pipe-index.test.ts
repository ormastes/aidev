import * as webScraperPipe from '../../pipe/index';
import { WebScraper } from '../../src/web-scraper';
import { HTMLParser } from '../../children/parser';
import { CSSSelector } from '../../children/selector';
import { Fetcher } from '../../children/fetcher';
import { SchemaExtractor } from '../../children/extractor';
import { DataExporter } from '../../children/exporter';

// Mock all dependencies
jest.mock('../../src/web-scraper');
jest.mock('../../children/parser');
jest.mock('../../children/selector');
jest.mock('../../children/fetcher');
jest.mock('../../children/extractor');
jest.mock('../../children/exporter');
jest.mock('../../src/cli');
jest.mock('../../src/server');

describe('web-scraper pipe/index.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('exports', () => {
    it('should export WebScraper and related classes', () => {
      expect(webScraperPipe.WebScraper).toBeDefined();
      expect(webScraperPipe.WebScrapingQueue).toBeDefined();
      expect(webScraperPipe.WebScrapingCache).toBeDefined();
    });

    it('should export parser module', () => {
      expect(webScraperPipe.HTMLParser).toBeDefined();
    });

    it('should export selector module', () => {
      expect(webScraperPipe.CSSSelector).toBeDefined();
      expect(webScraperPipe.XPathSelector).toBeDefined();
    });

    it('should export fetcher module', () => {
      expect(webScraperPipe.Fetcher).toBeDefined();
    });

    it('should export extractor module', () => {
      expect(webScraperPipe.SchemaExtractor).toBeDefined();
      expect(webScraperPipe.PatternExtractor).toBeDefined();
      expect(webScraperPipe.StructuredDataExtractor).toBeDefined();
    });

    it('should export exporter module', () => {
      expect(webScraperPipe.DataExporter).toBeDefined();
      expect(webScraperPipe.FileExporter).toBeDefined();
      expect(webScraperPipe.DatabaseExporter).toBeDefined();
      expect(webScraperPipe.CloudExporter).toBeDefined();
      expect(webScraperPipe.WebhookExporter).toBeDefined();
    });

    it('should export CLI and API server', () => {
      expect(webScraperPipe.CLI).toBeDefined();
      expect(webScraperPipe.WebScraperAPI).toBeDefined();
    });

    it('should export default object with all exports', () => {
      expect(webScraperPipe.default).toBeDefined();
      expect(webScraperPipe.default.WebScraper).toBeDefined();
      expect(webScraperPipe.default.HTMLParser).toBeDefined();
      expect(webScraperPipe.default.createWebScraper).toBeDefined();
    });
  });

  describe('factory functions', () => {
    describe("createWebScraper", () => {
      it('should create a WebScraper instance with default config', () => {
        const mockScraper = new WebScraper();
        (WebScraper as jest.MockedClass<typeof WebScraper>).mockImplementation(() => mockScraper);
        
        const scraper = webScraperPipe.createWebScraper();
        
        expect(WebScraper).toHaveBeenCalledWith(undefined);
        expect(scraper).toBe(mockScraper);
      });

      it('should create WebScraper with rate limit config', () => {
        const mockScraper = new WebScraper();
        (WebScraper as jest.MockedClass<typeof WebScraper>).mockImplementation(() => mockScraper);
        
        const config: webScraperPipe.WebScraperConfig = {
          rateLimitConfig: {
            requestsPerSecond: 2,
            requestsPerMinute: 100
          }
        };
        
        const scraper = webScraperPipe.createWebScraper(config);
        
        expect(WebScraper).toHaveBeenCalledWith(config.rateLimitConfig);
        expect(scraper).toBe(mockScraper);
      });

      it('should set concurrency when provided', () => {
        const mockScraper = new WebScraper();
        mockScraper.setConcurrency = jest.fn();
        (WebScraper as jest.MockedClass<typeof WebScraper>).mockImplementation(() => mockScraper);
        
        const config: webScraperPipe.WebScraperConfig = {
          concurrency: 10
        };
        
        const scraper = webScraperPipe.createWebScraper(config);
        
        expect(mockScraper.setConcurrency).toHaveBeenCalledWith(10);
        expect(scraper).toBe(mockScraper);
      });
    });

    describe("createHTMLParser", () => {
      it('should create an HTMLParser instance', () => {
        const mockParser = new HTMLParser();
        (HTMLParser as jest.MockedClass<typeof HTMLParser>).mockImplementation(() => mockParser);
        
        const parser = webScraperPipe.createHTMLParser();
        
        expect(HTMLParser).toHaveBeenCalledWith(undefined);
        expect(parser).toBe(mockParser);
      });

      it('should create HTMLParser with options', () => {
        const mockParser = new HTMLParser();
        (HTMLParser as jest.MockedClass<typeof HTMLParser>).mockImplementation(() => mockParser);
        
        const options = { strict: true };
        const parser = webScraperPipe.createHTMLParser(options);
        
        expect(HTMLParser).toHaveBeenCalledWith(options);
        expect(parser).toBe(mockParser);
      });
    });

    describe("createFetcher", () => {
      it('should create a Fetcher instance', () => {
        const mockFetcher = new Fetcher();
        (Fetcher as jest.MockedClass<typeof Fetcher>).mockImplementation(() => mockFetcher);
        
        const fetcher = webScraperPipe.createFetcher();
        
        expect(Fetcher).toHaveBeenCalledWith(undefined, undefined);
        expect(fetcher).toBe(mockFetcher);
      });

      it('should create Fetcher with config', () => {
        const mockFetcher = new Fetcher();
        (Fetcher as jest.MockedClass<typeof Fetcher>).mockImplementation(() => mockFetcher);
        
        const rateLimitConfig = { requestsPerSecond: 1 };
        const retryConfig = { maxRetries: 5 };
        
        const fetcher = webScraperPipe.createFetcher(rateLimitConfig, retryConfig);
        
        expect(Fetcher).toHaveBeenCalledWith(rateLimitConfig, retryConfig);
        expect(fetcher).toBe(mockFetcher);
      });
    });

    describe("createExtractor", () => {
      it('should create a SchemaExtractor instance', () => {
        const mockExtractor = new SchemaExtractor();
        (SchemaExtractor as jest.MockedClass<typeof SchemaExtractor>).mockImplementation(() => mockExtractor);
        
        const extractor = webScraperPipe.createExtractor();
        
        expect(SchemaExtractor).toHaveBeenCalled();
        expect(extractor).toBe(mockExtractor);
      });
    });

    describe("createExporter", () => {
      it('should create a DataExporter instance', () => {
        const mockExporter = new DataExporter();
        (DataExporter as jest.MockedClass<typeof DataExporter>).mockImplementation(() => mockExporter);
        
        const exporter = webScraperPipe.createExporter();
        
        expect(DataExporter).toHaveBeenCalledWith(undefined);
        expect(exporter).toBe(mockExporter);
      });

      it('should create DataExporter with options', () => {
        const mockExporter = new DataExporter();
        (DataExporter as jest.MockedClass<typeof DataExporter>).mockImplementation(() => mockExporter);
        
        const options = { format: 'json' as const };
        const exporter = webScraperPipe.createExporter(options);
        
        expect(DataExporter).toHaveBeenCalledWith(options);
        expect(exporter).toBe(mockExporter);
      });
    });

    describe("createSelector", () => {
      it('should create a CSSSelector instance', () => {
        const mockSelector = new CSSSelector();
        (CSSSelector as jest.MockedClass<typeof CSSSelector>).mockImplementation(() => mockSelector);
        
        const selector = webScraperPipe.createSelector();
        
        expect(CSSSelector).toHaveBeenCalled();
        expect(selector).toBe(mockSelector);
      });
    });
  });

  describe("BuiltInSchemas", () => {
    it('should provide ECOMMERCE_PRODUCT schema', () => {
      const schema = webScraperPipe.BuiltInSchemas.ECOMMERCE_PRODUCT;
      
      expect(schema.name).toBe('ecommerce-product');
      expect(schema.description).toContain('e-commerce');
      expect(schema.rules).toBeDefined();
      expect(schema.rules.length).toBeGreaterThan(0);
      expect(schema.rules.find(r => r.name === 'title')).toBeDefined();
      expect(schema.rules.find(r => r.name === 'price')).toBeDefined();
    });

    it('should provide NEWS_ARTICLE schema', () => {
      const schema = webScraperPipe.BuiltInSchemas.NEWS_ARTICLE;
      
      expect(schema.name).toBe('news-article');
      expect(schema.description).toContain('news');
      expect(schema.rules.find(r => r.name === "headline")).toBeDefined();
      expect(schema.rules.find(r => r.name === 'author')).toBeDefined();
    });

    it('should provide CONTACT_INFO schema', () => {
      const schema = webScraperPipe.BuiltInSchemas.CONTACT_INFO;
      
      expect(schema.name).toBe('contact-info');
      expect(schema.rules.find(r => r.name === 'email')).toBeDefined();
      expect(schema.rules.find(r => r.name === 'phone')).toBeDefined();
    });

    it('should provide JOB_LISTING schema', () => {
      const schema = webScraperPipe.BuiltInSchemas.JOB_LISTING;
      
      expect(schema.name).toBe('job-listing');
      expect(schema.rules.find(r => r.name === 'title')).toBeDefined();
      expect(schema.rules.find(r => r.name === 'company')).toBeDefined();
      expect(schema.rules.find(r => r.name === 'salary')).toBeDefined();
    });

    it('should provide REAL_ESTATE schema', () => {
      const schema = webScraperPipe.BuiltInSchemas.REAL_ESTATE;
      
      expect(schema.name).toBe('real-estate');
      expect(schema.rules.find(r => r.name === 'price')).toBeDefined();
      expect(schema.rules.find(r => r.name === "bedrooms")).toBeDefined();
      expect(schema.rules.find(r => r.name === "bathrooms")).toBeDefined();
    });
  });

  describe('quick helper functions', () => {
    describe("quickScrape", () => {
      it('should perform a quick scrape with default options', async () => {
        const mockScraper = {
          scrape: jest.fn().mockResolvedValue({ url: 'https://example.com', data: {} }),
          cleanup: jest.fn(),
          addSchema: jest.fn()
        };
        
        (WebScraper as jest.MockedClass<typeof WebScraper>).mockImplementation(() => mockScraper as any);
        
        const result = await webScraperPipe.quickScrape('https://example.com');
        
        expect(mockScraper.scrape).toHaveBeenCalledWith('https://example.com', undefined);
        expect(mockScraper.cleanup).toHaveBeenCalled();
        expect(result.url).toBe('https://example.com');
      });

      it('should use built-in schema when provided as string', async () => {
        const mockScraper = {
          scrape: jest.fn().mockResolvedValue({ url: 'https://example.com', data: {} }),
          cleanup: jest.fn(),
          addSchema: jest.fn()
        };
        
        (WebScraper as jest.MockedClass<typeof WebScraper>).mockImplementation(() => mockScraper as any);
        
        await webScraperPipe.quickScrape('https://example.com', 'ECOMMERCE_PRODUCT');
        
        expect(mockScraper.addSchema).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'ecommerce-product' })
        );
        expect(mockScraper.scrape).toHaveBeenCalledWith(
          'https://example.com',
          expect.objectContaining({ schema: 'ecommerce-product' })
        );
      });

      it('should use custom schema when provided as object', async () => {
        const mockScraper = {
          scrape: jest.fn().mockResolvedValue({ url: 'https://example.com', data: {} }),
          cleanup: jest.fn(),
          addSchema: jest.fn()
        };
        
        (WebScraper as jest.MockedClass<typeof WebScraper>).mockImplementation(() => mockScraper as any);
        
        const customSchema = {
          name: 'custom',
          url: 'https://example.com',
          selectors: {},
          validation: {}
        };
        
        await webScraperPipe.quickScrape('https://example.com', customSchema);
        
        expect(mockScraper.addSchema).toHaveBeenCalledWith(customSchema);
        expect(mockScraper.scrape).toHaveBeenCalledWith(
          'https://example.com',
          expect.objectContaining({ schema: 'custom' })
        );
      });

      it('should cleanup even on error', async () => {
        const mockScraper = {
          scrape: jest.fn().mockRejectedValue(new Error('Scrape failed')),
          cleanup: jest.fn(),
          addSchema: jest.fn()
        };
        
        (WebScraper as jest.MockedClass<typeof WebScraper>).mockImplementation(() => mockScraper as any);
        
        await expect(webScraperPipe.quickScrape('https://example.com')).rejects.toThrow('Scrape failed');
        
        expect(mockScraper.cleanup).toHaveBeenCalled();
      });
    });

    describe("quickBatchScrape", () => {
      it('should perform batch scrape', async () => {
        const mockResults = [
          { url: 'https://example1.com', data: {} },
          { url: 'https://example2.com', data: {} }
        ];
        
        const mockScraper = {
          scrapeBatch: jest.fn().mockResolvedValue(mockResults),
          cleanup: jest.fn(),
          addSchema: jest.fn()
        };
        
        (WebScraper as jest.MockedClass<typeof WebScraper>).mockImplementation(() => mockScraper as any);
        
        const urls = ['https://example1.com', 'https://example2.com'];
        const results = await webScraperPipe.quickBatchScrape(urls);
        
        expect(mockScraper.scrapeBatch).toHaveBeenCalledWith(urls, undefined);
        expect(mockScraper.cleanup).toHaveBeenCalled();
        expect(results).toEqual(mockResults);
      });

      it('should use schema for batch scrape', async () => {
        const mockScraper = {
          scrapeBatch: jest.fn().mockResolvedValue([]),
          cleanup: jest.fn(),
          addSchema: jest.fn()
        };
        
        (WebScraper as jest.MockedClass<typeof WebScraper>).mockImplementation(() => mockScraper as any);
        
        const urls = ['https://example.com'];
        await webScraperPipe.quickBatchScrape(urls, 'NEWS_ARTICLE');
        
        expect(mockScraper.addSchema).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'news-article' })
        );
        expect(mockScraper.scrapeBatch).toHaveBeenCalledWith(
          urls,
          expect.objectContaining({ schema: 'news-article' })
        );
      });

      it('should cleanup even on batch error', async () => {
        const mockScraper = {
          scrapeBatch: jest.fn().mockRejectedValue(new Error('Batch failed')),
          cleanup: jest.fn(),
          addSchema: jest.fn()
        };
        
        (WebScraper as jest.MockedClass<typeof WebScraper>).mockImplementation(() => mockScraper as any);
        
        await expect(webScraperPipe.quickBatchScrape(['https://example.com'])).rejects.toThrow('Batch failed');
        
        expect(mockScraper.cleanup).toHaveBeenCalled();
      });
    });

    describe("validateUrl", () => {
      it('should validate correct URLs', () => {
        const result = webScraperPipe.validateUrl('https://example.com');
        
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should validate URLs with paths and queries', () => {
        const result = webScraperPipe.validateUrl('https://example.com/path?query=1#hash');
        
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should reject invalid URLs', () => {
        const result = webScraperPipe.validateUrl('not-a-url');
        
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Invalid URL format');
      });

      it('should reject empty strings', () => {
        const result = webScraperPipe.validateUrl('');
        
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Invalid URL format');
      });
    });

    describe("testSelector", () => {
      it('should test CSS selector on a URL', async () => {
        const mockScraper = {
          scrape: jest.fn().mockResolvedValue({
            url: 'https://example.com',
            data: { test: ['Result 1', 'Result 2'] }
          }),
          cleanup: jest.fn()
        };
        
        (WebScraper as jest.MockedClass<typeof WebScraper>).mockImplementation(() => mockScraper as any);
        
        const results = await webScraperPipe.testSelector('https://example.com', '.test-class');
        
        expect(mockScraper.scrape).toHaveBeenCalledWith(
          'https://example.com',
          expect.objectContaining({
            extractionOptions: {
              customSelectors: { test: '.test-class' }
            }
          })
        );
        expect(results).toEqual(['Result 1', 'Result 2']);
        expect(mockScraper.cleanup).toHaveBeenCalled();
      });

      it('should handle single result', async () => {
        const mockScraper = {
          scrape: jest.fn().mockResolvedValue({
            url: 'https://example.com',
            data: { test: 'Single Result' }
          }),
          cleanup: jest.fn()
        };
        
        (WebScraper as jest.MockedClass<typeof WebScraper>).mockImplementation(() => mockScraper as any);
        
        const results = await webScraperPipe.testSelector('https://example.com', '#id');
        
        expect(results).toEqual(['Single Result']);
      });

      it('should handle no results', async () => {
        const mockScraper = {
          scrape: jest.fn().mockResolvedValue({
            url: 'https://example.com',
            data: {}
          }),
          cleanup: jest.fn()
        };
        
        (WebScraper as jest.MockedClass<typeof WebScraper>).mockImplementation(() => mockScraper as any);
        
        const results = await webScraperPipe.testSelector('https://example.com', '.nonexistent');
        
        expect(results).toEqual([]);
      });

      it('should cleanup even on selector test error', async () => {
        const mockScraper = {
          scrape: jest.fn().mockRejectedValue(new Error('Test failed')),
          cleanup: jest.fn()
        };
        
        (WebScraper as jest.MockedClass<typeof WebScraper>).mockImplementation(() => mockScraper as any);
        
        await expect(webScraperPipe.testSelector('https://example.com', '.test')).rejects.toThrow('Test failed');
        
        expect(mockScraper.cleanup).toHaveBeenCalled();
      });
    });
  });

  describe('WebScraperConfig interface', () => {
    it('should accept valid configuration', () => {
      const config: webScraperPipe.WebScraperConfig = {
        rateLimitConfig: { requestsPerSecond: 1 },
        concurrency: 10,
        cacheEnabled: true,
        defaultExportFormat: 'json',
        outputDirectory: '/tmp/output',
        browserEngine: "puppeteer"
      };
      
      expect(config.rateLimitConfig?.requestsPerSecond).toBe(1);
      expect(config.concurrency).toBe(10);
      expect(config.cacheEnabled).toBe(true);
    });

    it('should allow partial configuration', () => {
      const config: webScraperPipe.WebScraperConfig = {
        concurrency: 5
      };
      
      expect(config.concurrency).toBe(5);
      expect(config.rateLimitConfig).toBeUndefined();
    });
  });
});