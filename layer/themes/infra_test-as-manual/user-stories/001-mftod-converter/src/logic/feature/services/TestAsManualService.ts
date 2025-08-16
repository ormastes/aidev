import { fileAPI } from '../utils/file-api';
/**
 * Test As Manual Service - Main orchestration service
 * Coordinates parsing, generation, and output of manual tests
 */

import { BddParser } from '../../services/BddParser';
import { ManualTestGenerator } from '../../services/ManualTestGenerator';
import { FileReader } from '../../../external/services/FileReader';
import { FileWriter, OutputFormat } from '../../../external/services/FileWriter';
import { RealCaptureService } from '../../../external/services/RealCaptureService';
import { TestSuite } from '../../entities/TestScenario';
import { ManualTestSuite } from '../../entities/ManualTest';

export interface GenerationOptions {
  inputPath: string;
  outputPath: string;
  format: OutputFormat;
  includeCommonScenarios: boolean;
  generateSequences: boolean;
  minSequenceLength: number;
  commonScenarioThreshold: number;
  enableCaptures?: boolean;
  captureOptions?: {
    platform: 'ios' | 'android' | 'web' | 'desktop';
    deviceId?: string;
    browserName?: string;
  };
}

export class TestAsManualService {
  private readonly bddParser: BddParser;
  private readonly manualTestGenerator: ManualTestGenerator;
  private readonly fileReader: FileReader;
  private readonly fileWriter: FileWriter;
  private readonly captureService?: RealCaptureService;

  constructor(options?: { enableCaptures?: boolean; captureDir?: string }) {
    this.bddParser = new BddParser();
    this.manualTestGenerator = new ManualTestGenerator();
    this.fileReader = new FileReader();
    this.fileWriter = new FileWriter();
    
    if (options?.enableCaptures) {
      this.captureService = new RealCaptureService(options.captureDir);
    }
  }

  /**
   * Generate manual tests from BDD feature files or Jest/Mocha tests
   */
  async generateManualTests(options: GenerationOptions): Promise<ManualTestSuite> {
    // Validate inputs
    await this.validateInputs(options);

    // Read input files
    const files = await this.readInputFiles(options.inputPath);
    
    if (files.length === 0) {
      throw new Error(`No test files found in ${options.inputPath}`);
    }

    // Parse files based on type
    let testSuite: TestSuite;
    
    if (this.isBddFiles(files)) {
      // Parse as BDD feature files
      testSuite = this.bddParser.parseTestSuite(files);
    } else {
      // Parse as Jest/Mocha test files
      testSuite = await this.parseJestMochaFiles(files);
    }

    // Apply configuration options
    this.applyGenerationOptions(testSuite, options);

    // Generate manual test suite
    const manualTestSuite = this.manualTestGenerator.generateManualTestSuite(testSuite);

    // Capture screenshots if enabled
    if (options.enableCaptures && this.captureService) {
      await this.captureScreenshots(manualTestSuite, options);
    }

    // Write output files
    await this.fileWriter.writeManualTestSuite(manualTestSuite, options.outputPath, options.format);

    return manualTestSuite;
  }

  /**
   * Generate from a single file
   */
  async generateFromSingleFile(
    filePath: string,
    outputPath: string,
    format: OutputFormat = "markdown"
  ): Promise<ManualTestSuite> {
    const options: GenerationOptions = {
      inputPath: filePath,
      outputPath,
      format,
      includeCommonScenarios: true,
      generateSequences: true,
      minSequenceLength: 2,
      commonScenarioThreshold: 0.5
    };

    return this.generateManualTests(options);
  }

  /**
   * Validate BDD files
   */
  async validateBddFiles(inputPath: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const files = await this.fileReader.readFeatureFiles(inputPath);
      
      if (files.length === 0) {
        errors.push('No feature files found');
        return { valid: false, errors, warnings };
      }

      for (const file of files) {
        try {
          this.bddParser.parseFeatureFile(file.path, file.content);
        } catch (error) {
          errors.push(`${file.path}: ${error instanceof Error ? error.message : String(error)}`);
        }

        // Check for common issues
        const content = file.content.toLowerCase();
        
        if (!content.includes('given') && !content.includes('when') && !content.includes('then')) {
          warnings.push(`${file.path}: No Given/When/Then steps found`);
        }
        
        if (content.includes('todo') || content.includes('fixme')) {
          warnings.push(`${file.path}: Contains TODO or FIXME comments`);
        }
        
        if (!content.includes('scenario:') && !content.includes('scenario outline:')) {
          warnings.push(`${file.path}: No scenarios found`);
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      errors.push(`Failed to read files: ${error instanceof Error ? error.message : String(error)}`);
      return { valid: false, errors, warnings };
    }
  }

  // Private helper methods

  private async validateInputs(options: GenerationOptions): Promise<void> {
    // Check if input path exists
    const fs = await import('fs');
    try {
      await fs.promises.access(options.inputPath);
    } catch {
      throw new Error(`Input path does not exist: ${options.inputPath}`);
    }

    // Validate threshold
    if (options.commonScenarioThreshold < 0 || options.commonScenarioThreshold > 1) {
      throw new Error('Common scenario threshold must be between 0 and 1');
    }

    // Validate sequence length
    if (options.minSequenceLength < 2) {
      throw new Error('Minimum sequence length must be at least 2');
    }
  }

  private async readInputFiles(inputPath: string): Promise<any[]> {
    // Try to read as feature files first
    let files = await this.fileReader.readFeatureFiles(inputPath);
    
    // If no feature files found, try test files
    if (files.length === 0 || !this.isBddFiles(files)) {
      files = await this.fileReader.readTestFiles(inputPath);
    }
    
    return files;
  }

  private isBddFiles(files: any[]): boolean {
    return files.some(f => f.path.endsWith('.feature') || f.content.includes('Feature:'));
  }

  private async parseJestMochaFiles(files: any[]): Promise<TestSuite> {
    // Import Jest parser dynamically to handle it
    const { JestParser } = await import('../../services/JestParser');
    const jestParser = new JestParser();
    
    const scenarios: any[] = [];
    
    for (const file of files) {
      const fileScenarios = jestParser.parseTestFile(file.path, file.content);
      scenarios.push(...fileScenarios);
    }
    
    // Create a test suite from Jest scenarios
    return {
      id: 'jest-suite',
      name: 'Test Suite',
      description: 'Generated from Jest/Mocha tests',
      scenarios,
      commonScenarios: [],
      sequences: []
    };
  }

  private applyGenerationOptions(_testSuite: TestSuite, _options: GenerationOptions): void {
    // The BddParser already handles these during parsing
    // This is here for any additional runtime configuration
  }

  private async captureScreenshots(
    manualTestSuite: ManualTestSuite,
    options: GenerationOptions
  ): Promise<void> {
    if (!this.captureService || !options.captureOptions) return;

    // const captureResults: any[] = []; // For future use

    // Capture screenshots for key steps
    for (const procedure of [...manualTestSuite.procedures, ...manualTestSuite.commonProcedures]) {
      // Capture setup state
      if (procedure.setupSteps.length > 0) {
        const result = await this.captureService.captureScreenshot({
          platform: options.captureOptions.platform,
          deviceId: options.captureOptions.deviceId,
          browserName: options.captureOptions.browserName,
          outputPath: `${options.outputPath}/captures/${procedure.id}_setup.png`
        });
        
        if (result.success && result.filePath) {
          procedure.captures = procedure.captures || [];
          procedure.captures.push({
            stepId: procedure.setupSteps[0].id,
            type: "screenshot",
            filePath: result.filePath,
            caption: 'Initial setup state'
          });
        }
      }

      // Capture validation steps
      for (const step of procedure.testSteps) {
        if (step.isValidation) {
          const result = await this.captureService.captureScreenshot({
            platform: options.captureOptions.platform,
            deviceId: options.captureOptions.deviceId,
            browserName: options.captureOptions.browserName,
            outputPath: `${options.outputPath}/captures/${procedure.id}_step${step.order}.png`
          });
          
          if (result.success && result.filePath) {
            procedure.captures = procedure.captures || [];
            procedure.captures.push({
              stepId: step.id,
              type: "screenshot",
              filePath: result.filePath,
              caption: step.expectedResult
            });
            
            step.captureRef = result.filePath;
          }
        }
      }
    }
  }
}