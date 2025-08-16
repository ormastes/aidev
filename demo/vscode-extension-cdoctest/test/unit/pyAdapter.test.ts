import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as vscode from 'vscode';
import { 
  checkCDocTestVersion, 
  installCDocTest, 
  checkToolchainInstalled,
  getToolchainDir,
  runInstallBundles,
  addNewToolchain 
} from '../../src/pyAdapter';
import { Config } from '../../src/config';
import { exec } from 'child_process';
import { fs } from '../../../../layer/themes/infra_external-log-lib/dist';
import { path } from '../../../../layer/themes/infra_external-log-lib/dist';

// Mock dependencies
jest.mock('child_process');
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn()
  }
}));

// Helper function to setup exec mock
function setupExecMock(stdout: string, stderr: string = '', error: Error | null = null) {
  const mockExec = exec as unknown as jest.Mock;
  mockExec.mockImplementation((command: string, callback: Function) => {
    callback(error, stdout, stderr);
    return {} as any;
  });
}

describe('PyAdapter', () => {
  let mockConfig: Config;
  let mockReadFile: jest.Mock;
  let mockWriteFile: jest.Mock;
  let mockShowErrorMessage: jest.Mock;
  let mockShowInformationMessage: jest.Mock;
  let mockShowWarningMessage: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfig = {
      pythonExePath: '/usr/bin/python3',
      cdoctest_min_version: '1.1.0'
    } as Config;

    mockReadFile = fs.promises.readFile as unknown as jest.Mock;
    mockWriteFile = fs.promises.writeFile as unknown as jest.Mock;

    // Mock vscode window methods
    mockShowErrorMessage = vscode.window.showErrorMessage as jest.Mock;
    mockShowInformationMessage = vscode.window.showInformationMessage as jest.Mock;
    mockShowWarningMessage = vscode.window.showWarningMessage as jest.Mock;

    // Mock workspace
    (vscode.workspace as any).workspaceFolders = [{
      uri: vscode.Uri.file('/test/workspace'),
      name: 'test-workspace',
      index: 0
    }];
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('checkCDocTestVersion', () => {
    test('should return true when version meets requirement', async () => {
      setupExecMock('Name: cdoctest\nVersion: 1.2.0\nSummary: C++ doc test');

      const result = await checkCDocTestVersion(mockConfig);

      expect(result).toBe(true);
      expect(exec).toHaveBeenCalledWith(
        '"/usr/bin/python3" -m pip show cdoctest',
        expect.any(Function)
      );
    });

    test('should return false when version is too old', async () => {
      setupExecMock('Name: cdoctest\nVersion: 1.0.0\nSummary: C++ doc test');

      const result = await checkCDocTestVersion(mockConfig);

      expect(result).toBe(false);
    });

    test('should return false when cdoctest is not installed', async () => {
      const error: any = new Error('Package not found');
      error.code = 1;
      setupExecMock('', 'WARNING: Package(s) not found: cdoctest', error);

      const result = await checkCDocTestVersion(mockConfig);

      expect(result).toBe(false);
    });

    test('should handle custom required version', async () => {
      setupExecMock('Name: cdoctest\nVersion: 2.0.0\nSummary: C++ doc test');

      const result = await checkCDocTestVersion(mockConfig, '2.0.0');

      expect(result).toBe(true);
    });

    test('should handle version with pre-release suffix', async () => {
      setupExecMock('Name: cdoctest\nVersion: 1.2.0b1\nSummary: C++ doc test');

      const result = await checkCDocTestVersion(mockConfig);

      expect(result).toBe(true);
    });
  });

  describe('installCDocTest', () => {
    test('should install cdoctest successfully', async () => {
      setupExecMock('Successfully installed cdoctest-1.2.0');

      await installCDocTest(mockConfig);

      expect(exec).toHaveBeenCalledWith(
        '"/usr/bin/python3" -m pip install cdoctest>=1.1.0',
        expect.any(Function)
      );
    });

    test('should handle installation errors', async () => {
      setupExecMock('', 'Error: No matching distribution', new Error('Installation failed'));

      await expect(installCDocTest(mockConfig)).rejects.toThrow('Installation failed');
    });

    test('should use custom version when provided', async () => {
      setupExecMock('Successfully installed cdoctest-2.0.0');

      await installCDocTest(mockConfig, '2.0.0');

      expect(exec).toHaveBeenCalledWith(
        '"/usr/bin/python3" -m pip install cdoctest>=2.0.0',
        expect.any(Function)
      );
    });
  });

  describe('checkToolchainInstalled', () => {
    test('should return true when toolchain is installed', async () => {
      setupExecMock('True');

      const result = await checkToolchainInstalled(mockConfig);

      expect(result).toBe(true);
    });

    test('should return false when toolchain is not installed', async () => {
      setupExecMock('False');

      const result = await checkToolchainInstalled(mockConfig);

      expect(result).toBe(false);
    });

    test('should handle execution errors', async () => {
      setupExecMock('', 'ModuleNotFoundError', new Error('Module not found'));

      await expect(checkToolchainInstalled(mockConfig)).rejects.toThrow('Module not found');
    });

    test('should handle stderr output', async () => {
      setupExecMock('False', 'Warning: Some warning message');

      await expect(checkToolchainInstalled(mockConfig)).rejects.toBe('Warning: Some warning message');
    });
  });

  describe('getToolchainDir', () => {
    test('should return toolchain directory path', async () => {
      setupExecMock('/usr/local/clang/bin/clang');

      const result = await getToolchainDir(mockConfig);

      expect(result).toBe('/usr/local/clang/bin');
    });

    test('should handle Windows paths', async () => {
      setupExecMock('C:\\Program Files\\clang\\bin\\clang.exe');

      const result = await getToolchainDir(mockConfig);

      expect(result).toBe('C:/Program Files/clang/bin');
    });

    test('should handle empty output', async () => {
      setupExecMock('');

      const result = await getToolchainDir(mockConfig);

      expect(result).toBe('');
    });

    test('should handle execution errors', async () => {
      setupExecMock('', '', new Error('Command failed'));

      await expect(getToolchainDir(mockConfig)).rejects.toThrow('Command failed');
    });
  });

  describe('runInstallBundles', () => {
    test('should run install bundles successfully', async () => {
      setupExecMock('Bundles installed successfully');

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await runInstallBundles(mockConfig);

      expect(consoleLogSpy).toHaveBeenCalledWith('Output:', 'Bundles installed successfully');
      consoleLogSpy.mockRestore();
    });

    test('should handle stderr output', async () => {
      setupExecMock('', 'Error: Failed to install bundles');

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(runInstallBundles(mockConfig)).rejects.toBe('Error: Failed to install bundles');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error output:', 'Error: Failed to install bundles');
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('addNewToolchain', () => {
    test('should add new toolchain to workspace', async () => {
      mockReadFile.mockRejectedValue({ code: 'ENOENT' } as any); // File doesn't exist
      mockWriteFile.mockResolvedValue(undefined as any);

      await addNewToolchain('/usr/local/clang/bin');

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('cmake-kits.json'),
        expect.stringContaining('"name": "Kit from /usr/local/clang/bin"'),
        { encoding: 'utf8' }
      );
      expect(mockShowInformationMessage).toHaveBeenCalledWith(expect.stringContaining('New kit added'));
    });

    test('should not add duplicate toolchain', async () => {
      const existingKits = [{
        name: 'Existing Kit',
        compilers: {
          C: '/usr/local/clang/bin/clang',
          CXX: '/usr/local/clang/bin/clang++'
        }
      }];
      mockReadFile.mockResolvedValue(JSON.stringify(existingKits) as any);

      await addNewToolchain('/usr/local/clang/bin');

      expect(mockWriteFile).not.toHaveBeenCalled();
      expect(mockShowInformationMessage).toHaveBeenCalledWith(expect.stringContaining('already added'));
    });

    test('should handle no workspace folders', async () => {
      (vscode.workspace as any).workspaceFolders = undefined;
      
      const mockDisposable = { dispose: jest.fn() };
      const mockOnDidChangeWorkspaceFolders = jest.fn().mockReturnValue(mockDisposable);
      (vscode.workspace as any).onDidChangeWorkspaceFolders = mockOnDidChangeWorkspaceFolders;

      await addNewToolchain('/usr/local/clang/bin');

      expect(mockShowInformationMessage).toHaveBeenCalledWith(expect.stringContaining('No workspace open'));
      expect(mockOnDidChangeWorkspaceFolders).toHaveBeenCalled();
    });

    test('should handle read/write errors', async () => {
      mockReadFile.mockRejectedValue(new Error('Read error') as any);

      await expect(addNewToolchain('/usr/local/clang/bin')).rejects.toThrow('Read error');
      expect(mockShowErrorMessage).toHaveBeenCalledWith(expect.stringContaining('Error reading kits file'));
    });

    test('should handle Windows executable names', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });

      mockReadFile.mockRejectedValue({ code: 'ENOENT' } as any);
      mockWriteFile.mockResolvedValue(undefined as any);

      await addNewToolchain('C:\\clang\\bin');

      const writeCall = mockWriteFile.mock.calls[0];
      const writtenContent = writeCall[1] as string;
      expect(writtenContent).toContain('clang.exe');
      expect(writtenContent).toContain('clang++.exe');

      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
    });
  });
});