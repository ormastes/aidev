/**
 * Unit tests for bypass build configuration functionality
 * Tests the new buildBeforeTest configuration options in Config, ExeConfig, and BinConfig classes
 */

// Mock vscode module first
const mockGetConfiguration = jest.fn();

jest.mock('vscode', () => ({
  workspace: {
    getConfiguration: mockGetConfiguration
  },
  Uri: {
    parse: jest.fn((str: string) => ({ fsPath: str }))
  }
}), { virtual: true });

// Mock cmake tools API
jest.mock('vscode-cmake-tools', () => ({
  getCMakeToolsApi: jest.fn(() => Promise.resolve(undefined))  
}), { virtual: true });

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

describe('Bypass Build Configuration Tests', () => {
  let mockActiveWorkspace: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockActiveWorkspace = jest.fn();
    
    // Default configuration mock
    mockGetConfiguration.mockReturnValue({
      get: jest.fn((key: string) => {
        const config: Record<string, any> = {
          "pythonExePath": 'python3',
          "buildDirectory": '/test/build',
          "srcDirectory": '/test/src',
          "useCmakeTarget": false,
          "configName": 'test-config',
          "executable": '/test/build/test_exe',
          'exe_executable': '/test/build/test_exe',
          'bin_executable': '/test/build/test_bin',
          "listTestArgPattern": 'python3 -m cdoctest --list',
          "testRunArgPattern": 'python3 -m cdoctest --run',
          'exe_listTestArgPattern': 'GetTcList:',
          'exe_testRunArgPattern': 'TC/${test_suite_name}::${test_case_name}',
          'bin_listTestArgPattern': 'GetTcList:',
          'bin_testRunArgPattern': 'TC/${test_suite_name}::${test_case_name}',
          "resultFile": '/test/build/output.xml',
          'exe_resultFile': '/test/build/output.vsc',
          'bin_resultFile': '/test/build/output.vsc',
          "testRunUseFile": true,
          "listTestUseFile": false,
          'exe_testRunUseFile': true,
          'exe_listTestUseFile': false,
          'bin_testRunUseFile': true,
          'bin_listTestUseFile': false,
          "libPaths": '',
          "testcaseSeparator": '::',
          'exe_testcaseSeparator': '::',
          'bin_testcaseSeparator': '::',
          "resultSuccessRgex": 'failedtests="0"',
          "parallelJobs": 1,
          // Build before test settings with defaults
          "buildBeforeTest": true,
          'exe_buildBeforeTest': true,
          'bin_buildBeforeTest': true
        };
        return config[key];
      })
    });
  });

  describe('Config class - buildBeforeTest property', () => {
    test('should initialize buildBeforeTest to true by default', () => {
      const config = new Config(mockContext as any, mockWorkspaceFolder as any, mockActiveWorkspace, false);
      
      expect(config.buildBeforeTest).toBe(true);
      expect(config.type).toBe(ConfigType.Config);
    });

    test('should respect buildBeforeTest when set to false', () => {
      // Override the mock to return false for buildBeforeTest
      mockGetConfiguration.mockReturnValue({
        get: jest.fn((key: string) => {
          if (key === "buildBeforeTest") return false;
          if (key === "pythonExePath") return 'python3';
          if (key === "buildDirectory") return '/test/build';
          if (key === "srcDirectory") return '/test/src';
          if (key === "useCmakeTarget") return false;
          // Return reasonable defaults for other keys
          return undefined;
        })
      });

      const config = new Config(mockContext as any, mockWorkspaceFolder as any, mockActiveWorkspace, false);
      
      expect(config.buildBeforeTest).toBe(false);
    });

    test('should use nullish coalescing to default to true when undefined', () => {
      // Mock returns undefined for buildBeforeTest
      mockGetConfiguration.mockReturnValue({
        get: jest.fn((key: string) => {
          if (key === "buildBeforeTest") return undefined;
          if (key === "pythonExePath") return 'python3';
          if (key === "buildDirectory") return '/test/build';
          if (key === "srcDirectory") return '/test/src';
          if (key === "useCmakeTarget") return false;
          return undefined;
        })
      });

      const config = new Config(mockContext as any, mockWorkspaceFolder as any, mockActiveWorkspace, false);
      
      expect(config.buildBeforeTest).toBe(true);
    });
  });

  describe('ExeConfig class - exe_buildBeforeTest property', () => {
    test('should initialize exe_buildBeforeTest to true by default', () => {
      const config = new ExeConfig(mockContext as any, mockWorkspaceFolder as any, mockActiveWorkspace);
      
      expect(config.exe_buildBeforeTest).toBe(true);
      expect(config.type).toBe(ConfigType.ExeConfig);
    });

    test('should respect exe_buildBeforeTest when set to false', () => {
      mockGetConfiguration.mockReturnValue({
        get: jest.fn((key: string) => {
          if (key === 'exe_buildBeforeTest') return false;
          if (key === "pythonExePath") return 'python3';
          if (key === "buildDirectory") return '/test/build';
          if (key === "srcDirectory") return '/test/src';
          if (key === "useCmakeTarget") return false;
          if (key === 'exe_executable') return '/test/build/test_exe';
          return undefined;
        })
      });

      const config = new ExeConfig(mockContext as any, mockWorkspaceFolder as any, mockActiveWorkspace);
      
      expect(config.exe_buildBeforeTest).toBe(false);
    });

    test('should also initialize base buildBeforeTest property', () => {
      const config = new ExeConfig(mockContext as any, mockWorkspaceFolder as any, mockActiveWorkspace);
      
      expect(config.buildBeforeTest).toBe(true);
      expect(config.exe_buildBeforeTest).toBe(true);
    });
  });

  describe('BinConfig class - bin_buildBeforeTest property', () => {
    test('should initialize bin_buildBeforeTest to true by default', () => {
      const config = new BinConfig(mockContext as any, mockWorkspaceFolder as any, mockActiveWorkspace);
      
      expect(config.bin_buildBeforeTest).toBe(true);
      expect(config.type).toBe(ConfigType.BinConfig);
    });

    test('should respect bin_buildBeforeTest when set to false', () => {
      mockGetConfiguration.mockReturnValue({
        get: jest.fn((key: string) => {
          if (key === 'bin_buildBeforeTest') return false;
          if (key === "pythonExePath") return 'python3';
          if (key === "buildDirectory") return '/test/build';
          if (key === "srcDirectory") return '/test/src';
          if (key === "useCmakeTarget") return false;
          if (key === 'bin_executable') return '/test/build/test_bin';
          return undefined;
        })
      });

      const config = new BinConfig(mockContext as any, mockWorkspaceFolder as any, mockActiveWorkspace);
      
      expect(config.bin_buildBeforeTest).toBe(false);
    });
  });

  describe('Configuration type differentiation', () => {
    test('should correctly identify Config type', () => {
      const config = new Config(mockContext as any, mockWorkspaceFolder as any, mockActiveWorkspace, false);
      
      expect(config.type).toBe(ConfigType.Config);
    });

    test('should correctly identify ExeConfig type', () => {
      const config = new ExeConfig(mockContext as any, mockWorkspaceFolder as any, mockActiveWorkspace);
      
      expect(config.type).toBe(ConfigType.ExeConfig);
    });

    test('should correctly identify BinConfig type', () => {
      const config = new BinConfig(mockContext as any, mockWorkspaceFolder as any, mockActiveWorkspace);
      
      expect(config.type).toBe(ConfigType.BinConfig);
    });
  });

  describe('All buildBeforeTest configurations together', () => {
    test('should handle mixed buildBeforeTest settings', () => {
      mockGetConfiguration.mockReturnValue({
        get: jest.fn((key: string) => {
          const mixedConfig: Record<string, any> = {
            "pythonExePath": 'python3',
            "buildDirectory": '/test/build',
            "srcDirectory": '/test/src',
            "useCmakeTarget": false,
            'exe_executable': '/test/build/test_exe',
            'bin_executable': '/test/build/test_bin',
            "buildBeforeTest": true,      // cdoctest builds
            'exe_buildBeforeTest': false, // exe doesn't build
            'bin_buildBeforeTest': true,  // bin builds
          };
          return mixedConfig[key];
        })
      });

      const config = new Config(mockContext as any, mockWorkspaceFolder as any, mockActiveWorkspace, false);
      const exeConfig = new ExeConfig(mockContext as any, mockWorkspaceFolder as any, mockActiveWorkspace);
      const binConfig = new BinConfig(mockContext as any, mockWorkspaceFolder as any, mockActiveWorkspace);

      expect(config.buildBeforeTest).toBe(true);
      expect(exeConfig.exe_buildBeforeTest).toBe(false);
      expect(binConfig.bin_buildBeforeTest).toBe(true);
    });

    test('should use configuration correctly for inheritance check', () => {
      // Test that ExeConfig and BinConfig also have access to base buildBeforeTest
      const exeConfig = new ExeConfig(mockContext as any, mockWorkspaceFolder as any, mockActiveWorkspace);
      const binConfig = new BinConfig(mockContext as any, mockWorkspaceFolder as any, mockActiveWorkspace);

      // These should inherit the base buildBeforeTest property
      expect(exeConfig.buildBeforeTest).toBe(true);
      expect(binConfig.buildBeforeTest).toBe(true);
      
      // Plus their specific properties
      expect(exeConfig.exe_buildBeforeTest).toBe(true);
      expect(binConfig.bin_buildBeforeTest).toBe(true);
    });
  });

  describe('Error handling and validation', () => {
    test('should handle missing pythonExePath gracefully', () => {
      mockGetConfiguration.mockReturnValue({
        get: jest.fn((key: string) => {
          if (key === "pythonExePath") return '';
          if (key === "buildBeforeTest") return false;
          return undefined;
        })
      });

      // This should throw an error due to empty pythonExePath
      expect(() => {
        new Config(mockContext as any, mockWorkspaceFolder as any, mockActiveWorkspace, false);
      }).toThrow('cdoctest: pythonExePath must be set');
    });

    test('should handle configuration retrieval errors', () => {
      mockGetConfiguration.mockImplementation(() => {
        throw new Error('Configuration not available');
      });

      expect(() => {
        new Config(mockContext as any, mockWorkspaceFolder as any, mockActiveWorkspace, false);
      }).toThrow();
    });
  });

  describe('Integration with workspace configuration', () => {
    test('should call vscode.workspace.getConfiguration correctly', () => {
      new Config(mockContext as any, mockWorkspaceFolder as any, mockActiveWorkspace, false);
      
      expect(mockGetConfiguration).toHaveBeenCalledWith("cdoctest");
    });

    test('should retrieve all buildBeforeTest configurations', () => {
      const mockGet = jest.fn((key: string) => {
        if (key.includes("buildBeforeTest")) return true;
        if (key === "pythonExePath") return 'python3';
        return undefined;
      });
      
      mockGetConfiguration.mockReturnValue({ get: mockGet });

      new Config(mockContext as any, mockWorkspaceFolder as any, mockActiveWorkspace, false);

      expect(mockGet).toHaveBeenCalledWith("buildBeforeTest");
      expect(mockGet).toHaveBeenCalledWith('exe_buildBeforeTest');
      expect(mockGet).toHaveBeenCalledWith('bin_buildBeforeTest');
    });
  });
});