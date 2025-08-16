import { fileAPI } from '../utils/file-api';
/**
 * C++ circular dependency analyzer
 */

import * as fs from 'fs-extra';
import { path } from '../../../../../infra_external-log-lib/src';
import * as glob from 'glob';
import { execSync } from 'child_process';
import { DependencyGraph } from '../core/dependency-graph';
import { LanguageAnalyzer, AnalysisResult, AnalysisOptions, DependencyNode, DependencyEdge } from '../core/types';

export class CppAnalyzer implements LanguageAnalyzer {
  private dependencyGraph: DependencyGraph;

  constructor() {
    this.dependencyGraph = new DependencyGraph();
  }

  getName(): string {
    return 'C++';
  }

  getSupportedExtensions(): string[] {
    return ['.cpp', '.cc', '.cxx', '.c++', '.h', '.hpp', '.hxx', '.h++'];
  }

  validateOptions(options: AnalysisOptions): boolean {
    return true;
  }

  async analyze(rootPath: string, options: AnalysisOptions = {}): Promise<AnalysisResult> {
    const startTime = Date.now();
    const result: AnalysisResult = {
      success: false,
      language: 'cpp',
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

      // Step 1: Use clang-tidy for static analysis
      const clangTidyResults = await this.analyzeClangTidy(rootPath, options);

      // Step 2: Use cpp-dependencies tool
      const cppDepsResults = await this.analyzeCppDependencies(rootPath, options);

      // Step 3: Custom include analysis
      const customResults = await this.analyzeCustom(rootPath, options);

      // Step 4: CMake analysis if available
      const cmakeResults = await this.analyzeCMake(rootPath, options);

      // Merge results
      this.mergeResults(result, [clangTidyResults, cppDepsResults, customResults, cmakeResults]);

      // Find circular dependencies using our graph
      result.circular_dependencies = this.dependencyGraph.findCircularDependencies();
      result.success = true;

    } catch (error) {
      result.errors.push(`Analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    result.analysis_time_ms = Date.now() - startTime;
    return result;
  }

  private async analyzeClangTidy(rootPath: string, options: AnalysisOptions): Promise<Partial<AnalysisResult>> {
    try {
      // Check if clang-tidy is available
      try {
        execSync('which clang-tidy', { stdio: 'ignore' });
      } catch {
        return {
          warnings: ['clang-tidy not found, skipping static analysis']
        };
      }

      // Find C++ files
      const pattern = path.join(rootPath, '**/*.{cpp,cc,cxx,c++}');
      const files = glob.sync(pattern, {
        ignore: options.exclude_patterns || ['**/build/**', '**/dist/**']
      });

      const cycles: any[] = [];

      // Run clang-tidy on each file looking for include-related issues
      for (const file of files) {
        try {
          const command = `clang-tidy "${file}" --checks=-*,misc-include-cleaner,readability-include-order -- -I"${rootPath}"`;
          const output = execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
          
          // Parse clang-tidy output for circular include warnings
          const circularMatches = output.match(/circular.*include/gi);
          if (circularMatches) {
            cycles.push({
              cycle: [file],
              type: 'include',
              severity: 'error',
              description: `Potential circular include detected in ${file}`,
              suggestions: [
                'Use forward declarations instead of includes where possible',
                'Move implementations to source files',
                'Consider using PIMPL pattern'
              ],
              affected_files: [file]
            });
          }
        } catch (error) {
          // clang-tidy may fail on individual files, continue with others
        }
      }

      return {
        total_files: files.length,
        circular_dependencies: cycles,
        warnings: cycles.length > 0 ? [`Found ${cycles.length} potential cycles with clang-tidy`] : []
      };

    } catch (error) {
      return {
        warnings: [`Clang-tidy analysis failed: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  private async analyzeCppDependencies(rootPath: string, options: AnalysisOptions): Promise<Partial<AnalysisResult>> {
    try {
      // Check if cpp-dependencies is available
      try {
        execSync('which cpp-dependencies', { stdio: 'ignore' });
      } catch {
        // Try to install cpp-dependencies via pip
        try {
          execSync('pip3 install cpp-dependencies', { stdio: 'ignore' });
        } catch {
          return {
            warnings: ['cpp-dependencies not found and installation failed']
          };
        }
      }

      // Run cpp-dependencies
      const command = `cpp-dependencies --dir "${rootPath}" --format json`;
      const output = execSync(command, { encoding: 'utf-8' });
      const results = JSON.parse(output);

      // Extract cycles from results
      const cycles = this.extractCyclesFromCppDependencies(results);

      return {
        circular_dependencies: cycles,
        warnings: cycles.length > 0 ? [`Found ${cycles.length} cycles with cpp-dependencies`] : []
      };

    } catch (error) {
      return {
        warnings: [`cpp-dependencies analysis failed: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  private async analyzeCustom(rootPath: string, options: AnalysisOptions): Promise<Partial<AnalysisResult>> {
    try {
      // Find all header and source files
      const headerPattern = path.join(rootPath, '**/*.{h,hpp,hxx,h++}');
      const sourcePattern = path.join(rootPath, '**/*.{cpp,cc,cxx,c++}');
      
      const headerFiles = glob.sync(headerPattern, {
        ignore: options.exclude_patterns || ['**/build/**', '**/dist/**', '**/third_party/**']
      });

      const sourceFiles = glob.sync(sourcePattern, {
        ignore: options.exclude_patterns || ['**/build/**', '**/dist/**', '**/third_party/**']
      });

      const allFiles = [...headerFiles, ...sourceFiles];
      let totalDependencies = 0;

      // Parse includes from each file
      const includeMap = new Map<string, string[]>();
      
      for (const filePath of allFiles) {
        const includes = await this.extractIncludes(filePath, rootPath, options);
        includeMap.set(filePath, includes);
        totalDependencies += includes.length;

        // Add to dependency graph
        const node: DependencyNode = {
          id: filePath,
          path: filePath,
          type: 'file',
          language: 'cpp',
          metadata: {
            size: (await /* FRAUD_FIX: fs.stat(filePath) */).size,
            includes: includes.length,
            is_header: headerFiles.includes(filePath)
          }
        };

        this.dependencyGraph.addNode(node);
      }

      // Build edges based on includes
      for (const [filePath, includes] of includeMap) {
        for (const includePath of includes) {
          const resolvedPath = this.resolveIncludePath(includePath, filePath, allFiles, rootPath);
          if (resolvedPath && includeMap.has(resolvedPath)) {
            const edge: DependencyEdge = {
              from: filePath,
              to: resolvedPath,
              type: 'include',
              metadata: { include_path: includePath }
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
        total_files: allFiles.length,
        total_dependencies: totalDependencies
      };

    } catch (error) {
      return {
        errors: [`Custom C++ analysis failed: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  private async analyzeCMake(rootPath: string, options: AnalysisOptions): Promise<Partial<AnalysisResult>> {
    try {
      // Look for CMakeLists.txt files
      const cmakeFiles = glob.sync('**/CMakeLists.txt', { cwd: rootPath });
      
      if (cmakeFiles.length === 0) {
        return { warnings: ['No CMakeLists.txt found, skipping CMake analysis'] };
      }

      const dependencies: any[] = [];
      
      // Parse CMakeLists.txt files for target dependencies
      for (const cmakeFile of cmakeFiles) {
        const fullPath = path.join(rootPath, cmakeFile);
        const content = await fileAPI.readFile(fullPath, 'utf-8');
        
        // Extract target_link_libraries commands
        const linkMatches = content.match(/target_link_libraries\s*\(\s*(\w+)\s+[^)]*\)/g);
        if (linkMatches) {
          for (const match of linkMatches) {
            const targetMatch = match.match(/target_link_libraries\s*\(\s*(\w+)/);
            if (targetMatch) {
              const target = targetMatch[1];
              dependencies.push({
                target,
                file: fullPath,
                dependencies: this.extractCMakeTargetDeps(match)
              });
            }
          }
        }
      }

      // Analyze for potential circular linking dependencies
      const cycles = this.findCMakeCycles(dependencies);

      return {
        circular_dependencies: cycles,
        warnings: cycles.length > 0 ? [`Found ${cycles.length} potential link cycles in CMake`] : []
      };

    } catch (error) {
      return {
        warnings: [`CMake analysis failed: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  private async extractIncludes(filePath: string, rootPath: string, options?: AnalysisOptions): Promise<string[]> {
    try {
      const content = await fileAPI.readFile(filePath, 'utf-8');
      const includes: string[] = [];

      // Match #include statements
      const includePattern = /#include\s*[<"]([^>"]+)[>"]/g;
      let match;

      while ((match = includePattern.exec(content)) !== null) {
        const includePath = match[1];
        // Filter out system includes (those using < >)
        if (!match[0].includes('<') || (options && options.follow_external)) {
          includes.push(includePath);
        }
      }

      return [...new Set(includes)]; // Remove duplicates

    } catch (error) {
      return [];
    }
  }

  private resolveIncludePath(includePath: string, fromFile: string, allFiles: string[], rootPath: string): string | null {
    // Handle relative includes
    if (includePath.startsWith('./') || includePath.startsWith('../')) {
      const fromDir = path.dirname(fromFile);
      const resolved = path.resolve(fromDir, includePath);
      
      if (allFiles.includes(resolved)) {
        return resolved;
      }
    }

    // Handle includes relative to project root
    const rootRelative = path.join(rootPath, includePath);
    if (allFiles.includes(rootRelative)) {
      return rootRelative;
    }

    // Try common include patterns
    for (const file of allFiles) {
      if (file.endsWith(includePath)) {
        return file;
      }
    }

    return null;
  }

  private extractCyclesFromCppDependencies(results: any): any[] {
    const cycles: any[] = [];
    
    if (results.cycles) {
      for (const cycle of results.cycles) {
        cycles.push({
          cycle: cycle.files || cycle,
          type: 'include',
          severity: 'error',
          description: `Include cycle detected: ${(cycle.files || cycle).join(' → ')}`,
          suggestions: [
            'Use forward declarations to break the cycle',
            'Reorganize headers to avoid circular includes',
            'Consider using PIMPL (Pointer to Implementation) pattern'
          ],
          affected_files: cycle.files || cycle
        });
      }
    }

    return cycles;
  }

  private extractCMakeTargetDeps(linkCommand: string): string[] {
    // Extract library names from target_link_libraries command
    const match = linkCommand.match(/target_link_libraries\s*\(\s*\w+\s+([^)]+)\)/);
    if (!match) return [];

    const deps = match[1]
      .split(/\s+/)
      .filter(dep => dep.trim() && !['PUBLIC', 'PRIVATE', "INTERFACE"].includes(dep.trim()))
      .map(dep => dep.trim());

    return deps;
  }

  private findCMakeCycles(dependencies: any[]): any[] {
    // Build a simple graph of CMake target dependencies
    const graph = new Map<string, string[]>();
    
    for (const dep of dependencies) {
      graph.set(dep.target, dep.dependencies);
    }

    // Simple cycle detection in target dependencies
    const cycles: any[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (target: string, path: string[]): void => {
      if (recursionStack.has(target)) {
        // Found a cycle
        const cycleStart = path.indexOf(target);
        const cycle = path.slice(cycleStart);
        cycles.push({
          cycle,
          type: 'link',
          severity: 'error',
          description: `Link dependency cycle detected: ${cycle.join(' → ')}`,
          suggestions: [
            'Reorganize libraries to eliminate circular dependencies',
            'Consider merging circular dependencies into a single library',
            'Use interfaces or abstract base classes to break cycles'
          ],
          affected_files: cycle
        });
        return;
      }

      if (visited.has(target)) return;

      visited.add(target);
      recursionStack.add(target);
      path.push(target);

      const targetDeps = graph.get(target) || [];
      for (const dep of targetDeps) {
        if (graph.has(dep)) {
          dfs(dep, [...path]);
        }
      }

      recursionStack.delete(target);
    };

    for (const target of graph.keys()) {
      if (!visited.has(target)) {
        dfs(target, []);
      }
    }

    return cycles;
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