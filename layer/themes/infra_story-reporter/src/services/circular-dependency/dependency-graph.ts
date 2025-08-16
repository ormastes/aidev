/**
 * Core dependency graph implementation with cycle detection
 * Simplified version without external graphlib dependency
 */

import { DependencyNode, DependencyEdge, CircularDependency } from './types';

export class DependencyGraph {
  private nodes: Map<string, DependencyNode>;
  private edges: Map<string, Set<string>>;
  private cache: Map<string, CircularDependency[]>;

  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
    this.cache = new Map();
  }

  /**
   * Add a node to the dependency graph
   */
  addNode(node: DependencyNode): void {
    this.nodes.set(node.id, node);
    if (!this.edges.has(node.id)) {
      this.edges.set(node.id, new Set());
    }
    this.invalidateCache();
  }

  /**
   * Add an edge between two nodes
   */
  addEdge(edge: DependencyEdge): void {
    if (!this.nodes.has(edge.from) || !this.nodes.has(edge.to)) {
      throw new Error(`Cannot add edge: nodes ${edge.from} or ${edge.to} do not exist`);
    }
    
    const fromEdges = this.edges.get(edge.from) || new Set();
    fromEdges.add(edge.to);
    this.edges.set(edge.from, fromEdges);
    this.invalidateCache();
  }

  /**
   * Get all nodes in the graph
   */
  getNodes(): DependencyNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get all edges in the graph
   */
  getEdges(): Array<{ from: string; to: string }> {
    const allEdges: Array<{ from: string; to: string }> = [];
    this.edges.forEach((targets, source) => {
      targets.forEach(target => {
        allEdges.push({ from: source, to: target });
      });
    });
    return allEdges;
  }

  /**
   * Find all circular dependencies using Tarjan's strongly connected components algorithm
   */
  findCircularDependencies(): CircularDependency[] {
    const cacheKey = 'all_cycles';
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const cycles: CircularDependency[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (nodeId: string): void => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const neighbors = this.edges.get(nodeId) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        } else if (recursionStack.has(neighbor)) {
          // Found a cycle
          const cycleStartIndex = path.indexOf(neighbor);
          if (cycleStartIndex !== -1) {
            const cycle = path.slice(cycleStartIndex);
            const circularDep = this.buildCycle(cycle);
            if (circularDep && !this.isDuplicateCycle(cycles, circularDep)) {
              cycles.push(circularDep);
            }
          }
        }
      }

      recursionStack.delete(nodeId);
      path.pop();
    };

    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
      }
    }

    this.cache.set(cacheKey, cycles);
    return cycles;
  }

  /**
   * Find circular dependencies starting from a specific node
   */
  findCircularDependenciesFrom(nodeId: string): CircularDependency[] {
    if (!this.nodes.has(nodeId)) {
      return [];
    }

    const cycles: CircularDependency[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (currentId: string): void => {
      visited.add(currentId);
      recursionStack.add(currentId);
      path.push(currentId);

      const neighbors = this.edges.get(currentId) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        } else if (recursionStack.has(neighbor)) {
          // Found a cycle
          const cycleStartIndex = path.indexOf(neighbor);
          if (cycleStartIndex !== -1) {
            const cycle = path.slice(cycleStartIndex);
            const circularDep = this.buildCycle(cycle);
            if (circularDep && !this.isDuplicateCycle(cycles, circularDep)) {
              cycles.push(circularDep);
            }
          }
        }
      }

      recursionStack.delete(currentId);
      path.pop();
    };

    dfs(nodeId);
    return cycles;
  }

  /**
   * Get dependency path between two nodes
   */
  getDependencyPath(from: string, to: string): string[] | null {
    const visited = new Set<string>();
    const path: string[] = [];

    const dfs = (current: string): boolean => {
      if (current === to) {
        path.push(current);
        return true;
      }

      if (visited.has(current)) return false;
      visited.add(current);
      path.push(current);

      const neighbors = this.edges.get(current) || new Set();
      for (const neighbor of neighbors) {
        if (dfs(neighbor)) return true;
      }

      path.pop();
      return false;
    };

    return dfs(from) ? path : null;
  }

  /**
   * Get statistics about the graph
   */
  getStatistics() {
    const nodeCount = this.nodes.size;
    let edgeCount = 0;
    this.edges.forEach(targets => {
      edgeCount += targets.size;
    });
    
    const cycles = this.findCircularDependencies();
    
    const languageStats = new Map<string, number>();
    const typeStats = new Map<string, number>();

    for (const node of this.nodes.values()) {
      languageStats.set(node.language, (languageStats.get(node.language) || 0) + 1);
      typeStats.set(node.type, (typeStats.get(node.type) || 0) + 1);
    }

    return {
      nodes: nodeCount,
      edges: edgeCount,
      circular_dependencies: cycles.length,
      languages: Object.fromEntries(languageStats),
      types: Object.fromEntries(typeStats),
      density: nodeCount > 1 ? edgeCount / (nodeCount * (nodeCount - 1)) : 0,
      is_acyclic: cycles.length === 0
    };
  }

  /**
   * Export graph to DOT format for visualization
   */
  toDot(highlightCycles = true): string {
    let dot = 'digraph dependencies {\n';
    dot += '  rankdir=LR;\n';
    dot += '  node [shape=box, style=rounded];\n';
    
    const cycles = highlightCycles ? this.findCircularDependencies() : [];
    const cycleNodes = new Set<string>();
    
    // Collect all nodes involved in cycles
    for (const cycle of cycles) {
      for (const nodeId of cycle.cycle) {
        cycleNodes.add(nodeId);
      }
    }

    // Add nodes
    for (const node of this.nodes.values()) {
      const color = cycleNodes.has(node.id) ? 'red' : this.getNodeColor(node.language);
      const label = this.getNodeLabel(node);
      dot += `  "${node.id}" [label="${label}", color="${color}", fillcolor="${color}20", style="filled,rounded"];\n`;
    }

    // Add edges
    this.edges.forEach((targets, source) => {
      targets.forEach(target => {
        const isInCycle = this.isEdgeInAnyCycle(source, target, cycles);
        const color = isInCycle ? 'red' : 'black';
        const style = isInCycle ? 'bold' : 'solid';
        dot += `  "${source}" -> "${target}" [color="${color}", style="${style}"];\n`;
      });
    });

    dot += '}\n';
    return dot;
  }

  /**
   * Clear the graph
   */
  clear(): void {
    this.nodes.clear();
    this.edges.clear();
    this.cache.clear();
  }

  private buildCycle(cycle: string[]): CircularDependency | null {
    if (cycle.length < 2) return null;

    const affectedFiles = cycle.map(nodeId => this.nodes.get(nodeId)?.path || nodeId);

    return {
      cycle,
      type: 'import',
      severity: this.determineSeverity('import', cycle.length),
      description: `Circular dependency detected: ${cycle.join(' → ')} → ${cycle[0]}`,
      suggestions: this.generateSuggestions(cycle, 'import'),
      affected_files: affectedFiles
    };
  }

  private isDuplicateCycle(cycles: CircularDependency[], newCycle: CircularDependency): boolean {
    return cycles.some(existing => {
      if (existing.cycle.length !== newCycle.cycle.length) return false;
      const existingSet = new Set(existing.cycle);
      return newCycle.cycle.every(node => existingSet.has(node));
    });
  }

  private getNodeColor(language: string): string {
    switch (language) {
      case 'typescript': return 'blue';
      case 'cpp': return 'green';
      case 'python': return 'orange';
      default: return 'gray';
    }
  }

  private getNodeLabel(node: DependencyNode): string {
    const fileName = node.path.split('/').pop() || node.id;
    return fileName.length > 20 ? fileName.substring(0, 17) + '...' : fileName;
  }

  private isEdgeInAnyCycle(from: string, to: string, cycles: CircularDependency[]): boolean {
    for (const cycle of cycles) {
      for (let i = 0; i < cycle.cycle.length; i++) {
        const currentNode = cycle.cycle[i];
        const nextNode = cycle.cycle[(i + 1) % cycle.cycle.length];
        if (currentNode === from && nextNode === to) {
          return true;
        }
      }
    }
    return false;
  }

  private determineSeverity(type: string, cycleLength: number): 'error' | 'warning' | 'info' {
    if (type === 'include' || type === 'link') return 'error';
    if (cycleLength <= 3) return 'warning';
    return 'info';
  }

  private generateSuggestions(cycle: string[], type: string): string[] {
    const suggestions: string[] = [];

    switch (type) {
      case 'import':
        suggestions.push('Consider using dependency injection or inversion of control');
        suggestions.push('Extract common functionality to a separate module');
        suggestions.push('Use lazy loading or dynamic imports to break the cycle');
        break;
      case 'include':
        suggestions.push('Use forward declarations instead of includes where possible');
        suggestions.push('Move implementations to separate source files');
        suggestions.push('Consider using interfaces or abstract base classes');
        break;
      case 'require':
        suggestions.push('Restructure modules to have clearer boundaries');
        suggestions.push('Use factory patterns or service locators');
        break;
      default:
        suggestions.push('Analyze the dependency structure and refactor to remove circular references');
        suggestions.push('Consider using design patterns like Observer or Strategy');
    }

    return suggestions;
  }

  private invalidateCache(): void {
    this.cache.clear();
  }
}