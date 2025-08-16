/**
 * Theme Scanner for discovering themes and their test files
 * Traverses the layer/themes directory to find all available themes
 */

import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';
import { glob } from 'glob';
import { ThemeDefinition, ScanResult } from '../core/types';

export class ThemeScanner {
  private themesBasePath: string;
  private excludePatterns: string[];
  private testPatterns: string[];

  constructor(themesBasePath?: string) {
    this.themesBasePath = themesBasePath || path.join(process.cwd(), 'layer', 'themes');
    this.excludePatterns = [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.git/**'
    ];
    this.testPatterns = [
      '**/*.test.ts',
      '**/*.test.js',
      '**/*.spec.ts',
      '**/*.spec.js',
      '**/*.feature',
      '**/test/*.ts',
      '**/test/*.js',
      '**/tests/*.ts',
      '**/tests/*.js'
    ];
  }

  /**
   * Scan all themes in the themes directory
   */
  async scanThemes(): Promise<ScanResult> {
    const result: ScanResult = {
      themes: [],
      totalTests: 0,
      testsByTheme: new Map(),
      errors: []
    };

    try {
      // Check if themes directory exists
      const exists = await this.directoryExists(this.themesBasePath);
      if (!exists) {
        result.errors?.push(`Themes directory not found: ${this.themesBasePath}`);
        return result;
      }

      // Get all subdirectories in themes folder
      const entries = await fs.readdir(this.themesBasePath, { withFileTypes: true });
      const themeDirs = entries.filter(entry => entry.isDirectory());

      // Process each theme directory
      for (const themeDir of themeDirs) {
        try {
          const theme = await this.scanTheme(themeDir.name);
          if (theme) {
            result.themes.push(theme);
            
            // Find test files for this theme
            const testFiles = await this.findTestFiles(theme.rootPath);
            result.testsByTheme.set(theme.name, testFiles);
            result.totalTests += testFiles.length;
          }
        } catch (error) {
          result.errors?.push(`Error scanning theme ${themeDir.name}: ${error}`);
        }
      }

      // Sort themes by name
      result.themes.sort((a, b) => a.name.localeCompare(b.name));

    } catch (error) {
      result.errors?.push(`Error scanning themes directory: ${error}`);
    }

    return result;
  }

  /**
   * Scan a single theme directory
   */
  async scanTheme(themeName: string): Promise<ThemeDefinition | null> {
    const themePath = path.join(this.themesBasePath, themeName);
    
    try {
      // Check for FEATURE.vf.json to get theme metadata
      const featurePath = path.join(themePath, 'FEATURE.vf.json');
      let metadata: any = {};
      
      if (await this.fileExists(featurePath)) {
        const featureContent = await fs.readFile(featurePath, 'utf-8');
        try {
          const featureData = JSON.parse(featureContent);
          metadata = featureData.metadata || {};
        } catch (e) {
          // Ignore JSON parse errors
        }
      }

      // Check for README.md to extract description
      let description = metadata.description || '';
      const readmePath = path.join(themePath, 'README.md');
      if (await this.fileExists(readmePath) && !description) {
        const readmeContent = await fs.readFile(readmePath, 'utf-8');
        // Extract first paragraph as description
        const firstParagraph = readmeContent.split('\n\n')[0];
        description = firstParagraph.replace(/^#.*\n/, '').trim();
      }

      // Determine theme features based on directory structure
      const features = await this.detectThemeFeatures(themePath);

      // Create theme definition
      const theme: ThemeDefinition = {
        name: themeName,
        description: description || `Theme: ${themeName}`,
        rootPath: themePath,
        testPatterns: this.testPatterns,
        features,
        metadata
      };

      return theme;
    } catch (error) {
      console.error(`Error scanning theme ${themeName}:`, error);
      return null;
    }
  }

  /**
   * Find all test files in a directory
   */
  async findTestFiles(directory: string): Promise<string[]> {
    const testFiles: string[] = [];

    for (const pattern of this.testPatterns) {
      try {
        const files = await glob(pattern, {
          cwd: directory,
          absolute: true,
          ignore: this.excludePatterns
        });
        testFiles.push(...files);
      } catch (error) {
        console.error(`Error finding test files with pattern ${pattern}:`, error);
      }
    }

    // Remove duplicates and sort
    return [...new Set(testFiles)].sort();
  }

  /**
   * Detect features available in a theme
   */
  private async detectThemeFeatures(themePath: string): Promise<string[]> {
    const features: string[] = [];

    // Check for common feature directories
    const featureChecks = [
      { dir: 'src', feature: 'source-code' },
      { dir: 'tests', feature: 'tests' },
      { dir: 'test', feature: 'tests' },
      { dir: 'user-stories', feature: 'user-stories' },
      { dir: 'children', feature: 'sub-themes' },
      { dir: 'pipe', feature: 'pipe-interface' },
      { dir: 'docs', feature: 'documentation' },
      { dir: 'examples', feature: 'examples' },
      { dir: 'templates', feature: 'templates' },
      { dir: 'config', feature: 'configuration' }
    ];

    for (const check of featureChecks) {
      const fullPath = path.join(themePath, check.dir);
      if (await this.directoryExists(fullPath)) {
        features.push(check.feature);
      }
    }

    // Check for specific files
    const fileChecks = [
      { file: 'package.json', feature: 'node-project' },
      { file: 'tsconfig.json', feature: 'typescript' },
      { file: 'pyproject.toml', feature: 'python' },
      { file: 'CMakeLists.txt', feature: 'cmake' },
      { file: 'Makefile', feature: 'make' },
      { file: 'docker-compose.yml', feature: 'docker' },
      { file: '.github', feature: 'github-actions' }
    ];

    for (const check of fileChecks) {
      const fullPath = path.join(themePath, check.file);
      if (await this.fileExists(fullPath) || await this.directoryExists(fullPath)) {
        features.push(check.feature);
      }
    }

    return features;
  }

  /**
   * Check if a directory exists
   */
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Check if a file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  /**
   * Get test patterns
   */
  getTestPatterns(): string[] {
    return [...this.testPatterns];
  }

  /**
   * Set custom test patterns
   */
  setTestPatterns(patterns: string[]): void {
    this.testPatterns = patterns;
  }

  /**
   * Add exclude pattern
   */
  addExcludePattern(pattern: string): void {
    this.excludePatterns.push(pattern);
  }

  /**
   * Get themes base path
   */
  getThemesBasePath(): string {
    return this.themesBasePath;
  }

  /**
   * Set themes base path
   */
  setThemesBasePath(basePath: string): void {
    this.themesBasePath = basePath;
  }
}

export default ThemeScanner;