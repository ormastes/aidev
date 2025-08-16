import { Command, CLI } from '../src/index.js';

/**
 * Example: Simple hello command
 */
class HelloCommand extends Command {
  name = 'hello';
  description = 'Greet someone';
  
  options = {
    name: {
      type: 'string' as const,
      alias: 'n',
      description: 'Name to greet',
      default: 'World'
    },
    times: {
      type: 'number' as const,
      alias: 't',
      description: 'Number of times to greet',
      default: 1,
      validate: (value: unknown) => {
        const num = value as number;
        return num > 0 || 'Times must be positive';
      }
    },
    shout: {
      type: 'boolean' as const,
      alias: 's',
      description: 'Shout the greeting',
      default: false
    }
  };
  
  examples = [
    {
      description: 'Basic greeting',
      command: 'hello --name Alice'
    },
    {
      description: 'Multiple greetings',
      command: 'hello -n Bob -t 3'
    },
    {
      description: 'Loud greeting',
      command: 'hello --shout'
    }
  ];

  async execute(options: { name: string; times: number; shout: boolean }) {
    const greeting = `Hello, ${options.name}!`;
    const message = options.shout ? greeting.toUpperCase() : greeting;
    
    for (let i = 0; i < options.times; i++) {
      this.log(message);
    }
  }
}

// Create and run CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new CLI({
    name: 'example',
    version: '1.0.0',
    description: 'Example CLI application'
  });

  cli.register(new HelloCommand().getDefinition());
  
  cli.run(process.argv.slice(2)).catch(error => {
    console.error(error);
    process.exit(1);
  });
}