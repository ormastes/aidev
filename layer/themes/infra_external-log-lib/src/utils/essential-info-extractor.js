"use strict";
/**
 * Essential Info Extractor
 *
 * Extracts only the most important 1-2 pieces of information from items
 * for brief logging. Full details available when detail mode is enabled.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTaskEssentials = extractTaskEssentials;
exports.extractFeatureEssentials = extractFeatureEssentials;
exports.extractNameIdEssentials = extractNameIdEssentials;
exports.extractFileOperationEssentials = extractFileOperationEssentials;
exports.extractRejectionEssentials = extractRejectionEssentials;
exports.formatEssentialInfo = formatEssentialInfo;
exports.extractEssentials = extractEssentials;
/**
 * Extract essential info from a task queue item
 */
function extractTaskEssentials(task) {
    // Primary: task ID or title
    // Secondary: status or priority
    return {
        primary: task.id || task.title || 'unknown-task',
        secondary: task.status || task.priority,
        type: 'task'
    };
}
/**
 * Extract essential info from a feature
 */
function extractFeatureEssentials(feature) {
    // Primary: feature ID or name
    // Secondary: status or priority
    if (feature.data) {
        return {
            primary: feature.id || feature.name || 'unknown-feature',
            secondary: feature.data.status || feature.data.priority,
            type: 'feature'
        };
    }
    return {
        primary: feature.id || feature.name || 'unknown-feature',
        secondary: feature.status || feature.priority,
        type: 'feature'
    };
}
/**
 * Extract essential info from a name ID entity
 */
function extractNameIdEssentials(nameId, entity) {
    // Primary: name ID
    // Secondary: type or first meaningful value
    let secondary;
    if (entity) {
        if (typeof entity === 'object') {
            secondary = entity.type || entity.name || entity.id;
            // If still no secondary, get first non-metadata value
            if (!secondary) {
                const keys = Object.keys(entity).filter(k => !['metadata', 'createdAt', 'updatedAt'].includes(k));
                if (keys.length > 0) {
                    secondary = entity[keys[0]];
                }
            }
        }
        else {
            secondary = String(entity).substring(0, 50); // Truncate if too long
        }
    }
    return {
        primary: nameId,
        secondary,
        type: 'entity'
    };
}
/**
 * Extract essential info from a file operation
 */
function extractFileOperationEssentials(operation, filePath, details) {
    // Primary: file name (not full path)
    // Secondary: operation type or size
    const fileName = filePath.split('/').pop() || filePath;
    return {
        primary: fileName,
        secondary: operation,
        type: 'file'
    };
}
/**
 * Extract essential info from a rejection
 */
function extractRejectionEssentials(rejection) {
    // Primary: rejection type or reason (truncated)
    // Secondary: path (file name only) or severity
    const primary = rejection.type ||
        (rejection.reason ? rejection.reason.substring(0, 50) : 'unknown');
    let secondary;
    if (rejection.path) {
        secondary = rejection.path.split('/').pop();
    }
    else {
        secondary = rejection.severity;
    }
    return {
        primary,
        secondary,
        type: 'rejection'
    };
}
/**
 * Format essential info for logging
 */
function formatEssentialInfo(info) {
    if (info.secondary !== undefined && info.secondary !== null) {
        return `${info.primary} [${info.secondary}]`;
    }
    return String(info.primary);
}
/**
 * Generic essential extractor
 */
function extractEssentials(type, data) {
    switch (type) {
        case 'task':
        case 'task_queue':
            return extractTaskEssentials(data);
        case 'feature':
            return extractFeatureEssentials(data);
        case 'name_id':
        case 'entity':
            if (typeof data === 'object' && data.nameId && data.entity) {
                return extractNameIdEssentials(data.nameId, data.entity);
            }
            return extractNameIdEssentials(data, null);
        case 'file':
            if (typeof data === 'object' && data.operation && data.path) {
                return extractFileOperationEssentials(data.operation, data.path, data);
            }
            return { primary: data, type: 'file' };
        case 'rejection':
            return extractRejectionEssentials(data);
        default:
            // Generic extraction
            if (typeof data === 'object') {
                const primary = data.id || data.name || data.title ||
                    data.type || JSON.stringify(data).substring(0, 50);
                const secondary = data.status || data.priority || data.severity;
                return { primary, secondary, type };
            }
            return { primary: String(data).substring(0, 50), type };
    }
}
exports.default = {
    extractTaskEssentials,
    extractFeatureEssentials,
    extractNameIdEssentials,
    extractFileOperationEssentials,
    extractRejectionEssentials,
    extractEssentials,
    formatEssentialInfo
};
//# sourceMappingURL=essential-info-extractor.js.map