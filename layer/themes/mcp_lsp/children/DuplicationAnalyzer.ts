import { LSPClient } from './LSPClient';
import { Location } from '../pipe';

export interface DuplicationInfo {
  file: string;
  locations: Location[];
  pattern: string;
  severity: 'high' | 'medium' | 'low';
}

export class DuplicationAnalyzer {
  constructor(private lspClient: LSPClient) {}
  
  /**
   * Analyze code for duplication patterns
   */
  async analyzeDuplication(files: string[]): Promise<DuplicationInfo[]> {
    const duplications: DuplicationInfo[] = [];
    const codePatterns = new Map<string, Location[]>();
    
    for (const file of files) {
      try {
        // Get document symbols to analyze structure
        const symbols = await this.getFileSymbols(file);
        
        // Extract code patterns
        for (const symbol of symbols) {
          const pattern = this.extractPattern(symbol);
          if (pattern) {
            const locations = codePatterns.get(pattern) || [];
            locations.push({
              file,
              range: symbol.location.range
            });
            codePatterns.set(pattern, locations);
          }
        }
      } catch (error) {
        console.error(`Error analyzing ${file}:`, error);
      }
    }
    
    // Find duplications
    for (const [pattern, locations] of codePatterns.entries()) {
      if (locations.length > 1) {
        duplications.push({
          file: locations[0].file,
          locations,
          pattern,
          severity: this.calculateSeverity(locations.length, pattern)
        });
      }
    }
    
    return duplications;
  }
  
  /**
   * Find similar code blocks using LSP
   */
  async findSimilarCode(file: string, startLine: number, endLine: number): Promise<Location[]> {
    // Get the code block content
    const codeBlock = await this.getCodeBlock(file, startLine, endLine);
    
    // Search for similar patterns across workspace
    const workspaceSymbols = await this.lspClient.sendRequest('workspace/symbol', {
      query: this.extractSearchQuery(codeBlock)
    });
    
    const similarLocations: Location[] = [];
    
    // Check each symbol for similarity
    for (const symbol of workspaceSymbols || []) {
      if (this.isSimilarSymbol(symbol, codeBlock)) {
        similarLocations.push({
          file: symbol.location.uri.replace('file://', ''),
          range: symbol.location.range
        });
      }
    }
    
    return similarLocations;
  }
  
  /**
   * Suggest refactoring for duplicated code
   */
  async suggestRefactoring(duplication: DuplicationInfo): Promise<{
    suggestion: string;
    refactoredCode?: string;
  }> {
    const lineCount = duplication.locations.reduce((sum, loc) => {
      return sum + (loc.range.end.line - loc.range.start.line + 1);
    }, 0);
    
    if (lineCount > 20) {
      return {
        suggestion: 'Extract this code into a shared function or class',
        refactoredCode: this.generateRefactoredCode(duplication)
      };
    } else if (lineCount > 10) {
      return {
        suggestion: 'Consider extracting this logic into a utility function'
      };
    } else {
      return {
        suggestion: 'Minor duplication - consider if extraction would improve readability'
      };
    }
  }
  
  private async getFileSymbols(file: string): Promise<any[]> {
    return await this.lspClient.sendRequest('textDocument/documentSymbol', {
      textDocument: { uri: this.lspClient.normalizeUri(file) }
    }) || [];
  }
  
  private async getCodeBlock(file: string, startLine: number, endLine: number): Promise<string> {
    // In a real implementation, this would read the file content
    // For now, return a placeholder
    return `Code block from ${file} lines ${startLine}-${endLine}`;
  }
  
  private extractPattern(symbol: any): string | null {
    // Extract a normalized pattern from symbol
    // This is simplified - real implementation would be more sophisticated
    if (symbol.kind === 6 || symbol.kind === 12) { // Method or Function
      return `${symbol.kind}:${symbol.name}`;
    }
    return null;
  }
  
  private extractSearchQuery(codeBlock: string): string {
    // Extract key identifiers from code block for searching
    const words = codeBlock.match(/\b\w+\b/g) || [];
    return words.slice(0, 3).join(' ');
  }
  
  private isSimilarSymbol(symbol: any, codeBlock: string): boolean {
    // Simplified similarity check
    return symbol.name && codeBlock.includes(symbol.name);
  }
  
  private calculateSeverity(count: number, pattern: string): 'high' | 'medium' | 'low' {
    if (count > 5) return 'high';
    if (count > 2) return 'medium';
    return 'low';
  }
  
  private generateRefactoredCode(duplication: DuplicationInfo): string {
    // Generate a suggested refactoring
    return `
// Extract common logic to a shared function
export function extractedFunction(params: any) {
  // Common logic from ${duplication.locations.length} locations
  ${duplication.pattern}
}

// Usage:
// import { extractedFunction } from './utils';
// const result = extractedFunction(params);
`;
  }
}