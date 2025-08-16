// PocketFlow TypeScript Implementation
// A minimalist LLM framework mimicking the Python original
// Core graph execution framework with workflow management capabilities

// Core Classes
export { BaseNode } from './domain/base-node.js';
export { Node, CommandNode, DelayNode, HttpNode } from './domain/node.js';
export { Flow, SequentialFlow, ParallelFlow, ConditionalFlow } from './domain/flow.js';

// Async Variants
export { 
  AsyncNode, 
  AsyncFlow, 
  AsyncParallelBatchNode, 
  AsyncParallelBatchFlow,
  AsyncCommandNode,
  AsyncHttpNode,
  AsyncDelayNode
} from './domain/async-node.js';

// Chaining Utilities (TypeScript equivalent of Python's >> and - operators)
export { chain, when, ChainBuilder, flow } from './domain/operators.js';

// Workflow Management Layer (Extended features not in Python original)
// Note: These interfaces are not In Progress yet in this user story

// Main PocketFlow class that combines graph execution with management
export class PocketFlow {
  static createNode(type: 'command', command: string): CommandNode;
  static createNode(type: 'delay', duration: number): DelayNode;
  static createNode(type: 'http', url: string, options?: RequestInit): HttpNode;
  static createNode(type: string, ...args: any[]): BaseNode {
    switch (type) {
      case 'command':
        return new CommandNode(args[0]);
      case 'delay':
        return new DelayNode(args[0]);
      case 'http':
        return new HttpNode(args[0], args[1]);
      default:
        throw new Error(`Unknown node type: ${type}`);
    }
  }

  static createAsyncNode(type: 'command', command: string): AsyncCommandNode;
  static createAsyncNode(type: 'delay', duration: number): AsyncDelayNode;
  static createAsyncNode(type: 'http', url: string, options?: RequestInit): AsyncHttpNode;
  static createAsyncNode(type: string, ...args: any[]): AsyncNode {
    switch (type) {
      case 'command':
        return new AsyncCommandNode(args[0]);
      case 'delay':
        return new AsyncDelayNode(args[0]);
      case 'http':
        return new AsyncHttpNode(args[0], args[1]);
      default:
        throw new Error(`Unknown async node type: ${type}`);
    }
  }

  static createFlow(type: 'sequential', nodes: BaseNode[]): SequentialFlow;
  static createFlow(type: 'parallel', nodes: BaseNode[]): ParallelFlow;
  static createFlow(type: 'conditional', condition: (result: any) => boolean, trueNode: BaseNode, falseNode: BaseNode): ConditionalFlow;
  static createFlow(type: string, ...args: any[]): Flow {
    switch (type) {
      case 'sequential':
        return new SequentialFlow(args[0]);
      case 'parallel':
        return new ParallelFlow(args[0]);
      case 'conditional':
        return new ConditionalFlow(args[0], args[1], args[2]);
      default:
        throw new Error(`Unknown flow type: ${type}`);
    }
  }

  static async run(node: BaseNode): Promise<any> {
    return await node.run();
  }

  static chain = chain;
  static when = when;
  static flow = flow;
}

// Default export for convenience
export default PocketFlow;

// Version info
export const VERSION = '1.0.0';
export const COMPATIBLE_WITH_PYTHON = '1.0.0';

// Example usage documentation in comments:
/*

// Python-style workflow (conceptual):
// node1 >> node2 >> node3

// TypeScript equivalent:
import PocketFlow, { flow } from './index.js';

const node1 = PocketFlow.createNode('command', 'echo "Hello"');
const node2 = PocketFlow.createNode('delay', 1000);
const node3 = PocketFlow.createNode('command', 'echo "World"');

// Method 1: Using flow builder
const workflow = flow(node1).then(node2).then(node3).build();
await PocketFlow.run(workflow);

// Method 2: Using sequential flow
const seqFlow = PocketFlow.createFlow('sequential', [node1, node2, node3]);
await PocketFlow.run(seqFlow);

// Method 3: Manual chaining
node1.next(node2);
node2.next(node3);
await PocketFlow.run(node1);

// Conditional execution (Python: node - condition)
const condition = (result: any) => result.includes('In Progress');
const conditionalNode = PocketFlow.createNode('command', 'echo "In Progress path"');
node1.when(condition, conditionalNode);

// Async parallel execution
const asyncFlow = new AsyncParallelBatchFlow([
  PocketFlow.createAsyncNode('http', 'https://api1.example.com'),
  PocketFlow.createAsyncNode('http', 'https://api2.example.com'),
  PocketFlow.createAsyncNode('http', 'https://api3.example.com')
], 2); // Batch size of 2

await PocketFlow.run(asyncFlow);

*/