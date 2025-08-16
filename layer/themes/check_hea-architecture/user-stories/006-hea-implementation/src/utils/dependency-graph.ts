import { LayerConfig, DependencyInfo, DependencyType } from '../interfaces/layer';
import { fs } from '../../../../../infra_external-log-lib/src';
import { path } from '../../../../../infra_external-log-lib/src';

export interface DependencyNode {
  id: string;
  label: string;
  layer: string;
  type: string;
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: DependencyType;
  valid: boolean;
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

export class DependencyGraphBuilder {
  private nodes: Map<string, DependencyNode> = new Map();
  private edges: DependencyEdge[] = [];

  async addLayer(layer: LayerConfig): void {
    const node: DependencyNode = {
      id: layer.name,
      label: layer.name,
      layer: layer.type,
      type: 'layer',
    };
    this.nodes.set(layer.name, node);
  }

  async addModule(layerName: string, moduleName: string): void {
    const id = `${layerName}:${moduleName}`;
    const node: DependencyNode = {
      id,
      label: moduleName,
      layer: layerName,
      type: 'module',
    };
    this.nodes.set(id, node);
  }

  async addDependency(dependency: DependencyInfo): void {
    this.edges.push({
      from: dependency.from,
      to: dependency.to,
      type: dependency.type,
      valid: dependency.valid,
    });
  }

  async build(): DependencyGraph {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
    };
  }

  /**
   * Generate Graphviz DOT format
   */
  async toDot(): string {
    const lines: string[] = ['digraph HEA {'];
    lines.push('  rankdir=TB;');
    lines.push('  node [shape=box];');
    lines.push('');

    // Group nodes by layer
    const layerGroups = new Map<string, DependencyNode[]>();
    for(const node of this.nodes.values()) {
      if(!layerGroups.has(node.layer)) {
        layerGroups.set(node.layer, []);
      }
      layerGroups.get(node.layer)!.push(node);
    }

    // Create subgraphs for each layer
    for(const [layer, nodes] of layerGroups.entries()) {
      lines.push(`  subgraph cluster_${layer} {`);
      lines.push(`    label="${layer}";`);
      lines.push(`    style=filled;`);
      lines.push(`    color=lightgrey;`);
      lines.push(`    node [style=filled,color=white];`);
      
      for(const node of nodes) {
        lines.push(`    "${node.id}" [label="${node.label}"];`);
      }
      
      lines.push('  }');
      lines.push('');
    }

    // Add edges
    for(const edge of this.edges) {
      const style = edge.valid ? 'solid' : 'dashed';
      const color = edge.valid ? 'black' : 'red';
      lines.push(
        `  "${edge.from}" -> "${edge.to}" [style=${style},color=${color}];`
      );
    }

    lines.push('}');
    return lines.join('\n');
  }

  /**
   * Generate Mermaid format
   */
  async toMermaid(): string {
    const lines: string[] = ['graph TB'];
    
    // Add nodes
    for(const node of this.nodes.values()) {
      lines.push(`  ${node.id.replace(/[:-]/g, '_')}["${node.label}"]`);
    }
    
    lines.push('');
    
    // Add edges
    for(const edge of this.edges) {
      const fromId = edge.from.replace(/[:-]/g, '_');
      const toId = edge.to.replace(/[:-]/g, '_');
      const style = edge.valid ? '-->' : '-.->';
      lines.push(`  ${fromId} ${style} ${toId}`);
    }
    
    return lines.join('\n');
  }

  /**
   * Save graph to file
   */
  async save(filePath: string, format: 'dot' | 'mermaid' = 'dot'): void {
    const content = format === 'dot' ? this.toDot() : this.toMermaid();
    await fileAPI.createFile(filePath, content, { type: FileType.TEMPORARY });
  }

  /**
   * Find cycles in the graph
   */
  findCycles(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const adjacencyList = new Map<string, string[]>();

    // Build adjacency list
    for(const edge of this.edges) {
      if(!adjacencyList.has(edge.from)) {
        adjacencyList.set(edge.from, []);
      }
      adjacencyList.get(edge.from)!.push(edge.to);
    }

    const dfs = (node: string, path: string[]): void => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const neighbors = adjacencyList.get(node) || [];
      for(const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path]);
        } else if (recursionStack.has(neighbor)) {
          const cycleStart = path.indexOf(neighbor);
          cycles.push([...path.slice(cycleStart), neighbor]);
        }
      }

      recursionStack.delete(node);
    };

    // Check all nodes
    for(const node of this.nodes.keys()) {
      if(!visited.has(node)) {
        dfs(node, []);
      }
    }

    return cycles;
  }

  /**
   * Calculate metrics
   */
  getMetrics(): {
    nodeCount: number;
    edgeCount: number;
    validEdges: number;
    invalidEdges: number;
    cycleCount: number;
  } {
    const cycles = this.findCycles();
    const validEdges = this.edges.filter(e => e.valid).length;
    const invalidEdges = this.edges.filter(e => !e.valid).length;

    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.length,
      validEdges,
      invalidEdges,
      cycleCount: cycles.length,
    };
  }
}