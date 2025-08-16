/**
 * Mock External Logger for Integration Testing
 * 
 * Provides a simplified external logger interface that mimics
 * the expected behavior of a full external log library for testing.
 */
export interface LogEntry {
  timestamp: Date;
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error';
  message: string;
  processId: string;
  metadata?: Record<string, any>;
}

export class MockExternalLogger {
  private loggers: Map<string, LogEntry[]> = new Map();
  private activeLoggers: Set<string> = new Set();

  /**
   * Initialize a new logger instance
   * @param loggerId Unique identifier for the logger
   * @returns The logger ID
   */
  async initializeLogger(loggerId: string): Promise<string> {
    if (this.loggers.has(loggerId)) {
      throw new Error(`Logger ${loggerId} already exists`);
    }
    
    this.loggers.set(loggerId, []);
    this.activeLoggers.add(loggerId);
    
    return loggerId;
  }

  /**
   * Initialize a report logger instance
   * @param reportId Unique identifier for the report logger
   * @returns The logger ID
   */
  async initializeReportLogger(reportId: string): Promise<string> {
    return this.initializeLogger(`report-${reportId}`);
  }

  /**
   * Log a message
   * @param loggerId Logger identifier
   * @param level Log level
   * @param message Log message
   */
  log(loggerId: string, level: LogEntry['level'], message: string): void {
    if (!this.loggers.has(loggerId)) {
      throw new Error(`Logger ${loggerId} not found`);
    }

    if (!this.activeLoggers.has(loggerId)) {
      throw new Error(`Logger ${loggerId} is not active`);
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      processId: loggerId
    };

    const logs = this.loggers.get(loggerId)!;
    logs.push(entry);
  }

  /**
   * Get log history for a logger
   * @param loggerId Logger identifier
   * @returns Array of log entries
   */
  async getLogHistory(loggerId: string): Promise<LogEntry[]> {
    if (!this.loggers.has(loggerId)) {
      throw new Error(`Logger ${loggerId} not found`);
    }

    return [...this.loggers.get(loggerId)!];
  }

  /**
   * Get logs by level
   * @param loggerId Logger identifier
   * @param level Log level to filter by
   * @returns Filtered log entries
   */
  async getLogsByLevel(loggerId: string, level: LogEntry['level']): Promise<LogEntry[]> {
    const logs = await this.getLogHistory(loggerId);
    return logs.filter(log => log.level === level);
  }

  /**
   * Clear log history
   * @param loggerId Logger identifier
   */
  clearLogs(loggerId: string): void {
    if (!this.loggers.has(loggerId)) {
      throw new Error(`Logger ${loggerId} not found`);
    }

    this.loggers.get(loggerId)!.length = 0;
  }

  /**
   * Deactivate a logger
   * @param loggerId Logger identifier
   */
  deactivateLogger(loggerId: string): void {
    if (!this.loggers.has(loggerId)) {
      throw new Error(`Logger ${loggerId} not found`);
    }

    this.activeLoggers.delete(loggerId);
  }

  /**
   * Reactivate a logger
   * @param loggerId Logger identifier
   */
  reactivateLogger(loggerId: string): void {
    if (!this.loggers.has(loggerId)) {
      throw new Error(`Logger ${loggerId} not found`);
    }

    this.activeLoggers.add(loggerId);
  }

  /**
   * Get all active logger IDs
   * @returns Array of active logger IDs
   */
  getActiveLoggers(): string[] {
    return Array.from(this.activeLoggers);
  }

  /**
   * Get statistics for a logger
   * @param loggerId Logger identifier
   * @returns Log statistics
   */
  async getLogStatistics(loggerId: string): Promise<{
    total: number;
    byLevel: Record<LogEntry['level'], number>;
    oldestEntry?: Date;
    newestEntry?: Date;
  }> {
    const logs = await this.getLogHistory(loggerId);
    
    const byLevel: Record<LogEntry['level'], number> = {
      trace: 0,
      debug: 0,
      info: 0,
      warn: 0,
      error: 0
    };

    logs.forEach(log => {
      byLevel[log.level]++;
    });

    return {
      total: logs.length,
      byLevel,
      oldestEntry: logs.length > 0 ? logs[0].timestamp : undefined,
      newestEntry: logs.length > 0 ? logs[logs.length - 1].timestamp : undefined
    };
  }

  /**
   * Search logs by message content
   * @param loggerId Logger identifier
   * @param searchTerm Search term
   * @returns Matching log entries
   */
  async searchLogs(loggerId: string, searchTerm: string): Promise<LogEntry[]> {
    const logs = await this.getLogHistory(loggerId);
    return logs.filter(log => log.message.includes(searchTerm));
  }

  /**
   * Log a message with metadata
   * @param loggerId Logger identifier
   * @param level Log level
   * @param message Log message
   * @param metadata Additional metadata
   */
  async logWithMetadata(loggerId: string, level: LogEntry['level'], message: string, metadata: Record<string, any>): Promise<void> {
    if (!this.loggers.has(loggerId)) {
      throw new Error(`Logger ${loggerId} not found`);
    }

    if (!this.activeLoggers.has(loggerId)) {
      throw new Error(`Logger ${loggerId} is not active`);
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      processId: loggerId,
      metadata
    };

    const logs = this.loggers.get(loggerId)!;
    logs.push(entry);
  }

  /**
   * Clean up all loggers
   */
  cleanup(): void {
    this.loggers.clear();
    this.activeLoggers.clear();
  }
}