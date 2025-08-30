#!/usr/bin/env bun
/**
 * Log Analysis Dashboard Server
 * Real-time log streaming and analysis server using Bun
 */

import { serve } from 'bun';
import { WebSocketServer } from 'ws';
import { LogEntry, LogFilter } from '../domain/interfaces';
import { LogAggregator } from '../domain/services/LogAggregator';
import { LogAnalyzer } from '../domain/services/LogAnalyzer';
import { DashboardService } from '../domain/services/DashboardService';

const PORT = process.env.PORT || 3001;
const WS_PORT = process.env.WS_PORT || 3002;

// Initialize services
const logAggregator = new LogAggregator();
const logAnalyzer = new LogAnalyzer();
const dashboardService = new DashboardService(logAggregator, logAnalyzer);

// In-memory log storage (in production, use a database)
const logs: LogEntry[] = [];
const MAX_LOGS = 100000;

// WebSocket clients
const wsClients = new Set<any>();

// Create WebSocket server
const wss = new WebSocketServer({ port: Number(WS_PORT) });

wss.on('connection', (ws) => {
  console.log('New WebSocket client connected');
  wsClients.add(ws);

  // Send connection acknowledgment
  ws.send(JSON.stringify({
    type: 'connection',
    data: { status: 'connected', timestamp: new Date().toISOString() }
  }));

  // Send last 100 logs to new client
  const recentLogs = logs.slice(-100);
  recentLogs.forEach(log => {
    ws.send(JSON.stringify({
      type: 'log',
      data: log
    }));
  });

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message.toString());
      
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
      
      if (data.type === 'filter') {
        // Handle filter request
        const filtered = filterLogs(logs, data.filters);
        ws.send(JSON.stringify({
          type: 'filtered_logs',
          data: filtered
        }));
      }
    } catch (error) {
      console.error('Failed to process WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    wsClients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    wsClients.delete(ws);
  });
});

// Broadcast log to all connected clients
function broadcastLog(log: LogEntry) {
  const message = JSON.stringify({
    type: 'log',
    data: log
  });

  wsClients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  });
}

// Filter logs based on criteria
function filterLogs(logs: LogEntry[], filter: LogFilter): LogEntry[] {
  return logs.filter(log => {
    if (filter.level !== 'all' && log.level !== filter.level) {
      return false;
    }
    if (filter.search && !log.message.toLowerCase().includes(filter.search.toLowerCase())) {
      return false;
    }
    if (filter.startDate && new Date(log.timestamp) < filter.startDate) {
      return false;
    }
    if (filter.endDate && new Date(log.timestamp) > filter.endDate) {
      return false;
    }
    if (filter.sources?.length > 0 && !filter.sources.includes(log.source)) {
      return false;
    }
    return true;
  });
}

// Add log to storage
function addLog(log: LogEntry) {
  logs.push(log);
  
  // Trim logs if exceeding max
  if (logs.length > MAX_LOGS) {
    logs.splice(0, logs.length - MAX_LOGS);
  }

  // Process log through aggregator
  logAggregator.addLog(log);
  
  // Broadcast to clients
  broadcastLog(log);
}

// Create HTTP server with Bun
const server = serve({
  port: PORT,
  
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // Enable CORS
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    // API Routes
    try {
      // GET /api/health
      if (path === '/api/health' && req.method === 'GET') {
        return new Response(JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          logsCount: logs.length,
          wsClients: wsClients.size
        }), { headers });
      }

      // GET /api/logs
      if (path === '/api/logs' && req.method === 'GET') {
        const limit = Number(url.searchParams.get('limit')) || 1000;
        const offset = Number(url.searchParams.get('offset')) || 0;
        
        const paginatedLogs = logs.slice(offset, offset + limit);
        
        return new Response(JSON.stringify({
          logs: paginatedLogs,
          total: logs.length,
          limit,
          offset
        }), { headers });
      }

      // POST /api/logs
      if (path === '/api/logs' && req.method === 'POST') {
        const body = await req.json();
        
        const log: LogEntry = {
          id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: body.timestamp || new Date().toISOString(),
          level: body.level || 'info',
          source: body.source || 'unknown',
          message: body.message || '',
          details: body.details || {}
        };
        
        addLog(log);
        
        return new Response(JSON.stringify({ success: true, log }), { 
          status: 201, 
          headers 
        });
      }

      // POST /api/logs/batch
      if (path === '/api/logs/batch' && req.method === 'POST') {
        const body = await req.json();
        const logs = body.logs || [];
        
        logs.forEach((logData: any) => {
          const log: LogEntry = {
            id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: logData.timestamp || new Date().toISOString(),
            level: logData.level || 'info',
            source: logData.source || 'unknown',
            message: logData.message || '',
            details: logData.details || {}
          };
          addLog(log);
        });
        
        return new Response(JSON.stringify({ 
          success: true, 
          count: logs.length 
        }), { status: 201, headers });
      }

      // GET /api/stats
      if (path === '/api/stats' && req.method === 'GET') {
        const stats = dashboardService.getStats();
        return new Response(JSON.stringify(stats), { headers });
      }

      // GET /api/analysis
      if (path === '/api/analysis' && req.method === 'GET') {
        const analysis = {
          patterns: logAnalyzer.identifyPatterns(logs),
          anomalies: logAnalyzer.detectAnomalies(logs),
          errorRate: logAnalyzer.calculateErrorRate(logs),
          topSources: logAnalyzer.getTopSources(logs),
          timeDistribution: logAnalyzer.getTimeDistribution(logs)
        };
        
        return new Response(JSON.stringify(analysis), { headers });
      }

      // GET /api/export
      if (path === '/api/export' && req.method === 'GET') {
        const format = url.searchParams.get('format') || 'json';
        let content: string;
        let contentType: string;
        
        switch (format) {
          case 'csv':
            content = logsToCSV(logs);
            contentType = 'text/csv';
            break;
          case 'txt':
            content = logsToText(logs);
            contentType = 'text/plain';
            break;
          default:
            content = JSON.stringify(logs, null, 2);
            contentType = 'application/json';
        }
        
        return new Response(content, {
          headers: {
            ...headers,
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename=logs-${Date.now()}.${format}`
          }
        });
      }

      // 404 for unknown routes
      return new Response(JSON.stringify({ error: 'Not found' }), { 
        status: 404, 
        headers 
      });

    } catch (error) {
      console.error('Server error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }), { status: 500, headers });
    }
  }
});

// Helper functions
function logsToCSV(logs: LogEntry[]): string {
  const headers = ['ID', 'Timestamp', 'Level', 'Source', 'Message', 'Details'];
  const rows = logs.map(log => [
    log.id,
    log.timestamp,
    log.level,
    log.source,
    log.message,
    JSON.stringify(log.details || {})
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function logsToText(logs: LogEntry[]): string {
  return logs.map(log => 
    `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}`
  ).join('\n');
}

// Generate sample logs for testing
function generateSampleLogs() {
  const levels = ['error', 'warning', 'info', 'debug'];
  const sources = ['api', 'auth', 'database', 'worker', 'cache'];
  const messages = [
    'Request processed successfully',
    'Authentication failed for user',
    'Database connection established',
    'Cache miss for key',
    'Worker job completed',
    'API rate limit exceeded',
    'Memory usage above threshold',
    'Background task started'
  ];

  setInterval(() => {
    const log: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level: levels[Math.floor(Math.random() * levels.length)],
      source: sources[Math.floor(Math.random() * sources.length)],
      message: messages[Math.floor(Math.random() * messages.length)],
      details: {
        random: Math.random(),
        pid: process.pid
      }
    };
    
    addLog(log);
  }, 2000); // Generate a log every 2 seconds
}

// Start generating sample logs in development
if (process.env.NODE_ENV !== 'production') {
  generateSampleLogs();
}

console.log(`🚀 Log Analysis Dashboard Server`);
console.log(`   HTTP Server: http://localhost:${PORT}`);
console.log(`   WebSocket Server: ws://localhost:${WS_PORT}`);
console.log(`   API Health: http://localhost:${PORT}/api/health`);