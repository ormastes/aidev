import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Config, ExeConfig, BinConfig, ConfigType } from '../../src/config';
import * as vscode from 'vscode';

// Mock vscode module
jest.mock('vscode');

describe('Config Coverage Settings', () => {
    let mockContext: vscode.ExtensionContext;
    let mockWorkspaceFolder: vscode.WorkspaceFolder;
    let mockActiveWorkspace: jest.Mock;
    let mockGetConfiguration: jest.MockedFunction<typeof vscode.workspace.getConfiguration>;

    const defaultCoverageSettings = {
        coverageLocation: 'coverage.info',
        coverageGenerateTask: 'lcov --capture -d . -o coverage.info',
        coverageRawFilePattern: '${buildDirectory}/*.gcda',
        coverageThresholdLine: 80,
        coverageThresholdFunction: 70,
        coverageThresholdBranch: 60,
        coverageWarnIfBelowThreshold: true
    };

    const allDefaultSettings = {
        pythonExePath: '/usr/bin/python3',
        useCmakeTarget: false,
        srcDirectory: '/test/src',
        buildDirectory: '/test/build',
        executable: '/test/build/test.exe',
        exe_executable: '/test/build/exe_test.exe',
        bin_executable: '/test/build/bin_test.exe',
        testRunArgPattern: '--test ${test_full_name}',
        listTestArgPattern: '--list-tests',
        exe_testRunArgPattern: '--run ${test_case_name}',
        exe_listTestArgPattern: '--list',
        bin_testRunArgPattern: 'TC/${test_full_name}',
        bin_listTestArgPattern: 'GetTcList:',
        resultFile: 'result.txt',
        exe_resultFile: 'exe_result.txt',
        bin_resultFile: 'bin_result.txt',
        resultSuccessRgex: 'PASS',
        testRunUseFile: true,
        listTestUseFile: false,
        exe_testRunUseFile: true,
        exe_listTestUseFile: false,
        bin_testRunUseFile: true,
        bin_listTestUseFile: false,
        libPaths: '/test/lib',
        configName: 'test-config',
        testcaseSeparator: '::',
        exe_testcaseSeparator: '.',
        bin_testcaseSeparator: '/',
        buildBeforeTest: true,
        exe_buildBeforeTest: true,
        bin_buildBeforeTest: true,
        ...defaultCoverageSettings
    };

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockContext = {} as vscode.ExtensionContext;
        mockWorkspaceFolder = {
            uri: { fsPath: '/test/workspace' } as vscode.Uri,
            name: 'test-workspace',
            index: 0
        };
        mockActiveWorkspace = jest.fn();
        
        mockGetConfiguration = vscode.workspace.getConfiguration as jest.MockedFunction<typeof vscode.workspace.getConfiguration>;
        mockGetConfiguration.mockImplementation((section?: string) => {
            return {
                get: jest.fn((key: string) => {
                    if (section === "cdoctest") {
                        return allDefaultSettings[key as keyof typeof allDefaultSettings];
                    }
                    return null;
                })
            } as any;
        });
    });

    describe('Config class coverage settings', () => {
        test('should load all coverage configuration settings', () => {
            const config = new Config(mockContext, mockWorkspaceFolder, mockActiveWorkspace, false);
            
            expect(config.coverageLocation).toBe('coverage.info');
            expect(config.coverageGenerateTask).toBe('lcov --capture -d . -o coverage.info');
            expect(config.coverageRawFilePattern).toBe('${buildDirectory}/*.gcda');
            expect(config.coverageThresholdLine).toBe(80);
            expect(config.coverageThresholdFunction).toBe(70);
            expect(config.coverageThresholdBranch).toBe(60);
            expect(config.coverageWarnIfBelowThreshold).toBe(true);
            
            config.dispose();
        });

        test('should handle missing coverage settings with defaults', () => {
            mockGetConfiguration.mockImplementation(() => {
                return {
                    get: jest.fn((key: string) => {
                        // Return minimum required settings only
                        const minSettings: { [key: string]: any } = {
                            pythonExePath: '/usr/bin/python3',
                            useCmakeTarget: false,
                            srcDirectory: '/test/src',
                            buildDirectory: '/test/build',
                            executable: '/test/build/test.exe'
                        };
                        return minSettings[key];
                    })
                } as any;
            });
            
            const config = new Config(mockContext, mockWorkspaceFolder, mockActiveWorkspace, false);
            
            expect(config.coverageLocation).toBe('');
            expect(config.coverageGenerateTask).toBe('');
            expect(config.coverageRawFilePattern).toBe('');
            expect(config.coverageThresholdLine).toBe(0);
            expect(config.coverageThresholdFunction).toBe(0);
            expect(config.coverageThresholdBranch).toBe(0);
            expect(config.coverageWarnIfBelowThreshold).toBe(false);
            
            config.dispose();
        });

        test('should resolve coverage raw file pattern with variables', () => {
            const config = new Config(mockContext, mockWorkspaceFolder, mockActiveWorkspace, false);
            
            const pattern = config.getCoverageRawFilePattern();
            expect(pattern).toBe('/test/build/*.gcda');
            
            config.dispose();
        });

        test('should add executable folder to coverage pattern environment', () => {
            const config = new Config(mockContext, mockWorkspaceFolder, mockActiveWorkspace, false);
            config.coverageRawFilePattern = '${executable_folder}/*.gcda';
            
            const pattern = config.getCoverageRawFilePattern();
            expect(pattern).toBe('/test/build/*.gcda');
            
            config.dispose();
        });

        test('should handle custom environment variables in coverage pattern', () => {
            const config = new Config(mockContext, mockWorkspaceFolder, mockActiveWorkspace, false);
            config.coverageRawFilePattern = '${custom_var}/*.gcda';
            
            const pattern = config.getCoverageRawFilePattern({ custom_var: '/custom/path' });
            expect(pattern).toBe('/custom/path/*.gcda');
            
            config.dispose();
        });
    });

    describe('ExeConfig coverage inheritance', () => {
        test('should inherit coverage settings from Config', () => {
            const config = new ExeConfig(mockContext, mockWorkspaceFolder, mockActiveWorkspace);
            
            expect(config.coverageLocation).toBe('coverage.info');
            expect(config.coverageGenerateTask).toBe('lcov --capture -d . -o coverage.info');
            expect(config.coverageRawFilePattern).toBe('${buildDirectory}/*.gcda');
            expect(config.coverageThresholdLine).toBe(80);
            expect(config.coverageThresholdFunction).toBe(70);
            expect(config.coverageThresholdBranch).toBe(60);
            expect(config.coverageWarnIfBelowThreshold).toBe(true);
            
            config.dispose();
        });

        test('should use exe executable for coverage pattern', () => {
            const config = new ExeConfig(mockContext, mockWorkspaceFolder, mockActiveWorkspace);
            config.coverageRawFilePattern = '${executable_folder}/*.gcda';
            
            // ExeConfig uses exe_executable
            const pattern = config.getCoverageRawFilePattern();
            expect(pattern).toContain('exe_test.exe');
            
            config.dispose();
        });
    });

    describe('BinConfig coverage inheritance', () => {
        test('should inherit coverage settings from Config', () => {
            const config = new BinConfig(mockContext, mockWorkspaceFolder, mockActiveWorkspace);
            
            expect(config.coverageLocation).toBe('coverage.info');
            expect(config.coverageGenerateTask).toBe('lcov --capture -d . -o coverage.info');
            expect(config.coverageRawFilePattern).toBe('${buildDirectory}/*.gcda');
            expect(config.coverageThresholdLine).toBe(80);
            expect(config.coverageThresholdFunction).toBe(70);
            expect(config.coverageThresholdBranch).toBe(60);
            expect(config.coverageWarnIfBelowThreshold).toBe(true);
            
            config.dispose();
        });

        test('should use bin executable for coverage pattern', () => {
            const config = new BinConfig(mockContext, mockWorkspaceFolder, mockActiveWorkspace);
            config.coverageRawFilePattern = '${executable_folder}/*.gcda';
            
            // BinConfig uses bin_executable
            const pattern = config.getCoverageRawFilePattern();
            expect(pattern).toContain('bin_test.exe');
            
            config.dispose();
        });
    });

    describe('Coverage configuration validation', () => {
        test('should handle numeric threshold boundaries', () => {
            const testThresholds = [
                { line: 0, function: 0, branch: 0 },
                { line: 50, function: 50, branch: 50 },
                { line: 100, function: 100, branch: 100 }
            ];
            
            for (const thresholds of testThresholds) {
                mockGetConfiguration.mockImplementation(() => {
                    return {
                        get: jest.fn((key: string) => {
                            const settings = {
                                ...allDefaultSettings,
                                coverageThresholdLine: thresholds.line,
                                coverageThresholdFunction: thresholds.function,
                                coverageThresholdBranch: thresholds.branch
                            };
                            return settings[key as keyof typeof settings];
                        })
                    } as any;
                });
                
                const config = new Config(mockContext, mockWorkspaceFolder, mockActiveWorkspace, false);
                
                expect(config.coverageThresholdLine).toBe(thresholds.line);
                expect(config.coverageThresholdFunction).toBe(thresholds.function);
                expect(config.coverageThresholdBranch).toBe(thresholds.branch);
                
                config.dispose();
            }
        });

        test('should handle empty coverage paths', () => {
            const config = new Config(mockContext, mockWorkspaceFolder, mockActiveWorkspace, false);
            config.coverageLocation = '';
            config.coverageRawFilePattern = '';
            
            expect(config.getCoverageRawFilePattern()).toBe('');
            
            config.dispose();
        });
    });

    describe('Coverage pattern resolution', () => {
        test('should resolve workspace folder in pattern', () => {
            const config = new Config(mockContext, mockWorkspaceFolder, mockActiveWorkspace, false);
            config.coverageRawFilePattern = '${workspaceFolder}/coverage/*.gcda';
            
            const pattern = config.getCoverageRawFilePattern();
            expect(pattern).toBe('/test/workspace/coverage/*.gcda');
            
            config.dispose();
        });

        test('should resolve src directory in pattern', () => {
            const config = new Config(mockContext, mockWorkspaceFolder, mockActiveWorkspace, false);
            config.coverageRawFilePattern = '${srcDirectory}/coverage/*.gcda';
            
            const pattern = config.getCoverageRawFilePattern();
            expect(pattern).toBe('/test/src/coverage/*.gcda');
            
            config.dispose();
        });

        test('should handle multiple variable substitutions', () => {
            const config = new Config(mockContext, mockWorkspaceFolder, mockActiveWorkspace, false);
            config.coverageRawFilePattern = '${buildDirectory}/${executable_folder}/*.gcda';
            
            const pattern = config.getCoverageRawFilePattern({ executable_folder: 'bin' });
            expect(pattern).toBe('/test/build/bin/*.gcda');
            
            config.dispose();
        });

        test('should handle Windows-style paths', () => {
            // Mock Windows platform
            Object.defineProperty(process, "platform", {
                value: 'win32',
                configurable: true
            });
            
            const config = new Config(mockContext, mockWorkspaceFolder, mockActiveWorkspace, false);
            config._buildDirectory = 'C:\\test\\build';
            config.coverageRawFilePattern = '${buildDirectory}\\*.gcda';
            
            const pattern = config.getCoverageRawFilePattern();
            expect(pattern).toContain('C:\\test\\build');
            
            // Restore platform
            Object.defineProperty(process, "platform", {
                value: 'linux',
                configurable: true
            });
            
            config.dispose();
        });
    });
});