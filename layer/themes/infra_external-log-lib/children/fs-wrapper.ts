/**
 * File System Wrapper with External Logging
 * Maintains same interface as Node.js fs module but adds logging
 */

import * as originalFs from '../../layer/themes/infra_external-log-lib/src';
import * as originalFsPromises from 'fs/promises';
import { ExternalLogLib } from '../user-stories/001-basic-log-capture/src/external/external-log-lib';

class FileSystemWrapper {
  private logger: ExternalLogLib;
  
  constructor() {
    this.logger = new ExternalLogLib({
      appName: 'fs-wrapper',
      logLevel: 'info',
      transports: ['file'],
      logDir: './logs'
    });
  }

  private logOperation(operation: string, path: string, details: any = {}) {
    this.logger.log('info', `FS Operation: ${operation}`, {
      operation,
      path,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  private logError(operation: string, path: string, error: Error) {
    this.logger.log('error', `FS Error: ${operation}`, {
      operation,
      path,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }

  // Synchronous operations
  readFileSync(path: string, options?: any): string | Buffer {
    const startTime = Date.now();
    try {
      const result = originalFs.readFileSync(path, options);
      this.logOperation("readFileSync", path, {
        size: result.length,
        duration: Date.now() - startTime,
        encoding: options?.encoding
      });
      return result;
    } catch (error) {
      this.logError("readFileSync", path, error as Error);
      throw error;
    }
  }

  writeFileSync(path: string, data: string | Buffer, options?: any): void {
    const startTime = Date.now();
    try {
      originalFs.writeFileSync(path, data, options);
      this.logOperation("writeFileSync", path, {
        size: data.length,
        duration: Date.now() - startTime,
        encoding: options?.encoding
      });
    } catch (error) {
      this.logError("writeFileSync", path, error as Error);
      throw error;
    }
  }

  existsSync(path: string): boolean {
    try {
      const exists = originalFs.existsSync(path);
      this.logOperation("existsSync", path, { exists });
      return exists;
    } catch (error) {
      this.logError("existsSync", path, error as Error);
      throw error;
    }
  }

  mkdirSync(path: string, options?: any): string | undefined {
    const startTime = Date.now();
    try {
      const result = originalFs.mkdirSync(path, options);
      this.logOperation("mkdirSync", path, {
        recursive: options?.recursive,
        duration: Date.now() - startTime
      });
      return result;
    } catch (error) {
      this.logError("mkdirSync", path, error as Error);
      throw error;
    }
  }

  readdirSync(path: string, options?: any): string[] | Buffer[] | originalFs.Dirent[] {
    const startTime = Date.now();
    try {
      const result = originalFs.readdirSync(path, options);
      this.logOperation("readdirSync", path, {
        count: Array.isArray(result) ? result.length : 0,
        duration: Date.now() - startTime
      });
      return result;
    } catch (error) {
      this.logError("readdirSync", path, error as Error);
      throw error;
    }
  }

  statSync(path: string, options?: any): originalFs.Stats {
    const startTime = Date.now();
    try {
      const stats = originalFs.statSync(path, options);
      this.logOperation("statSync", path, {
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        size: stats.size,
        duration: Date.now() - startTime
      });
      return stats;
    } catch (error) {
      this.logError("statSync", path, error as Error);
      throw error;
    }
  }

  unlinkSync(path: string): void {
    const startTime = Date.now();
    try {
      originalFs.unlinkSync(path);
      this.logOperation("unlinkSync", path, {
        duration: Date.now() - startTime
      });
    } catch (error) {
      this.logError("unlinkSync", path, error as Error);
      throw error;
    }
  }

  // Stream operations
  createReadStream(path: string, options?: any): originalFs.ReadStream {
    this.logOperation("createReadStream", path, { options });
    const stream = originalFs.createReadStream(path, options);
    
    stream.on('error', (error) => {
      this.logError("createReadStream", path, error as Error);
    });
    
    stream.on('end', () => {
      this.logOperation("createReadStream", path, { event: 'end' });
    });
    
    return stream;
  }

  createWriteStream(path: string, options?: any): originalFs.WriteStream {
    this.logOperation("createWriteStream", path, { options });
    const stream = originalFs.createWriteStream(path, options);
    
    stream.on('error', (error) => {
      this.logError("createWriteStream", path, error as Error);
    });
    
    stream.on('finish', () => {
      this.logOperation("createWriteStream", path, { event: 'finish' });
    });
    
    return stream;
  }
}

// Promises wrapper
class FileSystemPromisesWrapper {
  private logger: ExternalLogLib;
  
  constructor() {
    this.logger = new ExternalLogLib({
      appName: 'fs-promises-wrapper',
      logLevel: 'info',
      transports: ['file'],
      logDir: './logs'
    });
  }

  private async logOperationAsync(operation: string, path: string, details: any = {}) {
    this.logger.log('info', `FS Async Operation: ${operation}`, {
      operation,
      path,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  private async logErrorAsync(operation: string, path: string, error: Error) {
    this.logger.log('error', `FS Async Error: ${operation}`, {
      operation,
      path,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }

  async readFile(path: string, options?: any): Promise<string | Buffer> {
    const startTime = Date.now();
    try {
      const result = await originalFsPromises.readFile(path, options);
      await this.logOperationAsync("readFile", path, {
        size: result.length,
        duration: Date.now() - startTime,
        encoding: options?.encoding
      });
      return result;
    } catch (error) {
      await this.logErrorAsync("readFile", path, error as Error);
      throw error;
    }
  }

  async writeFile(path: string, data: string | Buffer, options?: any): Promise<void> {
    const startTime = Date.now();
    try {
      await originalFsPromises.writeFile(path, data, options);
      await this.logOperationAsync("writeFile", path, {
        size: data.length,
        duration: Date.now() - startTime,
        encoding: options?.encoding
      });
    } catch (error) {
      await this.logErrorAsync("writeFile", path, error as Error);
      throw error;
    }
  }

  async mkdir(path: string, options?: any): Promise<string | undefined> {
    const startTime = Date.now();
    try {
      const result = await originalFsPromises.mkdir(path, options);
      await this.logOperationAsync('mkdir', path, {
        recursive: options?.recursive,
        duration: Date.now() - startTime
      });
      return result;
    } catch (error) {
      await this.logErrorAsync('mkdir', path, error as Error);
      throw error;
    }
  }

  async readdir(path: string, options?: any): Promise<string[] | Buffer[] | originalFs.Dirent[]> {
    const startTime = Date.now();
    try {
      const result = await originalFsPromises.readdir(path, options);
      await this.logOperationAsync('readdir', path, {
        count: Array.isArray(result) ? result.length : 0,
        duration: Date.now() - startTime
      });
      return result;
    } catch (error) {
      await this.logErrorAsync('readdir', path, error as Error);
      throw error;
    }
  }

  async stat(path: string, options?: any): Promise<originalFs.Stats> {
    const startTime = Date.now();
    try {
      const stats = await originalFsPromises.stat(path, options);
      await this.logOperationAsync('stat', path, {
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        size: stats.size,
        duration: Date.now() - startTime
      });
      return stats;
    } catch (error) {
      await this.logErrorAsync('stat', path, error as Error);
      throw error;
    }
  }

  async unlink(path: string): Promise<void> {
    const startTime = Date.now();
    try {
      await originalFsPromises.unlink(path);
      await this.logOperationAsync('unlink', path, {
        duration: Date.now() - startTime
      });
    } catch (error) {
      await this.logErrorAsync('unlink', path, error as Error);
      throw error;
    }
  }
}

// Create singleton instances
const fsWrapper = new FileSystemWrapper();
const fsPromisesWrapper = new FileSystemPromisesWrapper();

// Export with same interface as fs module
export default fsWrapper;
export const promises = fsPromisesWrapper;

// Re-export all other fs functions and constants that don't need logging
export * from 'fs';