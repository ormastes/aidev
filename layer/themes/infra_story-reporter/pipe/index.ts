/**
 * story-reporter theme pipe gateway
 * All external access to this theme must go through this file
 */

// Export hierarchical build support
export {
  HierarchicalStoryReporter,
  HierarchicalReporterOptions,
  ExecutionOptions,
  HierarchicalBuildReport,
  EpicConfiguration
} from '../user-stories/007-story-reporter/src/services/hierarchical-story-reporter';

export {
  HierarchicalBuildConfig,
  HierarchicalBuildResult,
  createHierarchicalBuildConfig,
  mergeBuildConfigs,
  validateHierarchicalBuildConfig
} from '../user-stories/007-story-reporter/src/domain/hierarchical-build-config';

export {
  DistributedBuildExecutor
} from '../user-stories/007-story-reporter/src/services/distributed-build-executor';

export {
  TestResultAggregator,
  AggregationOptions,
  AggregatedTestResult,
  TestSummaryReport
} from '../user-stories/007-story-reporter/src/services/test-result-aggregator';

export {
  BuildArtifactCollector,
  ArtifactCollectorOptions,
  CollectionOptions,
  CollectedArtifacts
} from '../user-stories/007-story-reporter/src/services/build-artifact-collector';

export {
  UnifiedReportGenerator,
  ReportGenerationOptions,
  UnifiedReport
} from '../user-stories/007-story-reporter/src/services/unified-report-generator';

// Export coverage and duplication analysis services
export {
  BranchCoverageAnalyzer
} from '../src/services/branch-coverage-analyzer';

export {
  SystemTestClassCoverageAnalyzer
} from '../src/services/system-test-class-coverage-analyzer';

export {
  DuplicationChecker
} from '../src/services/duplication-checker';

export {
  CoverageReportGenerator
} from '../src/services/coverage-report-generator';

export {
  CoverageAnalyzerCLI
} from '../src/cli/coverage-analyzer';

// Export existing story reporter functionality
export {
  StoryService
} from '../user-stories/007-story-reporter/src/services/story-service';

export {
  TestSuiteManager
} from '../user-stories/007-story-reporter/src/external/test-suite-manager';

// Export circular dependency detection functionality
export {
  CircularDependencyService,
  CircularDependencyReport
} from '../src/services/circular-dependency';

export {
  DependencyGraph,
  TypeScriptAnalyzer,
  DependencyNode,
  DependencyEdge,
  CircularDependency,
  AnalysisResult,
  AnalysisOptions
} from '../src/services/circular-dependency';
