/**
 * Manual Test Entity - Human-readable test procedures
 */

export interface ManualTest {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: number; // in minutes
  
  // Steps
  setupSteps: ManualTestStep[];
  testSteps: ManualTestStep[];
  cleanupSteps: string[];
  
  // Additional information
  prerequisites: string[];
  testData: TestData[];
  tags: string[];
  notes?: string;
  
  // Relationships
  isCommon: boolean;
  relatedScenarios: string[];
  
  // Capture references
  captures?: CaptureReference[];
}

export interface ManualTestStep {
  id: string;
  order: number;
  instruction: string;
  expectedResult: string;
  isValidation: boolean;
  isOptional: boolean;
  
  // Additional data
  inputData?: string;
  testDataTable?: any;
  notes?: string;
  
  // Capture reference
  captureRef?: string;
}

export interface TestData {
  name: string;
  value: string;
  description?: string;
}

export interface CaptureReference {
  stepId: string;
  type: 'screenshot' | 'log';
  filePath: string;
  caption?: string;
}

export interface ManualTestSuite {
  id: string;
  title: string;
  description?: string;
  procedures: ManualTest[];
  commonProcedures: ManualTest[];
  sequences: TestSequence[];
  metadata: {
    generatedAt: Date;
    totalScenarios: number;
    totalSequences: number;
    commonScenarioCount: number;
  };
}

export interface TestSequence {
  id: string;
  name: string;
  description: string;
  procedures: ManualTest[];
  isMainFlow: boolean;
}