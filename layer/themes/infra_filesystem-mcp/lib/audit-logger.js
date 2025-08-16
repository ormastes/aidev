#!/usr/bin/env node

/**
 * Audit Logging System
 * Provides comprehensive logging and audit trail for all MCP operations
 */

const fs = require('fs').promises;
const { path } = require('../../infra_external-log-lib/src');
const crypto = require('crypto');
const { EventEmitter } = require('events');

const { getFileAPI, FileType } = require('../../infra_external-log-lib/pipe');

const fileAPI = getFileAPI();


class AuditLogger extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      logDir: config.logDir || '/var/log/mcp-server',
      maxLogSize: config.maxLogSize || 10485760, // 10MB
      maxLogFiles: config.maxLogFiles || 10,
      logLevel: config.logLevel || 'info',
      enableConsole: config.enableConsole !== false,
      enableFile: config.enableFile !== false,
      enableAudit: config.enableAudit !== false,
      hashSensitive: config.hashSensitive !== false,
      ...config
    };
    
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
      trace: 4
    };
    
    this.currentLogFile = null;
    this.auditTrail = [];
    this.sessionId = this.generateSessionId();
    
    // Initialize log files
    this.initializeLogFiles();
  }

  /**
   * Initialize log files
   */
  async initializeLogFiles() {
    try {
      // Create log directory if it doesn't exist
      await await fileAPI.createDirectory(this.config.logDir);
      
      // Set up log files
      const timestamp = new Date().toISOString().split('T')[0];
      this.logFiles = {
        general: path.join(this.config.logDir, `mcp-server-${timestamp}.log`),
        audit: path.join(this.config.logDir, `audit-${timestamp}.log`),
        security: path.join(this.config.logDir, `security-${timestamp}.log`),
        performance: path.join(this.config.logDir, `performance-${timestamp}.log`),
        error: path.join(this.config.logDir, `error-${timestamp}.log`)
      };
      
      // Write initial log entry
      await this.writeLog('info', 'Audit logger initialized', {
        sessionId: this.sessionId,
        config: this.sanitizeConfig(this.config)
      });
      
    } catch (error) {
      console.error('Failed to initialize log files:', error);
    }
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generate request ID
   */
  generateRequestId() {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * Sanitize configuration for logging
   */
  sanitizeConfig(config) {
    const sanitized = { ...config };
    // Remove sensitive information
    delete sanitized.apiKeys;
    delete sanitized.passwords;
    delete sanitized.secrets;
    return sanitized;
  }

  /**
   * Hash sensitive data
   */
  hashSensitiveData(data) {
    if (!this.config.hashSensitive) return data;
    
    return crypto
      .createHash('sha256')
      .update(String(data))
      .digest('hex')
      .substring(0, 16) + '...';
  }

  /**
   * Format log entry
   */
  formatLogEntry(level, message, metadata = {}) {
    return {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      sessionId: this.sessionId,
      message,
      metadata,
      pid: process.pid,
      hostname: require('os').hostname()
    };
  }

  /**
   * Write to log file
   */
  async writeLog(level, message, metadata = {}, logType = 'general') {
    if (!this.config.enableFile) return;
    
    const entry = this.formatLogEntry(level, message, metadata);
    const logLine = JSON.stringify(entry) + '\n';
    
    try {
      const logFile = this.logFiles[logType] || this.logFiles.general;
      
      // Check file size and rotate if necessary
      await this.rotateLogIfNeeded(logFile);
      
      // Append to log file
      await fs.appendFile(logFile, logLine, 'utf8');
      
      // Emit event for real-time monitoring
      this.emit('log', entry);
      
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  /**
   * Rotate log file if it exceeds max size
   */
  async rotateLogIfNeeded(logFile) {
    try {
      const stats = await fs.stat(logFile).catch(() => null);
      
      if (stats && stats.size > this.config.maxLogSize) {
        // Rotate log files
        for (let i = this.config.maxLogFiles - 1; i > 0; i--) {
          const oldFile = `${logFile}.${i}`;
          const newFile = `${logFile}.${i + 1}`;
          
          try {
            await fs.rename(oldFile, newFile);
          } catch (e) {
            // File might not exist
          }
        }
        
        // Rename current log to .1
        await fs.rename(logFile, `${logFile}.1`);
        
        // Log rotation event
        await this.writeLog('info', 'Log file rotated', { file: logFile });
      }
    } catch (error) {
      console.error('Failed to rotate log:', error);
    }
  }

  /**
   * Log levels
   */
  error(message, metadata = {}) {
    if (this.levels.error <= this.levels[this.config.logLevel]) {
      if (this.config.enableConsole) {
        console.error(`[ERROR] ${message}`, metadata);
      }
      this.writeLog('error', message, metadata, 'error');
    }
  }

  warn(message, metadata = {}) {
    if (this.levels.warn <= this.levels[this.config.logLevel]) {
      if (this.config.enableConsole) {
        console.warn(`[WARN] ${message}`, metadata);
      }
      this.writeLog('warn', message, metadata);
    }
  }

  info(message, metadata = {}) {
    if (this.levels.info <= this.levels[this.config.logLevel]) {
      if (this.config.enableConsole) {
        console.log(`[INFO] ${message}`, metadata);
      }
      this.writeLog('info', message, metadata);
    }
  }

  debug(message, metadata = {}) {
    if (this.levels.debug <= this.levels[this.config.logLevel]) {
      if (this.config.enableConsole) {
        console.log(`[DEBUG] ${message}`, metadata);
      }
      this.writeLog('debug', message, metadata);
    }
  }

  trace(message, metadata = {}) {
    if (this.levels.trace <= this.levels[this.config.logLevel]) {
      if (this.config.enableConsole) {
        console.log(`[TRACE] ${message}`, metadata);
      }
      this.writeLog('trace', message, metadata);
    }
  }

  /**
   * Audit logging for compliance
   */
  async audit(action, details = {}) {
    if (!this.config.enableAudit) return;
    
    const auditEntry = {
      id: this.generateRequestId(),
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      action,
      user: details.user || 'system',
      ipAddress: details.ipAddress || 'unknown',
      userAgent: details.userAgent || 'unknown',
      resource: details.resource || null,
      result: details.result || 'unknown',
      metadata: details.metadata || {},
      hash: null
    };
    
    // Generate hash for integrity
    const entryString = JSON.stringify({
      ...auditEntry,
      hash: undefined
    });
    auditEntry.hash = crypto
      .createHash('sha256')
      .update(entryString)
      .digest('hex');
    
    // Store in audit trail
    this.auditTrail.push(auditEntry);
    
    // Write to audit log
    await this.writeLog('audit', `Audit: ${action}`, auditEntry, 'audit');
    
    // Emit audit event
    this.emit('audit', auditEntry);
    
    return auditEntry.id;
  }

  /**
   * Log security events
   */
  async security(event, details = {}) {
    const securityEntry = {
      id: this.generateRequestId(),
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      event,
      severity: details.severity || 'medium',
      threat: details.threat || 'unknown',
      source: details.source || 'unknown',
      action: details.action || 'blocked',
      details: details
    };
    
    // Write to security log
    await this.writeLog('security', `Security: ${event}`, securityEntry, 'security');
    
    // Emit security event
    this.emit('security', securityEntry);
    
    // Alert on high severity
    if (securityEntry.severity === 'critical' || securityEntry.severity === 'high') {
      this.emit('alert', {
        type: 'security',
        ...securityEntry
      });
    }
    
    return securityEntry.id;
  }

  /**
   * Log performance metrics
   */
  async performance(metric, value, metadata = {}) {
    const perfEntry = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      metric,
      value,
      unit: metadata.unit || 'ms',
      metadata
    };
    
    // Write to performance log
    await this.writeLog('performance', `Performance: ${metric}=${value}${perfEntry.unit}`, perfEntry, 'performance');
    
    // Emit performance event
    this.emit('performance', perfEntry);
  }

  /**
   * Log file operations
   */
  async logFileOperation(operation, filePath, result, metadata = {}) {
    const sanitizedPath = this.config.hashSensitive && filePath.includes('/') 
      ? this.hashSensitiveData(filePath)
      : filePath;
    
    await this.audit(`file.${operation}`, {
      resource: sanitizedPath,
      result: result ? 'success' : 'failure',
      metadata: {
        ...metadata,
        operation,
        originalPath: filePath
      }
    });
  }

  /**
   * Log API requests
   */
  async logRequest(method, endpoint, statusCode, duration, metadata = {}) {
    const requestId = this.generateRequestId();
    
    const requestEntry = {
      id: requestId,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      method,
      endpoint,
      statusCode,
      duration,
      metadata
    };
    
    // Log based on status code
    if (statusCode >= 500) {
      await this.error(`Request failed: ${method} ${endpoint}`, requestEntry);
    } else if (statusCode >= 400) {
      await this.warn(`Request error: ${method} ${endpoint}`, requestEntry);
    } else {
      await this.info(`Request: ${method} ${endpoint}`, requestEntry);
    }
    
    // Log performance
    await this.performance('request.duration', duration, {
      method,
      endpoint,
      statusCode
    });
    
    return requestId;
  }

  /**
   * Create middleware for Express/HTTP servers
   */
  middleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      const requestId = this.generateRequestId();
      
      // Attach request ID
      req.requestId = requestId;
      res.setHeader('X-Request-ID', requestId);
      
      // Log request start
      this.debug('Request started', {
        id: requestId,
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
      
      // Capture response
      const originalSend = res.send;
      res.send = function(data) {
        res.send = originalSend;
        
        // Log request completion
        const duration = Date.now() - startTime;
        this.logRequest(
          req.method,
          req.url,
          res.statusCode,
          duration,
          {
            requestId,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            responseSize: data ? data.length : 0
          }
        );
        
        return res.send(data);
      }.bind(this);
      
      next();
    };
  }

  /**
   * Get audit trail
   */
  getAuditTrail(filters = {}) {
    let trail = [...this.auditTrail];
    
    // Apply filters
    if (filters.startDate) {
      trail = trail.filter(e => new Date(e.timestamp) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
      trail = trail.filter(e => new Date(e.timestamp) <= new Date(filters.endDate));
    }
    if (filters.action) {
      trail = trail.filter(e => e.action === filters.action);
    }
    if (filters.user) {
      trail = trail.filter(e => e.user === filters.user);
    }
    
    return trail;
  }

  /**
   * Verify audit trail integrity
   */
  verifyAuditIntegrity() {
    const results = [];
    
    for (const entry of this.auditTrail) {
      const originalHash = entry.hash;
      
      // Recalculate hash
      const entryString = JSON.stringify({
        ...entry,
        hash: undefined
      });
      const calculatedHash = crypto
        .createHash('sha256')
        .update(entryString)
        .digest('hex');
      
      results.push({
        id: entry.id,
        timestamp: entry.timestamp,
        valid: originalHash === calculatedHash
      });
    }
    
    return {
      total: results.length,
      valid: results.filter(r => r.valid).length,
      invalid: results.filter(r => !r.valid).length,
      results
    };
  }

  /**
   * Export logs
   */
  async exportLogs(startDate, endDate, format = 'json') {
    const logs = [];
    
    // Read log files
    for (const [type, file] of Object.entries(this.logFiles)) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const lines = content.split('\n').filter(l => l);
        
        for (const line of lines) {
          try {
            const entry = JSON.parse(line);
            const timestamp = new Date(entry.timestamp);
            
            if (timestamp >= startDate && timestamp <= endDate) {
              logs.push({ ...entry, logType: type });
            }
          } catch (e) {
            // Skip invalid lines
          }
        }
      } catch (e) {
        // File might not exist
      }
    }
    
    // Sort by timestamp
    logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Format output
    if (format === 'csv') {
      const headers = ['timestamp', 'level', 'message', 'sessionId', 'logType'];
      const csv = [
        headers.join(','),
        ...logs.map(l => headers.map(h => `"${l[h] || ''}"`).join(','))
      ].join('\n');
      return csv;
    }
    
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Clean old logs
   */
  async cleanOldLogs(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const files = await fs.readdir(this.config.logDir);
    let cleaned = 0;
    
    for (const file of files) {
      const filePath = path.join(this.config.logDir, file);
      const stats = await fs.stat(filePath);
      
      if (stats.mtime < cutoffDate) {
        await fs.unlink(filePath);
        cleaned++;
      }
    }
    
    this.info(`Cleaned ${cleaned} old log files`);
    return cleaned;
  }
}

// Create singleton instance
const logger = new AuditLogger();

module.exports = {
  AuditLogger,
  logger
};

// Testing
if (require.main === module) {
  async function testLogger() {
    console.log('🔍 Testing Audit Logger\n');
    
    const testLogger = new AuditLogger({
      logDir: './test-logs',
      logLevel: 'trace',
      enableConsole: true
    });
    
    // Test different log levels
    testLogger.error('Test error message', { code: 'ERR001' });
    testLogger.warn('Test warning message', { threshold: 80 });
    testLogger.info('Test info message', { status: 'active' });
    testLogger.debug('Test debug message', { data: 'test' });
    testLogger.trace('Test trace message', { verbose: true });
    
    // Test audit logging
    await testLogger.audit('user.login', {
      user: 'admin',
      ipAddress: '192.168.1.1',
      result: 'success'
    });
    
    await testLogger.audit('file.create', {
      user: 'developer',
      resource: '/app/config.json',
      result: 'blocked',
      metadata: { reason: 'Permission denied' }
    });
    
    // Test security logging
    await testLogger.security('injection_attempt', {
      severity: 'high',
      threat: 'sql_injection',
      source: '10.0.0.1',
      action: 'blocked'
    });
    
    // Test performance logging
    await testLogger.performance('api.response', 145, { unit: 'ms' });
    await testLogger.performance('memory.usage', 67.5, { unit: '%' });
    
    // Verify audit integrity
    console.log('\nAudit Integrity Check:');
    const integrity = testLogger.verifyAuditIntegrity();
    console.log(integrity);
    
    // Get audit trail
    console.log('\nAudit Trail:');
    const trail = testLogger.getAuditTrail();
    console.log(JSON.stringify(trail, null, 2));
  }
  
  testLogger().catch(console.error);
}