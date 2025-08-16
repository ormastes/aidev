export interface AggregatedLogEntry {
  processId: string;
  timestamp: Date;
  level: string;
  message: string;
  source: 'stdout' | 'stderr';
  sequenceNumber: number;
}

export interface ProcessMetadata {
  processId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | "completed" | 'crashed' | 'stopped';
  logCount: number;
}

export interface AggregationFilters {
  processIds?: string[];
  levels?: string[];
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
}

export class LogAggregator {
  private logs: Map<string, AggregatedLogEntry[]> = new Map();
  private processMetadata: Map<string, ProcessMetadata> = new Map();
  private globalSequenceNumber: number = 0;
  private allLogs: AggregatedLogEntry[] = [];

  addLog(processId: string, logEntry: Omit<AggregatedLogEntry, "processId" | "sequenceNumber">): void {
    // Initialize process logs if needed
    if (!this.logs.has(processId)) {
      this.logs.set(processId, []);
      this.processMetadata.set(processId, {
        processId,
        startTime: new Date(),
        status: 'running',
        logCount: 0
      });
    }

    // Create aggregated entry
    const aggregatedEntry: AggregatedLogEntry = {
      ...logEntry,
      processId,
      sequenceNumber: this.globalSequenceNumber++
    };

    // Add to process-specific logs
    this.logs.get(processId)!.push(aggregatedEntry);
    
    // Add to global logs
    this.allLogs.push(aggregatedEntry);
    
    // Update metadata
    const metadata = this.processMetadata.get(processId)!;
    metadata.logCount++;
  }

  markProcessComplete(processId: string, exitCode: number): void {
    const metadata = this.processMetadata.get(processId);
    if (metadata) {
      metadata.endTime = new Date();
      metadata.status = exitCode === 0 ? "completed" : 'crashed';
    }
  }

  markProcessStopped(processId: string): void {
    const metadata = this.processMetadata.get(processId);
    if (metadata) {
      metadata.endTime = new Date();
      metadata.status = 'stopped';
    }
  }

  getAggregatedLogs(filters?: AggregationFilters): AggregatedLogEntry[] {
    let results = [...this.allLogs];

    if (filters) {
      // Filter by process IDs
      if (filters.processIds && filters.processIds.length > 0) {
        results = results.filter(log => filters.processIds!.includes(log.processId));
      }

      // Filter by log levels
      if (filters.levels && filters.levels.length > 0) {
        results = results.filter(log => filters.levels!.includes(log.level));
      }

      // Filter by time range
      if (filters.startTime) {
        results = results.filter(log => log.timestamp >= filters.startTime!);
      }
      if (filters.endTime) {
        results = results.filter(log => log.timestamp <= filters.endTime!);
      }

      // Apply pagination
      if (filters.offset !== undefined) {
        results = results.slice(filters.offset);
      }
      if (filters.limit !== undefined) {
        results = results.slice(0, filters.limit);
      }
    }

    return results;
  }

  getProcessLogs(processId: string): AggregatedLogEntry[] {
    return this.logs.get(processId) || [];
  }

  getProcessMetadata(processId: string): ProcessMetadata | undefined {
    return this.processMetadata.get(processId);
  }

  getAllProcessMetadata(): ProcessMetadata[] {
    return Array.from(this.processMetadata.values());
  }

  clear(): void {
    this.logs.clear();
    this.processMetadata.clear();
    this.allLogs = [];
    this.globalSequenceNumber = 0;
  }

  getStatistics(): {
    totalLogs: number;
    totalProcesses: number;
    activeProcesses: number;
    passedProcesses: number;
    crashedProcesses: number;
    stoppedProcesses: number;
  } {
    const metadata = Array.from(this.processMetadata.values());
    
    return {
      totalLogs: this.allLogs.length,
      totalProcesses: metadata.length,
      activeProcesses: metadata.filter(m => m.status === 'running').length,
      passedProcesses: metadata.filter(m => m.status === "completed").length,
      crashedProcesses: metadata.filter(m => m.status === 'crashed').length,
      stoppedProcesses: metadata.filter(m => m.status === 'stopped').length
    };
  }
}