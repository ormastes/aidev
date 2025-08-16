import { spawn, ChildProcess } from 'child_process';
import { externalLogLib, LogEntry } from '../external/external-log-lib';
import { ProcessHandle, ProcessManager } from '../domain/process-manager';
import { IAIDevPlatform, ILogCaptureSession, ProcessConfig } from '../interfaces';
import { getFileAPI, FileType } from '../../../../pipe';

const fileAPI = getFileAPI();


export { ProcessConfig } from '../interfaces';

export interface CaptureResult {
  exitCode: number | null;
}

export class LogCaptureSession implements ILogCaptureSession {
  private process: ChildProcess;
  private processHandle?: ProcessHandle;
  private capturer: ReturnType<typeof externalLogLib.createCapturer>;
  private logs: LogEntry[] = [];
  private logCallbacks: ((entry: LogEntry) => void)[] = [];
  private completionPromise: Promise<CaptureResult>;

  constructor(config: ProcessConfig, _processManager?: ProcessManager) {
    this.process = spawn(config.command, config.args);
    this.capturer = externalLogLib.createCapturer(this.process);
    
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
  }

  async waitForCompletion(): Promise<CaptureResult> {
    return this.completionPromise;
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getFormattedLogs(): string {
    return this.logs.map(log => {
      const timestamp = log.timestamp.toISOString();
      const level = `[${log.level.toUpperCase()}]`;
      return `${timestamp} ${level} ${log.message}`;
    }).join('\n');
  }

  async saveLogsToFile(filePath: string): Promise<void> {
    const content = this.getFormattedLogs();
    await fileAPI.createFile(filePath, content, { type: FileType.TEMPORARY });
  }

  onLogEntry(callback: (entry: LogEntry) => void): void {
    this.logCallbacks.push(callback);
  }

  getProcessHandle(): ProcessHandle | undefined {
    return this.processHandle;
  }

  setProcessHandle(handle: ProcessHandle): void {
    this.processHandle = handle;
  }
}

export class AIDevPlatform implements IAIDevPlatform {
  private processManager: ProcessManager;

  constructor() {
    this.processManager = new ProcessManager();
  }

  startLogCapture(config: ProcessConfig): LogCaptureSession {
    const session = new LogCaptureSession(config, this.processManager);
    
    // Create a ProcessHandle that wraps the existing process from the session
    const process = (session as any).process as ChildProcess;
    const handle = new ProcessHandle(process);
    
    // Register the handle with ProcessManager for tracking
    (this.processManager as any).activeProcesses.add(handle);
    
    // Remove from active list when process exits
    handle.waitForExit().then(() => {
      (this.processManager as any).activeProcesses.delete(handle);
    });
    
    session.setProcessHandle(handle);
    
    return session;
  }
}