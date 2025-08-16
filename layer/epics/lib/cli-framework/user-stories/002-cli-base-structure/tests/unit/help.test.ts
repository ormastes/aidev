import { HelpFormatter } from '../../src/application/help';
import { Command } from '../../src/domain/command';
import { CLIOptions } from '../../src/domain/types';

describe("HelpFormatter", () => {
  let formatter: HelpFormatter;
  let mockLogger: jest.Mock;

  beforeEach(() => {
    mockLogger = jest.fn();
    formatter = new HelpFormatter(mockLogger);
  });

  describe("formatGeneralHelp", () => {
    it('should format general help with description and commands', () => {
      const options: CLIOptions = {
        name: 'test-cli',
        version: '1.0.0',
        description: 'A test CLI application'
      };

      const commands = new Map<string, Command>();
      
      class TestCommand extends Command {
        name = 'test';
        description = 'Test command';
        options = [
          { name: 'verbose', type: 'boolean' as const, description: 'Verbose output' }
        ];
      }
      
      class AnotherCommand extends Command {
        name = 'another';
        description = 'Another test command';
      }

      commands.set('test', new TestCommand());
      commands.set('another', new AnotherCommand());

      formatter.formatGeneralHelp(options, commands);

      expect(mockLogger).toHaveBeenCalled();
      const output = mockLogger.mock.calls.map(call => call[0]).join('\n');
      
      expect(output).toContain('test-cli');
      expect(output).toContain('1.0.0');
      expect(output).toContain('A test CLI application');
      expect(output).toContain('Commands:');
      expect(output).toContain('test');
      expect(output).toContain('Test command');
      expect(output).toContain('another');
      expect(output).toContain('Another test command');
    });

    it('should handle empty commands map', () => {
      const options: CLIOptions = {
        name: 'empty-cli',
        version: '0.1.0'
      };

      const commands = new Map<string, Command>();

      formatter.formatGeneralHelp(options, commands);

      expect(mockLogger).toHaveBeenCalled();
      const output = mockLogger.mock.calls.map(call => call[0]).join('\n');
      
      expect(output).toContain('empty-cli');
      expect(output).toContain('0.1.0');
      expect(output).toContain('Commands:');
    });

    it('should handle no description', () => {
      const options: CLIOptions = {
        name: 'no-desc-cli',
        version: '1.0.0'
      };

      const commands = new Map<string, Command>();

      formatter.formatGeneralHelp(options, commands);

      expect(mockLogger).toHaveBeenCalled();
      const output = mockLogger.mock.calls.map(call => call[0]).join('\n');
      
      expect(output).toContain('no-desc-cli');
      expect(output).toContain('1.0.0');
      expect(output).not.toContain("undefined");
    });
  });

  describe("formatCommandHelp", () => {
    it('should format command help with usage and options', () => {
      const options: CLIOptions = {
        name: 'test-cli',
        version: '1.0.0'
      };

      class DetailedCommand extends Command {
        name = 'deploy';
        description = 'Deploy the application';
        options = [
          { 
            name: 'env', 
            type: 'string' as const, 
            description: 'Environment to deploy to',
            required: true
          },
          { 
            name: 'force', 
            type: 'boolean' as const, 
            description: 'Force deployment',
            alias: 'f'
          },
          { 
            name: 'tags', 
            type: 'array' as const, 
            description: 'Deployment tags'
          }
        ];
        arguments = [
          { name: 'service', required: true, description: 'Service to deploy' }
        ];
      }

      const command = new DetailedCommand();

      formatter.formatCommandHelp(options, command);

      expect(mockLogger).toHaveBeenCalled();
      const output = mockLogger.mock.calls.map(call => call[0]).join('\n');
      
      expect(output).toContain('deploy');
      expect(output).toContain('Deploy the application');
      expect(output).toContain('Usage:');
      expect(output).toContain('test-cli deploy');
      expect(output).toContain('<service>');
      expect(output).toContain('[options]');
      expect(output).toContain('Arguments:');
      expect(output).toContain('service');
      expect(output).toContain('Service to deploy');
      expect(output).toContain('Options:');
      expect(output).toContain('--env');
      expect(output).toContain('Environment to deploy to');
      expect(output).toContain('(required)');
      expect(output).toContain('--force, -f');
      expect(output).toContain('Force deployment');
      expect(output).toContain('--tags');
      expect(output).toContain('Deployment tags');
    });

    it('should handle command with no options or arguments', () => {
      const options: CLIOptions = {
        name: 'simple-cli',
        version: '1.0.0'
      };

      class SimpleCommand extends Command {
        name = 'simple';
        description = 'A simple command';
      }

      const command = new SimpleCommand();

      formatter.formatCommandHelp(options, command);

      expect(mockLogger).toHaveBeenCalled();
      const output = mockLogger.mock.calls.map(call => call[0]).join('\n');
      
      expect(output).toContain('simple');
      expect(output).toContain('A simple command');
      expect(output).toContain('Usage:');
      expect(output).toContain('simple-cli simple');
    });

    it('should handle options with choices', () => {
      const options: CLIOptions = {
        name: 'choice-cli',
        version: '1.0.0'
      };

      class ChoiceCommand extends Command {
        name = 'build';
        description = 'Build the project';
        options = [
          { 
            name: 'target', 
            type: 'string' as const, 
            description: 'Build target',
            choices: ["development", 'staging', "production"]
          }
        ];
      }

      const command = new ChoiceCommand();

      formatter.formatCommandHelp(options, command);

      expect(mockLogger).toHaveBeenCalled();
      const output = mockLogger.mock.calls.map(call => call[0]).join('\n');
      
      expect(output).toContain('--target');
      expect(output).toContain('Build target');
      expect(output).toContain('[choices: development, staging, production]');
    });

    it('should handle optional arguments', () => {
      const options: CLIOptions = {
        name: 'arg-cli',
        version: '1.0.0'
      };

      class ArgCommand extends Command {
        name = 'greet';
        description = 'Greet someone';
        arguments = [
          { name: 'name', required: false, description: 'Name to greet' }
        ];
      }

      const command = new ArgCommand();

      formatter.formatCommandHelp(options, command);

      expect(mockLogger).toHaveBeenCalled();
      const output = mockLogger.mock.calls.map(call => call[0]).join('\n');
      
      expect(output).toContain('[name]');
      expect(output).not.toContain('<name>');
    });
  });
});