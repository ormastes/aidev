/**
 * Unit tests for Web Scraper Engine
 */

import { ScraperEngine } from '../../src/scraper-engine';
import { ScraperConfig, ScraperResult, SelectorType } from '../../src/types';

describe('ScraperEngine', () => {
  let scraper: ScraperEngine;

  beforeEach(() => {
    scraper = new ScraperEngine();
  });

  describe('parseHTML', () => {
    it('should parse valid HTML', () => {
      const html = '<div><h1>Title</h1><p>Content</p></div>';
      const doc = scraper.parseHTML(html);

      expect(doc).toBeDefined();
      expect(doc.querySelector('h1')?.textContent).toBe('Title');
      expect(doc.querySelector('p')?.textContent).toBe('Content');
    });

    it('should handle malformed HTML', () => {
      const html = '<div><h1>Title<p>Content</div>';
      const doc = scraper.parseHTML(html);

      expect(doc).toBeDefined();
      // Parser should auto-correct the structure
      expect(doc.querySelector('h1')).toBeDefined();
      expect(doc.querySelector('p')).toBeDefined();
    });

    it('should preserve attributes', () => {
      const html = '<a href="https://example.com" class="link">Click</a>';
      const doc = scraper.parseHTML(html);
      const link = doc.querySelector('a');

      expect(link?.getAttribute('href')).toBe('https://example.com');
      expect(link?.getAttribute('class')).toBe('link');
    });
  });

  describe('extractData', () => {
    const sampleHTML = `
      <html>
        <body>
          <div class="product">
            <h2 class="title">Product 1</h2>
            <span class="price">$19.99</span>
          </div>
          <div class="product">
            <h2 class="title">Product 2</h2>
            <span class="price">$29.99</span>
          </div>
        </body>
      </html>
    `;

    it('should extract data using CSS selectors', async () => {
      const config: ScraperConfig = {
        url: 'https://example.com',
        selectors: {
          title: { selector: '.title', type: SelectorType.TEXT },
          price: { selector: '.price', type: SelectorType.TEXT }
        }
      };

      const result = await scraper.extractData(sampleHTML, config);

      expect(result.data.title).toBe('Product 1');
      expect(result.data.price).toBe('$19.99');
    });

    it('should extract multiple elements', async () => {
      const config: ScraperConfig = {
        url: 'https://example.com',
        selectors: {
          products: { 
            selector: '.product', 
            type: SelectorType.LIST,
            fields: {
              title: { selector: '.title', type: SelectorType.TEXT },
              price: { selector: '.price', type: SelectorType.TEXT }
            }
          }
        }
      };

      const result = await scraper.extractData(sampleHTML, config);

      expect(result.data.products).toHaveLength(2);
      expect(result.data.products[0]).toEqual({
        title: 'Product 1',
        price: '$19.99'
      });
      expect(result.data.products[1]).toEqual({
        title: 'Product 2',
        price: '$29.99'
      });
    });

    it('should extract attributes', async () => {
      const html = '<img src="image.jpg" alt="Test Image" />';
      const config: ScraperConfig = {
        url: 'https://example.com',
        selectors: {
          imageSrc: { selector: 'img', type: SelectorType.ATTRIBUTE, attribute: 'src' },
          imageAlt: { selector: 'img', type: SelectorType.ATTRIBUTE, attribute: 'alt' }
        }
      };

      const result = await scraper.extractData(html, config);

      expect(result.data.imageSrc).toBe('image.jpg');
      expect(result.data.imageAlt).toBe('Test Image');
    });

    it('should handle missing elements gracefully', async () => {
      const config: ScraperConfig = {
        url: 'https://example.com',
        selectors: {
          missing: { selector: '.nonexistent', type: SelectorType.TEXT }
        }
      };

      const result = await scraper.extractData(sampleHTML, config);

      expect(result.data.missing).toBeNull();
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateConfig', () => {
    it('should validate correct config', () => {
      const config: ScraperConfig = {
        url: 'https://example.com',
        selectors: {
          title: { selector: 'h1', type: SelectorType.TEXT }
        }
      };

      expect(() => scraper.validateConfig(config)).not.toThrow();
    });

    it('should reject config without URL', () => {
      const config = {
        selectors: {
          title: { selector: 'h1', type: SelectorType.TEXT }
        }
      } as ScraperConfig;

      expect(() => scraper.validateConfig(config)).toThrow('URL is required');
    });

    it('should reject config without selectors', () => {
      const config = {
        url: 'https://example.com'
      } as ScraperConfig;

      expect(() => scraper.validateConfig(config)).toThrow('Selectors are required');
    });

    it('should reject invalid selector type', () => {
      const config = {
        url: 'https://example.com',
        selectors: {
          title: { selector: 'h1', type: 'INVALID' as any }
        }
      };

      expect(() => scraper.validateConfig(config)).toThrow('Invalid selector type');
    });
  });

  describe('transformData', () => {
    it('should apply transformations', () => {
      const data = {
        price: '$19.99',
        title: '  Product Name  ',
        description: 'UPPERCASE TEXT'
      };

      const transformations = {
        price: (value: string) => parseFloat(value.replace('$', '')),
        title: (value: string) => value.trim(),
        description: (value: string) => value.toLowerCase()
      };

      const transformed = scraper.transformData(data, transformations);

      expect(transformed.price).toBe(19.99);
      expect(transformed.title).toBe('Product Name');
      expect(transformed.description).toBe('uppercase text');
    });

    it('should handle transformation errors', () => {
      const data = { value: 'not a number' };
      const transformations = {
        value: (v: string) => {
          const num = parseFloat(v);
          if (isNaN(num)) throw new Error('Invalid number');
          return num;
        }
      };

      expect(() => scraper.transformData(data, transformations))
        .toThrow('Transformation failed for field: value');
    });
  });

  describe('handlePagination', () => {
    it('should detect next page link', () => {
      const html = `
        <div class="pagination">
          <a href="/page/1" class="current">1</a>
          <a href="/page/2" class="next">Next</a>
        </div>
      `;

      const config: ScraperConfig = {
        url: 'https://example.com/page/1',
        selectors: {},
        pagination: {
          nextSelector: '.next',
          limit: 5
        }
      };

      const nextUrl = scraper.detectNextPage(html, config);

      expect(nextUrl).toBe('https://example.com/page/2');
    });

    it('should respect pagination limit', () => {
      const config: ScraperConfig = {
        url: 'https://example.com',
        selectors: {},
        pagination: {
          nextSelector: '.next',
          limit: 3
        }
      };

      const shouldContinue = scraper.shouldContinuePagination(config, 3);

      expect(shouldContinue).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      const config: ScraperConfig = {
        url: 'https://invalid-domain-that-does-not-exist.com',
        selectors: {
          title: { selector: 'h1', type: SelectorType.TEXT }
        }
      };

      const result = await scraper.scrape(config);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Failed to fetch');
    });

    it('should timeout on slow responses', async () => {
      const config: ScraperConfig = {
        url: 'https://example.com',
        selectors: {
          title: { selector: 'h1', type: SelectorType.TEXT }
        },
        timeout: 1 // 1ms timeout
      };

      const result = await scraper.scrape(config);

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('timeout');
    });
  });

  describe('rate limiting', () => {
    it('should respect rate limit delay', async () => {
      const config: ScraperConfig = {
        url: 'https://example.com',
        selectors: {},
        rateLimit: {
          delay: 100,
          concurrent: 1
        }
      };

      const start = Date.now();
      await scraper.applyRateLimit(config);
      await scraper.applyRateLimit(config);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(100);
    });
  });
});