#!/usr/bin/env bun

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';

interface TestConfig {
  language: string;
  pattern: string[];
  runner: string;
  args: string[];
  env?: Record<string, string>;
}

const testConfigs: TestConfig[] = [
  // TypeScript/JavaScript tests with Bun
  {
    language: 'typescript',
    pattern: ['**/*.test.ts', '**/*.spec.ts', '**/*.test.js', '**/*.spec.js'],
    runner: 'bun',
    args: ['test'],
    env: {
      NODE_ENV: 'test'
    }
  },
  // External tests
  {
    language: 'external',
    pattern: ['**/*.etest.ts'],
    runner: 'bun',
    args: ['test'],
    env: {
      NODE_ENV: 'external-test'
    }
  },
  // Python tests
  {
    language: 'python',
    pattern: ['**/*_test.py', '**/test_*.py'],
    runner: 'python',
    args: ['-m', 'pytest'],
    env: {
      PYTHONPATH: process.cwd()
    }
  },
  // Cucumber/BDD tests
  {
    language: 'cucumber',
    pattern: ['**/features/**/*.feature'],
    runner: 'bun',
    args: ['run', 'scripts/bun-cucumber-runner.ts'],
    env: {
      NODE_ENV: 'test'
    }
  }
];

async function findTests(pattern: string[]): Promise<string[]> {
  const files: string[] = [];
  
  for (const p of pattern) {
    const matches = await glob(p, {
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**', '**/temp/**'],
      cwd: process.cwd()
    });
    files.push(...matches);
  }
  
  return files;
}

async function runTests(config: TestConfig, files: string[]): Promise<boolean> {
  if (files.length === 0) {
    console.log(`No ${config.language} tests found`);
    return true;
  }

  console.log(`\n🧪 Running ${config.language} tests (${files.length} files)...`);
  console.log(`Command: ${config.runner} ${config.args.join(' ')}`);
  
  return new Promise((resolve) => {
    const child = spawn(config.runner, [...config.args, ...files], {
      stdio: 'inherit',
      env: { ...process.env, ...config.env },
      cwd: process.cwd()
    });

    child.on('exit', (code) => {
      resolve(code === 0);
    });

    child.on('error', (err) => {
      console.error(`Failed to run ${config.language} tests:`, err);
      resolve(false);
    });
  });
}

async function runAllTests(filter?: string) {
  console.log('🚀 AI Development Platform - Unified Test Runner');
  console.log('Using Bun as primary test runner\n');
  
  const results: Record<string, boolean> = {};
  
  for (const config of testConfigs) {
    if (filter && !config.language.includes(filter)) {
      continue;
    }
    
    const files = await findTests(config.pattern);
    const success = await runTests(config, files);
    results[config.language] = success;
  }
  
  // Summary
  console.log('\n📊 Test Results Summary:');
  let allPassed = true;
  
  for (const [lang, passed] of Object.entries(results)) {
    const status = passed ? '✅' : '❌';
    console.log(`  ${status} ${lang}: ${passed ? 'PASSED' : 'FAILED'}`);
    if (!passed) allPassed = false;
  }
  
  if (!allPassed) {
    process.exit(1);
  }
  
  console.log('\n✨ All tests passed!');
}

// Parse command line arguments
const args = process.argv.slice(2);
const filter = args[0];

runAllTests(filter).catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});