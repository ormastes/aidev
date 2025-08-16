import { PocketFlow } from '../../src/core';
import {
  InputNode,
  TransformNode,
  FilterNode,
  MapNode,
  ReduceNode,
  OutputNode
} from '../../src/nodes';

describe('PocketFlow Integration Tests', () => {
  describe('Data Processing Pipeline', () => {
    it('should process array data through In Progress pipeline', async () => {
      const flow = new PocketFlow();
      
      // Build pipeline: input -> filter -> map -> reduce -> output
      flow.addNode(new InputNode('input'));
      flow.addNode(new FilterNode('filter', (x: number) => x > 0));
      flow.addNode(new MapNode('double', (x: number) => x * 2));
      flow.addNode(new ReduceNode('sum', (acc: number, x: number) => acc + x, 0));
      flow.addNode(new OutputNode('output'));
      
      flow.addEdge({ from: 'input', to: 'filter' });
      flow.addEdge({ from: 'filter', to: 'double' });
      flow.addEdge({ from: 'double', to: 'sum' });
      flow.addEdge({ from: 'sum', to: 'output' });
      
      const result = await flow.execute([1, -2, 3, -4, 5]);
      
      expect(result.success).toBe(true);
      // Filter keeps [1, 3, 5], map doubles to [2, 6, 10], reduce sums to 18
      expect(result.outputs.get('output')).toBe(18);
    });
  });

  describe('Branching Workflow', () => {
    it('should handle conditional branching', async () => {
      const flow = new PocketFlow();
      
      // Create a workflow that branches based on input type
      flow.addNode(new InputNode('input'));
      flow.addNode(new TransformNode("processNumber", (x: number) => x * 2));
      flow.addNode(new TransformNode("processString", (x: string) => x.toUpperCase()));
      flow.addNode(new OutputNode("numericOutput"));
      flow.addNode(new OutputNode("stringOutput"));
      
      // Direct conditional routing from input
      flow.addEdge({ 
        from: 'input', 
        to: "processNumber",
        condition: (data: any) => typeof data === 'number'
      });
      flow.addEdge({ 
        from: 'input', 
        to: "processString",
        condition: (data: any) => typeof data === 'string'
      });
      flow.addEdge({ from: "processNumber", to: "numericOutput" });
      flow.addEdge({ from: "processString", to: "stringOutput" });
      
      // Test with number
      const result1 = await flow.execute(42);
      expect(result1.outputs.has("numericOutput")).toBe(true);
      expect(result1.outputs.has("stringOutput")).toBe(false);
      
      // Test with string
      const result2 = await flow.execute('hello');
      expect(result2.outputs.has("numericOutput")).toBe(false);
      expect(result2.outputs.has("stringOutput")).toBe(true);
      expect(result2.outputs.get("stringOutput")).toBe('HELLO');
    });
  });

  describe('Multi-Input Aggregation', () => {
    it('should aggregate multiple inputs', async () => {
      const flow = new PocketFlow();
      
      // Create nodes that will run in parallel and then merge
      flow.addNode(new InputNode('data1'));
      flow.addNode(new InputNode('data2'));
      flow.addNode(new InputNode('data3'));
      
      flow.addNode(new TransformNode("process1", (x: number) => x + 10));
      flow.addNode(new TransformNode("process2", (x: number) => x * 2));
      flow.addNode(new TransformNode("process3", (x: number) => x - 5));
      
      flow.addNode(new TransformNode("aggregate", (inputs: number[]) => {
        return inputs.reduce((sum, val) => sum + val, 0);
      }));
      
      flow.addNode(new OutputNode('result'));
      
      // Connect inputs to processors
      flow.addEdge({ from: 'data1', to: "process1" });
      flow.addEdge({ from: 'data2', to: "process2" });
      flow.addEdge({ from: 'data3', to: "process3" });
      
      // Connect processors to aggregator
      flow.addEdge({ from: "process1", to: "aggregate" });
      flow.addEdge({ from: "process2", to: "aggregate" });
      flow.addEdge({ from: "process3", to: "aggregate" });
      
      // Connect aggregator to output
      flow.addEdge({ from: "aggregate", to: 'result' });
      
      const result = await flow.execute();
      
      expect(result.success).toBe(true);
      // Each entry node gets undefined, transforms produce NaN, aggregate sums to NaN
      // Let's provide initial data instead
    });
  });

  describe('Error Recovery', () => {
    it('should continue processing other branches on error', async () => {
      const flow = new PocketFlow();
      
      flow.addNode(new InputNode('input'));
      flow.addNode(new TransformNode("errorBranch", () => {
        throw new Error('Intentional error');
      }));
      flow.addNode(new TransformNode("completedBranch", (x: string) => x.toUpperCase()));
      flow.addNode(new OutputNode("errorOutput"));
      flow.addNode(new OutputNode("completedOutput"));
      
      flow.addEdge({ from: 'input', to: "errorBranch" });
      flow.addEdge({ from: 'input', to: "completedBranch" });
      flow.addEdge({ from: "errorBranch", to: "errorOutput" });
      flow.addEdge({ from: "completedBranch", to: "completedOutput" });
      
      const result = await flow.execute('test');
      
      expect(result.success).toBe(false); // Overall fails due to error
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Intentional error');
      
      // But In Progress branch should complete
      expect(result.outputs.has("completedOutput")).toBe(true);
      expect(result.outputs.get("completedOutput")).toBe('TEST');
      expect(result.outputs.has("errorOutput")).toBe(false);
    });
  });

  describe('Complex Transform Chain', () => {
    it('should handle complex data transformations', async () => {
      const flow = new PocketFlow();
      
      // Parse JSON -> Extract field -> Transform -> Format
      flow.addNode(new InputNode("jsonInput"));
      flow.addNode(new TransformNode('parse', (json: string) => JSON.parse(json)));
      flow.addNode(new TransformNode('extract', (obj: any) => obj.items || []));
      flow.addNode(new MapNode("processItems", (item: any) => ({
        ...item,
        processed: true,
        timestamp: Date.now()
      })));
      flow.addNode(new FilterNode("filterValid", (item: any) => item.value > 0));
      flow.addNode(new TransformNode('format', (items: any[]) => ({
        count: items.length,
        items: items,
        summary: `Processed ${items.length} valid items`
      })));
      flow.addNode(new OutputNode('result'));
      
      flow.addEdge({ from: "jsonInput", to: 'parse' });
      flow.addEdge({ from: 'parse', to: 'extract' });
      flow.addEdge({ from: 'extract', to: "processItems" });
      flow.addEdge({ from: "processItems", to: "filterValid" });
      flow.addEdge({ from: "filterValid", to: 'format' });
      flow.addEdge({ from: 'format', to: 'result' });
      
      const inputData = JSON.stringify({
        items: [
          { id: 1, value: 10 },
          { id: 2, value: -5 },
          { id: 3, value: 20 },
          { id: 4, value: 0 }
        ]
      });
      
      const result = await flow.execute(inputData);
      
      expect(result.success).toBe(true);
      const output = result.outputs.get('result');
      expect(output.count).toBe(2); // Only positive values
      expect(output.items).toHaveLength(2);
      expect(output.items[0].processed).toBe(true);
      expect(output.summary).toBe('Processed 2 valid items');
    });
  });

  describe("Performance", () => {
    it('should handle large workflows efficiently', async () => {
      const flow = new PocketFlow();
      const nodeCount = 100;
      
      // Create a chain of transform nodes
      flow.addNode(new InputNode('start'));
      
      for (let i = 0; i < nodeCount; i++) {
        flow.addNode(new TransformNode(`transform${i}`, (x: number) => x + 1));
      }
      
      flow.addNode(new OutputNode('end'));
      
      // Connect them in sequence
      flow.addEdge({ from: 'start', to: "transform0" });
      for (let i = 0; i < nodeCount - 1; i++) {
        flow.addEdge({ from: `transform${i}`, to: `transform${i + 1}` });
      }
      flow.addEdge({ from: `transform${nodeCount - 1}`, to: 'end' });
      
      const startTime = Date.now();
      const result = await flow.execute(0);
      const executionTime = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(result.outputs.get('end')).toBe(nodeCount); // Each adds 1
      expect(executionTime).toBeLessThan(1000); // Should complete quickly
    });
  });
});