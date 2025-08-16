# Rate Limit Dashboard Documentation

## Overview

The Rate Limit Dashboard is a comprehensive real-time monitoring and management system for API rate limiting across the AI Development Platform. It provides visibility into API usage patterns, identifies potential abuse, and enables proactive management of rate limit configurations.

## Features

### 1. Real-Time Monitoring
- **Live Event Stream**: WebSocket-based real-time updates of all rate limit events
- **Instant Alerts**: Immediate notification when rate limits are exceeded
- **Connection Status**: Visual indicator of dashboard connection health

### 2. Metrics and Analytics
- **Total Requests**: Aggregate count of all API requests
- **Blocked Requests**: Count and percentage of blocked requests
- **Active Clients**: Number of unique clients accessing the APIs
- **Active Endpoints**: Count of endpoints receiving traffic
- **Block Rate**: Percentage of requests being blocked

### 3. Client Tracking
- **Top Offenders**: Identify clients with the most blocked requests
- **Client Profiles**: Detailed view of individual client behavior
- **Usage Patterns**: Track which endpoints each client accesses
- **IP Tracking**: Associate clients with IP addresses

### 4. Endpoint Statistics
- **Top Endpoints**: Most frequently accessed API endpoints
- **Usage Distribution**: Breakdown of requests across endpoints
- **Method Analysis**: GET, POST, PUT, DELETE distribution
- **Performance Metrics**: Average and peak usage percentages

### 5. Configuration Management
- **Dynamic Updates**: Modify rate limits without restart
- **Endpoint-Specific**: Configure limits per endpoint
- **Window Configuration**: Adjust time windows for rate limiting
- **Skip Rules**: Configure which requests to skip

## Architecture

### Components

#### RateLimitMonitorService
Core service that tracks all rate limit events and maintains statistics.

```typescript
class RateLimitMonitorService extends EventEmitter {
  recordEvent(event: RateLimitEvent): void
  getStats(endpoint?: string): RateLimitStats[]
  getClientUsage(clientId?: string): ClientUsage[]
  getTopOffenders(limit: number): ClientUsage[]
  registerConfig(config: RateLimitConfig): void
  updateConfig(endpoint: string, updates: Partial<RateLimitConfig>): boolean
}
```

#### RateLimitAPI
RESTful API providing access to monitoring data and configuration.

```typescript
GET  /api/rate-limits/metrics     - Get aggregated metrics
GET  /api/rate-limits/events      - Get recent events
GET  /api/rate-limits/stats       - Get endpoint statistics
GET  /api/rate-limits/clients     - Get client usage data
GET  /api/rate-limits/configs     - Get configurations
POST /api/rate-limits/configs     - Create new config
PUT  /api/rate-limits/configs/:id - Update config
POST /api/rate-limits/reset       - Reset statistics
GET  /api/rate-limits/export      - Export all data
```

#### Dashboard UI
Single-page application providing visual interface for monitoring.

- Real-time event display
- Metrics cards with trend indicators
- Interactive charts and graphs
- Client and endpoint tables
- Export and management controls

## Installation

### 1. Install Dependencies
```bash
npm install express ws events
```

### 2. Register Middleware
```typescript
import { rateLimitMonitor } from './services/RateLimitMonitorService';
import { rateLimitAPI } from './api/RateLimitAPI';
import rateLimit from 'express-rate-limit';

// Create rate limiter
const limiter = rateLimit({
  windowMs: 60000,
  max: 100,
  handler: (req, res) => {
    // Record the event
    rateLimitMonitor.recordEvent({
      endpoint: req.path,
      method: req.method,
      clientId: req.user?.id || req.ip,
      ip: req.ip,
      remaining: req.rateLimit.remaining,
      limit: req.rateLimit.limit,
      windowMs: 60000,
      blocked: true,
      statusCode: 429
    });
    
    res.status(429).json({ error: 'Too many requests' });
  }
});

// Apply to routes
app.use('/api', limiter);

// Mount monitoring API
app.use('/api/rate-limits', rateLimitAPI.getRouter());

// Serve dashboard
app.use('/dashboard', express.static('public'));
```

### 3. Configure WebSocket
```typescript
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

// Broadcast rate limit events
rateLimitMonitor.on('rate-limit-event', (event) => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(event));
    }
  });
});
```

## Usage

### Accessing the Dashboard
Navigate to: `http://localhost:3000/dashboard/rate-limit-dashboard.html`

### Monitoring Events
Events are displayed in real-time with:
- Timestamp
- Endpoint and method
- Client ID and IP
- Remaining requests
- Block status

### Viewing Metrics
Metrics update every 5 seconds showing:
- Total request volume
- Block rate percentage
- Active client count
- Endpoint activity

### Managing Configurations

#### Via Dashboard
1. Click "Settings" button
2. Select endpoint to configure
3. Adjust limit and window
4. Click "Save"

#### Via API
```bash
# Create configuration
curl -X POST http://localhost:3000/api/rate-limits/configs \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "/api/users",
    "limit": 100,
    "windowMs": 60000
  }'

# Update configuration
curl -X PUT http://localhost:3000/api/rate-limits/configs/api-users \
  -H "Content-Type: application/json" \
  -d '{
    "limit": 200
  }'
```

### Exporting Data

#### JSON Format
```bash
curl http://localhost:3000/api/rate-limits/export > rate-limits.json
```

#### CSV Format
```bash
curl http://localhost:3000/api/rate-limits/export?format=csv > rate-limits.csv
```

## Security

### Authentication
All API endpoints require authentication via JWT tokens:
```typescript
Authorization: Bearer <token>
```

### Permissions
- **monitor**: Read-only access to metrics and events
- **admin**: Full access including configuration changes

### RBAC Integration
```typescript
router.get('/metrics', 
  rbac.authorize(['monitor', 'admin']),
  getMetrics
);

router.post('/configs',
  rbac.authorize(['admin']),
  createConfig
);
```

## Performance Considerations

### Event Retention
- Maximum 10,000 events retained in memory
- Automatic cleanup every 5 minutes
- Events older than 1 hour are purged

### Client Tracking
- Inactive clients removed after 1 hour
- Top offenders list limited to 10 entries
- Client details cached for 5 minutes

### WebSocket Optimization
- Binary message format for large payloads
- Automatic reconnection with exponential backoff
- Fallback to polling if WebSocket unavailable

## Troubleshooting

### Dashboard Not Loading
1. Check if server is running
2. Verify dashboard files are served
3. Check browser console for errors
4. Ensure correct URL path

### No Real-Time Updates
1. Check WebSocket connection status
2. Verify WebSocket port is open
3. Check for proxy/firewall issues
4. Review browser WebSocket support

### Missing Metrics
1. Ensure rate limiter is configured
2. Verify events are being recorded
3. Check API endpoint accessibility
4. Review authentication/permissions

### High Memory Usage
1. Reduce event retention limit
2. Increase cleanup frequency
3. Implement event persistence
4. Use streaming for exports

## API Reference

### Data Types

#### RateLimitEvent
```typescript
interface RateLimitEvent {
  timestamp: Date;
  endpoint: string;
  method: string;
  clientId: string;
  ip: string;
  remaining: number;
  limit: number;
  windowMs: number;
  blocked: boolean;
  statusCode: number;
}
```

#### RateLimitStats
```typescript
interface RateLimitStats {
  endpoint: string;
  totalRequests: number;
  blockedRequests: number;
  uniqueClients: number;
  averageUsage: number;
  peakUsage: number;
  timeWindow: {
    start: Date;
    end: Date;
  };
}
```

#### ClientUsage
```typescript
interface ClientUsage {
  clientId: string;
  ip: string;
  endpoints: Map<string, EndpointUsage>;
  totalRequests: number;
  totalBlocked: number;
}
```

### Endpoints

#### GET /api/rate-limits/metrics
Returns aggregated metrics across all endpoints.

**Response:**
```json
{
  "totalRequests": 10000,
  "totalBlocked": 500,
  "blockRate": 5.0,
  "uniqueClients": 150,
  "activeEndpoints": 25,
  "topEndpoints": [
    { "endpoint": "/api/users", "requests": 3000 },
    { "endpoint": "/api/posts", "requests": 2500 }
  ],
  "topOffenders": [
    { "clientId": "client-123", "ip": "192.168.1.1", "totalBlocked": 100 }
  ],
  "timestamp": "2025-08-12T10:00:00Z"
}
```

#### GET /api/rate-limits/events
Returns recent rate limit events.

**Query Parameters:**
- `limit`: Number of events to return (default: 100)
- `start`: Start timestamp for filtering
- `end`: End timestamp for filtering

**Response:**
```json
[
  {
    "timestamp": "2025-08-12T10:00:00Z",
    "endpoint": "/api/users",
    "method": "GET",
    "clientId": "client-123",
    "ip": "192.168.1.1",
    "remaining": 95,
    "limit": 100,
    "windowMs": 60000,
    "blocked": false,
    "statusCode": 200
  }
]
```

#### GET /api/rate-limits/clients/:clientId
Returns detailed usage for specific client.

**Response:**
```json
{
  "clientId": "client-123",
  "ip": "192.168.1.1",
  "totalRequests": 500,
  "totalBlocked": 25,
  "blockRate": 5.0,
  "endpoints": [
    {
      "endpoint": "GET:/api/users",
      "requests": 200,
      "blocked": 10,
      "lastAccess": "2025-08-12T10:00:00Z"
    }
  ]
}
```

## Best Practices

### 1. Configure Appropriate Limits
- Start with conservative limits
- Monitor actual usage patterns
- Adjust based on legitimate traffic
- Consider endpoint sensitivity

### 2. Monitor Block Rates
- Alert on high block rates (>10%)
- Investigate sudden spikes
- Review top offenders regularly
- Adjust limits if needed

### 3. Use Time Windows Wisely
- Shorter windows for sensitive endpoints
- Longer windows for public APIs
- Consider sliding windows
- Account for burst traffic

### 4. Implement Gradual Degradation
- Warn before blocking
- Provide grace periods
- Offer upgrade paths
- Communicate limits clearly

### 5. Regular Maintenance
- Export data for analysis
- Reset stats periodically
- Clean up old configurations
- Review and update limits

## Integration Examples

### Express Middleware
```typescript
app.use((req, res, next) => {
  const event = {
    endpoint: req.path,
    method: req.method,
    clientId: req.user?.id || 'anonymous',
    ip: req.ip,
    remaining: req.rateLimit?.remaining || 100,
    limit: req.rateLimit?.limit || 100,
    windowMs: 60000,
    blocked: false,
    statusCode: res.statusCode
  };
  
  rateLimitMonitor.recordEvent(event);
  next();
});
```

### Custom Rate Limiter
```typescript
class CustomRateLimiter {
  constructor(private monitor: RateLimitMonitorService) {}
  
  async checkLimit(req: Request): Promise<boolean> {
    const usage = await this.getUsage(req);
    
    this.monitor.recordEvent({
      endpoint: req.path,
      method: req.method,
      clientId: this.getClientId(req),
      ip: req.ip,
      remaining: usage.remaining,
      limit: usage.limit,
      windowMs: usage.window,
      blocked: usage.remaining <= 0,
      statusCode: usage.remaining <= 0 ? 429 : 200
    });
    
    return usage.remaining > 0;
  }
}
```

### Alert Integration
```typescript
rateLimitMonitor.on('rate-limit-exceeded', async (event) => {
  // Send alert to monitoring system
  await alertService.send({
    type: 'RATE_LIMIT_EXCEEDED',
    severity: 'WARNING',
    client: event.clientId,
    endpoint: event.endpoint,
    timestamp: event.timestamp
  });
  
  // Log to external system
  logger.warn('Rate limit exceeded', event);
  
  // Update metrics
  metrics.increment('rate_limit.exceeded', {
    endpoint: event.endpoint,
    client: event.clientId
  });
});
```

## Future Enhancements

### Planned Features
- Machine learning-based anomaly detection
- Predictive rate limit adjustment
- Geographic distribution analysis
- API key-based rate limiting
- Tiered rate limit plans
- GraphQL endpoint support
- Redis backend for distributed systems
- Historical data analysis dashboard
- Automated threat response
- Integration with WAF systems

### Roadmap
- **v1.1**: Redis persistence layer
- **v1.2**: Machine learning integration
- **v1.3**: Advanced analytics dashboard
- **v1.4**: Automated response system
- **v2.0**: Distributed rate limiting

## Support

For issues or questions:
- Documentation: `/gen/doc/`
- Issue Tracker: GitHub Issues
- API Reference: `/api/rate-limits/docs`
- Dashboard Help: Click "?" in dashboard

---
*Rate Limit Dashboard v1.0.0*  
*Part of Portal Security Theme*  
*AI Development Platform*