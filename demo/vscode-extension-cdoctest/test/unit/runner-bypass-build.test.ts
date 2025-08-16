/**
 * Unit tests for bypass build logic in runner
 * Tests the conditional build logic based on buildBeforeTest configurations
 */

// Mock child_process and other dependencies first
const mockSpawn = jest.fn();
const mockExec = jest.fn();

jest.mock('child_process', () => ({
  spawn: mockSpawn,
  exec: mockExec
}));

jest.mock('vscode', () => ({
  workspace: {
    getConfiguration: jest.fn()
  },
  Uri: {
    parse: jest.fn()
  }
}), { virtual: true });

jest.mock('vscode-cmake-tools', () => ({
  getCMakeToolsApi: jest.fn(() => Promise.resolve(undefined))
}), { virtual: true });

jest.mock('../../src/util', () => ({
  fileExists: jest.fn(() => Promise.resolve(true))
}));

import { runner } from '../../src/runner';
import { Config, ConfigType, ExeConfig, BinConfig } from '../../src/config';

describe('Runner Bypass Build Logic Tests', () => {
  let mockConfig: any;
  let mockCMakeProject: any;
  let mockBuildMethod: jest.Mock;
  let mockCancelSource: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockBuildMethod = jest.fn(() => Promise.resolve());
    
    mockCMakeProject = {
      build: mockBuildMethod
    };

    mockCancelSource = {
      token: {
        isCancellationRequested: false,
        onCancellationRequested: jest.fn()
      }
    };

    // Base mock config
    mockConfig = {
      useCmakeTarget: true,
      cmakeProject: mockCMakeProject,
      libPaths: '',
      configName: 'test-config',
      controllerId: 'test-controller',
      type: ConfigType.Config,
      buildBeforeTest: true,
      exe_buildBeforeTest: true,
      bin_buildBeforeTest: true
    };

    // Mock spawn to simulate successful process that resolves immediately
    mockSpawn.mockReturnValue({
      stdout: {
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            // Immediately call callback to avoid delays
            process.nextTick(() => callback('Test output'));
          }
        }),
        pipe: jest.fn()
      },
      stderr: {
        on: jest.fn(),
        pipe: jest.fn()
      },
      on: jest.fn((event, callback) => {
        if (event === 'close') {
          // Resolve immediately on next tick
          process.nextTick(() => callback(0));
        }
      }),
      kill: jest.fn()
    });
  });

  describe('Config type with buildBeforeTest enabled', () => {
    test('should trigger build when buildBeforeTest is true', async () => {
      mockConfig.type = ConfigType.Config;
      mockConfig.buildBeforeTest = true;

      await runner(
        ['test_executable', 'test_arg'],
        '/test/build',
        false,
        '/test/output.xml',
        mockConfig,
        mockCancelSource, // cancelSource
        () => {}, // resultHandler
        false // isDebug
      );

      expect(mockBuildMethod).toHaveBeenCalledTimes(1);
    });

    test('should skip build when buildBeforeTest is false', async () => {
      mockConfig.type = ConfigType.Config;
      mockConfig.buildBeforeTest = false;

      await runner(
        ['test_executable', 'test_arg'],
        '/test/build',
        false,
        '/test/output.xml',
        mockConfig,
        mockCancelSource, // cancelSource
        () => {}, // resultHandler
        false // isDebug
      );

      expect(mockBuildMethod).not.toHaveBeenCalled();
    });
  });

  describe('ExeConfig type with exe_buildBeforeTest', () => {
    test('should trigger build when exe_buildBeforeTest is true', async () => {
      mockConfig.type = ConfigType.ExeConfig;
      mockConfig.exe_buildBeforeTest = true;

      await runner(
        ['test_executable', 'test_arg'],
        '/test/build',
        false,
        '/test/output.xml',
        mockConfig,
        mockCancelSource, // cancelSource
        () => {}, // resultHandler
        false // isDebug
      );

      expect(mockBuildMethod).toHaveBeenCalledTimes(1);
    });

    test('should skip build when exe_buildBeforeTest is false', async () => {
      mockConfig.type = ConfigType.ExeConfig;
      mockConfig.exe_buildBeforeTest = false;

      await runner(
        ['test_executable', 'test_arg'],
        '/test/build',
        false,
        '/test/output.xml',
        mockConfig,
        mockCancelSource, // cancelSource
        () => {}, // resultHandler
        false // isDebug
      );

      expect(mockBuildMethod).not.toHaveBeenCalled();
    });
  });

  describe('BinConfig type with bin_buildBeforeTest', () => {
    test('should trigger build when bin_buildBeforeTest is true', async () => {
      mockConfig.type = ConfigType.BinConfig;
      mockConfig.bin_buildBeforeTest = true;

      await runner(
        ['test_executable', 'test_arg'],
        '/test/build',
        false,
        '/test/output.xml',
        mockConfig,
        mockCancelSource, // cancelSource
        () => {}, // resultHandler
        false // isDebug
      );

      expect(mockBuildMethod).toHaveBeenCalledTimes(1);
    });

    test('should skip build when bin_buildBeforeTest is false', async () => {
      mockConfig.type = ConfigType.BinConfig;
      mockConfig.bin_buildBeforeTest = false;

      await runner(
        ['test_executable', 'test_arg'],
        '/test/build',
        false,
        '/test/output.xml',
        mockConfig,
        mockCancelSource, // cancelSource
        () => {}, // resultHandler
        false // isDebug
      );

      expect(mockBuildMethod).not.toHaveBeenCalled();
    });
  });

  describe('Build failure handling', () => {
    test('should reject promise when build fails and building is enabled', async () => {
      mockConfig.type = ConfigType.Config;
      mockConfig.buildBeforeTest = true;
      
      const buildError = new Error('Build failed');
      mockBuildMethod.mockRejectedValue(buildError);

      await expect(runner(
        ['test_executable', 'test_arg'],
        '/test/build',
        false,
        '/test/output.xml',
        mockConfig,
        mockCancelSource, // cancelSource
        () => {}, // resultHandler
        false // isDebug
      )).rejects.toMatch(/Build failed/);
      
      expect(mockBuildMethod).toHaveBeenCalledTimes(1);
    });

    test('should not fail when build would fail but building is bypassed', async () => {
      mockConfig.type = ConfigType.Config;
      mockConfig.buildBeforeTest = false;
      
      // Even though build would fail, it shouldn't be called
      mockBuildMethod.mockRejectedValue(new Error('Build failed'));

      await runner(
        ['test_executable', 'test_arg'],
        '/test/build',
        false,
        '/test/output.xml',
        mockConfig,
        mockCancelSource, // cancelSource
        () => {}, // resultHandler
        false // isDebug
      );
      
      expect(mockBuildMethod).not.toHaveBeenCalled();
    });
  });

  describe('Non-CMake target configurations', () => {
    test('should not attempt to build when useCmakeTarget is false', async () => {
      mockConfig.useCmakeTarget = false;
      mockConfig.buildBeforeTest = true;

      await runner(
        ['test_executable', 'test_arg'],
        '/test/build',
        false,
        '/test/output.xml',
        mockConfig,
        mockCancelSource, // cancelSource
        () => {}, // resultHandler
        false // isDebug
      );

      expect(mockBuildMethod).not.toHaveBeenCalled();
    });
  });

  describe('CMake project validation', () => {
    test('should reject when CMake project is not initialized and useCmakeTarget is true', async () => {
      mockConfig.useCmakeTarget = true;
      mockConfig.cmakeProject = undefined;

      await expect(runner(
        ['test_executable', 'test_arg'],
        '/test/build',
        false,
        '/test/output.xml',
        mockConfig,
        mockCancelSource, // cancelSource
        () => {}, // resultHandler
        false // isDebug
      )).rejects.toMatch(/CMake project is not initialized/);
      
      expect(mockBuildMethod).not.toHaveBeenCalled();
    });
  });

  describe('Mixed configuration scenarios', () => {
    test('should handle different configs with different bypass settings', async () => {
      const configs = [
        { type: ConfigType.Config, buildBeforeTest: true, exe_buildBeforeTest: false, bin_buildBeforeTest: true },
        { type: ConfigType.ExeConfig, buildBeforeTest: false, exe_buildBeforeTest: false, bin_buildBeforeTest: true },
        { type: ConfigType.BinConfig, buildBeforeTest: true, exe_buildBeforeTest: true, bin_buildBeforeTest: false }
      ];

      const expectedBuildCalls = [1, 0, 0]; // Only first config should build

      for (let i = 0; i < configs.length; i++) {
        const config = { ...mockConfig, ...configs[i] };
        
        jest.clearAllMocks();
        
        await runner(
          ['test_executable', 'test_arg'],
          '/test/build',
          false,
          '/test/output.xml',
          config,
          mockCancelSource, // cancelSource
          () => {}, // resultHandler
          false // isDebug
        );
        
        expect(mockBuildMethod).toHaveBeenCalledTimes(expectedBuildCalls[i]);
      }
    });
  });

  describe('Console output verification', () => {
    let consoleSpy: jest.SpyInstance;
    
    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    test('should log build messages when building is enabled', async () => {
      mockConfig.type = ConfigType.Config;
      mockConfig.buildBeforeTest = true;

      await runner(
        ['test_executable', 'test_arg'],
        '/test/build',
        false,
        '/test/output.xml',
        mockConfig,
        mockCancelSource, // cancelSource
        () => {}, // resultHandler
        false // isDebug
      );

      expect(consoleSpy).toHaveBeenCalledWith('Building project before test execution...');
      expect(consoleSpy).toHaveBeenCalledWith('Build succeeded!');
    });

    test('should log bypass message when building is disabled', async () => {
      mockConfig.type = ConfigType.Config;
      mockConfig.buildBeforeTest = false;

      await runner(
        ['test_executable', 'test_arg'],
        '/test/build',
        false,
        '/test/output.xml',
        mockConfig,
        mockCancelSource, // cancelSource
        () => {}, // resultHandler
        false // isDebug
      );

      expect(consoleSpy).toHaveBeenCalledWith('Bypassing build - running tests with existing executables');
    });
  });
});