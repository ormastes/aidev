/**
 * Interceptor for http module
 * Monitors and controls HTTP requests and servers
 */

import * as originalHttp from '../utils/http-wrapper';
import { BaseInterceptor, CallInfo, ValidationResult } from './base-interceptor';

export class HttpInterceptor extends BaseInterceptor<typeof originalHttp> {
  private readonly blockedHosts = [
    '169.254.169.254', // AWS metadata endpoint
    'metadata.google.internal', // GCP metadata endpoint
    "localhost",
    '127.0.0.1',
    '0.0.0.0'
  ];
  
  constructor(config = {}) {
    super('http', originalHttp, config);
  }
  
  protected createInterceptor(): typeof originalHttp {
    const self = this;
    
    return {
      ...this.originalModule,
      
      request: this.wrapMethod('http', 'request', this.originalModule.request),
      get: this.wrapMethod('http', 'get', this.originalModule.get),
      createServer: this.wrapMethod('http', "createServer", this.originalModule.createServer),
      
      // Keep classes and constants
      Agent: this.originalModule.Agent,
      ClientRequest: this.originalModule.ClientRequest,
      IncomingMessage: this.originalModule.IncomingMessage,
      OutgoingMessage: this.originalModule.OutgoingMessage,
      Server: this.originalModule.Server,
      ServerResponse: this.originalModule.ServerResponse,
      METHODS: this.originalModule.METHODS,
      STATUS_CODES: this.originalModule.STATUS_CODES,
      globalAgent: this.originalModule.globalAgent,
      maxHeaderSize: this.originalModule.maxHeaderSize,
    };
  }
  
  protected async validateSpecific(info: CallInfo): Promise<ValidationResult> {
    if (info.method === 'request' || info.method === 'get') {
      const options = info.args[0];
      
      if (typeof options === 'string') {
        // URL string
        try {
          const url = new URL(options);
          if (this.isBlockedHost(url.hostname)) {
            return {
              allowed: false,
              reason: `Blocked host: ${url.hostname}`
            };
          }
        } catch {
          // Invalid URL
        }
      } else if (options && typeof options === 'object') {
        // Options object
        const host = options.host || options.hostname;
        if (host && this.isBlockedHost(host)) {
          return {
            allowed: false,
            reason: `Blocked host: ${host}`
          };
        }
      }
    }
    
    return { allowed: true };
  }
  
  private isBlockedHost(host: string): boolean {
    if (!this.config.blockDangerous) return false;
    
    const normalizedHost = host.toLowerCase().trim();
    return this.blockedHosts.some(blocked => 
      normalizedHost === blocked || normalizedHost.startsWith(blocked + ':')
    );
  }
}