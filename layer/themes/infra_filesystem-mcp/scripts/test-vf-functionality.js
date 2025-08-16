#!/usr/bin/env node

/**
 * Test script for VF (Virtual File V) functionality
 * Demonstrates recursive task queue embedding and simplified display
 */

const fs = require('fs').promises;
const { path } = require('../../infra_external-log-lib/src');

class VFTester {
  constructor() {
    this.rootDir = path.resolve(__dirname, '../../../..');
    this.stats = {
      totalQueues: 0,
      totalItems: 0,
      hierarchyDepth: 0
    };
  }

  /**
   * Simulate reading a .vf.json file with recursive embedding
   */
  async readVF(vfPath, showDetail = false, maxDepth = 5) {
    console.log(`\n📚 Reading Virtual File V: ${vfPath}`);
    console.log('='.repeat(60));
    
    const hierarchy = await this.buildHierarchy(vfPath, 0, showDetail, maxDepth);
    
    if (!hierarchy) {
      console.log('❌ Failed to build hierarchy');
      return null;
    }
    
    // Display the hierarchy
    this.displayHierarchy(hierarchy, showDetail);
    
    // Show statistics
    console.log('\n📊 Statistics:');
    console.log('-'.repeat(30));
    console.log(`Total Queues: ${this.stats.totalQueues}`);
    console.log(`Total Items: ${this.stats.totalItems}`);
    console.log(`Max Depth: ${this.stats.hierarchyDepth}`);
    
    return hierarchy;
  }

  /**
   * Build hierarchy by recursively loading child queues
   */
  async buildHierarchy(vfPath, level, showDetail, maxDepth) {
    if (level >= maxDepth) {
      return null;
    }
    
    // Track max depth
    if (level > this.stats.hierarchyDepth) {
      this.stats.hierarchyDepth = level;
    }
    
    // Convert .vf.json to .vf.json for reading real file
    const realPath = vfPath.replace('.vf.json', '.vf.json');
    
    let queueData;
    try {
      const content = await fs.readFile(realPath, 'utf8');
      queueData = JSON.parse(content);
      this.stats.totalQueues++;
    } catch (error) {
      // Try without full path
      const relativePath = realPath.replace(this.rootDir, '');
      return {
        path: vfPath,
        name: path.basename(path.dirname(vfPath)) || 'root',
        level: level,
        items: [],
        itemCount: 0,
        children: [],
        error: `File not found: ${relativePath}`
      };
    }
    
    // Extract items based on detail level
    const items = showDetail 
      ? this.extractDetailedItems(queueData)
      : this.extractSimplifiedItems(queueData);
    
    this.stats.totalItems += items.length;
    
    // Find child queues
    const children = [];
    if (level < maxDepth - 1) {
      const childPaths = await this.findChildQueues(realPath, queueData);
      for (const childPath of childPaths) {
        const child = await this.buildHierarchy(childPath, level + 1, showDetail, maxDepth);
        if (child && !child.error) {
          children.push(child);
        }
      }
    }
    
    return {
      path: vfPath,
      name: path.basename(path.dirname(vfPath)) || 'root',
      theme: queueData.theme,
      level: level,
      items: items,
      itemCount: items.length,
      children: children,
      metadata: queueData.metadata
    };
  }

  /**
   * Extract simplified items (essential fields only)
   */
  extractSimplifiedItems(queueData) {
    const items = [];
    
    // Handle test-driven format
    if (queueData.queues) {
      for (const [queueType, queue] of Object.entries(queueData.queues)) {
        if (queue.items && Array.isArray(queue.items)) {
          for (const item of queue.items) {
            items.push({
              id: item.id,
              content: item.content,
              type: item.type || queueType,
              root_item_id: item.root_item_id
            });
          }
        }
      }
    }
    
    // Handle priority-based format
    if (queueData.taskQueues) {
      for (const [priority, priorityItems] of Object.entries(queueData.taskQueues)) {
        if (Array.isArray(priorityItems)) {
          for (const item of priorityItems) {
            items.push({
              id: item.id,
              content: typeof item.content === 'object' ? 
                (item.content.title || item.content.description || JSON.stringify(item.content)) : 
                item.content,
              type: item.type || priority,
              root_item_id: item.root_item_id
            });
          }
        }
      }
    }
    
    return items;
  }

  /**
   * Extract detailed items (all fields)
   */
  extractDetailedItems(queueData) {
    const items = [];
    
    // Handle test-driven format
    if (queueData.queues) {
      for (const [queueType, queue] of Object.entries(queueData.queues)) {
        if (queue.items && Array.isArray(queue.items)) {
          items.push(...queue.items.map(item => ({
            ...item,
            queue_type: queueType
          })));
        }
      }
    }
    
    // Handle priority-based format
    if (queueData.taskQueues) {
      for (const [priority, priorityItems] of Object.entries(queueData.taskQueues)) {
        if (Array.isArray(priorityItems)) {
          items.push(...priorityItems.map(item => ({
            ...item,
            priority_level: priority
          })));
        }
      }
    }
    
    return items;
  }

  /**
   * Find child queues
   */
  async findChildQueues(realPath, queueData) {
    const children = [];
    
    // Check if this queue has registered children in its parent field
    if (queueData.parentQueue === realPath.replace(this.rootDir, '')) {
      // This is already a child, don't look for more children unless specified
    }
    
    // Look for theme directories
    const parentDir = path.dirname(realPath);
    const possibleDirs = [
      path.join(parentDir, 'layer', 'themes'),
      path.join(parentDir, 'themes'),
      path.join(parentDir, 'children')
    ];
    
    for (const dir of possibleDirs) {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const childQueuePath = path.join(dir, entry.name, 'TASK_QUEUE.vf.json');
            const childRealPath = childQueuePath.replace('.vf.json', '.vf.json');
            
            // Check if file exists
            try {
              await fs.access(childRealPath);
              
              // Verify parent relationship
              const childContent = await fs.readFile(childRealPath, 'utf8');
              const childData = JSON.parse(childContent);
              
              // Check if this child references our queue as parent
              const ourRelativePath = realPath.replace(this.rootDir, '');
              if (childData.parentQueue && 
                  (childData.parentQueue === ourRelativePath || 
                   childData.parentQueue === '/' + ourRelativePath.replace(/\\/g, '/'))) {
                children.push(childQueuePath);
              }
            } catch {
              // File doesn't exist or can't be parsed
            }
          }
        }
      } catch {
        // Directory doesn't exist
      }
    }
    
    return children;
  }

  /**
   * Display hierarchy in a formatted way
   */
  displayHierarchy(node, showDetail, indent = '') {
    if (!node) return;
    
    // Display node header
    const icon = node.level === 0 ? '🏠' : '📁';
    console.log(`${indent}${icon} ${node.name || 'Unknown'}`);
    
    if (node.theme) {
      console.log(`${indent}   Theme: ${node.theme}`);
    }
    
    if (node.error) {
      console.log(`${indent}   ❌ ${node.error}`);
      return;
    }
    
    console.log(`${indent}   Items: ${node.itemCount}`);
    
    // Display items
    if (node.items.length > 0) {
      const itemsToShow = Math.min(showDetail ? 10 : 3, node.items.length);
      
      for (let i = 0; i < itemsToShow; i++) {
        const item = node.items[i];
        
        if (showDetail) {
          console.log(`${indent}   📄 [${item.type || 'unknown'}] ${item.id}`);
          console.log(`${indent}      Content: ${item.content}`);
          
          if (item.priority) {
            console.log(`${indent}      Priority: ${item.priority}`);
          }
          
          if (item.root_item_id) {
            console.log(`${indent}      Root ID: ${item.root_item_id}`);
          }
          
          if (item.created_at) {
            console.log(`${indent}      Created: ${item.created_at}`);
          }
        } else {
          const content = item.content || 'No content';
          const truncated = content.length > 50 ? content.substring(0, 50) + '...' : content;
          console.log(`${indent}   📄 ${truncated}`);
        }
      }
      
      if (node.items.length > itemsToShow) {
        console.log(`${indent}   ... and ${node.items.length - itemsToShow} more items`);
      }
    }
    
    // Display children
    if (node.children.length > 0) {
      console.log(`${indent}   Children: ${node.children.length}`);
      for (const child of node.children) {
        this.displayHierarchy(child, showDetail, indent + '  ');
      }
    }
  }

  /**
   * Test pop functionality
   */
  testPop(hierarchy) {
    console.log('\n🎯 Testing Pop Functionality');
    console.log('='.repeat(60));
    
    const firstTask = this.findFirstTask(hierarchy);
    
    if (firstTask) {
      console.log('First available task:');
      console.log(`  Queue: ${firstTask.queuePath}`);
      console.log(`  ID: ${firstTask.task.id}`);
      console.log(`  Content: ${firstTask.task.content}`);
      console.log(`  Type: ${firstTask.task.type}`);
      
      if (firstTask.task.root_item_id) {
        console.log(`  Root ID: ${firstTask.task.root_item_id}`);
      }
    } else {
      console.log('No tasks available in hierarchy');
    }
    
    return firstTask;
  }

  /**
   * Find first available task in hierarchy
   */
  findFirstTask(node) {
    if (!node) return null;
    
    // Check current node
    if (node.items && node.items.length > 0) {
      return {
        task: node.items[0],
        queuePath: node.path
      };
    }
    
    // Check children
    if (node.children) {
      for (const child of node.children) {
        const result = this.findFirstTask(child);
        if (result) return result;
      }
    }
    
    return null;
  }
}

// Main execution
async function main() {
  const tester = new VFTester();
  
  console.log('🚀 VF (Virtual File V) Functionality Test');
  console.log('='.repeat(60));
  
  // Test 1: Read root queue with simplified view
  console.log('\n📝 Test 1: Simplified View (default)');
  const rootPath = path.join(tester.rootDir, 'TASK_QUEUE.vf.json');
  const simplifiedHierarchy = await tester.readVF(rootPath, false, 3);
  
  // Test 2: Read with detailed view
  console.log('\n📝 Test 2: Detailed View');
  tester.stats = { totalQueues: 0, totalItems: 0, hierarchyDepth: 0 };
  const detailedHierarchy = await tester.readVF(rootPath, true, 2);
  
  // Test 3: Pop functionality
  if (simplifiedHierarchy) {
    tester.testPop(simplifiedHierarchy);
  }
  
  console.log('\n✅ VF functionality test complete!');
}

// Run tests
main().catch(console.error);