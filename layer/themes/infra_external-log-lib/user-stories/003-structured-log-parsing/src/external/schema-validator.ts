import { StructuredLogEntry } from './json-log-parser';

export interface PropertySchema {
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  enum?: any[];
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  required?: string[];
  properties?: Record<string, PropertySchema>;
  items?: PropertySchema;
  minItems?: number;
  maxItems?: number;
  validate?: (value: any) => boolean;
  validationMessage?: string;
}

export interface LogSchema {
  required?: string[];
  properties?: Record<string, PropertySchema>;
  additionalProperties?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class LogSchemaValidator {
  private schema?: LogSchema;

  defineSchema(schema: LogSchema): void {
    this.schema = schema;
  }

  getSchema(): LogSchema | undefined {
    return this.schema;
  }

  validate(log: any): ValidationResult {
    if (!this.schema) {
      return { valid: true, errors: [] };
    }

    const errors: string[] = [];

    // Check required fields
    if (this.schema.required) {
      for (const field of this.schema.required) {
        if (!(field in log) || log[field] === undefined) {
          errors.push(`Missing required field: ${field}`);
        }
      }
    }

    // Check properties
    if (this.schema.properties) {
      for (const [field, propSchema] of Object.entries(this.schema.properties)) {
        if (field in log) {
          this.validateProperty(field, log[field], propSchema, errors);
        }
      }
    }

    // Check additional properties
    if (this.schema.additionalProperties === false && this.schema.properties) {
      const allowedFields = Object.keys(this.schema.properties);
      for (const field of Object.keys(log)) {
        if (!allowedFields.includes(field) && field !== 'source' && field !== 'metadata') {
          errors.push(`Additional property "${field}" is not allowed`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  validateBatch(logs: any[]): ValidationResult[] {
    return logs.map(log => this.validate(log));
  }

  createValidationError(invalidLog: any): StructuredLogEntry {
    const result = this.validate(invalidLog);
    
    return {
      timestamp: new Date(),
      level: 'error',
      message: `Invalid log format: ${result.errors.join('; ')}`,
      source: 'validation' as any,
      metadata: {
        validationErrors: result.errors,
        originalLog: invalidLog
      }
    };
  }

  private validateProperty(
    path: string,
    value: any,
    schema: PropertySchema,
    errors: string[]
  ): void {
    // Type validation
    if (!this.validateType(value, schema.type)) {
      if (schema.type === 'date') {
        errors.push(`Field "${path}" must be a valid date`);
      } else {
        errors.push(`Field "${path}" must be of type ${schema.type}`);
      }
      return;
    }

    // Custom validation
    if (schema.validate && !schema.validate(value)) {
      errors.push(schema.validationMessage || `Field "${path}" failed custom validation`);
      return;
    }

    // Type-specific validations
    switch (schema.type) {
      case 'string':
        this.validateString(path, value, schema, errors);
        break;
      case 'number':
        this.validateNumber(path, value, schema, errors);
        break;
      case 'array':
        this.validateArray(path, value, schema, errors);
        break;
      case 'object':
        this.validateObject(path, value, schema, errors);
        break;
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push(`Field "${path}" must be one of: ${schema.enum.join(', ')}`);
    }
  }

  private validateType(value: any, type: PropertySchema['type']): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'date':
        return value instanceof Date && !isNaN(value.getTime());
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      default:
        return false;
    }
  }

  private validateString(
    path: string,
    value: string,
    schema: PropertySchema,
    errors: string[]
  ): void {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`Field "${path}" must have at least ${schema.minLength} characters`);
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(`Field "${path}" must have at most ${schema.maxLength} characters`);
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push(`Field "${path}" does not match pattern: ${schema.pattern}`);
    }
  }

  private validateNumber(
    path: string,
    value: number,
    schema: PropertySchema,
    errors: string[]
  ): void {
    if (schema.min !== undefined && value < schema.min) {
      errors.push(`Field "${path}" must be at least ${schema.min}`);
    }
    if (schema.max !== undefined && value > schema.max) {
      errors.push(`Field "${path}" must be at most ${schema.max}`);
    }
  }

  private validateArray(
    path: string,
    value: any[],
    schema: PropertySchema,
    errors: string[]
  ): void {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`Field "${path}" must have at least ${schema.minItems} items`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(`Field "${path}" must have at most ${schema.maxItems} items`);
    }
    if (schema.items) {
      value.forEach((item, index) => {
        this.validateProperty(`${path}[${index}]`, item, schema.items!, errors);
      });
    }
  }

  private validateObject(
    path: string,
    value: Record<string, any>,
    schema: PropertySchema,
    errors: string[]
  ): void {
    // Check required fields in nested object
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in value) || value[field] === undefined) {
          errors.push(`Missing required field in ${path}: ${field}`);
        }
      }
    }

    // Validate nested properties
    if (schema.properties) {
      for (const [field, propSchema] of Object.entries(schema.properties)) {
        if (field in value) {
          this.validateProperty(`${path}.${field}`, value[field], propSchema, errors);
        }
      }
    }
  }
}