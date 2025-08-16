#!/usr/bin/env node

/**
 * Task Queue Manager - Push/Pop operations with logging
 * Manages TASK_QUEUE.vf.json with FIFO/LIFO operations and audit logging
 */

const fs = require('fs');
const path = require('path');

class TaskQueueManager {
  constructor() {
    this.queuePath = path.join(process.cwd(), 'TASK_QUEUE.vf.json');
    this.logPath = path.join(process.cwd(), 'gen/logs/task-queue-operations.log');
    this.backupPath = path.join(process.cwd(), 'gen/logs/task-queue-backup.json');
    this.queue = null;
    this.loadQueue();
  }

  // Load the current queue
  loadQueue() {
    try {
      const content = fs.readFileSync(this.queuePath, 'utf8');
      this.queue = JSON.parse(content);
      console.log('✅ Queue loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load queue:', error.message);
      process.exit(1);
    }
  }

  // Save the queue
  saveQueue() {
    try {
      // Create backup first
      await fileAPI.createFile(this.backupPath, JSON.stringify(this.queue, { type: FileType.TEMPORARY }));
      
      // Save updated queue
      await fileAPI.createFile(this.queuePath, JSON.stringify(this.queue, { type: FileType.TEMPORARY }));
      console.log('✅ Queue saved successfully');
    } catch (error) {
      console.error('❌ Failed to save queue:', error.message);
    }
  }

  // Log operation
  logOperation(operation, task, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      operation,
      taskId: task?.id || 'N/A',
      taskTitle: task?.content?.title || task?.title || 'N/A',
      priority: task?.priority || 'N/A',
      details,
      queueState: {
        working: this.queue.working?.length || 0,
        critical: this.queue.taskQueues?.critical?.length || 0,
        high: this.queue.taskQueues?.high?.length || 0,
        medium: this.queue.taskQueues?.medium?.length || 0,
        low: this.queue.taskQueues?.low?.length || 0,
        completed: this.queue.taskQueues?.completed?.length || 0
      }
    };

    // Ensure logs directory exists
    const logsDir = path.dirname(this.logPath);
    if (!fs.existsSync(logsDir)) {
      await fileAPI.createDirectory(logsDir);
    }

    // Append to log
    const logLine = JSON.stringify(logEntry) + '\n';
    await fileAPI.writeFile(this.logPath, logLine, { append: true });
    
    // Also log to console
    console.log(`\n📝 [${operation}] ${task?.content?.title || task?.title || 'Task'}`);
    console.log(`   ID: ${task?.id || 'N/A'}`);
    console.log(`   Priority: ${task?.priority || 'N/A'}`);
    console.log(`   Timestamp: ${logEntry.timestamp}`);
  }

  // PUSH operation - Add task to queue
  push(task, priority = 'medium') {
    if (!task.id) {
      task.id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    if (!task.createdAt) {
      task.createdAt = new Date().toISOString();
    }
    
    task.priority = priority;
    task.status = task.status || 'pending';

    // Initialize queue structure if needed
    if (!this.queue.taskQueues) {
      this.queue.taskQueues = {
        critical: [],
        high: [],
        medium: [],
        low: [],
        completed: []
      };
    }

    // Add to appropriate priority queue
    if (this.queue.taskQueues[priority]) {
      this.queue.taskQueues[priority].push(task);
      this.updateMetadata();
      this.saveQueue();
      this.logOperation('PUSH', task, { 
        queue: priority,
        position: this.queue.taskQueues[priority].length - 1
      });
      
      console.log(`\n✅ Task pushed to ${priority} queue`);
      return task;
    } else {
      console.error(`❌ Invalid priority: ${priority}`);
      return null;
    }
  }

  // POP operation - Remove and return task from queue (FIFO by default)
  pop(priority = null, mode = 'FIFO') {
    let task = null;
    let fromQueue = null;

    // If working queue exists and has items, pop from there first
    if (this.queue.working && this.queue.working.length > 0) {
      task = mode === 'LIFO' 
        ? this.queue.working.pop()
        : this.queue.working.shift();
      fromQueue = 'working';
    } 
    // Otherwise, pop from priority queues
    else {
      const priorities = priority ? [priority] : ['critical', 'high', 'medium', 'low'];
      
      for (const p of priorities) {
        if (this.queue.taskQueues[p] && this.queue.taskQueues[p].length > 0) {
          // Skip completed queue for pop operations
          if (p === 'completed') continue;
          
          task = mode === 'LIFO'
            ? this.queue.taskQueues[p].pop()
            : this.queue.taskQueues[p].shift();
          fromQueue = p;
          break;
        }
      }
    }

    if (task) {
      this.updateMetadata();
      this.saveQueue();
      this.logOperation('POP', task, { 
        queue: fromQueue,
        mode: mode
      });
      
      console.log(`\n✅ Task popped from ${fromQueue} queue`);
      return task;
    } else {
      console.log('ℹ️  No tasks to pop');
      return null;
    }
  }

  // Move task to working queue
  startWork(taskId) {
    let task = null;
    let fromQueue = null;

    // Find and remove task from priority queues
    for (const priority of ['critical', 'high', 'medium', 'low']) {
      const index = this.queue.taskQueues[priority]?.findIndex(t => t.id === taskId);
      if (index !== undefined && index >= 0) {
        task = this.queue.taskQueues[priority].splice(index, 1)[0];
        fromQueue = priority;
        break;
      }
    }

    if (task) {
      // Initialize working queue if needed
      if (!this.queue.working) {
        this.queue.working = [];
      }

      // Add to working queue
      task.status = 'in_progress';
      task.startedAt = new Date().toISOString();
      this.queue.working.push(task);
      
      this.updateMetadata();
      this.saveQueue();
      this.logOperation('START_WORK', task, {
        from: fromQueue,
        to: 'working'
      });
      
      console.log(`\n✅ Task moved to working queue`);
      return task;
    } else {
      console.log(`❌ Task not found: ${taskId}`);
      return null;
    }
  }

  // Complete task - move to completed queue
  completeTask(taskId) {
    let task = null;
    let fromQueue = null;

    // Check working queue first
    if (this.queue.working) {
      const index = this.queue.working.findIndex(t => t.id === taskId);
      if (index >= 0) {
        task = this.queue.working.splice(index, 1)[0];
        fromQueue = 'working';
      }
    }

    // If not in working, check other queues
    if (!task) {
      for (const priority of ['critical', 'high', 'medium', 'low']) {
        const index = this.queue.taskQueues[priority]?.findIndex(t => t.id === taskId);
        if (index !== undefined && index >= 0) {
          task = this.queue.taskQueues[priority].splice(index, 1)[0];
          fromQueue = priority;
          break;
        }
      }
    }

    if (task) {
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      
      // Add to completed queue
      if (!this.queue.taskQueues.completed) {
        this.queue.taskQueues.completed = [];
      }
      this.queue.taskQueues.completed.push(task);
      
      this.updateMetadata();
      this.saveQueue();
      this.logOperation('COMPLETE', task, {
        from: fromQueue,
        to: 'completed'
      });
      
      console.log(`\n✅ Task completed`);
      return task;
    } else {
      console.log(`❌ Task not found: ${taskId}`);
      return null;
    }
  }

  // Update queue metadata
  updateMetadata() {
    const totalTasks = Object.values(this.queue.taskQueues || {})
      .reduce((sum, queue) => sum + (queue?.length || 0), 0);
    
    const workingTasks = this.queue.working?.length || 0;
    const completedTasks = this.queue.taskQueues?.completed?.length || 0;
    const pendingTasks = totalTasks - completedTasks;

    this.queue.metadata = {
      ...this.queue.metadata,
      totalTasks,
      workingTasks,
      pendingTasks,
      completedTasks,
      lastUpdated: new Date().toISOString()
    };
  }

  // List tasks in queue
  list(priority = null) {
    console.log('\n📋 TASK QUEUE STATUS\n');
    console.log('=' .repeat(60));
    
    if (this.queue.working && this.queue.working.length > 0) {
      console.log('\n🔄 WORKING:');
      this.queue.working.forEach(t => {
        console.log(`  - [${t.id}] ${t.content?.title || t.title || 'Untitled'}`);
      });
    }

    const priorities = priority ? [priority] : ['critical', 'high', 'medium', 'low'];
    
    for (const p of priorities) {
      if (this.queue.taskQueues[p] && this.queue.taskQueues[p].length > 0) {
        const emoji = {
          critical: '🔴',
          high: '🟠',
          medium: '🟡',
          low: '🟢'
        }[p] || '⚪';
        
        console.log(`\n${emoji} ${p.toUpperCase()}:`);
        this.queue.taskQueues[p].slice(0, 5).forEach(t => {
          console.log(`  - [${t.id}] ${t.content?.title || t.title || 'Untitled'}`);
        });
        
        if (this.queue.taskQueues[p].length > 5) {
          console.log(`  ... and ${this.queue.taskQueues[p].length - 5} more`);
        }
      }
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('📊 Summary:');
    console.log(`  Total: ${this.queue.metadata?.totalTasks || 0}`);
    console.log(`  Working: ${this.queue.metadata?.workingTasks || 0}`);
    console.log(`  Pending: ${this.queue.metadata?.pendingTasks || 0}`);
    console.log(`  Completed: ${this.queue.metadata?.completedTasks || 0}`);
  }

  // Show recent operations from log
  showLog(limit = 10) {
    console.log('\n📜 RECENT OPERATIONS\n');
    console.log('=' .repeat(60));
    
    try {
      const logContent = fs.readFileSync(this.logPath, 'utf8');
      const lines = logContent.trim().split('\n');
      const recent = lines.slice(-limit);
      
      recent.forEach(line => {
        try {
          const entry = JSON.parse(line);
          const time = new Date(entry.timestamp).toLocaleTimeString();
          console.log(`\n[${time}] ${entry.operation}`);
          console.log(`  Task: ${entry.taskTitle}`);
          console.log(`  Priority: ${entry.priority}`);
          if (entry.details.queue) {
            console.log(`  Queue: ${entry.details.queue}`);
          }
        } catch (e) {
          // Skip invalid lines
        }
      });
    } catch (error) {
      console.log('No log entries found');
    }
  }
}

// CLI Interface
async function main() {
  const manager = new TaskQueueManager();
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'push':
      // npm run task-queue push "Task title" priority
      const title = args[1] || 'New Task';
      const priority = args[2] || 'medium';
      manager.push({
        content: { title, description: 'Added via CLI' }
      }, priority);
      break;

    case 'pop':
      // npm run task-queue pop [priority] [mode]
      const popPriority = args[1] || null;
      const popMode = args[2] || 'FIFO';
      const task = manager.pop(popPriority, popMode);
      if (task) {
        console.log('\nPopped task:', JSON.stringify(task, null, 2));
      }
      break;

    case 'start':
      // npm run task-queue start taskId
      const startId = args[1];
      if (startId) {
        manager.startWork(startId);
      } else {
        console.log('❌ Please provide task ID');
      }
      break;

    case 'complete':
      // npm run task-queue complete taskId
      const completeId = args[1];
      if (completeId) {
        manager.completeTask(completeId);
      } else {
        console.log('❌ Please provide task ID');
      }
      break;

    case 'list':
      // npm run task-queue list [priority]
      manager.list(args[1]);
      break;

    case 'log':
      // npm run task-queue log [limit]
      manager.showLog(parseInt(args[1]) || 10);
      break;

    default:
      console.log(`
Task Queue Manager

Commands:
  push <title> [priority]  - Add task to queue (priority: critical/high/medium/low)
  pop [priority] [mode]    - Remove task from queue (mode: FIFO/LIFO)
  start <taskId>          - Move task to working queue
  complete <taskId>       - Mark task as completed
  list [priority]         - List tasks in queue
  log [limit]            - Show recent operations

Examples:
  node scripts/task-queue-manager.js push "Fix bug" critical
  node scripts/task-queue-manager.js pop
  node scripts/task-queue-manager.js start task-123
  node scripts/task-queue-manager.js complete task-123
  node scripts/task-queue-manager.js list
  node scripts/task-queue-manager.js log 20
      `);
  }
}

main();