/**
 * Shared file generation utilities for all themes
 */

import * as fs from 'fs/promises';
import { path } from '../../../infra_external-log-lib/src';

/**
 * Package.json configuration interface
 */
export interface PackageJsonConfig {
  name: string;
  version?: string;
  description?: string;
  main?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  author?: string;
  license?: string;
  type?: 'module' | 'commonjs';
  engines?: Record<string, string>;
  keywords?: string[];
  repository?: {
    type: string;
    url: string;
  };
}

/**
 * Creates a package.json file with sensible defaults
 */
export async function generatePackageJson(
  targetPath: string,
  config: PackageJsonConfig
): Promise<void> {
  const defaultConfig: PackageJsonConfig = {
    version: '1.0.0',
    description: '',
    main: 'index.js',
    scripts: {
      test: 'jest',
      build: 'tsc',
      dev: 'nodemon',
      lint: 'eslint .',
    },
    author: '',
    license: 'MIT',
    type: 'module',
  };

  const finalConfig = {
    ...defaultConfig,
    ...config,
    scripts: {
      ...defaultConfig.scripts,
      ...config.scripts,
    },
  };

  const content = JSON.stringify(finalConfig, null, 2);
  await fileAPI.createFile(targetPath, content, { type: FileType.DOCUMENT });
}

/**
 * README.md configuration
 */
export interface ReadmeConfig {
  title: string;
  description: string;
  sections?: {
    installation?: string;
    usage?: string;
    features?: string[];
    contributing?: string;
    license?: string;
  };
  badges?: Array<{
    label: string;
    message: string;
    color: string;
  }>;
}

/**
 * Generates a README.md file
 */
export async function generateReadme(
  targetPath: string, { type: FileType.TEMPORARY }): Promise<void> {
  let content = `# ${config.title}\n\n`;

  // Add badges if provided
  if(config.badges && config.badges.length > 0) {
    config.badges.forEach(badge => {
      content += `![${badge.label}](https://img.shields.io/badge/${badge.label}-${badge.message}-${badge.color})\n`;
    });
    content += '\n';
  }

  content += `${config.description}\n\n`;

  // Add sections
  if(config.sections) {
    if(config.sections.installation) {
      content += `## Installation\n\n${config.sections.installation}\n\n`;
    }

    if(config.sections.usage) {
      content += `## Usage\n\n${config.sections.usage}\n\n`;
    }

    if(config.sections.features && config.sections.features.length > 0) {
      content += `## Features\n\n`;
      config.sections.features.forEach(feature => {
        content += `- ${feature}\n`;
      });
      content += '\n';
    }

    if(config.sections.contributing) {
      content += `## Contributing\n\n${config.sections.contributing}\n\n`;
    }

    if(config.sections.license) {
      content += `## License\n\n${config.sections.license}\n`;
    }
  }

  await fileAPI.createFile(targetPath, content, { type: FileType.DOCUMENT });
}

/**
 * Environment file configuration
 */
export interface EnvConfig {
  [key: string]: string | number | boolean;
}

/**
 * Generates a .env file
 */
export async function generateEnvFile(
  targetPath: string, { type: FileType.TEMPORARY }): Promise<void> {
  let content = '';

  if(includeComments) {
    content += '# Environment Configuration\n';
    content += `# Generated on ${new Date().toISOString()}\n\n`;
  }

  Object.entries(config).forEach(([key, value]) => {
    content += `${key}=${value}\n`;
  });

  await fileAPI.createFile(targetPath, content, { type: FileType.DOCUMENT });
}

/**
 * TypeScript configuration
 */
export interface TsConfigOptions {
  extends?: string;
  compilerOptions?: Record<string, { type: FileType.TEMPORARY }): Promise<void> {
  const defaultConfig = {
    compilerOptions: {
      target: 'ES2020',
      module: 'commonjs',
      lib: ['ES2020'],
      outDir: './dist',
      rootDir: './src',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
      declaration: true,
      declarationMap: true,
      sourceMap: true,
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist', '**/*.test.ts'],
  };

  const finalConfig = {
    ...defaultConfig,
    ...options,
    compilerOptions: {
      ...defaultConfig.compilerOptions,
      ...options.compilerOptions,
    },
  };

  const content = JSON.stringify(finalConfig, null, 2);
  await fileAPI.createFile(targetPath, content, { type: FileType.DOCUMENT });
}

/**
 * Creates a directory structure from a template
 */
export async function createDirectoryStructure(
  basePath: string, { type: FileType.TEMPORARY }): Promise<void> {
  for(const dir of structure) {
    const fullPath = path.join(basePath, dir);
    await fileAPI.createDirectory(fullPath);
  }
}

/**
 * Gitignore template
 */
export const GITIGNORE_TEMPLATE = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
*.tsbuildinfo

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.local
.env.*.local

# Testing
coverage/
.nyc_output/

# Logs
logs/
*.log

# Temporary files
tmp/
temp/
`;

/**
 * Generates a .gitignore file
 */
export async function generateGitignore(
  targetPath: string,
  additionalPatterns: string[] = []
): Promise<void> {
  let content = GITIGNORE_TEMPLATE;
  
  if (additionalPatterns.length > 0) {
    content += '\n# Project specific\n';
    additionalPatterns.forEach(pattern => {
      content += `${pattern}\n`;
    });
  }

  await fileAPI.createFile(targetPath, content, { type: FileType.DOCUMENT });
}