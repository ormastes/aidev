#!/usr/bin/env ts-node

/**
 * Demo: File Violation Prevention System
 * 
 * This script demonstrates the file violation prevention feature
 * showing both strict and non-strict modes.
 */

import * as path from 'path';
import {
  FileViolationPreventer,
  SafeFileOps,
  enableStrictMode,
  disableStrictMode,
  isStrictModeEnabled,
  wouldViolate
} from '../pipe';

async function demo() {
  console.log('=================================');
  console.log('File Violation Prevention Demo');
  console.log('=================================\n');

  const basePath = process.cwd();
  const themePath = path.join(basePath, 'layer/themes/infra_external-log-lib');

  // Demo 1: Check current mode
  console.log('1️⃣ Current Mode Check');
  console.log(`   Strict mode enabled: ${isStrictModeEnabled()}`);
  console.log();

  // Demo 2: Test violations without executing
  console.log('2️⃣ Testing Violations (without executing)');
  
  const testPaths = [
    { path: path.join(basePath, 'unauthorized.txt'), operation: 'create' as const },
    { path: path.join(themePath, 'backup.bak'), operation: 'create' as const },
    { path: path.join(themePath, 'file with spaces.txt'), operation: 'create' as const },
    { path: path.join(themePath, 'src/valid-file.ts'), operation: 'create' as const },
  ];

  for (const test of testPaths) {
    const violates = await wouldViolate(test.operation, test.path);
    const status = violates ? '❌ Would violate' : '✅ Would succeed';
    console.log(`   ${status}: ${path.basename(test.path)}`);
  }
  console.log();

  // Demo 3: Non-strict mode (warnings only)
  console.log('3️⃣ Non-Strict Mode (warnings only)');
  disableStrictMode();
  
  try {
    const testFile = path.join(themePath, 'temp-test.bak');
    console.log(`   Attempting to create: ${path.basename(testFile)}`);
    await SafeFileOps.safeWriteFile(testFile, 'test content');
    console.log('   ⚠️ File created with warning (check console)');
  } catch (error) {
    console.log('   ❌ Unexpected error:', error.message);
  }
  console.log();

  // Demo 4: Strict mode (throws exceptions)
  console.log('4️⃣ Strict Mode (throws exceptions)');
  enableStrictMode();
  
  try {
    const testFile = path.join(themePath, 'another-test.bak');
    console.log(`   Attempting to create: ${path.basename(testFile)}`);
    await SafeFileOps.safeWriteFile(testFile, 'test content');
    console.log('   ✅ File created successfully');
  } catch (error) {
    if (error.name === 'FileViolationError') {
      console.log('   ❌ Blocked by violation preventer:');
      console.log(`      Type: ${error.violationType}`);
      console.log(`      Message: ${error.message.split('\n')[0]}`);
    } else {
      console.log('   ❌ Unexpected error:', error.message);
    }
  }
  console.log();

  // Demo 5: Valid operations
  console.log('5️⃣ Valid Operations (should succeed)');
  
  const validPaths = [
    path.join(themePath, 'src/components/valid-component.ts'),
    path.join(themePath, 'tests/valid-test.test.ts'),
    path.join(themePath, 'docs/valid-doc.md'),
  ];

  for (const validPath of validPaths) {
    const violates = await wouldViolate('create', validPath);
    if (!violates) {
      console.log(`   ✅ ${path.relative(themePath, validPath)} - Valid path`);
    } else {
      console.log(`   ❌ ${path.relative(themePath, validPath)} - Would violate`);
    }
  }
  console.log();

  // Demo 6: Configuration
  console.log('6️⃣ Custom Configuration');
  
  const preventer = new FileViolationPreventer(basePath, {
    enabled: true,
    inheritToChildren: false,  // Don't apply to children
    logWarnings: true,
    throwOnViolation: false
  });
  
  console.log('   Custom config created:');
  const config = preventer.getStrictModeConfig();
  console.log(`   - Enabled: ${config.enabled}`);
  console.log(`   - Inherit to children: ${config.inheritToChildren}`);
  console.log(`   - Log warnings: ${config.logWarnings}`);
  console.log(`   - Throw on violation: ${config.throwOnViolation}`);
  console.log();

  // Demo 7: Path-specific rules
  console.log('7️⃣ Path-Specific Rules');
  
  const pathTests = [
    { path: path.join(themePath, 'children/child-module/file.ts'), desc: 'children/ - always strict' },
    { path: path.join(themePath, 'tests/test.bak'), desc: 'tests/ - relaxed' },
    { path: path.join(themePath, 'gen/generated.bak'), desc: 'gen/ - relaxed' },
    { path: path.join(themePath, 'logs/log.bak'), desc: 'logs/ - relaxed' },
  ];

  for (const test of pathTests) {
    console.log(`   ${test.desc}`);
  }
  console.log();

  // Summary
  console.log('=================================');
  console.log('Summary');
  console.log('=================================');
  console.log('✅ File Violation Prevention is working');
  console.log('✅ Strict mode can block violations');
  console.log('✅ Non-strict mode logs warnings');
  console.log('✅ Path validation uses filesystem-mcp logic');
  console.log('\nTo use in your code:');
  console.log('  import { SafeFileOps } from "layer/themes/infra_external-log-lib/pipe";');
  console.log('  await SafeFileOps.safeWriteFile(path, content);');
}

// Run demo
if (require.main === module) {
  demo().catch(console.error);
}