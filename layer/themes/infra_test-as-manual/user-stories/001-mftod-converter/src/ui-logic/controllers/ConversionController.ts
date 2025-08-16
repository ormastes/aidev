/**
 * Conversion Controller - UILogic layer
 * Handles business logic for test conversion requests from UI
 */

import { ConversionRequest, ConversionResult, ValidationResult } from '../types';
import { ConversionValidator } from '../validators/ConversionValidator';
import { TestAsManualService } from '../../logic/pipe';
import { FileProcessingService } from '../services/FileProcessingService';
import { ResultFormatterService } from '../services/ResultFormatterService';

export class ConversionController {
  private validator: ConversionValidator;
  private fileProcessor: FileProcessingService;
  private resultFormatter: ResultFormatterService;
  private conversionService: TestAsManualService;

  constructor() {
    this.validator = new ConversionValidator();
    this.fileProcessor = new FileProcessingService();
    this.resultFormatter = new ResultFormatterService();
    this.conversionService = new TestAsManualService({
      enableCaptures: false // Will be set based on request
    });
  }

  /**
   * Handle conversion request from UI
   */
  async handleConversionRequest(request: ConversionRequest): Promise<ConversionResult> {
    try {
      // 1. Validate request
      const validation = this.validator.validateRequest(request);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings
        };
      }

      // 2. Process files
      const processedFiles = await this.fileProcessor.processFiles(request.files);
      
      // 3. Create temporary directory for input files
      const tempInputDir = await this.fileProcessor.createTempDirectory();
      await this.fileProcessor.writeFilesToDirectory(processedFiles, tempInputDir);

      // 4. Configure conversion service
      if (request.options.enableCaptures) {
        this.conversionService = new TestAsManualService({
          enableCaptures: true,
          captureDir: `${tempInputDir}/captures`
        });
      }

      // 5. Execute conversion
      const conversionOptions = {
        inputPath: tempInputDir,
        outputPath: await this.fileProcessor.createOutputDirectory(),
        format: request.options.format as any,
        includeCommonScenarios: request.options.includeCommonScenarios,
        generateSequences: request.options.generateSequences,
        minSequenceLength: request.options.minSequenceLength,
        commonScenarioThreshold: request.options.commonScenarioThreshold,
        enableCaptures: request.options.enableCaptures,
        captureOptions: request.options.captureOptions
      };

      const manualTestSuite = await this.conversionService.generateManualTests(conversionOptions);

      // 6. Format results for UI
      const formattedResult = await this.resultFormatter.formatResult(
        manualTestSuite,
        conversionOptions.outputPath,
        request.options.format
      );

      // 7. Clean up temp directory
      await this.fileProcessor.cleanupTempDirectory(tempInputDir);

      return {
        success: true,
        data: formattedResult,
        statistics: {
          totalTests: manualTestSuite.procedures.length,
          commonTests: manualTestSuite.commonProcedures.length,
          sequences: manualTestSuite.sequences.length,
          processingTime: Date.now() - validation.timestamp
        }
      };

    } catch (error) {
      console.error('Conversion failed:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred']
      };
    }
  }

  /**
   * Validate files before conversion
   */
  async validateFiles(files: File[]): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      timestamp: Date.now()
    };

    for (const file of files) {
      // Check file size
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        result.warnings.push(`File ${file.name} is large (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      }

      // Check file type
      const validExtensions = ['.feature', '.js', '.ts', '.spec.js', '.spec.ts', '.test.js', '.test.ts'];
      const hasValidExtension = validExtensions.some(ext => file.name.endsWith(ext));
      
      if (!hasValidExtension) {
        result.errors.push(`Invalid file type: ${file.name}`);
        result.isValid = false;
      }

      // Try to read and validate content
      try {
        const content = await this.fileProcessor.readFileContent(file);
        const contentValidation = this.validator.validateFileContent(content, file.name);
        
        result.errors.push(...contentValidation.errors);
        result.warnings.push(...contentValidation.warnings);
        
        if (contentValidation.errors.length > 0) {
          result.isValid = false;
        }
      } catch (error) {
        result.errors.push(`Failed to read ${file.name}: ${error}`);
        result.isValid = false;
      }
    }

    return result;
  }

  /**
   * Get available output formats
   */
  getAvailableFormats(): string[] {
    return ['markdown', 'html', 'json'];
  }

  /**
   * Get conversion presets
   */
  getConversionPresets() {
    return {
      simple: {
        format: 'markdown',
        includeCommonScenarios: false,
        generateSequences: false,
        minSequenceLength: 2,
        commonScenarioThreshold: 0.5
      },
      comprehensive: {
        format: 'html',
        includeCommonScenarios: true,
        generateSequences: true,
        minSequenceLength: 3,
        commonScenarioThreshold: 0.3
      },
      professional: {
        format: 'html',
        includeCommonScenarios: true,
        generateSequences: true,
        minSequenceLength: 2,
        commonScenarioThreshold: 0.5,
        enableCaptures: true,
        captureOptions: {
          platform: 'web' as const,
          browserName: 'chromium'
        }
      }
    };
  }

  /**
   * Estimate conversion time
   */
  estimateConversionTime(files: File[], options: any): number {
    let baseTime = 1000; // 1 second base
    
    // Add time based on file count and size
    baseTime += files.length * 500;
    baseTime += files.reduce((sum, f) => sum + f.size, 0) / 1000;
    
    // Add time for features
    if (options.generateSequences) baseTime += 2000;
    if (options.enableCaptures) baseTime += 5000;
    
    return Math.ceil(baseTime / 1000); // Return in seconds
  }
}