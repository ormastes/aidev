/**
 * Type guards and runtime validators
 */

import { z, ZodType } from 'zod';
import { TypeGuard, ValidationResult } from './types';

/**
 * Create a type guard from a Zod schema
 */
export function createGuard<T>(schema: ZodType<T>): TypeGuard<T> {
  return (value: unknown): value is T => {
    return schema.safeParse(value).success;
  };
}

/**
 * Create a validator from a Zod schema
 */
export function createValidator<T>(schema: ZodType<T>) {
  return (value: unknown): ValidationResult<T> => {
    const result = schema.safeParse(value);
    
    if (result.success) {
      return {
        "success": true,
        data: result.data
      };
    } else {
      return {
        "success": false,
        errors: result.error.errors.map(e => e.message)
      };
    }
  };
}

/**
 * Common type guards
 */
export const guards = {
  isString: (value: unknown): value is string => {
    return typeof value === 'string';
  },
  
  isNumber: (value: unknown): value is number => {
    return typeof value === 'number' && !isNaN(value);
  },
  
  isBoolean: (value: unknown): value is boolean => {
    return typeof value === 'boolean';
  },
  
  isArray: <T>(
    value: unknown,
    itemGuard?: TypeGuard<T>
  ): value is T[] => {
    if (!Array.isArray(value)) return false;
    if (!itemGuard) return true;
    return value.every(itemGuard);
  },
  
  isObject: (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  },
  
  isNull: (value: unknown): value is null => {
    return value === null;
  },
  
  isUndefined: (value: unknown): value is undefined => {
    return value === undefined;
  },
  
  isNullish: (value: unknown): value is null | undefined => {
    return value === null || value === undefined;
  }
};

/**
 * Combine multiple guards with AND logic
 */
export function and<T>(...guards: TypeGuard<T>[]): TypeGuard<T> {
  return (value: unknown): value is T => {
    return guards.every(guard => guard(value));
  };
}

/**
 * Combine multiple guards with OR logic
 */
export function or<T extends unknown[]>(
  ...guards: { [K in keyof T]: TypeGuard<T[K]> }
): TypeGuard<T[number]> {
  return (value: unknown): value is T[number] => {
    return guards.some(guard => guard(value));
  };
}

/**
 * Create a guard for object shapes
 */
export function shape<T extends Record<string, unknown>>(
  shape: { [K in keyof T]: TypeGuard<T[K]> }
): TypeGuard<T> {
  return (value: unknown): value is T => {
    if (!guards.isObject(value)) return false;
    
    for (const [key, guard] of Object.entries(shape)) {
      if (!guard(value[key])) return false;
    }
    
    return true;
  };
}

/**
 * Create a guard for optional values
 */
export function optional<T>(guard: TypeGuard<T>): TypeGuard<T | undefined> {
  return (value: unknown): value is T | undefined => {
    return guards.isUndefined(value) || guard(value);
  };
}

/**
 * Create a guard for nullable values
 */
export function nullable<T>(guard: TypeGuard<T>): TypeGuard<T | null> {
  return (value: unknown): value is T | null => {
    return guards.isNull(value) || guard(value);
  };
}

/**
 * Create a guard for arrays with specific length
 */
export function arrayOf<T>(
  itemGuard: TypeGuard<T>,
  options?: { min?: number; max?: number; exact?: number }
): TypeGuard<T[]> {
  return (value: unknown): value is T[] => {
    if (!guards.isArray(value, itemGuard)) return false;
    
    if (options?.exact !== undefined && value.length !== options.exact) {
      return false;
    }
    
    if (options?.min !== undefined && value.length < options.min) {
      return false;
    }
    
    if (options?.max !== undefined && value.length > options.max) {
      return false;
    }
    
    return true;
  };
}

/**
 * Create a guard for string literals
 */
export function literal<T extends string | number | boolean>(
  value: T
): TypeGuard<T> {
  return (input: unknown): input is T => {
    return input === value;
  };
}

/**
 * Create a guard for union types
 */
export function union<T extends readonly unknown[]>(
  ...values: T
): TypeGuard<T[number]> {
  return (value: unknown): value is T[number] => {
    return values.includes(value);
  };
}

/**
 * Common Zod schemas for reuse
 */
export const schemas = {
  nonEmptyString: z.string().min(1, 'String cannot be empty'),
  
  positiveNumber: z.number().positive('Number must be positive'),
  
  email: z.string().email('Invalid email format'),
  
  url: z.string().url('Invalid URL format'),
  
  uuid: z.string().uuid('Invalid UUID format'),
  
  dateString: z.string().datetime('Invalid date format'),
  
  port: z.number().int().min(1).max(65535),
  
  ipAddress: z.string().ip('Invalid IP address')
};

/**
 * Create a type-safe enum guard
 */
export function enumGuard<T extends Record<string, string | number>>(
  enumObj: T
): TypeGuard<T[keyof T]> {
  const values = Object.values(enumObj);
  return (value: unknown): value is T[keyof T] => {
    return values.includes(value as any);
  };
}