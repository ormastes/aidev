# Comprehensive Logging System

## Overview

The external-log-lib now includes a **Comprehensive Logging System** that automatically tracks:
- ✅ Task queue changes (TASK_QUEUE.vf.json)
- ✅ Feature updates (FEATURE.vf.json)  
- ✅ Name ID modifications (NAME_ID.vf.json)
- ✅ System events and custom events
- ✅ File operation rejections and violations
- ✅ All logs stored in `/tmp/external-log-lib/` directory

## Features

### 1. Brief vs Detail Modes (NEW!)
- **Brief Mode (Default)**: Logs only essential 1-2 pieces of information
- **Detail Mode**: Logs complete objects with all data
- Switch modes at runtime
- Reduces log size by up to 80% in brief mode

### 2. Event Logging
- Structured JSON format
- Multiple log levels (debug, info, warn, error, fatal)
- Automatic rotation (daily, hourly, or size-based)
- Buffer-based writing for performance
- Query capabilities

### 2. VF.json Monitoring
- Watches all vf.json files in project
- Detects changes in real-time
- Tracks task creation, updates, completion, deletion
- Monitors feature lifecycle
- Records name ID entity changes

### 3. Rejection Tracking
- Captures all file operation rejections
- Integrates with FileViolationPreventer
- Tracks resolution status
- Generates statistics and reports
- Persists rejections for analysis

### 4. Comprehensive Integration
- Single unified logging interface
- Automatic startup and shutdown
- Event-driven architecture
- Performance optimized

## Quick Start

```typescript
import { startComprehensiveLogging } from 'layer/themes/infra_external-log-lib/pipe';

// Start logging with default configuration (brief mode)
const logger = await startComprehensiveLogging();

// Or start with detail mode
const logger = await startComprehensiveLogging({ detail: true });

// Logs are automatically written to /tmp/external-log-lib/
```

## Configuration

### Default Configuration
```typescript
const logger = await startComprehensiveLogging({
  enabled: true,                           // Enable logging
  logDir: '/tmp/external-log-lib',        // Base log directory
  watchVfJson: true,                      // Monitor vf.json files
  trackRejections: true,                  // Track file rejections
  integrateWithFileViolationPreventer: true, // Auto-capture violations
  detail: false                            // Brief mode (default)
});
```

### Brief vs Detail Mode

#### Brief Mode (Default)
In brief mode, only essential information is logged:
- **Tasks**: ID and status/priority
- **Features**: ID and status/priority  
- **Name IDs**: ID and type/first value
- **Files**: Filename and operation
- **Rejections**: Type and severity

Example brief log:
```json
{
  "message": "Task created: TASK-001 [high]",
  "data": {
    "taskId": "TASK-001",
    "brief": "TASK-001 [high]",
    "essential": { "primary": "TASK-001", "secondary": "high" }
  }
}
```

#### Detail Mode
In detail mode, complete objects are logged:
```json
{
  "message": "Task TASK-001 created",
  "data": {
    "taskId": "TASK-001",
    "title": "Implement feature",
    "description": "Full description...",
    "priority": "high",
    "status": "in_progress",
    "assignee": "developer@example.com",
    // ... all other fields
  }
}
```

#### Switching Modes at Runtime
```typescript
// Enable detail mode
logger.enableDetailMode();

// Check current mode
if (logger.isDetailMode()) {
  console.log('Detail mode is active');
}

// Disable detail mode (back to brief)
logger.disableDetailMode();
```

### Custom Configuration
```typescript
const logger = await startComprehensiveLogging({
  logDir: '/custom/log/path',
  
  eventLoggerConfig: {
    maxFileSize: 50 * 1024 * 1024,      // 50MB max file size
    maxFiles: 20,                        // Keep 20 log files
    rotationInterval: 'hourly',         // Rotate every hour
    format: 'json',                      // JSON format
    enableConsole: true                  // Also log to console
  },
  
  vfJsonWatcherConfig: {
    watchPaths: ['/project/root'],      // Paths to watch
    pollInterval: 3000,                 // Poll every 3 seconds
    recursive: true                      // Watch recursively
  },
  
  rejectionTrackerConfig: {
    maxRejections: 5000,                 // Keep 5000 rejections
    autoResolveTimeout: 3600000,        // Auto-resolve after 1 hour
    persistRejections: true              // Save to disk
  }
});
```

## Usage Examples

### Log Custom Events
```typescript
// Log an informational event
logger.logEvent('User logged in', 'info', { userId: '123' });

// Log a warning
logger.logEvent('High memory usage', 'warn', { usage: '85%' });

// Log an error
logger.logEvent('Database connection failed', 'error', { 
  host: 'localhost',
  error: 'Connection refused'
});
```

### Log Task Changes
```typescript
// Log task creation
logger.logTaskChange('created', 'TASK-001', {
  title: 'Implement new feature',
  priority: 'high'
});

// Log task completion
logger.logTaskChange('completed', 'TASK-001', {
  completedBy: 'user123',
  duration: '2 hours'
});
```

### Log Feature Changes
```typescript
// Log feature update
logger.logFeatureChange('updated', 'FEAT-001', {
  status: 'in_progress',
  assignee: 'developer1'
});

// Log feature completion
logger.logFeatureChange('completed', 'FEAT-001', {
  releaseVersion: '1.2.0'
});
```

### Track Rejections
```typescript
import { RejectionType } from 'layer/themes/infra_external-log-lib/pipe';

// Track a file violation
logger.trackRejection(
  RejectionType.FILE_VIOLATION,
  'Attempted to create backup file',
  {
    path: '/project/file.bak',
    operation: 'create'
  }
);

// Track from FileViolationError
try {
  // Some file operation that fails
} catch (error) {
  if (error.name === 'FileViolationError') {
    logger.trackFileViolation(error, 'write');
  }
}
```

### Query Logs
```typescript
// Query recent errors
const errors = await logger.queryLogs({
  level: 'error',
  startDate: new Date(Date.now() - 3600000), // Last hour
  limit: 100
});

// Search for specific content
const results = await logger.queryLogs({
  search: 'database',
  category: 'event'
});

// Get task queue changes
const taskChanges = await logger.queryLogs({
  type: ['task_queue.created', 'task_queue.completed']
});
```

### Get Rejections
```typescript
// Get unresolved rejections
const unresolved = logger.getRejections({
  resolved: false,
  severity: 'high'
});

// Get rejections for specific path
const pathRejections = logger.getRejections({
  path: '/project/src/file.ts'
});

// Get recent freeze violations
const freezeViolations = logger.getRejections({
  type: RejectionType.FREEZE_VIOLATION,
  startDate: new Date(Date.now() - 86400000) // Last 24 hours
});
```

### Generate Reports
```typescript
// Get logging summary
const summary = logger.getSummary();
console.log(`Events logged: ${summary.eventsLogged}`);
console.log(`VF.json changes: ${summary.vfJsonChanges}`);
console.log(`Rejections: ${summary.rejectionsTracked}`);

// Generate full report
const report = logger.generateReport();
console.log(report);
```

## Log File Structure

```
/tmp/external-log-lib/
├── events/
│   ├── events-2025-08-13.log     # Daily event logs
│   ├── events-2025-08-12.log
│   └── ...
├── rejections.json                # Persisted rejections
└── logs/                          # Additional log files
```

## Log Entry Format

### Event Log Entry
```json
{
  "timestamp": "2025-08-13T10:30:00.000Z",
  "level": "info",
  "type": "task_queue.created",
  "category": "task_queue",
  "message": "Task TASK-001 created",
  "data": {
    "taskId": "TASK-001",
    "title": "Implement feature",
    "priority": "high"
  },
  "metadata": {
    "pid": 12345,
    "hostname": "dev-machine",
    "theme": "infra_external-log-lib",
    "user": "developer",
    "sessionId": "1234567890-abc",
    "correlationId": "xyz123"
  }
}
```

### Rejection Entry
```json
{
  "id": "REJ-1234567890-abc",
  "timestamp": "2025-08-13T10:30:00.000Z",
  "type": "file_violation",
  "severity": "high",
  "path": "/project/file.bak",
  "operation": "create",
  "reason": "Backup files are not allowed",
  "details": {
    "violationType": "backup_file"
  },
  "resolved": false
}
```

## Automatic Tracking

The system automatically tracks:

### Task Queue Changes
- Task creation
- Task updates (status, priority, assignee)
- Task completion
- Task deletion

### Feature Changes
- Feature creation
- Feature updates
- Feature completion
- Feature deletion

### Name ID Changes
- Entity creation
- Entity updates
- Entity deletion

### File Operations
- File creation
- File modification
- File deletion
- File moves/renames

### Rejections
- File violations
- Permission denied
- Validation failures
- Quota exceeded
- Freeze violations
- Pattern mismatches

## Performance Considerations

1. **Buffered Writing**: Logs are buffered and flushed periodically
2. **Async Operations**: Non-blocking I/O for file operations
3. **Rotation**: Automatic rotation prevents large files
4. **Cleanup**: Old logs are automatically deleted
5. **Selective Logging**: Configure what to track

## Integration with CI/CD

```yaml
# GitHub Actions example
- name: Start Comprehensive Logging
  run: |
    node -e "
    const { startComprehensiveLogging } = require('./layer/themes/infra_external-log-lib/pipe');
    startComprehensiveLogging({
      enableConsole: true,
      logDir: './logs'
    });
    "

- name: Run Tests
  run: npm test

- name: Upload Logs
  uses: actions/upload-artifact@v2
  with:
    name: comprehensive-logs
    path: ./logs/
```

## Troubleshooting

### Logs not appearing
- Check if logging is enabled: `logger.isEnabled()`
- Verify log directory permissions
- Check log directory: `logger.getLogDirectory()`

### High memory usage
- Reduce buffer size in configuration
- Enable more aggressive rotation
- Clear resolved rejections: `rejectionTracker.clearResolved()`

### Missing vf.json changes
- Verify watch paths include your project
- Check if files match patterns (TASK_QUEUE.vf.json, etc.)
- Enable polling as backup

## API Reference

### ComprehensiveLogger Methods

| Method | Description |
|--------|------------|
| `start()` | Start logging and watching |
| `stop()` | Stop logging and generate summary |
| `logEvent(message, level, data)` | Log custom event |
| `logTaskChange(action, id, data)` | Log task queue change |
| `logFeatureChange(action, id, data)` | Log feature change |
| `logNameIdChange(action, id, data)` | Log name ID change |
| `logFileOperation(op, path, details)` | Log file operation |
| `trackRejection(type, reason, details)` | Track rejection |
| `trackFileViolation(error, op)` | Track file violation |
| `queryLogs(options)` | Query log entries |
| `getRejections(options)` | Get rejections |
| `getSummary()` | Get logging summary |
| `generateReport()` | Generate text report |

## Best Practices

1. **Start Early**: Initialize logging at application startup
2. **Use Structured Data**: Pass objects with relevant fields
3. **Set Appropriate Levels**: Use correct log levels
4. **Regular Cleanup**: Periodically clear resolved rejections
5. **Monitor Size**: Watch log directory size
6. **Query Efficiently**: Use filters to limit results
7. **Handle Errors**: Wrap file operations in try-catch

## Conclusion

The Comprehensive Logging System provides complete visibility into your project's operations, automatically tracking all important changes and events. Logs are stored in `/tmp/external-log-lib/` for easy access and analysis.