import { BaseNode } from './base-node.js';

// TypeScript doesn't support operator overloading like Python
// So we'll provide utility functions that mimic the >> and - operators

export function chain(node1: BaseNode, node2: BaseNode): BaseNode {
  return node1.chain(node2);
}

export function when(node: BaseNode, condition: (result: any) => boolean, nextNode: BaseNode): BaseNode {
  return node.when(condition, nextNode);
}

// Alternative fluent API that mimics Python's operator chaining
export class ChainBuilder {
  private rootNode: BaseNode;
  private currentNode: BaseNode;

  constructor(startNode: BaseNode) {
    this.rootNode = startNode;
    this.currentNode = startNode;
  }

  then(node: BaseNode): ChainBuilder {
    this.currentNode.next(node);
    this.currentNode = node;
    return this;
  }

  when(condition: (result: any) => boolean, node: BaseNode): ChainBuilder {
    this.currentNode.when(condition, node);
    return this;
  }

  build(): BaseNode {
    return this.rootNode;
  }

  async run(): Promise<any> {
    return await this.rootNode.run();
  }
}

// Helper function to start a chain
export function flow(startNode: BaseNode): ChainBuilder {
  return new ChainBuilder(startNode);
}

// Extension to BaseNode for fluent chaining
declare module './base-node.js' {
  interface BaseNode {
    then(node: BaseNode): ChainBuilder;
  }
}

// Add the then method to BaseNode prototype
BaseNode.prototype.then = function(node: BaseNode): ChainBuilder {
  return new ChainBuilder(this).then(node);
};

// Examples of usage:
// 
// Python style (conceptual):
// node1 >> node2 >> node3
// node - condition >> conditional_node
//
// TypeScript equivalent:
// flow(node1).then(node2).then(node3).build()
// node1.then(node2).when(condition, conditionalNode).build()
//
// Or using utility functions:
// chain(chain(node1, node2), node3)
// when(node1, condition, conditionalNode)