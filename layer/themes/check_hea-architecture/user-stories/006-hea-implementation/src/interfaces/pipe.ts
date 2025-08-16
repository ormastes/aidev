/**
 * Core interfaces for HEA Pipe pattern
 */

export interface Pipe<TInput = any, TOutput = any> {
  /**
   * Execute the pipe operation
   */
  execute(input: TInput): Promise<TOutput>;
  
  /**
   * Validate input before execution
   */
  validate?(input: TInput): ValidationResult;
  
  /**
   * Get pipe metadata
   */
  getMetadata(): PipeMetadata;
}

export interface PipeMetadata {
  name: string;
  version: string;
  layer: string;
  description: string;
  inputSchema?: object;
  outputSchema?: object;
  dependencies: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

export interface PipeRegistry {
  register<T extends Pipe>(name: string, pipe: T): void;
  get<T extends Pipe>(name: string): T | undefined;
  has(name: string): boolean;
  list(): string[];
  getMetadata(name: string): PipeMetadata | undefined;
}

export interface PipeBuilder<TInput, TOutput> {
  withName(name: string): this;
  withVersion(version: string): this;
  withDescription(description: string): this;
  withValidator(validator: (input: TInput) => ValidationResult): this;
  withExecutor(executor: (input: TInput) => Promise<TOutput>): this;
  withDependency(dependency: string): this;
  build(): Pipe<TInput, TOutput>;
}