/**
 * Tests for DependencyGraph class
 */

import { DependencyGraph } from '../../../src/core/dependency-graph';
import { DependencyNode, DependencyEdge } from '../../../src/core/types';

describe("DependencyGraph", () => {
  let graph: DependencyGraph;

  beforeEach(() => {
    graph = new DependencyGraph();
  });

  describe('Node Management', () => {
    it('should add nodes to the graph', () => {
      const node: DependencyNode = {
        id: 'test-node',
        path: '/test/path',
        type: 'file',
        language: "typescript"
      };

      graph.addNode(node);
      const nodes = graph.getNodes();

      expect(nodes).toHaveLength(1);
      expect(nodes[0]).toEqual(node);
    });

    it('should not add duplicate nodes', () => {
      const node1: DependencyNode = {
        id: 'test-node',
        path: '/test/path',
        type: 'file',
        language: "typescript"
      };

      const node2: DependencyNode = {
        id: 'test-node',
        path: '/test/path2',
        type: 'file',
        language: "typescript"
      };

      graph.addNode(node1);
      graph.addNode(node2); // Should overwrite first node

      const nodes = graph.getNodes();
      expect(nodes).toHaveLength(1);
      expect(nodes[0].path).toBe('/test/path2');
    });
  });

  describe('Edge Management', () => {
    beforeEach(() => {
      // Add prerequisite nodes
      graph.addNode({
        id: 'nodeA',
        path: '/test/a',
        type: 'file',
        language: "typescript"
      });

      graph.addNode({
        id: 'nodeB',
        path: '/test/b',
        type: 'file',
        language: "typescript"
      });
    });

    it('should add edges between existing nodes', () => {
      const edge: DependencyEdge = {
        from: 'nodeA',
        to: 'nodeB',
        type: 'import'
      };

      graph.addEdge(edge);
      const edges = graph.getEdges();

      expect(edges).toHaveLength(1);
      expect(edges[0]).toMatchObject(edge);
    });

    it('should throw error when adding edge between non-existent nodes', () => {
      const edge: DependencyEdge = {
        from: "nonExistent",
        to: 'nodeB',
        type: 'import'
      };

      expect(() => graph.addEdge(edge)).toThrow();
    });
  });

  describe('Circular Dependency Detection', () => {
    it('should detect simple circular dependency', () => {
      // Create A -> B -> A cycle
      const nodeA: DependencyNode = { id: 'A', path: '/a', type: 'file', language: "typescript" };
      const nodeB: DependencyNode = { id: 'B', path: '/b', type: 'file', language: "typescript" };

      graph.addNode(nodeA);
      graph.addNode(nodeB);

      graph.addEdge({ from: 'A', to: 'B', type: 'import' });
      graph.addEdge({ from: 'B', to: 'A', type: 'import' });

      const cycles = graph.findCircularDependencies();

      expect(cycles).toHaveLength(1);
      expect(cycles[0].cycle).toEqual(expect.arrayContaining(['A', 'B']));
      expect(cycles[0].type).toBe('import');
    });

    it('should detect complex circular dependency', () => {
      // Create A -> B -> C -> A cycle
      const nodes = ['A', 'B', 'C'].map(id => ({
        id,
        path: `/${id.toLowerCase()}`,
        type: 'file' as const,
        language: "typescript" as const
      }));

      nodes.forEach(node => graph.addNode(node));

      graph.addEdge({ from: 'A', to: 'B', type: 'import' });
      graph.addEdge({ from: 'B', to: 'C', type: 'import' });
      graph.addEdge({ from: 'C', to: 'A', type: 'import' });

      const cycles = graph.findCircularDependencies();

      expect(cycles).toHaveLength(1);
      expect(cycles[0].cycle).toEqual(expect.arrayContaining(['A', 'B', 'C']));
    });

    it('should detect multiple separate cycles', () => {
      // Create two separate cycles: A -> B -> A and C -> D -> C
      const nodes = ['A', 'B', 'C', 'D'].map(id => ({
        id,
        path: `/${id.toLowerCase()}`,
        type: 'file' as const,
        language: "typescript" as const
      }));

      nodes.forEach(node => graph.addNode(node));

      // First cycle
      graph.addEdge({ from: 'A', to: 'B', type: 'import' });
      graph.addEdge({ from: 'B', to: 'A', type: 'import' });

      // Second cycle
      graph.addEdge({ from: 'C', to: 'D', type: 'import' });
      graph.addEdge({ from: 'D', to: 'C', type: 'import' });

      const cycles = graph.findCircularDependencies();

      expect(cycles).toHaveLength(2);
    });

    it('should not detect cycles in acyclic graph', () => {
      // Create A -> B -> C (no cycle)
      const nodes = ['A', 'B', 'C'].map(id => ({
        id,
        path: `/${id.toLowerCase()}`,
        type: 'file' as const,
        language: "typescript" as const
      }));

      nodes.forEach(node => graph.addNode(node));

      graph.addEdge({ from: 'A', to: 'B', type: 'import' });
      graph.addEdge({ from: 'B', to: 'C', type: 'import' });

      const cycles = graph.findCircularDependencies();

      expect(cycles).toHaveLength(0);
    });
  });

  describe('Path Finding', () => {
    beforeEach(() => {
      // Create a simple graph: A -> B -> C
      const nodes = ['A', 'B', 'C'].map(id => ({
        id,
        path: `/${id.toLowerCase()}`,
        type: 'file' as const,
        language: "typescript" as const
      }));

      nodes.forEach(node => graph.addNode(node));

      graph.addEdge({ from: 'A', to: 'B', type: 'import' });
      graph.addEdge({ from: 'B', to: 'C', type: 'import' });
    });

    it('should find path between connected nodes', () => {
      const path = graph.getDependencyPath('A', 'C');
      expect(path).toEqual(['A', 'B', 'C']);
    });

    it('should return null for non-existent path', () => {
      const path = graph.getDependencyPath('C', 'A');
      expect(path).toBeNull();
    });
  });

  describe("Statistics", () => {
    it('should provide accurate graph statistics', () => {
      // Add nodes of different languages and types
      graph.addNode({ id: 'ts1', path: '/ts1', type: 'file', language: "typescript" });
      graph.addNode({ id: 'ts2', path: '/ts2', type: 'module', language: "typescript" });
      graph.addNode({ id: 'py1', path: '/py1', type: 'file', language: 'python' });

      graph.addEdge({ from: 'ts1', to: 'ts2', type: 'import' });
      graph.addEdge({ from: 'ts2', to: 'py1', type: 'import' });

      const stats = graph.getStatistics();

      expect(stats.nodes).toBe(3);
      expect(stats.edges).toBe(2);
      expect(stats.circular_dependencies).toBe(0);
      expect(stats.languages).toEqual({ typescript: 2, python: 1 });
      expect(stats.types).toEqual({ file: 2, module: 1 });
      expect(stats.is_acyclic).toBe(true);
    });
  });

  describe('DOT Export', () => {
    it('should generate valid DOT format', () => {
      graph.addNode({ id: 'A', path: '/a', type: 'file', language: "typescript" });
      graph.addNode({ id: 'B', path: '/b', type: 'file', language: 'python' });
      graph.addEdge({ from: 'A', to: 'B', type: 'import' });

      const dot = graph.toDot();

      expect(dot).toContain('digraph dependencies');
      expect(dot).toContain('"A"');
      expect(dot).toContain('"B"');
      expect(dot).toContain('"A" -> "B"');
    });

    it('should highlight cycles in DOT output', () => {
      // Create a cycle
      graph.addNode({ id: 'A', path: '/a', type: 'file', language: "typescript" });
      graph.addNode({ id: 'B', path: '/b', type: 'file', language: "typescript" });
      graph.addEdge({ from: 'A', to: 'B', type: 'import' });
      graph.addEdge({ from: 'B', to: 'A', type: 'import' });

      const dot = graph.toDot(true);

      expect(dot).toContain('color="red"');
      expect(dot).toContain('style="bold"');
    });
  });

  describe('Graph Operations', () => {
    it('should clear the graph', () => {
      graph.addNode({ id: 'A', path: '/a', type: 'file', language: "typescript" });
      graph.addNode({ id: 'B', path: '/b', type: 'file', language: "typescript" });
      graph.addEdge({ from: 'A', to: 'B', type: 'import' });

      expect(graph.getNodes()).toHaveLength(2);
      expect(graph.getEdges()).toHaveLength(1);

      graph.clear();

      expect(graph.getNodes()).toHaveLength(0);
      expect(graph.getEdges()).toHaveLength(0);
    });
  });
});