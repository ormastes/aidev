#!/usr/bin/env ts-node

import { FraudChecker } from '../children/FraudChecker';
import { FraudPatternDetector } from '../children/FraudPatternDetector';
import { TestAnalyzer } from '../children/TestAnalyzer';
import { FraudReportGenerator } from '../children/FraudReportGenerator';
import { path } from '../../infra_external-log-lib/src';
import * as fs from 'fs/promises';
import { getFileAPI, FileType } from '../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();

interface CheckOptions {
  directory: string;
  pattern?: string;
  output?: string;
  format?: 'json' | 'html' | 'markdown' | 'all';
  verbose?: boolean;
}

async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  console.log('🔍 Starting Fraud Detection Check...\n');

  try {
    // Initialize components
    const fraudChecker = new FraudChecker(options.directory);
    const patternDetector = new FraudPatternDetector();
    // const testAnalyzer = new TestAnalyzer();
    const reportGenerator = new FraudReportGenerator(options.directory);

    // Set up logging if verbose
    if (options.verbose) {
      fraudChecker.onLog((entry) => {
        console.log(`[${entry.level}] ${entry.message}`);
      });
    }

    // Run fraud check
    const testPattern = new RegExp(options.pattern || '\\.(test|spec)\\.(ts|js)$');
    const fraudResult = await fraudChecker.checkDirectory(options.directory, testPattern);

    // Analyze test patterns for additional insights
    const testFiles = await findTestFiles(options.directory, testPattern);
    let totalPatternIssues = 0;

    for (const file of testFiles) {
      const content = await fs.readFile(file, 'utf8');
      const analysis = patternDetector.analyzeTestQuality(content);
      
      if (analysis.issues.length > 0 && options.verbose) {
        console.log(`\n📄 ${path.relative(options.directory, file)}:`);
        analysis.issues.forEach(issue => console.log(`  - ${issue}`));
      }
      
      totalPatternIssues += analysis.issues.length;
    }

    // Generate report
    const report = await reportGenerator.generateReport(fraudResult);

    // Display summary
    console.log('\n📊 Summary:');
    console.log(`  Score: ${report.summary.overallScore}/100`);
    console.log(`  Status: ${report.summary.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  Files Checked: ${fraudResult.metrics.filesChecked}`);
    console.log(`  Total Violations: ${report.summary.totalViolations}`);
    console.log(`  Critical Issues: ${report.summary.criticalViolations}`);
    console.log(`\n  ${report.summary.recommendation}`);

    // Save report if output specified
    if (options.output) {
      const outputPath = path.resolve(options.output);
      
      if (options.format === 'all' || options.format === 'json') {
        await reportGenerator.saveReport(report, outputPath);
        console.log(`\n📄 JSON report saved to: ${outputPath}`);
      }
      
      if (options.format === 'all' || options.format === 'html') {
        const htmlPath = outputPath.replace('.json', '.html');
        console.log(`📄 HTML report saved to: ${htmlPath}`);
      }
      
      if (options.format === 'all' || options.format === 'markdown') {
        const mdPath = outputPath.replace('.json', '.md');
        const markdown = reportGenerator.generateMarkdownReport(report);
        await fileAPI.createFile(mdPath, markdown, {
          type: FileType.REPORT
        });
        console.log(`📄 Markdown report saved to: ${mdPath}`);
      }
    }

    // Display metrics
    if (options.verbose) {
      console.log('\n📈 Metrics:');
      const fsMetrics = fraudChecker.getFileSystemMetrics();
      const parserMetrics = fraudChecker.getParserMetrics();
      
      console.log(`  File System:`);
      console.log(`    - Files Read: ${fsMetrics.readCount}`);
      console.log(`    - Bytes Read: ${fsMetrics.totalBytesRead}`);
      console.log(`    - Errors: ${fsMetrics.errors.length}`);
      
      console.log(`  Parser:`);
      console.log(`    - Files Parsed: ${parserMetrics.filesAnalyzed}`);
      console.log(`    - Parse Time: ${parserMetrics.parseTime}ms`);
      console.log(`    - Errors: ${parserMetrics.errors.length}`);
    }

    // Exit with appropriate code
    process.exit(report.summary.passed ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Error:', (error as Error).message);
    process.exit(2);
  }
}

function parseArgs(args: string[]): CheckOptions {
  const options: CheckOptions = {
    directory: process.cwd(),
    format: 'all'
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '-d':
      case '--directory':
        options.directory = path.resolve(args[++i]);
        break;
      case '-p':
      case '--pattern':
        options.pattern = args[++i];
        break;
      case '-o':
      case '--output':
        options.output = args[++i];
        break;
      case '-f':
      case '--format':
        options.format = args[++i] as any;
        break;
      case '-v':
      case '--verbose':
        options.verbose = true;
        break;
      case '-h':
      case '--help':
        printHelp();
        process.exit(0);
      default:
        if (!args[i].startsWith('-')) {
          options.directory = path.resolve(args[i]);
        }
    }
  }

  return options;
}

async function findTestFiles(dir: string, pattern: RegExp): Promise<string[]> {
  const files: string[] = [];
  
  async function walk(currentDir: string) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        await walk(fullPath);
      } else if (entry.isFile() && pattern.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  
  await walk(dir);
  return files;
}

function printHelp() {
  console.log(`
Test Fraud Detection Checker

Usage: check-fraud [options] [directory]

Options:
  -d, --directory <path>   Directory to check (default: current directory)
  -p, --pattern <regex>    File pattern to match (default: \\.test|spec\\.(ts|js))
  -o, --output <path>      Output file path for report
  -f, --format <type>      Report format: json, html, markdown, all (default: all)
  -v, --verbose           Show detailed logging
  -h, --help              Show this help message

Examples:
  check-fraud                                    # Check current directory
  check-fraud src/tests                          # Check specific directory
  check-fraud -o report.json                     # Save report to file
  check-fraud -p "\\.spec\\.ts$" -v              # Custom pattern with verbose output
  check-fraud -d src -o fraud-report.json -f all # Full report in all formats
`);
}

// Run the script
main().catch(console.error);