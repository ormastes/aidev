/**
 * TypeScript dependency analyzer
 * Simplified version without external dependencies
 */

import * as fs from 'fs';
import * as path from 'path';
import { DependencyGraph } from './dependency-graph';
import { AnalysisResult, AnalysisOptions, DependencyNode, DependencyEdge } from './types';

export class TypeScriptAnalyzer {
  private graph: DependencyGraph;
  private visited: Set<string>;

  constructor() {
    this.graph = new DependencyGraph();
    this.visited = new Set();
  }

  async analyze(rootPath: string, options?: AnalysisOptions): Promise<AnalysisResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      this.graph.clear();
      this.visited.clear();

      // Find all TypeScript files
      const files = await this.findTypeScriptFiles(rootPath, options);
      
      // Analyze each file
      for (const file of files) {
        await this.analyzeFile(file, rootPath);
      }

      // Find circular dependencies
      const circularDependencies = this.graph.findCircularDependencies();

      return {
        success: true,
        language: 'typescript',
        total_files: files.length,
        total_dependencies: this.graph.getEdges().length,
        circular_dependencies: circularDependencies,
        analysis_time_ms: Date.now() - startTime,
        errors,
        warnings
      };
    } catch (error) {
      errors.push(`Analysis failed: ${error}`);
      return {
        success: false,
        language: 'typescript',
        total_files: 0,
        total_dependencies: 0,
        circular_dependencies: [],
        analysis_time_ms: Date.now() - startTime,
        errors,
        warnings
      };
    }
  }

  private async findTypeScriptFiles(rootPath: string, options?: AnalysisOptions): Promise<string[]> {
    const files: string[] = [];
    const excludePatterns = options?.exclude_patterns || ['node_modules', 'dist', 'build', '.git'];
    
    const walkDir = (dir: string) => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          // Skip excluded patterns
          if (excludePatterns.some(pattern => entry.name.includes(pattern))) {
            continue;
          }
          
          if (entry.isDirectory()) {
            walkDir(fullPath);
          } else if (entry.isFile() && this.isTypeScriptFile(entry.name)) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Ignore permission errors
      }
    };
    
    walkDir(rootPath);
    return files;
  }

  private isTypeScriptFile(filename: string): boolean {
    return filename.endsWith('.ts') || filename.endsWith('.tsx');
  }

  private async analyzeFile(filePath: string, rootPath: string): Promise<void> {
    if (this.visited.has(filePath)) {
      return;
    }
    this.visited.add(filePath);

    const relativePath = path.relative(rootPath, filePath);
    const nodeId = relativePath;

    // Add node to graph
    const node: DependencyNode = {
      id: nodeId,
      path: relativePath,
      type: 'file',
      language: 'typescript'
    };
    this.graph.addNode(node);

    // Read file content
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const imports = this.extractImports(content, filePath, rootPath);
      
      for (const importPath of imports) {
        const resolvedPath = this.resolveImportPath(importPath, filePath, rootPath);
        if (resolvedPath) {
          const targetRelativePath = path.relative(rootPath, resolvedPath);
          
          // Add target node if not exists
          if (!this.graph.getNodes().find(n => n.id === targetRelativePath)) {
            const targetNode: DependencyNode = {
              id: targetRelativePath,
              path: targetRelativePath,
              type: 'file',
              language: 'typescript'
            };
            this.graph.addNode(targetNode);
          }
          
          // Add edge
          const edge: DependencyEdge = {
            from: nodeId,
            to: targetRelativePath,
            type: 'import'
          };
          
          try {
            this.graph.addEdge(edge);
          } catch (error) {
            // Ignore missing node errors
          }
        }
      }
    } catch (error) {
      // Ignore file read errors
    }
  }

  private extractImports(content: string, filePath: string, rootPath: string): string[] {
    const imports: string[] = [];
    
    // Match import statements
    const importRegex = /import\s+(?:[\w\s{},*]+\s+from\s+)?['"]([^'"]+)['"]/g;
    const requireRegex = /require\s*\(['"]([^'"]+)['"]\)/g;
    const dynamicImportRegex = /import\s*\(['"]([^'"]+)['"]\)/g;
    
    let match;
    
    // Extract import statements
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (this.isLocalImport(importPath)) {
        imports.push(importPath);
      }
    }
    
    // Extract require statements
    while ((match = requireRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (this.isLocalImport(importPath)) {
        imports.push(importPath);
      }
    }
    
    // Extract dynamic imports
    while ((match = dynamicImportRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (this.isLocalImport(importPath)) {
        imports.push(importPath);
      }
    }
    
    return imports;
  }

  private isLocalImport(importPath: string): boolean {
    return importPath.startsWith('./') || importPath.startsWith('../');
  }

  private resolveImportPath(importPath: string, fromFile: string, rootPath: string): string | null {
    const dir = path.dirname(fromFile);
    let resolvedPath = path.resolve(dir, importPath);
    
    // Try with different extensions
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    
    // Check if path already has extension
    if (fs.existsSync(resolvedPath)) {
      return resolvedPath;
    }
    
    // Try adding extensions
    for (const ext of extensions) {
      const pathWithExt = resolvedPath + ext;
      if (fs.existsSync(pathWithExt)) {
        return pathWithExt;
      }
    }
    
    // Try index files
    const indexPath = path.join(resolvedPath, 'index');
    for (const ext of extensions) {
      const pathWithExt = indexPath + ext;
      if (fs.existsSync(pathWithExt)) {
        return pathWithExt;
      }
    }
    
    return null;
  }

  getName(): string {
    return 'TypeScript Analyzer';
  }

  getSupportedExtensions(): string[] {
    return ['.ts', '.tsx'];
  }

  validateOptions(options: AnalysisOptions): boolean {
    return true;
  }
}