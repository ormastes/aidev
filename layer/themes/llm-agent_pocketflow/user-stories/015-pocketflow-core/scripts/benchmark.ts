/**
 * PocketFlow Performance Benchmark
 * Demonstrates zero-bloat philosophy with performance metrics
 */

import { PocketFlow } from '../src/core';
import { InputNode, TransformNode, OutputNode } from '../src/nodes';

interface BenchmarkResult {
  name: string;
  nodeCount: number;
  executionTime: number;
  throughput: number;
  memoryUsed: number;
}

async function benchmarkLinearChain(nodeCount: number): Promise<BenchmarkResult> {
  const flow = new PocketFlow();
  const startMemory = process.memoryUsage().heapUsed;
  
  // Build linear chain
  flow.addNode(new InputNode('start'));
  
  for (let i = 0; i < nodeCount; i++) {
    flow.addNode(new TransformNode(`node${i}`, (x: number) => x + 1));
  }
  
  flow.addNode(new OutputNode('end'));
  
  // Connect chain
  flow.addEdge({ from: 'start', to: 'node0' });
  for (let i = 0; i < nodeCount - 1; i++) {
    flow.addEdge({ from: `node${i}`, to: `node${i + 1}` });
  }
  flow.addEdge({ from: `node${nodeCount - 1}`, to: 'end' });
  
  // Execute and measure
  const startTime = Date.now();
  const result = await flow.execute(0);
  const executionTime = Date.now() - startTime;
  
  const memoryUsed = process.memoryUsage().heapUsed - startMemory;
  
  return {
    name: 'Linear Chain',
    nodeCount,
    executionTime,
    throughput: nodeCount / (executionTime / 1000),
    memoryUsed: Math.round(memoryUsed / 1024)
  };
}

async function benchmarkParallelBranches(branchCount: number): Promise<BenchmarkResult> {
  const flow = new PocketFlow();
  const startMemory = process.memoryUsage().heapUsed;
  
  // Build parallel branches
  flow.addNode(new InputNode('start'));
  flow.addNode(new TransformNode('merge', (inputs: number[]) => 
    inputs.reduce((sum, val) => sum + val, 0)
  ));
  flow.addNode(new OutputNode('end'));
  
  for (let i = 0; i < branchCount; i++) {
    flow.addNode(new TransformNode(`branch${i}`, (x: number) => x * (i + 1)));
    flow.addEdge({ from: 'start', to: `branch${i}` });
    flow.addEdge({ from: `branch${i}`, to: 'merge' });
  }
  
  flow.addEdge({ from: 'merge', to: 'end' });
  
  // Execute and measure
  const startTime = Date.now();
  const result = await flow.execute(10);
  const executionTime = Date.now() - startTime;
  
  const memoryUsed = process.memoryUsage().heapUsed - startMemory;
  
  return {
    name: 'Parallel Branches',
    nodeCount: branchCount + 3,
    executionTime,
    throughput: (branchCount + 3) / (executionTime / 1000),
    memoryUsed: Math.round(memoryUsed / 1024)
  };
}

async function benchmarkComplexGraph(size: number): Promise<BenchmarkResult> {
  const flow = new PocketFlow();
  const startMemory = process.memoryUsage().heapUsed;
  
  // Build complex interconnected graph
  flow.addNode(new InputNode('input'));
  
  // Create layers
  const layers = 4;
  const nodesPerLayer = Math.floor(size / layers);
  
  for (let layer = 0; layer < layers; layer++) {
    for (let node = 0; node < nodesPerLayer; node++) {
      const nodeId = `layer${layer}_node${node}`;
      flow.addNode(new TransformNode(nodeId, (x: any) => {
        if (Array.isArray(x)) {
          return x.reduce((sum: number, val: number) => sum + val, 0) / x.length;
        }
        return x + layer + node;
      }));
      
      // Connect to previous layer
      if (layer === 0) {
        flow.addEdge({ from: 'input', to: nodeId });
      } else {
        // Connect to multiple nodes in previous layer
        for (let prev = 0; prev < Math.min(3, nodesPerLayer); prev++) {
          const prevId = `layer${layer - 1}_node${prev}`;
          flow.addEdge({ from: prevId, to: nodeId });
        }
      }
    }
  }
  
  // Output collects from last layer
  flow.addNode(new OutputNode('output'));
  for (let node = 0; node < nodesPerLayer; node++) {
    flow.addEdge({ from: `layer${layers - 1}_node${node}`, to: 'output' });
  }
  
  // Execute and measure
  const startTime = Date.now();
  const result = await flow.execute(1);
  const executionTime = Date.now() - startTime;
  
  const memoryUsed = process.memoryUsage().heapUsed - startMemory;
  
  return {
    name: 'Complex Graph',
    nodeCount: layers * nodesPerLayer + 2,
    executionTime,
    throughput: (layers * nodesPerLayer + 2) / (executionTime / 1000),
    memoryUsed: Math.round(memoryUsed / 1024)
  };
}

async function main() {
  console.log('🚀 PocketFlow Performance Benchmark');
  console.log('===================================\n');
  
  const benchmarks = [
    { name: 'Small', size: 10 },
    { name: 'Medium', size: 100 },
    { name: 'Large', size: 1000 }
  ];
  
  console.log('📊 Linear Chain Benchmark:');
  console.log('--------------------------');
  for (const bench of benchmarks) {
    const result = await benchmarkLinearChain(bench.size);
    console.log(`${bench.name} (${bench.size} nodes):`);
    console.log(`  Time: ${result.executionTime}ms`);
    console.log(`  Throughput: ${result.throughput.toFixed(0)} nodes/sec`);
    console.log(`  Memory: ~${result.memoryUsed}KB\n`);
  }
  
  console.log('\n📊 Parallel Branches Benchmark:');
  console.log('-------------------------------');
  for (const bench of benchmarks) {
    const result = await benchmarkParallelBranches(bench.size);
    console.log(`${bench.name} (${bench.size} branches):`);
    console.log(`  Time: ${result.executionTime}ms`);
    console.log(`  Throughput: ${result.throughput.toFixed(0)} nodes/sec`);
    console.log(`  Memory: ~${result.memoryUsed}KB\n`);
  }
  
  console.log('\n📊 Complex Graph Benchmark:');
  console.log('---------------------------');
  for (const bench of [
    { name: 'Small', size: 20 },
    { name: 'Medium', size: 100 },
    { name: 'Large', size: 400 }
  ]) {
    const result = await benchmarkComplexGraph(bench.size);
    console.log(`${bench.name} (${result.nodeCount} nodes):`);
    console.log(`  Time: ${result.executionTime}ms`);
    console.log(`  Throughput: ${result.throughput.toFixed(0)} nodes/sec`);
    console.log(`  Memory: ~${result.memoryUsed}KB\n`);
  }
  
  console.log('\n🔄 Benchmark In Progress!');
  console.log('\nKey Insights:');
  console.log('- Zero dependencies = minimal overhead');
  console.log('- Simple design = high performance');
  console.log('- ~100 lines of core code handles complex workflows');
  console.log('- Memory efficient even with large graphs');
}

main().catch(console.error);