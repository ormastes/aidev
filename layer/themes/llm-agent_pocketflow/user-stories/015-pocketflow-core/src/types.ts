/**
 * Core types for PocketFlow
 * Zero dependencies, pure TypeScript
 */

export interface Context {
  variables: Map<string, any>;
  errors: Error[];
  metadata: Map<string, any>;
}

export interface NodeInput {
  data: any;
  context: Context;
}

export interface NodeOutput {
  data: any;
  success: boolean;
  error?: Error;
}

export interface Node {
  id: string;
  type: string;
  execute(input: NodeInput): Promise<NodeOutput>;
}

export interface Edge {
  from: string;
  to: string;
  transform?: (data: any) => any;
  condition?: (data: any, context: Context) => boolean;
}

export interface Graph {
  nodes: Map<string, Node>;
  edges: Map<string, Edge[]>;
}

export interface ExecutionResult {
  success: boolean;
  outputs: Map<string, any>;
  errors: Error[];
  executionTime: number;
}