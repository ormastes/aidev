/**
 * VFTaskQueueVWrapper - Virtual Task Queue V with recursive embedding
 * 
 * This class provides a virtual view of task queues that:
 * 1. Recursively embeds child task queues into a single virtual file
 * 2. Shows simplified task items (essential fields only)
 * 3. Propagates updates to actual task queue files
 * 4. Supports detail mode for viewing full task information
 */

import * as fs from 'fs/promises';
import { path } from '../../infra_external-log-lib/src';
import { VFFileWrapper, QueryParams, ParsedPath } from './VFFileWrapper';

export interface SimplifiedTaskItem {
  id: string;
  content: string;
  type: string;
  root_item_id?: string;
}

export interface DetailedTaskItem {
  id: string;
  content: string;
  type: string;
  priority?: string;
  created_at?: string;
  updated_at?: string;
  parent?: string;
  root_item_id?: string;
  points?: number;
  cucumber_steps?: string[];
  messages?: any;
  variables?: any;
}

export interface VirtualQueueNode {
  path: string;
  name: string;
  theme?: string;
  level: number;
  items: {
    simplified: SimplifiedTaskItem[];
    count: number;
  };
  children: VirtualQueueNode[];
  metadata?: any;
}

export interface VVirtualQueue {
  version: "1.0.0";
  type: "virtual_embedded";
  generated_at: string;
  root_path: string;
  total_queues: number;
  total_items: number;
  hierarchy: VirtualQueueNode;
  display_mode: "simplified" | "detailed";
  update_map: Map<string, string>; // Maps virtual paths to real file paths
}

export class VFTaskQueueVWrapper extends VFFileWrapper {
  private taskQueueCache: Map<string, any> = new Map();
  private updateMap: Map<string, string> = new Map();

  constructor(basePath: string = '') {
    super(basePath);
  }

  /**
   * Read a virtual task queue file with recursive embedding
   */
  async readVirtualQueue(virtualPath: string, options: { detail?: boolean } = {}): Promise<VVirtualQueue> {
    const { path: cleanPath, params } = await this.parseQueryParams(virtualPath);
    const showDetail = options.detail || params.detail === 'true';
    
    // Determine the root task queue path
    const rootPath = this.resolveRootPath(cleanPath);
    
    // Build the virtual queue hierarchy
    const hierarchy = await this.buildHierarchy(rootPath, 0, showDetail);
    
    // Calculate totals
    const totals = this.calculateTotals(hierarchy);
    
    return {
      version: "1.0.0",
      type: "virtual_embedded",
      generated_at: new Date().toISOString(),
      root_path: rootPath,
      total_queues: totals.queues,
      total_items: totals.items,
      hierarchy: hierarchy,
      display_mode: showDetail ? "detailed" : "simplified",
      update_map: this.updateMap
    };
  }

  /**
   * Build hierarchy by recursively loading child queues
   */
  private async buildHierarchy(
    queuePath: string, 
    level: number, 
    showDetail: boolean
  ): Promise<VirtualQueueNode> {
    // Read the actual task queue file
    const realPath = queuePath.replace('.vf.json', '.vf.json');
    let queueData: any;
    
    try {
      const content = await fs.readFile(realPath, 'utf8');
      queueData = JSON.parse(content);
      this.taskQueueCache.set(realPath, queueData);
      this.updateMap.set(queuePath, realPath);
    } catch (error) {
      return this.createEmptyNode(queuePath, level);
    }
    
    // Extract task items
    const items = showDetail 
      ? this.extractDetailedItems(queueData)
      : this.extractSimplifiedItems(queueData);
    
    // Find and load child queues
    const children = await this.loadChildQueues(queueData, queuePath, level + 1, showDetail);
    
    return {
      path: queuePath,
      name: path.basename(path.dirname(queuePath)) || 'root',
      theme: queueData.theme,
      level: level,
      items: {
        simplified: items,
        count: items.length
      },
      children: children,
      metadata: queueData.metadata
    };
  }

  /**
   * Extract simplified task items (essential fields only)
   */
  private extractSimplifiedItems(queueData: any): SimplifiedTaskItem[] {
    const items: SimplifiedTaskItem[] = [];
    
    // Handle test-driven format
    if (queueData.queues) {
      for (const queue of Object.values(queueData.queues) as any[]) {
        if (queue.items && Array.isArray(queue.items)) {
          for (const item of queue.items) {
            items.push({
              id: item.id,
              content: item.content,
              type: item.type,
              root_item_id: item.root_item_id
            });
          }
        }
      }
    }
    
    // Handle priority-based format
    if (queueData.taskQueues) {
      for (const priorityItems of Object.values(queueData.taskQueues) as any[]) {
        if (Array.isArray(priorityItems)) {
          for (const item of priorityItems) {
            items.push({
              id: item.id,
              content: item.content?.title || item.content,
              type: item.type,
              root_item_id: item.root_item_id
            });
          }
        }
      }
    }
    
    return items;
  }

  /**
   * Extract detailed task items (all fields)
   */
  private extractDetailedItems(queueData: any): DetailedTaskItem[] {
    const items: DetailedTaskItem[] = [];
    
    // Handle test-driven format
    if (queueData.queues) {
      for (const queue of Object.values(queueData.queues) as any[]) {
        if (queue.items && Array.isArray(queue.items)) {
          items.push(...queue.items);
        }
      }
    }
    
    // Handle priority-based format
    if (queueData.taskQueues) {
      for (const priorityItems of Object.values(queueData.taskQueues) as any[]) {
        if (Array.isArray(priorityItems)) {
          items.push(...priorityItems);
        }
      }
    }
    
    return items;
  }

  /**
   * Load child queues based on registry or file system
   */
  private async loadChildQueues(
    parentData: any,
    parentPath: string,
    level: number,
    showDetail: boolean
  ): Promise<VirtualQueueNode[]> {
    const children: VirtualQueueNode[] = [];
    
    // Try to load registry for child references
    const registryPath = path.join(path.dirname(parentPath), '..', 'TASK_QUEUE_REGISTRY.vf.json');
    
    try {
      const registryContent = await fs.readFile(registryPath.replace('.vf.json', '.vf.json'), 'utf8');
      const registry = JSON.parse(registryContent);
      
      // Find children for this queue
      const parentKey = parentPath.replace('.vf.json', '.vf.json');
      if (registry.theme_queues) {
        for (const theme of Object.keys(registry.theme_queues)) {
          const themeQueues = registry.theme_queues[theme];
          for (const queue of themeQueues) {
            if (queue.parentPath === parentKey) {
              const childPath = queue.path.replace('.vf.json', '.vf.json');
              const child = await this.buildHierarchy(childPath, level, showDetail);
              children.push(child);
            }
          }
        }
      }
    } catch (error) {
      // Registry not available, try direct child detection
      const parentDir = path.dirname(parentPath);
      const childrenPaths = await this.findChildQueues(parentDir);
      
      for (const childPath of childrenPaths) {
        const child = await this.buildHierarchy(childPath, level, showDetail);
        children.push(child);
      }
    }
    
    return children;
  }

  /**
   * Find child task queues in subdirectories
   */
  private async findChildQueues(dir: string): Promise<string[]> {
    const children: string[] = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory() && !['node_modules', '.git', 'dist'].includes(entry.name)) {
          const childQueuePath = path.join(dir, entry.name, 'TASK_QUEUE.vf.json');
          const realPath = childQueuePath.replace('.vf.json', '.vf.json');
          
          try {
            await fs.access(realPath);
            children.push(childQueuePath);
          } catch {
            // File doesn't exist, continue
          }
        }
      }
    } catch (error) {
      // Directory read error
    }
    
    return children;
  }

  /**
   * Update task in virtual queue and propagate to real file
   */
  async updateVirtualTask(
    virtualPath: string,
    taskId: string,
    updates: Partial<DetailedTaskItem>
  ): Promise<void> {
    const realPath = this.updateMap.get(virtualPath) || virtualPath.replace('.vf.json', '.vf.json');
    
    // Read the real file
    const content = await fs.readFile(realPath, 'utf8');
    const queueData = JSON.parse(content);
    
    // Find and update the task
    let updated = false;
    
    // Handle test-driven format
    if (queueData.queues) {
      for (const queue of Object.values(queueData.queues) as any[]) {
        if (queue.items && Array.isArray(queue.items)) {
          const itemIndex = queue.items.findIndex((item: any) => item.id === taskId);
          if (itemIndex !== -1) {
            queue.items[itemIndex] = { ...queue.items[itemIndex], ...updates };
            updated = true;
            break;
          }
        }
      }
    }
    
    // Handle priority-based format
    if (!updated && queueData.taskQueues) {
      for (const priorityItems of Object.values(queueData.taskQueues) as any[]) {
        if (Array.isArray(priorityItems)) {
          const itemIndex = priorityItems.findIndex((item: any) => item.id === taskId);
          if (itemIndex !== -1) {
            priorityItems[itemIndex] = { ...priorityItems[itemIndex], ...updates };
            updated = true;
            break;
          }
        }
      }
    }
    
    if (updated) {
      // Update metadata
      queueData.metadata = queueData.metadata || {};
      queueData.metadata.updated_at = new Date().toISOString();
      
      // Write back to real file
      await fs.writeFile(realPath, JSON.stringify(queueData, null, 2));
    } else {
      throw new Error(`Task ${taskId} not found in ${virtualPath}`);
    }
  }

  /**
   * Pop task from virtual queue (simplified display)
   */
  async popTask(virtualPath: string, options: { detail?: boolean } = {}): Promise<SimplifiedTaskItem | DetailedTaskItem> {
    const virtualQueue = await this.readVirtualQueue(virtualPath, options);
    
    // Find the first non-empty queue
    const firstTask = this.findFirstTask(virtualQueue.hierarchy, options.detail || false);
    
    if (!firstTask) {
      throw new Error('No tasks available in queue');
    }
    
    // Remove the task from the real file
    await this.removeTask(firstTask.path, firstTask.task.id);
    
    return firstTask.task;
  }

  /**
   * Find first available task in hierarchy
   */
  private findFirstTask(
    node: VirtualQueueNode,
    showDetail: boolean
  ): { task: any; path: string } | null {
    // Check current node
    if (node.items.count > 0) {
      const task = node.items.simplified[0];
      return { task, path: node.path };
    }
    
    // Check children
    for (const child of node.children) {
      const result = this.findFirstTask(child, showDetail);
      if (result) return result;
    }
    
    return null;
  }

  /**
   * Remove task from real file
   */
  private async removeTask(virtualPath: string, taskId: string): Promise<void> {
    const realPath = this.updateMap.get(virtualPath) || virtualPath.replace('.vf.json', '.vf.json');
    
    // Read the real file
    const content = await fs.readFile(realPath, 'utf8');
    const queueData = JSON.parse(content);
    
    // Remove the task
    let removed = false;
    
    // Handle test-driven format
    if (queueData.queues) {
      for (const queue of Object.values(queueData.queues) as any[]) {
        if (queue.items && Array.isArray(queue.items)) {
          const itemIndex = queue.items.findIndex((item: any) => item.id === taskId);
          if (itemIndex !== -1) {
            queue.items.splice(itemIndex, 1);
            removed = true;
            break;
          }
        }
      }
    }
    
    // Update metadata
    if (removed) {
      queueData.metadata = queueData.metadata || {};
      queueData.metadata.updated_at = new Date().toISOString();
      queueData.metadata.total_items = (queueData.metadata.total_items || 0) - 1;
      
      // Write back to real file
      await fs.writeFile(realPath, JSON.stringify(queueData, null, 2));
    }
  }

  /**
   * Calculate totals for the hierarchy
   */
  private calculateTotals(node: VirtualQueueNode): { queues: number; items: number } {
    let queues = 1;
    let items = node.items.count;
    
    for (const child of node.children) {
      const childTotals = this.calculateTotals(child);
      queues += childTotals.queues;
      items += childTotals.items;
    }
    
    return { queues, items };
  }

  /**
   * Create empty node for missing queues
   */
  private createEmptyNode(queuePath: string, level: number): VirtualQueueNode {
    return {
      path: queuePath,
      name: path.basename(path.dirname(queuePath)) || 'unknown',
      level: level,
      items: {
        simplified: [],
        count: 0
      },
      children: []
    };
  }

  /**
   * Resolve root path from virtual path
   */
  private resolveRootPath(virtualPath: string): string {
    if (virtualPath.endsWith('.vf.json')) {
      return virtualPath;
    }
    
    // Default to root TASK_QUEUE.vf.json
    return path.join(this.basePath, 'TASK_QUEUE.vf.json');
  }
}