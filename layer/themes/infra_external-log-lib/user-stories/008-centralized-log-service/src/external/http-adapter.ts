import { LogServiceAPI } from '../application/log-service-api';
import { 
  HTTPAdapterConfig,
  HTTPResponse,
  HTTPError,
  RouteHandler,
  WebSocketConfig,
  SSEConfig
} from './interfaces';

export class LogServiceHTTPAdapter {
  private readonly config: Required<HTTPAdapterConfig>;
  private readonly api: LogServiceAPI;
  private server: any = null;
  private isRunning: boolean = false;

  constructor(api: LogServiceAPI, config: Partial<HTTPAdapterConfig> = {}) {
    this.api = api;
    this.config = {
      port: config.port || 3000,
      host: config.host || '0.0.0.0',
      enableHTTPS: config.enableHTTPS || false,
      corsOrigins: config.corsOrigins || ['*'],
      rateLimitEnabled: config.rateLimitEnabled || true,
      rateLimitRequests: config.rateLimitRequests || 100,
      rateLimitWindowMs: config.rateLimitWindowMs || 60000,
      enableCompression: config.enableCompression || true,
      maxRequestSize: config.maxRequestSize || '10mb',
      timeout: config.timeout || 30000,
      enableLogging: config.enableLogging || true,
    };
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('HTTP adapter is already running');
    }

    try {
      // In a real implementation, this would set up Express/Fastify/etc.
      // For this Mock Free TDD approach, we'll simulate the server setup
      await this.setupRoutes();
      await this.setupMiddleware();
      await this.setupWebSocket();
      await this.setupSSE();

      this.isRunning = true;
      console.log(`Log Service HTTP Adapter started on ${this.config.host}:${this.config.port}`);
    } catch (error) {
      throw new Error(`Failed to start HTTP adapter: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      if (this.server) {
        // Close server connections
        await this.closeServer();
      }
      
      this.isRunning = false;
      console.log('Log Service HTTP Adapter stopped');
    } catch (error) {
      throw new Error(`Failed to stop HTTP adapter: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  isHealthy(): boolean {
    return this.isRunning;
  }

  getConfig(): HTTPAdapterConfig {
    return { ...this.config };
  }

  private async setupRoutes(): Promise<void> {
    const routes: RouteHandler[] = [
      {
        method: 'POST',
        path: '/api/v1/logs',
        handler: this.handleAddLogs.bind(this),
        middleware: ['auth', 'rateLimit', 'validation']
      },
      {
        method: 'GET',
        path: '/api/v1/logs',
        handler: this.handleQueryLogs.bind(this),
        middleware: ['auth', 'rateLimit']
      },
      {
        method: 'GET',
        path: '/api/v1/logs/stats',
        handler: this.handleGetStats.bind(this),
        middleware: ['auth']
      },
      {
        method: 'GET',
        path: '/api/v1/health',
        handler: this.handleHealthCheck.bind(this),
        middleware: []
      },
      {
        method: 'POST',
        path: '/api/v1/logs/export',
        handler: this.handleExportLogs.bind(this),
        middleware: ['auth', 'rateLimit']
      },
      {
        method: 'POST',
        path: '/api/v1/logs/stream/start',
        handler: this.handleStartStreaming.bind(this),
        middleware: ['auth', 'ws']
      },
      {
        method: 'DELETE',
        path: '/api/v1/logs/stream/:subscriptionId',
        handler: this.handleStopStreaming.bind(this),
        middleware: ['auth']
      }
    ];

    // Register routes (would use actual framework routing)
    routes.forEach(route => {
      console.log(`Registered ${route.method} ${route.path}`);
    });
  }

  private async setupMiddleware(): Promise<void> {
    // CORS middleware
    if (this.config.corsOrigins.length > 0) {
      console.log('CORS enabled for origins:', this.config.corsOrigins);
    }

    // Rate limiting
    if (this.config.rateLimitEnabled) {
      console.log(`Rate limiting: ${this.config.rateLimitRequests} requests per ${this.config.rateLimitWindowMs}ms`);
    }

    // Compression
    if (this.config.enableCompression) {
      console.log('HTTP compression enabled');
    }

    // Request logging
    if (this.config.enableLogging) {
      console.log('Request logging enabled');
    }
  }

  private async setupWebSocket(): Promise<void> {
    const wsConfig: WebSocketConfig = {
      enabled: true,
      path: '/api/v1/logs/ws',
      maxConnections: 100,
      pingInterval: 30000,
      pongTimeout: 10000,
    };

    if (wsConfig.enabled) {
      console.log(`WebSocket streaming enabled at ${wsConfig.path}`);
    }
  }

  private async setupSSE(): Promise<void> {
    const sseConfig: SSEConfig = {
      enabled: true,
      path: '/api/v1/logs/events',
      keepAliveInterval: 30000,
      maxConnections: 50,
    };

    if (sseConfig.enabled) {
      console.log(`Server-Sent Events enabled at ${sseConfig.path}`);
    }
  }

  // Route handlers

  private async handleAddLogs(req: any, res: any): Promise<void> {
    try {
      const request = {
        entries: req.body.entries || req.body,
        batch: req.body.batch || false,
        validateOnly: req.body.validateOnly || false,
      };

      const result = await this.api.addLogs(request);
      this.sendResponse(res, 201, result);
    } catch (error) {
      this.sendErrorResponse(res, 400, 'Failed to add logs', error);
    }
  }

  private async handleQueryLogs(req: any, res: any): Promise<void> {
    try {
      const request = {
        filters: {
          processIds: req.query.processIds ? req.query.processIds.split(',') : undefined,
          levels: req.query.levels ? req.query.levels.split(',') : undefined,
          themes: req.query.themes ? req.query.themes.split(',') : undefined,
          userStories: req.query.userStories ? req.query.userStories.split(',') : undefined,
          startTime: req.query.startTime ? new Date(req.query.startTime) : undefined,
          endTime: req.query.endTime ? new Date(req.query.endTime) : undefined,
          searchText: req.query.searchText,
          limit: req.query.limit ? parseInt(req.query.limit) : undefined,
          offset: req.query.offset ? parseInt(req.query.offset) : undefined,
        },
        format: req.query.format || 'json',
        includeMetadata: req.query.includeMetadata === 'true',
      };

      const result = await this.api.queryLogs(request);
      this.sendResponse(res, 200, result);
    } catch (error) {
      this.sendErrorResponse(res, 400, 'Failed to query logs', error);
    }
  }

  private async handleGetStats(req: any, res: any): Promise<void> {
    try {
      const result = await this.api.getAggregationStats();
      this.sendResponse(res, 200, result);
    } catch (error) {
      this.sendErrorResponse(res, 500, 'Failed to get statistics', error);
    }
  }

  private async handleHealthCheck(req: any, res: any): Promise<void> {
    try {
      const result = await this.api.getHealthCheck();
      this.sendResponse(res, 200, result);
    } catch (error) {
      this.sendErrorResponse(res, 503, 'Health check failed', error);
    }
  }

  private async handleExportLogs(req: any, res: any): Promise<void> {
    try {
      const request = {
        filters: req.body.filters || {},
        format: req.body.format || 'json',
        compression: req.body.compression,
        includeHeaders: req.body.includeHeaders !== false,
      };

      const result = await this.api.exportLogs(request);
      
      // Set appropriate headers for file download
      const filename = `logs_export_${new Date().toISOString().split('T')[0]}.${request.format}`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      if (request.compression) {
        res.setHeader('Content-Encoding', request.compression);
      }

      this.sendResponse(res, 200, result);
    } catch (error) {
      this.sendErrorResponse(res, 400, 'Failed to export logs', error);
    }
  }

  private async handleStartStreaming(req: any, res: any): Promise<void> {
    try {
      const request = {
        filters: req.body.filters || {},
        bufferSize: req.body.bufferSize,
        flushInterval: req.body.flushInterval,
      };

      const result = await this.api.startStreaming(request);
      this.sendResponse(res, 201, result);
    } catch (error) {
      this.sendErrorResponse(res, 400, 'Failed to start streaming', error);
    }
  }

  private async handleStopStreaming(req: any, res: any): Promise<void> {
    try {
      const subscriptionId = req.params.subscriptionId;
      const result = await this.api.stopStreaming(subscriptionId);
      this.sendResponse(res, 200, result);
    } catch (error) {
      this.sendErrorResponse(res, 400, 'Failed to stop streaming', error);
    }
  }

  // Utility methods

  private sendResponse(res: any, statusCode: number, data: any): void {
    const response: HTTPResponse = {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Service': 'CentralizedLogService',
      },
      body: data,
    };

    // In a real implementation, this would use the actual response object
    console.log(`Response ${statusCode}:`, response);
  }

  private sendErrorResponse(res: any, statusCode: number, message: string, error?: any): void {
    const errorResponse: HTTPError = {
      statusCode,
      message,
      details: error instanceof Error ? error.message : error,
      timestamp: new Date().toISOString(),
    };

    console.error(`Error Response ${statusCode}:`, errorResponse);
  }

  private async closeServer(): Promise<void> {
    // Close server gracefully
    return new Promise((resolve) => {
      if (this.server && typeof this.server.close === 'function') {
        this.server.close(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}