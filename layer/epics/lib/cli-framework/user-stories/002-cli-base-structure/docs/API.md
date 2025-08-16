# CLI Framework API Reference

## Overview

The AI Development Platform CLI Framework provides a type-safe, extensible foundation for building command-line tools in TypeScript.

## Core Classes

### CLI

The main class for creating CLI applications.

```typescript
import { CLI } from '@aidev/cli-framework';

const cli = new CLI({
  name: 'myapp',
  version: '1.0.0',
  description: 'My application description',
  enableHelp: true,      // default: true
  enableVersion: true,   // default: true
  plugins: [],          // optional plugins
  hooks: {},            // lifecycle hooks
  context: {}           // custom context overrides
});
```

#### Methods

- `register(command: CommandDefinition): void` - Register a command
- `addHook(event: HookEvent, hook: Hook): void` - Add a lifecycle hook
- `run(args: string[]): Promise<void>` - Run the CLI with arguments

### Command

Base class for implementing commands.

```typescript
import { Command } from '@aidev/cli-framework';

class MyCommand extends Command {
  name = 'mycommand';
  description = 'Description of my command';
  
  // Optional properties
  aliases = ['mc'];
  hidden = false;
  deprecated = false;
  examples = [
    {
      description: 'Basic usage',
      command: 'mycommand --option value'
    }
  ];
  
  // Define options schema
  options = {
    output: {
      type: 'string' as const,
      alias: 'o',
      description: 'Output file',
      required: true
    }
  };
  
  // Define subcommands
  subcommands = [
    new SubCommand1(),
    new SubCommand2()
  ];
  
  // Execute command
  async execute(options: { output: string }, context: CommandContext) {
    this.log(`Output: ${options.output}`);
  }
}
```

#### Logging Methods

- `log(message: string)` - Log to stdout
- `error(message: string)` - Log to stderr (red)
- `warn(message: string)` - Log warning (yellow)
- `IN PROGRESS(message: string)` - Log IN PROGRESS (green)
- `info(message: string)` - Log info (blue)
- `debug(message: string)` - Log debug (only if --debug)

#### Progress Methods

- `startSpinner(text: string)` - Start a loading spinner
- `updateSpinner(text: string)` - Update spinner text
- `succeedSpinner(text?: string)` - Mark spinner as IN PROGRESS
- `failSpinner(text?: string)` - Mark spinner as failed
- `stopSpinner()` - Stop spinner

#### Formatting Methods

- `table(data: Record<string, unknown>[])` - Display data as table
- `list(items: string[])` - Display bulleted list
- `box(content: string)` - Display content in a box

## Types

### OptionType

```typescript
type OptionType = 'string' | 'number' | 'boolean' | 'array' | 'count';
```

### OptionDefinition

```typescript
interface OptionDefinition {
  type: OptionType;
  alias?: string;              // Short flag alias
  description: string;
  default?: unknown;
  required?: boolean;
  choices?: readonly string[]; // Valid choices
  validate?: (value: unknown) => boolean | string;
  coerce?: (value: unknown) => unknown;
}
```

### CommandContext

```typescript
interface CommandContext {
  cwd: string;
  env: NodeJS.ProcessEnv;
  stdin: NodeJS.ReadStream;
  stdout: NodeJS.WriteStream;
  stderr: NodeJS.WriteStream;
  debug: boolean;
  quiet: boolean;
  color: boolean;
}
```

### Plugin

```typescript
interface Plugin {
  name: string;
  version: string;
  register(cli: CLIInstance): void | Promise<void>;
}
```

### HookEvent

```typescript
type HookEvent = 
  | 'preparse'     // Before parsing arguments
  | 'postparse'    // After parsing arguments
  | 'precommand'   // Before command execution
  | 'postcommand'  // After command execution
  | 'error';       // On error
```

## Option Types

### String Options

```typescript
options = {
  name: {
    type: 'string',
    alias: 'n',
    description: 'Your name',
    default: 'World'
  }
}
// Usage: --name John or -n John
```

### Number Options

```typescript
options = {
  port: {
    type: 'number',
    alias: 'p',
    description: 'Port number',
    default: 3000,
    validate: (value) => value > 0 && value < 65536
  }
}
// Usage: --port 8080 or -p 8080
```

### Boolean Options

```typescript
options = {
  verbose: {
    type: 'boolean',
    alias: 'v',
    description: 'Enable verbose output',
    default: false
  }
}
// Usage: --verbose or -v
```

### Array Options

```typescript
options = {
  tags: {
    type: 'array',
    alias: 't',
    description: 'Tags to apply',
    default: []
  }
}
// Usage: --tags foo bar baz
// Or: --tags=foo,bar,baz
```

### Count Options

```typescript
options = {
  verbosity: {
    type: 'count',
    alias: 'v',
    description: 'Increase verbosity'
  }
}
// Usage: -vvv (sets verbosity to 3)
```

## Type Inference

The framework provides automatic type inference for options:

```typescript
class MyCommand extends Command {
  options = {
    name: { type: 'string' as const, description: 'Name' },
    age: { type: 'number' as const, description: 'Age' },
    active: { type: 'boolean' as const, description: 'Active' }
  };
  
  async execute(options) {
    // TypeScript knows:
    // options.name is string | undefined
    // options.age is number | undefined
    // options.active is boolean | undefined
  }
}
```

## Plugins

Create reusable plugins to extend CLI functionality:

```typescript
const loggingPlugin: Plugin = {
  name: 'logging',
  version: '1.0.0',
  register(cli) {
    // Add logging command
    cli.register({
      metadata: { name: 'logs', description: 'View logs' },
      execute: async () => {
        // Implementation
      }
    });
    
    // Add hooks
    cli.addHook('precommand', async (context) => {
      console.log(`Executing: ${context.command}`);
    });
  }
};

const cli = new CLI({
  name: 'myapp',
  version: '1.0.0',
  plugins: [loggingPlugin]
});
```

## Error Handling

The framework provides specialized error classes:

```typescript
import { CLIError, ValidationError, CommandNotFoundError } from '@aidev/cli-framework';

// In your command
async execute() {
  if (!isValid) {
    throw new CLIError('Invalid configuration', 'CONFIG_ERROR', 2);
  }
}

// Validation errors are thrown automatically
// when option validation fails

// Command not found errors include suggestions
// based on similar command names
```

## Global Options

The following global options are available by default:

- `--help, -h` - Show help information
- `--version, -v` - Show version
- `--debug` - Enable debug output
- `--quiet, -q` - Suppress output
- `--no-color` - Disable colored output

## Best Practices

1. **Use const assertions** for option types:
   ```typescript
   type: 'string' as const
   ```

2. **Provide examples** for complex commands:
   ```typescript
   examples = [
     { description: 'Deploy to production', command: 'deploy --env prod' }
   ]
   ```

3. **Validate options** when needed:
   ```typescript
   validate: (value) => value > 0 || 'Must be positive'
   ```

4. **Use subcommands** for logical grouping:
   ```typescript
   // db list, db create, db delete
   ```

5. **Handle errors gracefully** with try-catch and helpful messages

6. **Use spinners** for long-running operations

7. **Respect context flags** like quiet and debug modes