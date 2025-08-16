import chalk from 'chalk';
import { 
  CLIInstance,
  CommandDefinition,
  CommandContext,
  Hook,
  HookEvent,
  Plugin,
  CLIError,
  CommandNotFoundError
} from '../domain/types.js';
import { ArgumentParser } from './parser.js';
import { HelpFormatter } from './help.js';
import { findBestMatch } from '../utils/string.js';

export interface CLIOptions {
  name: string;
  version: string;
  description?: string;
  enableHelp?: boolean;
  enableVersion?: boolean;
  plugins?: Plugin[];
  hooks?: Partial<Record<HookEvent, Hook[]>>;
  context?: Partial<CommandContext>;
}

export class CLI implements CLIInstance {
  private commands = new Map<string, CommandDefinition>();
  private hooks = new Map<HookEvent, Hook[]>();
  private parser = new ArgumentParser();
  private helpFormatter: HelpFormatter;
  private defaultContext: CommandContext;

  constructor(private options: CLIOptions) {
    this.helpFormatter = new HelpFormatter(options.name);
    
    // Set up default context
    this.defaultContext = {
      cwd: process.cwd(),
      env: process.env,
      stdin: process.stdin,
      stdout: process.stdout,
      stderr: process.stderr,
      debug: false,
      quiet: false,
      color: chalk.level > 0,
      ...options.context
    };

    // Register default commands
    if (options.enableHelp !== false) {
      this.registerHelpCommand();
    }
    if (options.enableVersion !== false) {
      this.registerVersionCommand();
    }

    // Register hooks from options
    if (options.hooks) {
      for (const [event, hooks] of Object.entries(options.hooks)) {
        for (const hook of hooks) {
          this.addHook(event as HookEvent, hook);
        }
      }
    }

    // Register plugins
    if (options.plugins) {
      for (const plugin of options.plugins) {
        plugin.register(this);
      }
    }
  }

  register(command: CommandDefinition): void {
    this.commands.set(command.metadata.name, command);
    
    // Also register aliases
    if (command.metadata.aliases) {
      for (const alias of command.metadata.aliases) {
        this.commands.set(alias, command);
      }
    }
  }

  addHook(event: HookEvent, hook: Hook): void {
    const hooks = this.hooks.get(event) || [];
    hooks.push(hook);
    this.hooks.set(event, hooks);
  }

  async run(args: string[]): Promise<void> {
    const context = { ...this.defaultContext };
    
    // Parse global options
    const globalOptions = this.parseGlobalOptions(args);
    Object.assign(context, globalOptions);

    try {
      // Pre-parse hook
      await this.runHooks("preparse", { command: '', args: { command: [], options: {}, positionals: [], raw: args }, context });

      // Parse arguments
      const parsed = this.parser.parse(args);
      
      // Post-parse hook
      await this.runHooks("postparse", { command: parsed.command.join(' '), args: parsed, context });

      // Handle special global options first
      if (parsed.options['help']) {
        if (parsed.command.length > 0) {
          // Show help for specific command
          const command = this.findCommand(parsed.command);
          if (command) {
            this.showCommandHelp(command, context);
          } else {
            throw new CommandNotFoundError(parsed.command.join(' '));
          }
        } else {
          // Show general help
          this.showGeneralHelp(context);
        }
        return;
      }

      if (parsed.options['version']) {
        context.stdout.write(`${this.options.name} ${this.options.version}\n`);
        return;
      }

      // Find and execute command
      const command = this.findCommand(parsed.command);
      
      if (!command) {
        // If no command and no arguments, show general help
        if (parsed.command.length === 0) {
          this.showGeneralHelp(context);
          return;
        }
        
        const cmdString = parsed.command.join(' ');
        const suggestions = this.findSuggestions(cmdString);
        throw new CommandNotFoundError(cmdString, suggestions);
      }

      // Pre-command hook
      await this.runHooks("precommand", { command: command.metadata.name, args: parsed, context });

      // Execute command
      if (command.execute) {
        await command.execute(parsed, context);
      } else if (command.subcommands?.length) {
        // No execute function but has subcommands - show help
        this.showCommandHelp(command, context);
      }

      // Post-command hook
      await this.runHooks("postcommand", { command: command.metadata.name, args: parsed, context });

    } catch (error) {
      // Error hook
      await this.runHooks('error', { 
        command: args[0] || '', 
        args: { command: args, options: {}, positionals: [], raw: args }, 
        context 
      });

      this.handleError(error, context);
    }
  }

  private parseGlobalOptions(args: string[]): Partial<CommandContext> {
    const options: Partial<CommandContext> = {};
    
    // Simple global option parsing
    if (args.includes('--debug')) {
      options.debug = true;
    }
    if (args.includes('--quiet') || args.includes('-q')) {
      options.quiet = true;
    }
    if (args.includes('--no-color')) {
      options.color = false;
    }
    
    return options;
  }

  private findCommand(commandPath: string[]): CommandDefinition | undefined {
    if (commandPath.length === 0) {
      return undefined;
    }

    let current = this.commands.get(commandPath[0]!);
    if (!current) {
      return undefined;
    }

    // Navigate through subcommands
    for (let i = 1; i < commandPath.length; i++) {
      if (!current || !current.subcommands) {
        return undefined;
      }
      
      const nextCommand: CommandDefinition | undefined = current.subcommands.find(
        sub => sub.metadata.name === commandPath[i] || 
               sub.metadata.aliases?.includes(commandPath[i]!)
      );
      
      if (!nextCommand) {
        return undefined;
      }
      
      current = nextCommand;
    }

    return current;
  }

  private findSuggestions(command: string): string[] {
    const allCommands = Array.from(this.commands.values())
      .filter(cmd => !cmd.metadata.hidden)
      .map(cmd => cmd.metadata.name);
    
    return findBestMatch(command, allCommands, 3);
  }

  private async runHooks(event: HookEvent, context: any): Promise<void> {
    const hooks = this.hooks.get(event) || [];
    for (const hook of hooks) {
      await hook(context);
    }
  }

  private handleError(error: unknown, context: CommandContext): void {
    if (error instanceof CLIError) {
      if (!context.quiet) {
        const message = context.color ? chalk.red(error.message) : error.message;
        context.stderr.write(`Error: ${message}\n`);
        
        if (error instanceof CommandNotFoundError && error.message.includes('Did you mean')) {
          context.stderr.write('\n');
          context.stderr.write('Run \'--help\' for usage.\n');
        }
      }
      process.exit(error.exitCode);
    } else if (error instanceof Error) {
      if (!context.quiet) {
        const message = context.color ? chalk.red(error.message) : error.message;
        context.stderr.write(`Error: ${message}\n`);
        
        if (context.debug) {
          context.stderr.write('\n' + error.stack + '\n');
        }
      }
      process.exit(1);
    } else {
      if (!context.quiet) {
        context.stderr.write('An unknown error occurred\n');
      }
      process.exit(1);
    }
  }

  private registerHelpCommand(): void {
    this.register({
      metadata: {
        name: 'help',
        description: 'Show help information',
        aliases: ['h']
      },
      execute: async (args, context) => {
        if (args.positionals.length > 0) {
          // Show help for specific command
          const commandPath = args.positionals;
          const command = this.findCommand(commandPath);
          
          if (command) {
            this.showCommandHelp(command, context);
          } else {
            throw new CommandNotFoundError(commandPath.join(' '));
          }
        } else {
          // Show general help
          this.showGeneralHelp(context);
        }
      }
    });
  }

  private registerVersionCommand(): void {
    this.register({
      metadata: {
        name: 'version',
        description: 'Show version information',
        aliases: ['v']
      },
      execute: (_, context) => {
        context.stdout.write(`${this.options.name} ${this.options.version}\n`);
      }
    });
  }

  private showGeneralHelp(context: CommandContext): void {
    const commands = Array.from(this.commands.values())
      .filter(cmd => !cmd.metadata.hidden && !cmd.metadata.aliases?.includes(cmd.metadata.name));
    
    // Set chalk level based on context
    const originalLevel = chalk.level;
    if (!context.color) {
      chalk.level = 0;
    }
    
    const help = this.helpFormatter.formatGeneralHelp(
      this.options.description || '',
      commands
    );
    
    // Restore chalk level
    chalk.level = originalLevel;
    
    context.stdout.write(help);
  }

  private showCommandHelp(command: CommandDefinition, context: CommandContext): void {
    // Set chalk level based on context
    const originalLevel = chalk.level;
    if (!context.color) {
      chalk.level = 0;
    }
    
    const help = this.helpFormatter.formatCommandHelp(command);
    
    // Restore chalk level
    chalk.level = originalLevel;
    
    context.stdout.write(help);
  }
}