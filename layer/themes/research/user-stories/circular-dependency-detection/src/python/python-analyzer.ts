import { fileAPI } from '../utils/file-api';
/**
 * Python circular dependency analyzer
 */

import * as fs from 'fs-extra';
import { path } from '../../../../../infra_external-log-lib/src';
import * as glob from 'glob';
import { execSync } from 'child_process';
import { DependencyGraph } from '../core/dependency-graph';
import { LanguageAnalyzer, AnalysisResult, AnalysisOptions, DependencyNode, DependencyEdge } from '../core/types';

export class PythonAnalyzer implements LanguageAnalyzer {
  private dependencyGraph: DependencyGraph;

  constructor() {
    this.dependencyGraph = new DependencyGraph();
  }

  getName(): string {
    return 'Python';
  }

  getSupportedExtensions(): string[] {
    return ['.py', '.pyi'];
  }

  validateOptions(options: AnalysisOptions): boolean {
    return true;
  }

  async analyze(rootPath: string, options: AnalysisOptions = {}): Promise<AnalysisResult> {
    const startTime = Date.now();
    const result: AnalysisResult = {
      success: false,
      language: 'python',
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

      // Step 1: Use Pylint for static analysis
      const pylintResults = await this.analyzePylint(rootPath, options);

      // Step 2: Use pycycle for cycle detection
      const pycycleResults = await this.analyzePycycle(rootPath, options);

      // Step 3: Use circular-imports tool
      const circularImportsResults = await this.analyzeCircularImports(rootPath, options);

      // Step 4: Custom AST-based analysis
      const customResults = await this.analyzeCustom(rootPath, options);

      // Merge results
      this.mergeResults(result, [pylintResults, pycycleResults, circularImportsResults, customResults]);

      // Find circular dependencies using our graph
      result.circular_dependencies = this.dependencyGraph.findCircularDependencies();
      result.success = true;

    } catch (error) {
      result.errors.push(`Analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    result.analysis_time_ms = Date.now() - startTime;
    return result;
  }

  private async analyzePylint(rootPath: string, options: AnalysisOptions): Promise<Partial<AnalysisResult>> {
    try {
      // Check if pylint is available
      try {
        execSync('which pylint', { stdio: 'ignore' });
      } catch {
        try {
          execSync('pip3 install pylint', { stdio: 'ignore' });
        } catch {
          return {
            warnings: ['pylint not found and installation failed']
          };
        }
      }

      // Run pylint with circular import detection
      const command = `pylint --disable=all --enable=cyclic-import --output-format=json "${rootPath}"`;
      let output: string;
      
      try {
        output = execSync(command, { encoding: 'utf-8', cwd: rootPath });
      } catch (error: any) {
        // Pylint exits with non-zero code when issues are found
        output = error.stdout || '';
      }

      const cycles: any[] = [];

      if (output) {
        try {
          const pylintResults = JSON.parse(output);
          
          for (const issue of pylintResults) {
            if (issue.type === 'error' && issue['message-id'] === 'R0401') {
              // Cyclic import detected
              cycles.push({
                cycle: this.extractCycleFromPylintMessage(issue.message),
                type: 'import',
                severity: 'error',
                description: issue.message,
                suggestions: [
                  'Reorganize imports to avoid circular dependencies',
                  'Use local imports inside functions',
                  'Consider using dependency injection'
                ],
                affected_files: [issue.path]
              });
            }
          }
        } catch (parseError) {
          // If JSON parsing fails, try to extract from text output
          const cycleMatches = output.match(/cyclic-import|circular.*import/gi);
          if (cycleMatches) {
            cycles.push({
              cycle: ['unknown'],
              type: 'import',
              severity: 'warning',
              description: 'Circular import detected by pylint',
              suggestions: ['Review import structure'],
              affected_files: []
            });
          }
        }
      }

      return {
        circular_dependencies: cycles,
        warnings: cycles.length > 0 ? [`Found ${cycles.length} cycles with pylint`] : []
      };

    } catch (error) {
      return {
        warnings: [`Pylint analysis failed: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  private async analyzePycycle(rootPath: string, options: AnalysisOptions): Promise<Partial<AnalysisResult>> {
    try {
      // Check if pycycle is available
      try {
        execSync('which pycycle', { stdio: 'ignore' });
      } catch {
        try {
          execSync('pip3 install pycycle', { stdio: 'ignore' });
        } catch {
          return {
            warnings: ['pycycle not found and installation failed']
          };
        }
      }

      // Run pycycle
      const command = `pycycle --here --format json`;
      const output = execSync(command, { 
        encoding: 'utf-8', 
        cwd: rootPath,
        timeout: 30000 
      });

      const results = JSON.parse(output);
      const cycles: any[] = [];

      if (results.cycles) {
        for (const cycle of results.cycles) {
          cycles.push({
            cycle: cycle.modules || cycle,
            type: 'import',
            severity: 'warning',
            description: `Import cycle detected: ${(cycle.modules || cycle).join(' → ')}`,
            suggestions: [
              'Use lazy imports inside functions',
              'Refactor to eliminate circular dependencies',
              'Consider using protocols or abstract base classes'
            ],
            affected_files: cycle.modules || cycle
          });
        }
      }

      return {
        circular_dependencies: cycles,
        warnings: cycles.length > 0 ? [`Found ${cycles.length} cycles with pycycle`] : []
      };

    } catch (error) {
      return {
        warnings: [`Pycycle analysis failed: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  private async analyzeCircularImports(rootPath: string, options: AnalysisOptions): Promise<Partial<AnalysisResult>> {
    try {
      // Check if circular-imports is available
      try {
        execSync('which circular-imports', { stdio: 'ignore' });
      } catch {
        try {
          execSync('pip3 install circular-imports', { stdio: 'ignore' });
        } catch {
          return {
            warnings: ['circular-imports not found and installation failed']
          };
        }
      }

      // Run circular-imports
      const command = `circular-imports "${rootPath}"`;
      let output: string;

      try {
        output = execSync(command, { encoding: 'utf-8', timeout: 30000 });
      } catch (error: any) {
        output = error.stdout || '';
      }

      const cycles: any[] = [];

      // Parse circular-imports output
      const lines = output.split('\n');
      let currentCycle: string[] = [];

      for (const line of lines) {
        if (line.includes('→')) {
          const modules = line.split('→').map(m => m.trim());
          currentCycle = modules;
        } else if (line.includes('Circular import') && currentCycle.length > 0) {
          cycles.push({
            cycle: currentCycle,
            type: 'import',
            severity: 'info',
            description: `Circular import: ${currentCycle.join(' → ')}`,
            suggestions: [
              'Use local imports',
              'Restructure module dependencies'
            ],
            affected_files: currentCycle
          });
          currentCycle = [];
        }
      }

      return {
        circular_dependencies: cycles,
        warnings: cycles.length > 0 ? [`Found ${cycles.length} cycles with circular-imports`] : []
      };

    } catch (error) {
      return {
        warnings: [`circular-imports analysis failed: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  private async analyzeCustom(rootPath: string, options: AnalysisOptions): Promise<Partial<AnalysisResult>> {
    try {
      // Find all Python files
      const pattern = path.join(rootPath, '**/*.py');
      const files = glob.sync(pattern, {
        ignore: options.exclude_patterns || ['**/__pycache__/**', '**/venv/**', '**/env/**', '**/site-packages/**']
      });

      let totalDependencies = 0;
      const importMap = new Map<string, string[]>();

      // Parse imports from each file
      for (const filePath of files) {
        const imports = await this.extractImports(filePath, rootPath);
        importMap.set(filePath, imports);
        totalDependencies += imports.length;

        // Add to dependency graph
        const node: DependencyNode = {
          id: filePath,
          path: filePath,
          type: 'file',
          language: 'python',
          metadata: {
            size: (await /* FRAUD_FIX: fs.stat(filePath) */).size,
            imports: imports.length,
            is_package: await this.isPackageInit(filePath)
          }
        };

        this.dependencyGraph.addNode(node);
      }

      // Build edges based on imports
      for (const [filePath, imports] of importMap) {
        for (const importPath of imports) {
          const resolvedPath = this.resolveImportPath(importPath, filePath, files, rootPath);
          if (resolvedPath && importMap.has(resolvedPath)) {
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
        errors: [`Custom Python analysis failed: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  private async extractImports(filePath: string, rootPath: string): Promise<string[]> {
    try {
      const content = await fileAPI.readFile(filePath, 'utf-8');
      const imports: string[] = [];

      // Patterns for different import types
      const patterns = [
        /^import\s+([a-zA-Z_][a-zA-Z0-9_.]*)/gm,                    // import module
        /^from\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s+import/gm,            // from module import ...
        /^from\s+(\.[a-zA-Z0-9_.]*)\s+import/gm,                   // from .module import ... (relative)
        /importlib\.import_module\s*\(\s*['"]([^'"]+)['"]\s*\)/g   // dynamic imports
      ];

      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const importPath = match[1];
          if (importPath && !this.isStandardLibrary(importPath)) {
            imports.push(importPath);
          }
        }
      }

      return [...new Set(imports)]; // Remove duplicates

    } catch (error) {
      return [];
    }
  }

  private resolveImportPath(importPath: string, fromFile: string, allFiles: string[], rootPath: string): string | null {
    // Handle relative imports
    if (importPath.startsWith('.')) {
      const fromDir = path.dirname(fromFile);
      const parts = importPath.split('.');
      let targetDir = fromDir;

      // Handle parent directory navigation (.., ..., etc.)
      for (const part of parts) {
        if (part === '') {
          targetDir = path.dirname(targetDir);
        } else {
          targetDir = path.join(targetDir, part);
          break;
        }
      }

      // Try to find the module
      const possiblePaths = [
        targetDir + '.py',
        path.join(targetDir, '__init__.py')
      ];

      for (const possiblePath of possiblePaths) {
        if (allFiles.includes(possiblePath)) {
          return possiblePath;
        }
      }
    } else {
      // Handle absolute imports
      const parts = importPath.split('.');
      
      // Build possible paths
      const possiblePaths = [];
      let currentPath = rootPath;
      
      for (let i = 0; i < parts.length; i++) {
        currentPath = path.join(currentPath, parts[i]);
        possiblePaths.push(currentPath + '.py');
        possiblePaths.push(path.join(currentPath, '__init__.py'));
      }

      for (const possiblePath of possiblePaths) {
        if (allFiles.includes(possiblePath)) {
          return possiblePath;
        }
      }
    }

    return null;
  }

  private async isPackageInit(filePath: string): Promise<boolean> {
    return path.basename(filePath) === '__init__.py';
  }

  private isStandardLibrary(moduleName: string): boolean {
    // Common Python standard library modules
    const stdLibModules = [
      'os', 'sys', 'json', 'urllib', 'http', "datetime", "collections",
      "itertools", "functools", "operator", 're', 'math', 'random',
      'string', 'io', 'pathlib', 'typing', "dataclasses", 'abc',
      'asyncio', "threading", "multiprocessing", "subprocess",
      'logging', "unittest", "argparse", "configparser"
    ];

    const rootModule = moduleName.split('.')[0];
    return stdLibModules.includes(rootModule);
  }

  private extractCycleFromPylintMessage(message: string): string[] {
    // Try to extract module names from pylint cyclic import messages
    const modulePattern = /([a-zA-Z_][a-zA-Z0-9_.]*)/g;
    const matches = message.match(modulePattern) || [];
    return matches.filter(match => !['import', 'from', 'cyclic'].includes(match.toLowerCase()));
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

    // Remove duplicate cycles
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