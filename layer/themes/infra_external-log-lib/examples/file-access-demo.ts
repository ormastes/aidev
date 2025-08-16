#!/usr/bin/env node

/**
 * File Access Auditing Demo
 * 
 * Demonstrates how to use the external-log-lib's file access auditing
 * with fraud detection integration
 */

import { auditedFS, fileAccessAuditor } from '../pipe';
import * as path from 'node:path';
import * as os from 'os';

async function demonstrateFileAccessAuditing() {
  console.log('🔍 File Access Auditing Demo\n');
  console.log('=' .repeat(50));
  
  // Configure auditor
  console.log('\n1. Configuring File Access Auditor...');
  fileAccessAuditor.config = {
    enabled: true,
    logLevel: 'all',
    realTimeMonitoring: true,
    persistAuditLog: true,
    auditLogPath: 'gen/logs/demo-audit.log',
    validateWithMCP: true,
    fraudCheckEnabled: true
  };
  
  // Set up real-time monitoring
  fileAccessAuditor.on('file-access', (event) => {
    console.log(`  📁 ${event.operation}: ${event.path} [${event.result.success ? '✅' : '❌'}]`);
  });
  
  fileAccessAuditor.on("violation", (event) => {
    console.log(`  ⚠️  VIOLATION: ${event.operation} on ${event.path}`);
    if (event.validation?.violations) {
      console.log(`     Reasons: ${event.validation.violations.join(', ')}`);
    }
  });
  
  fileAccessAuditor.on('suspicious-pattern', (pattern) => {
    console.log(`  🚨 SUSPICIOUS: ${pattern.type} - ${pattern.description}`);
  });
  
  // Create temp directory for testing
  const tempDir = path.join(os.tmpdir(), 'file-access-demo-' + Date.now());
  console.log(`\n2. Creating test directory: ${tempDir}`);
  await auditedFS.mkdir(tempDir, { recursive: true });
  
  // Demonstrate various file operations
  console.log('\n3. Performing File Operations:\n');
  
  // Write a file
  console.log('Writing test file...');
  const testFile = path.join(tempDir, 'test.txt');
  await auditedFS.writeFile(testFile, 'Hello, World!');
  
  // Read the file
  console.log('Reading test file...');
  const content = await auditedFS.readFile(testFile, 'utf8');
  console.log(`  Content: ${content}`);
  
  // Append to file
  console.log('Appending to test file...');
  await auditedFS.appendFile(testFile, '\nAppended line');
  
  // Get file stats
  console.log('Getting file stats...');
  const stats = await auditedFS.stat(testFile);
  console.log(`  Size: ${stats.size} bytes`);
  
  // Create a suspicious file (will trigger fraud detection)
  console.log('\n4. Testing Fraud Detection:\n');
  
  try {
    console.log('Attempting to create backup file (suspicious)...');
    const backupFile = path.join(tempDir, 'data.bak');
    await auditedFS.writeFile(backupFile, 'Backup data');
  } catch (error) {
    console.log(`  ❌ Operation blocked: ${error.message}`);
  }
  
  try {
    console.log('Attempting directory traversal (malicious)...');
    const maliciousPath = path.join(tempDir, '../../../etc/passwd');
    await auditedFS.readFile(maliciousPath);
  } catch (error) {
    console.log(`  ❌ Operation blocked: ${error.message}`);
  }
  
  // Simulate rapid access (suspicious pattern)
  console.log('\n5. Simulating Rapid Access Pattern:\n');
  console.log('Performing 20 rapid file operations...');
  for (let i = 0; i < 20; i++) {
    await auditedFS.exists(testFile);
  }
  
  // Generate audit report
  console.log('\n6. Generating Audit Report:\n');
  const stats = fileAccessAuditor.getStats();
  const report = await fileAccessAuditor.generateReport();
  
  console.log('Audit Statistics:');
  console.log(`  Total Operations: ${stats.totalOperations}`);
  console.log(`  Violations: ${stats.violations}`);
  console.log(`  Errors: ${stats.errors}`);
  console.log(`  Suspicious Patterns: ${stats.suspiciousPatterns.length}`);
  
  if (stats.topAccessedPaths.length > 0) {
    console.log('\nTop Accessed Paths:');
    for (const { path, count } of stats.topAccessedPaths.slice(0, 3)) {
      console.log(`  - ${path}: ${count} accesses`);
    }
  }
  
  // Integrate with fraud checker
  console.log('\n7. Fraud Analysis:\n');
  
  try {
    // Dynamic import to avoid dependency issues
    const { FileAccessFraudDetector } = await import('../../infra_fraud-checker/pipe');
    const fraudDetector = new FileAccessFraudDetector();
    await fraudDetector.initialize();
    
    const analysis = await fraudDetector.analyze();
    
    console.log('Fraud Analysis Results:');
    console.log(`  Fraud Score: ${analysis.score}/100`);
    console.log(`  Frauds Detected: ${analysis.frauds.length}`);
    console.log(`  Blocked Operations: ${analysis.blocked}`);
    console.log(`  Allowed Operations: ${analysis.allowed}`);
    
    if (analysis.frauds.length > 0) {
      console.log('\nDetected Frauds:');
      for (const fraud of analysis.frauds) {
        console.log(`  - ${fraud.type} (${fraud.severity}): ${fraud.description}`);
      }
    }
    
    if (analysis.recommendations.length > 0) {
      console.log('\nRecommendations:');
      for (const rec of analysis.recommendations) {
        console.log(`  - ${rec}`);
      }
    }
  } catch (error) {
    console.log('Fraud detector not available:', error.message);
  }
  
  // Clean up
  console.log('\n8. Cleaning up...\n');
  await auditedFS.unlink(testFile);
  await auditedFS.rmdir(tempDir);
  
  console.log('✅ Demo completed successfully!\n');
  
  // Save full report
  const reportPath = path.join('gen/doc', 'file-access-audit-demo.md');
  console.log(`Full report saved to: ${reportPath}`);
  await auditedFS.writeFile(reportPath, report);
}

// Demonstrate streaming with audit
async function demonstrateStreamAuditing() {
  console.log('\n9. Stream Auditing Demo:\n');
  
  const tempFile = path.join(os.tmpdir(), 'stream-test.txt');
  
  // Create write stream
  console.log('Creating write stream...');
  const writeStream = auditedFS.createWriteStream(tempFile);
  
  writeStream.write('Line 1\n');
  writeStream.write('Line 2\n');
  writeStream.write('Line 3\n');
  writeStream.end();
  
  await new Promise(resolve => writeStream.on('finish', resolve));
  console.log('  Write stream completed');
  
  // Create read stream
  console.log('Creating read stream...');
  const readStream = auditedFS.createReadStream(tempFile);
  
  let data = '';
  readStream.on('data', chunk => {
    data += chunk;
  });
  
  await new Promise(resolve => readStream.on('end', resolve));
  console.log(`  Read ${data.length} bytes from stream`);
  
  // Clean up
  await auditedFS.unlink(tempFile);
}

// Main execution
async function main() {
  try {
    await demonstrateFileAccessAuditing();
    await demonstrateStreamAuditing();
    
    console.log('=' .repeat(50));
    console.log('\n📊 Final Summary:\n');
    
    const finalStats = fileAccessAuditor.getStats();
    console.log(`Total file operations audited: ${finalStats.totalOperations}`);
    console.log(`Security violations detected: ${finalStats.violations}`);
    console.log(`Suspicious patterns identified: ${finalStats.suspiciousPatterns.length}`);
    
    console.log('\n💡 Key Features Demonstrated:');
    console.log('  ✓ Real-time file access monitoring');
    console.log('  ✓ Automatic fraud detection');
    console.log('  ✓ Platform validation integration');
    console.log('  ✓ Suspicious pattern detection');
    console.log('  ✓ Comprehensive audit logging');
    console.log('  ✓ Stream operation auditing');
    
  } catch (error) {
    console.error('Demo failed:', error);
    process.exit(1);
  }
}

// Run the demo
if (require.main === module) {
  main();
}