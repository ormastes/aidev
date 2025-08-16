/**
 * Audited File System
 * 
 * Provides wrapped versions of Node.js fs module functions
 * with automatic auditing and validation through external-log-lib
 */

import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import { FileAccessAuditor, fileAccessAuditor } from '../file-access-auditor';
import { getFileAPI, FileType } from '../../pipe';

const fileAPI = getFileAPI();


/**
 * Audited fs module - drop-in replacement for Node.js fs
 * All operations are automatically audited and validated
 */
export class AuditedFS {
  private auditor: FileAccessAuditor;
  
  constructor(auditor: FileAccessAuditor = fileAccessAuditor) {
    this.auditor = auditor;
  }
  
  /**
   * Read file with auditing
   */
  async readFile(filePath: string, options?: any): Promise<Buffer | string> {
    const startTime = Date.now();
    
    try {
      // Audit the read operation
      await this.auditor.audit('read', filePath, { options });
      
      // Perform the actual read
      const data = await fsPromises.readFile(filePath, options);
      
      // Log successful read
      await this.auditor.audit('read', filePath, {
        options,
        size: Buffer.isBuffer(data) ? data.length : data.length,
        duration: Date.now() - startTime
      });
      
      return data;
    } catch (error) {
      // Log failed read
      await this.auditor.audit('read', filePath, {
        options,
        error: error.message,
        duration: Date.now() - startTime
      });
      throw error;
    }
  }
  
  /**
   * Read file synchronously with auditing
   */
  async readFileSync(filePath: string, options?: any): Buffer | string {
    const startTime = Date.now();
    
    try {
      // Audit the read operation (synchronous)
      this.auditor.audit('read', filePath, { options, sync: true });
      
      // Perform the actual read
      const data = fs.readFileSync(filePath, options);
      
      // Log successful read
      this.auditor.audit('read', filePath, {
        options,
        size: Buffer.isBuffer(data) ? data.length : data.length,
        duration: Date.now() - startTime,
        sync: true
      });
      
      return data;
    } catch (error) {
      // Log failed read
      this.auditor.audit('read', filePath, {
        options,
        error: error.message,
        duration: Date.now() - startTime,
        sync: true
      });
      throw error;
    }
  }
  
  /**
   * Write file with auditing and validation
   */
  async writeFile(filePath: string, data: any, options?: any): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Audit and validate the write operation
      const event = await this.auditor.audit('write', filePath, {
        options,
        size: Buffer.isBuffer(data) ? data.length : String(data).length
      });
      
      // Check if operation was authorized
      if (event.validation && !event.validation.authorized) {
        throw new Error(`Unauthorized write to ${filePath}: ${event.validation.violations?.join(', ')}`);
      }
      
      // Perform the actual write
      await fsPromises.writeFile(filePath, data, options);
      
      // Log successful write
      await this.auditor.audit('write', filePath, {
        options,
        size: Buffer.isBuffer(data) ? data.length : String(data).length,
        duration: Date.now() - startTime,
        success: true
      });
    } catch (error) {
      // Log failed write
      await this.auditor.audit('write', filePath, {
        options,
        error: error.message,
        duration: Date.now() - startTime,
        success: false
      });
      throw error;
    }
  }
  
  /**
   * Write file synchronously with auditing
   */
  async writeFileSync(filePath: string, data: any, options?: any): void {
    const startTime = Date.now();
    
    try {
      // Audit and validate the write operation
      this.auditor.audit('write', filePath, {
        options,
        size: Buffer.isBuffer(data) ? data.length : String(data).length,
        sync: true
      });
      
      // Perform the actual write
      await fileAPI.createFile(filePath, data, { type: FileType.TEMPORARY });
      
      // Log successful write
      this.auditor.audit('write', filePath, {
        options,
        size: Buffer.isBuffer(data) ? data.length : String(data).length,
        duration: Date.now() - startTime,
        success: true,
        sync: true
      });
    } catch (error) {
      // Log failed write
      this.auditor.audit('write', filePath, {
        options,
        error: error.message,
        duration: Date.now() - startTime,
        success: false,
        sync: true
      });
      throw error;
    }
  }
  
  /**
   * Append to file with auditing
   */
  async appendFile(filePath: string, data: any, options?: any): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Audit the append operation
      await this.auditor.audit('append', filePath, {
        options,
        size: Buffer.isBuffer(data) ? data.length : String(data).length
      });
      
      // Perform the actual append
      await fsPromises.appendFile(filePath, data, options);
      
      // Log successful append
      await this.auditor.audit('append', filePath, {
        options,
        size: Buffer.isBuffer(data) ? data.length : String(data).length,
        duration: Date.now() - startTime,
        success: true
      });
    } catch (error) {
      // Log failed append
      await this.auditor.audit('append', filePath, {
        options,
        error: error.message,
        duration: Date.now() - startTime,
        success: false
      });
      throw error;
    }
  }
  
  /**
   * Delete file with auditing
   */
  async unlink(filePath: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Audit and validate the delete operation
      const event = await this.auditor.audit('delete', filePath);
      
      // Check if operation was authorized
      if (event.validation && !event.validation.authorized) {
        throw new Error(`Unauthorized delete of ${filePath}: ${event.validation.violations?.join(', ')}`);
      }
      
      // Perform the actual delete
      await fsPromises.unlink(filePath);
      
      // Log successful delete
      await this.auditor.audit('delete', filePath, {
        duration: Date.now() - startTime,
        success: true
      });
    } catch (error) {
      // Log failed delete
      await this.auditor.audit('delete', filePath, {
        error: error.message,
        duration: Date.now() - startTime,
        success: false
      });
      throw error;
    }
  }
  
  /**
   * Create directory with auditing
   */
  async mkdir(dirPath: string, options?: any): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Audit and validate the mkdir operation
      const event = await this.auditor.audit('mkdir', dirPath, { options });
      
      // Check if operation was authorized
      if (event.validation && !event.validation.authorized) {
        throw new Error(`Unauthorized directory creation at ${dirPath}: ${event.validation.violations?.join(', ')}`);
      }
      
      // Perform the actual mkdir
      await fsPromises.mkdir(dirPath, options);
      
      // Log successful mkdir
      await this.auditor.audit('mkdir', dirPath, {
        options,
        duration: Date.now() - startTime,
        success: true
      });
    } catch (error) {
      // Log failed mkdir
      await this.auditor.audit('mkdir', dirPath, {
        options,
        error: error.message,
        duration: Date.now() - startTime,
        success: false
      });
      throw error;
    }
  }
  
  /**
   * Remove directory with auditing
   */
  async rmdir(dirPath: string, options?: any): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Audit and validate the rmdir operation
      const event = await this.auditor.audit('rmdir', dirPath, { options });
      
      // Check if operation was authorized
      if (event.validation && !event.validation.authorized) {
        throw new Error(`Unauthorized directory removal at ${dirPath}: ${event.validation.violations?.join(', ')}`);
      }
      
      // Perform the actual rmdir
      await fsPromises.rmdir(dirPath, options);
      
      // Log successful rmdir
      await this.auditor.audit('rmdir', dirPath, {
        options,
        duration: Date.now() - startTime,
        success: true
      });
    } catch (error) {
      // Log failed rmdir
      await this.auditor.audit('rmdir', dirPath, {
        options,
        error: error.message,
        duration: Date.now() - startTime,
        success: false
      });
      throw error;
    }
  }
  
  /**
   * Rename file/directory with auditing
   */
  async rename(oldPath: string, newPath: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Audit both paths
      await this.auditor.audit('rename', oldPath, { newPath });
      const event = await this.auditor.audit('rename', newPath, { oldPath });
      
      // Check if operation was authorized
      if (event.validation && !event.validation.authorized) {
        throw new Error(`Unauthorized rename from ${oldPath} to ${newPath}: ${event.validation.violations?.join(', ')}`);
      }
      
      // Perform the actual rename
      await fsPromises.rename(oldPath, newPath);
      
      // Log successful rename
      await this.auditor.audit('rename', oldPath, {
        newPath,
        duration: Date.now() - startTime,
        success: true
      });
    } catch (error) {
      // Log failed rename
      await this.auditor.audit('rename', oldPath, {
        newPath,
        error: error.message,
        duration: Date.now() - startTime,
        success: false
      });
      throw error;
    }
  }
  
  /**
   * Check file/directory existence with auditing
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      // Audit the exists check
      await this.auditor.audit('exists', filePath);
      
      // Check existence
      await fsPromises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Get file stats with auditing
   */
  async stat(filePath: string): Promise<fs.Stats> {
    const startTime = Date.now();
    
    try {
      // Audit the stat operation
      await this.auditor.audit('stat', filePath);
      
      // Get stats
      const stats = await fsPromises.stat(filePath);
      
      // Log stat details
      await this.auditor.audit('stat', filePath, {
        size: stats.size,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        modified: stats.mtime,
        duration: Date.now() - startTime
      });
      
      return stats;
    } catch (error) {
      // Log failed stat
      await this.auditor.audit('stat', filePath, {
        error: error.message,
        duration: Date.now() - startTime
      });
      throw error;
    }
  }
  
  /**
   * Change file permissions with auditing
   */
  async chmod(filePath: string, mode: number | string): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Audit and validate the chmod operation
      const event = await this.auditor.audit('chmod', filePath, { mode });
      
      // Check if operation was authorized
      if (event.validation && !event.validation.authorized) {
        throw new Error(`Unauthorized chmod on ${filePath}: ${event.validation.violations?.join(', ')}`);
      }
      
      // Perform the actual chmod
      await fsPromises.chmod(filePath, mode);
      
      // Log successful chmod
      await this.auditor.audit('chmod', filePath, {
        mode,
        duration: Date.now() - startTime,
        success: true
      });
    } catch (error) {
      // Log failed chmod
      await this.auditor.audit('chmod', filePath, {
        mode,
        error: error.message,
        duration: Date.now() - startTime,
        success: false
      });
      throw error;
    }
  }
  
  /**
   * Watch file/directory with auditing
   */
  async watch(filePath: string, options?: any, listener?: any): fs.FSWatcher {
    // Audit the watch operation
    this.auditor.audit('watch', filePath, { options });
    
    // Create watcher with wrapped listener
    const watcher = fs.watch(filePath, options, (eventType: string, filename: string) => {
      // Audit watch events
      this.auditor.audit('watch', path.join(filePath, filename || ''), {
        eventType,
        filename
      });
      
      // Call original listener if provided
      if (listener) {
        listener(eventType, filename);
      }
    });
    
    return watcher;
  }
  
  /**
   * Create a read stream with auditing
   */
  async createReadStream(filePath: string, options?: any): fs.ReadStream {
    // Audit the stream creation
    this.auditor.audit('read', filePath, { stream: true, options });
    
    const stream = fs.createReadStream(filePath, options);
    let bytesRead = 0;
    
    // Track bytes read
    stream.on('data', (chunk) => {
      bytesRead += chunk.length;
    });
    
    // Log completion
    stream.on('end', () => {
      this.auditor.audit('read', filePath, {
        stream: true,
        bytesRead,
        completed: true
      });
    });
    
    // Log errors
    stream.on('error', (error) => {
      this.auditor.audit('read', filePath, {
        stream: true,
        bytesRead,
        error: error.message
      });
    });
    
    return stream;
  }
  
  /**
   * Create a write stream with auditing
   */
  async createWriteStream(filePath: string, options?: any): fs.WriteStream {
    // Audit and validate the stream creation
    this.auditor.audit('write', filePath, { stream: true, options }).then(event => {
      if (event.validation && !event.validation.authorized) {
        throw new Error(`Unauthorized write stream to ${filePath}: ${event.validation.violations?.join(', ')}`);
      }
    });
    
    const stream = fileAPI.createWriteStream(filePath, options);
    let bytesWritten = 0;
    
    // Track bytes written
    stream.on('finish', () => {
      this.auditor.audit('write', filePath, {
        stream: true,
        bytesWritten,
        completed: true
      });
    });
    
    // Track write operations
    const originalWrite = stream.write.bind(stream);
    stream.write = (chunk: any, ...args: any[]): boolean => {
      if (chunk) {
        bytesWritten += Buffer.isBuffer(chunk) ? chunk.length : String(chunk).length;
      }
      return originalWrite(chunk, ...args);
    };
    
    // Log errors
    stream.on('error', (error) => {
      this.auditor.audit('write', filePath, {
        stream: true,
        bytesWritten,
        error: error.message
      });
    });
    
    return stream;
  }
}

// Create singleton instance
export const auditedFS = new AuditedFS();

// Export as default
export default auditedFS;