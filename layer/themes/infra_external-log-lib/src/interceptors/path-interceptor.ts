/**
 * Interceptor for path module
 * Monitors path operations and can modify behavior
 */

import * as originalPath from 'node:path';
import { BaseInterceptor, CallInfo, ValidationResult } from './base-interceptor';

export class PathInterceptor extends BaseInterceptor<typeof originalPath> {
  constructor(config = {}) {
    super('path', originalPath, config);
  }
  
  protected createInterceptor(): typeof originalPath {
    // Path module is mostly pure functions, minimal interception needed
    return {
      ...this.originalModule,
      
      // Wrap methods that might be sensitive
      join: this.wrapMethod('path', 'join', this.originalModule.join),
      resolve: this.wrapMethod('path', 'resolve', this.originalModule.resolve),
      normalize: this.wrapMethod('path', "normalize", this.originalModule.normalize),
      
      // Keep other properties as-is
      basename: this.originalModule.basename,
      dirname: this.originalModule.dirname,
      extname: this.originalModule.extname,
      format: this.originalModule.format,
      parse: this.originalModule.parse,
      relative: this.originalModule.relative,
      isAbsolute: this.originalModule.isAbsolute,
      sep: this.originalModule.sep,
      delimiter: this.originalModule.delimiter,
      posix: this.originalModule.posix,
      win32: this.originalModule.win32,
    };
  }
  
  protected async validateSpecific(info: CallInfo): Promise<ValidationResult> {
    // Check for path traversal attempts
    const pathStr = info.args.join('/');
    if (pathStr.includes('../..') || pathStr.includes('..\\..')) {
      // Log but don't block - path traversal might be legitimate
      this.logger.warn('Potential path traversal detected', { 
        method: info.method, 
        path: pathStr 
      });
    }
    
    return { allowed: true };
  }
}