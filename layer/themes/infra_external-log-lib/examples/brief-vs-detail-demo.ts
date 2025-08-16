import { fileAPI } from '../utils/file-api';
#!/usr/bin/env ts-node

/**
 * Demo: Brief vs Detail Logging Modes
 * 
 * Shows the difference between brief (default) and detail logging modes
 */

import * as fs from '../../layer/themes/infra_external-log-lib/src';
import * as path from 'node:path';
import { 
  startComprehensiveLogging,
  RejectionType 
} from '../pipe';

async function demo() {
  console.log('=========================================');
  console.log('Brief vs Detail Logging Modes Demo');
  console.log('=========================================\n');

  // Start with brief mode (default)
  const logger = await startComprehensiveLogging({
    logDir: '/tmp/external-log-lib-demo-brief',
    detail: false  // Explicitly set to brief (this is default)
  });

  console.log('1️⃣ BRIEF MODE (Default) - Only Essential Info');
  console.log('================================================\n');

  // Log task with lots of data
  const taskData = {
    title: 'Implement user authentication',
    description: 'Add OAuth2 authentication with Google and GitHub providers',
    priority: 'high',
    status: 'in_progress',
    assignee: 'john.doe@example.com',
    labels: ["security", 'backend', 'auth'],
    estimatedHours: 16,
    dependencies: ['database-setup', 'api-gateway'],
    metadata: {
      createdBy: 'admin',
      team: 'backend',
      sprint: 'Sprint 23'
    }
  };

  console.log('📋 Logging task with lots of data...');
  logger.logTaskChange('created', 'TASK-001', taskData);
  console.log('   Brief mode logs: "TASK-001 [in_progress]"\n');

  // Log feature with complex data
  const featureData = {
    name: 'Multi-factor Authentication',
    data: {
      status: 'testing',
      priority: "critical",
      description: 'Implement MFA with SMS and TOTP support',
      components: ['sms-service', 'totp-generator', 'backup-codes'],
      rolloutPercentage: 25,
      targetDate: '2025-09-01'
    }
  };

  console.log('🚀 Logging feature with complex data...');
  logger.logFeatureChange('updated', 'FEAT-MFA-001', featureData);
  console.log('   Brief mode logs: "FEAT-MFA-001 [testing]"\n');

  // Log name ID with nested entity
  const entityData = {
    type: 'user-service',
    version: '2.3.0',
    config: {
      maxConnections: 100,
      timeout: 30000,
      retryPolicy: "exponential"
    },
    endpoints: [
      '/api/users',
      '/api/profiles',
      '/api/sessions'
    ]
  };

  console.log('🆔 Logging name ID with nested entity...');
  logger.logNameIdChange('updated', 'service-auth-001', entityData);
  console.log('   Brief mode logs: "service-auth-001 [user-service]"\n');

  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 100));

  console.log('2️⃣ DETAIL MODE - Full Information');
  console.log('===================================\n');

  // Enable detail mode
  logger.enableDetailMode();
  console.log('✅ Detail mode enabled\n');

  // Log the same task
  console.log('📋 Logging same task in detail mode...');
  logger.logTaskChange('updated', 'TASK-001', taskData);
  console.log('   Detail mode logs entire task object with all fields\n');

  // Log the same feature
  console.log('🚀 Logging same feature in detail mode...');
  logger.logFeatureChange("completed", 'FEAT-MFA-001', featureData);
  console.log('   Detail mode logs entire feature object with all nested data\n');

  // Log the same name ID
  console.log('🆔 Logging same name ID in detail mode...');
  logger.logNameIdChange('created', 'service-auth-002', entityData);
  console.log('   Detail mode logs entire entity with all config and endpoints\n');

  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 100));

  console.log('3️⃣ COMPARING LOG FILES');
  console.log('=======================\n');

  // Read and compare log files
  const logDir = logger.getLogDirectory();
  const eventsDir = path.join(logDir, 'events');
  
  if (fs.existsSync(eventsDir)) {
    const files = fs.readdirSync(eventsDir);
    if (files.length > 0) {
      const logFile = path.join(eventsDir, files[0]);
      const content = fileAPI.readFileSync(logFile, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      console.log('📄 Sample log entries:\n');
      
      // Find and show brief entries
      const briefEntries = lines.slice(0, 5);
      console.log('Brief Mode Entries:');
      briefEntries.forEach(line => {
        try {
          const entry = JSON.parse(line);
          if (entry.data && entry.data.brief) {
            console.log(`  - ${entry.message}`);
            console.log(`    Data: { brief: "${entry.data.brief}", essential: ${JSON.stringify(entry.data.essential)} }`);
          }
        } catch (e) {}
      });
      
      console.log('\nDetail Mode Entries:');
      const detailEntries = lines.slice(-3);
      detailEntries.forEach(line => {
        try {
          const entry = JSON.parse(line);
          if (entry.data && !entry.data.brief) {
            console.log(`  - ${entry.message}`);
            const dataPreview = JSON.stringify(entry.data).substring(0, 100);
            console.log(`    Data: ${dataPreview}...`);
          }
        } catch (e) {}
      });
    }
  }

  console.log('\n4️⃣ MODE SWITCHING');
  console.log('==================\n');

  // Show mode status
  console.log(`Current mode: ${logger.isDetailMode() ? 'DETAIL' : 'BRIEF'}`);
  
  // Switch back to brief
  logger.disableDetailMode();
  console.log('Switched to BRIEF mode');
  
  // Log something in brief mode
  logger.logEvent('Mode switched back to brief', 'info', { test: true });
  
  console.log('\n5️⃣ BENEFITS COMPARISON');
  console.log('=======================\n');
  
  console.log('📊 Brief Mode (Default):');
  console.log('  ✅ Smaller log files (up to 80% reduction)');
  console.log('  ✅ Faster processing and querying');
  console.log('  ✅ Essential info at a glance');
  console.log('  ✅ Better for production environments');
  console.log('  ✅ Reduces noise in logs\n');
  
  console.log('📚 Detail Mode:');
  console.log('  ✅ Complete data preservation');
  console.log('  ✅ Full debugging information');
  console.log('  ✅ Better for development/debugging');
  console.log('  ✅ Complete audit trail');
  console.log('  ✅ No information loss\n');

  // Stop logger
  logger.stop();

  console.log('=========================================');
  console.log('Demo Complete!');
  console.log('=========================================\n');
  
  console.log('💡 Usage Tips:');
  console.log('  - Use brief mode (default) for production');
  console.log('  - Enable detail mode for debugging');
  console.log('  - Switch modes at runtime as needed');
  console.log('  - Configure per environment\n');
  
  console.log('Example configuration:');
  console.log('  const logger = await startComprehensiveLogging({');
  console.log('    detail: process.env.NODE_ENV === "development"');
  console.log('  });');
}

// Run demo
if (require.main === module) {
  demo().catch(console.error);
}