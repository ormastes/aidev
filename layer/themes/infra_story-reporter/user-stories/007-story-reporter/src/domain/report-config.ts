import {
  validateObject,
  validateString,
  validateBoolean,
  validateNestedObject,
  ErrorPrefixes
} from '../utils/validation-utils';

/**
 * Report Configuration interface
 * 
 * Defines configuration options for report generation
 * including formatting, styling, and output options.
 */
export interface ReportConfig {
  /** Report title */
  title?: string;
  
  /** Report description */
  description?: string;
  
  /** Whether to include screenshots in reports */
  includeScreenshots?: boolean;
  
  /** Whether to include logs in reports */
  includeLogs?: boolean;
  
  /** Custom file naming pattern */
  fileNamePattern?: string;
  
  /** JSON formatting options */
  jsonFormatting?: {
    indent?: number;
    sortKeys?: boolean;
  };
  
  /** HTML styling options */
  htmlStyling?: {
    theme?: 'light' | 'dark' | 'auto';
    customCSS?: string;
    includeBootstrap?: boolean;
  };
  
  /** XML formatting options */
  xmlFormatting?: {
    indent?: number;
    encoding?: string;
    standalone?: boolean;
  };
  
  /** Markdown formatting options */
  markdownFormatting?: {
    includeTableOfContents?: boolean;
    includeEmojis?: boolean;
    codeBlockLanguage?: string;
  };
  
  /** Additional metadata to include in reports */
  metadata?: Record<string, any>;
}

/**
 * Report Generation Result
 * 
 * Contains the generated report content and metadata
 */
export interface ReportResult {
  /** Generated report content */
  content: string;
  
  /** Report format */
  format: 'html' | 'json' | 'xml' | 'csv' | "markdown" | 'md';
  
  /** File path where report was saved (if applicable) */
  filePath?: string;
  
  /** Report generation timestamp */
  timestamp: Date;
  
  /** Report metadata */
  metadata?: Record<string, any>;
}

/**
 * Multi-format Report Collection
 * 
 * Contains reports in multiple formats
 */
export interface MultiFormatReports {
  /** HTML report content */
  html?: string;
  
  /** JSON report content */
  json?: string;
  
  /** XML report content */
  xml?: string;
  
  /** CSV report content */
  csv?: string;
  
  /** Markdown report content */
  markdown?: string;
}

/**
 * Report Generation Options
 * 
 * Options for controlling report generation behavior
 */
export interface ReportGenerationOptions {
  /** Whether to save reports to file system */
  saveToFile?: boolean;
  
  /** Whether to compress large reports */
  compress?: boolean;
  
  /** Maximum report size in bytes */
  maxSize?: number;
  
  /** Whether to include raw test data */
  includeRawData?: boolean;
  
  /** Custom template path */
  templatePath?: string;
}

/**
 * Creates default report configuration
 * @returns Default report configuration
 */
export function createDefaultReportConfig(): ReportConfig {
  return {
    title: 'Mock Free Test Oriented Development Test Report',
    description: 'Automated Mock Free Test Oriented Development test execution results',
    includeScreenshots: false,
    includeLogs: true,
    fileNamePattern: '{testSuiteId}-{timestamp}-{format}',
    jsonFormatting: {
      indent: 2,
      sortKeys: false
    },
    htmlStyling: {
      theme: 'light',
      includeBootstrap: true
    },
    xmlFormatting: {
      indent: 2,
      encoding: 'UTF-8',
      standalone: true
    },
    markdownFormatting: {
      includeTableOfContents: false,
      includeEmojis: false,
      codeBlockLanguage: 'text'
    },
    metadata: {}
  };
}

/**
 * Validates report configuration
 * @param config Report configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateReportConfig(config: any): void {
  const errorPrefix = ErrorPrefixes.REPORT_CONFIG;
  
  validateObject(config, { errorPrefix });
  
  validateString(config.title, { 
    errorPrefix, 
    fieldName: 'title' 
  });
  
  validateString(config.description, { 
    errorPrefix, 
    fieldName: "description" 
  });
  
  validateBoolean(config.includeScreenshots, { 
    errorPrefix, 
    fieldName: "includeScreenshots" 
  });
  
  validateBoolean(config.includeLogs, { 
    errorPrefix, 
    fieldName: "includeLogs" 
  });
  
  validateString(config.fileNamePattern, { 
    errorPrefix, 
    fieldName: "fileNamePattern" 
  });
  
  validateNestedObject(config.jsonFormatting, { 
    errorPrefix, 
    fieldName: "jsonFormatting" 
  });
  
  validateNestedObject(config.htmlStyling, { 
    errorPrefix, 
    fieldName: "htmlStyling" 
  });
  
  validateNestedObject(config.xmlFormatting, { 
    errorPrefix, 
    fieldName: "xmlFormatting" 
  });
}