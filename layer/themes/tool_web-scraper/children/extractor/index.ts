/**
 * Extractor Module
 * Structured data extraction with pattern matching, schema validation,
 * and type conversion for various data formats
 */

import { DOMNode } from '../parser';
import { CSSSelector } from '../selector';

export interface ExtractionRule {
  name: string;
  selector: string;
  selectorType?: 'css' | 'xpath';
  attribute?: string; // Extract attribute instead of text
  transform?: (value: string, element?: DOMNode) => any;
  multiple?: boolean; // Extract array of values
  required?: boolean;
  defaultValue?: any;
  validation?: {
    type?: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'url';
    pattern?: RegExp;
    min?: number;
    max?: number;
    enum?: any[];
    custom?: (value: any) => boolean;
  };
}

export interface ExtractionSchema {
  name: string;
  description?: string;
  rules: ExtractionRule[];
  globalTransforms?: Array<{
    field: string;
    transform: (value: any, data: Record<string, any>) => any;
  }>;
  postProcessing?: (data: Record<string, any>) => Record<string, any>;
}

export interface ExtractionResult {
  data: Record<string, any>;
  errors: Array<{
    rule: string;
    message: string;
    value?: any;
  }>;
  warnings: Array<{
    rule: string;
    message: string;
    value?: any;
  }>;
  metadata: {
    extractedAt: Date;
    schemaName: string;
    totalRules: number;
    successfulRules: number;
    failedRules: number;
  };
}

export interface SchemaValidationOptions {
  strict?: boolean; // Fail on any validation error
  skipMissing?: boolean; // Skip validation for missing required fields
  coerceTypes?: boolean; // Attempt type coercion
}

export class DataValidator {
  static validate(value: any, validation: ExtractionRule['validation']): { valid: boolean; error?: string; coercedValue?: any } {
    if (!validation) return { valid: true };

    let coercedValue = value;
    const { type, pattern, min, max, enum: enumValues, custom } = validation;

    // Type validation and coercion
    if (type) {
      switch (type) {
        case 'string':
          if (typeof value !== 'string') {
            coercedValue = String(value);
          }
          break;

        case 'number':
          if (typeof value !== 'number') {
            const num = Number(value);
            if (isNaN(num)) {
              return { valid: false, error: `Cannot convert "${value}" to number` };
            }
            coercedValue = num;
          }
          break;

        case 'boolean':
          if (typeof value !== 'boolean') {
            if (value === 'true' || value === '1' || value === 1) {
              coercedValue = true;
            } else if (value === 'false' || value === '0' || value === 0) {
              coercedValue = false;
            } else {
              return { valid: false, error: `Cannot convert "${value}" to boolean` };
            }
          }
          break;

        case 'date':
          if (!(value instanceof Date)) {
            const date = new Date(value);
            if (isNaN(date.getTime())) {
              return { valid: false, error: `Cannot convert "${value}" to date` };
            }
            coercedValue = date;
          }
          break;

        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(String(value))) {
            return { valid: false, error: `"${value}" is not a valid email` };
          }
          break;

        case 'url':
          try {
            new URL(String(value));
          } catch {
            return { valid: false, error: `"${value}" is not a valid URL` };
          }
          break;
      }
    }

    // Pattern validation
    if (pattern && !pattern.test(String(coercedValue))) {
      return { valid: false, error: `Value "${coercedValue}" does not match pattern ${pattern}` };
    }

    // Range validation
    if (typeof coercedValue === 'number' || typeof coercedValue === 'string') {
      const length = typeof coercedValue === 'string' ? coercedValue.length : coercedValue;
      
      if (min !== undefined && length < min) {
        return { 
          valid: false, 
          error: `Value ${typeof coercedValue === 'string' ? 'length' : ''} ${length} is less than minimum ${min}` 
        };
      }
      
      if (max !== undefined && length > max) {
        return { 
          valid: false, 
          error: `Value ${typeof coercedValue === 'string' ? 'length' : ''} ${length} is greater than maximum ${max}` 
        };
      }
    }

    // Enum validation
    if (enumValues && !enumValues.includes(coercedValue)) {
      return { 
        valid: false, 
        error: `Value "${coercedValue}" is not one of allowed values: ${enumValues.join(', ')}` 
      };
    }

    // Custom validation
    if (custom && !custom(coercedValue)) {
      return { valid: false, error: 'Custom validation failed' };
    }

    return { valid: true, coercedValue };
  }
}

export class PatternExtractor {
  // Common extraction patterns
  static readonly PATTERNS = {
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    phone: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    url: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g,
    price: /\$?[\d,]+\.?\d*/g,
    date: /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b|\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/g,
    time: /\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\b/g,
    socialSecurity: /\b\d{3}-\d{2}-\d{4}\b/g,
    zipCode: /\b\d{5}(?:-\d{4})?\b/g,
    creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    hashtag: /#[a-zA-Z0-9_]+/g,
    mention: /@[a-zA-Z0-9_]+/g,
    ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g
  };

  static extractPattern(text: string, pattern: RegExp | keyof typeof PatternExtractor.PATTERNS): string[] {
    const regex = typeof pattern === 'string' ? this.PATTERNS[pattern] : pattern;
    const matches = text.match(regex);
    return matches || [];
  }

  static extractAllPatterns(text: string): Record<string, string[]> {
    const results: Record<string, string[]> = {};
    
    for (const [name, pattern] of Object.entries(this.PATTERNS)) {
      const matches = this.extractPattern(text, pattern);
      if (matches.length > 0) {
        results[name] = matches;
      }
    }
    
    return results;
  }

  // Social media specific patterns
  static extractSocialMediaData(text: string): {
    hashtags: string[];
    mentions: string[];
    urls: string[];
  } {
    return {
      hashtags: this.extractPattern(text, 'hashtag'),
      mentions: this.extractPattern(text, 'mention'),
      urls: this.extractPattern(text, 'url')
    };
  }

  // E-commerce specific patterns
  static extractProductInfo(text: string): {
    prices: string[];
    skus: string[];
    ratings: string[];
  } {
    const skuPattern = /\b[A-Z0-9]{2,}-[A-Z0-9]+\b/g;
    const ratingPattern = /\b\d+(?:\.\d+)?\s*(?:out\s+of\s+|\/\s*)\d+\s*(?:stars?|rating)?\b/gi;
    
    return {
      prices: this.extractPattern(text, 'price'),
      skus: this.extractPattern(text, skuPattern),
      ratings: this.extractPattern(text, ratingPattern)
    };
  }
}

export class StructuredDataExtractor {
  // Extract JSON-LD structured data
  static extractJsonLd(dom: DOMNode): Record<string, any>[] {
    const selector = new CSSSelector();
    const scriptTags = selector.select(dom, 'script[type="application/ld+json"]');
    const results: Record<string, any>[] = [];
    
    for (const script of scriptTags) {
      if (script.children && script.children[0]?.type === 'text') {
        try {
          const data = JSON.parse(script.children[0].text!);
          results.push(Array.isArray(data) ? data : [data]).flat();
        } catch (error) {
          // Ignore invalid JSON
        }
      }
    }
    
    return results.flat();
  }

  // Extract microdata
  static extractMicrodata(dom: DOMNode): Record<string, any>[] {
    const selector = new CSSSelector();
    const itemscopeElements = selector.select(dom, '[itemscope]');
    const results: Record<string, any>[] = [];
    
    for (const element of itemscopeElements) {
      const item: Record<string, any> = {};
      const type = element.attributes?.itemtype;
      
      if (type) {
        item['@type'] = type;
      }
      
      // Find all itemprop elements within this itemscope
      const propElements = selector.select(element, '[itemprop]');
      
      for (const propEl of propElements) {
        const propName = propEl.attributes?.itemprop;
        if (!propName) continue;
        
        let value: any;
        
        // Extract value based on element type
        if (propEl.name === 'meta') {
          value = propEl.attributes?.content;
        } else if (propEl.name === 'img') {
          value = propEl.attributes?.src;
        } else if (propEl.name === 'a') {
          value = propEl.attributes?.href;
        } else if (propEl.name === 'time') {
          value = propEl.attributes?.datetime;
        } else {
          // Get text content
          value = this.getTextContent(propEl);
        }
        
        if (value) {
          item[propName] = value;
        }
      }
      
      if (Object.keys(item).length > 0) {
        results.push(item);
      }
    }
    
    return results;
  }

  // Extract Open Graph data
  static extractOpenGraph(dom: DOMNode): Record<string, any> {
    const selector = new CSSSelector();
    const metaTags = selector.select(dom, 'meta[property^="og:"]');
    const result: Record<string, any> = {};
    
    for (const meta of metaTags) {
      const property = meta.attributes?.property;
      const content = meta.attributes?.content;
      
      if (property && content) {
        const key = property.replace('og:', '');
        result[key] = content;
      }
    }
    
    return result;
  }

  // Extract Twitter Card data
  static extractTwitterCard(dom: DOMNode): Record<string, any> {
    const selector = new CSSSelector();
    const metaTags = selector.select(dom, 'meta[name^="twitter:"]');
    const result: Record<string, any> = {};
    
    for (const meta of metaTags) {
      const name = meta.attributes?.name;
      const content = meta.attributes?.content;
      
      if (name && content) {
        const key = name.replace('twitter:', '');
        result[key] = content;
      }
    }
    
    return result;
  }

  private static getTextContent(node: DOMNode): string {
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
}

export class SchemaExtractor {
  private selector: CSSSelector;
  private schemas: Map<string, ExtractionSchema> = new Map();

  constructor() {
    this.selector = new CSSSelector();
    this.loadBuiltInSchemas();
  }

  private loadBuiltInSchemas(): void {
    // Product schema
    this.addSchema({
      name: 'product',
      description: 'E-commerce product data',
      rules: [
        {
          name: 'title',
          selector: 'h1, .product-title, [data-testid*="title"]',
          required: true,
          validation: { type: 'string', min: 1 }
        },
        {
          name: 'price',
          selector: '.price, .product-price, [data-testid*="price"]',
          transform: (value) => value.replace(/[^\d.,]/g, ''),
          validation: { type: 'string', pattern: /^\d+(?:\.\d{2})?$/ }
        },
        {
          name: 'description',
          selector: '.description, .product-description, [data-testid*="description"]',
          validation: { type: 'string' }
        },
        {
          name: 'images',
          selector: '.product-image img, .gallery img',
          attribute: 'src',
          multiple: true,
          validation: { type: 'url' }
        },
        {
          name: 'availability',
          selector: '.availability, .stock-status',
          validation: { enum: ['in stock', 'out of stock', 'available', 'unavailable'] }
        }
      ]
    });

    // Article schema
    this.addSchema({
      name: 'article',
      description: 'News article or blog post',
      rules: [
        {
          name: 'headline',
          selector: 'h1, .headline, .article-title',
          required: true,
          validation: { type: 'string', min: 1 }
        },
        {
          name: 'content',
          selector: '.article-content, .post-content, main p',
          multiple: true,
          transform: (value) => value.trim(),
          validation: { type: 'string' }
        },
        {
          name: 'author',
          selector: '.author, .byline, [rel="author"]',
          validation: { type: 'string' }
        },
        {
          name: 'publishDate',
          selector: '.publish-date, .date, time',
          attribute: 'datetime',
          validation: { type: 'date' }
        },
        {
          name: 'tags',
          selector: '.tags a, .categories a',
          multiple: true,
          validation: { type: 'string' }
        }
      ]
    });

    // Contact schema
    this.addSchema({
      name: 'contact',
      description: 'Contact information',
      rules: [
        {
          name: 'name',
          selector: '.name, .contact-name, h1, h2',
          validation: { type: 'string' }
        },
        {
          name: 'email',
          selector: 'a[href^="mailto:"], .email',
          transform: (value, element) => {
            if (element?.attributes?.href) {
              return element.attributes.href.replace('mailto:', '');
            }
            return value;
          },
          validation: { type: 'email' }
        },
        {
          name: 'phone',
          selector: 'a[href^="tel:"], .phone',
          transform: (value, element) => {
            if (element?.attributes?.href) {
              return element.attributes.href.replace('tel:', '');
            }
            return value;
          }
        },
        {
          name: 'address',
          selector: '.address, .location',
          validation: { type: 'string' }
        }
      ]
    });
  }

  addSchema(schema: ExtractionSchema): void {
    this.schemas.set(schema.name, schema);
  }

  getSchema(name: string): ExtractionSchema | undefined {
    return this.schemas.get(name);
  }

  listSchemas(): string[] {
    return Array.from(this.schemas.keys());
  }

  extract(dom: DOMNode, schemaName: string, options: SchemaValidationOptions = {}): ExtractionResult {
    const schema = this.schemas.get(schemaName);
    if (!schema) {
      throw new Error(`Schema "${schemaName}" not found`);
    }

    const result: ExtractionResult = {
      data: {},
      errors: [],
      warnings: [],
      metadata: {
        extractedAt: new Date(),
        schemaName,
        totalRules: schema.rules.length,
        successfulRules: 0,
        failedRules: 0
      }
    };

    // Extract data for each rule
    for (const rule of schema.rules) {
      try {
        const extracted = this.extractRule(dom, rule);
        
        if (extracted.success) {
          result.data[rule.name] = extracted.value;
          result.metadata.successfulRules++;
        } else {
          result.metadata.failedRules++;
          
          if (rule.required && !options.skipMissing) {
            result.errors.push({
              rule: rule.name,
              message: `Required field "${rule.name}" not found`,
              value: extracted.value
            });
          } else {
            if (rule.defaultValue !== undefined) {
              result.data[rule.name] = rule.defaultValue;
            }
            
            result.warnings.push({
              rule: rule.name,
              message: `Field "${rule.name}" not found`,
              value: extracted.value
            });
          }
        }
      } catch (error) {
        result.errors.push({
          rule: rule.name,
          message: `Error extracting "${rule.name}": ${error}`,
        });
        result.metadata.failedRules++;
      }
    }

    // Apply global transforms
    if (schema.globalTransforms) {
      for (const transform of schema.globalTransforms) {
        if (result.data[transform.field] !== undefined) {
          try {
            result.data[transform.field] = transform.transform(result.data[transform.field], result.data);
          } catch (error) {
            result.warnings.push({
              rule: transform.field,
              message: `Global transform failed: ${error}`
            });
          }
        }
      }
    }

    // Apply post-processing
    if (schema.postProcessing) {
      try {
        result.data = schema.postProcessing(result.data);
      } catch (error) {
        result.warnings.push({
          rule: 'postProcessing',
          message: `Post-processing failed: ${error}`
        });
      }
    }

    // Fail if strict mode and there are errors
    if (options.strict && result.errors.length > 0) {
      throw new Error(`Strict validation failed: ${result.errors.map(e => e.message).join(', ')}`);
    }

    return result;
  }

  private extractRule(dom: DOMNode, rule: ExtractionRule): { success: boolean; value: any } {
    const elements = this.selector.select(dom, rule.selector);
    
    if (elements.length === 0) {
      return { success: false, value: null };
    }

    const extractValue = (element: DOMNode): any => {
      let value: any;
      
      if (rule.attribute) {
        value = element.attributes?.[rule.attribute];
      } else {
        value = this.getTextContent(element);
      }

      // Apply transformation
      if (rule.transform && value !== null && value !== undefined) {
        value = rule.transform(value, element);
      }

      // Validate value
      if (rule.validation) {
        const validation = DataValidator.validate(value, rule.validation);
        if (!validation.valid) {
          throw new Error(validation.error);
        }
        if (validation.coercedValue !== undefined) {
          value = validation.coercedValue;
        }
      }

      return value;
    };

    if (rule.multiple) {
      const values = elements.map(extractValue).filter(v => v !== null && v !== undefined);
      return { success: values.length > 0, value: values };
    } else {
      const value = extractValue(elements[0]);
      return { success: value !== null && value !== undefined, value };
    }
  }

  private getTextContent(node: DOMNode): string {
    return StructuredDataExtractor['getTextContent'](node);
  }

  // Auto-detect schema based on content
  autoDetectSchema(dom: DOMNode): string[] {
    const detectedSchemas: string[] = [];
    
    // Check for product indicators
    const productSelectors = [
      '.product', '.item', '[data-testid*="product"]',
      '.price', '.buy-button', '.add-to-cart'
    ];
    
    for (const selector of productSelectors) {
      if (this.selector.select(dom, selector).length > 0) {
        detectedSchemas.push('product');
        break;
      }
    }

    // Check for article indicators
    const articleSelectors = [
      'article', '.article', '.post', '.blog-post',
      '.headline', '.byline', '.publish-date'
    ];
    
    for (const selector of articleSelectors) {
      if (this.selector.select(dom, selector).length > 0) {
        detectedSchemas.push('article');
        break;
      }
    }

    // Check for contact indicators
    const contactSelectors = [
      'a[href^="mailto:"]', 'a[href^="tel:"]',
      '.contact', '.vcard', '.address'
    ];
    
    for (const selector of contactSelectors) {
      if (this.selector.select(dom, selector).length > 0) {
        detectedSchemas.push('contact');
        break;
      }
    }

    return detectedSchemas;
  }
}

export default SchemaExtractor;