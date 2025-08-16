import { spawn, ChildProcess } from 'child_process';
import { ProcessConfig, ILogCaptureSession, IProcessHandle } from '../../../001-basic-log-capture/src/interfaces';
import { pythonExternalLogLib } from '../external/python-external-log-lib';
import { LogEntry } from '../../../001-basic-log-capture/src/external/external-log-lib';
import { ProcessHandle, ProcessManager } from '../../../001-basic-log-capture/src/domain/process-manager';
import { getFileAPI, FileType } from '../../../../pipe';

const fileAPI = getFileAPI();


export class PythonLogPlatform {
  private processManager: ProcessManager;

  constructor() {
    this.processManager = new ProcessManager();
  }

  async startPythonLogCapture(config: ProcessConfig): Promise<ILogCaptureSession> {
    // Create a custom LogCaptureSession that uses Python log parser
    const pythonConfig = {
      ...config,
      command: config.command === 'python' ? 'python3' : config.command
    };

    return new PythonLogCaptureSession(pythonConfig, this.processManager);
  }
}

class PythonLogCaptureSession implements ILogCaptureSession {
  private process: ChildProcess;
  private processHandle?: ProcessHandle;
  private capturer: ReturnType<typeof pythonExternalLogLib.createCapturer>;
  private logs: LogEntry[] = [];
  private logCallbacks: ((entry: LogEntry) => void)[] = [];
  private completionPromise: Promise<{ exitCode: number | null }>;

  constructor(config: ProcessConfig, processManager: ProcessManager) {
    this.process = spawn(config.command, config.args);
    this.capturer = pythonExternalLogLib.createCapturer(this.process);
    
    // Set up log capture
    this.capturer.onLog((entry) => {
      this.logs.push(entry);
      this.logCallbacks.forEach(cb => cb(entry));
    });
    
    if (config.captureOutput) {
      this.capturer.start();
    }
    
    // Set up completion promise
    this.completionPromise = new Promise((resolve) => {
      this.process.on('close', (code) => {
        this.capturer.stop();
        resolve({ exitCode: code });
      });
    });

    // Create ProcessHandle
    const handle = new ProcessHandle(this.process);
    (processManager as any).activeProcesses.add(handle);
    
    handle.waitForExit().then(() => {
      (processManager as any).activeProcesses.delete(handle);
    });
    
    this.processHandle = handle;
  }

  async waitForCompletion(): Promise<{ exitCode: number | null }> {
    return this.completionPromise;
  }

  async getLogs(): LogEntry[] {
    return [...this.logs];
  }

  async getFormattedLogs(): string {
    return this.logs.map(log => {
      const timestamp = log.timestamp.toISOString();
      const level = `[${log.level.toUpperCase()}]`;
      return `${timestamp} ${level} ${log.message}`;
    }).join('\n');
  }

  async saveLogsToFile(filePath: string): Promise<void> {
    const fs = await import('fs');
    const content = this.getFormattedLogs();
    await fileAPI.createFile(filePath, content, { type: FileType.TEMPORARY });
  }

  onLogEntry(callback: (entry: LogEntry) => void): void {
    this.logCallbacks.push(callback);
  }

  async getProcessHandle(): IProcessHandle | undefined {
    return this.processHandle;
  }
}

// Re-export for convenience
export { ProcessConfig } from '../../../001-basic-log-capture/src/interfaces';