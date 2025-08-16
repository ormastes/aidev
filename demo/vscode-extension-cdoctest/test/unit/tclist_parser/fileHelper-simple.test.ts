import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock testData as WeakMap before importing
const mockTestData = new WeakMap();

// Mock dependencies
jest.mock('../../../src/tclist_parser/testTree', () => ({
  TestFile: jest.fn().mockImplementation(() => ({
    didResolve: false,
    updateFromDisk: jest.fn()
  })),
  testData: mockTestData
}));

jest.mock('vscode', () => ({
  Uri: {
    file: jest.fn((path: string) => ({
      toString: () => `file://${path}`,
      path: path,
      fsPath: path
    }))
  },
  RelativePattern: jest.fn((folder: any, pattern: string) => ({
    base: folder.uri ? folder.uri.fsPath : folder,
    pattern
  })),
  workspace: {
    workspaceFolders: [{
      uri: { fsPath: '/workspace' },
      name: 'TestWorkspace',
      index: 0
    }],
    findFiles: jest.fn(() => Promise.resolve([]))
  },
  TestController: {},
  TestItemCollection: {}
}));

describe('FileHelper - Simple', () => {
  let getOrCreateFile: any;
  let gatherTestItems: any;
  let getWorkspaceTestPatterns: any;
  let findInitialFiles: any;
  let TestFile: any;
  let vscode: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Clear mock data
    for (const key of [...mockTestData as any]) {
      mockTestData.delete(key);
    }
    
    // Import modules
    vscode = await import('vscode');
    const testTreeModule = await import('../../../src/tclist_parser/testTree');
    TestFile = testTreeModule.TestFile;
    
    // Import file helper functions
    const fileHelperModule = await import('../../../src/tclist_parser/fileHelper');
    getOrCreateFile = fileHelperModule.getOrCreateFile;
    gatherTestItems = fileHelperModule.gatherTestItems;
    getWorkspaceTestPatterns = fileHelperModule.getWorkspaceTestPatterns;
    findInitialFiles = fileHelperModule.findInitialFiles;
  });

  describe('getOrCreateFile', () => {
    test('should return existing file if found', () => {
      const uri = { 
        toString: () => 'file:///test/file.md',
        path: '/test/file.md',
        fsPath: '/test/file.md'
      };
      const existingItem = { 
        id: 'file:///test/file.md',
        uri,
        label: 'file.md'
      };
      const existingData = { some: 'data' };
      
      const mockController = {
        items: {
          get: jest.fn().mockReturnValue(existingItem),
          add: jest.fn()
        },
        createTestItem: jest.fn()
      };
      
      mockTestData.set(existingItem, existingData);
      
      const result = getOrCreateFile(mockController, uri);
      
      expect(result.file).toBe(existingItem);
      expect(result.data).toBe(existingData);
      expect(mockController.createTestItem).not.toHaveBeenCalled();
    });

    test('should create new file if not found', () => {
      const uri = { 
        toString: () => 'file:///test/new.md',
        path: '/test/new.md',
        fsPath: '/test/new.md'
      };
      const newItem = { 
        id: 'file:///test/new.md',
        uri,
        canResolveChildren: false
      };
      
      const mockController = {
        items: {
          get: jest.fn().mockReturnValue(undefined),
          add: jest.fn()
        },
        createTestItem: jest.fn().mockReturnValue(newItem)
      };
      
      const result = getOrCreateFile(mockController, uri);
      
      expect(mockController.createTestItem).toHaveBeenCalledWith(
        'file:///test/new.md',
        expect.any(String),
        uri
      );
      expect(mockController.items.add).toHaveBeenCalledWith(newItem);
      expect(result.file.canResolveChildren).toBe(true);
      expect(TestFile).toHaveBeenCalled();
    });
  });

  describe('gatherTestItems', () => {
    test('should collect all items from collection', () => {
      const items = [
        { id: 'item1', label: 'Test 1' },
        { id: 'item2', label: 'Test 2' },
        { id: 'item3', label: 'Test 3' }
      ];
      
      const mockCollection = {
        forEach: jest.fn((callback: Function) => {
          items.forEach(item => callback(item));
        })
      };
      
      const result = gatherTestItems(mockCollection);
      
      expect(result).toEqual(items);
      expect(mockCollection.forEach).toHaveBeenCalled();
    });

    test('should return empty array for empty collection', () => {
      const mockCollection = {
        forEach: jest.fn((callback: Function) => {
          // Don't call callback for empty collection
        })
      };
      
      const result = gatherTestItems(mockCollection);
      
      expect(result).toEqual([]);
    });
  });

  describe('getWorkspaceTestPatterns', () => {
    test('should return patterns for workspace folders', () => {
      const result = getWorkspaceTestPatterns();
      
      expect(result).toHaveLength(1);
      expect(result[0].workspaceFolder.name).toBe('TestWorkspace');
      expect(result[0].pattern).toBeDefined();
      expect(vscode.RelativePattern).toHaveBeenCalledWith(
        expect.any(Object),
        '**/*.md'
      );
    });

    test('should return empty array when no workspace folders', () => {
      vscode.workspace.workspaceFolders = undefined;
      
      const result = getWorkspaceTestPatterns();
      
      expect(result).toEqual([]);
    });

    test('should handle multiple workspace folders', () => {
      vscode.workspace.workspaceFolders = [
        { uri: { fsPath: '/workspace1' }, name: 'Workspace1', index: 0 },
        { uri: { fsPath: '/workspace2' }, name: 'Workspace2', index: 1 }
      ];
      
      const result = getWorkspaceTestPatterns();
      
      expect(result).toHaveLength(2);
      expect(result[0].workspaceFolder.name).toBe('Workspace1');
      expect(result[1].workspaceFolder.name).toBe('Workspace2');
    });
  });

  describe('findInitialFiles', () => {
    test('should create test items for found files', async () => {
      const files = [
        { toString: () => 'file:///test1.md', path: '/test1.md', fsPath: '/test1.md' },
        { toString: () => 'file:///test2.md', path: '/test2.md', fsPath: '/test2.md' }
      ];
      
      const mockController = {
        items: {
          get: jest.fn().mockReturnValue(undefined),
          add: jest.fn()
        },
        createTestItem: jest.fn((id, label) => ({
          id,
          label,
          canResolveChildren: false
        }))
      };
      
      (vscode.workspace.findFiles as jest.Mock).mockReturnValue(Promise.resolve(files));
      
      await findInitialFiles(mockController, '**/*.md');
      
      expect(vscode.workspace.findFiles).toHaveBeenCalledWith('**/*.md');
      expect(mockController.createTestItem).toHaveBeenCalledTimes(2);
      expect(mockController.items.add).toHaveBeenCalledTimes(2);
    });

    test('should handle empty file list', async () => {
      const mockController = {
        items: {
          get: jest.fn(),
          add: jest.fn()
        },
        createTestItem: jest.fn()
      };
      
      (vscode.workspace.findFiles as jest.Mock).mockReturnValue(Promise.resolve([]));
      
      await findInitialFiles(mockController, '**/*.md');
      
      expect(mockController.createTestItem).not.toHaveBeenCalled();
    });
  });
});