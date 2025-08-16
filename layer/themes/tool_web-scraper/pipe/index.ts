/**
 * web-scraper theme pipe gateway
 * All external access to this theme must go through this file
 * Complete Web Scraper functionality with all modules
 */

// Core scraper functionality
export { default as WebScraper, ScrapingJob, ScrapingOptions, ScrapingResult, ScrapingProgress, WebScrapingQueue, WebScrapingCache } from '../src/web-scraper';

// Parser module - HTML/XML parsing
export { HTMLParser, DOMNode, DOMTraversal, ParseOptions } from '../children/parser';

// Selector module - CSS/XPath selectors
export { CSSSelector, XPathSelector, SelectorToken, SelectorGroup, Selector } from '../children/selector';

// Fetcher module - HTTP fetching with advanced features
export { 
  Fetcher, 
  FetchResult, 
  FetchOptions, 
  ProxyConfig, 
  RateLimitConfig, 
  RetryConfig, 
  RobotsInfo,
  RateLimiter,
  SessionManager 
} from '../children/fetcher';

// Extractor module - Data extraction and validation
export { 
  SchemaExtractor,
  PatternExtractor,
  StructuredDataExtractor,
  DataValidator,
  ExtractionRule,
  ExtractionSchema,
  ExtractionResult,
  SchemaValidationOptions
} from '../children/extractor';

// Exporter module - Multiple export formats and destinations
export {
  DataExporter,
  FileExporter,
  DatabaseExporter,
  CloudExporter,
  WebhookExporter,
  ExportConfig,
  ExportOptions,
  ExportResult,
  DatabaseConfig,
  S3Config,
  WebhookConfig
} from '../children/exporter';

// CLI application
export { default as CLI } from '../src/cli';

// API Server
export { default as WebScraperAPI } from '../src/server';

// Utility types and interfaces
export interface WebScraperConfig {
  rateLimitConfig?: RateLimitConfig;
  concurrency?: number;
  cacheEnabled?: boolean;
  defaultExportFormat?: 'json' | 'csv' | 'xml';
  outputDirectory?: string;
  browserEngine?: 'puppeteer' | 'playwright';
}

// Factory functions for easier usage
export function createWebScraper(config?: WebScraperConfig): WebScraper {
  const scraper = new WebScraper(config?.rateLimitConfig);
  
  if (config?.concurrency) {
    scraper.setConcurrency(config.concurrency);
  }
  
  return scraper;
}

export function createHTMLParser(options?: ParseOptions): HTMLParser {
  return new HTMLParser(options);
}

export function createFetcher(rateLimitConfig?: RateLimitConfig, retryConfig?: Partial<RetryConfig>): Fetcher {
  return new Fetcher(rateLimitConfig, retryConfig);
}

export function createExtractor(): SchemaExtractor {
  return new SchemaExtractor();
}

export function createExporter(options?: ExportOptions): DataExporter {
  return new DataExporter(options);
}

export function createSelector(): CSSSelector {
  return new CSSSelector();
}

// Pre-built extraction schemas
export const BuiltInSchemas = {
  ECOMMERCE_PRODUCT: {
    name: 'ecommerce-product',
    description: 'Extract product information from e-commerce sites',
    rules: [
      { name: 'title', selector: 'h1, .product-title, [data-testid*="title"]', required: true },
      { name: 'price', selector: '.price, .product-price, [data-testid*="price"]' },
      { name: 'description', selector: '.description, .product-description' },
      { name: 'images', selector: '.product-image img, .gallery img', attribute: 'src', multiple: true },
      { name: 'availability', selector: '.availability, .stock-status' },
      { name: 'rating', selector: '.rating, .stars, [data-testid*="rating"]' },
      { name: 'reviews', selector: '.review-count, .reviews-count' }
    ]
  },
  
  NEWS_ARTICLE: {
    name: 'news-article',
    description: 'Extract article content from news sites',
    rules: [
      { name: 'headline', selector: 'h1, .headline, .article-title', required: true },
      { name: 'author', selector: '.author, .byline, [rel="author"]' },
      { name: 'publishDate', selector: '.publish-date, .date, time', attribute: 'datetime' },
      { name: 'content', selector: '.article-content, .post-content, main p', multiple: true },
      { name: 'tags', selector: '.tags a, .categories a', multiple: true },
      { name: 'summary', selector: '.summary, .excerpt, .lead' }
    ]
  },
  
  CONTACT_INFO: {
    name: 'contact-info',
    description: 'Extract contact information from web pages',
    rules: [
      { name: 'name', selector: '.name, .contact-name, h1, h2' },
      { name: 'email', selector: 'a[href^="mailto:"], .email' },
      { name: 'phone', selector: 'a[href^="tel:"], .phone' },
      { name: 'address', selector: '.address, .location' },
      { name: 'website', selector: 'a[href^="http"]', attribute: 'href' },
      { name: 'socialMedia', selector: '.social a, [class*="social"] a', attribute: 'href', multiple: true }
    ]
  },
  
  JOB_LISTING: {
    name: 'job-listing',
    description: 'Extract job posting information',
    rules: [
      { name: 'title', selector: 'h1, .job-title, .position-title', required: true },
      { name: 'company', selector: '.company-name, .employer' },
      { name: 'location', selector: '.location, .job-location' },
      { name: 'salary', selector: '.salary, .pay, .compensation' },
      { name: 'description', selector: '.job-description, .description' },
      { name: 'requirements', selector: '.requirements, .qualifications' },
      { name: 'benefits', selector: '.benefits, .perks' },
      { name: 'postDate', selector: '.post-date, .posted', attribute: 'datetime' }
    ]
  },
  
  REAL_ESTATE: {
    name: 'real-estate',
    description: 'Extract property listing information',
    rules: [
      { name: 'price', selector: '.price, .listing-price', required: true },
      { name: 'address', selector: '.address, .property-address' },
      { name: 'bedrooms', selector: '.beds, .bedrooms' },
      { name: 'bathrooms', selector: '.baths, .bathrooms' },
      { name: 'squareFootage', selector: '.sqft, .square-feet' },
      { name: 'description', selector: '.description, .property-description' },
      { name: 'images', selector: '.property-photo img', attribute: 'src', multiple: true },
      { name: 'features', selector: '.features li, .amenities li', multiple: true }
    ]
  }
};

// Quick start functions
export async function quickScrape(url: string, schema?: keyof typeof BuiltInSchemas | ExtractionSchema, options?: ScrapingOptions): Promise<ScrapingResult> {
  const scraper = createWebScraper();
  
  if (typeof schema === 'string' && BuiltInSchemas[schema]) {
    scraper.addSchema(BuiltInSchemas[schema] as ExtractionSchema);
    options = { ...options, schema: BuiltInSchemas[schema].name };
  } else if (typeof schema === 'object') {
    scraper.addSchema(schema);
    options = { ...options, schema: schema.name };
  }
  
  try {
    return await scraper.scrape(url, options);
  } finally {
    await scraper.cleanup();
  }
}

export async function quickBatchScrape(urls: string[], schema?: keyof typeof BuiltInSchemas | ExtractionSchema, options?: ScrapingOptions): Promise<ScrapingResult[]> {
  const scraper = createWebScraper();
  
  if (typeof schema === 'string' && BuiltInSchemas[schema]) {
    scraper.addSchema(BuiltInSchemas[schema] as ExtractionSchema);
    options = { ...options, schema: BuiltInSchemas[schema].name };
  } else if (typeof schema === 'object') {
    scraper.addSchema(schema);
    options = { ...options, schema: schema.name };
  }
  
  try {
    return await scraper.scrapeBatch(urls, options);
  } finally {
    await scraper.cleanup();
  }
}

// Helper function to validate URLs
export function validateUrl(url: string): { valid: boolean; error?: string } {
  try {
    new URL(url);
    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

// Helper function to test selectors
export async function testSelector(url: string, selector: string, selectorType: 'css' | 'xpath' = 'css'): Promise<string[]> {
  const scraper = createWebScraper();
  
  try {
    const options: ScrapingOptions = {
      extractionOptions: {
        customSelectors: { test: selector }
      }
    };
    
    const result = await scraper.scrape(url, options);
    return Array.isArray(result.data.test) ? result.data.test : result.data.test ? [result.data.test] : [];
  } finally {
    await scraper.cleanup();
  }
}

// Export everything as default for convenience
export default {
  WebScraper,
  HTMLParser,
  CSSSelector,
  XPathSelector,
  Fetcher,
  SchemaExtractor,
  PatternExtractor,
  StructuredDataExtractor,
  DataExporter,
  CLI,
  WebScraperAPI,
  createWebScraper,
  createHTMLParser,
  createFetcher,
  createExtractor,
  createExporter,
  createSelector,
  quickScrape,
  quickBatchScrape,
  testSelector,
  validateUrl,
  BuiltInSchemas
};
