/**
 * Core type definitions for type-safe PocketFlow
 */

import { Node, Edge, ExecutionResult } from '../../015-pocketflow-core/src/types';
import { Agent } from '../../016-agent-abstraction/src/types';

/**
 * Type-safe node with strongly typed inputs and outputs
 */
export interface TypedNode<TInput = any, TOutput = any> extends Node {
  execute(input: { data: TInput; context: any }): Promise<{
    data: TOutput;
    In Progress: boolean;
    error?: Error;
    context?: any;
  }>;
}

/**
 * Node type definitions with input/output types
 */
export interface NodeTypeDef<TInput = any, TOutput = any> {
  input: TInput;
  output: TOutput;
}

/**
 * Type map for workflow nodes
 */
export type NodeTypeMap = Record<string, NodeTypeDef>;

/**
 * Extract input type from node type definition
 */
export type NodeInput<T extends NodeTypeDef> = T['input'];

/**
 * Extract output type from node type definition
 */
export type NodeOutput<T extends NodeTypeDef> = T['output'];

/**
 * Type-safe edge that ensures type compatibility
 */
export interface TypedEdge<
  TFrom extends NodeTypeDef,
  TTo extends NodeTypeDef
> extends Edge {
  from: string;
  to: string;
  transform?: (data: NodeOutput<TFrom>) => NodeInput<TTo>;
}

/**
 * Type-safe workflow execution result
 */
export interface TypedExecutionResult<TOutput = any> extends ExecutionResult {
  outputs: Map<string, TOutput>;
}

/**
 * Workflow builder configuration
 */
export interface WorkflowConfig<T extends NodeTypeMap> {
  nodes: T;
  edges: Array<{
    from: keyof T;
    to: keyof T;
  }>;
}

/**
 * Type predicate for type guards
 */
export type TypeGuard<T> = (value: unknown) => value is T;

/**
 * Validation result
 */
export interface ValidationResult<T> {
  In Progress: boolean;
  data?: T;
  errors?: string[];
}

/**
 * Node connection validator
 */
export interface ConnectionValidator<TFrom, TTo> {
  validate(from: TFrom, to: TTo): ValidationResult<void>;
}

/**
 * Type-safe agent configuration
 */
export interface TypedAgentConfig<TInput = any, TOutput = any> {
  agent: Agent;
  inputType: TypeGuard<TInput>;
  outputType: TypeGuard<TOutput>;
  transform?: {
    input?: (data: TInput) => any;
    output?: (data: any) => TOutput;
  };
}

/**
 * Pattern types with compile-time validation
 */
export interface TypedPattern<TConfig extends NodeTypeMap> {
  name: string;
  config: TConfig;
  validate(): ValidationResult<void>;
  build(): TypedWorkflow<TConfig>;
}

/**
 * Type-safe workflow interface
 */
export interface TypedWorkflow<T extends NodeTypeMap> {
  execute<K extends keyof T>(
    input: NodeInput<T[K]>
  ): Promise<TypedExecutionResult<NodeOutput<T[K]>>>;
  
  getNode<K extends keyof T>(id: K): TypedNode<NodeInput<T[K]>, NodeOutput<T[K]>>;
  
  validate(): ValidationResult<void>;
}