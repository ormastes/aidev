import * as vscode from 'vscode';

// Mock vscode module
jest.mock('vscode', () => ({
    workspace: {
        getConfiguration: jest.fn(),
    },
    WorkspaceFolder: {},
    Uri: {
        parse: jest.fn(),
    },
    ExtensionContext: {}
}), { virtual: true });

import { Config, ConfigType, ExeConfig, BinConfig } from '../../src/config';

describe('Bypass Build Configuration', () => {
    let mockGetConfiguration: jest.Mock;
    let mockWorkspaceFolder: vscode.WorkspaceFolder;
    let mockContext: vscode.ExtensionContext;

    beforeEach(() => {
        mockGetConfiguration = vscode.workspace.getConfiguration as jest.Mock;
        mockWorkspaceFolder = {
            uri: { fsPath: '/test/workspace' } as vscode.Uri,
            name: 'test-workspace',
            index: 0
        };
        mockContext = {} as vscode.ExtensionContext;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Config class - buildBeforeTest', () => {
        test('should default buildBeforeTest to true', () => {
            mockGetConfiguration.mockReturnValue(new Map([
                ['pythonExePath', 'python3'],
                ['buildDirectory', '/test/build'],
                ['srcDirectory', '/test/src'],
                ['useCmakeTarget', false],
                // buildBeforeTest not set - should default to true
            ]));

            const config = new Config(mockContext, mockWorkspaceFolder, jest.fn(), false);
            
            expect(config.buildBeforeTest).toBe(true);
        });

        test('should respect buildBeforeTest configuration when set to false', () => {
            mockGetConfiguration.mockReturnValue(new Map([
                ['pythonExePath', 'python3'],
                ['buildDirectory', '/test/build'],
                ['srcDirectory', '/test/src'],
                ['useCmakeTarget', false],
                ['buildBeforeTest', false],
            ]));

            const config = new Config(mockContext, mockWorkspaceFolder, jest.fn(), false);
            
            expect(config.buildBeforeTest).toBe(false);
        });

        test('should respect buildBeforeTest configuration when explicitly set to true', () => {
            mockGetConfiguration.mockReturnValue(new Map([
                ['pythonExePath', 'python3'],
                ['buildDirectory', '/test/build'],
                ['srcDirectory', '/test/src'],
                ['useCmakeTarget', false],
                ['buildBeforeTest', true],
            ]));

            const config = new Config(mockContext, mockWorkspaceFolder, jest.fn(), false);
            
            expect(config.buildBeforeTest).toBe(true);
        });
    });

    describe('ExeConfig class - exe_buildBeforeTest', () => {
        test('should default exe_buildBeforeTest to true', () => {
            mockGetConfiguration.mockReturnValue(new Map([
                ['pythonExePath', 'python3'],
                ['buildDirectory', '/test/build'],
                ['srcDirectory', '/test/src'],
                ['useCmakeTarget', false],
                ['exe_executable', '/test/build/test_exe'],
                // exe_buildBeforeTest not set - should default to true
            ]));

            const config = new ExeConfig(mockContext, mockWorkspaceFolder, jest.fn(), false);
            
            expect(config.exe_buildBeforeTest).toBe(true);
        });

        test('should respect exe_buildBeforeTest configuration when set to false', () => {
            mockGetConfiguration.mockReturnValue(new Map([
                ['pythonExePath', 'python3'],
                ['buildDirectory', '/test/build'],
                ['srcDirectory', '/test/src'],
                ['useCmakeTarget', false],
                ['exe_executable', '/test/build/test_exe'],
                ['exe_buildBeforeTest', false],
            ]));

            const config = new ExeConfig(mockContext, mockWorkspaceFolder, jest.fn(), false);
            
            expect(config.exe_buildBeforeTest).toBe(false);
        });
    });

    describe('BinConfig class - bin_buildBeforeTest', () => {
        test('should default bin_buildBeforeTest to true', () => {
            mockGetConfiguration.mockReturnValue(new Map([
                ['pythonExePath', 'python3'],
                ['buildDirectory', '/test/build'],
                ['srcDirectory', '/test/src'],
                ['useCmakeTarget', false],
                ['bin_executable', '/test/build/test_bin'],
                // bin_buildBeforeTest not set - should default to true
            ]));

            const config = new BinConfig(mockContext, mockWorkspaceFolder, jest.fn(), false);
            
            expect(config.bin_buildBeforeTest).toBe(true);
        });

        test('should respect bin_buildBeforeTest configuration when set to false', () => {
            mockGetConfiguration.mockReturnValue(new Map([
                ['pythonExePath', 'python3'],
                ['buildDirectory', '/test/build'],
                ['srcDirectory', '/test/src'],
                ['useCmakeTarget', false],
                ['bin_executable', '/test/build/test_bin'],
                ['bin_buildBeforeTest', false],
            ]));

            const config = new BinConfig(mockContext, mockWorkspaceFolder, jest.fn(), false);
            
            expect(config.bin_buildBeforeTest).toBe(false);
        });
    });

    describe('Configuration type detection', () => {
        test('should have correct type for Config', () => {
            mockGetConfiguration.mockReturnValue(new Map([
                ['pythonExePath', 'python3'],
                ['buildDirectory', '/test/build'],
                ['srcDirectory', '/test/src'],
                ['useCmakeTarget', false],
            ]));

            const config = new Config(mockContext, mockWorkspaceFolder, jest.fn(), false);
            
            expect(config.type).toBe(ConfigType.Config);
        });

        test('should have correct type for ExeConfig', () => {
            mockGetConfiguration.mockReturnValue(new Map([
                ['pythonExePath', 'python3'],
                ['buildDirectory', '/test/build'],
                ['srcDirectory', '/test/src'],
                ['useCmakeTarget', false],
                ['exe_executable', '/test/build/test_exe'],
            ]));

            const config = new ExeConfig(mockContext, mockWorkspaceFolder, jest.fn(), false);
            
            expect(config.type).toBe(ConfigType.ExeConfig);
        });

        test('should have correct type for BinConfig', () => {
            mockGetConfiguration.mockReturnValue(new Map([
                ['pythonExePath', 'python3'],
                ['buildDirectory', '/test/build'],
                ['srcDirectory', '/test/src'],
                ['useCmakeTarget', false],
                ['bin_executable', '/test/build/test_bin'],
            ]));

            const config = new BinConfig(mockContext, mockWorkspaceFolder, jest.fn(), false);
            
            expect(config.type).toBe(ConfigType.BinConfig);
        });
    });
});