import chalk from 'chalk';
import { CommandDefinition, OptionsSchema } from '../domain/types.js';

export class HelpFormatter {
  constructor(private appName: string) {}

  formatGeneralHelp(description: string, commands: CommandDefinition[]): string {
    const lines: string[] = [];
    
    // Header
    lines.push(chalk.bold(`${this.appName}`));
    if (description) {
      lines.push(description);
    }
    lines.push('');
    
    // Usage
    lines.push(chalk.bold('Usage:'));
    lines.push(`  ${this.appName} <command> [options]`);
    lines.push('');
    
    // Commands
    if (commands.length > 0) {
      lines.push(chalk.bold('Commands:'));
      
      const maxLength = Math.max(...commands.map(cmd => cmd.metadata.name.length));
      
      for (const command of commands) {
        const name = command.metadata.name.padEnd(maxLength + 2);
        const desc = command.metadata.description;
        lines.push(`  ${chalk.cyan(name)} ${desc}`);
      }
      lines.push('');
    }
    
    // Global options
    lines.push(chalk.bold('Global Options:'));
    lines.push('  --help, -h     Show help');
    lines.push('  --version, -v  Show version');
    lines.push('  --debug        Enable debug output');
    lines.push('  --quiet, -q    Suppress output');
    lines.push('  --no-color     Disable colored output');
    lines.push('');
    
    // Examples
    lines.push(chalk.bold('Examples:'));
    lines.push(`  ${this.appName} help`);
    lines.push(`  ${this.appName} help <command>`);
    lines.push('');
    
    return lines.join('\n');
  }

  formatCommandHelp(command: CommandDefinition): string {
    const lines: string[] = [];
    
    // Header
    lines.push(chalk.bold(command.metadata.name));
    lines.push(command.metadata.description);
    if (command.metadata.deprecated) {
      lines.push(chalk.yellow('⚠️  This command is deprecated'));
    }
    lines.push('');
    
    // Usage
    lines.push(chalk.bold('Usage:'));
    const usage = this.buildUsage(command);
    lines.push(`  ${usage}`);
    lines.push('');
    
    // Aliases
    if (command.metadata.aliases && command.metadata.aliases.length > 0) {
      lines.push(chalk.bold('Aliases:'));
      lines.push(`  ${command.metadata.aliases.join(', ')}`);
      lines.push('');
    }
    
    // Options
    if (command.options) {
      lines.push(chalk.bold('Options:'));
      lines.push(...this.formatOptions(command.options));
      lines.push('');
    }
    
    // Subcommands
    if (command.subcommands && command.subcommands.length > 0) {
      lines.push(chalk.bold('Subcommands:'));
      
      const maxLength = Math.max(...command.subcommands.map(sub => sub.metadata.name.length));
      
      for (const subcommand of command.subcommands) {
        if (!subcommand.metadata.hidden) {
          const name = subcommand.metadata.name.padEnd(maxLength + 2);
          const desc = subcommand.metadata.description;
          lines.push(`  ${chalk.cyan(name)} ${desc}`);
        }
      }
      lines.push('');
    }
    
    // Examples
    if (command.metadata.examples && command.metadata.examples.length > 0) {
      lines.push(chalk.bold('Examples:'));
      for (const example of command.metadata.examples) {
        lines.push(`  # ${example.description}`);
        lines.push(`  ${chalk.green(example.command)}`);
        lines.push('');
      }
    }
    
    return lines.join('\n');
  }

  private buildUsage(command: CommandDefinition): string {
    const parts = [this.appName, command.metadata.name];
    
    if (command.subcommands && command.subcommands.length > 0) {
      parts.push('<subcommand>');
    }
    
    if (command.options) {
      parts.push('[options]');
    }
    
    parts.push('[arguments]');
    
    return parts.join(' ');
  }

  private formatOptions(options: OptionsSchema): string[] {
    const lines: string[] = [];
    const entries = Object.entries(options);
    
    // Calculate padding
    const maxNameLength = Math.max(...entries.map(([name, def]) => {
      const parts = [`--${name}`];
      if (def.alias) {
        parts.push(`-${def.alias}`);
      }
      return parts.join(', ').length;
    }));
    
    for (const [name, def] of entries) {
      const parts = [`--${name}`];
      if (def.alias) {
        parts.push(`-${def.alias}`);
      }
      
      const flags = parts.join(', ').padEnd(maxNameLength + 2);
      const required = def.required ? chalk.red(' (required)') : '';
      const defaultValue = def.default !== undefined ? chalk.gray(` [default: ${def.default}]`) : '';
      
      lines.push(`  ${chalk.cyan(flags)} ${def.description}${required}${defaultValue}`);
      
      if (def.choices) {
        lines.push(`    ${chalk.gray('Choices:')} ${def.choices.join(', ')}`);
      }
    }
    
    return lines;
  }
}