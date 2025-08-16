/**
 * Domain types for test-as-manual converter
 */

export interface TestCase {
  id: string;
  title: string;
  description?: string;
  category?: string;
  priority?: 'high' | 'medium' | 'low';
  steps: TestStep[];
  prerequisites?: string[];
  cleanup?: string[];
  testData?: TestData[];
  async?: boolean;
}

export interface TestStep {
  order: number;
  action: string;
  expected: string;
  note?: string;
  screenshot?: string;
  isAssertion?: boolean;
  // Enhanced properties for better manual test generation
  element?: string;
  testData?: string;
  interactionType?: 'click' | 'input' | 'select' | "navigation" | 'wait' | 'generic';
  verificationElement?: string;
  expectedValue?: string;
  matcher?: string;
}

export interface TestSuite {
  id: string;
  title: string;
  description?: string;
  testCases: TestCase[];
  setup?: TestStep[];
  teardown?: TestStep[];
  childSuites?: TestSuite[];
}

export interface TestData {
  name: string;
  value: any;
  description?: string;
}

export interface TestDocument {
  title: string;
  version?: string;
  created: Date;
  suites: TestSuite[];
  metadata?: DocumentMetadata;
}

export interface DocumentMetadata {
  source: string;
  framework: string;
  author?: string;
  tags?: string[];
  executionTime?: string;
}

export interface ConversionOptions {
  format?: string;
  template?: 'simple' | "detailed" | "compliance";
  includeCodeSnippets?: boolean;
  includeScreenshots?: boolean;
  groupByFeature?: boolean;
  outputPath?: string;
  customTemplate?: string;
}

export interface TestParseResult {
  success: boolean;
  document?: TestDocument;
  errors?: string[];
}

export interface FormatOptions {
  includeTableOfContents?: boolean;
  includeIndex?: boolean;
  includeGlossary?: boolean;
  styling?: 'default' | "corporate" | 'minimal';
}

export interface DocumentFormatter {
  format(document: TestDocument): string;
  options?: FormatOptions;
  formatDate?(date: Date): string;
  generateTableOfContents?(document: TestDocument): string;
  addChildSuitesToToc?(suite: TestSuite, level: number): string;
  generateTestIndex?(document: TestDocument): string;
}