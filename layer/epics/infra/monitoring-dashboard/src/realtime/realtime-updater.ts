/**
 * RealtimeUpdater - WebSocket management and live data streaming
 */

import { EventEmitter } from 'node:events';
import { WebSocketServer, WebSocket } from 'ws';
import winston from 'winston';
import { MetricsCollector } from '../metrics/metrics-collector';
import { LogAggregator } from '../logs/log-aggregator';
import { HealthChecker } from '../health/health-checker';
import { AlertManager } from '../alerts/alert-manager';

interface WebSocketClient {
  id: string;
  ws: WebSocket;
  subscriptions: Set<string>;
  filters: Map<string, any>;
  lastHeartbeat: number;
  isAlive: boolean;
}

interface Subscription {
  channel: string;
  clientId: string;
  filters?: any;
}

interface RealtimeMessage {
  type: 'data' | "heartbeat" | 'error' | "subscription" | "unsubscription";
  channel?: string;
  data?: any;
  timestamp: number;
  clientId?: string;
  error?: string;
}

export class RealtimeUpdater extends EventEmitter {
  private logger: winston.Logger;
  private clients: Map<string, WebSocketClient> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map(); // channel -> client IDs
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  private readonly heartbeatFrequency = 30000; // 30 seconds
  private readonly maxClients = 1000;
  private readonly rateLimits: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly rateLimitWindow = 60000; // 1 minute
  private readonly rateLimitMax = 100; // requests per minute per client

  constructor(
    private wss: WebSocketServer,
    private metricsCollector: MetricsCollector,
    private logAggregator: LogAggregator,
    private healthChecker: HealthChecker,
    private alertManager: AlertManager
  ) {
    super();
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({ format: winston.format.simple() }),
        new winston.transports.File({ filename: 'realtime-updater.log' })
      ]
    });

    this.setupWebSocketHandlers();
    this.setupComponentListeners();
  }

  /**
   * Setup WebSocket server handlers
   */
  private setupWebSocketHandlers(): void {
    this.wss.on("connection", (ws: WebSocket, req) => {
      const clientId = this.generateClientId();
      const client: WebSocketClient = {
        id: clientId,
        ws,
        subscriptions: new Set(),
        filters: new Map(),
        lastHeartbeat: Date.now(),
        isAlive: true
      };

      // Check client limit
      if (this.clients.size >= this.maxClients) {
        this.logger.warn('Max clients reached, rejecting new connection');
        ws.close(1013, 'Server overloaded');
        return;
      }

      this.clients.set(clientId, client);
      this.logger.info(`New WebSocket client connected: ${clientId} (${req.socket.remoteAddress})`);

      // Send welcome message
      this.sendMessage(client, {
        type: "subscription",
        data: {
          clientId,
          message: 'Connected to monitoring dashboard',
          availableChannels: this.getAvailableChannels()
        },
        timestamp: Date.now()
      });

      // Setup client message handler
      ws.on('message', (message: Buffer) => {
        this.handleClientMessage(client, message);
      });

      // Setup client disconnect handler
      ws.on('close', (code, reason) => {
        this.handleClientDisconnect(client, code, reason);
      });

      // Setup error handler
      ws.on('error', (error) => {
        this.logger.error(`WebSocket error for client ${clientId}:`, error);
      });

      // Setup ping/pong for connection health
      ws.on('pong', () => {
        client.isAlive = true;
        client.lastHeartbeat = Date.now();
      });

      this.emit("clientConnected", { clientId, clientCount: this.clients.size });
    });
  }

  /**
   * Setup listeners for monitoring components
   */
  private setupComponentListeners(): void {
    // Metrics updates
    this.metricsCollector.on("metricsUpdated", (metrics) => {
      this.broadcastToChannel('metrics', {
        type: 'metrics_update',
        data: metrics
      });
    });

    this.metricsCollector.on("customMetricRecorded", (metric) => {
      this.broadcastToChannel('metrics', {
        type: 'custom_metric',
        data: metric
      });
    });

    // Log updates
    this.logAggregator.on("logReceived", (logEntry) => {
      this.broadcastToChannel('logs', {
        type: 'new_log',
        data: logEntry
      });
    });

    this.logAggregator.on("patternMatched", (match) => {
      this.broadcastToChannel('logs', {
        type: 'pattern_match',
        data: match
      });
    });

    // Health updates
    this.healthChecker.on("healthCheckCompleted", (result) => {
      this.broadcastToChannel('health', {
        type: 'health_update',
        data: result
      });
    });

    this.healthChecker.on("healthStatusChanged", (change) => {
      this.broadcastToChannel('health', {
        type: 'status_change',
        data: change
      });
    });

    // Alert updates
    this.alertManager.on("alertTriggered", (alert) => {
      this.broadcastToChannel('alerts', {
        type: 'alert_triggered',
        data: alert
      });
    });

    this.alertManager.on("alertAcknowledged", (alert) => {
      this.broadcastToChannel('alerts', {
        type: 'alert_acknowledged',
        data: alert
      });
    });

    this.alertManager.on("alertResolved", (alert) => {
      this.broadcastToChannel('alerts', {
        type: 'alert_resolved',
        data: alert
      });
    });
  }

  /**
   * Start real-time updates
   */
  public startUpdates(): void {
    this.logger.info('Starting real-time updates');

    // Start periodic updates for different channels
    this.updateIntervals.set('system', setInterval(() => {
      this.updateSystemMetrics();
    }, 5000)); // Every 5 seconds

    this.updateIntervals.set('health', setInterval(() => {
      this.updateHealthStatus();
    }, 30000)); // Every 30 seconds

    this.updateIntervals.set('alerts', setInterval(() => {
      this.updateAlerts();
    }, 10000)); // Every 10 seconds

    // Start heartbeat monitoring
    this.heartbeatInterval = setInterval(() => {
      this.checkClientHeartbeats();
    }, this.heartbeatFrequency);

    this.emit("updatesStarted");
  }

  /**
   * Stop real-time updates
   */
  public stopUpdates(): void {
    this.logger.info('Stopping real-time updates');

    // Clear all intervals
    for (const [channel, interval] of this.updateIntervals) {
      clearInterval(interval);
    }
    this.updateIntervals.clear();

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Close all client connections
    for (const client of this.clients.values()) {
      client.ws.close(1001, 'Server shutting down');
    }
    this.clients.clear();

    this.emit("updatesStopped");
  }

  /**
   * Subscribe client to channel
   */
  public subscribe(ws: WebSocket | string, channel: string, filters?: any): boolean {
    const client = this.getClient(ws);
    if (!client) {
      return false;
    }

    if (!this.isValidChannel(channel)) {
      this.sendMessage(client, {
        type: 'error',
        error: `Invalid channel: ${channel}`,
        timestamp: Date.now()
      });
      return false;
    }

    // Add to client subscriptions
    client.subscriptions.add(channel);
    if (filters) {
      client.filters.set(channel, filters);
    }

    // Add to global subscriptions
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }
    this.subscriptions.get(channel)!.add(client.id);

    this.logger.info(`Client ${client.id} subscribed to channel: ${channel}`);
    
    this.sendMessage(client, {
      type: "subscription",
      channel,
      data: { subscribed: true, filters },
      timestamp: Date.now()
    });

    // Send initial data for the channel
    this.sendInitialChannelData(client, channel);

    this.emit("clientSubscribed", { clientId: client.id, channel });
    return true;
  }

  /**
   * Unsubscribe client from channel
   */
  public unsubscribe(ws: WebSocket | string, channel: string): boolean {
    const client = this.getClient(ws);
    if (!client) {
      return false;
    }

    // Remove from client subscriptions
    client.subscriptions.delete(channel);
    client.filters.delete(channel);

    // Remove from global subscriptions
    const channelSubs = this.subscriptions.get(channel);
    if (channelSubs) {
      channelSubs.delete(client.id);
      if (channelSubs.size === 0) {
        this.subscriptions.delete(channel);
      }
    }

    this.logger.info(`Client ${client.id} unsubscribed from channel: ${channel}`);
    
    this.sendMessage(client, {
      type: "unsubscription",
      channel,
      data: { unsubscribed: true },
      timestamp: Date.now()
    });

    this.emit("clientUnsubscribed", { clientId: client.id, channel });
    return true;
  }

  /**
   * Handle client messages
   */
  private handleClientMessage(client: WebSocketClient, message: Buffer): void {
    try {
      // Rate limiting
      if (!this.checkRateLimit(client.id)) {
        this.sendMessage(client, {
          type: 'error',
          error: 'Rate limit exceeded',
          timestamp: Date.now()
        });
        return;
      }

      const data = JSON.parse(message.toString());
      
      switch (data.type) {
        case "subscribe":
          this.subscribe(client.ws, data.channel, data.filters);
          break;
          
        case "unsubscribe":
          this.unsubscribe(client.ws, data.channel);
          break;
          
        case 'ping':
          client.isAlive = true;
          client.lastHeartbeat = Date.now();
          this.sendMessage(client, {
            type: "heartbeat",
            data: { pong: true },
            timestamp: Date.now()
          });
          break;
          
        case 'get_subscriptions':
          this.sendMessage(client, {
            type: 'data',
            data: {
              subscriptions: Array.from(client.subscriptions),
              availableChannels: this.getAvailableChannels()
            },
            timestamp: Date.now()
          });
          break;
          
        default:
          this.sendMessage(client, {
            type: 'error',
            error: `Unknown message type: ${data.type}`,
            timestamp: Date.now()
          });
      }
    } catch (error) {
      this.logger.error(`Error handling client message from ${client.id}:`, error);
      this.sendMessage(client, {
        type: 'error',
        error: 'Invalid message format',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle client disconnect
   */
  private handleClientDisconnect(client: WebSocketClient, code: number, reason: Buffer): void {
    this.logger.info(`Client ${client.id} disconnected: ${code} ${reason.toString()}`);

    // Remove from all subscriptions
    for (const channel of client.subscriptions) {
      const channelSubs = this.subscriptions.get(channel);
      if (channelSubs) {
        channelSubs.delete(client.id);
        if (channelSubs.size === 0) {
          this.subscriptions.delete(channel);
        }
      }
    }

    // Remove client
    this.clients.delete(client.id);

    this.emit("clientDisconnected", { 
      clientId: client.id, 
      clientCount: this.clients.size,
      code,
      reason: reason.toString()
    });
  }

  /**
   * Broadcast message to all subscribers of a channel
   */
  private broadcastToChannel(channel: string, message: any): void {
    const subscribers = this.subscriptions.get(channel);
    if (!subscribers) {
      return;
    }

    const realtimeMessage: RealtimeMessage = {
      type: 'data',
      channel,
      data: message,
      timestamp: Date.now()
    };

    let sentCount = 0;
    for (const clientId of subscribers) {
      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        // Apply filters if any
        if (this.shouldSendToClient(client, channel, message)) {
          this.sendMessage(client, realtimeMessage);
          sentCount++;
        }
      }
    }

    if (sentCount > 0) {
      this.logger.debug(`Broadcasted to ${sentCount} clients on channel ${channel}`);
    }
  }

  /**
   * Check if message should be sent to client based on filters
   */
  private shouldSendToClient(client: WebSocketClient, channel: string, message: any): boolean {
    const filters = client.filters.get(channel);
    if (!filters) {
      return true;
    }

    // Apply filters based on channel and message content
    switch (channel) {
      case 'logs':
        if (filters.level && message.data?.level !== filters.level) {
          return false;
        }
        if (filters.service && message.data?.service !== filters.service) {
          return false;
        }
        break;
        
      case 'metrics':
        if (filters.service && message.data?.service !== filters.service) {
          return false;
        }
        break;
        
      case 'health':
        if (filters.service && message.data?.serviceId !== filters.service) {
          return false;
        }
        if (filters.status && message.data?.status !== filters.status) {
          return false;
        }
        break;
        
      case 'alerts':
        if (filters.severity && message.data?.severity !== filters.severity) {
          return false;
        }
        if (filters.service && message.data?.source?.service !== filters.service) {
          return false;
        }
        break;
    }

    return true;
  }

  /**
   * Send message to specific client
   */
  private sendMessage(client: WebSocketClient, message: RealtimeMessage): void {
    try {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    } catch (error) {
      this.logger.error(`Error sending message to client ${client.id}:`, error);
    }
  }

  /**
   * Send initial data when client subscribes to channel
   */
  private async sendInitialChannelData(client: WebSocketClient, channel: string): Promise<void> {
    try {
      let initialData: any = {};

      switch (channel) {
        case 'metrics':
          initialData = await this.metricsCollector.getCurrentMetrics();
          break;
        case 'health':
          initialData = await this.healthChecker.checkAllServices();
          break;
        case 'alerts':
          initialData = await this.alertManager.getActiveAlerts();
          break;
        case 'logs':
          initialData = await this.logAggregator.getRecentLogs({ limit: 50 });
          break;
      }

      this.sendMessage(client, {
        type: 'data',
        channel,
        data: {
          type: 'initial_data',
          data: initialData
        },
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error(`Error sending initial data for channel ${channel}:`, error);
    }
  }

  /**
   * Update system metrics
   */
  private async updateSystemMetrics(): Promise<void> {
    try {
      const metrics = await this.metricsCollector.getCurrentMetrics();
      this.broadcastToChannel('system', {
        type: 'system_update',
        data: metrics.system
      });
    } catch (error) {
      this.logger.error('Error updating system metrics:', error);
    }
  }

  /**
   * Update health status
   */
  private async updateHealthStatus(): Promise<void> {
    try {
      const health = await this.healthChecker.checkAllServices();
      this.broadcastToChannel('health', {
        type: 'health_overview',
        data: health
      });
    } catch (error) {
      this.logger.error('Error updating health status:', error);
    }
  }

  /**
   * Update alerts
   */
  private async updateAlerts(): Promise<void> {
    try {
      const alerts = await this.alertManager.getActiveAlerts();
      this.broadcastToChannel('alerts', {
        type: 'alerts_update',
        data: alerts
      });
    } catch (error) {
      this.logger.error('Error updating alerts:', error);
    }
  }

  /**
   * Check client heartbeats and remove dead connections
   */
  private checkClientHeartbeats(): void {
    const now = Date.now();
    const deadClients: string[] = [];

    for (const [clientId, client] of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        // Send ping
        client.isAlive = false;
        client.ws.ping();
        
        // Check if client responded to previous ping
        if (now - client.lastHeartbeat > this.heartbeatFrequency * 2) {
          this.logger.warn(`Client ${clientId} failed heartbeat check`);
          deadClients.push(clientId);
        }
      } else {
        deadClients.push(clientId);
      }
    }

    // Remove dead clients
    for (const clientId of deadClients) {
      const client = this.clients.get(clientId);
      if (client) {
        client.ws.terminate();
        this.handleClientDisconnect(client, 1006, Buffer.from('Connection timeout'));
      }
    }

    if (deadClients.length > 0) {
      this.logger.info(`Removed ${deadClients.length} dead clients`);
    }
  }

  /**
   * Rate limiting check
   */
  private checkRateLimit(clientId: string): boolean {
    const now = Date.now();
    let limit = this.rateLimits.get(clientId);

    if (!limit || now > limit.resetTime) {
      limit = {
        count: 1,
        resetTime: now + this.rateLimitWindow
      };
      this.rateLimits.set(clientId, limit);
      return true;
    }

    limit.count++;
    return limit.count <= this.rateLimitMax;
  }

  /**
   * Get client by WebSocket or ID
   */
  private getClient(ws: WebSocket | string): WebSocketClient | null {
    if (typeof ws === 'string') {
      return this.clients.get(ws) || null;
    }

    for (const client of this.clients.values()) {
      if (client.ws === ws) {
        return client;
      }
    }
    return null;
  }

  /**
   * Check if channel is valid
   */
  private isValidChannel(channel: string): boolean {
    const validChannels = ['metrics', 'logs', 'health', 'alerts', 'traces', 'system'];
    return validChannels.includes(channel);
  }

  /**
   * Get available channels
   */
  private getAvailableChannels(): string[] {
    return ['metrics', 'logs', 'health', 'alerts', 'traces', 'system'];
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get connection statistics
   */
  public getStatistics(): {
    totalClients: number;
    activeConnections: number;
    totalSubscriptions: number;
    channelSubscriptions: Record<string, number>;
    messagesSent: number;
    uptime: number;
  } {
    const channelSubscriptions: Record<string, number> = {};
    let totalSubscriptions = 0;

    for (const [channel, subscribers] of this.subscriptions) {
      channelSubscriptions[channel] = subscribers.size;
      totalSubscriptions += subscribers.size;
    }

    return {
      totalClients: this.clients.size,
      activeConnections: Array.from(this.clients.values())
        .filter(client => client.ws.readyState === WebSocket.OPEN).length,
      totalSubscriptions,
      channelSubscriptions,
      messagesSent: 0, // Would track in production
      uptime: process.uptime()
    };
  }

  /**
   * Get connected clients info
   */
  public getConnectedClients(): Array<{
    id: string;
    subscriptions: string[];
    lastHeartbeat: number;
    isAlive: boolean;
  }> {
    return Array.from(this.clients.values()).map(client => ({
      id: client.id,
      subscriptions: Array.from(client.subscriptions),
      lastHeartbeat: client.lastHeartbeat,
      isAlive: client.isAlive
    }));
  }

  /**
   * Force disconnect client
   */
  public disconnectClient(clientId: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      return false;
    }

    client.ws.close(1000, 'Disconnected by server');
    return true;
  }
}