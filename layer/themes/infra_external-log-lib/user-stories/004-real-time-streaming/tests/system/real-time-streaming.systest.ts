import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs/promises';
import * as path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';

interface LogStreamEvent {
  timestamp: string;
  level: string;
  message: string;
  source: string;
  metadata?: Record<string, any>;
}

class MockLogStreamer extends EventEmitter {
  private isStreaming = false;
  private interval?: NodeJS.Timeout;

  start(intervalMs = 100): void {
    if (this.isStreaming) return;
    
    this.isStreaming = true;
    let counter = 0;
    
    this.interval = setInterval(() => {
      const event: LogStreamEvent = {
        timestamp: new Date().toISOString(),
        level: ['INFO', 'WARN', 'ERROR', 'DEBUG'][counter % 4],
        message: `Streaming log message ${counter}`,
        source: `service-${Math.floor(counter / 10)}`,
        metadata: {
          requestId: `req-${counter}`,
          duration: Math.floor(Math.random() * 1000)
        }
      };
      
      this.emit('log', event);
      counter++;
    }, intervalMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
    this.isStreaming = false;
  }

  isActive(): boolean {
    return this.isStreaming;
  }
}

test.describe('Real-time Log Streaming System Tests', () => {
  let tempDir: string;
  let mockStreamer: MockLogStreamer;
  let wsServer: WebSocketServer;
  let serverPort: number;

  test.beforeEach(async () => {
    tempDir = path.join(__dirname, '..', '..', 'temp', `stream-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    mockStreamer = new MockLogStreamer();

    // Setup WebSocket server for streaming tests
    serverPort = 8080 + Math.floor(Math.random() * 1000);
    wsServer = new WebSocketServer({ port: serverPort });
  });

  test.afterEach(async () => {
    mockStreamer.stop();
    wsServer.close();
    
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Cleanup failed: ${error}`);
    }
  });

  test('should stream logs in real-time with WebSocket', async () => {
    const receivedLogs: LogStreamEvent[] = [];
    const logCount = 10;

    // Setup WebSocket server to broadcast logs
    wsServer.on('connection', (ws) => {
      mockStreamer.on('log', (logEvent) => {
        ws.send(JSON.stringify(logEvent));
      });
    });

    // Create WebSocket client to receive logs
    await new Promise<void>((resolve, reject) => {
      const client = new WebSocket(`ws://localhost:${serverPort}`);
      
      client.on('open', () => {
        mockStreamer.start(50); // Stream every 50ms
      });

      client.on('message', (data) => {
        const logEvent: LogStreamEvent = JSON.parse(data.toString());
        receivedLogs.push(logEvent);
        
        if (receivedLogs.length >= logCount) {
          client.close();
          resolve();
        }
      });

      client.on('error', reject);
      
      // Timeout after 5 seconds
      setTimeout(() => reject(new Error('Timeout waiting for logs')), 5000);
    });

    mockStreamer.stop();

    // Verify logs were received in real-time
    expect(receivedLogs).toHaveLength(logCount);
    expect(receivedLogs[0].message).toBe('Streaming log message 0');
    expect(receivedLogs[9].message).toBe('Streaming log message 9');

    // Verify log structure
    receivedLogs.forEach((log, index) => {
      expect(log).toHaveProperty('timestamp');
      expect(log).toHaveProperty('level');
      expect(log).toHaveProperty('message');
      expect(log).toHaveProperty('source');
      expect(log.metadata).toHaveProperty('requestId', `req-${index}`);
    });
  });

  test('should handle multiple concurrent streaming connections', async () => {
    const clientCount = 5;
    const logsPerClient = 5;
    const allReceivedLogs: LogStreamEvent[][] = [];

    // Setup server to broadcast to all connections
    const connections: WebSocket[] = [];
    wsServer.on('connection', (ws) => {
      connections.push(ws);
      mockStreamer.on('log', (logEvent) => {
        ws.send(JSON.stringify(logEvent));
      });
    });

    // Create multiple clients
    const clientPromises = Array.from({ length: clientCount }, (_, clientIndex) => {
      return new Promise<LogStreamEvent[]>((resolve, reject) => {
        const receivedLogs: LogStreamEvent[] = [];
        const client = new WebSocket(`ws://localhost:${serverPort}`);

        client.on('open', () => {
          if (clientIndex === 0) {
            mockStreamer.start(100); // Start streaming when first client connects
          }
        });

        client.on('message', (data) => {
          const logEvent: LogStreamEvent = JSON.parse(data.toString());
          receivedLogs.push(logEvent);
          
          if (receivedLogs.length >= logsPerClient) {
            client.close();
            resolve(receivedLogs);
          }
        });

        client.on('error', reject);
        setTimeout(() => reject(new Error(`Client ${clientIndex} timeout`)), 5000);
      });
    });

    const results = await Promise.all(clientPromises);
    mockStreamer.stop();

    // Verify all clients received logs
    expect(results).toHaveLength(clientCount);
    results.forEach((clientLogs, index) => {
      expect(clientLogs).toHaveLength(logsPerClient);
      expect(clientLogs[0]).toHaveProperty('timestamp');
      expect(clientLogs[0]).toHaveProperty('message');
    });

    // Verify all clients received the same log sequence
    const firstClientMessages = results[0].map(log => log.message);
    results.slice(1).forEach(clientLogs => {
      const messages = clientLogs.map(log => log.message);
      expect(messages).toEqual(firstClientMessages);
    });
  });

  test('should handle log buffering during connection interruptions', async () => {
    const bufferFile = path.join(tempDir, 'log_buffer.json');
    const bufferedLogs: LogStreamEvent[] = [];

    // Simulate buffering logs when no connections are active
    mockStreamer.on('log', async (logEvent) => {
      if (wsServer.clients.size === 0) {
        bufferedLogs.push(logEvent);
        await fs.writeFile(bufferFile, JSON.stringify(bufferedLogs, null, 2));
      }
    });

    // Start streaming without any connections (logs should be buffered)
    mockStreamer.start(50);
    await new Promise(resolve => setTimeout(resolve, 500)); // Buffer for 500ms

    const bufferExists = await fs.access(bufferFile).then(() => true).catch(() => false);
    expect(bufferExists).toBe(true);

    const bufferContent = JSON.parse(await fs.readFile(bufferFile, 'utf-8'));
    expect(bufferContent.length).toBeGreaterThan(0);

    // Now connect a client and verify it receives buffered logs
    const receivedLogs: LogStreamEvent[] = [];
    
    await new Promise<void>((resolve, reject) => {
      const client = new WebSocket(`ws://localhost:${serverPort}`);
      
      client.on('open', async () => {
        // Send buffered logs to new connection
        for (const bufferedLog of bufferedLogs) {
          client.send(JSON.stringify(bufferedLog));
        }
        
        // Continue with live streaming
        setTimeout(() => {
          client.close();
          resolve();
        }, 200);
      });

      client.on('message', (data) => {
        const logEvent: LogStreamEvent = JSON.parse(data.toString());
        receivedLogs.push(logEvent);
      });

      client.on('error', reject);
      setTimeout(() => reject(new Error('Connection timeout')), 3000);
    });

    mockStreamer.stop();

    // Verify client received buffered logs
    expect(receivedLogs.length).toBeGreaterThanOrEqual(bufferedLogs.length);
  });

  test('should filter logs in real-time based on criteria', async () => {
    const errorLogs: LogStreamEvent[] = [];
    const allLogs: LogStreamEvent[] = [];

    wsServer.on('connection', (ws) => {
      mockStreamer.on('log', (logEvent) => {
        allLogs.push(logEvent);
        
        // Filter: only send ERROR level logs to client
        if (logEvent.level === 'ERROR') {
          ws.send(JSON.stringify(logEvent));
        }
      });
    });

    await new Promise<void>((resolve, reject) => {
      const client = new WebSocket(`ws://localhost:${serverPort}`);
      
      client.on('open', () => {
        mockStreamer.start(25); // Fast streaming to get multiple log levels
      });

      client.on('message', (data) => {
        const logEvent: LogStreamEvent = JSON.parse(data.toString());
        errorLogs.push(logEvent);
        
        // Stop after receiving several error logs or timeout
        if (errorLogs.length >= 3) {
          client.close();
          resolve();
        }
      });

      client.on('error', reject);
      
      // Timeout to ensure we've generated enough logs
      setTimeout(() => {
        client.close();
        resolve();
      }, 2000);
    });

    mockStreamer.stop();

    // Verify filtering worked
    expect(allLogs.length).toBeGreaterThan(errorLogs.length);
    expect(errorLogs.length).toBeGreaterThanOrEqual(1);
    
    // Verify all received logs are ERROR level
    errorLogs.forEach(log => {
      expect(log.level).toBe('ERROR');
    });
  });

  test('should maintain streaming performance under high load', async ({ timeout }) => {
    timeout(15000); // 15 second timeout for performance test
    
    const highVolumeStreamer = new MockLogStreamer();
    const receivedCount = { value: 0 };
    const startTime = Date.now();
    const targetLogs = 1000;

    wsServer.on('connection', (ws) => {
      highVolumeStreamer.on('log', (logEvent) => {
        ws.send(JSON.stringify(logEvent));
      });
    });

    await new Promise<void>((resolve, reject) => {
      const client = new WebSocket(`ws://localhost:${serverPort}`);
      
      client.on('open', () => {
        highVolumeStreamer.start(1); // Stream every 1ms for high volume
      });

      client.on('message', () => {
        receivedCount.value++;
        
        if (receivedCount.value >= targetLogs) {
          const endTime = Date.now();
          const duration = endTime - startTime;
          const logsPerSecond = receivedCount.value / (duration / 1000);
          
          console.log(`Performance: ${logsPerSecond.toFixed(0)} logs/second`);
          
          client.close();
          resolve();
        }
      });

      client.on('error', reject);
      setTimeout(() => reject(new Error('Performance test timeout')), 10000);
    });

    highVolumeStreamer.stop();

    // Verify performance metrics
    expect(receivedCount.value).toBe(targetLogs);
    const duration = Date.now() - startTime;
    const logsPerSecond = receivedCount.value / (duration / 1000);
    expect(logsPerSecond).toBeGreaterThan(50); // Should handle at least 50 logs/second
  });

  test('should handle log streaming with metadata aggregation', async () => {
    const aggregatedData = {
      totalLogs: 0,
      errorCount: 0,
      avgDuration: 0,
      sourceStats: {} as Record<string, number>
    };

    wsServer.on('connection', (ws) => {
      mockStreamer.on('log', (logEvent) => {
        // Perform real-time aggregation
        aggregatedData.totalLogs++;
        
        if (logEvent.level === 'ERROR') {
          aggregatedData.errorCount++;
        }
        
        if (logEvent.metadata?.duration) {
          const currentAvg = aggregatedData.avgDuration;
          const newAvg = (currentAvg * (aggregatedData.totalLogs - 1) + logEvent.metadata.duration) / aggregatedData.totalLogs;
          aggregatedData.avgDuration = newAvg;
        }
        
        aggregatedData.sourceStats[logEvent.source] = (aggregatedData.sourceStats[logEvent.source] || 0) + 1;
        
        // Send both the log event and aggregated stats
        ws.send(JSON.stringify({
          type: 'log',
          data: logEvent
        }));
        
        ws.send(JSON.stringify({
          type: 'stats',
          data: aggregatedData
        }));
      });
    });

    const receivedStats: any[] = [];
    
    await new Promise<void>((resolve, reject) => {
      const client = new WebSocket(`ws://localhost:${serverPort}`);
      
      client.on('open', () => {
        mockStreamer.start(100);
      });

      client.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'stats') {
          receivedStats.push(message.data);
          
          if (receivedStats.length >= 20) {
            client.close();
            resolve();
          }
        }
      });

      client.on('error', reject);
      setTimeout(() => reject(new Error('Stats aggregation timeout')), 5000);
    });

    mockStreamer.stop();

    // Verify aggregation data
    expect(receivedStats.length).toBeGreaterThanOrEqual(20);
    const finalStats = receivedStats[receivedStats.length - 1];
    
    expect(finalStats.totalLogs).toBeGreaterThan(0);
    expect(finalStats).toHaveProperty('errorCount');
    expect(finalStats).toHaveProperty('avgDuration');
    expect(finalStats).toHaveProperty('sourceStats');
    expect(Object.keys(finalStats.sourceStats)).toContain('service-0');
  });
});