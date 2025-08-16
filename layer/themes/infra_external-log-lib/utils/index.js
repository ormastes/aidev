"use strict";
/**
 * Utility functions for External Log Library
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogPipeline = createLogPipeline;
exports.parseLogLevel = parseLogLevel;
exports.formatTimestamp = formatTimestamp;
exports.mergeConfigs = mergeConfigs;
exports.createLevelFilter = createLevelFilter;
exports.createTimeRangeFilter = createTimeRangeFilter;
exports.createKeywordFilter = createKeywordFilter;
exports.batchProcess = batchProcess;
exports.rateLimit = rateLimit;
exports.debounce = debounce;
exports.sanitizeLog = sanitizeLog;
const capture_1 = require("../children/capture");
const parser_1 = require("../children/parser");
const streamer_1 = require("../children/streamer");
const filter_1 = require("../children/filter");
const aggregator_1 = require("../children/aggregator");
const reporter_1 = require("../children/reporter");
/**
 * Creates a complete log processing pipeline
 */
function createLogPipeline(config) {
    const capture = new capture_1.LogCapture(config.capture);
    const parser = new parser_1.LogParser(config.parser);
    const filter = config.filter ? new filter_1.LogFilter(config.filter) : null;
    const streamer = config.stream ? new streamer_1.LogStreamer(config.stream) : null;
    const aggregator = config.aggregation ? new aggregator_1.LogAggregator(config.aggregation) : null;
    const reporter = config.reporting ? new reporter_1.StoryReporter() : null;
    // Connect components
    capture.on('log', (log) => {
        // Parse the log
        const parsed = parser.parse(log.content);
        if (!parsed)
            return;
        // Apply filters
        if (filter && !filter.filter(parsed))
            return;
        // Stream if configured
        if (streamer) {
            streamer.stream(parsed);
        }
        // Aggregate if configured
        if (aggregator) {
            aggregator.addLog(log.source, parsed);
        }
        // Report if configured
        if (reporter && reporter['currentStory']) {
            reporter.addEvent({
                timestamp: parsed.timestamp || new Date(),
                type: parsed.level === 'error' ? 'error' : 'action',
                title: parsed.message.substring(0, 50),
                description: parsed.message,
                metadata: parsed.fields,
            });
        }
    });
    return {
        capture,
        parser,
        filter,
        streamer,
        aggregator,
        reporter,
        async start() {
            await capture.start();
            if (streamer)
                streamer.start();
            if (reporter)
                reporter.startStory('pipeline', 'Log Pipeline Session');
        },
        async stop() {
            await capture.stop();
            if (streamer)
                streamer.stop();
            if (aggregator)
                aggregator.stop();
            if (reporter)
                reporter.endStory();
        },
    };
}
/**
 * Parse log level from string
 */
function parseLogLevel(level) {
    const normalized = level.toLowerCase().trim();
    const levelMap = {
        trace: 'trace',
        debug: 'debug',
        info: 'info',
        information: 'info',
        warn: 'warn',
        warning: 'warn',
        error: 'error',
        err: 'error',
        fatal: 'fatal',
        critical: 'fatal',
    };
    return levelMap[normalized] || 'info';
}
/**
 * Format timestamp in various formats
 */
function formatTimestamp(date, format = 'iso') {
    switch (format) {
        case 'unix':
            return String(Math.floor(date.getTime() / 1000));
        case 'human':
            return date.toLocaleString();
        case 'relative':
            return formatRelativeTime(date);
        case 'iso':
        default:
            return date.toISOString();
    }
}
/**
 * Format relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(date) {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    if (diffSec < 60)
        return `${diffSec} seconds ago`;
    if (diffMin < 60)
        return `${diffMin} minutes ago`;
    if (diffHour < 24)
        return `${diffHour} hours ago`;
    return `${diffDay} days ago`;
}
/**
 * Merge multiple configurations with defaults
 */
function mergeConfigs(...configs) {
    return configs.reduce((merged, config) => {
        return deepMerge(merged, config);
    }, {});
}
/**
 * Deep merge objects
 */
function deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            const sourceValue = source[key];
            const targetValue = result[key];
            if (isObject(sourceValue) && isObject(targetValue)) {
                result[key] = deepMerge(targetValue, sourceValue);
            }
            else if (Array.isArray(sourceValue)) {
                result[key] = [...sourceValue];
            }
            else {
                result[key] = sourceValue;
            }
        }
    }
    return result;
}
/**
 * Check if value is a plain object
 */
function isObject(value) {
    return value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        !(value instanceof Date) &&
        !(value instanceof RegExp);
}
/**
 * Create a log level filter
 */
function createLevelFilter(minLevel) {
    const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
    const minIndex = levels.indexOf(minLevel);
    return (log) => {
        const logLevel = parseLogLevel(log.level || 'info');
        const logIndex = levels.indexOf(logLevel);
        return logIndex >= minIndex;
    };
}
/**
 * Create a time range filter
 */
function createTimeRangeFilter(start, end) {
    return (log) => {
        if (!log.timestamp)
            return true;
        const timestamp = new Date(log.timestamp);
        return timestamp >= start && timestamp <= end;
    };
}
/**
 * Create a keyword search filter
 */
function createKeywordFilter(keywords, matchAll = false) {
    return (log) => {
        const text = JSON.stringify(log).toLowerCase();
        const lowerKeywords = keywords.map(k => k.toLowerCase());
        if (matchAll) {
            return lowerKeywords.every(keyword => text.includes(keyword));
        }
        else {
            return lowerKeywords.some(keyword => text.includes(keyword));
        }
    };
}
/**
 * Batch process logs
 */
async function batchProcess(items, processor, batchSize = 100) {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const result = await processor(batch);
        results.push(result);
    }
    return results;
}
/**
 * Rate limit function calls
 */
function rateLimit(fn, limit, interval) {
    const calls = [];
    return ((...args) => {
        const now = Date.now();
        // Remove old calls outside the interval
        while (calls.length > 0 && calls[0] < now - interval) {
            calls.shift();
        }
        // Check if we've exceeded the limit
        if (calls.length >= limit) {
            throw new Error(`Rate limit exceeded: ${limit} calls per ${interval}ms`);
        }
        calls.push(now);
        return fn(...args);
    });
}
/**
 * Debounce function calls
 */
function debounce(fn, delay) {
    let timeoutId = null;
    return ((...args) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        return new Promise((resolve) => {
            timeoutId = setTimeout(() => {
                resolve(fn(...args));
                timeoutId = null;
            }, delay);
        });
    });
}
/**
 * Sanitize log content for safe display
 */
function sanitizeLog(log) {
    const sensitivePatterns = [
        /password["\s]*[:=]["\s]*["'][^"']+["']/gi,
        /api[_-]?key["\s]*[:=]["\s]*["'][^"']+["']/gi,
        /token["\s]*[:=]["\s]*["'][^"']+["']/gi,
        /secret["\s]*[:=]["\s]*["'][^"']+["']/gi,
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
        /\b\d{3}-\d{2}-\d{4}\b/g, // SSN pattern
    ];
    let sanitized = JSON.stringify(log);
    for (const pattern of sensitivePatterns) {
        sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
    return JSON.parse(sanitized);
}
exports.default = {
    createLogPipeline,
    parseLogLevel,
    formatTimestamp,
    mergeConfigs,
    createLevelFilter,
    createTimeRangeFilter,
    createKeywordFilter,
    batchProcess,
    rateLimit,
    debounce,
    sanitizeLog,
};
//# sourceMappingURL=index.js.map