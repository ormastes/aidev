/**
 * FS Interceptor - Intercepts and redirects fs operations to FileCreationAPI
 * 
 * This module patches the native fs module to ensure all file operations
 * go through the FileCreationAPI. It can operate in enforcement or warning mode.
 */

import * as originalFs from 'fs';
import * as path from 'path';
import { FileCreationAPI, FileType } from '../file-manager/FileCreationAPI';

export enum InterceptMode {
  ENFORCE = 'enforce',   // Block direct fs usage
  WARN = 'warn',        // Log warnings but allow
  MONITOR = 'monitor',  // Silent monitoring
  BYPASS = 'bypass'     // Disable interception
}

export interface InterceptorConfig {
  mode: InterceptMode;
  allowedCallers?: string[];  // Whitelist specific modules
  logFile?: string;
  throwOnViolation?: boolean;
}

class FSInterceptor {
  private static instance: FSInterceptor;
  private fileAPI: FileCreationAPI;
  private config: InterceptorConfig;
  private violations: Map<string, number> = new Map();
  private originalMethods: Map<string, Function> = new Map();
  private initialized = false;

  private constructor(config?: Partial<InterceptorConfig>) {
    this.config = {
      mode: InterceptMode.WARN,
      allowedCallers: [
        'FileCreationAPI',
        'MCPIntegratedFileManager',
        'FileViolationPreventer',
        'node_modules',
        'test-setup'
      ],
      logFile: 'logs/fs-violations.log',
      throwOnViolation: false,
      ...config
    };

    this.fileAPI = new FileCreationAPI(process.cwd(), false);
  }

  static getInstance(config?: Partial<InterceptorConfig>): FSInterceptor {
    if (!FSInterceptor.instance) {
      FSInterceptor.instance = new FSInterceptor(config);
    }
    return FSInterceptor.instance;
  }

  /**
   * Initialize the interceptor and patch fs methods
   */
  initialize(): void {
    if (this.initialized || this.config.mode === InterceptMode.BYPASS) {
      return;
    }

    this.patchFSMethods();
    this.initialized = true;

    console.log(`[FSInterceptor] Initialized in ${this.config.mode} mode`);
  }

  /**
   * Patch fs methods to intercept file operations
   */
  private patchFSMethods(): void {
    // Store original methods
    this.originalMethods.set('writeFile', originalFs.writeFile);
    this.originalMethods.set('writeFileSync', originalFs.writeFileSync);
    this.originalMethods.set('appendFile', originalFs.appendFile);
    this.originalMethods.set('appendFileSync', originalFs.appendFileSync);
    this.originalMethods.set('mkdir', originalFs.mkdir);
    this.originalMethods.set('mkdirSync', originalFs.mkdirSync);

    // Patch async writeFile
    (originalFs as any).writeFile = this.createInterceptor(
      'writeFile',
      async (filePath: string, data: any, options: any) => {
        return await this.fileAPI.createFile(filePath, data, {
          type: this.detectFileType(filePath),
          encoding: options?.encoding
        });
      }
    );

    // Patch sync writeFile
    (originalFs as any).writeFileSync = this.createSyncInterceptor(
      'writeFileSync',
      (filePath: string, data: any, options: any) => {
        // For sync operations, we need to use the original for now
        // but log the violation
        this.logViolation('writeFileSync', filePath);
        return this.originalMethods.get('writeFileSync')!(filePath, data, options);
      }
    );

    // Patch promises.writeFile
    if (originalFs.promises) {
      const originalPromiseWriteFile = originalFs.promises.writeFile;
      (originalFs.promises as any).writeFile = this.createAsyncInterceptor(
        'promises.writeFile',
        async (filePath: string, data: any, options: any) => {
          return await this.fileAPI.createFile(filePath, data, {
            type: this.detectFileType(filePath),
            encoding: options?.encoding
          });
        }
      );
    }

    // Patch mkdir operations
    (originalFs as any).mkdir = this.createInterceptor(
      'mkdir',
      async (dirPath: string, options: any) => {
        return await this.fileAPI.createDirectory(dirPath);
      }
    );

    (originalFs as any).mkdirSync = this.createSyncInterceptor(
      'mkdirSync',
      (dirPath: string, options: any) => {
        this.logViolation('mkdirSync', dirPath);
        return this.originalMethods.get('mkdirSync')!(dirPath, options);
      }
    );
  }

  /**
   * Create an interceptor for async methods
   */
  private createInterceptor(methodName: string, replacement: Function): Function {
    const self = this;
    return function(...args: any[]) {
      const filePath = args[0];
      const callback = args[args.length - 1];
      
      if (!self.shouldIntercept(methodName, filePath)) {
        return self.originalMethods.get(methodName)!(...args);
      }

      if (self.config.mode === InterceptMode.ENFORCE) {
        // Use FileCreationAPI
        replacement(filePath, args[1], args[2])
          .then((result: any) => {
            if (typeof callback === 'function') {
              callback(null, result);
            }
          })
          .catch((error: any) => {
            if (typeof callback === 'function') {
              callback(error);
            }
          });
      } else {
        // Log and pass through
        self.logViolation(methodName, filePath);
        return self.originalMethods.get(methodName)!(...args);
      }
    };
  }

  /**
   * Create an interceptor for sync methods
   */
  private createSyncInterceptor(methodName: string, handler: Function): Function {
    const self = this;
    return function(...args: any[]) {
      const filePath = args[0];
      
      if (!self.shouldIntercept(methodName, filePath)) {
        return self.originalMethods.get(methodName)!(...args);
      }

      return handler(...args);
    };
  }

  /**
   * Create an interceptor for promise-based methods
   */
  private createAsyncInterceptor(methodName: string, replacement: Function): Function {
    const self = this;
    return async function(...args: any[]) {
      const filePath = args[0];
      
      if (!self.shouldIntercept(methodName, filePath)) {
        return originalFs.promises.writeFile(...args);
      }

      if (self.config.mode === InterceptMode.ENFORCE) {
        return replacement(...args);
      } else {
        self.logViolation(methodName, filePath);
        return originalFs.promises.writeFile(...args);
      }
    };
  }

  /**
   * Check if we should intercept this call
   */
  private shouldIntercept(method: string, filePath: string): boolean {
    if (this.config.mode === InterceptMode.BYPASS) {
      return false;
    }

    // Check if caller is whitelisted
    const stack = new Error().stack;
    if (stack && this.config.allowedCallers) {
      for (const allowed of this.config.allowedCallers) {
        if (stack.includes(allowed)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Log a violation
   */
  private logViolation(method: string, filePath: string): void {
    const key = `${method}:${filePath}`;
    const count = (this.violations.get(key) || 0) + 1;
    this.violations.set(key, count);

    if (this.config.mode === InterceptMode.WARN) {
      const caller = this.getCallerInfo();
      console.warn(
        `[FSInterceptor] Direct fs.${method} usage detected:\n` +
        `  File: ${filePath}\n` +
        `  Caller: ${caller}\n` +
        `  Use FileCreationAPI instead`
      );
    }

    if (this.config.throwOnViolation) {
      throw new Error(
        `Direct fs.${method} usage not allowed. Use FileCreationAPI for: ${filePath}`
      );
    }
  }

  /**
   * Get caller information from stack
   */
  private getCallerInfo(): string {
    const stack = new Error().stack;
    if (!stack) return 'unknown';
    
    const lines = stack.split('\n');
    // Find the first line that's not this interceptor
    for (const line of lines.slice(3)) {
      if (!line.includes('fs-interceptor') && !line.includes('FSInterceptor')) {
        const match = line.match(/at\s+(.+?)\s+\((.+?)\)/);
        if (match) {
          return `${match[1]} (${match[2]})`;
        }
        return line.trim();
      }
    }
    
    return 'unknown';
  }

  /**
   * Detect file type from path
   */
  private detectFileType(filePath: string): FileType {
    const ext = path.extname(filePath);
    const dir = path.dirname(filePath);

    if (dir.includes('gen/doc')) return FileType.DOCUMENT;
    if (dir.includes('temp')) return FileType.TEMPORARY;
    if (dir.includes('logs')) return FileType.LOG;
    if (dir.includes('test')) return FileType.TEST;
    if (dir.includes('src')) return FileType.SOURCE;
    if (dir.includes('scripts')) return FileType.SCRIPT;
    if (dir.includes('config')) return FileType.CONFIG;

    if (filePath.includes('report')) return FileType.REPORT;
    if (['.md', '.txt'].includes(ext)) return FileType.DOCUMENT;
    if (['.log'].includes(ext)) return FileType.LOG;
    if (['.json', '.yaml', '.yml'].includes(ext)) return FileType.DATA;

    return FileType.TEMPORARY;
  }

  /**
   * Get violation statistics
   */
  getViolations(): Map<string, number> {
    return new Map(this.violations);
  }

  /**
   * Clear violations
   */
  clearViolations(): void {
    this.violations.clear();
  }

  /**
   * Restore original fs methods
   */
  restore(): void {
    if (!this.initialized) return;

    for (const [method, original] of this.originalMethods) {
      (originalFs as any)[method] = original;
    }

    if (originalFs.promises && this.originalMethods.has('promises.writeFile')) {
      (originalFs.promises as any).writeFile = this.originalMethods.get('promises.writeFile');
    }

    this.initialized = false;
    console.log('[FSInterceptor] Restored original fs methods');
  }

  /**
   * Generate violation report
   */
  generateReport(): string {
    const lines: string[] = [];
    lines.push('FS Interceptor Violation Report');
    lines.push('=' .repeat(40));
    lines.push(`Mode: ${this.config.mode}`);
    lines.push(`Total Violations: ${this.violations.size}\n`);

    const sorted = Array.from(this.violations.entries())
      .sort((a, b) => b[1] - a[1]);

    for (const [key, count] of sorted) {
      const [method, file] = key.split(':');
      lines.push(`${count}x ${method}: ${file}`);
    }

    return lines.join('\n');
  }
}

// Auto-initialize in development
if (process.env.NODE_ENV !== 'production' && process.env.ENFORCE_FILE_API === 'true') {
  const interceptor = FSInterceptor.getInstance({
    mode: InterceptMode.WARN
  });
  interceptor.initialize();
}

export { FSInterceptor };
export default FSInterceptor;