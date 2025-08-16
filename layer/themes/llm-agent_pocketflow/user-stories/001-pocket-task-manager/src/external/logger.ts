import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';
import { LoggerInterface } from '../interfaces';

export class Logger implements LoggerInterface {
  private readonly logFile: string;

  constructor(logFile: string) {
    if (!logFile || typeof logFile !== 'string') {
      throw new Error('Log file path is required and must be a string');
    }

    if (!path.isAbsolute(logFile)) {
      throw new Error('Log file path must be absolute');
    }

    this.logFile = logFile;
    this.ensureDirectoryExists();
  }

  log(message: string): void {
    const logEntry = this.formatLogEntry(message);
    this.writeToFile(logEntry);
  }

  private formatLogEntry(message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] ${message}\n`;
  }

  private writeToFile(logEntry: string): void {
    try {
      await fileAPI.writeFile(this.logFile, logEntry, { append: true });
    } catch (error) {
      // If logging fails, we can't log the error, so we'll just swallow it
      // In a production system, you might want to have a fallback mechanism
      console.error('Failed to write to log file:', error);
    }
  }

  private ensureDirectoryExists(): void {
    const directory = path.dirname(this.logFile);
    if (!fs.existsSync(directory)) {
      await fileAPI.createDirectory(directory);
    }
  }
}