#!/usr/bin/env node

/**
 * Test As Manual CLI
 * Command-line interface for converting tests to manual documentation
 */

import { TestAsManualConverter, ConversionOptions } from '../src/converter';
import { path } from '../../../../infra_external-log-lib/src';
import { fs } from '../../../../infra_external-log-lib/src';

// Parse command line arguments
const args = process.argv.slice(2);

function showHelp() {
  console.log(`
Test As Manual Converter - Convert automated tests to manual test documentation

Usage:
  test-as-manual <input> <output> [options]

Arguments:
  input   Path to test file or directory
  output  Path to output directory

Options:
  --format <type>        Output format: markdown, html, json (default: markdown)
  --captures             Enable screenshot captures
  --platform <type>      Capture platform: ios, android, web, desktop
  --device <id>          Device ID for mobile captures
  --browser <name>       Browser name for web captures
  --threshold <n>        Common scenario threshold (0-1, default: 0.5)
  --min-sequence <n>     Minimum sequence length (default: 2)
  --validate             Validate BDD files only
  --help                 Show this help message

Examples:
  # Convert a single BDD feature file
  test-as-manual features/login.feature output/

  # Convert all tests in a directory
  test-as-manual src/tests/ docs/manual-tests/ --format html

  # Convert with screenshot captures
  test-as-manual features/ output/ --captures --platform web --browser chrome

  # Validate BDD files
  test-as-manual features/ --validate
`);
}

async function main() {
  // Check for help flag
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  // Parse arguments
  const input = args[0];
  const output = args[1];
  
  // Check for validate mode
  if (args.includes('--validate')) {
    const converter = new TestAsManualConverter();
    try {
      await converter.validate(input);
      process.exit(0);
    } catch (error) {
      console.error('Validation failed:', error);
      process.exit(1);
    }
  }

  // Require output for conversion
  if (!output) {
    console.error('Error: Output path is required');
    showHelp();
    process.exit(1);
  }

  // Parse options
  const options: ConversionOptions = {
    inputPath: input,
    outputPath: output,
    format: 'markdown'
  };

  // Parse format
  const formatIndex = args.indexOf('--format');
  if (formatIndex !== -1 && args[formatIndex + 1]) {
    const format = args[formatIndex + 1];
    if (['markdown', 'html', 'json'].includes(format)) {
      options.format = format as 'markdown' | 'html' | 'json';
    }
  }

  // Parse captures
  if (args.includes('--captures')) {
    options.enableCaptures = true;
    options.captureOptions = {
      platform: 'web' // default
    };

    // Parse platform
    const platformIndex = args.indexOf('--platform');
    if (platformIndex !== -1 && args[platformIndex + 1]) {
      const platform = args[platformIndex + 1];
      if (['ios', 'android', 'web', 'desktop'].includes(platform)) {
        options.captureOptions.platform = platform as any;
      }
    }

    // Parse device
    const deviceIndex = args.indexOf('--device');
    if (deviceIndex !== -1 && args[deviceIndex + 1]) {
      options.captureOptions.deviceId = args[deviceIndex + 1];
    }

    // Parse browser
    const browserIndex = args.indexOf('--browser');
    if (browserIndex !== -1 && args[browserIndex + 1]) {
      options.captureOptions.browserName = args[browserIndex + 1];
    }
  }

  // Parse threshold
  const thresholdIndex = args.indexOf('--threshold');
  if (thresholdIndex !== -1 && args[thresholdIndex + 1]) {
    const threshold = parseFloat(args[thresholdIndex + 1]);
    if (!isNaN(threshold) && threshold >= 0 && threshold <= 1) {
      options.commonScenarioThreshold = threshold;
    }
  }

  // Parse min sequence
  const minSeqIndex = args.indexOf('--min-sequence');
  if (minSeqIndex !== -1 && args[minSeqIndex + 1]) {
    const minSeq = parseInt(args[minSeqIndex + 1]);
    if (!isNaN(minSeq) && minSeq >= 2) {
      options.minSequenceLength = minSeq;
    }
  }

  // Create converter
  const converter = new TestAsManualConverter({
    enableCaptures: options.enableCaptures,
    captureDir: options.outputPath ? path.join(options.outputPath, 'captures') : undefined
  });

  try {
    // Check if input exists
    if (!fs.existsSync(input)) {
      throw new Error(`Input path does not exist: ${input}`);
    }

    // Run conversion
    console.log('Starting conversion...\n');
    await converter.convert(options);
    console.log('\n✓ Conversion completed successfully!');
    
  } catch (error) {
    console.error('\n✗ Conversion failed:');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run CLI
main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});