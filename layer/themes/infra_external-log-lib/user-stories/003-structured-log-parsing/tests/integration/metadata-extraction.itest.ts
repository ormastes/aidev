import { StructuredLogParser } from '../../src/external/structured-log-parser';
import { StructuredLogEntry } from '../../src/external/json-log-parser';

describe('Metadata Extraction and Querying Integration Test', () => {
  let parser: StructuredLogParser;
  let sampleLogs: StructuredLogEntry[];

  beforeEach(() => {
    parser = new StructuredLogParser({ format: 'auto' });
    
    // Create a diverse set of log entries with various metadata
    const logLines = [
      // JSON logs with nested metadata
      '{"timestamp": "2025-01-15T10:00:00.000Z", "level": "info", "message": "User login", "user": {"id": 123, "email": "user@example.com", "role": "admin"}, "request": {"ip": "192.168.1.1", "userAgent": "Chrome"}}',
      '{"timestamp": "2025-01-15T10:01:00.000Z", "level": "warn", "message": "High memory usage", "memory": {"used": 85, "total": 100, "unit": "MB"}, "service": "api", "version": "1.2.3"}',
      '{"timestamp": "2025-01-15T10:02:00.000Z", "level": "error", "message": "Database error", "error": {"code": 500, "type": "connection_timeout"}, "database": {"host": "db.example.com", "port": 5432}}',
      '{"timestamp": "2025-01-15T10:03:00.000Z", "level": "debug", "message": "Cache hit", "cache": {"key": "user:123", "ttl": 3600}, "performance": {"responseTime": 25}}',
      
      // Key-value logs with various metadata
      'timestamp=2025-01-15T10:04:00.000Z level=info message="Order processed" order_id=12345 customer_id=67890 amount=99.99 currency=USD payment_method=credit_card',
      'timestamp=2025-01-15T10:05:00.000Z level=warn message="Rate limit exceeded" user_id=123 endpoint="/api/users" requests_per_minute=1000 limit=500',
      'timestamp=2025-01-15T10:06:00.000Z level=info message="File uploaded" file_name="document.pdf" file_size=2048576 upload_time=1.5 user_id=456',
      'timestamp=2025-01-15T10:07:00.000Z level=error message="Authentication failed" user_email="hacker@evil.com" attempts=5 ip_address="10.0.0.1" blocked=true',
      
      // Mixed format logs with common fields but different structures
      '{"timestamp": "2025-01-15T10:08:00.000Z", "level": "info", "message": "API call", "endpoint": "/users", "method": "GET", "status": 200, "response_time": 150}',
      'timestamp=2025-01-15T10:09:00.000Z level=info message="API call" endpoint="/orders" method=POST status=201 response_time=250',
      
      // Plain text logs (should have no metadata)
      'Simple log message without structure',
      'Another plain text log'
    ];

    sampleLogs = logLines.map(line => parser.parseLogLine(line, 'stdout'));
  });

  describe('Metadata Filtering', () => {
    it('should filter logs by exact metadata values', () => {
      // Filter by user ID
      const userLogs = parser.filterByMetadata(sampleLogs, 'user_id', 123);
      expect(userLogs).toHaveLength(1);
      expect(userLogs[0].message).toBe('Rate limit exceeded');
      expect(userLogs[0].metadata?.user_id).toBe(123);

      // Filter by status code
      const successLogs = parser.filterByMetadata(sampleLogs, 'status', 200);
      expect(successLogs).toHaveLength(1);
      expect(successLogs[0].metadata?.endpoint).toBe('/users');

      // Filter by payment method
      const creditCardLogs = parser.filterByMetadata(sampleLogs, 'payment_method', 'credit_card');
      expect(creditCardLogs).toHaveLength(1);
      expect(creditCardLogs[0].message).toBe('Order processed');
    });

    it('should handle nested metadata filtering', () => {
      // Filter by nested objects as In Progress values
      const userLogsWithUser = sampleLogs.filter(log => log.metadata?.user);
      expect(userLogsWithUser).toHaveLength(1);
      expect(userLogsWithUser[0].message).toBe('User login');
      expect(userLogsWithUser[0].metadata?.user.role).toBe('admin');

      // Filter by nested error objects
      const logsWithError = sampleLogs.filter(log => log.metadata?.error);
      expect(logsWithError).toHaveLength(1);
      expect(logsWithError[0].message).toBe('Database error');
      expect(logsWithError[0].metadata?.error.type).toBe('connection_timeout');

      // Filter by nested memory objects
      const logsWithMemory = sampleLogs.filter(log => log.metadata?.memory);
      expect(logsWithMemory).toHaveLength(1);
      expect(logsWithMemory[0].message).toBe('High memory usage');
      expect(logsWithMemory[0].metadata?.memory.unit).toBe('MB');
    });

    it('should return empty array for non-existent metadata', () => {
      const nonExistentLogs = parser.filterByMetadata(sampleLogs, 'non_existent_field', 'any_value');
      expect(nonExistentLogs).toHaveLength(0);

      const wrongValueLogs = parser.filterByMetadata(sampleLogs, 'user_id', 99999);
      expect(wrongValueLogs).toHaveLength(0);
    });

    it('should handle different data types in metadata', () => {
      // Numeric values
      const numericLogs = parser.filterByMetadata(sampleLogs, 'order_id', 12345);
      expect(numericLogs).toHaveLength(1);

      // Boolean values
      const blockedLogs = parser.filterByMetadata(sampleLogs, 'blocked', true);
      expect(blockedLogs).toHaveLength(1);
      expect(blockedLogs[0].message).toBe('Authentication failed');

      // String values
      const pdfLogs = parser.filterByMetadata(sampleLogs, 'file_name', 'document.pdf');
      expect(pdfLogs).toHaveLength(1);
    });
  });

  describe('Metadata Field Extraction', () => {
    it('should extract all values for a given metadata field', () => {
      // Extract all user IDs
      const userIds = parser.extractMetadataField(sampleLogs, 'user_id');
      expect(userIds).toContain(123);
      expect(userIds).toContain(456);
      expect(userIds).toHaveLength(2);

      // Extract all endpoints
      const endpoints = parser.extractMetadataField(sampleLogs, 'endpoint');
      expect(endpoints).toContain('/users');
      expect(endpoints).toContain('/orders');
      expect(endpoints).toContain('/api/users');
      expect(endpoints).toHaveLength(3);

      // Extract all HTTP methods
      const methods = parser.extractMetadataField(sampleLogs, 'method');
      expect(methods).toContain('GET');
      expect(methods).toContain('POST');
      expect(methods).toHaveLength(2);
    });

    it('should extract nested metadata objects', () => {
      // Extract user objects
      const userObjects = parser.extractMetadataField(sampleLogs, 'user');
      expect(userObjects).toHaveLength(1);
      expect(userObjects[0]).toEqual({
        id: 123,
        email: 'user@example.com',
        role: 'admin'
      });

      // Extract error objects
      const errorObjects = parser.extractMetadataField(sampleLogs, 'error');
      expect(errorObjects).toHaveLength(1);
      expect(errorObjects[0]).toEqual({
        code: 500,
        type: 'connection_timeout'
      });

      // Extract cache objects
      const cacheObjects = parser.extractMetadataField(sampleLogs, 'cache');
      expect(cacheObjects).toHaveLength(1);
      expect(cacheObjects[0]).toEqual({
        key: 'user:123',
        ttl: 3600
      });
    });

    it('should return empty array for non-existent fields', () => {
      const nonExistentValues = parser.extractMetadataField(sampleLogs, 'non_existent_field');
      expect(nonExistentValues).toHaveLength(0);
    });

    it('should handle duplicate values correctly', () => {
      // Add more logs with duplicate endpoints
      const additionalLogs = [
        parser.parseLogLine('{"timestamp": "2025-01-15T10:10:00.000Z", "level": "info", "message": "Another API call", "endpoint": "/users", "method": "DELETE"}', 'stdout'),
        parser.parseLogLine('timestamp=2025-01-15T10:11:00.000Z level=info message="Yet another API call" endpoint="/users" method=PUT', 'stdout')
      ];

      const allLogs = [...sampleLogs, ...additionalLogs];
      const endpoints = parser.extractMetadataField(allLogs, 'endpoint');
      
      // Should extract all instances, including duplicates
      expect(endpoints.filter(e => e === '/users')).toHaveLength(3);
      expect(endpoints).toContain('/orders');
      expect(endpoints).toContain('/api/users');
    });
  });

  describe('Metadata Grouping', () => {
    it('should group logs by metadata values', () => {
      // Group by HTTP method
      const groupedByMethod = parser.groupByMetadata(sampleLogs, 'method');
      
      expect(groupedByMethod['GET']).toBeDefined();
      expect(groupedByMethod['GET']).toHaveLength(1);
      expect(groupedByMethod['GET'][0].metadata?.endpoint).toBe('/users');

      expect(groupedByMethod['POST']).toBeDefined();
      expect(groupedByMethod['POST']).toHaveLength(1);
      expect(groupedByMethod['POST'][0].metadata?.endpoint).toBe('/orders');

      // Group by user ID
      const groupedByUserId = parser.groupByMetadata(sampleLogs, 'user_id');
      
      expect(groupedByUserId['123']).toBeDefined();
      expect(groupedByUserId['123']).toHaveLength(1);
      expect(groupedByUserId['123'][0].message).toBe('Rate limit exceeded');

      expect(groupedByUserId['456']).toBeDefined();
      expect(groupedByUserId['456']).toHaveLength(1);
      expect(groupedByUserId['456'][0].message).toBe('File uploaded');
    });

    it('should handle nested metadata object grouping', () => {
      // Group by database object
      const groupedByDatabase = parser.groupByMetadata(sampleLogs, 'database');
      expect(Object.keys(groupedByDatabase)).toHaveLength(1);
      const dbKey = Object.keys(groupedByDatabase)[0];
      expect(groupedByDatabase[dbKey]).toHaveLength(1);
      expect(groupedByDatabase[dbKey][0].message).toBe('Database error');

      // Group by user object
      const groupedByUser = parser.groupByMetadata(sampleLogs, 'user');
      expect(Object.keys(groupedByUser)).toHaveLength(1);
      const userKey = Object.keys(groupedByUser)[0];
      expect(groupedByUser[userKey]).toHaveLength(1);
      expect(groupedByUser[userKey][0].message).toBe('User login');
    });

    it('should return empty object for non-existent fields', () => {
      const groupedByNonExistent = parser.groupByMetadata(sampleLogs, 'non_existent_field');
      expect(Object.keys(groupedByNonExistent)).toHaveLength(0);
    });

    it('should handle mixed data types in grouping', () => {
      // Group by status code (numeric)
      const groupedByStatus = parser.groupByMetadata(sampleLogs, 'status');
      expect(groupedByStatus['200']).toBeDefined(); // Converted to string key
      expect(groupedByStatus['201']).toBeDefined();
      expect(groupedByStatus['200']).toHaveLength(1);

      // Group by blocked status (boolean)
      const groupedByBlocked = parser.groupByMetadata(sampleLogs, 'blocked');
      expect(groupedByBlocked['true']).toBeDefined(); // Converted to string key
      expect(groupedByBlocked['true']).toHaveLength(1);
    });
  });

  describe('Statistics Generation', () => {
    it('should generate comprehensive statistics', () => {
      const stats = parser.getStatistics(sampleLogs);

      // Basic counts
      expect(stats.total).toBe(sampleLogs.length);
      expect(stats.total).toBeGreaterThan(10);

      // Level distribution
      expect(stats.byLevel.info).toBeGreaterThan(0);
      expect(stats.byLevel.warn).toBeGreaterThan(0);
      expect(stats.byLevel.error).toBeGreaterThan(0);
      expect(stats.byLevel.debug).toBeGreaterThan(0);

      // Metadata statistics
      expect(stats.withMetadata).toBeGreaterThan(0);
      expect(stats.withMetadata).toBeLessThan(stats.total); // Some logs have no metadata

      // Unique metadata keys
      expect(stats.uniqueMetadataKeys).toContain('user_id');
      expect(stats.uniqueMetadataKeys).toContain('endpoint');
      expect(stats.uniqueMetadataKeys).toContain('method');
      expect(stats.uniqueMetadataKeys).toContain('status');
      expect(stats.uniqueMetadataKeys).toContain('order_id');
    });

    it('should handle logs with no metadata', () => {
      const plainTextLogs = [
        parser.parseLogLine('Just a plain log', 'stdout'),
        parser.parseLogLine('Another plain log', 'stderr')
      ];

      const stats = parser.getStatistics(plainTextLogs);
      
      expect(stats.total).toBe(2);
      expect(stats.withMetadata).toBe(0);
      expect(stats.uniqueMetadataKeys).toHaveLength(0);
      expect(stats.byLevel.info).toBe(1); // stdout default
      expect(stats.byLevel.error).toBe(1); // stderr default
    });

    it('should count nested metadata keys correctly', () => {
      const stats = parser.getStatistics(sampleLogs);

      // Should include top-level metadata keys (not flattened)
      expect(stats.uniqueMetadataKeys).toContain('user'); // Nested user object
      expect(stats.uniqueMetadataKeys).toContain('error'); // Nested error object
      expect(stats.uniqueMetadataKeys).toContain('request'); // Nested request object
      expect(stats.uniqueMetadataKeys).toContain('memory'); // Nested memory object
      expect(stats.uniqueMetadataKeys).toContain('database'); // Nested database object
      expect(stats.uniqueMetadataKeys).toContain('cache'); // Nested cache object
      expect(stats.uniqueMetadataKeys).toContain('performance'); // Nested performance object
    });

    it('should provide sorted metadata keys', () => {
      const stats = parser.getStatistics(sampleLogs);
      
      // Keys should be sorted alphabetically
      const sortedKeys = [...stats.uniqueMetadataKeys].sort();
      expect(stats.uniqueMetadataKeys).toEqual(sortedKeys);
    });
  });

  describe('Complex Querying Scenarios', () => {
    it('should support chained filtering operations', () => {
      // First filter by level, then by metadata
      const errorLogs = sampleLogs.filter(log => log.level === 'error');
      const blockedErrors = parser.filterByMetadata(errorLogs, 'blocked', true);
      
      expect(blockedErrors).toHaveLength(1);
      expect(blockedErrors[0].message).toBe('Authentication failed');
      expect(blockedErrors[0].level).toBe('error');
    });

    it('should support complex metadata analysis', () => {
      // Find all unique API endpoints
      const endpoints = parser.extractMetadataField(sampleLogs, 'endpoint');
      const uniqueEndpoints = [...new Set(endpoints)];
      expect(uniqueEndpoints).toHaveLength(3);

      // Find performance-related logs
      const performanceLogs = sampleLogs.filter(log => 
        log.metadata?.response_time || log.metadata?.responseTime
      );
      expect(performanceLogs.length).toBeGreaterThan(0);

      // Group by service/application type
      const apiLogs = sampleLogs.filter(log => 
        log.metadata?.endpoint || log.metadata?.method
      );
      expect(apiLogs.length).toBeGreaterThan(0);
    });

    it('should handle time-based metadata queries', () => {
      // All logs should have timestamps
      const allTimestamps = sampleLogs.map(log => log.timestamp);
      expect(allTimestamps.every(ts => ts instanceof Date)).toBe(true);

      // Find logs within a time range
      const startTime = new Date('2025-01-15T10:02:00.000Z');
      const endTime = new Date('2025-01-15T10:06:00.000Z');
      
      const timeRangeLogs = sampleLogs.filter(log => 
        log.timestamp >= startTime && log.timestamp <= endTime
      );
      expect(timeRangeLogs.length).toBeGreaterThan(0);
    });

    it('should support aggregation operations', () => {
      // Calculate average response time
      const responseTimes = [
        ...parser.extractMetadataField(sampleLogs, 'response_time'),
        ...parser.extractMetadataField(sampleLogs, 'responseTime')
      ].filter(rt => typeof rt === 'number');
      
      if (responseTimes.length > 0) {
        const avgResponseTime = responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length;
        expect(avgResponseTime).toBeGreaterThan(0);
      }

      // Count unique users
      const userIds = parser.extractMetadataField(sampleLogs, 'user_id');
      const uniqueUsers = new Set(userIds);
      expect(uniqueUsers.size).toBeGreaterThan(0);

      // Count error objects with types
      const errorObjects = parser.extractMetadataField(sampleLogs, 'error');
      const errorWithTimeout = errorObjects.find(err => err?.type === 'connection_timeout');
      expect(errorWithTimeout).toBeDefined();
    });
  });
});