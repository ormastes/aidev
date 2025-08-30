#!/usr/bin/env bun

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';

const projectRoot = path.resolve(__dirname, '..');

interface TestResult {
  suite: string;
  passed: boolean;
  duration: number;
  coverage?: {
    lines: number;
    branches: number;
    functions: number;
    statements: number;
  };
}

const results: TestResult[] = [];

async function runBunTests(pattern: string, name: string): Promise<boolean> {
  console.log(`\n🧪 Running ${name} tests...`);
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    const child = spawn('bun', ['test', pattern, '--coverage'], {
      cwd: projectRoot,
      stdio: 'inherit'
    });
    
    child.on('exit', (code) => {
      const duration = Date.now() - startTime;
      const passed = code === 0;
      results.push({ suite: name, passed, duration });
      resolve(passed);
    });
  });
}

async function runStoryReporterTests(): Promise<boolean> {
  console.log('\n📊 Running Story Reporter tests...');
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    const child = spawn('bun', ['test'], {
      cwd: path.join(projectRoot, 'layer/themes/infra_story-reporter'),
      stdio: 'inherit'
    });
    
    child.on('exit', (code) => {
      const duration = Date.now() - startTime;
      const passed = code === 0;
      results.push({ suite: 'Story Reporter', passed, duration });
      resolve(passed);
    });
  });
}

async function runAllTests() {
  console.log('🚀 AI Development Platform - Unified Test Runner');
  console.log('=' .repeat(50));
  
  // Run different test suites
  const suites = [
    { pattern: '**/*.test.ts', name: 'Unit Tests (TypeScript)' },
    { pattern: '**/*.spec.ts', name: 'Spec Tests' },
    { pattern: '**/*.etest.ts', name: 'External Tests' }
  ];
  
  let allPassed = true;
  
  // Run general tests
  for (const suite of suites) {
    const files = await glob(suite.pattern, {
      cwd: projectRoot,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
    });
    
    if (files.length > 0) {
      const passed = await runBunTests(suite.pattern, suite.name);
      if (!passed) allPassed = false;
    } else {
      console.log(`⏭️  No ${suite.name} found`);
    }
  }
  
  // Run Story Reporter tests specifically
  const storyReporterPassed = await runStoryReporterTests();
  if (!storyReporterPassed) allPassed = false;
  
  // Print summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 Test Results Summary');
  console.log('=' .repeat(50));
  
  for (const result of results) {
    const status = result.passed ? '✅' : '❌';
    const time = (result.duration / 1000).toFixed(2);
    console.log(`${status} ${result.suite}: ${result.passed ? 'PASSED' : 'FAILED'} (${time}s)`);
  }
  
  if (!allPassed) {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  } else {
    console.log('\n✨ All tests passed!');
  }
}

runAllTests().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});