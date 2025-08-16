"use strict";
/**
 * Log Aggregator Module
 * Aggregates logs from multiple processes and sources
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogAggregator = void 0;
const events_1 = require("events");
class LogAggregator extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.processes = new Map();
        this.correlationMap = new Map();
        this.windowBuffer = new Map();
        this.stats = {
            totalLogs: 0,
            totalProcesses: 0,
            aggregations: 0,
            startTime: new Date(),
        };
        this.setupAggregationTimer();
    }
    addProcess(processId, metadata) {
        if (this.processes.size >= (this.config.maxProcesses || 100)) {
            this.emit('maxProcessesReached', { count: this.processes.size });
            return;
        }
        const process = {
            processId,
            processName: metadata?.name,
            pid: metadata?.pid,
            startTime: new Date(),
            logs: [],
            metadata,
        };
        this.processes.set(processId, process);
        this.stats.totalProcesses++;
        this.emit('processAdded', { processId, metadata });
    }
    removeProcess(processId) {
        const process = this.processes.get(processId);
        if (process) {
            this.processes.delete(processId);
            this.emit('processRemoved', {
                processId,
                logCount: process.logs.length
            });
        }
    }
    addLog(processId, log) {
        const process = this.processes.get(processId);
        if (!process) {
            // Auto-create process if it doesn't exist
            this.addProcess(processId);
            const newProcess = this.processes.get(processId);
            if (newProcess) {
                newProcess.logs.push(log);
            }
        }
        else {
            process.logs.push(log);
        }
        this.stats.totalLogs++;
        // Handle strategy-specific processing
        switch (this.config.strategy) {
            case 'correlate':
                this.handleCorrelation(log);
                break;
            case 'window':
                this.handleWindowing(log);
                break;
        }
    }
    aggregate() {
        let result;
        switch (this.config.strategy) {
            case 'merge':
                result = this.aggregateMerge();
                break;
            case 'group':
                result = this.aggregateGroup();
                break;
            case 'correlate':
                result = this.aggregateCorrelate();
                break;
            case 'window':
                result = this.aggregateWindow();
                break;
            case 'sample':
                result = this.aggregateSample();
                break;
            default:
                result = this.aggregateMerge();
        }
        this.stats.aggregations++;
        this.emit('aggregated', result);
        return result;
    }
    aggregateMerge() {
        const allLogs = [];
        for (const process of this.processes.values()) {
            allLogs.push(...process.logs.map(log => ({
                ...log,
                _processId: process.processId,
                _processName: process.processName,
            })));
        }
        // Sort by timestamp or configured field
        const sortField = this.config.sortField || 'timestamp';
        allLogs.sort((a, b) => {
            const aVal = this.getFieldValue(a, sortField);
            const bVal = this.getFieldValue(b, sortField);
            if (aVal instanceof Date && bVal instanceof Date) {
                return aVal.getTime() - bVal.getTime();
            }
            return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        });
        // Remove duplicates if configured
        const finalLogs = this.config.deduplication
            ? this.deduplicateLogs(allLogs)
            : allLogs;
        return {
            strategy: 'merge',
            timestamp: new Date(),
            count: finalLogs.length,
            processes: this.processes.size,
            data: finalLogs,
        };
    }
    aggregateGroup() {
        const groups = {};
        for (const process of this.processes.values()) {
            const key = process.processName || process.processId;
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(...process.logs);
        }
        // Sort logs within each group
        for (const key in groups) {
            groups[key].sort((a, b) => {
                const aTime = a.timestamp || 0;
                const bTime = b.timestamp || 0;
                return aTime - bTime;
            });
        }
        return {
            strategy: 'group',
            timestamp: new Date(),
            count: Object.values(groups).reduce((sum, logs) => sum + logs.length, 0),
            processes: this.processes.size,
            data: groups,
        };
    }
    aggregateCorrelate() {
        const correlations = {};
        for (const [correlationId, logs] of this.correlationMap) {
            correlations[correlationId] = logs.sort((a, b) => {
                const aTime = a.timestamp || 0;
                const bTime = b.timestamp || 0;
                return aTime - bTime;
            });
        }
        return {
            strategy: 'correlate',
            timestamp: new Date(),
            count: Object.values(correlations).reduce((sum, logs) => sum + logs.length, 0),
            processes: this.processes.size,
            data: correlations,
            metadata: {
                correlationField: this.config.correlationField,
                totalCorrelations: this.correlationMap.size,
            },
        };
    }
    aggregateWindow() {
        const windows = {};
        const now = Date.now();
        const windowSize = this.getWindowSizeMs();
        for (const [windowStart, logs] of this.windowBuffer) {
            if (now - windowStart <= windowSize) {
                windows[new Date(windowStart).toISOString()] = logs;
            }
        }
        // Clean old windows
        for (const [windowStart] of this.windowBuffer) {
            if (now - windowStart > windowSize * 2) {
                this.windowBuffer.delete(windowStart);
            }
        }
        return {
            strategy: 'window',
            timestamp: new Date(),
            count: Object.values(windows).reduce((sum, logs) => sum + logs.length, 0),
            processes: this.processes.size,
            data: windows,
            metadata: {
                windowSize: this.config.window?.size,
                windowUnit: this.config.window?.unit,
                activeWindows: Object.keys(windows).length,
            },
        };
    }
    aggregateSample() {
        const sampleRate = this.config.sampleRate || 0.1;
        const sampledLogs = [];
        for (const process of this.processes.values()) {
            const sampled = process.logs.filter(() => Math.random() < sampleRate);
            sampledLogs.push(...sampled.map(log => ({
                ...log,
                _processId: process.processId,
                _sampled: true,
            })));
        }
        sampledLogs.sort((a, b) => {
            const aTime = a.timestamp || 0;
            const bTime = b.timestamp || 0;
            return aTime - bTime;
        });
        return {
            strategy: 'sample',
            timestamp: new Date(),
            count: sampledLogs.length,
            processes: this.processes.size,
            data: sampledLogs,
            metadata: {
                sampleRate,
                totalLogs: this.stats.totalLogs,
                sampledCount: sampledLogs.length,
            },
        };
    }
    handleCorrelation(log) {
        if (!this.config.correlationField)
            return;
        const correlationId = this.getFieldValue(log, this.config.correlationField);
        if (!correlationId)
            return;
        if (!this.correlationMap.has(correlationId)) {
            this.correlationMap.set(correlationId, []);
        }
        this.correlationMap.get(correlationId).push(log);
    }
    handleWindowing(log) {
        const windowSize = this.getWindowSizeMs();
        const timestamp = log.timestamp ? new Date(log.timestamp).getTime() : Date.now();
        const windowStart = Math.floor(timestamp / windowSize) * windowSize;
        if (!this.windowBuffer.has(windowStart)) {
            this.windowBuffer.set(windowStart, []);
        }
        this.windowBuffer.get(windowStart).push(log);
    }
    getWindowSizeMs() {
        if (!this.config.window)
            return 60000; // Default 1 minute
        const { size, unit } = this.config.window;
        const multipliers = {
            ms: 1,
            s: 1000,
            m: 60000,
            h: 3600000,
        };
        return size * (multipliers[unit] || 1000);
    }
    getFieldValue(obj, field) {
        const parts = field.split('.');
        let value = obj;
        for (const part of parts) {
            if (value === null || value === undefined) {
                return undefined;
            }
            value = value[part];
        }
        return value;
    }
    deduplicateLogs(logs) {
        const seen = new Set();
        const unique = [];
        for (const log of logs) {
            const key = this.getDeduplicationKey(log);
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(log);
            }
        }
        return unique;
    }
    getDeduplicationKey(log) {
        // Create a key based on timestamp, message, and level
        const timestamp = log.timestamp || '';
        const message = log.message || '';
        const level = log.level || '';
        return `${timestamp}_${message}_${level}`;
    }
    setupAggregationTimer() {
        if (!this.config.bufferTimeout)
            return;
        this.aggregationTimer = setInterval(() => {
            const result = this.aggregate();
            this.emit('autoAggregation', result);
            this.clearProcessLogs();
        }, this.config.bufferTimeout);
    }
    clearProcessLogs() {
        for (const process of this.processes.values()) {
            process.logs = [];
        }
    }
    clear() {
        this.processes.clear();
        this.correlationMap.clear();
        this.windowBuffer.clear();
        this.stats.totalLogs = 0;
        this.stats.aggregations = 0;
    }
    stop() {
        if (this.aggregationTimer) {
            clearInterval(this.aggregationTimer);
            this.aggregationTimer = undefined;
        }
        this.clear();
    }
    getStats() {
        return {
            ...this.stats,
            uptime: Date.now() - this.stats.startTime.getTime(),
            averageLogsPerProcess: this.stats.totalLogs / Math.max(this.stats.totalProcesses, 1),
        };
    }
    getProcesses() {
        return Array.from(this.processes.values());
    }
    getProcessById(processId) {
        return this.processes.get(processId);
    }
}
exports.LogAggregator = LogAggregator;
exports.default = LogAggregator;
//# sourceMappingURL=index.js.map