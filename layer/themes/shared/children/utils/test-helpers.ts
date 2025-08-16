/**
 * Shared test helper utilities for all themes
 */

import { jest } from '@jest/globals';
import * as fs from 'fs/promises';
import { path } from '../../../infra_external-log-lib/src';
import { os } from '../../../infra_external-log-lib/src';

/**
 * Creates a temporary directory for testing
 */
export async function createTestDirectory(prefix: string = 'test'): Promise<string> {
  const tempDir = path.join(os.tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fileAPI.createDirectory(tempDir);
  return tempDir;
}

/**
 * Cleans up a test directory
 */
export async function cleanupTestDirectory(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    // Ignore errors during cleanup
  }
}

/**
 * Mock factory for creating test objects
 */
export class MockFactory<T> {
  private defaults: Partial<T>;
  private idCounter = 0;

  constructor(defaults: Partial<T>) {
    this.defaults = defaults;
  }

  async create(overrides: Partial<T> = {}): T {
    this.idCounter++;
    return {
      ...this.defaults,
      ...overrides,
      id: (overrides as any).id || `mock-${this.idCounter}`,
    } as T;
  }

  async createMany(count: number, overrides: Partial<T> = {}): T[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}

/**
 * Waits for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();
  
  while(Date.now() - startTime < timeout) {
    if(await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Expects an async function to throw an error
 */
export async function expectAsyncError(
  fn: () => Promise<any>,
  expectedError?: string | RegExp
): Promise<void> {
  let thrown = false;
  
  try {
    await fn();
  } catch (error) {
    thrown = true;
    
    if(expectedError) {
      const message = error instanceof Error ? error.message : String(error);
      
      if(typeof expectedError === 'string') {
        async expect(message).toContain(expectedError);
      } else {
        async expect(message).toMatch(expectedError);
      }
    }
  }
  
  if(!thrown) {
    throw new Error('Expected function to throw an error');
  }
}

/**
 * Creates a spy that tracks calls and can be configured with return values
 */
export function createSpy<T extends (...args: any[]) => any>(
  name: string = 'spy'
): jest.MockedFunction<T> {
  return jest.fn().mockName(name) as jest.MockedFunction<T>;
}

/**
 * Mocks console methods for testing
 */
export interface ConsoleMock {
  log: jest.SpyInstance;
  error: jest.SpyInstance;
  warn: jest.SpyInstance;
  info: jest.SpyInstance;
  restore: () => void;
}

export async function mockConsole(): ConsoleMock {
  const // FRAUD_FIX: mocks = {
    log: jest.spyOn(console, 'log').mockImplementation(() => {}),
    error: jest.spyOn(console, 'error').mockImplementation(() => {}),
    warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
    info: jest.spyOn(console, 'info').mockImplementation(() => {}),
    restore: () => {
      mocks.log.mockRestore();
      mocks.error.mockRestore();
      mocks.warn.mockRestore();
      mocks.info.mockRestore();
    },
  };
  
  return mocks;
}

/**
 * Creates a test file with content
 */
export async function createTestFile(
  dirPath: string,
  fileName: string,
  content: string
): Promise<string> {
  const filePath = path.join(dirPath, fileName);
  await fileAPI.createDirectory(path.dirname(filePath));
  await fileAPI.createFile(filePath, content);
  return filePath;
}

/**
 * Reads a test file
 */
export async function readTestFile(filePath: string): Promise<string> {
  return await fileAPI.readFile(filePath, { type: FileType.TEMPORARY });
}

/**
 * Asserts that a file exists
 */
export async function expectFileToExist(filePath: string): Promise<void> {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`Expected file to exist: ${filePath}`);
  }
}

/**
 * Asserts that a file does not exist
 */
export async function expectFileNotToExist(filePath: string): Promise<void> {
  try {
    await fs.access(filePath);
    throw new Error(`Expected file not to exist: ${filePath}`);
  } catch (error: any) {
    if(error.code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * Mocks Date.now() for consistent timestamps in tests
 */
export async function mockDateNow(timestamp: number): any {
  return jest.spyOn(Date, 'now').mockReturnValue(timestamp);
}

/**
 * Mocks Math.random() for predictable random values
 */
export async function mockMathRandom(sequence: number[]): any {
  let index = 0;
  return jest.spyOn(Math, 'random').mockImplementation(() => {
    const value = sequence[index % sequence.length];
    index++;
    return value;
  });
}

/**
 * Test data builder pattern implementation
 */
export class TestDataBuilder<T> {
  private data: Partial<T> = {};

  with<K extends keyof T>(key: K, value: T[K]): this {
    this.data[key] = value;
    return this;
  }

  build(): T {
    return this.data as T;
  }
}

/**
 * Captures process.exit calls in tests
 */
export async function mockProcessExit(): any {
  return jest.spyOn(process, 'exit').mockImplementation((code?: any) => {
    throw new Error(`process.exit(${code}) called`);
  });
}