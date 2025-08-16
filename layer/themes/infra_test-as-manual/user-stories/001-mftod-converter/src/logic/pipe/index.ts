/**
 * Logic Layer Pipe - Exports for cross-layer communication
 * Only these exports should be used by other layers
 */

// Entities
export type {
  TestScenario,
  TestStep,
  StepArgument,
  DataTable,
  ScenarioExample,
  ExternalInteraction,
  TestSuite,
  TestSequence
} from '../entities/TestScenario';

export type {
  ManualTest,
  ManualTestStep,
  TestData,
  CaptureReference,
  ManualTestSuite,
  TestSequence as ManualTestSequence
} from '../entities/ManualTest';

// Services
export { BddParser } from '../services/BddParser';
export { JestParser } from '../services/JestParser';
export { ManualTestGenerator } from '../services/ManualTestGenerator';
export { ExecutiveSummaryGenerator } from '../services/ExecutiveSummaryGenerator';

// Feature Services
export { TestAsManualService } from '../feature/services/TestAsManualService';
export type { GenerationOptions } from '../feature/services/TestAsManualService';

// Executive Summary Types
export type { ExecutiveSummary } from '../services/ExecutiveSummaryGenerator';