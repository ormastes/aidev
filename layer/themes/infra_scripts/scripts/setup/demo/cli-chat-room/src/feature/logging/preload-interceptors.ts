/**
 * Preload Script for Network and Database Interception
 * Usage: node --require ./dist/logging/preload-interceptors.js your-app.js
 * 
 * This will automatically intercept all network and database connections
 * without requiring any changes to your application code.
 */

import { networkInterceptor } from './network-interceptor';
import { databaseInterceptor } from './database-interceptor';
import { systemMetricsLogger } from './system-metrics-logger';
import { autoDetector, AutoConfig } from './auto-config-detector';
import { fs } from '../../../../../../../../infra_external-log-lib/src';
import { path } from '../../../../../../../../infra_external-log-lib/src';
import chalk from 'chalk';

// Auto-detect configuration
let autoConfig: AutoConfig | null = null;
const AUTO_DETECT = process.env.INTERCEPT_AUTO_DETECT !== 'false';

// Configuration from environment variables
const config = {
  enableNetwork: process.env.INTERCEPT_NETWORK !== 'false',
  enableDatabase: process.env.INTERCEPT_DATABASE !== 'false',
  enableMetrics: process.env.INTERCEPT_METRICS !== 'false',
  enableDatabaseDiff: process.env.INTERCEPT_DB_DIFF === 'true',
  logDir: process.env.INTERCEPT_LOG_DIR || path.join(process.cwd(), 'logs', 'intercepted'),
  logToConsole: process.env.INTERCEPT_CONSOLE === 'true',
  logFormat: process.env.INTERCEPT_FORMAT || 'json', // json, pretty, csv
  filterHosts: process.env.INTERCEPT_FILTER_HOSTS?.split(',') || [],
  excludeHosts: process.env.INTERCEPT_EXCLUDE_HOSTS?.split(',') || [],
  autoDetect: AUTO_DETECT
};

// Ensure log directory exists
if (!fs.existsSync(config.logDir)) {
  fs.mkdirSync(config.logDir, { recursive: true });
}

// Create log streams
const timestamp = Date.now();
const logStreams = {
  network: fs.createWriteStream(
    path.join(config.logDir, `network-${timestamp}.jsonl`),
    { flags: 'a' }
  ),
  database: fs.createWriteStream(
    path.join(config.logDir, `database-${timestamp}.jsonl`),
    { flags: 'a' }
  ),
  summary: fs.createWriteStream(
    path.join(config.logDir, `summary-${timestamp}.log`),
    { flags: 'a' }
  ),
  diff: config.enableDatabaseDiff ? fs.createWriteStream(
    path.join(config.logDir, `database-diff-${timestamp}.jsonl`),
    { flags: 'a' }
  ) : null
};

// Statistics
const stats = {
  startTime: Date.now(),
  network: { total: 0, errors: 0, bytes: { sent: 0, received: 0 } },
  database: { total: 0, errors: 0, queries: 0, diffs: 0 }
};

// Pretty print for console
function prettyPrint(type: string, data: any): void {
  const timestamp = new Date().toISOString();
  
  if (type === 'network') {
    const icon = data.error ? '❌' : '🔄';
    const method = data.method || data.type.toUpperCase();
    const url = data.host ? `${data.host}:${data.port}${data.path || ''}` : 'unknown';
    const status = data.statusCode ? ` [${data.statusCode}]` : '';
    const duration = data.duration ? ` (${data.duration}ms)` : '';
    const bytes = ` ↑${formatBytes(data.bytesWritten)} ↓${formatBytes(data.bytesRead)}`;
    
    console.log(
      chalk.gray(timestamp) + ' ' +
      icon + ' ' +
      chalk.cyan(method) + ' ' +
      chalk.white(url) +
      chalk.yellow(status) +
      chalk.green(duration) +
      chalk.gray(bytes)
    );
  } else if (type === 'database') {
    const icon = data.error ? '❌' : '🔄';
    const operation = data.operation.toUpperCase();
    const db = `${data.type}://${data.host || 'local'}/${data.database || ''}`;
    const duration = data.duration ? ` (${data.duration}ms)` : '';
    const rows = data.rowCount ? ` [${data.rowCount} rows]` : '';
    
    console.log(
      chalk.gray(timestamp) + ' ' +
      icon + ' ' +
      chalk.magenta(operation) + ' ' +
      chalk.white(db) +
      chalk.green(duration) +
      chalk.yellow(rows)
    );
    
    if (data.query && config.logToConsole) {
      console.log(chalk.gray('  Query: ') + chalk.gray(data.query.substring(0, 100) + '...'));
    }
    
    if (data.metadata?.diff) {
      console.log(chalk.yellow('  Diff: ') + 
        chalk.green(`+${data.metadata.diff.rowsAdded}`) + ' ' +
        chalk.red(`-${data.metadata.diff.rowsRemoved}`) + ' ' +
        chalk.yellow(`~${data.metadata.diff.rowsModified}`)
      );
    }
  } else if (type === 'diff') {
    const icon = '🔍';
    const changes = `+${data.summary.rowsAdded} -${data.summary.rowsRemoved} ~${data.summary.rowsModified}`;
    const tables = data.tableName || 'multiple';
    
    console.log(
      chalk.gray(timestamp) + ' ' +
      icon + ' ' +
      chalk.magenta('DIFF') + ' ' +
      chalk.white(tables) + ' ' +
      chalk.yellow(changes) + ' ' +
      chalk.gray(`(${data.summary.totalChanges} changes)`)
    );
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
}

// Setup network interception
if (config.enableNetwork) {
  console.log(chalk.blue('🌐 Network interception enabled'));
  
  networkInterceptor.enable({ metricsLogger: config.enableMetrics ? systemMetricsLogger : undefined });
  
  networkInterceptor.on('network', (log) => {
    // Apply filters
    if (config.filterHosts.length > 0 && !config.filterHosts.some(h => log.host?.includes(h))) {
      return;
    }
    if (config.excludeHosts.length > 0 && config.excludeHosts.some(h => log.host?.includes(h))) {
      return;
    }
    
    // Update stats
    stats.network.total++;
    if (log.error) stats.network.errors++;
    stats.network.bytes.sent += log.bytesWritten;
    stats.network.bytes.received += log.bytesRead;
    
    // Log
    logStreams.network.write(JSON.stringify(log) + '\n');
    
    if (config.logToConsole) {
      prettyPrint('network', log);
    }
  });
}

// Setup database interception
if (config.enableDatabase) {
  console.log(chalk.blue('🗄️  Database interception enabled'));
  if (config.enableDatabaseDiff) {
    console.log(chalk.blue('🔍 Database diff tracking enabled'));
  }
  
  databaseInterceptor.enable({ enableDiff: config.enableDatabaseDiff });
  
  databaseInterceptor.on('database', (log) => {
    // Update stats
    stats.database.total++;
    if (log.error) stats.database.errors++;
    if (log.operation === 'query') stats.database.queries++;
    
    // Log
    logStreams.database.write(JSON.stringify(log) + '\n');
    
    if (config.logToConsole) {
      prettyPrint('database', log);
    }
  });
  
  // Handle database diffs
  if (config.enableDatabaseDiff) {
    databaseInterceptor.on('database-diff', (diff) => {
      stats.database.diffs++;
      
      // Log diff in easily parseable format
      const diffLog = {
        timestamp: diff.timestamp,
        type: 'db-diff',
        database: diff.database,
        table: diff.tableName,
        operation: diff.operation,
        summary: diff.summary,
        changes: diff.changes
      };
      
      if (logStreams.diff) {
        logStreams.diff.write(JSON.stringify(diffLog) + '\n');
      }
      
      if (config.logToConsole) {
        prettyPrint('diff', diff);
      }
    });
  }
}

// Setup metrics logging
if (config.enableMetrics) {
  console.log(chalk.blue('📊 System metrics logging enabled'));
  systemMetricsLogger.startLogging(5000); // Log every 5 seconds
}

// Periodic summary
setInterval(() => {
  const runtime = Math.floor((Date.now() - stats.startTime) / 1000);
  const summary = {
    timestamp: new Date().toISOString(),
    runtime,
    network: {
      ...stats.network,
      bytesPerSecond: {
        sent: Math.round(stats.network.bytes.sent / runtime),
        received: Math.round(stats.network.bytes.received / runtime)
      }
    },
    database: {
      ...stats.database,
      queriesPerSecond: (stats.database.queries / runtime).toFixed(2),
      diffsPerMinute: ((stats.database.diffs / runtime) * 60).toFixed(2)
    }
  };
  
  logStreams.summary.write(JSON.stringify(summary) + '\n');
}, 60000); // Every minute

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n📊 Interception Summary:'));
  console.log(chalk.gray(`Runtime: ${Math.floor((Date.now() - stats.startTime) / 1000)}s`));
  console.log(chalk.gray(`Network: ${stats.network.total} requests (${stats.network.errors} errors)`));
  console.log(chalk.gray(`Database: ${stats.database.total} operations (${stats.database.queries} queries)`));
  if (config.enableDatabaseDiff && stats.database.diffs > 0) {
    console.log(chalk.gray(`Database Diffs: ${stats.database.diffs} captured`));
  }
  console.log(chalk.gray(`Logs saved to: ${config.logDir}`));
  
  // Export final stats
  const finalStats = {
    ...stats,
    endTime: Date.now(),
    networkStats: networkInterceptor.getStats(),
    databaseStats: databaseInterceptor.getStats(),
    databaseDiffs: config.enableDatabaseDiff ? databaseInterceptor.getDiffLogs() : []
  };
  
  fs.writeFileSync(
    path.join(config.logDir, 'final-stats.json'),
    JSON.stringify(finalStats, null, 2)
  );
  
  // Close streams
  Object.values(logStreams).forEach(stream => {
    if (stream) stream.end();
  });
  
  if (config.enableMetrics) {
    systemMetricsLogger.stopLogging();
    systemMetricsLogger.exportMetrics(path.join(config.logDir, 'system-metrics.json'));
  }
  
  process.exit(0);
});

// Auto-detect configuration if enabled
async function initialize() {
  if (config.autoDetect) {
    console.log(chalk.blue('🔍 Auto-detecting application configuration...'));
    try {
      autoConfig = await autoDetector.detect();
      
      // Apply detected configuration
      if (autoConfig.databases.length > 0) {
        console.log(chalk.green(`🔄 Detected ${autoConfig.databases.length} database(s)`));
        autoConfig.databases.forEach(db => {
          console.log(chalk.gray(`  - ${db.type} at ${db.host || db.url || 'local'}`));
        });
      }
      
      if (autoConfig.services.length > 0) {
        console.log(chalk.green(`🔄 Detected ${autoConfig.services.length} service(s)`));
        autoConfig.services.forEach(svc => {
          console.log(chalk.gray(`  - ${svc.name}: ${svc.url}`));
        });
      }
      
      if (autoConfig.cloudProviders.length > 0) {
        console.log(chalk.green(`🔄 Detected cloud providers:`));
        autoConfig.cloudProviders.forEach(cloud => {
          console.log(chalk.gray(`  - ${cloud.name}: ${cloud.services.join(', ')}`));
        });
      }
      
      // Apply interception rules
      autoConfig.interceptRules.forEach(rule => {
        if (rule.action === 'include' && !config.filterHosts.includes(rule.pattern)) {
          config.filterHosts.push(rule.pattern);
        } else if (rule.action === 'exclude' && !config.excludeHosts.includes(rule.pattern)) {
          config.excludeHosts.push(rule.pattern);
        }
      });
      
      // Apply security configuration
      if (autoConfig.security.complianceMode) {
        console.log(chalk.yellow(`⚠️  Compliance mode: ${autoConfig.security.complianceMode}`));
      }
      
    } catch (error) {
      console.error(chalk.red('Failed to auto-detect configuration:'), error);
    }
  }
  
  // Log startup
  console.log(chalk.green('🔄 Interception initialized'));
  console.log(chalk.gray(`Logs: ${config.logDir}`));
  console.log(chalk.gray(`Console: ${config.logToConsole ? 'enabled' : 'disabled'}`));
  console.log(chalk.gray(`Framework: ${autoConfig?.framework || 'unknown'}`));

  if (config.filterHosts.length > 0) {
    console.log(chalk.gray(`Filter hosts: ${config.filterHosts.join(', ')}`));
  }
  if (config.excludeHosts.length > 0) {
    console.log(chalk.gray(`Exclude hosts: ${config.excludeHosts.join(', ')}`));
  }
}

// Initialize with auto-detection
initialize().catch(console.error);

// Export for programmatic use
export { networkInterceptor, databaseInterceptor, systemMetricsLogger, config, stats };