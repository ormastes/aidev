/**
 * Core dependency graph implementation with cycle detection
 */

import { Graph, alg } from "graphlib";
import { DependencyNode, DependencyEdge, CircularDependency } from './types';

export class DependencyGraph {
  private graph: Graph;
  private nodes: Map<string, DependencyNode>;
  private cache: Map<string, CircularDependency[]>;

  constructor() {
    this.graph = new Graph({ directed: true });
    this.nodes = new Map();
    this.cache = new Map();
  }

  /**
   * Add a node to the dependency graph
   */
  addNode(node: DependencyNode): void {
    this.nodes.set(node.id, node);
    this.graph.setNode(node.id, node);
    this.invalidateCache();
  }

  /**
   * Add an edge between two nodes
   */
  addEdge(edge: DependencyEdge): void {
    if (!this.nodes.has(edge.from) || !this.nodes.has(edge.to)) {
      throw new Error(`Cannot add edge: nodes ${edge.from} or ${edge.to} do not exist`);
    }
    
    this.graph.setEdge(edge.from, edge.to, edge);
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
  getEdges(): DependencyEdge[] {
    return this.graph.edges().map((edge: any) => this.graph.edge(edge.v, edge.w));
  }

  /**
   * Find all circular dependencies using Tarjan's strongly connected components algorithm
   */
  findCircularDependencies(): CircularDependency[] {
    const cacheKey = 'all_cycles';
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const sccs = alg.tarjan(this.graph);
    const cycles: CircularDependency[] = [];

    for (const scc of sccs) {
      if (scc.length > 1) {
        // This is a circular dependency
        const cycle = this.buildCycle(scc);
        if (cycle) {
          cycles.push(cycle);
        }
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

    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: CircularDependency[] = [];

    this.dfsDetectCycles(nodeId, visited, recursionStack, cycles);
    return cycles;
  }

  /**
   * Get dependency path between two nodes
   */
  getDependencyPath(from: string, to: string): string[] | null {
    try {
      return alg.dijkstra(this.graph, from)[to]?.distance !== Infinity 
        ? this.reconstructPath(from, to)
        : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get statistics about the graph
   */
  getStatistics() {
    const nodeCount = this.graph.nodeCount();
    const edgeCount = this.graph.edgeCount();
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
      density: edgeCount / (nodeCount * (nodeCount - 1)),
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
    for (const edge of this.graph.edges()) {
      const edgeData = this.graph.edge(edge.v, edge.w);
      const isInCycle = this.isEdgeInAnyCycle(edge.v, edge.w, cycles);
      const color = isInCycle ? 'red' : 'black';
      const style = isInCycle ? 'bold' : 'solid';
      
      dot += `  "${edge.v}" -> "${edge.w}" [color="${color}", style="${style}"];\n`;
    }

    dot += '}\n';
    return dot;
  }

  /**
   * Clear the graph
   */
  clear(): void {
    this.graph = new Graph({ directed: true });
    this.nodes.clear();
    this.cache.clear();
  }

  private buildCycle(scc: string[]): CircularDependency | null {
    if (scc.length < 2) return null;

    // Find the actual cycle path within the SCC
    const cycle = this.findCycleInSCC(scc);
    if (!cycle || cycle.length < 2) return null;

    const affectedFiles = cycle.map(nodeId => this.nodes.get(nodeId)?.path || nodeId);
    const edgeTypes = new Set<string>();

    // Analyze edge types in the cycle
    for (let i = 0; i < cycle.length; i++) {
      const from = cycle[i];
      const to = cycle[(i + 1) % cycle.length];
      const edge = this.graph.edge(from, to);
      if (edge) {
        edgeTypes.add(edge.type);
      }
    }

    const type = edgeTypes.size === 1 
      ? Array.from(edgeTypes)[0] as any
      : 'mixed' as any;

    return {
      cycle,
      type,
      severity: this.determineSeverity(type, cycle.length),
      description: `Circular dependency detected: ${cycle.join(' → ')} → ${cycle[0]}`,
      suggestions: this.generateSuggestions(cycle, type),
      affected_files: affectedFiles
    };
  }

  private findCycleInSCC(scc: string[]): string[] | null {
    // Use DFS to find an actual cycle within the SCC
    const visited = new Set<string>();
    const path: string[] = [];

    const dfs = (nodeId: string): string[] | null => {
      if (path.includes(nodeId)) {
        const cycleStart = path.indexOf(nodeId);
        return path.slice(cycleStart).concat(nodeId);
      }

      if (visited.has(nodeId)) return null;

      visited.add(nodeId);
      path.push(nodeId);

      const successors = this.graph.successors(nodeId) || [];
      for (const successor of successors) {
        if (scc.includes(successor)) {
          const result = dfs(successor);
          if (result) return result;
        }
      }

      path.pop();
      return null;
    };

    for (const nodeId of scc) {
      visited.clear();
      path.length = 0;
      const cycle = dfs(nodeId);
      if (cycle && cycle.length > 2) {
        return cycle.slice(0, -1); // Remove duplicate of first node
      }
    }

    return null;
  }

  private dfsDetectCycles(
    nodeId: string,
    visited: Set<string>,
    recursionStack: Set<string>,
    cycles: CircularDependency[]
  ): void {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const successors = this.graph.successors(nodeId) || [];
    for (const successor of successors) {
      if (!visited.has(successor)) {
        this.dfsDetectCycles(successor, visited, recursionStack, cycles);
      } else if (recursionStack.has(successor)) {
        // Found a back edge - this indicates a cycle
        const cycle = this.extractCycleFromStack(recursionStack, successor, nodeId);
        if (cycle) {
          cycles.push(cycle);
        }
      }
    }

    recursionStack.delete(nodeId);
  }

  private extractCycleFromStack(
    recursionStack: Set<string>,
    cycleStart: string,
    cycleEnd: string
  ): CircularDependency | null {
    const stackArray = Array.from(recursionStack);
    const startIndex = stackArray.indexOf(cycleStart);
    if (startIndex === -1) return null;

    const cycle = stackArray.slice(startIndex);
    return this.buildCycle(cycle);
  }

  private reconstructPath(from: string, to: string): string[] {
    // Simplified path reconstruction - in a real implementation,
    // you would use the actual shortest path algorithm result
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

      const successors = this.graph.successors(current) || [];
      for (const successor of successors) {
        if (dfs(successor)) return true;
      }

      path.pop();
      return false;
    };

    return dfs(from) ? path : [];
  }

  private getNodeColor(language: string): string {
    switch (language) {
      case "typescript": return 'blue';
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