import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * System Test: Basic Log Capture
 * Tests the complete log capture pipeline with real processes
 */

test.describe('Log Capture System Tests', () => {
  const testDir = path.join(process.cwd(), 'gen', 'test-log-capture');
  
  test.beforeAll(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });
  
  test.afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  test('should capture stdout from child process', async () => {
    const logFile = path.join(testDir, 'stdout.log');
    
    await new Promise<void>((resolve, reject) => {
      const child = spawn('node', ['-e', 'console.log("Test output"); console.log("Line 2");']);
      const writeStream = fs.open(logFile, 'w');
      
      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('exit', async () => {
        await fs.writeFile(logFile, output);
        resolve();
      });
      
      child.on('error', reject);
    });
    
    const capturedLog = await fs.readFile(logFile, 'utf-8');
    expect(capturedLog).toContain('Test output');
    expect(capturedLog).toContain('Line 2');
  });

  test('should capture stderr from child process', async () => {
    const logFile = path.join(testDir, 'stderr.log');
    
    await new Promise<void>((resolve, reject) => {
      const child = spawn('node', ['-e', 'console.error("Error message"); process.exit(1)']);
      
      let errorOutput = '';
      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      child.on('exit', async () => {
        await fs.writeFile(logFile, errorOutput);
        resolve();
      });
      
      child.on('error', reject);
    });
    
    const capturedLog = await fs.readFile(logFile, 'utf-8');
    expect(capturedLog).toContain('Error message');
  });

  test('should handle multiple simultaneous processes', async () => {
    const processes = [];
    const logFiles = [];
    
    // Spawn 5 processes simultaneously
    for (let i = 0; i < 5; i++) {
      const logFile = path.join(testDir, `process-${i}.log`);
      logFiles.push(logFile);
      
      const promise = new Promise<void>((resolve) => {
        const child = spawn('node', ['-e', `console.log("Process ${i}"); setTimeout(() => console.log("Done ${i}"), 100);`]);
        
        let output = '';
        child.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        child.on('exit', async () => {
          await fs.writeFile(logFile, output);
          resolve();
        });
      });
      
      processes.push(promise);
    }
    
    await Promise.all(processes);
    
    // Verify all logs were captured
    for (let i = 0; i < 5; i++) {
      const log = await fs.readFile(logFiles[i], 'utf-8');
      expect(log).toContain(`Process ${i}`);
      expect(log).toContain(`Done ${i}`);
    }
  });

  test('should handle process termination gracefully', async () => {
    const logFile = path.join(testDir, 'terminated.log');
    
    await new Promise<void>((resolve) => {
      const child = spawn('node', ['-e', 'console.log("Starting"); setTimeout(() => console.log("Should not appear"), 5000);']);
      
      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      // Kill process after 100ms
      setTimeout(() => {
        child.kill('SIGTERM');
      }, 100);
      
      child.on('exit', async (code, signal) => {
        await fs.writeFile(logFile, output);
        expect(signal).toBe('SIGTERM');
        resolve();
      });
    });
    
    const log = await fs.readFile(logFile, 'utf-8');
    expect(log).toContain('Starting');
    expect(log).not.toContain('Should not appear');
  });

  test('should capture logs with timestamps', async () => {
    const logFile = path.join(testDir, 'timestamped.log');
    
    await new Promise<void>((resolve) => {
      const child = spawn('node', ['-e', 'console.log("Event 1"); setTimeout(() => console.log("Event 2"), 50);']);
      
      const logs: Array<{ timestamp: Date; message: string }> = [];
      
      child.stdout.on('data', (data) => {
        const lines = data.toString().trim().split('\n');
        lines.forEach(line => {
          logs.push({
            timestamp: new Date(),
            message: line
          });
        });
      });
      
      child.on('exit', async () => {
        const formattedLogs = logs.map(log => 
          `[${log.timestamp.toISOString()}] ${log.message}`
        ).join('\n');
        
        await fs.writeFile(logFile, formattedLogs);
        resolve();
      });
    });
    
    const log = await fs.readFile(logFile, 'utf-8');
    expect(log).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] Event 1/);
    expect(log).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] Event 2/);
  });
});