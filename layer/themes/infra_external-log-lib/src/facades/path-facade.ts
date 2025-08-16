/**
 * Path Facade
 * Provides wrapped path module with logging and validation
 */

import * as pathOriginal from 'path';
import { globalConfig } from '../config';

interface CallRecord {
  method: string;
  args: any[];
  result: any;
  timestamp: Date;
  duration: number;
}

class PathFacade {
  private callHistory: CallRecord[] = [];

  private logCall(method: string, args: any[], result: any) {
    if (!globalConfig.enableLogging) return;

    const record: CallRecord = {
      method,
      args: [...args],
      result,
      timestamp: new Date(),
      duration: 0 // Path operations are synchronous, so duration is effectively 0
    };

    this.callHistory.push(record);

    if (globalConfig.enableConsoleLogging) {
      console.log(`[PATH] ${method}(${args.join(', ')}) => ${result}`);
    }
  }

  private validatePath(path: string): void {
    if (!globalConfig.enableValidation) return;

    // Check for null bytes
    if (path.includes('\0')) {
      throw new Error('Path contains null bytes');
    }

    // Check for extremely long paths
    if (path.length > 4096) {
      throw new Error('Path exceeds maximum length');
    }
  }

  private wrapMethod<T extends (...args: any[]) => any>(
    methodName: string,
    originalMethod: T
  ): T {
    const facade = this;

    return (function(...args: any[]) {
      // Validate string arguments
      args.forEach(arg => {
        if (typeof arg === 'string' && globalConfig.enableSecurity) {
          facade.validatePath(arg);
        }
      });

      const result = originalMethod.apply(this, args);
      facade.logCall(methodName, args, result);
      return result;
    }) as T;
  }

  createPathProxy(): typeof pathOriginal {
    const facade = this;

    return new Proxy(pathOriginal, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);

        // Skip non-functions and constants
        if (typeof value !== 'function') {
          return value;
        }

        // Skip if interception is disabled
        if (!globalConfig.enableInterception) {
          return value;
        }

        const methodName = String(prop);
        return facade.wrapMethod(methodName, value);
      }
    });
  }

  getCallHistory(): CallRecord[] {
    return [...this.callHistory];
  }

  clearCallHistory(): void {
    this.callHistory = [];
  }
}

// Create singleton instance
const pathFacade = new PathFacade();

// Export wrapped version
export const path = pathFacade.createPathProxy();

// Export utility functions for testing
export const getPathCallHistory = () => pathFacade.getCallHistory();
export const clearPathCallHistory = () => pathFacade.clearCallHistory();

// Also export as default
export default path;