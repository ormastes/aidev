/**
 * Batch Processor for generating manuals for multiple themes simultaneously
 * Provides parallel processing with worker pool and progress reporting
 */

import { Worker } from 'worker_threads';
import { os } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';
import { EventEmitter } from 'node:events';
import { ManualGenerator } from '../core/ManualGenerator';
import { ThemeScanner } from '../scanner/ThemeScanner';
import { ThemeRegistry } from '../scanner/ThemeRegistry';
import { TestDiscovery, DiscoveredTest } from '../scanner/TestDiscovery';
import { GeneratedManual, ManualGeneratorOptions, ThemeDefinition } from '../core/types';

export interface BatchOptions {
  parallelWorkers?: number;
  outputDir?: string;
  formats?: Array<'html' | 'pdf' | "markdown" | 'json'>;
  template?: string;
  includeMetadata?: boolean;
  generateTOC?: boolean;
  generateIndex?: boolean;
  progressCallback?: (progress: BatchProgress) => void;
  errorHandler?: (error: BatchError) => void;
}

export interface BatchProgress {
  totalThemes: number;
  processedThemes: number;
  currentTheme?: string;
  percentage: number;
  estimatedTimeRemaining?: number;
  errors: number;
}

export interface BatchError {
  theme: string;
  file?: string;
  error: Error;
  timestamp: Date;
}

export interface BatchResult {
  success: boolean;
  totalThemes: number;
  processedThemes: number;
  failedThemes: number;
  results: Map<string, ThemeResult>;
  errors: BatchError[];
  duration: number;
}

export interface ThemeResult {
  theme: string;
  files: Map<string, GeneratedManual>;
  success: boolean;
  errors?: string[];
}

export class BatchProcessor extends EventEmitter {
  private options: BatchOptions;
  private workerPool: Worker[] = [];
  private taskQueue: Array<{ theme: string; files: string[] }> = [];
  private activeWorkers = 0;
  private maxWorkers: number;
  private results: Map<string, ThemeResult> = new Map();
  private errors: BatchError[] = [];
  private startTime: number = 0;
  private processedCount = 0;
  private scanner: ThemeScanner;
  private registry: ThemeRegistry;
  private discovery: TestDiscovery;

  constructor(options: BatchOptions = {}) {
    super();
    this.options = {
      parallelWorkers: options.parallelWorkers || os.cpus().length,
      outputDir: options.outputDir || './generated-manuals',
      formats: options.formats || ['html', "markdown"],
      template: options.template || 'default',
      includeMetadata: options.includeMetadata !== false,
      generateTOC: options.generateTOC !== false,
      generateIndex: options.generateIndex !== false,
      ...options
    };
    
    this.maxWorkers = this.options.parallelWorkers!;
    this.scanner = new ThemeScanner();
    this.registry = new ThemeRegistry();
    this.discovery = new TestDiscovery();
  }

  /**
   * Process all themes in parallel
   */
  async processAllThemes(themesDir?: string): Promise<BatchResult> {
    this.startTime = Date.now();
    this.processedCount = 0;
    this.results.clear();
    this.errors = [];

    try {
      // Scan for themes
      const scanResult = await this.scanner.scanThemes();
      
      // Build task queue
      for (const theme of scanResult.themes) {
        const testFiles = await this.discovery.discoverTests(theme.rootPath);
        if (testFiles.length > 0) {
          this.taskQueue.push({
            theme: theme.name,
            files: testFiles.map((t: DiscoveredTest) => t.filePath)
          });
        }
      }

      const totalThemes = this.taskQueue.length;
      
      // Report initial progress
      this.reportProgress({
        totalThemes,
        processedThemes: 0,
        percentage: 0,
        errors: 0
      });

      // Process themes in parallel
      await this.processWithWorkers();

      // Calculate final results
      const duration = Date.now() - this.startTime;
      const failedThemes = Array.from(this.results.values()).filter(r => !r.success).length;

      return {
        success: failedThemes === 0,
        totalThemes,
        processedThemes: this.processedCount,
        failedThemes,
        results: this.results,
        errors: this.errors,
        duration
      };
    } catch (error) {
      return {
        success: false,
        totalThemes: 0,
        processedThemes: 0,
        failedThemes: 0,
        results: this.results,
        errors: [{
          theme: 'batch-processor',
          error: error as Error,
          timestamp: new Date()
        }],
        duration: Date.now() - this.startTime
      };
    }
  }

  /**
   * Process specific themes
   */
  async processThemes(themes: string[]): Promise<BatchResult> {
    this.startTime = Date.now();
    this.processedCount = 0;
    this.results.clear();
    this.errors = [];

    try {
      // Build task queue for specific themes
      for (const themeName of themes) {
        const themePath = path.join(process.cwd(), 'layer/themes', themeName);
        const testFiles = await this.discovery.discoverTests(themePath);
        
        if (testFiles.length > 0) {
          this.taskQueue.push({
            theme: themeName,
            files: testFiles.map((t: DiscoveredTest) => t.filePath)
          });
        }
      }

      const totalThemes = this.taskQueue.length;
      
      // Process themes
      await this.processWithWorkers();

      const duration = Date.now() - this.startTime;
      const failedThemes = Array.from(this.results.values()).filter(r => !r.success).length;

      return {
        success: failedThemes === 0,
        totalThemes,
        processedThemes: this.processedCount,
        failedThemes,
        results: this.results,
        errors: this.errors,
        duration
      };
    } catch (error) {
      return {
        success: false,
        totalThemes: themes.length,
        processedThemes: this.processedCount,
        failedThemes: themes.length - this.processedCount,
        results: this.results,
        errors: this.errors,
        duration: Date.now() - this.startTime
      };
    }
  }

  /**
   * Process themes using worker pool
   */
  private async processWithWorkers(): Promise<void> {
    return new Promise((resolve, reject) => {
      let completed = 0;
      const total = this.taskQueue.length;

      if (total === 0) {
        resolve();
        return;
      }

      // Process tasks
      const processNext = async () => {
        if (this.taskQueue.length === 0) {
          if (this.activeWorkers === 0) {
            resolve();
          }
          return;
        }

        if (this.activeWorkers >= this.maxWorkers) {
          return;
        }

        const task = this.taskQueue.shift();
        if (!task) return;

        this.activeWorkers++;

        try {
          const result = await this.processTheme(task.theme, task.files);
          this.results.set(task.theme, result);
          completed++;
          this.processedCount++;

          // Report progress
          this.reportProgress({
            totalThemes: total,
            processedThemes: completed,
            currentTheme: task.theme,
            percentage: Math.round((completed / total) * 100),
            errors: this.errors.length
          });
        } catch (error) {
          this.handleError({
            theme: task.theme,
            error: error as Error,
            timestamp: new Date()
          });
        } finally {
          this.activeWorkers--;
          processNext();
        }
      };

      // Start initial workers
      for (let i = 0; i < Math.min(this.maxWorkers, this.taskQueue.length); i++) {
        processNext();
      }
    });
  }

  /**
   * Process a single theme
   */
  private async processTheme(themeName: string, files: string[]): Promise<ThemeResult> {
    const generator = new ManualGenerator({
      includeMetadata: this.options.includeMetadata,
      generateTOC: this.options.generateTOC,
      generateIndex: this.options.generateIndex,
      template: this.options.template
    });

    const themeResult: ThemeResult = {
      theme: themeName,
      files: new Map(),
      success: true,
      errors: []
    };

    try {
      // Process each test file
      for (const file of files) {
        try {
          const manual = await generator.generateFromFile(file);
          themeResult.files.set(file, manual);
          
          if (!manual.success) {
            themeResult.errors?.push(manual.error || 'Unknown error');
          }
        } catch (error) {
          themeResult.success = false;
          themeResult.errors?.push(`Failed to process ${file}: ${error}`);
        }
      }
    } catch (error) {
      themeResult.success = false;
      themeResult.errors?.push(`Theme processing failed: ${error}`);
    } finally {
      await generator.cleanup();
    }

    return themeResult;
  }

  /**
   * Report progress
   */
  private reportProgress(progress: BatchProgress): void {
    // Estimate time remaining
    if (progress.processedThemes > 0) {
      const elapsed = Date.now() - this.startTime;
      const avgTimePerTheme = elapsed / progress.processedThemes;
      const remaining = progress.totalThemes - progress.processedThemes;
      progress.estimatedTimeRemaining = Math.round(avgTimePerTheme * remaining);
    }

    // Call callback if provided
    if (this.options.progressCallback) {
      this.options.progressCallback(progress);
    }

    // Emit event
    this.emit("progress", progress);
  }

  /**
   * Handle batch error
   */
  private handleError(error: BatchError): void {
    this.errors.push(error);

    // Call error handler if provided
    if (this.options.errorHandler) {
      this.options.errorHandler(error);
    }

    // Emit error event
    this.emit('error', error);
  }

  /**
   * Cancel batch processing
   */
  cancel(): void {
    this.taskQueue = [];
    this.emit("cancelled");
  }

  /**
   * Get current progress
   */
  getProgress(): BatchProgress {
    const total = this.taskQueue.length + this.processedCount;
    return {
      totalThemes: total,
      processedThemes: this.processedCount,
      percentage: total > 0 ? Math.round((this.processedCount / total) * 100) : 0,
      errors: this.errors.length
    };
  }
}

export default BatchProcessor;