/**
 * VfJsonWatcher
 *
 * Monitors changes to vf.json files (TASK_QUEUE, FEATURE, NAME_ID)
 * and logs them using EventLogger
 */
import { EventEmitter } from 'events';
import { EventLogger } from './EventLogger';
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
    pollInterval?: number;
    recursive?: boolean;
    logger?: EventLogger;
    detectChanges?: boolean;
}
export declare class VfJsonWatcher extends EventEmitter {
    private config;
    private logger;
    private watchedFiles;
    private watchers;
    private pollTimer;
    constructor(config?: VfJsonWatcherConfig);
    /**
     * Start watching for vf.json changes
     */
    start(): Promise<void>;
    /**
     * Stop watching
     */
    stop(): void;
    /**
     * Scan for vf.json files
     */
    private scanForVfJsonFiles;
    /**
     * Recursively scan directory for vf.json files
     */
    private scanDirectory;
    /**
     * Add a file to watch list
     */
    private addWatchedFile;
    /**
     * Setup file watchers
     */
    private setupWatchers;
    /**
     * Setup polling as backup
     */
    private setupPolling;
    /**
     * Handle file change event
     */
    private handleFileChange;
    /**
     * Handle file deletion
     */
    private handleFileDeletion;
    /**
     * Check all files for changes (polling)
     */
    private checkAllFiles;
    /**
     * Detect specific changes in vf.json content
     */
    private detectChanges;
    /**
     * Detect task changes
     */
    private detectTaskChanges;
    /**
     * Detect feature changes
     */
    private detectFeatureChanges;
    /**
     * Detect entity changes in NAME_ID
     */
    private detectEntityChanges;
    /**
     * Log vf.json change
     */
    private logVfJsonChange;
    /**
     * Calculate checksum for content
     */
    private calculateChecksum;
    /**
     * Get watched files
     */
    getWatchedFiles(): VfJsonFile[];
}
export default VfJsonWatcher;
//# sourceMappingURL=VfJsonWatcher.d.ts.map