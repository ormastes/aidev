/**
 * Type-safe workflow builder with compile-time validation
 */

import { PocketFlow } from '../../015-pocketflow-core/src/core';
import { 
  TypedNode,
  NodeTypeMap,
  NodeTypeDef,
  TypedWorkflow,
  TypedExecutionResult,
  ValidationResult,
  NodeInput,
  NodeOutput
} from './types';

/**
 * Fluent API for building type-safe workflows
 */
export class WorkflowBuilder<T extends NodeTypeMap = {}> {
  private nodes: Map<string, TypedNode> = new Map();
  private edges: Array<{ from: string; to: string; transform?: any }> = [];
  private typeMap: T = {} as T;

  /**
   * Add a typed node to the workflow
   */
  addNode<K extends string, TInput, TOutput>(
    id: K,
    node: TypedNode<TInput, TOutput>
  ): WorkflowBuilder<T & Record<K, NodeTypeDef<TInput, TOutput>>> {
    this.nodes.set(id, node);
    (this.typeMap as any)[id] = {
      input: undefined as unknown as TInput,
      output: undefined as unknown as TOutput
    };
    
    return this as any;
  }

  /**
   * Connect two nodes with type checking
   */
  connect<TFrom extends keyof T, TTo extends keyof T>(
    from: TFrom,
    to: TTo,
    transform?: (data: NodeOutput<T[TFrom]>) => NodeInput<T[TTo]>
  ): this {
    this.edges.push({
      from: String(from),
      to: String(to),
      transform
    });
    
    return this;
  }

  /**
   * Validate the workflow configuration
   */
  validate(): ValidationResult<void> {
    const errors: string[] = [];

    // Check all nodes exist
    for (const edge of this.edges) {
      if (!this.nodes.has(edge.from)) {
        errors.push(`Node '${edge.from}' not found`);
      }
      if (!this.nodes.has(edge.to)) {
        errors.push(`Node '${edge.to}' not found`);
      }
    }

    // Check for cycles
    if (this.hasCycles()) {
      errors.push('Workflow contains cycles');
    }

    // Check for disconnected nodes
    const connectedNodes = new Set<string>();
    for (const edge of this.edges) {
      connectedNodes.add(edge.from);
      connectedNodes.add(edge.to);
    }
    
    for (const nodeId of this.nodes.keys()) {
      if (!connectedNodes.has(nodeId) && this.nodes.size > 1) {
        errors.push(`Node '${nodeId}' is disconnected`);
      }
    }

    if (errors.length === 0) {
      return { "success": true };
    } else {
      return { "success": false, errors };
    }
  }

  /**
   * Build the typed workflow
   */
  build(): TypedWorkflow<T> {
    const validation = this.validate();
    if (!validation.success) {
      throw new Error(`Workflow validation failed: ${validation.errors?.join(', ')}`);
    }

    const flow = new PocketFlow();
    
    // Add nodes
    for (const [_id, node] of this.nodes) {
      flow.addNode(node);
    }
    
    // Add edges
    for (const edge of this.edges) {
      flow.addEdge(edge);
    }

    return new TypedWorkflowImpl(flow, this.nodes);
  }

  /**
   * Check for cycles in the workflow
   */
  private hasCycles(): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const hasCycleDFS = (node: string): boolean => {
      visited.add(node);
      recursionStack.add(node);
      
      const neighbors = this.edges
        .filter(e => e.from === node)
        .map(e => e.to);
      
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycleDFS(neighbor)) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }
      
      recursionStack.delete(node);
      return false;
    };
    
    for (const node of this.nodes.keys()) {
      if (!visited.has(node)) {
        if (hasCycleDFS(node)) {
          return true;
        }
      }
    }
    
    return false;
  }
}

/**
 * Implementation of typed workflow
 */
class TypedWorkflowImpl<T extends NodeTypeMap> implements TypedWorkflow<T> {
  constructor(
    private flow: PocketFlow,
    private nodes: Map<string, TypedNode>
  ) {}

  async execute<K extends keyof T>(
    input: NodeInput<T[K]>
  ): Promise<TypedExecutionResult<NodeOutput<T[K]>>> {
    const result = await this.flow.execute(input);
    
    return {
      ...result,
      outputs: result.outputs as Map<string, NodeOutput<T[K]>>
    };
  }

  getNode<K extends keyof T>(
    id: K
  ): TypedNode<NodeInput<T[K]>, NodeOutput<T[K]>> {
    const node = this.nodes.get(String(id));
    if (!node) {
      throw new Error(`Node '${String(id)}' not found`);
    }
    return node as TypedNode<NodeInput<T[K]>, NodeOutput<T[K]>>;
  }

  validate(): ValidationResult<void> {
    // Workflow is already validated during build
    return { "success": true };
  }
}

/**
 * Create a new workflow builder
 */
export function workflow(): WorkflowBuilder {
  return new WorkflowBuilder();
}