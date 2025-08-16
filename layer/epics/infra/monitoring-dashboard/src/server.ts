#!/usr/bin/env node

/**
 * AI Development Platform - Monitoring Dashboard Server
 * Real-time metrics, logs, and system monitoring
 */

import express from 'express';
import { createServer } from '../utils/http-wrapper';
import { WebSocketServer } from 'ws';
import { path } from '../../layer/themes/infra_external-log-lib/src';
import cors from 'cors';
import helmet from 'helmet';
import compression from "compression";
import { MetricsCollector } from './metrics/metrics-collector';
import { LogAggregator } from './logs/log-aggregator';
import { HealthChecker } from './health/health-checker';
import { AlertManager } from './alerts/alert-manager';
import { TraceCollector } from './tracing/trace-collector';
import { DashboardAPI } from './api/dashboard-api';
import { RealtimeUpdater } from './realtime/realtime-updater';
import { setupPrometheus } from './exporters/prometheus';
import { setupOpenTelemetry } from './exporters/opentelemetry';
import winston from 'winston';
import chalk from 'chalk';

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'monitoring.log' })
  ]
});

// ASCII Banner
const BANNER = `
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ╔╦╗╔═╗╔╗╔╦╔╦╗╔═╗╦═╗╦╔╗╔╔═╗  ╔╦╗╔═╗╔═╗╦ ╦╔╗ ╔═╗╔═╗╦═╗╔╦╗  ║
║   ║║║║ ║║║║║ ║ ║ ║╠╦╝║║║║║ ╦   ║║╠═╣╚═╗╠═╣╠╩╗║ ║╠═╣╠╦╝ ║║  ║
║   ╩ ╩╚═╝╝╚╝╩ ╩ ╚═╝╩╚═╩╝╚╝╚═╝  ═╩╝╩ ╩╚═╝╩ ╩╚═╝╚═╝╩ ╩╩╚══╩╝  ║
║                                                               ║
║              Real-time Platform Monitoring v1.0.0            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`;

export class MonitoringDashboard {
  private app: express.Application;
  private server: any;
  private wss: WebSocketServer;
  private port: number;
  
  // Core monitoring components
  private metricsCollector: MetricsCollector;
  private logAggregator: LogAggregator;
  private healthChecker: HealthChecker;
  private alertManager: AlertManager;
  private traceCollector: TraceCollector;
  private dashboardAPI: DashboardAPI;
  private realtimeUpdater: RealtimeUpdater;

  constructor(port: number = 3999) {
    this.port = port;
    this.app = express();
    this.setupMiddleware();
    this.initializeComponents();
    this.setupRoutes();
    this.setupWebSocket();
  }

  private setupMiddleware(): void {
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:"]
        }
      }
    }));
    this.app.use(cors());
    this.app.use(compression());
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, '../public')));
  }

  private initializeComponents(): void {
    // Initialize monitoring components
    this.metricsCollector = new MetricsCollector();
    this.logAggregator = new LogAggregator();
    this.healthChecker = new HealthChecker();
    this.alertManager = new AlertManager();
    this.traceCollector = new TraceCollector();
    
    // Initialize API and realtime components
    this.dashboardAPI = new DashboardAPI(
      this.metricsCollector,
      this.logAggregator,
      this.healthChecker,
      this.alertManager,
      this.traceCollector
    );
    
    // Setup exporters
    setupPrometheus(this.app, this.metricsCollector);
    setupOpenTelemetry();
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // API routes
    this.app.use('/api', this.dashboardAPI.getRouter());

    // Metrics endpoints
    this.app.get('/api/metrics/current', async (req, res) => {
      const metrics = await this.metricsCollector.getCurrentMetrics();
      res.json(metrics);
    });

    this.app.get('/api/metrics/history', async (req, res) => {
      const { service, metric, duration = '1h' } = req.query;
      const history = await this.metricsCollector.getMetricHistory(
        service as string,
        metric as string,
        duration as string
      );
      res.json(history);
    });

    // Logs endpoints
    this.app.get('/api/logs/stream', async (req, res) => {
      const { service, level, limit = 100 } = req.query;
      const logs = await this.logAggregator.getRecentLogs({
        service: service as string,
        level: level as string,
        limit: Number(limit)
      });
      res.json(logs);
    });

    this.app.post('/api/logs/search', async (req, res) => {
      const results = await this.logAggregator.searchLogs(req.body);
      res.json(results);
    });

    // Health check endpoints
    this.app.get('/api/health/services', async (req, res) => {
      const health = await this.healthChecker.checkAllServices();
      res.json(health);
    });

    this.app.get('/api/health/service/:name', async (req, res) => {
      const health = await this.healthChecker.checkService(req.params.name);
      res.json(health);
    });

    // Alert endpoints
    this.app.get('/api/alerts/active', async (req, res) => {
      const alerts = await this.alertManager.getActiveAlerts();
      res.json(alerts);
    });

    this.app.post('/api/alerts/acknowledge/:id', async (req, res) => {
      await this.alertManager.acknowledgeAlert(req.params.id);
      res.json({ success: true });
    });

    // Trace endpoints
    this.app.get('/api/traces/recent', async (req, res) => {
      const traces = await this.traceCollector.getRecentTraces();
      res.json(traces);
    });

    this.app.get('/api/traces/:traceId', async (req, res) => {
      const trace = await this.traceCollector.getTrace(req.params.traceId);
      res.json(trace);
    });

    // Dashboard UI
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });
  }

  private setupWebSocket(): void {
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    
    this.realtimeUpdater = new RealtimeUpdater(
      this.wss,
      this.metricsCollector,
      this.logAggregator,
      this.healthChecker,
      this.alertManager
    );

    this.wss.on("connection", (ws) => {
      logger.info('New WebSocket connection established');
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleWebSocketMessage(ws, data);
        } catch (error) {
          logger.error('WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        logger.info('WebSocket connection closed');
      });

      // Send initial data
      this.sendInitialData(ws);
    });

    // Start real-time updates
    this.realtimeUpdater.startUpdates();
  }

  private handleWebSocketMessage(ws: any, data: any): void {
    switch (data.type) {
      case "subscribe":
        this.realtimeUpdater.subscribe(ws, data.channel, data.filters);
        break;
      case "unsubscribe":
        this.realtimeUpdater.unsubscribe(ws, data.channel);
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;
      default:
        logger.warn(`Unknown WebSocket message type: ${data.type}`);
    }
  }

  private async sendInitialData(ws: any): Promise<void> {
    try {
      const metrics = await this.metricsCollector.getCurrentMetrics();
      const health = await this.healthChecker.checkAllServices();
      const alerts = await this.alertManager.getActiveAlerts();
      
      ws.send(JSON.stringify({
        type: 'initial',
        data: {
          metrics,
          health,
          alerts,
          timestamp: Date.now()
        }
      }));
    } catch (error) {
      logger.error('Error sending initial data:', error);
    }
  }

  public async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        console.clear();
        console.log(chalk.cyan(BANNER));
        console.log(chalk.green(`\n✅ Monitoring Dashboard started successfully!\n`));
        console.log(chalk.blue('📊 Dashboard URL:'), chalk.yellow(`http://localhost:${this.port}`));
        console.log(chalk.blue('🔌 WebSocket URL:'), chalk.yellow(`ws://localhost:${this.port}`));
        console.log(chalk.blue('📈 Metrics API:'), chalk.yellow(`http://localhost:${this.port}/api/metrics`));
        console.log(chalk.blue('📝 Logs API:'), chalk.yellow(`http://localhost:${this.port}/api/logs`));
        console.log(chalk.blue('❤️  Health API:'), chalk.yellow(`http://localhost:${this.port}/api/health`));
        console.log(chalk.blue('🚨 Alerts API:'), chalk.yellow(`http://localhost:${this.port}/api/alerts`));
        console.log(chalk.blue('🔍 Traces API:'), chalk.yellow(`http://localhost:${this.port}/api/traces`));
        console.log(chalk.blue('📊 Prometheus:'), chalk.yellow(`http://localhost:${this.port}/metrics`));
        console.log(chalk.gray('\nPress Ctrl+C to stop the server\n'));
        
        logger.info(`Monitoring Dashboard running on port ${this.port}`);
        resolve();
      });
    });
  }

  public async stop(): Promise<void> {
    logger.info('Shutting down Monitoring Dashboard...');
    
    // Stop real-time updates
    if (this.realtimeUpdater) {
      this.realtimeUpdater.stopUpdates();
    }
    
    // Close WebSocket connections
    if (this.wss) {
      this.wss.clients.forEach((client) => {
        client.close();
      });
    }
    
    // Close HTTP server
    if (this.server) {
      await new Promise((resolve) => {
        this.server.close(resolve);
      });
    }
    
    logger.info('Monitoring Dashboard shut down successfully');
  }
}

// Handle process signals
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n\nReceived SIGINT, shutting down gracefully...'));
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log(chalk.yellow('\nReceived SIGTERM, shutting down gracefully...'));
  process.exit(0);
});

// Main execution
if (require.main === module) {
  const dashboard = new MonitoringDashboard();
  dashboard.start().catch((error) => {
    logger.error('Failed to start Monitoring Dashboard:', error);
    process.exit(1);
  });
}

export default MonitoringDashboard;