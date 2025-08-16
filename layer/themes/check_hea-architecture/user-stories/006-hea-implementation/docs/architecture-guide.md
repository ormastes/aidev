# HEA Architecture Guide

## Introduction

The Hierarchical Encapsulation Architecture (HEA) is a layered architecture pattern designed to enforce clear boundaries, promote code reusability, and maintain a clean dependency graph in large-scale applications.

## Core Principles

### 1. Layer Hierarchy

Layers are organized in a strict hierarchy where dependencies can only flow downward:

```
┌─────────────────────────────────────┐
│          Themes Layer               │ ← Feature implementations
│  (Business-specific features)       │
├─────────────────────────────────────┤
│       Infrastructure Layer          │ ← External integrations
│    (External service adapters)      │
├─────────────────────────────────────┤
│          Shared Layer               │ ← Cross-cutting concerns
│    (Common utilities & services)    │
├─────────────────────────────────────┤
│           Core Layer                │ ← Foundation
│     (Fundamental abstractions)      │
└─────────────────────────────────────┘
```

### 2. Dependency Rules

- **Core Layer**: No dependencies on other layers
- **Shared Layer**: Can only depend on Core
- **Themes Layer**: Can depend on Core and Shared
- **Infrastructure Layer**: Can depend on Core and Shared
- **Cross-Layer Rule**: Themes and Infrastructure cannot depend on each other

### 3. Pipe Pattern

All cross-layer communication happens through well-defined pipes:

```typescript
export interface Pipe<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
  validate?(input: TInput): ValidationResult;
  getMetadata(): PipeMetadata;
}
```

## Layer Descriptions

### Core Layer

The foundation of the architecture containing:
- Fundamental interfaces and types
- Basic utilities with no external dependencies
- Architecture enforcement tools
- Pure business logic

Example modules:
- `types` - Core type definitions
- `utils` - Pure utility functions
- `errors` - Base error classes
- `validation` - Core validation logic

### Shared Layer

Cross-cutting concerns used by multiple features:
- Common services and utilities
- Shared business logic
- Reusable components
- Integration abstractions

Example modules:
- `auth` - Authentication services
- `logging` - Logging infrastructure
- `events` - Event bus implementation
- `cache` - Caching abstractions

### Themes Layer

Feature-specific implementations:
- In Progress feature modules
- Business logic implementation
- UI components (if applicable)
- Feature-specific services

Example modules:
- `user-management` - User CRUD operations
- `billing` - Payment processing
- `reporting` - Report generation
- `notifications` - Alert system

### Infrastructure Layer

External service integrations:
- Database adapters
- API clients
- File system operations
- Third-party service wrappers

Example modules:
- `database` - Database connections
- `email` - Email service integration
- `storage` - File storage adapters
- `queue` - Message queue clients

## Implementation Guidelines

### 1. Module Structure

Every module must follow this structure:

```
module-name/
├── src/
│   ├── index.ts        # Public exports
│   ├── pipe/           # Pipe interface
│   │   └── index.ts
│   ├── types.ts        # Type definitions
│   ├── utils/          # Internal utilities
│   └── impl/           # Implementation details
├── tests/              # Test files
├── docs/               # Documentation
├── package.json
├── tsconfig.json
└── README.md
```

### 2. Pipe Implementation

Example pipe implementation:

```typescript
// src/pipe/index.ts
import { createPipeBuilder } from '@aidev/hea-architecture';

export interface UserServicePipe {
  getUser(id: string): Promise<User>;
  createUser(data: CreateUserDto): Promise<User>;
  updateUser(id: string, data: UpdateUserDto): Promise<User>;
}

export const createUserServicePipe = (deps: Dependencies): UserServicePipe => {
  const pipe = createPipeBuilder<UserServiceInput, UserServiceOutput>()
    .withName('user-service')
    .withVersion('1.0.0')
    .withLayer('themes')
    .withValidator(validateUserInput)
    .withExecutor(async (input) => {
      // Implementation
    })
    .build();

  return {
    getUser: async (id) => pipe.execute({ action: 'get', id }),
    createUser: async (data) => pipe.execute({ action: 'create', data }),
    updateUser: async (id, data) => pipe.execute({ action: 'update', id, data }),
  };
};
```

### 3. Dependency Injection

Use constructor injection for dependencies:

```typescript
export class UserService {
  constructor(
    private readonly db: DatabasePipe,
    private readonly auth: AuthPipe,
    private readonly logger: LoggerPipe
  ) {}

  async createUser(data: CreateUserDto): Promise<User> {
    // Use injected dependencies
    await this.auth.validatePermission('user.create');
    const user = await this.db.create('users', data);
    this.logger.info('User created', { userId: user.id });
    return user;
  }
}
```

### 4. Testing Strategy

Each layer requires different testing approaches:

- **Core Layer**: Pure unit tests
- **Shared Layer**: Unit tests with mocked dependencies
- **Themes Layer**: Integration tests with mocked infrastructure
- **Infrastructure Layer**: Contract tests with external services

## Best Practices

### 1. Keep Layers Thin

Each layer should have a single, well-defined responsibility. Avoid bloating layers with unrelated functionality.

### 2. Use Interfaces

Define interfaces for all pipes and services to enable easy mocking and testing.

### 3. Avoid Circular Dependencies

The architecture validation tools will catch circular dependencies, but design your modules to avoid them.

### 4. Document Pipes

Every pipe should have comprehensive documentation including:
- Purpose and responsibility
- Input/output schemas
- Error conditions
- Usage examples

### 5. Version Your Pipes

Include version information in pipe metadata to support backward compatibility.

## Migration Guide

To migrate existing code to HEA:

1. **Analyze Dependencies**: Map current dependencies
2. **Identify Layers**: Categorize modules into layers
3. **Create Pipes**: Define pipe interfaces for cross-layer communication
4. **Refactor Incrementally**: Move modules one at a time
5. **Validate**: Run architecture validation after each step

## Tools and Commands

```bash
# Scaffold new module
npm run hea:scaffold

# Validate architecture
npm run hea:validate

# Generate dependency graph
npm run hea:graph

# Check layer boundaries
npm run hea:check

# Migrate existing module
npm run hea:migrate
```

## Common Patterns

### 1. Repository Pattern

```typescript
// In themes layer
export interface UserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

// In infrastructure layer
export class PostgresUserRepository implements UserRepository {
  // Implementation
}
```

### 2. Service Pattern

```typescript
// In shared layer
export class CacheService {
  constructor(private cache: CachePipe) {}
  
  async get<T>(key: string): Promise<T | null> {
    return this.cache.get(key);
  }
}
```

### 3. Factory Pattern

```typescript
// In themes layer
export class PipeFactory {
  static createUserPipe(config: Config): UserPipe {
    return createPipeBuilder<UserInput, UserOutput>()
      .withName('user')
      .withConfig(config)
      .build();
  }
}
```

## Troubleshooting

### Common Issues

1. **Import not allowed**: Check layer dependencies
2. **Circular dependency**: Refactor to use pipes
3. **Missing pipe**: Ensure pipe is registered
4. **Type mismatch**: Check pipe input/output types

### Validation Errors

Run validation with verbose output:

```bash
npm run hea:validate -- --verbose
```

This will show detailed information about architecture violations.