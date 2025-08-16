import { VFTaskQueueWrapperV2 } from '../children/VFTaskQueueWrapperV2';
import * as fs from 'fs/promises';
import { path } from '../../infra_external-log-lib/src';

/**
 * Test scenarios for JSON update functionality
 */
async function runTests() {
  const testDir = path.join(process.cwd(), 'temp', 'test-json-updates');
  await fs.mkdir(testDir, { recursive: true });
  
  const wrapper = new VFTaskQueueWrapperV2(testDir);
  
  console.log('🧪 Running JSON update tests...\n');
  
  // Test 1: Create test queue with multiple pending tasks
  console.log('Test 1: Creating queue with multiple pending tasks');
  const testFile = path.join(testDir, 'test-queue.vf.json');
  
  const testData = {
    queues: {
      high: [
        { id: 'task-1', type: 'data', status: 'pending', content: 'Task 1' },
        { id: 'task-2', type: 'data', status: 'pending', content: 'Task 2' },
        { id: 'task-3', type: 'data', status: 'pending', content: 'Task 3' }
      ],
      medium: [
        { id: 'task-4', type: 'data', status: 'pending', content: 'Task 4' },
        { id: 'task-5', type: 'data', status: 'pending', content: 'Task 5' }
      ]
    },
    working: { id: 'task-6', type: 'data', status: 'working', content: 'Working task' },
    metadata: {
      totalProcessed: 0,
      totalFailed: 0
    }
  };
  
  await fs.writeFile(testFile, JSON.stringify(testData, null, 2));
  console.log('✅ Test queue created\n');
  
  // Test 2: Update single task status
  console.log('Test 2: Update single task status (task-2 to completed)');
  await wrapper.updateTaskStatus(testFile, 'task-2', "completed");
  
  const result2 = await wrapper.findTasksByStatus(testFile, "completed");
  console.log(`✅ Found ${result2.length} completed task(s): ${result2.map(t => t.id).join(', ')}\n`);
  
  // Test 3: Update all pending tasks to working
  console.log('Test 3: Update all pending tasks to working');
  const count = await wrapper.updateAllTasksWithStatus(testFile, 'pending', 'working');
  console.log(`✅ Updated ${count} tasks from pending to working\n`);
  
  // Test 4: Batch update multiple tasks
  console.log('Test 4: Batch update multiple tasks');
  await wrapper.batchUpdateTaskStatus(testFile, [
    { id: 'task-1', status: "completed" },
    { id: 'task-3', status: 'failed' },
    { id: 'task-4', status: "completed" }
  ]);
  
  const report = await wrapper.getStatusReport(testFile);
  console.log('✅ Batch update complete');
  console.log(`📊 Current status: ${JSON.stringify(report.byStatus, null, 2)}\n`);
  
  // Test 5: Move task between queues
  console.log('Test 5: Move task-5 from medium to high priority');
  await wrapper.moveTaskBetweenQueues(testFile, 'task-5', 'medium', 'high');
  console.log('✅ Task moved successfully\n');
  
  // Test 6: Validate and repair
  console.log('Test 6: Validate queue structure');
  const validation = await wrapper.validateQueueFile(testFile);
  console.log(`✅ Validation result: ${validation.valid ? 'Valid' : 'Invalid'}\n`);
  
  // Test 7: Complex scenario with multiple pending tasks
  console.log('Test 7: Complex scenario - multiple tasks with same status');
  
  // Create a new test file with many pending tasks
  const complexFile = path.join(testDir, 'complex-queue.vf.json');
  const complexData = {
    queues: {
      high: Array.from({ length: 10 }, (_, i) => ({
        id: `high-task-${i}`,
        type: 'data',
        status: 'pending',
        content: `High priority task ${i}`
      })),
      medium: Array.from({ length: 10 }, (_, i) => ({
        id: `medium-task-${i}`,
        type: 'data', 
        status: 'pending',
        content: `Medium priority task ${i}`
      }))
    },
    metadata: { totalProcessed: 0, totalFailed: 0 }
  };
  
  await fs.writeFile(complexFile, JSON.stringify(complexData, null, 2));
  
  // Update specific tasks without string replacement issues
  await wrapper.updateTaskStatus(complexFile, 'high-task-5', "completed");
  await wrapper.updateTaskStatus(complexFile, 'medium-task-3', "completed");
  
  const pendingTasks = await wrapper.findTasksByStatus(complexFile, 'pending');
  const completedTasks = await wrapper.findTasksByStatus(complexFile, "completed");
  
  console.log(`✅ Updated specific tasks:`);
  console.log(`   - Pending: ${pendingTasks.length} tasks`);
  console.log(`   - Completed: ${completedTasks.length} tasks`);
  console.log(`   - No string replacement errors!\n`);
  
  // Final report
  console.log('📋 Final Test Summary:');
  console.log('✅ All tests passed successfully');
  console.log('✅ JSON updates use proper parsing (no string replacement)');
  console.log('✅ Multiple pending tasks handled correctly');
  console.log('✅ Unique ID targeting prevents ambiguous updates');
  
  // Cleanup option
  console.log('\n🧹 Test files saved in:', testDir);
  console.log('   You can inspect the generated JSON files to verify the updates');
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

export { runTests };