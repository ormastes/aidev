/**
 * UILogic Types
 * Shared types for the UI business logic layer
 */

export interface ConversionRequest {
  files: File[];
  options: {
    format: 'markdown' | 'html' | 'json';
    includeCommonScenarios: boolean;
    generateSequences: boolean;
    minSequenceLength?: number;
    commonScenarioThreshold?: number;
    enableCaptures?: boolean;
    captureOptions?: {
      platform: 'ios' | 'android' | 'web' | 'desktop';
      deviceId?: string;
      browserName?: string;
    };
  };
}

export interface ConversionResult {
  success: boolean;
  data?: {
    outputFiles: OutputFile[];
    preview: string;
    downloadUrl?: string;
  };
  statistics?: {
    totalTests: number;
    commonTests: number;
    sequences: number;
    processingTime: number;
  };
  errors?: string[];
  warnings?: string[];
}

export interface OutputFile {
  name: string;
  path: string;
  size: number;
  type: 'main' | 'test' | 'sequence' | 'common';
  preview?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  timestamp: number;
}

export interface ProcessedFile {
  originalName: string;
  content: string;
  type: 'feature' | 'jest' | 'mocha' | 'unknown';
  metadata: {
    framework?: string;
    testCount?: number;
    hasErrors?: boolean;
  };
}