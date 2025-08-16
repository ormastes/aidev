import { describe, it, expect } from '@jest/globals';
import { ArgumentParser } from '../../src/application/parser';
import { OptionsSchema, ValidationError } from '../../src/domain/types';

describe("ArgumentParser", () => {
  const parser = new ArgumentParser();

  describe('basic parsing', () => {
    it('should parse command and options', () => {
      const args = ['deploy', '--env', "production", '--force'];
      const result = parser.parse(args);

      expect(result.command).toEqual(['deploy']);
      expect(result.options['env']).toEqual("production");
      expect(result.options['force']).toEqual(true);
      expect(result.positionals).toEqual([]);
    });

    it('should parse multiple commands', () => {
      const args = ['db', 'migrate', '--dry-run'];
      const result = parser.parse(args);

      expect(result.command).toEqual(['db', 'migrate']);
      expect(result.options).toEqual({ 'dry-run': true });
    });

    it('should parse positional arguments', () => {
      const args = ['copy', 'file1.txt', 'file2.txt', '--verbose'];
      const result = parser.parse(args);

      expect(result.command).toEqual(['copy', 'file1.txt', 'file2.txt']);
      expect(result.positionals).toEqual([]);
      expect(result.options).toEqual({ verbose: true });
    });

    it('should handle -- separator', () => {
      const args = ['run', '--option', 'value', '--', '--not-an-option'];
      const result = parser.parse(args);

      expect(result.options['option']).toEqual('value');
      expect(result.positionals).toEqual(['--not-an-option']);
    });
  });

  describe('option parsing', () => {
    it('should parse long options with equals', () => {
      const args = ['test', '--name=John', '--age=30'];
      const result = parser.parse(args);

      expect(result.options).toEqual({ name: 'John', age: '30' });
    });

    it('should parse short options', () => {
      const args = ['test', '-v', '-f', 'file.txt'];
      const result = parser.parse(args);

      expect(result.options).toEqual({ v: true, f: true });
      expect(result.positionals).toEqual(['file.txt']);
    });

    it('should parse combined short options', () => {
      const args = ['test', '-vfd'];
      const result = parser.parse(args);

      expect(result.options).toEqual({ v: true, f: true, d: true });
    });
  });

  describe('schema validation', () => {
    const schema: OptionsSchema = {
      env: {
        type: 'string',
        description: "Environment",
        choices: ['dev', 'staging', "production"],
        required: true
      },
      port: {
        type: 'number',
        description: 'Port number',
        default: 3000
      },
      verbose: {
        type: 'boolean',
        alias: 'v',
        description: 'Verbose output',
        default: false
      },
      tags: {
        type: 'array',
        description: 'Tags',
        default: []
      }
    };

    it('should validate required options', () => {
      const args = ['deploy'];
      
      expect(() => parser.parse(args, schema)).toThrow(ValidationError);
    });

    it('should validate option types', () => {
      const args = ['deploy', '--env', "production", '--port', 'invalid'];
      const result = parser.parse(args, schema);

      expect(result.options['port']).toBeUndefined();
    });

    it('should validate choices', () => {
      const args = ['deploy', '--env', 'invalid'];
      
      expect(() => parser.parse(args, schema)).toThrow(ValidationError);
    });

    it('should apply defaults', () => {
      const args = ['deploy', '--env', "production"];
      const result = parser.parse(args, schema);

      expect(result.options).toMatchObject({
        env: "production",
        port: 3000,
        verbose: false,
        tags: []
      });
    });

    it('should handle aliases', () => {
      const args = ['deploy', '--env', "production", '-v'];
      const result = parser.parse(args, schema);

      expect(result.options['verbose']).toBe(true);
    });

    it('should parse arrays', () => {
      const args = ['deploy', '--env', "production", '--tags', 'web', 'api', 'v2'];
      const result = parser.parse(args, schema);

      expect(result.options['tags']).toEqual(['web', 'api', 'v2']);
    });
  });

  describe('custom validation', () => {
    it('should run custom validators', () => {
      const schema: OptionsSchema = {
        age: {
          type: 'number',
          description: 'Age',
          validate: (value) => {
            const age = value as number;
            return age >= 18 || 'Must be 18 or older';
          }
        }
      };

      const args1 = ['test', '--age', '25'];
      const result1 = parser.parse(args1, schema);
      expect(result1.options['age']).toBe(25);

      const args2 = ['test', '--age', '15'];
      expect(() => parser.parse(args2, schema)).toThrow(ValidationError);
    });

    it('should apply coercion', () => {
      const schema: OptionsSchema = {
        names: {
          type: 'array',
          description: 'Names',
          coerce: (value) => {
            const arr = value as string[];
            return arr.map(name => name.toUpperCase());
          }
        }
      };

      const args = ['test', '--names', 'alice', 'bob'];
      const result = parser.parse(args, schema);

      expect(result.options['names']).toEqual(['ALICE', 'BOB']);
    });
  });
});