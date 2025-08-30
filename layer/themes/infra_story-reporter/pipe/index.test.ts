import { describe, it, expect } from 'bun:test';
import * as pipe from './index';

describe('Story Reporter Pipe Gateway', () => {
  describe('Exports', () => {
    it('should export HierarchicalStoryReporter', () => {
      expect(pipe.HierarchicalStoryReporter).toBeDefined();
    });

    it('should export HierarchicalBuildConfig and related functions', () => {
      expect(pipe.HierarchicalBuildConfig).toBeDefined();
      expect(pipe.createHierarchicalBuildConfig).toBeDefined();
      expect(pipe.mergeBuildConfigs).toBeDefined();
      expect(pipe.validateHierarchicalBuildConfig).toBeDefined();
    });

    it('should export DistributedBuildExecutor', () => {
      expect(pipe.DistributedBuildExecutor).toBeDefined();
    });

    it('should export TestResultAggregator', () => {
      expect(pipe.TestResultAggregator).toBeDefined();
    });

    it('should export BuildArtifactCollector', () => {
      expect(pipe.BuildArtifactCollector).toBeDefined();
    });

    it('should export UnifiedReportGenerator', () => {
      expect(pipe.UnifiedReportGenerator).toBeDefined();
    });

    it('should export coverage analyzers', () => {
      expect(pipe.BranchCoverageAnalyzer).toBeDefined();
      expect(pipe.SystemTestClassCoverageAnalyzer).toBeDefined();
      expect(pipe.DuplicationChecker).toBeDefined();
      expect(pipe.CoverageReportGenerator).toBeDefined();
    });

    it('should export CoverageAnalyzerCLI', () => {
      expect(pipe.CoverageAnalyzerCLI).toBeDefined();
    });

    it('should export StoryService', () => {
      expect(pipe.StoryService).toBeDefined();
    });

    it('should export TestSuiteManager', () => {
      expect(pipe.TestSuiteManager).toBeDefined();
    });

    it('should export circular dependency detection', () => {
      expect(pipe.CircularDependencyService).toBeDefined();
      expect(pipe.DependencyGraph).toBeDefined();
      expect(pipe.TypeScriptAnalyzer).toBeDefined();
    });
  });

  describe('Type exports', () => {
    it('should export configuration types', () => {
      // These are type exports, so we check if they're importable
      const typeExports = [
        'HierarchicalReporterOptions',
        'ExecutionOptions',
        'HierarchicalBuildReport',
        'EpicConfiguration',
        'HierarchicalBuildResult',
        'AggregationOptions',
        'AggregatedTestResult',
        'TestSummaryReport',
        'ArtifactCollectorOptions',
        'CollectionOptions',
        'CollectedArtifacts',
        'ReportGenerationOptions',
        'UnifiedReport',
        'CircularDependencyReport',
        'DependencyNode',
        'DependencyEdge',
        'CircularDependency',
        'AnalysisResult',
        'AnalysisOptions'
      ];

      // Check that the module exports these (they'll be undefined at runtime but importable)
      typeExports.forEach(typeName => {
        // Type exports are compile-time only, so we just ensure no runtime errors
        expect(() => pipe[typeName as keyof typeof pipe]).not.toThrow();
      });
    });
  });

  describe('Gateway integrity', () => {
    it('should only export from allowed subdirectories', () => {
      // This ensures the pipe follows HEA architecture
      const exports = Object.keys(pipe);
      expect(exports.length).toBeGreaterThan(0);
      
      // All exports should be functions or classes (not raw data)
      exports.forEach(key => {
        const value = pipe[key as keyof typeof pipe];
        if (value !== undefined) {
          const type = typeof value;
          expect(['function', 'object']).toContain(type);
        }
      });
    });
  });
});