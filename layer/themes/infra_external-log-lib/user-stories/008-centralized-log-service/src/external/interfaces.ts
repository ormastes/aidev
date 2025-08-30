export interface HTTPAdapterConfig {
  port: number;
  host: string;
  enableHTTPS: boolean;
  corsOrigins: string[];
  rateLimitEnabled: boolean;
  rateLimitRequests: number;
  rateLimitWindowMs: number;
  enableCompression: boolean;
  maxRequestSize: string;
  timeout: number;
  enableLogging: boolean;
}

export interface HTTPResponse<T = any> {
  statusCode: number;
  headers: Record<string, string>;
  body: T;
}

export interface HTTPError {
  statusCode: number;
  message: string;
  details?: any;
  timestamp: string;
}

export interface RouteHandler {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: (req: any, res: any) => Promise<void>;
  middleware?: string[];
}

export interface WebSocketConfig {
  enabled: boolean;
  path: string;
  maxConnections: number;
  pingInterval: number;
  pongTimeout: number;
}

export interface SSEConfig {
  enabled: boolean;
  path: string;
  keepAliveInterval: number;
  maxConnections: number;
}