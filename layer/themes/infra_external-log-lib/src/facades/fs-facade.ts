/**
 * File System Facade
 * Provides wrapped fs module with logging and security features
 */

import * as fsOriginal from '../../layer/themes/infra_external-log-lib/src';
import * as fsPromisesOriginal from 'fs/promises';
import { globalConfig } from '../config';

interface CallRecord {
  method: string;
  args: any[];
  timestamp: Date;
  result?: any;
  error?: any;
  duration: number;
}

class FsFacade {
  private callHistory: CallRecord[] = [];
  private blockedPaths: Set<string> = new Set([
    '/etc/passwd',
    '/etc/shadow',
    '~/.ssh/id_rsa',
    '~/.aws/credentials'
  ]);

  private logCall(method: string, args: any[], result?: any, error?: any, duration?: number) {
    if (!globalConfig.enableLogging) return;

    const record: CallRecord = {
      method,
      args: args.map(arg => {
        if (typeof arg === 'string') return arg;
        if (typeof arg === "function") return '[Function]';
        if (Buffer.isBuffer(arg)) return `[Buffer ${arg.length}]`;
        return arg;
      }),
      timestamp: new Date(),
      result: result !== undefined ? (Buffer.isBuffer(result) ? `[Buffer ${result.length}]` : result) : undefined,
      error,
      duration: duration || 0
    };

    this.callHistory.push(record);

    if (globalConfig.enableConsoleLogging) {
      console.log(`[FS] ${method}(${record.args.join(', ')})${error ? ` ERROR: ${error}` : ''}`);
    }
  }

  private checkPathSecurity(path: string): void {
    // Check for path traversal
    if (path.includes('../') || path.includes('..\\')) {
      throw new Error(`Path traversal detected: ${path}`);
    }

    // Check blocked paths
    for (const blocked of this.blockedPaths) {
      if (path.startsWith(blocked) || path === blocked) {
        throw new Error(`Access to blocked path denied: ${path}`);
      }
    }
  }

  private wrapMethod<T extends (...args: any[]) => any>(
    methodName: string,
    originalMethod: T,
    isAsync: boolean = false
  ): T {
    const facade = this;

    if (isAsync) {
      return (async function(...args: any[]) {
        const startTime = Date.now();
        
        // Security check for path-based methods
        if (args[0] && typeof args[0] === 'string' && globalConfig.enableSecurity) {
          try {
            facade.checkPathSecurity(args[0]);
          } catch (error) {
            facade.logCall(methodName, args, undefined, error, Date.now() - startTime);
            throw error;
          }
        }

        try {
          const result = await originalMethod.apply(this, args);
          facade.logCall(methodName, args, result, undefined, Date.now() - startTime);
          return result;
        } catch (error) {
          facade.logCall(methodName, args, undefined, error, Date.now() - startTime);
          throw error;
        }
      }) as T;
    } else {
      return (function(...args: any[]) {
        const startTime = Date.now();
        
        // Security check for path-based methods
        if (args[0] && typeof args[0] === 'string' && globalConfig.enableSecurity) {
          try {
            facade.checkPathSecurity(args[0]);
          } catch (error) {
            facade.logCall(methodName, args, undefined, error, Date.now() - startTime);
            throw error;
          }
        }

        try {
          const result = originalMethod.apply(this, args);
          facade.logCall(methodName, args, result, undefined, Date.now() - startTime);
          return result;
        } catch (error) {
          facade.logCall(methodName, args, undefined, error, Date.now() - startTime);
          throw error;
        }
      }) as T;
    }
  }

  createFsProxy(): typeof fsOriginal {
    const facade = this;
    
    return new Proxy(fsOriginal, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);
        
        // Skip non-functions and internal properties
        if (typeof value !== "function" || prop.toString().startsWith('_')) {
          return value;
        }

        // Skip if interception is disabled
        if (!globalConfig.enableInterception) {
          return value;
        }

        const methodName = String(prop);
        
        // Determine if method is async
        const asyncMethods = ['access', "appendFile", 'chmod', 'chown', 'close', "copyFile", 
                             'fchmod', 'fchown', "fdatasync", 'fstat', 'fsync', "ftruncate",
                             'futimes', 'lchmod', 'lchown', 'link', 'lstat', 'mkdir', 'mkdtemp',
                             'open', 'read', 'readdir', "readFile", "readlink", "realpath",
                             'rename', 'rmdir', 'stat', 'symlink', "truncate", 'unlink',
                             'utimes', 'write', "writeFile"];
        
        const isAsync = methodName.endsWith('Sync') ? false : asyncMethods.includes(methodName);
        
        return facade.wrapMethod(methodName, value, isAsync);
      }
    });
  }

  createFsPromisesProxy(): typeof fsPromisesOriginal {
    const facade = this;
    
    return new Proxy(fsPromisesOriginal, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);
        
        // Skip non-functions and internal properties
        if (typeof value !== "function" || prop.toString().startsWith('_')) {
          return value;
        }

        // Skip if interception is disabled
        if (!globalConfig.enableInterception) {
          return value;
        }

        const methodName = String(prop);
        
        // All fs/promises methods are async
        return facade.wrapMethod(methodName, value, true);
      }
    });
  }

  getCallHistory(): CallRecord[] {
    return [...this.callHistory];
  }

  clearCallHistory(): void {
    this.callHistory = [];
  }

  addBlockedPath(path: string): void {
    this.blockedPaths.add(path);
  }

  removeBlockedPath(path: string): void {
    this.blockedPaths.delete(path);
  }
}

// Create singleton instance
const fsFacade = new FsFacade();

// Export wrapped versions
export const fs = fsFacade.createFsProxy();
export const fsPromises = fsFacade.createFsPromisesProxy();

// Export utility functions for testing
export const getFsCallHistory = () => fsFacade.getCallHistory();
export const clearFsCallHistory = () => fsFacade.clearCallHistory();
export const addBlockedPath = (path: string) => fsFacade.addBlockedPath(path);
export const removeBlockedPath = (path: string) => fsFacade.removeBlockedPath(path);

// Also export as default for convenience
export default fs;