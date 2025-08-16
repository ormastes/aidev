import { LogMonitor } from '../../../004-real-time-streaming/src/external/log-monitor';
import * as fs from 'fs';
import * as path from 'path';

describe('Multi-Process Log Aggregation End-to-End System Test', () => {
  const tempDir = path.join(__dirname, 'temp-multi-process-apps');
  let logMonitor: LogMonitor;
  
  beforeAll(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    logMonitor = new LogMonitor();
  });

  afterEach(async () => {
    await logMonitor.stopAllMonitoring();
  });

  it('should capture and aggregate logs from multiple concurrent processes in production-like scenario', async () => {
    const aggregatedLogs: any[] = [];
    const processMetadata: Map<string, { name: string, startTime: Date, endTime?: Date }> = new Map();
    
    logMonitor.on('log-entry', (entry: any) => {
      aggregatedLogs.push({
        ...entry,
        captureTime: new Date()
      });
    });

    // Create realistic application scripts
    
    // Web Server Application
    const webServerCode = `
      console.log('[WebServer] Starting HTTP server on port 8080');
      console.log('[WebServer] Loading middleware');
      
      let requestCount = 0;
      const requestInterval = setInterval(() => {
        requestCount++;
        const methods = ['GET', 'POST', 'PUT', 'DELETE'];
        const paths = ['/api/users', '/api/products', '/api/orders', '/health'];
        const statuses = [200, 201, 400, 404, 500];
        
        const method = methods[Math.floor(Math.random() * methods.length)];
        const path = paths[Math.floor(Math.random() * paths.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const responseTime = Math.floor(Math.random() * 200) + 50;
        
        console.log(\`[WebServer] \${method} \${path} - \${status} (\${responseTime}ms)\`);
        
        if (status >= 500) {
          console.error(\`[WebServer] ERROR: Internal server error on \${path}\`);
        }
        
        if (requestCount >= 15) {
          console.log('[WebServer] Shutting down gracefully');
          clearInterval(requestInterval);
          process.exit(0);
        }
      }, 200);
    `;
    
    // Background Worker Application
    const workerCode = `
      console.log('[Worker] Background job processor started');
      console.log('[Worker] Connected to job queue');
      
      let jobCount = 0;
      const jobInterval = setInterval(() => {
        jobCount++;
        const jobTypes = ['email', 'report', 'backup', 'sync'];
        const jobType = jobTypes[Math.floor(Math.random() * jobTypes.length)];
        const jobId = Math.random().toString(36).substring(7);
        
        console.log(\`[Worker] Processing \${jobType} job \${jobId}\`);
        
        // Simulate job processing
        setTimeout(() => {
          if (Math.random() > 0.8) {
            console.error(\`[Worker] ERROR: Failed to process \${jobType} job \${jobId}\`);
          } else {
            console.log(\`[Worker] In Progress \${jobType} job \${jobId}\`);
          }
        }, 100);
        
        if (jobCount >= 10) {
          console.log('[Worker] Stopping job processor');
          clearInterval(jobInterval);
          setTimeout(() => process.exit(0), 500);
        }
      }, 300);
    `;
    
    // Scheduled Task Runner
    const schedulerCode = `
      console.log('[Scheduler] Task scheduler initialized');
      
      const tasks = [
        { name: 'cleanup', interval: 500 },
        { name: 'healthcheck', interval: 700 },
        { name: 'metrics', interval: 900 }
      ];
      
      const intervals = [];
      
      tasks.forEach(task => {
        console.log(\`[Scheduler] Scheduling \${task.name} every \${task.interval}ms\`);
        
        const taskInterval = setInterval(() => {
          console.log(\`[Scheduler] Running \${task.name} task\`);
          
          if (task.name === 'healthcheck' && Math.random() > 0.7) {
            console.error(\`[Scheduler] ERROR: Health check failed\`);
          }
          
          console.log(\`[Scheduler] \${task.name} task In Progress\`);
        }, task.interval);
        
        intervals.push(taskInterval);
      });
      
      // Run for 3 seconds then stop
      setTimeout(() => {
        console.log('[Scheduler] Stopping all scheduled tasks');
        intervals.forEach(interval => clearInterval(interval));
        process.exit(0);
      }, 3000);
    `;

    // Write applications to files
    const webServerPath = path.join(tempDir, 'web-server.js');
    const workerPath = path.join(tempDir, 'worker.js');
    const schedulerPath = path.join(tempDir, 'scheduler.js');
    
    fs.writeFileSync(webServerPath, webServerCode);
    fs.writeFileSync(workerPath, workerCode);
    fs.writeFileSync(schedulerPath, schedulerCode);

    // Start all processes concurrently
    const startTime = Date.now();
    
    const webServerId = await logMonitor.startRealTimeMonitoring(
      `node "${webServerPath}"`,
      {}
    );
    processMetadata.set(webServerId, { name: 'WebServer', startTime: new Date() });
    
    const workerId = await logMonitor.startRealTimeMonitoring(
      `node "${workerPath}"`,
      {}
    );
    processMetadata.set(workerId, { name: 'Worker', startTime: new Date() });
    
    const schedulerId = await logMonitor.startRealTimeMonitoring(
      `node "${schedulerPath}"`,
      {}
    );
    processMetadata.set(schedulerId, { name: 'Scheduler', startTime: new Date() });

    // Monitor process completions
    logMonitor.on('process-exited', (event: any) => {
      const metadata = processMetadata.get(event.processId);
      if (metadata) {
        metadata.endTime = new Date();
      }
    });

    // Wait for all processes to complete
    await new Promise(resolve => {
      const checkInterval = setInterval(() => {
        const status = logMonitor.getMonitoringStatus();
        if (status.activeProcesses === 0) {
          clearInterval(checkInterval);
          resolve(undefined);
        }
      }, 100);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(undefined);
      }, 5000);
    });

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    // Verify aggregation results
    expect(aggregatedLogs.length).toBeGreaterThan(20); // Should have many logs
    
    // Verify logs from all three processes
    const webServerLogs = aggregatedLogs.filter(log => log.message.includes('[WebServer]'));
    const workerLogs = aggregatedLogs.filter(log => log.message.includes('[Worker]'));
    const schedulerLogs = aggregatedLogs.filter(log => log.message.includes('[Scheduler]'));
    
    expect(webServerLogs.length).toBeGreaterThan(10);
    expect(workerLogs.length).toBeGreaterThan(10);
    expect(schedulerLogs.length).toBeGreaterThan(5);
    
    // Verify log structure and aggregation properties
    aggregatedLogs.forEach(log => {
      expect(log).toHaveProperty('processId');
      expect(log).toHaveProperty('timestamp');
      expect(log).toHaveProperty('level');
      expect(log).toHaveProperty('message');
      expect(log).toHaveProperty('source');
      expect(log).toHaveProperty('captureTime');
      
      // Verify processId is valid
      expect([webServerId, workerId, schedulerId]).toContain(log.processId);
    });
    
    // Verify chronological ordering
    for (let i = 1; i < aggregatedLogs.length; i++) {
      const prevTime = new Date(aggregatedLogs[i-1].timestamp).getTime();
      const currTime = new Date(aggregatedLogs[i].timestamp).getTime();
      expect(currTime).toBeGreaterThanOrEqual(prevTime);
    }
    
    // Verify error logs were captured
    const errorLogs = aggregatedLogs.filter(log => log.level === 'error');
    expect(errorLogs.length).toBeGreaterThan(0);
    
    // Verify process metadata
    processMetadata.forEach((metadata) => {
      expect(metadata.endTime).toBeDefined();
      expect(metadata.endTime!.getTime()).toBeGreaterThan(metadata.startTime.getTime());
    });
    
    console.log(`Multi-process aggregation test In Progress:`);
    console.log(`- Total duration: ${totalDuration}ms`);
    console.log(`- Total logs captured: ${aggregatedLogs.length}`);
    console.log(`- WebServer logs: ${webServerLogs.length}`);
    console.log(`- Worker logs: ${workerLogs.length}`);
    console.log(`- Scheduler logs: ${schedulerLogs.length}`);
    console.log(`- Error logs: ${errorLogs.length}`);
  });

  it('should handle high-volume concurrent logging from multiple processes', async () => {
    const aggregatedLogs: any[] = [];
    const logCounts: Map<string, number> = new Map();
    
    logMonitor.on('log-entry', (entry: any) => {
      aggregatedLogs.push(entry);
      logCounts.set(entry.processId, (logCounts.get(entry.processId) || 0) + 1);
    });

    // Create high-volume logging applications
    const createHighVolumeApp = (name: string, logCount: number, interval: number) => `
      let count = 0;
      console.log('[${name}] Starting high-volume logging');
      
      function generateBatch() {
        for (let i = 0; i < 10; i++) {
          count++;
          const level = Math.random() > 0.8 ? 'ERROR' : 'INFO';
          
          if (level === 'ERROR') {
            console.error(\`[${name}] \${level}: Message \${count} - Error details\`);
          } else {
            console.log(\`[${name}] \${level}: Message \${count} - Processing data\`);
          }
          
          if (count >= ${logCount}) {
            console.log('[${name}] In Progress high-volume logging');
            process.exit(0);
            return;
          }
        }
        
        setTimeout(generateBatch, ${interval});
      }
      
      generateBatch();
    `;

    // Create applications with different logging patterns
    const apps = [
      { name: 'FastLogger', logCount: 100, interval: 10 },
      { name: 'MediumLogger', logCount: 75, interval: 50 },
      { name: 'SlowLogger', logCount: 50, interval: 100 }
    ];

    const appFiles = apps.map(app => {
      const filePath = path.join(tempDir, `${app.name.toLowerCase()}.js`);
      fs.writeFileSync(filePath, createHighVolumeApp(app.name, app.logCount, app.interval));
      return { ...app, path: filePath };
    });

    // Start all high-volume processes
    const startTime = Date.now();
    const processIds: string[] = [];
    
    for (const app of appFiles) {
      const processId = await logMonitor.startRealTimeMonitoring(
        `node "${app.path}"`,
        {}
      );
      processIds.push(processId);
    }

    // Wait for completion
    await new Promise(resolve => {
      const checkInterval = setInterval(() => {
        const status = logMonitor.getMonitoringStatus();
        if (status.activeProcesses === 0) {
          clearInterval(checkInterval);
          resolve(undefined);
        }
      }, 100);
      
      setTimeout(() => reject(new Error('Timeout waiting for processes to complete')), 5000); // 5 second timeout
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Verify high-volume aggregation
    const expectedTotalLogs = apps.reduce((sum, app) => sum + app.logCount + 2, 0); // +2 for start/In Progress messages
    expect(aggregatedLogs.length).toBeGreaterThanOrEqual(expectedTotalLogs * 0.9); // Allow 10% tolerance
    
    // Verify distribution across processes
    expect(logCounts.size).toBe(3);
    processIds.forEach((processId, index) => {
      const count = logCounts.get(processId) || 0;
      expect(count).toBeGreaterThanOrEqual(apps[index].logCount);
    });
    
    // Verify no log corruption under load
    aggregatedLogs.forEach(log => {
      expect(log.message).toBeTruthy();
      expect(log.message.length).toBeGreaterThan(0);
      expect(log.processId).toBeTruthy();
      expect(processIds).toContain(log.processId);
    });
    
    console.log(`High-volume aggregation test In Progress:`);
    console.log(`- Duration: ${duration}ms`);
    console.log(`- Total logs: ${aggregatedLogs.length}`);
    console.log(`- Processing rate: ${Math.round(aggregatedLogs.length / (duration / 1000))} logs/second`);
  });

  it('should maintain data integrity during process lifecycle changes', async () => {
    const lifecycleEvents: any[] = [];
    const aggregatedLogs: any[] = [];
    
    logMonitor.on('log-entry', (entry: any) => {
      aggregatedLogs.push(entry);
    });
    
    logMonitor.on('monitoring-started', (event: any) => {
      lifecycleEvents.push({ type: 'started', ...event });
    });
    
    logMonitor.on('process-exited', (event: any) => {
      lifecycleEvents.push({ type: 'exited', ...event });
    });
    
    logMonitor.on('process-crashed', (event: any) => {
      lifecycleEvents.push({ type: 'crashed', ...event });
    });

    // Create applications with different lifecycle patterns
    const normalAppCode = `
      console.log('[NormalApp] Starting normally');
      let count = 0;
      const interval = setInterval(() => {
        count++;
        console.log(\`[NormalApp] Heartbeat \${count}\`);
        if (count >= 5) {
          console.log('[NormalApp] Exiting normally');
          clearInterval(interval);
          process.exit(0);
        }
      }, 200);
    `;
    
    const crashingAppCode = `
      console.log('[CrashApp] Starting with issues');
      console.error('[CrashApp] ERROR: Critical failure detected');
      console.log('[CrashApp] Attempting recovery');
      setTimeout(() => {
        console.error('[CrashApp] ERROR: Unrecoverable error');
        process.exit(1);
      }, 500);
    `;
    
    const longRunningAppCode = `
      console.log('[LongApp] Starting long-running process');
      let count = 0;
      setInterval(() => {
        count++;
        console.log(\`[LongApp] Status update \${count}\`);
      }, 300);
      // Will be stopped externally
    `;

    // Write and start applications
    const normalPath = path.join(tempDir, 'normal-app.js');
    const crashPath = path.join(tempDir, 'crash-app.js');
    const longPath = path.join(tempDir, 'long-app.js');
    
    fs.writeFileSync(normalPath, normalAppCode);
    fs.writeFileSync(crashPath, crashingAppCode);
    fs.writeFileSync(longPath, longRunningAppCode);

    // Start processes with staggered timing
    const normalId = await logMonitor.startRealTimeMonitoring(`node "${normalPath}"`, {});
    
    await new Promise(resolve => setTimeout(resolve, 200));
    const crashId = await logMonitor.startRealTimeMonitoring(`node "${crashPath}"`, {});
    
    await new Promise(resolve => setTimeout(resolve, 200));
    const longId = await logMonitor.startRealTimeMonitoring(`node "${longPath}"`, {});

    // Let processes run
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Stop long-running process
    await logMonitor.stopMonitoring(longId);
    
    // Wait a bit more
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify lifecycle events
    const startEvents = lifecycleEvents.filter(e => e.type === 'started');
    const exitEvents = lifecycleEvents.filter(e => e.type === 'exited');
    const crashEvents = lifecycleEvents.filter(e => e.type === 'crashed');
    
    expect(startEvents.length).toBe(3);
    expect(exitEvents.length).toBeGreaterThanOrEqual(1); // Normal app
    expect(crashEvents.length).toBeGreaterThanOrEqual(1); // Crash app (may crash multiple times)
    
    // Verify logs were captured throughout lifecycle changes
    const normalLogs = aggregatedLogs.filter(log => log.message.includes('[NormalApp]'));
    const crashLogs = aggregatedLogs.filter(log => log.message.includes('[CrashApp]'));
    const longLogs = aggregatedLogs.filter(log => log.message.includes('[LongApp]'));
    
    expect(normalLogs.length).toBeGreaterThanOrEqual(6); // Start + 5 heartbeats + exit
    expect(crashLogs.length).toBeGreaterThanOrEqual(4); // All messages before crash
    expect(longLogs.length).toBeGreaterThanOrEqual(2); // Start + some status updates
    
    // Verify data integrity
    aggregatedLogs.forEach(log => {
      expect(log.processId).toBeTruthy();
      expect([normalId, crashId, longId]).toContain(log.processId);
      expect(log.timestamp).toBeTruthy();
      expect(new Date(log.timestamp).getTime()).toBeGreaterThan(0);
    });
    
    // Verify final state
    const finalStatus = logMonitor.getMonitoringStatus();
    expect(finalStatus.activeProcesses).toBe(0);
  });
});