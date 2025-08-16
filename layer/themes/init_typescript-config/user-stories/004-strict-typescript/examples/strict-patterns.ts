/**
 * TypeScript Strict Mode Patterns and Examples
 * 
 * This file demonstrates common patterns and best practices
 * for writing TypeScript code with strict mode enabled.
 */

// =============================================================================
// 1. TYPE GUARDS AND NARROWING
// =============================================================================

interface User {
  id: string;
  name: string;
  email?: string;
}

interface Admin extends User {
  role: 'admin';
  permissions: string[];
}

// Type guard function
function isAdmin(user: User): user is Admin {
  return 'role' in user && (user as Admin).role === 'admin';
}

// Using type guards
function processUser(user: User | null): string {
  if (!user) {
    return 'No user provided';
  }

  if (isAdmin(user)) {
    return `Admin ${user.name} has ${user.permissions.length} permissions`;
  }

  return `User ${user.name}`;
}

// =============================================================================
// 2. NULL AND UNDEFINED HANDLING
// =============================================================================

// Using optional chaining and nullish coalescing
function getEmailDomain(user: User | null): string {
  return user?.email?.split('@')[1] ?? 'no-domain';
}

// Asserting non-null with confidence
function getConfigValue(key: string): string {
  const config: Record<string, string | undefined> = {
    apiUrl: 'https://api.example.com',
    timeout: '5000'
  };

  const value = config[key];
  if (value === undefined) {
    throw new Error(`Config key "${key}" not found`);
  }
  
  return value; // TypeScript knows this is string, not undefined
}

// =============================================================================
// 3. WORKING WITH UNKNOWN
// =============================================================================

// Type-safe JSON parsing
function parseJSON<T>(json: string, validator: (data: unknown) => data is T): T {
  const data: unknown = JSON.parse(json);
  
  if (!validator(data)) {
    throw new Error('Invalid JSON structure');
  }
  
  return data;
}

// Validator for User
function isValidUser(data: unknown): data is User {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data &&
    typeof (data as User).id === 'string' &&
    typeof (data as User).name === 'string'
  );
}

// Usage
const userJson = '{"id": "123", "name": "John"}';
const user = parseJSON(userJson, isValidUser);

// =============================================================================
// 4. GENERIC CONSTRAINTS
// =============================================================================

// Constrained generics
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

// With default type parameters
function createMap<K extends string | number | symbol = string, V = unknown>(): Map<K, V> {
  return new Map<K, V>();
}

// Conditional types
type IsArray<T> = T extends Array<unknown> ? true : false;
type ArrayElement<T> = T extends Array<infer E> ? E : never;

// =============================================================================
// 5. FUNCTION OVERLOADS
// =============================================================================

// Overloaded function signatures
function processValue(value: string): string;
function processValue(value: number): number;
function processValue(value: boolean): boolean;
function processValue(value: string | number | boolean): string | number | boolean {
  if (typeof value === 'string') {
    return value.toUpperCase();
  } else if (typeof value === 'number') {
    return value * 2;
  } else {
    return !value;
  }
}

// =============================================================================
// 6. CONST ASSERTIONS AND LITERAL TYPES
// =============================================================================

// Const assertion for literal types
const ROUTES = {
  home: '/',
  about: '/about',
  contact: '/contact'
} as const;

type Route = typeof ROUTES[keyof typeof ROUTES];

// Template literal types
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type ApiPath = `/api/${string}`;

function makeRequest(method: HttpMethod, path: ApiPath): Promise<unknown> {
  return fetch(path, { method });
}

// =============================================================================
// 7. ERROR HANDLING WITH UNKNOWN
// =============================================================================

class CustomError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "CustomError";
  }
}

function isCustomError(error: unknown): error is CustomError {
  return error instanceof CustomError;
}

async function safeApiCall<T>(fn: () => Promise<T>): Promise<{ data?: T; error?: string }> {
  try {
    const data = await fn();
    return { data };
  } catch (error) {
    if (isCustomError(error)) {
      return { error: `${error.code}: ${error.message}` };
    } else if (error instanceof Error) {
      return { error: error.message };
    } else {
      return { error: 'Unknown error occurred' };
    }
  }
}

// =============================================================================
// 8. DISCRIMINATED UNIONS
// =============================================================================

type Result<T> = 
  | { "success": true; data: T }
  | { "success": false; error: string };

function processResult<T>(result: Result<T>): T {
  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error);
  }
}

// =============================================================================
// 9. MAPPED TYPES AND UTILITY TYPES
// =============================================================================

// Make all properties optional and readonly
type Frozen<T> = {
  readonly [P in keyof T]?: T[P];
};

// Deep partial type
type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>;
} : T;

// Pick only methods from a type
type MethodsOf<T> = {
  [K in keyof T as T[K] extends (...args: any[]) => any ? K : never]: T[K];
};

// =============================================================================
// 10. BUILDER PATTERN WITH STRICT TYPES
// =============================================================================

class ConfigBuilder<T extends Record<string, unknown> = {}> {
  private config: T;

  constructor(initial: T = {} as T) {
    this.config = { ...initial };
  }

  set<K extends string, V>(
    key: K,
    value: V
  ): ConfigBuilder<T & Record<K, V>> {
    return new ConfigBuilder({
      ...this.config,
      [key]: value
    } as T & Record<K, V>);
  }

  build(): Readonly<T> {
    return Object.freeze({ ...this.config });
  }
}

// Usage - type-safe builder
const config = new ConfigBuilder()
  .set('apiUrl', 'https://api.example.com')
  .set('timeout', 5000)
  .set('retries', 3)
  .build();

// TypeScript knows the exact shape of config

// =============================================================================
// 11. BRANDED TYPES FOR VALIDATION
// =============================================================================

type Brand<K, T> = K & { __brand: T };

type UserId = Brand<string, 'UserId'>;
type Email = Brand<string, 'Email'>;

function createUserId(id: string): UserId {
  if (!id || id.length < 3) {
    throw new Error('Invalid user ID');
  }
  return id as UserId;
}

function createEmail(email: string): Email {
  if (!email.includes('@')) {
    throw new Error('Invalid email');
  }
  return email as Email;
}

// Functions that require validated types
function sendEmail(to: Email, subject: string): void {
  console.log(`Sending email to ${to}: ${subject}`);
}

// =============================================================================
// 12. EXHAUSTIVE CHECKS
// =============================================================================

type Shape = 
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; size: number }
  | { kind: "rectangle"; width: number; height: number };

function getArea(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'square':
      return shape.size ** 2;
    case "rectangle":
      return shape.width * shape.height;
    default:
      // This ensures we handle all cases
      const _exhaustive: never = shape;
      throw new Error(`Unhandled shape: ${JSON.stringify(_exhaustive)}`);
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  // Type guards
  isAdmin,
  isValidUser,
  isCustomError,
  
  // Functions
  processUser,
  getEmailDomain,
  getConfigValue,
  parseJSON,
  getProperty,
  processValue,
  makeRequest,
  safeApiCall,
  processResult,
  getArea,
  
  // Builders
  ConfigBuilder,
  
  // Brand constructors
  createUserId,
  createEmail,
  sendEmail,
  
  // Types
  type User,
  type Admin,
  type Result,
  type Route,
  type HttpMethod,
  type ApiPath,
  type UserId,
  type Email,
  type Shape,
  type Frozen,
  type DeepPartial,
  type MethodsOf
};