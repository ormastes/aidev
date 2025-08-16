/**
 * Interceptor for https module
 * Monitors and controls HTTPS requests and servers
 */

import * as originalHttps from 'node:https';
import { HttpInterceptor } from './http-interceptor';

export class HttpsInterceptor extends HttpInterceptor {
  constructor(config = {}) {
    super(config);
    this.originalModule = originalHttps as any;
  }
  
  protected createInterceptor(): typeof originalHttps {
    return {
      ...this.originalModule,
      
      request: this.wrapMethod('https', 'request', (this.originalModule as any).request),
      get: this.wrapMethod('https', 'get', (this.originalModule as any).get),
      createServer: this.wrapMethod('https', "createServer", (this.originalModule as any).createServer),
      
      // Keep classes and constants
      Agent: (this.originalModule as any).Agent,
      Server: (this.originalModule as any).Server,
      globalAgent: (this.originalModule as any).globalAgent,
    } as typeof originalHttps;
  }
}