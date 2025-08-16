import { EventEmitter } from 'node:events';
import { HierarchicalBuildConfig } from '../domain/hierarchical-build-config';
import { DistributedBuildExecutor } from './distributed-build-executor';
import { TestResultAggregator } from './test-result-aggregator';
import { BuildArtifactCollector } from './build-artifact-collector';
import { UnifiedReportGenerator } from './unified-report-generator';
import { StoryService } from './story-service';
import { TestSuiteManager } from '../external/test-suite-manager';

/**
 * Hierarchical Story Reporter
 * 
 * Main integration point for executing hierarchical builds with
 * child theme/epic support and comprehensive reporting.
 */
export class HierarchicalStoryReporter extends EventEmitter {
  private buildExecutor: DistributedBuildExecutor;
  private resultAggregator: TestResultAggregator;
  private artifactCollector: BuildArtifactCollector;
  private reportGenerator: UnifiedReportGenerator;
  private storyService: StoryService;
  private testSuiteManager: TestSuiteManager;
  
  constructor(options: HierarchicalReporterOptions = {}) {
    super();
    
    this.buildExecutor = new DistributedBuildExecutor();
    this.resultAggregator = new TestResultAggregator();
    this.artifactCollector = new BuildArtifactCollector({
      artifactRoot: options.artifactRoot || './build-artifacts',
      enableCompression: options.enableCompression ?? true,
      retentionPolicy: options.retentionPolicy
    });
    this.reportGenerator = new UnifiedReportGenerator();
    this.storyService = new StoryService(options.storiesPath || './stories');
    this.testSuiteManager = new TestSuiteManager();
    
    this.setupEventForwarding();
  }
  
  /**
   * Initialize the reporter
   */
  async initialize(): Promise<void> {
    await this.storyService.initialize();
    await this.artifactCollector.initialize();
    
    this.emit("initialized", {
      timestamp: new Date()
    });
  }
  
  /**
   * Execute a hierarchical build and generate reports
   */
  async executeHierarchicalBuild(
    config: HierarchicalBuildConfig,
    options: ExecutionOptions = {}
  ): Promise<HierarchicalBuildReport> {
    const startTime = new Date();
    
    this.emit("executionStart", {
      buildId: config.testSuiteId,
      buildType: config.buildType,
      timestamp: startTime
    });
    
    try {
      // Create or update story for this build
      let story = await this.storyService.getStory(config.testSuiteId);
      if (!story) {
        story = await this.storyService.createStory(
          config.testSuiteId,
          `${config.buildType} build for ${config.testSuiteId}`
        );
      }
      
      await this.storyService.updateStatus(story.id, 'in_progress');
      
      // Execute the build
      this.emit('phase', { phase: 'build-execution', timestamp: new Date() });
      const buildResults = await this.buildExecutor.executeBuild(config);
      
      // Aggregate test results
      this.emit('phase', { phase: 'result-aggregation', timestamp: new Date() });
      const aggregatedResults = this.resultAggregator.aggregateResults(buildResults, {
        method: options.aggregationMethod || "hierarchical",
        aggregateCoverage: options.aggregateCoverage ?? true
      });
      
      // Collect artifacts
      this.emit('phase', { phase: 'artifact-collection', timestamp: new Date() });
      const artifacts = await this.artifactCollector.collectArtifacts(buildResults, {
        includeChildren: options.includeChildArtifacts ?? true,
        includeLogs: options.includeLogs ?? true,
        includeCoverage: options.includeCoverage ?? true,
        includeReports: options.includeReports ?? true
      });
      
      // Generate reports
      this.emit('phase', { phase: 'report-generation', timestamp: new Date() });
      const unifiedReport = await this.reportGenerator.generateUnifiedReport(
        buildResults,
        aggregatedResults,
        artifacts,
        {
          title: options.reportTitle || `Build Report - ${config.testSuiteId}`,
          formats: options.reportFormats || ['html', 'json'],
          outputPath: options.reportOutputPath || './reports'
        }
      );
      
      // Update story with results
      await this.updateStoryWithResults(story.id, buildResults, aggregatedResults, unifiedReport);
      
      const endTime = new Date();
      
      const report: HierarchicalBuildReport = {
        buildResults,
        aggregatedResults,
        artifacts,
        unifiedReport,
        story,
        summary: {
          buildId: config.testSuiteId,
          buildType: config.buildType,
          status: buildResults.status,
          duration: endTime.getTime() - startTime.getTime(),
          totalBuilds: aggregatedResults.totalBuilds,
          totalTests: aggregatedResults.totalTests,
          passedTests: aggregatedResults.passedTests,
          failedTests: aggregatedResults.failedTests,
          coverage: aggregatedResults.aggregatedCoverage ? {
            overall: this.calculateOverallCoverage(aggregatedResults.aggregatedCoverage)
          } : undefined
        }
      };
      
      this.emit("executionComplete", {
        buildId: config.testSuiteId,
        status: buildResults.status,
        duration: report.summary.duration,
        timestamp: endTime
      });
      
      return report;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.emit("executionError", {
        buildId: config.testSuiteId,
        error: errorMessage,
        timestamp: new Date()
      });
      
      // Update story with error
      if (story) {
        await this.storyService.updateStatus(story.id, 'failed');
        await this.storyService.addComment(story.id, {
          role: 'system',
          content: `Build execution failed: ${errorMessage}`,
          timestamp: new Date()
        });
      }
      
      throw error;
    }
  }
  
  /**
   * Execute a build from existing test configuration
   */
  async executeFromTestSuite(
    testSuiteId: string,
    buildType: 'epic' | 'theme' | 'story' = 'theme',
    options: ExecutionOptions = {}
  ): Promise<HierarchicalBuildReport> {
    // Configure test suite manager
    this.testSuiteManager.configure({
      testSuiteId,
      featureFiles: options.featureFiles || [],
      stepDefinitions: options.stepDefinitions || [],
      outputFormats: ['json', 'html'],
      outputDirectory: './test-results'
    });
    
    // Create hierarchical config from test suite
    const baseConfig = this.testSuiteManager.getConfiguration();
    const hierarchicalConfig: HierarchicalBuildConfig = {
      ...baseConfig,
      buildType,
      parentId: null,
      children: [],
      buildSettings: {
        testCommand: 'npm test',
        workingDirectory: './',
        artifacts: {
          paths: ['coverage/**', 'test-results/**'],
          includeReports: true,
          includeCoverage: true,
          includeLogs: true
        }
      },
      aggregation: {
        aggregateTests: true,
        aggregateCoverage: true,
        aggregateLogs: true,
        strategy: "hierarchical",
        failureHandling: "continue"
      },
      executionOrder: {
        parallelizable: true,
        maxParallelChildren: 4
      }
    };
    
    return this.executeHierarchicalBuild(hierarchicalConfig, options);
  }
  
  /**
   * Create a build hierarchy from configuration
   */
  createBuildHierarchy(
    epicConfig: EpicConfiguration
  ): HierarchicalBuildConfig {
    const epic: HierarchicalBuildConfig = {
      testSuiteId: epicConfig.id,
      buildType: 'epic',
      parentId: null,
      children: [],
      featureFiles: [],
      stepDefinitions: [],
      buildSettings: epicConfig.buildSettings,
      aggregation: {
        aggregateTests: true,
        aggregateCoverage: true,
        aggregateLogs: true,
        strategy: "hierarchical",
        failureHandling: epicConfig.failureHandling || "continue"
      },
      executionOrder: {
        parallelizable: epicConfig.parallel ?? true,
        maxParallelChildren: epicConfig.maxParallel || 4
      }
    };
    
    // Add themes
    for (const themeConfig of epicConfig.themes) {
      const theme: HierarchicalBuildConfig = {
        testSuiteId: themeConfig.id,
        buildType: 'theme',
        parentId: epic.testSuiteId,
        children: [],
        featureFiles: themeConfig.featureFiles || [],
        stepDefinitions: themeConfig.stepDefinitions || [],
        buildSettings: {
          ...epic.buildSettings,
          ...themeConfig.buildSettings
        },
        aggregation: epic.aggregation,
        executionOrder: {
          parallelizable: themeConfig.parallel ?? true,
          maxParallelChildren: themeConfig.maxParallel || 2
        }
      };
      
      // Add stories
      for (const storyConfig of themeConfig.stories || []) {
        const story: HierarchicalBuildConfig = {
          testSuiteId: storyConfig.id,
          buildType: 'story',
          parentId: theme.testSuiteId,
          children: [],
          featureFiles: storyConfig.featureFiles,
          stepDefinitions: storyConfig.stepDefinitions,
          buildSettings: {
            ...theme.buildSettings,
            ...storyConfig.buildSettings
          },
          aggregation: theme.aggregation,
          executionOrder: {
            parallelizable: false,
            maxParallelChildren: 1
          }
        };
        
        theme.children.push(story);
      }
      
      epic.children.push(theme);
    }
    
    return epic;
  }
  
  /**
   * Get build status
   */
  getBuildStatus(buildId: string): any {
    return this.buildExecutor.getBuildResult(buildId);
  }
  
  /**
   * Cancel ongoing builds
   */
  cancel(): void {
    this.buildExecutor.cancel();
    this.emit("cancelled", { timestamp: new Date() });
  }
  
  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    this.buildExecutor.clearResults();
    await this.testSuiteManager.cleanup();
    
    this.emit('cleanup', { timestamp: new Date() });
  }
  
  /**
   * Update story with build results
   */
  private async updateStoryWithResults(
    storyId: string,
    buildResults: any,
    aggregatedResults: any,
    unifiedReport: any
  ): Promise<void> {
    const status = buildResults.status === 'passed' ? 'success' :
                  buildResults.status === 'failed' ? 'failed' :
                  buildResults.status === 'skipped' ? 'pending' : 'in_progress';
    
    await this.storyService.updateStatus(storyId, status);
    
    // Add test results
    if (aggregatedResults.totalTests > 0) {
      await this.storyService.addTestCase(storyId, {
        name: 'Hierarchical Build Tests',
        status: buildResults.status === 'passed' ? 'passed' : 'failed',
        duration: buildResults.duration,
        steps: [
          {
            name: 'Execute builds',
            status: 'passed',
            duration: 0
          },
          {
            name: 'Aggregate results',
            status: 'passed',
            duration: 0
          },
          {
            name: 'Generate reports',
            status: 'passed',
            duration: 0
          }
        ]
      });
    }
    
    // Update coverage
    if (aggregatedResults.aggregatedCoverage) {
      await this.storyService.updateCoverage(storyId, {
        overall: this.calculateOverallCoverage(aggregatedResults.aggregatedCoverage),
        lines: aggregatedResults.aggregatedCoverage.lines.percentage,
        branches: aggregatedResults.aggregatedCoverage.branches.percentage,
        functions: aggregatedResults.aggregatedCoverage.functions.percentage,
        statements: aggregatedResults.aggregatedCoverage.statements.percentage
      });
    }
    
    // Add summary comment
    const summary = this.resultAggregator.generateSummaryReport(aggregatedResults);
    await this.storyService.addComment(storyId, {
      role: "reporter",
      content: `Build completed with status: ${buildResults.status}\n\n` +
               `Total Builds: ${summary.overview.totalBuilds}\n` +
               `Total Tests: ${summary.overview.totalTests}\n` +
               `Pass Rate: ${summary.overview.passRate}\n` +
               (summary.coverage ? `Coverage: ${summary.coverage.overall}\n` : '') +
               `\nKey Findings:\n${summary.keyFindings.map(f => `- ${f}`).join('\n')}`,
      timestamp: new Date()
    });
  }
  
  /**
   * Calculate overall coverage percentage
   */
  private calculateOverallCoverage(coverage: any): number {
    const metrics = ['lines', "branches", "functions", "statements"];
    const sum = metrics.reduce((acc, metric) => acc + coverage[metric].percentage, 0);
    return sum / metrics.length;
  }
  
  /**
   * Setup event forwarding from child components
   */
  private setupEventForwarding(): void {
    // Forward build executor events
    this.buildExecutor.on("buildStart", (event) => 
      this.emit("buildStart", event));
    this.buildExecutor.on("buildComplete", (event) => 
      this.emit("buildComplete", event));
    this.buildExecutor.on("buildError", (event) => 
      this.emit("buildError", event));
    this.buildExecutor.on("buildLog", (event) => 
      this.emit("buildLog", event));
    
    // Forward aggregator events
    this.resultAggregator.on("aggregationStart", (event) => 
      this.emit("aggregationStart", event));
    this.resultAggregator.on("aggregationComplete", (event) => 
      this.emit("aggregationComplete", event));
    
    // Forward artifact collector events
    this.artifactCollector.on("collectionStart", (event) => 
      this.emit("artifactCollectionStart", event));
    this.artifactCollector.on("collectionComplete", (event) => 
      this.emit("artifactCollectionComplete", event));
    
    // Forward report generator events
    this.reportGenerator.on("reportGenerationStart", (event) => 
      this.emit("reportGenerationStart", event));
    this.reportGenerator.on("reportGenerationComplete", (event) => 
      this.emit("reportGenerationComplete", event));
  }
}

// Type definitions

interface HierarchicalReporterOptions {
  artifactRoot?: string;
  storiesPath?: string;
  enableCompression?: boolean;
  retentionPolicy?: {
    maxAgeInDays?: number;
    maxSizeInMB?: number;
    maxBuilds?: number;
  };
}

interface ExecutionOptions {
  aggregationMethod?: "hierarchical" | 'flat' | 'grouped';
  aggregateCoverage?: boolean;
  includeChildArtifacts?: boolean;
  includeLogs?: boolean;
  includeCoverage?: boolean;
  includeReports?: boolean;
  reportTitle?: string;
  reportFormats?: string[];
  reportOutputPath?: string;
  featureFiles?: string[];
  stepDefinitions?: string[];
}

interface HierarchicalBuildReport {
  buildResults: any;
  aggregatedResults: any;
  artifacts: any;
  unifiedReport: any;
  story: any;
  summary: {
    buildId: string;
    buildType: string;
    status: string;
    duration: number;
    totalBuilds: number;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    coverage?: {
      overall: number;
    };
  };
}

interface EpicConfiguration {
  id: string;
  buildSettings?: any;
  failureHandling?: 'fail-fast' | "continue" | 'ignore-children';
  parallel?: boolean;
  maxParallel?: number;
  themes: ThemeConfiguration[];
}

interface ThemeConfiguration {
  id: string;
  featureFiles?: string[];
  stepDefinitions?: string[];
  buildSettings?: any;
  parallel?: boolean;
  maxParallel?: number;
  stories?: StoryConfiguration[];
}

interface StoryConfiguration {
  id: string;
  featureFiles: string[];
  stepDefinitions: string[];
  buildSettings?: any;
}

export {
  HierarchicalStoryReporter,
  HierarchicalReporterOptions,
  ExecutionOptions,
  HierarchicalBuildReport,
  EpicConfiguration
};