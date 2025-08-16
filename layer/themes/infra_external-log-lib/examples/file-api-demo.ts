#!/usr/bin/env ts-node

/**
 * File Creation API Demo
 * Demonstrates the various features of the FileCreationAPI
 */

import * as path from 'node:path';
import { 
  FileCreationAPI, 
  FileType,
  MCPIntegratedFileManager,
  FileCreationFraudChecker,
  FSInterceptor,
  InterceptMode
} from '../pipe';

async function demonstrateFileAPI() {
  console.log('📁 File Creation API Demo\n');
  console.log('=' .repeat(50));

  const basePath = path.join(__dirname, '..', '..', '..', '..');
  
  // Initialize APIs
  const fileAPI = new FileCreationAPI(basePath, false); // Non-strict for demo
  const mcpManager = new MCPIntegratedFileManager(basePath);
  const fraudChecker = new FileCreationFraudChecker(basePath);

  // Demo 1: Basic file creation with type detection
  console.log('\n1️⃣ Basic File Creation with Type Detection');
  console.log('-'.repeat(40));
  
  try {
    const result1 = await fileAPI.createFile(
      'demo-report.md',
      '# Demo Report\n\nThis is a test report created by FileCreationAPI.',
      { type: FileType.REPORT }
    );
    
    console.log('✅ Created report:', result1.path);
    console.log('   Type:', result1.type);
    console.log('   Size:', result1.size, 'bytes');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }

  // Demo 2: MCP validation
  console.log('\n2️⃣ MCP Structure Validation');
  console.log('-'.repeat(40));
  
  // Try to create in root (should fail/warn)
  const rootValidation = await mcpManager.validateAgainstStructure(
    'root-file.txt',
    FileType.TEMPORARY
  );
  
  console.log('Root file validation:', rootValidation.valid ? '✅' : '❌');
  if (!rootValidation.valid) {
    console.log('Violations:', rootValidation.violations);
    console.log('Suggestions:', rootValidation.suggestions);
  }

  // Try proper location
  const tempValidation = await mcpManager.validateAgainstStructure(
    'temp/demo-file.txt',
    FileType.TEMPORARY
  );
  
  console.log('\nTemp file validation:', tempValidation.valid ? '✅' : '❌');

  // Demo 3: Batch operations
  console.log('\n3️⃣ Batch File Operations');
  console.log('-'.repeat(40));
  
  try {
    const batchFiles = [
      {
        path: 'batch-doc-1.md',
        content: '# Document 1',
        options: { type: FileType.DOCUMENT }
      },
      {
        path: 'batch-log.log',
        content: 'Log entry 1\nLog entry 2',
        options: { type: FileType.LOG }
      },
      {
        path: 'batch-data.json',
        content: JSON.stringify({ demo: true }, null, 2),
        options: { type: FileType.DATA }
      }
    ];

    const batchResults = await fileAPI.createBatch(batchFiles);
    console.log(`✅ Created ${batchResults.length} files in batch:`);
    batchResults.forEach(r => {
      if (r.success) {
        console.log(`   - ${r.type}: ${path.basename(r.path)}`);
      }
    });
  } catch (error: any) {
    console.error('❌ Batch error:', error.message);
  }

  // Demo 4: Fraud detection
  console.log('\n4️⃣ Fraud Detection');
  console.log('-'.repeat(40));
  
  // Create a test file with violations
  const testCode = `
// This file has direct fs usage (violations)
import * as fs from '../../layer/themes/infra_external-log-lib/src';

async function badFunction() {
  await fileAPI.createFile('output.txt', 'data', { type: FileType.TEMPORARY });
  await fileAPI.createFile('async.txt', 'data', { type: FileType.TEMPORARY });
  await fileAPI.createDirectory('/etc/dangerous');
}

async function createBackup() {
  await fileAPI.createFile('file.bak', 'backup', { type: FileType.TEMPORARY });
}
`;

  const testFile = path.join(basePath, 'temp', 'test-violations.ts');
  await fileAPI.createFile(testFile, testCode, { type: FileType.TEMPORARY });
  
  const fraudResult = await fraudChecker.scanFile(testFile);
  console.log(`Found ${fraudResult.violations.length} violations:`);
  fraudResult.violations.forEach(v => {
    const icon = v.severity === "critical" ? '🚨' :
                 v.severity === 'high' ? '⚠️' : '📌';
    console.log(`   ${icon} Line ${v.line}: ${v.message}`);
  });
  
  if (fraudResult.canAutoFix) {
    console.log('   💡 This file can be auto-fixed');
  }

  // Demo 5: File type routing
  console.log('\n5️⃣ Automatic File Type Routing');
  console.log('-'.repeat(40));
  
  const fileTypes = [
    { name: 'test.md', type: FileType.DOCUMENT },
    { name: 'report.md', type: FileType.REPORT },
    { name: 'temp.txt', type: FileType.TEMPORARY },
    { name: 'app.log', type: FileType.LOG },
    { name: 'data.json', type: FileType.DATA },
    { name: 'config.yaml', type: FileType.CONFIG },
    { name: 'test.spec.ts', type: FileType.TEST },
    { name: 'index.ts', type: FileType.SOURCE }
  ];

  console.log('File routing by type:');
  for (const { name, type } of fileTypes) {
    const config = fileAPI["fileTypeConfigs"].get(type);
    if (config) {
      console.log(`   ${type.padEnd(10)} → ${config.baseDir}/${name}`);
    }
  }

  // Demo 6: Audit log
  console.log('\n6️⃣ Audit Log');
  console.log('-'.repeat(40));
  
  const auditLog = fileAPI.getAuditLog();
  console.log(`Total operations logged: ${auditLog.length}`);
  
  const recentOps = auditLog.slice(-5);
  console.log('Recent operations:');
  recentOps.forEach(entry => {
    const icon = entry.success ? '✅' : '❌';
    console.log(`   ${icon} ${entry.operation}: ${path.basename(entry.path)}`);
  });

  // Demo 7: Interceptor (demonstration only)
  console.log('\n7️⃣ FS Interceptor (Monitor Mode)');
  console.log('-'.repeat(40));
  
  const interceptor = FSInterceptor.getInstance({
    mode: InterceptMode.MONITOR
  });
  
  // Note: In real usage, this would be initialized at app start
  console.log('Interceptor configured in MONITOR mode');
  console.log('Would track direct fs usage without blocking');

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Demo Summary');
  console.log('- File API provides type-based routing');
  console.log('- MCP validates against project structure');
  console.log('- Fraud checker detects violations');
  console.log('- Audit log tracks all operations');
  console.log('- Interceptor can enforce at runtime');
  
  // Export audit log
  const auditPath = await fileAPI.exportAuditLog();
  console.log(`\n📄 Audit log exported to: ${auditPath}`);
}

// Error handler
async function main() {
  try {
    await demonstrateFileAPI();
    console.log('\n✅ Demo completed successfully!');
  } catch (error: any) {
    console.error('\n❌ Demo error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run demo
if (require.main === module) {
  main();
}