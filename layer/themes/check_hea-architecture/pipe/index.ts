/**
 * HEA Architecture Checker - Gateway
 * Validates and enforces Hierarchical Encapsulation Architecture
 */

export { HEAValidator } from '../children/validator';
export { HEAAnalyzer } from '../children/analyzer';
export { HEAReporter } from '../children/reporter';
export { HEAFixer } from '../children/fixer';
export { HEARules } from '../children/rules';

// Export types
export type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationOptions,
  FileValidation
} from '../children/validator';

export type {
  AnalysisResult,
  StructureAnalysis,
  DependencyGraph,
  LayerMetrics,
  ViolationSeverity
} from '../children/analyzer';

export type {
  Report,
  ReportFormat,
  ReportOptions,
  ViolationReport,
  ComplianceScore
} from '../children/reporter';

export type {
  FixResult,
  FixOptions,
  AutoFixable,
  FixSuggestion,
  RefactorPlan
} from '../children/fixer';

export type {
  Rule,
  RuleSet,
  RuleViolation,
  RuleOptions,
  CustomRule
} from '../children/rules';

// Export constants
export const HEA_PATTERNS = {
  PIPE_PATTERN: '**/pipe/index.{ts,js}',
  CHILDREN_PATTERN: '**/children/*/index.{ts,js}',
  LAYER_PATTERN: 'layer/**/*',
  THEME_PATTERN: 'layer/themes/**/*',
  FORBIDDEN_IMPORTS: [
    'direct cross-layer imports',
    'circular dependencies',
    'bypassing pipe gateway'
  ]
};

// Export utilities
export { validateProject, analyzeStructure, generateReport, autoFix } from './utils';