/**
 * Test As Manual Converter - Main Entry Point
 * Integrates new HEA architecture with existing interface
 */

import { TestAsManualService, GenerationOptions } from './logic/pipe';
import { OutputFormat } from './external/pipe';
import { path } from '../../../../infra_external-log-lib/src';

export interface ConversionOptions {
  inputPath: string;
  outputPath: string;
  format?: 'markdown' | 'html' | 'json';
  includeCommonScenarios?: boolean;
  generateSequences?: boolean;
  minSequenceLength?: number;
  commonScenarioThreshold?: number;
  enableCaptures?: boolean;
  captureOptions?: {
    platform: 'ios' | 'android' | 'web' | 'desktop';
    deviceId?: string;
    browserName?: string;
  };
}

export class TestAsManualConverter {
  private service: TestAsManualService;

  constructor(options?: { enableCaptures?: boolean; captureDir?: string }) {
    this.service = new TestAsManualService(options);
  }

  /**
   * Convert test files to manual test documentation
   */
  async convert(options: ConversionOptions): Promise<void> {
    console.log(`Converting ${options.inputPath} to manual tests...`);

    const generationOptions: GenerationOptions = {
      inputPath: options.inputPath,
      outputPath: options.outputPath,
      format: (options.format || 'markdown') as OutputFormat,
      includeCommonScenarios: options.includeCommonScenarios ?? true,
      generateSequences: options.generateSequences ?? true,
      minSequenceLength: options.minSequenceLength ?? 2,
      commonScenarioThreshold: options.commonScenarioThreshold ?? 0.5,
      enableCaptures: options.enableCaptures,
      captureOptions: options.captureOptions
    };

    try {
      const manualTestSuite = await this.service.generateManualTests(generationOptions);
      
      console.log(`✓ Generated ${manualTestSuite.procedures.length} manual test procedures`);
      console.log(`✓ Found ${manualTestSuite.commonProcedures.length} common procedures`);
      console.log(`✓ Created ${manualTestSuite.sequences.length} test sequences`);
      console.log(`✓ Output written to ${options.outputPath}`);
      
      // Report details
      if (manualTestSuite.commonProcedures.length > 0) {
        console.log('\nCommon procedures:');
        manualTestSuite.commonProcedures.forEach(proc => {
          console.log(`  - ${proc.title} (used in multiple scenarios)`);
        });
      }
      
      if (manualTestSuite.sequences.length > 0) {
        console.log('\nTest sequences:');
        manualTestSuite.sequences.forEach(seq => {
          console.log(`  - ${seq.name} (${seq.procedures.length} steps)`);
          if (seq.isMainFlow) {
            console.log('    [Main Flow]');
          }
        });
      }
    } catch (error) {
      console.error('Conversion failed:', error);
      throw error;
    }
  }

  /**
   * Validate BDD feature files
   */
  async validate(inputPath: string): Promise<void> {
    console.log(`Validating ${inputPath}...`);
    
    const result = await this.service.validateBddFiles(inputPath);
    
    if (result.valid) {
      console.log('✓ All feature files are valid');
    } else {
      console.error('✗ Validation failed');
      result.errors.forEach(error => console.error(`  - ${error}`));
    }
    
    if (result.warnings.length > 0) {
      console.log('\nWarnings:');
      result.warnings.forEach(warning => console.log(`  ⚠ ${warning}`));
    }
  }

  /**
   * Convert a single file (convenience method)
   */
  async convertFile(
    inputFile: string,
    outputDir: string,
    format: 'markdown' | 'html' | 'json' = 'markdown'
  ): Promise<void> {
    await this.convert({
      inputPath: inputFile,
      outputPath: outputDir,
      format
    });
  }

  /**
   * Legacy method for backward compatibility
   */
  async generateDocumentation(testFile: string, outputFile: string): Promise<void> {
    const outputDir = path.dirname(outputFile);
    const format = outputFile.endsWith('.html') ? 'html' : 
                   outputFile.endsWith('.json') ? 'json' : 'markdown';
    
    await this.convert({
      inputPath: testFile,
      outputPath: outputDir,
      format: format as 'markdown' | 'html' | 'json'
    });
  }
}

// Export for CLI usage
export default TestAsManualConverter;