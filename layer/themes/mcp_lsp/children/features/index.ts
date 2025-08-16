/**
 * Language Features Implementation
 * Provides code intelligence features for MCP LSP
 */

import { EventEmitter } from '../../../infra_external-log-lib/src';

// Types
export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Location {
  uri: string;
  range: Range;
}

export interface Diagnostic {
  range: Range;
  severity: DiagnosticSeverity;
  code?: string | number;
  source?: string;
  message: string;
  relatedInformation?: DiagnosticRelatedInformation[];
}

export enum DiagnosticSeverity {
  Error = 1,
  Warning = 2,
  Information = 3,
  Hint = 4,
}

export interface DiagnosticRelatedInformation {
  location: Location;
  message: string;
}

export interface CompletionItem {
  label: string;
  kind?: CompletionItemKind;
  detail?: string;
  documentation?: string | MarkupContent;
  sortText?: string;
  filterText?: string;
  insertText?: string;
  insertTextFormat?: InsertTextFormat;
  textEdit?: TextEdit;
  additionalTextEdits?: TextEdit[];
  commitCharacters?: string[];
  command?: Command;
  data?: any;
}

export enum CompletionItemKind {
  Text = 1,
  Method = 2,
  Function = 3,
  Constructor = 4,
  Field = 5,
  Variable = 6,
  Class = 7,
  Interface = 8,
  Module = 9,
  Property = 10,
  Unit = 11,
  Value = 12,
  Enum = 13,
  Keyword = 14,
  Snippet = 15,
  Color = 16,
  File = 17,
  Reference = 18,
  Folder = 19,
  EnumMember = 20,
  Constant = 21,
  Struct = 22,
  Event = 23,
  Operator = 24,
  TypeParameter = 25,
}

export enum InsertTextFormat {
  PlainText = 1,
  Snippet = 2,
}

export interface TextEdit {
  range: Range;
  newText: string;
}

export interface Command {
  title: string;
  command: string;
  arguments?: any[];
}

export interface Hover {
  contents: MarkupContent | string;
  range?: Range;
}

export interface MarkupContent {
  kind: 'plaintext' | 'markdown';
  value: string;
}

export interface DocumentSymbol {
  name: string;
  detail?: string;
  kind: SymbolKind;
  range: Range;
  selectionRange: Range;
  children?: DocumentSymbol[];
}

export enum SymbolKind {
  File = 1,
  Module = 2,
  Namespace = 3,
  Package = 4,
  Class = 5,
  Method = 6,
  Property = 7,
  Field = 8,
  Constructor = 9,
  Enum = 10,
  Interface = 11,
  Function = 12,
  Variable = 13,
  Constant = 14,
  String = 15,
  Number = 16,
  Boolean = 17,
  Array = 18,
  Object = 19,
  Key = 20,
  Null = 21,
  EnumMember = 22,
  Struct = 23,
  Event = 24,
  Operator = 25,
  TypeParameter = 26,
}

export interface CodeAction {
  title: string;
  kind?: CodeActionKind;
  diagnostics?: Diagnostic[];
  isPreferred?: boolean;
  edit?: WorkspaceEdit;
  command?: Command;
}

export type CodeActionKind = 
  | 'quickfix'
  | 'refactor'
  | 'refactor.extract'
  | 'refactor.inline'
  | 'refactor.rewrite'
  | 'source'
  | 'source.organizeImports'
  | 'source.fixAll';

export interface WorkspaceEdit {
  changes?: { [uri: string]: TextEdit[] };
  documentChanges?: (TextDocumentEdit | CreateFile | RenameFile | DeleteFile)[];
}

export interface TextDocumentEdit {
  textDocument: { uri: string; version?: number };
  edits: TextEdit[];
}

export interface CreateFile {
  kind: 'create';
  uri: string;
  options?: { overwrite?: boolean; ignoreIfExists?: boolean };
}

export interface RenameFile {
  kind: 'rename';
  oldUri: string;
  newUri: string;
  options?: { overwrite?: boolean; ignoreIfExists?: boolean };
}

export interface DeleteFile {
  kind: 'delete';
  uri: string;
  options?: { recursive?: boolean; ignoreIfNotExists?: boolean };
}

// Provider interfaces
export interface CompletionProvider {
  provideCompletionItems(
    document: TextDocument,
    position: Position,
    context?: CompletionContext
  ): Promise<CompletionItem[]>;
  
  resolveCompletionItem?(item: CompletionItem): Promise<CompletionItem>;
}

export interface CompletionContext {
  triggerKind: CompletionTriggerKind;
  triggerCharacter?: string;
}

export enum CompletionTriggerKind {
  Invoked = 1,
  TriggerCharacter = 2,
  TriggerForIncompleteCompletions = 3,
}

export interface HoverProvider {
  provideHover(
    document: TextDocument,
    position: Position
  ): Promise<Hover | null>;
}

export interface DiagnosticsProvider {
  provideDiagnostics(document: TextDocument): Promise<Diagnostic[]>;
  clearDiagnostics?(uri: string): void;
}

export interface DefinitionProvider {
  provideDefinition(
    document: TextDocument,
    position: Position
  ): Promise<Location | Location[] | null>;
}

export interface ReferencesProvider {
  provideReferences(
    document: TextDocument,
    position: Position,
    context: ReferenceContext
  ): Promise<Location[] | null>;
}

export interface ReferenceContext {
  includeDeclaration: boolean;
}

export interface DocumentSymbolProvider {
  provideDocumentSymbols(document: TextDocument): Promise<DocumentSymbol[]>;
}

export interface CodeActionProvider {
  provideCodeActions(
    document: TextDocument,
    range: Range,
    context: CodeActionContext
  ): Promise<CodeAction[]>;
  
  resolveCodeAction?(codeAction: CodeAction): Promise<CodeAction>;
}

export interface CodeActionContext {
  diagnostics: Diagnostic[];
  only?: CodeActionKind[];
}

export interface FormattingProvider {
  provideDocumentFormatting(
    document: TextDocument,
    options: FormattingOptions
  ): Promise<TextEdit[]>;
  
  provideDocumentRangeFormatting?(
    document: TextDocument,
    range: Range,
    options: FormattingOptions
  ): Promise<TextEdit[]>;
}

export interface FormattingOptions {
  tabSize: number;
  insertSpaces: boolean;
  trimTrailingWhitespace?: boolean;
  insertFinalNewline?: boolean;
  trimFinalNewlines?: boolean;
}

// Text document representation
export interface TextDocument {
  uri: string;
  languageId: string;
  version: number;
  getText(range?: Range): string;
  positionAt(offset: number): Position;
  offsetAt(position: Position): number;
  lineCount: number;
}

// Main Language Features class
export class LanguageFeatures extends EventEmitter {
  private completionProviders: Map<string, CompletionProvider>;
  private hoverProviders: Map<string, HoverProvider>;
  private diagnosticsProviders: Map<string, DiagnosticsProvider>;
  private definitionProviders: Map<string, DefinitionProvider>;
  private referencesProviders: Map<string, ReferencesProvider>;
  private documentSymbolProviders: Map<string, DocumentSymbolProvider>;
  private codeActionProviders: Map<string, CodeActionProvider>;
  private formattingProviders: Map<string, FormattingProvider>;
  private documents: Map<string, SimpleTextDocument>;

  constructor() {
    super();
    this.completionProviders = new Map();
    this.hoverProviders = new Map();
    this.diagnosticsProviders = new Map();
    this.definitionProviders = new Map();
    this.referencesProviders = new Map();
    this.documentSymbolProviders = new Map();
    this.codeActionProviders = new Map();
    this.formattingProviders = new Map();
    this.documents = new Map();
  }

  // Provider registration
  registerCompletionProvider(languageId: string, provider: CompletionProvider): void {
    this.completionProviders.set(languageId, provider);
    this.emit('providerRegistered', { type: 'completion', languageId });
  }

  registerHoverProvider(languageId: string, provider: HoverProvider): void {
    this.hoverProviders.set(languageId, provider);
    this.emit('providerRegistered', { type: 'hover', languageId });
  }

  registerDiagnosticsProvider(languageId: string, provider: DiagnosticsProvider): void {
    this.diagnosticsProviders.set(languageId, provider);
    this.emit('providerRegistered', { type: 'diagnostics', languageId });
  }

  registerDefinitionProvider(languageId: string, provider: DefinitionProvider): void {
    this.definitionProviders.set(languageId, provider);
    this.emit('providerRegistered', { type: 'definition', languageId });
  }

  registerReferencesProvider(languageId: string, provider: ReferencesProvider): void {
    this.referencesProviders.set(languageId, provider);
    this.emit('providerRegistered', { type: 'references', languageId });
  }

  registerDocumentSymbolProvider(languageId: string, provider: DocumentSymbolProvider): void {
    this.documentSymbolProviders.set(languageId, provider);
    this.emit('providerRegistered', { type: 'documentSymbol', languageId });
  }

  registerCodeActionProvider(languageId: string, provider: CodeActionProvider): void {
    this.codeActionProviders.set(languageId, provider);
    this.emit('providerRegistered', { type: 'codeAction', languageId });
  }

  registerFormattingProvider(languageId: string, provider: FormattingProvider): void {
    this.formattingProviders.set(languageId, provider);
    this.emit('providerRegistered', { type: 'formatting', languageId });
  }

  // Document management
  updateDocument(uri: string, content: string, languageId: string, version: number): void {
    let doc = this.documents.get(uri);
    
    if (!doc) {
      doc = new SimpleTextDocument(uri, content, languageId, version);
      this.documents.set(uri, doc);
    } else {
      doc.update(content, version);
    }
    
    this.emit('documentUpdated', { uri, languageId, version });
    
    // Trigger diagnostics
    this.triggerDiagnostics(uri, languageId);
  }

  removeDocument(uri: string): void {
    this.documents.delete(uri);
    this.emit('documentRemoved', { uri });
  }

  // Feature execution
  async getCompletions(
    uri: string,
    position: Position,
    context?: CompletionContext
  ): Promise<CompletionItem[]> {
    const doc = this.documents.get(uri);
    if (!doc) return [];
    
    const provider = this.completionProviders.get(doc.languageId);
    if (!provider) return [];
    
    try {
      return await provider.provideCompletionItems(doc, position, context);
    } catch (error) {
      this.emit('error', { feature: 'completion', error });
      return [];
    }
  }

  async getHover(uri: string, position: Position): Promise<Hover | null> {
    const doc = this.documents.get(uri);
    if (!doc) return null;
    
    const provider = this.hoverProviders.get(doc.languageId);
    if (!provider) return null;
    
    try {
      return await provider.provideHover(doc, position);
    } catch (error) {
      this.emit('error', { feature: 'hover', error });
      return null;
    }
  }

  async getDiagnostics(uri: string): Promise<Diagnostic[]> {
    const doc = this.documents.get(uri);
    if (!doc) return [];
    
    const provider = this.diagnosticsProviders.get(doc.languageId);
    if (!provider) return [];
    
    try {
      return await provider.provideDiagnostics(doc);
    } catch (error) {
      this.emit('error', { feature: 'diagnostics', error });
      return [];
    }
  }

  async getDefinition(uri: string, position: Position): Promise<Location | Location[] | null> {
    const doc = this.documents.get(uri);
    if (!doc) return null;
    
    const provider = this.definitionProviders.get(doc.languageId);
    if (!provider) return null;
    
    try {
      return await provider.provideDefinition(doc, position);
    } catch (error) {
      this.emit('error', { feature: 'definition', error });
      return null;
    }
  }

  async getReferences(
    uri: string,
    position: Position,
    includeDeclaration: boolean = true
  ): Promise<Location[] | null> {
    const doc = this.documents.get(uri);
    if (!doc) return null;
    
    const provider = this.referencesProviders.get(doc.languageId);
    if (!provider) return null;
    
    try {
      return await provider.provideReferences(doc, position, { includeDeclaration });
    } catch (error) {
      this.emit('error', { feature: 'references', error });
      return null;
    }
  }

  async getDocumentSymbols(uri: string): Promise<DocumentSymbol[]> {
    const doc = this.documents.get(uri);
    if (!doc) return [];
    
    const provider = this.documentSymbolProviders.get(doc.languageId);
    if (!provider) return [];
    
    try {
      return await provider.provideDocumentSymbols(doc);
    } catch (error) {
      this.emit('error', { feature: 'documentSymbol', error });
      return [];
    }
  }

  async getCodeActions(
    uri: string,
    range: Range,
    diagnostics: Diagnostic[] = []
  ): Promise<CodeAction[]> {
    const doc = this.documents.get(uri);
    if (!doc) return [];
    
    const provider = this.codeActionProviders.get(doc.languageId);
    if (!provider) return [];
    
    try {
      return await provider.provideCodeActions(doc, range, { diagnostics });
    } catch (error) {
      this.emit('error', { feature: 'codeAction', error });
      return [];
    }
  }

  formatDocument(uri: string, options: FormattingOptions): Promise<TextEdit[]> {
    const doc = this.documents.get(uri);
    if (!doc) return [];
    
    const provider = this.formattingProviders.get(doc.languageId);
    if (!provider) return [];
    
    try {
      return await provider.provideDocumentFormatting(doc, options);
    } catch (error) {
      this.emit('error', { feature: 'formatting', error });
      return [];
    }
  }

  private async triggerDiagnostics(uri: string, languageId: string): Promise<void> {
    const provider = this.diagnosticsProviders.get(languageId);
    if (!provider) return;
    
    const diagnostics = await this.getDiagnostics(uri);
    if (diagnostics.length > 0) {
      this.emit('diagnostics', { uri, diagnostics });
    }
  }

  getSupportedLanguages(): string[] {
    const languages = new Set<string>();
    
    for (const map of [
      this.completionProviders,
      this.hoverProviders,
      this.diagnosticsProviders,
      this.definitionProviders,
      this.referencesProviders,
      this.documentSymbolProviders,
      this.codeActionProviders,
      this.formattingProviders,
    ]) {
      for (const lang of map.keys()) {
        languages.add(lang);
      }
    }
    
    return Array.from(languages);
  }

  getCapabilities(languageId: string): string[] {
    const capabilities: string[] = [];
    
    if (this.completionProviders.has(languageId)) capabilities.push('completion');
    if (this.hoverProviders.has(languageId)) capabilities.push('hover');
    if (this.diagnosticsProviders.has(languageId)) capabilities.push('diagnostics');
    if (this.definitionProviders.has(languageId)) capabilities.push('definition');
    if (this.referencesProviders.has(languageId)) capabilities.push('references');
    if (this.documentSymbolProviders.has(languageId)) capabilities.push('documentSymbol');
    if (this.codeActionProviders.has(languageId)) capabilities.push('codeAction');
    if (this.formattingProviders.has(languageId)) capabilities.push('formatting');
    
    return capabilities;
  }
}

// Simple text document implementation
class SimpleTextDocument implements TextDocument {
  uri: string;
  languageId: string;
  version: number;
  private content: string;
  private lines: string[];

  constructor(uri: string, content: string, languageId: string, version: number) {
    this.uri = uri;
    this.content = content;
    this.languageId = languageId;
    this.version = version;
    this.lines = content.split('\n');
  }

  update(content: string, version: number): void {
    this.content = content;
    this.version = version;
    this.lines = content.split('\n');
  }

  getText(range?: Range): string {
    if (!range) return this.content;
    
    const start = this.offsetAt(range.start);
    const end = this.offsetAt(range.end);
    return this.content.substring(start, end);
  }

  positionAt(offset: number): Position {
    let line = 0;
    let character = offset;
    
    for (let i = 0; i < this.lines.length; i++) {
      const lineLength = this.lines[i].length + 1; // +1 for newline
      if (character < lineLength) {
        return { line: i, character };
      }
      character -= lineLength;
    }
    
    return { 
      line: this.lines.length - 1, 
      character: this.lines[this.lines.length - 1].length 
    };
  }

  offsetAt(position: Position): number {
    let offset = 0;
    
    for (let i = 0; i < position.line && i < this.lines.length; i++) {
      offset += this.lines[i].length + 1; // +1 for newline
    }
    
    if (position.line < this.lines.length) {
      offset += Math.min(position.character, this.lines[position.line].length);
    }
    
    return offset;
  }

  get lineCount(): number {
    return this.lines.length;
  }
}

export default LanguageFeatures;