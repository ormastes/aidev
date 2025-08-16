/**
 * VfJsonWatcher
 * 
 * Monitors changes to vf.json files (TASK_QUEUE, FEATURE, NAME_ID)
 * and logs them using EventLogger
 */

import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { EventLogger, LogEventType } from './EventLogger';
import {
  extractTaskEssentials,
  extractFeatureEssentials,
  extractNameIdEssentials,
  formatEssentialInfo
} from '../utils/essential-info-extractor';

export interface VfJsonFile {
  type: 'TASK_QUEUE' | 'FEATURE' | 'NAME_ID';
  path: string;
  content: any;
  lastModified: Date;
  checksum?: string;
}

export interface VfJsonChange {
  file: VfJsonFile;
  changeType: 'created' | 'updated' | 'deleted';
  changes?: any;
  previousContent?: any;
  newContent?: any;
}

export interface VfJsonWatcherConfig {
  watchPaths?: string[];
  pollInterval?: number; // ms
  recursive?: boolean;
  logger?: EventLogger;
  detectChanges?: boolean;
}

export class VfJsonWatcher extends EventEmitter {
  private config: Required<VfJsonWatcherConfig>;
  private logger: EventLogger;
  private watchedFiles: Map<string, VfJsonFile> = new Map();
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private pollTimer: NodeJS.Timeout | null = null;
  
  constructor(config?: VfJsonWatcherConfig) {
    super();
    
    this.config = {
      watchPaths: [process.cwd()],
      pollInterval: 5000, // 5 seconds
      recursive: true,
      logger: config?.logger || new EventLogger(),
      detectChanges: true,
      ...config
    };
    
    this.logger = this.config.logger;
  }
  
  /**
   * Start watching for vf.json changes
   */
  async start(): Promise<void> {
    // Find all vf.json files
    await this.scanForVfJsonFiles();
    
    // Setup file watchers
    this.setupWatchers();
    
    // Setup polling as backup
    this.setupPolling();
    
    this.logger.logEvent(
      LogEventType.EVENT_CUSTOM,
      'VfJsonWatcher started',
      { watchPaths: this.config.watchPaths }
    );
  }
  
  /**
   * Stop watching
   */
  stop(): void {
    // Clear watchers
    for (const watcher of this.watchers.values()) {
      watcher.close();
    }
    this.watchers.clear();
    
    // Clear polling
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    
    this.logger.logEvent(
      LogEventType.EVENT_CUSTOM,
      'VfJsonWatcher stopped'
    );
  }
  
  /**
   * Scan for vf.json files
   */
  private async scanForVfJsonFiles(): Promise<void> {
    const vfJsonPatterns = [
      'TASK_QUEUE.vf.json',
      'FEATURE.vf.json',
      'NAME_ID.vf.json'
    ];
    
    for (const watchPath of this.config.watchPaths) {
      await this.scanDirectory(watchPath, vfJsonPatterns);
    }
  }
  
  /**
   * Recursively scan directory for vf.json files
   */
  private async scanDirectory(dir: string, patterns: string[]): Promise<void> {
    try {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        
        try {
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory() && this.config.recursive) {
            // Skip node_modules and .git
            if (item !== 'node_modules' && item !== '.git') {
              await this.scanDirectory(fullPath, patterns);
            }
          } else if (stat.isFile() && patterns.some(p => item === p)) {
            // Found a vf.json file
            await this.addWatchedFile(fullPath);
          }
        } catch (error) {
          // Skip inaccessible items
        }
      }
    } catch (error) {
      console.error(`Failed to scan directory ${dir}:`, error);
    }
  }
  
  /**
   * Add a file to watch list
   */
  private async addWatchedFile(filePath: string): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(content);
      const stat = fs.statSync(filePath);
      
      const fileName = path.basename(filePath);
      let type: VfJsonFile['type'];
      
      if (fileName === 'TASK_QUEUE.vf.json') {
        type = 'TASK_QUEUE';
      } else if (fileName === 'FEATURE.vf.json') {
        type = 'FEATURE';
      } else if (fileName === 'NAME_ID.vf.json') {
        type = 'NAME_ID';
      } else {
        return; // Skip unknown files
      }
      
      const file: VfJsonFile = {
        type,
        path: filePath,
        content: parsed,
        lastModified: stat.mtime,
        checksum: this.calculateChecksum(content)
      };
      
      this.watchedFiles.set(filePath, file);
      
      // Log discovery
      this.logger.logEvent(
        LogEventType.EVENT_CUSTOM,
        `Discovered ${type} file`,
        { path: filePath }
      );
      
    } catch (error) {
      console.error(`Failed to add watched file ${filePath}:`, error);
    }
  }
  
  /**
   * Setup file watchers
   */
  private setupWatchers(): void {
    for (const [filePath, file] of this.watchedFiles) {
      try {
        const watcher = fs.watch(filePath, (eventType) => {
          this.handleFileChange(filePath, eventType);
        });
        
        this.watchers.set(filePath, watcher);
      } catch (error) {
        console.error(`Failed to watch ${filePath}:`, error);
      }
    }
  }
  
  /**
   * Setup polling as backup
   */
  private setupPolling(): void {
    this.pollTimer = setInterval(() => {
      this.checkAllFiles();
    }, this.config.pollInterval);
  }
  
  /**
   * Handle file change event
   */
  private async handleFileChange(filePath: string, eventType: string): Promise<void> {
    const file = this.watchedFiles.get(filePath);
    if (!file) return;
    
    try {
      if (!fs.existsSync(filePath)) {
        // File deleted
        this.handleFileDeletion(file);
        return;
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(content);
      const stat = fs.statSync(filePath);
      const newChecksum = this.calculateChecksum(content);
      
      // Check if content actually changed
      if (newChecksum === file.checksum) {
        return; // No actual change
      }
      
      // Detect specific changes
      const changes = this.detectChanges(file.type, file.content, parsed);
      
      // Update stored file
      const previousContent = file.content;
      file.content = parsed;
      file.lastModified = stat.mtime;
      file.checksum = newChecksum;
      
      // Log the change
      this.logVfJsonChange(file, 'updated', changes, previousContent, parsed);
      
      // Emit change event
      this.emit('change', {
        file,
        changeType: 'updated',
        changes,
        previousContent,
        newContent: parsed
      } as VfJsonChange);
      
    } catch (error) {
      console.error(`Error handling file change for ${filePath}:`, error);
    }
  }
  
  /**
   * Handle file deletion
   */
  private handleFileDeletion(file: VfJsonFile): void {
    this.watchedFiles.delete(file.path);
    this.watchers.get(file.path)?.close();
    this.watchers.delete(file.path);
    
    this.logVfJsonChange(file, 'deleted');
    
    this.emit('change', {
      file,
      changeType: 'deleted'
    } as VfJsonChange);
  }
  
  /**
   * Check all files for changes (polling)
   */
  private async checkAllFiles(): Promise<void> {
    // Re-scan for new files
    await this.scanForVfJsonFiles();
    
    // Check existing files
    for (const [filePath, file] of this.watchedFiles) {
      try {
        if (!fs.existsSync(filePath)) {
          this.handleFileDeletion(file);
          continue;
        }
        
        const stat = fs.statSync(filePath);
        if (stat.mtime > file.lastModified) {
          await this.handleFileChange(filePath, 'change');
        }
      } catch (error) {
        // Skip errors
      }
    }
  }
  
  /**
   * Detect specific changes in vf.json content
   */
  private detectChanges(type: VfJsonFile['type'], oldContent: any, newContent: any): any {
    const changes: any = {};
    
    switch (type) {
      case 'TASK_QUEUE':
        changes.tasks = this.detectTaskChanges(oldContent.tasks || [], newContent.tasks || []);
        break;
        
      case 'FEATURE':
        changes.features = this.detectFeatureChanges(oldContent.features || {}, newContent.features || {});
        break;
        
      case 'NAME_ID':
        changes.entities = this.detectEntityChanges(oldContent.entities || {}, newContent.entities || {});
        break;
    }
    
    return changes;
  }
  
  /**
   * Detect task changes
   */
  private detectTaskChanges(oldTasks: any[], newTasks: any[]): any {
    const changes = {
      added: [] as any[],
      updated: [] as any[],
      deleted: [] as any[],
      completed: [] as any[]
    };
    
    const oldMap = new Map(oldTasks.map(t => [t.id, t]));
    const newMap = new Map(newTasks.map(t => [t.id, t]));
    
    // Find added and updated
    for (const [id, task] of newMap) {
      const oldTask = oldMap.get(id);
      if (!oldTask) {
        changes.added.push(task);
      } else if (JSON.stringify(oldTask) !== JSON.stringify(task)) {
        changes.updated.push(task);
        
        // Check if completed
        if (oldTask.status !== 'completed' && task.status === 'completed') {
          changes.completed.push(task);
        }
      }
    }
    
    // Find deleted
    for (const [id, task] of oldMap) {
      if (!newMap.has(id)) {
        changes.deleted.push(task);
      }
    }
    
    return changes;
  }
  
  /**
   * Detect feature changes
   */
  private detectFeatureChanges(oldFeatures: any, newFeatures: any): any {
    const changes = {
      added: [] as any[],
      updated: [] as any[],
      deleted: [] as any[],
      completed: [] as any[]
    };
    
    // Compare feature collections
    for (const key in newFeatures) {
      if (!oldFeatures[key]) {
        changes.added.push(...(Array.isArray(newFeatures[key]) ? newFeatures[key] : [newFeatures[key]]));
      } else {
        // Check for updates within the collection
        const oldItems = Array.isArray(oldFeatures[key]) ? oldFeatures[key] : [oldFeatures[key]];
        const newItems = Array.isArray(newFeatures[key]) ? newFeatures[key] : [newFeatures[key]];
        
        const oldMap = new Map(oldItems.map((f: any) => [f.id, f]));
        const newMap = new Map(newItems.map((f: any) => [f.id, f]));
        
        for (const [id, feature] of newMap) {
          const oldFeature = oldMap.get(id);
          if (!oldFeature) {
            changes.added.push(feature);
          } else if (JSON.stringify(oldFeature) !== JSON.stringify(feature)) {
            changes.updated.push(feature);
            
            if (oldFeature.data?.status !== 'completed' && feature.data?.status === 'completed') {
              changes.completed.push(feature);
            }
          }
        }
        
        for (const [id, feature] of oldMap) {
          if (!newMap.has(id)) {
            changes.deleted.push(feature);
          }
        }
      }
    }
    
    return changes;
  }
  
  /**
   * Detect entity changes in NAME_ID
   */
  private detectEntityChanges(oldEntities: any, newEntities: any): any {
    const changes = {
      added: {} as any,
      updated: {} as any,
      deleted: {} as any
    };
    
    // Find added and updated
    for (const key in newEntities) {
      if (!oldEntities[key]) {
        changes.added[key] = newEntities[key];
      } else if (JSON.stringify(oldEntities[key]) !== JSON.stringify(newEntities[key])) {
        changes.updated[key] = newEntities[key];
      }
    }
    
    // Find deleted
    for (const key in oldEntities) {
      if (!newEntities[key]) {
        changes.deleted[key] = oldEntities[key];
      }
    }
    
    return changes;
  }
  
  /**
   * Log vf.json change
   */
  private logVfJsonChange(
    file: VfJsonFile,
    changeType: 'created' | 'updated' | 'deleted',
    changes?: any,
    previousContent?: any,
    newContent?: any
  ): void {
    switch (file.type) {
      case 'TASK_QUEUE':
        // Log task changes
        if (changes?.tasks) {
          for (const task of changes.tasks.added || []) {
            this.logger.logTaskQueueChange('created', task.id, task);
          }
          for (const task of changes.tasks.updated || []) {
            this.logger.logTaskQueueChange('updated', task.id, task);
          }
          for (const task of changes.tasks.completed || []) {
            this.logger.logTaskQueueChange('completed', task.id, task);
          }
          for (const task of changes.tasks.deleted || []) {
            this.logger.logTaskQueueChange('deleted', task.id, task);
          }
        }
        break;
        
      case 'FEATURE':
        // Log feature changes
        if (changes?.features) {
          for (const feature of changes.features.added || []) {
            this.logger.logFeatureChange('created', feature.id, feature);
          }
          for (const feature of changes.features.updated || []) {
            this.logger.logFeatureChange('updated', feature.id, feature);
          }
          for (const feature of changes.features.completed || []) {
            this.logger.logFeatureChange('completed', feature.id, feature);
          }
          for (const feature of changes.features.deleted || []) {
            this.logger.logFeatureChange('deleted', feature.id, feature);
          }
        }
        break;
        
      case 'NAME_ID':
        // Log entity changes
        if (changes?.entities) {
          for (const [id, entity] of Object.entries(changes.entities.added || {})) {
            this.logger.logNameIdChange('created', id, entity);
          }
          for (const [id, entity] of Object.entries(changes.entities.updated || {})) {
            this.logger.logNameIdChange('updated', id, entity);
          }
          for (const [id, entity] of Object.entries(changes.entities.deleted || {})) {
            this.logger.logNameIdChange('deleted', id, entity);
          }
        }
        break;
    }
  }
  
  /**
   * Calculate checksum for content
   */
  private calculateChecksum(content: string): string {
    // Simple checksum using content length and first/last chars
    return `${content.length}-${content.charCodeAt(0)}-${content.charCodeAt(content.length - 1)}`;
  }
  
  /**
   * Get watched files
   */
  getWatchedFiles(): VfJsonFile[] {
    return Array.from(this.watchedFiles.values());
  }
}

export default VfJsonWatcher;