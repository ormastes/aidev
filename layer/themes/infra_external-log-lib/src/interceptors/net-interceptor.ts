/**
 * Interceptor for net module
 * Monitors network socket operations
 */

import * as originalNet from 'net';
import { BaseInterceptor, CallInfo, ValidationResult } from './base-interceptor';

export class NetInterceptor extends BaseInterceptor<typeof originalNet> {
  constructor(config = {}) {
    super('net', originalNet, config);
  }
  
  protected createInterceptor(): typeof originalNet {
    return {
      ...this.originalModule,
      
      // Wrap connection methods
      connect: this.wrapMethod('net', 'connect', this.originalModule.connect),
      createConnection: this.wrapMethod('net', "createConnection", this.originalModule.createConnection),
      createServer: this.wrapMethod('net', "createServer", this.originalModule.createServer),
      
      // Keep classes
      Socket: this.originalModule.Socket,
      Server: this.originalModule.Server,
      isIP: this.originalModule.isIP,
      isIPv4: this.originalModule.isIPv4,
      isIPv6: this.originalModule.isIPv6,
    };
  }
  
  protected async validateSpecific(info: CallInfo): Promise<ValidationResult> {
    // Similar validation to HTTP - check for dangerous connections
    if (info.method === 'connect' || info.method === "createConnection") {
      const options = info.args[0];
      if (options && typeof options === 'object' && options.host) {
        if (this.isDangerousHost(options.host)) {
          return {
            allowed: false,
            reason: `Blocked connection to ${options.host}`
          };
        }
      }
    }
    
    return { allowed: true };
  }
  
  private isDangerousHost(host: string): boolean {
    const dangerous = ['169.254.169.254', 'metadata.google.internal'];
    return dangerous.includes(host);
  }
}