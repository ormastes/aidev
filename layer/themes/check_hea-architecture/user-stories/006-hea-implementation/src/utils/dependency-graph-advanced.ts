export interface GraphNode {
  id: string;
  data?: any;
}

export interface GraphMetrics {
  fanIn: Map<string, number>;
  fanOut: Map<string, number>;
  cyclomatic: number;
}

export class DependencyGraph {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, Set<string>> = new Map();
  private reverseEdges: Map<string, Set<string>> = new Map();

  /**
   * Add a node to the graph
   */
  addNode(id: string, data?: any): void {
    if (!this.nodes.has(id)) {
      this.nodes.set(id, { id, data });
      this.edges.set(id, new Set());
      this.reverseEdges.set(id, new Set());
    }
  }

  /**
   * Add an edge from source to target
   */
  addEdge(source: string, target: string): void {
    // Ensure both nodes exist
    this.addNode(source);
    this.addNode(target);

    // Add forward edge
    this.edges.get(source)!.add(target);
    
    // Add reverse edge for efficient queries
    this.reverseEdges.get(target)!.add(source);
  }

  /**
   * Get all nodes
   */
  getNodes(): string[] {
    return Array.from(this.nodes.keys());
  }

  /**
   * Get direct dependencies of a node
   */
  getDependencies(nodeId: string): string[] {
    return Array.from(this.edges.get(nodeId) || []);
  }

  /**
   * Get nodes that depend on this node
   */
  getDependents(nodeId: string): string[] {
    return Array.from(this.reverseEdges.get(nodeId) || []);
  }

  /**
   * Find cycles in the graph using DFS
   */
  findCycles(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (node: string, path: string[]): void => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const dependencies = this.edges.get(node) || new Set();
      for (const dep of dependencies) {
        if (!visited.has(dep)) {
          dfs(dep, [...path]);
        } else if (recursionStack.has(dep)) {
          // Found a cycle
          const cycleStart = path.indexOf(dep);
          cycles.push([...path.slice(cycleStart), dep]);
        }
      }

      recursionStack.delete(node);
    };

    // Check each node
    for (const node of this.nodes.keys()) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }

    return cycles;
  }

  /**
   * Topological sort (returns null if cycles exist)
   */
  topologicalSort(): string[] | null {
    const inDegree = new Map<string, number>();
    const queue: string[] = [];
    const result: string[] = [];

    // Initialize in-degrees
    for (const node of this.nodes.keys()) {
      inDegree.set(node, this.reverseEdges.get(node)?.size || 0);
    }

    // Find nodes with no dependencies
    for (const [node, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(node);
      }
    }

    // Process queue
    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);

      // Reduce in-degree of dependents
      const dependents = this.edges.get(node) || new Set();
      for (const dep of dependents) {
        const newDegree = (inDegree.get(dep) || 0) - 1;
        inDegree.set(dep, newDegree);
        
        if (newDegree === 0) {
          queue.push(dep);
        }
      }
    }

    // If not all nodes processed, there's a cycle
    return result.length === this.nodes.size ? result : null;
  }

  /**
   * Find all paths between two nodes
   */
  findAllPaths(source: string, target: string): string[][] {
    const paths: string[][] = [];
    const visited = new Set<string>();

    const dfs = (current: string, path: string[]): void => {
      if (current === target) {
        paths.push([...path]);
        return;
      }

      visited.add(current);
      const dependencies = this.edges.get(current) || new Set();
      
      for (const dep of dependencies) {
        if (!visited.has(dep)) {
          dfs(dep, [...path, dep]);
        }
      }
      
      visited.delete(current);
    };

    if (this.nodes.has(source) && this.nodes.has(target)) {
      dfs(source, [source]);
    }

    return paths;
  }

  /**
   * Get all modules impacted by changes to a given module
   */
  getImpactedModules(moduleId: string): string[] {
    const impacted = new Set<string>();
    const queue = [moduleId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const dependents = this.reverseEdges.get(current) || new Set();
      
      for (const dep of dependents) {
        if (!impacted.has(dep)) {
          impacted.add(dep);
          queue.push(dep);
        }
      }
    }

    return Array.from(impacted);
  }

  /**
   * Calculate graph metrics
   */
  calculateMetrics(): GraphMetrics {
    const fanIn = new Map<string, number>();
    const fanOut = new Map<string, number>();

    for (const node of this.nodes.keys()) {
      fanIn.set(node, this.reverseEdges.get(node)?.size || 0);
      fanOut.set(node, this.edges.get(node)?.size || 0);
    }

    // Cyclomatic complexity = edges - nodes + 2
    const edgeCount = Array.from(this.edges.values())
      .reduce((sum, edges) => sum + edges.size, 0);
    const cyclomatic = edgeCount - this.nodes.size + 2;

    return { fanIn, fanOut, cyclomatic };
  }

  /**
   * Calculate cohesion within layers
   */
  calculateLayerCohesion(): Map<string, number> {
    const layerCohesion = new Map<string, number>();
    const layerNodes = new Map<string, string[]>();

    // Group nodes by layer
    for (const [nodeId, node] of this.nodes.entries()) {
      const layer = node.data?.layer || nodeId.split('/')[0];
      if (!layerNodes.has(layer)) {
        layerNodes.set(layer, []);
      }
      layerNodes.get(layer)!.push(nodeId);
    }

    // Calculate cohesion for each layer
    for (const [layer, nodes] of layerNodes.entries()) {
      if (nodes.length <= 1) {
        layerCohesion.set(layer, 1); // Single node layer has perfect cohesion
        continue;
      }

      let internalEdges = 0;
      let externalEdges = 0;

      for (const node of nodes) {
        const dependencies = this.edges.get(node) || new Set();
        for (const dep of dependencies) {
          if (nodes.includes(dep)) {
            internalEdges++;
          } else {
            externalEdges++;
          }
        }
      }

      // Cohesion = internal edges / total edges
      const totalEdges = internalEdges + externalEdges;
      const cohesion = totalEdges > 0 ? internalEdges / totalEdges : 0;
      layerCohesion.set(layer, cohesion);
    }

    return layerCohesion;
  }

  /**
   * Identify architectural hotspots
   */
  identifyHotspots(threshold: number = 3): string[] {
    const hotspots: string[] = [];
    const metrics = this.calculateMetrics();

    for (const [node, fanOut] of metrics.fanOut.entries()) {
      if (fanOut >= threshold) {
        hotspots.push(node);
      }
    }

    return hotspots.sort((a, b) => 
      (metrics.fanOut.get(b) || 0) - (metrics.fanOut.get(a) || 0)
    );
  }

  /**
   * Export to DOT format for visualization
   */
  toDot(): string {
    const lines = ['digraph DependencyGraph {'];
    
    // Add nodes with layer information
    for (const [nodeId, node] of this.nodes.entries()) {
      const layer = node.data?.layer || 'unknown';
      const color = {
        core: 'lightblue',
        shared: 'lightgreen',
        themes: 'lightyellow',
        infrastructure: 'lightcoral',
      }[layer] || 'white';
      
      lines.push(`  "${nodeId}" [fillcolor="${color}", style="filled"];`);
    }
    
    // Add edges
    for (const [source, targets] of this.edges.entries()) {
      for (const target of targets) {
        lines.push(`  "${source}" -> "${target}";`);
      }
    }
    
    lines.push('}');
    return lines.join('\n');
  }
}