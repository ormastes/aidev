/**
 * JavaScript Skip Patterns for TypeScript Checks
 * Based on TS_CHECK_SKIP_LIST.md
 */

import * as path from 'path';
import { minimatch } from 'minimatch';

export interface SkipPattern {
  pattern: string;
  reason: string;
  category: string;
}

export class JavaScriptSkipChecker {
  private skipPatterns: SkipPattern[] = [
    // Configuration Files
    { pattern: '**/jest.config.js', reason: 'Jest configuration', category: 'config' },
    { pattern: '**/jest.setup.js', reason: 'Jest setup file', category: 'config' },
    { pattern: '**/jest.preset.js', reason: 'Jest preset', category: 'config' },
    { pattern: '**/cucumber.js', reason: 'Cucumber configuration', category: 'config' },
    { pattern: '**/.cucumberrc.js', reason: 'Cucumber RC file', category: 'config' },
    { pattern: '**/webpack.config.js', reason: 'Webpack configuration', category: 'config' },
    { pattern: '**/webpack.*.js', reason: 'Webpack configuration variant', category: 'config' },
    { pattern: '**/rollup.config.js', reason: 'Rollup configuration', category: 'config' },
    { pattern: '**/vite.config.js', reason: 'Vite configuration', category: 'config' },
    { pattern: '**/.eslintrc.js', reason: 'ESLint configuration', category: 'config' },
    { pattern: '**/.prettierrc.js', reason: 'Prettier configuration', category: 'config' },
    { pattern: '**/babel.config.js', reason: 'Babel configuration', category: 'config' },
    { pattern: '**/.babelrc.js', reason: 'Babel RC file', category: 'config' },
    { pattern: '**/postcss.config.js', reason: 'PostCSS configuration', category: 'config' },
    { pattern: '**/tailwind.config.js', reason: 'Tailwind configuration', category: 'config' },
    { pattern: '**/playwright.config.js', reason: 'Playwright configuration', category: 'config' },
    { pattern: '**/next.config.js', reason: 'Next.js configuration', category: 'config' },
    { pattern: '**/commitlint.config.js', reason: 'Commitlint configuration', category: 'config' },
    { pattern: '**/lint-staged.config.js', reason: 'Lint-staged configuration', category: 'config' },
    { pattern: '**/stylelint.config.js', reason: 'Stylelint configuration', category: 'config' },

    // Browser/Client-Side Scripts - match at any level
    { pattern: 'public/**', reason: 'Public browser script', category: 'browser' },
    { pattern: '**/public/**', reason: 'Public browser script', category: 'browser' },
    { pattern: 'static/**', reason: 'Static asset', category: 'browser' },
    { pattern: '**/static/**', reason: 'Static asset', category: 'browser' },
    { pattern: 'assets/**', reason: 'Asset file', category: 'browser' },
    { pattern: '**/assets/**', reason: 'Asset file', category: 'browser' },
    { pattern: 'dist/**', reason: 'Distribution build', category: 'build' },
    { pattern: '**/dist/**', reason: 'Distribution build', category: 'build' },
    { pattern: 'build/**', reason: 'Build output', category: 'build' },
    { pattern: '**/build/**', reason: 'Build output', category: 'build' },
    { pattern: 'out/**', reason: 'Output file', category: 'build' },
    { pattern: '**/out/**', reason: 'Output file', category: 'build' },

    // Database Configuration
    { pattern: '**/config/database.js', reason: 'Database configuration', category: 'database' },
    { pattern: '**/config/db.js', reason: 'Database configuration', category: 'database' },
    { pattern: '**/database.config.js', reason: 'Database configuration', category: 'database' },
    { pattern: '**/knexfile.js', reason: 'Knex configuration', category: 'database' },
    { pattern: '**/ormconfig.js', reason: 'ORM configuration', category: 'database' },
    { pattern: '**/sequelize.config.js', reason: 'Sequelize configuration', category: 'database' },

    // Test Fixtures and Mocks - match at any level
    { pattern: 'fixtures/**', reason: 'Test fixture', category: 'test' },
    { pattern: '**/fixtures/**', reason: 'Test fixture', category: 'test' },
    { pattern: 'mocks/**', reason: 'Mock file', category: 'test' },
    { pattern: '**/mocks/**', reason: 'Mock file', category: 'test' },
    { pattern: '__mocks__/**', reason: 'Jest mock', category: 'test' },
    { pattern: '**/__mocks__/**', reason: 'Jest mock', category: 'test' },
    { pattern: 'test-helpers/**', reason: 'Test helper', category: 'test' },
    { pattern: '**/test-helpers/**', reason: 'Test helper', category: 'test' },
    { pattern: 'test-utils/**', reason: 'Test utility', category: 'test' },
    { pattern: '**/test-utils/**', reason: 'Test utility', category: 'test' },
    { pattern: 'test-apps/**', reason: 'Test application', category: 'test' },
    { pattern: '**/test-apps/**', reason: 'Test application', category: 'test' },
    { pattern: '**/test-*-app.js', reason: 'Test app fixture', category: 'test' },
    { pattern: '**/mock-*.js', reason: 'Mock file', category: 'test' },

    // Demo and Release - match at any level
    { pattern: 'demo/**', reason: 'Demo file', category: 'demo' },
    { pattern: '**/demo/**', reason: 'Demo file', category: 'demo' },
    { pattern: 'release/**', reason: 'Release artifact', category: 'release' },
    { pattern: '**/release/**', reason: 'Release artifact', category: 'release' },
    { pattern: 'releases/**', reason: 'Release artifact', category: 'release' },
    { pattern: '**/releases/**', reason: 'Release artifact', category: 'release' },
    { pattern: 'examples/**', reason: 'Example file', category: 'demo' },
    { pattern: '**/examples/**', reason: 'Example file', category: 'demo' },
    { pattern: 'samples/**', reason: 'Sample file', category: 'demo' },
    { pattern: '**/samples/**', reason: 'Sample file', category: 'demo' },

    // Generated and Vendor Files - match at any level
    { pattern: 'vendor/**', reason: 'Vendor library', category: 'vendor' },
    { pattern: '**/vendor/**', reason: 'Vendor library', category: 'vendor' },
    { pattern: 'vendors/**', reason: 'Vendor library', category: 'vendor' },
    { pattern: '**/vendors/**', reason: 'Vendor library', category: 'vendor' },
    { pattern: '**/lib/vendor/**', reason: 'Vendor library', category: 'vendor' },
    { pattern: 'third-party/**', reason: 'Third-party library', category: 'vendor' },
    { pattern: '**/third-party/**', reason: 'Third-party library', category: 'vendor' },
    { pattern: 'generated/**', reason: 'Generated file', category: 'generated' },
    { pattern: '**/generated/**', reason: 'Generated file', category: 'generated' },
    { pattern: 'gen/**', reason: 'Generated file', category: 'generated' },
    { pattern: '**/gen/**', reason: 'Generated file', category: 'generated' },
    { pattern: '.next/**', reason: 'Next.js generated', category: 'generated' },
    { pattern: '**/.next/**', reason: 'Next.js generated', category: 'generated' },
    { pattern: '**/*generated*.js', reason: 'Generated file', category: 'generated' },
    { pattern: '**/prism.js', reason: 'Prism library', category: 'vendor' },
    { pattern: '**/prism-*.js', reason: 'Prism plugin', category: 'vendor' },

    // Scripts and Utilities
    { pattern: '**/scripts/**/*.js', reason: 'Script file', category: 'script' },
    { pattern: '**/bin/**/*.js', reason: 'Binary/executable', category: 'script' },
    { pattern: '**/tools/**/*.js', reason: 'Tool file', category: 'script' },

    // Node Modules
    { pattern: '**/node_modules/**', reason: 'Node module', category: 'dependency' },
    { pattern: '**/.pnpm/**', reason: 'PNPM cache', category: 'dependency' },
    { pattern: '**/bower_components/**', reason: 'Bower component', category: 'dependency' },

    // Environment and Cache
    { pattern: '**/.cache/**', reason: 'Cache file', category: 'cache' },
    { pattern: '**/.temp/**', reason: 'Temporary file', category: 'temp' },
    { pattern: '**/.tmp/**', reason: 'Temporary file', category: 'temp' },
    { pattern: '**/temp/**', reason: 'Temporary file', category: 'temp' },
    { pattern: '**/tmp/**', reason: 'Temporary file', category: 'temp' },
    { pattern: '**/.env.js', reason: 'Environment config', category: 'config' },
    { pattern: '**/env.config.js', reason: 'Environment config', category: 'config' },

    // Coverage and Test Results
    { pattern: '**/coverage/**', reason: 'Coverage report', category: 'test-output' },
    { pattern: '**/.nyc_output/**', reason: 'NYC coverage', category: 'test-output' },
    { pattern: '**/test-results/**', reason: 'Test results', category: 'test-output' },
    { pattern: '**/test-reports/**', reason: 'Test report', category: 'test-output' },
    { pattern: '**/.jest/**', reason: 'Jest cache', category: 'test-output' },

    // File Extensions
    { pattern: '**/*.min.js', reason: 'Minified file', category: 'build' },
    { pattern: '**/*.bundle.js', reason: 'Bundled file', category: 'build' },
    { pattern: '**/*.chunk.js', reason: 'Code split chunk', category: 'build' },
    { pattern: '**/*.compiled.js', reason: 'Compiled output', category: 'build' },
    { pattern: '**/*.generated.js', reason: 'Generated file', category: 'generated' },
    { pattern: '**/*.config.js', reason: 'Configuration file', category: 'config' },
    { pattern: '**/*.setup.js', reason: 'Setup file', category: 'config' },
    { pattern: '**/*.preset.js', reason: 'Preset file', category: 'config' }
  ];

  /**
   * Check if a file should be skipped based on patterns
   */
  shouldSkip(filePath: string): { skip: boolean; reason?: string; category?: string } {
    const normalizedPath = path.normalize(filePath);
    
    for (const { pattern, reason, category } of this.skipPatterns) {
      if (minimatch(normalizedPath, pattern, { matchBase: true, dot: true })) {
        return { skip: true, reason, category };
      }
    }

    // Check if it's a TypeScript file (shouldn't skip)
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      return { skip: false };
    }

    return { skip: false };
  }

  /**
   * Get all skip patterns
   */
  getPatterns(): SkipPattern[] {
    return [...this.skipPatterns];
  }

  /**
   * Add custom skip pattern
   */
  addPattern(pattern: string, reason: string, category: string = 'custom'): void {
    this.skipPatterns.push({ pattern, reason, category });
  }

  /**
   * Remove a skip pattern
   */
  removePattern(pattern: string): boolean {
    const index = this.skipPatterns.findIndex(p => p.pattern === pattern);
    if (index !== -1) {
      this.skipPatterns.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get statistics about skip patterns
   */
  getStatistics(): Record<string, number> {
    const stats: Record<string, number> = {};
    
    for (const { category } of this.skipPatterns) {
      stats[category] = (stats[category] || 0) + 1;
    }
    
    stats.total = this.skipPatterns.length;
    return stats;
  }

  /**
   * Export patterns to JSON
   */
  exportPatterns(): string {
    return JSON.stringify(this.skipPatterns, null, 2);
  }

  /**
   * Import patterns from JSON
   */
  importPatterns(json: string): void {
    try {
      const patterns = JSON.parse(json) as SkipPattern[];
      if (Array.isArray(patterns)) {
        this.skipPatterns = patterns;
      }
    } catch (error) {
      console.error('Failed to import patterns:', error);
    }
  }
}