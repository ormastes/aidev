/**
 * Network Interceptor
 * Wraps and logs all network connections (HTTP/HTTPS/TCP/UDP)
 */

import { http } from '../../../../../../../../infra_external-log-lib/src';
import { https } from '../../../../../../../../infra_external-log-lib/src';
import { net } from '../../../../../../../../infra_external-log-lib/src';
import * as dgram from 'dgram';
import * as tls from 'tls';
import * as dns from 'dns';
import * as url from 'url';
import { EventEmitter } from '../../../../../../../../infra_external-log-lib/src';
import { SystemMetricsLogger } from './system-metrics-logger';

export interface NetworkLog {
  id: string;
  timestamp: Date;
  type: 'http' | 'https' | 'tcp' | 'udp' | 'dns' | 'tls';
  direction: 'outbound' | 'inbound';
  method?: string;
  host?: string;
  port?: number;
  path?: string;
  headers?: any;
  statusCode?: number;
  bytesRead: number;
  bytesWritten: number;
  duration?: number;
  error?: string;
  metadata?: any;
}

export class NetworkInterceptor extends EventEmitter {
  private static instance: NetworkInterceptor;
  private logs: NetworkLog[] = [];
  private activeConnections: Map<string, NetworkLog> = new Map();
  private interceptEnabled: boolean = false;
  private metricsLogger?: SystemMetricsLogger;

  // Store original methods
  private originals = {
    http: {
      request: http.request,
      get: http.get
    },
    https: {
      request: https.request,
      get: https.get
    },
    net: {
      connect: net.connect,
      createConnection: net.createConnection,
      Socket: net.Socket
    },
    tls: {
      connect: tls.connect
    },
    dgram: {
      createSocket: dgram.createSocket
    },
    dns: {
      lookup: dns.lookup,
      resolve: dns.resolve,
      resolve4: dns.resolve4,
      resolve6: dns.resolve6
    }
  };

  private constructor() {
    super();
  }

  static getInstance(): NetworkInterceptor {
    if (!NetworkInterceptor.instance) {
      NetworkInterceptor.instance = new NetworkInterceptor();
    }
    return NetworkInterceptor.instance;
  }

  /**
   * Enable network interception
   */
  enable(options: { metricsLogger?: SystemMetricsLogger } = {}): void {
    if (this.interceptEnabled) return;
    
    this.metricsLogger = options.metricsLogger;
    this.interceptEnabled = true;

    // Patch HTTP/HTTPS
    this.patchHTTP();
    this.patchHTTPS();
    
    // Patch TCP/TLS
    this.patchNet();
    this.patchTLS();
    
    // Patch UDP
    this.patchDgram();
    
    // Patch DNS
    this.patchDNS();

    this.emit('enabled');
  }

  /**
   * Disable network interception
   */
  disable(): void {
    if (!this.interceptEnabled) return;

    // Restore HTTP/HTTPS
    http.request = this.originals.http.request;
    http.get = this.originals.http.get;
    https.request = this.originals.https.request;
    https.get = this.originals.https.get;

    // Restore net
    net.connect = this.originals.net.connect;
    net.createConnection = this.originals.net.createConnection;

    // Restore TLS
    tls.connect = this.originals.tls.connect;

    // Restore dgram
    dgram.createSocket = this.originals.dgram.createSocket;

    // Restore DNS
    dns.lookup = this.originals.dns.lookup;
    dns.resolve = this.originals.dns.resolve;
    dns.resolve4 = this.originals.dns.resolve4;
    dns.resolve6 = this.originals.dns.resolve6;

    this.interceptEnabled = false;
    this.emit('disabled');
  }

  /**
   * Patch HTTP module
   */
  private patchHTTP(): void {
    const self = this;

    // Patch http.request
    (http as any).request = function(...args: any[]): http.ClientRequest {
      const [options, callback] = self.parseHttpArgs(args);
      const log = self.createHttpLog('http', options);
      
      const req = self.originals.http.request.apply(http, args) as http.ClientRequest;
      return self.wrapHttpRequest(req, log, callback);
    };

    // Patch http.get
    (http as any).get = function(...args: any[]): http.ClientRequest {
      const [options, callback] = self.parseHttpArgs(args);
      const log = self.createHttpLog('http', options);
      
      const req = self.originals.http.get.apply(http, args) as http.ClientRequest;
      return self.wrapHttpRequest(req, log, callback);
    };
  }

  /**
   * Patch HTTPS module
   */
  private patchHTTPS(): void {
    const self = this;

    // Patch https.request
    (https as any).request = function(...args: any[]): http.ClientRequest {
      const [options, callback] = self.parseHttpArgs(args);
      const log = self.createHttpLog('https', options);
      
      const req = self.originals.https.request.apply(https, args) as http.ClientRequest;
      return self.wrapHttpRequest(req, log, callback);
    };

    // Patch https.get
    (https as any).get = function(...args: any[]): http.ClientRequest {
      const [options, callback] = self.parseHttpArgs(args);
      const log = self.createHttpLog('https', options);
      
      const req = self.originals.https.get.apply(https, args) as http.ClientRequest;
      return self.wrapHttpRequest(req, log, callback);
    };
  }

  /**
   * Patch net module for TCP connections
   */
  private patchNet(): void {
    const self = this;

    // Patch net.connect and net.createConnection
    const patchConnect = (original: any) => {
      return function(...args: any[]): net.Socket {
        const options = self.parseNetArgs(args);
        const log = self.createTcpLog(options);
        
        const socket = original.apply(net, args) as net.Socket;
        return self.wrapSocket(socket, log);
      };
    };

    (net as any).connect = patchConnect(this.originals.net.connect);
    (net as any).createConnection = patchConnect(this.originals.net.createConnection);

    // Patch Socket constructor
    const OriginalSocket = this.originals.net.Socket;
    (net as any).Socket = class extends OriginalSocket {
      constructor(...args: any[]) {
        super(...args);
        const log = self.createTcpLog({ host: 'unknown', port: 0 });
        self.wrapSocket(this, log);
      }
    };
  }

  /**
   * Patch TLS module
   */
  private patchTLS(): void {
    const self = this;

    (tls as any).connect = function(...args: any[]): tls.TLSSocket {
      const options = self.parseNetArgs(args);
      const log = self.createTcpLog({ ...options, tls: true });
      
      const socket = self.originals.tls.connect.apply(tls, args) as tls.TLSSocket;
      return self.wrapSocket(socket, log) as tls.TLSSocket;
    };
  }

  /**
   * Patch dgram module for UDP
   */
  private patchDgram(): void {
    const self = this;

    (dgram as any).createSocket = function(...args: any[]): dgram.Socket {
      const socket = self.originals.dgram.createSocket.apply(dgram, args) as dgram.Socket;
      
      const log: NetworkLog = {
        id: self.generateId(),
        timestamp: new Date(),
        type: 'udp',
        direction: 'outbound',
        bytesRead: 0,
        bytesWritten: 0
      };

      // Wrap send
      const originalSend = socket.send.bind(socket);
      socket.send = function(...sendArgs: any[]): void {
        const buffer = sendArgs[0];
        log.bytesWritten += Buffer.isBuffer(buffer) ? buffer.length : Buffer.byteLength(buffer);
        self.emit('network', { ...log, event: 'send' });
        return originalSend(...sendArgs);
      };

      // Monitor messages
      socket.on('message', (msg) => {
        log.bytesRead += msg.length;
        self.emit('network', { ...log, event: 'message' });
      });

      self.activeConnections.set(log.id, log);
      return socket;
    };
  }

  /**
   * Patch DNS module
   */
  private patchDNS(): void {
    const self = this;

    const wrapDnsMethod = (method: string, original: any) => {
      return function(...args: any[]): any {
        const hostname = args[0];
        const startTime = Date.now();
        
        const log: NetworkLog = {
          id: self.generateId(),
          timestamp: new Date(),
          type: 'dns',
          direction: 'outbound',
          host: hostname,
          method,
          bytesRead: 0,
          bytesWritten: hostname.length
        };

        // Wrap callback
        const callback = args[args.length - 1];
        if (typeof callback === 'function') {
          args[args.length - 1] = function(err: any, ...results: any[]) {
            log.duration = Date.now() - startTime;
            log.error = err?.message;
            self.emit('network', log);
            self.logs.push(log);
            callback(err, ...results);
          };
        }

        return original.apply(dns, args);
      };
    };

    dns.lookup = wrapDnsMethod('lookup', this.originals.dns.lookup);
    dns.resolve = wrapDnsMethod('resolve', this.originals.dns.resolve);
    dns.resolve4 = wrapDnsMethod('resolve4', this.originals.dns.resolve4);
    dns.resolve6 = wrapDnsMethod('resolve6', this.originals.dns.resolve6);
  }

  /**
   * Wrap HTTP request
   */
  private wrapHttpRequest(req: http.ClientRequest, log: NetworkLog, callback?: Function): http.ClientRequest {
    const self = this;
    const startTime = Date.now();

    // Wrap write to track bytes
    const originalWrite = req.write.bind(req);
    req.write = function(...args: any[]): boolean {
      const chunk = args[0];
      if (chunk) {
        log.bytesWritten += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
      }
      return originalWrite(...args);
    };

    // Track response
    req.on('response', (res: http.IncomingMessage) => {
      log.statusCode = res.statusCode;
      log.headers = res.headers;

      res.on('data', (chunk) => {
        log.bytesRead += chunk.length;
      });

      res.on('end', () => {
        log.duration = Date.now() - startTime;
        self.emit('network', log);
        self.logs.push(log);
        self.activeConnections.delete(log.id);
      });
    });

    req.on('error', (err) => {
      log.error = err.message;
      log.duration = Date.now() - startTime;
      self.emit('network', log);
      self.logs.push(log);
      self.activeConnections.delete(log.id);
    });

    self.activeConnections.set(log.id, log);
    return req;
  }

  /**
   * Wrap socket for TCP/TLS
   */
  private wrapSocket(socket: net.Socket, log: NetworkLog): net.Socket {
    const self = this;
    const startTime = Date.now();

    // Wrap write
    const originalWrite = socket.write.bind(socket);
    socket.write = function(...args: any[]): boolean {
      const chunk = args[0];
      if (chunk) {
        log.bytesWritten += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
      }
      self.emit('network', { ...log, event: 'write' });
      return originalWrite(...args);
    };

    // Track data
    socket.on('data', (chunk) => {
      log.bytesRead += chunk.length;
      self.emit('network', { ...log, event: 'data' });
    });

    socket.on('connect', () => {
      log.host = (socket as any).remoteAddress;
      log.port = (socket as any).remotePort;
      self.emit('network', { ...log, event: 'connect' });
    });

    socket.on('close', () => {
      log.duration = Date.now() - startTime;
      self.emit('network', { ...log, event: 'close' });
      self.logs.push(log);
      self.activeConnections.delete(log.id);
    });

    socket.on('error', (err) => {
      log.error = err.message;
      self.emit('network', { ...log, event: 'error' });
    });

    self.activeConnections.set(log.id, log);
    return socket;
  }

  /**
   * Helper methods
   */
  private parseHttpArgs(args: any[]): [any, Function?] {
    let options: any = {};
    let callback: Function | undefined;

    if (typeof args[0] === 'string') {
      options = url.parse(args[0]);
      if (args[1] && typeof args[1] !== 'function') {
        options = { ...options, ...args[1] };
        callback = args[2];
      } else {
        callback = args[1];
      }
    } else {
      options = args[0];
      callback = args[1];
    }

    return [options, callback];
  }

  private parseNetArgs(args: any[]): any {
    if (typeof args[0] === 'object') {
      return args[0];
    }
    return { port: args[0], host: args[1] || 'localhost' };
  }

  private createHttpLog(type: 'http' | 'https', options: any): NetworkLog {
    return {
      id: this.generateId(),
      timestamp: new Date(),
      type,
      direction: 'outbound',
      method: options.method || 'GET',
      host: options.hostname || options.host || 'localhost',
      port: options.port || (type === 'https' ? 443 : 80),
      path: options.path || '/',
      headers: options.headers,
      bytesRead: 0,
      bytesWritten: 0
    };
  }

  private createTcpLog(options: any): NetworkLog {
    return {
      id: this.generateId(),
      timestamp: new Date(),
      type: options.tls ? 'tls' : 'tcp',
      direction: 'outbound',
      host: options.host || 'localhost',
      port: options.port || 0,
      bytesRead: 0,
      bytesWritten: 0
    };
  }

  private generateId(): string {
    return `net_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get network logs
   */
  getLogs(): NetworkLog[] {
    return [...this.logs];
  }

  getActiveConnections(): NetworkLog[] {
    return Array.from(this.activeConnections.values());
  }

  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Get statistics
   */
  getStats(): any {
    const stats = {
      total: this.logs.length,
      active: this.activeConnections.size,
      byType: {} as any,
      totalBytesRead: 0,
      totalBytesWritten: 0,
      errors: 0
    };

    for (const log of this.logs) {
      stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
      stats.totalBytesRead += log.bytesRead;
      stats.totalBytesWritten += log.bytesWritten;
      if (log.error) stats.errors++;
    }

    return stats;
  }
}

// Export singleton
export const networkInterceptor = NetworkInterceptor.getInstance();