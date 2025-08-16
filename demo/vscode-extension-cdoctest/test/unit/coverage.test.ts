/**
 * Unit tests for coverage.ts
 */

// Mock vscode module
jest.mock('vscode', () => ({
  Uri: {
    parse: jest.fn((uri: string) => ({ toString: () => uri, fsPath: uri }))
  },
  FileCoverage: class MockFileCoverage {
    constructor(public uri: any, public statementCoverage: any) {}
  },
  TestCoverageCount: class MockTestCoverageCount {
    constructor(public covered: number, public total: number) {}
  },
  StatementCoverage: class MockStatementCoverage {
    constructor(public executed: number | boolean, public location: any) {}
  },
  Position: class MockPosition {
    constructor(public line: number, public character: number) {}
  }
}), { virtual: true });

import { MarkdownFileCoverage } from '../../src/coverage';
import * as vscode from 'vscode';

describe('MarkdownFileCoverage', () => {
  test('should create coverage with no lines', () => {
    const coverage = new MarkdownFileCoverage('file:///test.md', []);
    
    expect(vscode.Uri.parse).toHaveBeenCalledWith('file:///test.md');
    expect(coverage.statementCoverage.covered).toBe(0);
    expect(coverage.statementCoverage.total).toBe(0);
    expect(coverage.coveredLines).toEqual([]);
  });

  test('should calculate coverage for executed lines', () => {
    const lines = [
      new vscode.StatementCoverage(true, new vscode.Position(0, 0)),
      new vscode.StatementCoverage(true, new vscode.Position(1, 0)),
      new vscode.StatementCoverage(true, new vscode.Position(2, 0))
    ];
    
    const coverage = new MarkdownFileCoverage('file:///test.md', lines);
    
    expect(coverage.statementCoverage.covered).toBe(3);
    expect(coverage.statementCoverage.total).toBe(3);
    expect(coverage.coveredLines).toEqual(lines);
  });

  test('should calculate coverage for mixed executed and not executed lines', () => {
    const lines = [
      new vscode.StatementCoverage(true, new vscode.Position(0, 0)),
      new vscode.StatementCoverage(false, new vscode.Position(1, 0)),
      new vscode.StatementCoverage(true, new vscode.Position(2, 0)),
      new vscode.StatementCoverage(false, new vscode.Position(3, 0))
    ];
    
    const coverage = new MarkdownFileCoverage('file:///test.md', lines);
    
    expect(coverage.statementCoverage.covered).toBe(2);
    expect(coverage.statementCoverage.total).toBe(4);
  });

  test('should handle undefined lines in coverage array', () => {
    const lines = [
      new vscode.StatementCoverage(true, new vscode.Position(0, 0)),
      undefined,
      new vscode.StatementCoverage(false, new vscode.Position(2, 0)),
      undefined,
      new vscode.StatementCoverage(true, new vscode.Position(4, 0))
    ];
    
    const coverage = new MarkdownFileCoverage('file:///test.md', lines);
    
    expect(coverage.statementCoverage.covered).toBe(2);
    expect(coverage.statementCoverage.total).toBe(3); // Only non-undefined lines counted
  });

  test('should handle numeric execution counts', () => {
    const lines = [
      new vscode.StatementCoverage(5, new vscode.Position(0, 0)), // executed 5 times
      new vscode.StatementCoverage(0, new vscode.Position(1, 0)), // not executed
      new vscode.StatementCoverage(10, new vscode.Position(2, 0)) // executed 10 times
    ];
    
    const coverage = new MarkdownFileCoverage('file:///test.md', lines);
    
    expect(coverage.statementCoverage.covered).toBe(2); // Lines with count > 0
    expect(coverage.statementCoverage.total).toBe(3);
  });

  test('should handle all undefined lines', () => {
    const lines = [undefined, undefined, undefined];
    
    const coverage = new MarkdownFileCoverage('file:///test.md', lines);
    
    expect(coverage.statementCoverage.covered).toBe(0);
    expect(coverage.statementCoverage.total).toBe(0);
  });

  test('should handle different URI formats', () => {
    const lines = [new vscode.StatementCoverage(true, new vscode.Position(0, 0))];
    
    // HTTP URI
    const httpCoverage = new MarkdownFileCoverage('http://example.com/test.md', lines);
    expect(vscode.Uri.parse).toHaveBeenCalledWith('http://example.com/test.md');
    
    // File URI
    const fileCoverage = new MarkdownFileCoverage('file:///C:/Users/test.md', lines);
    expect(vscode.Uri.parse).toHaveBeenCalledWith('file:///C:/Users/test.md');
    
    // Relative path
    const relativeCoverage = new MarkdownFileCoverage('test.md', lines);
    expect(vscode.Uri.parse).toHaveBeenCalledWith('test.md');
  });

  test('should preserve coveredLines reference', () => {
    const lines = [
      new vscode.StatementCoverage(true, new vscode.Position(0, 0)),
      new vscode.StatementCoverage(false, new vscode.Position(1, 0))
    ];
    
    const coverage = new MarkdownFileCoverage('file:///test.md', lines);
    
    expect(coverage.coveredLines).toBe(lines);
    expect(coverage.coveredLines.length).toBe(2);
  });
});