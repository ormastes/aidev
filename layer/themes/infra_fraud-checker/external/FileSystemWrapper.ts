import * as fs from 'fs/promises';
import { path } from '../../infra_external-log-lib/src';
import { ExternalLogLib, LogEntry } from '../../external-log-lib/user-stories/001-basic-log-capture/src/external/external-log-lib';
import { getFileAPI, FileType } from '../../infra_external-log-lib/pipe';

const fileAPI = getFileAPI();


export interface FileSystemMetrics {
  readCount: number;
  writeCount: number;
  totalBytesRead: number;
  totalBytesWritten: number;
  errors: Error[];
}

/**
 * Wrapper for file system operations with external log tracking
 */
export class FileSystemWrapper {
  private metrics: FileSystemMetrics = {
    readCount: 0,
    writeCount: 0,
    totalBytesRead: 0,
    totalBytesWritten: 0,
    errors: []
  };

  private logEntries: LogEntry[] = [];
  private logCallbacks: ((entry: LogEntry) => void)[] = [];

  constructor(private basePath: string = process.cwd()) {}

  async readFile(filePath: string, encoding: BufferEncoding = 'utf8'): Promise<string> {
    const absolutePath = path.resolve(this.basePath, filePath);
    
    try {
      this.log('info', `Reading file: ${absolutePath}`);
      const content = await fs.readFile(absolutePath, encoding);
      
      this.metrics.readCount++;
      this.metrics.totalBytesRead += Buffer.byteLength(content);
      
      this.log('debug', `Successfully read ${Buffer.byteLength(content)} bytes from ${absolutePath}`);
      return content;
    } catch (error) {
      this.metrics.errors.push(error as Error);
      this.log('error', `Failed to read file ${absolutePath}: ${error.message}`);
      throw error;
    }
  }

  async writeFile(filePath: string, content: string, encoding: BufferEncoding = 'utf8'): Promise<void> {
    const absolutePath = path.resolve(this.basePath, filePath);
    
    try {
      this.log('info', `Writing file: ${absolutePath}`);
      await fileAPI.createDirectory(path.dirname(absolutePath));
      await fileAPI.createFile(absolutePath, content, { type: FileType.TEMPORARY })} bytes to ${absolutePath}`);
    } catch (error) {
      this.metrics.errors.push(error as Error);
      this.log('error', `Failed to write file ${absolutePath}: ${error.message}`);
      throw error;
    }
  }

  async readdir(dirPath: string): Promise<string[]> {
    const absolutePath = path.resolve(this.basePath, dirPath);
    
    try {
      this.log('info', `Reading directory: ${absolutePath}`);
      const files = await fs.readdir(absolutePath);
      
      this.log('debug', `Found ${files.length} files in ${absolutePath}`);
      return files;
    } catch (error) {
      this.metrics.errors.push(error as Error);
      this.log('error', `Failed to read directory ${absolutePath}: ${error.message}`);
      throw error;
    }
  }

  async stat(filePath: string): Promise<fs.Stats> {
    const absolutePath = path.resolve(this.basePath, filePath);
    
    try {
      this.log('debug', `Getting stats for: ${absolutePath}`);
      return await fs.stat(absolutePath);
    } catch (error) {
      this.metrics.errors.push(error as Error);
      this.log('error', `Failed to stat ${absolutePath}: ${error.message}`);
      throw error;
    }
  }

  async exists(filePath: string): Promise<boolean> {
    const absolutePath = path.resolve(this.basePath, filePath);
    
    try {
      await fs.access(absolutePath);
      return true;
    } catch {
      return false;
    }
  }

  async getMetrics(): FileSystemMetrics {
    return { ...this.metrics };
  }

  async resetMetrics(): void {
    this.metrics = {
      readCount: 0,
      writeCount: 0,
      totalBytesRead: 0,
      totalBytesWritten: 0,
      errors: []
    };
  }

  // External log integration
  private async log(level: LogEntry['level'], message: string): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      source: 'stdout'
    };
    
    this.logEntries.push(entry);
    this.logCallbacks.forEach(cb => cb(entry));
  }

  onLog(callback: (entry: LogEntry) => void): void {
    this.logCallbacks.push(callback);
  }

  async getLogEntries(): LogEntry[] {
    return [...this.logEntries];
  }

  async clearLogs(): void {
    this.logEntries = [];
  }
}