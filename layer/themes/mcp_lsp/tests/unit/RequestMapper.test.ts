import { RequestMapper } from '../../children/RequestMapper';
import { LSPClient } from '../../children/LSPClient';

describe('RequestMapper', () => {
  let mapper: RequestMapper;
  let mockClient: jest.Mocked<LSPClient>;
  
  beforeEach(() => {
    // Create mock LSP client
    mockClient = {
      normalizeUri: jest.fn((path) => `file://${path}`),
      sendRequest: jest.fn(),
      initialize: jest.fn(),
      shutdown: jest.fn(),
      openWorkspace: jest.fn(),
      closeWorkspace: jest.fn(),
      openDocument: jest.fn(),
      updateDocument: jest.fn(),
      closeDocument: jest.fn()
    } as any;
    
    mapper = new RequestMapper(mockClient);
  });
  
  describe('goToDefinition', () => {
    it('should map LSP definition response to Location array', async () => {
      const mockLSPResponse = {
        uri: 'file:///src/test.ts',
        range: {
          start: { line: 10, character: 5 },
          end: { line: 10, character: 15 }
        }
      };
      
      mockClient.sendRequest.mockResolvedValue(mockLSPResponse);
      
      const result = await mapper.goToDefinition('/src/test.ts', 5, 10);
      
      expect(mockClient.sendRequest).toHaveBeenCalledWith('textDocument/definition', {
        textDocument: { uri: 'file:///src/test.ts' },
        position: { line: 5, character: 10 }
      });
      
      expect(result).toEqual([{
        file: '/src/test.ts',
        range: {
          start: { line: 10, character: 5 },
          end: { line: 10, character: 15 }
        }
      }]);
    });
    
    it('should handle array of locations', async () => {
      const mockLSPResponse = [
        {
          uri: 'file:///src/file1.ts',
          range: {
            start: { line: 1, character: 0 },
            end: { line: 1, character: 10 }
          }
        },
        {
          uri: 'file:///src/file2.ts',
          range: {
            start: { line: 2, character: 0 },
            end: { line: 2, character: 20 }
          }
        }
      ];
      
      mockClient.sendRequest.mockResolvedValue(mockLSPResponse);
      
      const result = await mapper.goToDefinition('/src/test.ts', 0, 0);
      
      expect(result).toHaveLength(2);
      expect(result[0].file).toBe('/src/file1.ts');
      expect(result[1].file).toBe('/src/file2.ts');
    });
    
    it('should return empty array when no definition found', async () => {
      mockClient.sendRequest.mockResolvedValue(null);
      
      const result = await mapper.goToDefinition('/src/test.ts', 0, 0);
      
      expect(result).toEqual([]);
    });
  });
  
  describe('findReferences', () => {
    it('should find all references including declaration', async () => {
      const mockLSPResponse = [
        {
          uri: 'file:///src/def.ts',
          range: {
            start: { line: 5, character: 10 },
            end: { line: 5, character: 20 }
          }
        },
        {
          uri: 'file:///src/usage.ts',
          range: {
            start: { line: 15, character: 5 },
            end: { line: 15, character: 15 }
          }
        }
      ];
      
      mockClient.sendRequest.mockResolvedValue(mockLSPResponse);
      
      const result = await mapper.findReferences('/src/def.ts', 5, 15);
      
      expect(mockClient.sendRequest).toHaveBeenCalledWith('textDocument/references', {
        textDocument: { uri: 'file:///src/def.ts' },
        position: { line: 5, character: 15 },
        context: { includeDeclaration: true }
      });
      
      expect(result).toHaveLength(2);
      expect(result[0].file).toBe('/src/def.ts');
      expect(result[1].file).toBe('/src/usage.ts');
    });
  });
  
  describe('getCompletions', () => {
    it('should map completion items correctly', async () => {
      const mockLSPResponse = {
        items: [
          {
            label: 'console',
            kind: 6, // Variable
            detail: 'const console: Console',
            documentation: 'The console object provides access to the browser debugging console.',
            insertText: 'console'
          },
          {
            label: 'log',
            kind: 2, // Method
            detail: '(method) Console.log(...data: any[]): void',
            insertText: 'log($1)',
            sortText: '0'
          }
        ]
      };
      
      mockClient.sendRequest.mockResolvedValue(mockLSPResponse);
      
      const result = await mapper.getCompletions('/src/test.ts', 10, 5);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        label: 'console',
        kind: 'variable',
        detail: 'const console: Console',
        documentation: 'The console object provides access to the browser debugging console.',
        insertText: 'console',
        sortText: undefined
      });
      expect(result[1]).toEqual({
        label: 'log',
        kind: 'method',
        detail: '(method) Console.log(...data: any[]): void',
        documentation: undefined,
        insertText: 'log($1)',
        sortText: '0'
      });
    });
    
    it('should handle completion list format', async () => {
      const mockLSPResponse = [
        { label: 'item1', kind: 1 },
        { label: 'item2', kind: 2 }
      ];
      
      mockClient.sendRequest.mockResolvedValue(mockLSPResponse);
      
      const result = await mapper.getCompletions('/src/test.ts', 0, 0);
      
      expect(result).toHaveLength(2);
      expect(result[0].label).toBe('item1');
      expect(result[1].label).toBe('item2');
    });
  });
  
  describe('getDocumentSymbols', () => {
    it('should handle SymbolInformation array', async () => {
      const mockLSPResponse = [
        {
          name: 'MyClass',
          kind: 5, // Class
          location: {
            uri: 'file:///src/test.ts',
            range: {
              start: { line: 0, character: 0 },
              end: { line: 10, character: 1 }
            }
          },
          containerName: undefined
        },
        {
          name: 'myMethod',
          kind: 6, // Method
          location: {
            uri: 'file:///src/test.ts',
            range: {
              start: { line: 2, character: 2 },
              end: { line: 5, character: 3 }
            }
          },
          containerName: 'MyClass'
        }
      ];
      
      mockClient.sendRequest.mockResolvedValue(mockLSPResponse);
      
      const result = await mapper.getDocumentSymbols('/src/test.ts');
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'MyClass',
        kind: 'class',
        location: {
          file: '/src/test.ts',
          range: {
            start: { line: 0, character: 0 },
            end: { line: 10, character: 1 }
          }
        },
        containerName: undefined
      });
      expect(result[1].containerName).toBe('MyClass');
    });
    
    it('should handle DocumentSymbol hierarchy', async () => {
      const mockLSPResponse = [
        {
          name: 'MyClass',
          kind: 5, // Class
          range: {
            start: { line: 0, character: 0 },
            end: { line: 10, character: 1 }
          },
          selectionRange: {
            start: { line: 0, character: 6 },
            end: { line: 0, character: 13 }
          },
          children: [
            {
              name: 'constructor',
              kind: 9, // Constructor
              range: {
                start: { line: 1, character: 2 },
                end: { line: 3, character: 3 }
              },
              selectionRange: {
                start: { line: 1, character: 2 },
                end: { line: 1, character: 13 }
              }
            }
          ]
        }
      ];
      
      mockClient.sendRequest.mockResolvedValue(mockLSPResponse);
      
      const result = await mapper.getDocumentSymbols('/src/test.ts');
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('MyClass');
      expect(result[0].containerName).toBeUndefined();
      expect(result[1].name).toBe('constructor');
      expect(result[1].containerName).toBe('MyClass');
    });
  });
  
  describe('getHover', () => {
    it('should extract hover content from string', async () => {
      const mockLSPResponse = {
        contents: 'const x: number'
      };
      
      mockClient.sendRequest.mockResolvedValue(mockLSPResponse);
      
      const result = await mapper.getHover('/src/test.ts', 0, 5);
      
      expect(result).toEqual({ contents: 'const x: number' });
    });
    
    it('should extract hover content from MarkupContent', async () => {
      const mockLSPResponse = {
        contents: {
          kind: 'markdown',
          value: '```typescript\nconst x: number\n```\n\nA number variable'
        }
      };
      
      mockClient.sendRequest.mockResolvedValue(mockLSPResponse);
      
      const result = await mapper.getHover('/src/test.ts', 0, 5);
      
      expect(result).toEqual({ 
        contents: '```typescript\nconst x: number\n```\n\nA number variable' 
      });
    });
    
    it('should handle array of contents', async () => {
      const mockLSPResponse = {
        contents: [
          'Type: number',
          { language: 'typescript', value: 'const x: number' }
        ]
      };
      
      mockClient.sendRequest.mockResolvedValue(mockLSPResponse);
      
      const result = await mapper.getHover('/src/test.ts', 0, 5);
      
      expect(result).toEqual({ 
        contents: 'Type: number\n\nconst x: number' 
      });
    });
    
    it('should return null when no hover info', async () => {
      mockClient.sendRequest.mockResolvedValue(null);
      
      const result = await mapper.getHover('/src/test.ts', 0, 5);
      
      expect(result).toBeNull();
    });
  });
  
  describe('rename', () => {
    it('should map workspace edit correctly', async () => {
      const mockLSPResponse = {
        changes: {
          'file:///src/file1.ts': [
            {
              range: {
                start: { line: 5, character: 10 },
                end: { line: 5, character: 20 }
              },
              newText: 'newName'
            },
            {
              range: {
                start: { line: 10, character: 5 },
                end: { line: 10, character: 15 }
              },
              newText: 'newName'
            }
          ],
          'file:///src/file2.ts': [
            {
              range: {
                start: { line: 3, character: 0 },
                end: { line: 3, character: 10 }
              },
              newText: 'newName'
            }
          ]
        }
      };
      
      mockClient.sendRequest.mockResolvedValue(mockLSPResponse);
      
      const result = await mapper.rename('/src/file1.ts', 5, 15, 'newName');
      
      expect(mockClient.sendRequest).toHaveBeenCalledWith('textDocument/rename', {
        textDocument: { uri: 'file:///src/file1.ts' },
        position: { line: 5, character: 15 },
        newName: 'newName'
      });
      
      expect(result.changes['/src/file1.ts']).toHaveLength(2);
      expect(result.changes['/src/file2.ts']).toHaveLength(1);
      expect(result.changes['/src/file1.ts'][0].newText).toBe('newName');
    });
    
    it('should return empty edit when rename fails', async () => {
      mockClient.sendRequest.mockResolvedValue(null);
      
      const result = await mapper.rename('/src/test.ts', 0, 0, 'newName');
      
      expect(result).toEqual({ changes: {} });
    });
  });
});