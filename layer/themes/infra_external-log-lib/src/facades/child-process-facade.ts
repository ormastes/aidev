/**
 * Child Process Facade
 * Provides wrapped child_process module with security and logging
 */

import * as childProcessOriginal from 'child_process';
import { globalConfig } from '../config';

interface CallRecord {
  method: string;
  command: string;
  args: any[];
  timestamp: Date;
  pid?: number;
  error?: any;
  result?: any;
  duration: number;
}

class ChildProcessFacade {
  private callHistory: CallRecord[] = [];
  private blockedCommands: Set<string> = new Set([
    'rm -rf /',
    'format',
    'del /f /s /q',
    'dd if=/dev/zero',
    'mkfs',
    ':(){ :|:& };:' // Fork bomb
  ]);

  private logCall(method: string, command: string, args?: any[], pid?: number, error?: any) {
    if (!globalConfig.enableLogging) return;

    const record: CallRecord = {
      method,
      command,
      args: args || [],
      timestamp: new Date(),
      pid,
      error,
      duration: 0 // Child process spawning is async, duration tracked separately
    };

    this.callHistory.push(record);

    if (globalConfig.enableConsoleLogging) {
      console.log(`[CHILD_PROCESS] ${method}("${command}"${args ? `, ${JSON.stringify(args)}` : ''})${pid ? ` PID: ${pid}` : ''}${error ? ` ERROR: ${error}` : ''}`);
    }
  }

  private checkCommandSecurity(command: string): void {
    if (!globalConfig.enableSecurity) return;

    // Check for blocked commands
    for (const blocked of this.blockedCommands) {
      if (command.includes(blocked)) {
        throw new Error(`Blocked dangerous command: ${command}`);
      }
    }

    // Check for shell injection attempts
    const dangerousPatterns = [
      /;\s*rm\s+-rf/,
      /&&\s*rm/,
      /\|\s*dd\s+if=/,
      /`[^`]*rm[^`]*`/,
      /\$\([^)]*rm[^)]*\)/
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        throw new Error(`Potential command injection detected: ${command}`);
      }
    }
  }

  private wrapExecMethod<T extends (...args: any[]) => any>(
    methodName: string,
    originalMethod: T
  ): T {
    const facade = this;

    return (function(...args: any[]) {
      const command = args[0];
      
      if (typeof command === 'string') {
        try {
          facade.checkCommandSecurity(command);
        } catch (error) {
          facade.logCall(methodName, command, args.slice(1), undefined, error);
          throw error;
        }
      }

      const result = originalMethod.apply(this, args);
      
      // Log the execution
      if (result && typeof result === 'object' && 'pid' in result) {
        facade.logCall(methodName, command, args.slice(1), result.pid);
      } else {
        facade.logCall(methodName, command, args.slice(1));
      }

      return result;
    }) as T;
  }

  createChildProcessProxy(): typeof childProcessOriginal {
    const facade = this;

    return new Proxy(childProcessOriginal, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);

        // Skip non-functions
        if (typeof value !== "function") {
          return value;
        }

        // Skip if interception is disabled
        if (!globalConfig.enableInterception) {
          return value;
        }

        const methodName = String(prop);
        
        // Only wrap exec methods
        if (['exec', "execSync", "execFile", "execFileSync", 'spawn', "spawnSync", 'fork'].includes(methodName)) {
          return facade.wrapExecMethod(methodName, value);
        }

        return value;
      }
    });
  }

  getCallHistory(): CallRecord[] {
    return [...this.callHistory];
  }

  clearCallHistory(): void {
    this.callHistory = [];
  }

  addBlockedCommand(command: string): void {
    this.blockedCommands.add(command);
  }

  removeBlockedCommand(command: string): void {
    this.blockedCommands.delete(command);
  }
}

// Create singleton instance
const childProcessFacade = new ChildProcessFacade();

// Export wrapped version
export const childProcess = childProcessFacade.createChildProcessProxy();

// Export utility functions
export const getChildProcessCallHistory = () => childProcessFacade.getCallHistory();
export const clearChildProcessCallHistory = () => childProcessFacade.clearCallHistory();
export const addBlockedCommand = (cmd: string) => childProcessFacade.addBlockedCommand(cmd);
export const removeBlockedCommand = (cmd: string) => childProcessFacade.removeBlockedCommand(cmd);

export default childProcess;