import { CoverageAggregator } from './coverage-aggregator';
import { CoverageReportGenerator } from './coverage-report-generator';
import { SetupAggregatorAdapter } from './setup-aggregator-adapter';
import { AggregatedCoverage } from '../models/coverage-metrics';
import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';

export class IntegratedCoverageService {
  private coverageAggregator: CoverageAggregator;
  private reportGenerator: CoverageReportGenerator;

  constructor(
    layerPath: string = path.join(process.cwd(), 'layer'),
    outputDir: string = path.join(process.cwd(), 'gen/doc/coverage')
  ) {
    this.coverageAggregator = new CoverageAggregator(layerPath);
    this.reportGenerator = new CoverageReportGenerator(outputDir);
  }

  /**
   * Generates comprehensive app-level coverage report using both layer structure
   * and setup folder data
   */
  async generateIntegratedReport(): Promise<void> {
    console.log('📊 Starting integrated coverage aggregation...\n');

    // Get coverage from layer structure
    const layerCoverage = await this.coverageAggregator.aggregateAppCoverage();
    console.log('✅ Aggregated layer structure coverage');

    // Check for setup folder coverage data
    const setupCoverage = await this.loadSetupCoverage();
    if (setupCoverage) {
      console.log('✅ Loaded setup folder coverage');
      
      // Merge coverage data
      const integratedCoverage = this.mergeLayerAndSetupCoverage(layerCoverage, setupCoverage);
      console.log('✅ Merged layer and setup coverage data');
      
      // Generate reports
      await this.reportGenerator.generateReport(integratedCoverage);
      console.log('✅ Generated integrated coverage reports');
    } else {
      console.log('⚠️  No setup folder coverage found, using layer coverage only');
      await this.reportGenerator.generateReport(layerCoverage);
    }

    console.log('\n📁 Reports generated in: gen/doc/coverage/');
  }

  /**
   * Loads coverage data from setup folder if available
   */
  private async loadSetupCoverage(): Promise<AggregatedCoverage | null> {
    const setupPath = path.join(process.cwd(), 'scripts/setup');
    const setupThemes: AggregatedCoverage[] = [];

    // Scan demo and release folders
    for (const folder of ['demo', 'release']) {
      const folderPath = path.join(setupPath, folder);
      if (fs.existsSync(folderPath)) {
        const themes = await this.scanSetupFolder(folderPath, folder);
        setupThemes.push(...themes);
      }
    }

    if (setupThemes.length === 0) {
      return null;
    }

    // Calculate aggregated metrics for setup themes
    const aggregatedMetrics = this.recalculateMetrics(setupThemes);
    
    return {
      name: 'Setup Themes',
      type: 'setup',
      path: setupPath,
      coverage: aggregatedMetrics.coverage,
      systemTestCoverage: aggregatedMetrics.systemTestCoverage,
      duplication: aggregatedMetrics.duplication,
      children: setupThemes,
      timestamp: new Date()
    };
  }

  /**
   * Scans a setup folder (demo/release) for theme coverage
   */
  private async scanSetupFolder(folderPath: string, folderType: string): Promise<AggregatedCoverage[]> {
    const themes: AggregatedCoverage[] = [];
    
    try {
      const entries = fs.readdirSync(folderPath);
      
      for (const entry of entries) {
        const entryPath = path.join(folderPath, entry);
        const stat = fs.statSync(entryPath);
        
        if (stat.isDirectory()) {
          // Check if it's a theme with coverage data
          const coveragePath = path.join(entryPath, 'coverage', 'coverage-final.json');
          if (fs.existsSync(coveragePath)) {
            const coverage = await this.loadThemeCoverage(entryPath, entry, folderType);
            if (coverage) {
              themes.push(coverage);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Failed to scan setup folder ${folderPath}:`, error);
    }
    
    return themes;
  }

  /**
   * Loads coverage data for a single theme in setup folder
   */
  private async loadThemeCoverage(themePath: string, themeName: string, folderType: string): Promise<AggregatedCoverage | null> {
    try {
      const coveragePath = path.join(themePath, 'coverage', 'coverage-final.json');
      const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      
      // Extract coverage metrics
      const metrics = this.extractCoverageMetrics(coverageData);
      
      // Check for system test coverage
      const systemTestPath = path.join(themePath, 'coverage', 'system-test-coverage.json');
      const systemTestCoverage = fs.existsSync(systemTestPath) 
        ? JSON.parse(fs.readFileSync(systemTestPath, 'utf8'))
        : { classCount: 0, coveredClassCount: 0, classCoveragePct: 0 };
      
      // Calculate duplication (simplified for now)
      const duplication = {
        duplicatedLines: 0,
        totalLines: metrics.lines.total,
        duplicationPct: 0
      };
      
      return {
        name: `${themeName} (${folderType})`,
        type: 'theme',
        path: themePath,
        coverage: metrics,
        systemTestCoverage: systemTestCoverage,
        duplication: duplication,
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`Failed to load coverage for ${themeName}:`, error);
      return null;
    }
  }

  /**
   * Extracts coverage metrics from Istanbul coverage data
   */
  private extractCoverageMetrics(coverageData: any): any {
    const totals = {
      lines: { total: 0, covered: 0 },
      statements: { total: 0, covered: 0 },
      functions: { total: 0, covered: 0 },
      branches: { total: 0, covered: 0 }
    };

    for (const filePath in coverageData) {
      const fileCoverage = coverageData[filePath];
      
      // Lines
      const lineKeys = Object.keys(fileCoverage.l || {});
      totals.lines.total += lineKeys.length;
      totals.lines.covered += lineKeys.filter(k => fileCoverage.l[k] > 0).length;
      
      // Statements
      const stmtKeys = Object.keys(fileCoverage.s || {});
      totals.statements.total += stmtKeys.length;
      totals.statements.covered += stmtKeys.filter(k => fileCoverage.s[k] > 0).length;
      
      // Functions
      const fnKeys = Object.keys(fileCoverage.f || {});
      totals.functions.total += fnKeys.length;
      totals.functions.covered += fnKeys.filter(k => fileCoverage.f[k] > 0).length;
      
      // Branches
      const branchKeys = Object.keys(fileCoverage.b || {});
      for (const branchKey of branchKeys) {
        const branch = fileCoverage.b[branchKey];
        totals.branches.total += branch.length;
        totals.branches.covered += branch.filter((b: number) => b > 0).length;
      }
    }

    return {
      lines: {
        total: totals.lines.total,
        covered: totals.lines.covered,
        pct: totals.lines.total > 0 ? (totals.lines.covered / totals.lines.total) * 100 : 0
      },
      statements: {
        total: totals.statements.total,
        covered: totals.statements.covered,
        pct: totals.statements.total > 0 ? (totals.statements.covered / totals.statements.total) * 100 : 0
      },
      functions: {
        total: totals.functions.total,
        covered: totals.functions.covered,
        pct: totals.functions.total > 0 ? (totals.functions.covered / totals.functions.total) * 100 : 0
      },
      branches: {
        total: totals.branches.total,
        covered: totals.branches.covered,
        pct: totals.branches.total > 0 ? (totals.branches.covered / totals.branches.total) * 100 : 0
      }
    };
  }

  /**
   * Merges coverage data from layer structure and setup folder
   */
  private mergeLayerAndSetupCoverage(
    layerCoverage: AggregatedCoverage,
    setupCoverage: AggregatedCoverage
  ): AggregatedCoverage {
    // Create a map of themes from both sources
    const themeMap = new Map<string, AggregatedCoverage>();

    // Add layer themes
    if (layerCoverage.children) {
      for (const child of layerCoverage.children) {
        if (child.type === 'theme') {
          themeMap.set(child.name, child);
        }
      }
    }

    // Merge or add setup themes
    if (setupCoverage.children) {
      for (const setupTheme of setupCoverage.children) {
        const existingTheme = themeMap.get(setupTheme.name);
        if (existingTheme) {
          // Merge coverage data, preferring setup data as it's more detailed
          themeMap.set(setupTheme.name, this.mergeThemeCoverage(existingTheme, setupTheme));
        } else {
          // Add new theme from setup
          themeMap.set(setupTheme.name, setupTheme);
        }
      }
    }

    // Rebuild children array
    const allThemes = Array.from(themeMap.values());
    const epics = layerCoverage.children?.filter(c => c.type === 'epic') || [];
    
    // Recalculate app-level metrics
    const allChildren = [...epics, ...allThemes];
    const aggregatedMetrics = this.recalculateMetrics(allChildren);

    return {
      name: 'AI Development Platform (Integrated)',
      type: 'app',
      path: layerCoverage.path,
      coverage: aggregatedMetrics.coverage,
      systemTestCoverage: aggregatedMetrics.systemTestCoverage,
      duplication: aggregatedMetrics.duplication,
      children: allChildren,
      timestamp: new Date()
    };
  }

  /**
   * Merges two theme coverage objects, preferring setup data when available
   */
  private mergeThemeCoverage(
    layerTheme: AggregatedCoverage,
    setupTheme: AggregatedCoverage
  ): AggregatedCoverage {
    // Use setup coverage if available as it's more accurate
    return {
      name: layerTheme.name,
      type: 'theme',
      path: layerTheme.path,
      coverage: setupTheme.coverage,
      systemTestCoverage: setupTheme.systemTestCoverage,
      duplication: setupTheme.duplication,
      children: layerTheme.children, // Keep layer structure for user stories
      timestamp: new Date()
    };
  }

  /**
   * Recalculates aggregated metrics from children
   */
  private recalculateMetrics(children: AggregatedCoverage[]): {
    coverage: any;
    systemTestCoverage: any;
    duplication: any;
  } {
    const totals = {
      lines: { total: 0, covered: 0 },
      statements: { total: 0, covered: 0 },
      functions: { total: 0, covered: 0 },
      branches: { total: 0, covered: 0 },
      classes: { total: 0, covered: 0 },
      duplication: { duplicated: 0, total: 0 }
    };

    for (const child of children) {
      totals.lines.total += child.coverage.lines.total;
      totals.lines.covered += child.coverage.lines.covered;
      totals.statements.total += child.coverage.statements.total;
      totals.statements.covered += child.coverage.statements.covered;
      totals.functions.total += child.coverage.functions.total;
      totals.functions.covered += child.coverage.functions.covered;
      totals.branches.total += child.coverage.branches.total;
      totals.branches.covered += child.coverage.branches.covered;
      totals.classes.total += child.systemTestCoverage.classCount;
      totals.classes.covered += child.systemTestCoverage.coveredClassCount;
      totals.duplication.duplicated += child.duplication.duplicatedLines;
      totals.duplication.total += child.duplication.totalLines;
    }

    return {
      coverage: {
        lines: {
          total: totals.lines.total,
          covered: totals.lines.covered,
          pct: totals.lines.total > 0 ? (totals.lines.covered / totals.lines.total) * 100 : 0
        },
        statements: {
          total: totals.statements.total,
          covered: totals.statements.covered,
          pct: totals.statements.total > 0 ? (totals.statements.covered / totals.statements.total) * 100 : 0
        },
        functions: {
          total: totals.functions.total,
          covered: totals.functions.covered,
          pct: totals.functions.total > 0 ? (totals.functions.covered / totals.functions.total) * 100 : 0
        },
        branches: {
          total: totals.branches.total,
          covered: totals.branches.covered,
          pct: totals.branches.total > 0 ? (totals.branches.covered / totals.branches.total) * 100 : 0
        }
      },
      systemTestCoverage: {
        classCount: totals.classes.total,
        coveredClassCount: totals.classes.covered,
        classCoveragePct: totals.classes.total > 0 ? (totals.classes.covered / totals.classes.total) * 100 : 0
      },
      duplication: {
        duplicatedLines: totals.duplication.duplicated,
        totalLines: totals.duplication.total,
        duplicationPct: totals.duplication.total > 0 ? (totals.duplication.duplicated / totals.duplication.total) * 100 : 0
      }
    };
  }
}