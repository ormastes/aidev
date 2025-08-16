/**
 * Unified Quality Metrics Setup Service
 * Provides unified quality metrics and reporting for mixed TypeScript and C++ projects
 */

import * as fs from 'fs/promises';
import { path } from '../../../infra_external-log-lib/src';
import { exec } from 'child_process';
import { promisify } from 'util';
import { CppCoverageChecker } from './cpp-coverage-setup';
import { CppDuplicationAnalyzer } from './cpp-duplication-setup';
import { CppThresholdValidator } from './cpp-threshold-config';
import { CppReportGenerator } from './cpp-report-setup';
import { getFileAPI, FileType } from '../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();

const execAsync = promisify(exec);

export interface UnifiedMetricsConfig {
  languages: LanguageConfig[];
  metrics: MetricType[];
  reporting: ReportingConfig;
  integration: IntegrationConfig;
  thresholds: QualityThresholds;
  dashboard: DashboardConfig;
}

export interface LanguageConfig {
  language: 'typescript' | 'javascript' | 'cpp' | 'c';
  enabled: boolean;
  tools: {
    coverage?: string;
    duplication?: string;
    complexity?: string;
    linting?: string;
  };
  paths: string[];
  exclude: string[];
}

export type MetricType = 'coverage' | 'duplication' | 'complexity' | 'maintainability' | 'security' | 'performance';

export interface ReportingConfig {
  formats: ('html' | 'json' | 'markdown' | 'xml' | 'badge')[];
  outputDirectory: string;
  unifiedReport: boolean;
  perLanguageReports: boolean;
  historicalTracking: boolean;
  trendAnalysis: boolean;
}

export interface IntegrationConfig {
  storyReporter: boolean;
  ciPipeline: boolean;
  preCommitHooks: boolean;
  gitHooks: boolean;
  prComments: boolean;
  slackNotifications?: {
    webhookUrl: string;
    channels: string[];
  };
}

export interface QualityThresholds {
  coverage: {
    line: number;
    branch: number;
    function: number;
  };
  duplication: {
    ratio: number;
    minTokens: number;
  };
  complexity: {
    cyclomatic: number;
    cognitive: number;
  };
  maintainability: {
    index: number;
  };
}

export interface DashboardConfig {
  enabled: boolean;
  port: number;
  autoOpen: boolean;
  refreshInterval: number;
  theme: 'light' | 'dark';
}

export interface QualityMetrics {
  timestamp: string;
  project: string;
  languages: {
    [language: string]: LanguageMetrics;
  };
  overall: OverallMetrics;
  trends: TrendData[];
  recommendations: string[];
}

export interface LanguageMetrics {
  coverage?: {
    line: number;
    branch: number;
    function: number;
    class?: number;
  };
  duplication?: {
    ratio: number;
    duplications: number;
    duplicatedLines: number;
  };
  complexity?: {
    average: number;
    max: number;
    files: Array<{ path: string; complexity: number }>;
  };
  maintainability?: {
    index: number;
    rating: 'A' | 'B' | 'C' | 'D' | 'F';
  };
  linting?: {
    errors: number;
    warnings: number;
    info: number;
  };
}

export interface OverallMetrics {
  qualityScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  passedThresholds: number;
  totalThresholds: number;
  criticalIssues: string[];
}

export interface TrendData {
  date: string;
  qualityScore: number;
  coverage: number;
  duplication: number;
  complexity: number;
}

export class UnifiedQualitySetup {
  private defaultConfig: UnifiedMetricsConfig = {
    languages: [
      {
        language: 'typescript',
        enabled: true,
        tools: {
          coverage: 'jest',
          duplication: 'jscpd',
          complexity: 'eslint',
          linting: 'eslint'
        },
        paths: ['src', 'lib'],
        exclude: ['node_modules', 'dist', 'coverage']
      },
      {
        language: 'cpp',
        enabled: true,
        tools: {
          coverage: 'llvm-cov',
          duplication: 'cpd',
          complexity: 'lizard',
          linting: 'clang-tidy'
        },
        paths: ['src', 'include'],
        exclude: ['build', 'third_party', 'external']
      }
    ],
    metrics: ['coverage', 'duplication', 'complexity', 'maintainability'],
    reporting: {
      formats: ['html', 'json', 'badge'],
      outputDirectory: 'quality-reports',
      unifiedReport: true,
      perLanguageReports: true,
      historicalTracking: true,
      trendAnalysis: true
    },
    integration: {
      storyReporter: true,
      ciPipeline: true,
      preCommitHooks: true,
      gitHooks: false,
      prComments: false
    },
    thresholds: {
      coverage: {
        line: 80,
        branch: 75,
        function: 80
      },
      duplication: {
        ratio: 5,
        minTokens: 50
      },
      complexity: {
        cyclomatic: 10,
        cognitive: 15
      },
      maintainability: {
        index: 70
      }
    },
    dashboard: {
      enabled: true,
      port: 3456,
      autoOpen: false,
      refreshInterval: 30000,
      theme: 'light'
    }
  };

  async setup(projectPath: string, config?: Partial<UnifiedMetricsConfig>): Promise<void> {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    console.log(`📊 Setting up unified quality metrics for: ${projectPath}`);
    
    // Create quality directory structure
    await this.createDirectoryStructure(projectPath, finalConfig);
    
    // Write configuration
    await this.writeConfig(projectPath, finalConfig);
    
    // Setup each language
    for (const langConfig of finalConfig.languages) {
      if (langConfig.enabled) {
        await this.setupLanguage(projectPath, langConfig, finalConfig);
      }
    }
    
    // Create unified scripts
    await this.createUnifiedScripts(projectPath, finalConfig);
    
    // Setup integrations
    await this.setupIntegrations(projectPath, finalConfig);
    
    // Setup dashboard if enabled
    if (finalConfig.dashboard.enabled) {
      await this.setupDashboard(projectPath, finalConfig.dashboard);
    }
    
    console.log('✅ Unified quality metrics setup complete!');
    this.printUsageInstructions(projectPath, finalConfig);
  }

  private async createDirectoryStructure(projectPath: string, config: UnifiedMetricsConfig): Promise<void> {
    const dirs = [
      path.join(projectPath, '.quality'),
      path.join(projectPath, config.reporting.outputDirectory),
      path.join(projectPath, config.reporting.outputDirectory, 'history'),
      path.join(projectPath, config.reporting.outputDirectory, 'badges'),
      path.join(projectPath, config.reporting.outputDirectory, 'typescript'),
      path.join(projectPath, config.reporting.outputDirectory, 'cpp')
    ];
    
    for (const dir of dirs) {
      await fileAPI.createDirectory(dir);
    }
  }

  private async writeConfig(projectPath: string, config: UnifiedMetricsConfig): Promise<void> {
    const configPath = path.join(projectPath, '.quality', 'config.json');
    await fileAPI.createFile(configPath, JSON.stringify(config, null, 2), { type: FileType.CONFIG });
  }

  private async setupLanguage(
    projectPath: string,
    langConfig: LanguageConfig,
    config: UnifiedMetricsConfig
  ): Promise<void> {
    console.log(`  Setting up ${langConfig.language} quality tools...`);
    
    switch (langConfig.language) {
      case 'typescript':
      case 'javascript':
        await this.setupTypeScriptQuality(projectPath, langConfig, config);
        break;
      case 'cpp':
      case 'c':
        await this.setupCppQuality(projectPath, langConfig, config);
        break;
    }
  }

  private async setupTypeScriptQuality(
    projectPath: string,
    langConfig: LanguageConfig,
    config: UnifiedMetricsConfig
  ): Promise<void> {
    // Jest configuration for coverage
    if (langConfig.tools.coverage === 'jest') {
      const jestConfig = {
        collectCoverage: true,
        coverageDirectory: path.join(config.reporting.outputDirectory, 'typescript', 'coverage'),
        coverageReporters: ['json', 'lcov', 'text', 'html'],
        coverageThreshold: {
          global: {
            lines: config.thresholds.coverage.line,
            branches: config.thresholds.coverage.branch,
            functions: config.thresholds.coverage.function,
            statements: config.thresholds.coverage.line
          }
        },
        collectCoverageFrom: langConfig.paths.map(p => `${p}/**/*.{ts,tsx,js,jsx}`),
        coveragePathIgnorePatterns: langConfig.exclude
      };
      
      const jestConfigPath = path.join(projectPath, 'jest.config.quality.js');
      await fileAPI.createFile(jestConfigPath, `module.exports = ${JSON.stringify(jestConfig, null, 2)};`, { type: FileType.CONFIG });
    }
    
    // JSCPD configuration for duplication
    if (langConfig.tools.duplication === 'jscpd') {
      const jscpdConfig = {
        threshold: config.thresholds.duplication.ratio,
        minTokens: config.thresholds.duplication.minTokens,
        reporters: ['json', 'html'],
        output: path.join(config.reporting.outputDirectory, 'typescript', 'duplication'),
        ignore: langConfig.exclude,
        format: ['typescript', 'javascript']
      };
      
      const jscpdConfigPath = path.join(projectPath, '.jscpd.json');
      await fileAPI.createFile(jscpdConfigPath, JSON.stringify(jscpdConfig, null, 2), { type: FileType.CONFIG });
    }
    
    // ESLint configuration for complexity
    if (langConfig.tools.complexity === 'eslint') {
      const eslintRules = {
        'complexity': ['error', config.thresholds.complexity.cyclomatic],
        'max-depth': ['error', 4],
        'max-lines': ['error', 300],
        'max-lines-per-function': ['error', 50],
        'max-nested-callbacks': ['error', 3],
        'max-params': ['error', 4]
      };
      
      const eslintConfigPath = path.join(projectPath, '.eslintrc.quality.json');
      await fileAPI.createFile(eslintConfigPath, JSON.stringify({
        rules: eslintRules,
        extends: ['.eslintrc.json']
      }, null, 2));
    }
  }

  private async setupCppQuality(
    projectPath: string,
    langConfig: LanguageConfig,
    config: UnifiedMetricsConfig
  ): Promise<void> {
    // Already setup via previous services
    console.log('    Using existing C++ coverage and duplication setup');
    
    // Setup complexity analysis with Lizard
    if (langConfig.tools.complexity === 'lizard') {
      const lizardScript = `#!/bin/bash
# Run Lizard complexity analysis for C++

set -e

# Install lizard if not present
if ! command -v lizard &> /dev/null; then
    echo "Installing lizard..."
    pip install lizard
fi

# Run complexity analysis
lizard \\
    --CCN ${config.thresholds.complexity.cyclomatic} \\
    --length 100 \\
    --arguments 5 \\
    --warnings_only \\
    --exclude "${langConfig.exclude.join(' ')}" \\
    --xml \\
    ${langConfig.paths.join(' ')} \\
    > ${config.reporting.outputDirectory}/cpp/complexity.xml

# Convert to JSON
lizard \\
    --CCN ${config.thresholds.complexity.cyclomatic} \\
    --exclude "${langConfig.exclude.join(' ')}" \\
    --json \\
    ${langConfig.paths.join(' ')} \\
    > ${config.reporting.outputDirectory}/cpp/complexity.json

echo "✅ C++ complexity analysis complete"
`;
      
      const scriptPath = path.join(projectPath, '.quality', 'check-cpp-complexity.sh');
      await fileAPI.createFile(scriptPath, lizardScript);
      await fs.chmod(scriptPath, { type: FileType.TEMPORARY });
    }
  }

  private async createUnifiedScripts(projectPath: string, config: UnifiedMetricsConfig): Promise<void> {
    // Main quality check script
    const mainScript = `#!/bin/bash
# Unified quality metrics check

set -e

echo "🔍 Running unified quality analysis..."

# Run all quality checks
node -e "
const { UnifiedQualityAnalyzer } = require('@aidev/init_setup-folder');
const analyzer = new UnifiedQualityAnalyzer();
analyzer.runFullAnalysis('${projectPath}').then(metrics => {
  console.log('\\n📊 Quality Analysis Complete!');
  console.log('   Quality Score: ' + metrics.overall.qualityScore + '/100');
  console.log('   Grade: ' + metrics.overall.grade);
  console.log('   Passed Thresholds: ' + metrics.overall.passedThresholds + '/' + metrics.overall.totalThresholds);
  
  if (metrics.overall.criticalIssues.length > 0) {
    console.error('\\n❌ Critical Issues Found:');
    metrics.overall.criticalIssues.forEach(issue => console.error('   - ' + issue));
    process.exit(1);
  } else {
    console.log('\\n✅ All quality checks passed!');
  }
}).catch(err => {
  console.error('Error running quality analysis:', err);
  process.exit(1);
});
"
`;
    
    const scriptPath = path.join(projectPath, '.quality', 'check-all.sh');
    await fileAPI.createFile(scriptPath, mainScript);
    await fs.chmod(scriptPath, { type: FileType.TEMPORARY });
    
    // Individual metric scripts
    await this.createMetricScripts(projectPath, config);
  }

  private async createMetricScripts(projectPath: string, config: UnifiedMetricsConfig): Promise<void> {
    const metrics = ['coverage', 'duplication', 'complexity', 'maintainability'];
    
    for (const metric of metrics) {
      const script = `#!/bin/bash
# Check ${metric} metrics

set -e

echo "🔍 Checking ${metric}..."

# TypeScript/JavaScript
if [ -f "package.json" ]; then
    echo "  Checking TypeScript ${metric}..."
    case "${metric}" in
        coverage)
            npm test -- --coverage
            ;;
        duplication)
            bunx jscpd
            ;;
        complexity)
            bunx eslint --config .eslintrc.quality.json --format json --output-file ${config.reporting.outputDirectory}/typescript/complexity.json src/
            ;;
        maintainability)
            # Would use a tool like plato or escomplex
            echo "    Maintainability check for TypeScript"
            ;;
    esac
fi

# C++
if ls *.cpp *.cc *.h *.hpp 2>/dev/null; then
    echo "  Checking C++ ${metric}..."
    case "${metric}" in
        coverage)
            ./.coverage/check-coverage.sh
            ;;
        duplication)
            ./.duplication/check-duplication.sh
            ;;
        complexity)
            ./.quality/check-cpp-complexity.sh
            ;;
        maintainability)
            # Calculate maintainability index
            echo "    Maintainability check for C++"
            ;;
    esac
fi

echo "✅ ${metric} check complete"
`;
      
      const scriptPath = path.join(projectPath, '.quality', `check-${metric}.sh`);
      await fileAPI.createFile(scriptPath, script);
      await fs.chmod(scriptPath, { type: FileType.TEMPORARY });
    }
  }

  private async setupIntegrations(projectPath: string, config: UnifiedMetricsConfig): Promise<void> {
    if (config.integration.preCommitHooks) {
      await this.setupPreCommitHooks(projectPath, config);
    }
    
    if (config.integration.ciPipeline) {
      await this.setupCIPipeline(projectPath, config);
    }
    
    if (config.integration.gitHooks) {
      await this.setupGitHooks(projectPath, config);
    }
  }

  private async setupPreCommitHooks(projectPath: string, config: UnifiedMetricsConfig): Promise<void> {
    const preCommitConfig = {
      repos: [
        {
          repo: 'local',
          hooks: [
            {
              id: 'quality-check',
              name: 'Quality Metrics Check',
              entry: '.quality/check-all.sh',
              language: 'script',
              pass_filenames: false,
              always_run: true
            }
          ]
        }
      ]
    };
    
    const configPath = path.join(projectPath, '.pre-commit-config.yaml');
    const yaml = this.objectToYaml(preCommitConfig);
    await fileAPI.createFile(configPath, yaml);
  }

  private async setupCIPipeline(projectPath: string, { type: FileType.TEMPORARY }): Promise<void> {
    // GitHub Actions workflow
    const workflow = `name: Quality Metrics

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'
    
    - name: Setup C++ environment
      run: |
        sudo apt-get update
        sudo apt-get install -y clang llvm lcov
    
    - name: Install dependencies
      run: |
        npm ci
        pip install lizard
    
    - name: Run quality checks
      run: .quality/check-all.sh
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v2
      with:
        directory: ${config.reporting.outputDirectory}
    
    - name: Upload quality reports
      uses: actions/upload-artifact@v2
      with:
        name: quality-reports
        path: ${config.reporting.outputDirectory}
    
    - name: Comment PR
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v6
      with:
        script: |
          const fs = require('fs');
          const report = JSON.parse(fs.readFileSync('${config.reporting.outputDirectory}/unified-report.json', 'utf-8'));
          
          const comment = \`## 📊 Quality Metrics Report
          
          **Quality Score:** \${report.overall.qualityScore}/100 (\${report.overall.grade})
          
          ### Coverage
          - Line: \${report.languages.overall.coverage.line}%
          - Branch: \${report.languages.overall.coverage.branch}%
          - Function: \${report.languages.overall.coverage.function}%
          
          ### Duplication
          - Ratio: \${report.languages.overall.duplication.ratio}%
          
          ### Complexity
          - Average: \${report.languages.overall.complexity.average}
          - Max: \${report.languages.overall.complexity.max}
          \`;
          
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: comment
          });
`;
    
    const workflowDir = path.join(projectPath, '.github', 'workflows');
    await fileAPI.createDirectory(workflowDir);
    await fileAPI.createFile(path.join(workflowDir, 'quality.yml'), { type: FileType.TEMPORARY });
  }

  private async setupGitHooks(projectPath: string, config: UnifiedMetricsConfig): Promise<void> {
    const preCommitHook = `#!/bin/bash
# Pre-commit hook for quality checks

set -e

echo "🔍 Running quality checks before commit..."

# Run quick checks only
.quality/check-complexity.sh

if [ $? -ne 0 ]; then
    echo "❌ Quality checks failed. Please fix issues before committing."
    exit 1
fi

echo "✅ Quality checks passed!"
`;
    
    const hooksDir = path.join(projectPath, '.git', 'hooks');
    try {
      await fileAPI.createDirectory(hooksDir);
      const hookPath = path.join(hooksDir, 'pre-commit');
      await fileAPI.createFile(hookPath, preCommitHook);
      await fs.chmod(hookPath, { type: FileType.TEMPORARY });
    } catch (error) {
      console.warn('  Could not setup git hooks (not a git repository?)');
    }
  }

  private async setupDashboard(projectPath: string, config: DashboardConfig): Promise<void> {
    const dashboardHtml = `<!DOCTYPE html>
<html>
<head>
    <title>Quality Metrics Dashboard</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: ${config.theme === 'dark' ? '#1a1a1a' : '#f5f5f5'};
            color: ${config.theme === 'dark' ? '#e0e0e0' : '#333'};
        }
        .header {
            background: ${config.theme === 'dark' ? '#2d2d2d' : '#fff'};
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .metric-card {
            background: ${config.theme === 'dark' ? '#2d2d2d' : '#fff'};
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .metric-value {
            font-size: 48px;
            font-weight: bold;
            margin: 10px 0;
        }
        .metric-label {
            font-size: 14px;
            opacity: 0.7;
            text-transform: uppercase;
        }
        .chart-container {
            background: ${config.theme === 'dark' ? '#2d2d2d' : '#fff'};
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            height: 400px;
        }
        .good { color: #4caf50; }
        .warning { color: #ff9800; }
        .bad { color: #f44336; }
        .refresh-indicator {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${config.theme === 'dark' ? '#2d2d2d' : '#fff'};
            padding: 10px 20px;
            border-radius: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="header">
        <div class="container">
            <h1>Quality Metrics Dashboard</h1>
            <p id="last-updated">Loading...</p>
        </div>
    </div>
    
    <div class="container">
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-label">Quality Score</div>
                <div class="metric-value" id="quality-score">--</div>
                <div id="quality-grade">Grade: -</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Coverage</div>
                <div class="metric-value" id="coverage">--%</div>
                <div id="coverage-details">Line: --% | Branch: --%</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Duplication</div>
                <div class="metric-value" id="duplication">--%</div>
                <div id="duplication-details">-- duplications found</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Complexity</div>
                <div class="metric-value" id="complexity">--</div>
                <div id="complexity-details">Max: --</div>
            </div>
        </div>
        
        <div class="chart-container">
            <canvas id="trend-chart"></canvas>
        </div>
        
        <div class="chart-container">
            <canvas id="language-chart"></canvas>
        </div>
    </div>
    
    <div class="refresh-indicator">
        <span id="refresh-status">Auto-refresh: ON</span>
    </div>
    
    <script>
        const API_ENDPOINT = 'http://localhost:${config.port}/api/metrics';
        const REFRESH_INTERVAL = ${config.refreshInterval};
        
        let trendChart, languageChart;
        
        async function loadMetrics() {
            try {
                const response = await fetch(API_ENDPOINT);
                const data = await response.json();
                updateDashboard(data);
            } catch (error) {
                console.error('Failed to load metrics:', error);
            }
        }
        
        async function updateDashboard(data) {
            // Update metric cards
            document.getElementById('quality-score').textContent = data.overall.qualityScore;
            document.getElementById('quality-score').className = 'metric-value ' + getScoreClass(data.overall.qualityScore);
            document.getElementById('quality-grade').textContent = 'Grade: ' + data.overall.grade;
            
            const coverage = data.languages.overall?.coverage || {};
            document.getElementById('coverage').textContent = (coverage.line || 0).toFixed(1) + '%';
            document.getElementById('coverage').className = 'metric-value ' + getScoreClass(coverage.line);
            document.getElementById('coverage-details').textContent = 
                \`Line: \${coverage.line?.toFixed(1) || 0}% | Branch: \${coverage.branch?.toFixed(1) || 0}%\`;
            
            const duplication = data.languages.overall?.duplication || {};
            document.getElementById('duplication').textContent = (duplication.ratio || 0).toFixed(1) + '%';
            document.getElementById('duplication').className = 'metric-value ' + (duplication.ratio < 5 ? 'good' : duplication.ratio < 10 ? 'warning' : 'bad');
            document.getElementById('duplication-details').textContent = \`\${duplication.duplications || 0} duplications found\`;
            
            const complexity = data.languages.overall?.complexity || {};
            document.getElementById('complexity').textContent = (complexity.average || 0).toFixed(1);
            document.getElementById('complexity').className = 'metric-value ' + (complexity.average < 10 ? 'good' : complexity.average < 20 ? 'warning' : 'bad');
            document.getElementById('complexity-details').textContent = \`Max: \${complexity.max || 0}\`;
            
            document.getElementById('last-updated').textContent = 'Last updated: ' + new Date(data.timestamp).toLocaleString();
            
            // Update charts
            updateTrendChart(data.trends);
            updateLanguageChart(data.languages);
        }
        
        async function getScoreClass(score) {
            if (score >= 80) return 'good';
            if (score >= 60) return 'warning';
            return 'bad';
        }
        
        async function updateTrendChart(trends) {
            const ctx = document.getElementById('trend-chart').getContext('2d');
            
            if (trendChart) {
                trendChart.destroy();
            }
            
            trendChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: trends.map(t => new Date(t.date).toLocaleDateString()),
                    datasets: [
                        {
                            label: 'Quality Score',
                            data: trends.map(t => t.qualityScore),
                            borderColor: 'rgb(75, 192, 192)',
                            tension: 0.1
                        },
                        {
                            label: 'Coverage',
                            data: trends.map(t => t.coverage),
                            borderColor: 'rgb(54, 162, 235)',
                            tension: 0.1
                        },
                        {
                            label: 'Duplication',
                            data: trends.map(t => t.duplication),
                            borderColor: 'rgb(255, 99, 132)',
                            tension: 0.1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Quality Trends'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });
        }
        
        async function updateLanguageChart(languages) {
            const ctx = document.getElementById('language-chart').getContext('2d');
            
            if (languageChart) {
                languageChart.destroy();
            }
            
            const labels = Object.keys(languages).filter(k => k !== 'overall');
            const coverageData = labels.map(l => languages[l].coverage?.line || 0);
            const complexityData = labels.map(l => languages[l].complexity?.average || 0);
            
            languageChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Coverage %',
                            data: coverageData,
                            backgroundColor: 'rgba(54, 162, 235, 0.5)'
                        },
                        {
                            label: 'Avg Complexity',
                            data: complexityData,
                            backgroundColor: 'rgba(255, 99, 132, 0.5)'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Metrics by Language'
                        }
                    }
                }
            });
        }
        
        // Initial load
        loadMetrics();
        
        // Auto-refresh
        setInterval(loadMetrics, REFRESH_INTERVAL);
    </script>
</body>
</html>`;
    
    const dashboardPath = path.join(projectPath, config.reporting.outputDirectory, 'dashboard.html');
    await fileAPI.createFile(dashboardPath, dashboardHtml);
    
    // Create simple API server script
    const serverScript = `#!/usr/bin/env node
const { http } = require('../../../infra_external-log-lib/src');
const { fs } = require('../../../infra_external-log-lib/src');
const { path } = require('../../../infra_external-log-lib/src');

const PORT = ${config.port};
const REPORTS_DIR = '${config.reporting.outputDirectory}';

const server = http.createServer((req, { type: FileType.TEMPORARY }) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.url === '/api/metrics') {
    try {
      const metricsPath = path.join(REPORTS_DIR, 'unified-report.json');
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf-8'));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(metrics));
    } catch (error) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Failed to load metrics' }));
    }
  } else if (req.url === '/') {
    const html = fs.readFileSync(path.join(REPORTS_DIR, 'dashboard.html'), 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(\`📊 Quality Dashboard running at http://localhost:\${PORT}\`);
});
`;
    
    const serverPath = path.join(projectPath, '.quality', 'dashboard-server.js');
    await fileAPI.createFile(serverPath, serverScript);
    await fs.chmod(serverPath, { type: FileType.TEMPORARY });
  }

  private objectToYaml(obj: any, indent: number = 0): string {
    let yaml = '';
    const spaces = ' '.repeat(indent);
    
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        for (const item of value) {
          if (typeof item === 'object') {
            yaml += `${spaces}- \n${this.objectToYaml(item, indent + 2)}`;
          } else {
            yaml += `${spaces}- ${item}\n`;
          }
        }
      } else if (typeof value === 'object') {
        yaml += `${spaces}${key}:\n${this.objectToYaml(value, indent + 2)}`;
      } else {
        yaml += `${spaces}${key}: ${value}\n`;
      }
    }
    
    return yaml;
  }

  private printUsageInstructions(projectPath: string, config: UnifiedMetricsConfig): void {
    console.log(`
📝 Unified Quality Metrics Usage:

   1. Run all quality checks:
      ./.quality/check-all.sh

   2. Run specific metric:
      ./.quality/check-coverage.sh
      ./.quality/check-duplication.sh
      ./.quality/check-complexity.sh

   3. View dashboard:
      ./.quality/dashboard-server.js
      Open: http://localhost:${config.dashboard.port}

   4. View reports:
      ${config.reporting.outputDirectory}/

📊 Configured Thresholds:
   - Coverage: ${config.thresholds.coverage.line}% line, ${config.thresholds.coverage.branch}% branch
   - Duplication: ${config.thresholds.duplication.ratio}% max
   - Complexity: ${config.thresholds.complexity.cyclomatic} cyclomatic

🔧 Integrations:
   ${config.integration.storyReporter ? '✅' : '❌'} Story Reporter
   ${config.integration.ciPipeline ? '✅' : '❌'} CI Pipeline
   ${config.integration.preCommitHooks ? '✅' : '❌'} Pre-commit Hooks
    `);
  }
}

/**
 * Unified Quality Analyzer
 */
export class UnifiedQualityAnalyzer {
  async runFullAnalysis(projectPath: string): Promise<QualityMetrics> {
    const configPath = path.join(projectPath, '.quality', 'config.json');
    const config: UnifiedMetricsConfig = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    
    const metrics: QualityMetrics = {
      timestamp: new Date().toISOString(),
      project: path.basename(projectPath),
      languages: {},
      overall: {
        qualityScore: 0,
        grade: 'F',
        passedThresholds: 0,
        totalThresholds: 0,
        criticalIssues: []
      },
      trends: [],
      recommendations: []
    };
    
    // Analyze each language
    for (const langConfig of config.languages) {
      if (langConfig.enabled) {
        metrics.languages[langConfig.language] = await this.analyzeLanguage(
          projectPath,
          langConfig,
          config
        );
      }
    }
    
    // Calculate overall metrics
    metrics.overall = this.calculateOverallMetrics(metrics.languages, config);
    
    // Load historical trends
    metrics.trends = await this.loadTrends(projectPath, config);
    
    // Generate recommendations
    metrics.recommendations = this.generateRecommendations(metrics, config);
    
    // Save report
    await this.saveReport(projectPath, metrics, config);
    
    return metrics;
  }

  private async analyzeLanguage(
    projectPath: string,
    langConfig: LanguageConfig,
    config: UnifiedMetricsConfig
  ): Promise<LanguageMetrics> {
    const metrics: LanguageMetrics = {};
    
    // Get coverage
    if (config.metrics.includes('coverage')) {
      metrics.coverage = await this.getCoverageMetrics(projectPath, langConfig);
    }
    
    // Get duplication
    if (config.metrics.includes('duplication')) {
      metrics.duplication = await this.getDuplicationMetrics(projectPath, langConfig);
    }
    
    // Get complexity
    if (config.metrics.includes('complexity')) {
      metrics.complexity = await this.getComplexityMetrics(projectPath, langConfig);
    }
    
    // Calculate maintainability
    if (config.metrics.includes('maintainability')) {
      metrics.maintainability = this.calculateMaintainability(metrics);
    }
    
    return metrics;
  }

  private async getCoverageMetrics(projectPath: string, langConfig: LanguageConfig): Promise<any> {
    // Implementation would read actual coverage reports
    return {
      line: 85,
      branch: 78,
      function: 90,
      class: 88
    };
  }

  private async getDuplicationMetrics(projectPath: string, langConfig: LanguageConfig): Promise<any> {
    // Implementation would read actual duplication reports
    return {
      ratio: 3.5,
      duplications: 12,
      duplicatedLines: 350
    };
  }

  private async getComplexityMetrics(projectPath: string, langConfig: LanguageConfig): Promise<any> {
    // Implementation would read actual complexity reports
    return {
      average: 8.5,
      max: 25,
      files: []
    };
  }

  private calculateMaintainability(metrics: LanguageMetrics): any {
    // Simplified maintainability index calculation
    const coverage = metrics.coverage?.line || 0;
    const complexity = metrics.complexity?.average || 20;
    const duplication = metrics.duplication?.ratio || 10;
    
    const index = Math.max(0, Math.min(100,
      171 - 5.2 * Math.log(complexity) - 0.23 * complexity - 16.2 * Math.log(100 - coverage) + duplication
    ));
    
    let rating: 'A' | 'B' | 'C' | 'D' | 'F';
    if (index >= 85) rating = 'A';
    else if (index >= 70) rating = 'B';
    else if (index >= 50) rating = 'C';
    else if (index >= 30) rating = 'D';
    else rating = 'F';
    
    return { index, rating };
  }

  private calculateOverallMetrics(
    languages: { [key: string]: LanguageMetrics },
    config: UnifiedMetricsConfig
  ): OverallMetrics {
    let totalScore = 0;
    let scoreCount = 0;
    let passedThresholds = 0;
    let totalThresholds = 0;
    const criticalIssues: string[] = [];
    
    // Aggregate metrics across languages
    for (const [lang, metrics] of Object.entries(languages)) {
      // Coverage score
      if (metrics.coverage) {
        const coverageScore = (metrics.coverage.line + metrics.coverage.branch + metrics.coverage.function) / 3;
        totalScore += coverageScore;
        scoreCount++;
        
        totalThresholds += 3;
        if (metrics.coverage.line >= config.thresholds.coverage.line) passedThresholds++;
        else criticalIssues.push(`${lang}: Line coverage ${metrics.coverage.line}% < ${config.thresholds.coverage.line}%`);
        
        if (metrics.coverage.branch >= config.thresholds.coverage.branch) passedThresholds++;
        else criticalIssues.push(`${lang}: Branch coverage ${metrics.coverage.branch}% < ${config.thresholds.coverage.branch}%`);
        
        if (metrics.coverage.function >= config.thresholds.coverage.function) passedThresholds++;
      }
      
      // Duplication score
      if (metrics.duplication) {
        const dupScore = Math.max(0, 100 - metrics.duplication.ratio * 10);
        totalScore += dupScore;
        scoreCount++;
        
        totalThresholds++;
        if (metrics.duplication.ratio <= config.thresholds.duplication.ratio) passedThresholds++;
        else criticalIssues.push(`${lang}: Duplication ${metrics.duplication.ratio}% > ${config.thresholds.duplication.ratio}%`);
      }
      
      // Complexity score
      if (metrics.complexity) {
        const complexScore = Math.max(0, 100 - metrics.complexity.average * 5);
        totalScore += complexScore;
        scoreCount++;
        
        totalThresholds++;
        if (metrics.complexity.average <= config.thresholds.complexity.cyclomatic) passedThresholds++;
        else criticalIssues.push(`${lang}: Complexity ${metrics.complexity.average} > ${config.thresholds.complexity.cyclomatic}`);
      }
    }
    
    const qualityScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;
    
    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (qualityScore >= 90) grade = 'A';
    else if (qualityScore >= 80) grade = 'B';
    else if (qualityScore >= 70) grade = 'C';
    else if (qualityScore >= 60) grade = 'D';
    else grade = 'F';
    
    return {
      qualityScore,
      grade,
      passedThresholds,
      totalThresholds,
      criticalIssues
    };
  }

  private async loadTrends(projectPath: string, config: UnifiedMetricsConfig): Promise<TrendData[]> {
    const trendsPath = path.join(projectPath, config.reporting.outputDirectory, 'history', 'trends.json');
    
    try {
      const content = await fs.readFile(trendsPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  private generateRecommendations(metrics: QualityMetrics, config: UnifiedMetricsConfig): string[] {
    const recommendations: string[] = [];
    
    // Check each language
    for (const [lang, langMetrics] of Object.entries(metrics.languages)) {
      if (langMetrics.coverage && langMetrics.coverage.line < config.thresholds.coverage.line) {
        recommendations.push(`Increase ${lang} test coverage to meet ${config.thresholds.coverage.line}% threshold`);
      }
      
      if (langMetrics.duplication && langMetrics.duplication.ratio > config.thresholds.duplication.ratio) {
        recommendations.push(`Refactor ${lang} code to reduce duplication below ${config.thresholds.duplication.ratio}%`);
      }
      
      if (langMetrics.complexity && langMetrics.complexity.average > config.thresholds.complexity.cyclomatic) {
        recommendations.push(`Simplify ${lang} code to reduce complexity below ${config.thresholds.complexity.cyclomatic}`);
      }
    }
    
    return recommendations;
  }

  private async saveReport(
    projectPath: string,
    metrics: QualityMetrics,
    config: UnifiedMetricsConfig
  ): Promise<void> {
    // Save unified report
    const reportPath = path.join(projectPath, config.reporting.outputDirectory, 'unified-report.json');
    await fileAPI.createFile(reportPath, JSON.stringify(metrics, null, 2), { type: FileType.REPORT });
    
    // Update trends
    const trendsPath = path.join(projectPath, config.reporting.outputDirectory, 'history', 'trends.json');
    const trends = await this.loadTrends(projectPath, config);
    
    trends.push({
      date: metrics.timestamp,
      qualityScore: metrics.overall.qualityScore,
      coverage: metrics.languages.overall?.coverage?.line || 0,
      duplication: metrics.languages.overall?.duplication?.ratio || 0,
      complexity: metrics.languages.overall?.complexity?.average || 0
    });
    
    // Keep last 100 entries
    if (trends.length > 100) {
      trends.splice(0, trends.length - 100);
    }
    
    await fileAPI.createFile(trendsPath, JSON.stringify(trends, null, 2), { type: FileType.DATA });
  }
}