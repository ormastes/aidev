import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock child_process before importing
jest.mock('child_process', () => ({
  spawn: jest.fn(),
  exec: jest.fn()
}));

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn()
  }
}));

jest.mock('vscode', () => ({
  CancellationTokenSource: jest.fn(() => ({
    token: {
      isCancellationRequested: false,
      onCancellationRequested: jest.fn()
    },
    cancel: jest.fn(),
    dispose: jest.fn()
  }))
}));

describe('Runner', () => {
  let runner: any;
  let spawn: any;
  let exec: any;
  let readFile: any;
  let mockChildProcess: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Import mocked dependencies
    const childProcess = await import('child_process');
    spawn = childProcess.spawn as jest.Mock;
    exec = childProcess.exec as jest.Mock;
    
    const fs = await import('fs');
    readFile = fs.promises.readFile as jest.Mock;

    // Setup mock child process
    mockChildProcess = {
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() },
      on: jest.fn(),
      kill: jest.fn()
    };
    spawn.mockReturnValue(mockChildProcess);

    // Import runner after mocking
    const runnerModule = await import('../../src/runner');
    runner = runnerModule.default;
  });

  test('should run test with basic arguments', async () => {
    const mockConfig = {
      executable: '/usr/bin/test',
      buildDirectory: '/build',
      resultLineHandler: jest.fn()
    };
    const resultHandler = jest.fn();

    // Setup process behavior
    mockChildProcess.on.mockImplementation((event: string, handler: Function) => {
      if (event === 'close') {
        handler(0); // Exit code 0
      }
    });

    const promise = runner(
      ['--test'],
      '/build',
      false,
      'result.xml',
      mockConfig,
      undefined,
      resultHandler
    );

    await promise;

    expect(spawn).toHaveBeenCalledWith(
      '/usr/bin/test',
      expect.arrayContaining(['--test']),
      expect.objectContaining({ cwd: '/build' })
    );
  });

  test('should handle process errors', async () => {
    const mockConfig = {
      executable: '/usr/bin/test',
      buildDirectory: '/build'
    };
    const resultHandler = jest.fn();

    mockChildProcess.on.mockImplementation((event: string, handler: Function) => {
      if (event === 'error') {
        handler(new Error('Process failed'));
      }
    });

    await expect(
      runner([], '/build', false, 'result.xml', mockConfig, undefined, resultHandler)
    ).rejects.toThrow('Process failed');
  });

  test('should handle cancellation', async () => {
    const mockConfig = {
      executable: '/usr/bin/test',
      buildDirectory: '/build'
    };
    const resultHandler = jest.fn();
    const vscode = require('vscode');
    const cancelSource = new vscode.CancellationTokenSource();

    // Simulate cancellation
    cancelSource.token.isCancellationRequested = true;

    mockChildProcess.on.mockImplementation((event: string, handler: Function) => {
      if (event === 'close') {
        handler(0);
      }
    });

    await runner([], '/build', false, 'result.xml', mockConfig, cancelSource, resultHandler);

    expect(mockChildProcess.kill).toHaveBeenCalled();
  });

  test('should read result file when useFile is true', async () => {
    const mockConfig = {
      executable: '/usr/bin/test',
      buildDirectory: '/build'
    };
    const resultHandler = jest.fn();
    const testResult = '<test>result</test>';

    readFile.mockResolvedValue(Buffer.from(testResult));
    
    mockChildProcess.on.mockImplementation((event: string, handler: Function) => {
      if (event === 'close') {
        handler(0);
      }
    });

    await runner([], '/build', true, 'result.xml', mockConfig, undefined, resultHandler);

    expect(readFile).toHaveBeenCalledWith('result.xml');
    expect(resultHandler).toHaveBeenCalledWith(testResult);
  });

  test('should collect stdout when not using file', async () => {
    const mockConfig = {
      executable: '/usr/bin/test',
      buildDirectory: '/build'
    };
    const resultHandler = jest.fn();
    const stdoutData = 'Test output';

    mockChildProcess.stdout.on.mockImplementation((event: string, handler: Function) => {
      if (event === 'data') {
        handler(Buffer.from(stdoutData));
      }
    });

    mockChildProcess.on.mockImplementation((event: string, handler: Function) => {
      if (event === 'close') {
        handler(0);
      }
    });

    await runner([], '/build', false, 'result.xml', mockConfig, undefined, resultHandler);

    expect(resultHandler).toHaveBeenCalledWith(stdoutData);
  });
});