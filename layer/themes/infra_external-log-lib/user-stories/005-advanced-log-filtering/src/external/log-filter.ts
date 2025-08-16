/**
 * LogFilter - External interface for filtering log entries by level
 * 
 * This component provides log level filtering capabilities that can be
 * integrated with LogStream and LogMonitor for real-time log processing.
 */
export class LogFilter {
  private allowedLevels: Set<string> = new Set();
  private isConfigured: boolean = false;

  /**
   * Configure the filter with allowed log levels
   * @param levels Array of log levels to allow through the filter
   */
  configure(levels: string[]): void {
    this.allowedLevels.clear();
    
    if (levels && levels.length > 0) {
      // Normalize levels to lowercase and add to set for efficient lookup
      levels.forEach(level => {
        if (typeof level === 'string' && level.trim()) {
          this.allowedLevels.add(level.trim().toLowerCase());
        }
      });
      this.isConfigured = true;
    } else {
      // Empty array means allow all logs
      this.isConfigured = false;
    }
  }

  /**
   * Filter a log entry based on its level
   * @param level The log level to check
   * @param _message The log message (optional, used for interface completeness)
   * @returns true if the log should pass through, false if it should be filtered out
   */
  filterLog(level: string, _message: string): boolean {
    // Handle invalid level inputs
    if (!level || typeof level !== 'string') {
      return false;
    }

    // If no filter is configured, allow all logs
    if (!this.isConfigured) {
      return true;
    }

    // Check for malformed levels before normalization
    if (level.includes('\n') || level.includes('\r')) {
      return false;
    }

    // Normalize the input level and check against allowed levels
    const normalizedLevel = level.trim().toLowerCase();
    
    // Reject levels that still contain spaces after trimming (malformed)
    if (normalizedLevel.includes(' ')) {
      return false;
    }
    
    return this.allowedLevels.has(normalizedLevel);
  }

  /**
   * Get the currently configured filter levels
   * @returns Array of configured log levels
   */
  getConfiguredLevels(): string[] {
    return Array.from(this.allowedLevels);
  }

  /**
   * Check if the filter is currently configured
   * @returns true if filter has been configured with specific levels
   */
  isFilterConfigured(): boolean {
    return this.isConfigured;
  }

  /**
   * Clear the filter configuration (allow all logs)
   */
  clearFilter(): void {
    this.allowedLevels.clear();
    this.isConfigured = false;
  }
}