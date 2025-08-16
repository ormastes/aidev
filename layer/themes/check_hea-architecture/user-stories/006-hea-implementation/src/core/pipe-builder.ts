import {
  Pipe,
  PipeMetadata,
  PipeBuilder,
  ValidationResult,
  ValidationError,
} from '../interfaces/pipe';

export class PipeBuilderImpl<TInput, TOutput> implements PipeBuilder<TInput, TOutput> {
  private metadata: Partial<PipeMetadata> = {
    dependencies: [],
  };
  private validator?: (input: TInput) => ValidationResult;
  private executor?: (input: TInput) => Promise<TOutput>;

  withName(name: string): this {
    this.metadata.name = name;
    return this;
  }

  withVersion(version: string): this {
    this.metadata.version = version;
    return this;
  }

  withDescription(description: string): this {
    this.metadata.description = description;
    return this;
  }

  withLayer(layer: string): this {
    this.metadata.layer = layer;
    return this;
  }

  withValidator(validator: (input: TInput) => ValidationResult): this {
    this.validator = validator;
    return this;
  }

  withExecutor(executor: (input: TInput) => Promise<TOutput>): this {
    this.executor = executor;
    return this;
  }

  withDependency(dependency: string): this {
    this.metadata.dependencies?.push(dependency);
    return this;
  }

  withInputSchema(schema: object): this {
    this.metadata.inputSchema = schema;
    return this;
  }

  withOutputSchema(schema: object): this {
    this.metadata.outputSchema = schema;
    return this;
  }

  build(): Pipe<TInput, TOutput> {
    if (!this.metadata.name) {
      throw new Error('Pipe name is required');
    }
    if (!this.metadata.version) {
      throw new Error('Pipe version is required');
    }
    if (!this.metadata.layer) {
      throw new Error('Pipe layer is required');
    }
    if (!this.executor) {
      throw new Error('Pipe executor is required');
    }

    const metadata = this.metadata as PipeMetadata;
    const executor = this.executor;
    const validator = this.validator;

    return new (class implements Pipe<TInput, TOutput> {
      async execute(input: TInput): Promise<TOutput> {
        if (validator) {
          const validation = validator(input);
          if (!validation.valid) {
            throw new PipeValidationError(
              `Validation failed for pipe ${metadata.name}`,
              validation.errors || []
            );
          }
        }
        return executor(input);
      }

      validate(input: TInput): ValidationResult {
        if (validator) {
          return validator(input);
        }
        return { valid: true };
      }

      getMetadata(): PipeMetadata {
        return { ...metadata };
      }
    })();
  }
}

export class PipeValidationError extends Error {
  constructor(
    message: string,
    public errors: ValidationError[]
  ) {
    super(message);
    this.name = "PipeValidationError";
  }
}

/**
 * Factory function to create a new pipe builder
 */
export function createPipeBuilder<TInput, TOutput>(): PipeBuilder<TInput, TOutput> {
  return new PipeBuilderImpl<TInput, TOutput>();
}