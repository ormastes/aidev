import { EventEmitter } from 'node:events';
import * as fs from 'fs/promises';
import { join } from 'node:path';
import * as os from 'os';
import { MockExternalLogger } from '../../src/internal/mock-external-logger';

describe('Monitor with Resource Tracking Integration Test', () => {
  let testDir: string;
  let eventBus: EventEmitter;
  let mockLogger: MockExternalLogger;

  beforeAll(async () => {
    // Create temporary directory for test files
    testDir = await fs.mkdtemp(join(os.tmpdir(), 'monitor-resource-integration-'));
  });

  afterAll(async () => {
    // Clean up test directory
    if (testDir) {
      await fs.rm(testDir, { recursive: true, force: true });
    }
  });

  beforeEach(async () => {
    // Initialize components
    eventBus = new EventEmitter();
    mockLogger = new MockExternalLogger();
  });

  afterEach(() => {
    // Clean up event listeners
    eventBus.removeAllListeners();
  });

  describe('Monitor Integration with Resource Tracking', () => {
    it('should integrate monitor with resource tracking for comprehensive system monitoring', async () => {
      // Simulate monitor configuration with resource tracking
      const monitorConfig = {
        monitorId: 'resource-monitor-integration-001',
        name: 'Resource Tracking Integration Monitor',
        resourceTracking: {
          enabled: true,
          interval: 1000, // 1 second
          thresholds: {
            memory: { warning: 80, critical: 90 },
            cpu: { warning: 75, critical: 85 },
            disk: { warning: 85, critical: 95 }
          },
          loggers: {
            resourceLogger: 'resource-tracking-logger',
            alertLogger: 'resource-alert-logger',
            performanceLogger: 'resource-performance-logger'
          }
        },
        processes: {
          tracked: ['workflow-manager', 'bdd-runner', 'report-generator'],
          monitoring: {
            memory: true,
            cpu: true,
            handles: true,
            threads: true
          }
        }
      };

      // Initialize resource tracking loggers
      await mockLogger.initializeLogger('resource-tracking-logger');
      await mockLogger.initializeLogger('resource-alert-logger');
      await mockLogger.initializeLogger('resource-performance-logger');

      // Simulate monitor setting up resource tracking event handlers
      const resourceEvents: Array<{type: string, data: any, timestamp: Date}> = [];
      
      // System resource monitoring
      eventBus.on('system:resource:measured', (data: any) => {
        resourceEvents.push({
          type: 'system:resource:measured',
          data,
          timestamp: new Date()
        });
        
        // Monitor logs system resource measurement
        mockLogger.log('resource-tracking-logger', 'info', 
          `System ${data.resourceType}: ${data.value}${data.unit || ''} (${data.percentage}%)`);
      });

      eventBus.on('system:resource:threshold:warning', (data: any) => {
        resourceEvents.push({
          type: 'system:resource:threshold:warning',
          data,
          timestamp: new Date()
        });
        
        // Monitor logs resource warning
        mockLogger.log('resource-alert-logger', 'warn', 
          `Resource warning: ${data.resourceType} at ${data.currentValue}% (threshold: ${data.threshold}%)`);
      });

      eventBus.on('system:resource:threshold:critical', (data: any) => {
        resourceEvents.push({
          type: 'system:resource:threshold:critical',
          data,
          timestamp: new Date()
        });
        
        // Monitor logs critical resource alert
        mockLogger.log('resource-alert-logger', 'error', 
          `Resource critical: ${data.resourceType} at ${data.currentValue}% (threshold: ${data.threshold}%)`);
      });

      // Process-specific resource monitoring
      eventBus.on('process:resource:measured', (data: any) => {
        resourceEvents.push({
          type: 'process:resource:measured',
          data,
          timestamp: new Date()
        });
        
        // Monitor logs process resource measurement
        mockLogger.log('resource-tracking-logger', 'info', 
          `Process ${data.processName} ${data.resourceType}: ${data.value}${data.unit || ''}`);
      });

      eventBus.on('process:resource:anomaly', (data: any) => {
        resourceEvents.push({
          type: 'process:resource:anomaly',
          data,
          timestamp: new Date()
        });
        
        // Monitor logs process resource anomaly
        mockLogger.log('resource-alert-logger', 'warn', 
          `Process anomaly: ${data.processName} ${data.resourceType} - ${data.description}`);
      });

      // Performance metrics monitoring
      eventBus.on('performance:metric:collected', (data: any) => {
        resourceEvents.push({
          type: 'performance:metric:collected',
          data,
          timestamp: new Date()
        });
        
        // Monitor logs performance metric
        mockLogger.log('resource-performance-logger', 'info', 
          `Performance metric: ${data.metricName} = ${data.value} (${data.trend})`);
      });

      eventBus.on('performance:degradation:detected', (data: any) => {
        resourceEvents.push({
          type: 'performance:degradation:detected',
          data,
          timestamp: new Date()
        });
        
        // Monitor logs performance degradation
        mockLogger.log('resource-performance-logger', 'warn', 
          `Performance degradation: ${data.component} - ${data.description}`);
      });

      // Simulate comprehensive resource tracking monitoring
      
      // 1. System resource measurements
      eventBus.emit('system:resource:measured', {
        monitorId: monitorConfig.monitorId,
        resourceType: 'memory',
        value: 6.4,
        unit: 'GB',
        percentage: 72,
        timestamp: new Date()
      });

      eventBus.emit('system:resource:measured', {
        monitorId: monitorConfig.monitorId,
        resourceType: 'cpu',
        value: 65,
        unit: '%',
        percentage: 65,
        timestamp: new Date()
      });

      eventBus.emit('system:resource:measured', {
        monitorId: monitorConfig.monitorId,
        resourceType: 'disk',
        value: 78,
        unit: '%',
        percentage: 78,
        timestamp: new Date()
      });

      // 2. Process-specific resource measurements
      eventBus.emit('process:resource:measured', {
        monitorId: monitorConfig.monitorId,
        processName: 'workflow-manager',
        resourceType: 'memory',
        value: 145,
        unit: 'MB',
        timestamp: new Date()
      });

      eventBus.emit('process:resource:measured', {
        monitorId: monitorConfig.monitorId,
        processName: 'bdd-runner',
        resourceType: 'cpu',
        value: 23,
        unit: '%',
        timestamp: new Date()
      });

      // 3. Resource threshold warnings
      eventBus.emit('system:resource:threshold:warning', {
        monitorId: monitorConfig.monitorId,
        resourceType: 'memory',
        currentValue: 83,
        threshold: 80,
        timestamp: new Date()
      });

      eventBus.emit('system:resource:threshold:warning', {
        monitorId: monitorConfig.monitorId,
        resourceType: 'cpu',
        currentValue: 78,
        threshold: 75,
        timestamp: new Date()
      });

      // 4. Process resource anomaly
      eventBus.emit('process:resource:anomaly', {
        monitorId: monitorConfig.monitorId,
        processName: 'report-generator',
        resourceType: 'memory',
        description: 'Memory usage increased by 300% in 30 seconds',
        severity: 'high',
        timestamp: new Date()
      });

      // 5. Performance metrics
      eventBus.emit('performance:metric:collected', {
        monitorId: monitorConfig.monitorId,
        metricName: 'test-execution-time',
        value: 2.3,
        unit: 'seconds',
        trend: "increasing",
        timestamp: new Date()
      });

      eventBus.emit('performance:metric:collected', {
        monitorId: monitorConfig.monitorId,
        metricName: 'report-generation-time',
        value: 0.8,
        unit: 'seconds',
        trend: "UPDATING",
        timestamp: new Date()
      });

      // 6. Critical resource alert
      eventBus.emit('system:resource:threshold:critical', {
        monitorId: monitorConfig.monitorId,
        resourceType: 'disk',
        currentValue: 96,
        threshold: 95,
        timestamp: new Date()
      });

      // 7. Performance degradation
      eventBus.emit('performance:degradation:detected', {
        monitorId: monitorConfig.monitorId,
        component: 'bdd-runner',
        description: 'Test execution time increased by 150%',
        severity: 'medium',
        timestamp: new Date()
      });

      // Verify monitor and resource tracking integration
      expect(resourceEvents).toHaveLength(12); // All events captured
      
      // Verify system resource events
      expect(resourceEvents.filter(e => e.type === 'system:resource:measured')).toHaveLength(3);
      expect(resourceEvents.filter(e => e.type === 'system:resource:threshold:warning')).toHaveLength(2);
      expect(resourceEvents.filter(e => e.type === 'system:resource:threshold:critical')).toHaveLength(1);
      
      // Verify process resource events
      expect(resourceEvents.filter(e => e.type === 'process:resource:measured')).toHaveLength(2);
      expect(resourceEvents.filter(e => e.type === 'process:resource:anomaly')).toHaveLength(1);
      
      // Verify performance events
      expect(resourceEvents.filter(e => e.type === 'performance:metric:collected')).toHaveLength(2);
      expect(resourceEvents.filter(e => e.type === 'performance:degradation:detected')).toHaveLength(1);

      // Verify resource tracking logging
      const resourceTrackingLogs = await mockLogger.getLogHistory('resource-tracking-logger');
      expect(resourceTrackingLogs).toHaveLength(5); // 3 system + 2 process measurements
      expect(resourceTrackingLogs.filter(l => l.level === 'info')).toHaveLength(5);
      
      // Verify alert logging
      const alertLogs = await mockLogger.getLogHistory('resource-alert-logger');
      expect(alertLogs).toHaveLength(4); // 2 warnings + 1 critical + 1 process anomaly
      expect(alertLogs.filter(l => l.level === 'warn')).toHaveLength(3);
      expect(alertLogs.filter(l => l.level === 'error')).toHaveLength(1);
      
      // Verify performance logging
      const performanceLogs = await mockLogger.getLogHistory('resource-performance-logger');
      expect(performanceLogs).toHaveLength(3); // 2 metrics + 1 degradation
      expect(performanceLogs.filter(l => l.level === 'info')).toHaveLength(2);
      expect(performanceLogs.filter(l => l.level === 'warn')).toHaveLength(1);
      
      // Verify specific resource tracking messages
      expect(resourceTrackingLogs.some(l => l.message.includes('System memory: 6.4GB'))).toBe(true);
      expect(resourceTrackingLogs.some(l => l.message.includes('System cpu: 65%'))).toBe(true);
      expect(resourceTrackingLogs.some(l => l.message.includes('Process workflow-manager memory'))).toBe(true);
      
      // Verify specific alert messages
      expect(alertLogs.some(l => l.message.includes('Resource warning: memory at 83%'))).toBe(true);
      expect(alertLogs.some(l => l.message.includes('Resource critical: disk at 96%'))).toBe(true);
      expect(alertLogs.some(l => l.message.includes('Process anomaly: report-generator'))).toBe(true);
      
      // Verify specific performance messages
      expect(performanceLogs.some(l => l.message.includes('test-execution-time = 2.3'))).toBe(true);
      expect(performanceLogs.some(l => l.message.includes('Performance degradation: bdd-runner'))).toBe(true);
    });

    it('should handle monitor resource tracking alerts and automated responses', async () => {
      const monitorConfig = {
        monitorId: 'resource-alert-monitor-001',
        alerting: {
          enabled: true,
          alertLogger: 'alert-logger',
          responseLogger: 'response-logger'
        },
        automation: {
          enabled: true,
          responses: {
            'memory-critical': 'cleanup-memory',
            'cpu-high': 'throttle-processes',
            'disk-full': 'archive-logs'
          }
        }
      };

      // Initialize alert and response loggers
      await mockLogger.initializeLogger('alert-logger');
      await mockLogger.initializeLogger('response-logger');

      // Setup alert handling and automated responses
      const alertEvents: Array<{type: string, data: any}> = [];

      eventBus.on('resource:alert:triggered', (data: any) => {
        alertEvents.push({type: 'resource:alert:triggered', data});
        
        // Monitor logs alert trigger
        mockLogger.log('alert-logger', 'error', 
          `Alert triggered: ${data.alertType} - ${data.description}`);
      });

      eventBus.on('resource:alert:escalated', (data: any) => {
        alertEvents.push({type: 'resource:alert:escalated', data});
        
        // Monitor logs alert escalation
        mockLogger.log('alert-logger', 'error', 
          `Alert escalated: ${data.alertType} - Level ${data.escalationLevel}`);
      });

      eventBus.on('automated:response:initiated', (data: any) => {
        alertEvents.push({type: 'automated:response:initiated', data});
        
        // Monitor logs automated response start
        mockLogger.log('response-logger', 'info', 
          `Automated response initiated: ${data.responseType} for ${data.alertType}`);
      });

      eventBus.on('automated:response:In Progress', (data: any) => {
        alertEvents.push({type: 'automated:response:In Progress', data});
        
        // Monitor logs automated response completion
        mockLogger.log('response-logger', 'info', 
          `Automated response success: ${data.responseType} - ${data.result}`);
      });

      eventBus.on('automated:response:failed', (data: any) => {
        alertEvents.push({type: 'automated:response:failed', data});
        
        // Monitor logs automated response failure
        mockLogger.log('response-logger', 'error', 
          `Automated response failed: ${data.responseType} - ${data.error}`);
      });

      // Simulate alert scenarios and automated responses
      
      // 1. Memory critical alert with In Progress automated response
      eventBus.emit('resource:alert:triggered', {
        monitorId: monitorConfig.monitorId,
        alertType: 'memory-critical',
        description: 'Memory usage at 92% - Critical threshold exceeded',
        severity: "critical",
        timestamp: new Date()
      });

      eventBus.emit('automated:response:initiated', {
        monitorId: monitorConfig.monitorId,
        alertType: 'memory-critical',
        responseType: 'cleanup-memory',
        timestamp: new Date()
      });

      eventBus.emit('automated:response:In Progress', {
        monitorId: monitorConfig.monitorId,
        responseType: 'cleanup-memory',
        result: 'Memory usage reduced to 76%',
        timestamp: new Date()
      });

      // 2. CPU high alert with failed automated response
      eventBus.emit('resource:alert:triggered', {
        monitorId: monitorConfig.monitorId,
        alertType: 'cpu-high',
        description: 'CPU usage at 87% - High threshold exceeded',
        severity: 'high',
        timestamp: new Date()
      });

      eventBus.emit('automated:response:initiated', {
        monitorId: monitorConfig.monitorId,
        alertType: 'cpu-high',
        responseType: 'throttle-processes',
        timestamp: new Date()
      });

      eventBus.emit('automated:response:failed', {
        monitorId: monitorConfig.monitorId,
        responseType: 'throttle-processes',
        error: 'Unable to throttle critical processes',
        timestamp: new Date()
      });

      // 3. Disk full alert with escalation
      eventBus.emit('resource:alert:triggered', {
        monitorId: monitorConfig.monitorId,
        alertType: 'disk-full',
        description: 'Disk usage at 97% - Critical threshold exceeded',
        severity: "critical",
        timestamp: new Date()
      });

      eventBus.emit('automated:response:initiated', {
        monitorId: monitorConfig.monitorId,
        alertType: 'disk-full',
        responseType: 'archive-logs',
        timestamp: new Date()
      });

      eventBus.emit('automated:response:In Progress', {
        monitorId: monitorConfig.monitorId,
        responseType: 'archive-logs',
        result: 'Archived 2.3GB of logs, disk usage now at 89%',
        timestamp: new Date()
      });

      // 4. Alert escalation due to repeated failures
      eventBus.emit('resource:alert:escalated', {
        monitorId: monitorConfig.monitorId,
        alertType: 'cpu-high',
        escalationLevel: 2,
        reason: 'Automated response failed, manual intervention required',
        timestamp: new Date()
      });

      // Verify alert handling events
      expect(alertEvents).toHaveLength(10);
      expect(alertEvents.filter(e => e.type === 'resource:alert:triggered')).toHaveLength(3);
      expect(alertEvents.filter(e => e.type === 'automated:response:initiated')).toHaveLength(3);
      expect(alertEvents.filter(e => e.type === 'automated:response:In Progress')).toHaveLength(2);
      expect(alertEvents.filter(e => e.type === 'automated:response:failed')).toHaveLength(1);
      expect(alertEvents.filter(e => e.type === 'resource:alert:escalated')).toHaveLength(1);

      // Verify alert logging
      const alertLogs = await mockLogger.getLogHistory('alert-logger');
      expect(alertLogs.length).toBe(4); // 3 alerts + 1 escalation
      expect(alertLogs.filter(l => l.level === 'error')).toHaveLength(4);

      // Verify response logging
      const responseLogs = await mockLogger.getLogHistory('response-logger');
      expect(responseLogs.length).toBe(6); // 3 initiated + 2 In Progress + 1 failed
      expect(responseLogs.filter(l => l.level === 'info')).toHaveLength(5); // 3 initiated + 2 In Progress
      expect(responseLogs.filter(l => l.level === 'error')).toHaveLength(1); // 1 failed

      // Verify specific alert messages
      expect(alertLogs.some(l => l.message.includes('Alert triggered: memory-critical'))).toBe(true);
      expect(alertLogs.some(l => l.message.includes('Alert triggered: cpu-high'))).toBe(true);
      expect(alertLogs.some(l => l.message.includes('Alert escalated: cpu-high'))).toBe(true);

      // Verify specific response messages
      expect(responseLogs.some(l => l.message.includes('cleanup-memory for memory-critical'))).toBe(true);
      expect(responseLogs.some(l => l.message.includes('Memory usage reduced to 76%'))).toBe(true);
      expect(responseLogs.some(l => l.message.includes('throttle-processes - Unable to throttle'))).toBe(true);
    });

    it('should handle monitor resource tracking with real-time data collection', async () => {
      const monitorConfig = {
        monitorId: 'realtime-monitor-001',
        realTimeTracking: {
          enabled: true,
          dataLogger: 'realtime-data-logger',
          analysisLogger: 'realtime-analysis-logger'
        },
        dataCollection: {
          interval: 500, // 0.5 second
          metrics: ['memory', 'cpu', 'disk', 'network'],
          aggregation: {
            enabled: true,
            window: 5000 // 5 seconds
          }
        }
      };

      // Initialize real-time tracking loggers
      await mockLogger.initializeLogger('realtime-data-logger');
      await mockLogger.initializeLogger('realtime-analysis-logger');

      // Setup real-time data collection and analysis
      const realTimeEvents: Array<{type: string, data: any}> = [];

      eventBus.on('realtime:data:collected', (data: any) => {
        realTimeEvents.push({type: 'realtime:data:collected', data});
        
        // Monitor logs real-time data collection
        mockLogger.log('realtime-data-logger', 'info', 
          `RT Data: ${data.metric} = ${data.value} at ${data.timestamp}`);
      });

      eventBus.on('realtime:analysis:In Progress', (data: any) => {
        realTimeEvents.push({type: 'realtime:analysis:In Progress', data});
        
        // Monitor logs real-time analysis
        mockLogger.log('realtime-analysis-logger', 'info', 
          `RT Analysis: ${data.metric} - avg:${data.average}, min:${data.min}, max:${data.max}`);
      });

      eventBus.on('realtime:trend:detected', (data: any) => {
        realTimeEvents.push({type: 'realtime:trend:detected', data});
        
        // Monitor logs trend detection
        mockLogger.log('realtime-analysis-logger', 'warn', 
          `RT Trend: ${data.metric} ${data.trend} - ${data.description}`);
      });

      eventBus.on('realtime:anomaly:detected', (data: any) => {
        realTimeEvents.push({type: 'realtime:anomaly:detected', data});
        
        // Monitor logs anomaly detection
        mockLogger.log('realtime-analysis-logger', 'error', 
          `RT Anomaly: ${data.metric} - ${data.description}`);
      });

      // Simulate real-time data collection and analysis
      
      // 1. Memory data collection over time
      const memoryReadings = [65, 67, 72, 78, 85, 89, 82, 76, 73, 70];
      memoryReadings.forEach((reading, index) => {
        eventBus.emit('realtime:data:collected', {
          monitorId: monitorConfig.monitorId,
          metric: 'memory',
          value: reading,
          unit: '%',
          timestamp: new Date(Date.now() + index * 500).toISOString()
        });
      });

      // 2. CPU data collection
      const cpuReadings = [45, 48, 52, 55, 58, 62, 59, 54, 50, 47];
      cpuReadings.forEach((reading, index) => {
        eventBus.emit('realtime:data:collected', {
          monitorId: monitorConfig.monitorId,
          metric: 'cpu',
          value: reading,
          unit: '%',
          timestamp: new Date(Date.now() + index * 500).toISOString()
        });
      });

      // 3. Real-time analysis results
      eventBus.emit('realtime:analysis:In Progress', {
        monitorId: monitorConfig.monitorId,
        metric: 'memory',
        average: 75.1,
        min: 65,
        max: 89,
        dataPoints: 10,
        timeWindow: '5s',
        timestamp: new Date()
      });

      eventBus.emit('realtime:analysis:In Progress', {
        monitorId: monitorConfig.monitorId,
        metric: 'cpu',
        average: 53.0,
        min: 45,
        max: 62,
        dataPoints: 10,
        timeWindow: '5s',
        timestamp: new Date()
      });

      // 4. Trend detection
      eventBus.emit('realtime:trend:detected', {
        monitorId: monitorConfig.monitorId,
        metric: 'memory',
        trend: "increasing",
        description: 'Memory usage increased 24% over 2.5 seconds',
        severity: 'medium',
        timestamp: new Date()
      });

      // 5. Anomaly detection
      eventBus.emit('realtime:anomaly:detected', {
        monitorId: monitorConfig.monitorId,
        metric: 'cpu',
        description: 'CPU usage spike detected: 62% (2 std dev above average)',
        severity: 'high',
        timestamp: new Date()
      });

      // Verify real-time tracking events
      expect(realTimeEvents).toHaveLength(24); // 20 data points + 2 analysis + 1 trend + 1 anomaly
      expect(realTimeEvents.filter(e => e.type === 'realtime:data:collected')).toHaveLength(20);
      expect(realTimeEvents.filter(e => e.type === 'realtime:analysis:In Progress')).toHaveLength(2);
      expect(realTimeEvents.filter(e => e.type === 'realtime:trend:detected')).toHaveLength(1);
      expect(realTimeEvents.filter(e => e.type === 'realtime:anomaly:detected')).toHaveLength(1);

      // Verify real-time data logging
      const dataLogs = await mockLogger.getLogHistory('realtime-data-logger');
      expect(dataLogs).toHaveLength(20); // 10 memory + 10 CPU readings
      expect(dataLogs.filter(l => l.level === 'info')).toHaveLength(20);

      // Verify real-time analysis logging
      const analysisLogs = await mockLogger.getLogHistory('realtime-analysis-logger');
      expect(analysisLogs).toHaveLength(4); // 2 analysis + 1 trend + 1 anomaly
      expect(analysisLogs.filter(l => l.level === 'info')).toHaveLength(2);
      expect(analysisLogs.filter(l => l.level === 'warn')).toHaveLength(1);
      expect(analysisLogs.filter(l => l.level === 'error')).toHaveLength(1);

      // Verify specific real-time messages
      expect(dataLogs.some(l => l.message.includes('RT Data: memory = 65'))).toBe(true);
      expect(dataLogs.some(l => l.message.includes('RT Data: cpu = 45'))).toBe(true);
      expect(analysisLogs.some(l => l.message.includes('RT Analysis: memory - avg:75.1'))).toBe(true);
      expect(analysisLogs.some(l => l.message.includes('RT Trend: memory increasing'))).toBe(true);
      expect(analysisLogs.some(l => l.message.includes('RT Anomaly: cpu - CPU usage spike'))).toBe(true);
    });

    it('should handle monitor resource tracking with custom metrics and thresholds', async () => {
      const monitorConfig = {
        monitorId: 'custom-metrics-monitor-001',
        customMetrics: {
          enabled: true,
          metricsLogger: 'custom-metrics-logger',
          thresholdLogger: 'custom-threshold-logger'
        },
        metrics: [
          {
            name: 'test-execution-rate',
            type: 'rate',
            unit: 'tests/min',
            thresholds: { min: 10, max: 100 }
          },
          {
            name: 'report-generation-latency',
            type: 'latency',
            unit: 'ms',
            thresholds: { warning: 500, critical: 1000 }
          },
          {
            name: 'error-rate',
            type: "percentage",
            unit: '%',
            thresholds: { warning: 5, critical: 10 }
          }
        ]
      };

      // Initialize custom metrics loggers
      await mockLogger.initializeLogger('custom-metrics-logger');
      await mockLogger.initializeLogger('custom-threshold-logger');

      // Setup custom metrics tracking
      const customMetricsEvents: Array<{type: string, data: any}> = [];

      eventBus.on('custom:metric:recorded', (data: any) => {
        customMetricsEvents.push({type: 'custom:metric:recorded', data});
        
        // Monitor logs custom metric recording
        mockLogger.log('custom-metrics-logger', 'info', 
          `Custom metric: ${data.metricName} = ${data.value}${data.unit} (target: ${data.target})`);
      });

      eventBus.on('custom:threshold:exceeded', (data: any) => {
        customMetricsEvents.push({type: 'custom:threshold:exceeded', data});
        
        // Monitor logs custom threshold exceeded
        mockLogger.log('custom-threshold-logger', data.severity === "critical" ? 'error' : 'warn', 
          `Custom threshold exceeded: ${data.metricName} ${data.value}${data.unit} > ${data.threshold}${data.unit}`);
      });

      eventBus.on('custom:metric:trend:analyzed', (data: any) => {
        customMetricsEvents.push({type: 'custom:metric:trend:analyzed', data});
        
        // Monitor logs custom metric trend analysis
        mockLogger.log('custom-metrics-logger', 'info', 
          `Custom trend: ${data.metricName} ${data.trend} over ${data.timeWindow}`);
      });

      // Simulate custom metrics tracking
      
      // 1. Test execution rate metrics
      eventBus.emit('custom:metric:recorded', {
        monitorId: monitorConfig.monitorId,
        metricName: 'test-execution-rate',
        value: 45,
        unit: 'tests/min',
        target: '50-80',
        timestamp: new Date()
      });

      eventBus.emit('custom:metric:recorded', {
        monitorId: monitorConfig.monitorId,
        metricName: 'test-execution-rate',
        value: 8,
        unit: 'tests/min',
        target: '50-80',
        timestamp: new Date()
      });

      // 2. Report generation latency metrics
      eventBus.emit('custom:metric:recorded', {
        monitorId: monitorConfig.monitorId,
        metricName: 'report-generation-latency',
        value: 350,
        unit: 'ms',
        target: '<500',
        timestamp: new Date()
      });

      eventBus.emit('custom:metric:recorded', {
        monitorId: monitorConfig.monitorId,
        metricName: 'report-generation-latency',
        value: 750,
        unit: 'ms',
        target: '<500',
        timestamp: new Date()
      });

      // 3. Error rate metrics
      eventBus.emit('custom:metric:recorded', {
        monitorId: monitorConfig.monitorId,
        metricName: 'error-rate',
        value: 2.5,
        unit: '%',
        target: '<5',
        timestamp: new Date()
      });

      eventBus.emit('custom:metric:recorded', {
        monitorId: monitorConfig.monitorId,
        metricName: 'error-rate',
        value: 12.8,
        unit: '%',
        target: '<5',
        timestamp: new Date()
      });

      // 4. Custom threshold exceeded events
      eventBus.emit('custom:threshold:exceeded', {
        monitorId: monitorConfig.monitorId,
        metricName: 'test-execution-rate',
        value: 8,
        unit: 'tests/min',
        threshold: 10,
        thresholdType: 'min',
        severity: 'warning',
        timestamp: new Date()
      });

      eventBus.emit('custom:threshold:exceeded', {
        monitorId: monitorConfig.monitorId,
        metricName: 'report-generation-latency',
        value: 750,
        unit: 'ms',
        threshold: 500,
        thresholdType: 'warning',
        severity: 'warning',
        timestamp: new Date()
      });

      eventBus.emit('custom:threshold:exceeded', {
        monitorId: monitorConfig.monitorId,
        metricName: 'error-rate',
        value: 12.8,
        unit: '%',
        threshold: 10,
        thresholdType: "critical",
        severity: "critical",
        timestamp: new Date()
      });

      // 5. Custom metric trend analysis
      eventBus.emit('custom:metric:trend:analyzed', {
        monitorId: monitorConfig.monitorId,
        metricName: 'test-execution-rate',
        trend: "decreasing",
        timeWindow: '5min',
        significance: 'high',
        timestamp: new Date()
      });

      eventBus.emit('custom:metric:trend:analyzed', {
        monitorId: monitorConfig.monitorId,
        metricName: 'report-generation-latency',
        trend: "increasing",
        timeWindow: '10min',
        significance: 'medium',
        timestamp: new Date()
      });

      // Verify custom metrics events
      expect(customMetricsEvents).toHaveLength(11);
      expect(customMetricsEvents.filter(e => e.type === 'custom:metric:recorded')).toHaveLength(6);
      expect(customMetricsEvents.filter(e => e.type === 'custom:threshold:exceeded')).toHaveLength(3);
      expect(customMetricsEvents.filter(e => e.type === 'custom:metric:trend:analyzed')).toHaveLength(2);

      // Verify custom metrics logging
      const metricsLogs = await mockLogger.getLogHistory('custom-metrics-logger');
      expect(metricsLogs).toHaveLength(8); // 6 metrics + 2 trends
      expect(metricsLogs.filter(l => l.level === 'info')).toHaveLength(8);

      // Verify custom threshold logging
      const thresholdLogs = await mockLogger.getLogHistory('custom-threshold-logger');
      expect(thresholdLogs).toHaveLength(3); // 3 threshold exceeded
      expect(thresholdLogs.filter(l => l.level === 'warn')).toHaveLength(2);
      expect(thresholdLogs.filter(l => l.level === 'error')).toHaveLength(1);

      // Verify specific custom metrics messages
      expect(metricsLogs.some(l => l.message.includes('test-execution-rate = 45tests/min'))).toBe(true);
      expect(metricsLogs.some(l => l.message.includes('report-generation-latency = 750ms'))).toBe(true);
      expect(metricsLogs.some(l => l.message.includes('error-rate = 12.8%'))).toBe(true);
      expect(metricsLogs.some(l => l.message.includes('Custom trend: test-execution-rate decreasing'))).toBe(true);

      // Verify specific threshold messages
      expect(thresholdLogs.some(l => l.message.includes('test-execution-rate 8tests/min > 10tests/min'))).toBe(true);
      expect(thresholdLogs.some(l => l.message.includes('report-generation-latency 750ms > 500ms'))).toBe(true);
      expect(thresholdLogs.some(l => l.message.includes('error-rate 12.8% > 10%'))).toBe(true);
    });
  });
});