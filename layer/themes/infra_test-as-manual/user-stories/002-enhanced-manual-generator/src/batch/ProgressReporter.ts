/**
 * Progress Reporter for batch processing
 * Provides real-time progress updates and status reporting
 */

import { EventEmitter } from '../../../../../infra_external-log-lib/src';
import * as chalk from 'chalk';

export interface ProgressUpdate {
  type: 'start' | 'progress' | 'complete' | 'error' | 'warning';
  message: string;
  details?: any;
  timestamp: Date;
}

export interface ProgressStatistics {
  startTime: Date;
  endTime?: Date;
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  warnings: number;
  averageProcessingTime?: number;
  estimatedTimeRemaining?: number;
}

export interface ReporterOptions {
  verbose?: boolean;
  showProgress?: boolean;
  showStatistics?: boolean;
  logFile?: string;
  format?: 'simple' | 'detailed' | 'json';
}

export class ProgressReporter extends EventEmitter {
  private options: ReporterOptions;
  private statistics: ProgressStatistics;
  private updates: ProgressUpdate[] = [];
  private progressBar?: any;
  private startTime: Date;

  constructor(options: ReporterOptions = {}) {
    super();
    this.options = {
      verbose: false,
      showProgress: true,
      showStatistics: true,
      format: 'simple',
      ...options
    };

    this.startTime = new Date();
    this.statistics = {
      startTime: this.startTime,
      totalItems: 0,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
      warnings: 0
    };
  }

  /**
   * Start progress reporting
   */
  start(totalItems: number, message?: string): void {
    this.statistics.totalItems = totalItems;
    this.statistics.startTime = new Date();
    
    const update: ProgressUpdate = {
      type: 'start',
      message: message || `Starting batch processing of ${totalItems} items`,
      timestamp: new Date()
    };
    
    this.addUpdate(update);
    this.emit('start', update);
    
    if (this.options.showProgress) {
      this.displayStart(update.message);
    }
  }

  /**
   * Report progress update
   */
  progress(processedItems: number, currentItem?: string): void {
    this.statistics.processedItems = processedItems;
    
    const percentage = Math.round((processedItems / this.statistics.totalItems) * 100);
    const message = currentItem 
      ? `Processing: ${currentItem} (${processedItems}/${this.statistics.totalItems})`
      : `Progress: ${processedItems}/${this.statistics.totalItems} (${percentage}%)`;
    
    const update: ProgressUpdate = {
      type: 'progress',
      message,
      details: {
        processedItems,
        totalItems: this.statistics.totalItems,
        percentage,
        currentItem
      },
      timestamp: new Date()
    };
    
    this.addUpdate(update);
    this.emit('progress', update);
    
    if (this.options.showProgress) {
      this.displayProgress(percentage, message);
    }
    
    // Calculate estimated time remaining
    this.updateEstimatedTime();
  }

  /**
   * Report successful item
   */
  success(item: string, details?: any): void {
    this.statistics.successfulItems++;
    
    const update: ProgressUpdate = {
      type: 'complete',
      message: `✓ Successfully processed: ${item}`,
      details,
      timestamp: new Date()
    };
    
    this.addUpdate(update);
    this.emit('success', update);
    
    if (this.options.verbose) {
      this.displaySuccess(update.message);
    }
  }

  /**
   * Report error
   */
  error(item: string, error: Error | string): void {
    this.statistics.failedItems++;
    
    const errorMessage = error instanceof Error ? error.message : error;
    const update: ProgressUpdate = {
      type: 'error',
      message: `✗ Failed to process: ${item}`,
      details: { error: errorMessage },
      timestamp: new Date()
    };
    
    this.addUpdate(update);
    this.emit('error', update);
    
    this.displayError(`${update.message}\n  ${errorMessage}`);
  }

  /**
   * Report warning
   */
  warning(message: string, details?: any): void {
    this.statistics.warnings++;
    
    const update: ProgressUpdate = {
      type: 'warning',
      message: `⚠ Warning: ${message}`,
      details,
      timestamp: new Date()
    };
    
    this.addUpdate(update);
    this.emit('warning', update);
    
    if (this.options.verbose) {
      this.displayWarning(update.message);
    }
  }

  /**
   * Complete progress reporting
   */
  complete(summary?: string): void {
    this.statistics.endTime = new Date();
    
    const duration = this.statistics.endTime.getTime() - this.statistics.startTime.getTime();
    const durationStr = this.formatDuration(duration);
    
    const update: ProgressUpdate = {
      type: 'complete',
      message: summary || `Batch processing completed in ${durationStr}`,
      details: this.statistics,
      timestamp: new Date()
    };
    
    this.addUpdate(update);
    this.emit('complete', update);
    
    if (this.options.showProgress) {
      this.displayComplete();
    }
    
    if (this.options.showStatistics) {
      this.displayStatistics();
    }
  }

  /**
   * Get current statistics
   */
  getStatistics(): ProgressStatistics {
    return { ...this.statistics };
  }

  /**
   * Get all updates
   */
  getUpdates(): ProgressUpdate[] {
    return [...this.updates];
  }

  /**
   * Clear progress history
   */
  clear(): void {
    this.updates = [];
    this.statistics = {
      startTime: new Date(),
      totalItems: 0,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
      warnings: 0
    };
  }

  private addUpdate(update: ProgressUpdate): void {
    this.updates.push(update);
    
    // Limit history size
    if (this.updates.length > 1000) {
      this.updates = this.updates.slice(-500);
    }
  }

  private updateEstimatedTime(): void {
    if (this.statistics.processedItems > 0) {
      const elapsed = Date.now() - this.statistics.startTime.getTime();
      const avgTime = elapsed / this.statistics.processedItems;
      const remaining = this.statistics.totalItems - this.statistics.processedItems;
      this.statistics.estimatedTimeRemaining = Math.round(avgTime * remaining);
      this.statistics.averageProcessingTime = Math.round(avgTime);
    }
  }

  private displayStart(message: string): void {
    console.log(chalk.blue.bold('\n' + message));
    console.log(chalk.gray('─'.repeat(60)));
  }

  private displayProgress(percentage: number, message: string): void {
    const barLength = 40;
    const filled = Math.round(barLength * (percentage / 100));
    const empty = barLength - filled;
    
    const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
    const percentStr = chalk.yellow(`${percentage}%`);
    
    process.stdout.write(`\r${bar} ${percentStr} - ${message}`);
  }

  private displaySuccess(message: string): void {
    console.log(chalk.green(message));
  }

  private displayError(message: string): void {
    console.log(chalk.red(message));
  }

  private displayWarning(message: string): void {
    console.log(chalk.yellow(message));
  }

  private displayComplete(): void {
    console.log('\n' + chalk.gray('─'.repeat(60)));
    console.log(chalk.green.bold('✓ Processing Complete'));
  }

  private displayStatistics(): void {
    const stats = this.statistics;
    const duration = stats.endTime 
      ? stats.endTime.getTime() - stats.startTime.getTime()
      : Date.now() - stats.startTime.getTime();
    
    console.log(chalk.blue.bold('\nStatistics:'));
    console.log(chalk.gray('─'.repeat(60)));
    console.log(`Total Items:      ${stats.totalItems}`);
    console.log(`Processed:        ${stats.processedItems}`);
    console.log(chalk.green(`Successful:       ${stats.successfulItems}`));
    
    if (stats.failedItems > 0) {
      console.log(chalk.red(`Failed:           ${stats.failedItems}`));
    }
    
    if (stats.warnings > 0) {
      console.log(chalk.yellow(`Warnings:         ${stats.warnings}`));
    }
    
    console.log(`Duration:         ${this.formatDuration(duration)}`);
    
    if (stats.averageProcessingTime) {
      console.log(`Avg Time/Item:    ${this.formatDuration(stats.averageProcessingTime)}`);
    }
    
    const successRate = stats.processedItems > 0 
      ? Math.round((stats.successfulItems / stats.processedItems) * 100)
      : 0;
    console.log(`Success Rate:     ${successRate}%`);
    console.log(chalk.gray('─'.repeat(60)));
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
    return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
  }
}

export default ProgressReporter;