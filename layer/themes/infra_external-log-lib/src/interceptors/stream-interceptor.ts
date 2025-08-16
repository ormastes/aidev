/**
 * Interceptor for stream module
 * Monitors stream operations
 */

import * as originalStream from 'node:stream';
import { BaseInterceptor, CallInfo, ValidationResult } from './base-interceptor';

export class StreamInterceptor extends BaseInterceptor<typeof originalStream> {
  constructor(config = {}) {
    super('stream', originalStream, config);
  }
  
  protected createInterceptor(): typeof originalStream {
    // Stream module is mostly classes, minimal interception needed
    return {
      ...this.originalModule,
      
      // Wrap pipeline for monitoring
      pipeline: this.wrapMethod('stream', "pipeline", this.originalModule.pipeline),
      finished: this.wrapMethod('stream', "finished", this.originalModule.finished),
      
      // Keep classes as-is
      Readable: this.originalModule.Readable,
      Writable: this.originalModule.Writable,
      Transform: this.originalModule.Transform,
      Duplex: this.originalModule.Duplex,
      PassThrough: this.originalModule.PassThrough,
      Stream: this.originalModule.Stream,
    };
  }
  
  protected async validateSpecific(info: CallInfo): Promise<ValidationResult> {
    // Stream operations are generally safe
    return { allowed: true };
  }
}