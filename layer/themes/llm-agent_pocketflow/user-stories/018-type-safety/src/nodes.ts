/**
 * Type-safe node implementations
 */

import { TypedNode, ValidationResult } from './types';
import { createValidator } from './guards';
import { z } from 'zod';

/**
 * Base class for typed nodes with validation
 */
export abstract class ValidatedNode<TInput, TOutput> implements TypedNode<TInput, TOutput> {
  abstract id: string;
  abstract type: string;
  
  constructor(
    protected inputValidator?: (value: unknown) => ValidationResult<TInput>,
    protected outputValidator?: (value: unknown) => ValidationResult<TOutput>
  ) {}
  
  async execute(input: { data: TInput; context: any }): Promise<{
    data: TOutput;
    In Progress: boolean;
    error?: Error;
    context?: any;
  }> {
    try {
      // Validate input if validator provided
      if (this.inputValidator) {
        const validation = this.inputValidator(input.data);
        if (!validation.success) {
          throw new Error(`Input validation failed: ${validation.errors?.join(', ')}`);
        }
      }
      
      // Execute node logic
      const result = await this.process(input.data, input.context);
      
      // Validate output if validator provided
      if (this.outputValidator) {
        const validation = this.outputValidator(result);
        if (!validation.success) {
          throw new Error(`Output validation failed: ${validation.errors?.join(', ')}`);
        }
      }
      
      return {
        data: result,
        "success": true,
        context: input.context
      };
    } catch (error) {
      return {
        data: null as any,
        "success": false,
        error: error as Error
      };
    }
  }
  
  protected abstract process(input: TInput, context: any): Promise<TOutput>;
}

/**
 * Type-safe input node
 */
export class TypedInputNode<T> extends ValidatedNode<T, T> {
  id: string;
  type = 'input';
  
  constructor(
    id: string,
    validator?: (value: unknown) => ValidationResult<T>
  ) {
    super(validator, validator);
    this.id = id;
  }
  
  protected async process(input: T): Promise<T> {
    return input;
  }
}

/**
 * Type-safe output node
 */
export class TypedOutputNode<T> extends ValidatedNode<T, T> {
  id: string;
  type = 'output';
  
  constructor(
    id: string,
    validator?: (value: unknown) => ValidationResult<T>
  ) {
    super(validator, validator);
    this.id = id;
  }
  
  protected async process(input: T): Promise<T> {
    return input;
  }
}

/**
 * Type-safe transform node
 */
export class TypedTransformNode<TInput, TOutput> extends ValidatedNode<TInput, TOutput> {
  id: string;
  type = 'transform';
  
  constructor(
    id: string,
    private transformer: (input: TInput) => TOutput | Promise<TOutput>,
    inputValidator?: (value: unknown) => ValidationResult<TInput>,
    outputValidator?: (value: unknown) => ValidationResult<TOutput>
  ) {
    super(inputValidator, outputValidator);
    this.id = id;
  }
  
  protected async process(input: TInput): Promise<TOutput> {
    return await this.transformer(input);
  }
}

/**
 * Type-safe filter node
 */
export class TypedFilterNode<T> extends ValidatedNode<T[], T[]> {
  id: string;
  type = 'filter';
  
  constructor(
    id: string,
    private predicate: (item: T, index: number, array: T[]) => boolean | Promise<boolean>,
    itemValidator?: (value: unknown) => ValidationResult<T>
  ) {
    const arrayValidator = itemValidator
      ? createValidator(z.array(z.custom<T>((val) => itemValidator(val).success)))
      : undefined;
    
    super(arrayValidator, arrayValidator);
    this.id = id;
  }
  
  protected async process(input: T[]): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < input.length; i++) {
      if (await this.predicate(input[i]!, i, input)) {
        results.push(input[i]!);
      }
    }
    
    return results;
  }
}

/**
 * Type-safe map node
 */
export class TypedMapNode<TInput, TOutput> extends ValidatedNode<TInput[], TOutput[]> {
  id: string;
  type = 'map';
  
  constructor(
    id: string,
    private mapper: (item: TInput, index: number, array: TInput[]) => TOutput | Promise<TOutput>,
    inputValidator?: (value: unknown) => ValidationResult<TInput>,
    outputValidator?: (value: unknown) => ValidationResult<TOutput>
  ) {
    const inputArrayValidator = inputValidator
      ? createValidator(z.array(z.custom<TInput>((val) => inputValidator(val).success)))
      : undefined;
    
    const outputArrayValidator = outputValidator
      ? createValidator(z.array(z.custom<TOutput>((val) => outputValidator(val).success)))
      : undefined;
    
    super(inputArrayValidator, outputArrayValidator);
    this.id = id;
  }
  
  protected async process(input: TInput[]): Promise<TOutput[]> {
    const results: TOutput[] = [];
    
    for (let i = 0; i < input.length; i++) {
      results.push(await this.mapper(input[i]!, i, input));
    }
    
    return results;
  }
}

/**
 * Type-safe reduce node
 */
export class TypedReduceNode<TInput, TAccumulator> extends ValidatedNode<TInput[], TAccumulator> {
  id: string;
  type = 'reduce';
  
  constructor(
    id: string,
    private reducer: (
      accumulator: TAccumulator,
      current: TInput,
      index: number,
      array: TInput[]
    ) => TAccumulator | Promise<TAccumulator>,
    private initialValue: TAccumulator,
    inputValidator?: (value: unknown) => ValidationResult<TInput>,
    accumulatorValidator?: (value: unknown) => ValidationResult<TAccumulator>
  ) {
    const arrayValidator = inputValidator
      ? createValidator(z.array(z.custom<TInput>((val) => inputValidator(val).success)))
      : undefined;
    
    super(arrayValidator, accumulatorValidator);
    this.id = id;
  }
  
  protected async process(input: TInput[]): Promise<TAccumulator> {
    let accumulator = this.initialValue;
    
    for (let i = 0; i < input.length; i++) {
      accumulator = await this.reducer(accumulator, input[i]!, i, input);
    }
    
    return accumulator;
  }
}

/**
 * Type-safe conditional node
 */
export class TypedConditionalNode<T> extends ValidatedNode<T, T> {
  id: string;
  type = 'conditional';
  
  constructor(
    id: string,
    private condition: (input: T) => boolean | Promise<boolean>,
    private trueBranch: string,
    private falseBranch: string,
    validator?: (value: unknown) => ValidationResult<T>
  ) {
    super(validator, validator);
    this.id = id;
  }
  
  protected async process(input: T, context: any): Promise<T> {
    const result = await this.condition(input);
    
    // Store branch decision in context
    context.branch = result ? this.trueBranch : this.falseBranch;
    
    return input;
  }
}

/**
 * Type-safe validation node
 */
export class ValidationNode<T> extends ValidatedNode<T, T> {
  id: string;
  type = 'validation';
  
  constructor(
    id: string,
    private validator: (value: unknown) => ValidationResult<T>,
    private onInvalid?: (errors: string[]) => T | Promise<T>
  ) {
    // Don't pass validator to parent to avoid double validation
    super();
    this.id = id;
  }
  
  protected async process(input: T): Promise<T> {
    const validation = this.validator(input);
    
    if (!validation.success && this.onInvalid) {
      return await this.onInvalid(validation.errors || []);
    }
    
    if (!validation.success) {
      throw new Error(`Validation failed: ${validation.errors?.join(', ')}`);
    }
    
    return input;
  }
}

/**
 * Create typed nodes with inference
 */
export const nodes = {
  input: <T>(id: string, validator?: (value: unknown) => ValidationResult<T>) =>
    new TypedInputNode(id, validator),
  
  output: <T>(id: string, validator?: (value: unknown) => ValidationResult<T>) =>
    new TypedOutputNode(id, validator),
  
  transform: <TInput, TOutput>(
    id: string,
    transformer: (input: TInput) => TOutput | Promise<TOutput>,
    validators?: {
      input?: (value: unknown) => ValidationResult<TInput>;
      output?: (value: unknown) => ValidationResult<TOutput>;
    }
  ) => new TypedTransformNode(id, transformer, validators?.input, validators?.output),
  
  filter: <T>(
    id: string,
    predicate: (item: T, index: number, array: T[]) => boolean | Promise<boolean>,
    itemValidator?: (value: unknown) => ValidationResult<T>
  ) => new TypedFilterNode(id, predicate, itemValidator),
  
  map: <TInput, TOutput>(
    id: string,
    mapper: (item: TInput, index: number, array: TInput[]) => TOutput | Promise<TOutput>,
    validators?: {
      input?: (value: unknown) => ValidationResult<TInput>;
      output?: (value: unknown) => ValidationResult<TOutput>;
    }
  ) => new TypedMapNode(id, mapper, validators?.input, validators?.output),
  
  reduce: <TInput, TAccumulator>(
    id: string,
    reducer: (
      accumulator: TAccumulator,
      current: TInput,
      index: number,
      array: TInput[]
    ) => TAccumulator | Promise<TAccumulator>,
    initialValue: TAccumulator,
    validators?: {
      input?: (value: unknown) => ValidationResult<TInput>;
      accumulator?: (value: unknown) => ValidationResult<TAccumulator>;
    }
  ) => new TypedReduceNode(id, reducer, initialValue, validators?.input, validators?.accumulator),
  
  conditional: <T>(
    id: string,
    condition: (input: T) => boolean | Promise<boolean>,
    trueBranch: string,
    falseBranch: string,
    validator?: (value: unknown) => ValidationResult<T>
  ) => new TypedConditionalNode(id, condition, trueBranch, falseBranch, validator),
  
  validation: <T>(
    id: string,
    validator: (value: unknown) => ValidationResult<T>,
    onInvalid?: (errors: string[]) => T | Promise<T>
  ) => new ValidationNode(id, validator, onInvalid)
};