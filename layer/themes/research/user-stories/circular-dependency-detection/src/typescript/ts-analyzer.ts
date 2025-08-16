import { fileAPI } from '../utils/file-api';
/**
 * TypeScript circular dependency analyzer
 */

import * as fs from 'fs-extra';
import { path } from '../../../../../infra_external-log-lib/src';
import * as glob from 'glob';
const madge = require('madge');
import { execSync } from 'child_process';
import { DependencyGraph } from '../core/dependency-graph';
import { LanguageAnalyzer, AnalysisResult, AnalysisOptions, DependencyNode, DependencyEdge } from '../core/types';

export class TypeScriptAnalyzer implements LanguageAnalyzer {
  private dependencyGraph: DependencyGraph;

  constructor() {
    this.dependencyGraph = new DependencyGraph();
  }

  getName(): string {
    return "TypeScript";
  }

  getSupportedExtensions(): string[] {
    return ['.ts', '.tsx', '.js', '.jsx', '.mjs'];
  }

  validateOptions(options: AnalysisOptions): boolean {
    // Validate TypeScript-specific options
    return true;
  }

  async analyze(rootPath: string, options: AnalysisOptions = {}): Promise<AnalysisResult> {
    const startTime = Date.now();
    const result: AnalysisResult = {
      success: false,
      language: "typescript",
      total_files: 0,
      total_dependencies: 0,
      circular_dependencies: [],
      analysis_time_ms: 0,
      errors: [],
      warnings: []
    };

    try {
      // Clear previous analysis
      this.dependencyGraph.clear();

      // Step 1: Use Madge for primary analysis
      const madgeResults = await this.analyzeMadge(rootPath, options);
      
      // Step 2: Use dependency-cruiser for advanced analysis
      const cruiserResults = await this.analyzeDependencyCruiser(rootPath, options);

      // Step 3: Use ds tool for simple detection
      const dsResults = await this.analyzeDs(rootPath, options);

      // Step 4: Custom AST-based analysis for additional detection
      const customResults = await this.analyzeCustom(rootPath, options);

      // Merge results
      this.mergeResults(result, [madgeResults, cruiserResults, dsResults, customResults]);

      // Find circular dependencies using our graph
      result.circular_dependencies = this.dependencyGraph.findCircularDependencies();
      result.success = true;

    } catch (error) {
      result.errors.push(`Analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    result.analysis_time_ms = Date.now() - startTime;
    return result;
  }

  private async analyzeMadge(rootPath: string, options: AnalysisOptions): Promise<Partial<AnalysisResult>> {
    try {
      const madgeOptions = {
        fileExtensions: this.getSupportedExtensions().map(ext => ext.substring(1)),
        excludeRegExp: options.exclude_patterns?.map(pattern => new RegExp(pattern)),
        includeNpm: options.follow_external || false,
        detectiveOptions: {
          ts: {
            skipTypeImports: !options.include_dev_dependencies
          }
        }
      };

      const madgeInstance = await madge(rootPath, madgeOptions);
      const dependencies = madgeInstance.obj();
      const circular = madgeInstance.circular();

      // Build graph from madge results
      this.buildGraphFromMadge(dependencies, rootPath);

      return {
        total_files: Object.keys(dependencies).length,
        total_dependencies: this.countTotalDependencies(dependencies),
        circular_dependencies: circular.map((cycle: any) => ({
          cycle,
          type: 'import',
          severity: 'warning',
          description: `Import cycle detected: ${cycle.join(' → ')}`,
          suggestions: [
            'Consider extracting common functionality to a separate module',
            'Use dynamic imports to break the cycle',
            'Implement dependency injection pattern'
          ],
          affected_files: cycle
        })),
        warnings: circular.length > 0 ? [`Found ${circular.length} circular dependencies with Madge`] : []
      };

    } catch (error) {
      return {
        errors: [`Madge analysis failed: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  private async analyzeDependencyCruiser(rootPath: string, options: AnalysisOptions): Promise<Partial<AnalysisResult>> {
    try {
      // Check if dependency-cruiser is available
      try {
        execSync('which depcruise', { stdio: 'ignore' });
      } catch {
        return {
          warnings: ['dependency-cruiser not found, skipping advanced analysis']
        };
      }

      const cruiseOptions = {
        exclude: options.exclude_patterns?.join('|') || '',
        includeOnly: options.include_patterns?.join('|') || '',
        maxDepth: options.max_depth || 0,
        outputType: 'json',
        validate: true
      };

      const command = `depcruise --output-type json ${rootPath}`;
      const output = execSync(command, { encoding: 'utf-8' });
      const results = JSON.parse(output);

      // Process dependency cruiser results
      const cycles = this.extractCyclesFromCruiser(results);

      return {
        circular_dependencies: cycles,
        warnings: cycles.length > 0 ? [`Found ${cycles.length} cycles with dependency-cruiser`] : []
      };

    } catch (error) {
      return {
        warnings: [`Dependency Cruiser analysis failed: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  private async analyzeDs(rootPath: string, options: AnalysisOptions): Promise<Partial<AnalysisResult>> {
    try {
      // Check if ds tool is available
      try {
        execSync('which ds', { stdio: 'ignore' });
      } catch {
        return {
          warnings: ['ds tool not found, installing via npm...']
        };
      }

      const command = `cd "${rootPath}" && ds --json`;
      const output = execSync(command, { encoding: 'utf-8' });
      const results = JSON.parse(output);

      const cycles = results.cycles || [];
      
      return {
        circular_dependencies: cycles.map((cycle: string[]) => ({
          cycle,
          type: 'import',
          severity: 'info',
          description: `Simple cycle detected: ${cycle.join(' → ')}`,
          suggestions: ['Review dependency structure'],
          affected_files: cycle
        })),
        warnings: cycles.length > 0 ? [`Found ${cycles.length} cycles with ds`] : []
      };

    } catch (error) {
      return {
        warnings: [`ds analysis failed: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  private async analyzeCustom(rootPath: string, options: AnalysisOptions): Promise<Partial<AnalysisResult>> {
    try {
      // Custom AST-based analysis
      const pattern = path.join(rootPath, '**/*.{ts,tsx,js,jsx}');
      const files = glob.sync(pattern, {
        ignore: options.exclude_patterns || ['**/node_modules/**', '**/dist/**']
      });

      let totalDependencies = 0;
      const fileMap = new Map<string, string[]>();

      // Parse each file for imports
      for (const filePath of files) {
        const imports = await this.extractImports(filePath, rootPath);
        fileMap.set(filePath, imports);
        totalDependencies += imports.length;

        // Add to graph
        const node: DependencyNode = {
          id: filePath,
          path: filePath,
          type: 'file',
          language: "typescript",
          metadata: {
            size: (await /* FRAUD_FIX: fs.stat(filePath) */).size,
            imports: imports.length
          }
        };

        this.dependencyGraph.addNode(node);
      }

      // Add edges
      for (const [filePath, imports] of fileMap) {
        for (const importPath of imports) {
          const resolvedPath = this.resolveImportPath(importPath, filePath, files);
          if (resolvedPath && fileMap.has(resolvedPath)) {
            const edge: DependencyEdge = {
              from: filePath,
              to: resolvedPath,
              type: 'import',
              metadata: { import_path: importPath }
            };

            try {
              this.dependencyGraph.addEdge(edge);
            } catch (error) {
              // Node might not exist, skip edge
            }
          }
        }
      }

      return {
        total_files: files.length,
        total_dependencies: totalDependencies
      };

    } catch (error) {
      return {
        errors: [`Custom analysis failed: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  private buildGraphFromMadge(dependencies: Record<string, string[]>, rootPath: string): void {
    // Add nodes
    for (const filePath of Object.keys(dependencies)) {
      const fullPath = path.resolve(rootPath, filePath);
      const node: DependencyNode = {
        id: fullPath,
        path: fullPath,
        type: 'file',
        language: "typescript"
      };

      this.dependencyGraph.addNode(node);
    }

    // Add edges
    for (const [filePath, deps] of Object.entries(dependencies)) {
      const fullFromPath = path.resolve(rootPath, filePath);
      for (const dep of deps) {
        const fullToPath = path.resolve(rootPath, dep);
        const edge: DependencyEdge = {
          from: fullFromPath,
          to: fullToPath,
          type: 'import'
        };

        try {
          this.dependencyGraph.addEdge(edge);
        } catch (error) {
          // Skip edges where nodes don't exist
        }
      }
    }
  }

  private countTotalDependencies(dependencies: Record<string, string[]>): number {
    return Object.values(dependencies).reduce((total, deps) => total + deps.length, 0);
  }

  private extractCyclesFromCruiser(results: any): any[] {
    // Extract cycles from dependency-cruiser results
    const cycles: any[] = [];
    
    if (results.summary?.violations) {
      for (const violation of results.summary.violations) {
        if (violation.type === 'cycle') {
          cycles.push({
            cycle: violation.cycle,
            type: 'import',
            severity: 'warning',
            description: violation.comment || 'Cycle detected',
            suggestions: ['Refactor to remove circular dependency'],
            affected_files: violation.cycle
          });
        }
      }
    }

    return cycles;
  }

  private async extractImports(filePath: string, rootPath: string): Promise<string[]> {
    try {
      const content = await fileAPI.readFile(filePath, 'utf-8');
      const imports: string[] = [];

      // Basic regex patterns for different import types
      const patterns = [
        /import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g,  // import ... from '...'
        /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,      // import('...')
        /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,     // require('...')
        /import\s+['"`]([^'"`]+)['"`]/g                 // import '...'
      ];

      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const importPath = match[1];
          if (importPath && !importPath.startsWith('node:') && !this.isExternalModule(importPath)) {
            imports.push(importPath);
          }
        }
      }

      return [...new Set(imports)]; // Remove duplicates

    } catch (error) {
      return [];
    }
  }

  private resolveImportPath(importPath: string, fromFile: string, allFiles: string[]): string | null {
    const fromDir = path.dirname(fromFile);
    
    // Handle relative imports
    if (importPath.startsWith('.')) {
      const resolved = path.resolve(fromDir, importPath);
      
      // Try different extensions
      for (const ext of this.getSupportedExtensions()) {
        const withExt = resolved + ext;
        if (allFiles.includes(withExt)) {
          return withExt;
        }
        
        // Try index files
        const indexFile = path.join(resolved, 'index' + ext);
        if (allFiles.includes(indexFile)) {
          return indexFile;
        }
      }
    }

    return null;
  }

  private isExternalModule(importPath: string): boolean {
    // Check if it's an external npm module
    return !importPath.startsWith('.') && !importPath.startsWith('/') && !path.isAbsolute(importPath);
  }

  private mergeResults(target: AnalysisResult, sources: Partial<AnalysisResult>[]): void {
    for (const source of sources) {
      if (source.total_files) {
        target.total_files = Math.max(target.total_files, source.total_files);
      }
      if (source.total_dependencies) {
        target.total_dependencies = Math.max(target.total_dependencies, source.total_dependencies);
      }
      if (source.errors) {
        target.errors.push(...source.errors);
      }
      if (source.warnings) {
        target.warnings.push(...source.warnings);
      }
      if (source.circular_dependencies) {
        target.circular_dependencies.push(...source.circular_dependencies);
      }
    }

    // Remove duplicates from circular dependencies
    target.circular_dependencies = this.deduplicateCycles(target.circular_dependencies);
  }

  private deduplicateCycles(cycles: any[]): any[] {
    const seen = new Set<string>();
    const unique: any[] = [];

    for (const cycle of cycles) {
      const key = cycle.cycle.sort().join('|');
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(cycle);
      }
    }

    return unique;
  }
}