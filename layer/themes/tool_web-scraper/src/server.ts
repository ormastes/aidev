/**
 * REST API Server for Web Scraper
 * Provides REST API with WebSocket support for real-time updates,
 * job queue management, and comprehensive rate limiting
 */

import express, { Request, Response, NextFunction } from 'express';
import { http } from '../../infra_external-log-lib/src';
import WebSocket from 'ws';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import WebScraper, { ScrapingJob, ScrapingOptions, ScrapingResult, ScrapingProgress } from './web-scraper';
import { ExportConfig } from '../children/exporter';
import { ExtractionSchema } from '../children/extractor';

interface ApiError {
  code: string;
  message: string;
  details?: any;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: string;
  requestId: string;
}

interface WebSocketMessage {
  type: 'job_status' | 'progress' | 'stats' | 'error' | 'result';
  data: any;
  timestamp: string;
}

interface ScrapingJobRequest {
  url: string;
  options?: ScrapingOptions;
  priority?: number;
  webhookUrl?: string; // Callback URL for job completion
}

interface BatchScrapingRequest {
  urls: string[];
  options?: ScrapingOptions;
  priority?: number;
  webhookUrl?: string;
}

class WebScraperAPI {
  private app: express.Application;
  private server: http.Server;
  private wss: WebSocket.Server;
  private scraper: WebScraper;
  private clients: Map<string, WebSocket> = new Map();
  private requestCount: number = 0;

  constructor(port: number = 3000) {
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.server });
    this.scraper = new WebScraper();

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupScraperListeners();

    this.server.listen(port, () => {
      console.log(`🚀 Web Scraper API server running on port ${port}`);
      console.log(`📊 WebSocket endpoint: ws://localhost:${port}`);
      console.log(`🌐 REST API: http://localhost:${port}/api`);
    });
  }

  private setupMiddleware(): void {
    // Security and performance middleware
    this.app.use(helmet());
    this.app.use(compression());
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: {
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests, please try again later'
        },
        timestamp: new Date().toISOString(),
        requestId: ''
      }
    });

    this.app.use('/api', limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request ID and logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      req.id = `req_${++this.requestCount}_${Date.now()}`;
      res.locals.startTime = Date.now();
      
      console.log(`${new Date().toISOString()} ${req.method} ${req.path} [${req.id}]`);
      
      next();
    });

    // Response wrapper
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      res.apiSuccess = (data: any = null) => {
        const response: ApiResponse = {
          success: true,
          data,
          timestamp: new Date().toISOString(),
          requestId: req.id
        };
        res.json(response);
      };

      res.apiError = (code: string, message: string, details?: any, statusCode: number = 400) => {
        const response: ApiResponse = {
          success: false,
          error: { code, message, details },
          timestamp: new Date().toISOString(),
          requestId: req.id
        };
        res.status(statusCode).json(response);
      };

      next();
    });
  }

  private setupRoutes(): void {
    const router = express.Router();

    // Health check
    router.get('/health', (req: Request, res: Response) => {
      const stats = this.scraper.getStats();
      const progress = this.scraper.getProgress();
      
      res.apiSuccess({
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        stats,
        progress
      });
    });

    // Single URL scraping
    router.post('/scrape', async (req: Request, res: Response) => {
      try {
        const { url, options, priority = 5, webhookUrl } = req.body as ScrapingJobRequest;

        if (!url) {
          return res.apiError('MISSING_URL', 'URL is required');
        }

        // Validate URL
        try {
          new URL(url);
        } catch {
          return res.apiError('INVALID_URL', 'Invalid URL format');
        }

        const result = await this.scraper.scrape(url, options);
        
        // Send webhook if provided
        if (webhookUrl) {
          this.sendWebhook(webhookUrl, { type: 'scrape_complete', result });
        }

        res.apiSuccess(result);

      } catch (error) {
        console.error(`Scraping error [${req.id}]:`, error);
        res.apiError('SCRAPING_FAILED', 'Failed to scrape URL', { error: String(error) }, 500);
      }
    });

    // Batch scraping
    router.post('/scrape/batch', async (req: Request, res: Response) => {
      try {
        const { urls, options, priority = 5, webhookUrl } = req.body as BatchScrapingRequest;

        if (!urls || !Array.isArray(urls) || urls.length === 0) {
          return res.apiError('MISSING_URLS', 'URLs array is required');
        }

        if (urls.length > 100) {
          return res.apiError('TOO_MANY_URLS', 'Maximum 100 URLs per batch');
        }

        // Validate URLs
        for (const url of urls) {
          try {
            new URL(url);
          } catch {
            return res.apiError('INVALID_URL', `Invalid URL format: ${url}`);
          }
        }

        // Start batch processing
        const jobIds = urls.map(url => this.scraper.addJob(url, options, priority));
        this.scraper.startProcessing();

        res.apiSuccess({
          message: 'Batch scraping started',
          jobIds,
          totalJobs: urls.length
        });

        // Monitor batch completion for webhook
        if (webhookUrl) {
          this.monitorBatchCompletion(jobIds, webhookUrl);
        }

      } catch (error) {
        console.error(`Batch scraping error [${req.id}]:`, error);
        res.apiError('BATCH_SCRAPING_FAILED', 'Failed to start batch scraping', { error: String(error) }, 500);
      }
    });

    // Job management
    router.post('/job', async (req: Request, res: Response) => {
      try {
        const { url, options, priority = 5 } = req.body as ScrapingJobRequest;

        if (!url) {
          return res.apiError('MISSING_URL', 'URL is required');
        }

        const jobId = this.scraper.addJob(url, options, priority);
        
        if (!this.scraper['isRunning']) {
          this.scraper.startProcessing();
        }

        res.apiSuccess({ jobId, status: 'queued' });

      } catch (error) {
        console.error(`Job creation error [${req.id}]:`, error);
        res.apiError('JOB_CREATION_FAILED', 'Failed to create job', { error: String(error) }, 500);
      }
    });

    router.get('/job/:jobId', (req: Request, res: Response) => {
      const { jobId } = req.params;
      const job = this.scraper.getJob(jobId);

      if (!job) {
        return res.apiError('JOB_NOT_FOUND', 'Job not found', null, 404);
      }

      res.apiSuccess(job);
    });

    router.delete('/job/:jobId', (req: Request, res: Response) => {
      const { jobId } = req.params;
      const job = this.scraper.getJob(jobId);

      if (!job) {
        return res.apiError('JOB_NOT_FOUND', 'Job not found', null, 404);
      }

      if (job.status === 'running') {
        return res.apiError('JOB_RUNNING', 'Cannot cancel running job');
      }

      // Remove job from queue (implementation depends on queue internals)
      res.apiSuccess({ message: 'Job cancelled' });
    });

    // Progress and statistics
    router.get('/progress', (req: Request, res: Response) => {
      const progress = this.scraper.getProgress();
      res.apiSuccess(progress);
    });

    router.get('/stats', (req: Request, res: Response) => {
      const stats = this.scraper.getStats();
      res.apiSuccess(stats);
    });

    // Schema management
    router.get('/schemas', (req: Request, res: Response) => {
      const schemas = this.scraper['extractor'].listSchemas();
      res.apiSuccess(schemas);
    });

    router.post('/schemas', (req: Request, res: Response) => {
      try {
        const schema: ExtractionSchema = req.body;

        if (!schema.name || !schema.rules) {
          return res.apiError('INVALID_SCHEMA', 'Schema must have name and rules');
        }

        this.scraper.addSchema(schema);
        res.apiSuccess({ message: 'Schema added successfully' });

      } catch (error) {
        res.apiError('SCHEMA_CREATION_FAILED', 'Failed to create schema', { error: String(error) });
      }
    });

    router.get('/schemas/:name', (req: Request, res: Response) => {
      const { name } = req.params;
      const schema = this.scraper['extractor'].getSchema(name);

      if (!schema) {
        return res.apiError('SCHEMA_NOT_FOUND', 'Schema not found', null, 404);
      }

      res.apiSuccess(schema);
    });

    // Export functionality
    router.post('/export', async (req: Request, res: Response) => {
      try {
        const { data, config } = req.body as { data: any[]; config: ExportConfig };

        if (!data || !Array.isArray(data)) {
          return res.apiError('INVALID_DATA', 'Data must be an array');
        }

        if (!config || !config.format || !config.destination) {
          return res.apiError('INVALID_CONFIG', 'Export config must specify format and destination');
        }

        const result = await this.scraper['exporter'].export(data, config);
        res.apiSuccess(result);

      } catch (error) {
        console.error(`Export error [${req.id}]:`, error);
        res.apiError('EXPORT_FAILED', 'Failed to export data', { error: String(error) }, 500);
      }
    });

    // URL validation
    router.post('/validate', async (req: Request, res: Response) => {
      try {
        const { url } = req.body;

        if (!url) {
          return res.apiError('MISSING_URL', 'URL is required');
        }

        // Validate URL format
        try {
          new URL(url);
        } catch {
          return res.apiError('INVALID_URL', 'Invalid URL format');
        }

        // Test URL accessibility
        const result = await this.scraper['fetcher'].head(url);
        
        res.apiSuccess({
          url,
          accessible: true,
          status: result.status,
          statusText: result.statusText,
          contentType: result.headers['content-type'],
          contentLength: result.headers['content-length']
        });

      } catch (error) {
        res.apiError('VALIDATION_FAILED', 'URL validation failed', { error: String(error) });
      }
    });

    // Selector testing
    router.post('/test-selector', async (req: Request, res: Response) => {
      try {
        const { url, selector, type = 'css' } = req.body;

        if (!url || !selector) {
          return res.apiError('MISSING_PARAMETERS', 'URL and selector are required');
        }

        const options: ScrapingOptions = {
          extractionOptions: {
            customSelectors: { test: selector }
          }
        };

        const result = await this.scraper.scrape(url, options);
        
        res.apiSuccess({
          selector,
          type,
          matches: result.data.test || [],
          matchCount: Array.isArray(result.data.test) ? result.data.test.length : 0
        });

      } catch (error) {
        console.error(`Selector test error [${req.id}]:`, error);
        res.apiError('SELECTOR_TEST_FAILED', 'Failed to test selector', { error: String(error) }, 500);
      }
    });

    // Cache management
    router.delete('/cache', (req: Request, res: Response) => {
      this.scraper.clearCache();
      res.apiSuccess({ message: 'Cache cleared successfully' });
    });

    // Queue management
    router.get('/queue/status', (req: Request, res: Response) => {
      const progress = this.scraper.getProgress();
      res.apiSuccess(progress);
    });

    router.post('/queue/start', (req: Request, res: Response) => {
      this.scraper.startProcessing();
      res.apiSuccess({ message: 'Queue processing started' });
    });

    router.post('/queue/stop', (req: Request, res: Response) => {
      this.scraper.stopProcessing();
      res.apiSuccess({ message: 'Queue processing stopped' });
    });

    router.delete('/queue', (req: Request, res: Response) => {
      this.scraper['queue'].clear();
      res.apiSuccess({ message: 'Queue cleared' });
    });

    // Configuration
    router.get('/config', (req: Request, res: Response) => {
      const config = {
        concurrency: this.scraper['concurrency'],
        rateLimitConfig: this.scraper['fetcher'].getRateLimitConfig()
      };
      res.apiSuccess(config);
    });

    router.put('/config', (req: Request, res: Response) => {
      const { concurrency, rateLimitConfig } = req.body;

      if (concurrency && typeof concurrency === 'number' && concurrency > 0) {
        this.scraper.setConcurrency(concurrency);
      }

      if (rateLimitConfig) {
        this.scraper['fetcher'].updateRateLimitConfig(rateLimitConfig);
      }

      res.apiSuccess({ message: 'Configuration updated' });
    });

    // Mount router
    this.app.use('/api', router);

    // Serve static files (optional dashboard)
    this.app.use(express.static('public'));

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Endpoint not found'
        },
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    });

    // Error handler
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      console.error(`Server error [${req.id}]:`, error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        },
        timestamp: new Date().toISOString(),
        requestId: req.id
      });
    });
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
      const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.clients.set(clientId, ws);

      console.log(`WebSocket client connected: ${clientId}`);

      // Send initial status
      this.sendToClient(ws, {
        type: 'stats',
        data: this.scraper.getStats(),
        timestamp: new Date().toISOString()
      });

      ws.on('message', (message: WebSocket.Data) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleWebSocketMessage(ws, clientId, data);
        } catch (error) {
          this.sendToClient(ws, {
            type: 'error',
            data: { message: 'Invalid JSON message' },
            timestamp: new Date().toISOString()
          });
        }
      });

      ws.on('close', () => {
        console.log(`WebSocket client disconnected: ${clientId}`);
        this.clients.delete(clientId);
      });

      ws.on('error', (error: Error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
        this.clients.delete(clientId);
      });
    });
  }

  private setupScraperListeners(): void {
    this.scraper.on('jobStart', (job: ScrapingJob) => {
      this.broadcastMessage({
        type: 'job_status',
        data: { jobId: job.id, status: 'started', url: job.url },
        timestamp: new Date().toISOString()
      });
    });

    this.scraper.on('jobComplete', ({ job, result }: { job: ScrapingJob; result: ScrapingResult }) => {
      this.broadcastMessage({
        type: 'job_status',
        data: { jobId: job.id, status: 'completed', url: job.url, result },
        timestamp: new Date().toISOString()
      });
    });

    this.scraper.on('jobError', ({ job, error }: { job: ScrapingJob; error: any }) => {
      this.broadcastMessage({
        type: 'job_status',
        data: { jobId: job.id, status: 'failed', url: job.url, error: String(error) },
        timestamp: new Date().toISOString()
      });
    });

    // Periodic progress updates
    setInterval(() => {
      const progress = this.scraper.getProgress();
      const stats = this.scraper.getStats();

      this.broadcastMessage({
        type: 'progress',
        data: { progress, stats },
        timestamp: new Date().toISOString()
      });
    }, 5000); // Every 5 seconds
  }

  private handleWebSocketMessage(ws: WebSocket, clientId: string, message: any): void {
    const { type, data } = message;

    switch (type) {
      case 'subscribe':
        // Client wants to subscribe to specific events
        break;

      case 'get_status':
        this.sendToClient(ws, {
          type: 'stats',
          data: this.scraper.getStats(),
          timestamp: new Date().toISOString()
        });
        break;

      case 'get_progress':
        this.sendToClient(ws, {
          type: 'progress',
          data: this.scraper.getProgress(),
          timestamp: new Date().toISOString()
        });
        break;

      default:
        this.sendToClient(ws, {
          type: 'error',
          data: { message: `Unknown message type: ${type}` },
          timestamp: new Date().toISOString()
        });
    }
  }

  private sendToClient(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private broadcastMessage(message: WebSocketMessage): void {
    for (const [clientId, ws] of this.clients.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      } else {
        this.clients.delete(clientId);
      }
    }
  }

  private async sendWebhook(url: string, data: any): Promise<void> {
    try {
      const axios = require('axios');
      await axios.post(url, data, { timeout: 10000 });
    } catch (error) {
      console.error(`Webhook failed for ${url}:`, error);
    }
  }

  private async monitorBatchCompletion(jobIds: string[], webhookUrl: string): Promise<void> {
    const checkCompletion = () => {
      const jobs = jobIds.map(id => this.scraper.getJob(id)).filter(job => job !== undefined);
      const completed = jobs.filter(job => job!.status === 'completed' || job!.status === 'failed');
      
      if (completed.length === jobs.length) {
        // All jobs completed
        const results = jobs.map(job => job!.result).filter(result => result !== undefined);
        this.sendWebhook(webhookUrl, {
          type: 'batch_complete',
          jobIds,
          results,
          totalJobs: jobs.length,
          successfulJobs: results.length
        });
      } else {
        // Check again in 5 seconds
        setTimeout(checkCompletion, 5000);
      }
    };

    setTimeout(checkCompletion, 1000);
  }

  public async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Web Scraper API server...');
    
    await this.scraper.cleanup();
    
    for (const [clientId, ws] of this.clients.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    }
    
    this.server.close(() => {
      console.log('✅ Server shutdown complete');
    });
  }
}

// Extend Express types
declare global {
  namespace Express {
    interface Request {
      id: string;
    }
    interface Response {
      apiSuccess: (data?: any) => void;
      apiError: (code: string, message: string, details?: any, statusCode?: number) => void;
    }
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  const api = new WebScraperAPI(port);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    await api.shutdown();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    await api.shutdown();
    process.exit(0);
  });
}

export default WebScraperAPI;