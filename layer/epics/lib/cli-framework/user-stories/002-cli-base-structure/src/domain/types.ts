/**
 * Core types for the CLI framework
 */

export type OptionType = 'string' | 'number' | 'boolean' | 'array' | 'count';

export interface OptionDefinition {
  type: OptionType;
  alias?: string;
  description: string;
  default?: unknown;
  required?: boolean;
  choices?: readonly string[];
  validate?: (value: unknown) => boolean | string;
  coerce?: (value: unknown) => unknown;
}

export type OptionsSchema = Record<string, OptionDefinition>;

export interface CommandMetadata {
  name: string;
  description: string;
  aliases?: string[];
  hidden?: boolean;
  deprecated?: boolean;
  examples?: CommandExample[];
}

export interface CommandExample {
  description: string;
  command: string;
}

export interface CommandContext {
  cwd: string;
  env: NodeJS.ProcessEnv;
  stdin: NodeJS.ReadStream;
  stdout: NodeJS.WriteStream;
  stderr: NodeJS.WriteStream;
  debug: boolean;
  quiet: boolean;
  color: boolean;
}

export interface ParsedArguments<T = Record<string, unknown>> {
  command: string[];
  options: T;
  positionals: string[];
  raw: string[];
}

export interface HookContext {
  command: string;
  args: ParsedArguments;
  context: CommandContext;
}

export type Hook = (context: HookContext) => void | Promise<void>;

export interface Plugin {
  name: string;
  version: string;
  register(cli: CLIInstance): void | Promise<void>;
}

export interface CLIInstance {
  register(command: CommandDefinition): void;
  addHook(event: HookEvent, hook: Hook): void;
  run(args: string[]): Promise<void>;
}

export type HookEvent = 
  | 'preparse'
  | 'postparse'
  | 'precommand'
  | 'postcommand'
  | 'error';

export interface CommandDefinition {
  metadata: CommandMetadata;
  options?: OptionsSchema;
  subcommands?: CommandDefinition[];
  execute?(args: ParsedArguments, context: CommandContext): void | Promise<void>;
}

export interface ValidationIssue {
  field: string;
  message: string;
  value?: unknown;
}

export class CLIError extends Error {
  constructor(
    message: string,
    public code: string = 'CLI_ERROR',
    public exitCode: number = 1
  ) {
    super(message);
    this.name = 'CLIError';
  }
}

export class ValidationError extends CLIError {
  constructor(
    public errors: ValidationIssue[],
    message: string = 'Validation failed'
  ) {
    super(message, 'VALIDATION_ERROR');
  }
}

export class CommandNotFoundError extends CLIError {
  constructor(command: string, suggestions?: string[]) {
    const message = suggestions?.length
      ? `Command "${command}" not found. Did you mean: ${suggestions.join(', ')}?`
      : `Command "${command}" not found.`;
    super(message, 'COMMAND_NOT_FOUND');
  }
}

// Type utilities for better inference
export type InferOptions<T extends OptionsSchema> = {
  [K in keyof T]: T[K]['type'] extends 'string' ? string :
    T[K]['type'] extends 'number' ? number :
    T[K]['type'] extends 'boolean' ? boolean :
    T[K]['type'] extends 'array' ? string[] :
    T[K]['type'] extends 'count' ? number :
    never;
} & {
  [K in keyof T as T[K]['required'] extends true ? never : K]?: 
    T[K]['type'] extends 'string' ? string :
    T[K]['type'] extends 'number' ? number :
    T[K]['type'] extends 'boolean' ? boolean :
    T[K]['type'] extends 'array' ? string[] :
    T[K]['type'] extends 'count' ? number :
    never;
};

// Helper type for command handlers
export type CommandHandler<T extends OptionsSchema = OptionsSchema> = (
  options: InferOptions<T>,
  context: CommandContext
) => void | Promise<void>;