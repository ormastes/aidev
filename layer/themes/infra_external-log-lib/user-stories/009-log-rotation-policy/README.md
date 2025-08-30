# Log Rotation Policy Implementation

## Overview

This user story implements a comprehensive log rotation policy system that integrates with the centralized log aggregation service. The system provides multiple rotation policies including size-based, time-based, count-based, and age-based rotation with gzip compression support.

## Integration with Centralized Log Service

This module integrates with the centralized log service from user-stories/008-centralized-log-service to provide:

- Automatic rotation policy application
- Real-time monitoring of log file sizes and ages
- Seamless integration with existing log workflows
- Configuration synchronization

## Architecture

### Domain Layer (`src/domain/`)
- **LogRotationService**: Main orchestrator for all rotation operations
- **RotationPolicy**: Base interface for all rotation policies
- **SizeBasedPolicy**: Handles rotation based on file size thresholds
- **TimeBasedPolicy**: Manages scheduled rotation (daily/weekly/monthly)
- **CountBasedPolicy**: Maintains maximum number of log files
- **AgeBasedPolicy**: Cleans up logs older than specified age
- **RotationIndex**: Maintains searchable metadata for rotated files

### Application Layer (`src/application/`)
- **RotationScheduler**: Manages rotation schedules and timing
- **RotationConfigManager**: Handles policy configuration and updates
- **RotationHealthMonitor**: Monitors rotation health and metrics

### External Layer (`src/external/`)
- **FileSystemRotator**: Atomic file system operations for rotation
- **CompressionManager**: Handles gzip compression and decompression
- **StorageMetrics**: Monitors disk usage and storage health

### Pipe Layer (`src/pipe/`)
- Public API gateway for integration with centralized log service
- Type definitions and cross-layer communication interfaces

## Rotation Policies

### 1. Size-Based Rotation
- Rotates logs when files exceed configurable size threshold (default: 100MB)
- Supports atomic rotation operations
- Maintains original file naming with timestamp suffix

### 2. Time-Based Rotation
- Daily, weekly, or monthly rotation schedules
- Configurable rotation time (default: midnight)
- Timezone-aware scheduling

### 3. Count-Based Rotation
- Maintains maximum number of log files (default: 10)
- Automatically cleans up oldest files when limit exceeded
- Preserves most recent logs

### 4. Age-Based Cleanup
- Removes logs older than specified age (default: 30 days)
- Configurable cleanup schedule
- Supports both compressed and uncompressed files

## Compression Features

- Automatic gzip compression of rotated files
- Configurable compression levels (1-9, default: 6)
- Streaming compression for large files to minimize memory usage
- Integrity verification after compression
- On-demand decompression for queries

## Index System

The rotation system maintains a searchable index of all rotated files including:

- Original filename and rotated filename
- Rotation timestamp and file age
- File size before and after compression
- Compression ratio and compression level used
- Log date range covered by each file
- Metadata for fast query resolution

## Configuration

```typescript
interface RotationConfig {
  sizePolicy: {
    enabled: boolean;
    maxSizeMB: number;
    enableCompression: boolean;
  };
  timePolicy: {
    enabled: boolean;
    schedule: 'daily' | 'weekly' | 'monthly';
    rotationTime: string; // HH:MM format
  };
  countPolicy: {
    enabled: boolean;
    maxFiles: number;
    cleanupOnRotation: boolean;
  };
  agePolicy: {
    enabled: boolean;
    maxAgeDays: number;
    cleanupSchedule: 'daily' | 'weekly';
  };
  compression: {
    level: number; // 1-9
    enabled: boolean;
  };
}
```

## Testing Strategy

Following Mock Free Test Oriented Development:

### Unit Tests (`tests/unit/`)
- Individual policy implementations
- Configuration management
- Index operations
- Compression utilities

### Integration Tests (`tests/integration/`)
- Policy combination scenarios
- Centralized log service integration
- File system operations
- Health monitoring

### System Tests (`tests/system/`)
- End-to-end rotation workflows
- Performance under load
- Error recovery scenarios
- Configuration persistence

## Performance Characteristics

- **Rotation Speed**: < 1 second for files up to 1GB
- **Compression Ratio**: Typically 5-10x reduction for text logs
- **Memory Usage**: Streaming operations, < 100MB peak for any file size
- **Index Query Time**: < 100ms for up to 10,000 rotated files

## Monitoring and Health

The system provides comprehensive monitoring:

- Rotation success/failure rates
- Compression statistics
- Storage usage trends
- Policy compliance metrics
- Error rates and recovery times

## Dependencies

- Centralized Log Service (user-stories/008-centralized-log-service)
- Log Configuration (../../src/config/log-config)
- Node.js built-in zlib for compression
- File system utilities from external-log-lib core