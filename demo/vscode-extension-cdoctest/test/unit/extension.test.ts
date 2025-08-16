import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as vscode from 'vscode';
import { activate, deactivate } from '../../src/extension';
import { Config, ExeConfig } from '../../src/config';
import { CTestConfig } from '../../src/ctest/ctestConfig';
import { CoverageStatusBarItem } from '../../src/coverageStatusBar';
import { CoverageWatcher, setGlobalCoverageUpdateCallback } from '../../src/coverageHandler';
import { setupController } from '../../src/controller/controller';
import { initRunner } from '../../src/runner';
import { checkCDocTestVersion, getToolchainDir, addNewToolchain, checkToolchainInstalled } from '../../src/pyAdapter';

// Mock all dependencies
jest.mock('vscode');
jest.mock('../../src/config');
jest.mock('../../src/ctest/ctestConfig');
jest.mock('../../src/coverageStatusBar');
jest.mock('../../src/coverageHandler');
jest.mock('../../src/controller/controller');
jest.mock('../../src/runner');
jest.mock('../../src/pyAdapter');

describe("Extension", () => {
    let mockContext: vscode.ExtensionContext;
    let mockWorkspaceFolder: vscode.WorkspaceFolder;
    let mockDisposable: vscode.Disposable;
    
    // Mocked functions
    const mockInitRunner = initRunner as jest.MockedFunction<typeof initRunner>;
    const mockSetupController = setupController as jest.MockedFunction<typeof setupController>;
    const mockCheckCDocTestVersion = checkCDocTestVersion as jest.MockedFunction<typeof checkCDocTestVersion>;
    const mockGetToolchainDir = getToolchainDir as jest.MockedFunction<typeof getToolchainDir>;
    const mockAddNewToolchain = addNewToolchain as jest.MockedFunction<typeof addNewToolchain>;
    const mockCheckToolchainInstalled = checkToolchainInstalled as jest.MockedFunction<typeof checkToolchainInstalled>;
    const mockSetGlobalCoverageUpdateCallback = setGlobalCoverageUpdateCallback as jest.MockedFunction<typeof setGlobalCoverageUpdateCallback>;
    
    // Mocked classes
    const MockConfig = Config as jest.MockedClass<typeof Config>;
    const MockExeConfig = ExeConfig as jest.MockedClass<typeof ExeConfig>;
    const MockCTestConfig = CTestConfig as jest.MockedClass<typeof CTestConfig>;
    const MockCoverageStatusBarItem = CoverageStatusBarItem as jest.MockedClass<typeof CoverageStatusBarItem>;
    const MockCoverageWatcher = CoverageWatcher as jest.MockedClass<typeof CoverageWatcher>;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock process.exit to prevent test termination
        jest.spyOn(process, 'exit').mockImplementation((code?: number) => {
            throw new Error(`process.exit called with code ${code}`);
        });
        
        // Mock console methods
        jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();
        
        // Setup mock context
        mockDisposable = { dispose: jest.fn() };
        mockContext = {
            subscriptions: {
                push: jest.fn()
            }
        } as any;
        
        // Setup mock workspace
        mockWorkspaceFolder = {
            uri: { fsPath: '/test/workspace' } as vscode.Uri,
            name: 'test-workspace',
            index: 0
        };
        
        // Mock vscode.workspace
        Object.defineProperty(vscode.workspace, "workspaceFolders", {
            value: [mockWorkspaceFolder],
            configurable: true
        });
        
        Object.defineProperty(vscode.workspace, "onDidChangeWorkspaceFolders", {
            value: jest.fn((callback: any) => {
                // Store callback for testing
                (vscode.workspace.onDidChangeWorkspaceFolders as any).callback = callback;
                return mockDisposable;
            }),
            configurable: true
        });
        
        // Mock successful checks by default
        mockCheckCDocTestVersion.mockResolvedValue(true);
        mockCheckToolchainInstalled.mockResolvedValue(true);
        mockGetToolchainDir.mockResolvedValue('/test/toolchain');
        
        // Mock class instances
        MockConfig.prototype.dispose = jest.fn();
        MockExeConfig.prototype.dispose = jest.fn();
        MockCTestConfig.prototype.dispose = jest.fn();
        MockCoverageStatusBarItem.prototype.dispose = jest.fn();
        MockCoverageStatusBarItem.prototype.updateCoverage = jest.fn();
        MockCoverageWatcher.prototype.start = jest.fn();
        MockCoverageWatcher.prototype.stop = jest.fn();
        
        // Mock config properties
        Object.defineProperty(MockConfig.prototype, "coverageLocation", {
            value: 'coverage.info',
            configurable: true
        });
        Object.defineProperty(MockConfig.prototype, "coverageRawFilePattern", {
            value: '*.gcda',
            configurable: true
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("activate", () => {
        test('should initialize extension components', async () => {
            await activate(mockContext);
            
            expect(mockInitRunner).toHaveBeenCalledWith(mockContext);
            expect(MockCoverageStatusBarItem).toHaveBeenCalled();
            expect(mockContext.subscriptions.push).toHaveBeenCalledWith(expect.any(MockCoverageStatusBarItem));
            expect(mockSetGlobalCoverageUpdateCallback).toHaveBeenCalled();
        });

        test('should create config instances for workspace', async () => {
            await activate(mockContext);
            
            expect(MockExeConfig).toHaveBeenCalledWith(mockContext, mockWorkspaceFolder, expect.any(Function));
            expect(MockConfig).toHaveBeenCalledWith(mockContext, mockWorkspaceFolder, expect.any(Function));
            expect(MockCTestConfig).toHaveBeenCalledWith(mockContext, mockWorkspaceFolder, expect.any(Function));
        });

        test('should check cdoctest version and toolchain', async () => {
            await activate(mockContext);
            
            await new Promise(resolve => setTimeout(resolve, 0)); // Wait for promises
            
            expect(mockCheckCDocTestVersion).toHaveBeenCalled();
            expect(mockCheckToolchainInstalled).toHaveBeenCalled();
            expect(mockGetToolchainDir).toHaveBeenCalled();
            expect(mockAddNewToolchain).toHaveBeenCalledWith('/test/toolchain');
        });

        test('should setup controller for each config', async () => {
            await activate(mockContext);
            
            // The activeWorkspace callback should call setupController
            const activeWorkspaceCallback = MockExeConfig.mock.calls[0][2];
            const mockConfigInstance = new MockExeConfig(mockContext, mockWorkspaceFolder, jest.fn());
            
            activeWorkspaceCallback(mockConfigInstance);
            
            expect(mockSetupController).toHaveBeenCalledWith(
                expect.any(Object), // fileChangedEmitter
                mockContext,
                mockConfigInstance
            );
        });

        test('should create coverage watcher when coverage is configured', async () => {
            await activate(mockContext);
            
            await new Promise(resolve => setTimeout(resolve, 0)); // Wait for promises
            
            expect(MockCoverageWatcher).toHaveBeenCalledWith(
                expect.any(MockConfig),
                expect.any(Function)
            );
            expect(MockCoverageWatcher.prototype.start).toHaveBeenCalled();
        });

        test('should handle workspace without folders', async () => {
            Object.defineProperty(vscode.workspace, "workspaceFolders", {
                value: undefined,
                configurable: true
            });
            
            await activate(mockContext);
            
            expect(MockExeConfig).not.toHaveBeenCalled();
            expect(MockConfig).not.toHaveBeenCalled();
            expect(MockCTestConfig).not.toHaveBeenCalled();
        });

        test('should handle cdoctest version check failure', async () => {
            mockCheckCDocTestVersion.mockResolvedValue(false);
            
            await expect(async () => {
                await activate(mockContext);
                await new Promise(resolve => setTimeout(resolve, 0));
            }).rejects.toThrow('process.exit called with code 1');
            
            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining('cdoctest version not met minimum required version')
            );
        });

        test('should handle toolchain check failure', async () => {
            mockCheckToolchainInstalled.mockResolvedValue(false);
            
            await expect(async () => {
                await activate(mockContext);
                await new Promise(resolve => setTimeout(resolve, 0));
            }).rejects.toThrow('process.exit called with code 1');
            
            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining('Toolchain on cdoctest is not set or installed')
            );
        });

        test('should handle toolchain directory retrieval failure', async () => {
            mockGetToolchainDir.mockResolvedValue(null);
            
            await expect(async () => {
                await activate(mockContext);
                await new Promise(resolve => setTimeout(resolve, 0));
            }).rejects.toThrow('process.exit called with code 1');
            
            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining('Toolchain on clang_repl_kernel is not set or installed')
            );
        });

        test('should handle workspace folder changes', async () => {
            await activate(mockContext);
            
            const onDidChangeCallback = (vscode.workspace.onDidChangeWorkspaceFolders as any).callback;
            
            // Change workspace
            const newWorkspaceFolder = {
                uri: { fsPath: '/test/new-workspace' } as vscode.Uri,
                name: 'new-workspace',
                index: 0
            };
            Object.defineProperty(vscode.workspace, "workspaceFolders", {
                value: [newWorkspaceFolder],
                configurable: true
            });
            
            // Trigger workspace change
            onDidChangeCallback();
            
            // Should dispose old configs
            expect(MockExeConfig.prototype.dispose).toHaveBeenCalled();
            expect(MockConfig.prototype.dispose).toHaveBeenCalled();
            expect(MockCTestConfig.prototype.dispose).toHaveBeenCalled();
            expect(MockCoverageWatcher.prototype.stop).toHaveBeenCalled();
            
            // Should create new configs
            expect(MockExeConfig).toHaveBeenCalledWith(mockContext, newWorkspaceFolder, expect.any(Function));
        });

        test('should not recreate configs for same workspace', async () => {
            await activate(mockContext);
            
            const initialCallCount = MockExeConfig.mock.calls.length;
            const onDidChangeCallback = (vscode.workspace.onDidChangeWorkspaceFolders as any).callback;
            
            // Trigger workspace change with same folder
            onDidChangeCallback();
            
            // Should not create new configs
            expect(MockExeConfig.mock.calls.length).toBe(initialCallCount);
        });

        test('should setup coverage watcher callback correctly', async () => {
            await activate(mockContext);
            
            const coverageUpdateCallback = mockSetGlobalCoverageUpdateCallback.mock.calls[0][0];
            const mockCoverage = [{ uri: { fsPath: 'test.cpp' } }] as any;
            
            coverageUpdateCallback(mockCoverage);
            
            expect(MockCoverageStatusBarItem.prototype.updateCoverage).toHaveBeenCalledWith(mockCoverage);
        });

        test('should not create coverage watcher when coverage not configured', async () => {
            Object.defineProperty(MockConfig.prototype, "coverageLocation", {
                value: '',
                configurable: true
            });
            Object.defineProperty(MockConfig.prototype, "coverageRawFilePattern", {
                value: '',
                configurable: true
            });
            
            await activate(mockContext);
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(MockCoverageWatcher).not.toHaveBeenCalled();
        });
    });

    describe("deactivate", () => {
        test('should clean up all resources', async () => {
            // First activate to create resources
            await activate(mockContext);
            await new Promise(resolve => setTimeout(resolve, 0));
            
            // Then deactivate
            deactivate();
            
            expect(MockExeConfig.prototype.dispose).toHaveBeenCalled();
            expect(MockConfig.prototype.dispose).toHaveBeenCalled();
            expect(MockCTestConfig.prototype.dispose).toHaveBeenCalled();
            expect(MockCoverageWatcher.prototype.stop).toHaveBeenCalled();
            expect(MockCoverageStatusBarItem.prototype.dispose).toHaveBeenCalled();
        });

        test('should handle deactivate when resources not initialized', () => {
            // Deactivate without activating
            expect(() => deactivate()).not.toThrow();
        });

        test('should handle partial initialization', async () => {
            // Partially initialize by not having workspace folders
            Object.defineProperty(vscode.workspace, "workspaceFolders", {
                value: undefined,
                configurable: true
            });
            
            await activate(mockContext);
            
            // Should still clean up what was initialized
            expect(() => deactivate()).not.toThrow();
            expect(MockCoverageStatusBarItem.prototype.dispose).toHaveBeenCalled();
        });
    });

    describe('Error handling', () => {
        test('should handle exception in version check', async () => {
            mockCheckCDocTestVersion.mockRejectedValue(new Error('Version check failed'));
            
            await expect(async () => {
                await activate(mockContext);
                await new Promise(resolve => setTimeout(resolve, 0));
            }).rejects.toThrow('process.exit called with code 1');
            
            expect(console.error).toHaveBeenCalledWith(
                'Error checking cdoctest version:',
                expect.any(Error)
            );
        });

        test('should handle exception in toolchain directory retrieval', async () => {
            mockGetToolchainDir.mockRejectedValue(new Error('Toolchain error'));
            
            await expect(async () => {
                await activate(mockContext);
                await new Promise(resolve => setTimeout(resolve, 0));
            }).rejects.toThrow('process.exit called with code 1');
            
            expect(console.error).toHaveBeenCalledWith(
                'Error getting toolchain or clang_repl_kernel directory:',
                expect.any(Error)
            );
        });
    });
});