/**
 * Test Harness for System Tests
 */

import { spawn } from 'child_process';
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';

export class TestHarness {
  private serverProcess: any;
  public serverUrl = 'ws://localhost:3001';
  public roomId = `test-${Date.now()}`;
  private externalCalls: string[] = [];

  async startServer(): Promise<void> {
    // Start test server with interceptors
    this.serverProcess = spawn('npm', ['run', 'server:test'], {
      env: {
        ...process.env,
        CHAT_PORT: '3001',
        INTERCEPT_CONSOLE: 'true',
        INTERCEPT_LOG_DIR: './logs/test'
      }
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async stopServer(): Promise<void> {
    if (this.serverProcess) {
      this.serverProcess.kill();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  async sendAndWaitForResponse(
    message: string,
    agent: any
  ): Promise<string> {
    // Implementation would send message and wait for response
    return 'mocked response';
  }

  getExternalCalls(): string[] {
    return this.externalCalls;
  }
}
