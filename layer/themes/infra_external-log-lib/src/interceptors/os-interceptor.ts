/**
 * Interceptor for os module
 * Monitors OS information access
 */

import * as originalOs from 'os';
import { BaseInterceptor, CallInfo, ValidationResult } from './base-interceptor';

export class OsInterceptor extends BaseInterceptor<typeof originalOs> {
  constructor(config = {}) {
    super('os', originalOs, config);
  }
  
  protected createInterceptor(): typeof originalOs {
    // OS module is mostly informational, minimal interception needed
    return {
      ...this.originalModule,
      
      // Wrap sensitive methods
      hostname: this.wrapMethod('os', "hostname", this.originalModule.hostname),
      userInfo: this.wrapMethod('os', "userInfo", this.originalModule.userInfo),
      networkInterfaces: this.wrapMethod('os', "networkInterfaces", this.originalModule.networkInterfaces),
      
      // Keep other methods as-is
      arch: this.originalModule.arch,
      cpus: this.originalModule.cpus,
      endianness: this.originalModule.endianness,
      freemem: this.originalModule.freemem,
      homedir: this.originalModule.homedir,
      loadavg: this.originalModule.loadavg,
      platform: this.originalModule.platform,
      release: this.originalModule.release,
      tmpdir: this.originalModule.tmpdir,
      totalmem: this.originalModule.totalmem,
      type: this.originalModule.type,
      uptime: this.originalModule.uptime,
      version: this.originalModule.version,
      constants: this.originalModule.constants,
      EOL: this.originalModule.EOL,
    };
  }
  
  protected async validateSpecific(info: CallInfo): Promise<ValidationResult> {
    // OS module operations are generally safe
    return { allowed: true };
  }
}