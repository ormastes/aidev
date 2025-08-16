import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as vscode from 'vscode';
import { CoverageStatusBarItem } from '../../src/coverageStatusBar';

// Mock vscode module
jest.mock('vscode');

describe("CoverageStatusBarItem", () => {
    let statusBarItem: CoverageStatusBarItem;
    let mockStatusBarItem: any;
    let mockCreateStatusBarItem: jest.MockedFunction<typeof vscode.window.createStatusBarItem>;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock status bar item
        mockStatusBarItem = {
            text: '',
            tooltip: '',
            command: '',
            backgroundColor: undefined,
            show: jest.fn(),
            hide: jest.fn(),
            dispose: jest.fn()
        };
        
        // Mock createStatusBarItem
        mockCreateStatusBarItem = vscode.window.createStatusBarItem as jest.MockedFunction<typeof vscode.window.createStatusBarItem>;
        mockCreateStatusBarItem.mockReturnValue(mockStatusBarItem);
        
        // Create instance
        statusBarItem = new CoverageStatusBarItem();
    });

    afterEach(() => {
        if (statusBarItem) {
            statusBarItem.dispose();
        }
    });

    describe("Constructor", () => {
        test('should create status bar item with correct properties', () => {
            expect(mockCreateStatusBarItem).toHaveBeenCalledWith(
                vscode.StatusBarAlignment.Right,
                100
            );
            expect(mockStatusBarItem.command).toBe('testing.showCoverage');
            expect(mockStatusBarItem.tooltip).toBe('Click to show coverage details');
        });
    });

    describe("updateCoverage", () => {
        test('should update with line coverage only', () => {
            const fileCoverages = [{
                uri: { fsPath: 'test.cpp' } as vscode.Uri,
                statementCoverage: new vscode.TestCoverageCount(80, 100)
            }] as vscode.FileCoverage[];

            statusBarItem.updateCoverage(fileCoverages);

            expect(mockStatusBarItem.text).toBe('$(testing-coverage) 80.0%');
            expect(mockStatusBarItem.tooltip).toContain('Lines: 80/100 (80.0%)');
            expect(mockStatusBarItem.show).toHaveBeenCalled();
            expect(mockStatusBarItem.backgroundColor).toBeUndefined();
        });

        test('should update with all coverage types', () => {
            const fileCoverages = [{
                uri: { fsPath: 'test.cpp' } as vscode.Uri,
                statementCoverage: new vscode.TestCoverageCount(75, 100),
                declarationCoverage: new vscode.TestCoverageCount(8, 10),
                branchCoverage: new vscode.TestCoverageCount(15, 20)
            }] as vscode.FileCoverage[];

            statusBarItem.updateCoverage(fileCoverages);

            expect(mockStatusBarItem.text).toBe('$(testing-coverage) 75.0%');
            expect(mockStatusBarItem.tooltip).toContain('Lines: 75/100 (75.0%)');
            expect(mockStatusBarItem.tooltip).toContain('Functions: 8/10 (80.0%)');
            expect(mockStatusBarItem.tooltip).toContain('Branches: 15/20 (75.0%)');
        });

        test('should aggregate coverage from multiple files', () => {
            const fileCoverages = [
                {
                    uri: { fsPath: 'test1.cpp' } as vscode.Uri,
                    statementCoverage: new vscode.TestCoverageCount(40, 50)
                },
                {
                    uri: { fsPath: 'test2.cpp' } as vscode.Uri,
                    statementCoverage: new vscode.TestCoverageCount(35, 50)
                }
            ] as vscode.FileCoverage[];

            statusBarItem.updateCoverage(fileCoverages);

            expect(mockStatusBarItem.text).toBe('$(testing-coverage) 75.0%');
            expect(mockStatusBarItem.tooltip).toContain('Lines: 75/100 (75.0%)');
        });

        test('should set warning background color for coverage 60-79%', () => {
            const fileCoverages = [{
                uri: { fsPath: 'test.cpp' } as vscode.Uri,
                statementCoverage: new vscode.TestCoverageCount(65, 100)
            }] as vscode.FileCoverage[];

            statusBarItem.updateCoverage(fileCoverages);

            expect(mockStatusBarItem.backgroundColor).toBeInstanceOf(vscode.ThemeColor);
            expect((mockStatusBarItem.backgroundColor as any).id).toBe('statusBarItem.warningBackground');
        });

        test('should set error background color for coverage below 60%', () => {
            const fileCoverages = [{
                uri: { fsPath: 'test.cpp' } as vscode.Uri,
                statementCoverage: new vscode.TestCoverageCount(50, 100)
            }] as vscode.FileCoverage[];

            statusBarItem.updateCoverage(fileCoverages);

            expect(mockStatusBarItem.backgroundColor).toBeInstanceOf(vscode.ThemeColor);
            expect((mockStatusBarItem.backgroundColor as any).id).toBe('statusBarItem.errorBackground');
        });

        test('should clear background color for coverage 80% and above', () => {
            const fileCoverages = [{
                uri: { fsPath: 'test.cpp' } as vscode.Uri,
                statementCoverage: new vscode.TestCoverageCount(85, 100)
            }] as vscode.FileCoverage[];

            statusBarItem.updateCoverage(fileCoverages);

            expect(mockStatusBarItem.backgroundColor).toBeUndefined();
        });

        test('should hide when no coverage data', () => {
            statusBarItem.updateCoverage([]);

            expect(mockStatusBarItem.hide).toHaveBeenCalled();
            expect(mockStatusBarItem.show).not.toHaveBeenCalled();
        });

        test('should hide when total lines is zero', () => {
            const fileCoverages = [{
                uri: { fsPath: 'test.cpp' } as vscode.Uri,
                statementCoverage: new vscode.TestCoverageCount(0, 0)
            }] as vscode.FileCoverage[];

            statusBarItem.updateCoverage(fileCoverages);

            expect(mockStatusBarItem.hide).toHaveBeenCalled();
        });

        test('should format tooltip correctly', () => {
            const fileCoverages = [{
                uri: { fsPath: 'test.cpp' } as vscode.Uri,
                statementCoverage: new vscode.TestCoverageCount(80, 100),
                declarationCoverage: new vscode.TestCoverageCount(9, 10),
                branchCoverage: new vscode.TestCoverageCount(7, 10)
            }] as vscode.FileCoverage[];

            statusBarItem.updateCoverage(fileCoverages);

            const tooltip = mockStatusBarItem.tooltip;
            expect(tooltip).toContain('Code Coverage');
            expect(tooltip).toContain('━━━━━━━━━━━━━━━━');
            expect(tooltip).toContain('Lines: 80/100 (80.0%)');
            expect(tooltip).toContain('Functions: 9/10 (90.0%)');
            expect(tooltip).toContain('Branches: 7/10 (70.0%)');
            expect(tooltip).toContain('Click to view coverage details');
        });

        test('should handle missing optional coverage types', () => {
            const fileCoverages = [{
                uri: { fsPath: 'test.cpp' } as vscode.Uri,
                statementCoverage: new vscode.TestCoverageCount(80, 100),
                declarationCoverage: undefined,
                branchCoverage: undefined
            }] as vscode.FileCoverage[];

            statusBarItem.updateCoverage(fileCoverages);

            expect(mockStatusBarItem.tooltip).toContain('Lines: 80/100 (80.0%)');
            expect(mockStatusBarItem.tooltip).not.toContain('Functions:');
            expect(mockStatusBarItem.tooltip).not.toContain('Branches:');
        });
    });

    describe('show', () => {
        test('should show status bar when there is coverage data', () => {
            // First update with coverage
            const fileCoverages = [{
                uri: { fsPath: 'test.cpp' } as vscode.Uri,
                statementCoverage: new vscode.TestCoverageCount(80, 100)
            }] as vscode.FileCoverage[];
            
            statusBarItem.updateCoverage(fileCoverages);
            mockStatusBarItem.show.mockClear();
            
            statusBarItem.show();
            
            expect(mockStatusBarItem.show).toHaveBeenCalled();
        });

        test('should not show when no coverage data', () => {
            statusBarItem.show();
            
            expect(mockStatusBarItem.show).not.toHaveBeenCalled();
        });
    });

    describe('hide', () => {
        test('should hide status bar', () => {
            statusBarItem.hide();
            
            expect(mockStatusBarItem.hide).toHaveBeenCalled();
        });
    });

    describe('dispose', () => {
        test('should dispose status bar item', () => {
            statusBarItem.dispose();
            
            expect(mockStatusBarItem.dispose).toHaveBeenCalled();
        });
    });

    describe('Coverage calculations', () => {
        test('should calculate correct percentages with decimal precision', () => {
            const fileCoverages = [{
                uri: { fsPath: 'test.cpp' } as vscode.Uri,
                statementCoverage: new vscode.TestCoverageCount(33, 100),
                declarationCoverage: new vscode.TestCoverageCount(1, 3),
                branchCoverage: new vscode.TestCoverageCount(2, 7)
            }] as vscode.FileCoverage[];

            statusBarItem.updateCoverage(fileCoverages);

            expect(mockStatusBarItem.text).toBe('$(testing-coverage) 33.0%');
            expect(mockStatusBarItem.tooltip).toContain('Lines: 33/100 (33.0%)');
            expect(mockStatusBarItem.tooltip).toContain('Functions: 1/3 (33.3%)');
            expect(mockStatusBarItem.tooltip).toContain('Branches: 2/7 (28.6%)');
        });

        test('should handle 100% coverage', () => {
            const fileCoverages = [{
                uri: { fsPath: 'test.cpp' } as vscode.Uri,
                statementCoverage: new vscode.TestCoverageCount(100, 100),
                declarationCoverage: new vscode.TestCoverageCount(10, 10),
                branchCoverage: new vscode.TestCoverageCount(20, 20)
            }] as vscode.FileCoverage[];

            statusBarItem.updateCoverage(fileCoverages);

            expect(mockStatusBarItem.text).toBe('$(testing-coverage) 100.0%');
            expect(mockStatusBarItem.backgroundColor).toBeUndefined();
        });

        test('should handle 0% coverage', () => {
            const fileCoverages = [{
                uri: { fsPath: 'test.cpp' } as vscode.Uri,
                statementCoverage: new vscode.TestCoverageCount(0, 100),
                declarationCoverage: new vscode.TestCoverageCount(0, 10),
                branchCoverage: new vscode.TestCoverageCount(0, 20)
            }] as vscode.FileCoverage[];

            statusBarItem.updateCoverage(fileCoverages);

            expect(mockStatusBarItem.text).toBe('$(testing-coverage) 0.0%');
            expect(mockStatusBarItem.backgroundColor).toBeInstanceOf(vscode.ThemeColor);
            expect((mockStatusBarItem.backgroundColor as any).id).toBe('statusBarItem.errorBackground');
        });
    });
});