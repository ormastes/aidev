/**
 * PocketFlow Core - Minimalist LLM Framework
 * ~100 lines of core functionality
 */

import { Graph, Node, Edge, Context, ExecutionResult, NodeInput } from './types';

export class PocketFlow implements Graph {
  nodes: Map<string, Node> = new Map();
  edges: Map<string, Edge[]> = new Map();

  addNode(node: Node): void {
    this.nodes.set(node.id, node);
    if (!this.edges.has(node.id)) {
      this.edges.set(node.id, []);
    }
  }

  addEdge(edge: Edge): void {
    const fromEdges = this.edges.get(edge.from) || [];
    fromEdges.push(edge);
    this.edges.set(edge.from, fromEdges);
  }

  async execute(initialData: any = {}): Promise<ExecutionResult> {
    const startTime = Date.now();
    const context: Context = {
      variables: new Map(),
      errors: [],
      metadata: new Map()
    };

    const outputs = new Map<string, any>();
    const executed = new Set<string>();
    const executing = new Set<string>();

    // Find nodes with no incoming edges (entry points)
    const entryNodes = this.findEntryNodes();
    
    // Execute nodes in topological order
    const queue = [...entryNodes];
    const nodeOutputs = new Map<string, any>();
    nodeOutputs.set('__initial__', initialData);

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      
      if (executed.has(nodeId)) continue;
      
      const node = this.nodes.get(nodeId);
      if (!node) {
        context.errors.push(new Error(`Node ${nodeId} not found`));
        continue;
      }

      // Check if all dependencies are executed
      const dependencies = this.getNodeDependencies(nodeId);
      if (!dependencies.every(dep => executed.has(dep))) {
        queue.push(nodeId); // Re-queue for later
        continue;
      }

      // Check if node has valid inputs (for conditional execution)
      const hasValidInputs = this.nodeHasValidInputs(nodeId, nodeOutputs, context);
      if (!hasValidInputs && !this.isEntryNode(nodeId)) {
        executed.add(nodeId); // Mark as executed but skip
        continue;
      }

      // Collect inputs from dependencies or use initial data for entry nodes
      const inputData = this.isEntryNode(nodeId) ? 
        initialData : 
        this.collectNodeInputs(nodeId, nodeOutputs, context);
      
      try {
        executing.add(nodeId);
        const nodeInput: NodeInput = { data: inputData, context };
        const result = await node.execute(nodeInput);
        executing.delete(nodeId);
        
        if (result.success) {
          nodeOutputs.set(nodeId, result.data);
          outputs.set(nodeId, result.data);
          
          // Only queue downstream nodes if current node succeeded
          const downstreamEdges = this.edges.get(nodeId) || [];
          for (const edge of downstreamEdges) {
            if (!executed.has(edge.to) && !queue.includes(edge.to)) {
              queue.push(edge.to);
            }
          }
        } else if (result.error) {
          context.errors.push(result.error);
        }
        
        executed.add(nodeId);
      } catch (error) {
        context.errors.push(error as Error);
        executed.add(nodeId);
      }
    }

    return {
      success: context.errors.length === 0,
      outputs,
      errors: context.errors,
      executionTime: Date.now() - startTime
    };
  }

  private findEntryNodes(): string[] {
    const hasIncoming = new Set<string>();
    for (const edges of this.edges.values()) {
      for (const edge of edges) {
        hasIncoming.add(edge.to);
      }
    }
    return Array.from(this.nodes.keys()).filter(id => !hasIncoming.has(id));
  }

  private isEntryNode(nodeId: string): boolean {
    const entryNodes = this.findEntryNodes();
    return entryNodes.includes(nodeId);
  }

  private nodeHasValidInputs(nodeId: string, outputs: Map<string, any>, context: Context): boolean {
    let hasInputs = false;
    
    for (const [fromId, edges] of this.edges.entries()) {
      for (const edge of edges) {
        if (edge.to === nodeId) {
          const data = outputs.get(fromId);
          
          // Check edge condition if present
          if (!edge.condition || edge.condition(data, context)) {
            hasInputs = true;
          }
        }
      }
    }
    
    return hasInputs;
  }

  private getNodeDependencies(nodeId: string): string[] {
    const deps: string[] = [];
    for (const [fromId, edges] of this.edges.entries()) {
      if (edges.some(e => e.to === nodeId)) {
        deps.push(fromId);
      }
    }
    return deps;
  }

  private collectNodeInputs(nodeId: string, outputs: Map<string, any>, context: Context): any {
    const inputs: any[] = [];
    
    for (const [fromId, edges] of this.edges.entries()) {
      for (const edge of edges) {
        if (edge.to === nodeId) {
          let data = outputs.get(fromId);
          
          // Apply edge transformation if present
          if (edge.transform) {
            data = edge.transform(data);
          }
          
          // Check edge condition if present
          if (!edge.condition || edge.condition(data, context)) {
            inputs.push(data);
          }
        }
      }
    }
    
    // Return single input or array based on count
    return inputs.length === 1 ? inputs[0] : inputs;
  }
}