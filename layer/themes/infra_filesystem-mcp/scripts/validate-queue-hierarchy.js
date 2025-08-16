#!/usr/bin/env node

const { fs } = require('../../infra_external-log-lib/src');
const { path } = require('../../infra_external-log-lib/src');

class QueueHierarchyValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.queues = new Map();
    this.rootDir = path.resolve(__dirname, '../../../..');
  }

  findTaskQueues(dir = this.rootDir, relativePath = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = relativePath ? path.join(relativePath, entry.name) : entry.name;
      
      // Skip certain directories
      if (entry.isDirectory()) {
        if (['node_modules', '.git', '.jj', 'dist', 'build', 'coverage', 'release', 'demo'].includes(entry.name)) {
          continue;
        }
        this.findTaskQueues(fullPath, relPath);
      } else if (entry.name === 'TASK_QUEUE.vf.json') {
        try {
          const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          const queuePath = '/' + relPath.replace(/\\/g, '/');
          this.queues.set(queuePath, {
            path: queuePath,
            fullPath: fullPath,
            parentQueue: content.parentQueue || null,
            theme: content.theme || null,
            hasItems: this.countItems(content) > 0
          });
        } catch (e) {
          this.errors.push(`Failed to parse ${relPath}: ${e.message}`);
        }
      }
    }
  }

  countItems(queue) {
    let count = 0;
    if (queue.queues) {
      for (const queueType of Object.values(queue.queues)) {
        if (queueType.items) {
          count += queueType.items.length;
        }
      }
    }
    if (queue.taskQueues) {
      for (const priority of Object.values(queue.taskQueues)) {
        if (Array.isArray(priority)) {
          count += priority.length;
        }
      }
    }
    return count;
  }

  validateHierarchy() {
    // Check that each queue's parent exists
    for (const [queuePath, queue] of this.queues) {
      if (queue.parentQueue) {
        if (!this.queues.has(queue.parentQueue)) {
          this.errors.push(`Queue ${queuePath} references non-existent parent: ${queue.parentQueue}`);
        } else {
          // Validate parent-child relationship is bidirectional
          const parent = this.queues.get(queue.parentQueue);
          const expectedParentDir = path.dirname(queuePath);
          const actualParentDir = path.dirname(queue.parentQueue);
          
          // Check if the parent is in a reasonable location
          if (!queuePath.startsWith(path.dirname(queue.parentQueue)) && 
              queue.parentQueue !== '/TASK_QUEUE.vf.json') {
            this.warnings.push(`Queue ${queuePath} has parent ${queue.parentQueue} in unrelated directory`);
          }
        }
      } else if (queuePath !== '/TASK_QUEUE.vf.json') {
        this.warnings.push(`Queue ${queuePath} has no parent reference`);
      }
    }

    // Check for orphaned queues (no parent and not root)
    for (const [queuePath, queue] of this.queues) {
      if (!queue.parentQueue && queuePath !== '/TASK_QUEUE.vf.json') {
        this.warnings.push(`Orphaned queue without parent: ${queuePath}`);
      }
    }

    // Check for circular references
    for (const [queuePath, queue] of this.queues) {
      const visited = new Set();
      let current = queuePath;
      
      while (current) {
        if (visited.has(current)) {
          this.errors.push(`Circular reference detected starting from ${queuePath}`);
          break;
        }
        visited.add(current);
        
        const currentQueue = this.queues.get(current);
        if (!currentQueue) break;
        current = currentQueue.parentQueue;
      }
    }
  }

  generateReport() {
    console.log('Task Queue Hierarchy Validation Report');
    console.log('=======================================\n');
    
    console.log(`Total queues found: ${this.queues.size}`);
    console.log(`Errors: ${this.errors.length}`);
    console.log(`Warnings: ${this.warnings.length}\n`);
    
    if (this.errors.length > 0) {
      console.log('ERRORS:');
      console.log('-------');
      this.errors.forEach(error => console.log(`  ❌ ${error}`));
      console.log();
    }
    
    if (this.warnings.length > 0) {
      console.log('WARNINGS:');
      console.log('---------');
      this.warnings.forEach(warning => console.log(`  ⚠️  ${warning}`));
      console.log();
    }
    
    // Show hierarchy tree
    console.log('HIERARCHY STRUCTURE:');
    console.log('--------------------');
    this.printHierarchy();
    
    // Summary statistics
    console.log('\nSTATISTICS:');
    console.log('-----------');
    const rootQueues = Array.from(this.queues.values()).filter(q => !q.parentQueue);
    const leafQueues = Array.from(this.queues.values()).filter(q => {
      return !Array.from(this.queues.values()).some(other => other.parentQueue === q.path);
    });
    
    console.log(`  Root queues: ${rootQueues.length}`);
    console.log(`  Leaf queues: ${leafQueues.length}`);
    console.log(`  Queues with items: ${Array.from(this.queues.values()).filter(q => q.hasItems).length}`);
    console.log(`  Empty queues: ${Array.from(this.queues.values()).filter(q => !q.hasItems).length}`);
    
    if (this.errors.length === 0) {
      console.log('\n✅ All parent-child relationships are valid!');
    } else {
      console.log('\n❌ Validation failed. Please fix the errors above.');
      process.exit(1);
    }
  }

  printHierarchy() {
    const root = this.queues.get('/TASK_QUEUE.vf.json');
    if (root) {
      this.printQueue('/TASK_QUEUE.vf.json', 0, new Set());
    } else {
      console.log('  No root TASK_QUEUE.vf.json found');
    }
  }

  printQueue(queuePath, indent, visited) {
    if (visited.has(queuePath)) {
      console.log(' '.repeat(indent * 2) + `└─ [CIRCULAR: ${queuePath}]`);
      return;
    }
    
    visited.add(queuePath);
    const queue = this.queues.get(queuePath);
    if (!queue) return;
    
    const prefix = indent === 0 ? '' : '  '.repeat(indent - 1) + '└─ ';
    const itemCount = queue.hasItems ? ` (has items)` : ' (empty)';
    const theme = queue.theme ? ` [${queue.theme}]` : '';
    
    console.log(prefix + path.basename(path.dirname(queuePath) || 'root') + '/TASK_QUEUE.vf.json' + theme + itemCount);
    
    // Find children
    const children = Array.from(this.queues.entries())
      .filter(([_, q]) => q.parentQueue === queuePath)
      .map(([p, _]) => p);
    
    children.forEach(child => {
      this.printQueue(child, indent + 1, new Set(visited));
    });
  }

  run() {
    console.log('Scanning for task queues...');
    this.findTaskQueues();
    
    console.log(`Found ${this.queues.size} task queue files\n`);
    
    this.validateHierarchy();
    this.generateReport();
  }
}

// Run the validator
const validator = new QueueHierarchyValidator();
validator.run();