import { fileAPI } from '../utils/file-api';
import { fsPromises as fs } from 'fs/promises';
import { join } from 'node:path';

/**
 * Setup Aggregator Service
 * 
 * Aggregates test coverage, branch coverage, and duplication metrics
 * from setup folder configurations without changing the JSON format
 */
export class SetupAggregator {
  private setupPath: string;

  constructor(setupPath: string = '/home/ormastes/dev/aidev/scripts/setup') {
    this.setupPath = setupPath;
  }

  /**
   * Aggregate all setup metrics from the setup folder
   * @returns Aggregated metrics including coverage and duplication
   */
  async aggregateMetrics(): Promise<AggregatedMetrics> {
    const themes = await this.findThemes();
    const connectedThemes = await this.findConnectedThemes();
    const allThemes = [...themes, ...connectedThemes];
    const themeMetrics: ThemeMetrics[] = [];
    
    for (const theme of allThemes) {
      const metrics = await this.getThemeMetrics(theme);
      if (metrics) {
        themeMetrics.push(metrics);
      }
    }
    
    return this.calculateAggregatedMetrics(themeMetrics);
  }

  /**
   * Find connected themes from the theme registry
   * @returns Array of connected theme paths
   */
  private async findConnectedThemes(): Promise<string[]> {
    const connectedThemes: string[] = [];
    const rootPath = join(this.setupPath, '..', '..');
    const registryPath = join(rootPath, 'gen', 'themes-registry.json');
    
    try {
      const content = await fileAPI.readFile(registryPath, 'utf8');
      const registry = JSON.parse(content);
      
      if (registry.themes && Array.isArray(registry.themes)) {
        for (const theme of registry.themes) {
          if (theme.connected && theme.path) {
            const themePath = join(rootPath, theme.path);
            connectedThemes.push(themePath);
          }
        }
      }
    } catch (error) {
      // Registry might not exist yet
    }
    
    return connectedThemes;
  }

  /**
   * Find all themes in the setup folder
   * @returns Array of theme paths
   */
  private async findThemes(): Promise<string[]> {
    const themes: string[] = [];
    
    try {
      // Check demo folder
      const demoPath = join(this.setupPath, 'demo');
      const demoEntries = await fs.readdir(demoPath, { withFileTypes: true });
      
      for (const entry of demoEntries) {
        if (entry.isDirectory()) {
          themes.push(join(demoPath, entry.name));
        }
      }
      
      // Check release folder
      const releasePath = join(this.setupPath, 'release');
      try {
        const releaseEntries = await fs.readdir(releasePath, { withFileTypes: true });
        
        for (const entry of releaseEntries) {
          if (entry.isDirectory()) {
            themes.push(join(releasePath, entry.name));
          }
        }
      } catch (error) {
        // Release folder might not exist
      }
      
      // Check theme_demos folder
      const themeDemosPath = join(this.setupPath, 'theme_demos');
      try {
        const themeDemoEntries = await fs.readdir(themeDemosPath, { withFileTypes: true });
        
        for (const entry of themeDemoEntries) {
          if (entry.isDirectory()) {
            const subPath = join(themeDemosPath, entry.name);
            const subEntries = await fs.readdir(subPath, { withFileTypes: true });
            
            for (const subEntry of subEntries) {
              if (subEntry.isDirectory()) {
                themes.push(join(subPath, subEntry.name));
              }
            }
          }
        }
      } catch (error) {
        // Theme demos folder might not exist
      }
    } catch (error) {
      console.error('Error finding themes:', error);
    }
    
    return themes;
  }

  /**
   * Get metrics for a specific theme
   * @param themePath Path to the theme
   * @returns Theme metrics or null if not found
   */
  private async getThemeMetrics(themePath: string): Promise<ThemeMetrics | null> {
    try {
      const themeName = themePath.split('/').pop() || 'unknown';
      
      // Look for test configuration files
      const testConfigPaths = [
        join(themePath, 'jest.config.js'),
        join(themePath, 'vitest.config.ts'),
        join(themePath, '.nycrc.json'),
        join(themePath, 'coverage/coverage-summary.json'),
        join(themePath, 'test-results/coverage.json')
      ];
      
      let coverageData: CoverageData | null = null;
      
      // Try to find coverage data
      for (const configPath of testConfigPaths) {
        try {
          if (configPath.includes('coverage-summary.json') || configPath.includes('coverage.json')) {
            const content = await fileAPI.readFile(configPath, 'utf8');
            const data = JSON.parse(content);
            coverageData = this.parseCoverageData(data);
            break;
          }
        } catch (error) {
          // Continue to next path
        }
      }
      
      // Look for duplication data
      const duplicationPath = join(themePath, 'duplication-report.json');
      let duplicationData: DuplicationData | null = null;
      
      try {
        const content = await fileAPI.readFile(duplicationPath, 'utf8');
        duplicationData = JSON.parse(content);
      } catch (error) {
        // Default duplication data
        duplicationData = {
          percentage: 0,
          duplicatedLines: 0,
          totalLines: 0,
          duplicatedBlocks: []
        };
      }
      
      if (!coverageData) {
        // Default coverage data
        coverageData = {
          systemTest: this.createDefaultCoverage(),
          overall: this.createDefaultCoverage()
        };
      }
      
      return {
        name: themeName,
        path: themePath,
        coverage: coverageData,
        duplication: duplicationData
      };
    } catch (error) {
      console.error(`Error getting metrics for ${themePath}:`, error);
      return null;
    }
  }

  /**
   * Parse coverage data from various formats
   * @param data Raw coverage data
   * @returns Normalized coverage data
   */
  private parseCoverageData(data: any): CoverageData {
    // Handle Istanbul/NYC format
    if (data.total) {
      return {
        systemTest: this.convertCoverageMetrics(data.total),
        overall: this.convertCoverageMetrics(data.total)
      };
    }
    
    // Handle custom format with system test data
    if (data.systemTest && data.overall) {
      return {
        systemTest: this.convertCoverageMetrics(data.systemTest),
        overall: this.convertCoverageMetrics(data.overall)
      };
    }
    
    // Default
    return {
      systemTest: this.createDefaultCoverage(),
      overall: this.createDefaultCoverage()
    };
  }

  /**
   * Convert coverage metrics to standard format
   * @param metrics Raw metrics
   * @returns Standardized coverage details
   */
  private convertCoverageMetrics(metrics: any): CoverageDetails {
    return {
      class: {
        percentage: metrics.statements?.pct || 0,
        covered: metrics.statements?.covered || 0,
        total: metrics.statements?.total || 0
      },
      branch: {
        percentage: metrics.branches?.pct || 0,
        covered: metrics.branches?.covered || 0,
        total: metrics.branches?.total || 0
      },
      line: {
        percentage: metrics.lines?.pct || 0,
        covered: metrics.lines?.covered || 0,
        total: metrics.lines?.total || 0
      },
      method: {
        percentage: metrics.functions?.pct || 0,
        covered: metrics.functions?.covered || 0,
        total: metrics.functions?.total || 0
      }
    };
  }

  /**
   * Create default coverage data
   * @returns Default coverage details
   */
  private createDefaultCoverage(): CoverageDetails {
    return {
      class: { percentage: 0, covered: 0, total: 0 },
      branch: { percentage: 0, covered: 0, total: 0 },
      line: { percentage: 0, covered: 0, total: 0 },
      method: { percentage: 0, covered: 0, total: 0 }
    };
  }

  /**
   * Calculate aggregated metrics from all themes
   * @param themeMetrics Array of theme metrics
   * @returns Aggregated metrics
   */
  private calculateAggregatedMetrics(themeMetrics: ThemeMetrics[]): AggregatedMetrics {
    const aggregated: AggregatedMetrics = {
      timestamp: new Date().toISOString(),
      themes: themeMetrics,
      aggregatedMetrics: {
        overall: this.createDefaultCoverage(),
        systemTest: this.createDefaultCoverage(),
        unitTest: this.createDefaultCoverage(),
        integrationTest: this.createDefaultCoverage()
      },
      passCriteria: {
        systemTestClassCoverage: { threshold: 80, actual: 0, passed: false },
        branchCoverage: { threshold: 80, actual: 0, passed: false },
        duplicationThreshold: { threshold: 5, actual: 0, passed: true }
      }
    };
    
    if (themeMetrics.length === 0) {
      return aggregated;
    }
    
    // Calculate aggregated coverage
    let totalSystemCovered = 0, totalSystemTotal = 0;
    let totalBranchCovered = 0, totalBranchTotal = 0;
    let totalDuplicatedLines = 0, totalLines = 0;
    
    for (const theme of themeMetrics) {
      // System test class coverage
      totalSystemCovered += theme.coverage.systemTest.class.covered;
      totalSystemTotal += theme.coverage.systemTest.class.total;
      
      // Branch coverage
      totalBranchCovered += theme.coverage.overall.branch.covered;
      totalBranchTotal += theme.coverage.overall.branch.total;
      
      // Duplication
      totalDuplicatedLines += theme.duplication.duplicatedLines;
      totalLines += theme.duplication.totalLines;
    }
    
    // Calculate percentages
    const systemTestClassPercentage = totalSystemTotal > 0 
      ? (totalSystemCovered / totalSystemTotal) * 100 
      : 0;
    
    const branchPercentage = totalBranchTotal > 0 
      ? (totalBranchCovered / totalBranchTotal) * 100 
      : 0;
    
    const duplicationPercentage = totalLines > 0 
      ? (totalDuplicatedLines / totalLines) * 100 
      : 0;
    
    // Update aggregated metrics
    aggregated.aggregatedMetrics.systemTest.class = {
      percentage: systemTestClassPercentage,
      covered: totalSystemCovered,
      total: totalSystemTotal
    };
    
    aggregated.aggregatedMetrics.overall.branch = {
      percentage: branchPercentage,
      covered: totalBranchCovered,
      total: totalBranchTotal
    };
    
    // Update pass criteria
    aggregated.passCriteria.systemTestClassCoverage.actual = systemTestClassPercentage;
    aggregated.passCriteria.systemTestClassCoverage.passed = systemTestClassPercentage >= 80;
    
    aggregated.passCriteria.branchCoverage.actual = branchPercentage;
    aggregated.passCriteria.branchCoverage.passed = branchPercentage >= 80;
    
    aggregated.passCriteria.duplicationThreshold.actual = duplicationPercentage;
    aggregated.passCriteria.duplicationThreshold.passed = duplicationPercentage <= 5;
    
    return aggregated;
  }

  /**
   * Get setup configuration from test setup
   * @param themePath Path to theme
   * @returns Setup configuration
   */
  async getSetupConfig(themePath?: string): Promise<SetupConfig> {
    const defaultConfig: SetupConfig = {
      testFramework: 'jest',
      coverageThreshold: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      },
      testTimeout: 30000,
      environment: 'test'
    };
    
    if (!themePath) {
      return defaultConfig;
    }
    
    try {
      // Try to read package.json for test framework info
      const packageJsonPath = join(themePath, 'package.json');
      const packageJson = JSON.parse(await fileAPI.readFile(packageJsonPath, 'utf8'));
      
      if (packageJson.devDependencies) {
        if (packageJson.devDependencies.vitest) {
          defaultConfig.testFramework = 'vitest';
        } else if (packageJson.devDependencies.mocha) {
          defaultConfig.testFramework = 'mocha';
        }
      }
      
      // Try to read test configuration
      const configPaths = [
        join(themePath, 'jest.config.js'),
        join(themePath, 'vitest.config.ts'),
        join(themePath, '.env.test')
      ];
      
      for (const configPath of configPaths) {
        try {
          const content = await fileAPI.readFile(configPath, 'utf8');
          
          // Parse coverage thresholds from config
          const thresholdMatch = content.match(/coverageThreshold[^{]*{([^}]+)}/);
          if (thresholdMatch) {
            const thresholdContent = thresholdMatch[1];
            const branches = thresholdContent.match(/branches:\s*(\d+)/);
            const functions = thresholdContent.match(/functions:\s*(\d+)/);
            const lines = thresholdContent.match(/lines:\s*(\d+)/);
            const statements = thresholdContent.match(/statements:\s*(\d+)/);
            
            if (branches) defaultConfig.coverageThreshold.branches = parseInt(branches[1]);
            if (functions) defaultConfig.coverageThreshold.functions = parseInt(functions[1]);
            if (lines) defaultConfig.coverageThreshold.lines = parseInt(lines[1]);
            if (statements) defaultConfig.coverageThreshold.statements = parseInt(statements[1]);
          }
          
          // Parse test timeout
          const timeoutMatch = content.match(/TEST_TIMEOUT=(\d+)/);
          if (timeoutMatch) {
            defaultConfig.testTimeout = parseInt(timeoutMatch[1]);
          }
          
          break;
        } catch (error) {
          // Continue to next config
        }
      }
    } catch (error) {
      console.error('Error reading setup config:', error);
    }
    
    return defaultConfig;
  }
}

// Type definitions
interface CoverageMetric {
  percentage: number;
  covered: number;
  total: number;
}

interface CoverageDetails {
  class: CoverageMetric;
  branch: CoverageMetric;
  line: CoverageMetric;
  method: CoverageMetric;
}

interface CoverageData {
  systemTest: CoverageDetails;
  overall: CoverageDetails;
}

interface DuplicationData {
  percentage: number;
  duplicatedLines: number;
  totalLines: number;
  duplicatedBlocks: Array<{
    files: string[];
    lines: number;
    tokens: number;
  }>;
}

interface ThemeMetrics {
  name: string;
  path: string;
  coverage: CoverageData;
  duplication: DuplicationData;
}

interface PassCriterion {
  threshold: number;
  actual: number;
  passed: boolean;
}

interface AggregatedMetrics {
  timestamp: string;
  themes: ThemeMetrics[];
  aggregatedMetrics: {
    overall: CoverageDetails;
    systemTest: CoverageDetails;
    unitTest: CoverageDetails;
    integrationTest: CoverageDetails;
  };
  passCriteria: {
    systemTestClassCoverage: PassCriterion;
    branchCoverage: PassCriterion;
    duplicationThreshold: PassCriterion;
  };
}

interface SetupConfig {
  testFramework: string;
  coverageThreshold: {
    branches: number;
    functions: number;
    lines: number;
    statements: number;
  };
  testTimeout: number;
  environment: string;
}

export type { 
  AggregatedMetrics, 
  ThemeMetrics, 
  CoverageData, 
  DuplicationData, 
  SetupConfig,
  CoverageDetails,
  CoverageMetric
};