import { EventEmitter } from 'node:events';
import { ChildProcess } from 'child_process';
import { LogEntry } from '../domain/log-entry';
import { ProcessManager } from './process-manager';
import { LogStream } from './log-stream';

export interface MonitoringOptions {
  format?: 'auto' | 'json' | "structured" | 'plain';
  logLevelFilter?: string[];
}

export interface ProcessInfo {
  processId: string;
  command: string;
  status: "starting" | 'running' | 'stopped' | 'crashed';
  startTime: Date;
  endTime?: Date;
}

export interface MonitoringStatus {
  activeProcesses: number;
  processes: ProcessInfo[];
}

export class LogMonitor extends EventEmitter {
  private processes: Map<string, {
    info: ProcessInfo;
    childProcess: ChildProcess;
    processManager: ProcessManager;
    logStream: LogStream;
  }> = new Map();

  constructor() {
    super();
  }

  async startRealTimeMonitoring(command: string, options: MonitoringOptions = {}): Promise<string> {
    const processId = this.generateProcessId();
    
    // Create process info
    const processInfo: ProcessInfo = {
      processId,
      command,
      status: "starting",
      startTime: new Date()
    };

    try {
      // Create process manager and spawn process
      const processManager = new ProcessManager();
      const childProcess = processManager.spawnProcess(command, {
        stdio: 'pipe'
      });

      // Create log stream for real-time processing
      const logStream = new LogStream(childProcess.stdout!, childProcess.stderr!);
      
      // Apply log level filter if specified
      if (options.logLevelFilter) {
        logStream.setLogLevelFilter(options.logLevelFilter);
      }

      // Setup event listeners
      this.setupProcessEventListeners(processId, childProcess, processManager, logStream);
      this.setupLogStreamEventListeners(processId, logStream);

      // Store process information
      this.processes.set(processId, {
        info: processInfo,
        childProcess,
        processManager,
        logStream
      });

      // Update status to running
      processInfo.status = 'running';

      // Emit monitoring started event
      this.emit('monitoring-started', {
        processId,
        command,
        startTime: processInfo.startTime
      });

      return processId;

    } catch (error) {
      processInfo.status = 'crashed';
      processInfo.endTime = new Date();
      
      this.emit('monitoring-error', {
        processId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw error;
    }
  }

  async stopMonitoring(processId: string): Promise<void> {
    const processData = this.processes.get(processId);
    if (!processData) {
      throw new Error(`Process ${processId} not found`);
    }

    try {
      // Terminate process gracefully
      await processData.processManager.terminateProcess('SIGTERM');
      
      // Clean up log stream
      processData.logStream.cleanup();
      
      // Update process info
      processData.info.status = 'stopped';
      processData.info.endTime = new Date();
      
      // Remove from active processes
      this.processes.delete(processId);
      
      // Emit monitoring stopped event
      this.emit('monitoring-stopped', {
        processId,
        endTime: processData.info.endTime
      });

    } catch (error) {
      // Force kill if graceful termination fails
      await processData.processManager.forceKill('SIGKILL');
      processData.info.status = 'stopped';
      processData.info.endTime = new Date();
      this.processes.delete(processId);
      
      this.emit('monitoring-stopped', {
        processId,
        endTime: processData.info.endTime,
        forced: true
      });
    }
  }

  async stopAllMonitoring(): Promise<void> {
    const processIds = Array.from(this.processes.keys());
    await Promise.all(
      processIds.map(processId => this.stopMonitoring(processId))
    );
  }

  getMonitoringStatus(): MonitoringStatus {
    const processes = Array.from(this.processes.values()).map(p => ({ ...p.info }));
    
    return {
      activeProcesses: this.processes.size,
      processes
    };
  }

  setLogLevelFilter(processId: string, levels: string[]): void {
    const processData = this.processes.get(processId);
    if (!processData) {
      throw new Error(`Process ${processId} not found`);
    }
    
    processData.logStream.setLogLevelFilter(levels);
  }

  private setupProcessEventListeners(
    processId: string,
    childProcess: ChildProcess,
    _processManager: ProcessManager,
    logStream: LogStream
  ): void {
    childProcess.on('exit', (code, signal) => {
      const processData = this.processes.get(processId);
      if (processData) {
        processData.info.endTime = new Date();
        
        if (code === 0) {
          processData.info.status = 'stopped';
          this.emit('process-exited', {
            processId,
            code,
            signal,
            endTime: processData.info.endTime
          });
        } else {
          processData.info.status = 'crashed';
          this.emit('process-crashed', {
            processId,
            code,
            signal,
            endTime: processData.info.endTime,
            lastLogs: logStream.getRecentLogs(10)
          });
        }
        
        // Clean up
        logStream.cleanup();
        this.processes.delete(processId);
      }
    });

    childProcess.on('error', (error) => {
      const processData = this.processes.get(processId);
      if (processData) {
        processData.info.status = 'crashed';
        processData.info.endTime = new Date();
        
        this.emit('process-error', {
          processId,
          error: error.message,
          endTime: processData.info.endTime
        });
        
        logStream.cleanup();
        this.processes.delete(processId);
      }
    });
  }

  private setupLogStreamEventListeners(processId: string, logStream: LogStream): void {
    logStream.on('log-entry', (entry: LogEntry) => {
      // Add process ID to log entry
      const entryWithProcessId = {
        ...entry,
        processId
      };
      
      this.emit('log-entry', entryWithProcessId);
    });

    logStream.on('log-batch', (entries: LogEntry[]) => {
      // Add process ID to all entries
      const entriesWithProcessId = entries.map(entry => ({
        ...entry,
        processId
      }));
      
      this.emit('log-batch', entriesWithProcessId);
    });

    logStream.on('buffer-warning', (event) => {
      this.emit('buffer-warning', {
        ...event,
        processId
      });
    });
  }

  private generateProcessId(): string {
    return `proc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
}