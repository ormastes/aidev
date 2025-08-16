/**
 * MFTOD Test Converter - Main entry point
 */

// Legacy exports for backward compatibility
export { MFTODConverter } from './application/converter';
export { TestParser } from './domain/test-parser';
export { 
  DocumentFormatter,
  MarkdownFormatter, 
  HTMLFormatter, 
  JSONFormatter 
} from './domain/document-formatter';

// New HEA architecture exports
export { TestAsManualConverter } from './converter';
export type { ConversionOptions as TestAsManualOptions } from './converter';

// HEA layer exports
export { TestAsManualService } from './logic/pipe';
export { BddParser, JestParser, ManualTestGenerator } from './logic/pipe';
export { FileReader, FileWriter, RealCaptureService } from './external/pipe';

export type {
  TestCase,
  TestStep,
  TestSuite,
  TestData,
  TestDocument,
  DocumentMetadata,
  ConversionOptions,
  TestParseResult,
  FormatOptions
} from './domain/types';

// HEA types
export type {
  TestScenario,
  TestStep as HEATestStep,
  TestSuite as HEATestSuite,
  ManualTest,
  ManualTestSuite,
  GenerationOptions
} from './logic/pipe';