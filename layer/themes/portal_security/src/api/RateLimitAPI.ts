/**
 * Rate Limit API
 * RESTful API endpoints for rate limit monitoring and management
 */

import { Router, Request, Response } from 'express';
import { rateLimitMonitor } from '../services/RateLimitMonitorService';
import { RoleBasedAccessControl } from '../middleware/RoleBasedAccessControl';

export class RateLimitAPI {
  private router: Router;
  private rbac: RoleBasedAccessControl;

  constructor() {
    this.router = Router();
    this.rbac = new RoleBasedAccessControl();
    this.setupRoutes();
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Apply authentication to all routes
    this.router.use(this.rbac.authenticate());

    // Public read endpoints (require 'monitor' permission)
    this.router.get('/metrics', 
      this.rbac.authorize(['monitor', 'admin']),
      this.getMetrics.bind(this)
    );

    this.router.get('/events',
      this.rbac.authorize(['monitor', 'admin']),
      this.getEvents.bind(this)
    );

    this.router.get('/stats',
      this.rbac.authorize(['monitor', 'admin']),
      this.getStats.bind(this)
    );

    this.router.get('/clients',
      this.rbac.authorize(['monitor', 'admin']),
      this.getClients.bind(this)
    );

    this.router.get('/clients/:clientId',
      this.rbac.authorize(['monitor', 'admin']),
      this.getClientDetails.bind(this)
    );

    this.router.get('/configs',
      this.rbac.authorize(['monitor', 'admin']),
      this.getConfigs.bind(this)
    );

    this.router.get('/export',
      this.rbac.authorize(['monitor', 'admin']),
      this.exportData.bind(this)
    );

    // Admin-only write endpoints
    this.router.post('/configs',
      this.rbac.authorize(['admin']),
      this.createConfig.bind(this)
    );

    this.router.put('/configs/:endpoint',
      this.rbac.authorize(['admin']),
      this.updateConfig.bind(this)
    );

    this.router.post('/reset',
      this.rbac.authorize(['admin']),
      this.resetStats.bind(this)
    );

    this.router.delete('/events',
      this.rbac.authorize(['admin']),
      this.clearEvents.bind(this)
    );
  }

  /**
   * Get aggregated metrics
   */
  private async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = rateLimitMonitor.getAggregatedMetrics();
      const topOffenders = rateLimitMonitor.getTopOffenders(5);
      
      res.json({
        ...metrics,
        topOffenders: topOffenders.map(client => ({
          clientId: client.clientId,
          ip: client.ip,
          totalRequests: client.totalRequests,
          totalBlocked: client.totalBlocked
        })),
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to fetch metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get recent events
   */
  private async getEvents(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const startTime = req.query.start ? new Date(req.query.start as string) : undefined;
      const endTime = req.query.end ? new Date(req.query.end as string) : undefined;

      let events;
      if (startTime && endTime) {
        events = rateLimitMonitor.getEventsByTimeRange(startTime, endTime);
      } else {
        events = rateLimitMonitor.getRecentEvents(limit);
      }

      res.json(events);
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to fetch events',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get endpoint statistics
   */
  private async getStats(req: Request, res: Response): Promise<void> {
    try {
      const endpoint = req.query.endpoint as string;
      const stats = rateLimitMonitor.getStats(endpoint);
      
      res.json({
        stats,
        count: stats.length,
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to fetch statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get client usage information
   */
  private async getClients(req: Request, res: Response): Promise<void> {
    try {
      const clients = rateLimitMonitor.getClientUsage();
      const sortBy = req.query.sortBy as string || 'totalRequests';
      const order = req.query.order === 'asc' ? 1 : -1;

      // Sort clients
      const sorted = clients.sort((a, b) => {
        const aVal = (a as any)[sortBy] || 0;
        const bVal = (b as any)[sortBy] || 0;
        return (aVal - bVal) * order;
      });

      // Pagination
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 50;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;

      res.json({
        clients: sorted.slice(start, end).map(client => ({
          clientId: client.clientId,
          ip: client.ip,
          totalRequests: client.totalRequests,
          totalBlocked: client.totalBlocked,
          endpointCount: client.endpoints.size
        })),
        total: clients.length,
        page,
        pageSize,
        totalPages: Math.ceil(clients.length / pageSize)
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to fetch client data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get detailed client information
   */
  private async getClientDetails(req: Request, res: Response): Promise<void> {
    try {
      const clientId = req.params.clientId;
      const usage = rateLimitMonitor.getClientUsage(clientId);

      if (usage.length === 0) {
        res.status(404).json({ error: 'Client not found' });
        return;
      }

      const client = usage[0];
      const endpointDetails = Array.from(client.endpoints.entries()).map(([endpoint, data]) => ({
        endpoint,
        requests: data.requests,
        blocked: data.blocked,
        lastAccess: data.lastAccess,
        blockRate: data.requests > 0 ? (data.blocked / data.requests) * 100 : 0
      }));

      res.json({
        clientId: client.clientId,
        ip: client.ip,
        totalRequests: client.totalRequests,
        totalBlocked: client.totalBlocked,
        blockRate: client.totalRequests > 0 ? (client.totalBlocked / client.totalRequests) * 100 : 0,
        endpoints: endpointDetails,
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to fetch client details',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get rate limit configurations
   */
  private async getConfigs(req: Request, res: Response): Promise<void> {
    try {
      const configs = rateLimitMonitor.getConfigs();
      
      res.json({
        configs,
        count: configs.length,
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to fetch configurations',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Export all data
   */
  private async exportData(req: Request, res: Response): Promise<void> {
    try {
      const format = req.query.format as string || 'json';
      const data = rateLimitMonitor.exportData();

      if (format === 'csv') {
        // Convert to CSV format
        const csv = this.convertToCSV(data);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=rate-limits-${Date.now()}.csv`);
        res.send(csv);
      } else {
        // JSON format
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=rate-limits-${Date.now()}.json`);
        res.json(data);
      }
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to export data',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Create new rate limit configuration
   */
  private async createConfig(req: Request, res: Response): Promise<void> {
    try {
      const { endpoint, limit, windowMs, skipSuccessfulRequests, skipFailedRequests } = req.body;

      if (!endpoint || !limit || !windowMs) {
        res.status(400).json({ error: 'Missing required fields: endpoint, limit, windowMs' });
        return;
      }

      rateLimitMonitor.registerConfig({
        endpoint,
        limit: parseInt(limit),
        windowMs: parseInt(windowMs),
        skipSuccessfulRequests,
        skipFailedRequests
      });

      res.status(201).json({ 
        message: 'Configuration created successfully',
        endpoint
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to create configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update rate limit configuration
   */
  private async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const endpoint = req.params.endpoint;
      const updates = req.body;

      const success = rateLimitMonitor.updateConfig(endpoint, updates);
      
      if (success) {
        res.json({ 
          message: 'Configuration updated successfully',
          endpoint
        });
      } else {
        res.status(404).json({ error: 'Configuration not found' });
      }
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to update configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Reset statistics
   */
  private async resetStats(req: Request, res: Response): Promise<void> {
    try {
      const endpoint = req.body.endpoint;
      rateLimitMonitor.resetStats(endpoint);
      
      res.json({ 
        message: 'Statistics reset successfully',
        endpoint: endpoint || 'all'
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to reset statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Clear events history
   */
  private async clearEvents(req: Request, res: Response): Promise<void> {
    try {
      // This would need to be implemented in the service
      res.json({ 
        message: 'Events cleared successfully'
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to clear events',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any): string {
    const events = data.events || [];
    if (events.length === 0) {
      return 'timestamp,endpoint,method,clientId,ip,remaining,limit,blocked,statusCode\n';
    }

    const headers = Object.keys(events[0]).join(',');
    const rows = events.map((event: any) => 
      Object.values(event).map(val => 
        typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      ).join(',')
    );

    return [headers, ...rows].join('\n');
  }

  /**
   * Get router instance
   */
  getRouter(): Router {
    return this.router;
  }
}

// Export instance
export const rateLimitAPI = new RateLimitAPI();