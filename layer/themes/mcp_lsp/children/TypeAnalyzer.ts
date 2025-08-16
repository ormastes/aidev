import { LSPClient } from './LSPClient';
import { TypeInfo } from '../pipe';
import {
  TextDocumentPositionParams,
  SignatureHelp
} from 'vscode-languageserver-protocol';

export class TypeAnalyzer {
  constructor(private lspClient: LSPClient) {}
  
  async getTypeAtPosition(file: string, line: number, character: number): Promise<TypeInfo | null> {
    // First try hover for quick info
    const hoverInfo = await this.getHoverInfo(file, line, character);
    if (hoverInfo) return hoverInfo;
    
    // Try signature help if we're in a function call
    const signatureInfo = await this.getSignatureHelp(file, line, character);
    if (signatureInfo) return signatureInfo;
    
    // Try definition to get symbol info
    const definitionInfo = await this.getDefinitionInfo(file, line, character);
    if (definitionInfo) return definitionInfo;
    
    return null;
  }
  
  private async getHoverInfo(file: string, line: number, character: number): Promise<TypeInfo | null> {
    const params: TextDocumentPositionParams = {
      textDocument: { uri: this.lspClient.normalizeUri(file) },
      position: { line, character }
    };
    
    try {
      const result = await this.lspClient.sendRequest('textDocument/hover', params);
      
      if (!result || !result.contents) return null;
      
      const content = this.extractContent(result.contents);
      const typeInfo = this.parseTypeInfo(content);
      
      return typeInfo;
    } catch (error) {
      console.error('Error getting hover info:', error);
      return null;
    }
  }
  
  private async getSignatureHelp(file: string, line: number, character: number): Promise<TypeInfo | null> {
    const params: TextDocumentPositionParams = {
      textDocument: { uri: this.lspClient.normalizeUri(file) },
      position: { line, character }
    };
    
    try {
      const result: SignatureHelp = await this.lspClient.sendRequest('textDocument/signatureHelp', params);
      
      if (!result || !result.signatures || result.signatures.length === 0) return null;
      
      const activeSignature = result.signatures[result.activeSignature || 0];
      
      return {
        name: this.extractFunctionName(activeSignature.label),
        kind: "function",
        signature: activeSignature.label,
        documentation: this.extractContent(activeSignature.documentation),
        type: "function"
      };
    } catch (error) {
      console.error('Error getting signature help:', error);
      return null;
    }
  }
  
  private async getDefinitionInfo(file: string, line: number, character: number): Promise<TypeInfo | null> {
    const params: TextDocumentPositionParams = {
      textDocument: { uri: this.lspClient.normalizeUri(file) },
      position: { line, character }
    };
    
    try {
      const result = await this.lspClient.sendRequest('textDocument/definition', params);
      
      if (!result) return null;
      
      // Get the symbol name from document symbols at this position
      const symbols = await this.lspClient.sendRequest('textDocument/documentSymbol', {
        textDocument: { uri: this.lspClient.normalizeUri(file) }
      });
      
      if (symbols && Array.isArray(symbols)) {
        const symbol = this.findSymbolAtPosition(symbols, line, character);
        if (symbol) {
          return {
            name: symbol.name,
            kind: this.mapSymbolKind(symbol.kind),
            type: symbol.detail || 'unknown'
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting definition info:', error);
      return null;
    }
  }
  
  private extractContent(content: any): string {
    if (!content) return '';
    
    if (typeof content === 'string') {
      return content;
    }
    
    if ('value' in content) {
      return content.value;
    }
    
    if (Array.isArray(content)) {
      return content.map(c => this.extractContent(c)).join('\n\n');
    }
    
    return '';
  }
  
  private parseTypeInfo(content: string): TypeInfo | null {
    if (!content) return null;
    
    // Try to parse TypeScript quick info format
    // Examples:
    // "(method) Array<T>.map<U>(...)"
    // "const myVar: string"
    // "function myFunc(param: string): void"
    // "interface MyInterface"
    // "class MyClass"
    
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length === 0) return null;
    
    const firstLine = lines[0];
    
    // Extract kind
    let kind = 'unknown';
    let name = '';
    let type = '';
    let signature = '';
    
    // Pattern for method/function
    const methodMatch = firstLine.match(/^\((method|function|property|const|let|var)\)\s+(.+?)(?::\s*(.+))?$/);
    if (methodMatch) {
      kind = methodMatch[1];
      const declaration = methodMatch[2];
      type = methodMatch[3] || '';
      
      // Extract name from declaration
      const nameMatch = declaration.match(/^(\w+)/);
      name = nameMatch ? nameMatch[1] : declaration;
      
      if (kind === 'method' || kind === "function") {
        signature = declaration;
      }
    }
    
    // Pattern for class/interface/type
    const typeMatch = firstLine.match(/^(class|interface|type|enum)\s+(\w+)/);
    if (typeMatch) {
      kind = typeMatch[1];
      name = typeMatch[2];
      type = kind;
    }
    
    // Pattern for const/let/var
    const varMatch = firstLine.match(/^(const|let|var)\s+(\w+):\s*(.+)$/);
    if (varMatch) {
      kind = varMatch[1];
      name = varMatch[2];
      type = varMatch[3];
    }
    
    // If we couldn't parse, use the whole content
    if (!name && !kind) {
      const simpleMatch = firstLine.match(/^(\w+)/);
      if (simpleMatch) {
        name = simpleMatch[1];
      }
    }
    
    const documentation = lines.slice(1).join('\n').trim();
    
    return {
      name: name || 'unknown',
      kind,
      type: type || undefined,
      signature: signature || undefined,
      documentation: documentation || undefined
    };
  }
  
  private extractFunctionName(signature: string): string {
    // Extract function name from signature
    // Examples: "myFunc(param: string): void" -> "myFunc"
    const match = signature.match(/^(\w+)\s*\(/);
    return match ? match[1] : "anonymous";
  }
  
  private findSymbolAtPosition(symbols: any[], line: number, character: number): any {
    for (const symbol of symbols) {
      if (this.isPositionInRange(symbol.range || symbol.location?.range, line, character)) {
        // Check children first for more specific match
        if (symbol.children && symbol.children.length > 0) {
          const child = this.findSymbolAtPosition(symbol.children, line, character);
          if (child) return child;
        }
        return symbol;
      }
    }
    return null;
  }
  
  private isPositionInRange(range: any, line: number, character: number): boolean {
    if (!range) return false;
    
    const start = range.start;
    const end = range.end;
    
    if (line < start.line || line > end.line) return false;
    if (line === start.line && character < start.character) return false;
    if (line === end.line && character > end.character) return false;
    
    return true;
  }
  
  private mapSymbolKind(kind: number): string {
    const kinds = [
      'file', 'module', "namespace", 'package', 'class',
      'method', "property", 'field', "constructor", 'enum',
      "interface", "function", "variable", "constant", 'string',
      'number', 'boolean', 'array', 'object', 'key',
      'null', "enumMember", 'struct', 'event', "operator",
      "typeParameter"
    ];
    
    return kinds[kind - 1] || 'unknown';
  }
}