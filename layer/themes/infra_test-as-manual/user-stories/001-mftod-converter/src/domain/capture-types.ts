/**
 * Enhanced capture types from _aidev test-as-manual implementation
 */

export interface TestCapture {
  id: string;
  scenarioName: string;
  stepType: 'given' | 'when' | 'then';
  captureType: 'screenshot' | 'log' | 'network' | 'performance';
  timestamp: Date;
  filePath: string;
  tempPath?: string;
  metadata?: Record<string, any>;
}

export interface CaptureConfiguration {
  tempDirectory: string;
  screenshotFormat: 'png' | 'jpg' | 'webp';
  enableExternalLogs: boolean;
  externalLogDirectory?: string;
}

export interface CaptureResult {
  success: boolean;
  capture?: TestCapture;
  error?: string;
}

export interface SynchronizedCapture {
  screenshot?: TestCapture;
  log?: TestCapture;
  timestamp: Date;
  stepInfo: {
    scenarioName: string;
    stepType: 'given' | 'when' | 'then';
    stepNumber: number;
    description: string;
  };
}

export interface AppCaptureOptions extends CaptureConfiguration {
  appPlatform: 'ios' | 'android' | 'web' | 'desktop';
  deviceId?: string;
  browserName?: string;
  captureMode: 'auto' | 'manual' | 'onError';
  syncWithLogs: boolean;
  captureBeforeAfter: boolean;
}

export interface ExternalLogConfiguration {
  type: 'executable' | 'library' | 'file';
  name: string;
  outputPath: string;
  format: 'json' | 'text' | 'csv';
  additionalOptions?: Record<string, any>;
}

export interface ExecutableArgUpdate {
  originalArgs: string[];
  updatedArgs: string[];
  logOutputPath: string;
  changes: ArgChange[];
}

export interface ArgChange {
  type: 'add' | 'modify' | 'remove';
  index: number;
  oldValue?: string;
  newValue?: string;
  description: string;
}

export interface LibraryLogSetting {
  libraryName: string;
  outputPath: string;
  wrapperEnabled: boolean;
  logConfig: Record<string, any>;
  logHandler?: any;
}

export interface ExternalLogCapture {
  id: string;
  source: string;
  type: string;
  captureStartTime: Date;
  captureEndTime?: Date;
  logPath: string;
  configuration: ExternalLogConfiguration;
  metadata: Record<string, any>;
}

// Enhanced test step with capture references
export interface EnhancedTestStep {
  order: number;
  action: string;
  expected: string;
  note?: string;
  screenshot?: string;
  isAssertion?: boolean;
  element?: string;
  testData?: string;
  interactionType?: 'click' | 'input' | 'select' | 'navigation' | 'wait' | 'generic';
  verificationElement?: string;
  expectedValue?: string;
  matcher?: string;
  // Enhanced capture properties
  captureReference?: {
    type: 'screenshot' | 'log' | 'network' | 'performance';
    fileName: string;
    caption: string;
  };
  captures?: Array<{
    type: string;
    fileName: string;
    description: string;
  }>;
}

// Professional manual test formats
export interface ProfessionalManualTest {
  id: string;
  title: string;
  description?: string;
  category?: string;
  priority?: 'high' | 'medium' | 'low';
  role?: string; // Administrator, End User, Developer, etc.
  prerequisites?: string[];
  testData?: TestData[];
  steps: EnhancedTestStep[];
  cleanup?: string[];
  async?: boolean;
  // Enhanced documentation fields
  estimatedTime?: number; // in minutes
  complexityLevel?: 'simple' | 'intermediate' | 'advanced';
  riskLevel?: 'low' | 'medium' | 'high';
  businessValue?: string;
  troubleshooting?: TroubleshootingNote[];
  visualGuide?: VisualGuideStep[];
}

export interface TroubleshootingNote {
  issue: string;
  solution: string;
  category: 'technical' | 'user-error' | 'environment';
}

export interface VisualGuideStep {
  stepNumber: number;
  screenshot: string;
  caption: string;
  annotations?: ScreenAnnotation[];
}

export interface ScreenAnnotation {
  type: 'arrow' | 'highlight' | 'text' | 'box';
  position: { x: number; y: number };
  size?: { width: number; height: number };
  text?: string;
  color?: string;
}

export interface ProfessionalManualSuite {
  title: string;
  version: string;
  created: Date;
  executionTime?: string;
  testCases: ProfessionalManualTest[];
  // Enhanced suite properties
  executiveSummary?: {
    totalTests: number;
    totalScenarios: number;
    estimatedExecutionTime: number;
    coverageAreas: string[];
  };
  tableOfContents?: TOCEntry[];
  supportInformation?: {
    contactInfo: string;
    documentationLinks: string[];
    issueTracker: string;
    communityLinks: string[];
  };
  metadata?: DocumentMetadata;
}

export interface TOCEntry {
  title: string;
  anchor: string;
  level: number;
  children?: TOCEntry[];
}

export { TestData, DocumentMetadata } from './types';

// External log configuration
export interface ExternalLogConfiguration {
  type: 'executable' | 'library' | 'file';
  name: string;
  outputPath: string;
  format: 'json' | 'text' | 'csv';
  additionalOptions?: Record<string, any>;
}