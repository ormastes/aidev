import { TestConfiguration } from './test-configuration';

/**
 * Hierarchical Build Configuration for child themes and epics
 * 
 * Extends TestConfiguration to support parent-child relationships
 * and build aggregation across distributed theme/epic builds.
 */
export interface HierarchicalBuildConfig extends TestConfiguration {
  /** Type of build entity */
  buildType: 'epic' | 'theme' | 'story';
  
  /** Parent build configuration ID (null for root) */
  parentId: string | null;
  
  /** Child build configurations */
  children: HierarchicalBuildConfig[];
  
  /** Build-specific settings that can override parent */
  buildSettings?: {
    /** Working directory for this build */
    workingDirectory?: string;
    
    /** Build command to execute */
    buildCommand?: string;
    
    /** Test command to execute */
    testCommand?: string;
    
    /** Environment variables specific to this build */
    env?: Record<string, string>;
    
    /** Dependencies on other builds */
    dependencies?: string[];
    
    /** Build artifacts to collect */
    artifacts?: {
      paths: string[];
      includeReports?: boolean;
      includeCoverage?: boolean;
      includeLogs?: boolean;
    };
  };
  
  /** Aggregation settings for child builds */
  aggregation?: {
    /** Whether to aggregate test results from children */
    aggregateTests?: boolean;
    
    /** Whether to aggregate coverage from children */
    aggregateCoverage?: boolean;
    
    /** Whether to aggregate logs from children */
    aggregateLogs?: boolean;
    
    /** Aggregation strategy */
    strategy?: 'merge' | 'append' | 'hierarchical';
    
    /** Failure handling */
    failureHandling?: 'fail-fast' | 'continue' | 'ignore-children';
  };
  
  /** Build execution order */
  executionOrder?: {
    /** Priority for parallel execution (lower executes first) */
    priority?: number;
    
    /** Whether this build can run in parallel with siblings */
    parallelizable?: boolean;
    
    /** Maximum parallel child builds */
    maxParallelChildren?: number;
  };
}

/**
 * Build execution result for a hierarchical build
 */
export interface HierarchicalBuildResult {
  /** Build configuration ID */
  buildId: string;
  
  /** Build type */
  buildType: 'epic' | 'theme' | 'story';
  
  /** Build status */
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  
  /** Start time */
  startTime?: Date;
  
  /** End time */
  endTime?: Date;
  
  /** Duration in milliseconds */
  duration?: number;
  
  /** Test results (if applicable) */
  testResults?: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    errors: Array<{
      test: string;
      error: string;
      stack?: string;
    }>;
  };
  
  /** Coverage results (if applicable) */
  coverage?: {
    lines: { total: number; covered: number; percentage: number };
    branches: { total: number; covered: number; percentage: number };
    functions: { total: number; covered: number; percentage: number };
    statements: { total: number; covered: number; percentage: number };
  };
  
  /** Build artifacts */
  artifacts?: {
    reports: string[];
    coverage: string[];
    logs: string[];
    other: string[];
  };
  
  /** Child build results */
  children: HierarchicalBuildResult[];
  
  /** Aggregated results from children */
  aggregated?: {
    testResults?: {
      total: number;
      passed: number;
      failed: number;
      skipped: number;
    };
    coverage?: {
      lines: { total: number; covered: number; percentage: number };
      branches: { total: number; covered: number; percentage: number };
      functions: { total: number; covered: number; percentage: number };
      statements: { total: number; covered: number; percentage: number };
    };
  };
  
  /** Build logs */
  logs?: Array<{
    timestamp: Date;
    level: 'trace' | 'debug' | 'info' | 'warn' | 'error';
    message: string;
    source?: string;
  }>;
  
  /** Error information if build failed */
  error?: {
    message: string;
    stack?: string;
    phase?: 'setup' | 'build' | 'test' | 'teardown';
  };
}

/**
 * Create a default hierarchical build configuration
 */
export function createHierarchicalBuildConfig(
  base: TestConfiguration,
  buildType: 'epic' | 'theme' | 'story',
  parentId: string | null = null
): HierarchicalBuildConfig {
  return {
    ...base,
    buildType,
    parentId,
    children: [],
    buildSettings: {
      workingDirectory: './',
      env: {},
      artifacts: {
        paths: [],
        includeReports: true,
        includeCoverage: true,
        includeLogs: true
      }
    },
    aggregation: {
      aggregateTests: true,
      aggregateCoverage: true,
      aggregateLogs: true,
      strategy: 'hierarchical',
      failureHandling: 'continue'
    },
    executionOrder: {
      priority: 0,
      parallelizable: true,
      maxParallelChildren: 4
    }
  };
}

/**
 * Merge parent and child build configurations
 */
export function mergeBuildConfigs(
  parent: HierarchicalBuildConfig,
  child: Partial<HierarchicalBuildConfig>
): HierarchicalBuildConfig {
  return {
    ...parent,
    ...child,
    buildSettings: {
      ...parent.buildSettings,
      ...child.buildSettings,
      env: {
        ...parent.buildSettings?.env,
        ...child.buildSettings?.env
      },
      artifacts: {
        ...parent.buildSettings?.artifacts,
        ...child.buildSettings?.artifacts
      }
    },
    aggregation: {
      ...parent.aggregation,
      ...child.aggregation
    },
    executionOrder: {
      ...parent.executionOrder,
      ...child.executionOrder
    },
    children: child.children || parent.children
  };
}

/**
 * Validate hierarchical build configuration
 */
export function validateHierarchicalBuildConfig(config: any): void {
  if (!config) {
    throw new Error('Hierarchical build configuration is required');
  }
  
  if (!['epic', 'theme', 'story'].includes(config.buildType)) {
    throw new Error(`Invalid build type: ${config.buildType}`);
  }
  
  if (!Array.isArray(config.children)) {
    throw new Error('Children must be an array');
  }
  
  // Validate each child recursively
  for (const child of config.children) {
    validateHierarchicalBuildConfig(child);
  }
  
  // Validate aggregation settings
  if (config.aggregation) {
    const { strategy, failureHandling } = config.aggregation;
    
    if (strategy && !['merge', 'append', 'hierarchical'].includes(strategy)) {
      throw new Error(`Invalid aggregation strategy: ${strategy}`);
    }
    
    if (failureHandling && !['fail-fast', 'continue', 'ignore-children'].includes(failureHandling)) {
      throw new Error(`Invalid failure handling: ${failureHandling}`);
    }
  }
}