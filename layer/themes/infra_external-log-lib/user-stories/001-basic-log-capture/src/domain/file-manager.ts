import * as fs from '../../layer/themes/infra_external-log-lib/src';
import * as path from 'node:path';
import { LogEntry } from '../external/external-log-lib';
import { IFileManager, SaveOptions } from '../interfaces';
import { getFileAPI, FileType } from '../../../../pipe';

const fileAPI = getFileAPI();


export class FileManager implements IFileManager {
  async saveLogsToFile(logs: LogEntry[], filePath: string, options: SaveOptions): Promise<void> {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      await fileAPI.createDirectory(dir);
    }

    let content: string;

    switch (options.format) {
      case 'json':
        content = this.formatAsJson(logs, options);
        break;
      case 'csv':
        content = this.formatAsCsv(logs);
        break;
      case 'text':
      default:
        content = this.formatAsText(logs);
        break;
    }

    // Write or append to file
    if (options.append && fs.existsSync(filePath)) {
      await fs.promises.appendFile(filePath, '\n' + content);
    } else {
      await fileAPI.createFile(filePath, content, { type: FileType.TEMPORARY });
    }
  }

  private formatAsText(logs: LogEntry[]): string {
    return logs.map(log => {
      const timestamp = log.timestamp.toISOString();
      const level = `[${log.level.toUpperCase()}]`;
      return `${timestamp} ${level} ${log.message}`;
    }).join('\n');
  }

  private formatAsJson(logs: LogEntry[], options: SaveOptions): string {
    const data = options.timestamp ? {
      timestamp: new Date().toISOString(),
      logs: logs
    } : logs;

    return JSON.stringify(data, null, 2);
  }

  private formatAsCsv(logs: LogEntry[]): string {
    const header = 'timestamp,level,message,source';
    const rows = logs.map(log => {
      const timestamp = log.timestamp.toISOString();
      const message = this.escapeCsvField(log.message);
      return `${timestamp},${log.level},${message},${log.source}`;
    });

    return [header, ...rows].join('\n');
  }

  private async escapeCsvField(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }
}