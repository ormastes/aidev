#!/usr/bin/env ts-node
/**
 * Task Queue Hierarchy Manager
 *
 * Manages parent-child relationships between task queues
 * Auto-discovers task queues and maintains registry
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    async function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        async function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        async function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        async function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { fs } from '../../infra_external-log-lib/src';
import { path } from '../../infra_external-log-lib/src';
import { glob } from 'glob';
class TaskQueueHierarchyManager {
    constructor(projectRoot) {
        this.queueMap = new Map();
        this.projectRoot = projectRoot;
        this.registryPath = path.join(projectRoot, 'TASK_QUEUE_REGISTRY.vf.json');
        this.registry = this.loadRegistry();
    }
    /**
     * Load or initialize registry
     */
    loadRegistry() {
        if (fs.existsSync(this.registryPath)) {
            return JSON.parse(fs.readFileSync(this.registryPath, 'utf-8'));
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
    /**
     * Save registry to file
     */
    saveRegistry() {
        this.registry.metadata.updated_at = new Date().toISOString();
        await fileAPI.createFile(this.registryPath, JSON.stringify(this.registry, { type: FileType.TEMPORARY }));
        console.log(`✓ Registry saved to: ${this.registryPath}`);
    }
    /**
     * Discover all task queue files
     */
    discoverQueues() {
        return __awaiter(this, void 0, void 0, function* () {
            const pattern = '**/TASK_QUEUE.vf.json';
            const options = {
                cwd: this.projectRoot,
                ignore: this.registry.registry_config.excluded_paths.map(p => `**/${p}/**`)
            };
            const files = yield glob(pattern, options);
            console.log(`🔍 Found ${files.length} task queue files`);
            return files;
        });
    }
    /**
     * Extract theme from path
     */
    extractThemeFromPath(filePath) {
        const match = filePath.match(/layer\/themes\/([^\/]+)\//);
        return match ? match[1] : undefined;
    }
    /**
     * Determine parent queue path
     */
    determineParentPath(queuePath) {
        const normalizedPath = queuePath.replace(/\\/g, '/');
        // Root has no parent
        if (normalizedPath === 'TASK_QUEUE.vf.json' || normalizedPath === '/TASK_QUEUE.vf.json') {
            return null;
        }
        // Check if it's in a theme
        const themeMatch = normalizedPath.match(/layer\/themes\/([^\/]+)\//);
        if (themeMatch) {
            const themeName = themeMatch[1];
            const afterTheme = normalizedPath.substring(themeMatch.index + themeMatch[0].length);
            // If it's directly in theme root, parent is project root
            if (afterTheme === 'TASK_QUEUE.vf.json') {
                return '/TASK_QUEUE.vf.json';
            }
            // Otherwise, find parent in directory hierarchy
            const dirPath = path.dirname(normalizedPath);
            const parentDir = path.dirname(dirPath);
            const parentQueuePath = path.join(parentDir, 'TASK_QUEUE.vf.json');
            // Check if parent queue exists
            if (fs.existsSync(path.join(this.projectRoot, parentQueuePath))) {
                return '/' + parentQueuePath.replace(/\\/g, '/');
            }
            // Default to theme root
            return `/layer/themes/${themeName}/TASK_QUEUE.vf.json`;
        }
        // For other locations, check parent directory
        const dirPath = path.dirname(normalizedPath);
        if (dirPath === '.' || dirPath === '/') {
            return '/TASK_QUEUE.vf.json';
        }
        const parentDir = path.dirname(dirPath);
        const parentQueuePath = path.join(parentDir, 'TASK_QUEUE.vf.json');
        if (fs.existsSync(path.join(this.projectRoot, parentQueuePath))) {
            return '/' + parentQueuePath.replace(/\\/g, '/');
        }
        return '/TASK_QUEUE.vf.json'; // Default to root
    }
    /**
     * Update parent field in task queue file
     */
    updateQueueParent(queuePath, parentPath) {
        const fullPath = path.join(this.projectRoot, queuePath);
        try {
            const content = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
            // Update parent field
            if (parentPath) {
                content.parentQueue = parentPath;
                const parentTheme = this.extractThemeFromPath(parentPath);
                if (parentTheme) {
                    content.parentTheme = parentTheme;
                }
            }
            else {
                delete content.parentQueue;
                delete content.parentTheme;
            }
            // Update theme field
            const theme = this.extractThemeFromPath(queuePath);
            if (theme) {
                content.theme = theme;
            }
            // Save updated file
            await fileAPI.createFile(fullPath, JSON.stringify(content, { type: FileType.TEMPORARY }));
            console.log(`✓ Updated parent for: ${queuePath}`);
        }
        catch (error) {
            console.error(`✗ Failed to update: ${queuePath}`, error);
        }
    }
    /**
     * Build queue hierarchy
     */
    buildHierarchy() {
        return __awaiter(this, void 0, void 0, function* () {
            const queues = yield this.discoverQueues();
            this.queueMap.clear();
            // First pass: Create metadata for all queues
            for (const queuePath of queues) {
                const normalizedPath = '/' + queuePath.replace(/\\/g, '/');
                const fullPath = path.join(this.projectRoot, queuePath);
                let itemCount = 0;
                try {
                    const content = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
                    // Count items in queue
                    if (content.queues) {
                        for (const queue of Object.values(content.queues)) {
                            if (queue.items) {
                                itemCount += queue.items.length;
                            }
                        }
                    }
                    else if (content.taskQueues) {
                        for (const tasks of Object.values(content.taskQueues)) {
                            if (Array.isArray(tasks)) {
                                itemCount += tasks.length;
                            }
                        }
                    }
                }
                catch (error) {
                    console.warn(`Could not read queue file: ${queuePath}`);
                }
                const metadata = {
                    path: normalizedPath,
                    name: path.basename(path.dirname(fullPath)) || 'root',
                    theme: this.extractThemeFromPath(queuePath),
                    parent: undefined,
                    parentPath: this.determineParentPath(queuePath) || undefined,
                    children: [],
                    childrenPaths: [],
                    level: 0,
                    lastModified: fs.statSync(fullPath).mtime.toISOString(),
                    itemCount
                };
                this.queueMap.set(normalizedPath, metadata);
            }
            // Second pass: Build parent-child relationships
            for (const [queuePath, metadata] of this.queueMap) {
                if (metadata.parentPath) {
                    const parent = this.queueMap.get(metadata.parentPath);
                    if (parent) {
                        parent.children.push(metadata.name);
                        parent.childrenPaths.push(queuePath);
                        metadata.parent = parent.name;
                        metadata.level = parent.level + 1;
                    }
                    else {
                        console.warn(`Parent not found for: ${queuePath}`);
                        this.registry.orphaned_queues.push(queuePath);
                    }
                }
            }
            // Update registry
            this.updateRegistry();
        });
    }
    /**
     * Update registry with discovered queues
     */
    updateRegistry() {
        // Clear existing data
        this.registry.theme_queues = {};
        this.registry.orphaned_queues = [];
        // Update root queue
        const rootQueue = this.queueMap.get('/TASK_QUEUE.vf.json');
        if (rootQueue) {
            this.registry.root_queue = rootQueue;
        }
        // Organize by theme
        for (const [queuePath, metadata] of this.queueMap) {
            if (metadata.theme) {
                if (!this.registry.theme_queues[metadata.theme]) {
                    this.registry.theme_queues[metadata.theme] = [];
                }
                this.registry.theme_queues[metadata.theme].push(metadata);
            }
        }
        // Build hierarchy tree
        this.registry.queue_hierarchy = this.buildHierarchyTree('/TASK_QUEUE.vf.json');
        // Update metadata
        this.registry.metadata.total_queues = this.queueMap.size;
        // Find orphaned queues
        for (const [queuePath, metadata] of this.queueMap) {
            if (metadata.parentPath && !this.queueMap.has(metadata.parentPath)) {
                this.registry.orphaned_queues.push(queuePath);
            }
        }
    }
    /**
     * Build hierarchy tree recursively
     */
    buildHierarchyTree(queuePath) {
        const metadata = this.queueMap.get(queuePath);
        if (!metadata)
            return null;
        const tree = {
            path: metadata.path,
            name: metadata.name,
            theme: metadata.theme,
            items: metadata.itemCount,
            children: {}
        };
        for (const childPath of metadata.childrenPaths) {
            const childTree = this.buildHierarchyTree(childPath);
            if (childTree) {
                tree.children[path.basename(path.dirname(childPath))] = childTree;
            }
        }
        return tree;
    }
    /**
     * Add a new task queue
     */
    addQueue(queuePath, parentPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const normalizedPath = '/' + queuePath.replace(/\\/g, '/');
            const fullPath = path.join(this.projectRoot, queuePath);
            // Determine parent if not specified
            if (!parentPath) {
                parentPath = this.determineParentPath(queuePath) || undefined;
            }
            // Create queue file if it doesn't exist
            if (!fs.existsSync(fullPath)) {
                const template = {
                    metadata: {
                        version: "1.0.0",
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        total_items: 0,
                        description: `Task queue for ${path.basename(path.dirname(fullPath))}`
                    },
                    parentQueue: parentPath,
                    theme: this.extractThemeFromPath(queuePath),
                    working_item: null,
                    queues: {
                        adhoc_temp_user_request: { items: [] },
                        user_story: { items: [] },
                        scenarios: { items: [] },
                        environment_tests: { items: [] },
                        external_tests: { items: [] },
                        system_tests_implement: { items: [] },
                        integration_tests_implement: { items: [] },
                        unit_tests: { items: [] },
                        integration_tests_verify: { items: [] },
                        system_tests_verify: { items: [] },
                        coverage_duplication: { items: [] },
                        retrospective: { items: [] }
                    },
                    global_config: {
                        seldom_display_default: 5,
                        operation_counters: {}
                    },
                    priority_order: [
                        "adhoc_temp_user_request",
                        "environment_tests",
                        "external_tests",
                        "system_tests_implement",
                        "integration_tests_implement",
                        "unit_tests",
                        "integration_tests_verify",
                        "system_tests_verify",
                        "scenarios",
                        "user_story",
                        "coverage_duplication",
                        "retrospective"
                    ]
                };
                // Ensure directory exists
                await fileAPI.createDirectory(path.dirname(fullPath), { recursive: true });
                await fileAPI.createFile(fullPath, JSON.stringify(template, { type: FileType.TEMPORARY }));
                console.log(`✓ Created new queue: ${queuePath}`);
            }
            // Update parent if specified
            if (parentPath) {
                this.updateQueueParent(queuePath, parentPath);
            }
            // Rebuild hierarchy
            yield this.buildHierarchy();
            this.saveRegistry();
        });
    }
    /**
     * Display hierarchy
     */
    displayHierarchy() {
        console.log('\n📊 Task Queue Hierarchy');
        console.log('=======================\n');
        this.displayNode(this.registry.queue_hierarchy.root, 0);
        if (this.registry.orphaned_queues.length > 0) {
            console.log('\n⚠️  Orphaned Queues:');
            for (const orphan of this.registry.orphaned_queues) {
                console.log(`  - ${orphan}`);
            }
        }
        console.log('\n📈 Statistics:');
        console.log(`  Total Queues: ${this.registry.metadata.total_queues}`);
        console.log(`  Themes: ${Object.keys(this.registry.theme_queues).length}`);
        console.log(`  Orphaned: ${this.registry.orphaned_queues.length}`);
    }
    /**
     * Display hierarchy node
     */
    displayNode(node, level) {
        if (!node)
            return;
        const indent = '  '.repeat(level);
        const prefix = level === 0 ? '🏠' : '📁';
        const items = node.items ? ` (${node.items} items)` : '';
        console.log(`${indent}${prefix} ${node.name}${items}`);
        if (node.theme) {
            console.log(`${indent}   Theme: ${node.theme}`);
        }
        for (const child of Object.values(node.children || {})) {
            this.displayNode(child, level + 1);
        }
    }
    /**
     * Validate all parent-child relationships
     */
    validateRelationships() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('\n🔍 Validating Parent-Child Relationships...\n');
            let valid = 0;
            let invalid = 0;
            for (const [queuePath, metadata] of this.queueMap) {
                if (metadata.parentPath) {
                    if (this.queueMap.has(metadata.parentPath)) {
                        console.log(`✓ ${queuePath} -> ${metadata.parentPath}`);
                        valid++;
                    }
                    else {
                        console.log(`✗ ${queuePath} -> ${metadata.parentPath} (NOT FOUND)`);
                        invalid++;
                    }
                }
            }
            console.log(`\n✓ Valid: ${valid}`);
            console.log(`✗ Invalid: ${invalid}`);
        });
    }
    /**
     * Fix orphaned queues
     */
    fixOrphans() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('\n🔧 Fixing Orphaned Queues...\n');
            for (const orphan of this.registry.orphaned_queues) {
                const suggestedParent = this.determineParentPath(orphan.replace(/^\//, ''));
                if (suggestedParent && this.queueMap.has(suggestedParent)) {
                    console.log(`Fixing: ${orphan} -> ${suggestedParent}`);
                    this.updateQueueParent(orphan.replace(/^\//, ''), suggestedParent);
                }
                else {
                    console.log(`Setting to root: ${orphan} -> /TASK_QUEUE.vf.json`);
                    this.updateQueueParent(orphan.replace(/^\//, ''), '/TASK_QUEUE.vf.json');
                }
            }
            // Rebuild after fixing
            yield this.buildHierarchy();
            this.saveRegistry();
        });
    }
}
// CLI Interface
async function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const args = process.argv.slice(2);
        const projectRoot = process.cwd();
        const manager = new TaskQueueHierarchyManager(projectRoot);
        const command = args[0] || 'help';
        switch (command) {
            case 'discover':
                console.log('🔍 Discovering task queues...');
                yield manager.buildHierarchy();
                manager.saveRegistry();
                manager.displayHierarchy();
                break;
            case 'add':
                if (args.length < 2) {
                    console.error('Usage: manage-task-queue-hierarchy.ts add <queue-path> [parent-path]');
                    process.exit(1);
                }
                yield manager.addQueue(args[1], args[2]);
                break;
            case 'validate':
                yield manager.buildHierarchy();
                yield manager.validateRelationships();
                break;
            case 'fix':
                yield manager.buildHierarchy();
                yield manager.fixOrphans();
                break;
            case 'show':
                yield manager.buildHierarchy();
                manager.displayHierarchy();
                break;
            case 'help':
            default:
                console.log(`
Task Queue Hierarchy Manager

Usage: manage-task-queue-hierarchy.ts <command> [options]

Commands:
  discover    - Discover all task queues and build hierarchy
  add <path>  - Add a new task queue with optional parent
  validate    - Validate all parent-child relationships
  fix         - Fix orphaned queues by assigning parents
  show        - Display the current hierarchy
  help        - Show this help message

Examples:
  manage-task-queue-hierarchy.ts discover
  manage-task-queue-hierarchy.ts add layer/themes/new-theme/TASK_QUEUE.vf.json
  manage-task-queue-hierarchy.ts validate
  manage-task-queue-hierarchy.ts fix
`);
                break;
        }
    });
}
if (require.main === module) {
    main().catch(console.error);
}
export { TaskQueueHierarchyManager };
