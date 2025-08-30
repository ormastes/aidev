import { 
  ICentralizedLogService,
  CentralizedLogEntry,
  LogQueryFilters,
  LogQueryResult,
  AggregationStatistics,
  HealthStatus
} from '../domain/interfaces';
import { 
  LogServiceAPIConfig,
  APIResponse,
  LogQueryRequest,
  LogAddRequest,
  HealthCheckResponse,
  PaginatedResponse,
  LogExportRequest,
  StreamingRequest
} from './interfaces';

export class LogServiceAPI {
  private readonly config: Required<LogServiceAPIConfig>;
  private readonly service: ICentralizedLogService;
  private readonly startTime: Date;

  constructor(service: ICentralizedLogService, config: Partial<LogServiceAPIConfig> = {}) {
    this.service = service;
    this.startTime = new Date();
    
    this.config = {
      serviceName: config.serviceName || 'CentralizedLogService',
      version: config.version || '1.0.0',
      enableAuthentication: config.enableAuthentication || false,
      rateLimitRequests: config.rateLimitRequests || 1000,
      rateLimitWindowMs: config.rateLimitWindowMs || 60000,
      enableCORS: config.enableCORS || true,
      maxRequestSize: config.maxRequestSize || 1048576, // 1MB
    };
  }

  async addLogs(request: LogAddRequest): Promise<APIResponse<{ processed: number, errors: any[] }>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      const entries = Array.isArray(request.entries) ? request.entries : [request.entries];
      
      if (request.validateOnly) {
        // Validate entries without adding them
        const validationErrors = this.validateLogEntries(entries);
        return this.createResponse(requestId, startTime, true, {
          processed: entries.length - validationErrors.length,
          errors: validationErrors
        });
      }

      const results = { processed: 0, errors: [] as any[] };

      if (request.batch) {
        // Batch processing
        results.processed = await this.processBatchLogs(entries, results.errors);
      } else {
        // Individual processing
        for (let i = 0; i < entries.length; i++) {
          try {
            await this.service.addLog(entries[i]);
            results.processed++;
          } catch (error) {
            results.errors.push({
              index: i,
              entry: entries[i],
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }

      return this.createResponse(requestId, startTime, true, results);
    } catch (error) {
      return this.createErrorResponse(requestId, startTime, error);
    }
  }

  async queryLogs(request: LogQueryRequest): Promise<APIResponse<LogQueryResult>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Validate and normalize filters
      const normalizedFilters = this.normalizeQueryFilters(request.filters);
      
      // Execute query
      const result = await this.service.queryLogs(normalizedFilters);

      // Format response based on requested format
      if (request.format && request.format !== 'json') {
        const formattedData = this.formatQueryResult(result, request.format);
        return this.createResponse(requestId, startTime, true, formattedData);
      }

      // Include metadata if requested
      if (request.includeMetadata) {
        const stats = await this.service.getAggregationStats();
        return this.createResponse(requestId, startTime, true, {
          ...result,
          metadata: {
            aggregationStats: stats,
            queryMetadata: {
              appliedFilters: normalizedFilters,
              resultCount: result.logs.length,
              totalAvailable: result.totalCount,
            }
          }
        });
      }

      return this.createResponse(requestId, startTime, true, result);
    } catch (error) {
      return this.createErrorResponse(requestId, startTime, error);
    }
  }

  async getAggregationStats(): Promise<APIResponse<AggregationStatistics>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      const stats = await this.service.getAggregationStats();
      return this.createResponse(requestId, startTime, true, stats);
    } catch (error) {
      return this.createErrorResponse(requestId, startTime, error);
    }
  }

  async getHealthCheck(): Promise<APIResponse<HealthCheckResponse>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      const healthStatus = await this.service.getHealthStatus();
      
      const response: HealthCheckResponse = {
        status: healthStatus,
        service: {
          name: this.config.serviceName,
          version: this.config.version,
          uptime: Date.now() - this.startTime.getTime(),
        },
        timestamp: new Date().toISOString(),
      };

      return this.createResponse(requestId, startTime, true, response);
    } catch (error) {
      return this.createErrorResponse(requestId, startTime, error);
    }
  }

  async exportLogs(request: LogExportRequest): Promise<APIResponse<string | Buffer>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Query logs with filters
      const queryResult = await this.service.queryLogs(request.filters);
      
      // Format data according to requested format
      let exportData: string | Buffer;
      
      switch (request.format) {
        case 'json':
          exportData = JSON.stringify(queryResult.logs, null, 2);
          break;
        case 'csv':
          exportData = this.convertToCSV(queryResult.logs, request.includeHeaders);
          break;
        case 'xml':
          exportData = this.convertToXML(queryResult.logs);
          break;
        default:
          throw new Error(`Unsupported export format: ${request.format}`);
      }

      // Apply compression if requested
      if (request.compression) {
        exportData = await this.compressData(exportData, request.compression);
      }

      return this.createResponse(requestId, startTime, true, exportData);
    } catch (error) {
      return this.createErrorResponse(requestId, startTime, error);
    }
  }

  async startStreaming(request: StreamingRequest): Promise<APIResponse<{ subscriptionId: string }>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      const subscriptionId = await this.service.subscribeToStream(
        request.filters,
        (logs) => {
          // This would be handled by the HTTP adapter for actual streaming
          console.log(`Streaming ${logs.length} logs to subscription ${subscriptionId}`);
        }
      );

      return this.createResponse(requestId, startTime, true, { subscriptionId });
    } catch (error) {
      return this.createErrorResponse(requestId, startTime, error);
    }
  }

  async stopStreaming(subscriptionId: string): Promise<APIResponse<{ success: boolean }>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      await this.service.unsubscribeFromStream(subscriptionId);
      return this.createResponse(requestId, startTime, true, { success: true });
    } catch (error) {
      return this.createErrorResponse(requestId, startTime, error);
    }
  }

  // Private helper methods

  private validateLogEntries(entries: CentralizedLogEntry[]): any[] {
    const errors: any[] = [];
    
    entries.forEach((entry, index) => {
      if (!entry.processId) {
        errors.push({ index, field: 'processId', message: 'Process ID is required' });
      }
      if (!entry.message) {
        errors.push({ index, field: 'message', message: 'Message is required' });
      }
      if (!entry.level) {
        errors.push({ index, field: 'level', message: 'Log level is required' });
      }
      if (!entry.timestamp) {
        errors.push({ index, field: 'timestamp', message: 'Timestamp is required' });
      }
    });

    return errors;
  }

  private async processBatchLogs(entries: CentralizedLogEntry[], errors: any[]): Promise<number> {
    let processed = 0;
    
    // In a real implementation, this would use batch processing for better performance
    for (let i = 0; i < entries.length; i++) {
      try {
        await this.service.addLog(entries[i]);
        processed++;
      } catch (error) {
        errors.push({
          index: i,
          entry: entries[i],
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return processed;
  }

  private normalizeQueryFilters(filters: LogQueryFilters): LogQueryFilters {
    return {
      ...filters,
      limit: Math.min(filters.limit || 100, 1000), // Cap at 1000
      offset: Math.max(filters.offset || 0, 0), // Ensure non-negative
    };
  }

  private formatQueryResult(result: LogQueryResult, format: string): any {
    switch (format) {
      case 'csv':
        return this.convertToCSV(result.logs, true);
      case 'text':
        return result.logs.map(log => 
          `[${log.timestamp.toISOString()}] ${log.level}: ${log.message}`
        ).join('\n');
      default:
        return result;
    }
  }

  private convertToCSV(logs: CentralizedLogEntry[], includeHeaders = true): string {
    if (logs.length === 0) return '';

    const headers = ['timestamp', 'level', 'processId', 'source', 'message'];
    const rows = logs.map(log => [
      log.timestamp.toISOString(),
      log.level,
      log.processId,
      log.source,
      `"${log.message.replace(/"/g, '""')}"` // Escape quotes
    ]);

    const csvLines = includeHeaders ? [headers, ...rows] : rows;
    return csvLines.map(row => row.join(',')).join('\n');
  }

  private convertToXML(logs: CentralizedLogEntry[]): string {
    const xmlLogs = logs.map(log => `
    <log>
      <timestamp>${log.timestamp.toISOString()}</timestamp>
      <level>${log.level}</level>
      <processId>${log.processId}</processId>
      <source>${log.source}</source>
      <message><![CDATA[${log.message}]]></message>
    </log>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<logs>
  ${xmlLogs}
</logs>`;
  }

  private async compressData(data: string | Buffer, compression: 'gzip' | 'zip'): Promise<Buffer> {
    // This would use actual compression libraries like zlib
    // For now, return as-is (would be implemented with proper compression)
    return Buffer.from(data);
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createResponse<T>(
    requestId: string, 
    startTime: number, 
    success: boolean, 
    data?: T
  ): APIResponse<T> {
    return {
      success,
      data,
      timestamp: new Date().toISOString(),
      requestId,
      executionTime: Date.now() - startTime,
    };
  }

  private createErrorResponse(requestId: string, startTime: number, error: any): APIResponse {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      requestId,
      executionTime: Date.now() - startTime,
    };
  }
}