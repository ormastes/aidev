import { BaseNode } from './base-node';

export class Flow extends BaseNode {
  private startNode: BaseNode | null = null;
  private flowNodes: BaseNode[] = [];
  private currentNode: BaseNode | null = null;

  constructor() {
    super();
  }

  start(node: BaseNode): Flow {
    this.startNode = node;
    this.addNode(node);
    return this;
  }

  addNode(node: BaseNode): Flow {
    this.flowNodes.push(node);
    return this;
  }

  async prep(): Promise<void> {
    // Prepare all nodes in the flow
    for (const node of this.flowNodes) {
      await node.prep();
    }
  }

  async exec(): Promise<any> {
    if (!this.startNode) {
      throw new Error('Flow must have a start node');
    }

    return await this._orch();
  }

  async post(result: any): Promise<void> {
    // Post-process all nodes in the flow
    for (const node of this.flowNodes) {
      await node.post(result);
    }
  }

  async _orch(): Promise<any> {
    if (!this.startNode) {
      throw new Error('Flow must have a start node');
    }

    this.currentNode = this.startNode;
    let result: any = null;

    while (this.currentNode) {
      result = await this.currentNode.execute();
      this.currentNode = await this.currentNode.getNextNode(result);
    }

    return result;
  }

  async getNextNode(result: any): Promise<BaseNode | null> {
    // For flows, we can have next flows
    return await super.getNextNode(result);
  }

  getCurrentNode(): BaseNode | null {
    return this.currentNode;
  }

  getFlowNodes(): BaseNode[] {
    return [...this.flowNodes];
  }
}

export class SequentialFlow extends Flow {
  constructor(nodes: BaseNode[]) {
    super();
    
    if (nodes.length === 0) {
      throw new Error('SequentialFlow requires at least one node');
    }

    // Chain nodes sequentially
    for (let i = 0; i < nodes.length - 1; i++) {
      nodes[i].next(nodes[i + 1]);
      this.addNode(nodes[i]);
    }
    this.addNode(nodes[nodes.length - 1]);
    
    this.start(nodes[0]);
  }
}

export class ParallelFlow extends Flow {
  private parallelNodes: BaseNode[];

  constructor(nodes: BaseNode[]) {
    super();
    this.parallelNodes = nodes;
    
    if (nodes.length === 0) {
      throw new Error('ParallelFlow requires at least one node');
    }

    nodes.forEach(node => this.addNode(node));
  }

  async _orch(): Promise<any[]> {
    // Execute all nodes in parallel
    const promises = this.parallelNodes.map(node => node.execute());
    return await Promise.all(promises);
  }
}

export class ConditionalFlow extends Flow {
  private condition: (result: any) => boolean;
  private trueNode: BaseNode;
  private falseNode: BaseNode;

  constructor(
    condition: (result: any) => boolean,
    trueNode: BaseNode,
    falseNode: BaseNode
  ) {
    super();
    this.condition = condition;
    this.trueNode = trueNode;
    this.falseNode = falseNode;
    
    this.addNode(trueNode);
    this.addNode(falseNode);
  }

  async _orch(): Promise<any> {
    // This flow needs a previous result to evaluate condition
    // For now, we'll assume it's set via params
    const conditionInput = this.params.conditionInput;
    
    if (this.condition(conditionInput)) {
      return await this.trueNode.execute();
    } else {
      return await this.falseNode.execute();
    }
  }
}