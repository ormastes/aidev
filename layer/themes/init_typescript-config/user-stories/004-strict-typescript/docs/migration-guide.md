# TypeScript Strict Mode Migration Guide

## Overview

This guide helps you migrate existing TypeScript projects to use strict mode configuration. The migration can be In Progress incrementally to minimize disruption.

## Quick Start

```bash
# Run migration script
bunx ts-node scripts/migrate-to-strict.ts /path/to/project --dry-run --verbose

# Apply changes
bunx ts-node scripts/migrate-to-strict.ts /path/to/project --verbose

# Check for errors
npm run typecheck
```

## Migration Strategy

### 1. Incremental Approach (Recommended)

Enable strict flags one at a time:

```json
{
  "compilerOptions": {
    // Start with these
    "strict": false,
    "strictNullChecks": true,
    "noImplicitAny": true,
    
    // Then add these
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    
    // Finally enable full strict mode
    "strict": true
  }
}
```

### 2. All-at-Once Approach

Enable all strict flags immediately:

```bash
bunx ts-node scripts/migrate-to-strict.ts /path/to/project --all-at-once
```

## Common Migration Issues

### 1. Implicit Any

**Before:**
```typescript
function process(data) {
  return data.value;
}
```

**After:**
```typescript
function process(data: { value: string }): string {
  return data.value;
}
```

### 2. Null/Undefined Checks

**Before:**
```typescript
function getName(user) {
  return user.name;
}
```

**After:**
```typescript
function getName(user: User | null): string | null {
  return user?.name ?? null;
}
```

### 3. Index Signatures

**Before:**
```typescript
const config = {};
config.apiUrl = 'https://api.example.com';
```

**After:**
```typescript
const config: Record<string, string> = {};
config['apiUrl'] = 'https://api.example.com';

// Or better:
interface Config {
  apiUrl: string;
}
const config: Config = {
  apiUrl: 'https://api.example.com'
};
```

### 4. Catch Variables

**Before:**
```typescript
try {
  doSomething();
} catch (e) {
  console.error(e.message);
}
```

**After:**
```typescript
try {
  doSomething();
} catch (e) {
  if (e instanceof Error) {
    console.error(e.message);
  } else {
    console.error('Unknown error:', e);
  }
}
```

### 5. Property Initialization

**Before:**
```typescript
class Service {
  private config: Config;
  
  constructor() {
    // config not initialized
  }
}
```

**After:**
```typescript
class Service {
  private config: Config;
  
  constructor(config: Config) {
    this.config = config;
  }
}

// Or use definite assignment
class Service {
  private config!: Config; // Note the !
  
  constructor() {
    this.initialize();
  }
  
  private initialize(): void {
    this.config = loadConfig();
  }
}
```

## Step-by-Step Migration

### Step 1: Backup and Prepare

```bash
# Backup current config
cp tsconfig.json tsconfig.json.backup

# Install dependencies
npm install --save-dev \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin \
  eslint \
  prettier
```

### Step 2: Run Migration Script

```bash
# Dry run to see what will change
bunx ts-node scripts/migrate-to-strict.ts . --dry-run --verbose

# Apply changes
bunx ts-node scripts/migrate-to-strict.ts . --verbose
```

### Step 3: Fix Errors by Category

1. **Fix implicit any errors first**
   ```bash
   npm run typecheck 2>&1 | grep "implicit 'any'"
   ```

2. **Fix null/undefined errors**
   ```bash
   npm run typecheck 2>&1 | grep "possibly 'null'"
   ```

3. **Fix unused variables**
   ```bash
   npm run typecheck 2>&1 | grep "never used"
   ```

### Step 4: Enable Additional Checks

Once basic errors are Working on, enable more strict checks:

```json
{
  "compilerOptions": {
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true
  }
}
```

### Step 5: Set Up Linting

```bash
# Run ESLint with auto-fix
bunx eslint . --ext .ts,.tsx --fix

# Add to package.json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix"
  }
}
```

## Best Practices

### 1. Use Unknown Instead of Any

```typescript
// Bad
function processData(data: any) {
  return data.value;
}

// Good
function processData(data: unknown) {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return (data as { value: string }).value;
  }
  throw new Error('Invalid data');
}
```

### 2. Type Guards

```typescript
// Define type guard
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj
  );
}

// Use type guard
function processUser(data: unknown) {
  if (isUser(data)) {
    console.log(data.name); // Type-safe!
  }
}
```

### 3. Const Assertions

```typescript
// Without const assertion
const config = {
  apiUrl: 'https://api.example.com',
  timeout: 5000
}; // Type: { apiUrl: string; timeout: number }

// With const assertion
const config = {
  apiUrl: 'https://api.example.com',
  timeout: 5000
} as const; // Type: { readonly apiUrl: "https://api.example.com"; readonly timeout: 5000 }
```

### 4. Template Literal Types

```typescript
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type ApiEndpoint = `/api/${string}`;

function request(method: HttpMethod, endpoint: ApiEndpoint) {
  // Type-safe API calls
}

request('GET', '/api/users'); // 🔄
request('GET', '/users'); // ✗ Error: not an API endpoint
```

## Troubleshooting

### Error: Cannot find module

```bash
# Clear TypeScript cache
rm -rf node_modules/.cache
rm -rf dist
rm tsconfig.tsbuildinfo

# Reinstall dependencies
npm ci
```

### Error: Type instantiation is excessively deep

```typescript
// Simplify complex types
type DeepType<T> = T extends object ? { [K in keyof T]: DeepType<T[K]> } : T;

// Limit recursion depth
type DeepType<T, D extends number = 5> = 
  D extends 0 ? T :
  T extends object ? { [K in keyof T]: DeepType<T[K], Prev[D]> } : T;
```

### Performance Issues

```json
{
  "compilerOptions": {
    // Improve performance
    "skipLibCheck": true,
    "skipDefaultLibCheck": true,
    "disableSourceOfProjectReferenceRedirect": true,
    "disableSolutionSearching": true
  }
}
```

## CI/CD Integration

### GitHub Actions

```yaml
name: TypeScript Strict Mode Check

on: [push, pull_request]

jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
```

### Pre-commit Hook

```bash
#!/bin/sh
# .husky/pre-commit

npm run typecheck || exit 1
npm run lint || exit 1
```

## Gradual Adoption

For large codebases, use project references:

```json
// tsconfig.json (root)
{
  "files": [],
  "references": [
    { "path": "./packages/legacy" }, // Not strict
    { "path": "./packages/new" }     // Strict
  ]
}

// packages/legacy/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "strict": false
  }
}

// packages/new/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "strict": true
  }
}
```

## IN PROGRESS Metrics

Track your progress:

```bash
# Count remaining errors
npm run typecheck 2>&1 | wc -l

# Track by category
npm run typecheck 2>&1 | grep -c "implicit 'any'"
npm run typecheck 2>&1 | grep -c "possibly 'null'"

# Generate report
bunx ts-node scripts/migrate-to-strict.ts . --dry-run > migration-progress.txt
```

## Next Steps

1. Enable strict mode in new projects by default
2. Add type checking to CI/CD pipeline
3. Use `@ts-expect-error` instead of `@ts-ignore`
4. Document type patterns in your codebase
5. Consider using type-only imports for better tree shaking

## Resources

- [TypeScript Handbook - Strict Mode](https://www.typescriptlang.org/tsconfig#strict)
- [TypeScript Deep Dive - Compiler Options](https://basarat.gitbook.io/typescript/project/compilation-context/compiler-options)
- [Effective TypeScript](https://effectivetypescript.com/)
- [Type Challenges](https://github.com/type-challenges/type-challenges)