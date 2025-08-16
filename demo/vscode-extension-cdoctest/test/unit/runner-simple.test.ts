import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock child_process
jest.mock('child_process', () => ({
  exec: jest.fn(),
  spawn: jest.fn(() => ({
    on: jest.fn(),
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() },
    kill: jest.fn()
  }))
}));

// Mock fs
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(),
  promises: {
    readFile: jest.fn()
  }
}));

// Mock vscode
jest.mock('vscode', () => ({
  ExtensionContext: {},
  workspace: {
    fs: {
      readFile: jest.fn()
    },
    getConfiguration: jest.fn(() => ({
      get: jest.fn()
    }))
  },
  Uri: {
    file: jest.fn((path: string) => ({
      fsPath: path,
      toString: () => `file://${path}`
    }))
  }
}));

describe('Runner - Simple Tests', () => {
  let runner: any;
  let initRunner: any;
  let runProgramWithLibPaths: any;
  let launchDebugSessionWithCloseHandler: any;
  let spawn: any;
  let exec: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Get mocked modules
    const childProcess = await import('child_process');
    spawn = childProcess.spawn;
    exec = childProcess.exec;
    
    // Import functions after mocking
    const runnerModule = await import('../../src/runner');
    runner = runnerModule.runner;
    initRunner = runnerModule.initRunner;
    runProgramWithLibPaths = runnerModule.runProgramWithLibPaths;
    launchDebugSessionWithCloseHandler = runnerModule.launchDebugSessionWithCloseHandler;
  });

  describe("initRunner", () => {
    test('should initialize runner with context', () => {
      const mockContext = {
        subscriptions: [],
        extensionPath: '/test/ext',
        globalState: {},
        workspaceState: {}
      };

      // Should not throw
      expect(() => initRunner(mockContext)).not.toThrow();
    });
  });

  describe("runProgramWithLibPaths", () => {
    test('should create a spawn process', async () => {
      const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
      const mockProcess = {
        on: jest.fn(),
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        kill: jest.fn(),
        pid: 1234
      };
      mockSpawn.mockReturnValue(mockProcess as any);

      const promise = runProgramWithLibPaths(
        'test command',
        '/test/dir',
        '',
        false,
        false,
        'test.log',
        () => {},
        () => {},
        () => {},
        {}
      );

      expect(spawn).toHaveBeenCalled();
    });

    test('should handle shell option', () => {
      const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
      const mockProcess = {
        on: jest.fn(),
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        kill: jest.fn(),
        pid: 1234
      };
      mockSpawn.mockReturnValue(mockProcess as any);

      runProgramWithLibPaths(
        'test command',
        '/test/dir',
        'source env.sh && ',
        false,
        false,
        'test.log',
        () => {},
        () => {},
        () => {},
        {},
        false,
        false
      );

      expect(spawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          cwd: '/test/dir'
        })
      );
    });

    test('should handle file-based output', () => {
      const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
      const mockProcess = {
        on: jest.fn(),
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        kill: jest.fn(),
        pid: 1234
      };
      mockSpawn.mockReturnValue(mockProcess as any);

      const resultHandler = jest.fn();

      runProgramWithLibPaths(
        'test command',
        '/test/dir',
        '',
        true, // isUseFile = true
        false,
        'test.log',
        resultHandler,
        () => {},
        () => {},
        {}
      );

      // Should not set up stdout handler when using file
      expect(mockProcess.stdout.on).not.toHaveBeenCalledWith('data', expect.any(Function));
    });

    test('should handle spawn error', () => {
      const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
      mockSpawn.mockImplementation(() => {
        throw new Error('Spawn failed');
      });

      const rejectHandler = jest.fn();

      runProgramWithLibPaths(
        'test command',
        '/test/dir',
        '',
        false,
        false,
        'test.log',
        () => {},
        () => {},
        rejectHandler,
        {}
      );

      expect(rejectHandler).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('runner function', () => {
    test('should handle undefined run_args', async () => {
      await expect(runner(undefined, '/build', false, 'result.txt', {}, null, () => {})).resolves.toBeUndefined();
    });

    test('should handle undefined cancelSource', async () => {
      await expect(runner(['test'], '/build', false, 'result.txt', {}, undefined, () => {})).resolves.toBeUndefined();
    });

    test('should run with valid arguments', async () => {
      const mockCancelSource = {
        token: { onCancellationRequested: jest.fn() }
      };
      
      // Mock fs.promises.readFile for file-based result
      const fs = require('fs');
      (fs.promises.readFile as jest.Mock).mockResolvedValue('test result');
      
      const resultHandler = jest.fn();
      
      await runner(['test'], '/build', true, 'result.txt', {}, mockCancelSource, resultHandler, false);
      
      expect(resultHandler).toHaveBeenCalledWith('test result');
    });
  });

  describe("launchDebugSessionWithCloseHandler", () => {
    test('should be a function', () => {
      expect(typeof launchDebugSessionWithCloseHandler).toBe("function");
    });

    test('should return a promise', () => {
      const result = launchDebugSessionWithCloseHandler(
        'test',
        ['arg1'],
        '/cwd',
        {},
        () => {},
        () => {}
      );
      
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('error handling', () => {
    test('should handle missing command', () => {
      const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
      mockSpawn.mockImplementation(() => {
        const error = new Error('Command not found');
        (error as any).code = 'ENOENT';
        throw error;
      });

      const rejectHandler = jest.fn();

      runProgramWithLibPaths(
        '',
        '/test/dir',
        '',
        false,
        false,
        'test.log',
        () => {},
        () => {},
        rejectHandler,
        {}
      );

      expect(rejectHandler).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Command not found'
      }));
    });
  });
});