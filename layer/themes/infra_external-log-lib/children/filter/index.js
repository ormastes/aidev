"use strict";
/**
 * Log Filter Module
 * Advanced filtering and querying of logs
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogFilter = void 0;
class LogFilter {
    constructor(config = {}) {
        this.config = {
            defaultOperator: 'and',
            maxDepth: 10,
            ...config,
        };
        this.compiledFilters = new Map();
        this.activePresets = new Set();
        this.compilePresets();
    }
    filter(log) {
        // Check preset filters first
        for (const presetName of this.activePresets) {
            const preset = this.config.presets?.find(p => p.name === presetName);
            if (preset && !this.evaluateFilterGroup(log, preset.filter)) {
                return false;
            }
        }
        // Check custom rules
        if (!this.config.rules || this.config.rules.length === 0) {
            return true;
        }
        const filterGroup = {
            operator: this.config.defaultOperator || 'and',
            rules: this.config.rules,
        };
        return this.evaluateFilterGroup(log, filterGroup);
    }
    evaluateFilterGroup(log, group, depth = 0) {
        if (depth > (this.config.maxDepth || 10)) {
            throw new Error('Filter depth exceeded maximum allowed depth');
        }
        const results = group.rules.map(rule => {
            if ('operator' in rule && 'rules' in rule) {
                // It's a nested group
                return this.evaluateFilterGroup(log, rule, depth + 1);
            }
            else {
                // It's a simple rule
                return this.evaluateRule(log, rule);
            }
        });
        if (group.operator === 'and') {
            return results.every(r => r);
        }
        else {
            return results.some(r => r);
        }
    }
    evaluateRule(log, rule) {
        const fieldValue = this.getFieldValue(log, rule.field);
        switch (rule.operator) {
            case 'equals':
                return this.equals(fieldValue, rule.value, rule.caseSensitive);
            case 'not_equals':
                return !this.equals(fieldValue, rule.value, rule.caseSensitive);
            case 'contains':
                return this.contains(fieldValue, rule.value, rule.caseSensitive);
            case 'not_contains':
                return !this.contains(fieldValue, rule.value, rule.caseSensitive);
            case 'starts_with':
                return this.startsWith(fieldValue, rule.value, rule.caseSensitive);
            case 'ends_with':
                return this.endsWith(fieldValue, rule.value, rule.caseSensitive);
            case 'regex':
                return this.matchesRegex(fieldValue, rule.value, rule.caseSensitive);
            case 'gt':
                return this.greaterThan(fieldValue, rule.value);
            case 'gte':
                return this.greaterThanOrEqual(fieldValue, rule.value);
            case 'lt':
                return this.lessThan(fieldValue, rule.value);
            case 'lte':
                return this.lessThanOrEqual(fieldValue, rule.value);
            case 'in':
                return this.isIn(fieldValue, rule.value);
            case 'not_in':
                return !this.isIn(fieldValue, rule.value);
            case 'exists':
                return fieldValue !== undefined && fieldValue !== null;
            case 'not_exists':
                return fieldValue === undefined || fieldValue === null;
            default:
                return true;
        }
    }
    getFieldValue(log, field) {
        // Support nested field access with dot notation
        const parts = field.split('.');
        let value = log;
        for (const part of parts) {
            if (value === null || value === undefined) {
                return undefined;
            }
            // Support array index access
            const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
            if (arrayMatch) {
                const [, key, index] = arrayMatch;
                value = value[key]?.[parseInt(index, 10)];
            }
            else {
                value = value[part];
            }
        }
        return value;
    }
    equals(value, compareValue, caseSensitive) {
        if (typeof value === 'string' && typeof compareValue === 'string' && !caseSensitive) {
            return value.toLowerCase() === compareValue.toLowerCase();
        }
        return value === compareValue;
    }
    contains(value, searchValue, caseSensitive) {
        if (value === null || value === undefined)
            return false;
        const str = String(value);
        const search = String(searchValue);
        if (!caseSensitive) {
            return str.toLowerCase().includes(search.toLowerCase());
        }
        return str.includes(search);
    }
    startsWith(value, searchValue, caseSensitive) {
        if (value === null || value === undefined)
            return false;
        const str = String(value);
        const search = String(searchValue);
        if (!caseSensitive) {
            return str.toLowerCase().startsWith(search.toLowerCase());
        }
        return str.startsWith(search);
    }
    endsWith(value, searchValue, caseSensitive) {
        if (value === null || value === undefined)
            return false;
        const str = String(value);
        const search = String(searchValue);
        if (!caseSensitive) {
            return str.toLowerCase().endsWith(search.toLowerCase());
        }
        return str.endsWith(search);
    }
    matchesRegex(value, pattern, caseSensitive) {
        if (value === null || value === undefined)
            return false;
        try {
            const flags = caseSensitive ? '' : 'i';
            const regex = new RegExp(pattern, flags);
            return regex.test(String(value));
        }
        catch {
            return false;
        }
    }
    greaterThan(value, compareValue) {
        if (value === null || value === undefined)
            return false;
        return value > compareValue;
    }
    greaterThanOrEqual(value, compareValue) {
        if (value === null || value === undefined)
            return false;
        return value >= compareValue;
    }
    lessThan(value, compareValue) {
        if (value === null || value === undefined)
            return false;
        return value < compareValue;
    }
    lessThanOrEqual(value, compareValue) {
        if (value === null || value === undefined)
            return false;
        return value <= compareValue;
    }
    isIn(value, list) {
        if (!Array.isArray(list))
            return false;
        return list.includes(value);
    }
    compilePresets() {
        if (!this.config.presets)
            return;
        for (const preset of this.config.presets) {
            if (preset.enabled !== false) {
                this.activePresets.add(preset.name);
            }
            // Pre-compile regex patterns for performance
            this.compileFilterGroup(preset.name, preset.filter);
        }
    }
    compileFilterGroup(id, group) {
        for (const rule of group.rules) {
            if ('operator' in rule && 'rules' in rule) {
                this.compileFilterGroup(`${id}_nested`, rule);
            }
            else {
                const filterRule = rule;
                if (filterRule.operator === 'regex') {
                    const key = `${id}_${filterRule.field}_${filterRule.value}`;
                    if (!this.compiledFilters.has(key)) {
                        try {
                            const flags = filterRule.caseSensitive ? '' : 'i';
                            const regex = new RegExp(filterRule.value, flags);
                            this.compiledFilters.set(key, { regex, rule: filterRule });
                        }
                        catch (error) {
                            console.error(`Failed to compile regex filter: ${filterRule.value}`, error);
                        }
                    }
                }
            }
        }
    }
    enablePreset(name) {
        const preset = this.config.presets?.find(p => p.name === name);
        if (preset) {
            this.activePresets.add(name);
            preset.enabled = true;
        }
    }
    disablePreset(name) {
        this.activePresets.delete(name);
        const preset = this.config.presets?.find(p => p.name === name);
        if (preset) {
            preset.enabled = false;
        }
    }
    addRule(rule) {
        if (!this.config.rules) {
            this.config.rules = [];
        }
        this.config.rules.push(rule);
    }
    removeRule(index) {
        if (this.config.rules && index >= 0 && index < this.config.rules.length) {
            this.config.rules.splice(index, 1);
        }
    }
    clearRules() {
        this.config.rules = [];
    }
    getActiveFilters() {
        return {
            rules: this.config.rules || [],
            presets: Array.from(this.activePresets),
        };
    }
    static createErrorFilter() {
        return {
            name: 'errors',
            description: 'Filter for error and fatal logs',
            filter: {
                operator: 'or',
                rules: [
                    { field: 'level', operator: 'equals', value: 'error' },
                    { field: 'level', operator: 'equals', value: 'fatal' },
                ],
            },
        };
    }
    static createTimeRangeFilter(start, end) {
        return {
            name: 'timeRange',
            description: `Logs between ${start.toISOString()} and ${end.toISOString()}`,
            filter: {
                operator: 'and',
                rules: [
                    { field: 'timestamp', operator: 'gte', value: start },
                    { field: 'timestamp', operator: 'lte', value: end },
                ],
            },
        };
    }
    static createSourceFilter(sources) {
        return {
            name: 'sources',
            description: `Logs from sources: ${sources.join(', ')}`,
            filter: {
                operator: 'or',
                rules: sources.map(source => ({
                    field: 'source',
                    operator: 'equals',
                    value: source,
                })),
            },
        };
    }
}
exports.LogFilter = LogFilter;
exports.default = LogFilter;
//# sourceMappingURL=index.js.map