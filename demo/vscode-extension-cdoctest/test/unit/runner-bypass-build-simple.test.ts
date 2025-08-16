/**
 * Simplified unit tests for bypass build logic in runner
 * Focuses on testing the bypass build decision logic without complex spawn mocking
 */

// Mock vscode and dependencies
jest.mock('vscode', () => ({
  workspace: {
    getConfiguration: jest.fn()
  },
  Uri: {
    parse: jest.fn(),
    file: jest.fn()
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

describe('Runner Bypass Build Logic - Simplified Tests', () => {
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
  });

  describe('Build decision logic', () => {
    test('should build when Config type with buildBeforeTest=true', async () => {
      mockConfig.type = ConfigType.Config;
      mockConfig.buildBeforeTest = true;

      // Mock runner to only test build logic by making it return early after build
      const runnerSpy = jest.spyOn(require('../../src/runner'), 'runProgramWithLibPaths')
        .mockImplementation(() => Promise.resolve());

      await runner(
        ['test_executable', 'test_arg'],
        '/test/build',
        false,
        '/test/output.xml',
        mockConfig,
        mockCancelSource,
        () => {},
        false
      );

      expect(mockBuildMethod).toHaveBeenCalledTimes(1);
      runnerSpy.mockRestore();
    });

    test('should skip build when Config type with buildBeforeTest=false', async () => {
      mockConfig.type = ConfigType.Config;
      mockConfig.buildBeforeTest = false;

      const runnerSpy = jest.spyOn(require('../../src/runner'), 'runProgramWithLibPaths')
        .mockImplementation(() => Promise.resolve());

      await runner(
        ['test_executable', 'test_arg'],
        '/test/build',
        false,
        '/test/output.xml',
        mockConfig,
        mockCancelSource,
        () => {},
        false
      );

      expect(mockBuildMethod).not.toHaveBeenCalled();
      runnerSpy.mockRestore();
    });

    test('should build when ExeConfig type with exe_buildBeforeTest=true', async () => {
      mockConfig.type = ConfigType.ExeConfig;
      mockConfig.exe_buildBeforeTest = true;

      const runnerSpy = jest.spyOn(require('../../src/runner'), 'runProgramWithLibPaths')
        .mockImplementation(() => Promise.resolve());

      await runner(
        ['test_executable', 'test_arg'],
        '/test/build',
        false,
        '/test/output.xml',
        mockConfig,
        mockCancelSource,
        () => {},
        false
      );

      expect(mockBuildMethod).toHaveBeenCalledTimes(1);
      runnerSpy.mockRestore();
    });

    test('should skip build when ExeConfig type with exe_buildBeforeTest=false', async () => {
      mockConfig.type = ConfigType.ExeConfig;
      mockConfig.exe_buildBeforeTest = false;

      const runnerSpy = jest.spyOn(require('../../src/runner'), 'runProgramWithLibPaths')
        .mockImplementation(() => Promise.resolve());

      await runner(
        ['test_executable', 'test_arg'],
        '/test/build',
        false,
        '/test/output.xml',
        mockConfig,
        mockCancelSource,
        () => {},
        false
      );

      expect(mockBuildMethod).not.toHaveBeenCalled();
      runnerSpy.mockRestore();
    });

    test('should build when BinConfig type with bin_buildBeforeTest=true', async () => {
      mockConfig.type = ConfigType.BinConfig;
      mockConfig.bin_buildBeforeTest = true;

      const runnerSpy = jest.spyOn(require('../../src/runner'), 'runProgramWithLibPaths')
        .mockImplementation(() => Promise.resolve());

      await runner(
        ['test_executable', 'test_arg'],
        '/test/build',
        false,
        '/test/output.xml',
        mockConfig,
        mockCancelSource,
        () => {},
        false
      );

      expect(mockBuildMethod).toHaveBeenCalledTimes(1);
      runnerSpy.mockRestore();
    });

    test('should skip build when BinConfig type with bin_buildBeforeTest=false', async () => {
      mockConfig.type = ConfigType.BinConfig;
      mockConfig.bin_buildBeforeTest = false;

      const runnerSpy = jest.spyOn(require('../../src/runner'), 'runProgramWithLibPaths')
        .mockImplementation(() => Promise.resolve());

      await runner(
        ['test_executable', 'test_arg'],
        '/test/build',
        false,
        '/test/output.xml',
        mockConfig,
        mockCancelSource,
        () => {},
        false
      );

      expect(mockBuildMethod).not.toHaveBeenCalled();
      runnerSpy.mockRestore();
    });

    test('should not build when useCmakeTarget is false', async () => {
      mockConfig.useCmakeTarget = false;
      mockConfig.buildBeforeTest = true;

      const runnerSpy = jest.spyOn(require('../../src/runner'), 'runProgramWithLibPaths')
        .mockImplementation(() => Promise.resolve());

      await runner(
        ['test_executable', 'test_arg'],
        '/test/build',
        false,
        '/test/output.xml',
        mockConfig,
        mockCancelSource,
        () => {},
        false
      );

      expect(mockBuildMethod).not.toHaveBeenCalled();
      runnerSpy.mockRestore();
    });

    test('should handle build failure when building is enabled', async () => {
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
        mockCancelSource,
        () => {},
        false
      )).rejects.toMatch(/Build failed/);
      
      expect(mockBuildMethod).toHaveBeenCalledTimes(1);
    });
  });

  describe('Console logging verification', () => {
    let consoleSpy: jest.SpyInstance;
    
    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    test('should log build messages when building', async () => {
      mockConfig.type = ConfigType.Config;
      mockConfig.buildBeforeTest = true;

      const runnerSpy = jest.spyOn(require('../../src/runner'), 'runProgramWithLibPaths')
        .mockImplementation(() => Promise.resolve());

      await runner(
        ['test_executable', 'test_arg'],
        '/test/build',
        false,
        '/test/output.xml',
        mockConfig,
        mockCancelSource,
        () => {},
        false
      );

      expect(consoleSpy).toHaveBeenCalledWith('Building project before test execution...');
      expect(consoleSpy).toHaveBeenCalledWith('Build succeeded!');
      runnerSpy.mockRestore();
    });

    test('should log bypass message when skipping build', async () => {
      mockConfig.type = ConfigType.Config;
      mockConfig.buildBeforeTest = false;

      const runnerSpy = jest.spyOn(require('../../src/runner'), 'runProgramWithLibPaths')
        .mockImplementation(() => Promise.resolve());

      await runner(
        ['test_executable', 'test_arg'],
        '/test/build',
        false,
        '/test/output.xml',
        mockConfig,
        mockCancelSource,
        () => {},
        false
      );

      expect(consoleSpy).toHaveBeenCalledWith('Bypassing build - running tests with existing executables');
      runnerSpy.mockRestore();
    });
  });
});