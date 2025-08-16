/**
 * Theme Registry for cataloging and managing discovered themes
 * Maintains a registry of all themes with their tests and metadata
 */

import { ThemeDefinition } from '../core/types';
import { DiscoveredTest } from './TestDiscovery';
import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';
import { getFileAPI, FileType } from '../../../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


export interface ThemeEntry {
  theme: ThemeDefinition;
  tests: DiscoveredTest[];
  statistics: ThemeStatistics;
  lastScanned: Date;
  status: 'active' | "inactive" | 'error';
  errors?: string[];
}

export interface ThemeStatistics {
  totalTests: number;
  testTypes: Record<string, number>;
  testFrameworks: Record<string, number>;
  totalSize: number;
  averageTestSize: number;
  coverage?: number;
  lastModified?: Date;
}

export interface RegistryOptions {
  persistPath?: string;
  autoSave?: boolean;
  cacheExpiry?: number; // in milliseconds
}

export interface RegistrySnapshot {
  version: string;
  createdAt: Date;
  themes: ThemeEntry[];
  metadata: {
    totalThemes: number;
    totalTests: number;
    scanDuration?: number;
  };
}

export class ThemeRegistry {
  private registry: Map<string, ThemeEntry>;
  private options: RegistryOptions;
  private isDirty: boolean;

  constructor(options: RegistryOptions = {}) {
    this.registry = new Map();
    this.options = {
      autoSave: true,
      cacheExpiry: 3600000, // 1 hour default
      ...options
    };
    this.isDirty = false;
  }

  /**
   * Register a theme with its tests
   */
  async register(theme: ThemeDefinition, tests: DiscoveredTest[]): Promise<void> {
    const statistics = this.calculateStatistics(tests);
    
    const entry: ThemeEntry = {
      theme,
      tests,
      statistics,
      lastScanned: new Date(),
      status: 'active'
    };

    // Validate theme
    const validation = this.validateTheme(theme, tests);
    if (!validation.valid) {
      entry.status = 'error';
      entry.errors = validation.errors;
    }

    this.registry.set(theme.name, entry);
    this.isDirty = true;

    // Auto-save if enabled
    if (this.options.autoSave && this.options.persistPath) {
      await this.save();
    }
  }

  /**
   * Get theme entry by name
   */
  async getTheme(name: string): ThemeEntry | undefined {
    return this.registry.get(name);
  }

  /**
   * Get all themes
   */
  async getAllThemes(): ThemeEntry[] {
    return Array.from(this.registry.values());
  }

  /**
   * Get active themes only
   */
  async getActiveThemes(): ThemeEntry[] {
    return this.getAllThemes().filter(entry => entry.status === 'active');
  }

  /**
   * Get themes by feature
   */
  async getThemesByFeature(feature: string): ThemeEntry[] {
    return this.getAllThemes().filter(entry => 
      entry.theme.features?.includes(feature)
    );
  }

  /**
   * Get tests for a theme
   */
  async getThemeTests(themeName: string): DiscoveredTest[] {
    const entry = this.registry.get(themeName);
    return entry ? entry.tests : [];
  }

  /**
   * Search themes by criteria
   */
  async searchThemes(criteria: {
    name?: string;
    feature?: string;
    testType?: string;
    minTests?: number;
    maxTests?: number;
  }): ThemeEntry[] {
    let results = this.getAllThemes();

    if (criteria.name) {
      const searchTerm = criteria.name.toLowerCase();
      results = results.filter(entry => 
        entry.theme.name.toLowerCase().includes(searchTerm)
      );
    }

    if (criteria.feature) {
      results = results.filter(entry => 
        entry.theme.features?.includes(criteria.feature!)
      );
    }

    if (criteria.testType) {
      results = results.filter(entry => 
        entry.statistics.testTypes[criteria.testType!] > 0
      );
    }

    if (criteria.minTests !== undefined) {
      results = results.filter(entry => 
        entry.statistics.totalTests >= criteria.minTests!
      );
    }

    if (criteria.maxTests !== undefined) {
      results = results.filter(entry => 
        entry.statistics.totalTests <= criteria.maxTests!
      );
    }

    return results;
  }

  /**
   * Update theme entry
   */
  async updateTheme(themeName: string, updates: Partial<ThemeEntry>): Promise<void> {
    const entry = this.registry.get(themeName);
    if (!entry) {
      throw new Error(`Theme ${themeName} not found in registry`);
    }

    // Merge updates
    Object.assign(entry, updates);
    
    // Recalculate statistics if tests updated
    if (updates.tests) {
      entry.statistics = this.calculateStatistics(updates.tests);
    }

    entry.lastScanned = new Date();
    this.isDirty = true;

    if (this.options.autoSave && this.options.persistPath) {
      await this.save();
    }
  }

  /**
   * Remove theme from registry
   */
  async removeTheme(themeName: string): boolean {
    const deleted = this.registry.delete(themeName);
    if (deleted) {
      this.isDirty = true;
    }
    return deleted;
  }

  /**
   * Clear entire registry
   */
  async clear(): void {
    this.registry.clear();
    this.isDirty = true;
  }

  /**
   * Check if theme needs rescan
   */
  async needsRescan(themeName: string): boolean {
    const entry = this.registry.get(themeName);
    if (!entry) return true;

    if (entry.status === 'error') return true;

    // Check cache expiry
    if (this.options.cacheExpiry) {
      const age = Date.now() - entry.lastScanned.getTime();
      if (age > this.options.cacheExpiry) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate registry statistics
   */
  async getStatistics(): {
    totalThemes: number;
    activeThemes: number;
    totalTests: number;
    testsByType: Record<string, number>;
    testsByFramework: Record<string, number>;
    averageTestsPerTheme: number;
    themesWithErrors: number;
  } {
    const stats = {
      totalThemes: this.registry.size,
      activeThemes: 0,
      totalTests: 0,
      testsByType: {} as Record<string, number>,
      testsByFramework: {} as Record<string, number>,
      averageTestsPerTheme: 0,
      themesWithErrors: 0
    };

    for (const entry of this.registry.values()) {
      if (entry.status === 'active') {
        stats.activeThemes++;
      } else if (entry.status === 'error') {
        stats.themesWithErrors++;
      }

      stats.totalTests += entry.statistics.totalTests;

      // Aggregate test types
      for (const [type, count] of Object.entries(entry.statistics.testTypes)) {
        stats.testsByType[type] = (stats.testsByType[type] || 0) + count;
      }

      // Aggregate frameworks
      for (const [framework, count] of Object.entries(entry.statistics.testFrameworks)) {
        stats.testsByFramework[framework] = (stats.testsByFramework[framework] || 0) + count;
      }
    }

    stats.averageTestsPerTheme = stats.totalThemes > 0 
      ? Math.round(stats.totalTests / stats.totalThemes)
      : 0;

    return stats;
  }

  /**
   * Create a snapshot of the registry
   */
  async createSnapshot(): RegistrySnapshot {
    return {
      version: '1.0.0',
      createdAt: new Date(),
      themes: this.getAllThemes(),
      metadata: {
        totalThemes: this.registry.size,
        totalTests: this.getAllThemes().reduce((sum, entry) => 
          sum + entry.statistics.totalTests, 0
        )
      }
    };
  }

  /**
   * Load registry from snapshot
   */
  async loadSnapshot(snapshot: RegistrySnapshot): void {
    this.clear();
    
    for (const entry of snapshot.themes) {
      // Convert dates back from JSON
      entry.lastScanned = new Date(entry.lastScanned);
      if (entry.statistics.lastModified) {
        entry.statistics.lastModified = new Date(entry.statistics.lastModified);
      }
      
      this.registry.set(entry.theme.name, entry);
    }
    
    this.isDirty = false;
  }

  /**
   * Save registry to file
   */
  async save(filePath?: string): Promise<void> {
    const savePath = filePath || this.options.persistPath;
    if (!savePath) {
      throw new Error('No save path specified');
    }

    const snapshot = this.createSnapshot();
    const json = JSON.stringify(snapshot, null, 2);
    
    await fileAPI.createDirectory(path.dirname(savePath));
    await fileAPI.createFile(savePath, json, { type: FileType.TEMPORARY });
      const snapshot = JSON.parse(json) as RegistrySnapshot;
      this.loadSnapshot(snapshot);
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        throw error;
      }
      // File doesn't exist, start with empty registry
    }
  }

  /**
   * Check if registry has unsaved changes
   */
  async hasUnsavedChanges(): boolean {
    return this.isDirty;
  }

  /**
   * Calculate statistics for tests
   */
  private async calculateStatistics(tests: DiscoveredTest[]): ThemeStatistics {
    const stats: ThemeStatistics = {
      totalTests: tests.length,
      testTypes: {},
      testFrameworks: {},
      totalSize: 0,
      averageTestSize: 0
    };

    let latestModified: Date | undefined;
    let coverageCount = 0;

    for (const test of tests) {
      // Count test types
      stats.testTypes[test.type] = (stats.testTypes[test.type] || 0) + 1;

      // Count frameworks
      if (test.framework) {
        stats.testFrameworks[test.framework] = 
          (stats.testFrameworks[test.framework] || 0) + 1;
      }

      // Sum size
      stats.totalSize += test.size;

      // Track latest modification
      if (!latestModified || test.lastModified > latestModified) {
        latestModified = test.lastModified;
      }

      // Count coverage
      if (test.metadata?.coverage) {
        coverageCount++;
      }
    }

    stats.averageTestSize = tests.length > 0 
      ? Math.round(stats.totalSize / tests.length) 
      : 0;

    stats.lastModified = latestModified;
    
    if (tests.length > 0) {
      stats.coverage = Math.round((coverageCount / tests.length) * 100);
    }

    return stats;
  }

  /**
   * Validate theme and tests
   */
  private async validateTheme(theme: ThemeDefinition, tests: DiscoveredTest[]): {
    valid: boolean;
    errors?: string[];
  } {
    const errors: string[] = [];

    // Check theme has required fields
    if (!theme.name) {
      errors.push('Theme name is required');
    }

    if (!theme.rootPath) {
      errors.push('Theme root path is required');
    }

    // Check for test consistency
    const themeTests = tests.filter(test => test.theme === theme.name);
    if (themeTests.length !== tests.length) {
      errors.push(`Some tests (${tests.length - themeTests.length}) don't match theme name`);
    }

    // Check for duplicate test files
    const testPaths = new Set<string>();
    for (const test of tests) {
      if (testPaths.has(test.filePath)) {
        errors.push(`Duplicate test file: ${test.filePath}`);
      }
      testPaths.add(test.filePath);
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Export registry as JSON
   */
  async toJSON(): string {
    return JSON.stringify(this.createSnapshot(), null, 2);
  }

  /**
   * Export registry as markdown report
   */
  async toMarkdown(): string {
    const stats = this.getStatistics();
    const entries = this.getAllThemes();
    
    const md: string[] = [];
    
    md.push('# Theme Registry Report');
    md.push('');
    md.push(`Generated: ${new Date().toISOString()}`);
    md.push('');
    
    md.push('## Summary');
    md.push(`- Total Themes: ${stats.totalThemes}`);
    md.push(`- Active Themes: ${stats.activeThemes}`);
    md.push(`- Total Tests: ${stats.totalTests}`);
    md.push(`- Average Tests per Theme: ${stats.averageTestsPerTheme}`);
    md.push(`- Themes with Errors: ${stats.themesWithErrors}`);
    md.push('');
    
    md.push('## Test Distribution');
    md.push('### By Type');
    for (const [type, count] of Object.entries(stats.testsByType)) {
      md.push(`- ${type}: ${count}`);
    }
    md.push('');
    
    md.push('### By Framework');
    for (const [framework, count] of Object.entries(stats.testsByFramework)) {
      md.push(`- ${framework}: ${count}`);
    }
    md.push('');
    
    md.push('## Theme Details');
    for (const entry of entries) {
      md.push(`### ${entry.theme.name}`);
      md.push(`- Status: ${entry.status}`);
      md.push(`- Tests: ${entry.statistics.totalTests}`);
      md.push(`- Last Scanned: ${entry.lastScanned.toISOString()}`);
      if (entry.theme.features && entry.theme.features.length > 0) {
        md.push(`- Features: ${entry.theme.features.join(', ')}`);
      }
      if (entry.errors) {
        md.push('- Errors:');
        entry.errors.forEach(error => md.push(`  - ${error}`));
      }
      md.push('');
    }
    
    return md.join('\n');
  }
}

export default ThemeRegistry;