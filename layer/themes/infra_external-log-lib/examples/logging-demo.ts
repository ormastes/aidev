import { fileAPI } from '../utils/file-api';
#!/usr/bin/env ts-node

/**
 * Demo: Comprehensive Logging System
 * 
 * Demonstrates all logging features including:
 * - Event logging
 * - VF.json monitoring
 * - Rejection tracking
 * - Query capabilities
 */

import * as path from 'node:path';
import * as fs from '../../layer/themes/infra_external-log-lib/src';
import {
  startComprehensiveLogging,
  ComprehensiveLogger,
  RejectionType,
  LogEventType,
  FileViolationError
} from '../pipe';

async function demo() {
  console.log('=================================');
  console.log('Comprehensive Logging System Demo');
  console.log('=================================\n');

  // 1. Start comprehensive logging
  console.log('1️⃣ Starting Comprehensive Logging');
  const logger = await startComprehensiveLogging({
    enableConsole: false, // Don't clutter demo output
    logDir: '/tmp/external-log-lib-demo'
  });
  
  console.log(`   ✅ Logging started`);
  console.log(`   📁 Log directory: ${logger.getLogDirectory()}`);
  console.log();

  // 2. Log various events
  console.log('2️⃣ Logging Events');
  
  logger.logEvent('Demo started', 'info', { demo: true });
  console.log('   ✅ Logged info event');
  
  logger.logEvent('Testing warning system', 'warn', { testLevel: 'medium' });
  console.log('   ✅ Logged warning event');
  
  logger.logEvent('Simulated error', 'error', { errorCode: 'DEMO_ERROR' });
  console.log('   ✅ Logged error event');
  console.log();

  // 3. Simulate task queue changes
  console.log('3️⃣ Simulating Task Queue Changes');
  
  logger.logTaskChange('created', 'DEMO-001', {
    title: 'Demo task',
    priority: 'high',
    assignee: 'demo-user'
  });
  console.log('   ✅ Task created');
  
  logger.logTaskChange('updated', 'DEMO-001', {
    status: 'in_progress'
  });
  console.log('   ✅ Task updated');
  
  logger.logTaskChange("completed", 'DEMO-001', {
    completionTime: new Date()
  });
  console.log('   ✅ Task completed');
  console.log();

  // 4. Simulate feature changes
  console.log('4️⃣ Simulating Feature Changes');
  
  logger.logFeatureChange('created', 'FEAT-DEMO-001', {
    name: 'Demo Feature',
    description: 'Demonstration feature for logging'
  });
  console.log('   ✅ Feature created');
  
  logger.logFeatureChange('updated', 'FEAT-DEMO-001', {
    status: 'testing'
  });
  console.log('   ✅ Feature updated');
  console.log();

  // 5. Simulate name ID changes
  console.log('5️⃣ Simulating Name ID Changes');
  
  logger.logNameIdChange('created', 'entity-demo-001', {
    type: 'demo-entity',
    data: { value: 'test' }
  });
  console.log('   ✅ Entity created');
  
  logger.logNameIdChange('updated', 'entity-demo-001', {
    data: { value: 'updated' }
  });
  console.log('   ✅ Entity updated');
  console.log();

  // 6. Track rejections
  console.log('6️⃣ Tracking Rejections');
  
  const rejection1 = logger.trackRejection(
    RejectionType.FILE_VIOLATION,
    'Attempted to create backup file',
    {
      path: '/demo/file.bak',
      operation: 'create'
    }
  );
  console.log(`   ✅ Tracked file violation: ${rejection1?.id}`);
  
  const rejection2 = logger.trackRejection(
    RejectionType.FREEZE_VIOLATION,
    'Attempted to modify frozen directory',
    {
      path: '/frozen/dir',
      operation: 'write'
    }
  );
  console.log(`   ✅ Tracked freeze violation: ${rejection2?.id}`);
  
  // Simulate FileViolationError
  const error = new FileViolationError(
    'Pattern mismatch',
    '/demo/Invalid File.txt',
    'pattern_mismatch'
  );
  const rejection3 = logger.trackFileViolation(error, 'create');
  console.log(`   ✅ Tracked pattern violation: ${rejection3?.id}`);
  console.log();

  // 7. Query logs
  console.log('7️⃣ Querying Logs');
  
  // Query recent events
  const recentEvents = await logger.queryLogs({
    limit: 5
  });
  console.log(`   📊 Recent events: ${recentEvents.length}`);
  
  // Query errors
  const errors = await logger.queryLogs({
    level: 'error',
    limit: 10
  });
  console.log(`   ❌ Error logs: ${errors.length}`);
  
  // Query task changes
  const taskLogs = await logger.queryLogs({
    type: [
      LogEventType.TASK_QUEUE_CREATED,
      LogEventType.TASK_QUEUE_COMPLETED
    ]
  });
  console.log(`   📋 Task logs: ${taskLogs.length}`);
  console.log();

  // 8. Get rejections
  console.log('8️⃣ Analyzing Rejections');
  
  const allRejections = logger.getRejections();
  console.log(`   📊 Total rejections: ${allRejections.length}`);
  
  const unresolvedRejections = logger.getRejections({
    resolved: false
  });
  console.log(`   ⚠️  Unresolved: ${unresolvedRejections.length}`);
  
  const highSeverity = logger.getRejections({
    severity: 'high'
  });
  console.log(`   🔴 High severity: ${highSeverity.length}`);
  console.log();

  // 9. Generate summary
  console.log('9️⃣ Generating Summary');
  
  const summary = logger.getSummary();
  console.log(`   📈 Events logged: ${summary.eventsLogged}`);
  console.log(`   🔄 VF.json changes: ${summary.vfJsonChanges}`);
  console.log(`   ❌ Rejections tracked: ${summary.rejectionsTracked}`);
  console.log(`   ⏱️  Uptime: ${Math.round(summary.uptime / 1000)} seconds`);
  console.log(`   📁 Current log: ${path.basename(summary.currentLogPath)}`);
  
  if (summary.logSizeBytes) {
    console.log(`   💾 Log size: ${(summary.logSizeBytes / 1024).toFixed(2)} KB`);
  }
  console.log();

  // 10. Generate report
  console.log('🔟 Generating Report');
  const report = logger.generateReport();
  const lines = report.split('\n').slice(0, 10);
  console.log('   Report preview:');
  lines.forEach(line => console.log(`   ${line}`));
  console.log('   ...');
  console.log();

  // 11. File operations tracking
  console.log('1️⃣1️⃣ File Operations');
  
  logger.logFileOperation('created', '/demo/new-file.ts', {
    size: 1024,
    type: "typescript"
  });
  console.log('   ✅ File creation logged');
  
  logger.logFileOperation("modified", '/demo/existing-file.ts', {
    changedLines: 42
  });
  console.log('   ✅ File modification logged');
  
  logger.logFileOperation('deleted', '/demo/old-file.ts');
  console.log('   ✅ File deletion logged');
  console.log();

  // 12. Check log files
  console.log('1️⃣2️⃣ Log Files Created');
  
  const logDir = logger.getLogDirectory();
  const eventsDir = path.join(logDir, 'events');
  
  if (fs.existsSync(eventsDir)) {
    const files = fs.readdirSync(eventsDir);
    console.log(`   📁 Event logs: ${files.length} file(s)`);
    files.forEach(file => {
      const stats = fs.statSync(path.join(eventsDir, file));
      console.log(`      - ${file} (${stats.size} bytes)`);
    });
  }
  
  const rejectionsFile = path.join(logDir, 'rejections.json');
  if (fs.existsSync(rejectionsFile)) {
    const stats = fs.statSync(rejectionsFile);
    console.log(`   📁 Rejections file: ${stats.size} bytes`);
  }
  console.log();

  // Stop logging
  console.log('🛑 Stopping Logger');
  logger.stop();
  console.log('   ✅ Logger stopped');
  console.log();

  // Summary
  console.log('=================================');
  console.log('Demo Complete!');
  console.log('=================================');
  console.log(`Check logs at: ${logDir}`);
  console.log('\nTo use in your project:');
  console.log('  import { startComprehensiveLogging } from "layer/themes/infra_external-log-lib/pipe";');
  console.log('  const logger = await startComprehensiveLogging();');
}

// Run demo
if (require.main === module) {
  demo().catch(console.error);
}