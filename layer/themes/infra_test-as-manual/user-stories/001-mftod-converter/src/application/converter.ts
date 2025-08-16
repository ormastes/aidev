/**
 * Application layer converter for test-to-manual conversion
 */

import { fsPromises as fs } from '../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';
import * as Handlebars from 'handlebars';
import { TestParser } from '../domain/test-parser';
import { BDDParser } from '../domain/bdd-parser';
import { DocumentFormatter, MarkdownFormatter, HTMLFormatter, JSONFormatter } from '../domain/document-formatter';
import { ProfessionalFormatter, EnhancedHTMLFormatter } from '../domain/professional-formatter';
import { CaptureService, SimpleAppCaptureService } from '../domain/capture-service';
import { ConversionOptions, TestDocument } from '../domain/types';
import { CaptureConfiguration, AppCaptureOptions } from '../domain/capture-types';
import { getFileAPI, FileType } from '../../../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


export class MFTODConverter {
  private parser: TestParser;
  private bddParser: BDDParser;
  private formatters: Map<string, DocumentFormatter>;
  private templates: Map<string, HandlebarsTemplateDelegate>;
  private captureService?: CaptureService;

  constructor(captureConfig?: CaptureConfiguration) {
    this.parser = new TestParser();
    this.bddParser = new BDDParser();
    this.formatters = new Map([
      ['markdown', new MarkdownFormatter()],
      ['html', new HTMLFormatter()],
      ['json', new JSONFormatter()],
      ['professional', new ProfessionalFormatter()],
      ['enhanced-html', new EnhancedHTMLFormatter()]
    ]);
    this.templates = new Map();
    this.registerHelpers();
    
    // Initialize capture service if configuration provided
    if (captureConfig) {
      this.captureService = new CaptureService(captureConfig);
    }
  }

  /**
   * Convert a single test file to manual documentation
   */
  async convertFile(filePath: string, options: ConversionOptions = {}): Promise<string> {
    // Read test file
    const code = await fs.readFile(filePath, 'utf-8');
    
    // Determine parser based on file extension or content
    const isBDD = filePath.endsWith('.feature') || code.includes('Feature:') || code.includes('Scenario:');
    const parser = isBDD ? this.bddParser : this.parser;
    
    // Parse test structure
    const parseResult = parser.parse(code, filePath);
    if (!parseResult.success || !parseResult.document) {
      throw new Error(`Failed to parse test file: ${parseResult.errors?.join(', ')}`);
    }

    // Apply conversion options
    const document = this.applyOptions(parseResult.document, options);

    // Format document
    const formatted = this.formatDocument(document, options);

    // Save if output path specified
    if (options.outputPath) {
      await this.saveDocument(formatted, options.outputPath);
    }

    return formatted;
  }

  /**
   * Convert all test files in a directory
   */
  async convertDirectory(
    dirPath: string, 
    options: ConversionOptions & { recursive?: boolean; pattern?: string | RegExp } = {}
  ): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    const pattern = typeof options.pattern === 'string' 
      ? new RegExp(options.pattern)
      : options.pattern || /\.(test|spec)\.(ts|js|tsx|jsx)$/;
    
    const files = await this.findTestFiles(dirPath, pattern, options.recursive);
    
    for (const file of files) {
      try {
        const outputName = this.generateOutputName(file, options.format || 'markdown');
        const outputPath = options.outputPath 
          ? path.join(options.outputPath, outputName)
          : undefined;
          
        const result = await this.convertFile(file, { ...options, outputPath });
        results.set(file, result);
      } catch (error) {
        console.error(`Failed to convert ${file}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Register a custom template
   */
  async registerTemplate(name: string, templatePath: string): Promise<void> {
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    const template = Handlebars.compile(templateContent);
    this.templates.set(name, template);
  }

  /**
   * Register a custom formatter
   */
  async registerFormatter(format: string, formatter: DocumentFormatter): void {
    this.formatters.set(format, formatter);
  }

  private formatDocument(document: TestDocument, options: ConversionOptions): string {
    const format = options.format || 'markdown';
    
    // Use custom template if specified
    if (options.customTemplate && this.templates.has(options.customTemplate)) {
      const template = this.templates.get(options.customTemplate)!;
      return template(document);
    }
    
    // Use built-in formatter
    const formatter = this.formatters.get(format);
    if (!formatter) {
      throw new Error(`Unsupported format: ${format}`);
    }
    
    // Configure formatter based on template
    if (format === 'markdown') {
      const markdownFormatter = new MarkdownFormatter({
        includeTableOfContents: options.template !== 'simple',
        includeIndex: options.template === 'detailed',
        includeGlossary: options.template === 'compliance'
      });
      return markdownFormatter.format(document);
    }
    
    return formatter.format(document);
  }

  private async applyOptions(document: TestDocument, options: ConversionOptions): TestDocument {
    const result = { ...document };
    
    // Filter by feature groups if requested
    if (options.groupByFeature) {
      result.suites = this.groupSuitesByFeature(result.suites);
    }
    
    // Remove code snippets if not wanted
    if (!options.includeCodeSnippets) {
      this.removeCodeSnippets(result);
    }
    
    // Add version if specified
    if (options.template === 'compliance') {
      result.version = '1.0.0';
    }
    
    return result;
  }

  private async groupSuitesByFeature(suites: any[]): any[] {
    const grouped = new Map<string, any[]>();
    
    suites.forEach(suite => {
      // Find the category from the first test case in the suite or its children
      let category = 'General';
      if (suite.testCases && suite.testCases.length > 0) {
        category = suite.testCases[0]?.category || 'General';
      } else if (suite.childSuites && suite.childSuites.length > 0) {
        // Check child suites for category
        const firstChild = suite.childSuites[0];
        if (firstChild.testCases && firstChild.testCases.length > 0) {
          category = firstChild.testCases[0]?.category || 'General';
        }
      }
      
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(suite);
    });
    
    return Array.from(grouped.entries()).map(([category, suites]) => ({
      id: `feature-${category.toLowerCase()}`,
      title: `${category} Features`,
      testCases: [],
      childSuites: suites
    }));
  }

  private async removeCodeSnippets(document: TestDocument): void {
    // Walk through all test cases and remove code references
    const processTestCase = (test: any) => {
      test.steps.forEach((step: any) => {
        // Remove technical details from actions
        step.action = step.action.replace(/\$\{.*?\}/g, '<value>');
        step.action = step.action.replace(/["'].*?["']/g, '<text>');
        // Also update expected results
        step.expected = step.expected.replace(/\$\{.*?\}/g, '<value>');
        step.expected = step.expected.replace(/["'].*?["']/g, '<text>');
        // Replace specific code patterns
        step.action = step.action.replace(/\b\w+\.\w+\b/g, '<object.property>');
        step.expected = step.expected.replace(/\b\w+\.\w+\b/g, '<object.property>');
        // Replace equals value patterns
        step.expected = step.expected.replace(/equals \w+/g, 'equals <value>');
      });
    };
    
    const processSuite = (suite: any) => {
      suite.testCases.forEach(processTestCase);
      if (suite.childSuites) {
        suite.childSuites.forEach(processSuite);
      }
    };
    
    document.suites.forEach(processSuite);
  }

  private async findTestFiles(dirPath: string, pattern: RegExp, recursive?: boolean): Promise<string[]> {
    const files: string[] = [];
    
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory() && recursive) {
        const subFiles = await this.findTestFiles(fullPath, pattern, recursive);
        files.push(...subFiles);
      } else if (entry.isFile() && pattern.test(entry.name)) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  private async generateOutputName(inputPath: string, format: string): string {
    const parsed = path.parse(inputPath);
    const extension = format === 'markdown' ? '.md' : format === 'html' ? '.html' : '.json';
    return parsed.name.replace(/\.(test|spec)/, '') + '-manual' + extension;
  }

  private async saveDocument(content: string, outputPath: string): Promise<void> {
    const dir = path.dirname(outputPath);
    await fileAPI.createDirectory(dir);
    await fileAPI.createFile(outputPath, content, { type: FileType.TEMPORARY }) => a === b);
    Handlebars.registerHelper('ne', (a, b) => a !== b);
    Handlebars.registerHelper('lt', (a, b) => a < b);
    Handlebars.registerHelper('gt', (a, b) => a > b);
    Handlebars.registerHelper('and', (a, b) => a && b);
    Handlebars.registerHelper('or', (a, b) => a || b);
    Handlebars.registerHelper('not', (a) => !a);
    Handlebars.registerHelper('formatDate', (date) => {
      return new Date(date).toLocaleDateString();
    });
    Handlebars.registerHelper('json', (obj) => JSON.stringify(obj, null, 2));
    Handlebars.registerHelper('upper', (str) => str?.toUpperCase());
    Handlebars.registerHelper('lower', (str) => str?.toLowerCase());
    Handlebars.registerHelper('capitalize', (str) => {
      return str?.charAt(0).toUpperCase() + str?.slice(1);
    });
  }

  /**
   * Enhanced conversion with capture support
   */
  async convertFileWithCaptures(
    filePath: string, 
    options: ConversionOptions = {},
    captureOptions?: AppCaptureOptions
  ): Promise<string> {
    let appCaptureService: SimpleAppCaptureService | undefined;
    
    if (captureOptions) {
      appCaptureService = new SimpleAppCaptureService(captureOptions);
    }

    // Read and parse test file
    const code = await fs.readFile(filePath, 'utf-8');
    const parseResult = this.parser.parse(code, filePath);
    
    if (!parseResult.success || !parseResult.document) {
      throw new Error(parseResult.errors?.join(', ') || 'Failed to parse test file');
    }

    // Enhanced document processing with capture integration
    let document = parseResult.document;
    
    if (appCaptureService) {
      // Simulate step-by-step capture for each test case
      for (const suite of document.suites) {
        for (const testCase of suite.testCases) {
          for (let i = 0; i < testCase.steps.length; i++) {
            const step = testCase.steps[i];
            const stepType = this.inferStepType(step, i);
            
            // Capture step execution
            const syncCapture = await appCaptureService.captureStep(
              testCase.id,
              stepType,
              step.action
            );
            
            // Enhanced step with capture reference
            if (syncCapture.screenshot) {
              (step as any).captureReference = {
                type: 'screenshot',
                fileName: syncCapture.screenshot.filePath,
                caption: `Step ${step.order}: ${step.action}`
              };
            }
          }
        }
      }
    }

    // Apply options
    if (!options.includeCodeSnippets) {
      this.removeCodeSnippets(document);
    }
    
    if (options.groupByFeature) {
      document.suites = this.groupSuitesByFeature(document.suites);
    }

    // Generate output with enhanced formatter
    const format = options.format || 'professional';
    const formatter = this.formatters.get(format);
    if (!formatter) {
      throw new Error(`Unsupported format: ${format}`);
    }
    
    const output = formatter.format(document);
    
    // Save output if path specified
    if (options.outputPath) {
      await fileAPI.createDirectory(path.dirname(options.outputPath));
      await fileAPI.createFile(options.outputPath, output, { type: FileType.TEMPORARY }): { command: string; logPath: string; changes: string[] } {
    if (!this.captureService) {
      throw new Error('Capture service not initialized. Provide capture configuration in constructor.');
    }

    const update = this.captureService.updateExecutableArgs(executable, originalArgs, logOutputPath);
    
    return {
      command: `${executable} ${update.updatedArgs.join(' ')}`,
      logPath: update.logOutputPath,
      changes: update.changes.map(change => change.description)
    };
  }

  /**
   * Generate comprehensive capture report
   */
  async generateCaptureReport(scenarioName: string): Promise<string> {
    if (!this.captureService) {
      throw new Error('Capture service not initialized');
    }
    
    return await this.captureService.generateCaptureReport(scenarioName);
  }

  /**
   * Finalize captures and clean up
   */
  async finalizeCapturesAndCleanup(
    scenarioName: string,
    destinationDirectory: string
  ): Promise<{ success: boolean; copiedFiles: string[]; errors: string[] }> {
    if (!this.captureService) {
      throw new Error('Capture service not initialized');
    }
    
    const result = await this.captureService.finalizeCapturesForScenario(scenarioName, destinationDirectory);
    await this.captureService.cleanupTemporaryCaptures(scenarioName);
    
    return result;
  }

  private async inferStepType(step: any, index: number): 'given' | 'when' | 'then' {
    if (step.isAssertion) return 'then';
    if (index === 0) return 'given';
    return 'when';
  }
}