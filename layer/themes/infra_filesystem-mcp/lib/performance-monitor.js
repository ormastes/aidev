#!/usr/bin/env node

/**
 * Performance Monitoring Module
 * Tracks and reports on MCP server performance metrics
 */

const os = require('os');
const { EventEmitter } = require('events');

class PerformanceMonitor extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      sampleInterval: config.sampleInterval || 1000,  // 1 second
      historySize: config.historySize || 100,        // Keep last 100 samples
      alertThresholds: {
        cpuUsage: config.cpuThreshold || 80,         // 80% CPU
        memoryUsage: config.memoryThreshold || 90,   // 90% memory
        responseTime: config.responseThreshold || 1000, // 1 second
        errorRate: config.errorThreshold || 5,       // 5% error rate
        ...config.alertThresholds
      }
    };
    
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        blocked: 0
      },
      performance: {
        responseTimes: [],
        averageResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0
      },
      system: {
        cpuUsage: [],
        memoryUsage: [],
        diskUsage: []
      },
      security: {
        threatsDetected: 0,
        injectionAttempts: 0,
        pathTraversalAttempts: 0,
        blockedOperations: 0
      },
      operations: {
        fileCreations: 0,
        fileValidations: 0,
        nameIdUpdates: 0,
        mutexWaits: []
      }
    };
    
    this.history = [];
    this.alerts = [];
    this.startTime = Date.now();
    this.lastCpuUsage = process.cpuUsage();
    this.monitoring = false;
  }

  /**
   * Start monitoring
   */
  start() {
    if (this.monitoring) return;
    
    this.monitoring = true;
    this.startTime = Date.now();
    
    // Start sampling interval
    this.samplingInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.sampleInterval);
    
    console.log('📊 Performance monitoring started');
    this.emit('started');
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (!this.monitoring) return;
    
    this.monitoring = false;
    
    if (this.samplingInterval) {
      clearInterval(this.samplingInterval);
      this.samplingInterval = null;
    }
    
    console.log('📊 Performance monitoring stopped');
    this.emit('stopped');
  }

  /**
   * Collect system metrics
   */
  collectMetrics() {
    const snapshot = {
      timestamp: Date.now(),
      cpu: this.getCpuUsage(),
      memory: this.getMemoryUsage(),
      uptime: Date.now() - this.startTime,
      requestRate: this.getRequestRate(),
      errorRate: this.getErrorRate()
    };
    
    // Add to history
    this.history.push(snapshot);
    if (this.history.length > this.config.historySize) {
      this.history.shift();
    }
    
    // Update system metrics
    this.metrics.system.cpuUsage.push(snapshot.cpu);
    this.metrics.system.memoryUsage.push(snapshot.memory);
    
    // Maintain history size
    if (this.metrics.system.cpuUsage.length > this.config.historySize) {
      this.metrics.system.cpuUsage.shift();
    }
    if (this.metrics.system.memoryUsage.length > this.config.historySize) {
      this.metrics.system.memoryUsage.shift();
    }
    
    // Check thresholds
    this.checkThresholds(snapshot);
    
    this.emit('metrics', snapshot);
  }

  /**
   * Get CPU usage percentage
   */
  getCpuUsage() {
    const currentCpuUsage = process.cpuUsage();
    const userDiff = currentCpuUsage.user - this.lastCpuUsage.user;
    const systemDiff = currentCpuUsage.system - this.lastCpuUsage.system;
    
    const totalCpu = userDiff + systemDiff;
    const elapsedTime = this.config.sampleInterval * 1000; // Convert to microseconds
    
    const cpuPercentage = (totalCpu / elapsedTime) * 100;
    
    this.lastCpuUsage = currentCpuUsage;
    
    return Math.min(100, Math.round(cpuPercentage * 100) / 100);
  }

  /**
   * Get memory usage percentage
   */
  getMemoryUsage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    return Math.round((usedMemory / totalMemory) * 100 * 100) / 100;
  }

  /**
   * Get request rate (requests per second)
   */
  getRequestRate() {
    const uptime = (Date.now() - this.startTime) / 1000; // in seconds
    return uptime > 0 ? Math.round((this.metrics.requests.total / uptime) * 100) / 100 : 0;
  }

  /**
   * Get error rate percentage
   */
  getErrorRate() {
    const total = this.metrics.requests.total;
    if (total === 0) return 0;
    
    const errors = this.metrics.requests.failed + this.metrics.requests.blocked;
    return Math.round((errors / total) * 100 * 100) / 100;
  }

  /**
   * Record a request
   */
  recordRequest(type, duration, success = true, securityIssue = null) {
    this.metrics.requests.total++;
    
    if (success) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }
    
    if (securityIssue) {
      this.metrics.requests.blocked++;
      this.recordSecurityEvent(securityIssue);
    }
    
    // Record response time
    if (duration !== undefined) {
      this.metrics.performance.responseTimes.push(duration);
      
      // Maintain history size
      if (this.metrics.performance.responseTimes.length > this.config.historySize) {
        this.metrics.performance.responseTimes.shift();
      }
      
      // Update statistics
      this.updateResponseTimeStats();
      
      // Check response time threshold
      if (duration > this.config.alertThresholds.responseTime) {
        this.createAlert('SLOW_RESPONSE', `Response time ${duration}ms exceeds threshold`);
      }
    }
    
    // Track operation type
    switch (type) {
      case 'file_creation':
        this.metrics.operations.fileCreations++;
        break;
      case 'file_validation':
        this.metrics.operations.fileValidations++;
        break;
      case 'name_id_update':
        this.metrics.operations.nameIdUpdates++;
        break;
    }
    
    this.emit('request', {
      type,
      duration,
      success,
      securityIssue,
      timestamp: Date.now()
    });
  }

  /**
   * Record security event
   */
  recordSecurityEvent(event) {
    this.metrics.security.threatsDetected++;
    
    switch (event.type) {
      case 'injection':
        this.metrics.security.injectionAttempts++;
        break;
      case 'path_traversal':
        this.metrics.security.pathTraversalAttempts++;
        break;
      case 'blocked':
        this.metrics.security.blockedOperations++;
        break;
    }
    
    this.createAlert('SECURITY', `Security threat detected: ${event.type}`);
    this.emit('security', event);
  }

  /**
   * Record mutex wait time
   */
  recordMutexWait(waitTime) {
    this.metrics.operations.mutexWaits.push(waitTime);
    
    // Maintain history size
    if (this.metrics.operations.mutexWaits.length > this.config.historySize) {
      this.metrics.operations.mutexWaits.shift();
    }
    
    // Alert if wait time is excessive
    if (waitTime > 5000) {
      this.createAlert('MUTEX_WAIT', `Excessive mutex wait time: ${waitTime}ms`);
    }
  }

  /**
   * Update response time statistics
   */
  updateResponseTimeStats() {
    const times = this.metrics.performance.responseTimes;
    if (times.length === 0) return;
    
    const sum = times.reduce((a, b) => a + b, 0);
    this.metrics.performance.averageResponseTime = Math.round(sum / times.length);
    this.metrics.performance.minResponseTime = Math.min(...times);
    this.metrics.performance.maxResponseTime = Math.max(...times);
  }

  /**
   * Check thresholds and create alerts
   */
  checkThresholds(snapshot) {
    const thresholds = this.config.alertThresholds;
    
    // CPU usage
    if (snapshot.cpu > thresholds.cpuUsage) {
      this.createAlert('CPU_HIGH', `CPU usage ${snapshot.cpu}% exceeds threshold`);
    }
    
    // Memory usage
    if (snapshot.memory > thresholds.memoryUsage) {
      this.createAlert('MEMORY_HIGH', `Memory usage ${snapshot.memory}% exceeds threshold`);
    }
    
    // Error rate
    if (snapshot.errorRate > thresholds.errorRate) {
      this.createAlert('ERROR_RATE', `Error rate ${snapshot.errorRate}% exceeds threshold`);
    }
  }

  /**
   * Create an alert
   */
  createAlert(type, message) {
    const alert = {
      type,
      message,
      timestamp: Date.now(),
      resolved: false
    };
    
    this.alerts.push(alert);
    
    // Maintain alert history
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }
    
    console.log(`⚠️ Alert: ${type} - ${message}`);
    this.emit('alert', alert);
  }

  /**
   * Get current performance summary
   */
  getSummary() {
    const uptime = Date.now() - this.startTime;
    const uptimeHours = Math.floor(uptime / 3600000);
    const uptimeMinutes = Math.floor((uptime % 3600000) / 60000);
    
    return {
      uptime: `${uptimeHours}h ${uptimeMinutes}m`,
      requests: {
        total: this.metrics.requests.total,
        successful: this.metrics.requests.successful,
        failed: this.metrics.requests.failed,
        blocked: this.metrics.requests.blocked,
        successRate: this.metrics.requests.total > 0 
          ? Math.round((this.metrics.requests.successful / this.metrics.requests.total) * 100) 
          : 100
      },
      performance: {
        averageResponseTime: this.metrics.performance.averageResponseTime,
        minResponseTime: this.metrics.performance.minResponseTime,
        maxResponseTime: this.metrics.performance.maxResponseTime,
        requestRate: this.getRequestRate()
      },
      system: {
        currentCpu: this.metrics.system.cpuUsage[this.metrics.system.cpuUsage.length - 1] || 0,
        averageCpu: this.getAverage(this.metrics.system.cpuUsage),
        currentMemory: this.metrics.system.memoryUsage[this.metrics.system.memoryUsage.length - 1] || 0,
        averageMemory: this.getAverage(this.metrics.system.memoryUsage)
      },
      security: {
        threatsDetected: this.metrics.security.threatsDetected,
        injectionAttempts: this.metrics.security.injectionAttempts,
        pathTraversalAttempts: this.metrics.security.pathTraversalAttempts,
        blockedOperations: this.metrics.security.blockedOperations
      },
      alerts: {
        total: this.alerts.length,
        active: this.alerts.filter(a => !a.resolved).length,
        recent: this.alerts.slice(-5)
      }
    };
  }

  /**
   * Get average of array
   */
  getAverage(arr) {
    if (arr.length === 0) return 0;
    const sum = arr.reduce((a, b) => a + b, 0);
    return Math.round((sum / arr.length) * 100) / 100;
  }

  /**
   * Generate performance report
   */
  generateReport() {
    const summary = this.getSummary();
    
    let report = '# MCP Server Performance Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    
    report += '## System Status\n';
    report += `- Uptime: ${summary.uptime}\n`;
    report += `- CPU Usage: ${summary.system.currentCpu}% (avg: ${summary.system.averageCpu}%)\n`;
    report += `- Memory Usage: ${summary.system.currentMemory}% (avg: ${summary.system.averageMemory}%)\n\n`;
    
    report += '## Request Statistics\n';
    report += `- Total Requests: ${summary.requests.total}\n`;
    report += `- Success Rate: ${summary.requests.successRate}%\n`;
    report += `- Request Rate: ${summary.performance.requestRate} req/s\n`;
    report += `- Avg Response Time: ${summary.performance.averageResponseTime}ms\n\n`;
    
    report += '## Security Metrics\n';
    report += `- Threats Detected: ${summary.security.threatsDetected}\n`;
    report += `- Injection Attempts: ${summary.security.injectionAttempts}\n`;
    report += `- Path Traversal Attempts: ${summary.security.pathTraversalAttempts}\n`;
    report += `- Blocked Operations: ${summary.security.blockedOperations}\n\n`;
    
    if (summary.alerts.active > 0) {
      report += '## Active Alerts\n';
      this.alerts
        .filter(a => !a.resolved)
        .forEach(alert => {
          report += `- [${alert.type}] ${alert.message}\n`;
        });
    }
    
    return report;
  }

  /**
   * Export metrics to JSON
   */
  exportMetrics() {
    return {
      timestamp: Date.now(),
      summary: this.getSummary(),
      metrics: this.metrics,
      history: this.history,
      alerts: this.alerts
    };
  }
}

// Create singleton instance
const monitor = new PerformanceMonitor();

module.exports = {
  PerformanceMonitor,
  monitor
};

// Demo/testing
if (require.main === module) {
  console.log('🔍 Performance Monitor Demo\n');
  
  const testMonitor = new PerformanceMonitor({
    sampleInterval: 500,
    cpuThreshold: 50,
    memoryThreshold: 80
  });
  
  testMonitor.start();
  
  // Simulate requests
  let requestCount = 0;
  const requestInterval = setInterval(() => {
    const duration = Math.random() * 200 + 50;
    const success = Math.random() > 0.1;
    const securityIssue = Math.random() > 0.95 ? { type: 'injection' } : null;
    
    testMonitor.recordRequest('file_validation', duration, success, securityIssue);
    requestCount++;
    
    if (requestCount % 10 === 0) {
      console.log('\nCurrent Summary:');
      console.log(JSON.stringify(testMonitor.getSummary(), null, 2));
    }
    
    if (requestCount >= 30) {
      clearInterval(requestInterval);
      console.log('\n' + testMonitor.generateReport());
      testMonitor.stop();
      process.exit(0);
    }
  }, 200);
}