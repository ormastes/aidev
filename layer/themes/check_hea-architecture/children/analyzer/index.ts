/**
 * HEA Analyzer
 * Analyzes project structure and dependencies for HEA compliance
 */

import { EventEmitter } from '../../../infra_external-log-lib/src';
import { fs } from '../../../infra_external-log-lib/src';
import { path } from '../../../infra_external-log-lib/src';
import * as ts from 'typescript';

export type ViolationSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface StructureAnalysis {
  layers: Map<string, LayerInfo>;
  themes: Map<string, ThemeInfo>;
  modules: Map<string, ModuleInfo>;
  pipeGateways: string[];
  childrenModules: string[];
}

export interface LayerInfo {
  name: string;
  path: string;
  moduleCount: number;
  dependencies: string[];
  dependents: string[];
}

export interface ThemeInfo {
  name: string;
  path: string;
  hasPipe: boolean;
  children: string[];
  exports: string[];
  imports: string[];
}

export interface ModuleInfo {
  path: string;
  layer: string;
  theme?: string;
  type: 'pipe' | 'child' | 'standalone';
  imports: string[];
  exports: string[];
  complexity: number;
}

export interface DependencyNode {
  id: string;
  path: string;
  type: string;
  dependencies: string[];
  dependents: string[];
}

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  edges: Array<{ from: string; to: string; type: string }>;
  cycles: string[][];
  layers: Map<string, Set<string>>;
}

export interface LayerMetrics {
  layerName: string;
  fileCount: number;
  lineCount: number;
  complexity: number;
  cohesion: number;
  coupling: number;
  stability: number;
  abstractness: number;
}

export interface AnalysisResult {
  structure: StructureAnalysis;
  dependencies: DependencyGraph;
  metrics: LayerMetrics[];
  violations: Array<{
    type: string;
    severity: ViolationSeverity;
    location: string;
    message: string;
  }>;
  suggestions: string[];
  score: number;
}

export class HEAAnalyzer extends EventEmitter {
  private rootPath: string;
  private structure: StructureAnalysis;
  private dependencies: DependencyGraph;
  private metrics: Map<string, LayerMetrics>;

  constructor(rootPath: string) {
    super();
    this.rootPath = rootPath;
    this.structure = {
      layers: new Map(),
      themes: new Map(),
      modules: new Map(),
      pipeGateways: [],
      childrenModules: []
    };
    this.dependencies = {
      nodes: new Map(),
      edges: [],
      cycles: [],
      layers: new Map()
    };
    this.metrics = new Map();
  }

  async analyze(): Promise<AnalysisResult> {
    this.emit('analysis:start', { rootPath: this.rootPath });

    // Analyze structure
    await this.analyzeStructure();

    // Build dependency graph
    await this.buildDependencyGraph();

    // Calculate metrics
    this.calculateMetrics();

    // Detect violations
    const violations = this.detectViolations();

    // Generate suggestions
    const suggestions = this.generateSuggestions(violations);

    // Calculate score
    const score = this.calculateScore(violations);

    const result: AnalysisResult = {
      structure: this.structure,
      dependencies: this.dependencies,
      metrics: Array.from(this.metrics.values()),
      violations,
      suggestions,
      score
    };

    this.emit('analysis:complete', result);
    
    return result;
  }

  private async analyzeStructure(): Promise<void> {
    const layerPath = path.join(this.rootPath, 'layer');
    
    if (!fs.existsSync(layerPath)) {
      this.emit('warning', { message: 'No layer directory found' });
      return;
    }

    await this.scanDirectory(layerPath, '');
  }

  private async scanDirectory(dirPath: string, layerName: string): Promise<void> {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        if (entry.name === 'themes' && !layerName) {
          // Scan themes
          await this.scanThemes(fullPath);
        } else if (entry.name === 'pipe') {
          // Found a pipe gateway
          this.structure.pipeGateways.push(fullPath);
          await this.analyzeModule(fullPath, 'pipe');
        } else if (entry.name === 'children') {
          // Scan children modules
          await this.scanChildren(fullPath);
        } else if (!layerName) {
          // This is a layer
          const layer: LayerInfo = {
            name: entry.name,
            path: fullPath,
            moduleCount: 0,
            dependencies: [],
            dependents: []
          };
          this.structure.layers.set(entry.name, layer);
          await this.scanDirectory(fullPath, entry.name);
        } else {
          // Continue scanning
          await this.scanDirectory(fullPath, layerName);
        }
      }
    }
  }

  private async scanThemes(themesPath: string): Promise<void> {
    const entries = await fs.promises.readdir(themesPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const themePath = path.join(themesPath, entry.name);
        const theme: ThemeInfo = {
          name: entry.name,
          path: themePath,
          hasPipe: false,
          children: [],
          exports: [],
          imports: []
        };

        // Check for pipe
        const pipePath = path.join(themePath, 'pipe');
        if (fs.existsSync(pipePath)) {
          theme.hasPipe = true;
          await this.analyzePipe(pipePath, theme);
        }

        // Check for children
        const childrenPath = path.join(themePath, 'children');
        if (fs.existsSync(childrenPath)) {
          const children = await fs.promises.readdir(childrenPath, { withFileTypes: true });
          theme.children = children
            .filter(c => c.isDirectory())
            .map(c => c.name);
        }

        this.structure.themes.set(entry.name, theme);
      }
    }
  }

  private async scanChildren(childrenPath: string): Promise<void> {
    const entries = await fs.promises.readdir(childrenPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const childPath = path.join(childrenPath, entry.name);
        this.structure.childrenModules.push(childPath);
        await this.analyzeModule(childPath, 'child');
      }
    }
  }

  private async analyzeModule(modulePath: string, type: 'pipe' | 'child' | 'standalone'): Promise<void> {
    const indexPath = path.join(modulePath, 'index.ts');
    const indexJsPath = path.join(modulePath, 'index.js');
    
    let filePath = '';
    if (fs.existsSync(indexPath)) {
      filePath = indexPath;
    } else if (fs.existsSync(indexJsPath)) {
      filePath = indexJsPath;
    } else {
      return;
    }

    const content = await fs.promises.readFile(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    const module: ModuleInfo = {
      path: modulePath,
      layer: this.getLayer(modulePath),
      theme: this.getTheme(modulePath),
      type,
      imports: [],
      exports: [],
      complexity: this.calculateComplexity(sourceFile)
    };

    // Extract imports and exports
    this.extractImportsExports(sourceFile, module);

    this.structure.modules.set(modulePath, module);
  }

  private async analyzePipe(pipePath: string, theme: ThemeInfo): Promise<void> {
    const indexPath = path.join(pipePath, 'index.ts');
    const indexJsPath = path.join(pipePath, 'index.js');
    
    let filePath = '';
    if (fs.existsSync(indexPath)) {
      filePath = indexPath;
    } else if (fs.existsSync(indexJsPath)) {
      filePath = indexJsPath;
    } else {
      return;
    }

    const content = await fs.promises.readFile(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    const visit = (node: ts.Node) => {
      if (ts.isExportDeclaration(node)) {
        const exportClause = node.exportClause;
        if (exportClause && ts.isNamedExports(exportClause)) {
          exportClause.elements.forEach(element => {
            theme.exports.push(element.name.text);
          });
        }
      }
      
      if (ts.isImportDeclaration(node)) {
        const importPath = (node.moduleSpecifier as ts.StringLiteral).text;
        theme.imports.push(importPath);
      }
      
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  private extractImportsExports(sourceFile: ts.SourceFile, module: ModuleInfo): void {
    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)) {
        const importPath = (node.moduleSpecifier as ts.StringLiteral).text;
        module.imports.push(importPath);
      }
      
      if (ts.isExportDeclaration(node)) {
        if (node.moduleSpecifier) {
          const exportPath = (node.moduleSpecifier as ts.StringLiteral).text;
          module.exports.push(exportPath);
        }
      }
      
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  private calculateComplexity(sourceFile: ts.SourceFile): number {
    let complexity = 1;
    
    const visit = (node: ts.Node) => {
      if (ts.isIfStatement(node) || 
          ts.isConditionalExpression(node) ||
          ts.isForStatement(node) ||
          ts.isWhileStatement(node) ||
          ts.isDoStatement(node) ||
          ts.isCaseClause(node)) {
        complexity++;
      }
      
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return complexity;
  }

  private getLayer(modulePath: string): string {
    const relativePath = path.relative(this.rootPath, modulePath);
    const parts = relativePath.split(path.sep);
    
    if (parts[0] === 'layer' && parts.length > 1) {
      return parts[1];
    }
    
    return 'unknown';
  }

  private getTheme(modulePath: string): string | undefined {
    const relativePath = path.relative(this.rootPath, modulePath);
    const parts = relativePath.split(path.sep);
    
    const themesIndex = parts.indexOf('themes');
    if (themesIndex !== -1 && parts.length > themesIndex + 1) {
      return parts[themesIndex + 1];
    }
    
    return undefined;
  }

  private async buildDependencyGraph(): Promise<void> {
    for (const [modulePath, module] of this.structure.modules) {
      const node: DependencyNode = {
        id: modulePath,
        path: modulePath,
        type: module.type,
        dependencies: [],
        dependents: []
      };

      // Process imports to build dependencies
      for (const importPath of module.imports) {
        const resolvedPath = this.resolveImport(modulePath, importPath);
        if (resolvedPath) {
          node.dependencies.push(resolvedPath);
          this.dependencies.edges.push({
            from: modulePath,
            to: resolvedPath,
            type: 'import'
          });
        }
      }

      this.dependencies.nodes.set(modulePath, node);
    }

    // Build dependents
    for (const [id, node] of this.dependencies.nodes) {
      for (const dep of node.dependencies) {
        const depNode = this.dependencies.nodes.get(dep);
        if (depNode) {
          depNode.dependents.push(id);
        }
      }
    }

    // Detect cycles
    this.detectCycles();

    // Group by layers
    this.groupByLayers();
  }

  private resolveImport(fromPath: string, importPath: string): string | null {
    if (importPath.startsWith('.')) {
      const resolved = path.resolve(path.dirname(fromPath), importPath);
      return this.findModuleForPath(resolved);
    }
    return null;
  }

  private findModuleForPath(targetPath: string): string | null {
    for (const modulePath of this.structure.modules.keys()) {
      if (targetPath.startsWith(modulePath)) {
        return modulePath;
      }
    }
    return null;
  }

  private detectCycles(): void {
    const visited = new Set<string>();
    const stack = new Set<string>();
    const cycles: string[][] = [];

    const dfs = (node: string, path: string[]): void => {
      visited.add(node);
      stack.add(node);
      path.push(node);

      const deps = this.dependencies.nodes.get(node)?.dependencies || [];
      for (const dep of deps) {
        if (!visited.has(dep)) {
          dfs(dep, [...path]);
        } else if (stack.has(dep)) {
          // Found a cycle
          const cycleStart = path.indexOf(dep);
          cycles.push(path.slice(cycleStart));
        }
      }

      stack.delete(node);
    };

    for (const node of this.dependencies.nodes.keys()) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }

    this.dependencies.cycles = cycles;
  }

  private groupByLayers(): void {
    for (const [modulePath, module] of this.structure.modules) {
      const layer = module.layer;
      
      if (!this.dependencies.layers.has(layer)) {
        this.dependencies.layers.set(layer, new Set());
      }
      
      this.dependencies.layers.get(layer)!.add(modulePath);
    }
  }

  private calculateMetrics(): void {
    for (const [layerName, layer] of this.structure.layers) {
      const modules = Array.from(this.structure.modules.values())
        .filter(m => m.layer === layerName);

      const metrics: LayerMetrics = {
        layerName,
        fileCount: modules.length,
        lineCount: 0, // Would need to count actual lines
        complexity: modules.reduce((sum, m) => sum + m.complexity, 0),
        cohesion: this.calculateCohesion(modules),
        coupling: this.calculateCoupling(layerName),
        stability: this.calculateStability(layerName),
        abstractness: this.calculateAbstractness(modules)
      };

      this.metrics.set(layerName, metrics);
    }
  }

  private calculateCohesion(modules: ModuleInfo[]): number {
    // Simplified cohesion: ratio of internal dependencies
    if (modules.length === 0) return 1;

    let internalDeps = 0;
    let totalDeps = 0;

    for (const module of modules) {
      for (const imp of module.imports) {
        totalDeps++;
        if (imp.startsWith('.')) {
          internalDeps++;
        }
      }
    }

    return totalDeps > 0 ? internalDeps / totalDeps : 1;
  }

  private calculateCoupling(layerName: string): number {
    // Coupling: ratio of external dependencies
    const layerModules = this.dependencies.layers.get(layerName) || new Set();
    let externalDeps = 0;
    let totalDeps = 0;

    for (const modulePath of layerModules) {
      const node = this.dependencies.nodes.get(modulePath);
      if (node) {
        for (const dep of node.dependencies) {
          totalDeps++;
          const depModule = this.structure.modules.get(dep);
          if (depModule && depModule.layer !== layerName) {
            externalDeps++;
          }
        }
      }
    }

    return totalDeps > 0 ? externalDeps / totalDeps : 0;
  }

  private calculateStability(layerName: string): number {
    // Stability: Ce / (Ca + Ce)
    // Ca = Afferent Couplings (dependents)
    // Ce = Efferent Couplings (dependencies)
    
    const layerModules = this.dependencies.layers.get(layerName) || new Set();
    let ca = 0;
    let ce = 0;

    for (const modulePath of layerModules) {
      const node = this.dependencies.nodes.get(modulePath);
      if (node) {
        ca += node.dependents.length;
        ce += node.dependencies.length;
      }
    }

    return (ca + ce) > 0 ? ce / (ca + ce) : 0;
  }

  private calculateAbstractness(modules: ModuleInfo[]): number {
    // Simplified: ratio of pipe/interface modules
    if (modules.length === 0) return 0;
    
    const abstractModules = modules.filter(m => m.type === 'pipe').length;
    return abstractModules / modules.length;
  }

  private detectViolations(): Array<{
    type: string;
    severity: ViolationSeverity;
    location: string;
    message: string;
  }> {
    const violations = [];

    // Check for cycles
    if (this.dependencies.cycles.length > 0) {
      for (const cycle of this.dependencies.cycles) {
        violations.push({
          type: 'circular-dependency',
          severity: 'critical' as ViolationSeverity,
          location: cycle[0],
          message: `Circular dependency detected: ${cycle.map(c => path.basename(c)).join(' -> ')}`
        });
      }
    }

    // Check for missing pipe gateways
    for (const [themeName, theme] of this.structure.themes) {
      if (!theme.hasPipe && theme.children.length > 0) {
        violations.push({
          type: 'missing-pipe',
          severity: 'high' as ViolationSeverity,
          location: theme.path,
          message: `Theme ${themeName} has children but no pipe gateway`
        });
      }
    }

    // Check for direct children imports
    for (const [modulePath, module] of this.structure.modules) {
      if (module.type === 'child') {
        for (const imp of module.imports) {
          if (imp.includes('../children/')) {
            violations.push({
              type: 'direct-children-import',
              severity: 'high' as ViolationSeverity,
              location: modulePath,
              message: 'Child module importing sibling directly'
            });
          }
        }
      }
    }

    // Check for high complexity
    for (const [modulePath, module] of this.structure.modules) {
      if (module.complexity > 10) {
        violations.push({
          type: 'high-complexity',
          severity: 'medium' as ViolationSeverity,
          location: modulePath,
          message: `High complexity: ${module.complexity}`
        });
      }
    }

    return violations;
  }

  private generateSuggestions(violations: any[]): string[] {
    const suggestions: string[] = [];

    if (violations.some(v => v.type === 'circular-dependency')) {
      suggestions.push('Consider restructuring modules to eliminate circular dependencies');
      suggestions.push('Use dependency injection or events to break circular references');
    }

    if (violations.some(v => v.type === 'missing-pipe')) {
      suggestions.push('Add pipe/index.ts gateways to themes with children modules');
      suggestions.push('Export child modules through the pipe gateway');
    }

    if (violations.some(v => v.type === 'direct-children-import')) {
      suggestions.push('Import sibling modules through the pipe gateway');
      suggestions.push('Refactor direct children imports to use ../pipe exports');
    }

    if (violations.some(v => v.type === 'high-complexity')) {
      suggestions.push('Break down complex modules into smaller, focused modules');
      suggestions.push('Extract complex logic into separate utility functions');
    }

    return suggestions;
  }

  private calculateScore(violations: any[]): number {
    let score = 100;

    for (const violation of violations) {
      switch (violation.severity) {
        case 'critical':
          score -= 20;
          break;
        case 'high':
          score -= 10;
          break;
        case 'medium':
          score -= 5;
          break;
        case 'low':
          score -= 2;
          break;
      }
    }

    return Math.max(0, score);
  }
}

export default HEAAnalyzer;