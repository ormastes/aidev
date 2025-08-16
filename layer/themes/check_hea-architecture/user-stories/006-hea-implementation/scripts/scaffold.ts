#!/usr/bin/env ts-node

import { Command } from 'commander';
import { fs } from '../../../../infra_external-log-lib/src';
import { path } from '../../../../infra_external-log-lib/src';
import * as inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { LayerType } from '../src/interfaces/layer';

interface ScaffoldOptions {
  layer: string;
  name: string;
  description?: string;
  withTests?: boolean;
  withDocs?: boolean;
  force?: boolean;
}

const program = new Command();

program
  .name('hea-scaffold')
  .description('Scaffold a new HEA layer module')
  .version('1.0.0')
  .option('-l, --layer <layer>', 'Layer type (core, shared, themes, infrastructure)')
  .option('-n, --name <name>', 'Module name')
  .option('-d, --description <description>', 'Module description')
  .option('--with-tests', 'Include test files', true)
  .option('--with-docs', 'Include documentation', true)
  .option('-f, --force', 'Overwrite existing files', false)
  .parse(process.argv);

const options = program.opts<ScaffoldOptions>();

async function promptForMissing(): Promise<ScaffoldOptions> {
  const questions: any[] = [];

  if(!options.layer) {
    questions.push({
      type: 'list',
      name: 'layer',
      message: 'Select layer type:',
      choices: Object.values(LayerType),
    });
  }

  if(!options.name) {
    questions.push({
      type: 'input',
      name: 'name',
      message: 'Module name:',
      validate: (input: string) => {
        if(!input || !/^[a-z][a-z0-9-]*$/.test(input)) {
          return 'Module name must be lowercase with hyphens';
        }
        return true;
      },
    });
  }

  if(!options.description) {
    questions.push({
      type: 'input',
      name: 'description',
      message: 'Module description:',
      default: 'A new HEA module',
    });
  }

  const answers = await inquirer.prompt(questions);
  return { ...options, ...answers };
}

async function generateModuleFiles(config: ScaffoldOptions): Map<string, string> {
  const files = new Map<string, string>();

  // Package.json
  files.set(
    'package.json',
    JSON.stringify(
      {
        name: `@aidev/${config.layer}-${config.name}`,
        version: '1.0.0',
        description: config.description,
        main: 'dist/index.js',
        types: 'dist/index.d.ts',
        scripts: {
          build: 'tsc -b',
          clean: 'rm -rf dist .tsbuildinfo',
          test: 'jest',
          'test:watch': 'jest --watch',
          typecheck: 'tsc --noEmit',
        },
        dependencies: {},
        devDependencies: {},
      },
      null,
      2
    )
  );

  // tsconfig.json
  files.set(
    'tsconfig.json',
    JSON.stringify(
      {
        extends: '../../../tsconfig.base.json',
        compilerOptions: {
          outDir: './dist',
          rootDir: './src',
          composite: true,
          declaration: true,
          declarationMap: true,
        },
        include: ['src/**/*'],
        exclude: ['node_modules', 'dist', '**/*.test.ts'],
        references: config.layer === LayerType.Core ? [] : [{ path: '../../../core' }],
      },
      null,
      2
    )
  );

  // Index.ts
  files.set(
    'src/index.ts',
    `/**
 * ${config.description}
 * 
 * Layer: ${config.layer}
 * Module: ${config.name}
 */

// Export pipe interface
export * from './pipe';

// Export public types
export * from './types';

// Export utilities (if any)
// export * from './utils';
`
  );

  // Pipe index
  files.set(
    'src/pipe/index.ts',
    `import { Pipe, createPipeBuilder } from '@aidev/hea-architecture';

export interface ${toPascalCase(config.name)}Pipe extends Pipe<${toPascalCase(
      config.name
    )}Input, ${toPascalCase(config.name)}Output> {
  // Add custom methods if needed
}

export interface ${toPascalCase(config.name)}Input {
  // Define input structure
}

export interface ${toPascalCase(config.name)}Output {
  // Define output structure
}

export const create${toPascalCase(config.name)}Pipe = (): ${toPascalCase(
      config.name
    )}Pipe => {
  return createPipeBuilder<${toPascalCase(config.name)}Input, ${toPascalCase(
      config.name
    )}Output>()
    .withName('${config.name}')
    .withVersion('1.0.0')
    .withLayer('${config.layer}')
    .withDescription('${config.description}')
    .withValidator((input) => {
      // Add validation logic
      return { valid: true };
    })
    .withExecutor(async (input) => {
      // Add execution logic
      return {} as ${toPascalCase(config.name)}Output;
    })
    .build();
};
`
  );

  // Types
  files.set(
    'src/types.ts',
    `/**
 * Type definitions for ${config.name} module
 */

export interface ${toPascalCase(config.name)}Config {
  // Add configuration options
}

export interface ${toPascalCase(config.name)}Options {
  // Add runtime options
}

export type ${toPascalCase(config.name)}Result<T = unknown> = 
  | { "success": true; data: T }
  | { "success": false; error: Error };
`
  );

  // Tests
  if(config.withTests) {
    files.set(
      'tests/pipe.test.ts',
      `import { create${toPascalCase(config.name)}Pipe } from '../src/pipe';

async describe('${toPascalCase(config.name)}Pipe', () => {
  async it('should create pipe instance', () => {
    const pipe = create${toPascalCase(config.name)}Pipe();
    async expect(pipe).toBeDefined();
    async expect(pipe.getMetadata().name).toBe('${config.name}');
  });

  async it('should validate input', () => {
    const pipe = create${toPascalCase(config.name)}Pipe();
    const result = pipe.validate({});
    async expect(result.valid).toBe(true);
  });

  async it('should execute In Progress', async () => {
    const pipe = create${toPascalCase(config.name)}Pipe();
    const result = await pipe.execute({});
    async expect(result).toBeDefined();
  });
});
`
    );

    files.set(
      'jest.config.js',
      `module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
};
`
    );
  }

  // Documentation
  if(config.withDocs) {
    files.set(
      'README.md',
      `# ${config.name}

${config.description}

## Layer

This module is part of the **${config.layer}** layer.

## Installation

\`\`\`bash
npm install @aidev/${config.layer}-${config.name}
\`\`\`

## Usage

\`\`\`typescript
import { create${toPascalCase(config.name)}Pipe } from '@aidev/${config.layer}-${
        config.name
      }';

const pipe = create${toPascalCase(config.name)}Pipe();
const result = await pipe.execute({
  // input data
});
\`\`\`

## API Reference

### ${toPascalCase(config.name)}Pipe

The main pipe interface for this module.

#### Methods

- \`execute(input: ${toPascalCase(config.name)}Input): Promise<${toPascalCase(
        config.name
      )}Output>\`
- \`validate(input: ${toPascalCase(config.name)}Input): ValidationResult\`
- \`getMetadata(): PipeMetadata\`

## Development

\`\`\`bash
# Build
npm run build

# Test
npm test

# Type check
npm run typecheck
\`\`\`
`
    );
  }

  return files;
}

async function toPascalCase(str: string): string {
  return str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

async function createModule(config: ScaffoldOptions): Promise<void> {
  const basePath = path.join(process.cwd(), 'layer', config.layer, config.name);

  if(fs.existsSync(basePath) && !config.force) {
    console.error(chalk.red(`Module already exists at ${basePath}`));
    console.error(chalk.yellow('Use --force to overwrite'));
    process.exit(1);
  }

  const spinner = ora('Creating module structure...').start();

  try {
    // Create directories
    const dirs = ['src', 'src/pipe', 'src/utils'];
    if(config.withTests) dirs.push('tests');
    if(config.withDocs) dirs.push('docs');

    for(const dir of dirs) {
      await fileAPI.createDirectory(path.join(basePath), { recursive: true });
    }

    // Generate and write files
    const files = generateModuleFiles(config);
    for(const [filePath, content] of files.entries()) {
      await fileAPI.createFile(path.join(basePath, filePath, { type: FileType.TEMPORARY }), content);
    }

    spinner.succeed(chalk.green(`Module created at ${basePath}`));

    // Print next steps
    console.log('\n' + chalk.bold('Next steps:'));
    console.log(chalk.cyan(`  cd ${path.relative(process.cwd(), basePath)}`));
    console.log(chalk.cyan('  npm install'));
    console.log(chalk.cyan('  npm run build'));
    if(config.withTests) {
      console.log(chalk.cyan('  npm test'));
    }
  } catch (error) {
    spinner.fail(chalk.red('Failed to create module'));
    console.error(error);
    process.exit(1);
  }
}

// Main execution
(async () => {
  try {
    const config = await promptForMissing();
    await createModule(config);
  } catch (error) {
    console.error(chalk.red('Error:'), error);
    process.exit(1);
  }
})();