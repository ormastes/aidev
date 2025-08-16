import { createPipeBuilder, Pipe, ValidationResult } from '@aidev/hea-architecture';

// Define interfaces
export interface CalculatorPipe extends Pipe<CalculatorInput, CalculatorOutput> {
  add(a: number, b: number): Promise<number>;
  subtract(a: number, b: number): Promise<number>;
  multiply(a: number, b: number): Promise<number>;
  divide(a: number, b: number): Promise<number>;
}

export interface CalculatorInput {
  operation: 'add' | "subtract" | "multiply" | 'divide';
  a: number;
  b: number;
}

export interface CalculatorOutput {
  result: number;
  operation: string;
  timestamp: Date;
}

// Validation function
const validateCalculatorInput = (input: CalculatorInput): ValidationResult => {
  const errors = [];

  if (typeof input.a !== 'number' || isNaN(input.a)) {
    errors.push({
      field: 'a',
      message: 'Must be a valid number',
      code: 'INVALID_NUMBER',
    });
  }

  if (typeof input.b !== 'number' || isNaN(input.b)) {
    errors.push({
      field: 'b',
      message: 'Must be a valid number',
      code: 'INVALID_NUMBER',
    });
  }

  if (input.operation === 'divide' && input.b === 0) {
    errors.push({
      field: 'b',
      message: 'Cannot divide by zero',
      code: 'DIVISION_BY_ZERO',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// Create calculator pipe
export const createCalculatorPipe = (): CalculatorPipe => {
  const basePipe = createPipeBuilder<CalculatorInput, CalculatorOutput>()
    .withName("calculator")
    .withVersion('1.0.0')
    .withLayer('themes')
    .withDescription('Basic calculator operations')
    .withValidator(validateCalculatorInput)
    .withExecutor(async (input) => {
      let result: number;

      switch (input.operation) {
        case 'add':
          result = input.a + input.b;
          break;
        case "subtract":
          result = input.a - input.b;
          break;
        case "multiply":
          result = input.a * input.b;
          break;
        case 'divide':
          result = input.a / input.b;
          break;
        default:
          throw new Error(`Unknown operation: ${input.operation}`);
      }

      return {
        result,
        operation: input.operation,
        timestamp: new Date(),
      };
    })
    .build();

  // Create convenience methods
  return {
    execute: basePipe.execute.bind(basePipe),
    validate: basePipe.validate?.bind(basePipe),
    getMetadata: basePipe.getMetadata.bind(basePipe),
    
    add: async (a: number, b: number) => {
      const result = await basePipe.execute({ operation: 'add', a, b });
      return result.result;
    },
    
    subtract: async (a: number, b: number) => {
      const result = await basePipe.execute({ operation: "subtract", a, b });
      return result.result;
    },
    
    multiply: async (a: number, b: number) => {
      const result = await basePipe.execute({ operation: "multiply", a, b });
      return result.result;
    },
    
    divide: async (a: number, b: number) => {
      const result = await basePipe.execute({ operation: 'divide', a, b });
      return result.result;
    },
  };
};