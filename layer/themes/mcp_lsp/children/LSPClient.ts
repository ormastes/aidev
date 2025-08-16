import { spawn, ChildProcess } from 'child_process';
import { createConnection, StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node';
import {
  InitializeParams,
  InitializeResult,
  DidOpenTextDocumentNotification,
  DidChangeTextDocumentNotification,
  DidCloseTextDocumentNotification,
  TextDocumentIdentifier,
  TextDocumentItem,
  VersionedTextDocumentIdentifier,
  TextDocumentContentChangeEvent,
  TextEdit
} from 'vscode-languageserver-protocol';
import * as fs from 'fs/promises';
import { path } from '../../infra_external-log-lib/src';

export class LSPClient {
  private process: ChildProcess | null = null;
  private connection: any = null;
  private initialized = false;
  private workspaceRoot: string | null = null;
  private documentVersions: Map<string, number> = new Map();
  
  constructor(private tsServerPath?: string) {
    this.tsServerPath = tsServerPath || this.findTsServer();
  }
  
  private findTsServer(): string {
    // Try to find typescript-language-server in node_modules
    const possiblePaths = [
      path.join(process.cwd(), 'node_modules', '.bin', 'typescript-language-server'),
      path.join(process.cwd(), 'node_modules', 'typescript-language-server', 'lib', 'cli.mjs'),
      path.join(__dirname, '..', 'node_modules', '.bin', 'typescript-language-server'),
      'typescript-language-server' // Global installation
    ];
    
    // For now, return the first option and let the setup script handle installation
    return possiblePaths[0];
  }
  
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    // Start the language server process
    this.process = spawn('node', [this.tsServerPath!, '--stdio'], {
      shell: false,
      env: { ...process.env }
    });
    
    this.process.on('error', (err) => {
      console.error('Failed to start language server:', err);
      throw new Error(`Failed to start language server: ${err.message}`);
    });
    
    // Create connection
    this.connection = createConnection(
      new StreamMessageReader(this.process.stdout!),
      new StreamMessageWriter(this.process.stdin!)
    );
    
    // Start listening
    this.connection.listen();
    
    // Send initialize request
    const initParams: InitializeParams = {
      processId: process.pid,
      capabilities: {
        textDocument: {
          synchronization: {
            dynamicRegistration: true,
            willSave: true,
            didSave: true,
            willSaveWaitUntil: true
          },
          completion: {
            dynamicRegistration: true,
            completionItem: {
              snippetSupport: true,
              commitCharactersSupport: true,
              documentationFormat: ['markdown', 'plaintext']
            }
          },
          hover: {
            dynamicRegistration: true,
            contentFormat: ['markdown', 'plaintext']
          },
          definition: {
            dynamicRegistration: true
          },
          references: {
            dynamicRegistration: true
          },
          documentSymbol: {
            dynamicRegistration: true
          },
          codeAction: {
            dynamicRegistration: true
          },
          rename: {
            dynamicRegistration: true
          }
        },
        workspace: {
          symbol: {
            dynamicRegistration: true
          }
        }
      },
      rootUri: this.workspaceRoot ? `file://${this.workspaceRoot}` : null,
      workspaceFolders: this.workspaceRoot ? [{
        uri: `file://${this.workspaceRoot}`,
        name: path.basename(this.workspaceRoot)
      }] : []
    };
    
    await this.connection.sendRequest('initialize', initParams);
    await this.connection.sendNotification('initialized');
    
    this.initialized = true;
  }
  
  async shutdown(): Promise<void> {
    if (!this.initialized) return;
    
    await this.connection.sendRequest('shutdown');
    await this.connection.sendNotification('exit');
    
    this.process?.kill();
    this.process = null;
    this.connection = null;
    this.initialized = false;
  }
  
  async openWorkspace(rootPath: string): Promise<void> {
    this.workspaceRoot = path.resolve(rootPath);
    if (this.initialized) {
      // Reinitialize with new workspace
      await this.shutdown();
      await this.initialize();
    }
  }
  
  async closeWorkspace(): Promise<void> {
    this.workspaceRoot = null;
    if (this.initialized) {
      await this.shutdown();
    }
  }
  
  async openDocument(filePath: string, content?: string): Promise<void> {
    if (!this.initialized) await this.initialize();
    
    const uri = `file://${path.resolve(filePath)}`;
    const languageId = this.getLanguageId(filePath);
    
    if (!content) {
      content = await fs.readFile(filePath, 'utf-8');
    }
    
    const version = 1;
    this.documentVersions.set(uri, version);
    
    const textDocument: TextDocumentItem = {
      uri,
      languageId,
      version,
      text: content
    };
    
    await this.connection.sendNotification(
      DidOpenTextDocumentNotification.type,
      { textDocument }
    );
  }
  
  async updateDocument(filePath: string, changes: TextEdit[]): Promise<void> {
    if (!this.initialized) await this.initialize();
    
    const uri = `file://${path.resolve(filePath)}`;
    const currentVersion = this.documentVersions.get(uri) || 0;
    const newVersion = currentVersion + 1;
    this.documentVersions.set(uri, newVersion);
    
    const textDocument: VersionedTextDocumentIdentifier = {
      uri,
      version: newVersion
    };
    
    const contentChanges: TextDocumentContentChangeEvent[] = changes.map(edit => ({
      range: edit.range,
      text: edit.newText
    }));
    
    await this.connection.sendNotification(
      DidChangeTextDocumentNotification.type,
      { textDocument, contentChanges }
    );
  }
  
  async closeDocument(filePath: string): Promise<void> {
    if (!this.initialized) await this.initialize();
    
    const uri = `file://${path.resolve(filePath)}`;
    this.documentVersions.delete(uri);
    
    const textDocument: TextDocumentIdentifier = { uri };
    
    await this.connection.sendNotification(
      DidCloseTextDocumentNotification.type,
      { textDocument }
    );
  }
  
  async sendRequest(method: string, params: any): Promise<any> {
    if (!this.initialized) await this.initialize();
    return this.connection.sendRequest(method, params);
  }
  
  private getLanguageId(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.ts': return 'typescript';
      case '.tsx': return 'typescriptreact';
      case '.js': return 'javascript';
      case '.jsx': return 'javascriptreact';
      case '.json': return 'json';
      default: return 'plaintext';
    }
  }
  
  normalizeUri(filePath: string): string {
    return `file://${path.resolve(filePath)}`;
  }
}