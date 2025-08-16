/**
 * Enhanced Manual Generator Core Engine
 * Provides comprehensive test-to-manual conversion with advanced features
 */

import { TestParser } from './TestParser';
import { TemplateEngine } from './TemplateEngine';
import { MetadataExtractor } from './MetadataExtractor';
import { DocumentBuilder } from './DocumentBuilder';
import { 
  TestDocument, 
  ManualGeneratorOptions, 
  ParsedTest, 
  GeneratedManual,
  TestMetadata 
} from './types';

export class ManualGenerator {
  private testParser: TestParser;
  private templateEngine: TemplateEngine;
  private metadataExtractor: MetadataExtractor;
  private documentBuilder: DocumentBuilder;
  private options: ManualGeneratorOptions;

  constructor(options: ManualGeneratorOptions = {}) {
    this.options = {
      includeMetadata: true,
      includeScreenshots: true,
      generateTOC: true,
      generateIndex: true,
      supportMultipleFormats: true,
      ...options
    };

    this.testParser = new TestParser();
    this.templateEngine = new TemplateEngine();
    this.metadataExtractor = new MetadataExtractor();
    this.documentBuilder = new DocumentBuilder();
  }

  /**
   * Generate manual from test file
   */
  async generateFromFile(filePath: string): Promise<GeneratedManual> {
    try {
      // Parse test file
      const parsedTest = await this.testParser.parseFile(filePath);
      
      // Extract metadata and annotations
      const metadata = await this.metadataExtractor.extract(parsedTest);
      
      // Build document structure
      const document = await this.documentBuilder.build({
        test: parsedTest,
        metadata,
        options: this.options
      });
      
      // Apply template and generate output
      const output = await this.templateEngine.render(document, this.options.template);
      
      return {
        success: true,
        document,
        output,
        metadata,
        filePath
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        filePath
      };
    }
  }

  /**
   * Generate manuals for multiple test files
   */
  async generateBatch(filePaths: string[]): Promise<Map<string, GeneratedManual>> {
    const results = new Map<string, GeneratedManual>();
    
    // Process files in parallel for better performance
    const promises = filePaths.map(async (filePath) => {
      const result = await this.generateFromFile(filePath);
      return { filePath, result };
    });
    
    const batchResults = await Promise.all(promises);
    
    for (const { filePath, result } of batchResults) {
      results.set(filePath, result);
    }
    
    return results;
  }

  /**
   * Generate manual from parsed test object
   */
  async generateFromParsedTest(
    parsedTest: ParsedTest, 
    metadata?: TestMetadata
  ): Promise<GeneratedManual> {
    try {
      // Use provided metadata or extract it
      const testMetadata = metadata || await this.metadataExtractor.extract(parsedTest);
      
      // Build document
      const document = await this.documentBuilder.build({
        test: parsedTest,
        metadata: testMetadata,
        options: this.options
      });
      
      // Render with template
      const output = await this.templateEngine.render(document, this.options.template);
      
      return {
        success: true,
        document,
        output,
        metadata: testMetadata
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate manual with custom template
   */
  async generateWithTemplate(
    filePath: string, 
    templatePath: string
  ): Promise<GeneratedManual> {
    // Load custom template
    await this.templateEngine.loadTemplate(templatePath);
    
    // Generate using custom template
    const customOptions = {
      ...this.options,
      template: templatePath
    };
    
    this.options = customOptions;
    return this.generateFromFile(filePath);
  }

  /**
   * Configure generator options
   */
  configure(options: Partial<ManualGeneratorOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current configuration
   */
  getConfiguration(): ManualGeneratorOptions {
    return { ...this.options };
  }

  /**
   * Validate test file before processing
   */
  async validateFile(filePath: string): Promise<{ valid: boolean; errors?: string[] }> {
    try {
      const validation = await this.testParser.validate(filePath);
      return validation;
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Validation failed']
      };
    }
  }

  /**
   * Preview manual generation without saving
   */
  async preview(filePath: string): Promise<string> {
    const result = await this.generateFromFile(filePath);
    if (result.success && result.output) {
      return result.output;
    }
    throw new Error(result.error || 'Preview generation failed');
  }

  /**
   * Export manual in specific format
   */
  async export(
    document: TestDocument, 
    format: 'html' | 'pdf' | "markdown" | 'json'
  ): Promise<string> {
    return this.documentBuilder.export(document, format);
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.templateEngine.cleanup();
    await this.documentBuilder.cleanup();
  }
}

export default ManualGenerator;