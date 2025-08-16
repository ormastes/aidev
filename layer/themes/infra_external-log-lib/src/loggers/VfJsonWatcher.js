"use strict";
/**
 * VfJsonWatcher
 *
 * Monitors changes to vf.json files (TASK_QUEUE, FEATURE, NAME_ID)
 * and logs them using EventLogger
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.VfJsonWatcher = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const events_1 = require("events");
const EventLogger_1 = require("./EventLogger");
class VfJsonWatcher extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.watchedFiles = new Map();
        this.watchers = new Map();
        this.pollTimer = null;
        this.config = {
            watchPaths: [process.cwd()],
            pollInterval: 5000, // 5 seconds
            recursive: true,
            logger: config?.logger || new EventLogger_1.EventLogger(),
            detectChanges: true,
            ...config
        };
        this.logger = this.config.logger;
    }
    /**
     * Start watching for vf.json changes
     */
    async start() {
        // Find all vf.json files
        await this.scanForVfJsonFiles();
        // Setup file watchers
        this.setupWatchers();
        // Setup polling as backup
        this.setupPolling();
        this.logger.logEvent(EventLogger_1.LogEventType.EVENT_CUSTOM, 'VfJsonWatcher started', { watchPaths: this.config.watchPaths });
    }
    /**
     * Stop watching
     */
    stop() {
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
        this.logger.logEvent(EventLogger_1.LogEventType.EVENT_CUSTOM, 'VfJsonWatcher stopped');
    }
    /**
     * Scan for vf.json files
     */
    async scanForVfJsonFiles() {
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
    async scanDirectory(dir, patterns) {
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
                    }
                    else if (stat.isFile() && patterns.some(p => item === p)) {
                        // Found a vf.json file
                        await this.addWatchedFile(fullPath);
                    }
                }
                catch (error) {
                    // Skip inaccessible items
                }
            }
        }
        catch (error) {
            console.error(`Failed to scan directory ${dir}:`, error);
        }
    }
    /**
     * Add a file to watch list
     */
    async addWatchedFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const parsed = JSON.parse(content);
            const stat = fs.statSync(filePath);
            const fileName = path.basename(filePath);
            let type;
            if (fileName === 'TASK_QUEUE.vf.json') {
                type = 'TASK_QUEUE';
            }
            else if (fileName === 'FEATURE.vf.json') {
                type = 'FEATURE';
            }
            else if (fileName === 'NAME_ID.vf.json') {
                type = 'NAME_ID';
            }
            else {
                return; // Skip unknown files
            }
            const file = {
                type,
                path: filePath,
                content: parsed,
                lastModified: stat.mtime,
                checksum: this.calculateChecksum(content)
            };
            this.watchedFiles.set(filePath, file);
            // Log discovery
            this.logger.logEvent(EventLogger_1.LogEventType.EVENT_CUSTOM, `Discovered ${type} file`, { path: filePath });
        }
        catch (error) {
            console.error(`Failed to add watched file ${filePath}:`, error);
        }
    }
    /**
     * Setup file watchers
     */
    setupWatchers() {
        for (const [filePath, file] of this.watchedFiles) {
            try {
                const watcher = fs.watch(filePath, (eventType) => {
                    this.handleFileChange(filePath, eventType);
                });
                this.watchers.set(filePath, watcher);
            }
            catch (error) {
                console.error(`Failed to watch ${filePath}:`, error);
            }
        }
    }
    /**
     * Setup polling as backup
     */
    setupPolling() {
        this.pollTimer = setInterval(() => {
            this.checkAllFiles();
        }, this.config.pollInterval);
    }
    /**
     * Handle file change event
     */
    async handleFileChange(filePath, eventType) {
        const file = this.watchedFiles.get(filePath);
        if (!file)
            return;
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
            });
        }
        catch (error) {
            console.error(`Error handling file change for ${filePath}:`, error);
        }
    }
    /**
     * Handle file deletion
     */
    handleFileDeletion(file) {
        this.watchedFiles.delete(file.path);
        this.watchers.get(file.path)?.close();
        this.watchers.delete(file.path);
        this.logVfJsonChange(file, 'deleted');
        this.emit('change', {
            file,
            changeType: 'deleted'
        });
    }
    /**
     * Check all files for changes (polling)
     */
    async checkAllFiles() {
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
            }
            catch (error) {
                // Skip errors
            }
        }
    }
    /**
     * Detect specific changes in vf.json content
     */
    detectChanges(type, oldContent, newContent) {
        const changes = {};
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
    detectTaskChanges(oldTasks, newTasks) {
        const changes = {
            added: [],
            updated: [],
            deleted: [],
            completed: []
        };
        const oldMap = new Map(oldTasks.map(t => [t.id, t]));
        const newMap = new Map(newTasks.map(t => [t.id, t]));
        // Find added and updated
        for (const [id, task] of newMap) {
            const oldTask = oldMap.get(id);
            if (!oldTask) {
                changes.added.push(task);
            }
            else if (JSON.stringify(oldTask) !== JSON.stringify(task)) {
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
    detectFeatureChanges(oldFeatures, newFeatures) {
        const changes = {
            added: [],
            updated: [],
            deleted: [],
            completed: []
        };
        // Compare feature collections
        for (const key in newFeatures) {
            if (!oldFeatures[key]) {
                changes.added.push(...(Array.isArray(newFeatures[key]) ? newFeatures[key] : [newFeatures[key]]));
            }
            else {
                // Check for updates within the collection
                const oldItems = Array.isArray(oldFeatures[key]) ? oldFeatures[key] : [oldFeatures[key]];
                const newItems = Array.isArray(newFeatures[key]) ? newFeatures[key] : [newFeatures[key]];
                const oldMap = new Map(oldItems.map((f) => [f.id, f]));
                const newMap = new Map(newItems.map((f) => [f.id, f]));
                for (const [id, feature] of newMap) {
                    const oldFeature = oldMap.get(id);
                    if (!oldFeature) {
                        changes.added.push(feature);
                    }
                    else if (JSON.stringify(oldFeature) !== JSON.stringify(feature)) {
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
    detectEntityChanges(oldEntities, newEntities) {
        const changes = {
            added: {},
            updated: {},
            deleted: {}
        };
        // Find added and updated
        for (const key in newEntities) {
            if (!oldEntities[key]) {
                changes.added[key] = newEntities[key];
            }
            else if (JSON.stringify(oldEntities[key]) !== JSON.stringify(newEntities[key])) {
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
    logVfJsonChange(file, changeType, changes, previousContent, newContent) {
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
    calculateChecksum(content) {
        // Simple checksum using content length and first/last chars
        return `${content.length}-${content.charCodeAt(0)}-${content.charCodeAt(content.length - 1)}`;
    }
    /**
     * Get watched files
     */
    getWatchedFiles() {
        return Array.from(this.watchedFiles.values());
    }
}
exports.VfJsonWatcher = VfJsonWatcher;
exports.default = VfJsonWatcher;
//# sourceMappingURL=VfJsonWatcher.js.map