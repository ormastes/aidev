/**
 * AI Development Platform CLI Framework
 * 
 * A type-safe, extensible CLI framework for building command-line tools
 */

// Core exports
export { CLI } from './application/cli.js';
export { Command } from './domain/command.js';
export { ArgumentParser } from './application/parser.js';
export { HelpFormatter } from './application/help.js';

// Type exports
export type {
  // Core types
  CLIInstance,
  CommandDefinition,
  CommandContext,
  CommandMetadata,
  CommandExample,
  ParsedArguments,
  
  // Option types
  OptionType,
  OptionDefinition,
  OptionsSchema,
  InferOptions,
  
  // Hook types
  Hook,
  HookEvent,
  HookContext,
  
  // Plugin types
  Plugin,
  
  // Error types
  ValidationIssue,
  
  // Handler types
  CommandHandler
} from './domain/types.js';

// Error exports
export { 
  CLIError,
  ValidationError,
  CommandNotFoundError
} from './domain/types.js';

// Utility exports
export * from './utils/string.js';

// Version
export const VERSION = '1.0.0';