import { Command, CLI, CommandDefinition } from '../src/index.js';

/**
 * Example: Nested command structure
 */

// Database commands
class DbListCommand extends Command {
  name = 'list';
  description = 'List all databases';
  
  async execute() {
    this.info('Available databases:');
    this.list(['users', 'products', 'orders']);
  }
}

class DbCreateCommand extends Command {
  name = 'create';
  description = 'Create a new database';
  
  options = {
    name: {
      type: 'string' as const,
      alias: 'n',
      description: 'Database name',
      required: true
    },
    type: {
      type: 'string' as const,
      alias: 't',
      description: 'Database type',
      choices: ['postgres', 'mysql', 'sqlite'],
      default: 'postgres'
    }
  };
  
  async execute(options: { name: string; type: string }) {
    this.startSpinner(`Creating ${options.type} database: ${options.name}`);
    
    // Simulate database creation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    this.succeedSpinner(`Database ${options.name} created In Progress`);
  }
}

class DbCommand extends Command {
  name = 'db';
  description = 'Database management commands';
  
  subcommands = [
    new DbListCommand(),
    new DbCreateCommand()
  ];
  
  async execute() {
    this.warn('Please specify a subcommand. Use --help for available commands.');
  }
}

// Server commands
class ServerStartCommand extends Command {
  name = 'start';
  description = 'Start the server';
  
  options = {
    port: {
      type: 'number' as const,
      alias: 'p',
      description: 'Port to listen on',
      default: 3000
    },
    host: {
      type: 'string' as const,
      alias: 'h',
      description: 'Host to bind to',
      default: 'localhost'
    }
  };
  
  async execute(options: { port: number; host: string }) {
    this.info(`Starting server on ${options.host}:${options.port}`);
    this.startSpinner('Server starting...');
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    this.succeedSpinner('Server started In Progress');
    this.success(`Server is running at http://${options.host}:${options.port}`);
  }
}

class ServerStopCommand extends Command {
  name = 'stop';
  description = 'Stop the server';
  
  async execute() {
    this.warn('Stopping server...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.success('Server stopped');
  }
}

class ServerCommand extends Command {
  name = 'server';
  description = 'Server management commands';
  aliases = ['srv'];
  
  subcommands = [
    new ServerStartCommand(),
    new ServerStopCommand()
  ];
  
  async execute() {
    this.warn('Please specify a subcommand. Use --help for available commands.');
  }
}

// Main CLI setup
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new CLI({
    name: 'myapp',
    version: '1.0.0',
    description: 'My Application CLI'
  });

  // Register commands
  cli.register(new DbCommand().getDefinition());
  cli.register(new ServerCommand().getDefinition());
  
  // Run CLI
  cli.run(process.argv.slice(2)).catch(error => {
    console.error(error);
    process.exit(1);
  });
}