import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as net from 'net';
import * as http from 'http';
import { spawn } from 'child_process';
import { LogMonitor } from '../../user-stories/004-real-time-streaming/src/external/log-monitor';
import { LogAggregator } from '../../user-stories/006-multi-process-aggregation/src/internal/log-aggregator';
import { FileManager } from '../../user-stories/001-basic-log-capture/src/domain/file-manager';
import { LogEntry } from '../../user-stories/004-real-time-streaming/src/domain/log-entry';

describe('Transport and Buffering System Tests', () => {
  jest.setTimeout(30000);
  
  let testDir: string;
  let testAppsDir: string;
  let logMonitor: LogMonitor;

  beforeAll(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'transport-buffer-test-'));
    testAppsDir = path.join(testDir, 'apps');
    fs.mkdirSync(testAppsDir, { recursive: true });
    
    await createTransportTestApplications();
  });

  beforeEach(() => {
    logMonitor = new LogMonitor();
  });

  afterEach(async () => {
    await logMonitor.stopAllMonitoring();
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  async function createTransportTestApplications() {
    // 1. Log producer with configurable output rate
    const rateLimitedProducerPath = path.join(testAppsDir, 'rate-limited-producer.js');
    fs.writeFileSync(rateLimitedProducerPath, `
      const rate = parseInt(process.argv[2]) || 100; // logs per second
      const duration = parseInt(process.argv[3]) || 5000; // milliseconds
      const burstMode = process.argv[4] === 'burst';
      
      const startTime = Date.now();
      let logCount = 0;
      let lastBurstTime = startTime;
      
      function emitLog() {
        const now = Date.now();
        const elapsed = now - startTime;
        
        if (elapsed >= duration) {
          console.log(\`[INFO] In Progress: \${logCount} logs in \${elapsed}ms (\${(logCount / (elapsed / 1000)).toFixed(2)} logs/sec)\`);
          process.exit(0);
          return;
        }
        
        logCount++;
        
        const logData = {
          id: logCount,
          timestamp: new Date().toISOString(),
          level: logCount % 20 === 0 ? 'error' : logCount % 10 === 0 ? 'warn' : 'info',
          message: \`Log entry #\${logCount}\`,
          metadata: {
            elapsed,
            rate: (logCount / (elapsed / 1000)).toFixed(2),
            memoryUsage: process.memoryUsage().heapUsed
          }
        };
        
        if (logData.level === 'error') {
          console.error(JSON.stringify(logData));
        } else {
          console.log(JSON.stringify(logData));
        }
        
        // Schedule next log
        if (burstMode) {
          // Burst mode: emit 10 logs rapidly, then wait
          if (logCount % 10 === 0) {
            setTimeout(emitLog, 1000 / rate * 10);
          } else {
            setImmediate(emitLog);
          }
        } else {
          // Steady mode: consistent rate
          setTimeout(emitLog, 1000 / rate);
        }
      }
      
      console.log(\`[INFO] Starting rate-limited producer: \${rate} logs/sec, \${duration}ms duration, mode: \${burstMode ? 'burst' : 'steady'}\`);
      emitLog();
    `);

    // 2. Buffer overflow simulator
    const bufferOverflowPath = path.join(testAppsDir, 'buffer-overflow-sim.js');
    fs.writeFileSync(bufferOverflowPath, `
      const messageSize = parseInt(process.argv[2]) || 1024; // bytes per message
      const messagesPerBurst = parseInt(process.argv[3]) || 100;
      const burstCount = parseInt(process.argv[4]) || 5;
      
      function generateLargeMessage(size) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < size; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      }
      
      async function produceBurst(burstNum) {
        console.log(\`[INFO] Starting burst \${burstNum} with \${messagesPerBurst} messages of \${messageSize} bytes each\`);
        const burstStart = Date.now();
        
        // Emit all messages as fast as possible
        for (let i = 0; i < messagesPerBurst; i++) {
          const largePayload = generateLargeMessage(messageSize);
          const logEntry = {
            burst: burstNum,
            sequence: i + 1,
            timestamp: new Date().toISOString(),
            level: i % 10 === 0 ? 'warn' : 'info',
            size: messageSize,
            payload: largePayload,
            checksum: require('crypto').createHash('md5').update(largePayload).digest('hex').substring(0, 8)
          };
          
          // Write directly to stdout without newline to stress buffers
          if (i === messagesPerBurst - 1) {
            console.log(JSON.stringify(logEntry));
          } else {
            process.stdout.write(JSON.stringify(logEntry) + '\\n');
          }
        }
        
        const burstDuration = Date.now() - burstStart;
        console.log(\`[INFO] Burst \${burstNum} In Progress in \${burstDuration}ms\`);
      }
      
      async function main() {
        console.log(\`[INFO] Buffer overflow simulator starting: \${burstCount} bursts\`);
        
        for (let i = 1; i <= burstCount; i++) {
          await produceBurst(i);
          
          // Wait between bursts to allow buffer recovery
          if (i < burstCount) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        console.log('[INFO] Buffer overflow simulation In Progress');
      }
      
      main().catch(console.error);
    `);

    // 3. Network transport simulator (TCP)
    const tcpTransportPath = path.join(testAppsDir, 'tcp-transport-sim.js');
    fs.writeFileSync(tcpTransportPath, `
      const net = require('net');
      const mode = process.argv[2] || 'client'; // 'client' or 'server'
      const port = parseInt(process.argv[3]) || 9999;
      const messageCount = parseInt(process.argv[4]) || 100;
      
      if (mode === 'server') {
        const receivedLogs = [];
        let buffer = '';
        
        const server = net.createServer((socket) => {
          console.log('[INFO] Client connected from ' + socket.remoteAddress);
          
          socket.on('data', (data) => {
            buffer += data.toString();
            
            // Process In Progress messages (newline delimited)
            const lines = buffer.split('\\n');
            buffer = lines.pop() || '';
            
            lines.forEach(line => {
              if (line.trim()) {
                try {
                  const log = JSON.parse(line);
                  receivedLogs.push(log);
                  
                  // Echo back acknowledgment
                  socket.write(JSON.stringify({
                    type: 'ack',
                    id: log.id,
                    receivedAt: new Date().toISOString()
                  }) + '\\n');
                  
                  if (receivedLogs.length % 10 === 0) {
                    console.log(\`[INFO] Received \${receivedLogs.length} logs\`);
                  }
                } catch (e) {
                  console.error('[ERROR] Failed to parse log: ' + e.message);
                }
              }
            });
          });
          
          socket.on('end', () => {
            console.log('[INFO] Client disconnected');
            console.log(\`[INFO] Total logs received: \${receivedLogs.length}\`);
            
            // Verify data integrity
            const missingIds = [];
            for (let i = 1; i <= messageCount; i++) {
              if (!receivedLogs.find(log => log.id === i)) {
                missingIds.push(i);
              }
            }
            
            if (missingIds.length > 0) {
              console.error(\`[ERROR] Missing log IDs: \${missingIds.join(', ')}\`);
            } else {
              console.log('[INFO] All logs received In Progress');
            }
            
            server.close();
          });
          
          socket.on('error', (err) => {
            console.error('[ERROR] Socket error: ' + err.message);
          });
        });
        
        server.listen(port, () => {
          console.log(\`[INFO] TCP server listening on port \${port}\`);
        });
        
        // Graceful shutdown
        process.on('SIGTERM', () => {
          console.log('[INFO] Shutting down server...');
          server.close(() => {
            process.exit(0);
          });
        });
        
      } else {
        // Client mode
        console.log(\`[INFO] Connecting to TCP server on port \${port}\`);
        
        const client = net.createConnection(port, 'localhost', () => {
          console.log('[INFO] Connected to server');
          
          let sentCount = 0;
          let ackCount = 0;
          const startTime = Date.now();
          
          // Handle acknowledgments
          let ackBuffer = '';
          client.on('data', (data) => {
            ackBuffer += data.toString();
            const lines = ackBuffer.split('\\n');
            ackBuffer = lines.pop() || '';
            
            lines.forEach(line => {
              if (line.trim()) {
                try {
                  const ack = JSON.parse(line);
                  if (ack.type === 'ack') {
                    ackCount++;
                  }
                } catch (e) {
                  // Ignore parse errors
                }
              }
            });
          });
          
          // Send logs
          function sendNextLog() {
            if (sentCount >= messageCount) {
              const duration = Date.now() - startTime;
              console.log(\`[INFO] Sent all \${sentCount} logs in \${duration}ms\`);
              
              // Wait for remaining acks
              setTimeout(() => {
                console.log(\`[INFO] Received \${ackCount} acknowledgments\`);
                client.end();
              }, 1000);
              return;
            }
            
            sentCount++;
            const log = {
              id: sentCount,
              timestamp: new Date().toISOString(),
              level: sentCount % 10 === 0 ? 'error' : 'info',
              message: \`TCP transport test log #\${sentCount}\`,
              size: Math.floor(Math.random() * 1000) + 100
            };
            
            client.write(JSON.stringify(log) + '\\n');
            
            // Vary sending rate
            const delay = sentCount % 20 === 0 ? 50 : 5;
            setTimeout(sendNextLog, delay);
          }
          
          sendNextLog();
        });
        
        client.on('error', (err) => {
          console.error('[ERROR] Connection error: ' + err.message);
          process.exit(1);
        });
        
        client.on('close', () => {
          console.log('[INFO] Connection closed');
          process.exit(0);
        });
      }
    `);

    // 4. HTTP transport simulator
    const httpTransportPath = path.join(testAppsDir, 'http-transport-sim.js');
    fs.writeFileSync(httpTransportPath, `
      const http = require('http');
      const mode = process.argv[2] || 'client'; // 'client' or 'server'
      const port = parseInt(process.argv[3]) || 8888;
      const batchSize = parseInt(process.argv[4]) || 10;
      
      if (mode === 'server') {
        const receivedBatches = [];
        let totalLogs = 0;
        
        const server = http.createServer((req, res) => {
          if (req.method === 'POST' && req.url === '/logs') {
            let body = '';
            
            req.on('data', chunk => {
              body += chunk.toString();
            });
            
            req.on('end', () => {
              try {
                const batch = JSON.parse(body);
                receivedBatches.push(batch);
                totalLogs += batch.logs.length;
                
                console.log(\`[INFO] Received batch \${batch.batchId} with \${batch.logs.length} logs\`);
                
                // Send response
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  status: 'ok',
                  batchId: batch.batchId,
                  received: batch.logs.length,
                  totalReceived: totalLogs
                }));
              } catch (e) {
                console.error('[ERROR] Failed to parse batch: ' + e.message);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid batch format' }));
              }
            });
          } else {
            res.writeHead(404);
            res.end('Not found');
          }
        });
        
        server.listen(port, () => {
          console.log(\`[INFO] HTTP server listening on port \${port}\`);
        });
        
        // Graceful shutdown
        process.on('SIGTERM', () => {
          console.log('[INFO] Shutting down HTTP server...');
          console.log(\`[INFO] Total batches received: \${receivedBatches.length}\`);
          console.log(\`[INFO] Total logs received: \${totalLogs}\`);
          server.close(() => {
            process.exit(0);
          });
        });
        
      } else {
        // Client mode
        const logs = [];
        const batchCount = 5;
        
        // Generate logs
        for (let i = 1; i <= batchSize * batchCount; i++) {
          logs.push({
            id: i,
            timestamp: new Date().toISOString(),
            level: i % 15 === 0 ? 'error' : i % 10 === 0 ? 'warn' : 'info',
            message: \`HTTP batch test log #\${i}\`,
            metadata: {
              batch: Math.ceil(i / batchSize),
              host: os.hostname()
            }
          });
        }
        
        console.log(\`[INFO] Sending \${logs.length} logs in \${batchCount} batches of \${batchSize}\`);
        
        async function sendBatch(batchNum) {
          const start = (batchNum - 1) * batchSize;
          const batchLogs = logs.slice(start, start + batchSize);
          
          const batch = {
            batchId: \`batch_\${Date.now()}_\${batchNum}\`,
            timestamp: new Date().toISOString(),
            logs: batchLogs,
            metadata: {
              batchNumber: batchNum,
              totalBatches: batchCount
            }
          };
          
          return new Promise((resolve, reject) => {
            const postData = JSON.stringify(batch);
            
            const options = {
              hostname: 'localhost',
              port: port,
              path: '/logs',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
              }
            };
            
            const req = http.request(options, (res) => {
              let body = '';
              
              res.on('data', chunk => {
                body += chunk.toString();
              });
              
              res.on('end', () => {
                if (res.statusCode === 200) {
                  console.log(\`[INFO] Batch \${batchNum} sent successfully: \${body}\`);
                  resolve(JSON.parse(body));
                } else {
                  console.error(\`[ERROR] Batch \${batchNum} failed: \${res.statusCode}\`);
                  reject(new Error(\`HTTP \${res.statusCode}\`));
                }
              });
            });
            
            req.on('error', (e) => {
              console.error(\`[ERROR] Request failed: \${e.message}\`);
              reject(e);
            });
            
            req.write(postData);
            req.end();
          });
        }
        
        // Send batches with retry logic
        async function main() {
          const results = [];
          
          for (let i = 1; i <= batchCount; i++) {
            let retries = 3;
            while (retries > 0) {
              try {
                const result = await sendBatch(i);
                results.push(result);
                break;
              } catch (e) {
                retries--;
                if (retries > 0) {
                  console.log(\`[WARN] Retrying batch \${i}, \${retries} attempts left\`);
                  await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                  console.error(\`[ERROR] Failed to send batch \${i} after 3 attempts\`);
                }
              }
            }
            
            // Delay between batches
            if (i < batchCount) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }
          
          console.log(\`[INFO] In Progress: \${results.length}/${batchCount} batches sent successfully\`);
          process.exit(results.length === batchCount ? 0 : 1);
        }
        
        main();
      }
    `);

    // 5. File-based buffering simulator
    const fileBufferPath = path.join(testAppsDir, 'file-buffer-sim.js');
    fs.writeFileSync(fileBufferPath, `
      const fs = require('fs');
      const path = require('path');
      
      const bufferDir = process.argv[2] || path.join(__dirname, 'buffer');
      const maxBufferSize = parseInt(process.argv[3]) || 1000000; // 1MB default
      const logCount = parseInt(process.argv[4]) || 1000;
      
      // Ensure buffer directory exists
      if (!fs.existsSync(bufferDir)) {
        fs.mkdirSync(bufferDir, { recursive: true });
      }
      
      class FileBuffer {
        constructor(dir, maxSize) {
          this.dir = dir;
          this.maxSize = maxSize;
          this.currentFile = null;
          this.currentSize = 0;
          this.fileCount = 0;
        }
        
        async write(data) {
          const dataSize = Buffer.byteLength(JSON.stringify(data) + '\\n');
          
          // Check if we need a new file
          if (!this.currentFile || this.currentSize + dataSize > this.maxSize) {
            await this.rotateFile();
          }
          
          // Write to current file
          await fs.promises.appendFile(
            this.currentFile,
            JSON.stringify(data) + '\\n'
          );
          
          this.currentSize += dataSize;
        }
        
        async rotateFile() {
          this.fileCount++;
          this.currentFile = path.join(this.dir, \`buffer_\${Date.now()}_\${this.fileCount}.jsonl\`);
          this.currentSize = 0;
          
          console.log(\`[INFO] Rotated to new buffer file: \${path.basename(this.currentFile)}\`);
        }
        
        async flush() {
          const files = await fs.promises.readdir(this.dir);
          const bufferFiles = files.filter(f => f.startsWith('buffer_'));
          
          console.log(\`[INFO] Flushing \${bufferFiles.length} buffer files\`);
          
          let totalLogs = 0;
          for (const file of bufferFiles) {
            const filePath = path.join(this.dir, file);
            const content = await fs.promises.readFile(filePath, 'utf-8');
            const lines = content.trim().split('\\n').filter(line => line);
            
            totalLogs += lines.length;
            console.log(\`[INFO] File \${file}: \${lines.length} logs\`);
            
            // In real implementation, would send to transport here
            // For now, just delete the file
            await fs.promises.unlink(filePath);
          }
          
          return totalLogs;
        }
      }
      
      async function main() {
        console.log(\`[INFO] File buffer simulator starting: \${logCount} logs, max buffer size: \${maxBufferSize}\`);
        
        const buffer = new FileBuffer(bufferDir, maxBufferSize);
        const startTime = Date.now();
        
        // Generate and buffer logs
        for (let i = 1; i <= logCount; i++) {
          const log = {
            id: i,
            timestamp: new Date().toISOString(),
            level: i % 20 === 0 ? 'error' : i % 10 === 0 ? 'warn' : 'info',
            message: \`Buffered log entry #\${i}\`,
            size: Math.floor(Math.random() * 500) + 100,
            metadata: {
              processId: process.pid,
              hostname: require('os').hostname()
            }
          };
          
          await buffer.write(log);
          
          if (i % 100 === 0) {
            console.log(\`[INFO] Buffered \${i} logs\`);
          }
        }
        
        const bufferDuration = Date.now() - startTime;
        console.log(\`[INFO] Buffering In Progress in \${bufferDuration}ms\`);
        
        // Simulate flush operation
        const flushedCount = await buffer.flush();
        console.log(\`[INFO] Flushed \${flushedCount} logs from buffer\`);
        
        // Cleanup
        try {
          await fs.promises.rmdir(bufferDir);
        } catch (e) {
          // Directory might not be empty
        }
      }
      
      main().catch(console.error);
    `);
  }

  describe('Log Buffering and Flow Control', () => {
    it('should handle high-rate log production with buffering', async () => {
      const capturedLogs: LogEntry[] = [];
      const metrics = {
        firstLogTime: 0,
        lastLogTime: 0,
        maxBufferDelay: 0
      };

      logMonitor.on('log-entry', (entry) => {
        capturedLogs.push(entry);
        
        const now = Date.now();
        if (metrics.firstLogTime === 0) {
          metrics.firstLogTime = now;
        }
        metrics.lastLogTime = now;
        
        // Try to parse log data for timing analysis
        try {
          const match = entry.message.match(/(\{.*\})/);
          if (match) {
            const logData = JSON.parse(match[1]);
            if (logData.timestamp) {
              const logTime = new Date(logData.timestamp).getTime();
              const delay = now - logTime;
              metrics.maxBufferDelay = Math.max(metrics.maxBufferDelay, delay);
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      });

      // Test steady rate
      const steadyProcessId = await logMonitor.startRealTimeMonitoring(
        `node "${path.join(testAppsDir, 'rate-limited-producer.js')}" 200 3000 steady`
      );

      await new Promise<void>((resolve) => {
        logMonitor.on('process-exited', (event) => {
          if (event.processId === steadyProcessId) {
            resolve();
          }
        });
      });

      const steadyLogs = capturedLogs.length;
      expect(steadyLogs).toBeGreaterThan(500); // Should capture most logs at 200/sec for 3 seconds

      // Reset for burst test
      capturedLogs.length = 0;
      metrics.firstLogTime = 0;
      metrics.maxBufferDelay = 0;

      // Test burst mode
      const burstProcessId = await logMonitor.startRealTimeMonitoring(
        `node "${path.join(testAppsDir, 'rate-limited-producer.js')}" 200 3000 burst`
      );

      await new Promise<void>((resolve) => {
        logMonitor.on('process-exited', (event) => {
          if (event.processId === burstProcessId) {
            resolve();
          }
        });
      });

      const burstLogs = capturedLogs.length;
      expect(burstLogs).toBeGreaterThan(500); // Should handle bursts without significant loss

      // Verify buffering didn't introduce excessive delays
      expect(metrics.maxBufferDelay).toBeLessThan(1000); // Less than 1 second delay
    });

    it('should handle buffer overflow scenarios gracefully', async () => {
      const capturedLogs: LogEntry[] = [];
      const parseErrors: string[] = [];
      const checksumValidations = new Map<string, boolean>();

      logMonitor.on('log-entry', (entry) => {
        capturedLogs.push(entry);
        
        // Try to parse and validate large messages
        try {
          const match = entry.message.match(/(\{.*\})/);
          if (match) {
            const logData = JSON.parse(match[1]);
            
            if (logData.checksum && logData.payload) {
              // Verify checksum
              const crypto = require('crypto');
              const calculatedChecksum = crypto.createHash('md5')
                .update(logData.payload)
                .digest('hex')
                .substring(0, 8);
              
              checksumValidations.set(
                `${logData.burst}-${logData.sequence}`,
                calculatedChecksum === logData.checksum
              );
            }
          }
        } catch (e) {
          parseErrors.push(e.message);
        }
      });

      // Run buffer overflow simulation with large messages
      const processId = await logMonitor.startRealTimeMonitoring(
        `node "${path.join(testAppsDir, 'buffer-overflow-sim.js')}" 2048 50 3`
      );

      await new Promise<void>((resolve) => {
        logMonitor.on('process-exited', (event) => {
          if (event.processId === processId) {
            resolve();
          }
        });
      });

      // Verify handling of large messages
      expect(capturedLogs.length).toBeGreaterThan(100); // 3 bursts * 50 messages

      // Verify data integrity through checksums
      const validChecksums = Array.from(checksumValidations.values()).filter(v => v).length;
      const totalChecksums = checksumValidations.size;
      
      expect(validChecksums).toBe(totalChecksums); // All checksums should be valid
      expect(parseErrors.length).toBeLessThan(5); // Minimal parse errors

      // Verify burst completion logs
      const burstCompletionLogs = capturedLogs.filter(log => 
        log.message.includes('Burst') && log.message.includes('In Progress')
      );
      expect(burstCompletionLogs.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Network Transport Simulation', () => {
    it('should simulate TCP transport with acknowledgments', async () => {
      let tcpServer: any;
      let tcpServerStarted = false;

      // Start TCP server in background
      tcpServer = spawn('node', [
        path.join(testAppsDir, 'tcp-transport-sim.js'),
        'server',
        '9999',
        '50'
      ]);

      // Wait for server to start
      await new Promise<void>((resolve) => {
        tcpServer.stdout.on('data', (data: Buffer) => {
          if (data.toString().includes('TCP server listening')) {
            tcpServerStarted = true;
            resolve();
          }
        });
        
        // Timeout fallback
        setTimeout(() => resolve(), 2000);
      });

      expect(tcpServerStarted).toBe(true);

      // Monitor client logs
      const clientLogs: LogEntry[] = [];
      logMonitor.on('log-entry', (entry) => {
        clientLogs.push(entry);
      });

      // Start TCP client
      const clientProcessId = await logMonitor.startRealTimeMonitoring(
        `node "${path.join(testAppsDir, 'tcp-transport-sim.js')}" client 9999 50`
      );

      await new Promise<void>((resolve) => {
        logMonitor.on('process-exited', (event) => {
          if (event.processId === clientProcessId) {
            resolve();
          }
        });
      });

      // Kill server
      tcpServer.kill('SIGTERM');

      // Verify client operation
      const sentLog = clientLogs.find(log => log.message.includes('Sent all'));
      const ackLog = clientLogs.find(log => log.message.includes('acknowledgments'));
      
      expect(sentLog).toBeDefined();
      expect(ackLog).toBeDefined();

      // Parse acknowledgment count
      const ackMatch = ackLog?.message.match(/Received (\d+) acknowledgments/);
      if (ackMatch) {
        const ackCount = parseInt(ackMatch[1]);
        expect(ackCount).toBeGreaterThan(40); // Should receive most acknowledgments
      }
    });

    it('should simulate HTTP batch transport with retry logic', async () => {
      let httpServer: any;
      let httpServerStarted = false;

      // Start HTTP server
      httpServer = spawn('node', [
        path.join(testAppsDir, 'http-transport-sim.js'),
        'server',
        '8888'
      ]);

      // Wait for server to start
      await new Promise<void>((resolve) => {
        httpServer.stdout.on('data', (data: Buffer) => {
          if (data.toString().includes('HTTP server listening')) {
            httpServerStarted = true;
            resolve();
          }
        });
        
        setTimeout(() => resolve(), 2000);
      });

      expect(httpServerStarted).toBe(true);

      // Monitor client logs
      const clientLogs: LogEntry[] = [];
      const batchResults: string[] = [];

      logMonitor.on('log-entry', (entry) => {
        clientLogs.push(entry);
        
        if (entry.message.includes('Batch') && entry.message.includes('sent successfully')) {
          batchResults.push(entry.message);
        }
      });

      // Start HTTP client
      const clientProcessId = await logMonitor.startRealTimeMonitoring(
        `node "${path.join(testAppsDir, 'http-transport-sim.js')}" client 8888 10`
      );

      await new Promise<void>((resolve) => {
        logMonitor.on('process-exited', (event) => {
          if (event.processId === clientProcessId) {
            resolve();
          }
        });
      });

      // Kill server
      httpServer.kill('SIGTERM');

      // Verify batch sending
      expect(batchResults.length).toBe(5); // All 5 batches should be sent

      // Verify completion
      const completionLog = clientLogs.find(log => log.message.includes('In Progress:'));
      expect(completionLog).toBeDefined();
      expect(completionLog?.message).toContain('5/5 batches sent successfully');
    });
  });

  describe('File-Based Buffering', () => {
    it('should implement file-based buffering with rotation', async () => {
      const bufferDir = path.join(testDir, 'file-buffer-test');
      const capturedLogs: LogEntry[] = [];
      const rotationEvents: string[] = [];

      logMonitor.on('log-entry', (entry) => {
        capturedLogs.push(entry);
        
        if (entry.message.includes('Rotated to new buffer file')) {
          rotationEvents.push(entry.message);
        }
      });

      // Run file buffer simulation
      const processId = await logMonitor.startRealTimeMonitoring(
        `node "${path.join(testAppsDir, 'file-buffer-sim.js')}" "${bufferDir}" 50000 500`
      );

      await new Promise<void>((resolve) => {
        logMonitor.on('process-exited', (event) => {
          if (event.processId === processId) {
            resolve();
          }
        });
      });

      // Verify file rotation occurred
      expect(rotationEvents.length).toBeGreaterThan(2); // Should have multiple rotations

      // Verify flush operation
      const flushLog = capturedLogs.find(log => log.message.includes('Flushed') && log.message.includes('logs from buffer'));
      expect(flushLog).toBeDefined();
      
      const flushMatch = flushLog?.message.match(/Flushed (\d+) logs/);
      if (flushMatch) {
        const flushedCount = parseInt(flushMatch[1]);
        expect(flushedCount).toBe(500); // All logs should be flushed
      }

      // Verify buffer directory is cleaned up
      expect(fs.existsSync(bufferDir)).toBe(false);
    });
  });

  describe('Transport Preparation and Formatting', () => {
    it('should prepare logs for various transport formats', async () => {
      const aggregator = new LogAggregator();
      const fileManager = new FileManager();
      const transportReadyBatches: any[] = [];

      logMonitor.on('log-entry', (entry) => {
        aggregator.addLog(entry.processId, entry);
      });

      // Generate structured logs
      const processId = await logMonitor.startRealTimeMonitoring(
        `node "${path.join(testAppsDir, 'rate-limited-producer.js')}" 100 2000 steady`
      );

      await new Promise<void>((resolve) => {
        logMonitor.on('process-exited', (event) => {
          if (event.processId === processId) {
            resolve();
          }
        });
      });

      // Prepare logs for transport in batches
      const allLogs = aggregator.getAggregatedLogs();
      const batchSize = 50;
      
      for (let i = 0; i < allLogs.length; i += batchSize) {
        const batchLogs = allLogs.slice(i, i + batchSize);
        
        const transportBatch = {
          batchId: `transport_batch_${i / batchSize + 1}`,
          timestamp: new Date().toISOString(),
          source: {
            hostname: os.hostname(),
            platform: os.platform(),
            pid: process.pid
          },
          logs: batchLogs.map(log => ({
            ...log,
            formatted: {
              iso8601: new Date(log.timestamp).toISOString(),
              unix: new Date(log.timestamp).getTime(),
              readable: new Date(log.timestamp).toLocaleString()
            }
          })),
          metadata: {
            count: batchLogs.length,
            levels: [...new Set(batchLogs.map(l => l.level))],
            timeRange: {
              start: batchLogs[0]?.timestamp,
              end: batchLogs[batchLogs.length - 1]?.timestamp
            },
            compression: 'none',
            encoding: 'utf-8'
          }
        };
        
        transportReadyBatches.push(transportBatch);
      }

      // Verify transport preparation
      expect(transportReadyBatches.length).toBeGreaterThan(0);
      
      transportReadyBatches.forEach(batch => {
        // Verify batch structure
        expect(batch.batchId).toBeDefined();
        expect(batch.source.hostname).toBeDefined();
        expect(batch.logs.length).toBeGreaterThan(0);
        expect(batch.metadata.levels.length).toBeGreaterThan(0);
        
        // Verify JSON serializable
        const serialized = JSON.stringify(batch);
        expect(() => JSON.parse(serialized)).not.toThrow();
        
        // Verify size is reasonable for transport
        const batchSizeBytes = Buffer.byteLength(serialized);
        expect(batchSizeBytes).toBeLessThan(1024 * 1024); // Less than 1MB per batch
      });

      // Test different export formats
      const sampleLogs = allLogs.slice(0, 10).map(log => ({
        timestamp: log.timestamp,
        level: log.level,
        message: log.message,
        source: log.source
      }));

      const outputDir = path.join(testDir, 'transport-formats');
      fs.mkdirSync(outputDir, { recursive: true });

      // Save in different formats for transport
      await fileManager.saveLogsToFile(sampleLogs as any, path.join(outputDir, 'logs.json'), { format: 'json' });
      await fileManager.saveLogsToFile(sampleLogs as any, path.join(outputDir, 'logs.csv'), { format: 'csv' });
      await fileManager.saveLogsToFile(sampleLogs as any, path.join(outputDir, 'logs.txt'), { format: 'text' });

      // Verify all formats were created
      expect(fs.existsSync(path.join(outputDir, 'logs.json'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'logs.csv'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'logs.txt'))).toBe(true);
    });
  });

  describe('Backpressure and Memory Management', () => {
    it('should handle backpressure without memory leaks', async () => {
      const memorySnapshots: number[] = [];
      const capturedLogs: LogEntry[] = [];
      
      // Monitor memory usage
      const memoryMonitor = setInterval(() => {
        memorySnapshots.push(process.memoryUsage().heapUsed);
      }, 500);

      logMonitor.on('log-entry', (entry) => {
        capturedLogs.push(entry);
        
        // Simulate slow processing to create backpressure
        if (capturedLogs.length % 100 === 0) {
          // Brief pause to simulate processing delay
          const start = Date.now();
          while (Date.now() - start < 10) {
            // Busy wait
          }
        }
      });

      // Generate high-volume logs
      const processId = await logMonitor.startRealTimeMonitoring(
        `node "${path.join(testAppsDir, 'buffer-overflow-sim.js')}" 1024 100 5`
      );

      await new Promise<void>((resolve) => {
        logMonitor.on('process-exited', (event) => {
          if (event.processId === processId) {
            resolve();
          }
        });
      });

      clearInterval(memoryMonitor);

      // Verify no significant memory leak
      const initialMemory = memorySnapshots[0];
      const finalMemory = memorySnapshots[memorySnapshots.length - 1];
      const memoryGrowth = finalMemory - initialMemory;
      
      // Memory growth should be reasonable
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth

      // Verify logs were still captured despite backpressure
      expect(capturedLogs.length).toBeGreaterThan(400); // Most logs should be captured

      // Calculate memory efficiency
      const bytesPerLog = memoryGrowth / capturedLogs.length;
      expect(bytesPerLog).toBeLessThan(10 * 1024); // Less than 10KB per log
    });
  });
});