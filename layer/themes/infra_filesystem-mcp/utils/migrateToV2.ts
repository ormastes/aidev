#!/usr/bin/env node

import * as fs from 'fs/promises';
import { path } from '../../infra_external-log-lib/src';
import { VFTaskQueueWrapperV2 } from '../children/VFTaskQueueWrapperV2';

/**
 * Migration script to update queue files and ensure proper JSON structure
 */
async function migrateQueueFiles() {
  const wrapper = new VFTaskQueueWrapperV2(process.cwd());
  
  console.log('🔄 Starting migration to V2 JSON handling...\n');
  
  // Find all .vf.json files
  const findVfJsonFiles = async (dir: string): Promise<string[]> => {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        files.push(...await findVfJsonFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.vf.json')) {
        files.push(fullPath);
      }
    }
    
    return files;
  };
  
  const vfJsonFiles = await findVfJsonFiles(process.cwd());
  console.log(`Found ${vfJsonFiles.length} .vf.json files\n`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const file of vfJsonFiles) {
    console.log(`Processing: ${path.relative(process.cwd(), file)}`);
    
    try {
      // Validate current structure
      const validation = await wrapper.validateQueueFile(file);
      
      if (!validation.valid) {
        console.log('  ⚠️  Invalid structure detected, attempting repair...');
        await wrapper.repairQueueFile(file);
        console.log('  ✅ Repaired successfully');
      } else {
        console.log('  ✅ Valid structure');
      }
      
      // Generate status report
      const report = await wrapper.getStatusReport(file);
      console.log(`  📊 Status: ${report.total} tasks total`);
      console.log(`     - By status: ${JSON.stringify(report.byStatus)}`);
      console.log(`     - Working: ${report.working}`);
      
      successCount++;
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
      errorCount++;
    }
    
    console.log('');
  }
  
  console.log('\n📋 Migration Summary:');
  console.log(`✅ Success: ${successCount} files`);
  console.log(`❌ Errors: ${errorCount} files`);
  
  if (errorCount === 0) {
    console.log('\n🎉 Migration completed successfully!');
  } else {
    console.log('\n⚠️  Migration completed with errors. Please check the files that failed.');
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateQueueFiles().catch(console.error);
}

export { migrateQueueFiles };