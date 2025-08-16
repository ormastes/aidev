/**
 * Core types for circular dependency detection
 * Migrated from research/user-stories/circular-dependency-detection
 */

export interface DependencyNode {
  id: string;
  path: string;
  type: 'file' | 'module' | 'package';
  language: 'typescript' | 'cpp' | 'python';
  metadata?: Record<string, any>;
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: 'import' | 'include' | 'require' | 'link';
  line?: number;
  weight?: number;
  metadata?: Record<string, any>;
}

export interface CircularDependency {
  cycle: string[];
  type: 'import' | 'include' | 'require' | 'link' | 'mixed';
  severity: 'error' | 'warning' | 'info';
  description: string;
  suggestions?: string[];
  affected_files: string[];
}

export interface AnalysisResult {
  success: boolean;
  language: string;
  total_files: number;
  total_dependencies: number;
  circular_dependencies: CircularDependency[];
  analysis_time_ms: number;
  errors: string[];
  warnings: string[];
}

export interface AnalysisOptions {
  include_patterns?: string[];
  exclude_patterns?: string[];
  max_depth?: number;
  follow_external?: boolean;
  include_dev_dependencies?: boolean;
  ignore_dynamic_imports?: boolean;
  cache_enabled?: boolean;
  output_format?: 'json' | 'text' | 'html' | 'dot';
  visualization?: {
    format: 'svg' | 'png' | 'pdf';
    highlight_cycles: boolean;
    max_nodes?: number;
  };
}

export interface LanguageAnalyzer {
  analyze(rootPath: string, options?: AnalysisOptions): Promise<AnalysisResult>;
  getName(): string;
  getSupportedExtensions(): string[];
  validateOptions(options: AnalysisOptions): boolean;
}

export interface ConfigurationFile {
  version: string;
  languages: {
    typescript?: AnalysisOptions;
    cpp?: AnalysisOptions;
    python?: AnalysisOptions;
  };
  global?: AnalysisOptions;
  output?: {
    directory: string;
    formats: string[];
  };
  ci?: {
    fail_on_cycles: boolean;
    max_allowed_cycles: number;
    severity_threshold: 'error' | 'warning' | 'info';
  };
}