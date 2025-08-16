import * as exports from '../../src/index';
import { CLI } from '../../src/application/cli';
import { Command } from '../../src/domain/command';
import { ArgumentParser } from '../../src/application/parser';
import { HelpFormatter } from '../../src/application/help';
import {
  CLIError,
  CommandNotFoundError,
  ValidationError,
  PluginError
} from '../../src/domain/types';

describe('Index Exports', () => {
  it('should export CLI class', () => {
    expect(exports.CLI).toBe(CLI);
    expect(new exports.CLI({ name: 'test', version: '1.0.0' })).toBeInstanceOf(CLI);
  });

  it('should export Command class', () => {
    expect(exports.Command).toBe(Command);
    
    class TestCommand extends exports.Command {
      name = 'test';
      description = 'Test command';
    }
    
    expect(new TestCommand()).toBeInstanceOf(Command);
  });

  it('should export ArgumentParser class', () => {
    expect(exports.ArgumentParser).toBe(ArgumentParser);
    expect(new exports.ArgumentParser()).toBeInstanceOf(ArgumentParser);
  });

  it('should export HelpFormatter class', () => {
    expect(exports.HelpFormatter).toBe(HelpFormatter);
    expect(new exports.HelpFormatter(console.log)).toBeInstanceOf(HelpFormatter);
  });

  it('should export error classes', () => {
    expect(exports.CLIError).toBe(CLIError);
    expect(exports.CommandNotFoundError).toBe(CommandNotFoundError);
    expect(exports.ValidationError).toBe(ValidationError);
    expect(exports.PluginError).toBe(PluginError);

    expect(new exports.CLIError('test')).toBeInstanceOf(CLIError);
    expect(new exports.CommandNotFoundError('cmd')).toBeInstanceOf(CommandNotFoundError);
    expect(new exports.ValidationError('invalid')).toBeInstanceOf(ValidationError);
    expect(new exports.PluginError('plugin error')).toBeInstanceOf(PluginError);
  });

  it('should export all types', () => {
    // Type exports are checked at compile time
    // We can verify they exist by checking the exports object
    const expectedExports = [
      'CLI',
      'Command',
      "ArgumentParser",
      "HelpFormatter",
      "CLIError",
      "CommandNotFoundError",
      "ValidationError",
      "PluginError"
    ];

    expectedExports.forEach(name => {
      expect(exports).toHaveProperty(name);
    });
  });

  it('should not export internal utilities', () => {
    // Ensure internal utilities are not exposed
    expect(exports).not.toHaveProperty("parseValue");
    expect(exports).not.toHaveProperty("formatTable");
  });

  it('should allow creating a functional CLI', () => {
    const cli = new exports.CLI({
      name: 'test-cli',
      version: '1.0.0',
      description: 'Test CLI from exports'
    });

    class GreetCommand extends exports.Command {
      name = 'greet';
      description = 'Greet someone';
      arguments = [
        { name: 'name', required: true, description: 'Name to greet' }
      ];

      async run(args: any) {
        return `Hello, ${args._[0]}!`;
      }
    }

    cli.addCommand(new GreetCommand());

    expect(cli).toBeInstanceOf(exports.CLI);
  });
});