import { fileAPI } from '../utils/file-api';
import { CoverageMetrics, SystemTestCoverage, DuplicationMetrics, AggregatedCoverage } from '../models/coverage-metrics';
import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';

export class CoverageAggregator {
  private readonly layerPath: string;

  constructor(layerPath: string = path.join(process.cwd(), 'layer')) {
    this.layerPath = layerPath;
  }

  async aggregateAppCoverage(): Promise<AggregatedCoverage> {
    const epics = await this.aggregateEpics();
    const themes = await this.aggregateThemes();
    
    const allCoverage = [...epics, ...themes];
    const aggregated = this.mergeCoverageData(allCoverage);

    return {
      name: 'AI Development Platform',
      type: 'app',
      path: this.layerPath,
      coverage: aggregated.coverage,
      systemTestCoverage: aggregated.systemTestCoverage,
      duplication: aggregated.duplication,
      children: allCoverage,
      timestamp: new Date()
    };
  }

  async aggregateEpics(): Promise<AggregatedCoverage[]> {
    const epicsPath = path.join(this.layerPath, 'epic');
    if (!fs.existsSync(epicsPath)) return [];

    const epicDirs = fs.readdirSync(epicsPath)
      .filter(dir => fs.statSync(path.join(epicsPath, dir)).isDirectory());

    const epics: AggregatedCoverage[] = [];
    for (const epicName of epicDirs) {
      const epicPath = path.join(epicsPath, epicName);
      const themes = await this.aggregateEpicThemes(epicPath);
      
      if (themes.length > 0) {
        const aggregated = this.mergeCoverageData(themes);
        epics.push({
          name: epicName,
          type: 'epic',
          path: epicPath,
          coverage: aggregated.coverage,
          systemTestCoverage: aggregated.systemTestCoverage,
          duplication: aggregated.duplication,
          children: themes,
          timestamp: new Date()
        });
      }
    }

    return epics;
  }

  async aggregateThemes(): Promise<AggregatedCoverage[]> {
    const themesPath = path.join(this.layerPath, 'themes');
    if (!fs.existsSync(themesPath)) return [];

    const themeDirs = fs.readdirSync(themesPath)
      .filter(dir => fs.statSync(path.join(themesPath, dir)).isDirectory())
      .filter(dir => dir !== 'shared'); // Exclude shared utilities

    const themes: AggregatedCoverage[] = [];
    for (const themeName of themeDirs) {
      const themePath = path.join(themesPath, themeName);
      const userStories = await this.aggregateUserStories(themePath);
      
      if (userStories.length > 0) {
        const aggregated = this.mergeCoverageData(userStories);
        themes.push({
          name: themeName,
          type: 'theme',
          path: themePath,
          coverage: aggregated.coverage,
          systemTestCoverage: aggregated.systemTestCoverage,
          duplication: aggregated.duplication,
          children: userStories,
          timestamp: new Date()
        });
      }
    }

    return themes;
  }

  private async aggregateEpicThemes(epicPath: string): Promise<AggregatedCoverage[]> {
    // Epic themes are typically referenced, not nested
    // This would need to be implemented based on epic structure
    return [];
  }

  private async aggregateUserStories(themePath: string): Promise<AggregatedCoverage[]> {
    const storiesPath = path.join(themePath, 'user-stories');
    if (!fs.existsSync(storiesPath)) return [];

    const storyDirs = fs.readdirSync(storiesPath)
      .filter(dir => fs.statSync(path.join(storiesPath, dir)).isDirectory());

    const stories: AggregatedCoverage[] = [];
    for (const storyName of storyDirs) {
      const storyPath = path.join(storiesPath, storyName);
      const coverage = await this.loadStoryCoverage(storyPath);
      
      if (coverage) {
        stories.push({
          name: storyName,
          type: 'user-story',
          path: storyPath,
          coverage: coverage.coverage,
          systemTestCoverage: coverage.systemTestCoverage,
          duplication: coverage.duplication,
          timestamp: new Date()
        });
      }
    }

    return stories;
  }

  private async loadStoryCoverage(storyPath: string): Promise<{
    coverage: CoverageMetrics;
    systemTestCoverage: SystemTestCoverage;
    duplication: DuplicationMetrics;
  } | null> {
    // Look for coverage-final.json from Jest/Istanbul
    const coveragePath = path.join(storyPath, "coverage", 'coverage-final.json');
    const systemTestPath = path.join(storyPath, "coverage", 'system-test-coverage.json');
    
    if (!fs.existsSync(coveragePath)) return null;

    try {
      const coverageData = JSON.parse(fileAPI.readFileSync(coveragePath, 'utf8'));
      const systemTestData = fs.existsSync(systemTestPath) 
        ? JSON.parse(fileAPI.readFileSync(systemTestPath, 'utf8'))
        : this.calculateSystemTestCoverage(storyPath);

      return {
        coverage: this.extractCoverageMetrics(coverageData),
        systemTestCoverage: systemTestData,
        duplication: await this.calculateDuplication(storyPath)
      };
    } catch (error) {
      console.error(`Failed to load coverage for ${storyPath}:`, error);
      return null;
    }
  }

  private extractCoverageMetrics(coverageData: any): CoverageMetrics {
    const summary = this.calculateSummary(coverageData);
    return {
      lines: summary.lines,
      statements: summary.statements,
      functions: summary.functions,
      branches: summary.branches
    };
  }

  private calculateSummary(coverageData: any): CoverageMetrics {
    const totals = {
      lines: { total: 0, covered: 0, pct: 0 },
      statements: { total: 0, covered: 0, pct: 0 },
      functions: { total: 0, covered: 0, pct: 0 },
      branches: { total: 0, covered: 0, pct: 0 }
    };

    for (const file of Object.values(coverageData) as any[]) {
      totals.lines.total += Object.keys(file.statementMap || {}).length;
      totals.lines.covered += Object.values(file.s || {}).filter((c: any) => c > 0).length;
      
      totals.statements.total += Object.keys(file.statementMap || {}).length;
      totals.statements.covered += Object.values(file.s || {}).filter((c: any) => c > 0).length;
      
      totals.functions.total += Object.keys(file.fnMap || {}).length;
      totals.functions.covered += Object.values(file.f || {}).filter((c: any) => c > 0).length;
      
      totals.branches.total += Object.keys(file.branchMap || {}).length;
      let branchesCovered = 0;
      for (const branch of Object.values(file.b || {}) as any[]) {
        if (Array.isArray(branch) && branch.every(c => c > 0)) {
          branchesCovered++;
        }
      }
      totals.branches.covered += branchesCovered;
    }

    // Calculate percentages
    for (const metric of Object.values(totals)) {
      metric.pct = metric.total > 0 ? (metric.covered / metric.total) * 100 : 0;
    }

    return totals;
  }

  private calculateSystemTestCoverage(storyPath: string): SystemTestCoverage {
    // Count classes and system test coverage
    const srcPath = path.join(storyPath, 'src');
    let classCount = 0;
    let coveredClassCount = 0;

    if (fs.existsSync(srcPath)) {
      const files = this.getAllFiles(srcPath, '.ts');
      const testFiles = files.filter(f => f.includes('.stest.ts') || f.includes('.systest.ts'));
      
      for (const file of files) {
        if (!file.includes('.test.') && !file.includes('.spec.')) {
          const content = fileAPI.readFileSync(file, 'utf8');
          const classMatches = content.match(/class\s+\w+/g) || [];
          classCount += classMatches.length;
          
          // Check if class has system test
          const className = path.basename(file, '.ts');
          const hasSystemTest = testFiles.some(tf => tf.includes(className));
          if (hasSystemTest) {
            coveredClassCount += classMatches.length;
          }
        }
      }
    }

    return {
      classCount,
      coveredClassCount,
      classCoveragePct: classCount > 0 ? (coveredClassCount / classCount) * 100 : 0
    };
  }

  private async calculateDuplication(storyPath: string): Promise<DuplicationMetrics> {
    // Simple duplication calculation - would integrate with actual duplication tool
    const srcPath = path.join(storyPath, 'src');
    let totalLines = 0;
    let duplicatedLines = 0;

    if (fs.existsSync(srcPath)) {
      const files = this.getAllFiles(srcPath, '.ts');
      for (const file of files) {
        const content = fileAPI.readFileSync(file, 'utf8');
        const lines = content.split('\n').filter(line => line.trim().length > 0);
        totalLines += lines.length;
        // Simplified: would use actual duplication detection tool
      }
    }

    return {
      duplicatedLines,
      totalLines,
      duplicationPct: totalLines > 0 ? (duplicatedLines / totalLines) * 100 : 0
    };
  }

  private getAllFiles(dir: string, ext: string): string[] {
    const files: string[] = [];
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.includes('node_modules')) {
        files.push(...this.getAllFiles(fullPath, ext));
      } else if (stat.isFile() && item.endsWith(ext)) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private mergeCoverageData(coverages: AggregatedCoverage[]): {
    coverage: CoverageMetrics;
    systemTestCoverage: SystemTestCoverage;
    duplication: DuplicationMetrics;
  } {
    const merged = {
      coverage: {
        lines: { total: 0, covered: 0, pct: 0 },
        statements: { total: 0, covered: 0, pct: 0 },
        functions: { total: 0, covered: 0, pct: 0 },
        branches: { total: 0, covered: 0, pct: 0 }
      },
      systemTestCoverage: {
        classCount: 0,
        coveredClassCount: 0,
        classCoveragePct: 0
      },
      duplication: {
        duplicatedLines: 0,
        totalLines: 0,
        duplicationPct: 0
      }
    };

    for (const coverage of coverages) {
      // Merge coverage metrics
      for (const metricType of ['lines', "statements", "functions", "branches"] as const) {
        merged.coverage[metricType].total += coverage.coverage[metricType].total;
        merged.coverage[metricType].covered += coverage.coverage[metricType].covered;
      }

      // Merge system test coverage
      merged.systemTestCoverage.classCount += coverage.systemTestCoverage.classCount;
      merged.systemTestCoverage.coveredClassCount += coverage.systemTestCoverage.coveredClassCount;

      // Merge duplication
      merged.duplication.duplicatedLines += coverage.duplication.duplicatedLines;
      merged.duplication.totalLines += coverage.duplication.totalLines;
    }

    // Calculate percentages
    for (const metricType of ['lines', "statements", "functions", "branches"] as const) {
      const metric = merged.coverage[metricType];
      metric.pct = metric.total > 0 ? (metric.covered / metric.total) * 100 : 0;
    }

    merged.systemTestCoverage.classCoveragePct = merged.systemTestCoverage.classCount > 0
      ? (merged.systemTestCoverage.coveredClassCount / merged.systemTestCoverage.classCount) * 100
      : 0;

    merged.duplication.duplicationPct = merged.duplication.totalLines > 0
      ? (merged.duplication.duplicatedLines / merged.duplication.totalLines) * 100
      : 0;

    return merged;
  }
}