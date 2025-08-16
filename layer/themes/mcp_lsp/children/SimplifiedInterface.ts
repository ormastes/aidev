import { LSPManager } from './LSPManager';
import { RequestMapper } from './RequestMapper';
import { TypeAnalyzer } from './TypeAnalyzer';

/**
 * Simplified interface helper for LSP-MCP operations
 * Handles instance management automatically
 */
export class SimplifiedInterface {
  private requestMappers = new Map<string, RequestMapper>();
  private typeAnalyzers = new Map<string, TypeAnalyzer>();
  
  constructor(private lspManager: LSPManager) {}
  
  /**
   * Ensure instance exists for file and get mappers
   */
  private async ensureMappers(
    file: string | undefined, 
    instanceId: string | undefined
  ): Promise<{ requestMapper: RequestMapper; typeAnalyzer: TypeAnalyzer; instanceId: string }> {
    // If no instance specified and no instances exist, create one
    if (!instanceId && this.lspManager.listInstances().length === 0 && file) {
      instanceId = await this.lspManager.getOrCreateInstanceForFile(file);
      // Wait for initialization
      await this.waitForInitialization(instanceId);
    }
    
    // Get instance
    const instance = this.lspManager.getInstance(instanceId);
    if (!instance) {
      throw new Error(`No LSP instance found${instanceId ? ` with id '${instanceId}'` : ''}`);
    }
    
    const id = instance.id;
    
    // Create mappers if they don't exist
    if (!this.requestMappers.has(id)) {
      this.requestMappers.set(id, new RequestMapper(instance.client));
      this.typeAnalyzers.set(id, new TypeAnalyzer(instance.client));
    }
    
    return {
      requestMapper: this.requestMappers.get(id)!,
      typeAnalyzer: this.typeAnalyzers.get(id)!,
      instanceId: id
    };
  }
  
  /**
   * Wait for instance initialization with timeout
   */
  private async waitForInitialization(instanceId: string, maxWait = 5000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      const instance = this.lspManager.getInstance(instanceId);
      if (instance?.active) {
        return; // Instance is ready
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Continue anyway after timeout
    console.warn(`Instance ${instanceId} initialization timeout - continuing anyway`);
  }
  
  /**
   * Get instance for direct client access
   */
  async getInstanceClient(file?: string, instanceId?: string) {
    if (!instanceId && file) {
      instanceId = await this.lspManager.getOrCreateInstanceForFile(file);
      await this.waitForInitialization(instanceId);
    }
    
    const instance = this.lspManager.getInstance(instanceId);
    if (!instance) {
      throw new Error(`No LSP instance found${instanceId ? ` with id '${instanceId}'` : ''}`);
    }
    
    return instance.client;
  }
  
  /**
   * Clean up mappers when instance is removed
   */
  cleanupInstance(instanceId: string): void {
    this.requestMappers.delete(instanceId);
    this.typeAnalyzers.delete(instanceId);
  }
  
  // Delegate methods with auto-instance handling
  async getTypeAtPosition(file: string, line: number, character: number, instanceId?: string) {
    const { typeAnalyzer } = await this.ensureMappers(file, instanceId);
    return typeAnalyzer.getTypeAtPosition(file, line, character);
  }
  
  async goToDefinition(file: string, line: number, character: number, instanceId?: string) {
    const { requestMapper } = await this.ensureMappers(file, instanceId);
    return requestMapper.goToDefinition(file, line, character);
  }
  
  async findReferences(file: string, line: number, character: number, instanceId?: string) {
    const { requestMapper } = await this.ensureMappers(file, instanceId);
    return requestMapper.findReferences(file, line, character);
  }
  
  async getDiagnostics(file: string, instanceId?: string) {
    const { requestMapper } = await this.ensureMappers(file, instanceId);
    return requestMapper.getDiagnostics(file);
  }
  
  async getCompletions(file: string, line: number, character: number, instanceId?: string) {
    const { requestMapper } = await this.ensureMappers(file, instanceId);
    return requestMapper.getCompletions(file, line, character);
  }
  
  async getDocumentSymbols(file: string, instanceId?: string) {
    const { requestMapper } = await this.ensureMappers(file, instanceId);
    return requestMapper.getDocumentSymbols(file);
  }
  
  async getWorkspaceSymbols(query: string, instanceId?: string) {
    const { requestMapper } = await this.ensureMappers(undefined, instanceId);
    return requestMapper.getWorkspaceSymbols(query);
  }
  
  async getHover(file: string, line: number, character: number, instanceId?: string) {
    const { requestMapper } = await this.ensureMappers(file, instanceId);
    return requestMapper.getHover(file, line, character);
  }
  
  async getCodeActions(file: string, range: { start: { line: number; character: number }; end: { line: number; character: number } }, instanceId?: string) {
    const { requestMapper } = await this.ensureMappers(file, instanceId);
    return requestMapper.getCodeActions(file, range);
  }
  
  async rename(file: string, line: number, character: number, newName: string, instanceId?: string) {
    const { requestMapper } = await this.ensureMappers(file, instanceId);
    return requestMapper.rename(file, line, character, newName);
  }
}