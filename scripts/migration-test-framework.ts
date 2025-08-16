#!/usr/bin/env bun
/**
 * Migration Testing Framework
 * Validates that migrated scripts produce equivalent output to original shell scripts
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, basename } from 'path';
import { $ } from 'bun';
import { existsSync } from 'fs';

interface TestResult {
  script: string;
  original: ScriptExecution;
  migrated: ScriptExecution;
  passed: boolean;
  differences: string[];
}

interface ScriptExecution {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

class MigrationTestFramework {
  private testResults: TestResult[] = [];

  async testMigratedScript(
    originalPath: string,
    migratedPath: string,
    testInputs?: string[]
  ): Promise<TestResult> {
    console.log(`\n🧪 Testing: ${basename(originalPath)} vs ${basename(migratedPath)}`);
    
    // Execute original script
    const original = await this.executeScript(originalPath, 'bash', testInputs);
    
    // Determine runtime for migrated script
    const runtime = migratedPath.endsWith('.py') ? 'python3' : 
                    migratedPath.endsWith('.ts') ? 'bun' : 'node';
    
    // Execute migrated script
    const migrated = await this.executeScript(migratedPath, runtime, testInputs);
    
    // Compare results
    const differences = this.compareExecutions(original, migrated);
    const passed = differences.length === 0;
    
    const result: TestResult = {
      script: basename(originalPath),
      original,
      migrated,
      passed,
      differences
    };
    
    this.testResults.push(result);
    
    // Print result
    if (passed) {
      console.log(`  ✅ PASSED - Output matches`);
    } else {
      console.log(`  ❌ FAILED - Found ${differences.length} differences:`);
      differences.forEach(diff => console.log(`     ${diff}`));
    }
    
    return result;
  }

  private async executeScript(
    scriptPath: string,
    runtime: string,
    inputs?: string[]
  ): Promise<ScriptExecution> {
    const startTime = Date.now();
    
    try {
      let command;
      if (runtime === 'bash') {
        command = $`bash ${scriptPath} ${inputs || []}`;
      } else if (runtime === 'python3') {
        command = $`python3 ${scriptPath} ${inputs || []}`;
      } else if (runtime === 'bun') {
        command = $`bun run ${scriptPath} ${inputs || []}`;
      } else {
        command = $`node ${scriptPath} ${inputs || []}`;
      }
      
      const result = await command.quiet();
      const duration = Date.now() - startTime;
      
      return {
        stdout: result.stdout.toString(),
        stderr: result.stderr.toString(),
        exitCode: result.exitCode || 0,
        duration
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      return {
        stdout: error.stdout?.toString() || '',
        stderr: error.stderr?.toString() || error.message,
        exitCode: error.exitCode || 1,
        duration
      };
    }
  }

  private compareExecutions(original: ScriptExecution, migrated: ScriptExecution): string[] {
    const differences: string[] = [];
    
    // Compare stdout (normalize whitespace)
    const normalizedOrigStdout = this.normalizeOutput(original.stdout);
    const normalizedMigStdout = this.normalizeOutput(migrated.stdout);
    
    if (normalizedOrigStdout !== normalizedMigStdout) {
      differences.push(`stdout differs: expected "${normalizedOrigStdout.slice(0, 50)}..." got "${normalizedMigStdout.slice(0, 50)}..."`);
    }
    
    // Compare exit codes
    if (original.exitCode !== migrated.exitCode) {
      differences.push(`exit code differs: expected ${original.exitCode} got ${migrated.exitCode}`);
    }
    
    // Check for critical errors in stderr
    if (migrated.stderr.includes('Error:') && !original.stderr.includes('Error:')) {
      differences.push(`unexpected error in migrated script: ${migrated.stderr.slice(0, 100)}`);
    }
    
    return differences;
  }

  private normalizeOutput(output: string): string {
    return output
      .trim()
      .replace(/\r\n/g, '\n')
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n');
  }

  async generateReport(): Promise<void> {
    const reportPath = '/home/ormastes/dev/aidev/gen/doc/migration-test-report.json';
    
    const summary = {
      timestamp: new Date().toISOString(),
      totalTests: this.testResults.length,
      passed: this.testResults.filter(r => r.passed).length,
      failed: this.testResults.filter(r => !r.passed).length,
      results: this.testResults
    };
    
    await writeFile(reportPath, JSON.stringify(summary, null, 2));
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Summary:');
    console.log(`   Total: ${summary.totalTests}`);
    console.log(`   ✅ Passed: ${summary.passed}`);
    console.log(`   ❌ Failed: ${summary.failed}`);
    console.log(`   Success Rate: ${((summary.passed / summary.totalTests) * 100).toFixed(1)}%`);
    console.log(`\n📄 Report saved to: ${reportPath}`);
  }
}

// Create test scripts for validation
async function createTestScripts() {
  const testDir = '/home/ormastes/dev/aidev/scripts/test-scripts';
  await mkdir(testDir, { recursive: true });
  
  // Simple test script
  const simpleShell = `#!/bin/bash
echo "Hello World"
NAME="Test"
echo "Name is: $NAME"
exit 0`;
  
  await writeFile(join(testDir, 'simple.sh'), simpleShell);
  
  // Simple TypeScript migration
  const simpleTS = `#!/usr/bin/env bun
console.log("Hello World");
const name = "Test";
console.log(\`Name is: \${name}\`);
process.exit(0);`;
  
  await writeFile(join(testDir, 'simple.ts'), simpleTS);
  
  // Simple Python migration
  const simplePy = `#!/usr/bin/env python3
print("Hello World")
name = "Test"
print(f"Name is: {name}")
exit(0)`;
  
  await writeFile(join(testDir, 'simple.py'), simplePy);
  
  console.log('✅ Created test scripts in scripts/test-scripts/');
}

// Performance comparison
async function comparePerformance() {
  console.log('\n⚡ Performance Comparison');
  console.log('='.repeat(50));
  
  const scripts = [
    { name: 'Shell', path: '/home/ormastes/dev/aidev/scripts/test-scripts/simple.sh', runtime: 'bash' },
    { name: 'TypeScript/Bun', path: '/home/ormastes/dev/aidev/scripts/test-scripts/simple.ts', runtime: 'bun' },
    { name: 'Python', path: '/home/ormastes/dev/aidev/scripts/test-scripts/simple.py', runtime: 'python3' }
  ];
  
  for (const script of scripts) {
    if (!existsSync(script.path)) continue;
    
    const times: number[] = [];
    
    // Run 5 times for average
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      
      if (script.runtime === 'bash') {
        await $`bash ${script.path}`.quiet();
      } else if (script.runtime === 'python3') {
        await $`python3 ${script.path}`.quiet();
      } else {
        await $`bun run ${script.path}`.quiet();
      }
      
      times.push(performance.now() - start);
    }
    
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`  ${script.name}: ${avg.toFixed(2)}ms avg`);
  }
}

// Main test runner
async function main() {
  console.log('🔬 Migration Test Framework');
  console.log('='.repeat(50));
  
  // Create test scripts
  await createTestScripts();
  
  // Initialize test framework
  const tester = new MigrationTestFramework();
  
  // Test simple scripts
  const testDir = '/home/ormastes/dev/aidev/scripts/test-scripts';
  
  // Test TypeScript migration
  await tester.testMigratedScript(
    join(testDir, 'simple.sh'),
    join(testDir, 'simple.ts')
  );
  
  // Test Python migration
  await tester.testMigratedScript(
    join(testDir, 'simple.sh'),
    join(testDir, 'simple.py')
  );
  
  // Test migrated scripts from earlier
  const migratedDir = '/home/ormastes/dev/aidev/scripts/migrated';
  
  // Find and test any existing migrations
  if (existsSync(join(migratedDir, 'python/migrate-npm-to-bun.py'))) {
    const originalScript = '/home/ormastes/dev/aidev/scripts/migrate-npm-to-bun.sh';
    if (existsSync(originalScript)) {
      await tester.testMigratedScript(
        originalScript,
        join(migratedDir, 'python/migrate-npm-to-bun.py'),
        ['--dry-run'] // Test with dry-run flag
      );
    }
  }
  
  // Generate test report
  await tester.generateReport();
  
  // Compare performance
  await comparePerformance();
}

// Execute tests
if (import.meta.main) {
  main().catch(console.error);
}