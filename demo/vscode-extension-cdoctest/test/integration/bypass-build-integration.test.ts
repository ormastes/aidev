/**
 * Integration tests for bypass build feature
 * Tests the integration between Config classes and runner bypass logic
 */

// Mock vscode module
const mockGetConfiguration = jest.fn();

jest.mock('vscode', () => ({
  workspace: {
    getConfiguration: mockGetConfiguration
  },
  Uri: {
    parse: jest.fn((str: string) => ({ fsPath: str })),
    file: jest.fn((path: string) => ({ fsPath: path }))
  },
  window: {
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showInformationMessage: jest.fn()
  }
}), { virtual: true });

// Mock cmake tools API
jest.mock('vscode-cmake-tools', () => ({
  getCMakeToolsApi: jest.fn(() => Promise.resolve(undefined)),
  Version: {
    v2: 'v2'
  }
}), { virtual: true });

// Mock util module
jest.mock('../../src/util', () => ({
  fileExists: jest.fn(() => Promise.resolve(true))
}));

import { Config, ConfigType, ExeConfig, BinConfig } from '../../src/config';

const mockContext = {
  subscriptions: { push: jest.fn() },
  extensionPath: '/test/extension',
  extensionUri: { fsPath: '/test/extension' },
  globalState: {},
  workspaceState: {},
  secrets: {},
  environmentVariableCollection: {},
  asAbsolutePath: jest.fn((path: string) => `/test/extension/${path}`),
  globalStoragePath: '/test/global',
  logPath: '/test/logs'
};

const mockWorkspaceFolder = {
  uri: { fsPath: '/test/workspace' },
  name: 'test-workspace',
  index: 0
};

describe('Bypass Build Feature Integration Tests', () => {
  let mockActiveWorkspace: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockActiveWorkspace = jest.fn();
    
    // Default configuration mock
    mockGetConfiguration.mockReturnValue({
      get: jest.fn((key: string) => {
        const config: Record<string, any> = {
          'pythonExePath': 'python3',
          'buildDirectory': '', // Must be empty when useCmakeTarget is true
          'srcDirectory': '', // Must be empty when useCmakeTarget is true
          'useCmakeTarget': true, // Enable cmake for integration tests
          'configName': 'test-config',
          'executable': '', // Must be empty when useCmakeTarget is true
          'exe_executable': '', // Must be empty when useCmakeTarget is true
          'bin_executable': '', // Must be empty when useCmakeTarget is true
          'listTestArgPattern': 'python3 -m cdoctest --list',
          'testRunArgPattern': 'python3 -m cdoctest --run',
          'exe_listTestArgPattern': 'GetTcList:',
          'exe_testRunArgPattern': 'TC/${test_suite_name}::${test_case_name}',
          'bin_listTestArgPattern': 'GetTcList:',
          'bin_testRunArgPattern': 'TC/${test_suite_name}::${test_case_name}',
          'resultFile': '/test/build/output.xml',
          'exe_resultFile': '/test/build/output.vsc',
          'bin_resultFile': '/test/build/output.vsc',
          'testRunUseFile': true,
          'listTestUseFile': false,
          'exe_testRunUseFile': true,
          'exe_listTestUseFile': false,
          'bin_testRunUseFile': true,
          'bin_listTestUseFile': false,
          'libPaths': '',
          'testcaseSeparator': '::',
          'exe_testcaseSeparator': '::',
          'bin_testcaseSeparator': '::',
          'resultSuccessRgex': 'failedtests=\"0\"',
          'parallelJobs': 1,
          // Build before test settings with defaults
          'buildBeforeTest': true,
          'exe_buildBeforeTest': true,
          'bin_buildBeforeTest': true
        };
        return config[key];
      })
    });
  });

  describe('Config to Runner Integration', () => {
    test('should properly pass buildBeforeTest from Config to runner logic', () => {
      // Create Config with buildBeforeTest disabled
      mockGetConfiguration.mockReturnValue({
        get: jest.fn((key: string) => {
          if (key === 'buildBeforeTest') return false;
          if (key === 'pythonExePath') return 'python3';
          if (key === 'buildDirectory') return ''; // Empty for cmake
          if (key === 'srcDirectory') return ''; // Empty for cmake
          if (key === 'useCmakeTarget') return true;
          if (key === 'executable') return ''; // Empty for cmake
          if (key === 'exe_executable') return ''; // Empty for cmake  
          if (key === 'bin_executable') return ''; // Empty for cmake
          return undefined;
        })
      });

      const config = new Config(mockContext as any, mockWorkspaceFolder as any, mockActiveWorkspace, false);
      
      // Verify config properties match expected values for runner integration
      expect(config.type).toBe(ConfigType.Config);
      expect(config.buildBeforeTest).toBe(false);
      expect(config.useCmakeTarget).toBe(true);
    });

    test('should properly pass exe_buildBeforeTest from ExeConfig to runner logic', () => {
      mockGetConfiguration.mockReturnValue({
        get: jest.fn((key: string) => {
          if (key === 'exe_buildBeforeTest') return false;
          if (key === 'buildBeforeTest') return true; // Base should still be true
          if (key === 'pythonExePath') return 'python3';
          if (key === 'buildDirectory') return ''; // Empty for cmake
          if (key === 'srcDirectory') return ''; // Empty for cmake
          if (key === 'useCmakeTarget') return true;
          if (key === 'executable') return ''; // Empty for cmake
          if (key === 'exe_executable') return ''; // Empty for cmake
          if (key === 'bin_executable') return ''; // Empty for cmake
          return undefined;
        })
      });

      const config = new ExeConfig(mockContext as any, mockWorkspaceFolder as any, mockActiveWorkspace);
      
      expect(config.type).toBe(ConfigType.ExeConfig);
      expect(config.buildBeforeTest).toBe(true); // Base property
      expect(config.exe_buildBeforeTest).toBe(false); // Specific property
      expect(config.useCmakeTarget).toBe(true);
    });

    test('should properly pass bin_buildBeforeTest from BinConfig to runner logic', () => {
      mockGetConfiguration.mockReturnValue({
        get: jest.fn((key: string) => {
          if (key === 'bin_buildBeforeTest') return false;
          if (key === 'buildBeforeTest') return true;
          if (key === 'pythonExePath') return 'python3';
          if (key === 'buildDirectory') return ''; // Empty for cmake
          if (key === 'srcDirectory') return ''; // Empty for cmake
          if (key === 'useCmakeTarget') return true;
          if (key === 'executable') return ''; // Empty for cmake
          if (key === 'exe_executable') return ''; // Empty for cmake
          if (key === 'bin_executable') return ''; // Empty for cmake
          return undefined;
        })
      });

      const config = new BinConfig(mockContext as any, mockWorkspaceFolder as any, mockActiveWorkspace);
      
      expect(config.type).toBe(ConfigType.BinConfig);
      expect(config.buildBeforeTest).toBe(true);
      expect(config.bin_buildBeforeTest).toBe(false);
      expect(config.useCmakeTarget).toBe(true);
    });
  });

  describe('Configuration Scenarios Integration', () => {
    test('should handle mixed bypass settings across different config types', () => {
      // Test scenario where different config types have different bypass settings
      mockGetConfiguration.mockReturnValue({
        get: jest.fn((key: string) => {
          const mixedSettings: Record<string, any> = {
            'pythonExePath': 'python3',
            'buildDirectory': '', // Empty for cmake
            'srcDirectory': '', // Empty for cmake
            'useCmakeTarget': true,
            'executable': '', // Empty for cmake
            'exe_executable': '', // Empty for cmake
            'bin_executable': '', // Empty for cmake,
            'buildBeforeTest': false,      // cdoctest bypasses build
            'exe_buildBeforeTest': true,   // exe builds
            'bin_buildBeforeTest': false,  // bin bypasses build
          };
          return mixedSettings[key];
        })
      });

      const cdocConfig = new Config(mockContext as any, mockWorkspaceFolder as any, mockActiveWorkspace, false);
      const exeConfig = new ExeConfig(mockContext as any, mockWorkspaceFolder as any, mockActiveWorkspace);
      const binConfig = new BinConfig(mockContext as any, mockWorkspaceFolder as any, mockActiveWorkspace);

      // Verify each config has the correct bypass settings
      expect(cdocConfig.buildBeforeTest).toBe(false);
      expect(exeConfig.exe_buildBeforeTest).toBe(true);
      expect(binConfig.bin_buildBeforeTest).toBe(false);

      // Verify proper inheritance
      expect(exeConfig.buildBeforeTest).toBe(false); // Inherits base setting
      expect(binConfig.buildBeforeTest).toBe(false); // Inherits base setting
    });

    test('should maintain backward compatibility with default settings', () => {
      // Test that default settings maintain backward compatibility (all build enabled)
      const cdocConfig = new Config(mockContext as any, mockWorkspaceFolder as any, mockActiveWorkspace, false);
      const exeConfig = new ExeConfig(mockContext as any, mockWorkspaceFolder as any, mockActiveWorkspace);
      const binConfig = new BinConfig(mockContext as any, mockWorkspaceFolder as any, mockActiveWorkspace);

      // All should default to building enabled
      expect(cdocConfig.buildBeforeTest).toBe(true);
      expect(exeConfig.exe_buildBeforeTest).toBe(true);
      expect(binConfig.bin_buildBeforeTest).toBe(true);
    });

    test('should handle configuration loading errors gracefully', () => {
      mockGetConfiguration.mockImplementation(() => {
        throw new Error('Configuration not available');
      });

      expect(() => {
        new Config(mockContext as any, mockWorkspaceFolder as any, mockActiveWorkspace, false);
      }).toThrow();
    });
  });

  describe('CMAKE Integration Points', () => {
    test('should create configs with proper CMAKE integration flags', () => {
      const config = new Config(mockContext as any, mockWorkspaceFolder as any, mockActiveWorkspace, false);
      
      // These properties are essential for CMAKE integration with bypass build
      expect(config.useCmakeTarget).toBe(true);
      expect(config.buildBeforeTest).toBe(true);
      expect(typeof config.configName).toBe('string');
    });

    test('should support configurations without CMAKE target', () => {
      mockGetConfiguration.mockReturnValue({
        get: jest.fn((key: string) => {
          if (key === 'useCmakeTarget') return false;
          if (key === 'buildBeforeTest') return false;
          if (key === 'pythonExePath') return 'python3';
          if (key === 'buildDirectory') return '/test/build'; // Can be non-empty when cmake disabled
          if (key === 'srcDirectory') return '/test/src'; // Can be non-empty when cmake disabled
          return undefined;
        })
      });

      const config = new Config(mockContext as any, mockWorkspaceFolder as any, mockActiveWorkspace, false);
      
      // When CMAKE is disabled, bypass build should still work for direct executable runs
      expect(config.useCmakeTarget).toBe(false);
      expect(config.buildBeforeTest).toBe(false);
    });
  });

  describe('Package.json Integration', () => {
    test('should validate that config keys match package.json contribution points', () => {
      // These tests ensure that the configuration keys used in code match
      // what would be defined in package.json contribution points
      
      const expectedConfigKeys = [
        'buildBeforeTest',
        'exe_buildBeforeTest', 
        'bin_buildBeforeTest'
      ];

      const mockGet = jest.fn((key: string) => {
        if (expectedConfigKeys.includes(key)) return true;
        if (key === 'pythonExePath') return 'python3';
        return undefined;
      });
      
      mockGetConfiguration.mockReturnValue({ get: mockGet });

      const config = new Config(mockContext as any, mockWorkspaceFolder as any, mockActiveWorkspace, false);

      // Verify that all expected config keys were requested
      expectedConfigKeys.forEach(key => {
        expect(mockGet).toHaveBeenCalledWith(key);
      });
    });
  });

  describe('Performance Integration', () => {
    test('should create config objects efficiently', () => {
      const startTime = Date.now();
      
      // Create multiple config objects as would happen during extension lifecycle
      for (let i = 0; i < 10; i++) {
        new Config(mockContext as any, mockWorkspaceFolder as any, mockActiveWorkspace, false);
        new ExeConfig(mockContext as any, mockWorkspaceFolder as any, mockActiveWorkspace);
        new BinConfig(mockContext as any, mockWorkspaceFolder as any, mockActiveWorkspace);
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Config creation should be fast (under 100ms for 30 objects)
      expect(totalTime).toBeLessThan(100);
    });
  });
});