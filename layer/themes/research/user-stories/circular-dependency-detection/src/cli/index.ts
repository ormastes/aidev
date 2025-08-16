import { fileAPI } from '../utils/file-api';
#!/usr/bin/env node

/**
 * Circular Dependency Detection CLI
 */

import { Command } from "commander";
import * as fs from 'fs-extra';
import { path } from '../../../../../infra_external-log-lib/src';
import * as yaml from 'yaml';
import chalk from 'chalk';
import ora from 'ora';

import { MultiLanguageAnalyzer } from './multi-language-analyzer';
import { ReportGenerator } from './report-generator';
import { ConfigurationManager } from './config-manager';
import { VisualizationGenerator } from './visualization-generator';
import { AnalysisOptions, ConfigurationFile } from '../core/types';

const program = new Command();

program
  .name('circle-deps')
  .description('Comprehensive circular dependency detection for TypeScript, C++, and Python')
  .version('1.0.0');

program
  .command('analyze')
  .description('Analyze a codebase for circular dependencies')
  .argument('<path>', 'Path to analyze')
  .option('-l, --languages <languages>', 'Comma-separated list of languages (typescript,cpp,python)', 'typescript,cpp,python')
  .option('-c, --config <config>', 'Configuration file path')
  .option('-o, --output <output>', 'Output directory', './circular-deps-report')
  .option('-f, --format <format>', 'Output format (json,text,html)', 'json')
  .option('--include <patterns>', 'Include patterns (comma-separated)')
  .option('--exclude <patterns>', 'Exclude patterns (comma-separated)')
  .option('--max-depth <depth>', 'Maximum analysis depth', parseInt)
  .option('--follow-external', 'Follow external dependencies')
  .option('--no-cache', 'Disable caching')
  .option('--visualization', 'Generate dependency graph visualization')
  .option('--fail-on-cycles', 'Exit with non-zero code if cycles are found')
  .action(async (targetPath, options) => {
    const spinner = ora('Initializing analysis...').start();

    try {
      // Load configuration
      const configManager = new ConfigurationManager();
      let config: ConfigurationFile | undefined;

      if (options.config) {
        config = await configManager.loadConfig(options.config);
      }

      // Build analysis options
      const analysisOptions: AnalysisOptions = {
        include_patterns: options.include?.split(',') || config?.global?.include_patterns,
        exclude_patterns: options.exclude?.split(',') || config?.global?.exclude_patterns,
        max_depth: options.maxDepth || config?.global?.max_depth,
        follow_external: options.followExternal || config?.global?.follow_external,
        cache_enabled: !options.noCache && (config?.global?.cache_enabled !== false),
        output_format: options.format,
        visualization: options.visualization ? {
          format: 'svg',
          highlight_cycles: true,
          max_nodes: 500
        } : undefined
      };

      // Parse languages
      const languages = options.languages.split(',').map((l: string) => l.trim().toLowerCase());

      // Initialize analyzer
      const analyzer = new MultiLanguageAnalyzer(config);
      
      spinner.text = 'Analyzing codebase...';

      // Run analysis
      const results = await analyzer.analyzeMultiLanguage(targetPath, languages, analysisOptions);

      spinner.succeed('Analysis completed');

      // Generate reports
      const reportGenerator = new ReportGenerator();
      await fs.ensureDir(options.output);

      // Generate main report
      const reportPath = path.join(options.output, `report.${options.format}`);
      await reportGenerator.generateReport(results, options.format, reportPath);

      console.log(chalk.green(`\n✓ Report saved to: ${reportPath}`));

      // Generate visualization if requested
      if (options.visualization) {
        spinner.start('Generating visualization...');
        
        const visualizationGenerator = new VisualizationGenerator();
        const vizPath = path.join(options.output, 'dependency-graph.svg');
        
        await visualizationGenerator.generateVisualization(results, vizPath);
        
        spinner.succeed(`Visualization saved to: ${vizPath}`);
      }

      // Print summary
      printSummary(results);

      // Handle exit code
      const totalCycles = results.reduce((sum, result) => sum + result.circular_dependencies.length, 0);
      
      if (options.failOnCycles && totalCycles > 0) {
        console.log(chalk.red(`\n❌ Found ${totalCycles} circular dependencies`));
        process.exit(1);
      }

    } catch (error) {
      spinner.fail('Analysis failed');
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize configuration file')
  .option('-f, --format <format>', 'Configuration format (json,yaml)', 'json')
  .action(async (options) => {
    const configManager = new ConfigurationManager();
    const configPath = `circular-deps.config.${options.format}`;
    
    try {
      await configManager.createDefaultConfig(configPath, options.format);
      console.log(chalk.green(`✓ Configuration file created: ${configPath}`));
    } catch (error) {
      console.error(chalk.red(`Error creating config: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

program
  .command('check')
  .description('Quick check for circular dependencies (CI-friendly)')
  .argument('<path>', 'Path to analyze')
  .option('-l, --languages <languages>', 'Languages to check', 'typescript,cpp,python')
  .option('-c, --config <config>', 'Configuration file path')
  .option('--max-cycles <count>', 'Maximum allowed cycles', parseInt, 0)
  .action(async (targetPath, options) => {
    try {
      const configManager = new ConfigurationManager();
      let config: ConfigurationFile | undefined;

      if (options.config) {
        config = await configManager.loadConfig(options.config);
      }

      const languages = options.languages.split(',').map((l: string) => l.trim().toLowerCase());
      const analyzer = new MultiLanguageAnalyzer(config);
      
      const results = await analyzer.analyzeMultiLanguage(targetPath, languages, {
        cache_enabled: true,
        output_format: 'json'
      });

      const totalCycles = results.reduce((sum, result) => sum + result.circular_dependencies.length, 0);

      if (totalCycles > options.maxCycles) {
        console.log(`FAIL: Found ${totalCycles} circular dependencies (max allowed: ${options.maxCycles})`);
        process.exit(1);
      } else {
        console.log(`PASS: Found ${totalCycles} circular dependencies (within limit: ${options.maxCycles})`);
      }

    } catch (error) {
      console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

program
  .command("visualize")
  .description('Generate dependency graph visualization')
  .argument('<path>', 'Path to analyze')
  .option('-l, --languages <languages>', 'Languages to include', 'typescript,cpp,python')
  .option('-o, --output <output>', 'Output file path', './dependency-graph.svg')
  .option('-f, --format <format>', 'Output format (svg,png,pdf)', 'svg')
  .option('--max-nodes <count>', 'Maximum nodes to display', parseInt, 500)
  .action(async (targetPath, options) => {
    const spinner = ora('Generating visualization...').start();

    try {
      const languages = options.languages.split(',').map((l: string) => l.trim().toLowerCase());
      const analyzer = new MultiLanguageAnalyzer();
      
      const results = await analyzer.analyzeMultiLanguage(targetPath, languages, {
        visualization: {
          format: options.format,
          highlight_cycles: true,
          max_nodes: options.maxNodes
        }
      });

      const visualizationGenerator = new VisualizationGenerator();
      await visualizationGenerator.generateVisualization(results, options.output);

      spinner.succeed(`Visualization saved to: ${options.output}`);

    } catch (error) {
      spinner.fail('Visualization generation failed');
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

function printSummary(results: any[]): void {
  console.log(chalk.blue('\n📊 Analysis Summary:'));
  console.log('═'.repeat(50));

  for (const result of results) {
    const statusIcon = result.success ? '✓' : '❌';
    const color = result.success ? chalk.green : chalk.red;
    
    console.log(color(`${statusIcon} ${result.language.toUpperCase()}`));
    console.log(`  Files: ${result.total_files}`);
    console.log(`  Dependencies: ${result.total_dependencies}`);
    console.log(`  Circular Dependencies: ${result.circular_dependencies.length}`);
    console.log(`  Analysis Time: ${result.analysis_time_ms}ms`);
    
    if (result.errors.length > 0) {
      console.log(chalk.red(`  Errors: ${result.errors.length}`));
    }
    
    if (result.warnings.length > 0) {
      console.log(chalk.yellow(`  Warnings: ${result.warnings.length}`));
    }
    
    console.log();
  }

  const totalCycles = results.reduce((sum, result) => sum + result.circular_dependencies.length, 0);
  const totalTime = results.reduce((sum, result) => sum + result.analysis_time_ms, 0);

  console.log('═'.repeat(50));
  console.log(chalk.bold(`Total Circular Dependencies: ${totalCycles}`));
  console.log(chalk.bold(`Total Analysis Time: ${totalTime}ms`));

  if (totalCycles > 0) {
    console.log(chalk.yellow('\n⚠️  Circular dependencies detected. Review the generated report for details.'));
  } else {
    console.log(chalk.green('\n🎉 No circular dependencies found!'));
  }
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

program.parse();