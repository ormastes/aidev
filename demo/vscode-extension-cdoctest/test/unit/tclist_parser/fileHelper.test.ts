/**
 * Unit tests for tclist_parser/fileHelper.ts
 */

// Mock vscode module
const mockCreateTestItem = jest.fn();
const mockAddItem = jest.fn();
const mockGetItem = jest.fn();
const mockFindFiles = jest.fn();
const mockForEach = jest.fn();

jest.mock('vscode', () => ({
  workspace: {
    workspaceFolders: undefined,
    findFiles: mockFindFiles
  },
  Uri: {
    parse: jest.fn((uri: string) => ({ 
      toString: () => uri, 
      path: uri,
      fsPath: uri 
    }))
  },
  RelativePattern: class MockRelativePattern {
    constructor(public workspaceFolder: any, public pattern: string) {}
  },
  TestController: class MockTestController {
    items = {
      get: mockGetItem,
      add: mockAddItem
    };
    createTestItem = mockCreateTestItem;
  },
  TestItemCollection: class MockTestItemCollection {
    forEach = mockForEach;
  }
}), { virtual: true });

// Mock testTree module
const mockTestData = new Map();
jest.mock('../../../src/tclist_parser/testTree', () => ({
  TestFile: jest.fn().mockImplementation(() => ({})),
  testData: {
    set: (key: any, value: any) => mockTestData.set(key, value),
    get: (key: any) => mockTestData.get(key),
    has: (key: any) => mockTestData.has(key)
  }
}));

import { 
  getOrCreateFile, 
  gatherTestItems, 
  getWorkspaceTestPatterns,
  findInitialFiles 
} from '../../../src/tclist_parser/fileHelper';
import * as vscode from 'vscode';
import { TestFile, testData } from '../../../src/tclist_parser/testTree';

describe('fileHelper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTestData.clear();
  });

  describe('getOrCreateFile', () => {
    test('should return existing file if it exists', () => {
      const uri = { toString: () => 'file:///test.md', path: '/test.md' } as vscode.Uri;
      const existingItem = { id: 'existing' };
      const existingData = new TestFile();
      
      mockGetItem.mockReturnValue(existingItem);
      mockTestData.set(existingItem, existingData);
      
      const controller = {
        items: { get: mockGetItem, add: mockAddItem },
        createTestItem: mockCreateTestItem
      } as any;
      
      const result = getOrCreateFile(controller, uri);
      
      expect(result.file).toBe(existingItem);
      expect(result.data).toBe(existingData);
      expect(mockCreateTestItem).not.toHaveBeenCalled();
      expect(mockAddItem).not.toHaveBeenCalled();
    });

    test('should create new file if it does not exist', () => {
      const uri = { 
        toString: () => 'file:///path/to/test.md', 
        path: '/path/to/test.md' 
      } as vscode.Uri;
      const newItem = { id: 'new', canResolveChildren: false };
      
      mockGetItem.mockReturnValue(undefined);
      mockCreateTestItem.mockReturnValue(newItem);
      
      const controller = {
        items: { get: mockGetItem, add: mockAddItem },
        createTestItem: mockCreateTestItem
      } as any;
      
      const result = getOrCreateFile(controller, uri);
      
      expect(mockCreateTestItem).toHaveBeenCalledWith(
        'file:///path/to/test.md',
        'test.md',
        uri
      );
      expect(mockAddItem).toHaveBeenCalledWith(newItem);
      expect(result.file).toBe(newItem);
      expect(result.file.canResolveChildren).toBe(true);
      expect(mockTestData.has(newItem)).toBe(true);
    });

    test('should handle URI with no path separator', () => {
      const uri = { 
        toString: () => 'file:///test.md', 
        path: 'test.md' 
      } as vscode.Uri;
      
      mockGetItem.mockReturnValue(undefined);
      mockCreateTestItem.mockReturnValue({ id: 'new' });
      
      const controller = {
        items: { get: mockGetItem, add: mockAddItem },
        createTestItem: mockCreateTestItem
      } as any;
      
      getOrCreateFile(controller, uri);
      
      expect(mockCreateTestItem).toHaveBeenCalledWith(
        'file:///test.md',
        'test.md',
        uri
      );
    });
  });

  describe('gatherTestItems', () => {
    test('should collect all items from collection', () => {
      const items = [
        { id: '1' },
        { id: '2' },
        { id: '3' }
      ];
      
      mockForEach.mockImplementation((callback: any) => {
        items.forEach(item => callback(item));
      });
      
      const collection = { forEach: mockForEach } as any;
      const result = gatherTestItems(collection);
      
      expect(result).toEqual(items);
      expect(mockForEach).toHaveBeenCalledTimes(1);
    });

    test('should return empty array for empty collection', () => {
      mockForEach.mockImplementation((callback: any) => {
        // Don't call callback for empty collection
      });
      
      const collection = { forEach: mockForEach } as any;
      const result = gatherTestItems(collection);
      
      expect(result).toEqual([]);
    });
  });

  describe('getWorkspaceTestPatterns', () => {
    test('should return empty array when no workspace folders', () => {
      (vscode.workspace as any).workspaceFolders = undefined;
      
      const result = getWorkspaceTestPatterns();
      
      expect(result).toEqual([]);
    });

    test('should create patterns for each workspace folder', () => {
      const workspaceFolders = [
        { uri: { fsPath: '/workspace1' }, name: 'ws1' },
        { uri: { fsPath: '/workspace2' }, name: 'ws2' }
      ];
      
      (vscode.workspace as any).workspaceFolders = workspaceFolders;
      
      const result = getWorkspaceTestPatterns();
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        workspaceFolder: workspaceFolders[0],
        pattern: expect.any(vscode.RelativePattern)
      });
      expect(result[0].pattern.pattern).toBe('**/*.md');
      expect(result[1]).toEqual({
        workspaceFolder: workspaceFolders[1],
        pattern: expect.any(vscode.RelativePattern)
      });
      expect(result[1].pattern.pattern).toBe('**/*.md');
    });

    test('should handle single workspace folder', () => {
      const workspaceFolders = [
        { uri: { fsPath: '/single-workspace' }, name: 'single' }
      ];
      
      (vscode.workspace as any).workspaceFolders = workspaceFolders;
      
      const result = getWorkspaceTestPatterns();
      
      expect(result).toHaveLength(1);
      expect(result[0].workspaceFolder).toBe(workspaceFolders[0]);
    });
  });

  describe('findInitialFiles', () => {
    test('should create test items for found files', async () => {
      const files = [
        { toString: () => 'file:///test1.md', path: '/test1.md' },
        { toString: () => 'file:///test2.md', path: '/test2.md' },
        { toString: () => 'file:///test3.md', path: '/test3.md' }
      ];
      
      mockFindFiles.mockResolvedValue(files);
      mockGetItem.mockReturnValue(undefined);
      mockCreateTestItem.mockImplementation((id, label) => ({ id, label }));
      
      const controller = {
        items: { get: mockGetItem, add: mockAddItem },
        createTestItem: mockCreateTestItem
      } as any;
      
      const pattern = '**/*.md';
      await findInitialFiles(controller, pattern);
      
      expect(mockFindFiles).toHaveBeenCalledWith(pattern);
      expect(mockCreateTestItem).toHaveBeenCalledTimes(3);
      expect(mockAddItem).toHaveBeenCalledTimes(3);
    });

    test('should handle empty file list', async () => {
      mockFindFiles.mockResolvedValue([]);
      
      const controller = {
        items: { get: mockGetItem, add: mockAddItem },
        createTestItem: mockCreateTestItem
      } as any;
      
      await findInitialFiles(controller, '**/*.md');
      
      expect(mockCreateTestItem).not.toHaveBeenCalled();
      expect(mockAddItem).not.toHaveBeenCalled();
    });

    test('should skip existing files', async () => {
      const files = [
        { toString: () => 'file:///existing.md', path: '/existing.md' },
        { toString: () => 'file:///new.md', path: '/new.md' }
      ];
      
      mockFindFiles.mockResolvedValue(files);
      mockGetItem.mockImplementation((key) => 
        key === 'file:///existing.md' ? { id: 'existing' } : undefined
      );
      mockCreateTestItem.mockImplementation((id, label) => ({ id, label }));
      
      const controller = {
        items: { get: mockGetItem, add: mockAddItem },
        createTestItem: mockCreateTestItem
      } as any;
      
      await findInitialFiles(controller, '**/*.md');
      
      expect(mockCreateTestItem).toHaveBeenCalledTimes(1);
      expect(mockCreateTestItem).toHaveBeenCalledWith(
        'file:///new.md',
        'new.md',
        files[1]
      );
    });
  });
});