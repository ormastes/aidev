import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock child_process
jest.mock('child_process', () => ({
  exec: jest.fn()
}));

// Mock fs
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn()
  },
  existsSync: jest.fn()
}));

// Mock vscode
jest.mock('vscode', () => ({
  window: {
    showErrorMessage: jest.fn(),
    showInformationMessage: jest.fn(),
    withProgress: jest.fn()
  },
  ProgressLocation: {
    Notification: "notification"
  },
  workspace: {
    getConfiguration: jest.fn(() => ({
      get: jest.fn((key: string) => {
        if (key === "pythonPath") return '/usr/bin/python3';
        return undefined;
      })
    }))
  }
}));

describe('PyAdapter - Simple Tests', () => {
  let checkCDocTestVersion: any;
  let getToolchainDir: any;
  let checkToolchainInstalled: any;
  let installCDocTest: any;
  let runInstallBundles: any;
  let addNewToolchain: any;
  let exec: any;
  let fs: any;
  let vscode: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Get mocked modules
    const childProcess = await import('child_process');
    exec = childProcess.exec;
    
    fs = await import('fs');
    vscode = await import('vscode');
    
    // Import functions after mocking
    const pyAdapterModule = await import('../../src/pyAdapter');
    checkCDocTestVersion = pyAdapterModule.checkCDocTestVersion;
    getToolchainDir = pyAdapterModule.getToolchainDir;
    checkToolchainInstalled = pyAdapterModule.checkToolchainInstalled;
    installCDocTest = pyAdapterModule.installCDocTest;
    runInstallBundles = pyAdapterModule.runInstallBundles;
    addNewToolchain = pyAdapterModule.addNewToolchain;
  });

  describe("checkCDocTestVersion", () => {
    test('should return true when cdoctest is available', async () => {
      const mockExec = exec as jest.MockedFunction<typeof exec>;
      mockExec.mockImplementation((cmd: any, callback: any) => {
        callback(null, 'cdoctest version 1.0.0', '');
        return {} as any;
      });

      const result = await checkCDocTestVersion();
      
      expect(result).toBe(true);
      expect(exec).toHaveBeenCalledWith(
        expect.stringContaining('cdoctest --version'),
        expect.any(Function)
      );
    });

    test('should return false when cdoctest is not found', async () => {
      const mockExec = exec as jest.MockedFunction<typeof exec>;
      mockExec.mockImplementation((cmd: any, callback: any) => {
        callback(new Error('command not found'), '', 'cdoctest: command not found');
        return {} as any;
      });

      const result = await checkCDocTestVersion();
      
      expect(result).toBe(false);
    });
  });

  describe("getToolchainDir", () => {
    test('should return default toolchain directory on error', async () => {
      const mockExec = exec as jest.MockedFunction<typeof exec>;
      mockExec.mockImplementation((cmd: any, callback: any) => {
        callback(new Error('Python error'), '', 'Error');
        return {} as any;
      });

      const result = await getToolchainDir();
      
      expect(result).toBe('/opt/aidev');
    });

    test('should return toolchain directory from Python', async () => {
      const mockExec = exec as jest.MockedFunction<typeof exec>;
      mockExec.mockImplementation((cmd: any, callback: any) => {
        callback(null, '/custom/toolchain/dir', '');
        return {} as any;
      });

      const result = await getToolchainDir();
      
      expect(result).toBe('/custom/toolchain/dir');
    });
  });

  describe("checkToolchainInstalled", () => {
    test('should return true when toolchain file exists', async () => {
      const mockExistsSync = fs.existsSync as jest.MockedFunction<typeof fs.existsSync>;
      mockExistsSync.mockReturnValue(true);

      const result = await checkToolchainInstalled();
      
      expect(result).toBe(true);
      expect(fs.existsSync).toHaveBeenCalledWith(
        expect.stringContaining("toolchain")
      );
    });

    test('should return false when toolchain file does not exist', async () => {
      const mockExistsSync = fs.existsSync as jest.MockedFunction<typeof fs.existsSync>;
      mockExistsSync.mockReturnValue(false);

      const result = await checkToolchainInstalled();
      
      expect(result).toBe(false);
    });
  });

  describe("installCDocTest", () => {
    test('should show progress notification during install', async () => {
      const mockProgress = {
        report: jest.fn()
      };
      
      (vscode.window.withProgress as jest.Mock).mockImplementation(async (options, callback) => {
        return callback(mockProgress);
      });
      
      const mockExec = exec as jest.MockedFunction<typeof exec>;
      mockExec.mockImplementation((cmd: any, callback: any) => {
        callback(null, 'Successfully installed', '');
        return {} as any;
      });

      await installCDocTest();

      expect(vscode.window.withProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          location: vscode.ProgressLocation.Notification,
          title: expect.stringContaining("cdoctest")
        }),
        expect.any(Function)
      );
      
      expect(mockProgress.report).toHaveBeenCalled();
    });

    test('should handle installation error', async () => {
      (vscode.window.withProgress as jest.Mock).mockImplementation(async (options, callback) => {
        return callback({ report: jest.fn() });
      });
      
      const mockExec = exec as jest.MockedFunction<typeof exec>;
      mockExec.mockImplementation((cmd: any, callback: any) => {
        callback(new Error('Install failed'), '', 'Error output');
        return {} as any;
      });

      await expect(installCDocTest()).rejects.toThrow('Install failed');
    });
  });

  describe("runInstallBundles", () => {
    test('should execute install bundles command', async () => {
      const mockExec = exec as jest.MockedFunction<typeof exec>;
      mockExec.mockImplementation((cmd: any, callback: any) => {
        callback(null, 'Bundles installed', '');
        return {} as any;
      });

      await runInstallBundles();

      expect(exec).toHaveBeenCalledWith(
        expect.stringContaining('install_bundles'),
        expect.any(Function)
      );
    });

    test('should handle bundle installation error', async () => {
      const mockExec = exec as jest.MockedFunction<typeof exec>;
      mockExec.mockImplementation((cmd: any, callback: any) => {
        callback(new Error('Bundle install failed'), '', 'Error');
        return {} as any;
      });

      await expect(runInstallBundles()).rejects.toThrow('Bundle install failed');
    });
  });

  describe("addNewToolchain", () => {
    test('should read and update cmake-kits.json', async () => {
      const mockReadFile = fs.promises.readFile as jest.MockedFunction<typeof fs.promises.readFile>;
      const mockWriteFile = fs.promises.writeFile as jest.MockedFunction<typeof fs.promises.writeFile>;
      
      mockReadFile.mockResolvedValue(JSON.stringify([
        { name: 'Existing Kit' }
      ]));
      mockWriteFile.mockResolvedValue(undefined);

      await addNewToolchain('/path/to/toolchain');

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('aidev-toolchain'),
        'utf8'
      );
    });

    test('should create new cmake-kits.json if not exists', async () => {
      const mockReadFile = fs.promises.readFile as jest.MockedFunction<typeof fs.promises.readFile>;
      const mockWriteFile = fs.promises.writeFile as jest.MockedFunction<typeof fs.promises.writeFile>;
      
      const error = new Error('File not found');
      (error as any).code = 'ENOENT';
      mockReadFile.mockRejectedValue(error);
      mockWriteFile.mockResolvedValue(undefined);

      await addNewToolchain('/path/to/toolchain');

      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      const content = JSON.parse(writeCall[1] as string);
      expect(content).toHaveLength(1);
      expect(content[0].name).toBe('aidev-toolchain');
    });

    test('should handle write error', async () => {
      const mockReadFile = fs.promises.readFile as jest.MockedFunction<typeof fs.promises.readFile>;
      const mockWriteFile = fs.promises.writeFile as jest.MockedFunction<typeof fs.promises.writeFile>;
      
      mockReadFile.mockResolvedValue('[]');
      mockWriteFile.mockRejectedValue(new Error('Write failed'));

      await expect(addNewToolchain('/path/to/toolchain')).rejects.toThrow('Write failed');
    });
  });

  describe('edge cases', () => {
    test('should handle empty command output', async () => {
      const mockExec = exec as jest.MockedFunction<typeof exec>;
      mockExec.mockImplementation((cmd: any, callback: any) => {
        callback(null, '', '');
        return {} as any;
      });

      const result = await checkCDocTestVersion();
      expect(result).toBe(true); // Empty output but no error means success
    });

    test('should handle whitespace in toolchain path', async () => {
      const mockExec = exec as jest.MockedFunction<typeof exec>;
      mockExec.mockImplementation((cmd: any, callback: any) => {
        callback(null, '  /path/with/spaces  \n', '');
        return {} as any;
      });

      const result = await getToolchainDir();
      expect(result).toBe('/path/with/spaces'); // Should be trimmed
    });
  });
});