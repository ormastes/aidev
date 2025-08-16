/**
 * Base interceptor for all external modules
 * Provides common functionality for intercepting and logging external calls
 */

import { EventLogger } from '../loggers/EventLogger';
import { FileViolationPreventer } from '../validators/FileViolationPreventer';

export interface InterceptorConfig {
  enabled: boolean;
  logCalls: boolean;
  validateCalls: boolean;
  blockDangerous: boolean;
  whitelist?: string[];
  blacklist?: string[];
}

export interface CallInfo {
  module: string;
  method: string;
  args: any[];
  timestamp: number;
  stack?: string;
}

export interface ValidationResult {
  allowed: boolean;
  reason?: string;
  modified?: any[];
}

export abstract class BaseInterceptor<T = any> {
  protected originalModule: T;
  protected interceptedModule: T;
  protected logger: EventLogger;
  protected preventer: FileViolationPreventer;
  protected config: InterceptorConfig;
  protected callHistory: CallInfo[] = [];
  
  constructor(
    moduleName: string,
    originalModule: T,
    config: Partial<InterceptorConfig> = {}
  ) {
    this.originalModule = originalModule;
    this.logger = new EventLogger();
    this.preventer = FileViolationPreventer.getInstance();
    
    this.config = {
      enabled: true,
      logCalls: true,
      validateCalls: true,
      blockDangerous: true,
      ...config
    };
    
    if (this.config.enabled) {
      this.interceptedModule = this.createInterceptor();
    } else {
      this.interceptedModule = originalModule;
    }
  }
  
  /**
   * Create the intercepted version of the module
   */
  protected abstract createInterceptor(): T;
  
  /**
   * Validate a method call before execution
   */
  protected async validateCall(info: CallInfo): Promise<ValidationResult> {
    if (!this.config.validateCalls) {
      return { allowed: true };
    }
    
    // Check blacklist
    if (this.config.blacklist?.includes(info.method)) {
      return {
        allowed: false,
        reason: `Method ${info.method} is blacklisted`
      };
    }
    
    // Check whitelist if defined
    if (this.config.whitelist && !this.config.whitelist.includes(info.method)) {
      return {
        allowed: false,
        reason: `Method ${info.method} is not whitelisted`
      };
    }
    
    // Module-specific validation
    return this.validateSpecific(info);
  }
  
  /**
   * Module-specific validation logic
   */
  protected abstract validateSpecific(info: CallInfo): Promise<ValidationResult>;
  
  /**
   * Log a method call
   */
  protected logCall(info: CallInfo, result?: any, error?: Error): void {
    if (!this.config.logCalls) return;
    
    this.callHistory.push(info);
    
    const logEntry = {
      type: 'external-call' as const,
      module: info.module,
      method: info.method,
      args: this.sanitizeArgs(info.args),
      result: result ? this.sanitizeResult(result) : undefined,
      error: error?.message,
      timestamp: info.timestamp,
      duration: Date.now() - info.timestamp
    };
    
    if (error) {
      this.logger.error('External call failed', logEntry);
    } else {
      this.logger.debug('External call', logEntry);
    }
  }
  
  /**
   * Sanitize arguments for logging (remove sensitive data)
   */
  protected sanitizeArgs(args: any[]): any[] {
    return args.map(arg => {
      if (typeof arg === 'string' && arg.length > 1000) {
        return `[String ${arg.length} chars]`;
      }
      if (Buffer.isBuffer(arg)) {
        return `[Buffer ${arg.length} bytes]`;
      }
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.parse(JSON.stringify(arg, (key, value) => {
            if (key.toLowerCase().includes('password') ||
                key.toLowerCase().includes('secret') ||
                key.toLowerCase().includes('token') ||
                key.toLowerCase().includes('key')) {
              return '[REDACTED]';
            }
            return value;
          }));
        } catch {
          return '[Complex Object]';
        }
      }
      return arg;
    });
  }
  
  /**
   * Sanitize result for logging
   */
  protected sanitizeResult(result: any): any {
    if (result === undefined || result === null) return result;
    if (typeof result === 'string' && result.length > 1000) {
      return `[String ${result.length} chars]`;
    }
    if (Buffer.isBuffer(result)) {
      return `[Buffer ${result.length} bytes]`;
    }
    if (typeof result === 'object') {
      return '[Object]';
    }
    return result;
  }
  
  /**
   * Wrap a method with interception logic
   */
  protected wrapMethod(
    moduleName: string,
    methodName: string,
    originalMethod: Function
  ): Function {
    const self = this;
    
    return function(...args: any[]) {
      const info: CallInfo = {
        module: moduleName,
        method: methodName,
        args,
        timestamp: Date.now(),
        stack: new Error().stack
      };
      
      // Synchronous validation for now (can be made async if needed)
      const validationResult = self.validateCallSync(info);
      
      if (!validationResult.allowed) {
        const error = new Error(`Call blocked: ${validationResult.reason}`);
        self.logCall(info, undefined, error);
        throw error;
      }
      
      // Use modified args if provided
      const finalArgs = validationResult.modified || args;
      
      try {
        const result = originalMethod.apply(this, finalArgs);
        
        if (result && typeof result.then === 'function') {
          // Handle promises
          return result
            .then((res: any) => {
              self.logCall(info, res);
              return res;
            })
            .catch((err: Error) => {
              self.logCall(info, undefined, err);
              throw err;
            });
        }
        
        self.logCall(info, result);
        return result;
      } catch (error) {
        self.logCall(info, undefined, error as Error);
        throw error;
      }
    };
  }
  
  /**
   * Synchronous validation (for methods that can't be async)
   */
  protected validateCallSync(info: CallInfo): ValidationResult {
    if (!this.config.validateCalls) {
      return { allowed: true };
    }
    
    // Check blacklist
    if (this.config.blacklist?.includes(info.method)) {
      return {
        allowed: false,
        reason: `Method ${info.method} is blacklisted`
      };
    }
    
    // Check whitelist if defined
    if (this.config.whitelist && !this.config.whitelist.includes(info.method)) {
      return {
        allowed: false,
        reason: `Method ${info.method} is not whitelisted`
      };
    }
    
    return { allowed: true };
  }
  
  /**
   * Get the intercepted module
   */
  getModule(): T {
    return this.interceptedModule;
  }
  
  /**
   * Get the original module
   */
  getOriginal(): T {
    return this.originalModule;
  }
  
  /**
   * Get call history
   */
  getCallHistory(): CallInfo[] {
    return [...this.callHistory];
  }
  
  /**
   * Clear call history
   */
  clearHistory(): void {
    this.callHistory = [];
  }
  
  /**
   * Enable/disable interception
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<InterceptorConfig>): void {
    this.config = { ...this.config, ...config };
  }
}