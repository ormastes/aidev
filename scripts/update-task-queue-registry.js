#!/usr/bin/env node

/**
 * Task Queue Registry Updater
 * Discovers all TASK_QUEUE.vf.json files and updates their parent-child relationships
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Color codes for output
const colors = {
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  NC: '\x1b[0m'
};

function print(message, color = 'NC') {
  console.log(`${colors[color]}${message}${colors.NC}`);
}

class TaskQueueRegistry {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.registryPath = path.join(projectRoot, 'TASK_QUEUE_REGISTRY.vf.json');
    this.queueMap = new Map();
    this.registry = this.loadRegistry();
  }

  loadRegistry() {
    if (fs.existsSync(this.registryPath)) {
      try {
        return JSON.parse(fs.readFileSync(this.registryPath, 'utf-8'));
      } catch (error) {
        print(`Warning: Could not parse registry: ${error.message}`, 'YELLOW');
      }
    }
    
    return {
      metadata: {
        version: "1.0.0",
        description: "Registry of all task queues and their parent-child relationships",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        total_queues: 0
      },
      root_queue: {
        path: "/TASK_QUEUE.vf.json",
        name: "root",
        children: [],
        childrenPaths: [],
        level: 0
      },
      theme_queues: {},
      queue_hierarchy: {
        root: {
          path: "/TASK_QUEUE.vf.json",
          children: {}
        }
      },
      orphaned_queues: [],
      registry_config: {
        auto_discover: true,
        validate_parents: true,
        update_on_change: true,
        excluded_paths: ["node_modules", "release", "demo"]
      }
    };
  }

  saveRegistry() {
    this.registry.metadata.updated_at = new Date().toISOString();
    fs.writeFileSync(this.registryPath, JSON.stringify(this.registry, null, 2));
    print(`✓ Registry saved to: ${this.registryPath}`, 'GREEN');
  }

  findTaskQueues() {
    const queues = [];
    
    function searchDir(dir, depth = 0) {
      // Skip excluded directories
      const dirName = path.basename(dir);
      if (['node_modules', 'release', 'demo', '.git', '.jj'].includes(dirName)) {
        return;
      }
      
      // Limit depth to prevent infinite recursion
      if (depth > 10) return;
      
      try {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            searchDir(fullPath, depth + 1);
          } else if (file === 'TASK_QUEUE.vf.json') {
            queues.push(fullPath);
          }
        }
      } catch (error) {
        // Ignore permission errors
      }
    }
    
    searchDir(this.projectRoot);
    return queues;
  }

  extractThemeFromPath(filePath) {
    const relative = path.relative(this.projectRoot, filePath);
    const match = relative.match(/layer[\/\\]themes[\/\\]([^\/\\]+)/);
    return match ? match[1] : undefined;
  }

  determineParentPath(queuePath) {
    const relative = path.relative(this.projectRoot, queuePath);
    
    // Root has no parent
    if (relative === 'TASK_QUEUE.vf.json') {
      return null;
    }
    
    // Check if it's in a theme
    const themeMatch = relative.match(/layer[\/\\]themes[\/\\]([^\/\\]+)/);
    if (themeMatch) {
      const themeName = themeMatch[1];
      const afterTheme = relative.substring(themeMatch.index + themeMatch[0].length);
      
      // If directly in theme root, parent is project root
      if (afterTheme === path.sep + 'TASK_QUEUE.vf.json') {
        return '/TASK_QUEUE.vf.json';
      }
      
      // Check parent directories for queue files
      let currentDir = path.dirname(queuePath);
      while (currentDir !== this.projectRoot) {
        const parentDir = path.dirname(currentDir);
        const parentQueue = path.join(parentDir, 'TASK_QUEUE.vf.json');
        
        if (fs.existsSync(parentQueue)) {
          return '/' + path.relative(this.projectRoot, parentQueue).replace(/\\/g, '/');
        }
        
        currentDir = parentDir;
      }
    }
    
    // Default to root
    return '/TASK_QUEUE.vf.json';
  }

  updateQueueFile(queuePath, parentPath) {
    try {
      const content = JSON.parse(fs.readFileSync(queuePath, 'utf-8'));
      let updated = false;
      
      // Update parent reference
      if (parentPath && content.parentQueue !== parentPath) {
        content.parentQueue = parentPath;
        updated = true;
      }
      
      // Update theme
      const theme = this.extractThemeFromPath(queuePath);
      if (theme && content.theme !== theme) {
        content.theme = theme;
        updated = true;
      }
      
      if (updated) {
        fs.writeFileSync(queuePath, JSON.stringify(content, null, 2));
        print(`  ✓ Updated: ${path.relative(this.projectRoot, queuePath)}`, 'GREEN');
      }
      
      return content;
    } catch (error) {
      print(`  ✗ Failed to update: ${path.relative(this.projectRoot, queuePath)}`, 'RED');
      return null;
    }
  }

  buildHierarchy() {
    print('\n📊 Building Task Queue Hierarchy...', 'BLUE');
    
    const queues = this.findTaskQueues();
    print(`Found ${queues.length} task queue files\n`, 'BLUE');
    
    this.queueMap.clear();
    
    // First pass: Create metadata
    for (const queuePath of queues) {
      const relative = '/' + path.relative(this.projectRoot, queuePath).replace(/\\/g, '/');
      const parentPath = this.determineParentPath(queuePath);
      
      const metadata = {
        path: relative,
        name: path.basename(path.dirname(queuePath)) || 'root',
        theme: this.extractThemeFromPath(queuePath),
        parentPath: parentPath,
        children: [],
        childrenPaths: [],
        level: 0
      };
      
      // Count items
      try {
        const content = JSON.parse(fs.readFileSync(queuePath, 'utf-8'));
        let itemCount = 0;
        
        if (content.queues) {
          for (const queue of Object.values(content.queues)) {
            if (queue.items) {
              itemCount += queue.items.length;
            }
          }
        }
        
        metadata.itemCount = itemCount;
      } catch (error) {
        // Ignore
      }
      
      this.queueMap.set(relative, metadata);
      
      // Update the actual file
      this.updateQueueFile(queuePath, parentPath);
    }
    
    // Second pass: Build relationships
    for (const [queuePath, metadata] of this.queueMap.entries()) {
      if (metadata.parentPath) {
        const parent = this.queueMap.get(metadata.parentPath);
        if (parent) {
          parent.children.push(metadata.name);
          parent.childrenPaths.push(queuePath);
          metadata.parent = parent.name;
          metadata.level = parent.level + 1;
        } else {
          this.registry.orphaned_queues.push(queuePath);
        }
      }
    }
    
    // Update registry
    this.updateRegistry();
  }

  updateRegistry() {
    // Clear and rebuild
    this.registry.theme_queues = {};
    this.registry.orphaned_queues = [];
    
    // Update root
    const rootQueue = this.queueMap.get('/TASK_QUEUE.vf.json');
    if (rootQueue) {
      this.registry.root_queue = rootQueue;
    }
    
    // Organize by theme
    for (const [queuePath, metadata] of this.queueMap.entries()) {
      if (metadata.theme) {
        if (!this.registry.theme_queues[metadata.theme]) {
          this.registry.theme_queues[metadata.theme] = [];
        }
        this.registry.theme_queues[metadata.theme].push(metadata);
      }
    }
    
    // Build hierarchy tree
    this.registry.queue_hierarchy = this.buildTree('/TASK_QUEUE.vf.json');
    
    // Update count
    this.registry.metadata.total_queues = this.queueMap.size;
  }

  buildTree(queuePath) {
    const metadata = this.queueMap.get(queuePath);
    if (!metadata) return null;
    
    const tree = {
      path: metadata.path,
      name: metadata.name,
      theme: metadata.theme,
      items: metadata.itemCount || 0,
      children: {}
    };
    
    for (const childPath of metadata.childrenPaths) {
      const childTree = this.buildTree(childPath);
      if (childTree) {
        const childName = path.basename(path.dirname(childPath.replace(/^\//, '')));
        tree.children[childName] = childTree;
      }
    }
    
    return tree;
  }

  displayHierarchy(node = null, level = 0) {
    if (!node) {
      node = this.registry.queue_hierarchy;
    }
    
    if (!node) return;
    
    const indent = '  '.repeat(level);
    const prefix = level === 0 ? '🏠' : '📁';
    const items = node.items !== undefined ? ` (${node.items} items)` : '';
    
    console.log(`${indent}${prefix} ${node.name}${items}`);
    
    if (node.theme) {
      console.log(`${indent}   Theme: ${node.theme}`);
    }
    
    for (const child of Object.values(node.children || {})) {
      this.displayHierarchy(child, level + 1);
    }
  }

  showSummary() {
    print('\n📈 Summary:', 'BLUE');
    print(`  Total Queues: ${this.registry.metadata.total_queues}`, 'GREEN');
    print(`  Themes: ${Object.keys(this.registry.theme_queues).length}`, 'GREEN');
    
    if (this.registry.orphaned_queues.length > 0) {
      print(`  Orphaned: ${this.registry.orphaned_queues.length}`, 'YELLOW');
      for (const orphan of this.registry.orphaned_queues) {
        print(`    - ${orphan}`, 'YELLOW');
      }
    }
  }
}

// Main execution
function main() {
  const projectRoot = process.cwd();
  
  print('🔄 Task Queue Registry Updater', 'BLUE');
  print('==============================\n', 'BLUE');
  
  const registry = new TaskQueueRegistry(projectRoot);
  
  // Build hierarchy
  registry.buildHierarchy();
  
  // Save registry
  registry.saveRegistry();
  
  // Display hierarchy
  print('\n📊 Task Queue Hierarchy:', 'BLUE');
  print('========================\n', 'BLUE');
  registry.displayHierarchy();
  
  // Show summary
  registry.showSummary();
  
  print('\n✓ Registry update complete!', 'GREEN');
}

// Run if called directly
if (require.main === module) {
  main();
}