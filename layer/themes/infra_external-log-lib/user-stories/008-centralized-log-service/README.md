# User Story 008: Centralized Log Service

## Overview

This user story implements a centralized log aggregation service that unifies all existing logging infrastructure into a single, comprehensive service layer. It builds upon the existing logging components in the `infra_external-log-lib` theme to provide a cohesive API for log collection, processing, querying, and streaming.

## Features

### Core Functionality
- **Unified Log Aggregation**: Combines logs from multiple sources (file system, console, network) into a centralized repository
- **Multi-Source Integration**: Integrates with existing LogAggregator, ComprehensiveLogger, EventLogger, and streaming capabilities
- **Real-Time Streaming**: Provides real-time log streaming with configurable filters and subscriptions
- **Advanced Querying**: Supports complex filtering, searching, and querying with pagination
- **REST API**: Full REST API for external integration and monitoring

### Architecture
- **HEA Compliance**: Follows Hierarchical Encapsulation Architecture with proper pipe-based communication
- **Mock Free TDD**: Implemented using Mock Free Test Oriented Development approach
- **Layer Separation**: Clear separation between domain, application, and external layers
- **Integration Focus**: Leverages existing infrastructure rather than replacing it

## Directory Structure

```
008-centralized-log-service/
├── src/
│   ├── domain/                 # Business logic and core service
│   │   ├── interfaces.ts       # Domain interfaces and types
│   │   └── centralized-log-service.ts
│   ├── application/            # Service API layer
│   │   ├── interfaces.ts       # API interfaces
│   │   └── log-service-api.ts
│   ├── external/               # HTTP adapter and external integration
│   │   ├── interfaces.ts       # HTTP interfaces
│   │   └── http-adapter.ts
│   ├── pipe/                   # HEA gateway
│   │   └── index.ts           # Public API exports
│   └── utils/                  # Utilities and factories
│       └── service-factory.ts
├── tests/
│   ├── unit/                   # Unit tests
│   ├── integration/            # Integration tests
│   └── system/                 # End-to-end system tests
└── docs/
    └── api.md                  # API documentation
```

## Key Components

### 1. CentralizedLogService (Domain)
The core service that orchestrates all logging operations:
- Integrates with existing LogAggregator from user-stories/006-multi-process-aggregation
- Uses ComprehensiveLogger and EventLogger from src/loggers/
- Provides unified interface for log addition, querying, and streaming
- Manages real-time subscriptions and log retention

### 2. LogServiceAPI (Application)
Application-level service providing:
- Request validation and normalization
- Response formatting (JSON, CSV, XML)
- Batch processing capabilities
- Export functionality with compression
- Pagination and filtering

### 3. LogServiceHTTPAdapter (External)
HTTP integration layer offering:
- RESTful API endpoints
- WebSocket streaming support
- Server-Sent Events (SSE)
- Rate limiting and authentication hooks
- CORS and security middleware

### 4. Service Factory (Utils)
Factory functions for easy service creation:
- `createCentralizedLogService()` - Creates configured service instance
- `createLogServiceAPI()` - Creates API wrapper
- `createLogServiceStack()` - Creates complete service stack
- Validation and formatting utilities

## API Endpoints

### Core Logging Operations
- `POST /api/v1/logs` - Add single or batch logs
- `GET /api/v1/logs` - Query logs with filters
- `GET /api/v1/logs/stats` - Get aggregation statistics
- `GET /api/v1/health` - Health check endpoint

### Export and Streaming
- `POST /api/v1/logs/export` - Export logs in various formats
- `POST /api/v1/logs/stream/start` - Start real-time streaming
- `DELETE /api/v1/logs/stream/:id` - Stop streaming subscription
- `GET /api/v1/logs/ws` - WebSocket streaming endpoint
- `GET /api/v1/logs/events` - Server-Sent Events endpoint

## Integration Points

### Existing Infrastructure Integration
- **LogAggregator**: Multi-process log aggregation from user-stories/006
- **ComprehensiveLogger**: System event logging from src/loggers/ComprehensiveLogger
- **EventLogger**: Application event tracking from src/loggers/EventLogger
- **RejectionTracker**: File operation rejection tracking from src/loggers/RejectionTracker

### Cross-Theme Log Collection
- Supports logs from any theme in the platform
- Metadata tracking for theme and user story context
- Process-based organization and filtering

## Usage Examples

### Basic Service Setup
```typescript
import { createCentralizedLogService } from './src/pipe';

const service = createCentralizedLogService({
  enableRealTimeStreaming: true,
  retentionDays: 30,
});

// Add a log
await service.addLog({
  processId: 'web-server',
  timestamp: new Date(),
  level: 'INFO',
  message: 'Server started successfully',
  source: 'stdout',
  theme: 'portal_aidev',
  userStory: '001-server-setup',
});

// Query logs
const logs = await service.queryLogs({
  themes: ['portal_aidev'],
  levels: ['ERROR', 'WARN'],
  limit: 100,
});
```

### Complete Service Stack
```typescript
import { createLogServiceStack } from './src/pipe';

const stack = createLogServiceStack({
  service: { enableRealTimeStreaming: true },
  api: { serviceName: 'MyLogService' },
  http: { port: 3000 },
});

await stack.start();
```

### Real-Time Streaming
```typescript
const subscriptionId = await service.subscribeToStream(
  { levels: ['ERROR'] },
  (logs) => {
    console.log('New error logs:', logs);
  }
);
```

## Testing Strategy

### Test Coverage
- **Unit Tests**: Individual component testing with mocks
- **Integration Tests**: Mock Free testing with real dependencies
- **System Tests**: End-to-end workflow validation
- **Performance Tests**: Load testing and scalability validation

### Key Test Scenarios
- Multi-theme log aggregation
- Real-time streaming with multiple subscribers
- High-volume log processing (1000+ logs)
- API validation and error handling
- Cross-layer communication verification
- Integration with existing logging infrastructure

## Performance Characteristics

### Scalability
- Handles 1000+ logs per batch efficiently
- Supports multiple concurrent streaming subscribers
- Query performance optimized for large datasets
- Memory-efficient log storage and retrieval

### Monitoring
- Comprehensive health check endpoints
- Performance metrics and statistics
- Error rate tracking and alerting
- Streaming subscription monitoring

## Configuration

### Service Configuration
```typescript
interface CentralizedLogServiceConfig {
  retentionDays?: number;           // Default: 30
  maxLogSize?: number;              // Default: 10MB
  enableRealTimeStreaming?: boolean; // Default: false
  streamingConfig?: StreamingConfig;
  retentionPolicy?: RetentionPolicy;
}
```

### API Configuration
```typescript
interface LogServiceAPIConfig {
  serviceName: string;
  version: string;
  enableAuthentication: boolean;
  rateLimitRequests: number;
  maxRequestSize: number;
}
```

### HTTP Configuration
```typescript
interface HTTPAdapterConfig {
  port: number;
  host: string;
  enableHTTPS: boolean;
  corsOrigins: string[];
  rateLimitEnabled: boolean;
  enableCompression: boolean;
}
```

## Dependencies

### Internal Dependencies
- `../006-multi-process-aggregation/src/internal/log-aggregator`
- `../../../src/loggers/ComprehensiveLogger`
- `../../../src/loggers/EventLogger`
- `../../../src/loggers/RejectionTracker`
- `../../../pipe` (for LogLevel and LogFormat types)

### External Dependencies
- Jest (testing framework)
- TypeScript (type safety)
- Standard Node.js libraries (fs, http, etc.)

## Future Enhancements

### Planned Features
- Database persistence layer
- Log compression and archival
- Advanced analytics and reporting
- Machine learning-based log analysis
- Kubernetes and Docker integration
- Grafana/Prometheus metrics export

### Extensibility Points
- Custom log parsers and formatters
- Plugin system for custom processors
- External storage adapters
- Custom authentication providers
- Advanced filtering engines

## Deployment Considerations

### Resource Requirements
- Memory: ~100MB base + ~1KB per cached log entry
- CPU: Minimal overhead for normal operation
- Network: Depends on streaming subscriber count
- Storage: Depends on retention policy and log volume

### Security Considerations
- Authentication and authorization hooks
- Rate limiting and DDoS protection
- Input validation and sanitization
- Secure log data handling
- CORS and security headers

## Maintenance and Support

### Monitoring
- Health check endpoint for uptime monitoring
- Performance metrics for capacity planning
- Error rate tracking for issue detection
- Log retention compliance monitoring

### Backup and Recovery
- Log data export capabilities
- Service state preservation
- Graceful shutdown and restart
- Data consistency verification

This user story successfully provides a centralized log aggregation service that unifies all existing logging infrastructure while maintaining the project's architectural principles and testing standards.