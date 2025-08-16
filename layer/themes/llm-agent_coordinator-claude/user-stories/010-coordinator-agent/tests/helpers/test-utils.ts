import * as fs from 'fs/promises';
import { path } from '../../../../../infra_external-log-lib/src';
import { os } from '../../../../../infra_external-log-lib/src';
import { createServer, Server, IncomingMessage, ServerResponse } from 'node:http';
import { EventEmitter } from 'node:events';

/**
 * Creates a temporary directory for testing
 */
export async function createTempDir(prefix: string = 'coord-test'): Promise<string> {
  const tempDir = path.join(os.tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.mkdir(tempDir, { recursive: true });
  return tempDir;
}

/**
 * Cleans up a temporary directory
 */
export async function cleanupTempDir(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (error) {
    // Ignore errors during cleanup
  }
}

/**
 * Creates a test file with content
 */
export async function createTestFile(dir: string, filename: string, content: string): Promise<string> {
  const filePath = path.join(dir, filename);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
  return filePath;
}

/**
 * Mock HTTP response for testing
 */
export class MockHttpResponse extends EventEmitter {
  public statusCode: number = 200;
  public headers: Record<string, string> = {};
  private chunks: Buffer[] = [];

  constructor(statusCode: number = 200) {
    super();
    this.statusCode = statusCode;
  }

  write(chunk: string | Buffer): void {
    this.chunks.push(Buffer.from(chunk));
  }

  end(data?: string | Buffer): void {
    if (data) {
      this.chunks.push(Buffer.from(data));
    }
    const body = Buffer.concat(this.chunks).toString();
    this.emit('data', body);
    this.emit('end');
  }

  simulateStreamData(data: string): void {
    this.emit('data', data);
  }

  simulateEnd(): void {
    this.emit('end');
  }

  simulateError(error: Error): void {
    this.emit('error', error);
  }
}

/**
 * Mock HTTP request for testing
 */
export class MockHttpRequest extends EventEmitter {
  private chunks: Buffer[] = [];
  public destroyed: boolean = false;

  write(chunk: string | Buffer): boolean {
    this.chunks.push(Buffer.from(chunk));
    return true;
  }

  end(callback?: () => void): void {
    if (callback) callback();
    this.emit('finish');
  }

  destroy(): void {
    this.destroyed = true;
    this.emit('close');
  }

  getBody(): string {
    return Buffer.concat(this.chunks).toString();
  }

  simulateTimeout(): void {
    this.emit('timeout');
  }

  simulateError(error: Error): void {
    this.emit('error', error);
  }
}

/**
 * Creates a test HTTP server
 */
export async function createTestServer(
  handler: (req: IncomingMessage, res: ServerResponse) => void
): Promise<{ server: Server; port: number; url: string }> {
  const server = createServer(handler);
  
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    
    // Use port 0 to get a random available port
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to get server address'));
        return;
      }
      
      resolve({
        server,
        port: address.port,
        url: `http://127.0.0.1:${address.port}`
      });
    });
  });
}

/**
 * Closes a test server
 */
export async function closeTestServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * Creates mock Claude credentials for testing
 */
export interface MockCredentials {
  claudeAiOauth: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    subscriptionType: string;
  };
}

export function createMockCredentials(options: {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  subscriptionType?: string;
} = {}): MockCredentials {
  return {
    claudeAiOauth: {
      accessToken: options.accessToken || 'mock-access-token',
      refreshToken: options.refreshToken || 'mock-refresh-token',
      expiresAt: Date.now() + (options.expiresIn || 3600000), // Default 1 hour
      subscriptionType: options.subscriptionType || 'pro'
    }
  };
}

/**
 * Creates expired mock credentials for testing
 */
export function createExpiredMockCredentials(): MockCredentials {
  return createMockCredentials({ expiresIn: -3600000 }); // 1 hour ago
}

/**
 * Writes mock credentials to a file
 */
export async function writeMockCredentials(
  credentialsPath: string,
  credentials: MockCredentials
): Promise<void> {
  await fs.mkdir(path.dirname(credentialsPath), { recursive: true });
  await fs.writeFile(credentialsPath, JSON.stringify(credentials, null, 2), 'utf-8');
}

/**
 * Creates a mock Claude API response
 */
export function createMockClaudeResponse(options: {
  content?: string;
  error?: { type: string; message: string };
  statusCode?: number;
} = {}): string {
  if (options.error) {
    return JSON.stringify({ error: options.error });
  }
  
  return JSON.stringify({
    content: [{ text: options.content || 'Mock Claude response' }]
  });
}

/**
 * Creates a mock SSE (Server-Sent Events) stream for Claude API
 */
export function createMockSSEStream(events: Array<{
  event: string;
  data: any;
}>): string {
  return events.map(({ event, data }) => {
    if (typeof data === 'string' && data === '[In Progress]') {
      return `data: [In Progress]\n\n`;
    }
    return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  }).join('');
}

/**
 * Waits for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 50
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Creates a mock session data structure
 */
export function createMockSessionData(overrides: any = {}): any {
  return {
    id: `session-${Date.now()}-test`,
    state: 'active',
    startTime: new Date(),
    conversation: [],
    permissions: {
      dangerousMode: false,
      allowedTools: [],
      modificationHistory: []
    },
    checkpoints: [],
    taskQueue: {
      queuePath: '/test/TASK_QUEUE.md',
      currentTask: null,
      completedTasks: []
    },
    ...overrides
  };
}