import { Plugin, CLI, Command, CommandContext } from '../src/index.js';
import * as fs from 'fs/promises';
import { path } from '../../../../../../themes/infra_external-log-lib/dist';

/**
 * Example: Config management plugin
 * 
 * Adds config commands to any CLI application
 */
export const configPlugin: Plugin = {
  name: 'config-plugin',
  version: '1.0.0',
  
  async register(cli) {
    // Add config command with subcommands
    cli.register(new ConfigCommand().getDefinition());
    
    // Add hooks for config loading
    cli.addHook('precommand', async (context) => {
      // Load config before each command
      const config = await loadConfig();
      Object.assign(context.context.env, {
        APP_CONFIG: JSON.stringify(config)
      });
    });
  }
};

class ConfigCommand extends Command {
  name = 'config';
  description = 'Manage application configuration';
  
  subcommands = [
    new ConfigGetCommand(),
    new ConfigSetCommand(),
    new ConfigListCommand(),
    new ConfigResetCommand()
  ];
  
  async execute() {
    this.warn('Please specify a subcommand. Use --help for available commands.');
  }
}

class ConfigGetCommand extends Command {
  name = 'get';
  description = 'Get a configuration value';
  
  options = {
    key: {
      type: 'string' as const,
      alias: 'k',
      description: 'Configuration key',
      required: true
    }
  };
  
  async execute(options: { key: string }, context: CommandContext) {
    const config = await loadConfig();
    const value = getNestedValue(config, options.key);
    
    if (value === undefined) {
      this.error(`Configuration key '${options.key}' not found`);
      process.exit(1);
    }
    
    this.log(JSON.stringify(value, null, 2));
  }
}

class ConfigSetCommand extends Command {
  name = 'set';
  description = 'Set a configuration value';
  
  options = {
    key: {
      type: 'string' as const,
      alias: 'k',
      description: 'Configuration key',
      required: true
    },
    value: {
      type: 'string' as const,
      alias: 'v',
      description: 'Configuration value',
      required: true
    },
    type: {
      type: 'string' as const,
      alias: 't',
      description: 'Value type',
      choices: ['string', 'number', 'boolean', 'json'],
      default: 'string'
    }
  };
  
  async execute(options: { key: string; value: string; type: string }) {
    const config = await loadConfig();
    
    // Parse value based on type
    let parsedValue: any = options.value;
    switch (options.type) {
      case 'number':
        parsedValue = Number(options.value);
        if (isNaN(parsedValue)) {
          this.error('Invalid number value');
          process.exit(1);
        }
        break;
      case 'boolean':
        parsedValue = options.value === 'true';
        break;
      case 'json':
        try {
          parsedValue = JSON.parse(options.value);
        } catch (e) {
          this.error('Invalid JSON value');
          process.exit(1);
        }
        break;
    }
    
    setNestedValue(config, options.key, parsedValue);
    await saveConfig(config);
    
    this.success(`Set ${options.key} = ${JSON.stringify(parsedValue)}`);
  }
}

class ConfigListCommand extends Command {
  name = 'list';
  description = 'List all configuration values';
  aliases = ['ls'];
  
  options = {
    format: {
      type: 'string' as const,
      alias: 'f',
      description: 'Output format',
      choices: ['json', 'table', 'env'],
      default: 'table'
    }
  };
  
  async execute(options: { format: string }) {
    const config = await loadConfig();
    
    switch (options.format) {
      case 'json':
        this.log(JSON.stringify(config, null, 2));
        break;
        
      case 'env':
        const envVars = flattenConfig(config);
        for (const [key, value] of Object.entries(envVars)) {
          this.log(`${key}=${value}`);
        }
        break;
        
      case 'table':
      default:
        const flattened = flattenConfig(config);
        const data = Object.entries(flattened).map(([key, value]) => ({
          Key: key,
          Value: String(value),
          Type: typeof value
        }));
        this.table(data);
        break;
    }
  }
}

class ConfigResetCommand extends Command {
  name = 'reset';
  description = 'Reset configuration to defaults';
  
  options = {
    force: {
      type: 'boolean' as const,
      alias: 'f',
      description: 'Skip confirmation',
      default: false
    }
  };
  
  async execute(options: { force: boolean }) {
    if (!options.force) {
      this.warn('This will reset all configuration to defaults.');
      this.warn('Use --force to skip this confirmation.');
      process.exit(1);
    }
    
    await saveConfig(getDefaultConfig());
    this.success('Configuration reset to defaults');
  }
}

// Helper functions
async function getConfigPath(): Promise<string> {
  const configDir = path.join(process.env.HOME || '.', '.myapp');
  await fileAPI.createDirectory(configDir);
  return path.join(configDir, 'config.json');
}

async function loadConfig(): Promise<Record<string, any>> {
  try {
    const configPath = await getConfigPath();
    const content = await fs.readFile(configPath, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    return getDefaultConfig();
  }
}

async function saveConfig(config: Record<string, any>): Promise<void> {
  const configPath = await getConfigPath();
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

async function getDefaultConfig(): Record<string, any> {
  return {
    api: {
      endpoint: 'https://api.example.com',
      timeout: 30000,
      retries: 3
    },
    ui: {
      theme: 'dark',
      language: 'en'
    },
    features: {
      analytics: true,
      telemetry: false
    }
  };
}

async function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

async function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
}

async function flattenConfig(obj: any, prefix = ''): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenConfig(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  
  return result;
}

// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new CLI({
    name: 'myapp',
    version: '1.0.0',
    description: 'My application with config management',
    plugins: [configPlugin]
  });
  
  // Add other commands
  cli.register({
    metadata: { name: 'serve', description: 'Start the server' },
    execute: async (_, context) => {
      const config = JSON.parse(context.env.APP_CONFIG || '{}');
      console.log('Starting server with config:', config);
    }
  });
  
  cli.run(process.argv.slice(2)).catch(error => {
    console.error(error);
    process.exit(1);
  });
}