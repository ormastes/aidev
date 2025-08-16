#!/usr/bin/env node

/**
 * CLI Tool for Web Scraper
 * Interactive command-line interface for web scraping with URL validation,
 * selector builder, preview mode, and comprehensive export options
 */

import { Command } from 'commander';
import * as readline from 'readline';
import * as fs from 'fs/promises';
import { path } from '../../infra_external-log-lib/src';
import chalk from 'chalk';
import WebScraper, { ScrapingOptions, ScrapingResult, ExtractionSchema } from './web-scraper';
import { ExportConfig } from '../children/exporter';

const program = new Command();
const scraper = new WebScraper();

// Version and description
program
  .name('webscraper')
  .description('AI Development Platform Web Scraper CLI')
  .version('1.0.0');

// Global options
program
  .option('-v, --verbose', 'enable verbose output')
  .option('-q, --quiet', 'suppress non-error output')
  .option('--config <file>', 'load configuration from file')
  .option('--cache-dir <dir>', 'cache directory', './cache')
  .option('--output-dir <dir>', 'output directory', './output');

// Single URL scraping command
program
  .command('scrape <url>')
  .description('scrape a single URL')
  .option('-s, --schema <name>', 'extraction schema to use')
  .option('-o, --output <file>', 'output file path')
  .option('-f, --format <format>', 'output format (json, csv, xml)', 'json')
  .option('--selector <selector>', 'custom CSS selector')
  .option('--xpath <xpath>', 'custom XPath selector')
  .option('--browser', 'use browser rendering (Puppeteer/Playwright)')
  .option('--headless <bool>', 'run browser in headless mode', true)
  .option('--wait <ms>', 'wait time before scraping (ms)', '0')
  .option('--wait-selector <selector>', 'wait for selector before scraping')
  .option('--screenshot', 'take screenshot')
  .option('--user-agent <ua>', 'custom user agent')
  .option('--proxy <proxy>', 'proxy server (http://host:port)')
  .option('--rate-limit <rps>', 'requests per second', '1')
  .option('--no-cache', 'disable caching')
  .option('--preview', 'preview extracted data without saving')
  .action(async (url: string, options: any) => {
    try {
      console.log(chalk.blue(`🌐 Scraping: ${url}`));
      
      const scrapingOptions = await buildScrapingOptions(options);
      const result = await scraper.scrape(url, scrapingOptions);
      
      if(options.preview) {
        async displayPreview(result);
      } else {
        await saveResult(result, options.output, options.format);
        console.log(chalk.green(`✅ Data saved to: ${options.output || getDefaultOutputPath(url, options.format)}`));
      }
      
      async displayStats(result);
      
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

// Batch scraping command
program
  .command('batch <file>')
  .description('scrape multiple URLs from file')
  .option('-s, --schema <name>', 'extraction schema to use')
  .option('-o, --output-dir <dir>', 'output directory')
  .option('-f, --format <format>', 'output format (json, csv, xml)', 'json')
  .option('--browser', 'use browser rendering')
  .option('--concurrency <num>', 'number of concurrent requests', '3')
  .option('--rate-limit <rps>', 'requests per second', '1')
  .option('--delay <ms>', 'delay between requests (ms)', '1000')
  .option('--retry <count>', 'retry count for failed requests', '3')
  .option('--no-cache', 'disable caching')
  .action(async (file: string, options: any) => {
    try {
      const urls = await loadUrlsFromFile(file);
      console.log(chalk.blue(`📋 Loaded ${urls.length} URLs from ${file}`));
      
      scraper.setConcurrency(parseInt(options.concurrency));
      
      const scrapingOptions = await buildScrapingOptions(options);
      
      // Set up progress monitoring
      async setupProgressMonitoring(scraper);
      
      const results = await scraper.scrapeBatch(urls, scrapingOptions);
      
      // Save all results
      const outputDir = options.outputDir || './batch-output';
      await saveBatchResults(results, outputDir, options.format);
      
      console.log(chalk.green(`✅ Batch scraping completed. ${results.length} results saved to ${outputDir}`));
      async displayBatchStats(results);
      
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

// Interactive mode
program
  .command('interactive')
  .alias('i')
  .description('start interactive scraping session')
  .action(async () => {
    console.log(chalk.cyan('🚀 Starting interactive web scraping session...'));
    await startInteractiveMode();
  });

// Schema management commands
const schemaCmd = program
  .command('schema')
  .description('manage extraction schemas');

schemaCmd
  .command('list')
  .description('list available schemas')
  .action(() => {
    const schemas = scraper['extractor'].listSchemas();
    console.log(chalk.blue('Available schemas:'));
    schemas.forEach(schema => console.log(`  - ${schema}`));
  });

schemaCmd
  .command('create <name>')
  .description('create a new schema interactively')
  .action(async (name: string) => {
    await createSchemaInteractively(name);
  });

schemaCmd
  .command('import <file>')
  .description('import schema from JSON file')
  .action(async (file: string) => {
    try {
      const schemaData = await fs.readFile(file, 'utf-8');
      const schema: ExtractionSchema = JSON.parse(schemaData);
      scraper.addSchema(schema);
      console.log(chalk.green(`✅ Schema "${schema.name}" imported successfully`));
    } catch (error) {
      console.error(chalk.red(`❌ Error importing schema: ${error}`));
    }
  });

// Utility commands
program
  .command('validate <url>')
  .description('validate URL accessibility')
  .action(async (url: string) => {
    try {
      console.log(chalk.blue(`🔍 Validating: ${url}`));
      
      const result = await scraper['fetcher'].head(url);
      
      console.log(chalk.green(`✅ URL is accessible`));
      console.log(`Status: ${result.status} ${result.statusText}`);
      console.log(`Content-Type: ${result.headers['content-type'] || 'N/A'}`);
      console.log(`Content-Length: ${result.headers['content-length'] || 'N/A'}`);
      
    } catch (error) {
      console.error(chalk.red(`❌ URL validation failed: ${error}`));
    }
  });

program
  .command('test-selector <url> <selector>')
  .description('test CSS selector on URL')
  .option('--xpath', 'treat selector as XPath')
  .action(async (url: string, selector: string, options: any) => {
    try {
      console.log(chalk.blue(`🧪 Testing selector "${selector}" on ${url}`));
      
      const scrapingOptions: ScrapingOptions = {
        extractionOptions: {
          customSelectors: { test: selector }
        }
      };
      
      const result = await scraper.scrape(url, scrapingOptions);
      
      if(result.data.test && result.data.test.length > 0) {
        console.log(chalk.green(`✅ Selector matched ${result.data.test.length} elements:`));
        result.data.test.forEach((text: string, index: number) => {
          console.log(`  ${index + 1}: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
        });
      } else {
        console.log(chalk.yellow(`⚠️ Selector did not match any elements`));
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Error testing selector: ${error}`));
    }
  });

program
  .command('stats')
  .description('show scraping statistics')
  .action(() => {
    const stats = scraper.getStats();
    async displayScrapingStats(stats);
  });

program
  .command('clear-cache')
  .description('clear scraping cache')
  .action(() => {
    scraper.clearCache();
    console.log(chalk.green('✅ Cache cleared successfully'));
  });

// Export command
program
  .command('export <input> <output>')
  .description('export scraped data to different format')
  .option('-f, --from <format>', 'input format (json, csv)', 'json')
  .option('-t, --to <format>', 'output format (json, csv, xml, mongodb, postgresql)', 'json')
  .option('--db-config <config>', 'database configuration (JSON string)')
  .action(async (input: string, output: string, options: any) => {
    try {
      console.log(chalk.blue(`📤 Exporting from ${input} to ${output}`));
      
      // Load data
      const data = await loadDataFromFile(input, options.from);
      
      // Configure export
      const exportConfig: ExportConfig = {
        format: options.to as any,
        destination: output,
        options: options.dbConfig ? JSON.parse(options.dbConfig) : undefined
      };
      
      const exporter = scraper['exporter'];
      const result = await exporter.export(data, exportConfig);
      
      if(result.success) {
        console.log(chalk.green(`✅ Export completed: ${result.recordCount} records`));
      } else {
        console.error(chalk.red(`❌ Export failed: ${result.errors?.join(', ')}`));
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Export error: ${error}`));
    }
  });

// Helper functions

async function buildScrapingOptions(options: any): Promise<ScrapingOptions> {
  const scrapingOptions: ScrapingOptions = {
    fetchOptions: {},
    extractionOptions: {},
    cacheOptions: { enabled: !options.noCache },
    browserOptions: options.browser ? {
      engine: 'puppeteer',
      headless: options.headless !== false
    } : undefined,
    parseOptions: {}
  };

  // Configure fetch options
  if(options.userAgent) {
    scrapingOptions.fetchOptions!.userAgent = options.userAgent;
  }
  
  if(options.proxy) {
    const proxyUrl = new URL(options.proxy);
    scrapingOptions.fetchOptions!.proxy = {
      host: proxyUrl.hostname,
      port: parseInt(proxyUrl.port),
      protocol: proxyUrl.protocol.slice(0, -1) as any,
      username: proxyUrl.username || undefined,
      password: proxyUrl.password || undefined
    };
  }

  // Configure extraction options
  if(options.selector) {
    scrapingOptions.extractionOptions!.customSelectors = { main: options.selector };
  }
  
  if(options.schema) {
    scrapingOptions.schema = options.schema;
  }

  // Configure parse options
  if(options.wait) {
    scrapingOptions.parseOptions!.waitTime = parseInt(options.wait);
  }
  
  if(options.waitSelector) {
    scrapingOptions.parseOptions!.waitForSelector = options.waitSelector;
  }
  
  if(options.screenshot) {
    scrapingOptions.parseOptions!.screenshots = true;
    scrapingOptions.parseOptions!.screenshotPath = `screenshot_${Date.now()}.png`;
  }

  return scrapingOptions;
}

async function displayPreview(result: ScrapingResult): void {
  console.log(chalk.cyan('\n📊 Preview of extracted data:'));
  console.log(chalk.gray('─'.repeat(50)));
  
  console.log(JSON.stringify(result.data, null, 2));
  
  if(result.metadata.structuredData && result.metadata.structuredData.length > 0) {
    console.log(chalk.cyan('\n🏗️ Structured data found:'));
    console.log(JSON.stringify(result.metadata.structuredData, null, 2));
  }
  
  console.log(chalk.gray('─'.repeat(50)));
}

async function displayStats(result: ScrapingResult): void {
  console.log(chalk.cyan('\n📈 Scraping statistics:'));
  console.log(`Duration: ${result.metadata.duration}ms`);
  console.log(`Status: ${result.metadata.fetchResult.status}`);
  console.log(`Data extracted: ${Object.keys(result.data).length} fields`);
  
  if(result.metadata.structuredData) {
    console.log(`Structured data: ${result.metadata.structuredData.length} items`);
  }
}

async function displayBatchStats(results: ScrapingResult[]): void {
  const successful = results.length;
  const totalDuration = results.reduce((sum, r) => sum + r.metadata.duration, 0);
  const avgDuration = totalDuration / successful;
  
  console.log(chalk.cyan('\n📊 Batch statistics:'));
  console.log(`Total URLs: ${successful}`);
  console.log(`Average duration: ${Math.round(avgDuration)}ms`);
  console.log(`Total duration: ${Math.round(totalDuration)}ms`);
}

async function displayScrapingStats(stats: any): void {
  console.log(chalk.cyan('\n📈 Overall statistics:'));
  console.log(`Total requests: ${stats.totalRequests}`);
  console.log(`Successful: ${stats.successfulRequests}`);
  console.log(`Failed: ${stats.failedRequests}`);
  console.log(`Cache hits: ${stats.cacheHits}`);
  console.log(`Cache misses: ${stats.cacheMisses}`);
  console.log(`Average response time: ${Math.round(stats.averageResponseTime)}ms`);
}

async function saveResult(result: ScrapingResult, outputPath?: string, format: string = 'json'): Promise<void> {
  const filePath = outputPath || getDefaultOutputPath(result.url, format);
  
  // Ensure output directory exists
  await fileAPI.createDirectory(path.dirname(filePath));
  
  let content: string;
  
  switch(format) {
    case 'json':
      content = JSON.stringify(result.data, null, 2);
      break;
    case 'csv':
      content = convertToCSV([result.data]);
      break;
    case 'xml':
      const { Builder } = require('xml2js');
      const builder = new Builder();
      content = builder.buildObject({ data: result.data });
      break;
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
  
  await fileAPI.createFile(filePath, content, { type: FileType.TEMPORARY });
}

async function saveBatchResults(results: ScrapingResult[], outputDir: string, format: string): Promise<void> {
  await fileAPI.createDirectory(outputDir);
  
  // Save individual results
  for(let i = 0; i < results.length; i++) {
    const result = results[i];
    const fileName = `result_${i + 1}_${sanitizeFilename(result.url)}.${format}`;
    const filePath = path.join(outputDir, fileName);
    
    await saveResult(result, filePath, format);
  }
  
  // Save summary
  const summary = {
    totalResults: results.length,
    scrapedAt: new Date(),
    results: results.map((r, i) => ({
      index: i + 1,
      url: r.url,
      success: !!r.data,
      duration: r.metadata.duration,
      fields: Object.keys(r.data).length
    }))
  };
  
  await fileAPI.createFile(path.join(outputDir, 'summary.json'), JSON.stringify(summary, null, 2), { type: FileType.TEMPORARY });
    'utf-8'
  );
}

async function loadUrlsFromFile(filePath: string): Promise<string[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  
  // Validate URLs
  const validUrls: string[] = [];
  for(const line of lines) {
    try {
      new URL(line);
      validUrls.push(line);
    } catch {
      console.warn(chalk.yellow(`⚠️ Invalid URL skipped: ${line}`));
    }
  }
  
  return validUrls;
}

async function loadDataFromFile(filePath: string, format: string): Promise<any[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  
  switch(format) {
    case 'json':
      const data = JSON.parse(content);
      return Array.isArray(data) ? data : [data];
    case 'csv':
      // Simple CSV parsing (for demonstration)
      const lines = content.split('\n');
      const headers = lines[0].split(',');
      const records = lines.slice(1).map(line => {
        const values = line.split(',');
        const record: any = {};
        headers.forEach((header, i) => {
          record[header.trim()] = values[i]?.trim() || '';
        });
        return record;
      });
      return records;
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

async function getDefaultOutputPath(url: string, format: string): string {
  const urlObj = new URL(url);
  const filename = sanitizeFilename(urlObj.hostname + urlObj.pathname.replace(/\/$/, ''));
  return `./output/${filename}.${format}`;
}

async function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9.-]/gi, '_').replace(/_+/g, '_');
}

async function convertToCSV(data: any[]): string {
  if(data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  
  for(const record of data) {
    const values = headers.map(header => {
      const value = record[header];
      if(typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value || '');
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

async function setupProgressMonitoring(scraper: WebScraper): void {
  const progressInterval = setInterval(() => {
    const progress = scraper.getProgress();
    const stats = scraper.getStats();
    
    const completionPercent = progress.totalJobs > 0 ? 
      Math.round((progress.completedJobs / progress.totalJobs) * 100) : 0;
    
    process.stdout.write(`\r${chalk.blue('Progress:')} ${completionPercent}% ` +
      `(${progress.completedJobs}/${progress.totalJobs}) ` +
      `Running: ${progress.runningJobs} ` +
      `Failed: ${progress.failedJobs} ` +
      `Avg: ${Math.round(stats.averageResponseTime)}ms`);
    
    if(progress.pendingJobs === 0 && progress.runningJobs === 0) {
      console.log(); // New line after completion
      async clearInterval(progressInterval);
    }
  }, 1000);
}

async function startInteractiveMode(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise(resolve => rl.question(prompt, resolve));
  };

  try {
    while(true) {
      console.log(chalk.cyan('\n🎯 Interactive Web Scraper'));
      console.log('Commands: scrape, batch, schema, test, stats, export, quit');
      
      const command = await question('> ');
      
      if(command === 'quit' || command === 'exit') {
        break;
      }
      
      // Parse command and execute
      const args = command.split(' ');
      if(args.length === 0) continue;
      
      try {
        // Simulate CLI command parsing
        process.argv = ['node', 'cli.js', ...args];
        // Re-run command logic here or call appropriate functions
        
      } catch (error) {
        console.error(chalk.red(`Error: ${error}`));
      }
    }
  } finally {
    rl.close();
  }
}

async function createSchemaInteractively(name: string): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise(resolve => rl.question(prompt, resolve));
  };

  try {
    console.log(chalk.cyan(`\n📝 Creating schema: ${name}`));
    
    const description = await question('Description: ');
    const schema: ExtractionSchema = {
      name,
      description,
      rules: []
    };

    while(true) {
      const addRule = await question('Add extraction rule? (y/n): ');
      if(addRule.toLowerCase() !== 'y') break;

      const ruleName = await question('Rule name: ');
      const selector = await question('CSS selector: ');
      const required = await question('Required? (y/n): ');
      const multiple = await question('Multiple values? (y/n): ');
      
      schema.rules.push({
        name: ruleName,
        selector,
        required: required.toLowerCase() === 'y',
        multiple: multiple.toLowerCase() === 'y'
      });
    }

    // Save schema
    scraper.addSchema(schema);
    
    const saveFile = await question('Save to file? (y/n): ');
    if(saveFile.toLowerCase() === 'y') {
      const fileName = `./schemas/${name}.json`;
      await fileAPI.createDirectory('./schemas');
      await fileAPI.createFile(fileName, JSON.stringify(schema, null, 2), { type: FileType.TEMPORARY });
      console.log(chalk.green(`✅ Schema saved to ${fileName}`));
    }

    console.log(chalk.green(`✅ Schema "${name}" created successfully`));
    
  } finally {
    rl.close();
  }
}

// Error handling
process.on('uncaughtException', (error) => {
  console.error(chalk.red(`💥 Uncaught exception: ${error.message}`));
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red(`💥 Unhandled rejection: ${reason}`));
  process.exit(1);
});

// Cleanup on exit
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n🛑 Shutting down...'));
  await scraper.cleanup();
  process.exit(0);
});

// Parse commands
program.parse();

export default program;