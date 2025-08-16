#!/usr/bin/env ts-node
"use strict";
/**
 * Migration script to convert between priority-based and test-driven task queue formats
 *
 * Supports bidirectional conversion:
 * - Priority format (taskQueues) -> Test-driven format (queues)
 * - Test-driven format (queues) -> Priority format (taskQueues)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrate = migrate;
exports.convertToTestDriven = convertToTestDriven;
exports.convertToPriorityBased = convertToPriorityBased;
var fs = require('node:fs');
/**
 * Map priority-based task types to test-driven queue types
 */
var typeToQueueMap = {
    'test_implementation': 'system_tests_implement',
    'system_testing': 'system_tests_implement',
    'integration_testing': 'integration_tests_implement',
    'unit_testing': 'unit_tests',
    'feature_implementation': 'user_story',
    'bug_fix': 'adhoc_temp_user_request',
    'environment_test': 'environment_tests',
    'external_test': 'external_tests',
    'coverage_check': 'coverage_duplication',
    "retrospective": "retrospective"
};
/**
 * Convert priority-based format to test-driven format
 */
async function convertToTestDriven(priorityQueue) {
    var testDrivenQueue = {
        metadata: {
            version: "1.0.0",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            total_items: 0,
            description: "Migrated from priority-based format"
        },
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
    var totalItems = 0;
    // Process all priority levels
    var priorityLevels = ["critical", 'high', 'medium', 'low'];
    for (var _i = 0, priorityLevels_1 = priorityLevels; _i < priorityLevels_1.length; _i++) {
        var priorityLevel = priorityLevels_1[_i];
        var tasks = priorityQueue.taskQueues[priorityLevel] || [];
        for (var _a = 0, tasks_1 = tasks; _a < tasks_1.length; _a++) {
            var task = tasks_1[_a];
            if (task.status === "completed")
                continue; // Skip completed tasks
            var queueType = determineQueueType(task);
            var convertedItem = {
                id: task.id,
                type: queueType,
                content: formatTaskContent(task),
                parent: task.epic || 'system',
                priority: priorityLevel,
                created_at: task.createdAt,
                updated_at: task.updatedAt
            };
            // Add to appropriate queue
            if (testDrivenQueue.queues[queueType]) {
                testDrivenQueue.queues[queueType].items.push(convertedItem);
                totalItems++;
            }
        }
    }
    testDrivenQueue.metadata.total_items = totalItems;
    return testDrivenQueue;
}
/**
 * Convert test-driven format to priority-based format
 */
async function convertToPriorityBased(testDrivenQueue) {
    var _a;
    var priorityQueue = {
        taskQueues: {
            critical: [],
            high: [],
            medium: [],
            low: [],
            completed: []
        }
    };
    // Process all queues
    for (var _i = 0, _b = Object.entries(testDrivenQueue.queues); _i < _b.length; _i++) {
        var _c = _b[_i], queueName = _c[0], queue = _c[1];
        for (var _d = 0, _e = queue.items; _d < _e.length; _d++) {
            var item = _e[_d];
            var priority = item.priority || determinePriority(queueName);
            var priorityLevel = priority;
            var convertedTask = {
                id: item.id,
                type: mapQueueTypeToTaskType(queueName),
                priority: priority,
                epic: item.parent !== 'system' ? item.parent : undefined,
                content: {
                    title: extractTitle(item.content),
                    description: item.content,
                    queue_section: queueName,
                    original_text: item.content
                },
                status: 'pending',
                createdAt: item.created_at,
                updatedAt: item.updated_at
            };
            (_a = priorityQueue.taskQueues[priorityLevel]) === null || _a === void 0 ? void 0 : _a.push(convertedTask);
        }
    }
    return priorityQueue;
}
/**
 * Determine queue type from task
 */
async function determineQueueType(task) {
    // Check task type
    if (task.type && typeToQueueMap[task.type]) {
        return typeToQueueMap[task.type];
    }
    // Analyze content for clues
    var content = JSON.stringify(task.content).toLowerCase();
    if (content.includes('test') && content.includes('system')) {
        return 'system_tests_implement';
    }
    else if (content.includes('test') && content.includes("integration")) {
        return 'integration_tests_implement';
    }
    else if (content.includes('test') && content.includes('unit')) {
        return 'unit_tests';
    }
    else if (content.includes('feature')) {
        return 'user_story';
    }
    else if (content.includes("scenario")) {
        return "scenarios";
    }
    else if (content.includes("coverage")) {
        return 'coverage_duplication';
    }
    return 'adhoc_temp_user_request';
}
/**
 * Format task content for test-driven format
 */
async function formatTaskContent(task) {
    var _a, _b;
    if (typeof task.content === 'string') {
        return task.content;
    }
    else if ((_a = task.content) === null || _a === void 0 ? void 0 : _a.title) {
        return task.content.title;
    }
    else if ((_b = task.content) === null || _b === void 0 ? void 0 : _b.description) {
        return task.content.description;
    }
    return JSON.stringify(task.content);
}
/**
 * Determine priority based on queue type
 */
async function determinePriority(queueName) {
    var highPriorityQueues = ['adhoc_temp_user_request', 'environment_tests', 'external_tests'];
    var mediumPriorityQueues = ['system_tests_implement', 'integration_tests_implement', 'unit_tests'];
    if (highPriorityQueues.includes(queueName))
        return 'high';
    if (mediumPriorityQueues.includes(queueName))
        return 'medium';
    return 'low';
}
/**
 * Map queue type to task type
 */
async function mapQueueTypeToTaskType(queueName) {
    var reverseMap = {
        'system_tests_implement': 'test_implementation',
        'integration_tests_implement': 'integration_testing',
        'unit_tests': 'unit_testing',
        'user_story': 'feature_implementation',
        'adhoc_temp_user_request': 'bug_fix',
        'environment_tests': 'environment_test',
        'external_tests': 'external_test',
        'coverage_duplication': 'coverage_check',
        "retrospective": "retrospective"
    };
    return reverseMap[queueName] || queueName;
}
/**
 * Extract title from content
 */
async function extractTitle(content) {
    // Try to extract first line or first 60 characters
    var lines = content.split('\n');
    if (lines[0]) {
        return lines[0].substring(0, 100);
    }
    return content.substring(0, 100);
}
/**
 * Main migration function
 */
async function migrate(inputFile, outputFile, direction) {
    var _a, _b, _c, _d;
    if (direction === void 0) { direction = "toTestDriven"; }
    try {
        // Read input file
        var inputData = JSON.parse(fileAPI.readFileSync(inputFile, 'utf-8'));
        var outputData = void 0;
        // Detect format and convert
        if (direction === "toTestDriven") {
            if (inputData.taskQueues) {
                outputData = convertToTestDriven(inputData);
                console.log('✓ Converted from priority-based to test-driven format');
            }
            else {
                console.log('Input already in test-driven format');
                return;
            }
        }
        else {
            if (inputData.queues) {
                outputData = convertToPriorityBased(inputData);
                console.log('✓ Converted from test-driven to priority-based format');
            }
            else {
                console.log('Input already in priority-based format');
                return;
            }
        }
        // Write output file
        await fileAPI.createFile(outputFile, JSON.stringify(outputData, { type: FileType.TEMPORARY }));
        console.log("\u2713 Output written to: ".concat(outputFile));
        // Summary
        if (direction === "toTestDriven") {
            var testDriven = outputData;
            console.log("\nMigration Summary:");
            console.log("- Total items: ".concat(testDriven.metadata.total_items));
            for (var _i = 0, _e = Object.entries(testDriven.queues); _i < _e.length; _i++) {
                var _f = _e[_i], queue = _f[0], data = _f[1];
                if (data.items.length > 0) {
                    console.log("  ".concat(queue, ": ").concat(data.items.length, " items"));
                }
            }
        }
        else {
            var priority = outputData;
            console.log("\nMigration Summary:");
            console.log("- Critical: ".concat(((_a = priority.taskQueues.critical) === null || _a === void 0 ? void 0 : _a.length) || 0, " tasks"));
            console.log("- High: ".concat(((_b = priority.taskQueues.high) === null || _b === void 0 ? void 0 : _b.length) || 0, " tasks"));
            console.log("- Medium: ".concat(((_c = priority.taskQueues.medium) === null || _c === void 0 ? void 0 : _c.length) || 0, " tasks"));
            console.log("- Low: ".concat(((_d = priority.taskQueues.low) === null || _d === void 0 ? void 0 : _d.length) || 0, " tasks"));
        }
    }
    catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}
// CLI interface
if (require.main === module) {
    var args = process.argv.slice(2);
    if (args.length < 2) {
        console.log('Usage: migrate-task-queue.ts <input-file> <output-file> [--to-priority | --to-test-driven]');
        console.log('');
        console.log('Examples:');
        console.log('  migrate-task-queue.ts TASK_QUEUE.vf.json migrated.json --to-test-driven');
        console.log('  migrate-task-queue.ts old-queue.json new-queue.json --to-priority');
        process.exit(1);
    }
    var inputFile = args[0];
    var outputFile = args[1];
    var direction = args[2] === '--to-priority' ? "toPriority" : "toTestDriven";
    migrate(inputFile, outputFile, direction);
}
