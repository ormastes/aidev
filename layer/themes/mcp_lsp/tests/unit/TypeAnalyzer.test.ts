import { TypeAnalyzer } from '../../children/TypeAnalyzer';
import { LSPClient } from '../../children/LSPClient';

describe("TypeAnalyzer", () => {
  let analyzer: TypeAnalyzer;
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
    
    analyzer = new TypeAnalyzer(mockClient);
  });
  
  describe("getTypeAtPosition", () => {
    it('should return type info from hover', async () => {
      const mockHoverResponse = {
        contents: '(method) Array<T>.map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[]'
      };
      
      mockClient.sendRequest.mockResolvedValueOnce(mockHoverResponse);
      
      const result = await analyzer.getTypeAtPosition('/src/test.ts', 10, 15);
      
      expect(mockClient.sendRequest).toHaveBeenCalledWith('textDocument/hover', {
        textDocument: { uri: 'file:///src/test.ts' },
        position: { line: 10, character: 15 }
      });
      
      expect(result).toEqual({
        name: 'map',
        kind: 'method',
        type: '',
        signature: 'Array<T>.map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[]',
        documentation: undefined
      });
    });
    
    it('should parse const declarations', async () => {
      const mockHoverResponse = {
        contents: 'const myVariable: string\n\nThis is a string variable for storing text.'
      };
      
      mockClient.sendRequest.mockResolvedValueOnce(mockHoverResponse);
      
      const result = await analyzer.getTypeAtPosition('/src/test.ts', 5, 10);
      
      expect(result).toEqual({
        name: "myVariable",
        kind: 'const',
        type: 'string',
        signature: undefined,
        documentation: 'This is a string variable for storing text.'
      });
    });
    
    it('should parse class declarations', async () => {
      const mockHoverResponse = {
        contents: 'class MyClass\n\nA custom class implementation.'
      };
      
      mockClient.sendRequest.mockResolvedValueOnce(mockHoverResponse);
      
      const result = await analyzer.getTypeAtPosition('/src/test.ts', 0, 6);
      
      expect(result).toEqual({
        name: 'MyClass',
        kind: 'class',
        type: 'class',
        signature: undefined,
        documentation: 'A custom class implementation.'
      });
    });
    
    it('should parse interface declarations', async () => {
      const mockHoverResponse = {
        contents: {
          kind: "markdown",
          value: 'interface User {\n  id: number;\n  name: string;\n}\n\nRepresents a user in the system.'
        }
      };
      
      mockClient.sendRequest.mockResolvedValueOnce(mockHoverResponse);
      
      const result = await analyzer.getTypeAtPosition('/src/test.ts', 2, 10);
      
      expect(result).toEqual({
        name: 'User',
        kind: "interface",
        type: "interface",
        signature: undefined,
        documentation: '  id: number;\n  name: string;\n}\n\nRepresents a user in the system.'
      });
    });
    
    it('should try signature help if hover fails', async () => {
      const mockSignatureResponse = {
        signatures: [
          {
            label: 'myFunction(param1: string, param2: number): void',
            documentation: 'A function that does something'
          }
        ],
        activeSignature: 0
      };
      
      mockClient.sendRequest
        .mockResolvedValueOnce(null) // hover fails
        .mockResolvedValueOnce(mockSignatureResponse); // signature help succeeds
      
      const result = await analyzer.getTypeAtPosition('/src/test.ts', 10, 20);
      
      expect(result).toEqual({
        name: "myFunction",
        kind: "function",
        type: "function",
        signature: 'myFunction(param1: string, param2: number): void',
        documentation: 'A function that does something'
      });
    });
    
    it('should try definition if hover and signature fail', async () => {
      const mockDefinitionResponse = {
        uri: 'file:///src/test.ts',
        range: {
          start: { line: 5, character: 0 },
          end: { line: 5, character: 10 }
        }
      };
      
      const mockSymbolsResponse = [
        {
          name: "myVariable",
          kind: 13, // Variable
          location: {
            uri: 'file:///src/test.ts',
            range: {
              start: { line: 5, character: 0 },
              end: { line: 5, character: 10 }
            }
          },
          detail: 'string'
        }
      ];
      
      mockClient.sendRequest
        .mockResolvedValueOnce(null) // hover fails
        .mockResolvedValueOnce(null) // signature help fails
        .mockResolvedValueOnce(mockDefinitionResponse) // definition succeeds
        .mockResolvedValueOnce(mockSymbolsResponse); // document symbols
      
      const result = await analyzer.getTypeAtPosition('/src/test.ts', 10, 5);
      
      expect(result).toEqual({
        name: "myVariable",
        kind: "variable",
        type: 'string'
      });
    });
    
    it('should return null if all methods fail', async () => {
      mockClient.sendRequest.mockResolvedValue(null);
      
      const result = await analyzer.getTypeAtPosition('/src/test.ts', 0, 0);
      
      expect(result).toBeNull();
    });
  });
  
  describe("parseTypeInfo", () => {
    it('should parse function signatures', async () => {
      const mockHoverResponse = {
        contents: '(function) calculateSum(a: number, b: number): number'
      };
      
      mockClient.sendRequest.mockResolvedValueOnce(mockHoverResponse);
      
      const result = await analyzer.getTypeAtPosition('/src/test.ts', 0, 0);
      
      expect(result).toEqual({
        name: "calculateSum",
        kind: "function",
        type: 'number',
        signature: 'calculateSum(a: number, b: number): number',
        documentation: undefined
      });
    });
    
    it('should parse property declarations', async () => {
      const mockHoverResponse = {
        contents: '(property) User.id: number'
      };
      
      mockClient.sendRequest.mockResolvedValueOnce(mockHoverResponse);
      
      const result = await analyzer.getTypeAtPosition('/src/test.ts', 0, 0);
      
      expect(result).toEqual({
        name: 'id',
        kind: "property",
        type: 'number',
        signature: undefined,
        documentation: undefined
      });
    });
    
    it('should parse let/var declarations', async () => {
      const mockHoverResponse = {
        contents: 'let counter: number = 0'
      };
      
      mockClient.sendRequest.mockResolvedValueOnce(mockHoverResponse);
      
      const result = await analyzer.getTypeAtPosition('/src/test.ts', 0, 0);
      
      expect(result).toEqual({
        name: 'counter',
        kind: 'let',
        type: 'number = 0',
        signature: undefined,
        documentation: undefined
      });
    });
    
    it('should handle complex markdown content', async () => {
      const mockHoverResponse = {
        contents: {
          kind: "markdown",
          value: '```typescript\ntype Result<T> = { success: true; data: T } | { success: false; error: string }\n```\n\nA discriminated union type for handling results.'
        }
      };
      
      mockClient.sendRequest.mockResolvedValueOnce(mockHoverResponse);
      
      const result = await analyzer.getTypeAtPosition('/src/test.ts', 0, 0);
      
      expect(result).toEqual({
        name: 'Result',
        kind: 'type',
        type: 'type',
        signature: undefined,
        documentation: '\n\nA discriminated union type for handling results.'
      });
    });
  });
  
  describe('error handling', () => {
    it('should handle errors gracefully', async () => {
      mockClient.sendRequest.mockRejectedValue(new Error('Connection failed'));
      
      const result = await analyzer.getTypeAtPosition('/src/test.ts', 0, 0);
      
      expect(result).toBeNull();
    });
    
    it('should handle malformed responses', async () => {
      mockClient.sendRequest.mockResolvedValueOnce({ unexpected: 'format' });
      
      const result = await analyzer.getTypeAtPosition('/src/test.ts', 0, 0);
      
      expect(result).toBeNull();
    });
  });
});