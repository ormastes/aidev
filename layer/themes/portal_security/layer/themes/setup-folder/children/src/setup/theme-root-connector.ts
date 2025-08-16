import { path } from '../../../../../../../infra_external-log-lib/src';
import * as fs from 'fs-extra';
import chalk from 'chalk';
import { getFileAPI, FileType } from '../../../../../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


export interface ThemeConnectionConfig {
  themePath: string;
  themeName: string;
  themeType: 'demo' | 'release';
  rootPath: string;
}

export class ThemeRootConnector {
  /**
   * Creates connection between a setup theme and root project
   */
  static async connectThemeToRoot(config: ThemeConnectionConfig): Promise<void> {
    console.log(chalk.blue(`🔗 Connecting theme ${config.themeName} to root project...`));
    
    // Create test runner configuration
    await this.createTestRunnerConfig(config);
    
    // Create coverage aggregation link
    await this.createCoverageLink(config);
    
    // Update root test configuration to include theme
    await this.updateRootTestConfig(config);
    
    console.log(chalk.green(`✅ Theme ${config.themeName} connected to root project`));
  }

  /**
   * Creates test runner configuration for the theme
   */
  private static async createTestRunnerConfig(config: ThemeConnectionConfig): Promise<void> {
    const testConfig = {
      name: config.themeName,
      type: config.themeType,
      path: config.themePath,
      testScript: 'npm test',
      coverageScript: 'npm test -- --coverage',
      coverageOutput: path.join(config.themePath, "coverage"),
      connected: true,
      rootPath: config.rootPath
    };

    const configPath = path.join(config.themePath, 'theme-test-config.json');
    await fs.writeJson(configPath, testConfig, { spaces: 2 });
  }

  /**
   * Creates coverage aggregation link
   */
  private static async createCoverageLink(config: ThemeConnectionConfig): Promise<void> {
    // Create coverage aggregation script
    const coverageScript = `#!/bin/bash
# Coverage link script for ${config.themeName}
# This script ensures coverage data is available for root aggregation

set -e

THEME_PATH="${config.themePath}"
ROOT_PATH="${config.rootPath}"
THEME_NAME="${config.themeName}"
THEME_TYPE="${config.themeType}"

# Run tests with coverage
echo "Running tests with coverage for $THEME_NAME..."
npm test -- --coverage

# Copy coverage to root aggregation directory
if [ -f "coverage/coverage-final.json" ]; then
  DEST_DIR="$ROOT_PATH/gen/coverage/themes/$THEME_TYPE/$THEME_NAME"
  mkdir -p "$DEST_DIR"
  cp -r coverage/* "$DEST_DIR/"
  echo "Coverage data copied to root aggregation directory"
fi

# Create coverage metadata
cat > coverage/metadata.json << EOF
{
  "themeName": "$THEME_NAME",
  "themeType": "$THEME_TYPE",
  "themePath": "$THEME_PATH",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "connected": true
}
EOF

echo "Coverage link created for $THEME_NAME"
`;

    const scriptPath = path.join(config.themePath, 'scripts', 'coverage-link.sh');
    await fs.ensureDir(path.dirname(scriptPath));
    await fileAPI.createFile(scriptPath, coverageScript);
    await fs.chmod(scriptPath, { type: FileType.TEMPORARY });
    
    interface ThemeRegistryEntry {
      name: string;
      type: 'demo' | 'release';
      path: string;
      connected: boolean;
      lastUpdated: string;
    }
    
    interface ThemeRegistry {
      themes: ThemeRegistryEntry[];
    }
    
    // Load existing registry or create new one
    let registry: ThemeRegistry = { themes: [] };
    if (await fs.pathExists(registryPath)) {
      registry = await fs.readJson(registryPath);
    }

    // Add or update theme entry
    const themeEntry = {
      name: config.themeName,
      type: config.themeType,
      path: path.relative(config.rootPath, config.themePath),
      connected: true,
      lastUpdated: new Date().toISOString()
    };

    // Remove existing entry if present
    registry.themes = registry.themes.filter(t => t.name !== config.themeName);
    registry.themes.push(themeEntry);

    // Save updated registry
    await fs.ensureDir(path.dirname(registryPath));
    await fs.writeJson(registryPath, registry, { spaces: 2 });
  }

  /**
   * Creates a Jest configuration that connects to root
   */
  static async createConnectedJestConfig(config: ThemeConnectionConfig): Promise<void> {
    const jestConfig = `module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.spec.ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],
  coverageDirectory: "coverage",
  coverageReporters: ['text', 'lcov', 'html', 'json-summary', 'json'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  // Connection to root project
  globalSetup: './jest.global-setup.js',
  reporters: [
    'default',
    ['./jest-root-reporter.js', {
      rootPath: '${config.rootPath}',
      themeName: '${config.themeName}',
      themeType: '${config.themeType}'
    }]
  ]
};
`;

    await fileAPI.createFile(path.join(config.themePath, 'jest.config.js'), { type: FileType.TEMPORARY }), globalSetup);

    // Create custom reporter that reports to root
    const reporter = `class RootReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options;
  }

  async onRunComplete(contexts, results) {
    const fs = require('fs-extra');
    const path = require('node:path');
    
    const report = {
      themeName: this._options.themeName,
      themeType: this._options.themeType,
      testResults: results,
      timestamp: new Date().toISOString()
    };

    const reportPath = path.join(
      this._options.rootPath,
      'gen',
      'test-reports',
      'themes',
      this._options.themeType,
      this._options.themeName + '-report.json'
    );

    fs.ensureDirSync(path.dirname(reportPath));
    fs.writeJsonSync(reportPath, report, { spaces: 2 });
  }
}

module.exports = RootReporter;
`;

    await fileAPI.createFile(path.join(config.themePath, 'jest-root-reporter.js'), { type: FileType.TEMPORARY });
  }
}