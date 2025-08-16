import { LSPClient } from './LSPClient';
import {
  Location as LSPLocation,
  Diagnostic as LSPDiagnostic,
  CompletionItem as LSPCompletionItem,
  DocumentSymbol as LSPDocumentSymbol,
  SymbolInformation as LSPSymbolInformation,
  Hover as LSPHover,
  CodeAction as LSPCodeAction,
  WorkspaceEdit as LSPWorkspaceEdit,
  TextDocumentPositionParams,
  CompletionParams,
  CodeActionParams,
  RenameParams,
  DiagnosticSeverity,
  SymbolKind,
  CompletionItemKind
} from 'vscode-languageserver-protocol';
import {
  SymbolInfo,
  TextEdit
} from '../pipe';

export class RequestMapper {
  constructor(private lspClient: LSPClient) {}
  
  async goToDefinition(file: string, line: number, character: number): Promise<Location[]> {
    const params: TextDocumentPositionParams = {
      textDocument: { uri: this.lspClient.normalizeUri(file) },
      position: { line, character }
    };
    
    const result = await this.lspClient.sendRequest('textDocument/definition', params);
    
    if (!result) return [];
    
    const locations = Array.isArray(result) ? result : [result];
    return locations.map(this.mapLSPLocation);
  }
  
  async findReferences(file: string, line: number, character: number): Promise<Location[]> {
    const params = {
      textDocument: { uri: this.lspClient.normalizeUri(file) },
      position: { line, character },
      context: { includeDeclaration: true }
    };
    
    const result = await this.lspClient.sendRequest('textDocument/references', params);
    
    if (!result || !Array.isArray(result)) return [];
    
    return result.map(this.mapLSPLocation);
  }
  
  async getDiagnostics(_file: string): Promise<Diagnostic[]> {
    // For diagnostics, we need to use the publishDiagnostics notification
    // This is typically pushed by the server, so we might need to cache them
    // For now, return empty array - in a real implementation, we'd cache diagnostics
    return [];
  }
  
  async getCompletions(file: string, line: number, character: number): Promise<CompletionItem[]> {
    const params: CompletionParams = {
      textDocument: { uri: this.lspClient.normalizeUri(file) },
      position: { line, character }
    };
    
    const result = await this.lspClient.sendRequest('textDocument/completion', params);
    
    if (!result) return [];
    
    const items = Array.isArray(result) ? result : result.items || [];
    return items.map(this.mapLSPCompletionItem);
  }
  
  async getDocumentSymbols(file: string): Promise<SymbolInfo[]> {
    const params = {
      textDocument: { uri: this.lspClient.normalizeUri(file) }
    };
    
    const result = await this.lspClient.sendRequest('textDocument/documentSymbol', params);
    
    if (!result || !Array.isArray(result)) return [];
    
    // Handle both DocumentSymbol[] and SymbolInformation[]
    if (result.length > 0 && "location" in result[0]) {
      // SymbolInformation[]
      return result.map((sym: LSPSymbolInformation) => this.mapLSPSymbolInformation(sym));
    } else {
      // DocumentSymbol[] - flatten hierarchy
      return this.flattenDocumentSymbols(result as LSPDocumentSymbol[], file);
    }
  }
  
  async getWorkspaceSymbols(query: string): Promise<SymbolInfo[]> {
    const params = { query };
    
    const result = await this.lspClient.sendRequest('workspace/symbol', params);
    
    if (!result || !Array.isArray(result)) return [];
    
    return result.map((sym: LSPSymbolInformation) => this.mapLSPSymbolInformation(sym));
  }
  
  async getHover(file: string, line: number, character: number): Promise<{ contents: string } | null> {
    const params: TextDocumentPositionParams = {
      textDocument: { uri: this.lspClient.normalizeUri(file) },
      position: { line, character }
    };
    
    const result: LSPHover = await this.lspClient.sendRequest('textDocument/hover', params);
    
    if (!result || !result.contents) return null;
    
    let contents = '';
    if (typeof result.contents === 'string') {
      contents = result.contents;
    } else if ('value' in result.contents) {
      contents = result.contents.value;
    } else if (Array.isArray(result.contents)) {
      contents = result.contents.map((c: any) => typeof c === 'string' ? c : c.value).join('\n\n');
    }
    
    return { contents };
  }
  
  async getCodeActions(file: string, range: { start: Position; end: Position }): Promise<CodeAction[]> {
    const params: CodeActionParams = {
      textDocument: { uri: this.lspClient.normalizeUri(file) },
      range: {
        start: { line: range.start.line, character: range.start.character },
        end: { line: range.end.line, character: range.end.character }
      },
      context: { diagnostics: [] }
    };
    
    const result = await this.lspClient.sendRequest('textDocument/codeAction', params);
    
    if (!result || !Array.isArray(result)) return [];
    
    return result.map((action: LSPCodeAction) => this.mapLSPCodeAction(action));
  }
  
  async rename(file: string, line: number, character: number, newName: string): Promise<WorkspaceEdit> {
    const params: RenameParams = {
      textDocument: { uri: this.lspClient.normalizeUri(file) },
      position: { line, character },
      newName
    };
    
    const result: LSPWorkspaceEdit = await this.lspClient.sendRequest('textDocument/rename', params);
    
    if (!result) return { changes: {} };
    
    return this.mapLSPWorkspaceEdit(result);
  }
  
  // Mapping functions
  private mapLSPLocation = (loc: LSPLocation): Location => {
    const filePath = loc.uri.replace('file://', '');
    return {
      file: filePath,
      range: {
        start: { line: loc.range.start.line, character: loc.range.start.character },
        end: { line: loc.range.end.line, character: loc.range.end.character }
      }
    };
  };
  
  private mapLSPDiagnostic = (diag: LSPDiagnostic, file: string): Diagnostic => {
    return {
      severity: this.mapDiagnosticSeverity(diag.severity || DiagnosticSeverity.Error),
      message: diag.message,
      location: {
        file,
        range: {
          start: { line: diag.range.start.line, character: diag.range.start.character },
          end: { line: diag.range.end.line, character: diag.range.end.character }
        }
      },
      code: diag.code?.toString(),
      source: diag.source
    };
  };
  
  private mapDiagnosticSeverity(severity: DiagnosticSeverity): 'error' | 'warning' | 'info' | 'hint' {
    switch (severity) {
      case DiagnosticSeverity.Error: return 'error';
      case DiagnosticSeverity.Warning: return 'warning';
      case DiagnosticSeverity.Information: return 'info';
      case DiagnosticSeverity.Hint: return 'hint';
      default: return 'info';
    }
  }
  
  private mapLSPCompletionItem = (item: LSPCompletionItem): CompletionItem => {
    return {
      label: item.label,
      kind: this.mapCompletionItemKind(item.kind),
      detail: item.detail,
      documentation: typeof item.documentation === 'string' 
        ? item.documentation 
        : item.documentation?.value,
      insertText: item.insertText || item.label,
      sortText: item.sortText
    };
  };
  
  private mapCompletionItemKind(kind?: CompletionItemKind): string {
    if (!kind) return 'text';
    
    const kinds = [
      'text', 'method', "function", "constructor", 'field',
      "variable", 'class', "interface", 'module', "property",
      'unit', 'value', 'enum', 'keyword', 'snippet',
      'color', 'file', "reference", 'folder', "enumMember",
      "constant", 'struct', 'event', "operator", "typeParameter"
    ];
    
    return kinds[kind - 1] || 'text';
  }
  
  private mapLSPSymbolInformation = (sym: LSPSymbolInformation): SymbolInfo => {
    return {
      name: sym.name,
      kind: this.mapSymbolKind(sym.kind),
      location: this.mapLSPLocation(sym.location),
      containerName: sym.containerName
    };
  };
  
  private mapSymbolKind(kind: SymbolKind): string {
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
  
  private flattenDocumentSymbols(symbols: LSPDocumentSymbol[], file: string): SymbolInfo[] {
    const result: SymbolInfo[] = [];
    
    const flatten = (sym: LSPDocumentSymbol, containerName?: string) => {
      result.push({
        name: sym.name,
        kind: this.mapSymbolKind(sym.kind),
        location: {
          file,
          range: {
            start: { line: sym.range.start.line, character: sym.range.start.character },
            end: { line: sym.range.end.line, character: sym.range.end.character }
          }
        },
        containerName
      });
      
      if (sym.children) {
        for (const child of sym.children) {
          flatten(child, sym.name);
        }
      }
    };
    
    for (const sym of symbols) {
      flatten(sym);
    }
    
    return result;
  }
  
  private mapLSPCodeAction = (action: LSPCodeAction): CodeAction => {
    return {
      title: action.title,
      kind: action.kind || "quickfix",
      diagnostics: action.diagnostics?.map((d: any) => this.mapLSPDiagnostic(d, '')),
      edit: action.edit ? this.mapLSPWorkspaceEdit(action.edit) : undefined
    };
  };
  
  private mapLSPWorkspaceEdit = (edit: LSPWorkspaceEdit): WorkspaceEdit => {
    const changes: Record<string, TextEdit[]> = {};
    
    if (edit.changes) {
      for (const [uri, edits] of Object.entries(edit.changes)) {
        const file = uri.replace('file://', '');
        changes[file] = (edits as any[]).map((e: any) => ({
          range: {
            start: { line: e.range.start.line, character: e.range.start.character },
            end: { line: e.range.end.line, character: e.range.end.character }
          },
          newText: e.newText
        }));
      }
    }
    
    return { changes };
  };
}