/**
 * Log Filter Module
 * Advanced filtering and querying of logs
 */
export type FilterOperator = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'regex' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'exists' | 'not_exists';
export interface FilterRule {
    field: string;
    operator: FilterOperator;
    value: any;
    caseSensitive?: boolean;
}
export interface FilterGroup {
    operator: 'and' | 'or';
    rules: (FilterRule | FilterGroup)[];
}
export interface FilterConfig {
    rules?: (FilterRule | FilterGroup)[];
    presets?: FilterPreset[];
    defaultOperator?: 'and' | 'or';
    maxDepth?: number;
}
export interface FilterPreset {
    name: string;
    description?: string;
    filter: FilterGroup;
    enabled?: boolean;
}
export declare class LogFilter {
    private config;
    private compiledFilters;
    private activePresets;
    constructor(config?: FilterConfig);
    filter(log: any): boolean;
    private evaluateFilterGroup;
    private evaluateRule;
    private getFieldValue;
    private equals;
    private contains;
    private startsWith;
    private endsWith;
    private matchesRegex;
    private greaterThan;
    private greaterThanOrEqual;
    private lessThan;
    private lessThanOrEqual;
    private isIn;
    private compilePresets;
    private compileFilterGroup;
    enablePreset(name: string): void;
    disablePreset(name: string): void;
    addRule(rule: FilterRule | FilterGroup): void;
    removeRule(index: number): void;
    clearRules(): void;
    getActiveFilters(): {
        rules: (FilterRule | FilterGroup)[];
        presets: string[];
    };
    static createErrorFilter(): FilterPreset;
    static createTimeRangeFilter(start: Date, end: Date): FilterPreset;
    static createSourceFilter(sources: string[]): FilterPreset;
}
export default LogFilter;
//# sourceMappingURL=index.d.ts.map