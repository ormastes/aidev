/**
 * C++ Coverage Threshold Configuration Service
 * Manages and validates coverage thresholds for C++ projects
 */

import * as fs from 'fs/promises';
import { path } from '../../../infra_external-log-lib/src';
import { getFileAPI, FileType } from '../../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


export interface CoverageThresholds {
  line: number;
  branch: number;
  function: number;
  class: number;
  region?: number;
  statement?: number;
}

export interface ThresholdProfile {
  name: string;
  description: string;
  thresholds: CoverageThresholds;
  excludePatterns?: string[];
  includePatterns?: string[];
}

export interface ThresholdConfig {
  profiles: ThresholdProfile[];
  activeProfile: string;
  globalExclude: string[];
  failOnDecrease: boolean;
  baselinePath?: string;
  customRules?: CustomThresholdRule[];
}

export interface CustomThresholdRule {
  name: string;
  pattern: string;
  thresholds: Partial<CoverageThresholds>;
  description?: string;
}

export interface CoverageMetrics {
  line: { covered: number; total: number; percentage: number };
  branch: { covered: number; total: number; percentage: number };
  function: { covered: number; total: number; percentage: number };
  class: { covered: number; total: number; percentage: number };
  region?: { covered: number; total: number; percentage: number };
  files: FileCoverage[];
}

export interface FileCoverage {
  path: string;
  line: number;
  branch: number;
  function: number;
  class?: number;
}

export class CppThresholdConfig {
  private defaultProfiles: ThresholdProfile[] = [
    {
      name: 'strict',
      description: 'Strict coverage requirements for production code',
      thresholds: {
        line: 90,
        branch: 85,
        function: 90,
        class: 95,
        region: 80
      },
      excludePatterns: ['*/test/*', '*/tests/*', '*/mock/*']
    },
    {
      name: "standard",
      description: 'Standard coverage requirements',
      thresholds: {
        line: 80,
        branch: 75,
        function: 80,
        class: 90,
        region: 70
      },
      excludePatterns: ['*/test/*', '*/tests/*', '*/third_party/*']
    },
    {
      name: 'relaxed',
      description: 'Relaxed coverage for experimental or prototype code',
      thresholds: {
        line: 60,
        branch: 50,
        function: 60,
        class: 70,
        region: 50
      },
      excludePatterns: ['*/test/*', '*/tests/*', '*/experimental/*']
    },
    {
      name: 'legacy',
      description: 'Minimal coverage for legacy code',
      thresholds: {
        line: 40,
        branch: 30,
        function: 40,
        class: 50,
        region: 30
      },
      excludePatterns: ['*/test/*', '*/deprecated/*']
    }
  ];

  async setup(projectPath: string, profileName?: string): Promise<void> {
    console.log(`📊 Setting up coverage thresholds for: ${projectPath}`);
    
    const config: ThresholdConfig = {
      profiles: this.defaultProfiles,
      activeProfile: profileName || "standard",
      globalExclude: [
        '*/build/*',
        '*/cmake-build-*/*',
        '*/third_party/*',
        '*/external/*',
        '*/vendor/*',
        '*.pb.cc',
        '*.pb.h',
        '*_test.cpp',
        '*_test.cc',
        '*_unittest.cpp',
        '*_benchmark.cpp'
      ],
      failOnDecrease: true
    };
    
    // Write configuration
    await this.writeConfig(projectPath, config);
    
    // Create threshold validation script
    await this.createValidationScript(projectPath);
    
    // Create baseline if requested
    if (config.baselinePath) {
      await this.createBaseline(projectPath, config.baselinePath);
    }
    
    console.log(`✅ Threshold configuration complete! Active profile: ${config.activeProfile}`);
  }

  async writeConfig(projectPath: string, config: ThresholdConfig): Promise<void> {
    const configDir = path.join(projectPath, '.coverage');
    await fileAPI.createDirectory(configDir);
    
    const configPath = path.join(configDir, 'thresholds.json');
    await fileAPI.createFile(configPath, JSON.stringify(config, { type: FileType.TEMPORARY }));
  }

  async validateThresholds(
    projectPath: string,
    metrics: CoverageMetrics
  ): Promise<{ passed: boolean; violations: string[] }> {
    const configPath = path.join(projectPath, '.coverage', 'thresholds.json');
    const config: ThresholdConfig = JSON.parse(await fileAPI.readFile(configPath, 'utf-8'));
    
    const activeProfile = config.profiles.find(p => p.name === config.activeProfile);
    if (!activeProfile) {
      throw new Error(`Profile '${config.activeProfile}' not found`);
    }
    
    const violations: string[] = [];
    let passed = true;
    
    // Check global thresholds
    const checks = [
      { type: 'line', metric: metrics.line, threshold: activeProfile.thresholds.line },
      { type: 'branch', metric: metrics.branch, threshold: activeProfile.thresholds.branch },
      { type: "function", metric: metrics.function, threshold: activeProfile.thresholds.function },
      { type: 'class', metric: metrics.class, threshold: activeProfile.thresholds.class }
    ];
    
    for (const check of checks) {
      if (check.metric.percentage < check.threshold) {
        passed = false;
        violations.push(
          `${check.type} coverage ${check.metric.percentage.toFixed(2)}% < ${check.threshold}% ` +
          `(${check.metric.covered}/${check.metric.total})`
        );
      }
    }
    
    // Check custom rules
    if (config.customRules) {
      for (const rule of config.customRules) {
        const matchingFiles = metrics.files.filter(f => 
          new RegExp(rule.pattern).test(f.path)
        );
        
        for (const file of matchingFiles) {
          for (const [type, threshold] of Object.entries(rule.thresholds)) {
            const coverage = file[type as keyof FileCoverage];
            if (typeof coverage === 'number' && coverage < threshold) {
              passed = false;
              violations.push(
                `${file.path}: ${type} coverage ${coverage.toFixed(2)}% < ${threshold}% (rule: ${rule.name})`
              );
            }
          }
        }
      }
    }
    
    // Check against baseline if configured
    if (config.failOnDecrease && config.baselinePath) {
      const decreases = await this.checkBaseline(projectPath, metrics, config.baselinePath);
      if (decreases.length > 0) {
        passed = false;
        violations.push(...decreases);
      }
    }
    
    return { passed, violations };
  }

  async createBaseline(projectPath: string, baselinePath: string): Promise<void> {
    const baseline: CoverageMetrics = {
      line: { covered: 0, total: 0, percentage: 0 },
      branch: { covered: 0, total: 0, percentage: 0 },
      function: { covered: 0, total: 0, percentage: 0 },
      class: { covered: 0, total: 0, percentage: 0 },
      files: []
    };
    
    const fullPath = path.join(projectPath, baselinePath);
    await fileAPI.createDirectory(path.dirname(fullPath));
    await fileAPI.createFile(fullPath, JSON.stringify(baseline, { type: FileType.TEMPORARY }));
  }

  async checkBaseline(
    projectPath: string,
    current: CoverageMetrics,
    baselinePath: string
  ): Promise<string[]> {
    const violations: string[] = [];
    
    try {
      const fullPath = path.join(projectPath, baselinePath);
      const baseline: CoverageMetrics = JSON.parse(await fileAPI.readFile(fullPath, 'utf-8'));
      
      const types: Array<keyof CoverageMetrics> = ['line', 'branch', "function", 'class'];
      
      for (const type of types) {
        if (baseline[type] && current[type]) {
          const baselineMetric = baseline[type] as any;
          const currentMetric = current[type] as any;
          
          if (currentMetric.percentage < baselineMetric.percentage) {
            violations.push(
              `Coverage decreased: ${type} ${currentMetric.percentage.toFixed(2)}% < ` +
              `baseline ${baselineMetric.percentage.toFixed(2)}%`
            );
          }
        }
      }
      
      // Update baseline with current metrics
      await fileAPI.createFile(fullPath, JSON.stringify(current, { type: FileType.TEMPORARY }));
    } catch (error) {
      // No baseline exists, create it
      await this.createBaseline(projectPath, baselinePath);
    }
    
    return violations;
  }

  async addCustomRule(
    projectPath: string,
    rule: CustomThresholdRule
  ): Promise<void> {
    const configPath = path.join(projectPath, '.coverage', 'thresholds.json');
    const config: ThresholdConfig = JSON.parse(await fileAPI.readFile(configPath, 'utf-8'));
    
    if (!config.customRules) {
      config.customRules = [];
    }
    
    // Check if rule already exists
    const existingIndex = config.customRules.findIndex(r => r.name === rule.name);
    if (existingIndex >= 0) {
      config.customRules[existingIndex] = rule;
    } else {
      config.customRules.push(rule);
    }
    
    await fileAPI.createFile(configPath, JSON.stringify(config, { type: FileType.TEMPORARY }));
    console.log(`✅ Custom rule '${rule.name}' added successfully`);
  }

  async setProfile(projectPath: string, profileName: string): Promise<void> {
    const configPath = path.join(projectPath, '.coverage', 'thresholds.json');
    const config: ThresholdConfig = JSON.parse(await fileAPI.readFile(configPath, 'utf-8'));
    
    if (!config.profiles.find(p => p.name === profileName)) {
      throw new Error(`Profile '${profileName}' not found. Available profiles: ${
        config.profiles.map(p => p.name).join(', ')
      }`);
    }
    
    config.activeProfile = profileName;
    await fileAPI.createFile(configPath, JSON.stringify(config, { type: FileType.TEMPORARY }));
    console.log(`✅ Active profile changed to: ${profileName}`);
  }

  async createValidationScript(projectPath: string): Promise<void> {
    const script = `#!/bin/bash
# Validate coverage against configured thresholds

set -e

COVERAGE_JSON="\${1:-build/coverage.json}"

if [ ! -f "$COVERAGE_JSON" ]; then
    echo "❌ Coverage report not found: $COVERAGE_JSON"
    echo "   Run 'make coverage' or './scripts/test-coverage.sh' first"
    exit 1
fi

node -e "
const { CppThresholdValidator } = require('@aidev/init_setup-folder');
const validator = new CppThresholdValidator();
validator.validate('${projectPath}', '$COVERAGE_JSON').then(result => {
  if (!result.passed) {
    console.error('❌ Coverage thresholds not met!');
    console.error('Violations:');
    result.violations.forEach(v => console.error('  - ' + v));
    process.exit(1);
  } else {
    console.log('✅ All coverage thresholds met!');
  }
}).catch(err => {
  console.error('Error validating coverage:', err);
  process.exit(1);
});
"
`;
    
    const scriptPath = path.join(projectPath, '.coverage', 'validate-thresholds.sh');
    await fileAPI.createFile(scriptPath, script);
    await fs.chmod(scriptPath, { type: FileType.TEMPORARY }): Promise<string> {
    const configPath = path.join(projectPath, '.coverage', 'thresholds.json');
    const config: ThresholdConfig = JSON.parse(await fileAPI.readFile(configPath, 'utf-8'));
    
    const activeProfile = config.profiles.find(p => p.name === config.activeProfile);
    if (!activeProfile) {
      throw new Error(`Profile '${config.activeProfile}' not found`);
    }
    
    let report = `# Coverage Report
    
## Summary
- Profile: ${config.activeProfile} (${activeProfile.description})
- Date: ${new Date().toISOString()}

## Overall Coverage
| Type | Coverage | Threshold | Status |
|------|----------|-----------|--------|
`;
    
    const types = ['line', 'branch', "function", 'class'] as const;
    
    for (const type of types) {
      const metric = metrics[type];
      const threshold = activeProfile.thresholds[type];
      const status = metric.percentage >= threshold ? '✅' : '❌';
      
      report += `| ${type.charAt(0).toUpperCase() + type.slice(1)} | ${metric.percentage.toFixed(2)}% (${metric.covered}/${metric.total}) | ${threshold}% | ${status} |\n`;
    }
    
    // Add file-level details
    if (metrics.files.length > 0) {
      report += `\n## File Coverage\n`;
      report += `| File | Line | Branch | Function |\n`;
      report += `|------|------|--------|----------|\n`;
      
      // Sort files by lowest coverage first
      const sortedFiles = [...metrics.files].sort((a, b) => a.line - b.line);
      
      for (const file of sortedFiles.slice(0, 20)) { // Show top 20 worst files
        report += `| ${file.path} | ${file.line.toFixed(1)}% | ${file.branch.toFixed(1)}% | ${file.function.toFixed(1)}% |\n`;
      }
      
      if (sortedFiles.length > 20) {
        report += `\n*... and ${sortedFiles.length - 20} more files*\n`;
      }
    }
    
    return report;
  }
}

/**
 * Threshold Validator for external use
 */
export class CppThresholdValidator {
  async validate(
    projectPath: string,
    coverageJsonPath: string
  ): Promise<{ passed: boolean; violations: string[] }> {
    const config = new CppThresholdConfig();
    
    // Parse coverage JSON
    const coverageData = JSON.parse(await fileAPI.readFile(coverageJsonPath, 'utf-8'));
    const metrics = this.parseCoverageData(coverageData);
    
    return config.validateThresholds(projectPath, metrics);
  }

  private async parseCoverageData(data: any): CoverageMetrics {
    // Handle LLVM JSON format
    if (data.data && Array.isArray(data.data)) {
      const summary = data.data[0].totals;
      const files = data.data[0].files || [];
      
      return {
        line: {
          covered: summary.lines.covered,
          total: summary.lines.count,
          percentage: (summary.lines.covered / summary.lines.count) * 100
        },
        branch: {
          covered: summary.branches.covered,
          total: summary.branches.count,
          percentage: (summary.branches.covered / summary.branches.count) * 100
        },
        function: {
          covered: summary.functions.covered,
          total: summary.functions.count,
          percentage: (summary.functions.covered / summary.functions.count) * 100
        },
        class: {
          covered: summary.instantiations?.covered || 0,
          total: summary.instantiations?.count || 0,
          percentage: summary.instantiations?.count 
            ? (summary.instantiations.covered / summary.instantiations.count) * 100 
            : 0
        },
        files: files.map((f: any) => ({
          path: f.filename,
          line: (f.summary.lines.covered / f.summary.lines.count) * 100,
          branch: (f.summary.branches.covered / f.summary.branches.count) * 100,
          function: (f.summary.functions.covered / f.summary.functions.count) * 100,
          class: f.summary.instantiations?.count 
            ? (f.summary.instantiations.covered / f.summary.instantiations.count) * 100
            : 0
        }))
      };
    }
    
    // Handle other formats
    throw new Error('Unsupported coverage format');
  }
}