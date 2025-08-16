import chalk from 'chalk';
import ora, { Ora } from 'ora';
import { 
  CommandDefinition, 
  CommandContext, 
  CommandMetadata,
  OptionsSchema,
  InferOptions,
  ParsedArguments
} from './types.js';

export abstract class Command<T extends OptionsSchema = OptionsSchema> {
  abstract readonly name: string;
  abstract readonly description: string;
  
  readonly aliases?: string[] = [];
  readonly hidden?: boolean = false;
  readonly deprecated?: boolean = false;
  readonly examples?: Array<{ description: string; command: string }> = [];
  readonly options?: T;
  readonly subcommands?: Command[] = [];

  private spinner: Ora | undefined;

  /**
   * Execute the command with parsed options
   */
  abstract execute(
    options: InferOptions<T>,
    context: CommandContext
  ): void | Promise<void>;

  /**
   * Get command definition for registration
   */
  getDefinition(): CommandDefinition {
    const metadata: CommandMetadata = {
      name: this.name,
      description: this.description
    };

    // Add optional properties only if defined
    if (this.aliases && this.aliases.length > 0) {
      metadata.aliases = this.aliases;
    }
    if (this.hidden !== undefined) {
      metadata.hidden = this.hidden;
    }
    if (this.deprecated !== undefined) {
      metadata.deprecated = this.deprecated;
    }
    if (this.examples && this.examples.length > 0) {
      metadata.examples = this.examples;
    }

    const definition: CommandDefinition = {
      metadata,
      execute: async (args: ParsedArguments, context: CommandContext) => {
        // Type assertion is safe here because parser ensures correct types
        const typedOptions = args.options as InferOptions<T>;
        await this.execute(typedOptions, context);
      }
    };

    // Add optional properties only if defined
    if (this.options) {
      definition.options = this.options;
    }
    if (this.subcommands && this.subcommands.length > 0) {
      definition.subcommands = this.subcommands.map(cmd => cmd.getDefinition());
    }

    return definition;
  }

  /**
   * Logging utilities
   */
  protected log(message: string, context?: CommandContext): void {
    const output = context?.stdout || process.stdout;
    output.write(message + '\n');
  }

  protected error(message: string, context?: CommandContext): void {
    const output = context?.stderr || process.stderr;
    const colored = context?.color !== false ? chalk.red(message) : message;
    output.write(colored + '\n');
  }

  protected warn(message: string, context?: CommandContext): void {
    const output = context?.stderr || process.stderr;
    const colored = context?.color !== false ? chalk.yellow(message) : message;
    output.write(colored + '\n');
  }

  protected In Progress(message: string, context?: CommandContext): void {
    const output = context?.stdout || process.stdout;
    const colored = context?.color !== false ? chalk.green(message) : message;
    output.write(colored + '\n');
  }

  protected info(message: string, context?: CommandContext): void {
    const output = context?.stdout || process.stdout;
    const colored = context?.color !== false ? chalk.blue(message) : message;
    output.write(colored + '\n');
  }

  protected debug(message: string, context?: CommandContext): void {
    if (context?.debug) {
      const output = context?.stderr || process.stderr;
      const colored = context?.color !== false ? chalk.gray(`[DEBUG] ${message}`) : `[DEBUG] ${message}`;
      output.write(colored + '\n');
    }
  }

  /**
   * Progress indicators
   */
  protected startSpinner(text: string, context?: CommandContext): void {
    if (!context?.quiet) {
      this.spinner = ora({
        text,
        stream: context?.stdout || process.stdout,
        isEnabled: context?.color !== false
      }).start();
    }
  }

  protected updateSpinner(text: string): void {
    if (this.spinner) {
      this.spinner.text = text;
    }
  }

  protected succeedSpinner(text?: string): void {
    if (this.spinner) {
      this.spinner.succeed(text);
      this.spinner = undefined;
    }
  }

  protected failSpinner(text?: string): void {
    if (this.spinner) {
      this.spinner.fail(text);
      this.spinner = undefined;
    }
  }

  protected stopSpinner(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = undefined;
    }
  }

  /**
   * Table formatting
   */
  protected table(data: Record<string, unknown>[], context?: CommandContext): void {
    if (!data.length) return;

    const keys = Object.keys(data[0]!);
    const widths = keys.map(key => {
      const values = data.map(row => String(row[key] ?? ''));
      return Math.max(key.length, ...values.map(v => v.length));
    });

    // Header
    const header = keys.map((key, i) => key.padEnd(widths[i]!)).join('  ');
    const separator = widths.map(w => '-'.repeat(w)).join('  ');
    
    this.log(context?.color !== false ? chalk.bold(header) : header, context);
    this.log(separator, context);

    // Rows
    data.forEach(row => {
      const line = keys.map((key, i) => 
        String(row[key] ?? '').padEnd(widths[i]!)
      ).join('  ');
      this.log(line, context);
    });
  }

  /**
   * List formatting
   */
  protected list(items: string[], context?: CommandContext): void {
    items.forEach(item => {
      this.log(`  • ${item}`, context);
    });
  }

  /**
   * Box formatting
   */
  protected box(content: string, context?: CommandContext): void {
    const lines = content.split('\n');
    const maxLength = Math.max(...lines.map(l => l.length));
    const horizontal = '─'.repeat(maxLength + 2);
    
    this.log(`┌${horizontal}┐`, context);
    lines.forEach(line => {
      this.log(`│ ${line.padEnd(maxLength)} │`, context);
    });
    this.log(`└${horizontal}┘`, context);
  }
}