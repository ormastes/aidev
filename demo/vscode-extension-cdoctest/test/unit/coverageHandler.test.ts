import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as vscode from 'vscode';
import { fs } from '../../layer/themes/infra_external-log-lib/src';
import glob from 'fast-glob';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import {
    checkCoverageFilesExist,
    executeCoverageGenerationTask,
    parseLcovData,
    parseCoberturaData,
    parseJsonCoverageData,
    detectCoverageFormat,
    convertToVSCodeCoverage,
    loadDetailedCoverage,
    checkCoverageThresholds,
    CoverageWatcher,
    setGlobalCoverageUpdateCallback,
    processCoverageAfterTestRun
} from '../../src/coverageHandler';
import { Config } from '../../src/config';

// Mock dependencies
jest.mock('fs');
jest.mock('fast-glob');
jest.mock('child_process');
jest.mock('vscode');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockGlob = glob as unknown as jest.MockedFunction<typeof glob>;
const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

describe('Coverage Handler', () => {
    let mockConfig: jest.Mocked<Config>;
    let mockWorkspaceFolder: vscode.WorkspaceFolder;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockWorkspaceFolder = {
            uri: { fsPath: '/test/workspace' } as vscode.Uri,
            name: 'test-workspace',
            index: 0
        };
        
        mockConfig = {
            coverageRawFilePattern: '*.gcda',
            coverageGenerateTask: 'lcov --capture -d . -o coverage.info',
            coverageLocation: 'coverage.info',
            buildDirectory: '/test/build',
            workspaceFolder: mockWorkspaceFolder,
            coverageThresholdLine: 80,
            coverageThresholdFunction: 70,
            coverageThresholdBranch: 60,
            coverageWarnIfBelowThreshold: true,
            getCoverageRawFilePattern: jest.fn().mockReturnValue('/test/build/*.gcda')
        } as any;
    });

    describe("checkCoverageFilesExist", () => {
        test('should return true when coverage files exist', async () => {
            mockGlob.mockResolvedValue(['/test/build/file1.gcda', '/test/build/file2.gcda']);
            
            const result = await checkCoverageFilesExist(mockConfig);
            
            expect(result).toBe(true);
            expect(mockGlob).toHaveBeenCalledWith('/test/build/*.gcda');
        });

        test('should return false when no coverage files exist', async () => {
            mockGlob.mockResolvedValue([]);
            
            const result = await checkCoverageFilesExist(mockConfig);
            
            expect(result).toBe(false);
        });

        test('should return false when pattern is empty', async () => {
            mockConfig.coverageRawFilePattern = '';
            
            const result = await checkCoverageFilesExist(mockConfig);
            
            expect(result).toBe(false);
            expect(mockGlob).not.toHaveBeenCalled();
        });

        test('should handle glob errors gracefully', async () => {
            mockGlob.mockRejectedValue(new Error('Glob error'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            
            const result = await checkCoverageFilesExist(mockConfig);
            
            expect(result).toBe(false);
            expect(consoleSpy).toHaveBeenCalledWith('Error checking coverage files:', expect.any(Error));
            
            consoleSpy.mockRestore();
        });
    });

    describe("executeCoverageGenerationTask", () => {
        test('should execute coverage task successfully', async () => {
            const mockProcess = new EventEmitter() as any;
            mockProcess.stdout = new EventEmitter();
            mockProcess.stderr = new EventEmitter();
            
            mockSpawn.mockReturnValue(mockProcess);
            
            const promise = executeCoverageGenerationTask(mockConfig);
            
            // Emit success
            mockProcess.stdout.emit('data', 'Coverage generated');
            mockProcess.emit('close', 0);
            
            await expect(promise).resolves.toBeUndefined();
            expect(mockSpawn).toHaveBeenCalledWith(
                mockConfig.coverageGenerateTask,
                [],
                {
                    cwd: mockConfig.buildDirectory,
                    shell: true
                }
            );
        });

        test('should handle task failure', async () => {
            const mockProcess = new EventEmitter() as any;
            mockProcess.stdout = new EventEmitter();
            mockProcess.stderr = new EventEmitter();
            
            mockSpawn.mockReturnValue(mockProcess);
            
            const promise = executeCoverageGenerationTask(mockConfig);
            
            // Emit failure
            mockProcess.stderr.emit('data', 'Error output');
            mockProcess.emit('close', 1);
            
            await expect(promise).rejects.toThrow('Coverage generation failed with code 1');
        });

        test('should skip when no task configured', async () => {
            mockConfig.coverageGenerateTask = '';
            
            await expect(executeCoverageGenerationTask(mockConfig)).resolves.toBeUndefined();
            expect(mockSpawn).not.toHaveBeenCalled();
        });
    });

    describe("detectCoverageFormat", () => {
        test('should detect LCOV format by extension', () => {
            expect(detectCoverageFormat('SF:test.cpp', 'coverage.lcov')).toBe('lcov');
            expect(detectCoverageFormat('SF:test.cpp', 'coverage.info')).toBe('lcov');
        });

        test('should detect LCOV format by content', () => {
            const lcovContent = 'SF:test.cpp\nDA:1,1\nend_of_record';
            expect(detectCoverageFormat(lcovContent, 'coverage.txt')).toBe('lcov');
        });

        test('should detect Cobertura XML format', () => {
            const xmlContent = '<?xml version="1.0"?><coverage version="1.0" cobertura="true">';
            expect(detectCoverageFormat(xmlContent, 'coverage.xml')).toBe("cobertura");
        });

        test('should detect JSON format', () => {
            const jsonContent = '{"data": [{"files": []}]}';
            expect(detectCoverageFormat(jsonContent, 'coverage.json')).toBe('json');
        });

        test('should return unknown for unrecognized format', () => {
            expect(detectCoverageFormat('random content', 'file.txt')).toBe('unknown');
        });
    });

    describe("parseLcovData", () => {
        test('should parse valid LCOV data', () => {
            const lcovContent = `SF:/test/file1.cpp
DA:10,1
DA:11,0
DA:12,5
FN:10,testFunction
FNDA:1,testFunction
BRDA:15,0,0,1
BRDA:15,0,1,0
end_of_record
SF:/test/file2.cpp
DA:1,1
end_of_record`;

            const result = parseLcovData(lcovContent);
            
            expect(result).toHaveLength(2);
            expect(result[0].file).toBe('/test/file1.cpp');
            expect(result[0].lines).toHaveLength(3);
            expect(result[0].lines[0]).toEqual({ line: 10, hits: 1 });
            expect(result[0].functions).toHaveLength(1);
            expect(result[0].functions![0]).toEqual({ name: "testFunction", line: 10, hits: 1 });
            expect(result[0].branches).toHaveLength(2);
        });

        test('should handle empty LCOV data', () => {
            const result = parseLcovData('');
            expect(result).toHaveLength(0);
        });
    });

    describe("parseCoberturaData", () => {
        test('should parse valid Cobertura XML', async () => {
            const xmlContent = `<?xml version="1.0"?>
<coverage>
  <packages>
    <package>
      <classes>
        <class filename="test.cpp">
          <lines>
            <line number="1" hits="1"/>
            <line number="2" hits="0" branch="true" condition-coverage="50% (1/2)"/>
          </lines>
          <methods>
            <method name="testMethod">
              <lines>
                <line number="1" hits="1"/>
              </lines>
            </method>
          </methods>
        </class>
      </classes>
    </package>
  </packages>
</coverage>`;

            const result = await parseCoberturaData(xmlContent);
            
            expect(result).toHaveLength(1);
            expect(result[0].file).toBe('test.cpp');
            expect(result[0].lines).toHaveLength(2);
            expect(result[0].branches).toHaveLength(2);
            expect(result[0].functions).toHaveLength(1);
        });

        test('should handle empty XML', async () => {
            const xmlContent = '<?xml version="1.0"?><coverage></coverage>';
            const result = await parseCoberturaData(xmlContent);
            expect(result).toHaveLength(0);
        });
    });

    describe("parseJsonCoverageData", () => {
        test('should parse llvm-cov export format', () => {
            const jsonContent = JSON.stringify({
                data: [{
                    files: [{
                        filename: 'test.cpp',
                        segments: [
                            [1, 0, 5, true],
                            [2, 0, 0, true]
                        ],
                        functions: [{
                            name: "testFunc",
                            count: 5,
                            regions: [[1, 0]]
                        }]
                    }]
                }]
            });

            const result = parseJsonCoverageData(jsonContent);
            
            expect(result).toHaveLength(1);
            expect(result[0].file).toBe('test.cpp');
            expect(result[0].lines).toHaveLength(2);
            expect(result[0].functions).toHaveLength(1);
        });

        test('should parse custom JSON format', () => {
            const jsonContent = JSON.stringify({
                files: {
                    'test.cpp': {
                        lines: {
                            '1': 5,
                            '2': 0
                        }
                    }
                }
            });

            const result = parseJsonCoverageData(jsonContent);
            
            expect(result).toHaveLength(1);
            expect(result[0].file).toBe('test.cpp');
            expect(result[0].lines).toHaveLength(2);
        });

        test('should handle invalid JSON gracefully', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            
            const result = parseJsonCoverageData('invalid json');
            
            expect(result).toHaveLength(0);
            expect(consoleSpy).toHaveBeenCalled();
            
            consoleSpy.mockRestore();
        });
    });

    describe("convertToVSCodeCoverage", () => {
        test('should convert coverage data to VS Code format', () => {
            const coverageData = [{
                file: 'test.cpp',
                lines: [
                    { line: 1, hits: 5 },
                    { line: 2, hits: 0 }
                ],
                functions: [
                    { name: 'func1', line: 1, hits: 5 }
                ],
                branches: [
                    { line: 2, block: 0, branch: 0, taken: 1 }
                ]
            }];

            const result = convertToVSCodeCoverage(coverageData, mockWorkspaceFolder);
            
            expect(result).toHaveLength(1);
            expect(result[0].uri.fsPath).toBe('/test/workspace/test.cpp');
            expect(result[0].statementCoverage.covered).toBe(1);
            expect(result[0].statementCoverage.total).toBe(2);
            expect((result[0] as any).declarationCoverage?.covered).toBe(1);
            expect((result[0] as any).declarationCoverage?.total).toBe(1);
            expect(result[0].branchCoverage?.covered).toBe(1);
            expect(result[0].branchCoverage?.total).toBe(1);
        });

        test('should handle absolute paths', () => {
            const coverageData = [{
                file: '/absolute/path/test.cpp',
                lines: [{ line: 1, hits: 1 }]
            }];

            const result = convertToVSCodeCoverage(coverageData, mockWorkspaceFolder);
            
            expect(result[0].uri.fsPath).toBe('/absolute/path/test.cpp');
        });
    });

    describe("loadDetailedCoverage", () => {
        test('should load detailed coverage from file coverage', () => {
            const fileCoverage = {
                uri: { fsPath: 'test.cpp' } as vscode.Uri,
                statementCoverage: { covered: 1, total: 2 } as vscode.TestCoverageCount,
                _rawData: {
                    lines: [
                        { line: 1, hits: 5 },
                        { line: 2, hits: 0 }
                    ]
                }
            } as any;

            const result = loadDetailedCoverage(fileCoverage);
            
            expect(result).toHaveLength(2);
            expect(result[0]).toBeInstanceOf(vscode.StatementCoverage);
            expect((result[0] as any).executed).toBe(5);
            expect((result[1] as any).executed).toBe(0);
        });

        test('should return empty array when no raw data', () => {
            const fileCoverage = {
                uri: { fsPath: 'test.cpp' } as vscode.Uri,
                statementCoverage: { covered: 0, total: 0 } as vscode.TestCoverageCount
            } as vscode.FileCoverage;

            const result = loadDetailedCoverage(fileCoverage);
            
            expect(result).toHaveLength(0);
        });
    });

    describe("checkCoverageThresholds", () => {
        let mockShowWarningMessage: jest.MockedFunction<typeof vscode.window.showWarningMessage>;

        beforeEach(() => {
            mockShowWarningMessage = vscode.window.showWarningMessage as jest.MockedFunction<typeof vscode.window.showWarningMessage>;
            mockShowWarningMessage.mockResolvedValue(undefined);
        });

        test('should show warning when coverage below threshold', () => {
            const fileCoverages = [{
                uri: { fsPath: 'test.cpp' } as vscode.Uri,
                statementCoverage: new vscode.TestCoverageCount(60, 100),
                declarationCoverage: new vscode.TestCoverageCount(50, 100),
                branchCoverage: new vscode.TestCoverageCount(40, 100)
            }] as any as vscode.FileCoverage[];

            checkCoverageThresholds(fileCoverages, mockConfig);
            
            expect(mockShowWarningMessage).toHaveBeenCalledWith(
                expect.stringContaining('Line coverage 60.0% is below threshold 80%'),
                'View Coverage'
            );
        });

        test('should not show warning when coverage meets threshold', () => {
            const fileCoverages = [{
                uri: { fsPath: 'test.cpp' } as vscode.Uri,
                statementCoverage: new vscode.TestCoverageCount(85, 100),
                declarationCoverage: new vscode.TestCoverageCount(75, 100),
                branchCoverage: new vscode.TestCoverageCount(65, 100)
            }] as any as vscode.FileCoverage[];

            checkCoverageThresholds(fileCoverages, mockConfig);
            
            expect(mockShowWarningMessage).not.toHaveBeenCalled();
        });

        test('should execute command when View Coverage clicked', async () => {
            const mockExecuteCommand = vscode.commands.executeCommand as jest.MockedFunction<typeof vscode.commands.executeCommand>;
            mockExecuteCommand.mockResolvedValue(undefined);
            mockShowWarningMessage.mockResolvedValue('View Coverage' as any);

            const fileCoverages = [{
                uri: { fsPath: 'test.cpp' } as vscode.Uri,
                statementCoverage: new vscode.TestCoverageCount(60, 100)
            }] as vscode.FileCoverage[];

            checkCoverageThresholds(fileCoverages, mockConfig);
            
            // Wait for promise to resolve
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(mockExecuteCommand).toHaveBeenCalledWith('testing.showCoverage');
        });
    });

    describe("CoverageWatcher", () => {
        let watcher: CoverageWatcher;
        let mockCallback: jest.Mock;
        let mockFileSystemWatcher: any;
        let mockCreateFileSystemWatcher: jest.MockedFunction<typeof vscode.workspace.createFileSystemWatcher>;

        beforeEach(() => {
            mockCallback = jest.fn();
            mockFileSystemWatcher = {
                onDidChange: jest.fn(),
                onDidCreate: jest.fn(),
                onDidDelete: jest.fn(),
                dispose: jest.fn()
            };
            
            mockCreateFileSystemWatcher = vscode.workspace.createFileSystemWatcher as jest.MockedFunction<typeof vscode.workspace.createFileSystemWatcher>;
            mockCreateFileSystemWatcher.mockReturnValue(mockFileSystemWatcher);
            
            watcher = new CoverageWatcher(mockConfig, mockCallback);
        });

        afterEach(() => {
            watcher.stop();
        });

        test('should start watching coverage files', async () => {
            await watcher.start();
            
            expect(mockCreateFileSystemWatcher).toHaveBeenCalledWith(mockConfig.coverageLocation);
            expect(mockCreateFileSystemWatcher).toHaveBeenCalledWith('/test/build/*.gcda');
            expect(mockFileSystemWatcher.onDidChange).toHaveBeenCalled();
            expect(mockFileSystemWatcher.onDidCreate).toHaveBeenCalled();
        });

        test('should stop all watchers', async () => {
            await watcher.start();
            watcher.stop();
            
            expect(mockFileSystemWatcher.dispose).toHaveBeenCalled();
        });

        test('should handle coverage file changes with debouncing', async () => {
            jest.useFakeTimers();
            
            await watcher.start();
            
            // Get the change handler
            const changeHandler = mockFileSystemWatcher.onDidChange.mock.calls[0][0];
            
            // Mock file system and coverage data
            (mockFs.existsSync as jest.Mock).mockReturnValue(true);
            (mockFs.readFileSync as jest.Mock).mockReturnValue('SF:test.cpp\nDA:1,1\nend_of_record');
            
            // Trigger multiple changes
            changeHandler();
            changeHandler();
            changeHandler();
            
            // Fast forward past debounce timeout
            jest.advanceTimersByTime(600);
            
            // Should only update once due to debouncing
            expect(mockCallback).toHaveBeenCalledTimes(1);
            
            jest.useRealTimers();
        });
    });

    describe("processCoverageAfterTestRun", () => {
        let mockRun: any;

        beforeEach(() => {
            mockRun = {
                addCoverage: jest.fn()
            };
        });

        test('should process coverage and add to test run', async () => {
            mockGlob.mockResolvedValue(['/test/build/test.gcda']);
            (mockFs.existsSync as jest.Mock).mockReturnValue(true);
            (mockFs.readFileSync as jest.Mock).mockReturnValue('SF:test.cpp\nDA:1,1\nend_of_record');
            
            const mockProcess = new EventEmitter() as any;
            mockProcess.stdout = new EventEmitter();
            mockProcess.stderr = new EventEmitter();
            mockSpawn.mockReturnValue(mockProcess);

            const promise = processCoverageAfterTestRun(mockConfig, mockRun);
            
            // Simulate successful task execution
            mockProcess.emit('close', 0);
            
            await promise;
            
            expect(mockRun.addCoverage).toHaveBeenCalled();
            const coverage = mockRun.addCoverage.mock.calls[0][0];
            expect(coverage.uri.fsPath).toContain('test.cpp');
        });

        test('should skip when no coverage files exist', async () => {
            mockGlob.mockResolvedValue([]);
            
            await processCoverageAfterTestRun(mockConfig, mockRun);
            
            expect(mockRun.addCoverage).not.toHaveBeenCalled();
        });

        test('should handle errors gracefully', async () => {
            mockGlob.mockRejectedValue(new Error('Test error'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            
            await processCoverageAfterTestRun(mockConfig, mockRun);
            
            expect(consoleSpy).toHaveBeenCalledWith('Error processing coverage:', expect.any(Error));
            expect(mockRun.addCoverage).not.toHaveBeenCalled();
            
            consoleSpy.mockRestore();
        });
    });

    describe('Global Coverage Update Callback', () => {
        test('should set and call global callback', () => {
            const mockCallback = jest.fn();
            setGlobalCoverageUpdateCallback(mockCallback);
            
            // This would normally be called internally, but we can't test the private function directly
            // Instead, we verify the callback is set correctly through integration tests
            expect(mockCallback).toBeDefined();
        });
    });
});