import { 
  OptionsSchema, 
  ParsedArguments, 
  ValidationError,
  ValidationIssue,
  OptionDefinition
} from '../domain/types.js';

export class ArgumentParser {
  /**
   * Parse command line arguments
   */
  parse<T extends OptionsSchema>(
    args: string[],
    schema?: T
  ): ParsedArguments {
    const command: string[] = [];
    const options: Record<string, unknown> = {};
    const positionals: string[] = [];
    const raw = [...args];

    // Extract command parts until we hit an option
    let i = 0;
    while (i < args.length && !args[i]!.startsWith('-')) {
      command.push(args[i]!);
      i++;
    }

    // Parse options
    while (i < args.length) {
      const arg = args[i]!;
      
      if (arg === '--') {
        // Everything after -- is positional
        i++;
        while (i < args.length) {
          positionals.push(args[i]!);
          i++;
        }
        break;
      }

      if (arg.startsWith('--')) {
        // Long option
        const [name, value] = this.parseLongOption(arg);
        const optionDef = schema?.[name];
        
        if (optionDef) {
          options[name] = this.parseOptionValue(optionDef, value, args, i);
          if (value === undefined && optionDef.type !== 'boolean' && i + 1 < args.length && !args[i + 1]!.startsWith('-')) {
            i++; // Skip the consumed value
          }
        } else {
          // Without schema, try to determine if next arg is a value
          if (value !== undefined) {
            options[name] = value;
          } else if (i + 1 < args.length && !args[i + 1]!.startsWith('-')) {
            // Next arg looks like a value, not a flag
            options[name] = args[i + 1];
            i++; // Skip the consumed value
          } else {
            // No value, treat as boolean flag
            options[name] = true;
          }
        }
      } else if (arg.startsWith('-') && arg.length > 1) {
        // Short option(s)
        const shortOptions = this.parseShortOptions(arg, schema);
        for (const [name, optionDef] of shortOptions) {
          if (optionDef) {
            const value = this.parseOptionValue(optionDef, undefined, args, i);
            options[name] = value;
            if (optionDef.type !== 'boolean' && i + 1 < args.length && !args[i + 1]!.startsWith('-')) {
              i++; // Skip the consumed value
            }
          } else {
            options[name] = true;
          }
        }
      } else {
        // Positional argument
        positionals.push(arg);
      }
      
      i++;
    }

    // Apply defaults and validate
    if (schema) {
      this.applyDefaults(options, schema);
      this.validate(options, schema);
    }

    return { command, options, positionals, raw };
  }

  private parseLongOption(arg: string): [string, string | undefined] {
    const equalIndex = arg.indexOf('=');
    if (equalIndex !== -1) {
      return [
        arg.slice(2, equalIndex),
        arg.slice(equalIndex + 1)
      ];
    }
    return [arg.slice(2), undefined];
  }

  private parseShortOptions(
    arg: string, 
    schema?: OptionsSchema
  ): Array<[string, OptionDefinition | undefined]> {
    const results: Array<[string, OptionDefinition | undefined]> = [];
    const flags = arg.slice(1);
    
    for (let i = 0; i < flags.length; i++) {
      const flag = flags[i]!;
      // Find the long name for this alias
      const entry = schema ? Object.entries(schema).find(
        ([_, def]) => def.alias === flag
      ) : undefined;
      
      if (entry) {
        results.push([entry[0], entry[1]]);
      } else {
        results.push([flag, undefined]);
      }
    }
    
    return results;
  }

  private parseOptionValue(
    def: OptionDefinition,
    explicitValue: string | undefined,
    args: string[],
    currentIndex: number
  ): unknown {
    const nextArg = args[currentIndex + 1];
    
    switch (def.type) {
      case 'boolean':
        // For booleans, presence means true, unless explicitly set to false
        if (explicitValue !== undefined) {
          return explicitValue === 'true' || explicitValue === '1';
        }
        return true;
        
      case 'number':
        const numValue = explicitValue ?? nextArg;
        if (numValue === undefined) {
          return undefined;
        }
        const parsed = Number(numValue);
        return isNaN(parsed) ? undefined : parsed;
        
      case 'string':
        return explicitValue ?? nextArg;
        
      case 'array':
        // Arrays can be comma-separated or space-separated
        if (explicitValue?.includes(',')) {
          return explicitValue.split(',');
        }
        // Collect multiple values
        const values: string[] = [];
        if (explicitValue !== undefined) {
          values.push(explicitValue);
        }
        let j = currentIndex + 1;
        while (j < args.length && !args[j]!.startsWith('-')) {
          values.push(args[j]!);
          j++;
        }
        return values;
        
      case 'count':
        // Count options increment each time they appear
        return 1; // Parser will handle accumulation
        
      default:
        return explicitValue ?? nextArg;
    }
  }

  private applyDefaults(
    options: Record<string, unknown>,
    schema: OptionsSchema
  ): void {
    for (const [name, def] of Object.entries(schema)) {
      if (!(name in options) && 'default' in def) {
        options[name] = def.default;
      }
    }
  }

  private validate(
    options: Record<string, unknown>,
    schema: OptionsSchema
  ): void {
    const errors: ValidationIssue[] = [];
    
    for (const [name, def] of Object.entries(schema)) {
      const value = options[name];
      
      // Check required
      if (def.required && (value === undefined || value === null)) {
        errors.push({
          field: name,
          message: `Option --${name} is required`,
          value
        });
        continue;
      }
      
      // Skip validation if not provided and not required
      if (value === undefined || value === null) {
        continue;
      }
      
      // Type validation
      if (!this.validateType(value, def.type)) {
        errors.push({
          field: name,
          message: `Option --${name} must be of type ${def.type}`,
          value
        });
        continue;
      }
      
      // Choices validation
      if (def.choices && !def.choices.includes(value as string)) {
        errors.push({
          field: name,
          message: `Option --${name} must be one of: ${def.choices.join(', ')}`,
          value
        });
        continue;
      }
      
      // Custom validation
      if (def.validate) {
        const result = def.validate(value);
        if (result !== true) {
          errors.push({
            field: name,
            message: typeof result === 'string' ? result : `Option --${name} is invalid`,
            value
          });
        }
      }
      
      // Apply coercion
      if (def.coerce) {
        options[name] = def.coerce(value);
      }
    }
    
    if (errors.length > 0) {
      throw new ValidationError(errors);
    }
  }

  private validateType(value: unknown, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'count':
        return typeof value === 'number';
      default:
        return true;
    }
  }
}