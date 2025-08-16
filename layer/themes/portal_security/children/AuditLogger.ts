/**
 * Comprehensive Audit Logging System
 * Tracks all security-relevant events and user actions
 */

import { fs } from '../layer/themes/infra_external-log-lib/dist';
import { path } from '../layer/themes/infra_external-log-lib/dist';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { EventEmitter } from 'events';

export enum AuditEventType {
  // Authentication events
  LOGIN_SUCCESS = 'AUTH_LOGIN_SUCCESS',
  LOGIN_FAILURE = 'AUTH_LOGIN_FAILURE',
  LOGOUT = 'AUTH_LOGOUT',
  PASSWORD_CHANGE = 'AUTH_PASSWORD_CHANGE',
  PASSWORD_RESET = 'AUTH_PASSWORD_RESET',
  MFA_ENABLED = 'AUTH_MFA_ENABLED',
  MFA_DISABLED = 'AUTH_MFA_DISABLED',
  
  // Authorization events
  ACCESS_GRANTED = 'AUTHZ_ACCESS_GRANTED',
  ACCESS_DENIED = 'AUTHZ_ACCESS_DENIED',
  PRIVILEGE_ESCALATION = 'AUTHZ_PRIVILEGE_ESCALATION',
  ROLE_CHANGE = 'AUTHZ_ROLE_CHANGE',
  
  // Data events
  DATA_CREATE = 'DATA_CREATE',
  DATA_READ = 'DATA_READ',
  DATA_UPDATE = 'DATA_UPDATE',
  DATA_DELETE = 'DATA_DELETE',
  DATA_EXPORT = 'DATA_EXPORT',
  DATA_IMPORT = 'DATA_IMPORT',
  
  // Security events
  SECURITY_VIOLATION = 'SEC_VIOLATION',
  RATE_LIMIT_EXCEEDED = 'SEC_RATE_LIMIT',
  CSRF_FAILURE = 'SEC_CSRF_FAILURE',
  XSS_ATTEMPT = 'SEC_XSS_ATTEMPT',
  SQL_INJECTION_ATTEMPT = 'SEC_SQL_INJECTION',
  SUSPICIOUS_ACTIVITY = 'SEC_SUSPICIOUS',
  
  // System events
  SYSTEM_START = 'SYS_START',
  SYSTEM_STOP = 'SYS_STOP',
  CONFIG_CHANGE = 'SYS_CONFIG_CHANGE',
  ERROR = 'SYS_ERROR',
  CRITICAL_ERROR = 'SYS_CRITICAL_ERROR',
  
  // Compliance events
  GDPR_DATA_REQUEST = 'COMPLIANCE_GDPR_REQUEST',
  GDPR_DATA_DELETION = 'COMPLIANCE_GDPR_DELETE',
  CONSENT_GIVEN = 'COMPLIANCE_CONSENT_GIVEN',
  CONSENT_WITHDRAWN = 'COMPLIANCE_CONSENT_WITHDRAWN'
}

export enum AuditSeverity {
  INFO = 'INFO',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface AuditEvent {
  id: string;
  timestamp: Date;
  type: AuditEventType;
  severity: AuditSeverity;
  userId?: string;
  username?: string;
  ip?: string;
  userAgent?: string;
  sessionId?: string;
  resource?: string;
  action?: string;
  result: 'success' | 'failure';
  details?: any;
  metadata?: Record<string, any>;
  hash?: string;
}

export interface AuditLoggerOptions {
  logDir?: string;
  maxFileSize?: number;
  maxFiles?: number;
  encryptLogs?: boolean;
  encryptionKey?: string;
  realtime?: boolean;
  storage?: 'file' | 'database' | 'both';
  alertOnCritical?: boolean;
  alertWebhook?: string;
  retentionDays?: number;
}

/**
 * Audit Logger implementation
 */
export class AuditLogger extends EventEmitter {
  private options: Required<AuditLoggerOptions>;
  private currentLogFile: string;
  private logStream?: fs.WriteStream;
  private eventQueue: AuditEvent[] = [];
  private flushInterval?: NodeJS.Timeout;

  constructor(options: AuditLoggerOptions = {}) {
    super();
    
    this.options = {
      logDir: options.logDir ?? './audit-logs',
      maxFileSize: options.maxFileSize ?? 10 * 1024 * 1024, // 10MB
      maxFiles: options.maxFiles ?? 100,
      encryptLogs: options.encryptLogs ?? false,
      encryptionKey: options.encryptionKey ?? '',
      realtime: options.realtime ?? false,
      storage: options.storage ?? 'file',
      alertOnCritical: options.alertOnCritical ?? true,
      alertWebhook: options.alertWebhook ?? '',
      retentionDays: options.retentionDays ?? 90
    };
    
    this.initialize();
  }

  /**
   * Initialize the audit logger
   */
  private initialize(): void {
    // Create log directory if it doesn't exist
    if (!fs.existsSync(this.options.logDir)) {
      fs.mkdirSync(this.options.logDir, { recursive: true });
    }
    
    // Set up current log file
    this.rotateLogFile();
    
    // Set up flush interval
    this.flushInterval = setInterval(() => this.flush(), 5000); // Flush every 5 seconds
    
    // Set up retention cleanup
    setInterval(() => this.cleanupOldLogs(), 86400000); // Daily cleanup
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Calculate event hash for integrity
   */
  private calculateHash(event: AuditEvent): string {
    const data = JSON.stringify({
      id: event.id,
      timestamp: event.timestamp,
      type: event.type,
      userId: event.userId,
      details: event.details
    });
    
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }

  /**
   * Encrypt log data if enabled
   */
  private encryptData(data: string): string {
    if (!this.options.encryptLogs || !this.options.encryptionKey) {
      return data;
    }
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(this.options.encryptionKey, 'hex'),
      iv
    );
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt log data
   */
  private decryptData(encryptedData: string): string {
    if (!this.options.encryptLogs || !this.options.encryptionKey) {
      return encryptedData;
    }
    
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(this.options.encryptionKey, 'hex'),
      iv
    );
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Rotate log file when size limit is reached
   */
  private rotateLogFile(): void {
    if (this.logStream) {
      this.logStream.end();
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.currentLogFile = path.join(this.options.logDir, `audit-${timestamp}.log`);
    
    this.logStream = fs.createWriteStream(this.currentLogFile, { flags: 'a' });
    
    // Check file size periodically
    const checkSize = setInterval(() => {
      fs.stat(this.currentLogFile, (err, stats) => {
        if (!err && stats.size > this.options.maxFileSize) {
          clearInterval(checkSize);
          this.rotateLogFile();
        }
      });
    }, 60000); // Check every minute
  }

  /**
   * Clean up old log files
   */
  private cleanupOldLogs(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.options.retentionDays);
    
    fs.readdir(this.options.logDir, (err, files) => {
      if (err) return;
      
      files.forEach(file => {
        const filePath = path.join(this.options.logDir, file);
        fs.stat(filePath, (err, stats) => {
          if (!err && stats.mtime < cutoffDate) {
            fs.unlink(filePath, () => {});
          }
        });
      });
    });
  }

  /**
   * Send alert for critical events
   */
  private async sendAlert(event: AuditEvent): Promise<void> {
    if (!this.options.alertOnCritical || !this.options.alertWebhook) {
      return;
    }
    
    try {
      // Send webhook notification
      const response = await fetch(this.options.alertWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 Critical Security Event: ${event.type}`,
          event: event
        })
      });
      
      if (!response.ok) {
        console.error('Failed to send alert webhook');
      }
    } catch (error) {
      console.error('Error sending alert:', error);
    }
  }

  /**
   * Log an audit event
   */
  public async log(event: Partial<AuditEvent>): Promise<void> {
    const fullEvent: AuditEvent = {
      id: event.id || this.generateEventId(),
      timestamp: event.timestamp || new Date(),
      type: event.type || AuditEventType.SYSTEM_START,
      severity: event.severity || AuditSeverity.INFO,
      result: event.result || 'success',
      ...event
    };
    
    // Calculate hash for integrity
    fullEvent.hash = this.calculateHash(fullEvent);
    
    // Add to queue
    this.eventQueue.push(fullEvent);
    
    // Emit event for real-time monitoring
    if (this.options.realtime) {
      this.emit('audit-event', fullEvent);
    }
    
    // Send alert for critical events
    if (fullEvent.severity === AuditSeverity.CRITICAL) {
      await this.sendAlert(fullEvent);
    }
    
    // Flush immediately for critical events
    if (fullEvent.severity === AuditSeverity.CRITICAL || this.eventQueue.length > 100) {
      await this.flush();
    }
  }

  /**
   * Flush events to storage
   */
  private async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;
    
    const events = [...this.eventQueue];
    this.eventQueue = [];
    
    // Write to file
    if (this.options.storage === 'file' || this.options.storage === 'both') {
      for (const event of events) {
        const logLine = JSON.stringify(event) + '\n';
        const data = this.options.encryptLogs ? this.encryptData(logLine) : logLine;
        
        if (this.logStream) {
          this.logStream.write(data);
        }
      }
    }
    
    // Write to database (implement based on your database)
    if (this.options.storage === 'database' || this.options.storage === 'both') {
      // Implement database storage
      // await this.saveToDatabase(events);
    }
  }

  /**
   * Express middleware for automatic request logging
   */
  public middleware(options: { 
    logRequests?: boolean; 
    logResponses?: boolean;
    sensitiveFields?: string[];
  } = {}) {
    const { 
      logRequests = true, 
      logResponses = true,
      sensitiveFields = ['password', 'token', 'secret', 'apiKey']
    } = options;
    
    return async (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const requestId = crypto.randomBytes(8).toString('hex');
      
      // Attach request ID
      (req as any).requestId = requestId;
      
      // Log request
      if (logRequests) {
        const sanitizedBody = this.sanitizeData(req.body, sensitiveFields);
        
        await this.log({
          type: AuditEventType.DATA_READ,
          severity: AuditSeverity.INFO,
          userId: (req as any).user?.id,
          username: (req as any).user?.username,
          ip: req.ip,
          userAgent: req.get('user-agent'),
          sessionId: (req as any).sessionID,
          resource: req.path,
          action: req.method,
          result: 'success',
          details: {
            requestId,
            method: req.method,
            path: req.path,
            query: req.query,
            body: sanitizedBody
          }
        });
      }
      
      // Log response
      if (logResponses) {
        const originalSend = res.send;
        res.send = function(data: any) {
          const duration = Date.now() - startTime;
          
          // Log based on status code
          const severity = res.statusCode >= 500 ? AuditSeverity.HIGH :
                         res.statusCode >= 400 ? AuditSeverity.MEDIUM :
                         AuditSeverity.INFO;
          
          const eventType = res.statusCode >= 400 ? 
                          AuditEventType.ACCESS_DENIED : 
                          AuditEventType.ACCESS_GRANTED;
          
          this.log({
            type: eventType,
            severity,
            userId: (req as any).user?.id,
            username: (req as any).user?.username,
            ip: req.ip,
            resource: req.path,
            action: req.method,
            result: res.statusCode < 400 ? 'success' : 'failure',
            details: {
              requestId,
              statusCode: res.statusCode,
              duration
            }
          });
          
          return originalSend.call(this, data);
        }.bind(this);
      }
      
      next();
    };
  }

  /**
   * Sanitize sensitive data
   */
  private sanitizeData(data: any, sensitiveFields: string[]): any {
    if (!data) return data;
    
    const sanitized = { ...data };
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***REDACTED***';
      }
    }
    
    return sanitized;
  }

  /**
   * Query audit logs
   */
  public async query(filters: {
    startDate?: Date;
    endDate?: Date;
    type?: AuditEventType;
    severity?: AuditSeverity;
    userId?: string;
    limit?: number;
  }): Promise<AuditEvent[]> {
    const results: AuditEvent[] = [];
    
    // Read log files
    const files = fs.readdirSync(this.options.logDir)
      .filter(f => f.startsWith('audit-'))
      .sort()
      .reverse();
    
    for (const file of files) {
      const filePath = path.join(this.options.logDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(Boolean);
      
      for (const line of lines) {
        try {
          const data = this.options.encryptLogs ? this.decryptData(line) : line;
          const event = JSON.parse(data) as AuditEvent;
          
          // Apply filters
          if (filters.startDate && new Date(event.timestamp) < filters.startDate) continue;
          if (filters.endDate && new Date(event.timestamp) > filters.endDate) continue;
          if (filters.type && event.type !== filters.type) continue;
          if (filters.severity && event.severity !== filters.severity) continue;
          if (filters.userId && event.userId !== filters.userId) continue;
          
          results.push(event);
          
          if (filters.limit && results.length >= filters.limit) {
            return results;
          }
        } catch (error) {
          // Skip invalid lines
        }
      }
    }
    
    return results;
  }

  /**
   * Generate audit report
   */
  public async generateReport(startDate: Date, endDate: Date): Promise<string> {
    const events = await this.query({ startDate, endDate });
    
    const report = {
      period: {
        start: startDate,
        end: endDate
      },
      summary: {
        totalEvents: events.length,
        byType: {} as Record<string, number>,
        bySeverity: {} as Record<string, number>,
        topUsers: {} as Record<string, number>,
        securityEvents: events.filter(e => 
          e.type.startsWith('SEC_') || e.severity === AuditSeverity.CRITICAL
        ).length
      },
      criticalEvents: events.filter(e => e.severity === AuditSeverity.CRITICAL),
      securityViolations: events.filter(e => e.type === AuditEventType.SECURITY_VIOLATION)
    };
    
    // Calculate statistics
    for (const event of events) {
      report.summary.byType[event.type] = (report.summary.byType[event.type] || 0) + 1;
      report.summary.bySeverity[event.severity] = (report.summary.bySeverity[event.severity] || 0) + 1;
      if (event.userId) {
        report.summary.topUsers[event.userId] = (report.summary.topUsers[event.userId] || 0) + 1;
      }
    }
    
    return JSON.stringify(report, null, 2);
  }

  /**
   * Cleanup and close
   */
  public close(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    this.flush();
    
    if (this.logStream) {
      this.logStream.end();
    }
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger();

export default auditLogger;