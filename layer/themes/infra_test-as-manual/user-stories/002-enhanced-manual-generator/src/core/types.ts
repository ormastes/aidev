/**
 * Type definitions for Enhanced Manual Generator
 */

export interface ManualGeneratorOptions {
  includeMetadata?: boolean;
  includeScreenshots?: boolean;
  generateTOC?: boolean;
  generateIndex?: boolean;
  supportMultipleFormats?: boolean;
  template?: string;
  outputFormat?: 'html' | 'pdf' | "markdown" | 'json';
  theme?: 'default' | "professional" | 'minimal' | 'custom';
  customStyles?: string;
  customScripts?: string;
}

export interface ParsedTest {
  id: string;
  name: string;
  description?: string;
  filePath?: string;
  type: 'unit' | "integration" | 'e2e' | 'bdd';
  suites: TestSuite[];
  hooks?: TestHook[];
  metadata?: Record<string, any>;
}

export interface TestSuite {
  id: string;
  name: string;
  description?: string;
  testCases: TestCase[];
  childSuites?: TestSuite[];
  hooks?: TestHook[];
  metadata?: Record<string, any>;
}

export interface TestCase {
  id: string;
  name: string;
  description?: string;
  steps: TestStep[];
  preconditions?: string[];
  postconditions?: string[];
  category?: string;
  priority?: "critical" | 'high' | 'medium' | 'low';
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface TestStep {
  id: string;
  order: number;
  type: 'action' | "assertion" | 'setup' | "teardown";
  action: string;
  expected?: string;
  actual?: string;
  data?: any;
  screenshot?: ScreenshotInfo;
  metadata?: Record<string, any>;
}

export interface TestHook {
  type: 'before' | 'after' | "beforeEach" | "afterEach";
  description: string;
  code?: string;
}

export interface ScreenshotInfo {
  filePath: string;
  caption?: string;
  timestamp?: Date;
  annotations?: ScreenshotAnnotation[];
}

export interface ScreenshotAnnotation {
  type: "highlight" | 'arrow' | 'text';
  coordinates: { x: number; y: number; width?: number; height?: number };
  text?: string;
  color?: string;
}

export interface TestMetadata {
  author?: string;
  version?: string;
  createdAt?: Date;
  updatedAt?: Date;
  tags?: string[];
  requirements?: string[];
  dependencies?: string[];
  estimatedDuration?: number;
  coverage?: CoverageInfo;
  annotations?: TestAnnotation[];
}

export interface CoverageInfo {
  lines?: number;
  branches?: number;
  functions?: number;
  statements?: number;
}

export interface TestAnnotation {
  type: string;
  value: any;
  location?: {
    line: number;
    column: number;
  };
}

export interface TestDocument {
  id: string;
  title: string;
  version?: string;
  generatedAt: Date;
  test: ParsedTest;
  metadata: TestMetadata;
  tableOfContents?: TOCEntry[];
  index?: IndexEntry[];
  glossary?: GlossaryEntry[];
  sections: DocumentSection[];
}

export interface DocumentSection {
  id: string;
  title: string;
  level: number;
  content: string;
  subsections?: DocumentSection[];
  testCases?: TestCase[];
  screenshots?: ScreenshotInfo[];
}

export interface TOCEntry {
  id: string;
  title: string;
  level: number;
  pageNumber?: number;
  href?: string;
  children?: TOCEntry[];
}

export interface IndexEntry {
  term: string;
  references: string[];
  pageNumbers?: number[];
}

export interface GlossaryEntry {
  term: string;
  definition: string;
  relatedTerms?: string[];
}

export interface GeneratedManual {
  success: boolean;
  document?: TestDocument;
  output?: string;
  metadata?: TestMetadata;
  filePath?: string;
  error?: string;
  warnings?: string[];
}

export interface TemplateContext {
  document: TestDocument;
  options: ManualGeneratorOptions;
  helpers: Record<string, Function>;
  partials: Record<string, string>;
}

export interface ProcessorResult {
  success: boolean;
  output?: string;
  format?: string;
  error?: string;
}

export interface ThemeDefinition {
  name: string;
  description?: string;
  rootPath: string;
  testPatterns: string[];
  features?: string[];
  metadata?: Record<string, any>;
}

export interface ScanResult {
  themes: ThemeDefinition[];
  totalTests: number;
  testsByTheme: Map<string, string[]>;
  errors?: string[];
}