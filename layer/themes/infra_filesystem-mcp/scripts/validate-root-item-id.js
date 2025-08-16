#!/usr/bin/env node

const { fs } = require('../../infra_external-log-lib/src');
const { path } = require('../../infra_external-log-lib/src');

/**
 * Validates root_item_id field in task queue files
 */
class RootItemIdValidator {
  constructor() {
    this.rootDir = path.resolve(__dirname, '../../../..');
    this.errors = [];
    this.warnings = [];
    this.stats = {
      totalFiles: 0,
      filesWithRootId: 0,
      itemsWithRootId: 0,
      itemsWithoutRootId: 0,
      uniqueRootIds: new Set()
    };
  }

  findTaskQueues(dir = this.rootDir, relativePath = '') {
    const queues = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = relativePath ? path.join(relativePath, entry.name) : entry.name;
      
      if (entry.isDirectory()) {
        if (['node_modules', '.git', '.jj', 'dist', 'build', 'coverage', 'release', 'demo'].includes(entry.name)) {
          continue;
        }
        queues.push(...this.findTaskQueues(fullPath, relPath));
      } else if (entry.name === 'TASK_QUEUE.vf.json') {
        queues.push({
          path: fullPath,
          relativePath: relPath
        });
      }
    }
    
    return queues;
  }

  validateQueue(queueFile) {
    try {
      const content = JSON.parse(fs.readFileSync(queueFile.path, 'utf8'));
      let hasRootIds = false;
      
      // Check test-driven format queues
      if (content.queues) {
        for (const [queueType, queue] of Object.entries(content.queues)) {
          if (queue.items && Array.isArray(queue.items)) {
            for (const item of queue.items) {
              if (item.root_item_id) {
                hasRootIds = true;
                this.stats.itemsWithRootId++;
                this.stats.uniqueRootIds.add(item.root_item_id);
                
                // Validate root_item_id format
                if (!this.validateRootIdFormat(item.root_item_id)) {
                  this.warnings.push(`Invalid root_item_id format in ${queueFile.relativePath}: ${item.root_item_id}`);
                }
              } else if (item.content && !['empty', 'placeholder'].includes(item.type)) {
                this.stats.itemsWithoutRootId++;
                this.warnings.push(`Missing root_item_id in ${queueFile.relativePath} - ${queueType}[${item.id}]: ${item.content.substring(0, 50)}...`);
              }
            }
          }
        }
      }
      
      // Check priority-based format (legacy)
      if (content.taskQueues) {
        for (const [priority, items] of Object.entries(content.taskQueues)) {
          if (Array.isArray(items)) {
            for (const item of items) {
              if (item.root_item_id) {
                hasRootIds = true;
                this.stats.itemsWithRootId++;
                this.stats.uniqueRootIds.add(item.root_item_id);
                
                if (!this.validateRootIdFormat(item.root_item_id)) {
                  this.warnings.push(`Invalid root_item_id format in ${queueFile.relativePath}: ${item.root_item_id}`);
                }
              } else if (item.content) {
                this.stats.itemsWithoutRootId++;
              }
            }
          }
        }
      }
      
      if (hasRootIds) {
        this.stats.filesWithRootId++;
      }
      
    } catch (error) {
      this.errors.push(`Failed to parse ${queueFile.relativePath}: ${error.message}`);
    }
  }

  validateRootIdFormat(rootId) {
    // Expected format: category_type__level__feature_name
    // Examples: 
    // - infra_epic__feature__log_aggregation_service
    // - test_as_manual__theme__navigation_search
    // - check_epic__feature__embedded_web_apps_testing
    
    const pattern = /^[a-z_]+__[a-z_]+__[a-z_]+$/;
    return pattern.test(rootId);
  }

  generateReport() {
    console.log('Root Item ID Validation Report');
    console.log('===============================\n');
    
    console.log('STATISTICS:');
    console.log('-----------');
    console.log(`Total task queue files: ${this.stats.totalFiles}`);
    console.log(`Files with root_item_id: ${this.stats.filesWithRootId}`);
    console.log(`Items with root_item_id: ${this.stats.itemsWithRootId}`);
    console.log(`Items without root_item_id: ${this.stats.itemsWithoutRootId}`);
    console.log(`Unique root IDs: ${this.stats.uniqueRootIds.size}\n`);
    
    if (this.errors.length > 0) {
      console.log('ERRORS:');
      console.log('-------');
      this.errors.forEach(error => console.log(`  ❌ ${error}`));
      console.log();
    }
    
    if (this.warnings.length > 0) {
      console.log('WARNINGS:');
      console.log('---------');
      // Only show first 10 warnings to avoid clutter
      const warningsToShow = this.warnings.slice(0, 10);
      warningsToShow.forEach(warning => console.log(`  ⚠️  ${warning}`));
      
      if (this.warnings.length > 10) {
        console.log(`  ... and ${this.warnings.length - 10} more warnings`);
      }
      console.log();
    }
    
    console.log('ROOT ID CATEGORIES:');
    console.log('-------------------');
    const categories = {};
    for (const rootId of this.stats.uniqueRootIds) {
      const category = rootId.split('__')[0];
      categories[category] = (categories[category] || 0) + 1;
    }
    
    for (const [category, count] of Object.entries(categories)) {
      console.log(`  ${category}: ${count} items`);
    }
    console.log();
    
    if (this.stats.itemsWithRootId > 0) {
      console.log(`✅ Root item ID field is being used in ${this.stats.filesWithRootId} files`);
    } else {
      console.log('⚠️  No items found with root_item_id field');
    }
    
    if (this.stats.itemsWithoutRootId > 0) {
      console.log(`⚠️  ${this.stats.itemsWithoutRootId} items are missing root_item_id`);
    }
  }

  run() {
    console.log('Scanning for task queue files...\n');
    
    const queues = this.findTaskQueues();
    this.stats.totalFiles = queues.length;
    
    for (const queue of queues) {
      this.validateQueue(queue);
    }
    
    this.generateReport();
  }
}

// Run the validator
const validator = new RootItemIdValidator();
validator.run();