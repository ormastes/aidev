/**
 * Test Discovery for finding and analyzing test files
 * Discovers test files across themes and analyzes their structure
 */

import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';
import { glob } from 'glob';

export interface DiscoveredTest {
  filePath: string;
  fileName: string;
  directory: string;
  theme: string;
  type: TestType;
  framework?: TestFramework;
  size: number;
  lastModified: Date;
  metadata?: TestFileMetadata;
}

export interface TestFileMetadata {
  suites?: number;
  tests?: number;
  assertions?: number;
  coverage?: boolean;
  tags?: string[];
  dependencies?: string[];
}

export type TestType = 'unit' | 'integration' | 'e2e' | 'bdd' | 'system' | 'unknown';
export type TestFramework = 'jest' | 'mocha' | 'jasmine' | 'cucumber' | 'playwright' | 'cypress' | 'unknown';

export interface DiscoveryOptions {
  includeMetadata?: boolean;
  followSymlinks?: boolean;
  maxDepth?: number;
  excludePatterns?: string[];
  testPatterns?: string[];
}

export class TestDiscovery {
  private defaultPatterns: string[] = [
    '**/*.test.{ts,js,tsx,jsx}',
    '**/*.spec.{ts,js,tsx,jsx}',
    '**/*.feature',
    '**/test/**/*.{ts,js,tsx,jsx}',
    '**/tests/**/*.{ts,js,tsx,jsx}',
    '**/__tests__/**/*.{ts,js,tsx,jsx}'
  ];

  private defaultExcludes: string[] = [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    '**/.git/**',
    '**/vendor/**'
  ];

  /**
   * Discover all test files in a directory
   */
  async discoverTests(
    rootPath: string,
    options: DiscoveryOptions = {}
  ): Promise<DiscoveredTest[]> {
    const patterns = options.testPatterns || this.defaultPatterns;
    const excludes = [...this.defaultExcludes, ...(options.excludePatterns || [])];
    const discoveredTests: DiscoveredTest[] = [];

    for (const pattern of patterns) {
      try {
        const files = await glob(pattern, {
          cwd: rootPath,
          absolute: true,
          ignore: excludes,
          follow: options.followSymlinks || false,
          maxDepth: options.maxDepth
        });

        for (const file of files) {
          const test = await this.analyzeTestFile(file, rootPath, options);
          if (test) {
            discoveredTests.push(test);
          }
        }
      } catch (error) {
        console.error(`Error discovering tests with pattern ${pattern}:`, error);
      }
    }

    // Sort by file path
    return discoveredTests.sort((a, b) => a.filePath.localeCompare(b.filePath));
  }

  /**
   * Analyze a single test file
   */
  async analyzeTestFile(
    filePath: string,
    rootPath: string,
    options: DiscoveryOptions = {}
  ): Promise<DiscoveredTest | null> {
    try {
      const stats = await fs.stat(filePath);
      const fileName = path.basename(filePath);
      const directory = path.dirname(filePath);
      const relativePath = path.relative(rootPath, filePath);
      
      // Extract theme name from path
      const theme = this.extractThemeName(relativePath);
      
      // Detect test type
      const type = this.detectTestType(filePath, relativePath);
      
      // Detect framework
      const framework = await this.detectFramework(filePath);
      
      const test: DiscoveredTest = {
        filePath,
        fileName,
        directory,
        theme,
        type,
        framework,
        size: stats.size,
        lastModified: stats.mtime
      };

      // Extract metadata if requested
      if (options.includeMetadata) {
        test.metadata = await this.extractTestMetadata(filePath, framework);
      }

      return test;
    } catch (error) {
      console.error(`Error analyzing test file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Extract theme name from relative path
   */
  private extractThemeName(relativePath: string): string {
    const parts = relativePath.split(path.sep);
    
    // Look for themes directory indicator
    const themesIndex = parts.findIndex(part => part === 'themes');
    if (themesIndex >= 0 && themesIndex < parts.length - 1) {
      return parts[themesIndex + 1];
    }
    
    // Fallback to first directory
    return parts[0] || 'unknown';
  }

  /**
   * Detect test type based on file path and naming
   */
  private detectTestType(filePath: string, relativePath: string): TestType {
    const lowerPath = relativePath.toLowerCase();
    
    // Check for BDD/feature files
    if (filePath.endsWith('.feature')) {
      return 'bdd';
    }
    
    // Check for e2e tests
    if (lowerPath.includes('e2e') || lowerPath.includes('end-to-end')) {
      return 'e2e';
    }
    
    // Check for integration tests
    if (lowerPath.includes('integration') || lowerPath.includes('int')) {
      return 'integration';
    }
    
    // Check for system tests
    if (lowerPath.includes('system') || lowerPath.includes('smoke')) {
      return 'system';
    }
    
    // Check for unit tests
    if (lowerPath.includes('unit') || lowerPath.includes('spec')) {
      return 'unit';
    }
    
    // Default to unit for test/spec files
    if (filePath.includes('.test.') || filePath.includes('.spec.')) {
      return 'unit';
    }
    
    return 'unknown';
  }

  /**
   * Detect test framework from file content
   */
  private async detectFramework(filePath: string): Promise<TestFramework> {
    try {
      // For feature files, it's cucumber
      if (filePath.endsWith('.feature')) {
        return 'cucumber';
      }
      
      // Read first 1000 chars to detect framework
      const content = await this.readFileHead(filePath, 1000);
      const lowerContent = content.toLowerCase();
      
      // Check for Playwright
      if (lowerContent.includes('@playwright/test') || lowerContent.includes('playwright')) {
        return 'playwright';
      }
      
      // Check for Cypress
      if (lowerContent.includes('cypress') || lowerContent.includes('cy.')) {
        return 'cypress';
      }
      
      // Check for Jest
      if (lowerContent.includes('jest') || lowerContent.includes('expect(') || lowerContent.includes('tomatchsnapshot')) {
        return 'jest';
      }
      
      // Check for Mocha
      if (lowerContent.includes('mocha') || (lowerContent.includes('describe(') && lowerContent.includes('assert'))) {
        return 'mocha';
      }
      
      // Check for Jasmine
      if (lowerContent.includes('jasmine')) {
        return 'jasmine';
      }
      
      // Default check for describe/it pattern
      if (lowerContent.includes('describe(') && lowerContent.includes('it(')) {
        return 'jest'; // Most common
      }
      
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Extract metadata from test file
   */
  private async extractTestMetadata(filePath: string, _framework: TestFramework): Promise<TestFileMetadata> {
    const metadata: TestFileMetadata = {};
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Count test suites (describe blocks)
      const describeMatches = content.match(/describe\s*\(/g);
      metadata.suites = describeMatches ? describeMatches.length : 0;
      
      // Count tests (it/test blocks)
      const testMatches = content.match(/(it|test)\s*\(/g);
      metadata.tests = testMatches ? testMatches.length : 0;
      
      // Count assertions (rough estimate)
      const assertionPatterns = [
        /expect\s*\(/g,
        /assert\./g,
        /should\./g,
        /\.to\./g
      ];
      
      let assertions = 0;
      for (const pattern of assertionPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          assertions += matches.length;
        }
      }
      metadata.assertions = assertions;
      
      // Check for coverage comments
      metadata.coverage = content.includes('coverage') || content.includes('@coverage');
      
      // Extract tags from comments
      const tagMatches = content.match(/@tag\s+(\w+)/g);
      if (tagMatches) {
        metadata.tags = tagMatches.map(match => match.replace('@tag', '').trim());
      }
      
      // Extract dependencies (imports/requires)
      const importMatches = content.match(/(?:import|require)\s*\(['"](.*?)['"]\)/g);
      if (importMatches) {
        metadata.dependencies = importMatches
          .map(match => {
            const depMatch = match.match(/['"](.*?)['"]/);
            return depMatch ? depMatch[1] : null;
          })
          .filter(Boolean) as string[];
      }
      
    } catch (error) {
      console.error(`Error extracting metadata from ${filePath}:`, error);
    }
    
    return metadata;
  }

  /**
   * Read first N characters of a file
   */
  private async readFileHead(filePath: string, chars: number): Promise<string> {
    const fd = await fs.open(filePath, 'r');
    try {
      const buffer = Buffer.alloc(chars);
      await fd.read(buffer, 0, chars, 0);
      return buffer.toString('utf-8');
    } finally {
      await fd.close();
    }
  }

  /**
   * Group discovered tests by various criteria
   */
  groupTests(tests: DiscoveredTest[]): {
    byTheme: Map<string, DiscoveredTest[]>;
    byType: Map<TestType, DiscoveredTest[]>;
    byFramework: Map<TestFramework, DiscoveredTest[]>;
  } {
    const byTheme = new Map<string, DiscoveredTest[]>();
    const byType = new Map<TestType, DiscoveredTest[]>();
    const byFramework = new Map<TestFramework, DiscoveredTest[]>();
    
    for (const test of tests) {
      // Group by theme
      if (!byTheme.has(test.theme)) {
        byTheme.set(test.theme, []);
      }
      byTheme.get(test.theme)!.push(test);
      
      // Group by type
      if (!byType.has(test.type)) {
        byType.set(test.type, []);
      }
      byType.get(test.type)!.push(test);
      
      // Group by framework
      if (test.framework) {
        if (!byFramework.has(test.framework)) {
          byFramework.set(test.framework, []);
        }
        byFramework.get(test.framework)!.push(test);
      }
    }
    
    return { byTheme, byType, byFramework };
  }

  /**
   * Generate statistics from discovered tests
   */
  generateStatistics(tests: DiscoveredTest[]): {
    totalTests: number;
    totalSize: number;
    averageSize: number;
    themes: number;
    types: Record<TestType, number>;
    frameworks: Record<TestFramework, number>;
    coverage: number;
  } {
    const stats = {
      totalTests: tests.length,
      totalSize: 0,
      averageSize: 0,
      themes: new Set<string>(),
      types: {} as Record<TestType, number>,
      frameworks: {} as Record<TestFramework, number>,
      coverage: 0
    };
    
    let coverageCount = 0;
    
    for (const test of tests) {
      stats.totalSize += test.size;
      stats.themes.add(test.theme);
      
      // Count types
      stats.types[test.type] = (stats.types[test.type] || 0) + 1;
      
      // Count frameworks
      if (test.framework) {
        stats.frameworks[test.framework] = (stats.frameworks[test.framework] || 0) + 1;
      }
      
      // Count coverage
      if (test.metadata?.coverage) {
        coverageCount++;
      }
    }
    
    stats.averageSize = tests.length > 0 ? Math.round(stats.totalSize / tests.length) : 0;
    stats.coverage = tests.length > 0 ? Math.round((coverageCount / tests.length) * 100) : 0;
    
    return {
      ...stats,
      themes: stats.themes.size
    };
  }
}

export default TestDiscovery;