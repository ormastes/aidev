import { LogEntry } from '../external/external-log-lib';

export interface ILogStorage {
  addLog(entry: LogEntry): void;
  getLogs(): LogEntry[];
  clear(): void;
}

export interface ILogFormatter {
  format(logs: LogEntry[]): string;
}

export interface ILogPersistence {
  saveToFile(filePath: string, content: string): Promise<void>;
}

export interface IFileManager {
  saveLogsToFile(logs: LogEntry[], filePath: string, options: SaveOptions): Promise<void>;
}

export interface SaveOptions {
  format: 'text' | 'json' | 'csv';
  compress?: boolean;
  timestamp?: boolean;
  append?: boolean;
}

export interface ILogCaptureSession {
  waitForCompletion(): Promise<{ exitCode: number | null }>;
  getLogs(): LogEntry[];
  getFormattedLogs(): string;
  saveLogsToFile(filePath: string): Promise<void>;
  onLogEntry(callback: (entry: LogEntry) => void): void;
  getProcessHandle(): IProcessHandle | undefined;
}

export interface IProcessSpawner {
  spawn(command: string, args: string[]): IProcess;
}

export interface IProcess {
  pid?: number;
  stdout?: NodeJS.ReadableStream;
  stderr?: NodeJS.ReadableStream;
  on(event: 'close' | 'exit', listener: (code: number | null) => void): void;
  kill(signal?: string): void;
}

export interface IAIDevPlatform {
  startLogCapture(config: ProcessConfig): Promise<ILogCaptureSession>;
}

export interface ProcessConfig {
  command: string;
  args: string[];
  captureOutput: boolean;
}

export interface IProcessManager {
  spawn(config: ProcessConfig): Promise<IProcessHandle>;
  getActiveCount(): number;
  terminateAll(): Promise<void>;
}

export interface IProcessHandle {
  isRunning(): boolean;
  getPid(): number;
  waitForExit(): Promise<number | null>;
  terminate(): Promise<boolean>;
  getResourceUsage(): ResourceUsage;
}

export interface ResourceUsage {
  pid: number;
  startTime: Date;
  duration?: number;
}